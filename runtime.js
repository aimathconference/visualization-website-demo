/* ---------- LociHost: runs a module in a sandboxed frame (docs/module-api.md, sections 3 and 4) ----------
   mount(canvas, moduleSpec, opts) -> handle. moduleSpec is
     { runtime:'js', render:'canvas2d'|'webgl2', source, manifest }   or
     { runtime:'wasm', render:'pixels'|'commands', bytes|url, manifest }
   Every module is untrusted, whoever wrote it and whoever reviewed it. Each mount gets its own
   <iframe sandbox="allow-scripts"> (runner.html) and a worker inside it. The frame draws on its own canvas and sits
   exactly behind `canvas`, which stays transparent and keeps layout, focus, the cursor and pointer events. A canvas that
   is not in the document (a poster, a recording) gets a hidden frame and is read through capture().
   The page hands the frame everything it may use: the module, its kit, three.js and the font bytes. Nothing in the
   frame can reach the network or this page; messages from it are treated as untrusted.
   opts: { theme, params, box, dpr, seed, t, speed, playing, size, label, target, overlay, onError(kind, message), onStats(stats) }
   target: the manifest target this spec is ('desktop' | 'mobile' | 'any'), for the mount log line.
   overlay: an optional 2D canvas layered over the stage; labels a module returns from draw() are drawn there with the
   theme font (and composited into capture() PNGs whether or not there is an overlay).
   onError kinds: 'stalled' (watchdog), 'slow' (frame budget), 'error' (module threw), 'unsupported' (no OffscreenCanvas),
   'blocked' (an admin stopped this piece: setBlocked), 'crashed' (the tab crashed while it ran: forgive(id) to retry).
   view: the module's view to restore after setup (docs/module-api.md section 5); onView(view) hears every change.
   Pointer input: h.input(e) takes a DOM PointerEvent, WheelEvent or KeyboardEvent (or an already normalized plain
   object), normalizes it to canvas CSS px, synthesizes click and dblclick from pointer sequences, coalesces moves and
   wheel deltas per animation frame and sends the batch to the worker. The page decides when to forward (engagement).
   Mount a fresh canvas to restart. */
(function(){
'use strict';
const STALL_MS=500, NUDGE_MS=200, SETUP_MS=8000, STEP_MS=12, SLOW_MS=40, WARMUP=6, WINDOW=24;
const BASE=(document.currentScript&&document.currentScript.src)||document.baseURI;
const WORKER_URL=new URL('worker.js',BASE).href;
/* where runner.html lives: beside this file, or RUNNER_URL (config.js) or the server's runnerUrl for a separate domain */
let runnerURL=(typeof RUNNER_URL==='string'&&RUNNER_URL)||new URL('runner.html',BASE).href;
const FONTS_CSS=(document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com/css"]')||{}).href||'';
const KIT={names:LOCI_KIT.map(f=>f.name), source:[...(typeof LOCI_KIT_PRIVATE!=='undefined'?LOCI_KIT_PRIVATE:[]),...LOCI_KIT].map(String).join('\n')};
/* @loci/three: one pinned build for the whole site, fetched once per page and handed to each worker as text */
const THREE={url:'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js', integrity:'sha384-IDC7sAMAIMB/TZ6dgKKPPAKZ2bXXXP8+FBMBC8cU319eBhKITx+PaalhfDkDNH28', version:'0.170.0'};
let threeText=null;
const fetchThree=()=>threeText||(threeText=fetch(THREE.url,{integrity:THREE.integrity}).then(r=>{ if(!r.ok) throw new Error(`@loci/three: HTTP ${r.status}`); return r.text(); }).catch(e=>{ threeText=null; throw e; }));
const usesThree=src=>/^[ \t]*import\b[^;]*?\bfrom\s*['"]@loci\/three['"]/m.test(String(src));
/* The sandbox has no network, so the page loads the fonts: the site's stylesheet, then a family's files on request. */
let fontList=null; const fontFiles=new Map();
function fontFaces(){
  return fontList||(fontList=(FONTS_CSS?fetch(FONTS_CSS).then(r=>r.ok?r.text():''):Promise.resolve('')).then(css=>{
    const list=[];
    for(const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)){
      const d={}; for(const part of m[1].split(';')){ const i=part.indexOf(':'); if(i>0) d[part.slice(0,i).trim()]=part.slice(i+1).trim(); }
      const src=(String(d.src||'').match(/url\((['"]?)(https:[^'")]+)\1\)/)||[])[2];
      if(d['font-family'] && src) list.push({family:d['font-family'].replace(/^['"]|['"]$/g,''), src, style:d['font-style']||'normal', weight:d['font-weight']||'400', unicodeRange:d['unicode-range']||'U+0-10FFFF'});
    }
    return list;
  }).catch(()=>[]));
}
function fontFile(url){ if(!fontFiles.has(url)) fontFiles.set(url,fetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })); return fontFiles.get(url); }
async function fontBytes(family){
  const mine=(await fontFaces()).filter(f=>f.family===family);
  const got=await Promise.allSettled(mine.map(f=>fontFile(f.src).then(b=>({buf:b.slice(0), style:f.style, weight:f.weight, unicodeRange:f.unicodeRange})))); // one file often serves several weights (variable fonts)
  return got.filter(x=>x.status==='fulfilled').map(x=>x.value);
}

/* ---------- pieces that must not run ---------- */
const mounts=new Set(), blocked=new Map(); // id -> reason
const stoppedFrames=new Set(); // {id, drop}: a stopped piece's last picture, still on show under its card
/* the kill switch: api.js feeds this from the server (or blocked.json). A running piece on the list stops at once. */
function setBlocked(items){
  blocked.clear();
  for(const b of Array.isArray(items)?items:[]) if(b && typeof b.id==='string') blocked.set(b.id,typeof b.reason==='string'?b.reason:'');
  for(const m of [...mounts]) if(blocked.has(m.id)) m.block(blocked.get(m.id));
  for(const k of [...stoppedFrames]) if(blocked.has(k.id)) k.drop();
}
/* The crash journal: which pieces are live in this tab, kept in sessionStorage, which survives a crashed tab. A clean
   exit empties it. If a page load finds it still full, the tab died: the likeliest piece is skipped until forgive(id).
   Checker mounts are not journaled: an author running their own package has already chosen to. */
const J_KEY='loci:mounting', C_KEY='loci:crashed';
const ss={ get(k,d){ try{ const x=sessionStorage.getItem(k); return x==null?d:JSON.parse(x); }catch(_){ return d; } }, set(k,v){ try{ sessionStorage.setItem(k,JSON.stringify(v)); }catch(_){} } };
const crashed=new Set(ss.get(C_KEY,[]));
const journal=[]; let journalN=0;
let activeId=null;
let leaving=false; // the page is going away on purpose: what it does on the way out is not a crash
const writeJournal=()=>{ if(!leaving) ss.set(J_KEY,journal.map(({id,ready,playing,poster})=>({id,ready,playing,poster,active:id===activeId}))); };
/* the one to blame: still starting, else the piece on screen, else playing, else any live piece; posters last; the newest of those */
function suspect(list){
  const last=f=>{ for(let i=list.length-1;i>=0;i--) if(f(list[i])) return list[i]; return null; };
  return last(e=>!e.ready&&!e.poster)||last(e=>e.active&&!e.poster)||last(e=>e.playing&&!e.poster)||last(e=>!e.poster)||last(()=>true);
}
{ const j=ss.get(J_KEY,null), who=Array.isArray(j)&&j.length?suspect(j):null;
  if(who && typeof who.id==='string'){ crashed.add(who.id); ss.set(C_KEY,[...crashed]); console.warn(`loci: the tab stopped while ${who.id} was running, so it is skipped until someone asks for it`); }
  ss.set(J_KEY,[]); }
addEventListener('pagehide',()=>{ leaving=true; ss.set(J_KEY,[]); });
addEventListener('pageshow',e=>{ if(e.persisted){ leaving=false; writeJournal(); } });
function forgive(id){ if(crashed.delete(id)) ss.set(C_KEY,[...crashed]); }

/* hidden frames, for canvases that are not in the document */
const HIDDEN='display:none';
function makeFrame(canvas,url){
  const f=document.createElement('iframe');
  f.setAttribute('sandbox','allow-scripts'); f.setAttribute('aria-hidden','true'); f.setAttribute('tabindex','-1'); f.setAttribute('title','');
  f.setAttribute('referrerpolicy','no-referrer'); f.setAttribute('loading','eager'); f.src=url;
  const obs=[];
  if(canvas.isConnected){
    f.style.cssText='position:absolute;border:0;margin:0;padding:0;pointer-events:none;background:transparent;display:block';
    const place=()=>{ if(!f.isConnected) return; const st=f.style;
      st.left=canvas.offsetLeft+canvas.clientLeft+'px'; st.top=canvas.offsetTop+canvas.clientTop+'px'; st.width=canvas.clientWidth+'px'; st.height=canvas.clientHeight+'px';
      st.transform=canvas.style.transform; st.clipPath=canvas.style.clipPath; st.borderRadius=getComputedStyle(canvas).borderRadius; };
    // the canvas stays above the frame so its focus ring shows, with nothing of its own drawn
    if(getComputedStyle(canvas).position==='static') canvas.style.position='relative';
    canvas.style.background='transparent';
    canvas.before(f); place();
    const ro=new ResizeObserver(place); ro.observe(canvas); obs.push(ro);
    const mo=new MutationObserver(place); mo.observe(canvas,{attributes:true, attributeFilter:['style','class']}); obs.push(mo);
    if(canvas.parentNode){ const gone=new MutationObserver(()=>{ if(!canvas.isConnected) drop(); }); gone.observe(canvas.parentNode,{childList:true}); obs.push(gone); } // a stopped piece's last frame stays until its canvas is replaced
  } else { f.style.cssText=HIDDEN; document.documentElement.appendChild(f); }
  const frame={el:f, drop(){ obs.forEach(o=>o.disconnect()); obs.length=0; f.remove(); if(frame.onDrop) frame.onDrop(); }, onDrop:null};
  function drop(){ frame.drop(); }
  return frame;
}
const canWorker=typeof Worker!=='undefined' && typeof OffscreenCanvas!=='undefined' && typeof HTMLCanvasElement!=='undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;

/* The page's own frame clock. Worker frames are tied to the page's rendering, so when the page itself is not
   producing frames (hidden, occluded, not composited) a silent worker is not a stalled one. */
let pageFrame=performance.now(), live=0, ticking=false;
function tickPage(now){ pageFrame=now; if(live>0) requestAnimationFrame(tickPage); else ticking=false; }
function startTicker(){ live++; if(!ticking){ ticking=true; pageFrame=performance.now(); requestAnimationFrame(tickPage); } }
const pageRendering=now=>!document.hidden && now-pageFrame<250;

let workerText=null;
const text=()=>workerText||(workerText=fetch(WORKER_URL).then(r=>{ if(!r.ok) throw new Error(`worker.js: HTTP ${r.status}`); return r.text(); }).catch(e=>{ workerText=null; throw e; }));
const bytes=new Map();
function fetchBytes(url){
  const u=new URL(url,document.baseURI).href;
  if(!bytes.has(u)) bytes.set(u,fetch(u).then(r=>{ if(!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.arrayBuffer(); }).catch(e=>{ bytes.delete(u); throw e; }));
  return bytes.get(u);
}
const plain=m=>JSON.parse(JSON.stringify(m)); // manifests may carry display-only functions (fmt); the worker gets data

function seedOf(manifest,params,fallback){ const p=manifest.params.find(q=>q.type==='seed'); return ((p&&params[p.key]!=null)?params[p.key]:fallback??1)>>>0; }
function cssSize(canvas,size){ if(size) return size; const r=canvas.getBoundingClientRect(); return {w:Math.max(1,r.width), h:Math.max(1,r.height)}; }

/* Labels a module returned from draw(), drawn by the page in the theme font, clipped to the box. s: device px per CSS px. */
function paintLabels(c,list,theme,box,s){
  if(!theme || !theme.labels || !list || !list.length) return;
  c.save(); c.setTransform(s,0,0,s,0,0);
  c.beginPath(); c.rect(box.x,box.y,box.w,box.h); c.clip(); c.textBaseline='alphabetic';
  const halo=/^#[0-9a-f]{6}$/i.test(theme.bg||'');
  for(const l of list){
    c.globalAlpha=l.alpha??1; c.fillStyle=l.color?(l.color[0]==='#'?l.color:theme[l.color]):theme.fg;
    c.font=`${l.weight||400} ${l.size||13}px ${theme.font}`; c.textAlign=l.align||'left';
    if(l.halo!==false && halo){ // readable over bright regions: a 2.5 px stroke in theme.bg at 70% under the text
      const a=c.globalAlpha; c.globalAlpha=a*0.7; c.strokeStyle=theme.bg; c.lineWidth=2.5; c.lineJoin='round'; c.miterLimit=2;
      c.strokeText(l.text,l.x,l.y); c.globalAlpha=a;
    }
    c.fillText(l.text,l.x,l.y);
  }
  c.restore();
}
async function composite(blob,list,theme,box,w){
  if(!theme || !theme.labels || !list || !list.length) return blob;
  const bm=await createImageBitmap(blob), cv=document.createElement('canvas'); cv.width=bm.width; cv.height=bm.height;
  const c=cv.getContext('2d'); c.drawImage(bm,0,0);
  paintLabels(c,list,theme,box,bm.width/Math.max(1,w));
  // close the bitmap only after encoding: canvas draws are deferred, and a bitmap closed before the flush draws nothing
  return new Promise((res,rej)=>cv.toBlob(b=>{ if(bm.close) bm.close(); b?res(b):rej(new Error('capture: could not encode the PNG')); },'image/png'));
}

/* ---------- pointer input (docs/module-api.md, section 3, "Pointer events") ---------- */
const EVENT_TYPES=['pointerdown','pointermove','pointerup','pointercancel','click','dblclick','wheel','keydown','keyup','engage','release'];
const CURSORS=['default','pointer','grab','grabbing','crosshair','move','none','zoom-in','zoom-out','ew-resize','ns-resize'];
const CLICK_PX=6, CLICK_MS=600, DBL_MS=350, DBL_PX=24, MAX_QUEUE=64;
const fin=(x,d=0)=>Number.isFinite(+x)?+x:d;
const str=(x,n)=>typeof x==='string'?x.slice(0,n):'';
/* one event in the normalized shape every module sees: every field present, numbers finite */
function normEvent(e,t){
  if(!e || !EVENT_TYPES.includes(e.type)) return null;
  const o={type:e.type, x:fin(e.x), y:fin(e.y), dx:fin(e.dx), dy:fin(e.dy), button:fin(e.button)|0, buttons:fin(e.buttons)|0,
    deltaX:fin(e.deltaX), deltaY:fin(e.deltaY), key:str(e.key,32), code:str(e.code,32), repeat:!!e.repeat,
    shift:!!e.shift, ctrl:!!e.ctrl, alt:!!e.alt, meta:!!e.meta, pointerType:str(e.pointerType,8)||'mouse',
    pointers:Array.isArray(e.pointers)?e.pointers.slice(0,10).map(p=>({id:fin(p&&p.id)|0, x:fin(p&&p.x), y:fin(p&&p.y)})):[], t:fin(e.t,t)};
  return o;
}

function mount(canvas,spec,o={}){
  const id=spec.manifest.id, isPoster=o.label==='poster', journaled=o.label!=='checker';
  let theme=o.theme, params=o.params||{}, box=o.box, dpr=o.dpr||1, t=+o.t||0, speed=o.speed??1, playing=!!o.playing;
  let port=null, frame=null, onFrameMsg=null, ready=false, dead=false, lastBeat=0, awaiting=0, readyBy=0, wd=0, step=1, warm=0, samples=[], capN=0, state='loading';
  let lastNudge=0, frameUp=false;
  let labels=[]; const ov=o.overlay||null, render=spec.render||spec.manifest.render;
  const LM=window.LociManifest||{}, pointer=LM.pointerFor?LM.pointerFor(spec.manifest,null):{mode:'none'};
  let view=o.view!==undefined&&LM.normalizeView?LM.normalizeView(o.view):null, cursor='', viewWarned=false;
  const q=[], ptrs=new Map(); let flushRaf=0, flushTO=0, press=null, lastClick=null, hoverAt=null;
  function drawOverlay(){
    if(!ov) return;
    const s=cssSize(canvas,o.size), W=Math.max(1,Math.round(s.w*dpr)), H=Math.max(1,Math.round(s.h*dpr));
    if(ov.width!==W) ov.width=W; if(ov.height!==H) ov.height=H;
    const c=ov.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,W,H);
    if(!dead) paintLabels(c,labels,theme,box,W/s.w);
  }
  const clearOverlay=()=>{ labels=[]; if(ov){ const c=ov.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,ov.width,ov.height); } };
  const caps=new Map(), whenReady=[];
  const send=(m,tr)=>{ if(port&&!dead) port.post(m,tr); };
  const expect=()=>{ if(ready&&!playing&&!awaiting) awaiting=performance.now(); };
  const report=(kind,msg)=>{ try{ o.onError&&o.onError(kind,msg); }catch(e){ console.error(e); } };
  const entry={id, ready:false, playing, poster:isPoster, n:++journalN};
  const noteJournal=()=>{ if(journaled && journal.includes(entry)){ entry.playing=playing; writeJournal(); } };
  function kill(kind,msg,dropFrame){
    if(dead) return; state=kind; shutdown(dropFrame);
    console.warn(`loci: ${id} ${kind}${msg?': '+msg:''}`); report(kind,msg);
  }
  /* A stopped piece's last frame stays on show under its card, until its canvas goes (keep). Disposed or blocked, it goes now. */
  function shutdown(dropFrame){
    if(wd){ clearInterval(wd); wd=0; live--; } dead=true; clearOverlay();
    mounts.delete(handle); { const i=journal.indexOf(entry); if(i>=0){ journal.splice(i,1); if(journaled) writeJournal(); } }
    if(flushRaf) cancelAnimationFrame(flushRaf); if(flushTO) clearTimeout(flushTO); flushRaf=flushTO=0; q.length=0;
    if(cursor){ cursor=''; try{ canvas.style.cursor=''; }catch(_){} }
    if(onFrameMsg){ removeEventListener('message',onFrameMsg); onFrameMsg=null; }
    const p=port, fr=frame; port=null;
    if(p) try{ p.post({type:'dispose'}); }catch(_){}
    const hide=fr&&(dropFrame||!fr.el.isConnected||fr.el.style.display==='none');
    if(fr && !hide){ const k={id, drop(){ stoppedFrames.delete(k); fr.drop(); }}; stoppedFrames.add(k); fr.onDrop=()=>stoppedFrames.delete(k); }
    if(fr){ setTimeout(()=>{ try{ fr.el.contentWindow&&fr.el.contentWindow.postMessage({type:'loci:stop'},'*'); }catch(_){} if(p) p.close(); if(hide) fr.drop(); },dropFrame==='now'?0:50); if(dropFrame==='now') fr.el.style.visibility='hidden'; }
    for(const [,c] of caps) c.reject(new Error('disposed')); caps.clear();
  }
  function watchdog(){
    const now=performance.now();
    if(!pageRendering(now)){ lastBeat=now; if(awaiting) awaiting=now; if(!ready) readyBy=now+SETUP_MS; return; } // no page frames, no worker frames
    if(!ready){ if(now>readyBy) kill('stalled',frameUp?`setup did not finish within ${SETUP_MS/1000} s`:'the sandbox did not start'); return; }
    if(playing && now-lastBeat>NUDGE_MS && now-lastNudge>NUDGE_MS){ lastNudge=now; send({type:'nudge'}); } // a frame the browser is throttling still has to draw; a stuck one cannot answer
    if(playing && now-lastBeat>STALL_MS) kill('stalled',`no frame for ${Math.round(now-lastBeat)} ms`);
    else if(awaiting && now-awaiting>STALL_MS) kill('stalled',`no frame for ${Math.round(now-awaiting)} ms`);
  }
  function budget(ms,gpu){
    const cpu=ms; if(gpu!=null) ms+=gpu; // with a GPU timer, the budget is CPU + GPU per frame
    if(warm<WARMUP){ warm++; return; } // the first frames after a change build caches
    samples.push(ms); if(samples.length>WINDOW) samples.shift(); if(samples.length<12) return;
    const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
    if(avg>SLOW_MS){ playing=false; send({type:'pause'}); state='slow'; console.warn(`loci: ${id} slow, ${avg.toFixed(1)} ms per frame`); report('slow',`averaging ${Math.round(avg)} ms per frame`); samples=[]; return; }
    if(avg>STEP_MS && step===1){ step=2; send({type:'step', n:2}); samples=[]; console.info(`loci: ${id} stepped down to 30 fps (${avg.toFixed(1)} ms per frame)`); }
    else if(avg<STEP_MS/2 && step===2){ step=1; send({type:'step', n:1}); samples=[]; }
    if(o.onStats) o.onStats(gpu!=null?{t, ms, cpu, gpu, avg, step}:{t, ms, avg, step});
  }
  function onMsg(m){
    if(dead || !m || typeof m!=='object') return;
    if(m.type==='ready'){ ready=true; state='running'; lastBeat=performance.now(); entry.ready=true; noteJournal(); whenReady.splice(0).forEach(f=>f()); }
    else if(m.type==='beat'){ lastBeat=performance.now(); awaiting=0; t=m.t; if(m.drawn && playing) budget(m.ms,m.gpu); }
    else if(m.type==='labels'){ labels=Array.isArray(m.labels)?m.labels.slice(0,64):[]; drawOverlay(); }
    else if(m.type==='error') kill('error',String(m.message).slice(0,500));
    else if(m.type==='need-font'){ if(typeof m.family==='string') fontBytes(m.family).then(faces=>send({type:'font', family:m.family, faces},faces.map(f=>f.buf))); }
    else if(m.type==='cursor'){ const c=CURSORS.includes(m.cursor)?m.cursor:''; if(c!==cursor){ cursor=c; canvas.style.cursor=c; } }
    else if(m.type==='view'){
      if(m.error){ if(!viewWarned){ viewWarned=true; console.warn(`loci: ${id} view ignored: ${m.error}`); } return; }
      if(m.view!=null){ let j=null; try{ j=JSON.stringify(m.view); }catch(_){} if(j==null || j.length>4096) return; }
      view=m.view==null?null:m.view; try{ o.onView&&o.onView(view); }catch(e){ console.error(e); }
    }
    else if(m.type==='capture'){ const c=caps.get(m.id); if(c){ caps.delete(m.id);
      if(!(m.blob instanceof Blob)) return c.reject(new Error(String(m.error||'capture failed').slice(0,500)));
      composite(m.blob,m.labels,theme,box,m.w).then(c.resolve,c.reject); } }
  }
  /* canvas CSS px from client coordinates (the parallax style transforms the stage, so scale by the layout size) */
  function rel(cx,cy){
    const r=canvas.getBoundingClientRect(), w=canvas.clientWidth||r.width||1, h=canvas.clientHeight||r.height||1;
    return [(cx-r.left)*w/(r.width||w), (cy-r.top)*h/(r.height||h)];
  }
  const mods=e=>({shift:e.shiftKey, ctrl:e.ctrlKey, alt:e.altKey, meta:e.metaKey});
  const plist=()=>[...ptrs].map(([pid,p])=>({id:pid, x:p.x, y:p.y}));
  /* a DOM event as zero or more normalized events: a pointerup may also produce a click, and two clicks a dblclick */
  function fromDOM(e){
    const ty=e.type, out=[];
    if(ty==='wheel'){
      const k=e.deltaMode===1?16:e.deltaMode===2?(canvas.clientHeight||600):1, [x,y]=rel(e.clientX,e.clientY);
      out.push({type:'wheel', x, y, deltaX:e.deltaX*k, deltaY:e.deltaY*k, ...mods(e), pointers:plist()}); return out;
    }
    if(ty==='keydown'||ty==='keyup'){ out.push({type:ty, key:e.key, code:e.code, repeat:e.repeat, ...mods(e)}); return out; }
    if(!/^pointer(down|move|up|cancel)$/.test(ty)) return out;
    const [x,y]=rel(e.clientX,e.clientY), pid=e.pointerId, prev=ptrs.get(pid)||(ty==='pointermove'&&!ptrs.size?hoverAt:null);
    const dx=prev?x-prev.x:0, dy=prev?y-prev.y:0, base={x, y, dx, dy, button:e.button, buttons:e.buttons, pointerType:e.pointerType, ...mods(e)};
    if(ty==='pointerdown'){
      ptrs.set(pid,{x,y});
      if(ptrs.size===1) press={id:pid, x, y, at:performance.now(), far:0, button:e.button}; else press=null; // a second finger is a pinch, not a click
      out.push({type:ty, ...base, dx:0, dy:0, buttons:e.buttons||1, pointers:plist()});
    } else if(ty==='pointermove'){
      if(ptrs.has(pid)) ptrs.set(pid,{x,y}); else hoverAt={x,y};
      if(press && press.id===pid) press.far=Math.max(press.far,Math.hypot(x-press.x,y-press.y));
      out.push({type:ty, ...base, buttons:ptrs.has(pid)?(e.buttons||1):0, pointers:plist()});
    } else {
      ptrs.delete(pid); hoverAt={x,y};
      out.push({type:ty, ...base, buttons:0, pointers:plist()});
      const p=press; press=null;
      if(ty==='pointerup' && p && p.id===pid && p.button===0 && p.far<CLICK_PX && performance.now()-p.at<CLICK_MS){
        out.push({type:'click', x, y, button:0, pointerType:e.pointerType, ...mods(e)});
        const now=performance.now(), lc=lastClick;
        if(lc && now-lc.at<DBL_MS && Math.hypot(x-lc.x,y-lc.y)<DBL_PX){ out.push({type:'dblclick', x, y, button:0, pointerType:e.pointerType, ...mods(e)}); lastClick=null; }
        else lastClick={x, y, at:now};
      }
    }
    return out;
  }
  function flush(){
    if(flushRaf){ cancelAnimationFrame(flushRaf); flushRaf=0; } if(flushTO){ clearTimeout(flushTO); flushTO=0; }
    if(!q.length || dead || !port) return;
    send({type:'events', list:q.splice(0)}); expect();
  }
  function enqueue(ev){
    const last=q[q.length-1];
    // at most one pointermove per frame (deltas summed, latest position), and one wheel (deltas summed)
    if(last && last.type===ev.type && (ev.type==='pointermove'&&last.buttons===ev.buttons || ev.type==='wheel')){
      last.x=ev.x; last.y=ev.y; last.pointers=ev.pointers; last.t=ev.t;
      if(ev.type==='wheel'){ last.deltaX+=ev.deltaX; last.deltaY+=ev.deltaY; } else { last.dx+=ev.dx; last.dy+=ev.dy; }
    } else { if(q.length>=MAX_QUEUE) q.shift(); q.push(ev); }
    if(!flushRaf) flushRaf=requestAnimationFrame(flush);
    if(!flushTO) flushTO=setTimeout(flush,50); // a page that is not rendering frames still delivers input
  }
  const handle={
    get state(){ return state; }, get playing(){ return playing; }, id, render, pointer,
    /* the kill switch: stop now, and take the picture away too */
    block(reason){ if(dead) return; kill('blocked',reason,'now'); },
    /* forward one DOM or plain event to the module (see the header) */
    input(e){
      if(dead) return;
      const list=(typeof Event!=='undefined' && e instanceof Event)?fromDOM(e):[e];
      for(const x of list){ const n=normEvent(x,t); if(n) enqueue(n); }
    },
    flush(){ flush(); },
    /* the pointers the host believes are down (cleared on release so a lost pointerup cannot leave a drag running) */
    resetPointers(){ ptrs.clear(); press=null; hoverAt=null; },
    getView(){ return view; },
    setView(v){ view=LM.normalizeView?LM.normalizeView(v):null; send({type:'view', view}); expect(); },
    play(){ if(dead||playing) return; playing=true; lastBeat=performance.now(); awaiting=0; warm=0; samples=[]; if(state==='slow') state='running'; send({type:'play'}); noteJournal(); },
    pause(){ if(dead||!playing) return; playing=false; send({type:'pause'}); noteJournal(); },
    seek(x){ t=Math.max(0,+x||0); send({type:'seek', t}); expect(); },
    setSpeed(x){ speed=Math.max(0,+x||0); send({type:'speed', x:speed}); },
    setTheme(th){ theme=th; warm=0; drawOverlay(); send({type:'theme', theme}); expect(); },
    setParams(p){ params=p; warm=0; send({type:'params', params, seed:seedOf(spec.manifest,params,o.seed)}); expect(); },
    resize(b,d){ box=b; if(d) dpr=d; warm=0; const s=cssSize(canvas,o.size); drawOverlay(); send({type:'resize', box, dpr, w:s.w, h:s.h}); expect(); },
    capture(){
      if(dead) return Promise.reject(new Error('disposed'));
      flush(); // queued input reaches the module before the frame is drawn
      return new Promise((resolve,reject)=>{ const go=()=>{ const n=++capN; caps.set(n,{resolve,reject}); send({type:'capture', id:n}); expect(); }; ready?go():whenReady.push(go); });
    },
    getTime(){ return t; },
    dispose(){ if(frame && dead){ const f=frame; frame=null; f.drop(); return; } if(dead) return; state='disposed'; shutdown(true); },
  };

  const refuse=(kind,msg)=>{ state=kind; dead=true; setTimeout(()=>report(kind,msg),0); return handle; };
  if(!canWorker) return refuse('unsupported','This browser has no OffscreenCanvas, which the sandbox needs.');
  if(blocked.has(id)) return refuse('blocked',blocked.get(id));
  if(journaled && crashed.has(id)) return refuse('crashed','The browser tab crashed while this piece was running.');
  mounts.add(handle);
  if(journaled){ journal.push(entry); writeJournal(); }
  readyBy=performance.now()+SETUP_MS; wd=setInterval(watchdog,100); startTicker();
  (async()=>{
    const src=await text(), module={runtime:spec.runtime, render};
    let three=null;
    if(spec.runtime==='js'){
      module.source=String(spec.source);
      if(usesThree(module.source)){ try{ three={text:await fetchThree()}; }catch(e){ console.warn('loci: @loci/three could not load:',e.message); } }
    }
    else module.bytes=(spec.bytes||await fetchBytes(spec.url)).slice(0); // a copy: the cached bytes stay with the host
    if(dead) return;
    const s=cssSize(canvas,o.size);
    const init={type:'init', module, manifest:plain(spec.manifest), theme, params, box, dpr, seed:seedOf(spec.manifest,params,o.seed), t, speed, playing, w:s.w, h:s.h, kit:KIT, three, view};
    drawOverlay();
    onFrameMsg=e=>{
      if(!frame || e.source!==frame.el.contentWindow) return;
      const m=e.data; if(!m || typeof m!=='object') return;
      if(m.type==='loci:error') return kill('error',String(m.message||'worker error').slice(0,500));
      if(m.type!=='loci:ready' || frameUp) return;
      frameUp=true;
      const ch=new MessageChannel();
      ch.port1.onmessage=ev=>onMsg(ev.data);
      port={post:(x,tr)=>ch.port1.postMessage(x,tr||[]), close:()=>ch.port1.close()};
      frame.el.contentWindow.postMessage({type:'loci:start', worker:src, port:ch.port2},'*',[ch.port2]);
      port.post(init,[module.bytes].filter(Boolean));
      fontFaces().then(list=>send({type:'fonts', families:[...new Set(list.map(f=>f.family))]}));
    };
    addEventListener('message',onFrameMsg);
    frame=makeFrame(canvas,runnerURL);
    readyBy=performance.now()+SETUP_MS;
    const tags=o.target?[o.target,render,o.label]:[render==='webgl2'?'webgl2':null,o.label]; // e.g. "(mobile, canvas2d)"
    tags.splice(0,tags.length,...tags.filter(Boolean));
    console.info(`loci: mounted ${id} in the sandbox${tags.length?' ('+tags.join(', ')+')':''}`);
  })().catch(e=>kill('error',e.message||String(e)));
  return handle;
}

/* A still frame, e.g. for a thumbnail: mount on a detached canvas, capture one PNG, dispose. */
function poster(spec,o){
  let fail; const err=new Promise((_,rej)=>fail=rej);
  const cv=document.createElement('canvas'), h=mount(cv,spec,{...o, playing:false, size:{w:o.w,h:o.h}, label:'poster', onError:(k,m)=>fail(new Error(`${k}: ${m}`))});
  return Promise.race([h.capture().catch(e=>new Promise((_,rej)=>setTimeout(()=>rej(e),0))),err]).finally(()=>h.dispose()); // why it stopped, rather than "disposed"
}

/* What this browser can run, for choosing a manifest target (manifest.js targetFor). WebGL2 is probed once on a
   throwaway canvas, left to the garbage collector (releasing it by hand makes Firefox warn "WebGL context was lost"); pointer, viewport and Save-Data are read on every call. */
let glProbe=null;
function hasWebGL2(){
  if(glProbe==null){
    try{ const c=document.createElement('canvas'), g=c.getContext('webgl2'); glProbe=!!g; }
    catch(_){ glProbe=false; }
  }
  return glProbe;
}
function caps(){
  const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  return {webgl2:hasWebGL2(), coarsePointer:matchMedia('(pointer:coarse)').matches, viewportW:innerWidth, viewportH:innerHeight, saveData:!!(conn&&conn.saveData)};
}

window.LociHost={mount, poster, caps, hasWebGL2, supported:canWorker, THREE, normEvent, EVENT_TYPES, CURSORS, STALL_MS, STEP_MS, SLOW_MS,
  noteActive(id){ if(id!==activeId){ activeId=id; if(journal.length) writeJournal(); } }, setBlocked, isBlocked:id=>blocked.has(id), blockedReason:id=>blocked.get(id)||'', forgive, isCrashed:id=>crashed.has(id), setRunnerURL(u){ if(typeof u==='string'&&u) runnerURL=u; }};
})();
