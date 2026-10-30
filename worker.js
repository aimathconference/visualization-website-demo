/* ---------- Loci module worker ----------
   One instance per mounted slide (docs/module-api.md, section 4). The host (runtime.js) fetches this
   file as text and starts it from a Blob URL, so it works wherever the page is served from. It owns an
   OffscreenCanvas, drives its own frame loop and posts a heartbeat after every frame.
   Module code arrives as data (JS source text or WASM bytes) and is only ever imported from a Blob URL.
   The same text also runs on the main thread as the no-OffscreenCanvas fallback, with LOCI_SELF standing in for `self`. */
(function(G){
'use strict';
const IS_WORKER=typeof WorkerGlobalScope!=='undefined' && G instanceof WorkerGlobalScope;
const post=(m,tr)=>G.postMessage(m,tr||[]);
const raf=G.requestAnimationFrame?f=>G.requestAnimationFrame(f):f=>setTimeout(()=>f(performance.now()),16);
const caf=G.cancelAnimationFrame?id=>G.cancelAnimationFrame(id):id=>clearTimeout(id);
const netFetch=G.fetch?G.fetch.bind(G):null; // kept privately for the font stylesheet only

let canvas=null, ctx=null, mod=null, wasm=null, manifest=null, theme=null, params={}, box={x:0,y:0,w:1,h:1};
let dpr=1, seed=1, cssW=1, cssH=1, t=0, speed=1, playing=false, step=1, tick=0, last=0, rafId=0;
let state={}, ready=false, dead=false, lastMs=0;

function fail(e,where){
  if(dead) return; dead=true; stop();
  const message=(e&&e.message)||String(e);
  post({type:'error', where, message:where?`${where}: ${message}`:message, stack:(e&&e.stack)||''});
}

/* ---------- isolation ---------- */
function lockdown(){
  // A module gets a canvas and a clock, nothing else. (Production also serves modules from a separate origin with a no-network CSP.)
  for(const k of ['fetch','XMLHttpRequest','WebSocket','EventSource','WebTransport','importScripts','Worker','SharedWorker','BroadcastChannel','indexedDB','caches','RTCPeerConnection']){
    try{ Object.defineProperty(G,k,{value:undefined, writable:false, configurable:false}); }catch(_){ try{ G[k]=undefined; }catch(__){} }
  }
  if(!G.document) G.document={ createElement(tag){
    if(String(tag).toLowerCase()!=='canvas') throw new Error(`document.createElement('${tag}'): only offscreen canvases exist in a Loci worker`);
    return new OffscreenCanvas(300,150);
  } };
}

/* ---------- fonts: the theme font families, loaded into the worker's FontFaceSet ----------
   Chromium caches a worker's font fallback the first time text is drawn with a family it cannot find yet, and
   never revisits it, even for new contexts. So a module never sees a family name before its faces have loaded:
   until then theme.font is the rest of the stack (the system fallback), and the switch happens on load. */
let faces=null; const fontState=new Map(); // family -> 'loading' | 'ready' | 'none'
const familyOf=css=>(String(css||'').match(/^\s*["']?([^"',]+?)["']?\s*(,|$)/)||[])[1];
function loadFontCSS(url){
  if(!IS_WORKER || !url || !netFetch || !G.fonts || typeof FontFace==='undefined'){ faces=[]; return Promise.resolve(); }
  return netFetch(url).then(r=>r.ok?r.text():'').then(css=>{
    const list=[];
    for(const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)){
      const d={}; for(const part of m[1].split(';')){ const i=part.indexOf(':'); if(i>0) d[part.slice(0,i).trim()]=part.slice(i+1).trim(); }
      const src=(String(d.src||'').match(/url\((['"]?)(https:[^'")]+)\1\)/)||[])[2];
      if(d['font-family'] && src) list.push({family:d['font-family'].replace(/^['"]|['"]$/g,''), src, style:d['font-style']||'normal', weight:d['font-weight']||'400', unicodeRange:d['unicode-range']||'U+0-10FFFF'});
    }
    faces=list;
  }).catch(()=>{ faces=[]; });
}
const fontFiles=new Map();
function fontBytes(url){ if(!fontFiles.has(url)) fontFiles.set(url,netFetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })); return fontFiles.get(url); }
function ensureFont(fontCss){
  const fam=familyOf(fontCss); if(!faces || !fam || fontState.has(fam)) return;
  const mine=faces.filter(f=>f.family===fam);
  if(!mine.length){ fontState.set(fam,'none'); return; } // not a web font here: whatever the system has
  fontState.set(fam,'loading');
  Promise.allSettled(mine.map(f=>fontBytes(f.src) // one file often serves several weights (variable fonts)
    .then(buf=>new FontFace(f.family,buf,{style:f.style, weight:f.weight, unicodeRange:f.unicodeRange}).load()).then(ff=>G.fonts.add(ff))))
    .then(()=>{ fontState.set(fam,'ready'); if(familyOf(theme.font)===fam && !playing) render(); }); // a face that failed falls back silently
}
/* The theme the module sees: the host's, with the font held back until it can be drawn. */
function shownTheme(){
  if(!IS_WORKER) return theme;
  const fam=familyOf(theme.font), st=fam&&fontState.get(fam);
  if(!fam || st==='ready' || st==='none') return theme;
  return {...theme, font:String(theme.font).replace(/^\s*["']?[^"',]+["']?\s*,?\s*/,'')||'sans-serif'};
}

/* ---------- JS modules ---------- */
const KIT_IMPORT=/^[ \t]*import\s*\{([^}]*)\}\s*from\s*['"]@loci\/kit['"][ \t]*;?/m;
const OTHER_IMPORT=/(^|[^\w$.])import\s*\(|^[ \t]*import[\s{*'"]|^[ \t]*export\s[^;\n]*\bfrom\s*['"]/m;
async function loadJS(source,kit){
  let names=[];
  let body=String(source).replace(KIT_IMPORT,(_,list)=>{ names=list.split(',').map(s=>s.trim()).filter(Boolean); return ''; });
  if(OTHER_IMPORT.test(body)) throw new Error("imports other than '@loci/kit' are refused");
  const binds=names.map(n=>{ const [a,b]=n.split(/\s+as\s+/); if(!kit.names.includes(a)) throw new Error(`'@loci/kit' has no export named ${a}`); return b?`${a}: ${b}`:a; });
  // one line, so error line numbers in the module stay where the author wrote them
  const prelude=binds.length?`const {${binds.join(', ')}} = (() => { ${kit.source.replace(/\n\s*/g,' ')} return {${kit.names.join(', ')}}; })();`:'';
  const url=URL.createObjectURL(new Blob([prelude+body],{type:'text/javascript'}));
  let ns; try{ ns=await import(url); } finally { URL.revokeObjectURL(url); }
  mod=ns&&ns.default;
  if(!mod || typeof mod.draw!=='function') throw new Error('the module must export default { draw(...) }');
  if(typeof mod.setup==='function') await mod.setup({ctx, env:{box, dpr, w:cssW, h:cssH, seed, manifest, theme:shownTheme()}});
}

/* ---------- WASM modules ---------- */
const MAX_MEM=64*1024*1024;
const MATH={sin:Math.sin, cos:Math.cos, tan:Math.tan, asin:Math.asin, acos:Math.acos, atan:Math.atan, atan2:Math.atan2, exp:Math.exp, log:Math.log,
  pow:Math.pow, sqrt:Math.sqrt, floor:Math.floor, ceil:Math.ceil, round:Math.round, fabs:Math.abs, fmod:(a,b)=>a%b, hypot:Math.hypot, fmin:Math.min, fmax:Math.max};
async function loadWasm(bytes,render){
  const m=await WebAssembly.compile(bytes), imports={};
  for(const imp of WebAssembly.Module.imports(m)){
    const slot=imports[imp.module]||(imports[imp.module]={}), base=imp.name.replace(/f$/,'');
    if(imp.kind==='function' && imp.module==='env' && (MATH[imp.name]||MATH[base])) slot[imp.name]=MATH[imp.name]||MATH[base];
    else if(imp.kind==='memory') slot[imp.name]=new WebAssembly.Memory({initial:32, maximum:MAX_MEM/65536});
    else throw new Error(`unsupported import ${imp.module}.${imp.name} (${imp.kind}); modules may import only Math functions from "env"`);
  }
  const inst=await WebAssembly.instantiate(m,imports), ex=inst.exports;
  for(const k of ['memory','init','set_param','set_theme','resize','frame']) if(!ex[k]) throw new Error(`the WASM module must export ${k}`);
  const memory=ex.memory instanceof WebAssembly.Memory?ex.memory:imports.env&&imports.env.memory;
  wasm={ex, memory, render, w:0, h:0};
  const [w,h]=wasmSize(), rc=ex.init(w,h,dpr); wasm.w=w; wasm.h=h;
  if(rc!==0) throw new Error(`init returned ${rc}`);
  wasmTheme(); wasmParams();
}
const u32=c=>parseInt(String(c).slice(1,7),16)>>>0;
function wasmSize(){ return wasm.render==='pixels'?[Math.max(1,Math.round(box.w*dpr)),Math.max(1,Math.round(box.h*dpr))]:[Math.max(1,Math.round(box.w)),Math.max(1,Math.round(box.h))]; }
function wasmTheme(){ wasm.ex.set_theme(u32(theme.bg),u32(theme.fg),u32(theme.a1),u32(theme.a2),+theme.lw||1,theme.labels?1:0); }
function wasmParams(){
  manifest.params.forEach((p,i)=>{
    const v=params[p.key];
    const x=p.type==='toggle'?(v?1:0) : p.type==='select'?Math.max(0,p.options.findIndex(o=>o[0]===v)) : p.type==='color'?u32(v) : p.type==='seed'?(v>>>0) : +v;
    wasm.ex.set_param(i,x);
  });
}
function wasmResize(){ const [w,h]=wasmSize(); if(w!==wasm.w||h!==wasm.h){ wasm.w=w; wasm.h=h; wasm.ex.resize(w,h); } }
const dec=new TextDecoder();
const col=(r,g,b,a)=>`rgba(${r|0},${g|0},${b|0},${Math.max(0,Math.min(1,a))})`;
function wasmFrame(){
  const ptr=wasm.ex.frame(t)>>>0, buf=wasm.memory.buffer;
  if(buf.byteLength>MAX_MEM) throw new Error('module memory grew past 64 MiB');
  ctx.fillStyle=theme.bg; ctx.fillRect(0,0,cssW,cssH);
  if(wasm.render==='pixels'){
    const n=wasm.w*wasm.h*4; if(ptr+n>buf.byteLength) throw new Error('frame pointer out of bounds');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(buf,ptr,n).slice(),wasm.w,wasm.h),Math.round(box.x*dpr),Math.round(box.y*dpr));
    return;
  }
  if(ptr%4 || ptr+4>buf.byteLength) throw new Error('command list pointer out of bounds');
  const len=new Float32Array(buf,ptr,1)[0]>>>0;
  if(len>(1<<22) || ptr+4+len*4>buf.byteLength) throw new Error('command list length out of bounds');
  const a=new Float32Array(buf,ptr+4,len), bytes=new Uint8Array(buf);
  ctx.save(); ctx.beginPath(); ctx.rect(box.x,box.y,box.w,box.h); ctx.clip(); ctx.translate(box.x,box.y);
  ctx.lineJoin='round'; ctx.lineCap='round'; ctx.fillStyle=theme.fg; ctx.strokeStyle=theme.fg; ctx.lineWidth=theme.lw;
  const need=k=>{ if(i+k>len) throw new Error(`command list truncated at ${i}`); };
  let i=0;
  loop: while(i<len){
    const op=a[i++];
    switch(op){
      case 0: break loop;
      case 1: need(4); ctx.fillStyle=col(a[i],a[i+1],a[i+2],a[i+3]); i+=4; break;
      case 2: need(5); ctx.strokeStyle=col(a[i],a[i+1],a[i+2],a[i+3]); ctx.lineWidth=Math.max(0.1,a[i+4]); i+=5; break;
      case 3: need(2); ctx.moveTo(a[i],a[i+1]); i+=2; break;
      case 4: need(2); ctx.lineTo(a[i],a[i+1]); i+=2; break;
      case 5: need(5); ctx.arc(a[i],a[i+1],Math.max(0,a[i+2]),a[i+3],a[i+4]); i+=5; break;
      case 6: ctx.closePath(); break;
      case 7: ctx.beginPath(); break;
      case 8: ctx.fill(); break;
      case 9: ctx.stroke(); break;
      case 10: {
        need(6); const p=a[i]>>>0, n=a[i+1]>>>0, x=a[i+2], y=a[i+3], size=a[i+4], al=a[i+5]|0; i+=6;
        if(p+n>bytes.length) throw new Error('label string out of bounds');
        if(!theme.labels) break;
        ctx.font=`${al&4?700:400} ${Math.max(6,Math.min(96,size))}px ${shownTheme().font}`; ctx.textAlign=['left','center','right'][al&3]||'left'; ctx.textBaseline='alphabetic';
        ctx.fillText(dec.decode(bytes.subarray(p,p+n)),x,y); break;
      }
      default: throw new Error(`unknown opcode ${op} at index ${i-1}`);
    }
  }
  ctx.restore();
}

/* ---------- frames ---------- */
function sizeCanvas(){
  const W=Math.max(1,Math.round(cssW*dpr)), H=Math.max(1,Math.round(cssH*dpr));
  if(canvas.width!==W) canvas.width=W; if(canvas.height!==H) canvas.height=H;
}
function drawFrame(dt){
  const t0=performance.now();
  const hasReset=typeof ctx.reset==='function';
  try{
    if(hasReset) ctx.reset(); else ctx.save(); // a fresh context state every frame, whatever the last frame left behind
    ctx.setTransform(canvas.width/cssW,0,0,canvas.height/cssH,0,0);
    if(wasm) wasmFrame();
    else mod.draw({ctx, t, dt, box, theme:shownTheme(), params, seed, state});
    if(!hasReset) ctx.restore();
  }catch(e){ fail(e,'draw'); return false; }
  lastMs=performance.now()-t0; return true;
}
function beat(drawn){ post({type:'beat', t, ms:lastMs, drawn}); }
function render(){ if(!ready||dead) return; if(drawFrame(0)) beat(true); }
function frame(now){
  if(dead||!playing) return;
  rafId=raf(frame);
  const dt=last?Math.min(0.05,(now-last)/1000):0; last=now; t+=dt*speed; tick++;
  const drawn=tick%step===0 && drawFrame(dt);
  if(!dead) beat(drawn);
}
function start(){ if(!rafId && ready && !dead){ last=0; rafId=raf(frame); } }
function stop(){ if(rafId){ caf(rafId); rafId=0; } }

async function init(m){
  canvas=m.canvas; manifest=m.manifest; theme=m.theme; params=m.params||{}; box=m.box; dpr=m.dpr||1; seed=m.seed>>>0;
  cssW=Math.max(1,m.w); cssH=Math.max(1,m.h); t=+m.t||0; speed=m.speed??1; playing=!!m.playing;
  const fontsReady=loadFontCSS(m.fontsCss);
  if(IS_WORKER) lockdown();
  sizeCanvas(); ctx=canvas.getContext('2d');
  if(m.module.runtime==='js') await loadJS(m.module.source,m.kit);
  else if(m.module.runtime==='wasm') await loadWasm(m.module.bytes,m.module.render);
  else throw new Error(`unknown runtime ${m.module.runtime}`);
  if(dead) return;
  ready=true; post({type:'ready'});
  fontsReady.then(()=>ensureFont(theme.font));
  render(); if(playing) start();
}

G.onmessage=e=>{
  const m=e.data; if(!m || dead && m.type!=='dispose') return;
  try{
    switch(m.type){
      case 'init': init(m).catch(err=>fail(err,'setup')); break;
      case 'play': playing=true; start(); break;
      case 'pause': playing=false; stop(); break;
      case 'seek': t=+m.t||0; if(!playing) render(); break;
      case 'speed': speed=+m.x; break;
      case 'theme': theme=m.theme; if(wasm) wasmTheme(); ensureFont(theme.font); if(!playing) render(); break;
      case 'params': params=m.params; seed=m.seed>>>0; if(wasm) wasmParams(); if(!playing) render(); break;
      case 'resize':
        box=m.box; dpr=m.dpr||dpr; cssW=Math.max(1,m.w); cssH=Math.max(1,m.h);
        if(canvas) sizeCanvas();
        if(ready){ if(wasm) wasmResize(); else if(typeof mod.resize==='function') mod.resize({box, dpr}); render(); }
        break;
      case 'step': step=Math.max(1,m.n|0); break;
      case 'capture':
        render();
        (canvas.convertToBlob?canvas.convertToBlob({type:'image/png'}):new Promise(r=>canvas.toBlob(r,'image/png')))
          .then(blob=>post({type:'capture', id:m.id, blob}), err=>post({type:'capture', id:m.id, error:String(err&&err.message||err)}));
        break;
      case 'dispose':
        stop(); if(ready && mod && typeof mod.dispose==='function') try{ mod.dispose(); }catch(_){}
        dead=true; if(IS_WORKER) G.close(); break;
    }
  }catch(err){ fail(err,m.type); }
};
})(typeof LOCI_SELF!=='undefined'?LOCI_SELF:self);
