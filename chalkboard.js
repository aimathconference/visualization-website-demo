/* ---------- the Chalkboard: the editor for submissions (docs/submission-spec-slop.md, section 9) ----------
   Loaded after spec.js, runtime.js, checks.js, gif.js and api.js and before app.js; everything here runs at call time and
   uses app.js's helpers when they are there ($, esc, md, toast, announce, refocus, download, VIZ, view, showView,
   siteColors), with small fallbacks of its own when they are not.

   One source of truth: the piece's text, board.source (entries/<slug>.js) and board.md (entries/<slug>.md). Every panel
   edits the text, rewriting one literal at the offsets EigenReelSpec.read() reports (ranges), and every change re-reads
   the text and refreshes the other panels. The stage remounts only when something it runs changed (the code, COLORS,
   params, time, context, interact), keeping t and the params. Drafts autosave through EigenReelAPI.drafts as
   eigenreel:draft:<slug> = {slug, source, md, savedAt, from?, wasm?}.

   The piece runs in the same sandbox as the feed (EigenReelHost). What it sends only moves the stage's own state (t,
   params, the interact preview); nothing it sends can start an Export or change the check report: those follow the
   author's clicks and the text alone.

   Globals: bindChalkboard(el), renderChalkboard(), copyToChalkboard(v?) (no v: a new piece), newOnChalkboard(),
   openDraft(slug), boardStop(); for the older app.js also openNew() (= newOnChalkboard), openBoard(v), `board` (setting it
   to null shows the list) and demoReturn (always null now). EigenReelChalkboard has the pieces the tests use (toLiteral,
   exportFiles, reportMarkdown, ...). */
(function(){
'use strict';
const W=window;
const KEY='eigenreel:draft:';
const NON_RENDER=['title','hook','alt','tags','license','author','modes','libraries','presets'];
const FIELD_ORDER=['title','hook','alt','tags','license','author','modes','time','context','libraries','params','presets','interact'];
const IDENT=/^[A-Za-z_$][\w$]*$/;
const Spec=()=>W.EigenReelSpec;
const Host=()=>W.EigenReelHost;

/* ---------- app.js helpers, or stand-ins ---------- */
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q1=(s,r)=>(r||document).querySelector(s);
const qa=(s,r)=>[...(r||document).querySelectorAll(s)];
const say=m=>{ try{ if(typeof announce==='function') return announce(m); }catch(_){} };
const pop=m=>{ try{ if(typeof toast==='function') return toast(m); }catch(_){} console.info('chalkboard:',m); };
const renderMd=s=>{ try{ if(typeof md==='function') return md(s); }catch(e){ console.warn(e); } return `<pre>${E(s)}</pre>`; };
const texSet=el=>{ try{ if(typeof typeset==='function') typeset(el); }catch(_){} };
const focusSel=(sel,root)=>{ try{ if(typeof refocus==='function') return refocus(sel,root); }catch(_){} const x=q1(sel,root); if(x) x.focus({preventScroll:true}); };
const catalog=()=>{ try{ return typeof VIZ!=='undefined' && Array.isArray(VIZ)?VIZ:[]; }catch(_){ return []; } };
const onBoardView=()=>{ try{ return typeof view==='undefined' || view==='chalkboard'; }catch(_){ return true; } };
const cssVar=n=>{ const v=getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return /^#[0-9a-f]{6}$/i.test(v)?v:null; };
const site=()=>{ try{ if(typeof siteColors==='function'){ const s=siteColors(); if(s&&s.bg&&s.fg) return s; } }catch(_){} return {bg:cssVar('--bg')||'#050508', fg:cssVar('--fg')||'#ecebf5'}; };
function saveFile(blob,name){
  try{ if(typeof download==='function') return download(blob,name); }catch(_){}
  const a=document.createElement('a'), u=URL.createObjectURL(blob); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
}
const registryRepo=()=>{ try{ const r=W.EigenReelAPI&&EigenReelAPI.registry&&EigenReelAPI.registry.repo; if(r) return r; }catch(_){} try{ if(typeof REGISTRY!=='undefined' && REGISTRY && REGISTRY.repo) return REGISTRY.repo; }catch(_){} return 'EigenReel/registry'; };
const enc=s=>new TextEncoder().encode(String(s));
const lengthOf=meta=>meta&&meta.time&&Number.isFinite(meta.time.length)&&meta.time.length>0?meta.time.length:60;
const fmtT=t=>(Math.round(t*100)/100).toFixed(2);
const dprNow=()=>Math.min(2,W.devicePixelRatio||1);
const clone=x=>JSON.parse(JSON.stringify(x));
const debounce=(f,ms)=>{ let id=0; const d=(...a)=>{ clearTimeout(id); id=setTimeout(()=>f(...a),ms); }; d.cancel=()=>clearTimeout(id); d.flush=(...a)=>{ clearTimeout(id); f(...a); }; return d; };

/* ---------- drafts ---------- */
const mem=new Map();
const api=()=>W.EigenReelAPI&&EigenReelAPI.drafts?EigenReelAPI.drafts:null;
const drafts={
  get(slug){ const k=KEY+slug; try{ const a=api(); if(a) return a.get(k,null); }catch(_){} return mem.has(k)?clone(mem.get(k)):null; },
  set(d){ const k=KEY+d.slug; try{ const a=api(); if(a) return a.set(k,d); }catch(e){ console.warn(e); } mem.set(k,clone(d)); },
  del(slug){ const k=KEY+slug; try{ const a=api(); if(a) return a.del(k); }catch(_){} mem.delete(k); },
  list(){
    let keys=[]; try{ const a=api(); keys=a?a.keys(KEY):[...mem.keys()]; }catch(_){ keys=[...mem.keys()]; }
    return keys.map(k=>{ const d=this.get(k.slice(KEY.length)); return d&&typeof d==='object'&&typeof d.source==='string'&&typeof d.slug==='string'&&KEY+d.slug===k?d:null; })
      .filter(Boolean).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  },
};
function freeSlug(base){
  const S=Spec(); base=String(base||'my-piece').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32)||'my-piece';
  if(!/^[a-z0-9]/.test(base)) base='p-'+base;
  const taken=s=>!!drafts.get(s);
  if(!taken(base) && S.SLUG_RE.test(base) && !/^my-piece$/.test(base)) return base;
  for(let n=1;;n++){ const s=`${base}-${n}`.slice(0,40); if(!taken(s)) return s; }
}

/* ---------- the template and the starter explanation ---------- */
let templateText=null;
async function loadTemplate(){
  if(templateText) return templateText;
  try{ const r=await fetch('examples/template/visualization.js'); if(r.ok){ const t=await r.text(); if(Spec().read(t).meta) return templateText=t; } }catch(_){}
  return FALLBACK_TEMPLATE;
}
const FALLBACK_TEMPLATE=`const COLORS = { main: '#ff8a1f', secondary: '#2dd4a7', bg: '#050508', fg: '#ecebf5' };

import { label } from '@eigenreel/kit';

export default {
  title: 'Rose curves',
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',
  alt: 'A flower-shaped curve traced in orange on a dark background, its petals opening and closing.',
  tags: ['Geometry', 'Teaching'],
  license: 'MIT',
  author: { name: 'Your name' },
  modes: { desktop: true, phone: true },
  time: { length: 24, loop: true },
  context: '2d',
  libraries: [],
  params: [
    { key: 'k', type: 'range', label: 'Petal number k', min: 1, max: 12, step: 1, default: 5 },
    { key: 'trace', type: 'toggle', label: 'Show the traced path', default: true },
  ],
  presets: [
    { id: 'eight', label: 'k = 4, eight petals', params: { k: 4 }, t: 6 },
  ],
  interact: { hint: 'Use the panel to change k' },
  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors, k = params.k;
    S.panelK = k;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    const u = (t % 12) / 12, end = (k % 2 ? Math.PI : 2 * Math.PI) * Math.min(1, u * 2);
    ctx.strokeStyle = C.fg; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.main; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 600; i++) { const th = end * i / 600, r = R * Math.cos(k * th); const x = cx + r * Math.cos(th), y = cy - r * Math.sin(th); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    label(ctx, env, 'r = cos(' + k + 'θ)', 0, 20, { size: 16, weight: 700 });
  },
  onMode(env, S) {
    if (env.mode !== 'interact' || !env.ui) return;
    const slider = document.createElement('input');
    slider.setAttribute('type', 'range'); slider.setAttribute('min', '1'); slider.setAttribute('max', '12'); slider.setAttribute('step', '1');
    slider.setAttribute('value', String(S.panelK ?? 5));
    slider.style.position = 'absolute'; slider.style.right = '12px'; slider.style.bottom = '12px';
    slider.addEventListener('input', e => { env.setParam('k', +e.value); });
    env.ui.replaceChildren(slider);
  },
};
`;
const STARTER_MD=title=>`## ${title}

A rose curve is the polar graph of $r = \\cos(k\\theta)$. This text is a placeholder for the explanation of your own
piece: say what a viewer is looking at, why it behaves the way it does, and what to try. Formulas go between dollar
signs and do not count toward the 150 to 1200 words the explanation needs.

## What you're seeing

The orange curve is traced by the green point as $\\theta$ runs from $0$ to $\\pi$, or to $2\\pi$. Each trace takes
twelve seconds: the first half draws the curve and the second half erases it from the start, so every frame depends
only on the time and on the petal number. The faint circle is the unit circle that the tips of the petals touch.

## Why the count changes

When $k$ is odd, the curve for $\\theta$ between $\\pi$ and $2\\pi$ runs over the first half again, so you see $k$
petals. When $k$ is even, the second half fills the gaps between them, and there are $2k$ petals.

## Try this

- Jump to [eight petals](#preset:eight) and compare them with the five petals of $k = 5$.
- Pause [at t = 6](#t:6), halfway through a trace, and count the petals that are finished.
- Turn off the traced path in the panel and follow the moving point on its own.

Reference: [Rose curve](https://mathworld.wolfram.com/Rose.html) on MathWorld.
`;

/* ---------- source surgery: rewrite one literal, add or remove a property ---------- */
/* a value as a pretty JS literal: single-quoted strings, 2-space indent; arrays of objects one element per line */
function toLiteral(v,indent){
  indent=indent||''; const inner=indent+'  ';
  if(typeof v==='string') return "'"+v.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'\\r')
    .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+"'";
  if(typeof v==='number') return Number.isFinite(v)?String(Object.is(v,-0)?0:v):'0';
  if(typeof v==='boolean') return String(v);
  if(v==null) return 'null';
  if(Array.isArray(v)){
    if(!v.length) return '[]';
    if(!v.some(x=>x&&typeof x==='object'&&!Array.isArray(x))){
      const s='['+v.map(x=>toLiteral(x,inner)).join(', ')+']';
      if(!s.includes('\n') && indent.length+s.length<=100) return s;
    }
    return '[\n'+v.map(x=>inner+toLiteral(x,inner)+',').join('\n')+'\n'+indent+']';
  }
  const keys=Object.keys(v); if(!keys.length) return '{}';
  const k=x=>IDENT.test(x)?x:toLiteral(x);
  const s='{ '+keys.map(x=>k(x)+': '+toLiteral(v[x],inner)).join(', ')+' }';
  if(!s.includes('\n') && indent.length+s.length<=110) return s;
  return '{\n'+keys.map(x=>inner+k(x)+': '+toLiteral(v[x],inner)+',').join('\n')+'\n'+indent+'}';
}
const splice=(src,s,e,text)=>src.slice(0,s)+text+src.slice(e);
/* the properties of the object literal at range: [{key, start, end, vs, ve}] */
function objProps(src,range){
  const acorn=W.acorn;
  const node=acorn.parseExpressionAt(src,range[0],{ecmaVersion:'latest', sourceType:'module', allowAwaitOutsideFunction:true});
  if(node.type!=='ObjectExpression') throw new Error('not an object literal');
  return node.properties.filter(p=>p.type==='Property').map(p=>({key:p.key.type==='Identifier'?p.key.name:String(p.key.value), start:p.start, end:p.end, vs:p.value.start, ve:p.value.end}));
}
function indentOf(src,props,fallback){
  const p=props[0]; if(!p) return fallback;
  const ls=src.lastIndexOf('\n',p.start-1)+1, ind=src.slice(ls,p.start);
  return /^[ \t]*$/.test(ind)&&ls>0?ind:fallback;
}
/* a new property "text" after prop: at the end of prop's line (after its comma and any // comment), or inline */
function insertAfter(src,prop,text,indent){
  let i=prop.end; while(src[i]===' '||src[i]==='\t') i++;
  const comma=src[i]===',';
  let j=comma?i+1:i; while(src[j]===' '||src[j]==='\t') j++;
  if(src.startsWith('//',j)){ const nl=src.indexOf('\n',j); j=nl<0?src.length:nl; }
  if(src[j]==='\n'||src[j]==='\r'){
    if(!comma){ src=splice(src,prop.end,prop.end,','); j++; }
    return splice(src,j,j,`\n${indent}${text},`);
  }
  return comma?splice(src,i+1,i+1,` ${text},`):splice(src,prop.end,prop.end,`, ${text}`);
}
function insertProp(src,range,text,anchorKey){
  const props=objProps(src,range), indent=indentOf(src,props,'  ');
  if(!props.length) return splice(src,range[0],range[1],`{ ${text} }`);
  const anchor=anchorKey&&props.find(p=>p.key===anchorKey);
  if(anchor) return insertAfter(src,anchor,text,indent);
  return insertAfter(src,props[props.length-1],text,indent);
}
function removeProp(src,prop){
  let e=prop.end; while(src[e]===' '||src[e]==='\t') e++;
  if(src[e]===',') e++;
  const ls=src.lastIndexOf('\n',prop.start-1)+1;
  let k=e; while(src[k]===' '||src[k]==='\t') k++;
  if(src.startsWith('//',k)){ const nl=src.indexOf('\n',k); k=nl<0?src.length:nl; }
  if(/^[ \t]*$/.test(src.slice(ls,prop.start)) && (src[k]==='\n'||k>=src.length)) return splice(src,ls,Math.min(src.length,k+1),'');
  return splice(src,prop.start,e,'');
}
/* the export object's field `name`: rewritten, inserted after the field before it in FIELD_ORDER (or after author, or
   before the first function), or removed (value === undefined) */
function writeField(src,r,name,value){
  const rg=r.ranges.fields[name];
  if(value===undefined){
    if(!r.ranges.exportObject) return src;
    const p=objProps(src,r.ranges.exportObject).find(p=>p.key===name);
    return p?removeProp(src,p):src;
  }
  const props=objProps(src,r.ranges.exportObject), indent=indentOf(src,props,'  ');
  const lit=toLiteral(value,indent);
  if(rg) return splice(src,rg[0],rg[1],lit);
  const before=FIELD_ORDER.slice(0,FIELD_ORDER.indexOf(name)).reverse().find(k=>props.some(p=>p.key===k));
  const anchor=before||(props.some(p=>p.key==='author')?'author':null);
  if(anchor) return insertProp(src,r.ranges.exportObject,`${name}: ${lit}`,anchor);
  const fn=props.filter(p=>['setup','draw','onMode'].includes(p.key)).sort((a,b)=>a.start-b.start)[0];
  if(fn) return splice(src,fn.start,fn.start,`${name}: ${lit},\n${indent}`);
  return insertProp(src,r.ranges.exportObject,`${name}: ${lit}`);
}

/* ---------- state ---------- */
let bound=false, root=null;
let board=null;          // the open piece, or null for the list
let vocab=null;          // the tag vocabulary
let listGen=0;
const thumbs=new Map();  // slug@savedAt -> object URL
function makeBoard(d){
  const S=Spec();
  return {slug:d.slug, source:d.source, md:typeof d.md==='string'?d.md:'', from:d.from||null, wasm:d.wasm||null, savedAt:d.savedAt||0,
    r:S.read(d.source), host:null, mountedKey:null, t:0, playing:true, params:null, pv:{mode:'feed', device:'desktop', fullscreen:false},
    report:null, reportKey:null, dyn:null, dynKey:null, stopped:null, dropped:[], exported:false, scrubbing:false, keys:{}};
}
const pieceKey=b=>`${b.slug}\u0000${b.source}\u0000${b.md}`;

function loadVocab(){
  if(vocab) return Promise.resolve(vocab);
  return fetch('demo/github/registry/tags.json').then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{
    vocab=Array.isArray(j)&&j.every(x=>typeof x==='string')?j:Spec().DEFAULT_TAGS.slice();
    return vocab;
  });
}

/* ---------- entry points ---------- */
function bindChalkboard(el){
  if(bound) return; bound=true; root=el;
  el.addEventListener('click',onClick);
  el.addEventListener('input',onInput);
  el.addEventListener('change',onChange);
  el.addEventListener('pointerdown',e=>{ if(e.target.id==='cbk-scrub' && board) board.scrubbing=true; });
  document.addEventListener('pointerup',()=>{ if(board) board.scrubbing=false; });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && board && board.pv.mode==='interact' && !root.hidden){ setPreview({mode:'feed'}); }
  },true);
  document.addEventListener('pointerdown',e=>{
    if(board && board.pv.mode==='interact' && !e.target.closest('#cbk-fs')) setPreview({mode:'feed'});
  },true);
  document.addEventListener('fullscreenchange',()=>{
    if(!board) return; const fs=q1('#cbk-fs'), on=!!fs && document.fullscreenElement===fs;
    if(on!==board.pv.fullscreen){ board.pv.fullscreen=on; applyPreview(); }
  });
  document.addEventListener('visibilitychange',()=>{ if(board&&board.host){ if(document.hidden) board.host.pause(); else if(board.playing) board.host.play(); } });
}
function renderChalkboard(){
  const el=root||q1('#chalkboard'); if(!el) return; bindChalkboard(el);
  stopHost();
  if(board) renderBoard(el); else renderList(el);
}
function boardStop(){ stopHost(); }
function stopHost(){
  const b=board; if(!b||!b.host) return;
  try{ b.t=b.host.getTime(); b.params=b.host.getParams(); }catch(_){}
  b.host.dispose(); b.host=null; b.mountedKey=null;
  if(document.fullscreenElement && document.fullscreenElement.id==='cbk-fs') document.exitFullscreen().catch(()=>{});
}
function show(){
  try{ if(typeof showView==='function' && !onBoardView()) return showView('chalkboard'); }catch(_){}
  renderChalkboard();
}
async function newOnChalkboard(){
  const S=Spec(), src=await loadTemplate(), slug=freeSlug('my-piece');
  const title=(S.read(src).meta||{}).title||'My piece';
  const d={slug, source:src, md:STARTER_MD(title), savedAt:Date.now()};
  drafts.set(d); stopHost(); board=makeBoard(d); show();
  say(`New visualization ${slug}, from the contributor template.`);
  return board;
}
function copyToChalkboard(v){
  if(!v) return newOnChalkboard();
  if(typeof v.source!=='string'||!v.source.trim()){ pop(`“${v.title||v.id}” is not in the new submission format yet, so it cannot be copied to the Chalkboard.`); return null; }
  const S=Spec(), slug=freeSlug(`${v.id||'piece'}-copy`);
  const who=v.author&&(v.author.name||v.author.handle)||(typeof v.author==='string'?v.author:'its author');
  const lic=v.license||((S.read(v.source).meta||{}).license)||'its license';
  let source=v.source;
  try{ const r=S.read(source); if(r.meta && r.ranges.exportObject && !r.unreadable.includes('author')) source=writeField(source,r,'author',{name:'Your name'}); }catch(_){}
  const credit=`Based on “${v.title||v.id}” by ${who} (${lic}).`;
  const d={slug, source, md:`${credit}\n\n${String(v.md||'')}`, savedAt:Date.now(),
    from:{id:v.id, title:v.title, author:who, license:lic}, wasm:typeof v.wasm==='string'?v.wasm:null};
  drafts.set(d); stopHost(); board=makeBoard(d);
  if(v.wasm instanceof ArrayBuffer) board.wasm=v.wasm;
  show(); say(`Copied “${v.title}” to the Chalkboard as ${slug}.`);
  return board;
}
function openDraft(slug){
  const d=drafts.get(slug); if(!d) return null;
  stopHost(); board=makeBoard(d); show(); return board;
}
function openBoard(v){
  if(!v) return newOnChalkboard();
  if(v.slug && drafts.get(v.slug)) return openDraft(v.slug);
  return copyToChalkboard(v);
}

/* ---------- the list ---------- */
function renderList(el){
  const gen=++listGen, list=drafts.list(), cat=catalog().filter(v=>typeof v.source==='string'&&v.source.trim());
  el.innerHTML=`<div class="wrap chalkboard cbk"><div class="pagehead"><div class="kicker">Chalkboard</div><h1 tabindex="-1">Your chalkboard</h1>
      <p>The editor for your own pieces: change the colors, params, presets, text and code, watch it run in the same sandbox as the feed, check it as you go, and export the files for a pull request to the registry.</p>
      <div class="btnrow"><button class="btn" type="button" data-cbk-new>New visualization</button></div></div>
    <section aria-labelledby="cbk-drafts-h"><h2 class="sechead" id="cbk-drafts-h">Your drafts</h2>
      ${list.length?`<div class="cbk-cards">${list.map(d=>{ const m=Spec().read(d.source).meta||{}; return `<article class="cbk-card">
        <div class="cbk-thumb" data-cbk-thumb="${E(d.slug)}" aria-hidden="true"></div>
        <div class="cbk-cbody"><h3>${E(m.title||d.slug)}</h3><p class="fine"><code>${E(d.slug)}</code> · edited ${E(when(d.savedAt))}${d.from?` · based on “${E(d.from.title)}”`:''}</p>
        <div class="btnrow"><button class="btn" type="button" data-cbk-open="${E(d.slug)}" aria-label="Open ${E(m.title||d.slug)}">Open</button>
          <button class="btn ghost" type="button" data-cbk-del="${E(d.slug)}" aria-label="Delete the draft ${E(d.slug)}">Delete</button></div></div></article>`; }).join('')}</div>`
      :`<p class="fine">No drafts yet. Start a new visualization from the template, or copy a piece from the feed.</p>`}
      <p class="fine">Drafts are kept ${W.EigenReelAPI&&EigenReelAPI.server?'under your account on this server':'in this browser'}, and only you can see them.</p></section>
    <section aria-labelledby="cbk-feed-h"><h2 class="sechead" id="cbk-feed-h">Open a piece from the feed</h2>
      ${cat.length?`<label class="flabel" for="cbk-find">Find a piece</label><input class="input" id="cbk-find" type="search" autocomplete="off" placeholder="Title or author">
      <ul class="cbk-feed">${cat.map(v=>`<li data-cbk-item="${E((v.title+' '+((v.author&&v.author.name)||'')).toLowerCase())}"><span><b>${E(v.title)}</b> <small class="fine">by ${E((v.author&&v.author.name)||v.author||'')} · ${E(v.license||'')}</small></span>
        <button class="btn ghost" type="button" data-cbk-copy="${E(v.id)}" aria-label="Copy ${E(v.title)} to the Chalkboard">Copy</button></li>`).join('')}</ul>
      <p class="fine">A copy gets a slug of its own and keeps the original's license; its explanation starts with a line crediting the original.</p>`
      :`<p class="fine">No piece in the feed is in the new submission format yet.</p>`}</section></div>`;
  (async()=>{
    for(const d of list){
      if(gen!==listGen) return;
      const box=q1(`[data-cbk-thumb="${CSS.escape(d.slug)}"]`,el); if(!box) continue;
      const k=`${d.slug}@${d.savedAt}`;
      if(!thumbs.has(k)){
        const r=Spec().read(d.source); if(!r.meta||!r.functions.draw||!Host()) continue;
        try{
          const L=lengthOf(r.meta), blob=await Host().poster({slug:d.slug, source:d.source, meta:r.meta, colors:r.colors||{}, wasm:d.wasm||undefined},
            {w:320, h:200, t:Math.min(L,L/4), params:Spec().normalizeParams(r.meta,{}), device:'desktop', site:site()});
          thumbs.set(k,URL.createObjectURL(blob));
        }catch(e){ thumbs.set(k,null); }
      }
      const u=thumbs.get(k); if(u && box.isConnected) box.innerHTML=`<img alt="" src="${E(u)}">`;
    }
  })();
}
const when=ms=>{ if(!ms) return 'some time ago'; const d=new Date(ms), now=new Date();
  return d.toDateString()===now.toDateString()?d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}):d.toLocaleDateString(); };

/* ---------- the board ---------- */
const PANELS=[['colors','Colors',true],['params','Params and presets',true],['meta','Metadata',false],['explain','Explanation',false],['source','Source',false]];
function renderBoard(el){
  const b=board;
  el.innerHTML=`<div class="wrap chalkboard cbk"><div class="cbk-head"><button class="backlink" type="button" data-cbk-back>← Your chalkboard</button>
      <div class="kicker">Chalkboard · <span id="cbk-slugline">${E(b.slug)}</span></div><h1 id="cbk-title" tabindex="-1"></h1><p class="fine" id="cbk-saved" role="status"></p></div>
    <div class="cbk-grid">
      <div class="cbk-left">
        <div class="cbk-fs" id="cbk-fs">
          <div class="cbk-ixbar" id="cbk-ixbar" hidden><span class="cbk-hint" id="cbk-hint"></span><span class="fine">Esc or click outside to leave</span><button class="btn" type="button" data-cbk-done>Done</button></div>
          <div class="cbk-stage" id="cbk-stage" data-device="desktop"><canvas id="cbk-canvas" role="img" aria-label="Live render"></canvas>
            <div class="cbk-stage-msg" id="cbk-stage-msg" hidden></div></div>
        </div>
        <div class="cbk-transport"><button class="btn ghost" type="button" data-cbk-play id="cbk-play">Pause</button>
          <input type="range" id="cbk-scrub" min="0" max="1" step="0.01" value="0" aria-label="Time">
          <output id="cbk-t" for="cbk-scrub">t = 0.00 s</output></div>
        <div class="cbk-pv" role="group" aria-label="Preview">
          <div class="seg" role="group" aria-label="Mode"><button type="button" data-cbk-pv="mode:feed" aria-pressed="true">Feed</button><button type="button" data-cbk-pv="mode:interact" aria-pressed="false">Interact</button></div>
          <div class="seg" role="group" aria-label="Device"><button type="button" data-cbk-pv="device:desktop" aria-pressed="true">Desktop</button><button type="button" data-cbk-pv="device:phone" aria-pressed="false">Phone</button></div>
          <div class="seg" role="group" aria-label="Window"><button type="button" data-cbk-pv="fullscreen:0" aria-pressed="true">Windowed</button><button type="button" data-cbk-pv="fullscreen:1" aria-pressed="false">Full screen</button></div>
        </div>
        <p class="fine" id="cbk-pvnote"></p>
        <section class="cbk-try" aria-labelledby="cbk-try-h"><h2 class="cbk-h2" id="cbk-try-h">Try it</h2><div id="cbk-try"></div></section>
        <section class="cbk-checks" aria-labelledby="cbk-checks-h"><h2 class="cbk-h2" id="cbk-checks-h">Checks</h2>
          <p class="fine">They run as you edit. This report is advice for you: the check on the pull request is the one that counts.</p>
          <div id="cbk-static" aria-live="polite"></div>
          <div class="btnrow"><button class="btn ghost" type="button" data-cbk-dyn id="cbk-dynbtn">Run the dynamic checks</button></div>
          <p class="fine" id="cbk-dynstate" role="status"></p>
          <div id="cbk-dyn"></div>
          <details class="cbk-dynprev"><summary class="fine">What the dynamic checks see</summary><div id="cbk-dynview" class="cbk-dynview"></div></details>
        </section>
        <section class="cbk-export" aria-labelledby="cbk-export-h"><h2 class="cbk-h2" id="cbk-export-h">Export</h2>
          <div class="cbk-row"><label class="flabel" for="cbk-slug">Slug</label><input class="input" id="cbk-slug" type="text" spellcheck="false" autocomplete="off" value="${E(b.slug)}" aria-describedby="cbk-slug-msg"></div>
          <p class="fine" id="cbk-slug-msg">Lowercase letters, digits and dashes, at most 40; it names the files and the share links.</p>
          <div class="btnrow"><button class="btn" type="button" data-cbk-export>Export the files (.zip)</button></div>
          <p class="fine" id="cbk-wasmnote" hidden></p>
          <div id="cbk-howto" hidden></div>
        </section>
      </div>
      <div class="cbk-right">${PANELS.map(([id,label,open])=>`<details class="cbk-panel" data-panel="${id}"${open?' open':''}><summary>${E(label)}</summary><div class="cbk-pbody" id="cbk-p-${id}"></div>${id==='params'?'<div class="cbk-pbody" id="cbk-p-presets"></div>':''}</details>`).join('')}</div>
    </div></div>`;
  b.keys={};
  refresh(null);
  renderExplain(); syncSaved(); syncWasmNote();
  new ResizeObserver(()=>resizeHost()).observe(q1('#cbk-canvas',el));
  mountNow();
  runStatic();
  loadVocab().then(()=>{ if(board===b && !q1('#cbk-p-meta',el).contains(document.activeElement)) renderMeta(); });
  focusSel('#cbk-title',el);
  if(!b.ticker) b.ticker=setInterval(()=>tick(b),150);
}

/* ---------- text changes ---------- */
const reread=b=>{ b.r=Spec().read(b.source); };
/* origin: the panel the change came from, which is not re-rendered under the author's fingers */
function setSource(src,origin){
  const b=board; if(!b||src===b.source) return;
  b.source=src; reread(b);
  refresh(origin); saveSoon(); checkSoon(); remountSoon();
}
const rereadSoon=debounce(()=>{ const b=board; if(!b) return; reread(b); refresh('source'); checkSoon(); remountSoon(); },300);
function refresh(origin){
  const b=board; if(!b) return;
  const m=b.r.meta||{};
  const t=q1('#cbk-title'); if(t) t.textContent=m.title||b.slug;
  if(origin!=='colors') renderColors();
  if(origin!=='params') renderParams();
  if(origin!=='presets') renderPresets();
  if(origin!=='meta') renderMeta();
  if(origin!=='source') renderSource(); else renderSourceErrors();
  renderTry();
  syncWasmNote();
  if(!b.r.meta||!b.r.functions.draw) showStageErrors();
}
const saveSoon=debounce(()=>saveNow(),400);
function saveNow(){
  const b=board; if(!b) return;
  b.savedAt=Date.now();
  drafts.set({slug:b.slug, source:b.source, md:b.md, savedAt:b.savedAt, ...(b.from?{from:b.from}:{}), ...(typeof b.wasm==='string'?{wasm:b.wasm}:{})});
  syncSaved();
}
function syncSaved(){
  const s=q1('#cbk-saved'); if(!s||!board) return;
  s.textContent=`Draft saved ${when(board.savedAt)}${board.from?` · based on “${board.from.title}” by ${board.from.author} (${board.from.license})`:''}.`;
}
function syncWasmNote(){
  const b=board, n=q1('#cbk-wasmnote'); if(!b||!n) return;
  const uses=/\benv\s*\.\s*wasm\b/.test(b.source);
  n.hidden=!uses;
  n.textContent=uses?`This piece calls env.wasm(). The Chalkboard cannot produce entries/${b.slug}.wasm or its source: add the .wasm and sources/${b.slug}/ (with a BUILD file giving the command that builds it) to the pull request by hand.`:'';
}

/* ---------- the stage ---------- */
function renderKey(r,src){
  if(!r.meta||!r.ranges.exportObject) return src;
  const cut=NON_RENDER.map(k=>r.ranges.fields[k]).filter(Boolean).sort((a,b)=>b[0]-a[0]);
  let s=src; for(const [a,z] of cut) s=s.slice(0,a)+s.slice(z); return s;
}
const remountSoon=debounce(()=>{ const b=board; if(!b) return; if(renderKey(b.r,b.source)!==b.mountedKey) mountNow(); },450);
const boxOf=cv=>({x:0, y:0, w:Math.max(1,cv.clientWidth), h:Math.max(1,cv.clientHeight)});
function showStageErrors(){
  const b=board, msg=q1('#cbk-stage-msg'); if(!b||!msg) return;
  const errs=b.r.errors.slice(0,6);
  msg.hidden=false;
  msg.innerHTML=`<p><b>The source does not run yet.</b> Fix ${errs.length===1?'this':'these'} in the Source panel:</p><ul>${errs.map(e=>`<li>${e.line?`line ${e.line}: `:''}${E(e.message)}</li>`).join('')}</ul>`;
}
function mountNow(){
  const b=board, cv=q1('#cbk-canvas'); if(!b||!cv) return;
  if(!onBoardView()) return;
  if(b.host){ try{ b.t=b.host.getTime(); b.params=b.host.getParams(); }catch(_){} b.host.dispose(); b.host=null; }
  const r=b.r, msg=q1('#cbk-stage-msg');
  b.mountedKey=renderKey(r,b.source);
  if(!r.meta||!r.functions.draw){ showStageErrors(); syncTransport(); return; }
  if(!Host()){ msg.hidden=false; msg.textContent='The sandbox (runtime.js) is not loaded on this page.'; return; }
  msg.hidden=true; b.stopped=null; b.dropped=[];
  const meta=r.meta, S=Spec(), L=lengthOf(meta);
  b.params=S.normalizeParams(meta,b.params||{});
  b.t=Math.max(0,Math.min(L,b.t||0));
  if(b.pv.mode==='interact'&&!meta.interact) b.pv.mode='feed';
  q1('#cbk-stage').style.background=(r.colors&&r.colors.bg)||site().bg;
  const host=Host().mount(cv,{slug:b.slug, source:b.source, meta, colors:r.colors||{}, wasm:b.wasm||undefined},{
    params:b.params, t:b.t, playing:b.playing&&!document.hidden, device:b.pv.device, mode:b.pv.mode, fullscreen:b.pv.fullscreen,
    box:boxOf(cv), dpr:dprNow(), site:site(),
    onError:(kind,m)=>{ if(b.host!==host) return; b.stopped={kind, message:m};
      msg.hidden=false; msg.innerHTML=`<p><b>The piece stopped (${E(kind)}).</b> ${E(m||'')}</p><div class="btnrow"><button class="btn ghost" type="button" data-cbk-restart>Restart it</button></div>`; },
    onParam:(k,v,p)=>{ if(b.host!==host) return; b.params={...p}; syncTry(); },
    onLeave:()=>{ if(b.host===host) setPreview({mode:'feed'}); },
    onUIDropped:what=>{ if(b.host!==host) return; if(!b.dropped.includes(what)) b.dropped.push(what); syncPvNote(); },
    onEnded:()=>{ if(b.host!==host) return; b.playing=false; syncTransport(); },
  });
  b.host=host;
  cv.style.pointerEvents=b.pv.mode==='interact'?'none':'';
  cv.setAttribute('aria-label',`${meta.title||b.slug}, live render`);
  applyPreviewUI(); syncTransport(); syncPvNote();
}
const resizeHost=(()=>{ let raf=0; return ()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ const b=board, cv=q1('#cbk-canvas'); if(b&&b.host&&cv) b.host.resize(boxOf(cv),dprNow()); }); }; })();
function tick(b){
  if(board!==b){ clearInterval(b.ticker); b.ticker=0; return; }
  if(!b.host) return;
  try{ b.t=b.host.getTime(); }catch(_){ return; }
  const s=q1('#cbk-scrub'); if(s && !b.scrubbing && document.activeElement!==s) s.value=String(b.t);
  const o=q1('#cbk-t'); if(o) o.textContent=`t = ${fmtT(b.t)} s of ${lengthOf(b.r.meta)} s`;
}
function syncTransport(){
  const b=board; if(!b) return;
  const p=q1('#cbk-play'); if(p) p.textContent=b.playing?'Pause':'Play';
  const s=q1('#cbk-scrub'); if(s){ s.max=String(lengthOf(b.r.meta)); s.value=String(b.t||0); }
  const o=q1('#cbk-t'); if(o) o.textContent=`t = ${fmtT(b.t||0)} s of ${lengthOf(b.r.meta)} s`;
}
function setPreview(ch){
  const b=board; if(!b) return;
  const meta=b.r.meta||{};
  if(ch.mode==='interact' && !meta.interact){ pop('This piece declares no interact, so it has no interact mode. Add a hint under Metadata to give it one.'); return; }
  if(ch.fullscreen!==undefined){
    const fs=q1('#cbk-fs');
    if(ch.fullscreen && !document.fullscreenElement && fs && fs.requestFullscreen){ fs.requestFullscreen().catch(e=>pop(`Full screen is not available here: ${e.message}`)); return; }
    if(!ch.fullscreen && document.fullscreenElement){ document.exitFullscreen().catch(()=>{}); return; }
    return;
  }
  const leaving=b.pv.mode==='interact' && ch.mode==='feed';
  Object.assign(b.pv,ch); applyPreview();
  if(leaving){ const x=q1('[data-cbk-pv="mode:interact"]'); if(x && root.contains(document.activeElement)===false) x.focus({preventScroll:true}); }
}
function applyPreview(){
  const b=board; if(!b) return;
  applyPreviewUI();
  if(b.host) b.host.setMode({mode:b.pv.mode, fullscreen:b.pv.fullscreen, device:b.pv.device});
  const cv=q1('#cbk-canvas'); if(cv) cv.style.pointerEvents=b.pv.mode==='interact'?'none':'';
  resizeHost(); syncPvNote();
}
function applyPreviewUI(){
  const b=board; if(!b) return;
  qa('[data-cbk-pv]').forEach(x=>{ const [k,v]=x.dataset.cbkPv.split(':'); const cur=k==='fullscreen'?(b.pv.fullscreen?'1':'0'):b.pv[k]; x.setAttribute('aria-pressed',String(cur===v)); });
  const st=q1('#cbk-stage'); if(st) st.dataset.device=b.pv.device;
  const meta=b.r.meta||{}, bar=q1('#cbk-ixbar');
  if(bar){ bar.hidden=b.pv.mode!=='interact'; q1('#cbk-hint').textContent=meta.interact&&meta.interact.hint||''; }
  const ix=q1('[data-cbk-pv="mode:interact"]'); if(ix) ix.disabled=!meta.interact;
}
function syncPvNote(){
  const b=board, n=q1('#cbk-pvnote'); if(!b||!n) return;
  const meta=b.r.meta||{}, parts=[];
  parts.push(b.pv.device==='phone'?'Phone preview: the slide a phone shows, 335 × 490.':'Desktop preview: the stage at its natural size.');
  if(!meta.interact) parts.push('No interact mode: the piece declares no interact hint.');
  else if(b.pv.mode==='interact') parts.push('Interact preview: input over the stage goes to the piece.');
  if(meta.modes && b.pv.device==='phone' && meta.modes.phone!==true) parts.push('modes.phone is not true, so the phone feed leaves this piece out.');
  if(meta.modes && b.pv.device==='desktop' && meta.modes.desktop!==true) parts.push('modes.desktop is not true, so the desktop feed leaves this piece out.');
  if(b.dropped.length) parts.push(`The runner dropped what the piece built outside the env.ui allowlist: ${b.dropped.join(', ')}.`);
  n.textContent=parts.join(' ');
}

/* ---------- Try it: the live param values and presets (they drive the render, not the text) ---------- */
function renderTry(){
  const b=board, el=q1('#cbk-try'); if(!b||!el) return;
  const meta=b.r.meta;
  const key=meta?JSON.stringify([meta.params,meta.presets]):'';
  if(b.keys.try===key && el.childElementCount) return syncTry();
  b.keys.try=key;
  if(!meta){ el.innerHTML='<p class="fine">Nothing to try until the source reads.</p>'; return; }
  const S=Spec(), ctl=S.paramControls(meta), params=S.normalizeParams(meta,b.params||{});
  const presets=(meta.presets||[]).filter(p=>p&&typeof p.id==='string');
  el.innerHTML=`${ctl.length?`<div class="cbk-live">${ctl.map(c=>{ const id=`cbk-live-${E(c.key)}`, v=params[c.key];
      if(c.type==='range') return `<div class="cbk-lrow"><label for="${id}">${E(c.label)}</label><input type="range" id="${id}" data-cbk-live="${E(c.key)}" min="${E(c.min)}" max="${E(c.max)}" step="${E(c.step)}" value="${E(v)}"><output data-cbk-out="${E(c.key)}">${E(c.format(v))}</output></div>`;
      if(c.type==='toggle') return `<div class="cbk-lrow"><label for="${id}">${E(c.label)}</label><input type="checkbox" id="${id}" data-cbk-live="${E(c.key)}"${v?' checked':''}><output data-cbk-out="${E(c.key)}">${E(c.format(v))}</output></div>`;
      return `<div class="cbk-lrow"><label for="${id}">${E(c.label)}</label><select class="input" id="${id}" data-cbk-live="${E(c.key)}">${(c.options||[]).map(o=>`<option value="${E(o[0])}"${o[0]===v?' selected':''}>${E(o[1])}</option>`).join('')}</select><output data-cbk-out="${E(c.key)}"></output></div>`;
    }).join('')}</div>`:'<p class="fine">No params declared.</p>'}
    <div class="btnrow">${presets.map(p=>`<button class="btn ghost" type="button" data-cbk-preset="${E(p.id)}">${E(p.label||p.id)}</button>`).join('')}${ctl.length?'<button class="btn ghost" type="button" data-cbk-defaults>Defaults</button>':''}</div>`;
}
function syncTry(){
  const b=board, el=q1('#cbk-try'); if(!b||!el||!b.r.meta) return;
  const S=Spec(), meta=b.r.meta, ctl=S.paramControls(meta), params=S.normalizeParams(meta,b.params||{});
  for(const c of ctl){
    const i=q1(`[data-cbk-live="${CSS.escape(c.key)}"]`,el), o=q1(`[data-cbk-out="${CSS.escape(c.key)}"]`,el);
    if(i && document.activeElement!==i){ if(c.type==='toggle') i.checked=!!params[c.key]; else i.value=String(params[c.key]); }
    if(o && c.type!=='select') o.textContent=c.format(params[c.key]);
  }
}
function setLive(key,raw){
  const b=board; if(!b||!b.r.meta) return;
  const S=Spec(), meta=b.r.meta, def=(meta.params||[]).find(p=>p.key===key); if(!def) return;
  const v=def.type==='range'?+raw:def.type==='toggle'?!!raw:String(raw);
  b.params=S.normalizeParams(meta,{...(b.params||{}), [key]:v});
  if(b.host) b.host.setParams(b.params);
  syncTry();
}
function applyPreset(p){
  const b=board; if(!b||!b.r.meta||!p) return;
  b.params=Spec().normalizeParams(b.r.meta,p.params||{});
  if(b.host) b.host.setParams(b.params);
  if(Number.isFinite(p.t)){ b.t=p.t; b.playing=false; if(b.host){ b.host.pause(); b.host.seek(p.t); } } // pause first: the seek's frame then carries the new t
  syncTry(); syncTransport(); say(`Applied the preset ${p.label||p.id}.`);
}
function seekTo(t,pause){
  const b=board; if(!b) return;
  b.t=Math.max(0,Math.min(lengthOf(b.r.meta),t));
  if(pause){ b.playing=false; if(b.host) b.host.pause(); }
  if(b.host) b.host.seek(b.t);
  syncTransport();
}

/* ---------- Colors ---------- */
function colorProps(){
  const b=board; if(!b||!b.r.ranges.colors) return null;
  try{ return objProps(b.source,b.r.ranges.colors).map(p=>({...p, raw:b.source.slice(p.vs,p.ve)})); }catch(_){ return null; }
}
const strVal=raw=>{ const m=/^\s*(['"`])(.*)\1\s*$/s.exec(raw); return m?m[2]:null; };
function renderColors(){
  const b=board, el=q1('#cbk-p-colors'); if(!b||!el) return;
  const props=colorProps();
  if(!props){ el.innerHTML='<p class="fine">The COLORS statement does not read: fix it in the Source panel (it must be the first statement, <code>const COLORS = { main: \'#rrggbb\', … }</code>).</p>'; return; }
  el.innerHTML=`<div class="cbk-colors">${props.map(p=>{ const v=strVal(p.raw), ok=v&&/^#[0-9a-f]{6}$/i.test(v), id=`cbk-c-${E(p.key)}`;
      return `<div class="cbk-crow"><input type="color" id="${id}" data-cbk-color="${E(p.key)}" value="${ok?E(v.toLowerCase()):'#000000'}" aria-label="${E(p.key)}">
        <label for="${id}"><code>${E(p.key)}</code></label><input class="input cbk-hex" type="text" spellcheck="false" data-cbk-hex="${E(p.key)}" value="${E(v==null?p.raw:v)}" aria-label="${E(p.key)}, hex">
        ${p.key==='main'||p.key==='secondary'?'<span class="fine">required</span>':`<button class="btn ghost cbk-small" type="button" data-cbk-cdel="${E(p.key)}" aria-label="Remove the color ${E(p.key)}">Remove</button>`}</div>`; }).join('')}</div>
    <div class="cbk-addrow"><label class="flabel" for="cbk-newcolor">Add a named color</label><div class="cbk-inline"><input class="input" id="cbk-newcolor" type="text" spellcheck="false" placeholder="e.g. grid, bg, fg"><button class="btn ghost" type="button" data-cbk-cadd>Add</button></div></div>
    <p class="fine" id="cbk-contrast"></p>`;
  syncContrast();
}
function syncContrast(){
  const b=board, el=q1('#cbk-contrast'); if(!b||!el) return;
  const S=Spec(), c=b.r.colors||{}, s=site(), bg=/^#[0-9a-f]{6}$/i.test(c.bg||'')?c.bg:s.bg, fg=/^#[0-9a-f]{6}$/i.test(c.fg||'')?c.fg:s.fg;
  const r=S.contrast(fg,bg);
  el.className='fine'+(r<4.5?' cbk-warn':'');
  el.textContent=`fg ${fg}${c.fg?'':' (the site’s)'} on bg ${bg}${c.bg?'':' (the site’s)'}: contrast ${r.toFixed(2)}:1${r<4.5?'. Under 4.5:1, which fails the check: the page’s own text takes these colors.':', at least 4.5:1.'}`;
}
function setColor(name,hex,origin){
  const b=board, props=colorProps(); if(!props) return;
  const p=props.find(p=>p.key===name); if(!p) return;
  setSource(splice(b.source,p.vs,p.ve,toLiteral(hex)),origin||'colors');
  syncContrast();
}
function addColor(){
  const b=board, inp=q1('#cbk-newcolor'), name=(inp&&inp.value||'').trim(), props=colorProps(); if(!props) return;
  if(!IDENT.test(name)){ pop('A color name is a plain name: letters, digits and _, not starting with a digit.'); return; }
  if(props.some(p=>p.key===name)){ pop(`There is a color named ${name} already.`); return; }
  const dflt=name==='bg'?site().bg:name==='fg'?site().fg:'#888888';
  setSource(insertProp(b.source,b.r.ranges.colors,`${name}: ${toLiteral(dflt)}`),null);
  say(`Added the color ${name}.`);
}
function removeColor(name){
  const b=board, props=colorProps(); if(!props) return;
  const p=props.find(p=>p.key===name); if(!p||name==='main'||name==='secondary') return;
  setSource(removeProp(b.source,p),null);
  say(`Removed the color ${name}.`);
}

/* ---------- Params and presets (their definitions, written to the text) ---------- */
const unreadableNote=f=>`<p class="fine"><code>${f}</code> is not a plain literal, so it can only be edited in the Source panel.</p>`;
function renderParams(){
  const b=board, el=q1('#cbk-p-params'); if(!b||!el) return;
  const r=b.r;
  if(!r.meta||!r.ranges.exportObject){ el.innerHTML='<p class="fine">Fix the source first (see the Source panel).</p>'; return; }
  if(r.unreadable.includes('params')){ el.innerHTML=unreadableNote('params'); return; }
  const list=Array.isArray(r.meta.params)?r.meta.params:[];
  const num=(i,f,v,lab)=>`<label class="cbk-f"><span>${lab}</span><input class="input" type="number" step="any" data-pf="${f}" value="${Number.isFinite(v)?E(v):''}"></label>`;
  el.innerHTML=`<h3 class="cbk-h3">Params</h3>${list.map((p,i)=>{ p=p&&typeof p==='object'?p:{}; const t=p.type;
    return `<fieldset class="cbk-param" data-pi="${i}"><legend>${E(p.key||`param ${i+1}`)}</legend>
      <div class="cbk-fields"><label class="cbk-f"><span>key</span><input class="input" type="text" spellcheck="false" data-pf="key" value="${E(p.key||'')}"></label>
        <label class="cbk-f"><span>type</span><select class="input" data-pf="type">${['range','toggle','select'].map(x=>`<option${x===t?' selected':''}>${x}</option>`).join('')}</select></label>
        <label class="cbk-f cbk-wide"><span>label</span><input class="input" type="text" data-pf="label" value="${E(p.label||'')}"></label>
        ${t==='range'?num(i,'min',p.min,'min')+num(i,'max',p.max,'max')+num(i,'step',p.step,'step')+num(i,'default',p.default,'default')
          +`<label class="cbk-f"><span>format</span><input class="input" type="text" data-pf="format" placeholder="{}°" value="${E(p.format||'')}"></label>`
        :t==='toggle'?`<label class="cbk-f cbk-check"><input type="checkbox" data-pf="default"${p.default===true?' checked':''}><span>on by default</span></label>`
        :`<div class="cbk-wide cbk-opts"><span class="fine">options (value, label)</span>${(Array.isArray(p.options)?p.options:[]).map((o,j)=>`<div class="cbk-inline" data-oi="${j}"><input class="input" type="text" spellcheck="false" data-of="0" aria-label="option ${j+1} value" value="${E(Array.isArray(o)?o[0]:'')}"><input class="input" type="text" data-of="1" aria-label="option ${j+1} label" value="${E(Array.isArray(o)?o[1]:'')}"><button class="btn ghost cbk-small" type="button" data-cbk-odel="${j}" aria-label="Remove option ${j+1}">Remove</button></div>`).join('')}
            <button class="btn ghost cbk-small" type="button" data-cbk-oadd>Add an option</button></div>
          <label class="cbk-f"><span>default</span><select class="input" data-pf="default">${(Array.isArray(p.options)?p.options:[]).map(o=>Array.isArray(o)?`<option value="${E(o[0])}"${o[0]===p.default?' selected':''}>${E(o[0])}</option>`:'').join('')}</select></label>`}
      </div><div class="btnrow"><button class="btn ghost cbk-small" type="button" data-cbk-pdel="${i}">Remove this param</button></div></fieldset>`; }).join('')}
    <div class="btnrow"><button class="btn ghost" type="button" data-cbk-padd>Add a param</button></div>`;
}
function collectParams(){
  const el=q1('#cbk-p-params'); if(!el) return null;
  return qa('fieldset[data-pi]',el).map(fs=>{
    const g=f=>q1(`[data-pf="${f}"]`,fs), type=g('type').value, p={key:g('key').value.trim(), type, label:g('label').value};
    const n=f=>{ const x=g(f); if(!x||x.value.trim()==='') return; const v=+x.value; if(Number.isFinite(v)) p[f]=v; };
    if(type==='range'){ n('min'); n('max'); n('step'); n('default'); const f=g('format'); if(f&&f.value!=='') p.format=f.value; }
    else if(type==='toggle') p.default=!!(g('default')&&g('default').checked);
    else { p.options=qa('[data-oi]',fs).map(r=>[q1('[data-of="0"]',r).value, q1('[data-of="1"]',r).value]); const d=g('default'); p.default=d&&d.value!==''?d.value:(p.options[0]||[''])[0]; }
    return p;
  });
}
function writeParams(list,rerender){
  const b=board; if(!b||!b.r.meta) return;
  setSource(writeField(b.source,b.r,'params',list),rerender?null:'params');
}
const freshParam=(type,key,label)=>type==='range'?{key, type, label, min:0, max:1, step:0.1, default:0}:type==='toggle'?{key, type, label, default:false}
  :{key, type, label, options:[['a','Option A'],['b','Option B']], default:'a'};
function paramsChanged(e){
  const list=collectParams(); if(!list) return;
  const fs=e.target.closest('fieldset[data-pi]');
  if(e.target.dataset.pf==='type' && fs){ const i=+fs.dataset.pi, o=list[i]; list[i]=freshParam(o.type,o.key,o.label); return writeParams(list,true); }
  writeParams(list,false);
  if(fs && e.target.dataset.pf==='key'){ const lg=q1('legend',fs); if(lg) lg.textContent=e.target.value||'param'; }
  if(fs && e.target.dataset.of==='0'){ // keep the default select in step with the option values
    const i=+fs.dataset.pi, d=q1('[data-pf="default"]',fs), p=list[i];
    if(d && p.options){ d.innerHTML=p.options.map(o=>`<option value="${E(o[0])}"${o[0]===p.default?' selected':''}>${E(o[0])}</option>`).join(''); }
  }
}

function renderPresets(){
  const b=board, el=q1('#cbk-p-presets'); if(!b||!el) return;
  const r=b.r;
  if(!r.meta||!r.ranges.exportObject){ el.innerHTML=''; return; }
  if(r.unreadable.includes('presets')){ el.innerHTML='<h3 class="cbk-h3">Presets</h3>'+unreadableNote('presets'); return; }
  const defs=(Array.isArray(r.meta.params)?r.meta.params:[]).filter(p=>p&&typeof p.key==='string');
  const list=Array.isArray(r.meta.presets)?r.meta.presets:[];
  const ctl=(p,v,i)=>{ const has=v!==undefined, a=`aria-label="${E(p.label||p.key)}"`;
    if(p.type==='range') return `<input class="input" type="number" step="any" data-sp="${E(p.key)}" ${a} placeholder="not set" value="${has&&Number.isFinite(v)?E(v):''}">`;
    if(p.type==='toggle') return `<select class="input" data-sp="${E(p.key)}" ${a}><option value="">not set</option><option value="true"${v===true?' selected':''}>on</option><option value="false"${v===false?' selected':''}>off</option></select>`;
    return `<select class="input" data-sp="${E(p.key)}" ${a}><option value="">not set</option>${(Array.isArray(p.options)?p.options:[]).map(o=>Array.isArray(o)?`<option value="${E(o[0])}"${o[0]===v?' selected':''}>${E(o[1]||o[0])}</option>`:'').join('')}</select>`; };
  el.innerHTML=`<h3 class="cbk-h3">Presets</h3>${list.map((s,i)=>{ s=s&&typeof s==='object'?s:{}; const ps=s.params&&typeof s.params==='object'?s.params:{};
    return `<fieldset class="cbk-preset" data-si="${i}"><legend>${E(s.label||s.id||`preset ${i+1}`)}</legend><div class="cbk-fields">
      <label class="cbk-f"><span>id</span><input class="input" type="text" spellcheck="false" data-sf="id" value="${E(s.id||'')}"></label>
      <label class="cbk-f cbk-wide"><span>label</span><input class="input" type="text" data-sf="label" value="${E(s.label||'')}"></label>
      <label class="cbk-f"><span>t (s)</span><input class="input" type="number" step="any" min="0" data-sf="t" placeholder="none" value="${Number.isFinite(s.t)?E(s.t):''}"></label>
      ${defs.map(p=>`<label class="cbk-f"><span>${E(p.key)}</span>${ctl(p,ps[p.key],i)}</label>`).join('')}</div>
      <div class="btnrow"><button class="btn ghost cbk-small" type="button" data-cbk-sapply="${i}">Apply</button><button class="btn ghost cbk-small" type="button" data-cbk-sdel="${i}">Remove this preset</button></div></fieldset>`; }).join('')}
    <div class="btnrow"><button class="btn ghost" type="button" data-cbk-sadd>Add a preset</button><button class="btn ghost" type="button" data-cbk-scap>Capture the current state as a preset</button></div>
    <p class="fine">Link a preset from the explanation with <code>[words](#preset:id)</code>. Applying one sets its params and, with a t, seeks there and pauses.</p>`;
}
function collectPresets(){
  const b=board, el=q1('#cbk-p-presets'); if(!b||!el) return null;
  const defs=new Map((b.r.meta.params||[]).filter(p=>p&&typeof p.key==='string').map(p=>[p.key,p]));
  return qa('fieldset[data-si]',el).map(fs=>{
    const g=f=>q1(`[data-sf="${f}"]`,fs), s={id:g('id').value.trim(), label:g('label').value, params:{}};
    for(const x of qa('[data-sp]',fs)){
      const p=defs.get(x.dataset.sp), raw=x.value; if(!p||raw==='') continue;
      if(p.type==='range'){ const v=+raw; if(Number.isFinite(v)) s.params[p.key]=v; }
      else if(p.type==='toggle') s.params[p.key]=raw==='true';
      else s.params[p.key]=raw;
    }
    const t=g('t').value.trim(); if(t!==''&&Number.isFinite(+t)) s.t=+t;
    return s;
  });
}
function writePresets(list,rerender){
  const b=board; if(!b||!b.r.meta) return;
  setSource(writeField(b.source,b.r,'presets',list),rerender?null:'presets');
}
function freshPresetId(list,base){ const ids=new Set(list.map(s=>s.id)); for(let n=list.length+1;;n++){ const id=`${base}-${n}`; if(!ids.has(id)) return id; } }
function capturePreset(){
  const b=board; if(!b||!b.r.meta) return;
  const S=Spec(), list=collectPresets()||[], meta=b.r.meta;
  let params=b.params||{}, t=b.t||0;
  if(b.host){ try{ params=b.host.getParams(); t=b.host.getTime(); }catch(_){} }
  const id=freshPresetId(list,'preset');
  const s={id, label:`Preset ${list.length+1}`, params:S.nonDefault(meta,params), t:Math.min(lengthOf(meta),Math.round(t*100)/100)};
  writePresets([...list,s],true);
  say(`Captured the current params and t = ${fmtT(s.t)} s as the preset ${id}.`);
}

/* ---------- Metadata ---------- */
function renderMeta(){
  const b=board, el=q1('#cbk-p-meta'); if(!b||!el) return;
  const r=b.r, m=r.meta;
  if(!m||!r.ranges.exportObject){ el.innerHTML='<p class="fine">Fix the source first (see the Source panel).</p>'; return; }
  const S=Spec(), un=f=>r.unreadable.includes(f), dis=f=>un(f)?' disabled':'';
  const tags=Array.isArray(m.tags)?m.tags:[], voc=vocab||S.DEFAULT_TAGS, all=[...voc,...tags.filter(t=>typeof t==='string'&&!voc.includes(t))];
  const libs=Array.isArray(m.libraries)?m.libraries:[];
  const count=(f,max)=>`<span class="fine" data-cbk-count="${f}">${[...String(m[f]||'')].length} / ${max}</span>`;
  el.innerHTML=`<div class="cbk-meta">
    <div class="cbk-row"><label class="flabel" for="cbk-m-title">Title ${count('title',60)}</label><input class="input" id="cbk-m-title" type="text" data-mf="title" value="${E(m.title||'')}"${dis('title')}></div>
    <div class="cbk-row"><label class="flabel" for="cbk-m-hook">Hook ${count('hook',160)}</label><textarea class="input cbk-ta" id="cbk-m-hook" rows="2" data-mf="hook"${dis('hook')}>${E(m.hook||'')}</textarea></div>
    <div class="cbk-row"><label class="flabel" for="cbk-m-alt">Alt text ${count('alt',300)}</label><textarea class="input cbk-ta" id="cbk-m-alt" rows="3" data-mf="alt"${dis('alt')}>${E(m.alt||'')}</textarea>
      <p class="fine">1 or 2 sentences, 40 to 300 characters, describing the picture; not the title or the hook.</p></div>
    <fieldset class="cbk-row cbk-tags"${dis('tags')}><legend class="flabel">Tags <span class="fine" data-cbk-count="tags">${tags.length} of 1 to 4</span></legend>
      <div class="cbk-tagset">${all.map(t=>`<label class="cbk-tag"><input type="checkbox" data-mtag="${E(t)}"${tags.includes(t)?' checked':''}><span>${E(t)}${voc.includes(t)?'':' (not in the vocabulary)'}</span></label>`).join('')}</div></fieldset>
    <div class="cbk-two"><div class="cbk-row"><label class="flabel" for="cbk-m-license">License</label><select class="input" id="cbk-m-license" data-mf="license"${dis('license')}>${[...S.LICENSES,...(S.LICENSES.includes(m.license)||m.license==null?[]:[m.license])].map(l=>`<option${l===m.license?' selected':''}>${E(l)}</option>`).join('')}</select></div>
      <div class="cbk-row"><label class="flabel" for="cbk-m-author">Author name</label><input class="input" id="cbk-m-author" type="text" data-mf="author"${dis('author')} value="${E(m.author&&m.author.name||'')}"></div></div>
    <fieldset class="cbk-row"${dis('modes')}><legend class="flabel">Devices</legend><div class="cbk-inline">
      <label class="cbk-tag"><input type="checkbox" data-mmode="desktop"${m.modes&&m.modes.desktop===true?' checked':''}><span>Desktop</span></label>
      <label class="cbk-tag"><input type="checkbox" data-mmode="phone"${m.modes&&m.modes.phone===true?' checked':''}><span>Phone</span></label></div></fieldset>
    <div class="cbk-two"><div class="cbk-row"><label class="flabel" for="cbk-m-len">Length (s)</label><input class="input" id="cbk-m-len" type="number" min="0" max="3600" step="any" data-mtime="length"${dis('time')} value="${E(m.time&&m.time.length)}"></div>
      <label class="cbk-tag cbk-row"><input type="checkbox" data-mtime="loop"${dis('time')}${m.time&&m.time.loop===true?' checked':''}><span>Loop</span></label></div>
    <div class="cbk-row"><label class="flabel" for="cbk-m-ctx">Context</label><select class="input" id="cbk-m-ctx" data-mf="context"${dis('context')}>${['2d','webgl2'].map(c=>`<option${c===m.context?' selected':''}>${c}</option>`).join('')}</select>
      <p class="fine">webgl2 is desktop only.</p></div>
    <div class="cbk-row"><label class="flabel" for="cbk-m-hint">Interact hint <span class="fine" data-cbk-count="interact">${[...String(m.interact&&m.interact.hint||'')].length} / 60</span></label><input class="input" id="cbk-m-hint" type="text" data-mf="interact"${dis('interact')} placeholder="Empty: a feed-only piece, no interact mode" value="${E(m.interact&&m.interact.hint||'')}"></div>
    <fieldset class="cbk-row"${dis('libraries')}><legend class="flabel">Bundled libraries</legend>
      ${libs.map((l,i)=>`<div class="cbk-inline" data-li="${i}"><input class="input" type="text" spellcheck="false" data-lf="name" aria-label="Library ${i+1} name" placeholder="name" value="${E(l&&l.name||'')}"><input class="input" type="text" spellcheck="false" data-lf="version" aria-label="Library ${i+1} version" placeholder="version" value="${E(l&&l.version||'')}"><select class="input" data-lf="license" aria-label="Library ${i+1} license">${S.LICENSES.map(x=>`<option${l&&x===l.license?' selected':''}>${x}</option>`).join('')}</select><button class="btn ghost cbk-small" type="button" data-cbk-ldel="${i}" aria-label="Remove library ${i+1}">Remove</button></div>`).join('')}
      <div class="btnrow"><button class="btn ghost cbk-small" type="button" data-cbk-ladd>Add a library</button></div>
      <p class="fine">Each library bundled into the file, with a license on the list. The pinned imports (@eigenreel/kit, @eigenreel/three) are not listed here.</p></fieldset>
  </div>`;
}
function metaChanged(e){
  const b=board, t=e.target, r=b.r; if(!r.meta) return;
  let name, value;
  if(t.dataset.mf){
    name=t.dataset.mf; const v=t.value;
    value=name==='author'?{name:v}:name==='interact'?(v.trim()?{hint:v}:undefined):v;
    const c=q1(`[data-cbk-count="${name}"]`); if(c) c.textContent=`${[...v].length} / ${{title:60, hook:160, alt:300, interact:60}[name]}`;
  } else if(t.dataset.mtag!==undefined){
    name='tags'; const on=qa('[data-mtag]',q1('#cbk-p-meta')).filter(x=>x.checked).map(x=>x.dataset.mtag), had=Array.isArray(r.meta.tags)?r.meta.tags:[];
    value=[...had.filter(x=>on.includes(x)),...on.filter(x=>!had.includes(x))]; // keep the author's order, new ones last
    const c=q1('[data-cbk-count="tags"]'); if(c) c.textContent=`${value.length} of 1 to 4`;
  } else if(t.dataset.mmode){
    name='modes'; value={}; qa('[data-mmode]',q1('#cbk-p-meta')).forEach(x=>value[x.dataset.mmode]=x.checked);
  } else if(t.dataset.mtime){
    name='time'; const L=+q1('[data-mtime="length"]').value, loop=q1('[data-mtime="loop"]').checked;
    if(!Number.isFinite(L)||q1('[data-mtime="length"]').value.trim()==='') return;
    value={length:L, loop};
  } else if(t.dataset.lf){ name='libraries'; value=collectLibs(); }
  else return;
  if(r.unreadable.includes(name)) return;
  setSource(writeField(b.source,r,name,value),'meta');
  if(name==='interact'||name==='modes'){ applyPreviewUI(); syncPvNote(); }
}
const collectLibs=()=>qa('[data-li]',q1('#cbk-p-meta')).map(row=>({name:q1('[data-lf="name"]',row).value, version:q1('[data-lf="version"]',row).value, license:q1('[data-lf="license"]',row).value}));

/* ---------- Explanation ---------- */
function renderExplain(){
  const b=board, el=q1('#cbk-p-explain'); if(!b||!el) return;
  el.innerHTML=`<label class="flabel" for="cbk-md">entries/<span data-cbk-slugtext>${E(b.slug)}</span>.md <span class="fine" id="cbk-words"></span></label>
    <textarea class="input cbk-code cbk-prose" id="cbk-md" rows="14" spellcheck="true">${E(b.md)}</textarea>
    <p class="fine">Markdown with TeX in $…$ and $$…$$, 150 to 1200 words not counting formulas, with the headings “What you’re seeing” and “Try this” and a Reference line. Links to <code>#preset:id</code> and <code>#t:seconds</code> drive the render.</p>
    <h3 class="cbk-h3">Preview</h3><article class="md cbk-mdprev" id="cbk-mdprev"></article>`;
  renderMdPreview();
}
const renderMdPreview=()=>{
  const b=board, el=q1('#cbk-mdprev'); if(!b||!el) return;
  el.innerHTML=renderMd(b.md);
  qa('a[href]',el).forEach(a=>{ const h=a.getAttribute('href')||''; if(!h.startsWith('#')){ a.target='_blank'; a.rel='noopener noreferrer'; } });
  texSet(el);
  const w=q1('#cbk-words'), n=Spec().wordCount(b.md);
  if(w){ w.textContent=`${n} words`; w.classList.toggle('cbk-warn',n<150||n>1200); }
};
const mdPreviewSoon=debounce(renderMdPreview,250);
function mdLink(a,e){
  const b=board, h=a.getAttribute('href')||''; if(!h.startsWith('#')) return;
  e.preventDefault();
  const lv=Spec().liveLink(b.r.meta||{},h);
  if(!lv){ pop(`${h} is not a link the explanation may use.`); return; }
  if(lv.kind==='error'){ pop(lv.message); return; }
  if(lv.kind==='preset') applyPreset(lv.preset);
  else { seekTo(lv.t,true); say(`Paused at t = ${lv.t} s.`); }
}

/* ---------- Source ---------- */
function renderSource(){
  const b=board, el=q1('#cbk-p-source'); if(!b||!el) return;
  const ta=q1('#cbk-src',el);
  if(ta){ if(ta.value!==b.source) ta.value=b.source; return renderSourceErrors(); }
  el.innerHTML=`<label class="flabel" for="cbk-src">entries/<span data-cbk-slugtext>${E(b.slug)}</span>.js</label>
    <textarea class="input cbk-code" id="cbk-src" rows="24" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off">${E(b.source)}</textarea>
    <div id="cbk-srcerr" aria-live="polite"></div>
    <p class="fine">Every panel writes into this text, and edits here refresh every panel. Tab leaves the editor.</p>`;
  renderSourceErrors();
}
function renderSourceErrors(){
  const b=board, el=q1('#cbk-srcerr'); if(!b||!el) return;
  const errs=b.r.errors, f=b.r.forbidden||[];
  el.innerHTML=(errs.length?`<ul class="cbk-errs">${errs.map(e=>`<li class="cbk-fail">${e.line?`<b>line ${e.line}${e.col?`:${e.col}`:''}</b> `:''}${E(e.message)}</li>`).join('')}</ul>`:'<p class="fine">The source reads.</p>')
    +(f.length?`<ul class="cbk-errs">${f.map(x=>`<li class="cbk-warnrow"><b>line ${x.line}</b> the sandbox blocks ${E(x.name)}; this call will do nothing</li>`).join('')}</ul>`:'');
  const s=q1('summary',el.closest('details')); if(s) s.textContent=errs.length?`Source (${errs.length} problem${errs.length===1?'':'s'})`:'Source';
}

/* ---------- checks ---------- */
const newChecks=()=>{ const C=W.EigenReelChecks; return !!C && typeof C.run==='function' && typeof C.remixPackage!=='function' && typeof C.samplePackage!=='function'; };
let staticSeq=0;
const checkSoon=debounce(()=>runStatic(),800);
function fromSpecReport(x){
  const rows=[];
  if(x.ok) rows.push({id:'static', group:'static', title:'The static gate passes', status:'pass', detail:'Slug, sizes, metadata, COLORS and contrast, params and presets, the explanation, imports, libraries and WebAssembly.'});
  for(const e of x.errors) rows.push({id:'static', group:'static', title:e.message, status:'fail', where:e.file+(e.line?`:${e.line}`:'')});
  for(const w of x.warnings) rows.push({id:'static', group:'static', title:w.message, status:'warn', where:w.file+(w.line?`:${w.line}`:'')});
  return {ok:x.ok, checks:rows, meta:x.meta, colors:x.colors, sha256:x.sha256, durationMs:0, via:'spec'};
}
async function staticReport(b){
  const S=Spec(), piece={slug:b.slug, source:b.source, md:b.md, wasm:b.wasm instanceof ArrayBuffer?b.wasm:undefined, hasBuild:false};
  const voc=await loadVocab();
  if(newChecks()){
    try{
      const rep=await W.EigenReelChecks.run(piece,{dynamic:false, preview:null, vocabulary:voc, site:site(), onProgress(){}});
      if(rep && Array.isArray(rep.checks)) return {...rep, via:'checks'};
    }catch(e){ console.warn('chalkboard: EigenReelChecks.run failed, using the static gate in spec.js:',e); }
  }
  return fromSpecReport(await S.check({...piece, vocabulary:voc, site:site()}));
}
async function runStatic(){
  const b=board; if(!b) return null;
  const n=++staticSeq, key=pieceKey(b);
  const el=q1('#cbk-static'); if(el && !b.report) el.innerHTML='<p class="fine">Checking…</p>';
  let rep;
  try{ rep=await staticReport(b); }catch(e){ rep={ok:false, checks:null, error:String(e&&e.message||e)}; }
  if(n!==staticSeq||board!==b) return rep;
  b.report=rep; b.reportKey=key;
  renderReport(q1('#cbk-static'),rep,true);
  return rep;
}
/* where a row applies: a file:line string (spec.js), or {size, device, fullscreen, t} (the dynamic checks) */
function whereText(w){
  if(typeof w==='string') return w;
  if(!w||typeof w!=='object') return '';
  return [w.size, w.device, w.fullscreen?'full screen':null, Number.isFinite(w.t)?`t = ${w.t} s`:null, w.file?`${w.file}${w.line?`:${w.line}`:''}`:null].filter(Boolean).join(' · ');
}
function rowsHTML(rows){
  const order={fail:0, warn:1, skip:2, pass:3};
  return `<ul class="cbk-report">${rows.slice().sort((a,b)=>(order[a.status]??4)-(order[b.status]??4)).map(c=>`<li class="cbk-${E(c.status)}"><span class="cbk-st">${E(c.status)}</span>
    <div><b>${E(c.title)}</b>${c.detail?`<small>${E(c.detail)}</small>`:''}${c.where?`<small class="cbk-where">${E(whereText(c.where))}</small>`:''}${(c.frameUrls||[]).length?`<span class="cbk-frames">${c.frameUrls.map(u=>`<img alt="" src="${E(u)}">`).join('')}</span>`:''}</div></li>`).join('')}</ul>`;
}
/* the live list leaves out the rows the static run only skipped (the dynamic ones): the button runs those */
const shownRows=(rep,staticOnly)=>staticOnly?rep.checks.filter(c=>!(c.status==='skip' && c.group && c.group!=='static')):rep.checks;
function renderReport(el,rep,staticOnly){
  if(!el) return;
  if(!rep || !Array.isArray(rep.checks)){ el.innerHTML=`<p class="fine cbk-warn">Checks unavailable${rep&&rep.error?`: ${E(rep.error)}`:''}.</p>`; return; }
  const rows=shownRows(rep,staticOnly), n=s=>rows.filter(c=>c.status===s).length;
  el.innerHTML=`<p class="cbk-sum ${rep.ok?'cbk-pass':'cbk-fail'}">${rep.ok?'Passes':'Does not pass yet'}: ${n('pass')} passed, ${n('fail')} failed, ${n('warn')} warnings${n('skip')?`, ${n('skip')} skipped`:''}.</p>`+rowsHTML(rows);
}
async function runDynamic(){
  const b=board; if(!b) return;
  const st=q1('#cbk-dynstate'), out=q1('#cbk-dyn'), btn=q1('#cbk-dynbtn');
  if(!newChecks()){ st.textContent='The dynamic checks are not available on this page (checks.js is not the new checker).'; return; }
  btn.disabled=true; st.textContent='Running the dynamic checks…';
  const key=pieceKey(b), prev=q1('#cbk-dynview'); prev.innerHTML='';
  let rep;
  try{
    rep=await W.EigenReelChecks.run({slug:b.slug, source:b.source, md:b.md, wasm:b.wasm instanceof ArrayBuffer?b.wasm:undefined, hasBuild:false},
      {dynamic:true, preview:prev, vocabulary:await loadVocab(), site:site(), onProgress:(text,f)=>{ if(board===b) st.textContent=`${text}${Number.isFinite(f)?` (${Math.round(f*100)}%)`:''}`; }});
  }catch(e){ rep={checks:null, error:String(e&&e.message||e)}; }
  btn.disabled=false;
  if(board!==b) return;
  if(!rep||!Array.isArray(rep.checks)){ st.textContent=''; out.innerHTML=`<p class="fine cbk-warn">Checks unavailable${rep&&rep.error?`: ${E(rep.error)}`:''}.</p>`; return; }
  if(b.dyn) b.dyn.checks.forEach(c=>(c.frameUrls||[]).forEach(u=>URL.revokeObjectURL(u)));
  const rows=rep.checks.map(c=>({...c, frameUrls:[c.frame,...(Array.isArray(c.frames)?c.frames:[])].filter(x=>x instanceof Blob).map(x=>URL.createObjectURL(x))}));
  b.dyn={...rep, checks:rows}; b.dynKey=key;
  st.textContent=`Dynamic checks finished${key!==pieceKey(b)?', for an earlier version of the text':''}.`;
  renderReport(out,b.dyn);
  say(st.textContent);
}
function reportMarkdown(b,rep,dyn){
  const lines=[`# Check report: ${b.slug}`, '', `Made by the EigenReel Chalkboard on ${new Date().toISOString()} for entries/${b.slug}.js and entries/${b.slug}.md.`,
    'This report is advice for the author: the check on the pull request is the one that counts.', ''];
  if(rep && rep.sha256) lines.push(`SHA-256 of entries/${b.slug}.js: \`${rep.sha256}\``, '');
  const sect=(title,r)=>{
    lines.push(`## ${title}`, '');
    if(!r||!Array.isArray(r.checks)){ lines.push('Checks unavailable.', ''); return; }
    lines.push(`Result: ${r.ok?'passes':'does not pass'}.`, '');
    for(const c of shownRows(r,title==='Static checks')) lines.push(`- **${c.status}** ${String(c.title).replace(/\n/g,' ')}${c.detail?`: ${String(c.detail).replace(/\n/g,' ')}`:''}${c.where?` (${whereText(c.where)})`:''}`);
    lines.push('');
  };
  sect('Static checks',rep);
  if(dyn) sect('Dynamic checks',{...dyn, checks:dyn.checks.filter(c=>c.group!=='static')});
  else lines.push('The dynamic checks were not run for this version.', '');
  return lines.join('\n');
}

/* ---------- export ---------- */
async function exportFiles(){
  const b=board; if(!b) return null;
  if(b.reportKey!==pieceKey(b)) await runStatic();
  const dyn=b.dyn&&b.dynKey===pieceKey(b)?b.dyn:null;
  return [{name:`entries/${b.slug}.js`, bytes:enc(b.source)}, {name:`entries/${b.slug}.md`, bytes:enc(b.md)}, {name:'check-report.md', bytes:enc(reportMarkdown(b,b.report,dyn))}];
}
async function doExport(){
  const b=board; if(!b) return;
  if(!Spec().SLUG_RE.test(b.slug)){ pop('Fix the slug first.'); focusSel('#cbk-slug'); return; }
  if(!W.EigenReelGif||typeof EigenReelGif.zip!=='function'){ pop('The zip writer (gif.js) is not loaded on this page.'); return; }
  const files=await exportFiles(); if(board!==b) return;
  saveFile(EigenReelGif.zip(files),`${b.slug}.zip`);
  b.exported=true; renderHowto();
  say(`Exported ${b.slug}.zip with ${files.map(f=>f.name).join(', ')}.`);
}
function renderHowto(){
  const b=board, el=q1('#cbk-howto'); if(!b||!el) return;
  const repo=registryRepo(), gh=`https://github.com/${repo}`, wasm=/\benv\s*\.\s*wasm\b/.test(b.source);
  el.hidden=false;
  el.innerHTML=`<h3 class="cbk-h3">Send it to the registry</h3><ol class="cbk-steps">
    <li>Fork <a href="${E(gh)}" target="_blank" rel="noopener noreferrer">${E(repo)}</a> on GitHub (<a href="${E(gh)}/fork" target="_blank" rel="noopener noreferrer">Fork</a>).</li>
    <li>In your fork, make a branch and add <code>entries/${E(b.slug)}.js</code> and <code>entries/${E(b.slug)}.md</code> from the zip. GitHub's web upload (Add file, Upload files) is enough.${wasm?` Add <code>entries/${E(b.slug)}.wasm</code> and <code>sources/${E(b.slug)}/</code> with its <code>BUILD</code> file too.`:''}</li>
    <li>Open a pull request to ${E(repo)}. You may paste <code>check-report.md</code> into its description; reviewers go by the check that runs on the pull request.</li></ol>
    <p class="fine">The site never pushes or opens anything for you. Leave "Allow edits by maintainers" on, so a reviewer can push a small fix.</p>`;
}
function renameSlug(raw){
  const b=board, S=Spec(), msg=q1('#cbk-slug-msg'), slug=String(raw||'').trim();
  if(slug===b.slug){ msg.textContent='Lowercase letters, digits and dashes, at most 40; it names the files and the share links.'; msg.classList.remove('cbk-warn'); return; }
  if(!S.SLUG_RE.test(slug)){ msg.textContent=`“${slug}” is not a slug: lowercase letters, digits and dashes, starting with a letter or digit, at most 40.`; msg.classList.add('cbk-warn'); return; }
  if(drafts.get(slug)){ msg.textContent=`You have a draft named ${slug} already.`; msg.classList.add('cbk-warn'); return; }
  const old=b.slug; saveSoon.cancel();
  b.slug=slug; saveNow(); drafts.del(old);
  msg.textContent=`Renamed from ${old}.`; msg.classList.remove('cbk-warn');
  q1('#cbk-slugline').textContent=slug; qa('[data-cbk-slugtext]').forEach(x=>x.textContent=slug);
  syncWasmNote(); if(b.exported) renderHowto(); checkSoon();
}

/* ---------- events ---------- */
function onClick(e){
  const t=e.target, b=board, at=s=>t.closest(s);
  let x;
  if(at('[data-cbk-new]')) return newOnChalkboard();
  if((x=at('[data-cbk-open]'))) return openDraft(x.dataset.cbkOpen);
  if((x=at('[data-cbk-del]'))){ const s=x.dataset.cbkDel; if(confirm(`Delete the draft ${s}? This cannot be undone.`)){ drafts.del(s); renderChalkboard(); say(`Deleted the draft ${s}.`); } return; }
  if((x=at('[data-cbk-copy]'))){ const v=catalog().find(v=>v.id===x.dataset.cbkCopy); if(v) copyToChalkboard(v); return; }
  if(!b) return;
  if(at('[data-cbk-back]')){ saveSoon.flush(); stopHost(); board=null; renderChalkboard(); return focusSel('#chalkboard h1',root); }
  if(at('[data-cbk-play]')){ b.playing=!b.playing; if(b.host){ b.playing?b.host.play():b.host.pause(); } return syncTransport(); }
  if((x=at('[data-cbk-pv]'))){ const [k,v]=x.dataset.cbkPv.split(':'); return setPreview(k==='fullscreen'?{fullscreen:v==='1'}:{[k]:v}); }
  if(at('[data-cbk-done]')) return setPreview({mode:'feed'});
  if(at('[data-cbk-restart]')){ b.stopped=null; return mountNow(); }
  if((x=at('[data-cbk-preset]'))) return applyPreset(Spec().presetById(b.r.meta,x.dataset.cbkPreset));
  if(at('[data-cbk-defaults]')){ b.params=Spec().normalizeParams(b.r.meta,{}); if(b.host) b.host.setParams(b.params); return syncTry(); }
  if(at('[data-cbk-cadd]')) return addColor();
  if((x=at('[data-cbk-cdel]'))) return removeColor(x.dataset.cbkCdel);
  if(at('[data-cbk-padd]')){ const list=collectParams()||[]; const used=new Set(list.map(p=>p.key)); let n=list.length+1; while(used.has(`p${n}`)) n++;
    writeParams([...list,freshParam('range',`p${n}`,`Param ${n}`)],true); return; }
  if((x=at('[data-cbk-pdel]'))){ const list=collectParams()||[]; list.splice(+x.dataset.cbkPdel,1); return writeParams(list,true); }
  if(at('[data-cbk-oadd]')||(x=at('[data-cbk-odel]'))){
    const fs=t.closest('fieldset[data-pi]'), list=collectParams()||[], p=list[+fs.dataset.pi];
    if(x) p.options.splice(+x.dataset.cbkOdel,1); else { const vals=new Set(p.options.map(o=>o[0])); let n=p.options.length+1; while(vals.has(`o${n}`)) n++; p.options.push([`o${n}`,`Option ${n}`]); }
    if(!p.options.some(o=>o[0]===p.default)) p.default=(p.options[0]||[''])[0];
    return writeParams(list,true);
  }
  if(at('[data-cbk-sadd]')){ const list=collectPresets()||[]; return writePresets([...list,{id:freshPresetId(list,'preset'), label:`Preset ${list.length+1}`, params:{}}],true); }
  if(at('[data-cbk-scap]')) return capturePreset();
  if((x=at('[data-cbk-sdel]'))){ const list=collectPresets()||[]; list.splice(+x.dataset.cbkSdel,1); return writePresets(list,true); }
  if((x=at('[data-cbk-sapply]'))){ const list=collectPresets()||[]; return applyPreset(list[+x.dataset.cbkSapply]); }
  if(at('[data-cbk-ladd]')){ return setSource(writeField(b.source,b.r,'libraries',[...collectLibs(),{name:'', version:'', license:'MIT'}]),null); }
  if((x=at('[data-cbk-ldel]'))){ const l=collectLibs(); l.splice(+x.dataset.cbkLdel,1); return setSource(writeField(b.source,b.r,'libraries',l),null); }
  if(at('[data-cbk-dyn]')) return runDynamic();
  if(at('[data-cbk-export]')) return doExport();
  if((x=at('#cbk-mdprev a[href]'))) return mdLink(x,e);
}
function onInput(e){
  const t=e.target, b=board;
  if(t.id==='cbk-find'){ const s=t.value.trim().toLowerCase(); qa('[data-cbk-item]',root).forEach(li=>li.hidden=!!s&&!li.dataset.cbkItem.includes(s)); return; }
  if(!b) return;
  if(t.id==='cbk-scrub'){ seekTo(+t.value,true); return; }
  if(t.dataset.cbkLive!==undefined){ return setLive(t.dataset.cbkLive,t.type==='checkbox'?t.checked:t.value); }
  if(t.dataset.cbkColor){ const hx=q1(`[data-cbk-hex="${CSS.escape(t.dataset.cbkColor)}"]`); if(hx) hx.value=t.value; return setColor(t.dataset.cbkColor,t.value); }
  if(t.dataset.cbkHex){ const v=t.value.trim(); if(/^#[0-9a-f]{6}$/i.test(v)){ const c=q1(`[data-cbk-color="${CSS.escape(t.dataset.cbkHex)}"]`); if(c) c.value=v.toLowerCase(); setColor(t.dataset.cbkHex,v.toLowerCase()); } return; }
  if(t.closest('#cbk-p-params')){ if(t.type!=='checkbox'&&t.tagName!=='SELECT') paramsChanged(e); return; }
  if(t.closest('#cbk-p-presets')){ if(t.tagName!=='SELECT') writePresets(collectPresets(),false); return; }
  if(t.closest('#cbk-p-meta')){ if(t.type!=='checkbox'&&t.tagName!=='SELECT') metaChanged(e); return; }
  if(t.id==='cbk-md'){ b.md=t.value; saveSoon(); checkSoon(); mdPreviewSoon(); return; }
  if(t.id==='cbk-src'){ b.source=t.value; saveSoon(); rereadSoon(); return; }
}
function onChange(e){
  const t=e.target, b=board; if(!b) return;
  if(t.id==='cbk-slug') return renameSlug(t.value);
  if(t.closest('#cbk-p-params')){ if(t.type==='checkbox'||t.tagName==='SELECT') paramsChanged(e); return; }
  if(t.closest('#cbk-p-presets')){ if(t.tagName==='SELECT') writePresets(collectPresets(),false); return; }
  if(t.closest('#cbk-p-meta')){ if(t.type==='checkbox'||t.tagName==='SELECT') metaChanged(e); return; }
}

/* ---------- globals ---------- */
const expose={bindChalkboard, renderChalkboard, copyToChalkboard, newOnChalkboard, openNew:newOnChalkboard, openBoard, openDraft, boardStop};
for(const [k,f] of Object.entries(expose)) W[k]=f;
/* the older app.js reads `board` (null shows the list) and `demoReturn`; a setter keeps `board = null` working */
if(!('board' in W)) Object.defineProperty(W,'board',{configurable:true, get:()=>board, set:v=>{ if(v==null){ stopHost(); board=null; } }});
if(!('demoReturn' in W)) W.demoReturn=null;
W.EigenReelChalkboard={toLiteral, writeField, insertProp, removeProp, objProps, exportFiles, reportMarkdown:()=>board&&reportMarkdown(board,board.report,board.dyn),
  runStatic, runDynamic, setSource:s=>setSource(s,null), applyPreset, setPreview, mountNow, get board(){ return board; }, drafts, STARTER_MD, loadTemplate};
})();
