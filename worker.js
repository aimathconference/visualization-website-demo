/* ---------- EigenReel piece worker ----------
   One instance per mounted piece (docs/submission-spec-slop.md, sections 3 to 6 and 10; docs/sandbox.md), inside one
   sandboxed iframe (runner.html). The host (runtime.js) fetches this file as text and the frame starts it from a Blob
   URL. It owns two OffscreenCanvases (the picture, and a transparent 2D overlay for a 'webgl2' piece's text), owns the
   clock, drives its own frame loop and keeps the piece's stand-in DOM (env.ui).
   Two channels, and the piece reaches neither:
     host  <-> worker  a MessagePort (init, play, params, mode, capture; beats, param changes, errors), kept in a closure;
     runner <-> worker the Worker's own channel (UI ops and measurements out; viewer input and measurements in). The
                       runner checks every op against the allowlist again: this side is the piece's.
   The piece arrives as source text and is only ever imported from a Blob URL. The frame's Content-Security-Policy is the
   boundary: no network and no eval, whatever a piece does. lockdown() makes the documented API true for honest
   authors, and takes away what a piece could use to run outside a draw, an event or onMode. */
(function(G){
'use strict';
/* kept privately, before a piece can reach the globals */
const raf=G.requestAnimationFrame?G.requestAnimationFrame.bind(G):f=>G.setTimeout(()=>f(G.performance.now()),16);
const caf=G.cancelAnimationFrame?G.cancelAnimationFrame.bind(G):G.clearTimeout.bind(G);
const clock=G.performance.now.bind(G.performance);
const micro=G.queueMicrotask?G.queueMicrotask.bind(G):f=>Promise.resolve().then(f);
const FontFaceCtor=G.FontFace, fontSet=G.fonts;
const toRunner=G.postMessage.bind(G);
const OC=G.OffscreenCanvas, WA=G.WebAssembly, NativeMemory=WA&&WA.Memory;
/* the port stays out of reach: a piece that patched MessageEvent.prototype would otherwise see event.target */
const apply=Reflect.apply, dataGet=Object.getOwnPropertyDescriptor(MessageEvent.prototype,'data').get, dataOf=e=>apply(dataGet,e,[]);
let send=()=>{};
const post=(m,tr)=>send(m,tr||[]);

let canvas=null, ovCanvas=null, ctx=null, gl=null, octx=null, mod=null, meta={}, colors={}, params={}, paramDefs=new Map();
const S={};                        // the piece's own state, one per instance
const env={}, EB={x:0,y:0,w:1,h:1}; // one env and one env.box per instance, refreshed in place before every call
let device='desktop', mode='feed', fullscreen=false, box={x:0,y:0,w:1,h:1}, cssW=1, cssH=1, dpr=1;
let t=0, length=60, loop=true, playing=false, ended=false, step=1, tick=0, last=0, rafId=0;
let ready=false, dead=false, lastMs=0, glTimer=null, gpuMs=null, wasmBytes=null, fontFamily='sans-serif';

/* where: 'setup' | 'draw' | 'onMode' | 'event' | a host message; kind: 'error' or 'memory' */
function fail(e,where){
  if(dead) return; dead=true; stop();
  const message=(e&&e.message)||String(e), kind=e&&e.eigenreelKind||'error';
  post({type:'error', kind, where, message:where?`${where}: ${message}`:message, stack:String((e&&e.stack)||'').slice(0,2000)});
}

/* ---------- params (spec, section 4): the same rules as the page's ---------- */
const decimals=x=>{ const s=String(x), e=s.match(/e-(\d+)$/i); if(e) return +e[1]+((s.split('e')[0].split('.')[1]||'').length); return (s.split('.')[1]||'').length; };
function validateValue(p,v){
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
/* env.setParam: the only way a piece changes a declared param. The next frame sees it; the host hears of it. */
function setParam(key,value){
  if(typeof key!=='string' || !paramDefs.has(key)) return undefined;
  const v=validateValue(paramDefs.get(key),value);
  params={...params,[key]:v}; post({type:'param', key, value:v});
  return v;
}

/* ---------- WebAssembly: the piece instantiates its own module; every memory is watched ---------- */
const MAX_MEM=64*1024*1024, MAX_PAGES=MAX_MEM/65536;
const memBuf=WA&&Object.getOwnPropertyDescriptor(WA.Memory.prototype,'buffer').get;
const abLen=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get;
const deref=G.WeakRef?G.WeakRef.prototype.deref:null;
const mems=[];
function track(m){ if(NativeMemory && m instanceof NativeMemory) mems.push(deref?new G.WeakRef(m):{m}); }
function trackExports(inst){ try{ const ex=inst&&inst.exports; if(ex) for(const k of Object.keys(ex)) track(ex[k]); }catch(_){} }
/* after every call: no memory past 64 MiB (spec, section 5) */
function checkMemory(){
  for(let i=mems.length-1;i>=0;i--){
    const r=mems[i], m=deref?apply(deref,r,[]):r.m;
    if(!m){ mems.splice(i,1); continue; }
    const n=apply(abLen,apply(memBuf,m,[]),[]);
    if(n>MAX_MEM){ const e=new Error(`a WebAssembly memory grew to ${Math.round(n/1048576)} MiB; the limit is 64 MiB`); e.eigenreelKind='memory'; throw e; }
  }
}
/* A module may keep its memory to itself only with a maximum the sandbox would allow: one it neither imports nor exports
   cannot be watched. Reads the memory (5) and export (7) sections of the binary. */
function checkWasm(src){
  let u;
  if(src instanceof ArrayBuffer) u=new Uint8Array(src);
  else if(ArrayBuffer.isView(src)) u=new Uint8Array(src.buffer,src.byteOffset,src.byteLength);
  else return; // the browser's own TypeError follows
  if(u.length<8 || u[0]!==0 || u[1]!==0x61 || u[2]!==0x73 || u[3]!==0x6d) return;
  let p=8; const leb=()=>{ let r=0, s=0, b; do{ b=u[p++]; r+=(b&127)*2**s; s+=7; }while(b&128 && p<u.length); return r; };
  const maxes=[]; let exported=false;
  while(p<u.length){
    const id=u[p++], size=leb(), end=p+size;
    if(id===5){ for(let n=leb();n>0;n--){ const flags=u[p++]; leb(); maxes.push(flags&1?leb():Infinity); } }
    else if(id===7){ for(let n=leb();n>0;n--){ const len=leb(); p+=len; const kind=u[p++]; leb(); if(kind===2) exported=true; } }
    p=end;
  }
  if(maxes.length && !exported && maxes.some(m=>m>MAX_PAGES))
    throw new Error('this WebAssembly module keeps its memory to itself with no maximum of at most 64 MiB: export the memory (or declare such a maximum) so the sandbox can watch it');
}
function wrapWasm(){
  if(!WA) return;
  const NM=WA.Memory, NI=WA.Instance, NMod=WA.Module, inst=WA.instantiate.bind(WA), comp=WA.compile.bind(WA);
  function Memory(desc){
    if(!new.target) throw new TypeError("WebAssembly.Memory must be called with 'new'");
    if(desc && desc.shared) throw new Error('shared WebAssembly memory is not available: there are no threads');
    const m=new NM(desc); track(m); return m;
  }
  function Module(bytes){ if(!new.target) throw new TypeError("WebAssembly.Module must be called with 'new'"); checkWasm(bytes); return new NMod(bytes); }
  function Instance(m,imports){ if(!new.target) throw new TypeError("WebAssembly.Instance must be called with 'new'"); const i=new NI(m,imports); trackExports(i); return i; }
  Memory.prototype=NM.prototype; Module.prototype=NMod.prototype; Instance.prototype=NI.prototype;
  for(const k of ['imports','exports','customSections']) Module[k]=NMod[k].bind(NMod);
  const fix=(o,k,v)=>{ try{ Object.defineProperty(o,k,{value:v, writable:false, configurable:false}); }catch(_){} };
  fix(NM.prototype,'constructor',Memory); fix(NMod.prototype,'constructor',Module); fix(NI.prototype,'constructor',Instance);
  fix(WA,'Memory',Memory); fix(WA,'Module',Module); fix(WA,'Instance',Instance);
  fix(WA,'compile',src=>{ try{ checkWasm(src); }catch(e){ return Promise.reject(e); } return comp(src); });
  fix(WA,'instantiate',(src,imports)=>{
    if(src instanceof NMod) return inst(src,imports).then(i=>{ trackExports(i); return i; });
    try{ checkWasm(src); }catch(e){ return Promise.reject(e); }
    return inst(src,imports).then(r=>{ trackExports(r.instance); return r; });
  });
  fix(WA,'compileStreaming',undefined); fix(WA,'instantiateStreaming',undefined); // they take a Response, and there is no network
}

/* ---------- isolation ---------- */
function lockdown(){
  // A piece gets its canvases, a clock and env, nothing else. Each name is shadowed on the global and on its prototype chain.
  const GONE=['fetch','XMLHttpRequest','WebSocket','EventSource','WebTransport','importScripts','Worker','SharedWorker','BroadcastChannel','indexedDB','caches',
    'RTCPeerConnection','webkitRTCPeerConnection','RTCDataChannel','Notification','eval','FontFace','fonts','MessageChannel','postMessage',
    'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','cancelAnimationFrame','queueMicrotask','scheduler',
    'SharedArrayBuffer','Atomics','crossOriginIsolated'];
  const shadow=(o,k)=>{ try{ Object.defineProperty(o,k,{value:undefined, writable:false, configurable:false}); }catch(_){ try{ o[k]=undefined; }catch(__){} } };
  for(let o=G; o && o!==Object.prototype; o=Object.getPrototypeOf(o)) for(const k of GONE){
    if(o!==G && !Object.prototype.hasOwnProperty.call(o,k)) continue;
    shadow(o,k);
  }
  // the navigator's storage, locks, beacons and devices; WebGPU is not offered
  const nav=G.navigator;
  if(nav) for(let o=nav; o && o!==Object.prototype; o=Object.getPrototypeOf(o))
    for(const k of ['sendBeacon','storage','locks','gpu','serviceWorker','permissions','usb','hid','serial','bluetooth','mediaCapabilities'])
      if(o===nav || Object.prototype.hasOwnProperty.call(o,k)) shadow(o,k);
  if(OC){ const gc=OC.prototype.getContext; Object.defineProperty(OC.prototype,'getContext',{value:function(type,...a){ return String(type)==='webgpu'?null:apply(gc,this,[type,...a]); }, writable:false, configurable:false}); }
  wrapWasm();
  // the stand-in document: its only members make env.ui elements, or an OffscreenCanvas for 'canvas' (spec, section 6)
  const make=tag=>{ tag=String(tag).toLowerCase(); return tag==='canvas'?new OC(300,150):makeElement(tag); };
  try{ Object.defineProperty(G,'document',{value:Object.freeze({createElement:make, createElementNS:(_,tag)=>make(tag)}), writable:false, configurable:false}); }catch(_){}
}

/* ---------- env.ui: the stand-in DOM (spec, section 6) ----------
   Elements live here and are mirrored into the frame by the runner, which applies the ops below through the same
   allowlist. Ops are batched and posted at the end of every call (or in a microtask, for changes made after an await):
     ['reset']                       a new tree (entering or leaving interact mode): the runner empties its container
     ['create', id, tag, ns]         ns: 'svg' | 'html'
     ['append', parent, id, before]  parent 0 is the root (env.ui); before is an id or null
     ['remove', id]  ['clear', id]  ['text', id, string]  ['attr', id, name, value|null]
     ['style', id, [[property, value|null], ...]]  ['listen', id, type, on]  ['focus', id]
     ['free', id]                    the piece no longer holds the element (it was garbage collected)
   Elements outlive mode changes (a panel built in setup can be attached in onMode); only the root is new each time
   interact mode starts, and an old root does nothing. Everything not on the allowlist is ignored, and reported to the
   host once (ui-dropped). */
const HTML_TAGS=['div','span','p','button','label','input','select','option','details','summary'];
const SVG_TAGS=['svg','g','path','circle','rect','line','polyline','text'];
const INPUT_TYPES=['range','checkbox','radio','number','text'];
const UI_EVENTS=['click','input','change','pointerdown','pointermove','pointerup','pointercancel','wheel','keydown','keyup','focus','blur'];
const ATTR_RE=/^(?:id|class|title|role|aria-[a-z]+|tabindex|disabled|hidden|type|name|value|checked|selected|min|max|step|placeholder|for|open)$/;
const SVG_ATTR_RE=/^(?:viewBox|d|cx|cy|r|x|y|x1|y1|x2|y2|width|height|points|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|opacity|transform|text-anchor|dominant-baseline|font-size|preserveAspectRatio)$/;
const STYLE_PROP_RE=/^(?:display|position|top|left|right|bottom|inset|width|height|min-|max-|margin|padding|gap|flex|grid|align|justify|order|overflow|z-index|opacity|color|background(?:-color)?$|border|outline|border-radius|box-shadow|font|line-height|letter-spacing|text-|white-space|word-|vertical-align|cursor|pointer-events|visibility|transform|transform-origin|user-select|box-sizing|list-style|appearance|accent-color|resize|object-fit)/;
const STYLE_GONE_RE=/^(?:animation|transition|behavior)/, STYLE_BAD_RE=/url\(|image-set\(|image\(|@import|expression\(|javascript:|\\/i;
const MAX_ELS=4000, MAX_TEXT=4000, MAX_ATTR=2000, MAX_STYLE=500;
let uiNext=1, uiCount=0, uiRoot=null, uiQueue=[], uiScheduled=false, measureN=0;
const uiEls=new Map(), measures=new Map(), droppedSeen=new Set(), onProps=new WeakMap(); // uiEls: id -> WeakRef, for input
const uiGone=G.FinalizationRegistry?new G.FinalizationRegistry(id=>{ uiEls.delete(id); uiCount--; queueOp(['free',id]); }):null;
const uiGet=id=>{ const r=uiEls.get(id); return r?(deref?apply(deref,r,[]):r.el):undefined; };
function dropped(what){ if(droppedSeen.has(what) || droppedSeen.size>=64) return; droppedSeen.add(what); post({type:'ui-dropped', what}); }
function flushUI(){ uiScheduled=false; if(!uiQueue.length) return; const ops=uiQueue; uiQueue=[]; toRunner({type:'ui', ops}); }
function queueOp(op){ uiQueue.push(op); if(!uiScheduled){ uiScheduled=true; micro(flushUI); } }
const kebab=s=>String(s).replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
function styleOK(p,v){
  if(!STYLE_PROP_RE.test(p) || STYLE_GONE_RE.test(p)) return false;
  if(v==null || v==='') return true;
  return !STYLE_BAD_RE.test(v) && !(p==='position' && !/^\s*(static|relative|absolute|sticky)\s*$/i.test(v));
}
const TOKEN={};
let uiSync, uiFire, uiLive, uiDetach, uiProbe;
class UIElement {
  #id; #tag; #svg; #inert; #attrs=new Map(); #kids=[]; #parent=null; #text=''; #styles=new Map(); #style=null; #ls=new Map();
  constructor(tag,id,inert,token){
    if(token!==TOKEN) throw new TypeError('Illegal constructor: use document.createElement');
    this.#tag=tag; this.#svg=SVG_TAGS.includes(tag); this.#id=id; this.#inert=!!inert;
    if(this.#live() && id) queueOp(['create', id, tag, this.#svg?'svg':'html']);
    if(tag==='input') this.#attrs.set('type','text');
  }
  static { // the worker's own handles on an element; the piece has no way to them
    uiLive=e=>e.#live();
    uiDetach=e=>{ for(const k of e.#kids) k.#parent=null; e.#kids=[]; e.#text=''; };
    /* an input or change from the viewer: the element's value and checked follow it, without an op */
    uiSync=(e,ev)=>{ if(typeof ev.value==='string') e.#attrs.set('value',ev.value); if(typeof ev.checked==='boolean' && e.#tag==='input'){ if(ev.checked) e.#attrs.set('checked',''); else e.#attrs.delete('checked'); } };
    /* the checker's view of the live tree (handle.probeUI): every element under the root that listens, as plain data */
    uiProbe=root=>{
      const out=[], num=v=>v==null||v===''||!Number.isFinite(+v)?null:+v;
      const walk=e=>{
        if(out.length>=500) return;
        const listeners=[...e.#ls].filter(([,s])=>s.size).map(([k])=>k);
        if(listeners.length) out.push({id:e.#id, tag:e.#tag, type:e.#tag==='input'?e.#attrs.get('type')||'text':'',
          min:num(e.#attrs.get('min')), max:num(e.#attrs.get('max')), step:num(e.#attrs.get('step')), value:e.#attrs.get('value')??'',
          checked:e.#attrs.has('checked'), disabled:e.#attrs.has('disabled'),
          options:e.#tag==='select'?e.#kids.filter(k=>k.#tag==='option').map(k=>k.#attrs.get('value')??k.textContent).slice(0,100):undefined,
          listeners});
        for(const k of e.#kids) walk(k);
      };
      walk(root); return out;
    };
    uiFire=(e,ev)=>{
      const set=e.#ls.get(ev.type); if(!set) return;
      for(const fn of [...set]) typeof fn==='function'?apply(fn,e,[ev]):fn.handleEvent(ev);
    };
  }
  #live(){ return !this.#inert && (this.#id!==0 || this===uiRoot); } // an old root is inert
  #op(...op){ if(this.#live()) queueOp(op); }
  static #need(c,what){ if(!(c instanceof UIElement)) throw new TypeError(`${what}: the argument is not an env.ui element`); }
  get tagName(){ return this.#svg?this.#tag:this.#tag.toUpperCase(); }
  get nodeName(){ return this.tagName; }
  get localName(){ return this.#tag; }
  get nodeType(){ return 1; }
  get parentNode(){ return this.#parent; }
  get parentElement(){ return this.#parent; }
  get children(){ return this.#kids.slice(); }
  get childNodes(){ return this.#kids.slice(); }
  get childElementCount(){ return this.#kids.length; }
  get firstChild(){ return this.#kids[0]||null; }
  get lastChild(){ return this.#kids[this.#kids.length-1]||null; }
  get firstElementChild(){ return this.firstChild; }
  get lastElementChild(){ return this.lastChild; }
  get nextSibling(){ const p=this.#parent; return p?p.#kids[p.#kids.indexOf(this)+1]||null:null; }
  get previousSibling(){ const p=this.#parent; return p?p.#kids[p.#kids.indexOf(this)-1]||null:null; }
  contains(o){ for(let n=o; n; n=n instanceof UIElement?n.#parent:null) if(n===this) return true; return false; }
  insertBefore(c,ref){
    UIElement.#need(c,'insertBefore'); if(ref!=null) UIElement.#need(ref,'insertBefore');
    if(ref!=null && ref.#parent!==this) throw new Error('insertBefore: the reference node is not a child of this element');
    if(c.contains(this)) throw new Error('insertBefore: an element cannot contain itself');
    if(c===ref) return c;
    if(this.#inert || c.#inert){ dropped('a child of an element that is not allowed'); return c; }
    if(c.#parent){ const p=c.#parent; p.#kids.splice(p.#kids.indexOf(c),1); }
    const i=ref?this.#kids.indexOf(ref):this.#kids.length; this.#kids.splice(i,0,c); c.#parent=this;
    this.#op('append', this.#id, c.#id, ref?ref.#id:null);
    return c;
  }
  appendChild(c){ return this.insertBefore(c,null); }
  append(...cs){ for(const c of cs) this.appendChild(c); }
  removeChild(c){
    UIElement.#need(c,'removeChild'); if(c.#parent!==this) throw new Error('removeChild: not a child of this element');
    this.#kids.splice(this.#kids.indexOf(c),1); c.#parent=null; c.#op('remove', c.#id); return c;
  }
  remove(){ if(this.#parent) this.#parent.removeChild(this); }
  replaceChildren(...cs){
    for(const c of cs) UIElement.#need(c,'replaceChildren');
    for(const k of this.#kids) k.#parent=null; this.#kids=[]; this.#text='';
    this.#op('clear', this.#id); for(const c of cs) this.appendChild(c);
  }
  get textContent(){ return this.#text+this.#kids.map(k=>k.textContent).join(''); }
  set textContent(v){
    for(const k of this.#kids) k.#parent=null; this.#kids=[];
    this.#text=String(v??'').slice(0,MAX_TEXT); this.#op('text', this.#id, this.#text);
  }
  get innerText(){ return this.textContent; }
  set innerText(v){ this.textContent=v; }
  get innerHTML(){ return ''; }
  set innerHTML(_){ dropped('innerHTML'); }
  get outerHTML(){ return ''; }
  set outerHTML(_){ dropped('outerHTML'); }
  setAttribute(n,v){
    n=String(n); const name=this.#svg?n:n.toLowerCase();
    if(!(ATTR_RE.test(name) || this.#svg && SVG_ATTR_RE.test(name))){ dropped(`attribute ${name}`); return; }
    v=String(v).slice(0,MAX_ATTR);
    if(name==='type'){
      if(this.#tag!=='input') return; // a button is always type=button; nothing else has a type
      v=v.toLowerCase(); if(!INPUT_TYPES.includes(v)){ dropped(`input type ${v}`); return; }
    }
    this.#attrs.set(name,v); this.#op('attr', this.#id, name, v);
  }
  getAttribute(n){ n=String(n); const v=this.#attrs.get(this.#svg?n:n.toLowerCase()); return v===undefined?null:v; }
  hasAttribute(n){ return this.getAttribute(n)!==null; }
  removeAttribute(n){ n=String(n); const name=this.#svg?n:n.toLowerCase(); if(!this.#attrs.has(name)) return; this.#attrs.delete(name); this.#op('attr', this.#id, name, null); }
  toggleAttribute(n,force){ const on=force===undefined?!this.hasAttribute(n):!!force; if(on) this.setAttribute(n,''); else this.removeAttribute(n); return on; }
  get id(){ return this.getAttribute('id')||''; }
  set id(v){ this.setAttribute('id',v); }
  get className(){ return this.getAttribute('class')||''; }
  set className(v){ this.setAttribute('class',v); }
  get classList(){
    const el=this, list=()=>(el.getAttribute('class')||'').split(/\s+/).filter(Boolean), put=a=>el.setAttribute('class',a.join(' '));
    return {
      add(...c){ const a=list(); for(const x of c) if(!a.includes(String(x))) a.push(String(x)); put(a); },
      remove(...c){ put(list().filter(x=>!c.map(String).includes(x))); },
      toggle(c,force){ c=String(c); const has=list().includes(c), on=force===undefined?!has:!!force; if(on&&!has) this.add(c); else if(!on&&has) this.remove(c); return on; },
      contains(c){ return list().includes(String(c)); },
      get length(){ return list().length; }, get value(){ return el.className; }, toString(){ return el.className; },
    };
  }
  /* inline style: properties set here (camelCase or kebab-case) go to the runner as [property, value] pairs */
  get style(){
    if(this.#style) return this.#style;
    const el=this, styles=this.#styles;
    const setOne=(p,v)=>{
      p=p.startsWith('--')?p:kebab(p); v=v==null?'':String(v).slice(0,MAX_STYLE);
      if(!styleOK(p,v)){ dropped(`style ${p}${v&&STYLE_PROP_RE.test(p)?': '+v.slice(0,40):''}`); return; }
      if(v==='') styles.delete(p); else styles.set(p,v);
      el.#op('style', el.#id, [[p,v===''?null:v]]);
    };
    const api={
      setProperty:(p,v)=>setOne(String(p),v), removeProperty:p=>{ const o=styles.get(kebab(p))||''; setOne(String(p),''); return o; },
      getPropertyValue:p=>styles.get(kebab(p))||'',
    };
    this.#style=new Proxy(api,{
      get(_,k){
        if(typeof k!=='string') return undefined;
        if(k in api) return api[k];
        if(k==='cssText') return [...styles].map(([p,v])=>`${p}: ${v};`).join(' ');
        if(k==='length') return styles.size;
        return styles.get(kebab(k))||'';
      },
      set(_,k,v){
        if(typeof k!=='string') return true;
        if(k==='cssText'){
          for(const p of [...styles.keys()]) setOne(p,'');
          for(const part of String(v??'').split(';')){ const i=part.indexOf(':'); if(i>0) setOne(part.slice(0,i).trim(),part.slice(i+1).trim()); }
        } else setOne(k,v);
        return true;
      },
    });
    return this.#style;
  }
  addEventListener(type,fn){
    type=String(type);
    if(!UI_EVENTS.includes(type)){ dropped(`event ${type}`); return; }
    if(typeof fn!=='function' && !(fn && typeof fn.handleEvent==='function')) return;
    let set=this.#ls.get(type); if(!set) this.#ls.set(type,set=new Set());
    if(set.has(fn)) return; set.add(fn);
    if(set.size===1) this.#op('listen', this.#id, type, true);
  }
  removeEventListener(type,fn){
    const set=this.#ls.get(String(type)); if(!set || !set.delete(fn)) return;
    if(!set.size) this.#op('listen', this.#id, String(type), false);
  }
  focus(){ this.#op('focus', this.#id); }
  blur(){}
  /* the element's box in CSS px from the box's top-left corner, as the runner laid it out */
  measure(){
    if(!this.#live()) return Promise.resolve({x:0,y:0,w:0,h:0});
    flushUI(); const req=++measureN;
    return new Promise(res=>{ measures.set(req,res); toRunner({type:'measure', id:this.#id, req}); });
  }
}
/* reflected properties: booleans are present-or-absent attributes, the rest are strings */
for(const b of ['disabled','hidden','checked','selected','open'])
  Object.defineProperty(UIElement.prototype,b,{get(){ return this.hasAttribute(b); }, set(v){ if(v) this.setAttribute(b,''); else this.removeAttribute(b); }, configurable:true});
for(const s of ['value','type','min','max','step','name','placeholder','title','role'])
  Object.defineProperty(UIElement.prototype,s,{get(){ return this.getAttribute(s)??''; }, set(v){ this.setAttribute(s,v); }, configurable:true});
Object.defineProperty(UIElement.prototype,'valueAsNumber',{get(){ const v=this.getAttribute('value'); return v==null||v===''?NaN:+v; }, configurable:true});
Object.defineProperty(UIElement.prototype,'tabIndex',{get(){ return +(this.getAttribute('tabindex')??-1); }, set(v){ this.setAttribute('tabindex',String(v|0)); }, configurable:true});
Object.defineProperty(UIElement.prototype,'htmlFor',{get(){ return this.getAttribute('for')??''; }, set(v){ this.setAttribute('for',v); }, configurable:true});
/* el.onclick = fn and friends */
for(const ty of UI_EVENTS) Object.defineProperty(UIElement.prototype,'on'+ty,{
  get(){ const m=onProps.get(this); return m&&m[ty]||null; },
  set(fn){ let m=onProps.get(this); if(!m) onProps.set(this,m={}); if(m[ty]) this.removeEventListener(ty,m[ty]); m[ty]=typeof fn==='function'?fn:null; if(m[ty]) this.addEventListener(ty,m[ty]); },
  configurable:true});
function makeElement(tag){
  if(!HTML_TAGS.includes(tag) && !SVG_TAGS.includes(tag)){ dropped(`element ${tag}`); return new UIElement('span',-1,true,TOKEN); }
  if(uiCount>=MAX_ELS){ dropped(`more than ${MAX_ELS} elements`); return new UIElement(tag,-1,true,TOKEN); }
  uiCount++; const id=uiNext++, el=new UIElement(tag,id,false,TOKEN);
  uiEls.set(id,deref?new G.WeakRef(el):{el}); if(uiGone) uiGone.register(el,id);
  return el;
}
/* a new root: entering interact mode makes a fresh env.ui, leaving it removes it (spec, section 6). Its children are
   let go, not destroyed: the piece may attach them again. */
function newTree(on){
  if(uiRoot) uiDetach(uiRoot);
  for(const [,res] of measures) res({x:0,y:0,w:0,h:0}); measures.clear();
  queueOp(['reset']); uiRoot=null;
  if(on) uiRoot=new UIElement('div',0,false,TOKEN); // id 0, the runner's container; not in uiEls
  flushUI();
}
const fin=(x,d=0)=>typeof x==='number'&&Number.isFinite(x)?x:d;
const str=(x,n)=>typeof x==='string'?x.slice(0,n):'';
/* an event from the runner (or the host's input()), in the spec's shape */
function eventFor(raw,el){
  const target=(raw.target===0?uiRoot:uiGet(raw.target))||el;
  return {type:raw.type, target, currentTarget:el, value:typeof raw.value==='string'?raw.value:undefined, checked:typeof raw.checked==='boolean'?raw.checked:undefined,
    key:str(raw.key,32), code:str(raw.code,32), x:fin(raw.x), y:fin(raw.y), button:fin(raw.button)|0, buttons:fin(raw.buttons)|0,
    pointerId:fin(raw.pointerId)|0, pointerType:str(raw.pointerType,8), deltaX:fin(raw.deltaX), deltaY:fin(raw.deltaY),
    shiftKey:!!raw.shiftKey, altKey:!!raw.altKey, ctrlKey:!!raw.ctrlKey, metaKey:!!raw.metaKey,
    preventDefault(){}, stopPropagation(){}}; // no-ops: the runner decides defaults, and a habit should not crash the piece
}
/* a batch of viewer input [{id, ev}], handled as one call */
function onEvents(list){
  if(!ready || dead || mode!=='interact' || !uiRoot || !Array.isArray(list)) return;
  const ok=call('event',()=>{
    for(const it of list.slice(0,256)){
      if(!it || !it.ev || typeof it.ev.type!=='string' || !UI_EVENTS.includes(it.ev.type)) continue;
      const el=it.id===0?uiRoot:uiGet(it.id); if(!el || !uiLive(el)) continue;
      const tgt=it.ev.target===0?uiRoot:uiGet(it.ev.target);
      if(tgt && (it.ev.type==='input'||it.ev.type==='change'||it.ev.type==='click')) uiSync(tgt,it.ev);
      uiFire(el,eventFor(it.ev,el));
      if(dead) return;
    }
  });
  if(ok){ beat(false); if(!playing) render(); }
}

/* ---------- fonts: the site's font, loaded from the bytes the host hands in, before lockdown ---------- */
async function loadFont(f){
  if(!f || typeof f.family!=='string' || !Array.isArray(f.faces) || !f.faces.length || !FontFaceCtor || !fontSet) return 'sans-serif';
  const got=await Promise.allSettled(f.faces.map(x=>new FontFaceCtor(f.family,x.buf,{style:x.style||'normal', weight:x.weight||'400', unicodeRange:x.unicodeRange||'U+0-10FFFF'}).load().then(ff=>{ fontSet.add(ff); })));
  return got.some(r=>r.status==='fulfilled')?`"${f.family.replace(/["\\]/g,'')}", sans-serif`:'sans-serif';
}

/* ---------- the piece's source: only the pinned libraries may be imported (spec, section 5) ---------- */
const KIT_IMPORT=/^[ \t]*import\s*(?:\{([^}]*)\}|\*\s*as\s+([A-Za-z_$][\w$]*))\s*from\s*['"]@eigenreel\/kit['"][ \t]*;?/m;
const THREE_IMPORT=/^([ \t]*import\s*(?:\*\s*as\s+[A-Za-z_$][\w$]*|\{[^}]*\})\s*from\s*)(['"])@eigenreel\/three\2/gm;
const OTHER_IMPORT=/(^|[^\w$.])import\s*(?:\/\*[\s\S]*?\*\/\s*)*\(|^[ \t]*import[\s{*'"]|^[ \t]*export\s[^;\n]*\bfrom\s*['"]/m;
const usesThree=src=>/^[ \t]*import\b[^;]*?\bfrom\s*['"]@eigenreel\/three['"]/m.test(String(src));
/* @eigenreel/three: the site's pinned copy (vendor/three-0.170.0.module.js), handed in as text, imported from a Blob URL */
let threeURL=null;
function loadThree(spec){
  if(!threeURL){
    if(!spec || typeof spec.text!=='string') return Promise.reject(new Error("'@eigenreel/three' is not available here"));
    threeURL=URL.createObjectURL(new Blob([spec.text],{type:'text/javascript'}));
  }
  return Promise.resolve(threeURL);
}
async function loadPiece(source,kit,three){
  let names=null, ns=null;
  let body=String(source).replace(KIT_IMPORT,(_,list,star)=>{ if(star) ns=star; else names=list.split(',').map(s=>s.trim()).filter(Boolean); return ''; });
  const heads=[]; // '@eigenreel/three' imports, set aside while the rest is checked; only the specifier changes, so lines stay put
  body=body.replace(THREE_IMPORT,(_,head)=>{ heads.push(head); return `\u0000EIGENREEL_THREE${heads.length-1}\u0000`; });
  if(OTHER_IMPORT.test(body)) throw new Error("only '@eigenreel/kit' and '@eigenreel/three' can be imported, statically and by those exact names; import() and export ... from are refused");
  if(heads.length){ const u=await three; body=body.replace(/\u0000EIGENREEL_THREE(\d+)\u0000/g,(_,i)=>`${heads[+i]}'${u}'`); }
  // one line, so error line numbers in the piece stay where the author wrote them
  let prelude='';
  const lib=`(() => { ${kit.source.replace(/\n\s*/g,' ')} return Object.freeze({${kit.names.join(', ')}}); })()`;
  if(ns) prelude=`const ${ns} = ${lib};`;
  else if(names && names.length){
    const binds=names.map(n=>{ const [a,b]=n.split(/\s+as\s+/); if(!kit.names.includes(a)) throw new Error(`'@eigenreel/kit' has no export named ${a}`); return b?`${a}: ${b}`:a; });
    prelude=`const {${binds.join(', ')}} = ${lib};`;
  }
  const url=URL.createObjectURL(new Blob([prelude+body],{type:'text/javascript'}));
  let m; try{ m=await import(url); } finally { URL.revokeObjectURL(url); }
  mod=m&&m.default;
  if(!mod || typeof mod!=='object' || typeof mod.draw!=='function') throw new Error('the piece must export default { ..., draw(ctx, t, params, env, S) }');
}

/* ---------- WebGL2 ---------- */
const u32=c=>parseInt(String(c).slice(1,7),16)>>>0;
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
  octx=ovCanvas.getContext('2d');
}
/* before every draw: default framebuffer, full canvas cleared to bg, viewport and scissor on the box */
function glBefore(vp){
  const [r,g,b]=rgb01(colors.bg);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.disable(gl.SCISSOR_TEST); gl.viewport(0,0,canvas.width,canvas.height);
  gl.colorMask(true,true,true,true); gl.depthMask(true); gl.stencilMask(0xff);
  gl.clearColor(r,g,b,1); gl.clearDepth(1); gl.clearStencil(0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST); gl.viewport(...vp); gl.scissor(...vp);
}
/* after it: whatever the piece did, everything outside the box is bg again */
function glAfter(vp){
  const [r,g,b]=rgb01(colors.bg), [x,y,w,h]=vp, W=canvas.width, H=canvas.height;
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

/* ---------- frames ---------- */
function sizeCanvas(){
  const W=Math.max(1,Math.round(cssW*dpr)), H=Math.max(1,Math.round(cssH*dpr));
  for(const c of [canvas,ovCanvas]){ if(c.width!==W) c.width=W; if(c.height!==H) c.height=H; }
}
/* A 2D context as every draw finds it (spec, section 5): fresh state, CSS px, the canvas filled with bg (or cleared, for
   the overlay), (0, 0) at the box's top-left corner, clipped to the box. Returns whether restore() is needed after. */
function before2d(c,bg){
  const fresh=typeof c.reset==='function';
  if(fresh) c.reset(); else c.save();
  c.setTransform(canvas.width/cssW,0,0,canvas.height/cssH,0,0);
  if(bg){ c.fillStyle=bg; c.fillRect(0,0,cssW,cssH); } else c.clearRect(0,0,cssW,cssH);
  c.translate(box.x,box.y); c.beginPath(); c.rect(0,0,box.w,box.h); c.clip(); c.beginPath();
  c.font=`13px ${fontFamily}`;
  return !fresh;
}
/* env as the piece sees it, refreshed in place before every call */
function syncEnv(){
  EB.x=box.x; EB.y=box.y; EB.w=box.w; EB.h=box.h;
  env.device=device; env.mode=mode; env.fullscreen=fullscreen; env.box=EB; env.w=cssW; env.h=cssH; env.dpr=dpr;
  env.colors=colors; env.font=fontFamily; env.setParam=setParam;
  if(wasmBytes) env.wasm=wasmCopy; else delete env.wasm;
  if(octx) env.overlay=octx; else delete env.overlay;
  if(mode==='interact' && uiRoot) env.ui=uiRoot; else delete env.ui;
}
const wasmCopy=()=>Promise.resolve(wasmBytes.slice(0));
/* One watched call: the host hears 'call' before it and a beat after, and stops the worker if the beat is late. */
function call(what,fn){
  if(dead) return false;
  syncEnv(); post({type:'call', what});
  const t0=clock(); let ok=true;
  try{ fn(); checkMemory(); }catch(e){ ok=false; fail(e,what); }
  lastMs=clock()-t0; flushUI();
  return ok && !dead;
}
function drawFrame(){
  const draw=mod.draw;
  if(gl){
    if(gl.isContextLost()) throw new Error('GPU context lost');
    const vp=glBox(); glBefore(vp);
    const back=before2d(octx,null), q=timerBegin();
    try{ draw(gl,t,params,env,S); } finally { timerEnd(q); if(back) octx.restore(); }
    glAfter(vp);
  } else {
    const back=before2d(ctx,colors.bg);
    try{ draw(ctx,t,params,env,S); } finally { if(back) ctx.restore(); }
  }
}
function beat(drawn,endedNow){
  const m={type:'beat', t, ms:lastMs, drawn:!!drawn};
  if(gpuMs!=null) m.gpu=gpuMs;
  if(endedNow) m.ended=true;
  post(m);
}
function render(){ if(!ready||dead) return; if(call('draw',drawFrame)) beat(true); }
function frame(now){
  if(dead||!playing) return;
  rafId=raf(frame);
  const dt=last?Math.min(0.05,(now-last)/1000):0; last=now; t+=dt; tick++;
  let endedNow=false;
  if(t>=length){
    if(loop) t=length>0?t%length:0;
    else { t=length; playing=false; ended=endedNow=true; stop(); } // plays once and holds the last frame
  }
  const drawn=(endedNow || tick%step===0) && call('draw',drawFrame);
  if(!dead) beat(drawn,endedNow);
}
function start(){ if(!rafId && ready && !dead && playing){ last=0; rafId=raf(frame); } }
function stop(){ if(rafId){ caf(rafId); rafId=0; } }
/* onMode after setup, on every change of mode, full screen or device, and on every resize */
function modeChanged(){
  if(!ready||dead) return;
  if(typeof mod.onMode==='function'){ const f=mod.onMode; if(!call('onMode',()=>{ f(env,S); })) return; beat(false); }
  if(!playing) render();
}
const clampT=x=>Math.min(length,Math.max(0,Number.isFinite(+x)?+x:0));

async function init(m){
  meta=m.meta&&typeof m.meta==='object'?m.meta:{};
  colors=Object.freeze({...(m.colors||{})});
  for(const p of Array.isArray(meta.params)?meta.params:[]) if(p && typeof p.key==='string') paramDefs.set(p.key,p);
  params={...(m.params||{})};
  const tm=meta.time||{}; length=Number.isFinite(+tm.length)&&+tm.length>0?+tm.length:60; loop=tm.loop!==false;
  device=m.device==='phone'?'phone':'desktop'; mode=m.mode==='interact'?'interact':'feed'; fullscreen=!!m.fullscreen;
  box=m.box; dpr=m.dpr||1; cssW=Math.max(1,m.w); cssH=Math.max(1,m.h); t=clampT(m.t); playing=!!m.playing;
  wasmBytes=m.wasm instanceof ArrayBuffer?m.wasm:null;
  const three=usesThree(m.source)?loadThree(m.three):null;
  if(three) three.catch(()=>{});
  fontFamily=await loadFont(m.font);
  sizeCanvas();
  if(meta.context==='webgl2') initGL(); else ctx=canvas.getContext('2d');
  lockdown();
  await loadPiece(m.source,m.kit,three);
  if(dead) return;
  if(mode==='interact') newTree(true);
  syncEnv();
  if(typeof mod.setup==='function'){ const f=mod.setup; await f(env,S); }
  checkMemory(); flushUI();
  if(dead) return;
  ready=true; post({type:'ready', font:fontFamily});
  modeChanged(); // onMode once after setup, then the first frame
  if(playing) start();
}

function onHost(e){
  const m=dataOf(e); if(!m || dead && m.type!=='dispose') return;
  try{
    switch(m.type){
      case 'init': init(m).catch(err=>fail(err,'setup')); break;
      case 'nudge': if(playing && ready && !dead){ stop(); frame(clock()); } break; // the frame's own frames are throttled: a frame on the host's clock
      case 'play':
        if(!loop && t>=length) t=0; // a piece that played once starts over
        ended=false; playing=true; start(); break;
      case 'pause': playing=false; stop(); break;
      case 'seek': t=clampT(m.t); ended=false; if(!playing) render(); break;
      case 'params': params={...(m.params||{})}; if(!playing) render(); break;
      case 'mode': {
        const md=m.mode==='interact'?'interact':'feed', dv=m.device==='phone'?'phone':'desktop', fs=!!m.fullscreen;
        if(md===mode && dv===device && fs===fullscreen){ if(ready) beat(false); break; } // nothing to do, but the host waits for a beat
        const enter=md!==mode; mode=md; device=dv; fullscreen=fs;
        if(enter) newTree(mode==='interact');
        modeChanged(); break;
      }
      case 'resize':
        box=m.box; dpr=m.dpr||dpr; cssW=Math.max(1,m.w); cssH=Math.max(1,m.h);
        if(canvas) sizeCanvas();
        modeChanged(); break;
      case 'step': step=Math.max(1,m.n|0); break;
      case 'input': if(m.ev && typeof m.ev==='object'){ const tg=Number.isInteger(m.target)&&m.target>0?m.target:0; onEvents([{id:tg, ev:{...m.ev, target:tg}}]); } break; // the host's synthetic input, as on env.ui or (the checker's fire) one of its elements
      case 'probe': post({type:'probe', id:m.id, list:mode==='interact'&&uiRoot?uiProbe(uiRoot):[]}); break;
      case 'capture': {
        // Draw and snapshot in the same task: a WebGL drawing buffer (preserveDrawingBuffer false) is only readable until
        // the frame is presented. The overlay is composited over the picture here.
        render(); if(dead) break;
        let src=canvas;
        if(octx){ src=new OC(canvas.width,canvas.height); const c=src.getContext('2d'); c.drawImage(canvas,0,0); c.drawImage(ovCanvas,0,0); }
        src.convertToBlob({type:'image/png'}).then(blob=>post({type:'capture', id:m.id, blob}), err=>post({type:'capture', id:m.id, error:String(err&&err.message||err)}));
        break;
      }
      case 'dispose':
        stop(); dead=true;
        if(gl) try{ const lc=gl.getExtension('WEBGL_lose_context'); if(lc) lc.loseContext(); }catch(_){} // free the GPU context now, not at GC
        G.close(); break;
    }
  }catch(err){ fail(err,m.type); }
}
/* the runner's channel: first the canvases and the port to the host, then the viewer's input and measurements */
function onRunner(e){
  const m=dataOf(e); if(!m || typeof m!=='object') return;
  if(m.type==='connect'){
    if(canvas || !m.port || !m.canvas || !m.overlay) return;
    canvas=m.canvas; ovCanvas=m.overlay; send=m.port.postMessage.bind(m.port); m.port.onmessage=onHost;
  }
  else if(m.type==='evs') onEvents(m.list);
  else if(m.type==='measured'){
    const res=measures.get(m.req); if(!res) return; measures.delete(m.req);
    const r=m.rect||{}; res({x:fin(r.x), y:fin(r.y), w:fin(r.w), h:fin(r.h)});
  }
}
G.addEventListener('message',onRunner);
})(self);
