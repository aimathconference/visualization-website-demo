/* ---------- styles, palettes, fonts ---------- */
const STYLE_PAL = {
  night:{bg:'#050508', fg:'#ecebf5', a1:'#ff2e74', a2:'#22e0e8'},
  chalk:{bg:'#1b2a21', fg:'#eef0e4', a1:'#f4cf5d', a2:'#8fcbe9'},
  graph:{bg:'#ffffff', fg:'#13233a', a1:'#d2402a', a2:'#1d5fc4'},
};
const STYLE_FONT = { night:'"Manrope", system-ui, sans-serif', chalk:'"Kalam", "Comic Sans MS", cursive', graph:'"IBM Plex Mono", ui-monospace, monospace' };
const STYLE_NAME = { night:'Night feed', chalk:'Chalkboard', graph:'Graph paper' };
const STYLE_DESC = {
  night:'Phone-native and full-bleed. Glass controls float over the visual, like a short-video app.',
  chalk:'A framed blackboard for the lecture hall. Handwritten titles, large readable type.',
  graph:'An engineering notebook. Each visual is a numbered figure with its caption underneath.',
};
const PALETTES = [
  {id:'style', name:'Style default'},
  {id:'viridis', name:'Viridis', bg:'#100c24', fg:'#f1f1e6', a1:'#fde725', a2:'#22a884'},
  {id:'ink', name:'Ink on paper', bg:'#fbfaf5', fg:'#1b1b1b', a1:'#b3261e', a2:'#33598f'},
  {id:'solar', name:'Solarized', bg:'#002b36', fg:'#eee8d5', a1:'#cb4b16', a2:'#2aa198'},
  {id:'contrast', name:'High contrast', bg:'#000000', fg:'#ffffff', a1:'#ffd400', a2:'#00b3ff'},
];
const FONTS = [
  {id:'style', name:'Style default'},
  {id:'stix', name:'STIX Two Text (math serif)', css:'"STIX Two Text", "Times New Roman", serif'},
  {id:'plex', name:'IBM Plex Mono', css:'"IBM Plex Mono", ui-monospace, monospace'},
  {id:'atkinson', name:'Atkinson Hyperlegible', css:'"Atkinson Hyperlegible", system-ui, sans-serif'},
  {id:'kalam', name:'Kalam (handwritten)', css:'"Kalam", "Comic Sans MS", cursive'},
  {id:'unbounded', name:'Unbounded', css:'"Unbounded", "Arial Black", sans-serif'},
];
const ICON = {
  heart:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/></svg>',
  sigma:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 5h-11l6 7-6 7h11"/></svg>',
  sliders:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  code:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"/></svg>',
  full:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  share:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v6.5h14V13"/></svg>',
  up:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  close:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pause:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5v13M15 5.5v13"/></svg>',
  play:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.2v13.6L19 12z"/></svg>',
};

/* ---------- app state ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr=()=>Math.min(2, window.devicePixelRatio||1);
const fmtK=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(n);
const initials=h=>h.replace(/^@/,'').split(/[.\-_]/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('');
const md=s=>window.marked? marked.parse(s) : `<pre class="raw">${esc(s)}</pre>`;

let curStyle='night', view='feed', filter={type:'all'}, slides=[], slideEls=[], activeIdx=0, pads={t:0,r:0,b:0,l:0};
let paused=reduceMotion; // WCAG 2.2.2: motion can be paused; reduced-motion users start paused
let dTab=null, dViz=null, explainRaw=false, applyAll=false, blogPost=null, catTags=new Set(), catQuery='';
const settings={};
function getSettings(v){ return settings[v.id] || (settings[v.id]={palette:'style', font:'style', lw:1.5, speed:1, labels:true, params:normalizeParams(v.manifest,{})}); }
/* The host-owned theme every module receives read-only (docs/module-api.md: "Theme is not a param"). */
function themeFor(v){
  const s=getSettings(v), pal=s.palette==='style'?STYLE_PAL[curStyle]:PALETTES.find(p=>p.id===s.palette);
  const font=s.font==='style'?STYLE_FONT[curStyle]:FONTS.find(f=>f.id===s.font).css;
  return {bg:pal.bg, fg:pal.fg, a1:pal.a1, a2:pal.a2, font, lw:s.lw, labels:s.labels};
}
/* The legacy P of a catalog draw(), for thumbnails painted on the page: theme plus the one range param. */
function makeP(v){ const r=v.manifest.params.find(p=>p.type==='range'); return {...themeFor(v), param:r&&getSettings(v).params[r.key]}; }
const specs=new Map();
function specFor(v){
  if(!specs.has(v.id)) specs.set(v.id, v.manifest.runtime==='wasm'
    ? {runtime:'wasm', render:v.manifest.render, url:v.entry, manifest:v.manifest, trusted:true}
    : {runtime:'js', render:'canvas2d', source:moduleSource(v), manifest:v.manifest, trusted:true});
  return specs.get(v.id);
}
const texts=new Map(), textLoads=new Map();
function loadText(u){
  if(!textLoads.has(u)) textLoads.set(u,fetch(u).then(r=>{ if(!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.text(); }).then(t=>(texts.set(u,t),t),e=>{ textLoads.delete(u); throw e; }));
  return textLoads.get(u);
}
function readPads(){ const cs=getComputedStyle(document.documentElement), g=k=>parseFloat(cs.getPropertyValue(k))||0; pads={t:g('--pad-t'),r:g('--pad-r'),b:g('--pad-b'),l:g('--pad-l')}; }
function boxFor(w,h,full){ const p=full?{t:28,r:28,b:28,l:28}:pads; return {x:p.l, y:p.t, w:Math.max(100,w-p.l-p.r), h:Math.max(100,h-p.t-p.b)}; }
/* The drawing box avoids the top bar, caption, rail and desktop nav that float over the canvas.
   The caption can be cleared from below or beside it, the rail from below or beside it; pick the layout with the largest square. */
function layoutBox(sl){
  const W=sl.w, H=sl.h, cr=sl.canvas.getBoundingClientRect(), sr=sl.el.getBoundingClientRect(), scr=$('#screen').getBoundingClientRect();
  const ox=cr.left-sr.left, oy=cr.top-sr.top, g=10;
  const rel=(el,base)=>{ if(!el||el.hidden) return null; const r=el.getBoundingClientRect(); if(!r.width||!r.height) return null;
    const o={l:r.left-base.left-ox, t:r.top-base.top-oy, r:r.right-base.left-ox, b:r.bottom-base.top-oy}; return (o.r>0&&o.l<W&&o.b>0&&o.t<H)?o:null; };
  const top=rel($('#topbar'),scr), cap=rel($('.caption',sl.el),sr), rail=rel($('.rail',sl.el),sr), nav=rel($('#feednav'),scr);
  const base={t:pads.t, r:pads.r, b:pads.b, l:pads.l}; if(top) base.t=Math.max(base.t, top.b+g); if(nav) base.r=Math.max(base.r, W-nav.l+g);
  // weight <1 keeps the classic "visual above the caption" composition unless it would be much smaller (landscape phones)
  const capOpts=cap?[{b:H-cap.t+g},{l:cap.r+g, wt:0.7}]:[{}], railOpts=rail?[{b:H-rail.t+g},{r:W-rail.l+g}]:[{}];
  let best=null;
  for(const a of capOpts) for(const b of railOpts){
    const p={...base}; for(const o of [a,b]) for(const k in o) if(k!=='wt') p[k]=Math.max(p[k],o[k]);
    const B={x:p.l, y:p.t, w:W-p.l-p.r, h:H-p.t-p.b}, score=(Math.min(B.w,B.h)*1e6+B.w*B.h)*(a.wt||1);
    if(!best||score>best.score) best={B,score};
  }
  const B=best.B; B.w=Math.max(100,B.w); B.h=Math.max(100,B.h); return B;
}

const feed=$('#feed'), drawer=$('#drawer');
$('#prev').innerHTML=ICON.up; $('#next').innerHTML=ICON.down; $('#d-close').innerHTML=ICON.close; $$('[data-close-modal]').forEach(b=>b.innerHTML=ICON.close);
let announceTimer;
function announce(msg){ const a=$('#announcer'); a.textContent=''; clearTimeout(announceTimer); announceTimer=setTimeout(()=>a.textContent=msg,80); }

/* ---------- feed ---------- */
function feedList(){
  if(filter.type==='tag') return VIZ.filter(v=>v.tags.includes(filter.value));
  if(filter.type==='playlist') return filter.ids.map(id=>VIZ.find(v=>v.id===id)).filter(Boolean);
  return VIZ;
}
const rbtn=(act,icon,lbl,o={})=>`<button class="rbtn${o.on?' on':''}" type="button" data-act="${act}" aria-label="${esc(o.aria||lbl)}"${o.pressed!=null?` aria-pressed="${o.pressed}"`:''}><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;
const likeLabel=v=>{ const n=fmtK(v.likes+(v.liked?1:0)); return {lbl:n, aria:`Like, ${n} likes`}; };
const pauseLabel=()=>paused?{icon:ICON.play, lbl:'Play', aria:'Play animation'}:{icon:ICON.pause, lbl:'Pause', aria:'Pause animation'};
function slideHTML(v,i){
  const lk=likeLabel(v), pz=pauseLabel();
  return `<div class="stage"><canvas role="img" aria-label="${esc(v.title)}, animated visualization" aria-describedby="alt-${i}"></canvas><p class="sr" id="alt-${i}">${esc(v.alt||v.hook)}</p></div>
  <div class="caption">
    <div class="who"><span class="avatar">${initials(v.author)}</span><span>${esc(v.author)}</span><span class="muted">· reviewed ${v.reviewed}</span></div>
    <h2 class="vtitle" data-fig="${i+1}">${esc(v.title)}</h2>
    <p class="hook">${esc(v.hook)}</p>
    <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
    <div class="meta"><span class="oss">open source · ${v.license}</span><span>${v.repo}</span></div>
  </div>
  <div class="rail">
    ${rbtn('pause',pz.icon,pz.lbl,{aria:pz.aria})}
    ${rbtn('like',ICON.heart,lk.lbl,{aria:lk.aria, on:v.liked, pressed:!!v.liked})}
    ${rbtn('explain',ICON.sigma,'Explain')}
    ${rbtn('customize',ICON.sliders,'Customize')}
    ${rbtn('source',ICON.code,'Source')}
    ${rbtn('full',ICON.full,'Full screen')}
    ${rbtn('share',ICON.share,'Share')}
  </div>
  <button class="btn ghost exit-fs" type="button" data-act="exitfull">Exit full screen</button>`;
}
function endHTML(n){
  const what = filter.type==='tag' ? ` tagged #${esc(filter.value.toLowerCase())}` : filter.type==='playlist' ? ` from “${esc(filter.name)}”` : '';
  return `<div class="end"><div class="end-card">
    <div class="kicker">End of the feed</div>
    <h2>You've seen all ${n} visualization${n===1?'':'s'}${what}</h2>
    <p>New pieces are reviewed and added every month. Get the roundup by email.</p>
    ${nlForm('end')}
    <div class="btnrow"><button class="btn ghost" type="button" data-go="top">Back to the first</button><button class="btn ghost" type="button" data-view="browse">Browse the catalog</button><button class="btn ghost" type="button" data-view="blog">Read the blog</button></div>
  </div></div>`;
}
function nlForm(p){
  return `<form class="nl-form" novalidate>
    <label class="flabel" for="${p}-email">Email</label>
    <div class="nl-row"><input class="input" type="email" id="${p}-email" placeholder="you@university.edu" autocomplete="email"><button class="btn" type="submit">Subscribe</button></div>
    <p class="nl-err" hidden></p>
    <p class="fine">The Monthly Locus: one email a month. Unsubscribe anytime.</p>
  </form>`;
}

let io, ro;
function buildFeed(){
  io&&io.disconnect(); ro&&ro.disconnect(); slides.forEach(unmount);
  feed.innerHTML=''; slides=[];
  const list=feedList();
  ro=new ResizeObserver(es=>{ for(const e of es){ const sl=slides.find(s=>s.el.contains(e.target)); if(!sl) continue;
    if(e.target.classList.contains('caption')) sl.el.style.setProperty('--cap-h',e.target.offsetHeight+'px');
    sizeCanvas(sl); } });
  io=new IntersectionObserver(es=>{
    for(const e of es){
      const sl=slides.find(s=>s.el===e.target); if(sl && sl.visible!==e.isIntersecting){ sl.visible=e.isIntersecting; syncPlay(); }
      if(e.isIntersecting && e.intersectionRatio>=0.6){ const i=slideEls.indexOf(e.target); if(i!==activeIdx){ activeIdx=i; onActiveChange(true); } }
    }
  },{root:feed, threshold:[0,0.6]});
  list.forEach((v,i)=>{
    const el=document.createElement('section'); el.className='slide'; el.setAttribute('aria-label',v.title); el.innerHTML=slideHTML(v,i);
    feed.appendChild(el);
    const stage=$('.stage',el), sl={v,el,stage,canvas:$('canvas',el),host:null,used:false,card:null,t:v.t0+(paused?6:0),w:0,h:0,visible:false};
    slides.push(sl); ro.observe(stage); ro.observe($('.caption',el)); ro.observe($('.rail',el)); io.observe(el);
    stage.addEventListener('dblclick',e=>{ if(e.target.closest('.stall')) return; like(sl,true); burst(el,e); });
  });
  const end=document.createElement('section'); end.className='slide'; end.setAttribute('aria-label','End of the feed'); end.innerHTML=endHTML(list.length);
  feed.appendChild(end); io.observe(end);
  slideEls=[...feed.children]; feed.scrollTop=0; activeIdx=0; onActiveChange();
}
function measure(sl){ const r=sl.canvas.getBoundingClientRect(); if(!r.width) return false; sl.w=r.width; sl.h=r.height; sl.B=layoutBox(sl); return true; }
function boxOf(sl){ const full=document.fullscreenElement===sl.el || document.body.classList.contains('immersive'); return full||!sl.B?boxFor(sl.w,sl.h,full):sl.B; }
function sizeCanvas(sl){ if(!measure(sl)) return; if(sl.host) sl.host.resize(boxOf(sl),dpr()); if(sl.card) placeCard(sl); }
function relayout(){ requestAnimationFrame(()=>{ readPads(); slides.forEach(sizeCanvas); }); }

/* ---------- runtime: each slide near the viewport runs its module in a worker (runtime.js) ---------- */
const wantsPlay=sl=>!paused && view==='feed' && sl.visible && !sl.card && !document.hidden && !(reduceMotion && sl.v.manifest.motion==='static');
function syncPlay(){ for(const sl of slides) if(sl.host) wantsPlay(sl)?sl.host.play():sl.host.pause(); }
function mountSlide(sl){
  if(sl.host || sl.card || !measure(sl)) return;
  if(sl.used){ const c=sl.canvas.cloneNode(false); sl.canvas.replaceWith(c); sl.canvas=c; } // a canvas hands its control to one worker, once
  sl.used=true; const v=sl.v, s=getSettings(v);
  sl.host=LociHost.mount(sl.canvas,specFor(v),{theme:themeFor(v), params:s.params, box:boxOf(sl), dpr:dpr(), t:sl.t, speed:s.speed, playing:wantsPlay(sl), onError:(kind,msg)=>pieceFailed(sl,kind,msg)});
}
function unmount(sl){ if(!sl.host) return; sl.t=sl.host.getTime(); sl.host.dispose(); sl.host=null; }
/* at most three workers: the active slide and its neighbours */
let mountTimer=0; // settle first: a fast scroll should not start and stop a worker for every slide it passes
function mountPolicy(){ clearTimeout(mountTimer); mountTimer=setTimeout(()=>slides.forEach((sl,i)=>Math.abs(i-activeIdx)<=1?mountSlide(sl):unmount(sl)),60); }
function pushTheme(){ for(const sl of slides) if(sl.host){ sl.host.setTheme(themeFor(sl.v)); sl.host.setSpeed(getSettings(sl.v).speed); } }
function pushParams(v){ for(const sl of slides) if(sl.host && sl.v===v) sl.host.setParams(getSettings(v).params); }
function seekViz(v,t){ for(const sl of slides) if(sl.v===v){ sl.t=t; if(sl.host) sl.host.seek(t); } }
const CARD={
  stalled:['This piece stalled','It stopped answering for more than half a second, so Loci stopped it.'],
  slow:['This piece is running slowly','It was taking too long to draw each frame, so Loci paused it to keep the page responsive.'],
  error:['This piece hit an error',''],
  unsupported:['This piece can’t run here',''],
};
function pieceFailed(sl,kind,msg){
  if(!slides.includes(sl)) return;
  if(kind!=='slow' && sl.host){ sl.t=sl.host.getTime(); sl.host=null; } // the worker is gone; 'slow' leaves it paused
  const [title,why]=CARD[kind]||CARD.error, detail=why||msg||'';
  if(sl.card) sl.card.remove();
  const c=document.createElement('div'), i=slides.indexOf(sl); c.className='stall'; c.setAttribute('role','group'); c.setAttribute('aria-labelledby',`stall-${i}`);
  c.innerHTML=`<p class="stall-h" id="stall-${i}">${esc(title)}</p>${detail?`<p class="fine">${esc(detail)}</p>`:''}<button class="btn" type="button" data-act="restart">Restart</button>`;
  sl.stage.appendChild(c); sl.card=c; placeCard(sl);
  if(curSlide()===sl) announce(`${sl.v.title}: ${title}. ${detail}`);
}
function placeCard(sl){ const B=boxOf(sl), st=sl.card.style; st.left=(B.x+B.w/2)+'px'; st.top=(B.y+B.h/2)+'px'; st.maxWidth=Math.max(200,B.w-16)+'px'; }
function restart(sl){
  const hadFocus=sl.card && sl.card.contains(document.activeElement);
  if(sl.card){ sl.card.remove(); sl.card=null; }
  unmount(sl); sl.t=sl.v.t0+(paused?6:0); mountSlide(sl);
  if(hadFocus) refocus('[data-act="pause"]',sl.el);
  announce(`Restarted ${sl.v.title}`);
}
function curSlide(){ return slides[activeIdx]; }
function onActiveChange(say){
  const n=slides.length;
  if(say) announce(activeIdx<n?`${activeIdx+1} of ${n}: ${slides[activeIdx].v.title}`:'End of the feed');
  $('#counter').textContent=`${Math.min(activeIdx+1,n)} / ${n}`;
  $('#prev').disabled=activeIdx<=0; $('#next').disabled=activeIdx>=slideEls.length-1;
  mountPolicy();
  const sl=curSlide();
  if(dTab && sl && sl.v!==dViz){ dViz=sl.v; renderDrawer(); }
}
function goTo(i){
  i=Math.max(0,Math.min(slideEls.length-1,i));
  if(document.fullscreenElement && slides[i]) slides[i].el.requestFullscreen().catch(()=>{});
  slideEls[i].scrollIntoView({behavior:reduceMotion?'auto':'smooth', block:'start'});
}
function like(sl,only){
  const v=sl.v; if(only && v.liked) return; v.liked=!v.liked;
  const b=$('[data-act="like"]',sl.el), lk=likeLabel(v); b.classList.toggle('on',v.liked); b.setAttribute('aria-pressed',!!v.liked); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl;
}
function togglePause(){
  paused=!paused; const pz=pauseLabel();
  $$('[data-act="pause"]').forEach(b=>{ $('.ico',b).innerHTML=pz.icon; $('.lbl',b).textContent=pz.lbl; b.setAttribute('aria-label',pz.aria); });
  syncPlay(); announce(paused?'Animation paused':'Animation playing');
}
function burst(el,e){
  const r=el.getBoundingClientRect(), p=document.createElement('span'); p.className='pop'; p.innerHTML=ICON.heart;
  p.style.left=(e.clientX-r.left)+'px'; p.style.top=(e.clientY-r.top)+'px'; el.appendChild(p); setTimeout(()=>p.remove(),750);
}
async function enterFull(sl){
  try{ if(sl.el.requestFullscreen){ await sl.el.requestFullscreen(); return; } }catch(_){}
  document.body.classList.add('immersive'); requestAnimationFrame(()=>sl.el.scrollIntoView({block:'start'}));
  toast('Full screen is blocked here, so the page controls are hidden instead. Press Esc to exit.');
}
function exitFull(){
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  if(document.body.classList.contains('immersive')){ document.body.classList.remove('immersive'); requestAnimationFrame(()=>slideEls[activeIdx]&&slideEls[activeIdx].scrollIntoView({block:'start'})); }
}
async function copyText(text,okMsg){
  try{ await navigator.clipboard.writeText(text); toast(okMsg); }
  catch(_){ toast('Copying is blocked here. Select the text and copy it manually.'); }
}
function handleAct(act,sl,opener){
  if(act==='exitfull') return exitFull();
  if(!sl) return;
  if(act==='restart') restart(sl);
  else if(act==='like') like(sl);
  else if(act==='pause') togglePause();
  else if(act==='explain'||act==='customize'||act==='source') openDrawer(act,sl.v,opener);
  else if(act==='full') enterFull(sl);
  else if(act==='share') copyText(`https://loci.example/v/${sl.v.id}`,'Link copied');
}

/* ---------- chips / filter ---------- */
function tagCounts(){ const m=new Map(); VIZ.forEach(v=>v.tags.forEach(t=>m.set(t,(m.get(t)||0)+1))); return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])); }
function renderChips(){
  const ti=on=>` aria-pressed="${on}" tabindex="${on?0:-1}"`;
  let h=`<button class="chip" type="button" data-chip="all"${ti(filter.type==='all')}>All<span class="n"><span class="sr">,</span> ${VIZ.length}</span></button>`;
  if(filter.type==='playlist') h+=`<button class="chip" type="button" data-chip="all"${ti(true)} aria-label="Playlist: ${esc(filter.name)}. Clear playlist">▶ ${esc(filter.name)} ✕</button>`;
  h+=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-chip="${esc(t)}"${ti(filter.type==='tag'&&filter.value===t)}>${esc(t)}<span class="n"><span class="sr">,</span> ${n}</span></button>`).join('');
  $('#chips').innerHTML=h;
}
function setFilter(f){
  const had=$('#chips').contains(document.activeElement);
  filter=f; renderChips(); buildFeed();
  if(had){ const c=$('#chips [aria-pressed="true"]'); c.focus(); c.scrollIntoView({block:'nearest', inline:'nearest'}); }
  const n=slides.length;
  announce(f.type==='tag'?`Showing ${n} visualization${n===1?'':'s'} tagged ${f.value}`:f.type==='playlist'?`Playing ${n} visualizations from ${f.name}`:`Showing all ${n} visualizations`);
}
/* roving focus for a row of buttons (tabs, chip toolbar). Returns the newly focused button or null. */
function rove(e,items,vertical){
  const keys=vertical?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'], i=items.indexOf(document.activeElement); if(i<0) return null;
  let j=e.key===keys[0]?i-1:e.key===keys[1]?i+1:e.key==='Home'?0:e.key==='End'?items.length-1:null; if(j===null) return null;
  e.preventDefault(); e.stopPropagation(); j=(j+items.length)%items.length;
  items.forEach((b,k)=>b.tabIndex=k===j?0:-1); items[j].focus(); return items[j];
}
$('#chips').addEventListener('keydown',e=>{ const b=rove(e,$$('.chip',$('#chips'))); if(b) b.scrollIntoView({block:'nearest', inline:'nearest'}); });
$('.tabs').addEventListener('keydown',e=>{ const b=rove(e,$$('.tab')); if(b) showView(b.dataset.view); });
$('.dtabs').addEventListener('keydown',e=>{ const b=rove(e,$$('.dtab')); if(b){ dTab=b.dataset.dtab; renderDrawer(); } });

/* ---------- drawer ---------- */
/* ---------- modal dialogs: focus in, Tab trapped, Esc closes, focus returns, the rest of #app inert ---------- */
const modals=[];
const focusables=el=>$$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])',el).filter(x=>x.getClientRects().length && !x.closest('[inert]'));
function openModal(el,focusEl,opener){
  if(modals.some(m=>m.el===el)) return;
  const m={el, opener:opener||document.activeElement, inerted:[]};
  for(let n=el; n.parentElement && n.id!=='app'; n=n.parentElement) for(const sib of n.parentElement.children) if(sib!==n && !sib.inert){ sib.inert=true; m.inerted.push(sib); }
  modals.push(m);
  setTimeout(()=>(focusEl||focusables(el)[0]||el).focus({preventScroll:true}),30);
}
function closeModal(el){
  const i=modals.findIndex(m=>m.el===el); if(i<0) return;
  const [m]=modals.splice(i,1); m.inerted.forEach(x=>x.inert=false);
  if(m.opener && m.opener.isConnected && m.opener.getClientRects().length) m.opener.focus({preventScroll:true});
}
function trapTab(e,el){
  const f=focusables(el); if(!f.length){ e.preventDefault(); return; }
  const a=document.activeElement, first=f[0], lastF=f[f.length-1];
  if(!el.contains(a)){ e.preventDefault(); first.focus(); }
  else if(e.shiftKey && a===first){ e.preventDefault(); lastF.focus(); }
  else if(!e.shiftKey && a===lastF){ e.preventDefault(); first.focus(); }
}
function showDialog(id,focusSel,opener){ const el=$(id); el.hidden=false; openModal(el,focusSel&&$(focusSel,el),opener); }
function hideDialog(el){ if(el.hidden) return; el.hidden=true; closeModal(el); }
function closeTopModal(){ const m=modals[modals.length-1]; if(!m) return; m.el===drawer?closeDrawer():hideDialog(m.el); }

/* ---------- drawer ---------- */
function openDrawer(tab,v,opener){
  dTab=tab; dViz=v; drawer.classList.add('open'); drawer.inert=false; renderDrawer();
  openModal(drawer,$(`#dtab-${tab}`),opener);
}
function closeDrawer(){ if(!dTab) return; dTab=null; drawer.classList.remove('open'); drawer.style.transform=''; closeModal(drawer); drawer.inert=true; }
const isSheet=()=>matchMedia('(max-width:699px)').matches;
let drag=null;
drawer.addEventListener('pointerdown',e=>{ if(!isSheet() || !e.target.closest('.grab,.dhead') || e.button>0) return; drag={y:e.clientY, dy:0, t:performance.now(), id:e.pointerId, on:false}; });
drawer.addEventListener('pointermove',e=>{
  if(!drag || e.pointerId!==drag.id) return; drag.dy=Math.max(0,e.clientY-drag.y);
  if(!drag.on && drag.dy>8){ drag.on=true; drawer.classList.add('dragging'); try{ drawer.setPointerCapture(e.pointerId); }catch(_){} }
  if(drag.on) drawer.style.transform=`translateY(${drag.dy}px)`;
});
const endDrag=e=>{
  if(!drag || e.pointerId!==drag.id) return; const d=drag; drag=null; if(!d.on) return;
  drawer.classList.remove('dragging'); drawer.style.transform='';
  if(e.type==='pointerup' && (d.dy>drawer.offsetHeight*0.22 || d.dy/(performance.now()-d.t)>0.5)) closeDrawer();
  const swallow=ev=>{ ev.stopPropagation(); ev.preventDefault(); }; drawer.addEventListener('click',swallow,{capture:true, once:true}); setTimeout(()=>drawer.removeEventListener('click',swallow,{capture:true}),0);
};
drawer.addEventListener('pointerup',endDrag); drawer.addEventListener('pointercancel',endDrag);
function refocus(sel,root=document){ const el=$(sel,root); if(el) el.focus({preventScroll:true}); }
function renderDrawer(){
  const v=dViz; $('#d-kicker').textContent=`${v.author} · ${v.license}`; $('#d-title').textContent=v.title;
  $$('.dtab').forEach(b=>{ const on=b.dataset.dtab===dTab; b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1; });
  const body=$('#d-body'); body.setAttribute('aria-labelledby',`dtab-${dTab}`);
  const later=u=>{ body.innerHTML=`<p class="fine">Loading…</p>`; loadText(u).then(()=>{ if(dViz===v && drawer.classList.contains('open')) renderDrawer(); },()=>{ body.innerHTML=`<p class="fine">Could not load ${esc(u)}.</p>`; }); };
  if(dTab==='explain'){
    if(!v.md && v.mdUrl){ if(!texts.has(v.mdUrl)) return later(v.mdUrl); v.md=texts.get(v.mdUrl); }
    body.innerHTML=`<div class="seg" role="group" aria-label="Explanation format"><button type="button" data-raw="0" aria-pressed="${!explainRaw}">Rendered</button><button type="button" data-raw="1" aria-pressed="${explainRaw}">explanation.md</button></div>
      ${explainRaw?`<pre class="raw">${esc(v.md)}</pre>`:`<article class="md">${md(v.md)}</article>`}
      <p class="fine">Written by ${esc(v.author)}. The mathematics was checked by two Loci reviewers before publication. Suggest an edit with a pull request to ${esc(v.repo)}.</p>`;
  } else if(dTab==='customize') renderCustomize(v,body);
  else {
    const wasm=v.manifest.runtime==='wasm';
    if(wasm && !texts.has(v.sourceUrl)) return later(v.sourceUrl);
    const src=wasm?texts.get(v.sourceUrl):moduleSource(v), file=wasm?v.sourceUrl.split('/').pop():'src/index.js';
    body.innerHTML=`<div class="meta"><span class="oss">open source · ${v.license}</span><span>${esc(v.repo)}</span></div>
      <p class="fine">${wasm
        ? `Every visualization on Loci is one open-source module. This one is C with no standard library, compiled to WebAssembly by <code>build.sh</code>. The slide behind this panel runs the resulting <code>module.wasm</code> in a sandboxed worker; each frame it returns drawing commands that the site replays with the theme's colors and font.`
        : `Every visualization on Loci is one open-source module. This is the exact module drawing the slide behind this panel, running in a sandboxed worker. The site supplies the canvas, the clock and the theme, and resolves <code>@loci/kit</code>.`}</p>
      <span class="flabel">${esc(file)}</span>
      <pre class="code" tabindex="0" role="region" aria-label="Source code, ${esc(file)}"><code>${esc(src)}</code></pre>
      <span class="flabel">loci.json</span>
      <pre class="code" tabindex="0" role="region" aria-label="Manifest, loci.json"><code>${esc(manifestJSON(v.manifest))}</code></pre>
      <div class="btnrow"><button class="btn" type="button" id="copy-src">Copy code</button><span class="fine">Fork on GitHub is disabled in this mockup.</span></div>`;
    $('#copy-src').onclick=()=>copyText(src,'Code copied');
  }
}
/* Serialized state, as in docs/module-api.md section 5 (without the package hash, which this mockup does not have). */
function cfgJSON(v){
  const s=getSettings(v), sl=slides.find(x=>x.v===v), t=sl?(sl.host?sl.host.getTime():sl.t):v.t0;
  return JSON.stringify({v:v.id, p:s.params, t:+t.toFixed(1), theme:{palette:s.palette, font:s.font, lw:s.lw, speed:s.speed, labels:s.labels}},null,2);
}
function paramField(c,val){
  const lab=`<label class="flabel" for="${c.id}">${esc(c.label)}${c.type==='range'||c.type==='color'?` <output id="o-${c.id}">${esc(c.format(val))}</output>`:''}</label>`;
  if(c.type==='range') return `<div class="field">${lab}<input type="range" id="${c.id}" data-pkey="${esc(c.key)}" min="${c.min}" max="${c.max}" step="${c.step}" value="${val}"></div>`;
  if(c.type==='toggle') return `<div class="field"><label class="check" for="${c.id}"><input type="checkbox" id="${c.id}" data-pkey="${esc(c.key)}"${val?' checked':''}> ${esc(c.label)}</label></div>`;
  if(c.type==='select') return `<div class="field">${lab}<select class="input" id="${c.id}" data-pkey="${esc(c.key)}">${c.options.map(o=>`<option value="${esc(o.value)}"${o.value===val?' selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  if(c.type==='color') return `<div class="field">${lab}<input type="color" id="${c.id}" data-pkey="${esc(c.key)}" value="${esc(val)}"></div>`;
  return `<div class="field">${lab}<div class="nl-row"><input class="input" type="number" inputmode="numeric" id="${c.id}" data-pkey="${esc(c.key)}" min="${c.min}" max="${c.max}" step="1" value="${val}"><button class="btn ghost" type="button" data-reseed="${esc(c.key)}">New seed</button></div></div>`;
}
function renderCustomize(v,body){
  const s=getSettings(v), m=v.manifest, ctrls=paramControls(m), presets=m.presets||[];
  body.innerHTML=`
  <div class="field"><span class="flabel">Color scheme</span><div class="swatches">${PALETTES.map(p=>{ const c=p.id==='style'?STYLE_PAL[curStyle]:p;
    return `<button class="swatch" type="button" data-pal="${p.id}" aria-pressed="${s.palette===p.id}"><span class="dots">${['bg','fg','a1','a2'].map(k=>`<i style="background:${c[k]}"></i>`).join('')}</span>${esc(p.name)}</button>`; }).join('')}</div></div>
  <div class="field"><label class="flabel" for="cz-font">Label font</label><select class="input" id="cz-font">${FONTS.map(f=>`<option value="${f.id}"${s.font===f.id?' selected':''}>${esc(f.name)}</option>`).join('')}</select></div>
  ${ctrls.map(c=>paramField(c,s.params[c.key])).join('')}
  ${presets.length?`<div class="field"><span class="flabel" id="cz-try">Try this</span><div class="presets" role="group" aria-labelledby="cz-try">${presets.map((p,i)=>`<button class="preset" type="button" data-preset="${i}"><b>${esc(p.label)}</b>${p.note?`<small>${esc(p.note)}</small>`:''}</button>`).join('')}</div></div>`:''}
  <div class="field"><label class="flabel" for="cz-lw">Line width <output id="o-lw">${s.lw.toFixed(1)} px</output></label><input type="range" id="cz-lw" min="0.5" max="4" step="0.1" value="${s.lw}"></div>
  <div class="field"><label class="flabel" for="cz-speed">Animation speed <output id="o-speed">${s.speed.toFixed(2)}×</output></label><input type="range" id="cz-speed" min="0" max="3" step="0.05" value="${s.speed}"></div>
  <div class="field"><label class="check" for="cz-labels"><input type="checkbox" id="cz-labels"${s.labels?' checked':''}> Show formulas and labels</label>
    <label class="check" for="cz-all"><input type="checkbox" id="cz-all"${applyAll?' checked':''}> Apply color, font, line width and speed to every visualization</label></div>
  <div class="field"><span class="flabel">Embed config</span><pre class="code" id="cz-cfg"></pre>
    <div class="btnrow"><button class="btn" type="button" id="cz-copy">Copy config</button><button class="btn ghost" type="button" id="cz-reset">Reset to defaults</button></div>
    <p class="fine">Paste this config into the embed snippet to reproduce your version on a course page.</p></div>`;
  const shared=['palette','font','lw','speed','labels'], cfg=()=>$('#cz-cfg').textContent=cfgJSON(v);
  const set=(k,val)=>{ s[k]=val; if(applyAll && shared.includes(k)) VIZ.forEach(o=>getSettings(o)[k]=val); pushTheme(); cfg(); };
  // every value goes through normalizeParams, so the module only ever sees valid params
  const setParams=next=>{ s.params=normalizeParams(m,next); pushParams(v); cfg(); };
  cfg();
  $$('.swatch',body).forEach(b=>b.onclick=()=>{ set('palette',b.dataset.pal); $$('.swatch',body).forEach(x=>x.setAttribute('aria-pressed',x===b)); });
  $('#cz-font').onchange=e=>set('font',e.target.value);
  $$('[data-pkey]',body).forEach(inp=>{
    const c=ctrls.find(x=>x.key===inp.dataset.pkey), out=$(`#o-${c.id}`,body), num=inp.type==='range'||inp.type==='number';
    inp.addEventListener(inp.type==='checkbox'||inp.tagName==='SELECT'?'change':'input',()=>{
      setParams({...s.params, [c.key]: inp.type==='checkbox'?inp.checked : num?+inp.value : inp.value});
      if(out) out.textContent=c.format(s.params[c.key]);
    });
    if(inp.type==='number') inp.addEventListener('change',()=>{ inp.value=s.params[c.key]; });
  });
  $$('[data-reseed]',body).forEach(b=>b.onclick=()=>{ const k=b.dataset.reseed; setParams({...s.params, [k]:Math.floor(Math.random()*4294967296)}); $(`#cz-p-${CSS.escape(k)}`,body).value=s.params[k]; });
  $$('[data-preset]',body).forEach(b=>b.onclick=()=>{
    const i=b.dataset.preset, p=presets[+i]; setParams({...s.params, ...p.params}); if(p.t!=null) seekViz(v,p.t);
    renderCustomize(v,body); refocus(`[data-preset="${i}"]`,body); announce(`${p.label}. ${p.note||''}`);
  });
  $('#cz-lw').oninput=e=>{ set('lw',+e.target.value); $('#o-lw').textContent=(+e.target.value).toFixed(1)+' px'; };
  $('#cz-speed').oninput=e=>{ set('speed',+e.target.value); $('#o-speed').textContent=(+e.target.value).toFixed(2)+'×'; };
  $('#cz-labels').onchange=e=>set('labels',e.target.checked);
  $('#cz-all').onchange=e=>{ applyAll=e.target.checked; if(applyAll){ shared.forEach(k=>VIZ.forEach(o=>getSettings(o)[k]=s[k])); pushTheme(); } };
  $('#cz-copy').onclick=()=>copyText(cfgJSON(v),'Config copied');
  $('#cz-reset').onclick=()=>{ delete settings[v.id]; pushTheme(); pushParams(v); renderCustomize(v,body); refocus('#cz-reset',body); toast('Reset to the style defaults'); };
}

/* ---------- thumbnails ---------- */
/* Catalog JS pieces are reviewed code, so their thumbnails are drawn on the page. Anything else (the WASM piece)
   gets a poster: one frame rendered in a worker and captured as a PNG. */
const posters=new Map();
function renderThumb(cv,v,t){
  const r=cv.getBoundingClientRect(); if(!r.width) return;
  const d=dpr(); cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  const ctx=cv.getContext('2d'), B={x:10,y:10,w:r.width-20,h:r.height-20}; t=t??v.t0+6;
  if(v.draw){ ctx.setTransform(d,0,0,d,0,0); v.draw(ctx,r.width,r.height,t,{...makeP(v),labels:false},{},B); return; }
  const theme={...themeFor(v),labels:false}, params=getSettings(v).params, key=JSON.stringify([v.id,cv.width,cv.height,theme,params,t]);
  ctx.fillStyle=theme.bg; ctx.fillRect(0,0,cv.width,cv.height);
  if(!posters.has(key)) posters.set(key,LociHost.poster(specFor(v),{w:r.width,h:r.height,dpr:d,box:B,theme,params,t}).then(b=>createImageBitmap(b)));
  posters.get(key).then(bm=>{ if(cv.isConnected && cv.width===bm.width) ctx.drawImage(bm,0,0); },e=>{ posters.delete(key); console.warn('loci: poster failed for',v.id,e.message); });
}
function paintThumbs(root){ requestAnimationFrame(()=>$$('canvas[data-thumb]',root).forEach(cv=>renderThumb(cv,VIZ.find(v=>v.id===cv.dataset.thumb)))); }

/* ---------- browse ---------- */
function renderBrowse(){
  const el=$('#browse');
  if(!el.firstChild){
    el.innerHTML=`<div class="wrap">
      <div class="pagehead"><div class="kicker">Catalog · ${VIZ.length} visualizations · all open source</div><h1>Browse the collection</h1>
        <p>Every piece is reviewed by two mathematicians, ships with an explanation, and can be restyled from its Customize panel. Pick one to open it in the feed.</p></div>
      <div class="filters"><label class="sr" for="cat-search">Search the catalog</label><input class="input" id="cat-search" type="search" placeholder="Search titles, topics, authors" style="max-width:420px">
        <div class="chipwrap" id="cat-tags" role="group" aria-label="Filter by topic"></div></div>
      <p class="sr" id="cat-count" role="status"></p>
      <div class="grid" id="cat-grid"></div></div>`;
    $('#cat-search').oninput=e=>{ catQuery=e.target.value.trim().toLowerCase(); renderCatGrid(); const n=$$('#cat-grid .card[data-viz]').length; $('#cat-count').textContent=`${n} visualization${n===1?'':'s'} shown`; };
  }
  $('#cat-tags').innerHTML=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-cattag="${esc(t)}" aria-pressed="${catTags.has(t)}">${esc(t)}<span class="n"><span class="sr">,</span> ${n}</span></button>`).join('');
  renderCatGrid();
  const n=$$('#cat-grid .card[data-viz]').length; $('#cat-count').textContent=`${n} visualization${n===1?'':'s'} shown`;
}
function renderCatGrid(){
  const list=VIZ.filter(v=>[...catTags].every(t=>v.tags.includes(t)) && (!catQuery || (v.title+' '+v.tags.join(' ')+' '+v.author+' '+v.hook).toLowerCase().includes(catQuery)));
  $('#cat-grid').innerHTML=(list.length?list.map(v=>`<button class="card" type="button" data-viz="${v.id}">
      <canvas data-thumb="${v.id}" aria-hidden="true"></canvas>
      <div class="card-body"><h3>${esc(v.title)}</h3><div class="by">${esc(v.author)} · ♥ ${fmtK(v.likes)}</div>
        <div class="tline">${v.tags.map(t=>'#'+esc(t.toLowerCase())).join('  ')}</div>
        <div class="meta"><span class="oss">${v.license}</span><span>reviewed ${v.reviewed}</span></div></div></button>`).join('')
    : `<p class="empty">No visualizations match. Clear a topic or try a shorter search.</p>`)
    + `<div class="card submit"><div class="card-body"><div class="kicker">Contribute</div><h3>Submit a visualization</h3>
        <ul><li>An OSI-approved license (MIT, BSD, Apache, GPL)</li><li>One module that exports a draw function and accepts a theme</li><li>An explanation.md with the mathematics, checked by two reviewers</li></ul>
        <button class="btn ghost" type="button" data-post="how-we-curate">Read the curation checklist</button></div></div>`;
  paintThumbs($('#cat-grid'));
}

/* ---------- blog ---------- */
function renderBlog(){
  const el=$('#blog');
  if(!blogPost){
    el.innerHTML=`<div class="wrap">
      <div class="pagehead"><div class="kicker">Blog</div><h1>Notes from the curators</h1><p>Monthly roundups, guest lists from teachers and researchers, and how the catalog is made.</p></div>
      <div class="blog-grid"><div class="posts">${POSTS.map(p=>`<button class="post" type="button" data-post="${p.id}">
          <canvas data-thumb="${p.vizIds[0]||'times-table'}" aria-hidden="true"></canvas>
          <div class="pb"><div class="pmeta">${p.date} · ${p.read}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p><div class="pmeta">${esc(p.author)}${p.vizIds.length?` · ${p.vizIds.length} visualizations`:''}</div></div></button>`).join('')}</div>
        <aside class="side"><div class="kicker">Newsletter</div><h2>The Monthly Locus</h2><p>The month's best new visualizations, one teaching tip, and one open problem with a picture.</p>${nlForm('side')}</aside>
      </div></div>`;
  } else {
    const p=POSTS.find(x=>x.id===blogPost);
    el.innerHTML=`<div class="wrap"><div class="article">
      <button class="backlink" type="button" data-blog-back>← All posts</button>
      <div class="pmeta">${p.date} · ${p.read} · ${esc(p.author)}</div>
      <h1 tabindex="-1">${esc(p.title)}</h1>
      ${p.vizIds.length?`<div class="btnrow"><button class="btn" type="button" data-playlist="${p.id}">▶ Watch these ${p.vizIds.length} in the feed</button></div>
        <div class="inpost">${p.vizIds.map(id=>{ const v=VIZ.find(x=>x.id===id); return `<button class="mini" type="button" data-viz="${id}"><canvas data-thumb="${id}" aria-hidden="true"></canvas>${esc(v.title)}</button>`; }).join('')}</div>`:''}
      <div class="md">${md(p.md)}</div>
      <div class="side" style="position:static">${'<div class="kicker">Newsletter</div><h2>Get next month’s roundup</h2>'+nlForm('art')}</div>
    </div></div>`;
  }
  el.scrollTop=0; paintThumbs(el);
}
function openPost(id){
  const prev=blogPost; blogPost=id; if(view!=='blog') showView('blog'); else renderBlog();
  if(id) refocus('.article h1',$('#blog')); else if(prev) refocus(`.post[data-post="${prev}"]`,$('#blog'));
}

/* ---------- views ---------- */
function showView(v){
  view=v;
  $$('.tab').forEach(t=>{ const on=t.dataset.view===v; t.setAttribute('aria-selected',on); t.tabIndex=on?0:-1; });
  $('#chips').hidden=v!=='feed'; $('#feednav').hidden=v!=='feed'; feed.classList.toggle('away',v!=='feed');
  $('#browse').hidden=v!=='browse'; $('#blog').hidden=v!=='blog';
  if(v!=='feed'){ closeDrawer(); exitFull(); }
  if(v==='browse') renderBrowse();
  if(v==='blog') renderBlog();
  syncPlay();
}
function jumpToViz(id){
  let i=feedList().findIndex(v=>v.id===id);
  if(i<0){ setFilter({type:'all'}); i=VIZ.findIndex(v=>v.id===id); }
  showView('feed'); requestAnimationFrame(()=>{ slideEls[i].scrollIntoView({block:'start'}); feed.focus({preventScroll:true}); });
}

/* ---------- newsletter ---------- */
function openNL(opener){ showDialog('#nlmodal','#nlm-email',opener); }
function openKeys(opener){ showDialog('#keysmodal',null,opener); }
document.addEventListener('submit',e=>{
  const f=e.target.closest('.nl-form'); if(!f) return; e.preventDefault();
  const inp=$('input[type="email"]',f), err=$('.nl-err',f), val=inp.value.trim();
  if(!err.id) err.id=inp.id+'-err';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ err.hidden=false; err.textContent='Enter an email address like name@university.edu.'; inp.setAttribute('aria-invalid','true'); inp.setAttribute('aria-describedby',err.id); inp.focus(); return; }
  const inModal=f.closest('.modal-card');
  f.outerHTML=`<div class="nl-ok" role="status" tabindex="-1"><strong>You're subscribed to The Monthly Locus.</strong><span class="fine">The first issue goes to ${esc(val)} on Tuesday, November 3. This is a mockup, so nothing was actually sent.</span></div>`;
  if(inModal) refocus('.nl-ok',inModal);
});

/* ---------- style switch ---------- */
function setStyle(s){
  if(!STYLE_PAL[s]) s='night';
  curStyle=s; document.documentElement.dataset.style=s;
  $$('[data-style-btn]').forEach(b=>b.setAttribute('aria-checked',b.dataset.styleBtn===s));
  $('#style-btn').setAttribute('aria-label',`Style: ${STYLE_NAME[s]}`);
  relayout(); pushTheme();
  if(dTab==='customize') renderDrawer();
  if(view==='browse') renderCatGrid();
  if(view==='blog') paintThumbs($('#blog'));
}
window.addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(STYLE_PAL[h]) setStyle(h); });
addEventListener('resize',()=>readPads());
document.addEventListener('visibilitychange',syncPlay);
document.addEventListener('fullscreenchange',relayout);
new ResizeObserver(()=>{ document.documentElement.style.setProperty('--top-h',$('#topbar').offsetHeight+'px'); relayout(); }).observe($('#topbar'));
Object.keys(STYLE_DESC).forEach(k=>$(`#sd-${k}`).textContent=STYLE_DESC[k]);

/* style menu (menu button pattern) */
const styleBtn=$('#style-btn'), styleMenu=$('#style-menu'), menuItems=()=>$$('.mi',styleMenu);
function openMenu(last){
  styleMenu.hidden=false; styleBtn.setAttribute('aria-expanded','true');
  const it=menuItems(); (last?it[it.length-1]:(it.find(i=>i.getAttribute('aria-checked')==='true')||it[0])).focus();
}
function closeMenu(back){ if(styleMenu.hidden) return; styleMenu.hidden=true; styleBtn.setAttribute('aria-expanded','false'); if(back) styleBtn.focus(); }
styleBtn.addEventListener('click',()=>styleMenu.hidden?openMenu():closeMenu());
styleBtn.addEventListener('keydown',e=>{ if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); openMenu(e.key==='ArrowUp'); } });
styleMenu.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ e.stopPropagation(); return closeMenu(true); }
  if(e.key==='Tab') return closeMenu(false);
  rove(e,menuItems(),true);
});
styleMenu.addEventListener('focusout',e=>{ if(e.relatedTarget && !styleMenu.contains(e.relatedTarget) && e.relatedTarget!==styleBtn) closeMenu(false); });

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  if(!t.closest('.stylepick')) closeMenu(false);
  const sb=t.closest('[data-style-btn]'); if(sb){ closeMenu(true); if(location.hash.slice(1)===sb.dataset.styleBtn) setStyle(sb.dataset.styleBtn); else location.hash=sb.dataset.styleBtn; return; }
  if(t.closest('[data-open-keys]')){ closeMenu(false); return openKeys(styleBtn); }
  if(t.closest('.skip')){ e.preventDefault(); if(view!=='feed') showView('feed'); return feed.focus({preventScroll:true}); }
  const ob=t.closest('[data-open-nl]'); if(ob) return openNL(ob);
  const cm=t.closest('[data-close-modal]'); if(cm) return hideDialog(cm.closest('.modal'));
  if(t.classList.contains('modal')) return hideDialog(t);
  if(dTab && !t.closest('#drawer') && !t.closest('.modal') && !t.closest('#toast')) return closeDrawer();
  const vb=t.closest('[data-view]'); if(vb){ if(vb.dataset.view==='blog') blogPost=null; return showView(vb.dataset.view); }
  const pb=t.closest('[data-post]'); if(pb) return openPost(pb.dataset.post);
  if(t.closest('[data-blog-back]')) return openPost(null);
  const pl=t.closest('[data-playlist]'); if(pl){ const p=POSTS.find(x=>x.id===pl.dataset.playlist); setFilter({type:'playlist', ids:p.vizIds, name:p.title}); showView('feed'); return feed.focus({preventScroll:true}); }
  const vz=t.closest('[data-viz]'); if(vz) return jumpToViz(vz.dataset.viz);
  const ch=t.closest('[data-chip]'); if(ch){ const c=ch.dataset.chip; return setFilter(c==='all'?{type:'all'}:{type:'tag',value:c}); }
  const ct=t.closest('[data-cattag]'); if(ct){ const g=ct.dataset.cattag; catTags.has(g)?catTags.delete(g):catTags.add(g); renderBrowse(); return refocus(`[data-cattag="${CSS.escape(g)}"]`); }
  const tg=t.closest('[data-tag]'); if(tg) return setFilter({type:'tag', value:tg.dataset.tag});
  if(t.closest('[data-go="top"]')) return goTo(0);
  const dt=t.closest('[data-dtab]'); if(dt){ dTab=dt.dataset.dtab; return renderDrawer(); }
  const rw=t.closest('[data-raw]'); if(rw){ explainRaw=rw.dataset.raw==='1'; renderDrawer(); return refocus(`[data-raw="${rw.dataset.raw}"]`); }
  const act=t.closest('[data-act]'); if(act) return handleAct(act.dataset.act, slides.find(s=>s.el.contains(act)), act);
});
$('#prev').onclick=()=>goTo(activeIdx-1);
$('#next').onclick=()=>goTo(activeIdx+1);
$('#d-close').onclick=closeDrawer;
document.addEventListener('keydown',e=>{
  const top=modals[modals.length-1];
  if(e.key==='Escape'){ if(!styleMenu.hidden) return closeMenu(true); if(top) return closeTopModal(); if(document.body.classList.contains('immersive')) return exitFull(); return; }
  if(e.key==='Tab' && top) return trapTab(e,top.el);
  if(top || (e.target.closest && e.target.closest('input,select,textarea,[role="menu"]')) || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.key==='?' || (e.code==='Slash' && e.shiftKey)){ e.preventDefault(); return openKeys(); }
  if(view!=='feed') return;
  const k=e.key.toLowerCase(), sl=curSlide();
  if(k==='arrowdown'||k==='j'||k==='pagedown'){ e.preventDefault(); goTo(activeIdx+1); }
  else if(k==='arrowup'||k==='k'||k==='pageup'){ e.preventDefault(); goTo(activeIdx-1); }
  else if(!sl) return;
  else if(k==='f'){ (document.fullscreenElement||document.body.classList.contains('immersive'))?exitFull():enterFull(sl); }
  else if(k==='e') openDrawer('explain',sl.v);
  else if(k==='c') openDrawer('customize',sl.v);
  else if(k==='s') openDrawer('source',sl.v);
  else if(k==='p') togglePause();
  else if(k==='l') like(sl);
});
let toastTimer;
function toast(msg){ const t=$('#toast'); t.textContent=msg; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.textContent='',3200); }

/* ---------- boot ---------- */
setStyle(location.hash.slice(1));
readPads(); renderChips(); buildFeed();
