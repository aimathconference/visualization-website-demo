/* ---------- EigenReelHost: runs a piece in a sandboxed frame (docs/submission-spec-slop.md, sections 2 to 6 and 10) ----------
   Every piece is untrusted, whoever wrote it and whoever reviewed it. Each mount gets its own
   <iframe sandbox="allow-scripts"> (runner.html) and a worker inside it (worker.js). The frame draws on its own canvases
   and sits exactly behind `canvas`, which stays transparent and keeps layout and focus. A canvas that is not in the
   document (a poster, a recording) gets a hidden frame and is read through capture(). The page hands the frame
   everything it may use: the piece, the kit, three.js, the .wasm and the font bytes. Nothing in the frame can reach the
   network or this page; messages from it are treated as untrusted. The full contract is in docs/sandbox.md, "Host API".

   EigenReelHost.mount(canvas, piece, opts) -> handle
     piece = { slug, source, meta, colors, wasm? }
       meta    the metadata as EigenReelSpec.read() returns it (title, params, presets, time, context, modes, interact,
               libraries, ...). Data: the worker trusts it, because the page validated it.
       colors  the piece's COLORS. bg and fg come from opts.site where missing; only #rrggbb values are passed on.
       wasm    an ArrayBuffer or a URL (same origin) of the piece's .wasm, if it ships one: env.wasm() hands it out.
     opts = { params, t, playing, device:'desktop'|'phone', mode:'feed'|'interact', fullscreen, box:{x,y,w,h}, dpr,
              size:{w,h} (for a detached canvas), site:{bg,fg}, label:'poster'|'checker'|undefined,
              onError(kind, message), onParam(key, value, params), onLeave(why), onStats(stats), onUIDropped(what), onEnded() }
       params  normalized already (every declared key, valid values); missing, the defaults are used.
       label   'checker' mounts are not written to the crash journal; 'poster' mounts are blamed for a crash last.
     handle: id (the slug), state, playing, mode, play(), pause(), seek(t), getTime(), setParams(p), getParams(),
       setMode({mode, fullscreen, device}), resize(box, dpr), capture() -> Promise<Blob> (PNG; a webgl2 piece's overlay
       composited in), input(e), dispose(), block(reason)
       setParams(p): the host re-validates nothing here: pass normalized params.
       setMode: interact mode only for a piece whose meta declares `interact`. In interact mode the frame takes pointer
         events (pointer-events:auto) and gets focus, and the runner shows the piece's env.ui over the box; the page lets
         events through its own canvas (pointer-events:none on it). In feed mode the frame takes none.
       input(e): a plain event object {type, x, y, key, ...} for the piece's env.ui root, as if the viewer made it. It
         reaches the piece only in interact mode (the checker drives pieces with it).
     onError kinds: 'stalled' (setup over 8 s, or one draw, event handler or onMode call over 250 ms), 'error' (the piece
       threw; the message says where: setup, draw, onMode, event), 'memory' (a WebAssembly memory over 64 MiB),
       'unsupported' (no OffscreenCanvas), 'blocked' (the kill switch: setBlocked), 'crashed' (the tab crashed while it
       ran: forgive(id) to retry), 'navigated' (the frame loaded a second time).
     onParam(key, value, params): the piece called env.setParam; value is validated again here, params is the new set.
     onLeave(why): the viewer asked to leave interact mode from inside the frame: 'esc', or 'outside' (a press in the
       frame outside the box). The page decides; setMode({mode:'feed'}) leaves.
     onEnded(): a time.loop:false piece reached time.length and holds its last frame (playing is false; play() restarts).
   EigenReelHost.poster(piece, {w, h, t, params, device, site, dpr?, box?}) -> Promise<Blob>
   EigenReelHost.caps(), hasWebGL2(), supported, setBlocked(items), isBlocked(id), blockedReason(id), forgive(id),
     isCrashed(id), noteActive(id), setRunnerURL(url), validateValue(param, value), THREE, CALL_MS, SETUP_MS */
(function(){
'use strict';
const STALL_MS=500, NUDGE_MS=200, CALL_MS=250, SETUP_MS=8000, STEP_MS=12, WARMUP=6, WINDOW=24, FONT_MS=3000;
const BASE=(document.currentScript&&document.currentScript.src)||document.baseURI;
const WORKER_URL=new URL('worker.js',BASE).href;
/* where runner.html lives: beside this file, or RUNNER_URL (config.js) or the server's runnerUrl for a separate domain */
let runnerURL=(typeof RUNNER_URL==='string'&&RUNNER_URL)||new URL('runner.html',BASE).href;
const KIT={names:EIGENREEL_KIT.map(f=>f.name), source:[...(typeof EIGENREEL_KIT_PRIVATE!=='undefined'?EIGENREEL_KIT_PRIVATE:[]),...EIGENREEL_KIT].map(String).join('\n')};
/* @eigenreel/three: the site's own copy (byte-identical to cdnjs's three.module.min.js 0.170.0, same SRI), fetched once
   per page from this origin and handed to each worker as text */
const THREE={url:new URL('vendor/three-0.170.0.module.js',BASE).href, integrity:'sha384-IDC7sAMAIMB/TZ6dgKKPPAKZ2bXXXP8+FBMBC8cU319eBhKITx+PaalhfDkDNH28', version:'0.170.0'};
let threeText=null;
const fetchThree=()=>threeText||(threeText=fetch(THREE.url,{integrity:THREE.integrity}).then(r=>{ if(!r.ok) throw new Error(`@eigenreel/three: HTTP ${r.status}`); return r.text(); }).catch(e=>{ threeText=null; throw e; }));
const usesThree=src=>/^[ \t]*import\b[^;]*?\bfrom\s*['"]@eigenreel\/three['"]/m.test(String(src));

/* ---------- the site's font: the sandbox has no network, so the page fetches its bytes before init ----------
   The family is the page's body font (--f-body); its files come from the page's font stylesheet. */
const familyOf=css=>(String(css||'').match(/^\s*["']?([^"',]+?)["']?\s*(,|$)/)||[])[1]||'';
let siteFont=null;
function loadSiteFont(){
  return siteFont||(siteFont=(async()=>{
    const link=document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com/css"],link[rel="stylesheet"][href$="fonts.css"]');
    const family=familyOf(getComputedStyle(document.documentElement).getPropertyValue('--f-body'))||familyOf(getComputedStyle(document.body||document.documentElement).fontFamily);
    if(!link || !family) return null;
    const css=await fetch(link.href).then(r=>r.ok?r.text():'');
    const faces=[], seen=new Set();
    for(const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)){
      const d={}; for(const part of m[1].split(';')){ const i=part.indexOf(':'); if(i>0) d[part.slice(0,i).trim()]=part.slice(i+1).trim(); }
      const src=(String(d.src||'').match(/url\((['"]?)([^'")]+)\1\)/)||[])[2];
      if(!src || String(d['font-family']||'').replace(/^['"]|['"]$/g,'')!==family) continue;
      const url=new URL(src,link.href).href, key=`${url} ${d['font-style']} ${d['font-weight']} ${d['unicode-range']}`;
      if(seen.has(key)) continue; seen.add(key);
      faces.push({url, style:d['font-style']||'normal', weight:d['font-weight']||'400', unicodeRange:d['unicode-range']||'U+0-10FFFF'});
    }
    const files=new Map(), got=await Promise.allSettled(faces.map(f=>{
      if(!files.has(f.url)) files.set(f.url,fetch(f.url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })); // one file often serves several weights
      return files.get(f.url).then(buf=>({buf, style:f.style, weight:f.weight, unicodeRange:f.unicodeRange}));
    }));
    const ok=got.filter(x=>x.status==='fulfilled').map(x=>x.value);
    return ok.length?{family, faces:ok}:null;
  })().catch(()=>null));
}
/* copies for one mount (the bytes are transferred to the frame), or null if the font is slow or missing */
const fontFor=()=>Promise.race([loadSiteFont(), new Promise(r=>setTimeout(()=>r(null),FONT_MS))])
  .then(f=>f?{family:f.family, faces:f.faces.map(x=>({...x, buf:x.buf.slice(0)}))}:null);

/* ---------- params (spec, section 4) ----------
   validateValue(param, value): ranges snap to min + k·step and clamp, toggles are booleans, selects are an option's value;
   anything else is the default. The worker applies the same rules to env.setParam; the page checks again here. */
const decimals=x=>{ const s=String(x), e=s.match(/e-(\d+)$/i); if(e) return +e[1]+((s.split('e')[0].split('.')[1]||'').length); return (s.split('.')[1]||'').length; };
function ownValidate(p,v){
  if(p.type==='range'){
    const min=+p.min, max=+p.max, st=+p.step;
    if(typeof v!=='number' || !Number.isFinite(v)) return p.default;
    let x=st>0?min+Math.round((v-min)/st)*st:v;
    x=+x.toFixed(Math.min(20,Math.max(decimals(st),decimals(min))));
    return Math.min(max,Math.max(min,x));
  }
  if(p.type==='toggle') return typeof v==='boolean'?v:p.default;
  if(p.type==='select') return (p.options||[]).some(o=>Array.isArray(o)&&o[0]===v)?v:p.default;
  return p.default;
}
function validateValue(p,v){
  const S=window.EigenReelSpec;
  if(S && typeof S.validateValue==='function') try{ return S.validateValue(p,v); }catch(_){}
  return ownValidate(p,v);
}
const defaults=meta=>Object.fromEntries((Array.isArray(meta.params)?meta.params:[]).filter(p=>p&&typeof p.key==='string').map(p=>[p.key,p.default]));
const HEX=/^#[0-9a-fA-F]{6}$/;
function cssVar(name,d){ const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return HEX.test(v)?v:d; }
/* the piece's colors as the page applies them: #rrggbb values only, bg and fg always present (spec, section 2) */
function colorsOf(c,site){
  const out={};
  for(const [k,v] of Object.entries(c&&typeof c==='object'?c:{})) if(typeof v==='string' && HEX.test(v)) out[k]=v;
  const s=site||{};
  if(!out.bg) out.bg=HEX.test(s.bg||'')?s.bg:cssVar('--bg','#000000');
  if(!out.fg) out.fg=HEX.test(s.fg||'')?s.fg:cssVar('--fg','#ffffff');
  return out;
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
   Checker mounts are not journaled: an author running their own piece has already chosen to. */
const J_KEY='eigenreel:mounting', C_KEY='eigenreel:crashed';
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
  if(who && typeof who.id==='string'){ crashed.add(who.id); ss.set(C_KEY,[...crashed]); console.warn(`eigenreel: the tab stopped while ${who.id} was running, so it is skipped until someone asks for it`); }
  ss.set(J_KEY,[]); }
addEventListener('pagehide',()=>{ leaving=true; ss.set(J_KEY,[]); });
addEventListener('pageshow',e=>{ if(e.persisted){ leaving=false; writeJournal(); } });
function forgive(id){ if(crashed.delete(id)) ss.set(C_KEY,[...crashed]); }

/* the frame: exactly behind the canvas, or hidden for a canvas that is not in the document */
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
   producing frames (hidden, occluded, not composited, or this thread was busy) a silent worker is not a stalled one. */
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
const plain=m=>JSON.parse(JSON.stringify(m)); // the worker gets data, whatever the page's metadata object carries
function cssSize(canvas,size){ if(size) return size; const r=canvas.getBoundingClientRect(); return {w:Math.max(1,canvas.clientWidth||r.width), h:Math.max(1,canvas.clientHeight||r.height)}; }

/* ---------- input the host injects: the spec's event shape (section 6), plain data ---------- */
const EVENT_TYPES=['click','input','change','pointerdown','pointermove','pointerup','pointercancel','wheel','keydown','keyup','focus','blur'];
const fin=x=>Number.isFinite(+x)?+x:0, str=(x,n)=>typeof x==='string'?x.slice(0,n):'';
function plainEvent(e){
  if(!e || !EVENT_TYPES.includes(e.type)) return null;
  const o={type:e.type, x:fin(e.x), y:fin(e.y), button:fin(e.button)|0, buttons:fin(e.buttons)|0, pointerId:fin(e.pointerId)|0, pointerType:str(e.pointerType,8)||'mouse',
    deltaX:fin(e.deltaX), deltaY:fin(e.deltaY), key:str(e.key,32), code:str(e.code,32),
    shiftKey:!!(e.shiftKey||e.shift), altKey:!!(e.altKey||e.alt), ctrlKey:!!(e.ctrlKey||e.ctrl), metaKey:!!(e.metaKey||e.meta)};
  if(typeof e.value==='string') o.value=e.value.slice(0,1000);
  if(typeof e.checked==='boolean') o.checked=e.checked;
  return o;
}

function mount(canvas,piece,o={}){
  const id=String(piece.slug||''), meta=piece.meta&&typeof piece.meta==='object'?piece.meta:{}, journaled=o.label!=='checker', isPoster=o.label==='poster';
  const paramDefs=new Map((Array.isArray(meta.params)?meta.params:[]).filter(p=>p&&typeof p.key==='string').map(p=>[p.key,p]));
  const colors=colorsOf(piece.colors,o.site), length=Number.isFinite(+(meta.time||{}).length)&&+meta.time.length>0?+meta.time.length:60;
  let params={...defaults(meta),...(o.params||{})}, box=o.box||{x:0,y:0,...cssSize(canvas,o.size)}, dpr=o.dpr||1, t=Math.max(0,Math.min(length,+o.t||0)), playing=!!o.playing;
  let device=o.device==='phone'?'phone':'desktop', mode=o.mode==='interact'&&meta.interact?'interact':'feed', fullscreen=!!o.fullscreen;
  let port=null, frame=null, onFrameMsg=null, ready=false, dead=false, lastBeat=0, awaiting=0, readyBy=0, wd=0, step=1, warm=0, samples=[], capN=0, state='loading';
  let lastNudge=0, frameUp=false, callAt=0, callWhat='';
  const caps=new Map(), whenReady=[];
  const send=(m,tr)=>{ if(port&&!dead) port.post(m,tr); };
  const expect=()=>{ if(ready&&!playing&&!awaiting) awaiting=performance.now(); };
  const cb=(name,...a)=>{ try{ if(typeof o[name]==='function') o[name](...a); }catch(e){ console.error(e); } };
  const entry={id, ready:false, playing, poster:isPoster, n:++journalN};
  const noteJournal=()=>{ if(journaled && journal.includes(entry)){ entry.playing=playing; writeJournal(); } };
  function kill(kind,msg,dropFrame){
    if(dead) return; state=kind; shutdown(dropFrame);
    console.warn(`eigenreel: ${id} ${kind}${msg?': '+msg:''}`); cb('onError',kind,msg);
  }
  /* A stopped piece's last frame stays on show under its card, until its canvas goes. Disposed or blocked, it goes now. */
  function shutdown(dropFrame){
    if(wd){ clearInterval(wd); wd=0; live--; } dead=true;
    mounts.delete(handle); { const i=journal.indexOf(entry); if(i>=0){ journal.splice(i,1); if(journaled) writeJournal(); } }
    if(onFrameMsg){ removeEventListener('message',onFrameMsg); onFrameMsg=null; }
    const p=port, fr=frame; port=null;
    if(p) try{ p.post({type:'dispose'}); }catch(_){}
    if(fr){ fr.el.style.pointerEvents='none'; try{ fr.el.contentWindow&&fr.el.contentWindow.postMessage({type:'eigenreel:ui', on:false},'*'); }catch(_){} }
    const hide=fr&&(dropFrame||!fr.el.isConnected||fr.el.style.display==='none');
    if(fr && !hide){ const k={id, drop(){ stoppedFrames.delete(k); fr.drop(); }}; stoppedFrames.add(k); fr.onDrop=()=>stoppedFrames.delete(k); }
    if(fr){ setTimeout(()=>{ try{ fr.el.contentWindow&&fr.el.contentWindow.postMessage({type:'eigenreel:stop'},'*'); }catch(_){} if(p) p.close(); if(hide) fr.drop(); },dropFrame==='now'?0:50); if(dropFrame==='now') fr.el.style.visibility='hidden'; }
    for(const [,c] of caps) c.reject(new Error('disposed')); caps.clear();
  }
  /* The watchdog (spec, section 10): setup within 8 s; each draw, event batch or onMode call within 250 ms (the worker
     says 'call' before it and beats after); and a playing piece keeps beating. Only while the page renders frames. */
  function watchdog(){
    const now=performance.now();
    if(!pageRendering(now)){ lastBeat=now; if(awaiting) awaiting=now; if(callAt) callAt=now; if(!ready) readyBy=now+SETUP_MS; return; }
    if(!ready){ if(now>readyBy) kill('stalled',frameUp?`setup did not finish within ${SETUP_MS/1000} s`:'the sandbox did not start'); return; }
    if(callAt && now-callAt>CALL_MS) return kill('stalled',`${callWhat} ran for more than ${CALL_MS} ms`);
    if(playing && now-lastBeat>NUDGE_MS && now-lastNudge>NUDGE_MS){ lastNudge=now; send({type:'nudge'}); } // a frame the browser is throttling still has to draw; a stuck one cannot answer
    if(playing && now-lastBeat>STALL_MS) kill('stalled',`no frame for ${Math.round(now-lastBeat)} ms`);
    else if(awaiting && now-awaiting>STALL_MS) kill('stalled',`no frame for ${Math.round(now-awaiting)} ms`);
  }
  /* frame cost: a piece averaging over 12 ms (CPU + GPU) steps down to 30 fps, and back up under 6 ms */
  function budget(ms,gpu){
    const cpu=ms; if(gpu!=null) ms+=gpu;
    if(warm<WARMUP){ warm++; return; } // the first frames after a change build caches
    samples.push(ms); if(samples.length>WINDOW) samples.shift(); if(samples.length<12) return;
    const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
    if(avg>STEP_MS && step===1){ step=2; send({type:'step', n:2}); samples=[]; console.info(`eigenreel: ${id} stepped down to 30 fps (${avg.toFixed(1)} ms per frame)`); }
    else if(avg<STEP_MS/2 && step===2){ step=1; send({type:'step', n:1}); samples=[]; }
    cb('onStats',gpu!=null?{t, ms, cpu, gpu, avg, step}:{t, ms, avg, step});
  }
  function onMsg(m){
    if(dead || !m || typeof m!=='object') return;
    switch(m.type){
      case 'ready': ready=true; state='running'; lastBeat=performance.now(); entry.ready=true; noteJournal(); whenReady.splice(0).forEach(f=>f()); break;
      case 'call': if(ready){ callAt=performance.now(); callWhat=['draw','event','onMode'].includes(m.what)?m.what:'a call'; } break;
      case 'beat':
        lastBeat=performance.now(); awaiting=0; callAt=0;
        if(Number.isFinite(m.t)) t=Math.max(0,Math.min(length,m.t));
        if(m.drawn && playing && Number.isFinite(m.ms)) budget(m.ms,Number.isFinite(m.gpu)?m.gpu:null);
        if(m.ended && playing){ playing=false; noteJournal(); cb('onEnded'); }
        break;
      case 'param': {
        const p=typeof m.key==='string'&&paramDefs.get(m.key); if(!p) break;
        const v=validateValue(p,m.value); params={...params,[m.key]:v}; cb('onParam',m.key,v,{...params}); break;
      }
      case 'ui-dropped': if(typeof m.what==='string') cb('onUIDropped',m.what.slice(0,120)); break;
      case 'error': kill(m.kind==='memory'?'memory':'error',String(m.message).slice(0,500)); break;
      case 'capture': { const c=caps.get(m.id); if(!c) break; caps.delete(m.id);
        if(m.blob instanceof Blob) c.resolve(m.blob); else c.reject(new Error(String(m.error||'capture failed').slice(0,500))); break; }
    }
  }
  const frameWin=()=>frame&&frame.el.contentWindow;
  /* the runner's side of interact mode: the UI container over the box, shown only while interacting */
  function uiState(){ const w=frameWin(); if(w && frameUp) w.postMessage({type:'eigenreel:ui', on:mode==='interact', box},'*'); }
  const handle={
    get state(){ return state; }, get playing(){ return playing; }, get mode(){ return mode; }, id,
    /* the kill switch: stop now, and take the picture away too */
    block(reason){ if(dead) return; kill('blocked',reason,'now'); },
    play(){ if(dead||playing) return; playing=true; lastBeat=performance.now(); awaiting=0; warm=0; samples=[]; send({type:'play'}); noteJournal(); },
    pause(){ if(dead||!playing) return; playing=false; send({type:'pause'}); noteJournal(); },
    seek(x){ t=Math.max(0,Math.min(length,Number.isFinite(+x)?+x:0)); send({type:'seek', t}); expect(); },
    getTime(){ return t; },
    setParams(p){ params={...p}; warm=0; send({type:'params', params}); expect(); },
    getParams(){ return {...params}; },
    setMode(m={}){
      if(dead) return;
      if(m.mode!==undefined) mode=m.mode==='interact'&&meta.interact?'interact':'feed';
      if(m.fullscreen!==undefined) fullscreen=!!m.fullscreen;
      if(m.device!==undefined) device=m.device==='phone'?'phone':'desktop';
      send({type:'mode', mode, fullscreen, device}); expect();
      if(frame){ frame.el.style.pointerEvents=mode==='interact'?'auto':'none'; if(mode==='interact') try{ frame.el.focus({preventScroll:true}); }catch(_){} }
      uiState();
    },
    resize(b,d){ box=b; if(d) dpr=d; warm=0; const s=cssSize(canvas,o.size); send({type:'resize', box, dpr, w:s.w, h:s.h}); expect(); uiState(); },
    capture(){
      if(dead) return Promise.reject(new Error('disposed'));
      return new Promise((resolve,reject)=>{ const go=()=>{ const n=++capN; caps.set(n,{resolve,reject}); send({type:'capture', id:n}); expect(); }; ready?go():whenReady.push(go); });
    },
    input(e){ const ev=plainEvent(e); if(ev && !dead) send({type:'input', ev}); },
    dispose(){ if(frame && dead){ const f=frame; frame=null; f.drop(); return; } if(dead) return; state='disposed'; shutdown(true); },
  };

  const refuse=(kind,msg)=>{ state=kind; dead=true; setTimeout(()=>cb('onError',kind,msg),0); return handle; };
  if(!canWorker) return refuse('unsupported','This browser has no OffscreenCanvas, which the sandbox needs.');
  if(blocked.has(id)) return refuse('blocked',blocked.get(id));
  if(journaled && crashed.has(id)) return refuse('crashed','The browser tab crashed while this piece was running.');
  mounts.add(handle);
  if(journaled){ journal.push(entry); writeJournal(); }
  readyBy=performance.now()+SETUP_MS; wd=setInterval(watchdog,50); startTicker();
  (async()=>{
    const source=String(piece.source||'');
    const [src,three,wasm,font]=await Promise.all([
      text(),
      usesThree(source)?fetchThree().then(text=>({text}),e=>{ console.warn('eigenreel: @eigenreel/three could not load:',e.message); return null; }):null,
      piece.wasm instanceof ArrayBuffer?piece.wasm.slice(0):typeof piece.wasm==='string'?fetchBytes(piece.wasm).then(b=>b.slice(0)):null, // a copy: the cached bytes stay here
      fontFor(),
    ]);
    if(dead) return;
    const s=cssSize(canvas,o.size);
    const init={type:'init', source, meta:plain(meta), colors, params, t, playing, device, mode, fullscreen, box, dpr, w:s.w, h:s.h, kit:KIT, three, wasm, font};
    const tr=[wasm, ...(font?font.faces.map(f=>f.buf):[])].filter(Boolean);
    onFrameMsg=e=>{
      if(!frame || e.source!==frame.el.contentWindow) return;
      const m=e.data; if(!m || typeof m!=='object') return;
      if(m.type==='eigenreel:error') return kill('error',String(m.message||'worker error').slice(0,500));
      if(m.type==='eigenreel:leave'){ if(mode==='interact') cb('onLeave',m.why==='outside'?'outside':'esc'); return; }
      if(m.type!=='eigenreel:ready') return;
      if(frameUp) return kill('navigated','the sandbox frame loaded a second time');
      frameUp=true;
      const ch=new MessageChannel();
      ch.port1.onmessage=ev=>onMsg(ev.data);
      port={post:(x,list)=>ch.port1.postMessage(x,list||[]), close:()=>ch.port1.close()};
      const runnerFont=font?{family:font.family, faces:font.faces.map(f=>({...f, buf:f.buf.slice(0)}))}:null; // the runner draws env.ui in the same font
      frame.el.contentWindow.postMessage({type:'eigenreel:start', worker:src, port:ch.port2, colors, font:runnerFont},'*',[ch.port2,...(runnerFont?runnerFont.faces.map(f=>f.buf):[])]);
      port.post(init,tr);
      if(mode==='interact') frame.el.style.pointerEvents='auto';
      uiState();
    };
    addEventListener('message',onFrameMsg);
    frame=makeFrame(canvas,runnerURL);
    readyBy=performance.now()+SETUP_MS;
    const tags=[meta.context==='webgl2'?'webgl2':null,device==='phone'?'phone':null,o.label].filter(Boolean);
    console.info(`eigenreel: mounted ${id} in the sandbox${tags.length?' ('+tags.join(', ')+')':''}`);
  })().catch(e=>kill('error',e.message||String(e)));
  return handle;
}

/* A still frame, e.g. for a thumbnail: mount on a detached canvas, capture one PNG, dispose. */
function poster(piece,o={}){
  let fail; const err=new Promise((_,rej)=>fail=rej);
  const cv=document.createElement('canvas');
  const h=mount(cv,piece,{params:o.params, t:o.t, playing:false, device:o.device, mode:'feed', site:o.site, dpr:o.dpr||1, box:o.box||{x:0,y:0,w:o.w,h:o.h},
    size:{w:o.w,h:o.h}, label:'poster', onError:(k,m)=>fail(new Error(`${k}: ${m}`))});
  return Promise.race([h.capture().catch(e=>new Promise((_,rej)=>setTimeout(()=>rej(e),0))),err]).finally(()=>h.dispose()); // why it stopped, rather than "disposed"
}

/* What this browser can run. WebGL2 is probed once on a throwaway canvas, left to the garbage collector (releasing it
   by hand makes Firefox warn "WebGL context was lost"); pointer, viewport and Save-Data are read on every call. */
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

window.EigenReelHost={mount, poster, caps, hasWebGL2, supported:canWorker, THREE, EVENT_TYPES, CALL_MS, SETUP_MS, validateValue,
  noteActive(id){ if(id!==activeId){ activeId=id; if(journal.length) writeJournal(); } }, setBlocked, isBlocked:id=>blocked.has(id), blockedReason:id=>blocked.get(id)||'', forgive, isCrashed:id=>crashed.has(id), setRunnerURL(u){ if(typeof u==='string'&&u) runnerURL=u; }};
})();
