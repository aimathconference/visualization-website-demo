/* ---------- styles, palettes, fonts ---------- */
const STYLE_PAL = {
  night:{bg:'#050508', fg:'#ecebf5', a1:'#ff2e74', a2:'#22e0e8'},
  chalk:{bg:'#1b2a21', fg:'#eef0e4', a1:'#f4cf5d', a2:'#8fcbe9'},
  graph:{bg:'#ffffff', fg:'#13233a', a1:'#d2402a', a2:'#1d5fc4'},
  vapor:{bg:'#1d0b3b', fg:'#fbe9ff', a1:'#ff71ce', a2:'#01cdfe'},
  minimal:{bg:'#ffffff', fg:'#111111', a1:'#111111', a2:'#b0b0b0'},
  parallax:{bg:'#111a35', fg:'#e8edff', a1:'#ffb547', a2:'#7cc4ff'},
};
const STYLE_FONT = { night:'"Manrope", system-ui, sans-serif', chalk:'"Kalam", "Comic Sans MS", cursive', graph:'"IBM Plex Mono", ui-monospace, monospace',
  vapor:'"Space Mono", ui-monospace, monospace', minimal:'"Inter", system-ui, sans-serif', parallax:'"Manrope", system-ui, sans-serif' };
const STYLE_NAME = { night:'Night feed', chalk:'Chalkboard', graph:'Graph paper', vapor:'Vaporwave', minimal:'Minimal', parallax:'Parallax' };
const STYLE_DESC = {
  night:'Phone-native and full-bleed. Glass controls float over the visual, like a short-video app.',
  chalk:'A framed blackboard for the lecture hall. Handwritten titles, large readable type.',
  graph:'An engineering notebook. Each visual is a numbered figure with its caption underneath.',
  vapor:'Vaporwave. Each visual runs in a retro desktop window over a neon sunset grid.',
  minimal:'Nothing but the mathematics. A white page, one typeface, and controls as quiet text.',
  parallax:'Layered depth. Background layers scroll at different speeds and the figure tilts with the pointer.',
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
  bookmark:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v15l-5-3.7-5 3.7z"/></svg>',
  camera:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3.3L9 6h6l1.7 2.5H20v10H4z"/><circle cx="12" cy="13.3" r="3.2"/></svg>',
  left:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
};

/* ---------- app state ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr=()=>Math.min(2, window.devicePixelRatio||1);
const fmtK=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(n);
const wide=s=>s.toUpperCase().replace(/[!-~]/g,c=>String.fromCharCode(c.charCodeAt(0)+0xFEE0)).replace(/ /g,'\u3000'); // fullwidth, for the vaporwave margin
const md=s=>window.marked? marked.parse(s) : `<pre class="raw">${esc(s)}</pre>`;

let curStyle='night', view='feed', filter={type:'all'}, slides=[], slideEls=[], activeIdx=0, pads={t:0,r:0,b:0,l:0};
let paused=reduceMotion; // WCAG 2.2.2: motion can be paused; reduced-motion users start paused
let dTab=null, dViz=null, explainRaw=false, applyAll=false, blogPost=null, catTags=new Set(), catQuery='';
const settings={}, THEME_DEF={palette:'style', font:'style', lw:1.5, labels:true, speed:1};
function getSettings(v){ return settings[v.id] || (settings[v.id]={...THEME_DEF, params:normalizeParams(v.manifest,{})}); }

/* ---------- storage: every access may throw (private windows, blocked site data) ---------- */
const store={
  get(k,d,session){ try{ const x=(session?sessionStorage:localStorage).getItem(k); return x==null?d:JSON.parse(x); }catch(_){ return d; } },
  set(k,v,session){ try{ (session?sessionStorage:localStorage).setItem(k,JSON.stringify(v)); }catch(_){} },
  del(k,session){ try{ (session?sessionStorage:localStorage).removeItem(k); }catch(_){} },
};
const vizById=id=>VIZ.find(v=>v.id===id);
const idList=x=>Array.isArray(x)?[...new Set(x.filter(id=>typeof id==='string' && vizById(id)))]:[];
/* Personal signals, kept in this browser only: likes, saved pieces (in save order) and seconds watched per piece. */
const sig={likes:idList(store.get('loci:likes',[])), saves:idList(store.get('loci:saved',[])), watch:{}};
{ const w=store.get('loci:watch',{}); if(w && typeof w==='object') for(const id in w) if(vizById(id) && Number.isFinite(w[id]) && w[id]>0) sig.watch[id]=w[id]; }
VIZ.forEach(v=>v.liked=sig.likes.includes(v.id));
const saveSignals=()=>{ store.set('loci:likes',sig.likes); store.set('loci:saved',sig.saves); store.set('loci:watch',sig.watch); };
/* ---------- targets (docs/module-api.md, "Targets"): which of a piece's modules runs in this browser ----------
   The viewer's choice from the Mode control is kept in localStorage ('loci.target'); ?mode=desktop|mobile in a link
   is the preference for that load only. targetFor (manifest.js) honors a preference only if that target can run here. */
const TPREF_KEY='loci.target', isMode=x=>x==='desktop'||x==='mobile';
const urlMode=(m=>isMode(m)?m:null)(new URLSearchParams(location.search).get('mode'));
let targetPref=urlMode||(m=>isMode(m)?m:null)(store.get(TPREF_KEY,null));
const hasModes=v=>{ const ids=runnableTargets(v.manifest).map(t=>t.id); return ids.includes('desktop')&&ids.includes('mobile'); };
const capsFor=box=>({...LociHost.caps(), ...(targetPref?{preferred:targetPref}:{}), ...(box?{box:{w:box.w,h:box.h}}:{})});
const chooseTarget=(v,box)=>targetFor(v.manifest,capsFor(box));
/* the target a piece is running (or would run) here */
function tidOf(v){ const sl=slides.find(x=>x.v===v); return (sl&&sl.tid)||chooseTarget(v).id; }
const runningTarget=v=>targetById(v.manifest,tidOf(v))||runnableTargets(v.manifest)[0];
/* Remixes: edited module source per piece, for this tab only (sessionStorage). */
const remixes=new Map(), drafts=new Map(), remixErrors=new Map(), remixOpen=new Set();
/* A remix belongs to one target's module: the key is the piece id, plus "@target" for pieces that have targets. */
const rkeyFor=(v,tid)=>v.manifest.targets?`${v.id}@${tid}`:v.id;
const rkey=v=>rkeyFor(v,tidOf(v));
VIZ.forEach(v=>runnableTargets(v.manifest).forEach(t=>{ if(t.runtime!=='js') return; const k=rkeyFor(v,t.id), src=store.get('loci:remix:'+k,null,true); if(typeof src==='string') remixes.set(k,src); }));

/* ---------- serialized state (docs/module-api.md section 5): {v, p, t, theme}, non-default fields only ---------- */
const b64u={
  enc:s=>{ let b=''; for(const c of new TextEncoder().encode(s)) b+=String.fromCharCode(c); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  dec:s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))),
};
function viewOf(v){ const sl=slides.find(x=>x.v===v); return sl?(sl.host?sl.host.getView():sl.view)??null:null; }
function timeOf(v){ const sl=slides.find(x=>x.v===v); return sl?(sl.host?sl.host.getTime():sl.t):v.t0; }
function stateOf(v,at){
  const s=getSettings(v), def=normalizeParams(v.manifest,{}), o={v:v.id}, p={}, th={};
  for(const k in s.params) if(s.params[k]!==def[k]) p[k]=s.params[k];
  if(Object.keys(p).length) o.p=p;
  const t=at??timeOf(v); if(t>=0.005) o.t=+t.toFixed(2); // at: another moment, e.g. a recorded clip's in point
  for(const k in THEME_DEF) if(s[k]!==THEME_DEF[k]) th[k]=s[k];
  if(Object.keys(th).length) o.theme=th;
  const vw=viewOf(v); if(vw!=null) o.view=vw; // the module's camera, selection or dragged points (section 5)
  return o;
}
function shareURL(v,at){
  const o=stateOf(v,at), sl=slides.find(x=>x.v===v), mode=hasModes(v)&&sl&&sl.treason==='preferred'&&isMode(sl.tid)?`&mode=${sl.tid}`:'';
  const q=`?v=${encodeURIComponent(v.id)}`+(Object.keys(o).length>1?`&p=${b64u.enc(JSON.stringify(o))}`:'')+mode;
  return location.origin+location.pathname+q+location.hash;
}
const clampTo=(x,lo,hi,step)=>+(Math.round((Math.min(hi,Math.max(lo,x))-lo)/step)*step+lo).toFixed(2);
/* Parse ?v=<id>&p=<base64url json>. Params go through normalizeParams (unknown keys dropped, ranges snapped); theme ids must exist. */
function readLink(){
  const q=new URLSearchParams(location.search), v=vizById(q.get('v')||''); if(!v) return null;
  let o={};
  if(q.get('p')) try{ o=JSON.parse(b64u.dec(q.get('p'))); if(!o || typeof o!=='object' || Array.isArray(o)) o={}; }catch(_){ console.warn('loci: ignoring a malformed share link'); o={}; }
  const th=o.theme && typeof o.theme==='object'?o.theme:{}, s={...THEME_DEF};
  if(PALETTES.some(p=>p.id===th.palette)) s.palette=th.palette;
  if(FONTS.some(f=>f.id===th.font)) s.font=th.font;
  if(Number.isFinite(th.lw)) s.lw=clampTo(th.lw,0.5,4,0.1);
  if(Number.isFinite(th.speed)) s.speed=clampTo(th.speed,0,3,0.05);
  if(typeof th.labels==='boolean') s.labels=th.labels;
  s.params=normalizeParams(v.manifest,o.p);
  if(o.view!==undefined && viewProblem(o.view)) console.warn('loci: ignoring the share link\'s view:',viewProblem(o.view));
  const lesson=q.get('lesson')?Lesson.decode(q.get('lesson'),v):null; // ?lesson= plays its stops (section 5, "Lessons")
  return {v, s, t:Number.isFinite(o.t)&&o.t>=0?o.t:null, view:normalizeView(o.view), lesson};
}
/* The host-owned theme every module receives read-only (docs/module-api.md: "Theme is not a param"). */
function themeFor(v){
  const s=getSettings(v), pal=s.palette==='style'?STYLE_PAL[curStyle]:PALETTES.find(p=>p.id===s.palette);
  const font=s.font==='style'?STYLE_FONT[curStyle]:FONTS.find(f=>f.id===s.font).css;
  return {bg:pal.bg, fg:pal.fg, a1:pal.a1, a2:pal.a2, font, lw:s.lw, labels:s.labels};
}
/* The legacy P of a catalog draw(), for thumbnails painted on the page: theme plus the one range param. */
function makeP(v){ const r=v.manifest.params.find(p=>p.type==='range'); return {...themeFor(v), param:r&&getSettings(v).params[r.key]}; }
const specs=new Map();
/* The module spec of one target of a piece (the running one by default). */
function specFor(v,tid){
  const t=targetById(v.manifest,tid||tidOf(v))||runnableTargets(v.manifest)[0], k=v.id+'|'+t.id, rk=rkeyFor(v,t.id), man=manifestForTarget(v.manifest,t);
  // a remix is unreviewed code: never trusted, so it only ever runs in a worker
  if(!specs.has(k)) specs.set(k, t.runtime==='wasm'
    ? {runtime:'wasm', render:t.render, url:v.entry, manifest:man, trusted:true}
    : remixes.has(rk) ? {runtime:'js', render:t.render, source:remixes.get(rk), manifest:man, trusted:false}
    : {runtime:'js', render:t.render, source:moduleSource(v,t.id), manifest:man, trusted:true});
  return specs.get(k);
}
const dropSpecs=v=>{ for(const k of [...specs.keys()]) if(k.startsWith(v.id+'|')) specs.delete(k); };
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
  if(filter.type==='new') return VIZ.filter(v=>v.lane==='new'); // docs/review-pipeline.md section 3: passed the gate, review pending
  if(filter.ids) return filter.ids.map(vizById).filter(Boolean); // playlist, saved, for you: a snapshot taken when the filter was picked
  return VIZ;
}
/* For you: score = 2·(likes on the same tags) + 1·(saves on the same tags) + 0.5·(seconds watched on the same tags); ties keep catalog order. */
function affinity(){
  const tag=new Map(), add=(id,w)=>{ const v=vizById(id); if(v) v.tags.forEach(g=>tag.set(g,(tag.get(g)||0)+w)); };
  sig.likes.forEach(id=>add(id,2)); sig.saves.forEach(id=>add(id,1)); for(const id in sig.watch) add(id,0.5*sig.watch[id]);
  return VIZ.map((v,i)=>({id:v.id, i, s:v.tags.reduce((a,g)=>a+(tag.get(g)||0),0)})).sort((a,b)=>b.s-a.s||a.i-b.i).map(x=>x.id);
}
function makeFilter(kind){ return kind==='new'?{type:'new'} : kind==='saved'?{type:'saved', ids:[...sig.saves]} : kind==='foryou'?{type:'foryou', ids:affinity()} : {type:'all'}; }
const rbtn=(act,icon,lbl,o={})=>`<button class="rbtn${o.on?' on':''}${o.cls?' '+o.cls:''}" type="button" data-act="${act}" aria-label="${esc(o.aria||lbl)}"${o.pressed!=null?` aria-pressed="${o.pressed}"`:''}><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;
const likeLabel=v=>{ const n=fmtK(v.likes+(v.liked?1:0)); return {lbl:n, aria:`Like, ${n} likes`}; };
const pauseLabel=()=>paused?{icon:ICON.play, lbl:'Play', aria:'Play animation'}:{icon:ICON.pause, lbl:'Pause', aria:'Pause animation'};
/* Lanes (docs/review-pipeline.md section 3): New = passed the automated gate; Feed = two community approvals of the mathematics. */
/* Which targets a piece has, for the caption ("Desktop · Mobile", "Desktop only"), with the running one in bold. Pieces without targets run anywhere and get no badge. */
function targetBadge(v,running){
  const ids=runnableTargets(v.manifest).map(t=>t.id).filter(id=>id!=='any'); if(!ids.length) return '';
  const nm=id=>TARGET_NAME[id], vis=ids.length>1?ids.map(id=>id===running?`<b>${nm(id)}</b>`:nm(id)).join(' · '):`${nm(ids[0])} only`;
  const sr=`Versions: ${ids.length>1?ids.map(nm).join(' and '):nm(ids[0])+' only'}${running&&ids.length>1?`. Running the ${nm(running).toLowerCase()} version.`:'.'}`;
  return `<span aria-hidden="true">${vis}</span><span class="sr">${esc(sr)}</span>`;
}
const laneBadge=v=>v.lane==='new'?`<span class="lane new">Checked by machine</span>`:`<span class="lane">Community reviewed · ${esc(v.reviewed)}</span>`;
/* Distinctions (distinctions.js, docs/distinctions.md): a text mark after the lane that opens the citation in the Explanation tab. */
const distBadge=v=>distinctionsFor(v.id).map(d=>`<button class="lane dist" type="button" data-act="distinction" aria-label="Distinction: ${esc(DIST_CATS[d.cat].name)}, ${esc(distMonth(d.month))}"><span aria-hidden="true">◆ ${esc(DIST_CATS[d.cat].short)}<span class="dm"> · ${esc(distMonth(d.month,true))}</span></span></button>`).join('');
const distBlock=v=>distinctionsFor(v.id).map(d=>`<section class="distcite" aria-labelledby="dc-${esc(d.cat)}-${esc(d.month)}">
      <div class="kicker" id="dc-${esc(d.cat)}-${esc(d.month)}">◆ Distinction · ${esc(DIST_CATS[d.cat].name)} · ${esc(distMonth(d.month))}${d.sample?' <span class="samp">sample</span>':''}</div>
      <blockquote>${esc(d.citation)}</blockquote>
      <p class="fine">Cited by ${d.jury.map(h=>userLink(h)).join(', ')}, the ${esc(distMonth(d.month))} jury. Jurors judge from the piece and its explanation, never from likes or views.${d.sample?' This citation is a sample written for the prototype; no jury has met yet.':''}</p></section>`).join('');
const presetPills=v=>(v.manifest.presets||[]).map((p,j)=>`<button class="pill" type="button" data-preset="${j}" data-pviz="${esc(v.id)}">${esc(p.label)}</button>`).join('');
function slideHTML(v,i){
  const lk=likeLabel(v), pz=pauseLabel(), saved=sig.saves.includes(v.id), pr=v.manifest.presets||[];
  return `<div class="bgfx" aria-hidden="true"><span class="bg-num">${String(i+1).padStart(2,'0')}</span><span class="bg-word">${esc(v.tags[0])}</span><span class="bg-wide">${esc(wide(v.tags[0]))}</span>
    <i class="bg-ghost g2"></i><i class="bg-ghost g1"></i><i class="bg-sun"></i><i class="bg-floor"></i></div>
  <div class="winbar" aria-hidden="true"><span>${esc(v.id)}.exe</span><b>_</b><b>□</b><b>×</b></div>
  <div class="stage"><canvas class="viz" role="img" aria-label="${esc(v.title)}, animated visualization" aria-describedby="alt-${i}"></canvas><canvas class="labels" aria-hidden="true"></canvas><p class="sr" id="alt-${i}">${esc(v.alt||v.hook)}</p></div>
  <div class="caption">
    ${pr.length?`<div class="tries" role="group" aria-label="Try this">${presetPills(v)}</div>`:''}
    <div class="who"><button class="who-link" type="button" data-user="${esc(v.author)}" aria-label="${esc(v.author)}, profile">${pfp(v.author)}<span>${esc(v.author)}</span></button>${laneBadge(v)}${distBadge(v)}${targetBadge(v)?`<span class="lane tgt" data-tgt>${targetBadge(v)}</span>`:''}
      <button class="badge" type="button" data-act="unremix" aria-label="Remixed. Use the original module"${remixes.has(rkey(v))?'':' hidden'}><b>Remixed</b> Use original</button></div>
    <h2 class="vtitle" data-fig="${i+1}">${esc(v.title)}</h2>
    <p class="hook">${esc(v.hook)}</p>
    <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
    <div class="meta"><span class="oss">open source · ${v.license}</span><span>${v.repo}</span></div>
  </div>
  <div class="rail">
    ${rbtn('pause',pz.icon,pz.lbl,{aria:pz.aria})}
    ${rbtn('like',ICON.heart,lk.lbl,{aria:lk.aria, on:v.liked, pressed:!!v.liked})}
    ${rbtn('save',ICON.bookmark,'Save',{on:saved, pressed:saved})}
    ${rbtn('explain',ICON.sigma,'Explain')}
    ${rbtn('customize',ICON.sliders,'Customize')}
    ${rbtn('source',ICON.code,'Source')}
    ${rbtn('full',ICON.full,'Full screen')}
    ${rbtn('frame',ICON.camera,'Frame',{aria:'Save frame as PNG', cls:'rb-tall'})}
    ${rbtn('share',ICON.share,'Share')}
  </div>
  <button class="btn ghost exit-fs" type="button" data-act="exitfull">Exit full screen</button>`;
}
function endHTML(n){
  const what = filter.type==='new' ? ' in the New lane' : filter.type==='tag' ? ` tagged #${esc(filter.value.toLowerCase())}` : filter.type==='playlist' ? ` from “${esc(filter.name)}”` : filter.type==='saved' ? ` you saved` : '';
  return `<div class="end"><div class="end-card">
    <div class="kicker">End of the feed${filter.type==='foryou'?' · For you':''}</div>
    <h2>You've seen all ${n} visualization${n===1?'':'s'}${what}</h2>
    ${filter.type==='foryou'?`<p>Ordered by the topics you've liked, saved and watched. Your signals stay in this browser; reset them from the keyboard shortcuts dialog (press ?).</p>`:''}
    <p>New pieces are reviewed and added every month. Get the roundup by email.</p>
    ${nlForm('end')}
    <div class="btnrow"><button class="btn ghost" type="button" data-go="top">Back to the first</button><button class="btn ghost" type="button" data-view="browse">Browse the catalog</button><button class="btn ghost" type="button" data-view="blog">Read the blog</button></div>
  </div></div>`;
}
/* the three lists from Wishlist.md; Best of the month is on by default */
const NL_LISTS=[['best','Best of the month','a human-curated collection of the month’s best visualizations',true],['dev','Development blog','site development and infrastructure changes',false],['misc','Miscellany','could be anything',false]];
function nlForm(p){
  return `<form class="nl-form" novalidate>
    <label class="flabel" for="${p}-email">Email</label>
    <div class="nl-row"><input class="input" type="email" id="${p}-email" placeholder="you@university.edu" autocomplete="email"><button class="btn" type="submit">Subscribe</button></div>
    <fieldset class="opts"><legend>Send me</legend><div class="opt-list">
      ${NL_LISTS.map(([k,name,what,on])=>`<label class="check" for="${p}-nl-${k}"><input type="checkbox" id="${p}-nl-${k}" name="lists" value="${k}"${on?' checked':''}><span><b>${name}</b><span class="fine">${what}</span></span></label>`).join('')}</div></fieldset>
    <p class="nl-err" hidden></p>
    <p class="fine">At most one email a month per list. Unsubscribe anytime.</p>
  </form>`;
}

let io, ro;
function buildFeed(){
  if(lessonPlay) Lesson.exit(true); // the slides (and the lesson card) are about to be replaced
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
    const stage=$('.stage',el), sl={v,el,stage,canvas:$('canvas.viz',el),overlay:$('canvas.labels',el),host:null,used:false,card:null,t:v.t0+(paused?6:0),w:0,h:0,visible:false};
    slides.push(sl); ro.observe(stage); ro.observe($('.caption',el)); ro.observe($('.rail',el)); io.observe(el);
    stage.addEventListener('dblclick',e=>{ if(e.target.closest('.stall,.callout,.ihint') || ptrOf(sl)) return; like(sl,true); burst(el,e); }); // on an interactive piece a double-click is the module's
    gestures(sl);
  });
  const end=document.createElement('section'); end.className='slide'; end.setAttribute('aria-label','End of the feed'); end.innerHTML=endHTML(list.length);
  feed.appendChild(end); io.observe(end);
  slideEls=[...feed.children]; feed.scrollTop=0; activeIdx=0; onActiveChange(); updateParallax();
}
// layout size, not getBoundingClientRect: the parallax style tilts the stage with a transform
function measure(sl){ const w=sl.canvas.clientWidth, h=sl.canvas.clientHeight; if(!w) return false; sl.w=w; sl.h=h; sl.B=layoutBox(sl); return true; }
function boxOf(sl){ const full=document.fullscreenElement===sl.el || document.body.classList.contains('immersive'); return full||!sl.B?boxFor(sl.w,sl.h,full):sl.B; }
function sizeCanvas(sl){ if(!measure(sl)) return; if(sl.host) sl.host.resize(boxOf(sl),dpr()); placeOverlays(sl); }
function relayout(){ requestAnimationFrame(()=>{ readPads(); slides.forEach(sizeCanvas); }); }

/* ---------- runtime: each slide near the viewport runs its module in a worker (runtime.js) ---------- */
const wantsPlay=sl=>!paused && view==='feed' && sl.visible && !sl.card && !sl.scrubbing && !document.hidden && !(reduceMotion && sl.v.manifest.motion==='static');
function syncPlay(){ for(const sl of slides) if(sl.host) wantsPlay(sl)?sl.host.play():sl.host.pause(); }
function freshCanvas(sl){ if(sl.used){ const c=sl.canvas.cloneNode(false); sl.canvas.replaceWith(c); sl.canvas=c; } sl.used=true; } // a canvas hands its control to one worker, once
function mountSlide(sl){
  if(sl.host || sl.card || !measure(sl)) return;
  const v=sl.v, s=getSettings(v), ch=chooseTarget(v,boxOf(sl));
  sl.tid=ch.id; sl.treason=ch.reason; sl.fallback=ch.fallback; syncTargetBadge(sl);
  if(ch.fallback) return showFallback(sl);
  freshCanvas(sl);
  sl.host=LociHost.mount(sl.canvas,specFor(v,ch.id),{theme:themeFor(v), params:s.params, box:boxOf(sl), dpr:dpr(), t:sl.t, speed:s.speed, playing:wantsPlay(sl), overlay:sl.overlay, target:ch.id,
    view:sl.view, onView:vw=>{ sl.view=vw; }, onError:(kind,msg)=>pieceFailed(sl,kind,msg)});
  syncEngageUI(sl);
}
function syncTargetBadge(sl){
  const b=$('[data-tgt]',sl.el); if(b) b.innerHTML=targetBadge(sl.v,sl.fallback?null:sl.tid);
  const rb=$('.badge',sl.el); if(rb) rb.hidden=!remixes.has(rkeyFor(sl.v,sl.tid)); // a remix belongs to one target
}
/* The piece cannot run here (a desktop-only WebGL2 piece without WebGL2, or a minBox larger than the box): the stage
   shows a poster and a card with the share link, so it can be opened on a machine that runs it. The slide stays in the
   feed, the counter and the announcements. */
function showFallback(sl){
  const v=sl.v, f=sl.fallback, i=slides.indexOf(sl);
  freshCanvas(sl); paintPoster(sl);
  const why=f.reason==='webgl2'?'Open it on a laptop or desktop browser: the share link opens this exact piece there, with your parameters.':f.reason==='minBox'?'Turn the phone sideways or open it on a larger screen. The share link opens this exact piece.':'';
  const c=document.createElement('div'); c.className='stall fallback'; c.setAttribute('role','group'); c.setAttribute('aria-labelledby',`stall-${i}`);
  c.innerHTML=`<p class="stall-h" id="stall-${i}">${esc(f.message)}</p>${why?`<p class="fine">${esc(why)}</p>`:''}
    <div class="btnrow"><button class="btn" type="button" data-act="share">Share link</button></div>`;
  sl.stage.appendChild(c); sl.card=c; placeOverlays(sl);
}
/* A still for the fallback card: the piece's poster image if it has one, else its colors on the theme background. */
function paintPoster(sl){
  const cv=sl.canvas, r=cv.getBoundingClientRect(), d=dpr(); if(!r.width) return;
  cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  const c=cv.getContext('2d'), th=themeFor(sl.v), B=boxOf(sl); c.setTransform(d,0,0,d,0,0);
  c.fillStyle=th.bg; c.fillRect(0,0,r.width,r.height);
  if(sl.v.poster){ const im=new Image(); im.onload=()=>{ if(cv.isConnected && sl.fallback){ const k=Math.min(B.w/im.width,B.h/im.height); c.globalAlpha=0.55; c.drawImage(im,B.x+(B.w-im.width*k)/2,B.y+(B.h-im.height*k)/2,im.width*k,im.height*k); c.globalAlpha=1; } }; im.src=sl.v.poster; return; }
  const g=(x,y,col)=>{ const rg=c.createRadialGradient(x,y,0,x,y,Math.max(B.w,B.h)*0.6); rg.addColorStop(0,rgba(col,0.28)); rg.addColorStop(1,rgba(col,0)); c.fillStyle=rg; c.fillRect(B.x,B.y,B.w,B.h); };
  g(B.x+B.w*0.3,B.y+B.h*0.35,th.a1); g(B.x+B.w*0.7,B.y+B.h*0.65,th.a2);
}
function unmount(sl){ if(!sl.host) return; release(sl,true); sl.t=sl.host.getTime(); sl.view=sl.host.getView(); sl.host.dispose(); sl.host=null; syncEngageUI(sl); }
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
  release(sl,true);
  if(kind!=='slow' && sl.host){ sl.t=sl.host.getTime(); sl.view=sl.host.getView(); sl.host=null; } // the worker is gone; 'slow' leaves it paused
  const [title,why]=CARD[kind]||CARD.error, detail=why||msg||'';
  if(sl.card) sl.card.remove();
  const c=document.createElement('div'), i=slides.indexOf(sl); c.className='stall'; c.setAttribute('role','group'); c.setAttribute('aria-labelledby',`stall-${i}`);
  const rem=remixes.has(rkey(sl.v));
  c.innerHTML=`<p class="stall-h" id="stall-${i}">${esc(rem&&kind==='error'?'Your remix hit an error':title)}</p>${detail?`<p class="fine">${esc(detail)}</p>`:''}
    <div class="btnrow"><button class="btn" type="button" data-act="restart">Restart</button>${rem?`<button class="btn ghost" type="button" data-act="unremix">Use original</button>`:''}</div>`;
  sl.stage.appendChild(c); sl.card=c; syncEngageUI(sl); placeOverlays(sl);
  if(rem && kind==='error'){ remixErrors.set(rkey(sl.v),detail); showRemixError(sl.v); }
  if(curSlide()===sl) announce(`${sl.v.title}: ${title}. ${detail}`);
}
/* Things drawn over the canvas, positioned against the drawing box: the stall card (centre), the preset callout (bottom), the time chip (top). */
function placeOverlays(sl){
  if(!sl.card && !sl.callout && !sl.tchip && !sl.ihint) return;
  const B=boxOf(sl), cx=(B.x+B.w/2)+'px', mw=Math.max(200,B.w-16)+'px';
  if(sl.ihint){ const st=sl.ihint.style; st.left=(B.x+B.w-8)+'px'; st.top=(B.y+B.h-8)+'px'; st.maxWidth=mw; }
  if(sl.ibox){ const st=sl.ibox.style; st.left=B.x+'px'; st.top=B.y+'px'; st.width=B.w+'px'; st.height=B.h+'px'; }
  if(sl.card){ const st=sl.card.style; st.left=cx; st.top=(B.y+B.h/2)+'px'; st.maxWidth=mw; }
  if(sl.callout){ const st=sl.callout.style; st.left=cx; st.top=(B.y+B.h-8-(sl.ihint?sl.ihint.offsetHeight+6:0))+'px'; st.maxWidth=mw; } // above "Click to interact"
  if(sl.tchip){ const st=sl.tchip.style; st.left=cx; st.top=(B.y+8)+'px'; }
}
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
  if(say) announce(activeIdx<n?`${activeIdx+1} of ${n}: ${slides[activeIdx].v.title}${slides[activeIdx].fallback?`. ${slides[activeIdx].fallback.message}.`:''}`:'End of the feed');
  slideEls.forEach((el,i)=>el.classList.toggle('active',i===activeIdx));
  if(say) syncURL();
  $('#counter').textContent=`${Math.min(activeIdx+1,n)} / ${n}`;
  $('#prev').disabled=activeIdx<=0; $('#next').disabled=activeIdx>=slideEls.length-1;
  if(engagedSl && engagedSl!==curSlide()) release(engagedSl);
  mountPolicy();
  const sl=curSlide();
  if(dTab && sl && sl.v!==dViz){ dViz=sl.v; renderDrawer(); }
}
function goTo(i){
  i=Math.max(0,Math.min(slideEls.length-1,i));
  if(document.fullscreenElement && slides[i]) slides[i].el.requestFullscreen().catch(()=>{});
  slideEls[i].scrollIntoView({behavior:reduceMotion?'auto':'smooth', block:'start'});
}
/* The address bar follows the slide on screen, with replaceState so Back is not one entry per swipe. Only v: params live in share links. */
function syncURL(){
  const sl=curSlide(); if(!sl || view!=='feed') return;
  if(new URLSearchParams(location.search).get('v')===sl.v.id) return;
  try{ history.replaceState(history.state,'',`${location.pathname}?v=${encodeURIComponent(sl.v.id)}${location.hash}`); }catch(_){}
}
function like(sl,only){
  const v=sl.v; if(only && v.liked) return; v.liked=!v.liked;
  sig.likes=VIZ.filter(x=>x.liked).map(x=>x.id); saveSignals();
  const b=$('[data-act="like"]',sl.el), lk=likeLabel(v); b.classList.toggle('on',v.liked); b.setAttribute('aria-pressed',!!v.liked); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl;
}
function toggleSave(sl){
  const v=sl.v, i=sig.saves.indexOf(v.id), on=i<0;
  if(on) sig.saves.push(v.id); else sig.saves.splice(i,1);
  saveSignals();
  $$('[data-act="save"]').forEach(b=>{ const s=slides.find(x=>x.el.contains(b)); if(s&&s.v===v){ b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); } });
  renderChips();
  announce(on?`Saved ${v.title}. ${sig.saves.length} saved.`:`Removed ${v.title} from saved.`);
}

/* ---------- scrub, long-press, time stepping ---------- */
const SCRUB_PX=12, SCRUB_S_PER_PX=0.02, LONG_MS=500;
function gestures(sl){
  const st=sl.stage; let g=null, longAt=0;
  const skip=e=>e.target.closest('.stall,.callout,.ihint');
  /* engaged: pointer, wheel and context menu go to the module; scrub and long-press are off */
  const fwd=e=>{ const p=ptrOf(sl); if(!sl.engaged || !p || skip(e) || !(p.drag||p.click)) return false; sl.host.input(e); return true; };
  st.addEventListener('pointerdown',e=>{
    if(sl.engaged){ if(fwd(e)) try{ st.setPointerCapture(e.pointerId); }catch(_){} return; }
    if(e.button>0 || !e.isPrimary || skip(e)) return;
    const me={id:e.pointerId, x:e.clientX, y:e.clientY, on:false, fired:false, lp:0};
    me.lp=setTimeout(()=>{ me.lp=0; if(g!==me || me.on) return; me.fired=true; longAt=performance.now(); togglePause(); },LONG_MS);
    g=me;
  });
  st.addEventListener('pointermove',e=>{
    if(sl.engaged){ fwd(e); return; }
    if(!g || e.pointerId!==g.id) return;
    const dx=e.clientX-g.x, dy=e.clientY-g.y;
    if(!g.on){
      if(g.lp && Math.hypot(dx,dy)>6){ clearTimeout(g.lp); g.lp=0; } // a long-press is a press without movement
      if(g.fired || Math.abs(dx)<=SCRUB_PX || Math.abs(dx)<=Math.abs(dy)) return; // vertical: leave it to the feed's native scrolling
      g.on=true; g.x=e.clientX; g.base=sl.host?sl.host.getTime():sl.t; sl.scrubbing=true; syncPlay();
      try{ st.setPointerCapture(e.pointerId); }catch(_){}
    }
    e.preventDefault();
    const t=Math.max(0,g.base+(e.clientX-g.x)*SCRUB_S_PER_PX); sl.t=t; if(sl.host) sl.host.seek(t); showT(sl,t);
  });
  const end=e=>{
    if(sl.engaged && e.type!=='lostpointercapture'){ fwd(e); return; }
    if(!g || e.pointerId!==g.id) return; const d=g; g=null; if(d.lp) clearTimeout(d.lp);
    if(d.on||d.fired) sl.gestureAt=performance.now(); // the click that ends a scrub or long-press does not engage
    if(d.on){ sl.scrubbing=false; syncPlay(); announce(`t = ${sl.t.toFixed(2)} s`); }
  };
  st.addEventListener('pointerup',end); st.addEventListener('pointercancel',end); st.addEventListener('lostpointercapture',end);
  st.addEventListener('contextmenu',e=>{ if(sl.engaged || performance.now()-longAt<1500) e.preventDefault(); });
  st.addEventListener('wheel',e=>{ const p=ptrOf(sl); if(!sl.engaged || !p || !p.wheel || skip(e)) return; e.preventDefault(); sl.host.input(e); },{passive:false});
  // a click (or tap) on an engageable stage engages it
  st.addEventListener('click',e=>{ if(sl.engaged || !ptrOf(sl) || skip(e) || performance.now()-(sl.gestureAt||0)<400) return; engage(sl); });
  sl.canvasFocusOut=e=>{ if(sl.engaged && e.relatedTarget && !st.contains(e.relatedTarget)) release(sl); };
  st.addEventListener('focusout',e=>{ if(e.target===sl.canvas) sl.canvasFocusOut(e); });
}

/* ---------- engagement (docs/module-api.md, "Pointer"): a slide whose running target declares pointer input ----------
   shows "Click to interact". Clicking or tapping the stage, or Enter on its focused canvas, engages it: pointer drags
   (with pointer capture), the wheel, the context menu and keys other than Esc, Tab and modifier shortcuts go to the
   module, and scrub, long-press and feed scrolling over the stage are off. Esc, a click outside the stage, another
   slide, a drawer or dialog, or another view releases it. On touch: tap to engage, then one finger drags and two pinch. */
const coarse=()=>matchMedia('(pointer:coarse)').matches;
let engagedSl=null;
const ptrOf=sl=>sl&&sl.host&&!sl.card&&sl.host.pointer&&sl.host.pointer.mode!=='none'?sl.host.pointer:null;
function syncEngageUI(sl){
  const p=ptrOf(sl), cv=sl.canvas;
  sl.stage.classList.toggle('engageable',!!p);
  if(!p){
    if(sl.ihint){ sl.ihint.remove(); sl.ihint=null; } if(sl.ibox){ sl.ibox.remove(); sl.ibox=null; }
    cv.removeAttribute('tabindex'); cv.setAttribute('aria-label',`${sl.v.title}, animated visualization`); return;
  }
  cv.tabIndex=0;
  cv.setAttribute('aria-label',`${sl.v.title}, interactive visualization. ${sl.engaged?`Interacting: ${p.hint}. Press Escape to release.`:'Press Enter to interact.'}`);
  if(!sl.ihint){
    const b=sl.ihint=document.createElement('button'); b.type='button'; b.className='ihint'; b.tabIndex=-1; b.setAttribute('aria-hidden','true'); // the canvas carries the same text for assistive tech
    b.addEventListener('click',e=>{ e.stopPropagation(); sl.engaged?release(sl):engage(sl); });
    const o=sl.ibox=document.createElement('div'); o.className='ibox'; o.setAttribute('aria-hidden','true');
    sl.stage.append(o,b);
  }
  sl.ihint.classList.toggle('on',!!sl.engaged);
  sl.ihint.textContent=sl.engaged?`${p.hint} · ${coarse()?'tap here when done':'Esc to release'}`:coarse()?'Tap to interact':'Click to interact';
  placeOverlays(sl);
  // a long hint over a narrow box would cover the piece: after a few seconds it shrinks to how to release
  clearTimeout(sl.hintTimer);
  if(sl.engaged && sl.ihint.offsetWidth>boxOf(sl).w*0.5) sl.hintTimer=setTimeout(()=>{ if(sl.engaged && sl.ihint) sl.ihint.textContent=coarse()?'Done':'Esc to release'; },4000);
}
function engage(sl){
  const p=ptrOf(sl); if(!p || sl.engaged) return;
  if(engagedSl && engagedSl!==sl) release(engagedSl,true);
  engagedSl=sl; sl.engaged=true; sl.stage.classList.add('engaged');
  sl.host.input({type:'engage'});
  if(document.activeElement!==sl.canvas) sl.canvas.focus({preventScroll:true});
  syncEngageUI(sl);
  announce(`Interacting with ${sl.v.title}. ${p.hint}. ${coarse()?'Tap the hint or outside the piece':'Press Escape or click outside it'} to release.`);
}
function release(sl,quiet){
  if(!sl || !sl.engaged) return;
  sl.engaged=false; if(engagedSl===sl) engagedSl=null; sl.stage.classList.remove('engaged');
  if(sl.host){ sl.host.input({type:'release'}); sl.host.resetPointers(); }
  syncEngageUI(sl);
  if(!quiet) announce(`Released ${sl.v.title}. Scrolling and shortcuts are back.`);
}
// a press anywhere outside the engaged stage releases it (before that press does anything else)
document.addEventListener('pointerdown',e=>{ if(engagedSl && !engagedSl.stage.contains(e.target)) release(engagedSl); },true);
document.addEventListener('keyup',e=>{ const sl=engagedSl, p=ptrOf(sl); if(sl && p && p.keys && !modals.length && !e.metaKey && !e.ctrlKey && !e.altKey && e.key!=='Escape' && e.key!=='Tab' && !(e.target.closest&&e.target.closest('input,select,textarea'))) sl.host.input(e); });
function showT(sl,t){
  let c=sl.tchip;
  if(!c){ c=sl.tchip=document.createElement('div'); c.className='tchip'; c.setAttribute('aria-hidden','true'); sl.stage.appendChild(c); placeOverlays(sl); }
  c.textContent=`t = ${t.toFixed(2)} s`; c.classList.remove('out');
  clearTimeout(sl.tchipTimer); sl.tchipTimer=setTimeout(()=>c.classList.add('out'),900);
}
function seekBy(sl,d,abs){
  const t=Math.max(0,+(abs?d:timeOf(sl.v)+d).toFixed(3)); seekViz(sl.v,t); showT(sl,t); announce(`t = ${t.toFixed(2)} s`);
}

/* ---------- presets ("Try this"): Customize, Explanation and the pills over the stage all land here ---------- */
function applyPreset(v,i){
  const p=(v.manifest.presets||[])[i]; if(!p) return;
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true); // a preset is the piece's own callout; it ends the lesson
  const s=getSettings(v); s.params=normalizeParams(v.manifest,{...s.params, ...p.params}); pushParams(v);
  if(p.t!=null) seekViz(v,p.t);
  if(p.view!==undefined) for(const x of slides) if(x.v===v){ x.view=normalizeView(p.view); if(x.host) x.host.setView(x.view); }
  const sl=slides.find(x=>x.v===v); if(sl) showCallout(sl,p);
  if(dTab==='customize' && dViz===v){ renderDrawer(); refocus(`[data-preset="${i}"]`,$('#d-body')); }
  announce(`${p.label}. ${p.note||''}`);
}
function showCallout(sl,p){
  hideCallout(sl,true);
  const c=document.createElement('div'); c.className='callout';
  c.setAttribute('aria-hidden','true'); // the same text goes to the live region
  c.innerHTML=`<b>${esc(p.label)}</b>${p.note?`<span>${esc(p.note)}</span>`:''}`;
  c.addEventListener('click',()=>hideCallout(sl));
  sl.stage.appendChild(c); sl.callout=c; placeOverlays(sl);
  sl.calloutTimer=setTimeout(()=>hideCallout(sl),6000);
}
function hideCallout(sl,now){
  const c=sl.callout; if(!c) return; clearTimeout(sl.calloutTimer); sl.callout=null;
  if(now||reduceMotion) return c.remove(); c.classList.add('out'); setTimeout(()=>c.remove(),400);
}

/* ---------- lessons (docs/module-api.md section 5, "Lessons"): up to 8 stops of one piece in one link ----------
   A stop is a share-link state without the theme: {p, t, view, note}. Everything that arrives (a link, a stored draft)
   goes through Lesson.parse: params through normalizeParams, views through viewProblem/normalizeView, notes cut to
   140 characters. Stops are compact (non-default params only) in links and drafts, complete after parse.
   Collections, seminar mode and the clip recorder are meant to reuse encode/decode/apply. */
const Lesson={
  MAX_STOPS:8, MAX_NOTE:140, MAX_TITLE:80, MAX_LINK:16384,
  key:v=>'loci:lesson:'+v.id,
  /* the moment v is at now, as a compact stop */
  capture(v,note){ const o=stateOf(v), st={}; if(o.p) st.p=o.p; if(o.t!=null) st.t=o.t; if(o.view!=null) st.view=o.view; st.note=String(note||'').trim().slice(0,Lesson.MAX_NOTE); return st; },
  /* a stop (compact or complete) in the compact form: non-default params, t when > 0, view when set */
  compact(v,st){
    const def=normalizeParams(v.manifest,{}), p={}, o={}; for(const k in (st.p||{})) if(st.p[k]!==def[k]) p[k]=st.p[k];
    if(Object.keys(p).length) o.p=p; if(st.t>=0.005) o.t=+(+st.t).toFixed(2); if(st.view!=null) o.view=st.view; o.note=st.note||''; return o;
  },
  /* validate {title?, stops:[{v?, p, t, view, note}]} for piece v. Returns {title, stops} with complete stops, or null. */
  parse(o,v,from='lesson link'){
    const warn=m=>console.warn(`loci: ${from}: ${m}`);
    if(!o || typeof o!=='object' || Array.isArray(o) || !Array.isArray(o.stops)){ warn('ignoring it: it is not {stops: [...]}'); return null; }
    if(o.stops.length>Lesson.MAX_STOPS) warn(`keeping the first ${Lesson.MAX_STOPS} of ${o.stops.length} stops`);
    const stops=[];
    o.stops.slice(0,Lesson.MAX_STOPS).forEach((s,i)=>{
      if(!s || typeof s!=='object' || Array.isArray(s)) return warn(`dropping stop ${i+1}: it is not an object`);
      if(s.v!==undefined && s.v!==v.id) return warn(`dropping stop ${i+1}: it names another piece (${String(s.v).slice(0,40)}); this player plays one piece`);
      const vp=s.view!==undefined?viewProblem(s.view):null; if(vp) warn(`stop ${i+1}: ignoring its view: ${vp}`);
      stops.push({v:v.id, p:normalizeParams(v.manifest,s.p&&typeof s.p==='object'&&!Array.isArray(s.p)?s.p:{}), t:Number.isFinite(s.t)&&s.t>=0?+s.t:0,
        view:normalizeView(s.view), note:typeof s.note==='string'?s.note.trim().slice(0,Lesson.MAX_NOTE):''});
    });
    const title=typeof o.title==='string'?o.title.trim().slice(0,Lesson.MAX_TITLE):'';
    if(!stops.length){ if(o.stops.length) warn('ignoring it: no valid stops'); return o.stops.length?null:{title, stops}; }
    return {title, stops};
  },
  encode(v,lesson){ const o={}; if(lesson.title) o.title=lesson.title; o.stops=lesson.stops.map(s=>Lesson.compact(v,s)); return b64u.enc(JSON.stringify(o)); },
  decode(str,v){
    if(str.length>Lesson.MAX_LINK){ console.warn('loci: ignoring a lesson link longer than 16 KB'); return null; }
    let o; try{ o=JSON.parse(b64u.dec(str)); }catch(_){ console.warn('loci: ignoring a malformed lesson link'); return null; }
    const l=Lesson.parse(o,v); if(l && !l.stops.length){ console.warn('loci: ignoring a lesson link with no stops'); return null; } return l;
  },
  url(v,lesson){ return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}&lesson=${Lesson.encode(v,lesson)}`+location.hash; },
  /* put piece v at a stop: params replace the current ones, then t, then the view (null: the module's default view) */
  apply(v,st){
    const s=getSettings(v); s.params=normalizeParams(v.manifest,st.p); pushParams(v); seekViz(v,st.t||0);
    const vw=normalizeView(st.view); for(const x of slides) if(x.v===v){ x.view=vw; if(x.host) x.host.setView(vw); }
  },
  /* the draft ("Your lesson") kept per piece in localStorage */
  load(v){ const o=store.get(Lesson.key(v),null), l=o&&Lesson.parse(o,v,'saved lesson'); return l?{title:l.title, stops:l.stops.map(s=>Lesson.compact(v,s))}:{title:'', stops:[]}; },
  save(v,d){ if(!d.stops.length && !d.title) store.del(Lesson.key(v)); else store.set(Lesson.key(v),d); },
  /* playback: one lesson at a time, on its piece's slide */
  play(v,lesson,i=0){ if(lessonPlay) Lesson.exit(true); lessonPlay={v, lesson, i:-1, wasPaused:paused}; Lesson.go(i,true); },
  go(i,first){
    const L=lessonPlay; if(!L) return; const n=L.lesson.stops.length; i=Math.max(0,Math.min(n-1,i)); L.i=i;
    const st=L.lesson.stops[i]; setPaused(true,true); Lesson.apply(L.v,st); lessonCard();
    announce(`${first?`Lesson${L.lesson.title?`: ${L.lesson.title}`:''}, ${n} stop${n===1?'':'s'}. `:''}Stop ${i+1} of ${n}. ${st.note}${first?' Left and right arrow keys, or Previous and Next, move between stops. Escape leaves the lesson.':''}`);
  },
  step(d){
    const L=lessonPlay; if(!L) return; const j=L.i+d;
    if(j<0) return announce(`This is the first stop, 1 of ${L.lesson.stops.length}.`);
    if(j>=L.lesson.stops.length) return announce('This is the last stop. Press Escape or Exit lesson to leave the lesson.');
    Lesson.go(j);
  },
  exit(quiet){
    const L=lessonPlay; if(!L) return; lessonPlay=null;
    let had=false; slides.forEach(sl=>{ if(sl.callout && sl.callout.classList.contains('lesson')){ had=had||sl.callout.contains(document.activeElement); hideCallout(sl,true); if(had) refocus('[data-act="pause"]',sl.el); } });
    if(!L.wasPaused && paused) setPaused(false,true);
    if(new URLSearchParams(location.search).has('lesson')) try{ history.replaceState(history.state,'',`${location.pathname}?v=${encodeURIComponent(L.v.id)}${location.hash}`); }catch(_){}
    if(!quiet) announce(`Left the lesson. ${L.v.title} is yours to explore${!L.wasPaused?' and playing again':''}.`);
  },
};
let lessonPlay=null; // {v, lesson, i, wasPaused} while a lesson plays
/* The lesson card: the persistent callout of the current stop, with Previous, Next and Exit. It is not aria-hidden: its buttons are real controls. */
function lessonCard(){
  const L=lessonPlay, sl=L&&slides.find(x=>x.v===L.v); if(!sl) return;
  let c=sl.callout;
  if(!c || !c.classList.contains('lesson')){
    hideCallout(sl,true);
    c=document.createElement('div'); c.className='callout lesson'; c.setAttribute('role','group'); c.setAttribute('aria-label','Lesson');
    c.innerHTML=`<b class="ls-k"></b><span class="ls-note"></span><div class="ls-ctl"><button class="iconbtn" type="button" data-ls="prev" aria-label="Previous stop">${ICON.left}</button><button class="iconbtn" type="button" data-ls="next" aria-label="Next stop">${ICON.right}</button><button class="btn ghost" type="button" data-ls="exit">Exit lesson</button></div>`;
    c.addEventListener('click',e=>{ const b=e.target.closest('[data-ls]'); e.stopPropagation(); if(!b) return; const a=b.dataset.ls; if(a==='exit') Lesson.exit(); else Lesson.step(a==='next'?1:-1); });
    sl.stage.appendChild(c); sl.callout=c;
  }
  const n=L.lesson.stops.length, st=L.lesson.stops[L.i];
  $('.ls-k',c).textContent=`${L.lesson.title?L.lesson.title+' · ':''}Stop ${L.i+1} of ${n}`;
  $('.ls-note',c).textContent=st.note;
  $('[data-ls="prev"]',c).setAttribute('aria-disabled',L.i===0); $('[data-ls="next"]',c).setAttribute('aria-disabled',L.i===n-1); // not disabled: a focused button keeps focus at the ends
  placeOverlays(sl);
}

/* ---------- save frame, share ---------- */
function download(blob,name){ const a=document.createElement('a'), u=URL.createObjectURL(blob); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),4000); }
async function saveFrame(sl){
  if(!sl.host || sl.card) return toast('This piece is not running, so there is no frame to save.');
  const t=sl.host.getTime(), name=`${sl.v.id}-t${t.toFixed(2)}.png`;
  try{ const blob=await sl.host.capture(); download(blob,name); toast(`Saved ${name}`); }
  catch(e){ console.warn('loci: capture failed',e.message); toast('Could not capture this frame.'); }
}
let shareSl=null;
function openShare(sl,opener){
  const v=sl.v, url=shareURL(v), rem=remixes.has(rkey(v)); shareSl=sl;
  $('#share-h').textContent=v.title; $('#share-url').value=url; $('#share-msg').textContent='';
  $('#share-note').textContent=rem?'This piece is remixed. Remixes are not shareable in this mockup, so the link opens the original module with your parameters, colors and time.':'';
  $('#share-note').hidden=!rem;
  $('#clip').hidden=true; $('#share-clip').setAttribute('aria-expanded','false'); // the recorder opens collapsed, with this slide's t
  showDialog('#sharemodal','#share-url',opener);
  const fail=()=>{ $('#share-msg').textContent='Copying is blocked here. The link below is selected: copy it with Ctrl+C (⌘C on a Mac).'; if(rem) toast('Remixes are not shareable in this mockup, so the link opens the original.'); };
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(url):Promise.reject()).then(()=>{
    $('#share-msg').textContent='Link copied to the clipboard.';
    toast(rem?'Link copied. Remixes are not shareable in this mockup, so it opens the original.':'Link copied');
  },fail);
}
$('#share-url').addEventListener('focus',e=>{ const u=e.target; u.setSelectionRange(0,u.value.length,'backward'); }); // backward: the start of the link stays in view
$('#share-copy').onclick=()=>{ const u=$('#share-url'); copyText(u.value,shareSl&&remixes.has(rkey(shareSl.v))?'Link copied. Remixes are not shareable in this mockup.':'Link copied'); u.focus(); };
$('#share-frame').onclick=()=>{ if(shareSl) saveFrame(shareSl); };

/* ---------- record clip (docs/ideas/07-clip-recorder.md) ----------
   A dedicated hidden handle, never the visible slide: mounted paused on a detached canvas at the box size (or with
   the longest side at 720 px, the same layout at a higher dpr), then seek(t) + capture() for each frame, in order.
   GIF: one global palette (median cut over a few sampled frames), then each frame is mapped, cropped to what changed
   and LZW-encoded as it arrives (gif.js), with a yield to the page between frames. PNG zip: the frames as PNGs for
   \animategraphics. The watermark strip under the box carries the share link to the in point. */
const CLIP_MAX=240, CLIP_SAMPLES=6, CLIP_MONO='"IBM Plex Mono", ui-monospace, monospace';
let clipJob=null;
const clipCancelled=new Error('cancelled');
const clipFmtTime=s=>s<1?'under a second':s<90?`about ${Math.round(s)} s`:`about ${Math.round(s/60)} min`;
const clipMB=b=>b<1048576?`${Math.max(1,Math.round(b/1024))} KB`:`${(b/1048576).toFixed(1)} MB`;
function clipPlan(sl){
  const i=Math.max(0,parseFloat($('#clip-in').value)), o=parseFloat($('#clip-out').value), fps=+$('#clip-fps').value||15;
  const size=$('#clip-size').value, fmt=$('#clip-fmt').value, wm=$('#clip-wm').checked;
  const B=boxOf(sl), W=Math.max(16,Math.round(B.w)), H=Math.max(16,Math.round(B.h)), k=size==='720'?720/Math.max(W,H):1;
  const ow=Math.round(W*k), oh=Math.round(H*k), strip=wm?Math.round(22*k):0, n=Math.round((o-i)*fps);
  const P={i, o, fps, size, fmt, wm, W, H, k, ow, oh, strip, oht:oh+strip, n};
  if(!Number.isFinite(i)||!Number.isFinite(o)) P.error='Enter an in and an out point in seconds.';
  else if(!(n>=2)) P.error='The out point must be at least two frames after the in point.';
  else if(n>CLIP_MAX) P.error=`That is ${n} frames; a clip is ${CLIP_MAX} frames at most (${(CLIP_MAX/fps).toFixed(1)} s at ${fps} fps). Shorten the range or lower the frame rate.`;
  const MP=ow*P.oht/1e6;
  P.msPer=15+110*MP+(fmt==='zip'?40*MP:0); // review estimate: 15–40 ms a frame at 480², 60–150 ms at 1080²
  P.bytes=fmt==='zip'?n*ow*P.oht*0.8:ow*P.oht*(0.5+0.2*(n-1));
  return P;
}
function clipSyncUI(){
  const sl=shareSl; if(!sl || $('#clip').hidden) return;
  const P=clipPlan(sl), busy=!!clipJob, big=Math.max(P.W,P.H);
  const bx=$('#clip-size').options; bx[0].textContent=`The box, ${P.W}×${P.H}`; bx[1].textContent=`720 px, ${Math.round(P.W*720/big)}×${Math.round(P.H*720/big)}`;
  $('#clip-go').textContent=P.fmt==='zip'?'Record PNG frames':'Record GIF';
  $('#clip-go').disabled=busy||!!P.error;
  ['#clip-in','#clip-out','#clip-fps','#clip-size','#clip-fmt','#clip-wm'].forEach(s=>$(s).disabled=busy);
  if(busy) return;
  const cyc=sl.v.manifest.cycle, hint=cyc&&!P.error&&Math.abs((P.o-P.i)-cyc)>0.05?` This piece repeats every ${cyc} s: out = in + ${cyc} loops seamlessly.`:'';
  $('#clip-est').textContent=P.error?P.error:`${P.n} frames at ${P.ow} × ${P.oht} px: rendering takes ${clipFmtTime(P.n*P.msPer/1000)}, and the ${P.fmt==='zip'?'zip':'GIF'} is roughly ${clipMB(P.bytes)} (refined while it records).${hint}`;
}
function openClip(){
  const sl=shareSl; if(!sl) return;
  const sec=$('#clip'), show=sec.hidden; sec.hidden=!show; $('#share-clip').setAttribute('aria-expanded',show);
  if(!show) return;
  const t=sl.host?sl.host.getTime():sl.t??sl.v.t0??0, i=Math.max(0,Math.round(t*10)/10);
  $('#clip-in').value=i.toFixed(1); $('#clip-out').value=(i+4).toFixed(1); $('#clip-msg').textContent='';
  clipSyncUI(); $('#clip-in').focus();
}
/* the strip under the box: the theme background, a hairline, the link in mono; a long link shrinks, then falls back to the piece's bare link */
function paintClipStrip(c,P,theme,link,bare){
  const k=P.k, y=P.oh, pad=Math.round(8*k), room=P.ow-2*pad;
  c.fillStyle=theme.bg; c.fillRect(0,y,P.ow,P.strip);
  c.globalAlpha=0.3; c.fillStyle=theme.fg; c.fillRect(0,y,P.ow,Math.max(1,Math.round(k))); c.globalAlpha=0.8;
  let fs=11*k, txt=link; const set=()=>{ c.font=`${fs}px ${CLIP_MONO}`; }; set();
  while(c.measureText(txt).width>room && fs>8*k){ fs-=0.5*k; set(); }
  if(c.measureText(txt).width>room){ txt=bare; fs=11*k; set(); while(c.measureText(txt).width>room && fs>7*k){ fs-=0.5*k; set(); } }
  c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,pad,y+P.strip/2+0.5*k,room); c.globalAlpha=1;
}
async function recordClip(){
  const sl=shareSl; if(!sl || clipJob) return;
  const v=sl.v, P=clipPlan(sl), msg=$('#clip-msg'); if(P.error) return clipSyncUI();
  if(sl.card || sl.fallback){ msg.textContent='This piece is not running here, so it cannot be recorded.'; return; }
  const job={cancelled:false, h:null}; clipJob=job;
  const prog=$('#clip-prog'), est=$('#clip-est');
  prog.hidden=false; prog.value=0; $('#clip-cancel').hidden=false; msg.textContent=''; clipSyncUI();
  if(P.wm && document.fonts) try{ await document.fonts.load(`11px ${CLIP_MONO}`); }catch(_){} // the strip's font, before the first frame
  const tid=sl.tid||tidOf(v), theme=themeFor(v), params=getSettings(v).params, view=sl.host?sl.host.getView():sl.view;
  const link=shareURL(v,P.i), bare=location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}`;
  let fail; const failed=new Promise((_,rej)=>fail=rej); failed.catch(()=>{});
  const h=LociHost.mount(document.createElement('canvas'),specFor(v,tid),{theme, params, box:{x:0,y:0,w:P.W,h:P.H}, dpr:P.k, t:P.i, speed:1, playing:false,
    size:{w:P.W,h:P.H}, target:tid, label:'clip', view, onError:(kind,m)=>fail(new Error(`${kind}: ${m}`))});
  job.h=h;
  const out=document.createElement('canvas'); out.width=P.ow; out.height=P.oht;
  const c=out.getContext('2d',{willReadFrequently:true});
  const times=Array.from({length:P.n},(_,j)=>P.i+j/P.fps);
  const delay=j=>Math.round((j+1)*100/P.fps)-Math.round(j*100/P.fps); // centiseconds that add up to the true duration
  const yieldPage=()=>new Promise(r=>setTimeout(r,0));
  const draw=async t=>{ // seek, capture, composite into `out`
    h.seek(t); const blob=await Promise.race([h.capture(),failed]); if(job.cancelled) throw clipCancelled;
    const bm=await createImageBitmap(blob);
    c.fillStyle=theme.bg; c.fillRect(0,0,P.ow,P.oht); c.drawImage(bm,0,0,P.ow,P.oh); if(bm.close) bm.close();
    if(P.wm) paintClipStrip(c,P,theme,link,bare);
    if(job.cancelled) throw clipCancelled;
  };
  const t0=performance.now(); let done=0, bytes=0, same=0, result=null;
  const tick=()=>{ done++; prog.value=done/P.n; const el=(performance.now()-t0)/1000, left=el/done*(P.n-done);
    est.textContent=`Frame ${done} of ${P.n} · ${done<P.n?clipFmtTime(left)+' left':'finishing'} · ${clipMB(bytes)} so far, about ${clipMB(bytes/done*P.n)} in all`; };
  const name=`${v.id}-t${P.i.toFixed(1)}-${P.o.toFixed(1)}`;
  try{
    if(P.fmt==='gif'){
      const K=Math.min(P.n,CLIP_SAMPLES), picks=[...new Set(Array.from({length:K},(_,j)=>Math.round(j*(P.n-1)/Math.max(1,K-1))))], cache=new Map();
      est.textContent=`Sampling ${picks.length} frames for the palette…`;
      for(const j of picks){ await draw(times[j]); cache.set(j,c.getImageData(0,0,P.ow,P.oht)); await yieldPage(); }
      const enc=new LociGif.Encoder(P.ow,P.oht,LociGif.palette([...cache.values()]));
      for(let j=0;j<P.n;j++){
        let img=cache.get(j); if(img) cache.delete(j); else { await draw(times[j]); img=c.getImageData(0,0,P.ow,P.oht); }
        if(job.cancelled) throw clipCancelled;
        const r=enc.frame(img.data,delay(j)); bytes+=r.bytes; if(r.same) same++;
        tick(); await yieldPage();
      }
      result={blob:enc.finish(), file:name+'.gif'};
    } else {
      const files=[], pad=n=>String(n).padStart(3,'0'); let prev=null;
      for(let j=0;j<P.n;j++){
        await draw(times[j]);
        const png=new Uint8Array(await (await new Promise((res,rej)=>out.toBlob(b=>b?res(b):rej(new Error('could not encode a PNG')),'image/png'))).arrayBuffer());
        if(job.cancelled) throw clipCancelled;
        if(prev && prev.length===png.length && prev.every((x,q)=>x===png[q])) same++;
        prev=png; files.push({name:`${v.id}-${pad(j)}.png`, bytes:png}); bytes+=png.length; tick(); await yieldPage();
      }
      const tex=`% ${v.title} on Loci, t = ${P.i.toFixed(1)} to ${P.o.toFixed(1)} s: ${link}\n% \\usepackage{animate} in the preamble; unzip the frames next to the .tex file.\n\\animategraphics[loop,autoplay,controls,width=\\linewidth]{${P.fps}}{${v.id}-}{000}{${pad(P.n-1)}}\n`;
      files.push({name:'animate.tex', bytes:new TextEncoder().encode(tex)});
      result={blob:LociGif.zip(files), file:name+'-frames.zip'};
    }
  }catch(e){
    if(e!==clipCancelled && !job.cancelled){ console.warn('loci: clip failed',e.message); msg.textContent=`Recording failed: ${e.message}`; }
  }finally{
    h.dispose(); console.info(`loci: clip ${v.id}: ${result?'finished':'stopped'} after ${done} of ${P.n} frames; recorder handle disposed`);
    if(clipJob===job) clipJob=null;
    prog.hidden=true; $('#clip-cancel').hidden=true; clipSyncUI();
  }
  if(job.cancelled){ msg.textContent='Cancelled. Nothing was saved.'; return; }
  if(!result) return;
  download(result.blob,result.file);
  const secs=(performance.now()-t0)/1000, motion=v.manifest.motion!=='static';
  const warn=motion&&same>=P.n-1?' Every frame came out identical: a recorded frame is drawn at an exact t (dt = 0), so a piece that advances by dt instead of computing from t records as a still.':motion&&same>P.n/2?` ${same} frames repeat the one before.`:'';
  msg.textContent=`Saved ${result.file} (${clipMB(result.blob.size)}, ${P.n} frames, rendered in ${secs<10?secs.toFixed(1):Math.round(secs)} s).${warn}`;
  toast(`Saved ${result.file}`);
}
function cancelClip(){ const j=clipJob; if(!j) return; j.cancelled=true; if(j.h) j.h.dispose(); }
$('#share-clip').onclick=openClip;
$('#clip-go').onclick=recordClip;
$('#clip-cancel').onclick=()=>{ cancelClip(); $('#clip-go').focus(); };
$('#clip-link').onclick=()=>{ if(!shareSl) return; const P=clipPlan(shareSl); copyText(shareURL(shareSl.v,Number.isFinite(P.i)?P.i:undefined),'Link to the in point copied'); };
['#clip-in','#clip-out','#clip-fps','#clip-size','#clip-fmt','#clip-wm'].forEach(s=>$(s).addEventListener(s==='#clip-in'||s==='#clip-out'?'input':'change',clipSyncUI));
function setPaused(on,quiet){
  if(paused===!!on) return; paused=!!on; const pz=pauseLabel();
  $$('[data-act="pause"]').forEach(b=>{ $('.ico',b).innerHTML=pz.icon; $('.lbl',b).textContent=pz.lbl; b.setAttribute('aria-label',pz.aria); });
  syncPlay(); if(!quiet) announce(paused?'Animation paused':'Animation playing');
}
function togglePause(){ setPaused(!paused); }
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
  else if(act==='distinction'){ openDrawer('explain',sl.v,opener); $('#d-body').scrollTop=0; } // the citation is the first thing in the tab
  else if(act==='full') enterFull(sl);
  else if(act==='save') toggleSave(sl);
  else if(act==='frame') saveFrame(sl);
  else if(act==='share') openShare(sl,opener);
  else if(act==='unremix'){ const f=sl.el.contains(document.activeElement); unremix(sl.v); if(f) refocus('[data-act="pause"]',sl.el); }
}

/* ---------- chips / filter ---------- */
function tagCounts(){ const m=new Map(); VIZ.forEach(v=>v.tags.forEach(t=>m.set(t,(m.get(t)||0)+1))); return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])); }
function renderChips(){
  const ti=on=>` aria-pressed="${on}" tabindex="${on?0:-1}"`;
  let h=`<button class="chip" type="button" data-chip="all"${ti(filter.type==='all')}>All<span class="n"><span class="sr">,</span> ${VIZ.length}</span></button>`;
  h+=`<button class="chip" type="button" data-chip="@foryou"${ti(filter.type==='foryou')}>For you</button>`;
  h+=`<button class="chip" type="button" data-chip="@new"${ti(filter.type==='new')}>New<span class="n"><span class="sr">,</span> ${VIZ.filter(v=>v.lane==='new').length}</span></button>`;
  if(sig.saves.length || filter.type==='saved') h+=`<button class="chip" type="button" data-chip="@saved"${ti(filter.type==='saved')}>Saved<span class="n"><span class="sr">,</span> ${sig.saves.length}</span></button>`;
  if(filter.type==='playlist') h+=`<button class="chip" type="button" data-chip="all"${ti(true)} aria-label="Playlist: ${esc(filter.name)}. Clear playlist">▶ ${esc(filter.name)} ✕</button>`;
  h+=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-chip="${esc(t)}"${ti(filter.type==='tag'&&filter.value===t)}>${esc(t)}<span class="n"><span class="sr">,</span> ${n}</span></button>`).join('');
  $('#chips').innerHTML=h;
}
function setFilter(f){
  const had=$('#chips').contains(document.activeElement);
  filter=f; renderChips(); buildFeed();
  store.set('loci:filter',f.type==='saved'||f.type==='foryou'?f.type:null,true);
  if(had){ const c=$('#chips [aria-pressed="true"]'); c.focus(); c.scrollIntoView({block:'nearest', inline:'nearest'}); }
  const n=slides.length;
  announce(f.type==='new'?`Showing ${n} new visualization${n===1?'':'s'}: checked by machine, community review of the mathematics pending`:f.type==='tag'?`Showing ${n} visualization${n===1?'':'s'} tagged ${f.value}`:f.type==='playlist'?`Playing ${n} visualizations from ${f.name}`
    :f.type==='saved'?`Showing your ${n} saved visualization${n===1?'':'s'}, in the order you saved them`:f.type==='foryou'?`Showing all ${n} visualizations, ordered by the topics you've liked, saved and watched`:`Showing all ${n} visualizations`);
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
  if(engagedSl) release(engagedSl);
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
function hideDialog(el){ if(el.hidden) return; if(el.id==='sharemodal') cancelClip(); el.hidden=true; closeModal(el); } // closing the share dialog stops a recording
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
  const v=dViz; $('#d-kicker').innerHTML=`${userLink(v.author)} · ${esc(v.license)}`; $('#d-title').textContent=v.title;
  $$('.dtab').forEach(b=>{ const on=b.dataset.dtab===dTab; b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1; });
  const body=$('#d-body'); body.setAttribute('aria-labelledby',`dtab-${dTab}`);
  const later=u=>{ body.innerHTML=`<p class="fine">Loading…</p>`; loadText(u).then(()=>{ if(dViz===v && drawer.classList.contains('open')) renderDrawer(); },()=>{ body.innerHTML=`<p class="fine">Could not load ${esc(u)}.</p>`; }); };
  if(dTab==='explain'){
    if(!v.md && v.mdUrl){ if(!texts.has(v.mdUrl)) return later(v.mdUrl); v.md=texts.get(v.mdUrl); }
    body.innerHTML=`${distBlock(v)}<div class="seg" role="group" aria-label="Explanation format"><button type="button" data-raw="0" aria-pressed="${!explainRaw}">Rendered</button><button type="button" data-raw="1" aria-pressed="${explainRaw}">explanation.md</button></div>
      ${explainRaw?`<pre class="raw">${esc(v.md)}</pre>`:`<article class="md">${md(v.md)}</article>`}
      <p class="fine">Written by ${esc(v.author)}. ${v.lane==='new'?'Checked by machine: it passed the automated gate, and two community reviewers have not yet checked the mathematics.':'The mathematics was checked by two Loci community reviewers.'} Suggest an edit with a pull request to ${esc(v.repo)}.</p>`;
    const art=$('article.md',body), pr=v.manifest.presets||[];
    if(art && pr.length){ // tappable versions of the "Try this" list, set up on the slide behind the panel
      const g=document.createElement('div'); g.className='xpresets';
      g.innerHTML=`<p class="fine" id="x-try">Tap one to set it up on the slide:</p><div class="pills" role="group" aria-labelledby="x-try">${presetPills(v)}</div>`;
      const h=$$('h3',art).find(x=>/^try this$/i.test(x.textContent.trim()));
      if(h) h.after(g); else { art.insertAdjacentHTML('beforeend','<h3>Try this</h3>'); art.appendChild(g); }
    }
  } else if(dTab==='customize') renderCustomize(v,body);
  else {
    const tgt=runningTarget(v), wasm=tgt.runtime==='wasm';
    if(wasm && !texts.has(v.sourceUrl)) return later(v.sourceUrl);
    if(remixOpen.has(v.id)) return renderRemix(v,body,wasm);
    const rem=remixes.has(rkey(v)), src=wasm?texts.get(v.sourceUrl):rem?remixes.get(rkey(v)):moduleSource(v,tgt.id), file=wasm?v.sourceUrl.split('/').pop():tgt.id==='any'?'src/index.js':`src/${tgt.entry}`;
    const others=runnableTargets(v.manifest).filter(t=>t.id!==tgt.id&&t.id!=='any'), dl=targetById(v.manifest,'download');
    body.innerHTML=`<div class="meta"><span class="oss">open source · ${v.license}</span><span>${esc(v.repo)}</span></div>
      ${rem?`<p class="note">You are running a remix of this module (this tab only, not reviewed). <button class="linkbtn" type="button" id="src-orig">Use the original</button></p>`:''}
      <p class="fine">${wasm
        ? `Every visualization on Loci is one open-source module. This one is C with no standard library, compiled to WebAssembly by <code>build.sh</code>. The slide behind this panel runs the resulting <code>module.wasm</code> in a sandboxed worker; each frame it returns drawing commands that the site replays with the theme's colors and font.`
        : `Every visualization on Loci is one open-source module${tgt.id!=='any'?' per target':''}. This is the exact module drawing the slide behind this panel, running in a sandboxed worker. The site supplies the canvas, the clock and the theme, and resolves <code>@loci/kit</code>${tgt.render==='webgl2'?' and <code>@loci/three</code>, and draws the labels the module returns':''}.`}</p>
      ${others.length?`<p class="fine">This is the <b>${esc(TARGET_NAME[tgt.id].toLowerCase())}</b> version (<code>${esc(tgt.render)}</code>). The piece also has ${others.map(t=>`a ${esc(TARGET_NAME[t.id].toLowerCase())} version, <code>${esc(t.entry)}</code> (<code>${esc(t.render)}</code>)`).join(' and ')}, with the same explanation, parameters and presets. Switch with Mode in Customize to see it run.</p>`:''}
      <span class="flabel">${esc(file)}</span>
      <pre class="code" tabindex="0" role="region" aria-label="Source code, ${esc(file)}"><code>${esc(src)}</code></pre>
      <span class="flabel">loci.json</span>
      <pre class="code" tabindex="0" role="region" aria-label="Manifest, loci.json"><code>${esc(manifestJSON(v.manifest))}</code></pre>
      ${dl?`<span class="flabel" id="dl-l">Download</span><div class="dl-row" role="group" aria-labelledby="dl-l"><a class="btn ghost" href="${esc(dl.url)}" rel="noopener">Download ${esc(DL_FORMAT[dl.format]||dl.format)}</a><span class="fine">${esc([DL_FORMAT[dl.format]||dl.format, dl.size?kbText(dl.size):null].filter(Boolean).join(' · '))}${dl.note?`. ${esc(dl.note)}`:''}</span></div>`:''}
      <div class="btnrow"><button class="btn" type="button" id="rx-open">${rem?'Edit remix':'Remix'}</button><button class="btn ghost" type="button" id="copy-src">Copy code</button><span class="fine">Fork on GitHub is disabled in this mockup.</span></div>`;
    $('#copy-src').onclick=()=>copyText(src,'Code copied');
    $('#rx-open').onclick=()=>{ remixOpen.add(v.id); renderDrawer(); refocus('#rx-src',body); };
    if(rem) $('#src-orig').onclick=()=>{ unremix(v); refocus('#rx-open',body); };
  }
  drawer.classList.toggle('editing',dTab==='source' && remixOpen.has(v.id));
}

const DL_FORMAT={zip:'.zip archive', html:'single HTML file', app:'app'};
const kbText=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(0)} KB`:`${(n/1048576).toFixed(1)} MB`;
/* ---------- remix: edit the module and respawn the slide's worker with it ---------- */
const MOD_KEY=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent)?'⌘':'Ctrl';
function renderRemix(v,body,wasm){
  drawer.classList.add('editing');
  if(wasm){
    body.innerHTML=`<p class="note">Remixing a WebAssembly piece needs a compiler (<code>clang --target=wasm32</code>), which this mockup does not ship. Here is the C source, read-only.</p>
      <label class="flabel" for="rx-src">viz.c (read-only)</label>
      <textarea class="rx" id="rx-src" readonly spellcheck="false" wrap="off">${esc(texts.get(v.sourceUrl))}</textarea>
      <div class="btnrow"><button class="btn ghost" type="button" id="rx-dl">Download .c</button><button class="btn ghost" type="button" id="rx-done">Done</button></div>`;
    $('#rx-dl').onclick=()=>download(new Blob([texts.get(v.sourceUrl)],{type:'text/x-c'}),`${v.id}.c`);
    $('#rx-done').onclick=()=>{ remixOpen.delete(v.id); renderDrawer(); refocus('#rx-open',body); };
    return;
  }
  const tgt=runningTarget(v), orig=moduleSource(v,tgt.id), cur=drafts.has(rkey(v))?drafts.get(rkey(v)):remixes.get(rkey(v))??orig, file=tgt.id==='any'?'src/index.js':`src/${tgt.entry}`;
  body.innerHTML=`<p class="fine" id="rx-hint">Edit the module and run it on the slide behind this panel. <kbd>Tab</kbd> indents; <kbd>Shift</kbd>+<kbd>Tab</kbd>, or <kbd>Esc</kbd> then <kbd>Tab</kbd>, leaves the editor. <kbd>${MOD_KEY}</kbd>+<kbd>Enter</kbd> runs.</p>
    <label class="flabel" for="rx-src">${esc(file)}${tgt.id!=='any'?` · ${esc(TARGET_NAME[tgt.id].toLowerCase())} version`:''}${remixes.has(rkey(v))?' · remixed':''}</label>
    <textarea class="rx" id="rx-src" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-describedby="rx-hint">${esc(cur)}</textarea>
    <div class="btnrow"><button class="btn" type="button" id="rx-run">Run</button><button class="btn ghost" type="button" id="rx-revert">Revert</button><button class="btn ghost" type="button" id="rx-dl">Download .js</button><button class="btn ghost" type="button" id="rx-done">Done</button></div>
    <p class="fine" id="rx-status" role="status"></p>
    <div id="rx-errs"></div>
    <p class="fine">A remix runs in the same sandboxed worker as any upload: no network, no storage, only <code>@loci/kit</code> (and <code>@loci/three</code>). It is kept for this tab only and is not reviewed or shareable in this mockup.</p>`;
  const ta=$('#rx-src',body); let tabIndents=true;
  const run=()=>{ drafts.set(rkey(v),ta.value); runRemix(v,ta.value); };
  ta.addEventListener('input',()=>{ tabIndents=true; drafts.set(rkey(v),ta.value); });
  ta.addEventListener('keydown',e=>{
    if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); e.stopPropagation(); return run(); }
    if(e.key==='Escape' && tabIndents){ e.preventDefault(); e.stopPropagation(); tabIndents=false; return announce('Tab now moves focus out of the editor'); }
    if(e.key==='Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && tabIndents){
      e.preventDefault(); e.stopPropagation();
      if(!document.execCommand('insertText',false,'  ')){ ta.setRangeText('  ',ta.selectionStart,ta.selectionEnd,'end'); drafts.set(rkey(v),ta.value); }
    }
  });
  $('#rx-run').onclick=run;
  $('#rx-revert').onclick=()=>{ drafts.delete(rkey(v)); if(remixes.has(rkey(v))) unremix(v); else renderDrawer(); refocus('#rx-revert',body); announce('Reverted to the original module'); };
  $('#rx-dl').onclick=()=>download(new Blob([ta.value],{type:'text/javascript'}),`${v.id}.js`);
  $('#rx-done').onclick=()=>{ remixOpen.delete(v.id); renderDrawer(); refocus('#rx-open',body); };
  if(remixErrors.has(rkey(v))) showRemixError(v);
}
function showRemixError(v){
  const box=dTab==='source' && dViz===v && $('#rx-errs'); if(!box) return;
  const m=remixErrors.get(rkey(v));
  box.innerHTML=m?`<div class="rx-err" role="alert"><b>The remix stopped with an error</b><pre>${esc(m)}</pre><span class="fine">Fix it and run again, or Revert to the original.</span></div>`:'';
  if(m) $('#rx-status').textContent='';
}
/* dispose + mount: the same path a slide takes when it scrolls back into range, with the new spec */
function respawnSlide(sl){ const i=slides.indexOf(sl); if(sl.card){ sl.card.remove(); sl.card=null; } sl.fallback=null; unmount(sl); if(Math.abs(i-activeIdx)<=1) mountSlide(sl); }
function respawn(v){
  slides.forEach(sl=>{ if(sl.v===v) respawnSlide(sl); });
  $$('.slide').forEach(el=>{ const sl=slides.find(x=>x.el===el); if(sl && sl.v===v) $('.badge',el).hidden=!remixes.has(rkey(v)); });
}
function runRemix(v,src){
  remixes.set(rkey(v),src); store.set('loci:remix:'+rkey(v),src,true); dropSpecs(v); remixErrors.delete(rkey(v));
  showRemixError(v); const st=$('#rx-status'); if(st) st.textContent='Starting the remix…';
  respawn(v);
  setTimeout(()=>{ const st=$('#rx-status'), sl=slides.find(x=>x.v===v); if(!st || remixErrors.has(rkey(v))) return;
    st.textContent=sl&&sl.host&&sl.host.state==='running'?'Your remix is running on the slide.':sl&&sl.host?'Still starting…':'Saved. It runs when its slide is on screen.'; },700);
}
function unremix(v){
  remixes.delete(rkey(v)); drafts.delete(rkey(v)); remixErrors.delete(rkey(v)); store.del('loci:remix:'+rkey(v),true); dropSpecs(v);
  respawn(v); if(dTab==='source' && dViz===v) renderDrawer();
  toast(`Back to the original ${v.title}`);
}
/* Serialized state, as in docs/module-api.md section 5 (without the package hash, which this mockup does not have). */
function cfgJSON(v){ return JSON.stringify(stateOf(v),null,2); }
const embedHTML=v=>`<iframe src="${esc(shareURL(v))}" title="${esc(v.title)} on Loci" width="480" height="640" style="border:0" allow="fullscreen" loading="lazy"></iframe>`;
/* off: a note when the running target does not honor this param (the control is shown, disabled) */
function paramField(c,val,off){
  const lab=`<label class="flabel" for="${c.id}">${esc(c.label)}${c.type==='range'||c.type==='color'?` <output id="o-${c.id}">${esc(c.format(val))}</output>`:''}</label>`;
  const dis=off?` disabled aria-describedby="n-${c.id}"`:'', note=off?`<small class="fine pnote" id="n-${c.id}">${esc(off)}</small>`:'', cls=off?'field off':'field';
  if(c.type==='range') return `<div class="${cls}">${lab}<input type="range" id="${c.id}" data-pkey="${esc(c.key)}" min="${c.min}" max="${c.max}" step="${c.step}" value="${val}"${dis}>${note}</div>`;
  if(c.type==='toggle') return `<div class="${cls}"><label class="check" for="${c.id}"><input type="checkbox" id="${c.id}" data-pkey="${esc(c.key)}"${val?' checked':''}${dis}> ${esc(c.label)}</label>${note}</div>`;
  if(c.type==='select') return `<div class="${cls}">${lab}<select class="input" id="${c.id}" data-pkey="${esc(c.key)}"${dis}>${c.options.map(o=>`<option value="${esc(o.value)}"${o.value===val?' selected':''}>${esc(o.label)}</option>`).join('')}</select>${note}</div>`;
  if(c.type==='color') return `<div class="${cls}">${lab}<input type="color" id="${c.id}" data-pkey="${esc(c.key)}" value="${esc(val)}"${dis}>${note}</div>`;
  return `<div class="${cls}">${lab}<div class="nl-row"><input class="input" type="number" inputmode="numeric" id="${c.id}" data-pkey="${esc(c.key)}" min="${c.min}" max="${c.max}" step="1" value="${val}"${dis}><button class="btn ghost" type="button" data-reseed="${esc(c.key)}"${off?' disabled':''}>New seed</button></div>${note}</div>`;
}
/* The Mode control: Desktop · Mobile, for pieces with both. A target that cannot run here is disabled, with the reason. */
function modeField(v){
  if(!hasModes(v)) return '';
  const cur=tidOf(v), sl=slides.find(x=>x.v===v), caps=capsFor(sl&&sl.B?boxOf(sl):null), notes=[];
  const btns=['desktop','mobile'].map(id=>{ const why=canRun(targetById(v.manifest,id),caps); if(why) notes.push(why.reason==='webgl2'?`${TARGET_NAME[id]} needs WebGL2, which this browser does not have.`:`${TARGET_NAME[id]}: ${why.message.replace(/^This piece needs/,'needs')}.`);
    return `<button type="button" data-mode="${id}" aria-pressed="${cur===id}"${why?' disabled':''}>${TARGET_NAME[id]}</button>`; }).join('');
  const t=targetById(v.manifest,cur); if(t&&t.note) notes.unshift(`${TARGET_NAME[cur]} version: ${t.note}`);
  return `<div class="field"><span class="flabel" id="cz-mode-l">Mode</span><div class="seg" role="group" aria-labelledby="cz-mode-l"${notes.length?' aria-describedby="cz-mode-n"':''}>${btns}</div>
    <p class="fine" id="cz-mode-n">${notes.map(esc).join(' ')}${notes.length?' ':''}Switching keeps your parameters and the moment you are at.</p></div>`;
}
/* Switch every piece's preferred target; slides whose target changes remount with the same params and time. */
function setMode(v,id){
  targetPref=id; store.set(TPREF_KEY,id);
  slides.forEach((sl,i)=>{ if(Math.abs(i-activeIdx)>1 || (!sl.host && !sl.card)) return; const ch=chooseTarget(sl.v,boxOf(sl)); if(ch.id!==sl.tid || !!ch.fallback!==!!sl.fallback || ch.reason!==sl.treason) respawnSlide(sl); });
  if(dTab && dViz===v){ renderDrawer(); refocus(`[data-mode="${id}"]`,$('#d-body')); }
  announce(`${v.title}: switched to the ${TARGET_NAME[tidOf(v)].toLowerCase()} version`);
}
function renderCustomize(v,body){
  const s=getSettings(v), m=v.manifest, ctrls=paramControls(m), presets=m.presets||[], tgt=runningTarget(v);
  const offNote=c=>tgt&&Array.isArray(tgt.params)&&!tgt.params.includes(c.key)?`Not used by the ${TARGET_NAME[tgt.id].toLowerCase()} version.`:'';
  body.innerHTML=`${modeField(v)}
  <div class="field"><span class="flabel">Color scheme</span><div class="swatches">${PALETTES.map(p=>{ const c=p.id==='style'?STYLE_PAL[curStyle]:p;
    return `<button class="swatch" type="button" data-pal="${p.id}" aria-pressed="${s.palette===p.id}"><span class="dots">${['bg','fg','a1','a2'].map(k=>`<i style="background:${c[k]}"></i>`).join('')}</span>${esc(p.name)}</button>`; }).join('')}</div></div>
  <div class="field"><label class="flabel" for="cz-font">Label font</label><select class="input" id="cz-font">${FONTS.map(f=>`<option value="${f.id}"${s.font===f.id?' selected':''}>${esc(f.name)}</option>`).join('')}</select></div>
  ${ctrls.map(c=>paramField(c,s.params[c.key],offNote(c))).join('')}
  ${presets.length?`<div class="field"><span class="flabel" id="cz-try">Try this</span><div class="presets" role="group" aria-labelledby="cz-try">${presets.map((p,i)=>`<button class="preset" type="button" data-preset="${i}" data-pviz="${esc(v.id)}"><b>${esc(p.label)}</b>${p.note?`<small>${esc(p.note)}</small>`:''}</button>`).join('')}</div></div>`:''}
  <div class="field"><label class="flabel" for="cz-lw">Line width <output id="o-lw">${s.lw.toFixed(1)} px</output></label><input type="range" id="cz-lw" min="0.5" max="4" step="0.1" value="${s.lw}"></div>
  <div class="field"><label class="flabel" for="cz-speed">Animation speed <output id="o-speed">${s.speed.toFixed(2)}×</output></label><input type="range" id="cz-speed" min="0" max="3" step="0.05" value="${s.speed}"></div>
  <div class="field"><label class="check" for="cz-labels"><input type="checkbox" id="cz-labels"${s.labels?' checked':''}> Show formulas and labels</label>
    <label class="check" for="cz-all"><input type="checkbox" id="cz-all"${applyAll?' checked':''}> Apply color, font, line width and speed to every visualization</label></div>
  <div class="field"><span class="flabel" id="cz-cfg-l">Embed config</span><pre class="code" id="cz-cfg" tabindex="0" role="region" aria-labelledby="cz-cfg-l"></pre>
    <span class="flabel" id="cz-emb-l">Embed snippet</span><pre class="code wrapcode" id="cz-emb" tabindex="0" role="region" aria-labelledby="cz-emb-l"></pre>
    <div class="btnrow"><button class="btn" type="button" id="cz-copy">Copy config</button><button class="btn ghost" type="button" id="cz-copy-emb">Copy embed</button><button class="btn ghost" type="button" id="cz-reset">Reset to defaults</button></div>
    <p class="fine">The config is the share link's state: only what differs from the defaults, and the moment <i>t</i> you opened this panel at. The snippet embeds that link on a course page.</p></div>
  ${lessonFieldHTML(v)}`;
  const shared=['palette','font','lw','speed','labels'], cfg=()=>{ $('#cz-cfg').textContent=cfgJSON(v); $('#cz-emb').textContent=embedHTML(v); };
  const set=(k,val)=>{ s[k]=val; if(applyAll && shared.includes(k)) VIZ.forEach(o=>getSettings(o)[k]=val); pushTheme(); cfg(); };
  // every value goes through normalizeParams, so the module only ever sees valid params
  const setParams=next=>{ s.params=normalizeParams(m,next); pushParams(v); cfg(); };
  cfg();
  $$('[data-mode]',body).forEach(b=>b.onclick=()=>{ if(b.getAttribute('aria-pressed')!=='true') setMode(v,b.dataset.mode); });
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
  $('#cz-lw').oninput=e=>{ set('lw',+e.target.value); $('#o-lw').textContent=(+e.target.value).toFixed(1)+' px'; };
  $('#cz-speed').oninput=e=>{ set('speed',+e.target.value); $('#o-speed').textContent=(+e.target.value).toFixed(2)+'×'; };
  $('#cz-labels').onchange=e=>set('labels',e.target.checked);
  $('#cz-all').onchange=e=>{ applyAll=e.target.checked; if(applyAll){ shared.forEach(k=>VIZ.forEach(o=>getSettings(o)[k]=s[k])); pushTheme(); } };
  $('#cz-copy').onclick=()=>copyText(cfgJSON(v),'Config copied');
  $('#cz-copy-emb').onclick=()=>copyText(embedHTML(v),remixes.has(rkey(v))?'Embed copied. Remixes are not shareable, so it embeds the original.':'Embed copied');
  bindLessonField(v,body);
  $('#cz-reset').onclick=()=>{ delete settings[v.id]; pushTheme(); pushParams(v); slides.forEach(x=>{ if(x.v===v){ x.view=null; if(x.host) x.host.setView(null); } }); renderCustomize(v,body); refocus('#cz-reset',body); toast('Reset to the style defaults'); };
}

/* ---------- "Your lesson" in Customize: add the current moment as a stop, delete stops, copy one link ---------- */
const lessonDrafts=new Map(), lessonNotes=new Map(); // per piece id: the draft (also in localStorage) and the unsent note
const draftOf=v=>{ if(!lessonDrafts.has(v.id)) lessonDrafts.set(v.id,Lesson.load(v)); return lessonDrafts.get(v.id); };
function stopSummary(v,st){
  const bits=paramControls(v.manifest).filter(c=>st.p && c.key in st.p).map(c=>`${c.label} ${c.format?c.format(st.p[c.key]):st.p[c.key]}`);
  bits.push(`t = ${(st.t||0).toFixed(2)} s`); if(st.view!=null) bits.push('your view'); return bits.join(' · ');
}
function lessonListHTML(v){
  const d=draftOf(v);
  if(!d.stops.length) return `<p class="fine">No stops yet.</p>`;
  return `<ol class="ls-stops" role="list">${d.stops.map((st,i)=>`<li><span class="ls-i" aria-hidden="true">${i+1}</span><span class="ls-txt"><b>${esc(st.note||'(no note)')}</b><small>${esc(stopSummary(v,st))}</small></span>
    <button class="iconbtn" type="button" data-ls-del="${i}" aria-label="Delete stop ${i+1}${st.note?`: ${esc(st.note)}`:''}">${ICON.close}</button></li>`).join('')}</ol>`;
}
function lessonFieldHTML(v){
  const d=draftOf(v);
  return `<div class="field lesson-f" role="group" aria-labelledby="ls-h"><h3 class="flabel" id="ls-h">Your lesson</h3>
    <p class="fine" id="ls-help">Two to eight stops, each this piece's parameters, the moment <i>t</i> and your view, with one sentence. Shared as one link that steps through them. The draft is kept in this browser.</p>
    <label class="flabel" for="ls-title">Title (optional)</label><input class="input" id="ls-title" type="text" maxlength="${Lesson.MAX_TITLE}" value="${esc(d.title)}" autocomplete="off">
    <label class="flabel" for="ls-note">Note for the next stop</label><input class="input" id="ls-note" type="text" maxlength="${Lesson.MAX_NOTE}" value="${esc(lessonNotes.get(v.id)||'')}" placeholder="One sentence: what should they notice?" autocomplete="off">
    <div class="btnrow"><button class="btn" type="button" id="ls-add">Add this moment as a stop</button></div>
    <div id="ls-list">${lessonListHTML(v)}</div>
    <div class="btnrow"><button class="btn" type="button" id="ls-copy">Copy lesson link</button><button class="btn ghost" type="button" id="ls-play">Play it here</button><button class="btn ghost" type="button" id="ls-clear">Clear</button></div>
    <p class="fine" id="ls-status"></p>
    <label class="flabel" for="ls-url" hidden>Lesson link</label><input class="input mono" id="ls-url" type="text" readonly spellcheck="false" hidden></div>`;
}
function bindLessonField(v,body){
  const d=draftOf(v), status=m=>{ $('#ls-status',body).textContent=m; announce(m); };
  const relist=()=>{ $('#ls-list',body).innerHTML=lessonListHTML(v); };
  $('#ls-title',body).oninput=e=>{ d.title=e.target.value.trim().slice(0,Lesson.MAX_TITLE); Lesson.save(v,d); };
  $('#ls-note',body).oninput=e=>lessonNotes.set(v.id,e.target.value);
  $('#ls-add',body).onclick=()=>{
    if(d.stops.length>=Lesson.MAX_STOPS) return status(`A lesson has at most ${Lesson.MAX_STOPS} stops. Delete one to add another.`);
    const st=Lesson.capture(v,$('#ls-note',body).value); d.stops.push(st); Lesson.save(v,d);
    lessonNotes.delete(v.id); $('#ls-note',body).value=''; relist();
    status(`Added stop ${d.stops.length}: ${stopSummary(v,st)}.${d.stops.length===1?' Add at least one more to share it.':''}`);
  };
  $('#ls-list',body).onclick=e=>{
    const b=e.target.closest('[data-ls-del]'); if(!b) return; const i=+b.dataset.lsDel; d.stops.splice(i,1); Lesson.save(v,d); relist();
    refocus(d.stops.length?`[data-ls-del="${Math.min(i,d.stops.length-1)}"]`:'#ls-add',body); status(`Deleted stop ${i+1}. ${d.stops.length} left.`);
  };
  $('#ls-copy',body).onclick=()=>{
    if(d.stops.length<2) return status('Add at least two stops to share a lesson.');
    const url=Lesson.url(v,d), u=$('#ls-url',body); u.value=url; u.hidden=false; u.previousElementSibling.hidden=false;
    copyText(url,`Lesson link copied: ${d.stops.length} stops`);
    $('#ls-status',body).textContent=`The link is ${url.length.toLocaleString()} characters.${url.length>6000?' That is long; some chat apps cut links over about 6,000 characters, so shorten the notes.':''}`;
  };
  $('#ls-url',body).onfocus=e=>e.target.setSelectionRange(0,e.target.value.length,'backward');
  $('#ls-play',body).onclick=()=>{
    const l=d.stops.length&&Lesson.parse(d,v,'your lesson'); if(!l) return status('Add a stop first.');
    closeDrawer(); const sl=slides.find(x=>x.v===v); if(sl && sl!==curSlide()) jumpToViz(v.id);
    Lesson.play(v,l); requestAnimationFrame(()=>{ const s2=slides.find(x=>x.v===v); if(s2) refocus('[data-ls="next"]',s2.el); });
  };
  $('#ls-clear',body).onclick=()=>{
    if(!d.stops.length && !d.title) return status('The lesson is already empty.');
    d.stops=[]; d.title=''; Lesson.save(v,d); $('#ls-title',body).value=''; relist(); refocus('#ls-add',body); status('Cleared your lesson for this piece.');
  };
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
  const theme={...themeFor(v),labels:false}, params=getSettings(v).params, ch=chooseTarget(v), key=JSON.stringify([v.id,ch.id,cv.width,cv.height,theme,params,t]);
  ctx.fillStyle=theme.bg; ctx.fillRect(0,0,cv.width,cv.height);
  if(ch.fallback) return; // the poster would need a GPU this browser does not have
  if(!posters.has(key)) posters.set(key,LociHost.poster(specFor(v,ch.id),{w:r.width,h:r.height,dpr:d,box:B,theme,params,t}).then(b=>createImageBitmap(b)));
  posters.get(key).then(bm=>{ if(cv.isConnected && cv.width===bm.width) ctx.drawImage(bm,0,0); },e=>{ posters.delete(key); console.warn('loci: poster failed for',v.id,e.message); });
}
function paintThumbs(root){ requestAnimationFrame(()=>$$('canvas[data-thumb]',root).forEach(cv=>renderThumb(cv,VIZ.find(v=>v.id===cv.dataset.thumb)))); }

/* ---------- browse ---------- */
function renderBrowse(){
  const el=$('#browse');
  if(!el.firstChild){
    el.innerHTML=`<div class="wrap">
      <div class="pagehead"><div class="kicker">Catalog · ${VIZ.length} visualizations · all open source</div><h1>Browse the collection</h1>
        <p>Every piece passed the automated checks, ships with an explanation, and can be restyled from its Customize panel. Most were also reviewed by two community mathematicians; the newest are checked by machine only. Pick one to open it in the feed.</p></div>
      <div class="filters"><label class="sr" for="cat-search">Search the catalog</label><input class="input" id="cat-search" type="search" placeholder="Search titles, topics, authors" style="max-width:420px">
        <div class="chipwrap" id="cat-tags" role="group" aria-label="Filter by topic"></div></div>
      <p class="sr" id="cat-count" role="status"></p>
      <div class="grid" id="cat-grid"></div>
      ${contributorsHTML()}</div>`;
    $('#cat-search').oninput=e=>{ catQuery=e.target.value.trim().toLowerCase(); renderCatGrid(); const n=$$('#cat-grid .card[data-viz]').length; $('#cat-count').textContent=`${n} visualization${n===1?'':'s'} shown`; };
  }
  $('#cat-tags').innerHTML=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-cattag="${esc(t)}" aria-pressed="${catTags.has(t)}">${esc(t)}<span class="n"><span class="sr">,</span> ${n}</span></button>`).join('');
  renderCatGrid();
  const n=$$('#cat-grid .card[data-viz]').length; $('#cat-count').textContent=`${n} visualization${n===1?'':'s'} shown`;
}
function cardHTML(v){
  return `<button class="card" type="button" data-viz="${v.id}">
      <canvas data-thumb="${v.id}" aria-hidden="true"></canvas>
      <div class="card-body"><h3>${esc(v.title)}</h3><div class="by">${userLink(v.author,true)} · ♥ ${fmtK(v.likes)}</div>
        <div class="tline">${v.tags.map(t=>'#'+esc(t.toLowerCase())).join('  ')}</div>
        <div class="meta"><span class="oss">${v.license}</span><span>${v.lane==='new'?'checked by machine':`reviewed ${v.reviewed}`}</span></div></div></button>`;
}
function renderCatGrid(){
  const list=VIZ.filter(v=>[...catTags].every(t=>v.tags.includes(t)) && (!catQuery || (v.title+' '+v.tags.join(' ')+' '+v.author+' '+v.hook).toLowerCase().includes(catQuery)));
  $('#cat-grid').innerHTML=(list.length?list.map(v=>cardHTML(v)).join('')
    : `<p class="empty">No visualizations match. Clear a topic or try a shorter search.</p>`)
    + `<div class="card submit"><div class="card-body"><div class="kicker">Contribute</div><h3>Submit a visualization</h3>
        <ul><li>An OSI-approved license (MIT, BSD, Apache, GPL)</li><li>A loci.json manifest and one module (JS or WebAssembly) that draws from the site's theme and params</li><li>An explanation.md with the mathematics; automated checks publish it within minutes, two community reviewers check only the math</li></ul>
        <div class="btnrow"><button class="btn" type="button" data-view="submit">Run the checks and submit</button><a class="btn ghost" href="docs/submitting.md" target="_blank" rel="noopener">Read the submission guide</a><button class="btn ghost" type="button" data-post="how-we-curate">How review works</button></div></div></div>`;
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
          <div class="pb"><div class="pmeta">${p.date} · ${p.read}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p><div class="pmeta">${postAuthor(p,true)}${p.vizIds.length?` · ${p.vizIds.length} visualizations`:''}</div></div></button>`).join('')}</div>
        <aside class="side"><div class="kicker">Newsletter</div><h2>The Monthly Locus</h2><p>The month's best new visualizations, one teaching tip, and one open problem with a picture.</p>${nlForm('side')}</aside>
      </div></div>`;
  } else {
    const p=POSTS.find(x=>x.id===blogPost);
    el.innerHTML=`<div class="wrap"><div class="article">
      <button class="backlink" type="button" data-blog-back>← All posts</button>
      <div class="pmeta">${p.date} · ${p.read} · ${postAuthor(p)}</div>
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

/* ---------- submit: drop a package, run the automated gate (checks.js), submit (mockup) ---------- */
let subRunning=false, subReport=null, subPkgName='', subURLs=[];
const SUB_ICON={pass:'✓', fail:'✕', warn:'!', skip:'–'}, SUB_WORD={pass:'Pass', fail:'Fail', warn:'Warning', skip:'Skipped'};
const SUB_GROUPS=[['static','Static checks','Read from the files.'],['dynamic','Dynamic checks','Run in the sandboxed worker at 335×490, 700×300 and 1100×700, on the night, graph and high-contrast palettes, plus one run at 2× pixel ratio.'],['content','Content checks','']];
const SUB_SAMPLE='elliptic-group-law', SUB_FAIL_SAMPLE='times-table', SUB_GPU_SAMPLE='hopf-fibers'; // the GPU sample has two targets: three.js on desktop, canvas2d on mobile; the passing and GPU samples declare pointer input. The failing one is built from a legacy draw() piece
function renderSubmit(){
  const el=$('#submit'); if(el.firstChild) return;
  el.innerHTML=`<div class="wrap sub">
    <div class="pagehead"><div class="kicker">Submit · automated checks</div><h1>Submit a visualization</h1>
      <p>Drop your package and the automated gate from the <a href="docs/review-pipeline.md" target="_blank" rel="noopener">review pipeline</a> runs here, in your browser, in the same sandbox as the feed. It takes about a minute. Nothing is uploaded until every check passes and you press Submit. First time? Read the <a href="docs/submitting.md" target="_blank" rel="noopener">submission guide</a>.</p></div>
    <div class="sub-in" id="sub-in">
      <button class="dropzone" type="button" id="sub-drop" aria-describedby="sub-drop-hint"><span class="dz-ico" aria-hidden="true"><svg class="i" viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v6.5h14V13"/></svg></span><b>Drop a folder or .zip here</b><span>or press to choose a folder</span></button>
      <p class="fine" id="sub-drop-hint">A folder or .zip with loci.json, index.js (or module.wasm, or one entry per target such as index.js and mobile.js), explanation.md and LICENSE, up to 4 MB.</p>
      <input type="file" id="sub-dir" webkitdirectory multiple hidden>
      <input type="file" id="sub-zip" accept=".zip,application/zip" hidden>
      <div class="btnrow"><button class="btn ghost" type="button" id="sub-zip-btn">Choose a .zip</button><button class="btn ghost" type="button" data-sample="pass">Try a sample package</button><button class="btn ghost" type="button" data-sample="fail">Try a sample that fails</button><button class="btn ghost" type="button" data-sample="gpu">Try a GPU sample</button></div>
      <p class="fine" id="sub-pkg"></p>
    </div>
    <section class="sub-run" id="sub-run" aria-labelledby="sub-run-h" hidden>
      <h2 class="sub-h" id="sub-run-h">Running the checks</h2>
      <div class="pbar" id="sub-bar" role="progressbar" aria-labelledby="sub-run-h" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><span></span></div>
      <p class="sub-label" id="sub-label"></p>
      <figure class="sub-prev"><figcaption class="flabel">What the checker sees</figcaption><div class="sub-canv" id="sub-preview"></div>
        <p class="fine">Each run mounts your module on its own canvas: the box is drawn inside a 24 px margin that must stay the background color.</p></figure>
    </section>
    <section class="sub-report" id="sub-report" aria-labelledby="sub-sum" hidden></section>
  </div>`;
  const drop=$('#sub-drop'), dir=$('#sub-dir'), zip=$('#sub-zip');
  drop.onclick=()=>dir.click();
  $('#sub-zip-btn').onclick=()=>zip.click();
  dir.onchange=()=>{ const l=[...dir.files]; dir.value=''; if(l.length) loadPkg(()=>filesPkg(l)); };
  zip.onchange=()=>{ const f=zip.files[0]; zip.value=''; if(f) loadPkg(()=>zipPkg(f)); };
  $$('[data-sample]',el).forEach(b=>b.onclick=()=>loadPkg(()=>LociChecks.samplePackage(vizById(b.dataset.sample==='gpu'?SUB_GPU_SAMPLE:b.dataset.sample==='fail'?SUB_FAIL_SAMPLE:SUB_SAMPLE),b.dataset.sample==='fail')));
  const over=on=>drop.classList.toggle('over',on);
  el.addEventListener('dragover',e=>{ if(!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect='copy'; over(true); });
  el.addEventListener('dragleave',e=>{ if(!el.contains(e.relatedTarget)) over(false); });
  el.addEventListener('drop',e=>{ e.preventDefault(); over(false); if(e.dataTransfer) loadPkg(()=>dropPkg(e.dataTransfer)); });
}
const pkgName=files=>{ const first=[...files.keys()][0]||''; return first.includes('/')?first.split('/')[0]:'package'; };
async function filesPkg(list){
  if(list.reduce((a,f)=>a+f.size,0)>16*1048576) throw new Error('That folder is over 16 MB; a package must be under 4 MB.');
  if(list.length===1 && /\.zip$/i.test(list[0].name)) return zipPkg(list[0]);
  const files=new Map(); for(const f of list) files.set(f.webkitRelativePath||f.name,{bytes:await f.arrayBuffer()});
  return {name:pkgName(files), files:LociChecks.withText(files)};
}
async function zipPkg(f){
  if(f.size>16*1048576) throw new Error('That .zip is over 16 MB; a package must be under 4 MB.');
  return {name:f.name, files:LociChecks.withText(await LociChecks.unzip(await f.arrayBuffer()))};
}
/* a dropped folder arrives as a FileSystemEntry tree; a dropped zip or loose files as plain Files */
function walkEntry(entry,prefix,out){
  if(entry.isFile) return new Promise((res,rej)=>entry.file(f=>f.arrayBuffer().then(b=>{ out.set(prefix+entry.name,{bytes:b}); res(); },rej),rej));
  const rd=entry.createReader(), all=[];
  return new Promise((res,rej)=>{ const more=()=>rd.readEntries(es=>{ if(es.length){ all.push(...es); return more(); }
    all.reduce((p,e)=>p.then(()=>walkEntry(e,prefix+entry.name+'/',out)),Promise.resolve()).then(res,rej); },rej); more(); });
}
async function dropPkg(dt){
  const entries=[...(dt.items||[])].filter(i=>i.kind==='file').map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
  if(entries.some(e=>e.isDirectory)){ const files=new Map(); for(const e of entries) await walkEntry(e,'',files); return {name:pkgName(files), files:LociChecks.withText(files)}; }
  return filesPkg([...dt.files]);
}
async function loadPkg(get){
  if(subRunning) return announce('The checks are already running.');
  const st=$('#sub-pkg'); let pkg;
  try{ pkg=await get(); }catch(e){ st.textContent=`Could not read that package: ${e.message}`; return announce(st.textContent); }
  if(!pkg.files.size){ st.textContent='That package is empty.'; return announce(st.textContent); }
  runChecks(pkg);
}
async function runChecks(pkg){
  subRunning=true; subPkgName=pkg.name; subURLs.forEach(u=>URL.revokeObjectURL(u)); subURLs=[];
  const run=$('#sub-run'), rep=$('#sub-report'), bar=$('#sub-bar'), lab=$('#sub-label'), prev=$('#sub-preview');
  $$('#sub-in button').forEach(b=>b.disabled=true);
  $('#sub-pkg').textContent=`Checking ${pkg.name}: ${pkg.files.size} file${pkg.files.size===1?'':'s'} (${[...pkg.files.keys()].map(p=>p.split('/').pop()).join(', ')}).`;
  rep.hidden=true; rep.innerHTML=''; prev.innerHTML=''; run.hidden=false;
  bar.setAttribute('aria-valuenow','0'); bar.firstElementChild.style.width='0%'; lab.textContent='Starting…';
  run.scrollIntoView({block:'nearest', behavior:reduceMotion?'auto':'smooth'});
  announce(`Running the checks on ${pkg.name}. This takes about a minute.`);
  let report;
  try{
    report=await LociChecks.run(pkg,{preview:prev, onProgress:(i,n,label)=>{
      bar.setAttribute('aria-valuemax',n); bar.setAttribute('aria-valuenow',i); bar.setAttribute('aria-valuetext',`Step ${i} of ${n}: ${label}`);
      bar.firstElementChild.style.width=`${Math.round(100*i/n)}%`; lab.textContent=label; }});
  }catch(e){ report={ok:false, checks:[{id:'runner', group:'static', title:'Checker', status:'fail', detail:`The checker crashed: ${e.message}`}], counts:{total:1,pass:0,fail:1,warn:0,skip:0}, durationMs:0, posterBlob:null}; }
  subRunning=false; run.hidden=true; $$('#sub-in button').forEach(b=>b.disabled=false);
  renderReport(report);
}
const subURL=b=>{ const u=URL.createObjectURL(b); subURLs.push(u); return u; };
function whereText(w){
  if(!w) return '';
  return [w.size, w.palette, w.dpr>1?`dpr ${w.dpr}`:null, w.t!=null?`t = ${w.t} s`:null, w.param||null].filter(Boolean).join(' · ');
}
/* Sections of the report: without targets, static / dynamic / content as before. With targets: the checks every target
   shares, then one section per target (its static and dynamic checks), then content. */
function reportGroups(r){
  const ts=(r.targets||[]).filter(t=>t.id!=='any');
  if(!ts.length) return SUB_GROUPS.map(([g,h,d])=>[g,h,d,r.checks.filter(k=>k.group===g)]);
  const shared=r.checks.filter(k=>k.group!=='content' && (k.target==null||k.target==='any'));
  return [['shared','Shared checks','The manifest, its targets, license, explanation, alt text, presets and metadata: one package, one id, for every target.',shared],
    ...ts.map(t=>[`t-${t.id}`,`${TARGET_NAME[t.id]} target`,`${t.entry} · ${t.render}. ${t.ran?t.matrix:t.note}`,r.checks.filter(k=>k.target===t.id)]),
    ['content','Content checks','',r.checks.filter(k=>k.group==='content')]];
}
function renderReport(r){
  subReport=r; const c=r.counts, el=$('#sub-report'), secs=Math.round(r.durationMs/1000);
  const sum=`Passed ${c.pass} of ${c.total} checks · ${c.fail} failed${c.warn?` · ${c.warn} warning${c.warn===1?'':'s'}`:''} · ${secs} s`;
  const row=k=>{ const w=whereText(k.where), fr=k.frame?subURL(k.frame):null;
    return `<li class="ck ck-${k.status}"><span class="ck-ico" aria-hidden="true">${SUB_ICON[k.status]}</span>
      <div class="ck-main"><p class="ck-top"><span class="ck-st">${SUB_WORD[k.status]}</span><span class="sr">: </span><span class="ck-t">${esc(k.title)}</span></p>
        <p class="ck-d">${esc(k.detail)}</p>${w?`<p class="ck-w"><span class="sr">Where: </span>${esc(w)}</p>`:''}</div>
      ${fr?`<a class="ck-fr" href="${fr}" target="_blank" rel="noopener"><img src="${fr}" alt="The frame where “${esc(k.title)}” failed${w?`, ${esc(w)}`:''}"></a>`:''}</li>`; };
  el.innerHTML=`<div class="sub-sum ${r.ok?'ok':'bad'}">
      <div class="kicker">${esc(subPkgName)}${r.manifest&&r.manifest.id?` · ${esc(r.manifest.id)}`:''}</div>
      <h2 id="sub-sum" tabindex="-1">${esc(sum)}</h2>
      <p class="fine">${r.ok?'Nothing failed, so you can submit. Warnings are shown to the reviewers but do not block.':'Fix what failed and drop the package again. Warnings do not block.'}${c.skip?` ${c.skip} skipped check${c.skip===1?' is':'s are'} listed but not counted.`:''} The frame budget is measured over ${r.playSeconds||6} s per run here; the pipeline plays 20 s.</p>
      <div class="btnrow"><button class="btn" type="button" id="sub-go"${r.ok?'':' disabled aria-describedby="sub-go-why"'}>Submit</button><button class="btn ghost" type="button" id="sub-json">Download report.json</button></div>
      ${r.ok?'':'<p class="fine" id="sub-go-why">Submit is enabled once no check fails.</p>'}
      <div id="sub-done"></div></div>
    ${reportGroups(r).map(([g,h,d,ks])=>{ if(!ks.length) return '';
      const f=ks.filter(k=>k.status==='fail').length, sk=ks.filter(k=>k.status==='skip').length;
      return `<section class="ck-group" aria-labelledby="ckg-${g}"><h3 class="sub-h" id="ckg-${g}">${esc(h)} <span class="ck-n">${ks.filter(k=>k.status==='pass').length} passed${f?`, ${f} failed`:''}${sk===ks.length?', skipped':''}</span></h3>${d?`<p class="fine">${esc(d)}</p>`:''}
        <ul class="cklist">${ks.map(row).join('')}</ul></section>`; }).join('')}`;
  el.hidden=false;
  $('#sub-json').onclick=()=>{
    const out={package:subPkgName, ok:r.ok, summary:sum, durationMs:r.durationMs, playSecondsPerRun:r.playSeconds, packageHash:r.packageHash, moduleHash:r.moduleHash, manifest:r.manifest,
      targets:r.targets, moduleHashes:r.moduleHashes,
      checks:r.checks.map(k=>({id:k.id, group:k.group, ...(k.target?{target:k.target}:{}), title:k.title, status:k.status, detail:k.detail, ...(k.where?{where:k.where}:{}), ...(k.frame?{frame:'captured (shown in the page, not included here)'}:{})}))};
    download(new Blob([JSON.stringify(out,null,2)+'\n'],{type:'application/json'}),'report.json'); toast('Saved report.json');
  };
  $('#sub-go').onclick=()=>{ if(!r.ok) return;
    const msg="Submitted. Your piece is live in the New lane with a 'Checked by machine' badge (mockup: nothing was uploaded).";
    $('#sub-done').innerHTML=`<div class="nl-ok sub-ok" role="status" tabindex="-1"><strong>${esc(msg)}</strong>${r.posterBlob?`<figure><img src="${subURL(r.posterBlob)}" alt="Poster frame of ${esc(r.manifest.title||'the piece')} at t = ${((Number.isFinite(r.manifest.t0)?r.manifest.t0:0)+6)} s"><figcaption class="fine">The poster, captured at t = t0 + 6 at 700×300 on the night palette${r.posterTarget&&r.posterTarget!=='any'?`, from the ${esc(TARGET_NAME[r.posterTarget].toLowerCase())} target`:''}.</figcaption></figure>`:''}</div>`;
    $('#sub-go').disabled=true; refocus('.sub-ok',el);
  };
  $('#sub-sum').focus({preventScroll:true}); $('#sub-sum').scrollIntoView({block:'start', behavior:'auto'});
  announce(`Checks finished. ${sum}.${r.ok?' You can submit.':' Submit stays disabled until nothing fails.'}`);
}

/* ---------- views ---------- */
function showView(v){
  view=v;
  if(v!=='user') $$('.tab').forEach(t=>{ const on=t.dataset.view===v; t.setAttribute('aria-selected',on); t.tabIndex=on?0:-1; }); // a profile keeps the tab it was opened from
  $('#chips').hidden=v!=='feed'; $('#feednav').hidden=v!=='feed'; feed.classList.toggle('away',v!=='feed');
  $('#browse').hidden=v!=='browse'; $('#blog').hidden=v!=='blog'; $('#submit').hidden=v!=='submit'; $('#user').hidden=v!=='user';
  if(v!=='feed'){ closeDrawer(); exitFull(); if(engagedSl) release(engagedSl,true); }
  if(v==='browse') renderBrowse();
  if(v==='blog') renderBlog();
  if(v==='submit') renderSubmit();
  if(v==='user') renderUser();
  syncPlay();
}
function jumpToViz(id){
  let i=feedList().findIndex(v=>v.id===id);
  if(i<0){ setFilter({type:'all'}); i=VIZ.findIndex(v=>v.id===id); }
  showView('feed'); requestAnimationFrame(()=>{ slideEls[i].scrollIntoView({block:'start'}); feed.focus({preventScroll:true}); });
}

/* ---------- keyboard shortcuts dialog, signals, newsletter forms ---------- */
function openKeys(opener){ renderSignals(); showDialog('#keysmodal',null,opener); }
function renderSignals(){
  const w=Object.values(sig.watch).reduce((a,b)=>a+b,0), n=(x,one)=>`${x} ${one}${x===1?'':'s'}`;
  $('#sig-sum').textContent=`Stored only in this browser: ${n(sig.likes.length,'like')}, ${n(sig.saves.length,'saved piece')}, ${w<60?n(Math.round(w),'second'):n(Math.round(w/60),'minute')} watched.`;
}
$('#sig-reset').onclick=()=>{
  sig.likes=[]; sig.saves=[]; sig.watch={}; saveSignals();
  VIZ.forEach(v=>v.liked=false);
  slides.forEach(sl=>{ const b=$('[data-act="like"]',sl.el), lk=likeLabel(sl.v); b.classList.remove('on'); b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl;
    const sv=$('[data-act="save"]',sl.el); sv.classList.remove('on'); sv.setAttribute('aria-pressed','false'); });
  if(filter.type==='saved'||filter.type==='foryou') setFilter({type:'all'}); else renderChips();
  renderSignals(); announce('Your likes, saved pieces and watch time were cleared'); toast('Signals reset');
};
/* Seconds watched per piece, for For you: counted while a slide is on screen and playing. */
let watchTicks=0;
setInterval(()=>{
  const sl=curSlide(); if(view!=='feed' || document.hidden || !sl || !sl.host || !sl.host.playing) return;
  sig.watch[sl.v.id]=(sig.watch[sl.v.id]||0)+1; if(++watchTicks%5===0) store.set('loci:watch',sig.watch);
},1000);
addEventListener('pagehide',()=>store.set('loci:watch',sig.watch));
document.addEventListener('submit',e=>{
  const f=e.target.closest('.nl-form'); if(!f) return; e.preventDefault();
  const inp=$('input[type="email"]',f), err=$('.nl-err',f), val=inp.value.trim();
  if(!err.id) err.id=inp.id+'-err';
  const bad=m=>{ err.hidden=false; err.textContent=m; };
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ bad('Enter an email address like name@university.edu.'); inp.setAttribute('aria-invalid','true'); inp.setAttribute('aria-describedby',err.id); inp.focus(); return; }
  inp.removeAttribute('aria-invalid');
  const lists=$$('input[name="lists"]:checked',f).map(c=>NL_LISTS.find(l=>l[0]===c.value)[1]);
  if(!lists.length){ bad('Pick at least one list.'); $('input[name="lists"]',f).focus(); return; }
  const host=f.parentElement, names=lists.length>1?lists.slice(0,-1).join(', ')+' and '+lists[lists.length-1]:lists[0];
  f.outerHTML=`<div class="nl-ok" role="status" tabindex="-1"><strong>You're subscribed to ${esc(names)}.</strong><span class="fine">${lists.includes('Best of the month')?`The first Best of the month goes to ${esc(val)} on Tuesday, November 3.`:`The next issue goes to ${esc(val)}.`} This is a mockup, so nothing was actually sent.</span></div>`;
  refocus('.nl-ok',host); // the form that had focus is gone
});

/* ---------- style switch ---------- */
function setStyle(s){
  if(!STYLE_PAL[s]) s='night';
  curStyle=s; document.documentElement.dataset.style=s;
  $$('[data-style-btn]').forEach(b=>b.setAttribute('aria-checked',b.dataset.styleBtn===s));
  $('#style-btn').setAttribute('aria-label',`Style: ${STYLE_NAME[s]}`);
  relayout(); pushTheme(); requestAnimationFrame(updateParallax);
  if(dTab==='customize') renderDrawer();
  if(view==='browse') renderCatGrid();
  if(view==='blog') paintThumbs($('#blog'));
  if(view==='user') paintThumbs($('#user'));
}
window.addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(STYLE_PAL[h]) setStyle(h); });
addEventListener('resize',()=>readPads());
document.addEventListener('visibilitychange',syncPlay);
document.addEventListener('fullscreenchange',relayout);
new ResizeObserver(()=>{ document.documentElement.style.setProperty('--top-h',$('#topbar').offsetHeight+'px'); relayout(); }).observe($('#topbar'));
Object.keys(STYLE_DESC).forEach(k=>$(`#sd-${k}`).textContent=STYLE_DESC[k]);

/* parallax style: the feed's scroll offset and the pointer drive the layer transforms in CSS (--p, --H, --mx, --my) */
let paraQueued=false;
function updateParallax(){
  paraQueued=false;
  if(curStyle!=='parallax' || reduceMotion) return;
  const H=feed.clientHeight||1, st=feed.scrollTop; feed.style.setProperty('--H',H+'px');
  for(const el of slideEls){ const p=(el.offsetTop-st)/H; if(p>-1.5 && p<1.5) el.style.setProperty('--p',p.toFixed(4)); }
}
feed.addEventListener('scroll',()=>{ if(!paraQueued){ paraQueued=true; requestAnimationFrame(updateParallax); } },{passive:true});
$('#screen').addEventListener('pointermove',e=>{
  if(curStyle!=='parallax' || reduceMotion || e.pointerType==='touch') return;
  const s=e.currentTarget, r=s.getBoundingClientRect();
  s.style.setProperty('--mx',(((e.clientX-r.left)/r.width-.5)*2).toFixed(3)); s.style.setProperty('--my',(((e.clientY-r.top)/r.height-.5)*2).toFixed(3));
});
$('#screen').addEventListener('pointerleave',e=>{ e.currentTarget.style.setProperty('--mx',0); e.currentTarget.style.setProperty('--my',0); });

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
  const cm=t.closest('[data-close-modal]'); if(cm) return hideDialog(cm.closest('.modal'));
  if(t.classList.contains('modal')) return hideDialog(t);
  // composedPath, not closest: a drawer button may have re-rendered (and detached) itself before the click reaches here
  const path=e.composedPath();
  if(dTab && !path.includes(drawer) && !t.closest('.modal') && !t.closest('#toast')) return closeDrawer();
  const ub=t.closest('[data-user]'); if(ub) return openUser(ub.dataset.user,ub);
  if(t.closest('[data-user-back]')) return closeUser();
  const vb=t.closest('[data-view]'); if(vb){ if(vb.dataset.view==='blog') blogPost=null; return showView(vb.dataset.view); }
  const pb=t.closest('[data-post]'); if(pb) return openPost(pb.dataset.post);
  if(t.closest('[data-blog-back]')) return openPost(null);
  const pl=t.closest('[data-playlist]'); if(pl){ const p=POSTS.find(x=>x.id===pl.dataset.playlist); setFilter({type:'playlist', ids:p.vizIds, name:p.title}); showView('feed'); return feed.focus({preventScroll:true}); }
  const pr=t.closest('[data-preset]'); if(pr){ const v=vizById(pr.dataset.pviz); if(v) applyPreset(v,+pr.dataset.preset); return; }
  const vz=t.closest('[data-viz]'); if(vz) return jumpToViz(vz.dataset.viz);
  const ch=t.closest('[data-chip]'); if(ch){ const c=ch.dataset.chip; return setFilter(c==='all'?{type:'all'}:c==='@saved'?makeFilter('saved'):c==='@foryou'?makeFilter('foryou'):c==='@new'?makeFilter('new'):{type:'tag',value:c}); }
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
  // an engaged piece gets the keys, except Esc (release), Tab and modifier shortcuts
  if(engagedSl && !top){
    const sl=engagedSl, p=ptrOf(sl);
    if(e.key==='Escape' && styleMenu.hidden){ e.preventDefault(); return release(sl); }
    if(p && p.keys && e.key!=='Tab' && e.key!=='Escape' && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target.closest&&e.target.closest('input,select,textarea,[role="menu"]'))){ e.preventDefault(); return sl.host.input(e); }
  }
  if(e.key==='Enter' && !top){ const sl=slides.find(x=>x.canvas===e.target); if(sl && ptrOf(sl) && !sl.engaged){ e.preventDefault(); return engage(sl); } }
  if(e.key==='Escape'){ if(!styleMenu.hidden) return closeMenu(true); if(top) return closeTopModal(); if(document.body.classList.contains('immersive')) return exitFull(); if(view==='user') return closeUser();
    if(lessonPlay && view==='feed' && curSlide() && curSlide().v===lessonPlay.v) return Lesson.exit(); return; }
  if(e.key==='Tab' && top) return trapTab(e,top.el);
  if(top || (e.target.closest && e.target.closest('input,select,textarea,[role="menu"]')) || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.key==='?' || (e.code==='Slash' && e.shiftKey)){ e.preventDefault(); return openKeys(); }
  if(view!=='feed') return;
  const k=e.key.toLowerCase(), sl=curSlide();
  if(k==='arrowdown'||k==='j'||k==='pagedown'){ e.preventDefault(); goTo(activeIdx+1); }
  else if(k==='arrowup'||k==='k'||k==='pageup'){ e.preventDefault(); goTo(activeIdx-1); }
  else if(!sl) return;
  else if(lessonPlay && lessonPlay.v===sl.v && (k==='arrowleft'||k==='arrowright')){ e.preventDefault(); Lesson.step(k==='arrowright'?1:-1); } // an engaged piece got them first
  else if(k==='f'){ (document.fullscreenElement||document.body.classList.contains('immersive'))?exitFull():enterFull(sl); }
  else if(k==='e') openDrawer('explain',sl.v);
  else if(k==='c') openDrawer('customize',sl.v);
  else if(k==='s') openDrawer('source',sl.v);
  else if(k==='p') togglePause();
  else if(k==='l') like(sl);
  else if(k==='b') toggleSave(sl);
  else if(k===','||k==='.'){ e.preventDefault(); seekBy(sl,k===','?-0.1:0.1); }
  else if(k==='['||k===']'){ e.preventDefault(); seekBy(sl,k==='['?-1:1); }
  else if(k==='0'){ e.preventDefault(); seekBy(sl,0,true); }
});
let toastTimer;
function toast(msg){ const t=$('#toast'); t.textContent=msg; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.textContent='',3200); }

/* ---------- boot ---------- */
setStyle(location.hash.slice(1));
{ // a share link (?v=&p=) wins over the filter remembered for this tab
  const link=readLink(), pref=store.get('loci:filter',null,true);
  if(pref==='foryou' || (pref==='saved' && sig.saves.length)) filter=makeFilter(pref);
  if(link){ settings[link.v.id]=link.s; if(!feedList().includes(link.v)) filter={type:'all'}; }
  readPads(); renderChips(); buildFeed();
  if(link){
    const i=slides.findIndex(x=>x.v===link.v), sl=slides[i];
    if(link.t!=null) sl.t=link.t;
    if(link.view!=null) sl.view=link.view;
    if(i>0){ feed.scrollTop=slideEls[i].offsetTop; activeIdx=i; onActiveChange(); }
    if(link.lesson) Lesson.play(link.v,link.lesson); // sets stop 1's params, t and view before mountPolicy mounts the slide
  }
}
