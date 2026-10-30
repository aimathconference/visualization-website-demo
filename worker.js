/* ---------- Loci module worker ----------
   One instance per mounted slide (docs/module-api.md, section 4). The host (runtime.js) fetches this
   file as text and starts it from a Blob URL, so it works wherever the page is served from. It owns an
   OffscreenCanvas, drives its own frame loop and posts a heartbeat after every frame.
   Module code arrives as data (JS source text or WASM bytes) and is only ever imported from a Blob URL.
   render "webgl2" (JS only): the module gets a WebGL2 context instead of a 2D one; the host clears the canvas to theme.bg
   and sets viewport and scissor to the box before each draw, and clears outside the box after it. Text comes back from
   draw() as a label list that the page draws on an overlay canvas (section 3 of docs/module-api.md).
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
let gl=null, glTimer=null, gpuMs=null, labels=[], sentLabels='[]';
let evq=[], engaged=false, sentCursor='', sentView='null', viewTooBig=false; // pointer input, cursor and view (section 3, "Pointer events")

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
  if(!G.document){
    const make=tag=>{
      if(String(tag).toLowerCase()!=='canvas') throw new Error(`document.createElement('${tag}'): only offscreen canvases exist in a Loci worker`);
      return new OffscreenCanvas(300,150);
    };
    G.document={ createElement:make, createElementNS:(_,tag)=>make(tag) };
  }
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
const THREE_IMPORT=/^([ \t]*import\s*(?:\*\s*as\s+[A-Za-z_$][\w$]*|\{[^}]*\})\s*from\s*)(['"])@loci\/three\2/gm;
const OTHER_IMPORT=/(^|[^\w$.])import\s*\(|^[ \t]*import[\s{*'"]|^[ \t]*export\s[^;\n]*\bfrom\s*['"]/m;
const usesThree=src=>/^[ \t]*import\b[^;]*?\bfrom\s*['"]@loci\/three['"]/m.test(String(src));
/* @loci/three: a pinned three.js ES module build, trusted and shared by every piece. The host normally fetches it once
   per page and passes the text in; otherwise this worker fetches it once with the private netFetch (it is started before
   lockdown and pinned by SRI). Either way it is imported from a Blob URL that lives as long as the worker. */
let threeURL=null, threeLoad=null;
function loadThree(spec){
  if(!threeLoad) threeLoad=(async()=>{
    let text=spec&&spec.text;
    if(!text){
      if(!netFetch || !spec || !spec.url) throw new Error("'@loci/three' is not available here");
      const r=await netFetch(spec.url,spec.integrity?{integrity:spec.integrity}:{}); if(!r.ok) throw new Error(`'@loci/three': HTTP ${r.status}`);
      text=await r.text();
    }
    threeURL=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
    return threeURL;
  })();
  return threeLoad;
}
async function loadJS(source,kit,three){
  let names=[];
  let body=String(source).replace(KIT_IMPORT,(_,list)=>{ names=list.split(',').map(s=>s.trim()).filter(Boolean); return ''; });
  const heads=[]; // '@loci/three' imports, set aside while the rest is checked; only the specifier is rewritten, so lines stay put
  body=body.replace(THREE_IMPORT,(_,head)=>{ heads.push(head); return `\u0000LOCI_THREE${heads.length-1}\u0000`; });
  if(OTHER_IMPORT.test(body)) throw new Error("imports other than '@loci/kit' and '@loci/three' are refused");
  if(heads.length){ const u=await three; body=body.replace(/\u0000LOCI_THREE(\d+)\u0000/g,(_,i)=>`${heads[+i]}'${u}'`); }
  const binds=names.map(n=>{ const [a,b]=n.split(/\s+as\s+/); if(!kit.names.includes(a)) throw new Error(`'@loci/kit' has no export named ${a}`); return b?`${a}: ${b}`:a; });
  // one line, so error line numbers in the module stay where the author wrote them
  const prelude=binds.length?`const {${binds.join(', ')}} = (() => { ${kit.source.replace(/\n\s*/g,' ')} return {${kit.names.join(', ')}}; })();`:'';
  const url=URL.createObjectURL(new Blob([prelude+body],{type:'text/javascript'}));
  let ns; try{ ns=await import(url); } finally { URL.revokeObjectURL(url); }
  mod=ns&&ns.default;
  if(!mod || typeof mod.draw!=='function') throw new Error('the module must export default { draw(...) }');
  if(typeof mod.setup==='function') await mod.setup({ctx, gl, canvas, env:{box, dpr, w:cssW, h:cssH, seed, manifest, theme:shownTheme()}});
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

/* ---------- WebGL2 ---------- */
const rgb01=c=>{ const n=u32(c); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; };
/* the box in device pixels, GL convention (origin bottom left) */
function glBox(){
  const sx=canvas.width/cssW, sy=canvas.height/cssH;
  const x0=Math.max(0,Math.round(box.x*sx)), x1=Math.min(canvas.width,Math.round((box.x+box.w)*sx));
  const y0=Math.max(0,Math.round(box.y*sy)), y1=Math.min(canvas.height,Math.round((box.y+box.h)*sy));
  return [x0, canvas.height-y1, Math.max(0,x1-x0), Math.max(0,y1-y0)];
}
function initGL(){
  gl=canvas.getContext('webgl2',{antialias:true, alpha:false, preserveDrawingBuffer:false, powerPreference:'low-power'});
  if(!gl) throw new Error('WebGL2 is not available in this browser');
  if(canvas.addEventListener) canvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); fail(new Error('GPU context lost')); });
  const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if(ext) glTimer={ext, free:[], pending:[]};
}
/* before every draw: default framebuffer, full canvas cleared to theme.bg, viewport and scissor on the box */
function glBefore(vp){
  const [r,g,b]=rgb01(theme.bg);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.disable(gl.SCISSOR_TEST); gl.viewport(0,0,canvas.width,canvas.height);
  gl.colorMask(true,true,true,true); gl.depthMask(true); gl.stencilMask(0xff);
  gl.clearColor(r,g,b,1); gl.clearDepth(1); gl.clearStencil(0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST); gl.viewport(...vp); gl.scissor(...vp);
}
/* after it: whatever the module did, everything outside the box is theme.bg again */
function glAfter(vp){
  const [r,g,b]=rgb01(theme.bg), [x,y,w,h]=vp, W=canvas.width, H=canvas.height;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.colorMask(true,true,true,true); gl.clearColor(r,g,b,1); gl.enable(gl.SCISSOR_TEST);
  for(const s of [[0,0,W,y],[0,y+h,W,H-y-h],[0,y,x,h],[x+w,y,W-x-w,h]]) if(s[2]>0&&s[3]>0){ gl.scissor(...s); gl.clear(gl.COLOR_BUFFER_BIT); }
  gl.scissor(...vp);
}
/* GPU time, when the browser exposes EXT_disjoint_timer_query_webgl2: results arrive a few frames late */
function timerBegin(){
  if(!glTimer) return null;
  const q=glTimer.free.pop()||gl.createQuery(); gl.beginQuery(glTimer.ext.TIME_ELAPSED_EXT,q); return q;
}
function timerEnd(q){
  if(!q) return; gl.endQuery(glTimer.ext.TIME_ELAPSED_EXT); glTimer.pending.push(q);
  const disjoint=gl.getParameter(glTimer.ext.GPU_DISJOINT_EXT);
  while(glTimer.pending.length && gl.getQueryParameter(glTimer.pending[0],gl.QUERY_RESULT_AVAILABLE)){
    const p=glTimer.pending.shift(); if(!disjoint) gpuMs=gl.getQueryParameter(p,gl.QUERY_RESULT)/1e6; glTimer.free.push(p);
  }
  if(glTimer.pending.length>8) glTimer.free.push(glTimer.pending.shift()); // results that never come are dropped
}

/* ---------- labels returned from draw(): {labels:[{text, x, y, size?, weight?, color?, align?, alpha?}]}, CSS px ---------- */
const COLOR_RE=/^(fg|bg|a1|a2|#[0-9a-fA-F]{6})$/;
function takeLabels(out){
  const list=[];
  if(theme.labels && out && Array.isArray(out.labels)) for(const l of out.labels.slice(0,64)){
    if(!l || l.text==null || !Number.isFinite(+l.x) || !Number.isFinite(+l.y)) continue;
    const o={text:String(l.text).slice(0,200), x:+l.x, y:+l.y};
    if(Number.isFinite(+l.size)) o.size=Math.max(6,Math.min(96,+l.size));
    if(l.weight!=null) o.weight=+l.weight>=600||l.weight==='bold'?700:400;
    if(typeof l.color==='string' && COLOR_RE.test(l.color)) o.color=l.color;
    if(['left','center','right'].includes(l.align)) o.align=l.align;
    if(Number.isFinite(+l.alpha)) o.alpha=Math.max(0,Math.min(1,+l.alpha));
    if(l.halo===false) o.halo=false;
    list.push(o);
  }
  labels=list; const j=JSON.stringify(list);
  if(j!==sentLabels){ sentLabels=j; post({type:'labels', labels:list}); }
}

/* ---------- pointer input, cursor and view ----------
   The host sends {type:'events', list} with normalized events (at most one pointermove per frame). Each is passed to
   module.onEvent(e, info) at once if the module has it, and queued for the next draw as `events`. After a draw the
   module's cursor ({cursor} from draw or onEvent) and view (getView() or {view} from draw) go back to the host. */
const CURSORS=['default','pointer','grab','grabbing','crosshair','move','none','zoom-in','zoom-out','ew-resize','ns-resize'];
const VIEW_MAX=2048;
function takeEvents(){ const e=evq; evq=[]; return e; }
function setCursor(c){ if(c===undefined) return; c=CURSORS.includes(c)?c:''; if(c!==sentCursor){ sentCursor=c; post({type:'cursor', cursor:c}); } }
function sendView(v){
  if(v===undefined) return;
  let j; try{ j=JSON.stringify(v===undefined?null:v); }catch(e){ j=null; }
  if(j==null || j.length>VIEW_MAX*2 || new TextEncoder().encode(j).length>VIEW_MAX){ if(!viewTooBig){ viewTooBig=true; post({type:'view', error:`the view must be plain JSON of at most ${VIEW_MAX} bytes`}); } return; }
  if(j!==sentView){ sentView=j; post({type:'view', view:JSON.parse(j)}); }
}
function takeOutputs(out){
  if(out && typeof out==='object') setCursor(out.cursor);
  if(typeof mod.getView==='function') sendView(mod.getView());
  else if(out && typeof out==='object' && 'view' in out) sendView(out.view);
}
function onEvents(list){
  if(!Array.isArray(list)) return;
  for(const e of list){
    if(!e || typeof e.type!=='string') continue;
    if(e.type==='engage') engaged=true; else if(e.type==='release') engaged=false;
    if(evq.length<256) evq.push(e);
    if(mod && typeof mod.onEvent==='function'){
      let r; try{ r=mod.onEvent(e,{box, t, params, theme:shownTheme(), state, dpr, engaged}); }catch(err){ fail(err,'onEvent'); return; }
      if(r && typeof r==='object') setCursor(r.cursor);
    }
  }
  if(!playing) render();
}
function applyView(v){
  if(typeof mod.setView==='function') mod.setView(v==null?null:v);
  sentView=JSON.stringify(v==null?null:v);
}

/* ---------- frames ---------- */
function sizeCanvas(){
  const W=Math.max(1,Math.round(cssW*dpr)), H=Math.max(1,Math.round(cssH*dpr));
  if(canvas.width!==W) canvas.width=W; if(canvas.height!==H) canvas.height=H;
}
function drawFrame(dt){
  const t0=performance.now();
  try{
    if(gl){
      if(gl.isContextLost()) throw new Error('GPU context lost');
      const vp=glBox(); glBefore(vp);
      const q=timerBegin(); let out;
      const events=takeEvents();
      try{ out=mod.draw({gl, canvas, t, dt, box, viewport:vp, theme:shownTheme(), params, seed, state, dpr, events, engaged}); } finally { timerEnd(q); }
      glAfter(vp); takeLabels(out); takeOutputs(out);
    } else {
      const hasReset=typeof ctx.reset==='function';
      if(hasReset) ctx.reset(); else ctx.save(); // a fresh context state every frame, whatever the last frame left behind
      ctx.setTransform(canvas.width/cssW,0,0,canvas.height/cssH,0,0);
      let out;
      if(wasm) wasmFrame();
      else out=mod.draw({ctx, canvas, t, dt, box, theme:shownTheme(), params, seed, state, dpr, events:takeEvents(), engaged});
      if(!hasReset) ctx.restore();
      if(!wasm){ takeLabels(out); takeOutputs(out); }
    }
  }catch(e){ fail(e,'draw'); return false; }
  lastMs=performance.now()-t0; return true;
}
function beat(drawn){ post(gpuMs!=null?{type:'beat', t, ms:lastMs, gpu:gpuMs, drawn}:{type:'beat', t, ms:lastMs, drawn}); }
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
  const js=m.module.runtime==='js', three=js && usesThree(m.module.source)?loadThree(m.three):null; // started before lockdown
  if(three) three.catch(()=>{});
  if(IS_WORKER) lockdown();
  sizeCanvas();
  if(js && m.module.render==='webgl2') initGL(); else ctx=canvas.getContext('2d');
  if(js) await loadJS(m.module.source,m.kit,three);
  else if(m.module.runtime==='wasm') await loadWasm(m.module.bytes,m.module.render);
  else throw new Error(`unknown runtime ${m.module.runtime}`);
  if(dead) return;
  if(mod && m.view!=null) applyView(m.view); // a share link's view, restored before the first frame
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
      case 'theme': theme=m.theme; if(wasm) wasmTheme(); ensureFont(theme.font); if(!playing) render(); else if(!theme.labels) takeLabels(null); break;
      case 'params': params=m.params; seed=m.seed>>>0; if(wasm) wasmParams(); if(!playing) render(); break;
      case 'resize':
        box=m.box; dpr=m.dpr||dpr; cssW=Math.max(1,m.w); cssH=Math.max(1,m.h);
        if(canvas) sizeCanvas();
        if(ready){ if(wasm) wasmResize(); else if(typeof mod.resize==='function') mod.resize({box, dpr}); render(); }
        break;
      case 'step': step=Math.max(1,m.n|0); break;
      case 'events': if(ready && mod) onEvents(m.list); break;
      case 'view': if(ready && mod){ applyView(m.view); if(!playing) render(); } break;
      case 'capture': {
        // Draw and snapshot in the same task: a WebGL drawing buffer (preserveDrawingBuffer false) is only readable until
        // the frame is presented. The labels of that frame go with it; the host composites them into the PNG.
        render(); const shot=labels, w=cssW;
        (canvas.convertToBlob?canvas.convertToBlob({type:'image/png'}):new Promise(r=>canvas.toBlob(r,'image/png')))
          .then(blob=>post({type:'capture', id:m.id, blob, labels:shot, w}), err=>post({type:'capture', id:m.id, error:String(err&&err.message||err)}));
        break;
      }
      case 'dispose':
        stop(); if(ready && mod && typeof mod.dispose==='function') try{ mod.dispose(); }catch(_){}
        dead=true;
        if(gl) try{ const lc=gl.getExtension('WEBGL_lose_context'); if(lc) lc.loseContext(); }catch(_){} // free the GPU context now, not at GC
        if(IS_WORKER) G.close(); break;
    }
  }catch(err){ fail(err,m.type); }
};
})(typeof LOCI_SELF!=='undefined'?LOCI_SELF:self);
