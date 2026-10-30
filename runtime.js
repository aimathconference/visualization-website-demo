/* ---------- LociHost: runs a module in a sandboxed worker (docs/module-api.md, sections 3 and 4) ----------
   mount(canvas, moduleSpec, opts) -> handle. moduleSpec is
     { runtime:'js', render:'canvas2d'|'webgl2', source, manifest, trusted? }   or
     { runtime:'wasm', render:'pixels'|'commands', bytes|url, manifest, trusted? }
   opts: { theme, params, box, dpr, seed, t, speed, playing, size, label, target, overlay, onError(kind, message), onStats(stats) }
   target: the manifest target this spec is ('desktop' | 'mobile' | 'any'), for the mount log line.
   overlay: an optional 2D canvas layered over the stage; labels a module returns from draw() are drawn there with the
   theme font (and composited into capture() PNGs whether or not there is an overlay).
   onError kinds: 'stalled' (watchdog), 'slow' (frame budget), 'error' (module threw), 'unsupported'.
   view: the module's view to restore after setup (docs/module-api.md section 5); onView(view) hears every change.
   Pointer input: h.input(e) takes a DOM PointerEvent, WheelEvent or KeyboardEvent (or an already normalized plain
   object), normalizes it to canvas CSS px, synthesizes click and dblclick from pointer sequences, coalesces moves and
   wheel deltas per animation frame and sends the batch to the worker. The page decides when to forward (engagement).
   A canvas can be mounted once (transferControlToOffscreen is one-way); mount a fresh canvas to restart. */
(function(){
'use strict';
const STALL_MS=500, SETUP_MS=8000, STEP_MS=12, SLOW_MS=40, WARMUP=6, WINDOW=24;
const BASE=(document.currentScript&&document.currentScript.src)||document.baseURI;
const WORKER_URL=new URL('worker.js',BASE).href;
const FONTS_CSS=(document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com/css"]')||{}).href||'';
const KIT={names:LOCI_KIT.map(f=>f.name), source:[...(typeof LOCI_KIT_PRIVATE!=='undefined'?LOCI_KIT_PRIVATE:[]),...LOCI_KIT].map(String).join('\n')};
/* @loci/three: one pinned build for the whole site, fetched once per page and handed to each worker as text */
const THREE={url:'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js', integrity:'sha384-IDC7sAMAIMB/TZ6dgKKPPAKZ2bXXXP8+FBMBC8cU319eBhKITx+PaalhfDkDNH28', version:'0.170.0'};
let threeText=null;
const fetchThree=()=>threeText||(threeText=fetch(THREE.url,{integrity:THREE.integrity}).then(r=>{ if(!r.ok) throw new Error(`@loci/three: HTTP ${r.status}`); return r.text(); }).catch(e=>{ threeText=null; throw e; }));
const usesThree=src=>/^[ \t]*import\b[^;]*?\bfrom\s*['"]@loci\/three['"]/m.test(String(src));
const canWorker=typeof Worker!=='undefined' && typeof OffscreenCanvas!=='undefined' && typeof HTMLCanvasElement!=='undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;

/* The page's own frame clock. Worker frames are tied to the page's rendering, so when the page itself is not
   producing frames (hidden, occluded, not composited) a silent worker is not a stalled one. */
let pageFrame=performance.now(), live=0, ticking=false;
function tickPage(now){ pageFrame=now; if(live>0) requestAnimationFrame(tickPage); else ticking=false; }
function startTicker(){ live++; if(!ticking){ ticking=true; pageFrame=performance.now(); requestAnimationFrame(tickPage); } }
const pageRendering=now=>!document.hidden && now-pageFrame<250;

let workerText=null, workerBlob=null;
const text=()=>workerText||(workerText=fetch(WORKER_URL).then(r=>{ if(!r.ok) throw new Error(`worker.js: HTTP ${r.status}`); return r.text(); }).catch(e=>{ workerText=null; throw e; }));
const blobURL=async()=>workerBlob||(workerBlob=URL.createObjectURL(new Blob([await text()],{type:'text/javascript'})));
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
  const id=spec.manifest.id, inWorker=canWorker && !LociHost.forceFallback;
  let theme=o.theme, params=o.params||{}, box=o.box, dpr=o.dpr||1, t=+o.t||0, speed=o.speed??1, playing=!!o.playing;
  let port=null, ready=false, dead=false, lastBeat=0, awaiting=0, readyBy=0, wd=0, step=1, warm=0, samples=[], capN=0, state='loading';
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
  function kill(kind,msg){
    if(dead) return; state=kind; shutdown();
    console.warn(`loci: ${id} ${kind}${msg?': '+msg:''}`); report(kind,msg);
  }
  function shutdown(){
    if(wd){ clearInterval(wd); wd=0; live--; } dead=true; clearOverlay();
    if(flushRaf) cancelAnimationFrame(flushRaf); if(flushTO) clearTimeout(flushTO); flushRaf=flushTO=0; q.length=0;
    if(cursor){ cursor=''; try{ canvas.style.cursor=''; }catch(_){} }
    if(port){ try{ port.post({type:'dispose'}); }catch(_){} const p=port; port=null; setTimeout(()=>p.terminate(),50); }
    for(const [,c] of caps) c.reject(new Error('disposed')); caps.clear();
  }
  function watchdog(){
    const now=performance.now();
    if(!pageRendering(now)){ lastBeat=now; if(awaiting) awaiting=now; if(!ready) readyBy=now+SETUP_MS; return; } // no page frames, no worker frames
    if(!ready){ if(now>readyBy) kill('stalled',`setup did not finish within ${SETUP_MS/1000} s`); return; }
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
    if(dead) return;
    if(m.type==='ready'){ ready=true; state='running'; lastBeat=performance.now(); whenReady.splice(0).forEach(f=>f()); }
    else if(m.type==='beat'){ lastBeat=performance.now(); awaiting=0; t=m.t; if(m.drawn && playing) budget(m.ms,m.gpu); }
    else if(m.type==='labels'){ labels=Array.isArray(m.labels)?m.labels:[]; drawOverlay(); }
    else if(m.type==='error') kill('error',m.message);
    else if(m.type==='cursor'){ const c=CURSORS.includes(m.cursor)?m.cursor:''; if(c!==cursor){ cursor=c; canvas.style.cursor=c; } }
    else if(m.type==='view'){
      if(m.error){ if(!viewWarned){ viewWarned=true; console.warn(`loci: ${id} view ignored: ${m.error}`); } return; }
      view=m.view==null?null:m.view; try{ o.onView&&o.onView(view); }catch(e){ console.error(e); }
    }
    else if(m.type==='capture'){ const c=caps.get(m.id); if(c){ caps.delete(m.id);
      if(!m.blob) return c.reject(new Error(m.error||'capture failed'));
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
    get state(){ return state; }, get playing(){ return playing; }, inWorker, render, pointer,
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
    play(){ if(dead||playing) return; playing=true; lastBeat=performance.now(); awaiting=0; warm=0; samples=[]; if(state==='slow') state='running'; send({type:'play'}); },
    pause(){ if(dead||!playing) return; playing=false; send({type:'pause'}); },
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
    dispose(){ if(dead) return; state='disposed'; shutdown(); },
  };

  if(!inWorker && !spec.trusted){ state='unsupported'; dead=true; setTimeout(()=>report('unsupported','This browser has no OffscreenCanvas, and only reviewed pieces may run on the page.'),0); return handle; }
  (async()=>{
    const src=await text(), module={runtime:spec.runtime, render};
    let three=null;
    if(spec.runtime==='js'){
      module.source=String(spec.source);
      if(usesThree(module.source)){ three={url:THREE.url, integrity:THREE.integrity}; try{ three.text=await fetchThree(); }catch(e){ console.warn('loci: @loci/three prefetch failed; the worker will try',e.message); } }
    }
    else module.bytes=(spec.bytes||await fetchBytes(spec.url)).slice(0); // a copy: the cached bytes stay with the host
    if(dead) return;
    const s=cssSize(canvas,o.size);
    const init={type:'init', module, manifest:plain(spec.manifest), theme, params, box, dpr, seed:seedOf(spec.manifest,params,o.seed), t, speed, playing, w:s.w, h:s.h, kit:KIT, fontsCss:FONTS_CSS, three, view};
    drawOverlay();
    if(inWorker){
      const off=canvas.transferControlToOffscreen(), w=new Worker(await blobURL(),{name:`loci:${id}`});
      if(dead){ w.terminate(); return; }
      w.onmessage=e=>onMsg(e.data);
      w.onerror=e=>{ e.preventDefault(); kill('error',e.message||'worker error'); };
      port={post:(m,tr)=>w.postMessage(m,tr||[]), terminate:()=>w.terminate()};
      init.canvas=off; port.post(init,[off,module.bytes].filter(Boolean));
    } else {
      // Fallback: the same engine on the main thread, against the real canvas. No isolation, so reviewed pieces only.
      const G={postMessage:m=>queueMicrotask(()=>onMsg(m)), requestAnimationFrame:f=>requestAnimationFrame(f), cancelAnimationFrame:i=>cancelAnimationFrame(i), fonts:document.fonts, onmessage:null};
      new Function('LOCI_SELF',src)(G);
      port={post:m=>queueMicrotask(()=>G.onmessage&&G.onmessage({data:m})), terminate:()=>{}};
      init.canvas=canvas; port.post(init);
    }
    readyBy=performance.now()+SETUP_MS; wd=setInterval(watchdog,100); startTicker();
    const tags=o.target?[o.target,render,o.label]:[render==='webgl2'?'webgl2':null,o.label]; // e.g. "(mobile, canvas2d)"
    tags.splice(0,tags.length,...tags.filter(Boolean));
    console.info(`loci: mounted ${id} in ${inWorker?'worker':'main thread (fallback)'}${tags.length?' ('+tags.join(', ')+')':''}`);
  })().catch(e=>kill('error',e.message||String(e)));
  return handle;
}

/* A still frame, e.g. for a thumbnail: mount on a detached canvas, capture one PNG, dispose. */
function poster(spec,o){
  let fail; const err=new Promise((_,rej)=>fail=rej);
  const cv=document.createElement('canvas'), h=mount(cv,spec,{...o, playing:false, size:{w:o.w,h:o.h}, label:'poster', onError:(k,m)=>fail(new Error(`${k}: ${m}`))});
  return Promise.race([h.capture(),err]).finally(()=>h.dispose());
}

/* What this browser can run, for choosing a manifest target (manifest.js targetFor). WebGL2 is probed once on a
   throwaway canvas (and the context released); pointer, viewport and Save-Data are read on every call. */
let glProbe=null;
function hasWebGL2(){
  if(glProbe==null){
    try{ const c=document.createElement('canvas'), g=c.getContext('webgl2'); glProbe=!!g; if(g){ const x=g.getExtension('WEBGL_lose_context'); if(x) x.loseContext(); } }
    catch(_){ glProbe=false; }
  }
  return glProbe;
}
function caps(){
  const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  return {webgl2:hasWebGL2(), coarsePointer:matchMedia('(pointer:coarse)').matches, viewportW:innerWidth, viewportH:innerHeight, saveData:!!(conn&&conn.saveData)};
}

window.LociHost={mount, poster, caps, hasWebGL2, supported:canWorker, THREE, normEvent, EVENT_TYPES, CURSORS, forceFallback:/[?&]fallback=1\b/.test(location.search), STALL_MS, STEP_MS, SLOW_MS};
})();
