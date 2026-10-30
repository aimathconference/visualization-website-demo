/* ---------- styles, palettes, fonts ---------- */
const STYLE_PAL = {
  night:{bg:'#050508', fg:'#ecebf5', a1:'#ff2e74', a2:'#22e0e8'},
  chalk:{bg:'#1b2a21', fg:'#eef0e4', a1:'#f4cf5d', a2:'#8fcbe9'},
  graph:{bg:'#ffffff', fg:'#13233a', a1:'#d2402a', a2:'#1d5fc4'},
};
const STYLE_FONT = { night:'"Manrope", system-ui, sans-serif', chalk:'"Kalam", "Comic Sans MS", cursive', graph:'"IBM Plex Mono", ui-monospace, monospace' };
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
let dTab=null, dViz=null, explainRaw=false, applyAll=false, blogPost=null, catTags=new Set(), catQuery='';
const settings={};
function getSettings(v){ return settings[v.id] || (settings[v.id]={palette:'style', font:'style', lw:1.5, speed:reduceMotion?0.25:1, param:v.param.value, labels:true}); }
function makeP(v){
  const s=getSettings(v), pal=s.palette==='style'?STYLE_PAL[curStyle]:PALETTES.find(p=>p.id===s.palette);
  const font=s.font==='style'?STYLE_FONT[curStyle]:FONTS.find(f=>f.id===s.font).css;
  return {bg:pal.bg, fg:pal.fg, a1:pal.a1, a2:pal.a2, font, lw:s.lw, labels:s.labels, param:s.param};
}
function readPads(){ const cs=getComputedStyle(document.documentElement), g=k=>parseFloat(cs.getPropertyValue(k))||0; pads={t:g('--pad-t'),r:g('--pad-r'),b:g('--pad-b'),l:g('--pad-l')}; }
function boxFor(w,h,full){ const p=full?{t:28,r:28,b:28,l:28}:pads; return {x:p.l, y:p.t, w:Math.max(100,w-p.l-p.r), h:Math.max(100,h-p.t-p.b)}; }

const feed=$('#feed'), drawer=$('#drawer');
$('#prev').innerHTML=ICON.up; $('#next').innerHTML=ICON.down; $('#d-close').innerHTML=ICON.close; $$('[data-close-nl]').forEach(b=>b.innerHTML=ICON.close);

/* ---------- feed ---------- */
function feedList(){
  if(filter.type==='tag') return VIZ.filter(v=>v.tags.includes(filter.value));
  if(filter.type==='playlist') return filter.ids.map(id=>VIZ.find(v=>v.id===id)).filter(Boolean);
  return VIZ;
}
const rbtn=(act,icon,lbl,extra='')=>`<button class="rbtn${extra}" type="button" data-act="${act}" aria-label="${esc(lbl)}"><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;
function slideHTML(v,i){
  return `<div class="stage"><canvas role="img" aria-label="Live visualization: ${esc(v.title)}"></canvas></div>
  <div class="caption">
    <div class="who"><span class="avatar">${initials(v.author)}</span><span>${esc(v.author)}</span><span class="muted">· reviewed ${v.reviewed}</span></div>
    <h2 class="vtitle" data-fig="${i+1}">${esc(v.title)}</h2>
    <p class="hook">${esc(v.hook)}</p>
    <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
    <div class="meta"><span class="oss">open source · ${v.license}</span><span>${v.repo}</span></div>
  </div>
  <div class="rail">
    ${rbtn('like',ICON.heart,fmtK(v.likes+(v.liked?1:0)),v.liked?' on':'')}
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
  io&&io.disconnect(); ro&&ro.disconnect();
  feed.innerHTML=''; slides=[];
  const list=feedList();
  ro=new ResizeObserver(es=>{ for(const e of es){ const sl=slides.find(s=>s.canvas===e.target); if(sl) sizeCanvas(sl); } });
  io=new IntersectionObserver(es=>{
    for(const e of es){
      const sl=slides.find(s=>s.el===e.target); if(sl) sl.visible=e.isIntersecting;
      if(e.isIntersecting && e.intersectionRatio>=0.6){ const i=slideEls.indexOf(e.target); if(i!==activeIdx){ activeIdx=i; onActiveChange(); } }
    }
  },{root:feed, threshold:[0,0.6]});
  list.forEach((v,i)=>{
    const el=document.createElement('section'); el.className='slide'; el.setAttribute('aria-label',v.title); el.innerHTML=slideHTML(v,i);
    feed.appendChild(el);
    const canvas=$('canvas',el), sl={v,el,canvas,ctx:canvas.getContext('2d'),S:{},t:v.t0,w:0,h:0,visible:false};
    slides.push(sl); ro.observe(canvas); io.observe(el);
    canvas.addEventListener('dblclick',e=>{ like(sl,true); burst(el,e); });
  });
  const end=document.createElement('section'); end.className='slide'; end.setAttribute('aria-label','End of the feed'); end.innerHTML=endHTML(list.length);
  feed.appendChild(end); io.observe(end);
  slideEls=[...feed.children]; feed.scrollTop=0; activeIdx=0; onActiveChange();
}
function sizeCanvas(sl){
  const r=sl.canvas.getBoundingClientRect(); if(!r.width) return;
  sl.w=r.width; sl.h=r.height; const d=dpr();
  sl.canvas.width=Math.round(r.width*d); sl.canvas.height=Math.round(r.height*d);
}
function drawSlide(sl){
  if(!sl.w) return;
  const d=sl.canvas.width/sl.w; sl.ctx.setTransform(d,0,0,d,0,0);
  const full=document.fullscreenElement===sl.el || document.body.classList.contains('immersive');
  sl.v.draw(sl.ctx,sl.w,sl.h,sl.t,makeP(sl.v),sl.S,boxFor(sl.w,sl.h,full));
}
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  if(view==='feed') for(const sl of slides){ if(!sl.visible) continue; sl.t+=dt*getSettings(sl.v).speed; drawSlide(sl); }
  requestAnimationFrame(frame);
}
function curSlide(){ return slides[activeIdx]; }
function onActiveChange(){
  const n=slides.length;
  $('#counter').textContent=`${Math.min(activeIdx+1,n)} / ${n}`;
  $('#prev').disabled=activeIdx<=0; $('#next').disabled=activeIdx>=slideEls.length-1;
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
  const b=$('[data-act="like"]',sl.el); b.classList.toggle('on',v.liked); $('.lbl',b).textContent=fmtK(v.likes+(v.liked?1:0));
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
function handleAct(act,sl){
  if(act==='exitfull') return exitFull();
  if(!sl) return;
  if(act==='like') like(sl);
  else if(act==='explain'||act==='customize'||act==='source') openDrawer(act,sl.v);
  else if(act==='full') enterFull(sl);
  else if(act==='share') copyText(`https://loci.example/v/${sl.v.id}`,'Link copied');
}

/* ---------- chips / filter ---------- */
function tagCounts(){ const m=new Map(); VIZ.forEach(v=>v.tags.forEach(t=>m.set(t,(m.get(t)||0)+1))); return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])); }
function renderChips(){
  let h=`<button class="chip" type="button" data-chip="all" aria-pressed="${filter.type==='all'}">All<span class="n">${VIZ.length}</span></button>`;
  if(filter.type==='playlist') h+=`<button class="chip" type="button" data-chip="all" aria-pressed="true" title="Clear playlist">▶ ${esc(filter.name)} ✕</button>`;
  h+=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-chip="${esc(t)}" aria-pressed="${filter.type==='tag'&&filter.value===t}">${esc(t)}<span class="n">${n}</span></button>`).join('');
  $('#chips').innerHTML=h;
}
function setFilter(f){ filter=f; renderChips(); buildFeed(); }

/* ---------- drawer ---------- */
function openDrawer(tab,v){ dTab=tab; dViz=v; drawer.classList.add('open'); drawer.inert=false; renderDrawer(); }
function closeDrawer(){ dTab=null; drawer.classList.remove('open'); drawer.inert=true; }
function renderDrawer(){
  const v=dViz; $('#d-kicker').textContent=`${v.author} · ${v.license}`; $('#d-title').textContent=v.title;
  $$('.dtab').forEach(b=>b.setAttribute('aria-selected',b.dataset.dtab===dTab));
  const body=$('#d-body');
  if(dTab==='explain'){
    body.innerHTML=`<div class="seg" role="group" aria-label="Explanation format"><button type="button" data-raw="0" aria-pressed="${!explainRaw}">Rendered</button><button type="button" data-raw="1" aria-pressed="${explainRaw}">explanation.md</button></div>
      ${explainRaw?`<pre class="raw">${esc(v.md)}</pre>`:`<article class="md">${md(v.md)}</article>`}
      <p class="fine">Written by ${esc(v.author)}. The mathematics was checked by two Loci reviewers before publication. Suggest an edit with a pull request to ${esc(v.repo)}.</p>`;
  } else if(dTab==='customize') renderCustomize(v,body);
  else {
    const helpers=(v.helpers||[]).map(f=>f.toString()).join('\n\n');
    const src=`// ${v.repo}/src/index.js · ${v.license} License\nimport { hex, mix, rgba, label, clipBox, fsFor } from '@loci/kit';\n\n${helpers?helpers+'\n\n':''}export default {\n  id: '${v.id}',\n  title: '${v.title.replace(/'/g,"\\'")}',\n  tags: ${JSON.stringify(v.tags)},\n  license: '${v.license}',\n  param: { key: '${v.param.key}', min: ${v.param.min}, max: ${v.param.max}, value: ${v.param.value} },\n  ${v.draw.toString()}\n};`;
    body.innerHTML=`<div class="meta"><span class="oss">open source · ${v.license}</span><span>${esc(v.repo)}</span></div>
      <p class="fine">Every visualization on Loci is one open-source module. This is the exact code drawing the slide behind this panel. The site supplies the canvas, the clock, and the theme.</p>
      <pre class="code"><code>${esc(src)}</code></pre>
      <div class="btnrow"><button class="btn" type="button" id="copy-src">Copy code</button><span class="fine">Fork on GitHub is disabled in this mockup.</span></div>`;
    $('#copy-src').onclick=()=>copyText(src,'Code copied');
  }
}
function cfgJSON(v){
  const s=getSettings(v), P=makeP(v);
  return JSON.stringify({viz:v.id, palette:{bg:P.bg,fg:P.fg,accent1:P.a1,accent2:P.a2}, font:s.font==='style'?STYLE_FONT[curStyle]:FONTS.find(f=>f.id===s.font).css, lineWidth:s.lw, speed:s.speed, [v.param.key]:s.param, labels:s.labels},null,2);
}
function renderCustomize(v,body){
  const s=getSettings(v), pm=v.param;
  body.innerHTML=`
  <div class="field"><span class="flabel">Color scheme</span><div class="swatches">${PALETTES.map(p=>{ const c=p.id==='style'?STYLE_PAL[curStyle]:p;
    return `<button class="swatch" type="button" data-pal="${p.id}" aria-pressed="${s.palette===p.id}"><span class="dots">${['bg','fg','a1','a2'].map(k=>`<i style="background:${c[k]}"></i>`).join('')}</span>${esc(p.name)}</button>`; }).join('')}</div></div>
  <div class="field"><label class="flabel" for="cz-font">Label font</label><select class="input" id="cz-font">${FONTS.map(f=>`<option value="${f.id}"${s.font===f.id?' selected':''}>${esc(f.name)}</option>`).join('')}</select></div>
  <div class="field"><label class="flabel" for="cz-param">${esc(pm.label)} <output id="o-param">${pm.fmt(s.param)}</output></label><input type="range" id="cz-param" min="${pm.min}" max="${pm.max}" step="${pm.step}" value="${s.param}"></div>
  <div class="field"><label class="flabel" for="cz-lw">Line width <output id="o-lw">${s.lw.toFixed(1)} px</output></label><input type="range" id="cz-lw" min="0.5" max="4" step="0.1" value="${s.lw}"></div>
  <div class="field"><label class="flabel" for="cz-speed">Animation speed <output id="o-speed">${s.speed.toFixed(2)}×</output></label><input type="range" id="cz-speed" min="0" max="3" step="0.05" value="${s.speed}"></div>
  <div class="field"><label class="check" for="cz-labels"><input type="checkbox" id="cz-labels"${s.labels?' checked':''}> Show formulas and labels</label>
    <label class="check" for="cz-all"><input type="checkbox" id="cz-all"${applyAll?' checked':''}> Apply color, font, line width and speed to every visualization</label></div>
  <div class="field"><span class="flabel">Embed config</span><pre class="code" id="cz-cfg"></pre>
    <div class="btnrow"><button class="btn" type="button" id="cz-copy">Copy config</button><button class="btn ghost" type="button" id="cz-reset">Reset to defaults</button></div>
    <p class="fine">Paste this config into the embed snippet to reproduce your version on a course page.</p></div>`;
  const shared=['palette','font','lw','speed','labels'];
  const set=(k,val)=>{ s[k]=val; if(applyAll && shared.includes(k)) VIZ.forEach(o=>getSettings(o)[k]=val); $('#cz-cfg').textContent=cfgJSON(v); };
  $('#cz-cfg').textContent=cfgJSON(v);
  $$('.swatch',body).forEach(b=>b.onclick=()=>{ set('palette',b.dataset.pal); $$('.swatch',body).forEach(x=>x.setAttribute('aria-pressed',x===b)); });
  $('#cz-font').onchange=e=>set('font',e.target.value);
  $('#cz-param').oninput=e=>{ set('param',+e.target.value); $('#o-param').textContent=pm.fmt(+e.target.value); };
  $('#cz-lw').oninput=e=>{ set('lw',+e.target.value); $('#o-lw').textContent=(+e.target.value).toFixed(1)+' px'; };
  $('#cz-speed').oninput=e=>{ set('speed',+e.target.value); $('#o-speed').textContent=(+e.target.value).toFixed(2)+'×'; };
  $('#cz-labels').onchange=e=>set('labels',e.target.checked);
  $('#cz-all').onchange=e=>{ applyAll=e.target.checked; if(applyAll) shared.forEach(k=>VIZ.forEach(o=>getSettings(o)[k]=s[k])); };
  $('#cz-copy').onclick=()=>copyText(cfgJSON(v),'Config copied');
  $('#cz-reset').onclick=()=>{ delete settings[v.id]; renderCustomize(v,body); toast('Reset to the style defaults'); };
}

/* ---------- thumbnails ---------- */
function renderThumb(cv,v,t){
  const r=cv.getBoundingClientRect(); if(!r.width) return;
  const d=dpr(); cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  const ctx=cv.getContext('2d'); ctx.setTransform(d,0,0,d,0,0);
  v.draw(ctx,r.width,r.height,t??v.t0+6,{...makeP(v),labels:false},{}, {x:10,y:10,w:r.width-20,h:r.height-20});
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
        <div class="chipwrap" id="cat-tags"></div></div>
      <div class="grid" id="cat-grid"></div></div>`;
    $('#cat-search').oninput=e=>{ catQuery=e.target.value.trim().toLowerCase(); renderCatGrid(); };
  }
  $('#cat-tags').innerHTML=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-cattag="${esc(t)}" aria-pressed="${catTags.has(t)}">${esc(t)}<span class="n">${n}</span></button>`).join('');
  renderCatGrid();
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
      <h1>${esc(p.title)}</h1>
      ${p.vizIds.length?`<div class="btnrow"><button class="btn" type="button" data-playlist="${p.id}">▶ Watch these ${p.vizIds.length} in the feed</button></div>
        <div class="inpost">${p.vizIds.map(id=>{ const v=VIZ.find(x=>x.id===id); return `<button class="mini" type="button" data-viz="${id}"><canvas data-thumb="${id}" aria-hidden="true"></canvas>${esc(v.title)}</button>`; }).join('')}</div>`:''}
      <div class="md">${md(p.md)}</div>
      <div class="side" style="position:static">${'<div class="kicker">Newsletter</div><h2>Get next month’s roundup</h2>'+nlForm('art')}</div>
    </div></div>`;
  }
  el.scrollTop=0; paintThumbs(el);
}
function openPost(id){ blogPost=id; if(view!=='blog') showView('blog'); else renderBlog(); }

/* ---------- views ---------- */
function showView(v){
  view=v;
  $$('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.view===v));
  $('#chips').hidden=v!=='feed'; $('#feednav').hidden=v!=='feed';
  $('#browse').hidden=v!=='browse'; $('#blog').hidden=v!=='blog';
  if(v!=='feed'){ closeDrawer(); exitFull(); }
  if(v==='browse') renderBrowse();
  if(v==='blog') renderBlog();
}
function jumpToViz(id){
  let i=feedList().findIndex(v=>v.id===id);
  if(i<0){ setFilter({type:'all'}); i=VIZ.findIndex(v=>v.id===id); }
  showView('feed'); requestAnimationFrame(()=>slideEls[i].scrollIntoView({block:'start'}));
}

/* ---------- newsletter ---------- */
function openNL(){ $('#nlmodal').hidden=false; setTimeout(()=>$('#nlm-email')&&$('#nlm-email').focus(),30); }
function closeNL(){ $('#nlmodal').hidden=true; }
document.addEventListener('submit',e=>{
  const f=e.target.closest('.nl-form'); if(!f) return; e.preventDefault();
  const inp=$('input[type="email"]',f), err=$('.nl-err',f), val=inp.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ err.hidden=false; err.textContent='Enter an email address like name@university.edu.'; inp.focus(); return; }
  f.outerHTML=`<div class="nl-ok" role="status"><strong>You're subscribed to The Monthly Locus.</strong><span class="fine">The first issue goes to ${esc(val)} on Tuesday, November 3. This is a mockup, so nothing was actually sent.</span></div>`;
});

/* ---------- style switch ---------- */
function setStyle(s){
  if(!STYLE_PAL[s]) s='night';
  curStyle=s; document.documentElement.dataset.style=s;
  $$('[data-style-btn]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.styleBtn===s));
  $('#mockdesc').textContent=STYLE_DESC[s];
  requestAnimationFrame(()=>{ readPads(); slides.forEach(sizeCanvas); });
  if(dTab==='customize') renderDrawer();
  if(view==='browse') renderCatGrid();
  if(view==='blog') paintThumbs($('#blog'));
}
window.addEventListener('hashchange',()=>setStyle(location.hash.slice(1)));
addEventListener('resize',()=>readPads());

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  const sb=t.closest('[data-style-btn]'); if(sb){ if(location.hash.slice(1)===sb.dataset.styleBtn) setStyle(sb.dataset.styleBtn); else location.hash=sb.dataset.styleBtn; return; }
  if(t.closest('[data-open-nl]')) return openNL();
  if(t.closest('[data-close-nl]') || t.id==='nlmodal') return closeNL();
  const vb=t.closest('[data-view]'); if(vb){ if(vb.dataset.view==='blog') blogPost=null; return showView(vb.dataset.view); }
  const pb=t.closest('[data-post]'); if(pb) return openPost(pb.dataset.post);
  if(t.closest('[data-blog-back]')) return openPost(null);
  const pl=t.closest('[data-playlist]'); if(pl){ const p=POSTS.find(x=>x.id===pl.dataset.playlist); setFilter({type:'playlist', ids:p.vizIds, name:p.title}); return showView('feed'); }
  const vz=t.closest('[data-viz]'); if(vz) return jumpToViz(vz.dataset.viz);
  const ch=t.closest('[data-chip]'); if(ch){ const c=ch.dataset.chip; return setFilter(c==='all'?{type:'all'}:{type:'tag',value:c}); }
  const ct=t.closest('[data-cattag]'); if(ct){ const g=ct.dataset.cattag; catTags.has(g)?catTags.delete(g):catTags.add(g); return renderBrowse(); }
  const tg=t.closest('[data-tag]'); if(tg) return setFilter({type:'tag', value:tg.dataset.tag});
  if(t.closest('[data-go="top"]')) return goTo(0);
  const dt=t.closest('[data-dtab]'); if(dt){ dTab=dt.dataset.dtab; return renderDrawer(); }
  const rw=t.closest('[data-raw]'); if(rw){ explainRaw=rw.dataset.raw==='1'; return renderDrawer(); }
  const act=t.closest('[data-act]'); if(act) return handleAct(act.dataset.act, slides.find(s=>s.el.contains(act)));
});
$('#prev').onclick=()=>goTo(activeIdx-1);
$('#next').onclick=()=>goTo(activeIdx+1);
$('#d-close').onclick=closeDrawer;
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if(!$('#nlmodal').hidden) return closeNL(); if(dTab) return closeDrawer(); if(document.body.classList.contains('immersive')) return exitFull(); return; }
  if(e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey || view!=='feed' || !$('#nlmodal').hidden) return;
  const k=e.key.toLowerCase(), sl=curSlide();
  if(k==='arrowdown'||k==='j'||k==='pagedown'){ e.preventDefault(); goTo(activeIdx+1); }
  else if(k==='arrowup'||k==='k'||k==='pageup'){ e.preventDefault(); goTo(activeIdx-1); }
  else if(!sl) return;
  else if(k==='f'){ (document.fullscreenElement||document.body.classList.contains('immersive'))?exitFull():enterFull(sl); }
  else if(k==='e') openDrawer('explain',sl.v);
  else if(k==='c') openDrawer('customize',sl.v);
  else if(k==='l') like(sl);
});
let toastTimer;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true,2600); }

/* ---------- boot ---------- */
setStyle(location.hash.slice(1));
readPads(); renderChips(); buildFeed();
requestAnimationFrame(frame);
