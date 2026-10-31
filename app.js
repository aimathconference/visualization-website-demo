/* ---------- the theme, palettes, fonts ----------
   One look: the demo's Night theme (demo/public, styles.css :root). The six mockup styles are retired; a #night,
   #chalk ... hash from an old link is ignored. STYLE_PAL is the theme's palette for the workers (and the Submit checks). */
const STYLE_PAL = {
  night:{bg:'#050508', fg:'#ecebf5', a1:'#ff2e74', a2:'#22e0e8'},
};
const STYLE_FONT = { night:'"Manrope", system-ui, sans-serif' };
const PALETTES = [
  {id:'style', name:'Its own colors (default)'},
  {id:'viridis', name:'Viridis', bg:'#100c24', fg:'#f1f1e6', a1:'#fde725', a2:'#22a884'},
  {id:'ink', name:'Ink on paper', bg:'#fbfaf5', fg:'#1b1b1b', a1:'#b3261e', a2:'#33598f'},
  {id:'solar', name:'Solarized', bg:'#002b36', fg:'#eee8d5', a1:'#cb4b16', a2:'#2aa198'},
  {id:'contrast', name:'High contrast', bg:'#000000', fg:'#ffffff', a1:'#ffd400', a2:'#00b3ff'},
];
const FONTS = [
  {id:'style', name:'Manrope (default)'},
  {id:'stix', name:'STIX Two Text (math serif)', css:'"STIX Two Text", "Times New Roman", serif'},
  {id:'plex', name:'IBM Plex Mono', css:'"IBM Plex Mono", ui-monospace, monospace'},
  {id:'atkinson', name:'Atkinson Hyperlegible', css:'"Atkinson Hyperlegible", system-ui, sans-serif'},
  {id:'kalam', name:'Kalam (handwritten)', css:'"Kalam", "Comic Sans MS", cursive'},
  {id:'unbounded', name:'Unbounded', css:'"Unbounded", "Arial Black", sans-serif'},
];
const ICON = {
  trash:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg>',
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
  more:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/></svg>',
  focus:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5V4h4.5M20 8.5V4h-4.5M4 15.5V20h4.5M20 15.5V20h-4.5"/><circle cx="12" cy="12" r="3.2"/></svg>',
  present:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5h17v11h-17zM12 16v3.5M8 20h8"/></svg>',
};

/* ---------- app state ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* The site's name (config.js SITE_NAME, or the demo server's siteName once api/whoami has answered). "Loci" stays in identifiers only. */
const site=()=>LociAPI.siteName();
function applySiteName(){
  const n=site(), b=$('.brand'), set=(sel,v)=>{ const m=document.querySelector(sel); if(m) m.setAttribute('content',v); };
  $('.brand-name').textContent=n; if(b) b.setAttribute('aria-label',`${n} home`);
  if(!EMBED) document.title=`${n} Math Feed`;
  set('meta[property="og:site_name"]',n); set('meta[property="og:title"]',`${n}: visual mathematics, curated`); set('meta[name="twitter:title"]',`${n}: visual mathematics, curated`);
}
/* Touch wording (docs/ideas/round2/203, phase 1): on touch screens (no hover, coarse pointer), the few desktop instructions in explanations
   and questions ("scrub with , and .", "Esc (or a click outside)", "Click the piece", "scroll to zoom") read as touch.
   Applied where those texts are rendered (the Explanation tab, the question of the week, Ask); the raw explanation.md view keeps the author's text. */
const TOUCH_COPY=[
  [/scrub with , and \. \(or \[ and \] for whole seconds, or drag sideways on the stage\)/g, 'scrub by dragging sideways on the stage'],
  [/Esc \(or a click outside\) hands scrolling back/g, 'A tap outside hands scrolling back'],
  [/\b([Cc])lick \(or tap\) the piece/g, (m,c)=>c==='C'?'Tap the piece':'tap the piece'],
  [/\b([Cc])lick (the piece|in the box|into it)/g, (m,c,w)=>(c==='C'?'Tap ':'tap ')+w],
  [/\bscroll \(or pinch\) to zoom/g, 'pinch to zoom'],
  [/\b([Pp])ress (Answer|Submit)\b/g, (m,p,w)=>(p==='P'?'Tap ':'tap ')+w],
];
function touchCopy(s){ s=String(s); if(!matchMedia('(hover:none) and (pointer:coarse)').matches) return s; for(const [re,to] of TOUCH_COPY) s=s.replace(re,to); return s; }
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr=()=>Math.min(2, window.devicePixelRatio||1);
const fmtK=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k':String(n);
/* Markdown with TeX: math spans are lifted out before marked (tex.js, the same tokenizer the Explanation check uses)
   and come back as raw TeX in <code>; LociTeX.typeset() then loads KaTeX on the page, only when there is math. */
/* Explanations are written by contributors, and marked passes HTML through, so everything goes through DOMPurify before
   it reaches the page. No sanitizer, no HTML: the raw text is shown instead. Images are refused (an image from another
   server tells it who is reading), and so are data-* attributes the page's click handlers would answer to. */
const MD_SAFE={USE_PROFILES:{html:true}, ALLOW_DATA_ATTR:false, ADD_ATTR:['data-tex','data-display'],
  FORBID_TAGS:['img','picture','source','svg','math','style','form','input','button','select','textarea','iframe','object','embed','audio','video','link','meta','base','dialog','details','summary'],
  FORBID_ATTR:['style','id','name','srcset','ping','target','tabindex','accesskey','autofocus','contenteditable','draggable','role'],
  ALLOWED_URI_REGEXP:/^(?:https?:|#|(?![a-z][a-z0-9+.-]*:))/i};
const MD_CLASS=/^(?:tex|tex-d|texblock|language-[\w-]+)$/;
if(window.DOMPurify) DOMPurify.addHook('uponSanitizeAttribute',(_,d)=>{ if(d.attrName==='class') d.attrValue=d.attrValue.split(/\s+/).filter(c=>MD_CLASS.test(c)).join(' '); });
const md=s=>{
  if(!window.marked || !window.DOMPurify) return `<pre class="raw">${esc(s)}</pre>`;
  if(!window.LociTeX) return DOMPurify.sanitize(marked.parse(s),MD_SAFE);
  const p=LociTeX.protect(s); return DOMPurify.sanitize(p.html(marked.parse(p.src)),MD_SAFE);
};
const typeset=el=>{ if(window.LociTeX && el) LociTeX.typeset(el); };
/* A short plain-text note (preset, lesson stop, collection item, question) with $…$ math: escaped text, math lifted out as in md(),
   so typeset() can render it. Without tex.js it is the escaped text; offline, the raw TeX stays in <code>, as in explanations. */
const texText=s=>{ s=String(s==null?'':s); if(!window.LociTeX) return esc(s); const p=LociTeX.protect(s); return p.count?p.html(esc(p.src)):esc(s); };
/* set an element's note and typeset it; re-place the slide's overlays once KaTeX has changed its size */
const texInto=(el,s,sl)=>{ el.innerHTML=texText(s); if(window.LociTeX && el.querySelector('.tex')) LociTeX.typeset(el).then(()=>{ if(sl && el.isConnected) placeOverlays(sl); }); };

let curStyle='night', view='feed', filter={type:'all'}, slides=[], slideEls=[], activeIdx=0, pads={t:0,r:0,b:0,l:0};
const EMBED=new URLSearchParams(location.search).get('embed')==='1'; let embedSl=null; // ?embed=1: one piece, minimal chrome (see "embed mode")
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
/* Playground remixes posted on the demo server (api.js, "Post to Playground"), as pieces of their own: 'pg-<id>'.
   Only your own: the server sends nobody else's. Not reviewed, never in All or the catalog; the Playground chip plays
   them. Empty as static files. */
const PLAYGROUND=[];
const STARTERS=[]; // the New piece, once opened (see "New")
const vizById=id=>VIZ.find(v=>v.id===id)||PLAYGROUND.find(v=>v.id===id)||STARTERS.find(v=>v.id===id); // STARTERS: the New piece (see "New")
const idList=x=>Array.isArray(x)?[...new Set(x.filter(id=>typeof id==='string' && vizById(id)))]:[];
/* Personal signals: likes, saved pieces (in save order) and seconds watched per piece. Kept in this browser, or on the
   demo server when the page is served by it (api.js); loadSignals runs once LociAPI.ready has settled. */
const sig={likes:[], saves:[], watch:{}};
function loadSignals(){
  sig.likes=idList(LociAPI.likes.get()); sig.saves=idList(LociAPI.saves.get()); sig.watch={};
  const w=LociAPI.signals.get(); if(w && typeof w==='object') for(const id in w) if(vizById(id) && Number.isFinite(w[id]) && w[id]>0) sig.watch[id]=w[id];
  VIZ.forEach(v=>v.liked=sig.likes.includes(v.id)); PLAYGROUND.forEach(v=>v.liked=sig.likes.includes(v.id));
}
const saveSignals=()=>{ LociAPI.likes.set(sig.likes); LociAPI.saves.set(sig.saves); LociAPI.signals.set(sig.watch); };
/* ---------- targets (docs/module-api.md, "Targets"): which of a piece's modules runs in this browser ----------
   The viewer's choice from the Mode control is kept in localStorage ('loci.target'); ?mode=desktop|mobile in a link
   is the preference for that load only. targetFor (manifest.js) honors a preference only if that target can run here. */
const TPREF_KEY='loci.target', isMode=x=>x==='desktop'||x==='mobile';
const urlMode=(m=>isMode(m)?m:null)(new URLSearchParams(location.search).get('mode'));
let targetPref=urlMode||(m=>isMode(m)?m:null)(store.get(TPREF_KEY,null));
const hasModes=v=>{ const ids=runnableTargets(v.manifest).map(t=>t.id); return ids.includes('desktop')&&ids.includes('mobile'); };
/* a collection item may carry the mode it was captured in; it wins over the viewer's preference for that piece while the collection plays */
const pieceMode=new Map();
const capsFor=(box,pref=targetPref)=>({...LociHost.caps(), ...(pref?{preferred:pref}:{}), ...(box?{box:{w:box.w,h:box.h}}:{})});
/* a browser that cannot run the sandbox gets the fallback card and a still, never the module on the page */
const NO_SANDBOX={reason:'browser', message:'This browser can’t run visualizations safely'};
const chooseTarget=(v,box)=>{ const ch=targetFor(v.manifest,capsFor(box,pieceMode.get(v.id)||targetPref)); return LociHost.supported?ch:{...ch, fallback:NO_SANDBOX}; };
/* the slide showing a piece: a feed slide, or the one stage of embed mode (embedSl) */
const slOf=v=>slides.find(x=>x.v===v)||(embedSl&&embedSl.v===v?embedSl:null);
/* the target a piece is running (or would run) here */
function tidOf(v){ const sl=slOf(v); return (sl&&sl.tid)||chooseTarget(v).id; }
const runningTarget=v=>targetById(v.manifest,tidOf(v))||runnableTargets(v.manifest)[0];
/* Remixes: edited module source per piece, for this tab only (sessionStorage). Drafts (the editor's text, run or not)
   are kept in this browser (localStorage, 'loci:draft:<rkey>') until Revert, so an edit survives a reload. */
const remixes=new Map(), drafts=new Map(), remixErrors=new Map(), remixOpen=new Set(), rxChecks=new Map();
const setDraft=(k,src)=>{ drafts.set(k,src); LociAPI.drafts.set('loci:draft:'+k,src); }, delDraft=k=>{ drafts.delete(k); LociAPI.drafts.del('loci:draft:'+k); };
/* A remix belongs to one target's module: the key is the piece id, plus "@target" for pieces that have targets. */
const rkeyFor=(v,tid)=>v.manifest.targets?`${v.id}@${tid}`:v.id;
const rkey=v=>rkeyFor(v,tidOf(v));
/* The rest of a remix's package (docs/ideas/round2/210): per piece, the editor's loci.json and explanation.md text, kept in
   this browser beside the code draft ('loci:draft2:<id>' = {manifest?, explanation?}; a field equal to the parent's is
   dropped, and an old string draft is just code). remixMan holds the loci.json fields a Run applied (this tab only,
   'loci:remixman:<id>'): the slide's caption and Try-this pills follow them; Customize and links keep the published manifest. */
const rxText=new Map(), remixMan=new Map();
/* both, from storage: run once LociAPI.ready has settled (boot, at the end) */
function loadDrafts(list=VIZ){
  list.forEach(v=>runnableTargets(v.manifest).forEach(t=>{ if(t.runtime!=='js') return; const k=rkeyFor(v,t.id), src=store.get('loci:remix:'+k,null,true), d=LociAPI.drafts.get('loci:draft:'+k,null); if(typeof src==='string') remixes.set(k,src); if(typeof d==='string') drafts.set(k,d); }));
  list.forEach(v=>{ const d=LociAPI.drafts.get('loci:draft2:'+v.id,null), m=store.get('loci:remixman:'+v.id,null,true), o={};
  if(d && typeof d==='object'){ if(typeof d.manifest==='string') o.manifest=d.manifest; if(typeof d.explanation==='string') o.explanation=d.explanation; }
  if(Object.keys(o).length) rxText.set(v.id,o); if(m && typeof m==='object' && !Array.isArray(m)) remixMan.set(v.id,m); }); }
const manOf=v=>remixMan.has(v.id)?{...v.manifest, ...remixMan.get(v.id)}:v.manifest; // presets and live links, as the running remix declares them
const presetsOf=v=>manOf(v).presets||[];
const capOf=v=>{ const m=remixMan.get(v.id)||{}; return {title:m.title||v.title, hook:m.hook||v.hook, alt:m.alt||v.alt}; };

/* ---------- serialized state (docs/module-api.md section 5): {v, p, t, theme}, non-default fields only ---------- */
const b64u={
  enc:s=>{ let b=''; for(const c of new TextEncoder().encode(s)) b+=String.fromCharCode(c); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  dec:s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))),
};
function viewOf(v){ const sl=slOf(v); return sl?(sl.host?sl.host.getView():sl.view)??null:null; }
function timeOf(v){ const sl=slOf(v); return sl?(sl.host?sl.host.getTime():sl.t):v.t0; }
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
  const o=stateOf(v,at), sl=slOf(v), mode=hasModes(v)&&sl&&sl.treason==='preferred'&&isMode(sl.tid)?`&mode=${sl.tid}`:'';
  const q=`?v=${encodeURIComponent(v.id)}`+(Object.keys(o).length>1?`&p=${b64u.enc(JSON.stringify(o))}`:'')+(cmpOn(v)?`&b=${b64u.enc(JSON.stringify(cmpCompact(v)))}`:'')+mode;
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
  const lesson=q.get('lesson')?Lesson.decode(q.get('lesson'),v):null; // ?lesson= plays its moments (section 5, "Moments")
  // &at=<1-based stop>: where a lesson link starts (Present's QR code, an embed's Open in Loci); clamped, absent means stop 1
  const atq=lesson?parseInt(q.get('at'),10):NaN, at=Number.isFinite(atq)?Math.max(0,Math.min(lesson.stops.length-1,atq-1)):0;
  // &b=<base64url json>: B's params of a comparison (docs/ideas/06-compare-two-params.md), validated like p
  let cmp=null; const bq=q.get('b');
  if(bq!=null) try{
    const pb=JSON.parse(b64u.dec(bq)); if(!pb || typeof pb!=='object' || Array.isArray(pb)) throw new Error('it is not an object of params');
    const unknown=Object.keys(pb).filter(k=>!v.manifest.params.some(p=>p.key===k)); if(unknown.length) console.warn(`loci: share link b=: dropping unknown params ${unknown.join(', ')}`);
    cmp=normalizeParams(v.manifest,pb);
  }catch(e){ console.warn(`loci: ignoring the share link's compare params (b=): ${e.message}`); cmp=null; }
  return {v, s, t:Number.isFinite(o.t)&&o.t>=0?o.t:null, view:normalizeView(o.view), lesson, at, cmp};
}
/* The host-owned theme every module receives read-only (docs/module-api.md: "Theme is not a param"). */
/* A piece's own colors (loci.json "colors", the package form of the demo's COLORS block) replace the accents on the
   default palette, as in the demo. */
function piecePalette(v){
  const pt=PageColors.active(); // the moderators' page colors replace the style's palette and the piece's own, as in the demo
  if(pt) return {bg:pt.bg, fg:pt.fg, a1:pt.accent, a2:pt.accent2};
  const c=v.manifest&&v.manifest.colors, base=STYLE_PAL[curStyle];
  return c&&curStyle==='night'&&c.main&&c.secondary?{bg:c.bg||base.bg, fg:c.fg||base.fg, a1:c.main, a2:c.secondary}:base;
}
function themeFor(v){
  const s=getSettings(v), pal=s.palette==='style'?piecePalette(v):PALETTES.find(p=>p.id===s.palette);
  const font=s.font==='style'?STYLE_FONT[curStyle]:FONTS.find(f=>f.id===s.font).css;
  return {bg:pal.bg, fg:pal.fg, a1:pal.a1, a2:pal.a2, font, lw:s.lw, labels:s.labels};
}
/* ---------- accent follows the piece (the demo's feed, demo/public/js/theme.js paintSlide and paintPage) ----------
   A piece that declares its colors (loci.json "colors", or a single-file entry's COLORS block) lends its main and
   secondary colors to the page while it is on screen: each slide's caption and rail keep their own piece's colors as
   they scroll, and the top bar, panels and dialogs take the active slide's. Each is moved toward white or black until
   it reads at 4.5:1 on the style's background and panels (or the moderators' page colors), so no style loses
   contrast; the canvas still draws the exact colors. On by default; the menu's "Accent follows the piece" turns it
   off for this browser (localStorage loci:accent-follow). The change fades in styles.css, except under reduced motion.
   The page level is set on <body>, so it never touches the page colors pagecolors.js sets on <html>. */
const ACCENT_KEY='loci:accent-follow', ACCENT_VARS=['--accent','--accent2','--accent-fill','--on-accent'];
let accentFollow=(()=>{ try{ return localStorage.getItem(ACCENT_KEY)!=='0'; }catch(_){ return true; } })();
/* the backgrounds accent text sits on: each style's --bg and --panel (styles.css), or the page colors' */
const STYLE_GROUND={night:['#050508','#101018']};
function accentGrounds(){ const pt=PageColors.active(); if(!pt) return STYLE_GROUND[curStyle]; const tk=PageColors.tokens(pt); return [tk['--bg'],tk['--panel']]; }
/* the tokens a piece lends the page, or null (no colors of its own, or the toggle is off) */
function pieceAccents(v){
  const c=v&&v.manifest&&v.manifest.colors; if(!accentFollow || !c || !PageColors.isHex(c.main) || !PageColors.isHex(c.secondary)) return null;
  const g=accentGrounds(), a=PageColors.legible(c.main,g), b=PageColors.legible(c.secondary,g);
  return {'--accent':a, '--accent2':b, '--accent-fill':a, '--on-accent':PageColors.onColor(a)};
}
function setAccents(el,acc){ ACCENT_VARS.forEach(k=>acc?el.style.setProperty(k,acc[k]):el.style.removeProperty(k)); }
function paintAccents(){
  slides.forEach(sl=>setAccents(sl.el,pieceAccents(sl.v)));
  const sl=view==='feed'?curSlide():null; setAccents(document.body,sl?pieceAccents(sl.v):null);
}
function setAccentFollow(on){
  accentFollow=on; try{ localStorage.setItem(ACCENT_KEY,on?'1':'0'); }catch(_){}
  $$('[data-accent-toggle]').forEach(b=>b.setAttribute('aria-checked',String(on)));
  paintAccents(); announce(on?'The accent now follows the piece on screen.':'The accent stays the style’s own.');
}
/* The legacy P of a catalog draw(), for thumbnails painted on the page: theme plus the one range param. */
const specs=new Map();
/* The module spec of one target of a piece (the running one by default). */
function specFor(v,tid){
  const t=targetById(v.manifest,tid||tidOf(v))||runnableTargets(v.manifest)[0], k=v.id+'|'+t.id, rk=rkeyFor(v,t.id), man=manifestForTarget(v.manifest,t);
  if(!specs.has(k)) specs.set(k, t.runtime==='wasm'
    ? {runtime:'wasm', render:t.render, url:v.entry, manifest:man}
    : {runtime:'js', render:t.render, source:remixes.has(rk)?remixes.get(rk):moduleSource(v,t.id), manifest:man});
  return specs.get(k);
}
/* the reviewed module of a target, never a remix: what share links, embeds and stills show */
function originalSpec(v,tid){ const t=targetById(v.manifest,tid)||runnableTargets(v.manifest)[0]; return remixes.has(rkeyFor(v,t.id))?{runtime:'js', render:t.render, source:moduleSource(v,t.id), manifest:manifestForTarget(v.manifest,t)}:specFor(v,t.id); }
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
  const ox=cr.left-sr.left, oy=cr.top-sr.top, g=10; sl.corner=null;
  /* Focus: nothing floats over the picture. A strip along the bottom (along the left on a wide canvas) holds the 32 px
     "tap to interact" target in its bottom-left corner, outside the box, so it never covers the piece or its labels. */
  if(document.body.classList.contains('focus')){
    const T=32, m=8, p={...pads}; if(H>=W) p.b=Math.max(p.b,T+2*m); else p.l=Math.max(p.l,T+2*m);
    sl.corner={x:m, y:H-m-T}; return {x:p.l, y:p.t, w:Math.max(100,W-p.l-p.r), h:Math.max(100,H-p.t-p.b)};
  }
  const rel=(el,base)=>{ if(!el||el.hidden) return null; const r=el.getBoundingClientRect(); if(!r.width||!r.height) return null;
    const o={l:r.left-base.left-ox, t:r.top-base.top-oy, r:r.right-base.left-ox, b:r.bottom-base.top-oy}; return (o.r>0&&o.l<W&&o.b>0&&o.t<H)?o:null; };
  const top=rel($('#topbar'),scr), cap=rel($('.caption',sl.el),sr), rail=rel($('.rail',sl.el),sr), nav=rel($('#feednav'),scr);
  const base={t:pads.t, r:pads.r, b:pads.b, l:pads.l}; if(top) base.t=Math.max(base.t, top.b+g); if(nav) base.r=Math.max(base.r, W-nav.l+g);
  // weight <1 keeps the classic "visual above the caption" composition unless it would be much smaller (landscape phones)
  // phones: the caption is two short lines, so beside it costs little and is not penalised
  const capOpts=cap?[{b:H-cap.t+g},{l:cap.r+g, wt:phoneUI()?1:0.7}]:[{}], railOpts=rail?[{b:H-rail.t+g},{r:W-rail.l+g}]:[{}];
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
  if(filter.type==='playground') return PLAYGROUND;
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
function makeFilter(kind){ return kind==='new'?{type:'new'} : kind==='playground'?{type:'playground'} : kind==='saved'?{type:'saved', ids:[...sig.saves]} : kind==='foryou'?{type:'foryou', ids:affinity()} : {type:'all'}; }
const rbtn=(act,icon,lbl,o={})=>`<button class="rbtn${o.on?' on':''}${o.cls?' '+o.cls:''}" type="button" data-act="${act}" aria-label="${esc(o.aria||lbl)}"${o.title?` title="${esc(o.title)}" aria-description="${esc(o.title)}"`:''}${o.pressed!=null?` aria-pressed="${o.pressed}"`:''}${o.attrs||''}><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;
/* The seeded like totals in catalog.js are invented sample numbers; one note says so (the like button's title, the Browse card, the end card). */
let LIKES_NOTE='Like counts are sample numbers written for this prototype; only your own like is real, and it stays in this browser.';
/* On the demo server (api.js) the counts are everyone's likes there: v.likes becomes the others' total, so that
   likeLabel's v.likes + your own like is the server's count. */
function loadCounts(){
  if(!LociAPI.server) return;
  LIKES_NOTE='Like counts are the likes of everyone on this demo server, yours included.';
  [...VIZ,...PLAYGROUND].forEach(v=>{ const n=LociAPI.likes.count(v.id); v.likes=n==null?0:Math.max(0,n-(v.liked?1:0)); });
}
/* every slide of a piece shows its like state and count */
function paintLike(v){
  slides.forEach(sl=>{ if(sl.v!==v) return; const b=$('[data-act="like"]',sl.el), lk=likeLabel(v); if(!b) return; b.classList.toggle('on',!!v.liked); b.setAttribute('aria-pressed',!!v.liked); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl; });
}
/* the server's answer to a like: its count, or (count null) a refusal that puts the like back as it was */
LociAPI.on('likes',(id,count,liked)=>{
  const v=vizById(id); if(!v) return;
  if(v.liked!==liked){ v.liked=liked; sig.likes=liked?[...new Set([...sig.likes,id])]:sig.likes.filter(x=>x!==id); }
  if(count!=null) v.likes=Math.max(0,count-(liked?1:0));
  paintLike(v); if(count==null) toast(`Could not ${liked?'unlike':'like'} ${v.title} on the server`);
});
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
const laneBadge=v=>v.starter?`<span class="lane new">Yours · not posted</span>`:v.pg?`<span class="lane new">Playground · not reviewed</span>`:v.lane==='new'?`<span class="lane new">Checked by machine</span>`:`<span class="lane">Community reviewed · ${esc(v.reviewed)}</span>`;
/* Distinctions (distinctions.js, docs/distinctions.md): a text mark after the lane that opens the citation in the Explanation tab. */
const distBadge=v=>distinctionsFor(v.id).map(d=>`<button class="lane dist" type="button" data-act="distinction" aria-label="Distinction: ${esc(DIST_CATS[d.cat].name)}, ${esc(distMonth(d.month))}"><span aria-hidden="true">◆ ${esc(DIST_CATS[d.cat].short)}<span class="dm"> · ${esc(distMonth(d.month,true))}</span></span></button>`).join('');
const distBlock=v=>distinctionsFor(v.id).map(d=>`<section class="distcite" aria-labelledby="dc-${esc(d.cat)}-${esc(d.month)}">
      <div class="kicker" id="dc-${esc(d.cat)}-${esc(d.month)}">◆ Distinction · ${esc(DIST_CATS[d.cat].name)} · ${esc(distMonth(d.month))}${d.sample?' <span class="samp">sample</span>':''}</div>
      <blockquote>${esc(d.citation)}</blockquote>
      <p class="fine">Cited by ${d.jury.map(h=>userLink(h)).join(', ')}, the ${esc(distMonth(d.month))} jury. Jurors judge from the piece and its explanation, never from likes or views.${d.sample?' This citation is a sample written for the prototype; no jury has met yet.':''}</p></section>`).join('');
/* A preset with foundBy (docs/module-api.md section 2) carries the finder's credit: in the button's name, and as a profile link beside it. */
const foundSR=p=>p.foundBy?`<span class="sr">, found by ${esc(p.foundBy)}</span>`:'';
const foundLink=(p,cls)=>p.foundBy?`<button class="${cls}" type="button" data-user="${esc(p.foundBy)}" aria-label="Found by ${esc(p.foundBy)}, profile"><span aria-hidden="true">found by&nbsp;</span>${esc(p.foundBy)}</button>`:'';
const presetPills=v=>presetsOf(v).map((p,j)=>{ const b=`<button class="pill" type="button" data-preset="${j}" data-pviz="${esc(v.id)}">${esc(p.label)}${foundSR(p)}</button>`;
  return p.foundBy?`<span class="pillgrp">${b}${foundLink(p,'pill fb')}</span>`:b; }).join('');
function slideHTML(v,i){
  const lk=likeLabel(v), pz=pauseLabel(), saved=sig.saves.includes(v.id), pr=presetsOf(v), cap=capOf(v);
  return `<div class="stage"><canvas class="viz" role="img" aria-label="${esc(v.title)}, animated visualization" aria-describedby="alt-${i}"></canvas><canvas class="labels" aria-hidden="true"></canvas><p class="sr" id="alt-${i}">${esc(cap.alt||cap.hook)}</p></div>
  <div class="caption">
    ${qwCard(v)}
    <div class="tries" role="group" aria-label="Try this"${pr.length?'':' hidden'}>${presetPills(v)}</div>
    <div class="who"><button class="who-link" type="button" data-user="${esc(v.author)}" aria-label="${esc(v.author)}, profile">${pfp(v.author)}<span>${esc(v.author)}</span></button>${laneBadge(v)}${distBadge(v)}${targetBadge(v)?`<span class="lane tgt" data-tgt>${targetBadge(v)}</span>`:''}
      <button class="badge" type="button" data-act="unremix" aria-label="Remixed. Use the original module"${remixes.has(rkey(v))?'':' hidden'}><b>Remixed</b> Use original</button>
      ${v.pg?`<button class="badge" type="button" data-act="deletepg" aria-label="Delete ${esc(cap.title)} from the Playground"><b>Delete</b></button>`:''}</div>
    <h2 class="vtitle" data-fig="${i+1}">${esc(cap.title)}</h2>
    <p class="hook">${esc(cap.hook)}</p>
    <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
    <div class="meta"><span class="oss">open source · ${esc(v.license)}</span><span>${esc(v.repo)}</span></div>
  </div>
  <div class="rail">
    ${rbtn('pause',pz.icon,pz.lbl,{aria:pz.aria, cls:'rb-desk'})}
    ${rbtn('like',ICON.heart,lk.lbl,{aria:lk.aria, title:LIKES_NOTE, on:v.liked, pressed:!!v.liked})}
    ${rbtn('save',ICON.bookmark,'Save',{on:saved, pressed:saved, cls:'rb-desk'})}
    ${rbtn('explain',ICON.sigma,'Explain',{cls:'rb-desk'})}
    ${rbtn('customize',ICON.sliders,'Customize',{cls:'rb-desk'})}
    ${rbtn('source',ICON.code,'Source',{cls:'rb-desk'})}
    ${rbtn('full',ICON.full,'Full screen',{cls:'rb-desk'})}
    ${rbtn('frame',ICON.camera,'Frame',{aria:'Save frame as PNG', cls:'rb-tall rb-desk'})}
    ${rbtn('share',ICON.share,'Share')}
    ${rbtn('more',ICON.more,'More',{aria:`More: actions and details of ${cap.title}`, cls:'rb-more', attrs:' aria-haspopup="dialog" aria-expanded="false" aria-controls="more"'})}
  </div>
  <button class="btn ghost exit-fs" type="button" data-act="exitfull">Exit full screen</button>`;
}
function endHTML(n){
  const what = filter.type==='new' ? ' in the New lane' : filter.type==='tag' ? ` tagged #${esc(filter.value.toLowerCase())}` : filter.type==='playlist' ? ` from “${esc(filter.name)}”` : filter.type==='saved' ? ` you saved` : filter.type==='playground' ? ' in the Playground' : '';
  return `<div class="end"><div class="end-card">
    <div class="kicker">End of the feed${filter.type==='foryou'?' · For you':''}</div>
    <h2>You've seen all ${n} visualization${n===1?'':'s'}${what}</h2>
    ${filter.type==='foryou'?`<p>Ordered by the topics you've liked, saved and watched. Your signals stay in this browser; reset them from the keyboard shortcuts dialog (press ?).</p>`:''}
    <p>New pieces are reviewed and added every month. Get the roundup by email.</p>
    ${nlForm('end')}
    <p class="fine">${LIKES_NOTE.replace('Like counts','The like counts on the slides')}</p>
    <div class="btnrow"><button class="btn ghost" type="button" data-go="top">Back to the first</button><button class="btn ghost" type="button" data-view="browse">Browse the catalog</button><button class="btn ghost" type="button" data-view="blog">Read the blog</button>${filter.type==='saved'?'<button class="btn ghost" type="button" data-open-yours>Everything yours</button>':''}</div>
    ${filter.type==='saved'?'<p class="fine">Everything yours lists your saved pieces with your lists, drafts, proposals and answers, all kept in this browser only.</p>':''}
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
  if(present) exitPresent(); // the slides (and the Present overlay) are about to be replaced
  closeMore();
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
      // a full-screen slide leaves the feed's flow and its neighbour slides into view: the full-screen one stays active (fullscreenchange)
      if(e.isIntersecting && e.intersectionRatio>=0.6 && !slideEls.includes(document.fullscreenElement)){ const i=slideEls.indexOf(e.target); if(i!==activeIdx){ activeIdx=i; onActiveChange(true); } }
    }
  },{root:feed, threshold:[0,0.6]});
  list.forEach((v,i)=>{
    const el=document.createElement('section'); el.className='slide'; el.setAttribute('aria-label',v.title); el.innerHTML=slideHTML(v,i); typeset($(".qcard",el));
    feed.appendChild(el);
    const stage=$('.stage',el), sl={v,el,stage,canvas:$('canvas.viz',el),overlay:$('canvas.labels',el),host:null,used:false,card:null,t:v.t0+(paused?6:0),w:0,h:0,visible:false};
    slides.push(sl); ro.observe(stage); ro.observe($('.caption',el)); ro.observe($('.rail',el)); io.observe(el);
    stage.addEventListener('dblclick',e=>{ if(e.target.closest('.stall,.callout,.ihint') || ptrOf(sl)) return; like(sl,true); burst(el,e); }); // on an interactive piece a double-click is the module's
    gestures(sl);
  });
  const end=document.createElement('section'); end.className='slide'; end.setAttribute('aria-label','End of the feed'); end.innerHTML=endHTML(list.length);
  feed.appendChild(end); io.observe(end);
  Collection.applyAll(); // a list's first moment per piece (params, t and view), before mountPolicy mounts anything
  slides.forEach(sl=>syncMod(sl.v));
  slideEls=[...feed.children]; feed.scrollTop=0; activeIdx=0; onActiveChange();
}
// layout size, not getBoundingClientRect
function measure(sl){ const w=sl.canvas.clientWidth, h=sl.canvas.clientHeight; if(!w) return false; sl.w=w; sl.h=h; sl.B=layoutBox(sl); return true; }
function boxOf(sl){ const full=document.fullscreenElement===sl.el || document.body.classList.contains('immersive'); return full||!sl.B?boxFor(sl.w,sl.h,full):sl.B; }
function sizeCanvas(sl){ if(!measure(sl)) return; if(sl.host) sl.host.resize(sl.cmp?cmpBoxes(sl)[0]:boxOf(sl),dpr()); if(sl.cmp) cmpLayout(sl); placeOverlays(sl); }
function relayout(){ requestAnimationFrame(()=>{ readPads(); if(peeked()){ if(isSheet()) drawer.style.transform=`translateY(${peekOffset()}px)`; else unpeek(true); } slides.forEach(sizeCanvas); }); }

/* ---------- runtime: each slide near the viewport runs its module in a worker (runtime.js) ---------- */
const wantsPlay=sl=>!paused && view==='feed' && (sl.visible || document.fullscreenElement===sl.el) && !sl.hold && !sl.card && !sl.scrubbing && !document.hidden && !(reduceMotion && sl.v.manifest.motion==='static');
function syncPlay(){ for(const sl of slides) if(sl.host){ const on=wantsPlay(sl); on?sl.host.play():sl.host.pause(); if(sl.cmp) cmpPlay(sl,on); } }
function freshCanvas(sl){ if(sl.used){ const c=sl.canvas.cloneNode(false); sl.canvas.replaceWith(c); sl.canvas=c; } sl.used=true; } // one canvas per mount; replacing it also takes away a stopped piece's frame
function mountSlide(sl){
  if(sl.host || sl.card || !measure(sl)) return;
  const v=sl.v, s=getSettings(v), ch=chooseTarget(v,boxOf(sl));
  sl.tid=ch.id; sl.treason=ch.reason; sl.fallback=ch.fallback; syncTargetBadge(sl);
  if(ch.fallback) return showFallback(sl);
  freshCanvas(sl);
  sl.host=LociHost.mount(sl.canvas,specFor(v,ch.id),{theme:themeFor(v), params:s.params, box:boxOf(sl), dpr:dpr(), t:sl.t, speed:s.speed, playing:wantsPlay(sl), overlay:sl.overlay, target:ch.id,
    view:sl.view, onView:vw=>{ sl.view=vw; if(sl.cmp && sl.cmp.host) sl.cmp.host.setView(vw); }, onError:(kind,msg)=>pieceFailed(sl,kind,msg)}); // compare: B follows A's view
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
  const why=f.reason==='webgl2'?'Open it on a laptop or desktop browser: the share link opens this exact piece there, with your parameters.':f.reason==='minBox'?'Turn the phone sideways or open it on a larger screen. The share link opens this exact piece.':f.reason==='browser'?'Update this browser, or open the share link in a current one.':'';
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
function unmount(sl){ if(sl.cmp) closeCompare(true); if(!sl.host) return; release(sl,true); sl.t=sl.host.getTime(); sl.view=sl.host.getView(); sl.host.dispose(); sl.host=null; syncEngageUI(sl); }
/* at most three workers: the active slide and its neighbours */
let mountTimer=0; // settle first: a fast scroll should not start and stop a worker for every slide it passes
/* comparing (cmpSl): the compared slide's two workers are the only ones; the neighbours stay unmounted until it closes */
function mountPolicy(){ clearTimeout(mountTimer); mountTimer=setTimeout(()=>{
  slides.forEach((sl,i)=>cmpSl?(sl!==cmpSl&&unmount(sl)):Math.abs(i-activeIdx)<=1?mountSlide(sl):unmount(sl));
  const p=cmpPending, sl=curSlide(); if(p && sl && sl.v===p.v && sl.host){ cmpPending=null; openCompare(sl,p.params,true); } // a share link with &b=
},60); }
const hostsOf=sl=>[sl.host,sl.cmp&&sl.cmp.host].filter(Boolean); // A, and B while comparing
function pushTheme(){ for(const sl of slides) for(const h of hostsOf(sl)){ h.setTheme(themeFor(sl.v)); h.setSpeed(getSettings(sl.v).speed); } }
function pushParams(v){ for(const sl of slides) if(sl.host && sl.v===v) sl.host.setParams(getSettings(v).params); if(cmpOn(v)) pushB(v); if(dTab==='explain' && dViz===v) syncReadouts(v); syncMod(v); }
/* the Customize button carries a dot (and says "changed") while the piece's params differ from its defaults, so a leftover is never silent */
function syncMod(v){
  const s=settings[v.id], def=normalizeParams(v.manifest,{}), on=!!s && Object.keys(def).some(k=>s.params[k]!==def[k]);
  for(const sl of slides) if(sl.v===v){ const b=$('[data-act="customize"]',sl.el); if(!b) continue; b.classList.toggle('mod',on); b.setAttribute('aria-label',on?'Customize, parameters changed from the defaults':'Customize'); }
}
function seekSl(sl,t){ sl.t=t; for(const h of hostsOf(sl)) h.seek(t); } // one clock: a seek moves A and B
function seekViz(v,t){ for(const sl of slides) if(sl.v===v) seekSl(sl,t); }
function setViewSl(sl,vw){ sl.view=vw; for(const h of hostsOf(sl)) h.setView(vw); }

/* ---------- compare (docs/ideas/06-compare-two-params.md): one piece twice, A and B, on one stage ----------
   B is a second worker of the same target and module on its own canvas over the stage. Both modules get the same box
   (A's half of the slide's drawing box), so with equal params they draw the same pixels; B's canvas is moved right by
   CSS (translateX) to the other half, and each canvas is clipped to its half (clip-path). One clock:
   play, pause, seek and scrub drive both handles, and a tick re-seeks B if it drifts from A. Shared: seed, theme,
   speed and view (B follows A's onView). Only the params differ: B's live in settingsB[v.id], A's in settings[v.id].
   Wide screens only (CMP_MIN_W, and each half must meet the target's minBox). While comparing, mountPolicy keeps only
   the compared slide mounted, so A + B are the only workers. */
const settingsB={}, CMP_MIN_W=900, CMP_GAP=16, CMP_TAG=26;
let cmpSl=null, cmpEdit='B', cmpPending=null; // cmpPending: {v, params} from a share link's &b=, opened once the slide mounts
const cmpOn=v=>!!(cmpSl && cmpSl.v===v);
const seedKeys=v=>v.manifest.params.filter(p=>p.type==='seed').map(p=>p.key);
/* B's params as B's worker gets them: the seed is always A's */
function cmpParamsB(v){ const a=getSettings(v).params, b={...settingsB[v.id].params}; for(const k of seedKeys(v)) b[k]=a[k]; return b; }
/* B in the link: its non-default params ({} when B is all defaults) */
function cmpCompact(v){ const def=normalizeParams(v.manifest,{}), b=cmpParamsB(v), o={}; for(const k in b) if(b[k]!==def[k]) o[k]=b[k]; return o; }
/* the params where A and B differ, as [{c, a, b}] with the Customize descriptor */
function cmpDiffs(v){ const a=getSettings(v).params, b=cmpParamsB(v); return paramControls(v.manifest).filter(c=>a[c.key]!==b[c.key]).map(c=>({c, a:a[c.key], b:b[c.key]})); }
const fmtP=(c,x)=>{ const o=c.options&&c.options.find(o=>o.value===x); return o?o.label:c.format?c.format(x):String(x); };
function cmpDiffText(v){ const d=cmpDiffs(v); return d.length?`Differs: ${d.map(x=>`${x.c.label} (A ${fmtP(x.c,x.a)}, B ${fmtP(x.c,x.b)})`).join('; ')}.`:'A and B have the same parameters. Pick B above and change one.'; }
/* the slide's drawing box split into two halves with a gap; whole pixels, so the halves are the same size. With the
   side drawer open (wide screens), both halves move left of it, so B stays in view while you edit it. */
function cmpBoxes(sl){
  let B=boxOf(sl);
  if(dTab && !isSheet()){ const right=innerWidth-drawer.offsetWidth-sl.canvas.getBoundingClientRect().left-pads.r; if(right>B.x+240 && right<B.x+B.w) B={...B, w:right-B.x}; }
  const w=Math.max(50,Math.floor((B.w-CMP_GAP)/2)), x=Math.round(B.x), y=Math.round(B.y)+CMP_TAG, h=Math.round(B.h)-CMP_TAG; // a strip above the halves for the A and B tags
  return [{x, y, w, h}, {x:x+w+CMP_GAP, y, w, h}];
}
/* why compare cannot open on this slide (null when it can) */
function cmpProblem(sl){
  if(innerWidth<CMP_MIN_W) return `Compare needs a wider screen: at least ${CMP_MIN_W} px across for two halves (this window is ${innerWidth} px).`;
  if(!sl || sl.card || sl.fallback || !sl.host) return 'Compare needs the piece to be running on this slide.';
  if(!measure(sl)) return 'Compare needs the slide on screen.';
  const t=targetById(sl.v.manifest,sl.tid), why=t&&canRun(t,capsFor(cmpBoxes(sl)[1]));
  if(why) return `Compare needs a wider screen: each half is too small for this piece (${why.message.replace(/^This piece needs/,'it needs')}).`;
  return null;
}
function toggleCompare(sl){ if(sl && cmpSl===sl) closeCompare(); else openCompare(sl); }
function openCompare(sl,pB,fromLink){
  const why=cmpProblem(sl);
  if(why){ const msg=fromLink?`This link compares two settings of ${sl.v.title}, shown here as A only. ${why}`:why; toast(msg); announce(msg); return false; }
  if(cmpSl) closeCompare(true);
  const v=sl.v, s=getSettings(v);
  settingsB[v.id]={params:normalizeParams(v.manifest,pB||s.params)}; // B starts as a copy of A
  clearTimeout(mountTimer); slides.forEach(x=>{ if(x!==sl) unmount(x); }); // the neighbours give their workers back first: A + B only
  cmpSl=sl; cmpEdit='B';
  const mk=(tag,cls,attrs)=>{ const e=document.createElement(tag); e.className=cls; for(const k in attrs) e.setAttribute(k,attrs[k]); return e; };
  const c=sl.cmp={host:null, on:false, used:false,
    canvas:mk('canvas','viz cmp-b',{role:'img', 'aria-label':`${v.title}, B`}), overlay:mk('canvas','labels cmp-b',{'aria-hidden':'true'}),
    tagA:mk('div','cmp-tag',{'aria-hidden':'true'}), tagB:mk('div','cmp-tag b',{'aria-hidden':'true'}), split:mk('div','cmp-split',{'aria-hidden':'true'})};
  sl.overlay.after(c.canvas,c.overlay,c.split,c.tagA,c.tagB); sl.stage.classList.add('comparing');
  const [ba]=cmpBoxes(sl), t=sl.host.getTime(); sl.t=t;
  sl.host.resize(ba,dpr()); sl.host.seek(t);
  c.host=LociHost.mount(c.canvas,specFor(v,sl.tid),{theme:themeFor(v), params:cmpParamsB(v), box:ba, dpr:dpr(), t, speed:s.speed, playing:false, overlay:c.overlay, target:sl.tid, label:'compare B',
    view:sl.host.getView()??sl.view, onError:(kind,msg)=>cmpFailed(sl,kind,msg)});
  // the clock: B starts later than A (its worker has to load), so once B is drawing, and whenever the two drift apart,
  // both are seeked to A's t in the same task: they then advance from one moment
  c.tick=setInterval(()=>{ const a=sl.host, b=c.host; if(!a||!b||a.state!=='running'||b.state!=='running') return;
    if(!c.met || c.on && Math.abs(a.getTime()-b.getTime())>0.05){ c.met=true; cmpSync(sl); } },250);
  cmpLayout(sl); syncPlay(); placeOverlays(sl);
  if(dTab==='customize' && dViz===v) renderDrawer();
  announce(`Comparing two copies of ${v.title}: A on the left, B on the right, on one clock. B's parameters are now the ones you edit in Customize. Press X to close.`);
  return true;
}
function closeCompare(quiet){
  const sl=cmpSl; if(!sl) return; const c=sl.cmp; cmpSl=null; sl.cmp=null;
  clearInterval(c.tick); if(c.host) c.host.dispose();
  [c.canvas,c.overlay,c.split,c.tagA,c.tagB].forEach(e=>e.remove());
  sl.stage.classList.remove('comparing'); sl.canvas.style.clipPath='';
  if(sl.host && measure(sl)) sl.host.resize(boxOf(sl),dpr());
  placeOverlays(sl); mountPolicy(); // the neighbours come back
  if(dTab==='customize' && dViz===sl.v) renderDrawer();
  if(!quiet) announce(`Closed compare. ${sl.v.title} is back to one copy, with A's parameters.`);
}
function cmpFailed(sl,kind,msg){
  if(!sl.cmp) return; const [title]=CARD[kind]||CARD.error;
  closeCompare(true); toast(`Copy B: ${title.replace(/^This piece/,'it')}${msg?` (${msg})`:''}. Compare closed.`);
}
/* play or pause B with A; on pause both are put on the same t, so the two still frames are the same moment */
function cmpPlay(sl,on){
  const c=sl.cmp; if(!c.host) return;
  if(on){ if(!c.on) cmpSync(sl); c.host.play(); }
  else { c.host.pause(); if(c.on) cmpSync(sl); }
  c.on=on;
}
function cmpSync(sl){ const t=sl.host.getTime(); sl.t=t; sl.host.seek(t); sl.cmp.host.seek(t); }
function pushB(v){ const sl=cmpSl; if(!cmpOn(v)) return; if(sl.cmp.host) sl.cmp.host.setParams(cmpParamsB(v)); cmpTags(sl); const n=$('#cz-cmp-diff'); if(n && dViz===v) n.textContent=cmpDiffText(v); }
/* the halves' clip, B's box, the split line and the tags */
function cmpLayout(sl){
  const c=sl.cmp; if(!c) return; const [ba,bb]=cmpBoxes(sl), W=sl.w, mid=Math.round(ba.x+ba.w+CMP_GAP/2);
  const dx=bb.x-ba.x; // B draws in A's box; its canvas is shifted onto the right half
  sl.canvas.style.clipPath=`inset(0 ${Math.max(0,W-mid)}px 0 0)`; c.canvas.style.clipPath=`inset(0 0 0 ${mid-dx}px)`;
  c.canvas.style.transform=c.overlay.style.transform=`translateX(${dx}px)`;
  if(c.host) c.host.resize(ba,dpr());
  const st=c.split.style; st.left=mid+'px'; st.top=ba.y+'px'; st.height=ba.h+'px';
  for(const [el,b] of [[c.tagA,ba],[c.tagB,bb]]){ el.style.left=(b.x+b.w/2)+'px'; el.style.top=(b.y-CMP_TAG+2)+'px'; el.style.maxWidth=b.w+'px'; }
  cmpTags(sl);
}
function cmpTags(sl){
  const c=sl.cmp; if(!c) return; const v=sl.v, d=cmpDiffs(v);
  const say=(side,k)=>`${side}${d.length?' · '+d.map(x=>`${x.c.label} ${fmtP(x.c,x[k])}`).join(' · '):''}`;
  c.tagA.textContent=say('A','a'); c.tagB.textContent=say('B','b');
  c.canvas.setAttribute('aria-label',`${v.title}, copy B${d.length?': '+d.map(x=>`${x.c.label} ${fmtP(x.c,x.b)}`).join(', '):''}`);
}
addEventListener('resize',()=>{ if(cmpSl && innerWidth<CMP_MIN_W){ closeCompare(true); toast(`Compare closed: it needs a window at least ${CMP_MIN_W} px wide.`); } });
/* the kill switch's list changed (api.js): a piece an admin restarted comes back, and an open explanation follows */
LociAPI.on('blocked',()=>{
  for(const sl of slides) if(sl.stopped && !LociHost.isBlocked(sl.v.id)){ sl.stopped=false; restart(sl); }
  if(dTab==='explain' && dViz && drawer.classList.contains('open')) renderDrawer();
});
const CARD={
  stalled:['This piece stalled','It stopped answering for more than half a second, so the site stopped it.'],
  slow:['This piece is running slowly','It was taking too long to draw each frame, so the site paused it to keep the page responsive.'],
  error:['This piece hit an error',''],
  unsupported:['This piece can’t run here',''],
  blocked:['This piece was stopped','The site’s admins have stopped it from running.'],
  crashed:['This piece was skipped','The browser tab crashed while it was running, so it did not start again.'],
};
function pieceFailed(sl,kind,msg){
  if(!slides.includes(sl)) return;
  release(sl,true); if(sl.cmp) closeCompare(true); // A stopped: back to the single stage
  if(kind!=='slow' && sl.host){ sl.t=sl.host.getTime(); sl.view=sl.host.getView(); sl.host=null; } // the worker is gone; 'slow' leaves it paused
  sl.stopped=kind==='blocked';
  const [title,why]=CARD[kind]||CARD.error, detail=why||msg||'';
  if(sl.card) sl.card.remove();
  const c=document.createElement('div'), i=slides.indexOf(sl); c.className='stall'; c.setAttribute('role','group'); c.setAttribute('aria-labelledby',`stall-${i}`);
  const rem=remixes.has(rkey(sl.v));
  c.innerHTML=`<p class="stall-h" id="stall-${i}">${esc(rem&&kind==='error'?'Your remix hit an error':title)}</p>${detail?`<p class="fine">${esc(detail)}</p>`:''}
    <div class="btnrow">${kind==='blocked'?'':`<button class="btn" type="button" data-act="restart">${kind==='crashed'?'Try again':'Restart'}</button>`}${rem?`<button class="btn ghost" type="button" data-act="unremix">Use original</button>`:''}</div>`;
  sl.stage.appendChild(c); sl.card=c; syncEngageUI(sl); placeOverlays(sl);
  if(rem && kind==='error'){ remixErrors.set(rkey(sl.v),detail); showRemixError(sl.v); }
  if(curSlide()===sl) announce(`${sl.v.title}: ${title}. ${detail}`);
}
/* Things drawn over the canvas, positioned against the drawing box: the stall card (centre), the preset callout (bottom), the time chip (top). */
function placeOverlays(sl){
  if(!sl.card && !sl.callout && !sl.tchip && !sl.ihint) return;
  const B=boxOf(sl), cx=(B.x+B.w/2)+'px', mw=Math.max(200,B.w-16)+'px';
  if(sl.ihint){ const st=sl.ihint.style, c=document.body.classList.contains('focus')&&sl.corner;
    if(c){ st.left=c.x+'px'; st.top=c.y+'px'; st.maxWidth=''; } else { st.left=(B.x+B.w-8)+'px'; st.top=(B.y+B.h-8)+'px'; st.maxWidth=mw; } }
  if(sl.ibox){ const st=sl.ibox.style; st.left=B.x+'px'; st.top=B.y+'px'; st.width=B.w+'px'; st.height=B.h+'px'; }
  if(sl.card){ const st=sl.card.style; st.left=cx; st.top=(B.y+B.h/2)+'px'; st.maxWidth=mw; }
  if(sl.callout){
    const c=sl.callout, st=c.style, dock=c.classList.contains('lesson')?capDock(sl,B):null;
    c.classList.toggle('dock',!!dock); sl.el.classList.toggle('docked',!!dock); // the caption steps aside for the card (its space stays reserved: the box does not move)
    if(dock){ if(c.parentElement!==sl.el) sl.el.appendChild(c); st.left=dock.x+'px'; st.top=dock.y+'px'; st.width=dock.w+'px'; st.maxWidth='';
      // phones: the caption is two short lines, so while moments play it reserves the card's height (it only grows, so the box does not move per moment)
      const cap=$('.caption',sl.el), need=c.offsetHeight; if(phoneUI() && need>(parseFloat(cap.style.minHeight)||0)) cap.style.minHeight=need+'px'; }
    else {
      if(c.parentElement!==sl.stage) sl.stage.appendChild(c); st.width='';
      let y=B.y+B.h-8-(sl.ihint?sl.ihint.offsetHeight+6:0); // above "Click to interact"
      const pt=peekTop(); if(pt!=null) y=Math.min(y,pt-sl.stage.getBoundingClientRect().top-8); // never under the peeked sheet
      st.left=cx; st.top=y+'px'; st.maxWidth=mw;
    }
  }
  if(sl.tchip){ const st=sl.tchip.style; st.left=cx; st.top=(B.y+8)+'px'; }
}
/* Phones: the moment card docks in the caption area right under the drawing box (the box is measured to
   clear the caption, so the card never covers the picture). Returns {x, y, w} relative to the slide, or null when the
   caption is not below the box (desktop, landscape, full screen). The box keeps its size: no per-stop resize. */
function capDock(sl,B){
  if(!isSheet()) return null;
  const cap=$('.caption',sl.el), cr=cap&&cap.getBoundingClientRect(); if(!cr || !cr.width || !cr.height) return null;
  const er=sl.el.getBoundingClientRect(), kr=sl.canvas.getBoundingClientRect(), bot=kr.top-er.top+B.y+B.h;
  if(cr.top-er.top<bot-1) return null;
  return {x:cr.left-er.left, y:bot+8, w:cr.width};
}
function restart(sl){
  if(LociHost.isCrashed(sl.v.id)) LociHost.forgive(sl.v.id); // the viewer asked for it
  const hadFocus=sl.card && sl.card.contains(document.activeElement);
  if(sl.card){ sl.card.remove(); sl.card=null; }
  unmount(sl); sl.t=sl.v.t0+(paused?6:0); mountSlide(sl);
  if(hadFocus) refocus('[data-act="pause"]',sl.el);
  announce(`Restarted ${sl.v.title}`);
}
function curSlide(){ return slides[activeIdx]; }
function onActiveChange(say){
  LociHost.noteActive(activeIdx<slides.length?slides[activeIdx].v.id:null);
  if(lessonPlay && (!curSlide() || curSlide().v!==lessonPlay.v)) Lesson.exit(true); // leaving the slide ends the lesson, like compare below
  const n=slides.length, note=activeIdx<n?Collection.arrive(slides[activeIdx]):'';
  if(say) announce(activeIdx<n?`${activeIdx+1} of ${n}: ${slides[activeIdx].v.title}${slides[activeIdx].fallback?`. ${slides[activeIdx].fallback.message}.`:''}${note?`. ${note}`:''}`:'End of the feed');
  slideEls.forEach((el,i)=>el.classList.toggle('active',i===activeIdx));
  if(say) syncURL();
  $('#counter').textContent=`${Math.min(activeIdx+1,n)} / ${n}`;
  $('#prev').disabled=activeIdx<=0; $('#next').disabled=activeIdx>=slideEls.length-1;
  if(engagedSl && engagedSl!==curSlide()) release(engagedSl);
  if(cmpSl && cmpSl!==curSlide()) closeCompare(true); // leaving the slide ends the comparison
  mountPolicy();
  const sl=curSlide();
  paintAccents(); // the page takes the colors of the piece on screen
  if(dTab && sl && sl.v!==dViz){ dViz=sl.v; renderDrawer(); }
}
function goTo(i){
  i=Math.max(0,Math.min(slideEls.length-1,i));
  if(slides[i] && slideEls.includes(document.fullscreenElement)) slides[i].el.requestFullscreen().catch(()=>{}); // F: the slide is full screen; Present: the page is
  slideEls[i].scrollIntoView({behavior:reduceMotion?'auto':'smooth', block:'start'});
}
/* The address bar follows the slide on screen, with replaceState so Back is not one entry per swipe. Only v: params live in share links. */
function syncURL(){
  const sl=curSlide(); if(!sl || view!=='feed') return;
  if(filter.link){ const q=`?collection=${filter.link}`; if(location.search!==q) try{ history.replaceState(history.state,'',location.pathname+q+location.hash); }catch(_){} return; } // a playing list keeps its link
  if(new URLSearchParams(location.search).get('v')===sl.v.id) return;
  try{ history.replaceState(history.state,'',`${location.pathname}?v=${encodeURIComponent(sl.v.id)}${location.hash}`); }catch(_){}
}
function like(sl,only){
  const v=sl.v; if(only && v.liked) return; v.liked=!v.liked;
  sig.likes=[...VIZ,...PLAYGROUND].filter(x=>x.liked).map(x=>x.id); saveSignals();
  const b=$('[data-act="like"]',sl.el), lk=likeLabel(v); b.classList.toggle('on',v.liked); b.setAttribute('aria-pressed',!!v.liked); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl;
}
function toggleSave(sl){
  const v=sl.v, i=sig.saves.indexOf(v.id), on=i<0;
  if(on) sig.saves.push(v.id); else sig.saves.splice(i,1);
  saveSignals();
  $$('[data-act="save"]').forEach(b=>{ const s=slides.find(x=>x.el.contains(b)); if(s&&s.v===v){ b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); } });
  renderChips();
  announce(on?`Saved ${v.title}. ${sig.saves.length} saved. To add this moment to a list, use the button in the message, Customize or Share.`:`Removed ${v.title} from saved.`);
  if(on) toast(`Saved ${v.title}`,{label:'Add this moment…', run:b=>openMoments(v,b)});
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
    const t=Math.max(0,g.base+(e.clientX-g.x)*SCRUB_S_PER_PX); seekSl(sl,t); showT(sl,t);
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
  // a click (or tap) inside the frame engages; one in the margin does not, or the press that releases would re-engage
  st.addEventListener('click',e=>{ if(sl.engaged || !ptrOf(sl) || skip(e) || !inFrame(sl,e) || performance.now()-(sl.gestureAt||0)<400) return; engage(sl); });
  st.addEventListener('pointermove',e=>{ if(!e.buttons) st.classList.toggle('offframe',!inFrame(sl,e)); }); // no "clickable" cursor over the margin
  sl.canvasFocusOut=e=>{ if(sl.engaged && e.relatedTarget && !st.contains(e.relatedTarget)) release(sl); };
  st.addEventListener('focusout',e=>{ if(e.target===sl.canvas) sl.canvasFocusOut(e); });
}

/* ---------- engagement (docs/module-api.md, "Pointer"): a slide whose running target declares pointer input ----------
   shows "Click to interact". Clicking or tapping the frame, or Enter on its focused canvas, engages it: pointer drags
   (with pointer capture), the wheel, the context menu and keys other than Esc, Tab and modifier shortcuts go to the
   module, and scrub, long-press and feed scrolling over the stage are off. Esc, a click outside the frame, another
   slide, a drawer or dialog, or another view releases it. On touch: tap to engage, then one finger drags and two pinch.
   The frame is the box the piece draws in (boxOf); the stage is larger, since it fills the slide behind the page's controls. */
const coarse=()=>matchMedia('(pointer:coarse)').matches;
let engagedSl=null;
const ptrOf=sl=>sl&&sl.host&&!sl.card&&sl.host.pointer&&sl.host.pointer.mode!=='none'?sl.host.pointer:null;
const inFrame=(sl,e)=>{ const r=sl.canvas.getBoundingClientRect(), B=boxOf(sl), x=e.clientX-r.left-B.x, y=e.clientY-r.top-B.y; return x>=0 && y>=0 && x<=B.w && y<=B.h; };
function syncEngageUI(sl){
  const p=ptrOf(sl), cv=sl.canvas;
  sl.stage.classList.toggle('engageable',!!p);
  if(!p){
    if(sl.engaged) return release(sl,true); // the piece stopped while engaged: release runs this again, and the page must not stay dimmed
    if(sl.ihint){ sl.ihint.remove(); sl.ihint=null; } if(sl.ibox){ sl.ibox.remove(); sl.ibox=null; }
    cv.removeAttribute('tabindex'); cv.setAttribute('aria-label',`${sl.v.title}, animated visualization`); return;
  }
  cv.tabIndex=0;
  cv.setAttribute('aria-label',`${sl.v.title}, interactive visualization. ${sl.engaged?`Interacting: ${p.hint}. Press Escape or click outside it to exit.`:'Press Enter to interact.'}`);
  if(!sl.ihint){
    const b=sl.ihint=document.createElement('button'); b.type='button'; b.className='ihint'; b.tabIndex=-1; b.setAttribute('aria-hidden','true'); b.title=coarse()?'Tap to interact':'Click to interact'; // the canvas carries the same text for assistive tech
    b.addEventListener('click',e=>{ e.stopPropagation(); sl.engaged?release(sl):engage(sl); });
    const o=sl.ibox=document.createElement('div'); o.className='ibox'; o.setAttribute('aria-hidden','true');
    sl.stage.append(o,b);
  }
  sl.ihint.classList.toggle('on',!!sl.engaged);
  const howToExit=coarse()?'tap here or outside to exit':'Esc or click outside to exit';
  sl.ihint.textContent=sl.engaged?`Interacting · ${p.hint} · ${howToExit}`:coarse()?'Tap to interact':'Click to interact';
  placeOverlays(sl);
  // a long hint over a narrow box would cover the piece: after a few seconds it shrinks to how to exit
  clearTimeout(sl.hintTimer);
  if(sl.engaged && sl.ihint.offsetWidth>boxOf(sl).w*0.5) sl.hintTimer=setTimeout(()=>{ if(sl.engaged && sl.ihint) sl.ihint.textContent=`Interacting · ${howToExit}`; },4000);
}
function engage(sl){
  const p=ptrOf(sl); if(!p || sl.engaged) return;
  if(engagedSl && engagedSl!==sl) release(engagedSl,true);
  engagedSl=sl; sl.engaged=true; sl.stage.classList.add('engaged'); document.body.classList.add('interacting');
  sl.host.input({type:'engage'});
  if(document.activeElement!==sl.canvas) sl.canvas.focus({preventScroll:true});
  syncEngageUI(sl);
  announce(`Interacting with ${sl.v.title}. ${p.hint}. ${coarse()?'Tap the hint or outside the piece':'Press Escape or click outside it'} to exit.`);
}
function release(sl,quiet){
  if(!sl || !sl.engaged) return;
  sl.engaged=false; if(engagedSl===sl) engagedSl=null; sl.stage.classList.remove('engaged'); document.body.classList.remove('interacting');
  if(sl.host){ sl.host.input({type:'release'}); sl.host.resetPointers(); }
  syncEngageUI(sl);
  if(!quiet) announce(`Released ${sl.v.title}. Scrolling and shortcuts are back.`);
}
// a press anywhere outside the engaged frame releases it (before that press does anything else); controls floating over the stage stay usable
document.addEventListener('pointerdown',e=>{ const sl=engagedSl; if(!sl) return; const t=e.target, st=sl.stage;
  if(!st.contains(t) || ((t===st || t.tagName==='CANVAS') && !inFrame(sl,e))) release(sl); },true);
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
  const p=presetsOf(v)[i]; if(!p) return;
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true); // a preset is the piece's own callout; it ends the lesson
  const s=cmpOn(v)&&cmpEdit==='B'?settingsB[v.id]:getSettings(v); s.params=normalizeParams(v.manifest,{...s.params, ...p.params}); pushParams(v); // comparing: the side being edited
  if(p.t!=null) seekViz(v,p.t);
  if(p.view!==undefined) for(const x of slides) if(x.v===v) setViewSl(x,normalizeView(p.view));
  const sl=slides.find(x=>x.v===v); if(sl) showCallout(sl,p);
  if(dTab==='customize' && dViz===v){ renderDrawer(); refocus(`[data-preset="${i}"]`,$('#d-body')); }
  announce(`${p.label}. ${p.note||''}${p.foundBy?` Found by ${p.foundBy}.`:''}`);
}
function showCallout(sl,p){
  hideCallout(sl,true);
  const c=document.createElement('div'); c.className='callout'+(p.cls?' '+p.cls:'');
  c.setAttribute('aria-hidden','true'); // the same text goes to the live region
  c.innerHTML=`<b>${esc(p.label)}</b>${p.note?`<span>${texText(p.note)}</span>`:''}${p.foundBy?`<small class="c-fb">found by ${esc(p.foundBy)}</small>`:''}`;
  c.addEventListener('click',()=>hideCallout(sl));
  sl.stage.appendChild(c); sl.callout=c; placeOverlays(sl);
  if(window.LociTeX && c.querySelector('.tex')) LociTeX.typeset(c).then(()=>{ if(c.isConnected) placeOverlays(sl); });
  sl.calloutTimer=setTimeout(()=>hideCallout(sl),6000);
}
function hideCallout(sl,now){
  const c=sl.callout; if(!c) return; clearTimeout(sl.calloutTimer); sl.callout=null; sl.el.classList.remove('docked');
  if(c.classList.contains('lesson')){ const cap=$('.caption',sl.el); if(cap) cap.style.minHeight=''; }
  if(now||reduceMotion) return c.remove(); c.classList.add('out'); setTimeout(()=>c.remove(),400);
}

/* ---------- live explanations (docs/submitting.md section 6, "Live links"): links in explanation.md that drive the piece ----------
   [text](#preset:label) applies a preset (the pills' path), (#t:12.5) seeks and pauses, (#state:<base64url stop>) puts
   the piece at a lesson stop (Lesson.stop, then Lesson.apply), and [r](#param:r) becomes a readout of a declared param:
   hover or focus shows its current value and label, and it follows every change while the drawer is open. Time-driven
   quantities are not params and have no readout. liveLink (manifest.js) is the parser the gate validates with. */
function paramReadout(v,key){
  const c=paramControls(v.manifest).find(c=>c.key===key); if(!c) return '';
  const x=getSettings(v).params[key], o=c.options&&c.options.find(o=>o.value===x);
  return `${key} = ${o?o.label:c.format?c.format(x):String(x)} · ${c.label}`;
}
function syncReadouts(v){ $$('#d-body .ptip[data-pk]').forEach(t=>t.textContent=paramReadout(v,t.dataset.pk)); }
let liveTip=0;
/* turn the live links under root into controls; a bad one (the gate fails it) renders as its plain text */
function liveify(root,v){
  for(const a of $$('a[href^="#"]',root)){
    const L=liveLink(manOf(v),a.getAttribute('href')); if(!L) continue;
    if(L.problem){ console.warn(`loci: ${v.id} explanation: ${L.problem}`); a.replaceWith(...a.childNodes); continue; }
    if(L.kind==='param'){
      const w=document.createElement('span'), id=`ptip-${++liveTip}`; w.className='psym-w';
      w.innerHTML=`<button class="psym" type="button" data-live="${esc(a.getAttribute('href'))}" aria-describedby="${id}"></button><span class="ptip" role="tooltip" id="${id}" data-pk="${esc(L.key)}"></span>`;
      $('.psym',w).append(...a.childNodes); $('.ptip',w).textContent=paramReadout(v,L.key); a.replaceWith(w);
    } else { a.classList.add('live'); a.dataset.live=a.getAttribute('href'); a.title=L.kind==='t'?`Seek to t = ${L.t} s and pause`:L.kind==='preset'?`Set up “${presetsOf(v)[L.i].label}” on the slide`:'Set up this moment on the slide'; }
  }
}
/* put piece v where a preset, #t: or #state: link says; quiet: the caller (a step) shows its own callout */
function runLive(v,L,label,quiet){
  const sl=slides.find(x=>x.v===v);
  if(L.kind==='param'){ dTab='customize'; renderDrawer(); return refocus(`#cz-p-${CSS.escape(L.key)}`,$('#d-body')); }
  if(L.kind==='preset'){
    if(quiet){ const p=presetsOf(v)[L.i]; if(lessonPlay && lessonPlay.v===v) Lesson.exit(true); Lesson.apply(v,{p:{...getSettings(v).params, ...p.params}, t:p.t!=null?p.t:timeOf(v), view:p.view!==undefined?p.view:viewOf(v)}); setPaused(true,true); return; }
    return applyPreset(v,L.i);
  }
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true);
  setPaused(true,true);
  if(L.kind==='t'){ seekViz(v,L.t); if(sl && !quiet) showT(sl,L.t); if(!quiet) announce(`Paused at t = ${L.t} s.`); return; }
  const st=Lesson.stop(L.stop,v,m=>console.warn(`loci: ${v.id} explanation #state: ${m}`));
  if(L.stop.p===undefined) st.p=getSettings(v).params; // a state without p keeps the params; one with p sets them all (unlisted ones to their defaults)
  if(L.stop.view===undefined) st.view=viewOf(v);
  Lesson.apply(v,st);
  if(quiet) return;
  if(sl && st.note) showCallout(sl,{label:label||'This moment', note:st.note}); else if(sl) showT(sl,st.t);
  announce(`${label||'This moment'}. ${st.note||`Paused at t = ${st.t} s.`}`);
}
/* "Why it works": the list after a "### Why it works" heading becomes steps, shown one at a time with Back and Next
   (and the arrow keys while the step has focus). A step's first #preset:, #t: or #state: link is applied when the step
   is shown, the piece pauses, and the step text goes to the slide's callout and the live region. Done, another tab or
   closing the drawer ends it; the piece plays again if it was playing. */
let why=null; // {v, i, n, wasPaused} while stepping
function whySteps(art){
  const h=$$('h1,h2,h3,h4,h5,h6',art).find(x=>/^why it works$/i.test(x.textContent.trim())), list=h&&h.nextElementSibling;
  return list && /^(OL|UL)$/.test(list.tagName)?{h, list, items:[...list.children].filter(x=>x.tagName==='LI')}:null;
}
function whyInit(v,art){
  const W=whySteps(art); if(!W || !W.items.length) return;
  W.list.classList.add('why-list');
  const box=document.createElement('div'); box.className='why'; box.dataset.n=W.items.length;
  box.innerHTML=`<div class="btnrow why-start"><button class="btn ghost" type="button" data-why="start">Step through (${W.items.length} step${W.items.length===1?'':'s'})</button><span class="fine">Each step sets up the picture it talks about.</span></div>
    <div class="why-step" role="group" aria-label="Why it works, step by step" hidden><div class="kicker why-k" aria-hidden="true"></div><div class="why-txt"></div>
      <div class="ls-ctl"><button class="iconbtn" type="button" data-why="prev" aria-label="Previous step">${ICON.left}</button><button class="iconbtn" type="button" data-why="next" aria-label="Next step">${ICON.right}</button><button class="btn ghost" type="button" data-why="done">Show all steps</button><span class="fine">← → move between steps</span></div></div>`;
  box._items=W.items.map(li=>li.innerHTML);
  W.list.before(box);
  box.addEventListener('keydown',e=>{ if(e.key!=='ArrowLeft' && e.key!=='ArrowRight' || !$('.why-step',box).contains(e.target)) return; e.preventDefault(); whyGo(why?why.i+(e.key==='ArrowRight'?1:-1):0); });
  if(why && why.v===v) whyShow(box,false);
}
function whyGo(i,first){
  const v=dViz, box=$('#d-body .why'); if(!box) return; const n=+box.dataset.n;
  if(!why){ why={v, i:0, n, wasPaused:paused}; first=true; }
  if(i<0) return announce(`This is the first step, 1 of ${n}.`);
  if(i>=n) return announce(`This is the last step, ${n} of ${n}. Show all steps leaves the step-through.`);
  why.i=i; whyShow(box,true,first);
}
function whyShow(box,apply,first){
  const v=why.v, n=why.n, i=why.i, st=$('.why-step',box), txt=$('.why-txt',st);
  $('.why-start',box).hidden=true; st.hidden=false; box.nextElementSibling.hidden=true;
  $('.why-k',st).textContent=`Why it works · step ${i+1} of ${n}`;
  txt.innerHTML=box._items[i]; typeset(txt); liveify(txt,v);
  $('[data-why="prev"]',st).setAttribute('aria-disabled',i===0); $('[data-why="next"]',st).setAttribute('aria-disabled',i===n-1);
  if(!apply) return;
  const link=$$('[data-live]',txt).map(a=>liveLink(manOf(v),a.dataset.live)).find(L=>L && L.kind!=='param');
  if(link) runLive(v,link,null,true); else setPaused(true,true);
  const say=txt.textContent.replace(/\s+/g,' ').trim(), sl=slides.find(x=>x.v===v);
  peekDrawer($('.ls-ctl',st)); // phones: lower the sheet so the step's picture shows
  if(sl) showCallout(sl,{label:`Step ${i+1} of ${n}`, note:say.length>220?say.slice(0,217)+'…':say, cls:'why'});
  announce(`${first?`Why it works, ${n} steps. Left and right arrow keys, or Previous and Next, move between them. `:''}Step ${i+1} of ${n}. ${say}`);
}
function whyExit(quiet){
  const W=why; if(!W) return; why=null;
  const box=$('#d-body .why');
  if(box && dViz===W.v){ $('.why-start',box).hidden=false; $('.why-step',box).hidden=true; box.nextElementSibling.hidden=false; }
  const sl=slides.find(x=>x.v===W.v); if(sl) hideCallout(sl);
  if(!W.wasPaused && paused) setPaused(false,true);
  if(!quiet) announce(`Showing all steps.${!W.wasPaused?` ${W.v.title} is playing again.`:''}`);
}

/* ---------- lesson links (docs/module-api.md section 5, "Moments"): up to 8 moments of one piece in one link ----------
   A stop is a share-link state without the theme: {p, t, view, note}. Everything that arrives (a link, a stored draft)
   goes through Lesson.parse: params through normalizeParams, views through viewProblem/normalizeView, notes cut to
   140 characters. Stops are compact (non-default params only) in links and drafts, complete after parse.
   Lists of moments (Collection, below), Present and the clip recorder reuse stop/compact/apply and the player. */
const Lesson={
  MAX_STOPS:8, MAX_NOTE:140, MAX_TITLE:80, MAX_LINK:16384,
  key:v=>'loci:lesson:'+v.id, // the old per-piece "Your lesson" draft, read once by Moments.migrate
  /* the moment v is at now, as a compact stop */
  capture(v,note){ const o=stateOf(v), st={}; if(o.p) st.p=o.p; if(o.t!=null) st.t=o.t; if(o.view!=null) st.view=o.view; st.note=String(note||'').trim().slice(0,Lesson.MAX_NOTE); return st; },
  /* a stop (compact or complete) in the compact form: non-default params, t when > 0, view when set */
  compact(v,st){
    const def=normalizeParams(v.manifest,{}), p={}, o={}; for(const k in (st.p||{})) if(st.p[k]!==def[k]) p[k]=st.p[k];
    if(Object.keys(p).length) o.p=p; if(st.t>=0.005) o.t=+(+st.t).toFixed(2); if(st.view!=null) o.view=st.view; o.note=st.note||''; return o;
  },
  /* one stop (an object) of piece v, complete: params through normalizeParams, view through viewProblem/normalizeView,
     t finite and >= 0, note cut to MAX_NOTE. Shared with collection items. */
  stop(s,v,warn){
    const vp=s.view!==undefined?viewProblem(s.view):null; if(vp) warn(`ignoring its view: ${vp}`);
    return {v:v.id, p:normalizeParams(v.manifest,s.p&&typeof s.p==='object'&&!Array.isArray(s.p)?s.p:{}), t:Number.isFinite(s.t)&&s.t>=0?+s.t:0,
      view:normalizeView(s.view), note:typeof s.note==='string'?s.note.trim().slice(0,Lesson.MAX_NOTE):''};
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
      stops.push(Lesson.stop(s,v,m=>warn(`stop ${i+1}: ${m}`)));
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
  /* the lesson link starting at stop i (&at=, 1-based; omitted for stop 1); bare: without the notes, for a QR code */
  link(v,lesson,i,bare){ const l=bare?{title:lesson.title, stops:lesson.stops.map(s=>({...s, note:''}))}:lesson;
    return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}&lesson=${Lesson.encode(v,l)}`+(i>0?`&at=${i+1}`:'')+location.hash; },
  /* put piece v at a stop: params replace the current ones, then t, then the view (null: the module's default view) */
  apply(v,st){
    const s=getSettings(v); s.params=normalizeParams(v.manifest,st.p); pushParams(v); seekViz(v,st.t||0);
    const vw=normalizeView(st.view); for(const x of slides) if(x.v===v) setViewSl(x,vw);
  },
  /* playback: one run of moments at a time, on its piece's slide. A lesson link is one run. A list (Collection.arrive)
     plays each run of adjacent moments of one piece the same way, and Next past a run's last moment moves the feed on
     to the next piece (Collection.goMoment).
     was: the piece's own params, t and view before the first moment, put back when the run ends by leaving it (scroll,
     filter, view, Esc); the card's Leave keeps the moment's state and says so (docs/ideas/round2/205).
     o.list: {base, n, intro}, the run's place in its list. o.live: a list's run of one moment, which plays on from its t
     as a collection item always has: no pause, nothing re-applied, so nothing to put back. */
  play(v,lesson,i=0,o={}){
    if(lessonPlay) Lesson.exit(true);
    lessonPlay={v, lesson, i:-1, wasPaused:paused, list:o.list||null, live:!!o.live, was:{p:structuredClone(getSettings(v).params), t:timeOf(v), view:structuredClone(viewOf(v))}};
    Lesson.go(i,true,o.quiet);
  },
  /* moment k (0-based) of n: its place in the list, or in the lesson */
  pos(L=lessonPlay){ return L.list?{k:L.list.base+L.i, n:L.list.n}:{k:L.i, n:L.lesson.stops.length}; },
  go(i,first,quiet){
    const L=lessonPlay; if(!L) return; const n=L.lesson.stops.length; i=Math.max(0,Math.min(n-1,i)); L.i=i;
    const st=L.lesson.stops[i]; if(!L.live){ setPaused(true,true); if(!st.bare) Lesson.apply(L.v,st); } lessonCard();
    if(quiet) return; const ps=Lesson.pos(L), intro=first&&L.list?L.list.intro:'';
    announce(`${first?`${L.lesson.title||L.v.title}, ${ps.n} moment${ps.n===1?'':'s'}. `:''}Moment ${ps.k+1} of ${ps.n}. ${intro?intro+' ':''}${st.note}${first?' Left and right arrow keys, or Previous and Next, move between moments. Escape leaves them.':''}`);
  },
  step(d){
    const L=lessonPlay; if(!L) return; const j=L.i+d, ps=Lesson.pos(L), k=ps.k+d;
    if(j>=0 && j<L.lesson.stops.length) return Lesson.go(j);
    if(L.list && k>=0 && k<ps.n) return Collection.goMoment(k);
    announce(d<0?`This is the first moment, 1 of ${ps.n}.`:'This is the last moment. Press Escape or Leave to leave the moments.');
  },
  exit(quiet,keep){
    const L=lessonPlay; if(!L) return; lessonPlay=null;
    let had=false; slides.forEach(sl=>{ if(sl.callout && sl.callout.classList.contains('lesson')){ had=had||sl.callout.contains(document.activeElement); hideCallout(sl,true); if(had) refocus('[data-act="pause"]',sl.el); } });
    const now=getSettings(L.v).params, kept=keep&&!L.live?paramControls(L.v.manifest).filter(c=>now[c.key]!==L.was.p[c.key]):[];
    if(!keep && !L.live) Lesson.apply(L.v,L.was); // nothing borrowed stays on
    if(!L.live && !L.wasPaused && paused) setPaused(false,true);
    if(new URLSearchParams(location.search).has('lesson')) try{ history.replaceState(history.state,'',`${location.pathname}?v=${encodeURIComponent(L.v.id)}${location.hash}`); }catch(_){}
    if(!quiet) announce(`Left the moments. ${L.v.title} ${keep||L.live?'keeps the moment\'s settings':'is back as it was'}${!L.live&&!L.wasPaused?' and playing again':''}.`);
    if(keep && kept.length) toast(`Kept ${kept.map(c=>`${c.key} = ${c.options?(c.options.find(o=>o.value===now[c.key])||{label:now[c.key]}).label:c.format?c.format(now[c.key]):now[c.key]}`).join(', ')}. Reset in Customize.`);
  },
};
let lessonPlay=null; // {v, lesson, i, wasPaused, was, list, live} while a run of moments plays
/* The moment card: the persistent callout of the current moment (on a list's first moment also its intro), with
   Previous, Next and Leave. It is not aria-hidden: its buttons are real controls. */
function lessonCard(){
  const L=lessonPlay, sl=L&&slides.find(x=>x.v===L.v); if(!sl) return;
  let c=sl.callout;
  if(!c || !c.classList.contains('lesson')){
    hideCallout(sl,true);
    c=document.createElement('div'); c.className='callout lesson'; c.setAttribute('role','group'); c.setAttribute('aria-label','Moments');
    c.innerHTML=`<b class="ls-k"></b><span class="ls-intro"></span><span class="ls-note"></span><div class="ls-ctl"><button class="iconbtn" type="button" data-ls="prev" aria-label="Previous moment">${ICON.left}</button><button class="iconbtn" type="button" data-ls="next" aria-label="Next moment">${ICON.right}</button><button class="btn ghost" type="button" data-ls="exit">Leave</button></div>`;
    c.addEventListener('click',e=>{ const b=e.target.closest('[data-ls]'); e.stopPropagation(); if(!b) return; const a=b.dataset.ls; if(a==='exit') return Lesson.exit(false,true);
      const was=lessonPlay; Lesson.step(a==='next'?1:-1);
      if(lessonPlay && lessonPlay!==was){ const s2=slides.find(x=>x.v===lessonPlay.v); if(s2) refocus(`[data-ls="${a}"]`,s2.el); } }); // the next piece's card takes the focus
    sl.stage.appendChild(c); sl.callout=c;
  }
  const ps=Lesson.pos(L), st=L.lesson.stops[L.i];
  $('.ls-k',c).textContent=`${L.lesson.title?L.lesson.title+' · ':''}Moment ${ps.k+1} of ${ps.n}`;
  texInto($('.ls-intro',c),L.list&&ps.k===0?L.list.intro:'',sl);
  texInto($('.ls-note',c),st.note,sl);
  $('[data-ls="prev"]',c).setAttribute('aria-disabled',ps.k===0); $('[data-ls="next"]',c).setAttribute('aria-disabled',ps.k===ps.n-1); // not disabled: a focused button keeps focus at the ends
  placeOverlays(sl);
}

/* ---------- lists of moments (docs/module-api.md section 5, "Moments"): the collection link ----------
   A list is {title, intro, items}: moments {v, p, t, view, note} (a lesson stop that names its piece) plus an optional
   mode. Adjacent moments of one piece are a run: the feed has one slide per piece, so a run plays on that slide with
   the lesson player, and a change of piece is the next slide. Items go through Lesson.stop; unknown pieces and
   non-adjacent repeats are dropped with a warning; a moment that is only {v} plays the piece as the feed would (that
   is what a blog post's "Watch these in the feed" is). Each run's first moment is written when the feed is built
   (buildFeed), not on arrival: mountPolicy mounts the next slide before it is active. */
const Collection={
  MAX_ITEMS:30, MAX_INTRO:280, KEY:'loci:collections',
  /* validate {title, intro?, items:[...]}. Returns {title, intro, items, gone} or null. */
  parse(o,from='collection link',allowEmpty){
    const warn=m=>console.warn(`loci: ${from}: ${m}`);
    if(!o || typeof o!=='object' || Array.isArray(o) || !Array.isArray(o.items)){ warn('ignoring it: it is not {items: [...]}'); return null; }
    if(o.items.length>Collection.MAX_ITEMS) warn(`keeping the first ${Collection.MAX_ITEMS} of ${o.items.length} moments`);
    const items=[], at=new Map(); let gone=0;
    o.items.slice(0,Collection.MAX_ITEMS).forEach((s,i)=>{
      if(!s || typeof s!=='object' || Array.isArray(s)) return warn(`dropping moment ${i+1}: it is not an object`);
      const v=typeof s.v==='string'?vizById(s.v):null;
      if(!v){ gone++; return warn(`dropping moment ${i+1}: no piece "${String(s.v).slice(0,40)}" in this catalog`); }
      const prev=items.length?items[items.length-1].v:null;
      if(at.has(v.id) && prev!==v.id) return warn(`dropping moment ${i+1}: ${v.id} is already moment ${at.get(v.id)}; a piece's moments must be adjacent, since they play on its one slide`);
      if(!at.has(v.id)) at.set(v.id,i+1);
      if(Object.keys(s).every(k=>k==='v')) return items.push({v:v.id, bare:true, note:''});
      const it=Lesson.stop(s,v,m=>warn(`moment ${i+1}: ${m}`));
      if(s.mode!==undefined){ if(isMode(s.mode) && hasModes(v)) it.mode=s.mode; else warn(`moment ${i+1}: ignoring its mode`); }
      items.push(it);
    });
    const str=(x,n)=>typeof x==='string'?x.trim().replace(/\s+/g,' ').slice(0,n):'';
    if(!items.length && !allowEmpty){ warn('ignoring it: no playable moments'); return null; }
    return {title:str(o.title,Lesson.MAX_TITLE), intro:str(o.intro,Collection.MAX_INTRO), items, gone};
  },
  /* the compact form, for links and storage */
  compact(c){
    const o={title:c.title||''}; if(c.intro) o.intro=c.intro;
    o.items=c.items.map(it=>{ if(it.bare) return {v:it.v}; const v=vizById(it.v), x={v:it.v, ...Lesson.compact(v,it)}; if(it.mode) x.mode=it.mode; return x; });
    return o;
  },
  encode:c=>b64u.enc(JSON.stringify(Collection.compact(c))),
  decode(str){
    if(str.length>Lesson.MAX_LINK){ console.warn('loci: ignoring a collection link longer than 16 KB'); return null; }
    let o; try{ o=JSON.parse(b64u.dec(str)); }catch(_){ console.warn('loci: ignoring a malformed collection link'); return null; }
    return Collection.parse(o);
  },
  url:c=>location.origin+location.pathname+`?collection=${Collection.encode(c)}`+location.hash,
  /* the link starting at moment k (&at=, 1-based; omitted for moment 1); bare: without the notes and intro, for a QR code */
  link(c,k,bare){ const l=bare?{title:c.title, intro:'', items:c.items.map(it=>({...it, note:''}))}:c; return Collection.url(l).replace(/(#.*)?$/,m=>(k>0?`&at=${k+1}`:'')+m); },
  /* the moment piece v is at now, as an item */
  capture(v,note){ const it={v:v.id, ...Lesson.capture(v,note)}, sl=slides.find(x=>x.v===v); if(hasModes(v) && sl && sl.treason==='preferred' && isMode(sl.tid)) it.mode=sl.tid; return it; },
  /* runs of adjacent moments of one piece: [{v, base, items}], base the index of the run's first moment */
  runs(items){ const out=[]; items.forEach((it,k)=>{ const r=out[out.length-1]; if(r && r.v===it.v) r.items.push(it); else out.push({v:it.v, base:k, items:[it]}); }); return out; },
  /* the playlist filter, one slide per run; link: keep ?collection= in the address bar while it plays */
  filter(c,link){ return {type:'playlist', ids:[...new Set(c.items.map(it=>it.v))], name:c.title||'Untitled list', intro:c.intro||'', items:c.items, runs:Collection.runs(c.items),
    list:{title:c.title||'', intro:c.intro||'', items:c.items}, link:link?Collection.encode(c):null}; },
  play(c,link){ setFilter(Collection.filter(c,link)); if(c.gone) Collection.gone(c.gone); },
  gone(n){ toast(`${n} piece${n===1?' is':'s are'} no longer available`); },
  /* write each run's first moment (params, t, view and mode) before anything mounts (called from buildFeed) */
  applyAll(){
    pieceMode.clear(); if(!filter.runs) return;
    Collection.restore(filter); filter.was={}; // a rebuild of the same list snapshots the user's params, not the moments'
    for(const r of filter.runs){
      const it=r.items[0]; if(it.bare) continue; const v=vizById(it.v), sl=slides.find(x=>x.v===v); if(!v || !sl) continue;
      filter.was[v.id]=structuredClone(getSettings(v).params); getSettings(v).params=normalizeParams(v.manifest,it.p); sl.t=it.t||0; sl.view=normalizeView(it.view);
      sl.hold=true; // a peeking neighbour stays at its moment until it arrives
      if(it.mode) pieceMode.set(v.id,it.mode);
    }
  },
  /* the params each run borrowed go back when the list stops playing (setFilter), so nothing stays on in All */
  restore(f){ if(!f || !f.was) return; for(const id in f.was){ const v=vizById(id); if(v) getSettings(v).params=f.was[id]; } f.was=null; },
  pending:null, // {v, at}: where a list link's &at= starts, consumed by the first arrival on that piece
  /* on arrival: the piece's run plays with the moment card, from moment at of the run (0; -1 the last). A run of
     several moments pauses on each, as a lesson does; a run of one plays on from its t. A bare moment with no note
     (a blog post's playlist) shows no card. Returns what to announce with the slide. */
  arrive(sl,at){
    const f=filter, r=f.runs?f.runs.find(x=>x.v===sl.v.id):null; if(!r) return '';
    if(sl.hold){ sl.hold=false; syncPlay(); }
    const pend=Collection.pending; if(pend && pend.v===r.v){ at=pend.at; Collection.pending=null; }
    if(lessonPlay && lessonPlay.v===sl.v){ const L=lessonPlay; return [L.list&&Lesson.pos(L).k===0?L.list.intro:'',L.lesson.stops[L.i].note].filter(Boolean).join(' '); } // already playing: Next from the previous piece started it
    const intro=r.base===0?f.intro:'', many=r.items.length>1, it0=r.items[0];
    if(!many && it0.bare && !it0.note && !intro) return '';
    const i=at==null?0:at<0?r.items.length-1:Math.min(at,r.items.length-1);
    Lesson.play(sl.v,{title:f.name, stops:r.items},i,{list:{base:r.base, n:f.items.length, intro}, live:!many, quiet:true});
    return [intro,r.items[i].note].filter(Boolean).join(' ');
  },
  /* moment k of the playing list: on this slide a step, else its piece's slide at that moment (Next, Previous, Present) */
  goMoment(k){
    const f=filter, r=f.runs&&f.runs.find(x=>k>=x.base && k<x.base+x.items.length); if(!r) return;
    const i=slides.findIndex(x=>x.v.id===r.v); if(i<0) return;
    if(lessonPlay && lessonPlay.v===slides[i].v) return Lesson.go(k-r.base);
    goTo(i); Collection.arrive(slides[i],k-r.base);
  },
};

/* ---------- Present (docs/ideas/05-seminar-mode.md): the full screen, plus a blackout, stop stepping, a progress strip
   and a QR corner. The steps are the moments that are playing (a lesson link, or the playing list's run on this piece),
   else the piece's presets; past the last step comes the next piece. The keys are a slide clicker's: → PageDown Space,
   ← PageUp, B or . for black. The QR (qr.js) is of the playing moments from this one (&at=, presentQR), else shareURL at the moment it is drawn. */
let present=null; // {sl, el, pi, black, wasPaused, qr, qrURL, back, fs} while presenting
/* i of n: the moment's place in its list or lesson (j of m: within this piece's run), or the preset index */
function presentSteps(){
  const P=present, v=P.sl.v, L=lessonPlay;
  if(L && L.v===v){ const ps=Lesson.pos(L); return {kind:L.list?'list':'lesson', i:ps.k, n:ps.n, j:L.i, m:L.lesson.stops.length}; }
  const n=presetsOf(v).length; return n?{kind:'presets', i:P.pi, n}:{kind:'none', i:0, n:0};
}
const isMoments=s=>s.kind==='lesson'||s.kind==='list';
/* the per-slide part: a list's run on this piece (a no-op when it already plays), the preset index, the overlay */
function presentOn(sl,atEnd){
  const P=present; P.sl=sl; P.pi=-1; P.black=false; P.qrURL=null;
  if(filter.runs) Collection.arrive(sl,atEnd?-1:0);
  if(atEnd && lessonPlay && lessonPlay.v===sl.v) Lesson.go(lessonPlay.lesson.stops.length-1);
  const s=presentSteps(); if(atEnd && s.kind==='presets'){ P.pi=s.n-1; applyPreset(sl.v,P.pi); }
  const el=document.createElement('div'); el.className='present'; el.tabIndex=-1; el.setAttribute('role','region'); el.setAttribute('aria-label',`Presenting ${sl.v.title}`);
  el.innerHTML=`<p class="pz-hint" aria-hidden="true"><kbd>→</kbd> next <kbd>←</kbd> back <kbd>B</kbd> black <kbd>Q</kbd> QR code <kbd>Esc</kbd> leave</p>
    <p class="pz-note" aria-hidden="true"></p>
    <div class="pz-qr" hidden><div class="pz-code"></div><p class="pz-url"></p></div>
    <div class="pz-strip" aria-hidden="true"><span class="pz-k"></span><i><b></b></i></div>
    <div class="pz-black" hidden></div>`;
  sl.el.appendChild(el); P.el=el;
  clearTimeout(P.hintTimer); P.hintTimer=setTimeout(()=>{ const h=$('.pz-hint',el); if(h) h.classList.add('out'); },4000);
  presentPaint();
}
function presentOff(){
  const P=present; if(!P) return;
  if(P.black) presentBlack();
  clearTimeout(P.hintTimer); clearTimeout(P.qrTimer); if(P.el) P.el.remove(); P.el=null;
}
/* the strip, the note and (when shown) the QR of this moment */
function presentPaint(){
  const P=present; if(!P || !P.el) return;
  const el=P.el, v=P.sl.v, s=presentSteps(), pr=presetsOf(v), idx=slides.indexOf(P.sl);
  let k, note='', frac;
  if(isMoments(s)){ const L=lessonPlay; k=`${L.lesson.title?L.lesson.title+' · ':''}Moment ${s.i+1} of ${s.n}`; note=L.lesson.stops[L.i].note; frac=(s.i+1)/s.n; }
  else if(s.kind==='presets'){ const p=pr[s.i]; k=p?`${p.label} · ${s.i+1} of ${s.n}`:`Presets · 0 of ${s.n}`; note=p?p.note||'':''; frac=(s.i+1)/s.n; }
  else { k=`${v.title} · ${idx+1} of ${slides.length}`; frac=(idx+1)/slides.length; }
  $('.pz-k',el).textContent=k; texInto($('.pz-note',el),note); // TeX in a note renders as in the lesson card
  $('.pz-strip b',el).style.width=(100*frac).toFixed(1)+'%';
  $('.pz-qr',el).hidden=!P.qr; el.classList.toggle('qr-on',!!P.qr);
  clearTimeout(P.qrTimer);
  if(P.qr) P.qrTimer=setTimeout(presentQR,120); // after the stop's params, t and view have reached the host
}
/* the playing moments go in whole (the lesson or list link), from this one; past QR.maxBytes() without their notes;
   past that, this moment only. The line under the code says which one it is. */
function presentQR(){
  const P=present; if(!P || !P.el || !P.qr) return;
  // linkKind: the pick in Share's Link group when Present was started from there ('moment' forces this moment's own link)
  const v=P.sl.v, K=P.linkKind, L=lessonPlay&&lessonPlay.v===v&&K!=='moment'?lessonPlay:null, fits=u=>typeof QR!=='undefined' && new TextEncoder().encode(u).length<=QR.maxBytes();
  let url=shareURL(v), what='';
  if(L){ const k=Lesson.pos(L).k, lk=bare=>L.list?Collection.link(filter.list,k,bare):Lesson.link(v,L.lesson,L.i,bare), full=lk(false), bare=lk(true);
    what=`Moment ${k+1} only: the list is too long for a QR code.`;
    if(fits(full)){ url=full; what=`The whole list, from moment ${k+1}.`; }
    else if(fits(bare)){ url=bare; what=`The whole list from moment ${k+1}, without its notes (with them it is too long for a QR code).`; } }
  else if(K==='collection' && P.sl===shareSl){ const c=shareChoices(v).find(x=>x.kind==='collection'); if(c && fits(c.url)){ url=c.url; what='The whole list.'; } else if(c) what='This moment only: the list is too long for a QR code.'; }
  if(url===P.qrURL) return; P.qrURL=url;
  const code=typeof QR!=='undefined'?QR.encode(url):null;
  $('.pz-code',P.el).innerHTML=code?QR.svg(code):`<p class="pz-long">This link is too long for a QR code (${url.length} characters).</p>`;
  $('.pz-url',P.el).textContent=(what?what+' ':'')+url.replace(/^https?:\/\//,'');
}
function enterPresent(sl){
  if(!sl || view!=='feed' || present) return;
  hidePresentPrompt();
  if(engagedSl) release(engagedSl,true);
  if(dTab) closeDrawer();
  present={qr:false, black:false, back:document.activeElement};
  document.body.classList.add('presenting');
  presentOn(sl);
  /* the whole page goes full screen with the page controls hidden (the immersive path), so moving between pieces is a
     scroll, not another full-screen request; when full screen is refused, immersive alone remains */
  document.body.classList.add('immersive'); requestAnimationFrame(()=>sl.el.scrollIntoView({block:'start'}));
  const de=document.documentElement;
  if(document.fullscreenElement) present.fs=true; // F first: stay in it
  else if(de.requestFullscreen) de.requestFullscreen().then(()=>{ if(present) present.fs=true; },()=>toast('Full screen is blocked here, so the page controls are hidden instead. Press Esc to leave.'));
  present.el.focus({preventScroll:true});
  const s=presentSteps();
  announce(`Presenting ${sl.v.title}. ${isMoments(s)?`Moment ${s.i+1} of ${s.n}.`:s.kind==='presets'?`${s.n} presets.`:''} Right arrow, Page Down or Space for next; B for a black screen; Q for a QR code of this view; Escape to leave.`);
}
function exitPresent(){
  const P=present; if(!P) return;
  presentOff(); present=null; document.body.classList.remove('presenting');
  const back=P.back, slEl=P.sl.el;
  Promise.resolve(leaveFull()).then(()=>requestAnimationFrame(()=>{
    if(back && back.isConnected && back!==document.body && back.getClientRects().length) back.focus({preventScroll:true});
    else refocus('[data-act="pause"]',slEl.isConnected?slEl:(slideEls[activeIdx]||document));
  }));
  announce('Left Present.');
}
function presentStep(d){
  const P=present, s=presentSteps(), j=isMoments(s)?s.j+d:s.i+d;
  if(isMoments(s) && j>=0 && j<s.m){ Lesson.go(j); return presentPaint(); }
  if(s.kind==='presets' && j>=0 && j<s.n){ P.pi=j; applyPreset(P.sl.v,j); return presentPaint(); }
  presentPiece(d,d<0);
}
/* the next or previous piece: Present moves with it (going back lands on that piece's last step) */
function presentPiece(d,atEnd){
  const P=present, i=slides.indexOf(P.sl)+d;
  if(i<0 || i>=slides.length) return announce(d>0?'This is the last piece.':'This is the first piece.');
  presentOff(); goTo(i); presentOn(slides[i],atEnd); P.el.focus({preventScroll:true});
  const s=presentSteps(); announce(`${slides[i].v.title}${isMoments(s)?`. Moment ${s.i+1} of ${s.n}. ${lessonPlay.lesson.stops[lessonPlay.i].note}`:''}`);
}
/* black screen: the stage is covered and the animation paused; back, it resumes at the same t */
function presentBlack(){
  const P=present; if(!P) return; P.black=!P.black;
  if(P.black){ P.wasPaused=paused; setPaused(true,true); } else if(!P.wasPaused) setPaused(false,true);
  if(P.el) $('.pz-black',P.el).hidden=!P.black;
  announce(P.black?'Black screen. Press B to bring the picture back.':'Picture back.');
}
/* the keys while presenting; false hands the key on to the feed's handler (, . [ ] 0 scrub as usual, except . is black) */
function presentKey(e){
  const k=e.key, lk=k.length===1?k.toLowerCase():k;
  if(e.metaKey || e.ctrlKey || e.altKey) return false;
  if(engagedSl && k!=='PageDown' && k!=='PageUp') return false; // a clicker still steps while a piece has the keys
  if(e.target.closest && e.target.closest('input,select,textarea,[role="menu"]')) return false;
  const eat=()=>{ e.preventDefault(); return true; };
  if(k==='Escape' || lk==='f'){ exitPresent(); return eat(); }
  if(k==='ArrowRight' || k==='PageDown' || k===' '){ if(!e.repeat || k!==' ') presentStep(1); return eat(); }
  if(k==='ArrowLeft' || k==='PageUp'){ presentStep(-1); return eat(); }
  if(k==='ArrowDown' || lk==='j'){ presentPiece(1); return eat(); }
  if(k==='ArrowUp' || lk==='k'){ presentPiece(-1,false); return eat(); }
  if(e.shiftKey && /^[a-z]$/.test(lk)) return eat();
  if(lk==='b' || k==='.'){ presentBlack(); return eat(); }
  if(lk==='q'){ present.qr=!present.qr; presentPaint(); announce(present.qr?'QR code of this view shown, with its link.':'QR code hidden.'); return eat(); }
  if(lk==='p'){ togglePause(); presentPaint(); return eat(); }
  if(['e','c','s','l','z','?'].includes(lk)) return eat(); // panels, likes, dialogs and Focus are not for the projector
  return false;
}
/* ?present=1: full screen needs a gesture, so a bookmarked talk opens on this prompt and one key (or tap) starts it */
function showPresentPrompt(){
  const p=document.createElement('div'); p.className='present-prompt'; p.id='present-prompt';
  p.innerHTML=`<button class="btn" type="button" id="present-go">Present</button><p>Press <kbd>F</kbd> to present, <kbd>Esc</kbd> to browse instead</p>`;
  $('#screen').appendChild(p);
  $('#present-go',p).onclick=()=>enterPresent(curSlide());
  requestAnimationFrame(()=>$('#present-go',p).focus({preventScroll:true}));
}
function hidePresentPrompt(){ const p=$('#present-prompt'); if(p) p.remove(); }
document.addEventListener('fullscreenchange',()=>{ if(present && present.fs && !document.fullscreenElement) exitPresent(); }); // the browser's own Esc

/* ---------- save frame, share ---------- */
function download(blob,name){ const a=document.createElement('a'), u=URL.createObjectURL(blob); a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),4000); }
async function saveFrame(sl){
  if(!sl.host || sl.card) return toast('This piece is not running, so there is no frame to save.');
  const side=sl.cmp&&sl.cmp.host?cmpEdit:null, h=side==='B'?sl.cmp.host:sl.host; // comparing: the half being edited, cropped to its box
  const t=h.getTime(), name=`${sl.v.id}-t${t.toFixed(2)}${side?'-'+side:''}.png`;
  try{ let blob=await h.capture(); if(side) blob=await cropPNG(blob,cmpBoxes(sl)[0],sl.w); /* both halves draw in A's box */ download(blob,name); toast(`Saved ${name}`); }
  catch(e){ console.warn('loci: capture failed',e.message); toast('Could not capture this frame.'); }
}
/* one box (CSS px) of a capture whose canvas is cssW px wide */
async function cropPNG(blob,b,cssW){
  const bm=await createImageBitmap(blob), k=bm.width/Math.max(1,cssW), cv=document.createElement('canvas');
  cv.width=Math.round(b.w*k); cv.height=Math.round(b.h*k); cv.getContext('2d').drawImage(bm,Math.round(b.x*k),Math.round(b.y*k),cv.width,cv.height,0,0,cv.width,cv.height);
  return new Promise((res,rej)=>cv.toBlob(x=>{ if(bm.close) bm.close(); x?res(x):rej(new Error('could not encode the PNG')); },'image/png'));
}
/* The Share dialog (docs/ideas/round2/204): everything that leaves the site, in four headed groups. Link: this moment,
   or (when a lesson or a list of moments plays) that lesson or list, picked
   with radios; the course-page snippets, the GIF/PNG watermark's .tex link and Present's QR follow the pick. Course
   page: the embed and static-image snippets; the still renders only on Render image, never on a Customize render. */
let shareSl=null, shareKind='moment', shareStill=null, shareStillN=0;
function shareChoices(v){
  const out=[{kind:'moment', label:'This moment', url:shareURL(v)}], L=lessonPlay&&lessonPlay.v===v?lessonPlay:null;
  if(L && !L.list){ const n=L.lesson.stops.length;
    out.push({kind:'lesson', label:`The lesson${L.lesson.title?` “${L.lesson.title}”`:''} (${n} moment${n===1?'':'s'})`, url:Lesson.url(v,L.lesson), def:true}); }
  if(filter.type==='playlist' && filter.items && filter.items.some(it=>it.v===v.id)){ const n=filter.items.length;
    out.push({kind:'collection', label:`The list “${filter.name}” (${n} moment${n===1?'':'s'})`, url:filter.link?location.origin+location.pathname+`?collection=${filter.link}`+location.hash:Collection.url({title:filter.name, intro:filter.intro, items:filter.items}), def:!out.some(c=>c.def)}); }
  return out;
}
const shareChoice=v=>{ const cs=shareChoices(v); return cs.find(c=>c.kind===shareKind)||cs[0]; };
const SHARE_WHAT={moment:'The link carries this piece\'s parameters, colors, font, speed and the current moment <i>t</i>.',
  lesson:'The link plays the lesson from moment 1, each moment with its note.',
  collection:'The link plays the whole list in the feed, each moment with its note.'};
/* the link, the snippets and the label for the current pick */
function shareSync(){
  const sl=shareSl; if(!sl) return; const v=sl.v, c=shareChoice(v), list=c.kind!=='moment';
  $('#share-url').value=c.url;
  $('#share-url-l').textContent=list?`Link to ${c.kind==='collection'?'the list':'the lesson'}`:'Link to this moment';
  $('#share-url-d').innerHTML=SHARE_WHAT[c.kind]+(list||!$('#share-pick').hidden?'':' To send several moments with a sentence each, of this piece or of several, add each to a list with Add this moment (also under Save and Customize): one link plays the list.');
  const embUrl=c.kind==='collection'?shareURL(v):c.url; // collections can't be embedded yet: the embed is this moment
  $('#share-emb').textContent=embedHTML(v,embUrl);
  $('#share-emb-n').textContent=`${c.kind==='collection'?'Lists across pieces can\'t be embedded yet, so this embeds this moment. ':list?'The embed steps through the lesson\'s moments. ':''}The embed shows a still with a Play button until clicked, so a page of several embeds starts no animations by itself.`;
  shareStillReset(); beamerSync();
}
function shareStillReset(){ shareStill=null; shareStillN++; $('#share-img').textContent='Not rendered yet: Render image draws this moment once, at 480 × 480.'; $('#share-copy-img').disabled=true; $('#share-img-go').disabled=false; }
function shareRenderStill(){
  const sl=shareSl; if(!sl) return; const v=sl.v, url=$('#share-url').value, t=timeOf(v), view=viewOf(v), n=++shareStillN, pre=$('#share-img');
  pre.textContent='Rendering the still…'; $('#share-img-go').disabled=true;
  stillFor(v,t,view).then(src=>{ if(n!==shareStillN) return; shareStill=stillHTML(v,src,url); pre.textContent=shortData(shareStill); $('#share-copy-img').disabled=false; $('#share-img-go').disabled=false; },
    e=>{ if(n!==shareStillN) return; pre.textContent=`No still in this browser: ${e.message}`; $('#share-img-go').disabled=false; });
}
function openShare(sl,opener){
  const v=sl.v, rem=remixes.has(rkey(v)); shareSl=sl;
  const cs=shareChoices(v); shareKind=(cs.find(c=>c.def)||cs[0]).kind; // a playing lesson or list is the default link
  $('#share-pick').hidden=cs.length<2;
  $('#share-opts').innerHTML=cs.length<2?'':cs.map(c=>`<label class="check"><input type="radio" name="share-kind" value="${c.kind}"${c.kind===shareKind?' checked':''}> ${esc(c.label)}</label>`).join('');
  $('#share-h').textContent=v.title; $('#share-msg').textContent='';
  shareSync(); const url=$('#share-url').value;
  $('#share-note').textContent=rem?'This piece is remixed. Remixes are not shareable in this mockup, so the link opens the original module with your parameters, colors and time.':'';
  $('#share-note').hidden=!rem;
  $('#clip').hidden=true; $('#share-clip').setAttribute('aria-expanded','false'); // the recorder opens collapsed, with this slide's t
  renderPropose(v);
  showDialog('#sharemodal','#share-url',opener);
  const fail=()=>{ $('#share-msg').textContent='Copying is blocked here. The link below is selected: copy it with Ctrl+C (⌘C on a Mac).'; if(rem) toast('Remixes are not shareable in this mockup, so the link opens the original.'); };
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(url):Promise.reject()).then(()=>{
    $('#share-msg').textContent=`${shareKind==='moment'?'Link':shareKind==='collection'?'Link to the list':'Link to the lesson'} copied to the clipboard.`;
    toast(rem?'Link copied. Remixes are not shareable in this mockup, so it opens the original.':'Link copied');
  },fail);
}
$('#share-opts').addEventListener('change',e=>{ const r=e.target.closest('input[name="share-kind"]'); if(!r||!shareSl) return; shareKind=r.value; shareSync(); $('#share-msg').textContent=''; announce(`${$('#share-url-l').textContent}. Copy link copies it.`); });
$('#share-url').addEventListener('focus',e=>{ const u=e.target; u.setSelectionRange(0,u.value.length,'backward'); }); // backward: the start of the link stays in view
$('#share-copy').onclick=()=>{ const u=$('#share-url'); copyText(u.value,shareSl&&remixes.has(rkey(shareSl.v))?'Link copied. Remixes are not shareable in this mockup.':'Link copied'); u.focus(); };
$('#share-copy-emb').onclick=()=>copyText($('#share-emb').textContent,shareSl&&remixes.has(rkey(shareSl.v))?'Embed copied. Remixes are not shareable, so it embeds the original.':'Embed copied');
$('#share-img-go').onclick=shareRenderStill;
$('#share-copy-img').onclick=()=>{
  if(!shareStill) return toast('Render the image first.');
  const all=shareStill; (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(all):Promise.reject()).then(()=>toast('Static image snippet copied'),()=>{ // blocked: show it in full, selected, for Ctrl+C
    const pre=$('#share-img'); pre.textContent=all; const r=document.createRange(); r.selectNodeContents(pre); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(r);
    toast(`Copying is blocked here. The full snippet is selected: copy it with ${MOD_KEY}+C.`); });
};
$('#share-ask').onclick=()=>{ const sl=shareSl; hideDialog($('#sharemodal')); if(!sl) return; openDrawer('explain',sl.v); setTimeout(()=>{ const q=$('#qa-text'); if(q){ q.scrollIntoView({block:'center'}); q.focus({preventScroll:true}); } },80); };
$('#share-frame').onclick=()=>{ if(shareSl) saveFrame(shareSl); };

/* ---------- record clip (docs/ideas/07-clip-recorder.md) ----------
   A dedicated hidden handle, never the visible slide: mounted paused on a detached canvas at the box size (or with
   the longest side at 720 px, the same layout at a higher dpr), then seek(t) + capture() for each frame, in order.
   GIF: one global palette (median cut over a few sampled frames), then each frame is mapped, cropped to what changed
   and LZW-encoded as it arrives (gif.js), with a yield to the page between frames. PNG zip: the frames as PNGs for
   \animategraphics. The watermark strip under the box prints a typeable short link and the values (clipStripText). */
const CLIP_MAX=240, CLIP_SAMPLES=6, CLIP_MONO='"IBM Plex Mono", ui-monospace, monospace';
let clipJob=null;
const clipCancelled=new Error('cancelled');
const clipFmtTime=s=>s<1?'under a second':s<90?`about ${Math.round(s)} s`:`about ${Math.round(s/60)} min`;
/* bytes per output pixel measured on this piece's last recording: {first, rest} per piece, format and size (the first GIF frame is
   whole, later ones are only what changed). Without one the estimate is a dense-picture guess, which can be 20× high for a sparse piece. */
const clipCal=new Map(), clipCalKey=(v,P)=>`${v.id}|${P.fmt}|${P.size}|${P.wm?1:0}`;
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
  const cal=clipCal.get(clipCalKey(sl.v,P)), px=ow*P.oht; P.cal=!!cal;
  P.bytes=cal?px*(cal.first+cal.rest*(n-1)):fmt==='zip'?n*px*0.8:px*(0.5+0.2*(n-1));
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
  $('#clip-est').textContent=P.error?P.error:`${P.n} frames at ${P.ow} × ${P.oht} px: rendering takes ${clipFmtTime(P.n*P.msPer/1000)}, and the ${P.fmt==='zip'?'zip':'GIF'} is an estimated ${clipMB(P.bytes)} (${P.cal?'from your last recording of this piece':'a first guess; recalibrated from the first frame once it records'}).${hint}`;
}
function openClip(){
  const sl=shareSl; if(!sl) return;
  const sec=$('#clip'), show=sec.hidden; sec.hidden=!show; $('#share-clip').setAttribute('aria-expanded',show);
  if(!show) return;
  const t=sl.host?sl.host.getTime():sl.t??sl.v.t0??0, i=Math.max(0,Math.round(t*10)/10);
  $('#clip-in').value=i.toFixed(1); $('#clip-out').value=(i+4).toFixed(1); $('#clip-msg').textContent='';
  clipSyncUI(); $('#clip-in').focus();
}
/* the strip under the box: the theme background, a hairline, and a line someone can type from a slide: the piece's
   short page (v/<id>, which redirects to ?v=<id>) and the values that differ from the defaults, with the in point,
   e.g. "example.org/v/times-table · n = 101 · t = 258 s". Too wide, it drops the host, then the values, then shrinks. */
function clipStripText(v,params,t){
  const def=normalizeParams(v.manifest,{}), vals=paramControls(v.manifest).filter(c=>params[c.key]!==def[c.key]).map(c=>{ const x=params[c.key], o=c.options&&c.options.find(o=>o.value===x); return `${c.key} = ${o?o.label:c.format?c.format(x):x}`; });
  vals.push(`t = ${+(+t).toFixed(1)} s`);
  const host=(location.host+location.pathname.replace(/[^/]*$/,'')).replace(/\/$/,''), short=`v/${v.id}`, tail=' · '+vals.join(' · ');
  return [`${host}/${short}${tail}`, `loci · ${short}${tail}`, `${host}/${short}`, `loci · ${short}`];
}
function paintClipStrip(c,P,theme,lines){
  const k=P.k, y=P.oh, pad=Math.round(8*k), room=P.ow-2*pad;
  c.fillStyle=theme.bg; c.fillRect(0,y,P.ow,P.strip);
  c.globalAlpha=0.3; c.fillStyle=theme.fg; c.fillRect(0,y,P.ow,Math.max(1,Math.round(k))); c.globalAlpha=0.8;
  let fs=11*k, txt=lines[0]; const set=()=>{ c.font=`${fs}px ${CLIP_MONO}`; }; set();
  for(const l of lines){ txt=l; fs=11*k; set(); while(c.measureText(txt).width>room && fs>9*k){ fs-=0.5*k; set(); } if(c.measureText(txt).width<=room) break; }
  while(c.measureText(txt).width>room && fs>7*k){ fs-=0.5*k; set(); }
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
  const pick=shareChoice(v), list=pick.kind!=='moment'; // Share's link pick: a lesson or list goes in the .tex, and in the strip when it fits
  const link=list?pick.url:shareURL(v,P.i), strip=(list?[pick.url.replace(/^https?:\/\//,'')]:[]).concat(clipStripText(v,params,P.i)); // the full link goes in the .tex; the strip prints what can be typed
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
    if(P.wm) paintClipStrip(c,P,theme,strip);
    if(job.cancelled) throw clipCancelled;
  };
  const t0=performance.now(); let done=0, bytes=0, first=0, same=0, result=null;
  // the estimate in all, from what has actually been encoded: the first frame, then the mean of the later ones
  // (before a second frame, a GIF's later frames are guessed at 0.4 of the first, the ratio of the dense guess)
  const total=()=>done<2?first*(1+(P.fmt==='zip'?1:0.4)*(P.n-1)):first+(bytes-first)/(done-1)*(P.n-1);
  const tick=()=>{ done++; if(done===1) first=bytes; prog.value=done/P.n; const el=(performance.now()-t0)/1000, left=el/done*(P.n-done);
    est.textContent=`Frame ${done} of ${P.n} · ${done<P.n?clipFmtTime(left)+' left':'finishing'} · ${clipMB(bytes)} so far, an estimated ${clipMB(total())} in all`; };
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
      const tex=`% ${v.title} on ${site()}, t = ${P.i.toFixed(1)} to ${P.o.toFixed(1)} s: ${link}\n% \\usepackage{animate} in the preamble; unzip the frames next to the .tex file.\n\\animategraphics[loop,autoplay,controls,width=\\linewidth]{${P.fps}}{${v.id}-}{000}{${pad(P.n-1)}}\n`;
      files.push({name:'animate.tex', bytes:new TextEncoder().encode(tex)});
      result={blob:LociGif.zip(files), file:name+'-frames.zip'};
    }
  }catch(e){
    if(e!==clipCancelled && !job.cancelled){ console.warn('loci: clip failed',e.message); msg.textContent=`Recording failed: ${e.message}`; }
  }finally{
    if(result && done>=2) clipCal.set(clipCalKey(v,P),{first:first/(P.ow*P.oht), rest:(bytes-first)/(done-1)/(P.ow*P.oht)}); // the next estimate for this piece starts from this one
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
/* ---------- Export to Beamer (docs/ideas/round2/208): stills only ----------
   Of the lesson or list that is playing (Share's pick when it is one), else of the list you are drafting in Moments:
   the one open there, else one that holds this piece, else your newest. At most Collection.MAX_ITEMS moments. Each
   still is rendered as the clip recorder renders a frame: a hidden handle on a detached canvas, mounted paused at the
   moment's own params, t, view and mode, then seek + capture, BEAMER_W px wide. The viewer's theme is the only setting
   of theirs it uses, and the slide on screen is left alone. beamer.js writes slides.tex, qr/NN.tex, loci.bib and the README. */
const BEAMER_BOX={w:800,h:500}, BEAMER_W=1600;
let beamerJob=null;
function beamerSource(v){
  const cs=shareChoices(v).filter(c=>c.kind!=='moment'), pick=cs.find(c=>c.kind===shareKind)||cs[0];
  if(pick && pick.kind==='lesson'){ const L=lessonPlay; return {title:L.lesson.title||v.title, items:L.lesson.stops.map(s=>({...s, v:v.id})), url:pick.url, what:'the lesson that is playing'}; }
  if(pick) return {title:filter.name, items:filter.items, url:pick.url, what:'the list that is playing'};
  const ls=moLists(), open=moOf(), c=(open&&open.items.length?open:null)||ls.find(x=>x.items.some(it=>it.v===v.id))||ls.find(x=>x.items.length);
  return c?{title:c.title||'Untitled list', items:c.items, url:Moments.url(c), what:'your list'}:null;
}
/* one moment's own link: the share-link form (?v=&p=), its params, t and view plus the theme the still was drawn in */
function momentURL(v,it){
  const o={v:v.id}, s=getSettings(v), th={};
  if(!it.bare){ const c=Lesson.compact(v,it); if(c.p) o.p=c.p; if(c.t!=null) o.t=c.t; if(c.view!=null) o.view=c.view; }
  for(const k in THEME_DEF) if(s[k]!==THEME_DEF[k]) th[k]=s[k]; if(Object.keys(th).length) o.theme=th;
  return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}`+(Object.keys(o).length>1?`&p=${b64u.enc(JSON.stringify(o))}`:'')+(it.mode?`&mode=${it.mode}`:'')+location.hash;
}
function beamerSync(){
  const sl=shareSl; if(!sl || beamerJob) return; const src=beamerSource(sl.v), b=$('#share-beamer'), d=$('#share-beamer-d');
  b.disabled=!src;
  if(!src){ d.textContent='Export to Beamer makes a zip of slides from a list of moments: play a lesson or a list, or add moments to a list with Add this moment (in Customize or Save), then export it here.'; return; }
  const n=Math.min(src.items.length,Collection.MAX_ITEMS);
  d.textContent=`Export to Beamer zips ${src.what}, “${src.title||'Untitled list'}”, as ${n} slide${n===1?'':'s'}: the note as the title, a ${BEAMER_W} px still at the moment's own settings, a QR code and its link, plus loci.bib. Compile with lualatex (README.txt).`;
}
async function exportBeamer(){
  const sl=shareSl; if(!sl || beamerJob) return;
  const src=beamerSource(sl.v), msg=$('#bm-msg'), prog=$('#bm-prog'), btn=$('#share-beamer'); if(!src) return beamerSync();
  const items=src.items.slice(0,Collection.MAX_ITEMS), n=items.length, job={cancelled:false, h:null}; beamerJob=job;
  prog.hidden=false; prog.value=0; $('#bm-ctl').hidden=false; btn.disabled=true; msg.textContent='';
  const k=BEAMER_W/BEAMER_BOX.w, out=document.createElement('canvas'); out.width=BEAMER_W; out.height=Math.round(BEAMER_BOX.h*k);
  const c=out.getContext('2d'), enc=s=>new TextEncoder().encode(s), files=[], moments=[], pieces=new Map(), t0=performance.now();
  let result=null, failed=0;
  try{
    for(let j=0;j<n;j++){
      const it=items[j], v=vizById(it.v), NN=LociBeamer.pad(j+1); if(!v) continue;
      msg.textContent=`Rendering moment ${j+1} of ${n}: ${v.title}…`;
      const params=normalizeParams(v.manifest,it.bare?{}:it.p), t=it.bare?(v.t0||0):(it.t||0), view=it.bare?null:normalizeView(it.view), theme=themeFor(v);
      const ch=targetFor(v.manifest,capsFor(BEAMER_BOX,it.mode||null));
      let still=null;
      if(!ch.fallback){
        let fail; const err=new Promise((_,rej)=>fail=rej); err.catch(()=>{});
        const h=job.h=LociHost.mount(document.createElement('canvas'),originalSpec(v,ch.id),{theme, params, box:{x:0,y:0,...BEAMER_BOX}, dpr:k, t, speed:1, playing:false,
          size:{...BEAMER_BOX}, target:ch.id, label:'beamer', view, onError:(kind,m)=>fail(new Error(`${kind}: ${m}`))});
        try{
          h.seek(t); const blob=await Promise.race([h.capture(),err]); if(job.cancelled) throw clipCancelled;
          const bm=await createImageBitmap(blob); c.fillStyle=theme.bg; c.fillRect(0,0,out.width,out.height); c.drawImage(bm,0,0,out.width,out.height); if(bm.close) bm.close();
          const png=await new Promise((res,rej)=>out.toBlob(b=>b?res(b):rej(new Error('could not encode a PNG')),'image/png'));
          files.push({name:`stills/${NN}.png`, bytes:new Uint8Array(await png.arrayBuffer())}); still=`stills/${NN}.png`;
        }catch(e){ if(e===clipCancelled || job.cancelled) throw clipCancelled; failed++; console.warn(`loci: beamer export: moment ${j+1} (${v.id}) has no still: ${e.message}`); }
        finally{ h.dispose(); job.h=null; }
      } else failed++;
      if(job.cancelled) throw clipCancelled;
      const url=momentURL(v,it), code=typeof QR!=='undefined'?QR.encode(url):null;
      if(code) files.push({name:`qr/${NN}.tex`, bytes:enc(LociBeamer.qr(code,url))});
      moments.push({k:j+1, title:v.title, id:v.id, note:it.note, url, still, qr:code?`qr/${NN}.tex`:null, line:LociBeamer.note(clipStripText(v,params,t)[1])});
      if(!pieces.has(v.id)) pieces.set(v.id,{id:v.id, title:v.title, author:v.author, url:location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}`, reviewed:v.lane==='new'?null:v.reviewed});
      prog.value=(j+1)/n; await new Promise(r=>setTimeout(r,0));
    }
    const doc={title:src.title, listURL:src.url, moments, size:`${out.width} × ${out.height}`};
    files.unshift({name:'slides.tex', bytes:enc(LociBeamer.slides(doc))}, {name:'loci.bib', bytes:enc(LociBeamer.bib([...pieces.values()],new Date().getFullYear()))}, {name:'README.txt', bytes:enc(LociBeamer.readme(doc))});
    const slug=(src.title||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'loci-list';
    result={blob:LociGif.zip(files), file:`${slug}-beamer.zip`};
  }catch(e){
    if(e!==clipCancelled && !job.cancelled){ console.warn('loci: beamer export failed',e.message); msg.textContent=`The export failed: ${e.message}`; }
  }finally{
    if(job.h) job.h.dispose(); if(beamerJob===job) beamerJob=null;
    prog.hidden=true; $('#bm-ctl').hidden=true; beamerSync(); if(job.refocus) $('#share-beamer').focus(); // Cancel was focused, and is hidden now
  }
  if(job.cancelled){ msg.textContent='Cancelled. Nothing was saved.'; return; }
  if(!result) return;
  download(result.blob,result.file);
  const secs=(performance.now()-t0)/1000;
  msg.textContent=`Saved ${result.file} (${clipMB(result.blob.size)}): ${moments.length} slide${moments.length===1?'':'s'}, rendered in ${secs<10?secs.toFixed(1):Math.round(secs)} s.${failed?` ${failed} moment${failed===1?' has':'s have'} no still (this browser could not run ${failed===1?'its piece':'their pieces'}); ${failed===1?'its slide keeps':'their slides keep'} the link.`:''} Compile with lualatex slides.tex.`;
  toast(`Saved ${result.file}`);
}
function cancelBeamer(){ const j=beamerJob; if(!j) return; j.cancelled=true; if(j.h) j.h.dispose(); }
$('#share-beamer').onclick=exportBeamer;
$('#bm-cancel').onclick=()=>{ if(beamerJob) beamerJob.refocus=true; cancelBeamer(); };
/* ---------- "Propose this moment as a preset" (docs/ideas/18-found-by-presets.md) ----------
   Captures the moment (params, t, view), a label and one sentence, and opens a prefilled issue on the piece's repository,
   where the author decides. Nothing is shown as accepted: the prototype keeps only a local "Your proposals" list
   ('loci:preset-proposals'). The finder is your one handle ('loci:handle', yours.js), set on Yours or in the keys dialog.
   Refused: the default state, and a state equal to an authored preset. The comparison is the complete normalized params
   and the view; t counts only against a preset that has a t (within 3 s), since without a param change or a view
   a moment of the default animation is not a preset. */
const PP_KEY='loci:preset-proposals';
const ppLoad=()=>{ const a=LociAPI.proposals.get(PP_KEY,[]); return Array.isArray(a)?a.filter(x=>x&&typeof x.v==='string'&&typeof x.label==='string'&&typeof x.url==='string'&&/^https:\/\/github\.com\//.test(x.url)):[]; };
function ppCapture(v){
  const st=Lesson.capture(v,''), params=normalizeParams(v.manifest,st.p||{});
  return {params, t:st.t, view:st.view};
}
function ppProblem(v,c){
  const def=normalizeParams(v.manifest,{}), same=(a,b)=>JSON.stringify(a)===JSON.stringify(b), view=c.view??null;
  if(same(c.params,def) && view==null) return 'That is the default state: change a parameter or move the view first. The moment t alone is not a preset.';
  const hit=(v.manifest.presets||[]).find(p=>same(normalizeParams(v.manifest,p.params),c.params) && same(p.view??null,view) && (p.t==null || Math.abs((c.t||0)-p.t)<3));
  return hit?`That is already the preset “${hit.label}”.`:null;
}
function ppSummary(v,c){
  const bits=paramControls(v.manifest).filter(k=>c.params && k.key in c.params).map(k=>`${k.label} ${k.format?k.format(c.params[k.key]):c.params[k.key]}`);
  bits.push(`t = ${(c.t||0).toFixed(2)} s`); if(c.view!=null) bits.push('your view'); return bits.join(' · ');
}
function ppListHTML(){
  const list=ppLoad();
  if(!list.length) return `<p class="fine">None yet. Proposals you send are listed here, in this browser only.</p>`;
  return `<ol class="ls-stops" role="list">${list.map((x,i)=>{ const o=vizById(x.v);
    return `<li><span class="ls-txt"><b>${esc(x.label)}</b><small>${esc(o?o.title:x.v)} · ${esc(x.at||'')} · sent to the author, not accepted</small><a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">Open the issue on GitHub</a></span>
      <button class="iconbtn" type="button" data-ppdel="${i}" aria-label="Remove proposal: ${esc(x.label)}">${ICON.close}</button></li>`; }).join('')}</ol>`;
}
function renderPropose(v){
  const c=ppCapture(v);
  $('#pp-state').textContent=`This moment: ${ppSummary(v,c)}.`;
  $('#pp-repo').textContent=v.repo;
  $('#pp-msg').textContent=''; $('#pp-list').innerHTML=ppListHTML();
  renderPpWho();
}
function renderPpWho(){ const h=myHandle(), w=$('#pp-who'); if(!w) return;
  w.innerHTML=h?`The issue credits you as <b>${esc(h)}</b>, your handle. <button class="linkbtn" type="button" data-pp-handle>Change it</button>`
    :`No handle set, so the issue credits nobody. <button class="linkbtn" type="button" data-pp-handle>Set your handle</button>`; }
$('#pp-who').addEventListener('click',e=>{ const b=e.target.closest('[data-pp-handle]'); if(b) openKeys(b); }); // the keys dialog, over Share
$('#pp-go').onclick=()=>{
  if(!shareSl) return; const v=shareSl.v, msg=$('#pp-msg'), c=ppCapture(v);
  const label=$('#pp-label').value.trim(), note=$('#pp-note').value.trim(), handle=myHandle();
  const bad=ppProblem(v,c)||(!label?'Give it a label with the value in it, like “r = 3.50, a 4-cycle”.':!note?'Add one sentence on what to look for.':null);
  if(bad){ msg.textContent=bad; return; }
  const preset={label, params:c.params, ...(c.t!=null?{t:c.t}:{}), ...(c.view!=null?{view:c.view}:{}), note, ...(handle?{foundBy:handle}:{})};
  const fence='```';
  const body=`${handle?`${handle} proposes`:'A viewer proposes'} a "Try this" preset for **${v.title}** (${v.id}), found on ${site()}.\n\n> ${note}\n\nTo accept it, add this to "presets" in loci.json${handle?' (foundBy credits the finder on the pill)':''}:\n\n${fence}json\n${JSON.stringify(preset,null,2)}\n${fence}\n\nOpen this moment: ${shareURL(v)}\n`;
  const url=`https://${v.repo.split('/').slice(0,3).join('/')}/issues/new?title=${encodeURIComponent('Preset proposal: '+label)}&body=${encodeURIComponent(body)}`;
  const list=ppLoad(); list.unshift({v:v.id, label, note, preset, url, at:new Date().toISOString().slice(0,10)}); LociAPI.proposals.set(PP_KEY,list.slice(0,20));
  $('#pp-list').innerHTML=ppListHTML(); $('#pp-label').value=''; $('#pp-note').value='';
  msg.textContent=`Opening a prefilled issue on ${v.repo}. The author decides; nothing changes here until they add it.`;
  window.open(url,'_blank','noopener');
};
$('#pp-list').addEventListener('click',e=>{ const b=e.target.closest('[data-ppdel]'); if(!b) return; const list=ppLoad(), x=list.splice(+b.dataset.ppdel,1)[0]; LociAPI.proposals.set(PP_KEY,list); $('#pp-list').innerHTML=ppListHTML(); $('#pp-msg').textContent=x?`Removed “${x.label}” from your list. An issue you opened stays on GitHub.`:''; refocus('#pp-label'); });
$('#share-moment').onclick=e=>{ if(shareSl) openMoments(shareSl.v,e.currentTarget); }; // a second dialog over Share; closing it returns here
$('#share-present').onclick=()=>{ const sl=shareSl, k=shareKind; hideDialog($('#sharemodal')); if(sl){ enterPresent(sl); if(present){ present.linkKind=k; presentQR(); } } }; // the QR follows Share's link pick
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
function exitFull(){ return present?exitPresent():leaveFull(); }
/* leave full screen completely: goTo stacks one full-screen slide on another, and exitFullscreen pops one at a time */
async function leaveFull(){
  for(let n=0; document.fullscreenElement && n<8; n++) await document.exitFullscreen().catch(()=>{});
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
  else if(act==='question'){ openDrawer('explain',sl.v,opener); $('#d-body').scrollTop=0; } // the pinned question (questions.js) heads the tab
  else if(act==='full') enterFull(sl);
  else if(act==='save') toggleSave(sl);
  else if(act==='frame') saveFrame(sl);
  else if(act==='share') openShare(sl,opener);
  else if(act==='more') openMore(sl,opener);
  else if(act==='present') enterPresent(sl);
  else if(act==='compare') toggleCompare(sl);
  else if(act==='focus') setFocus(!focusOn);
  else if(act==='deletepg') deletePlayground(sl.v);
  else if(act==='unremix'){ const f=sl.el.contains(document.activeElement); unremix(sl.v); if(f) refocus('[data-act="pause"]',sl.el); }
}

/* ---------- chips / filter ---------- */
function tagCounts(){ const m=new Map(); VIZ.forEach(v=>v.tags.forEach(t=>m.set(t,(m.get(t)||0)+1))); return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])); }
function renderChips(){
  const ti=on=>` aria-pressed="${on}" tabindex="${on?0:-1}"`;
  let h=`<button class="chip" type="button" data-chip="all"${ti(filter.type==='all')}>All<span class="n"><span class="sr">,</span> ${VIZ.length}</span></button>`;
  h+=`<button class="chip" type="button" data-chip="@foryou"${ti(filter.type==='foryou')}>For you</button>`;
  h+=`<button class="chip" type="button" data-chip="@new"${ti(filter.type==='new')}>New<span class="n"><span class="sr">,</span> ${VIZ.filter(v=>v.lane==='new').length}</span></button>`;
  if(LociAPI.server) h+=`<button class="chip" type="button" data-chip="@playground"${ti(filter.type==='playground')} title="What you posted on this demo server. Only you can see these. Not reviewed.">Playground<span class="n"><span class="sr">,</span> ${PLAYGROUND.length}</span></button>`;
  if(sig.saves.length || filter.type==='saved') h+=`<button class="chip" type="button" data-chip="@saved"${ti(filter.type==='saved')}>Saved<span class="n"><span class="sr">,</span> ${sig.saves.length}</span></button>`;
  if(filter.type==='starter') h+=`<button class="chip" type="button" data-chip="all"${ti(true)} aria-label="New visualization, yours. Back to all">✎ New visualization ✕</button>`;
  if(filter.type==='playlist') h+=`<button class="chip" type="button" data-chip="all"${ti(true)} aria-label="Playlist: ${esc(filter.name)}. Clear playlist">▶ ${esc(filter.name)} ✕</button>`;
  h+=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-chip="${esc(t)}"${ti(filter.type==='tag'&&filter.value===t)}>${esc(t)}<span class="n"><span class="sr">,</span> ${n}</span></button>`).join('');
  $('#chips').innerHTML=h;
  if(filter.type==='playlist'){ const box=$('#chips'), c=$('[aria-label^="Playlist"]',box); if(c){ const r=c.getBoundingClientRect(), b=box.getBoundingClientRect(); if(r.right>b.right) box.scrollLeft+=r.left-b.left-16; } } // the playing list's chip in view on a phone
}
function setFilter(f){
  const had=$('#chips').contains(document.activeElement);
  if(lessonPlay) Lesson.exit(true); Collection.restore(filter); // in this order: a lesson inside a list snapshotted the item's params
  filter=f; renderChips(); buildFeed();
  if(f.link || new URLSearchParams(location.search).has('collection')){ if(f.link) syncURL(); else try{ history.replaceState(history.state,'',location.pathname+location.hash); }catch(_){} }
  store.set('loci:filter',f.type==='saved'||f.type==='foryou'?f.type:null,true);
  if(had){ const c=$('#chips [aria-pressed="true"]'); c.focus(); c.scrollIntoView({block:'nearest', inline:'nearest'}); }
  const n=slides.length;
  announce(f.type==='starter'?'Showing your new visualization alone. Its chip goes back to all.':f.type==='new'?`Showing ${n} new visualization${n===1?'':'s'}: checked by machine, community review of the mathematics pending`:f.type==='tag'?`Showing ${n} visualization${n===1?'':'s'} tagged ${f.value}`:f.type==='playlist'?`Playing ${n} visualizations from ${f.name}.${collSay()}`
    :f.type==='playground'?`Showing your ${n} Playground post${n===1?'':'s'}, visible only to you and not reviewed`:f.type==='saved'?`Showing your ${n} saved visualization${n===1?'':'s'}, in the order you saved them`:f.type==='foryou'?`Showing all ${n} visualizations, ordered by the topics you've liked, saved and watched`:`Showing all ${n} visualizations`);
}
/* what a collection says when it starts: its intro and item 1's note */
function collSay(){ const it=filter.items&&filter.items[0]; return [filter.intro,it&&it.note].filter(Boolean).map(x=>' '+x).join(''); }
/* roving focus for a row of buttons (tabs, chip toolbar). Returns the newly focused button or null. */
function rove(e,items,vertical){
  const keys=vertical?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'], i=items.indexOf(document.activeElement); if(i<0) return null;
  let j=e.key===keys[0]?i-1:e.key===keys[1]?i+1:e.key==='Home'?0:e.key==='End'?items.length-1:null; if(j===null) return null;
  e.preventDefault(); e.stopPropagation(); j=(j+items.length)%items.length;
  items.forEach((b,k)=>b.tabIndex=k===j?0:-1); items[j].focus(); return items[j];
}
$('#chips').addEventListener('keydown',e=>{ const b=rove(e,$$('.chip',$('#chips'))); if(b) b.scrollIntoView({block:'nearest', inline:'nearest'}); });
$('.tabs').addEventListener('keydown',e=>{ const b=rove(e,$$('.tab:not([hidden])')); if(b) showView(b.dataset.view); });
$('.dtabs').addEventListener('keydown',e=>{ const b=rove(e,$$('.dtab')); if(b){ dTab=b.dataset.dtab; unpeek(true); renderDrawer(); } });

/* ---------- drawer ---------- */
/* ---------- modal dialogs: focus in, Tab trapped, Esc closes, focus returns, the rest of #app inert ---------- */
const modals=[];
const focusables=el=>$$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])',el).filter(x=>x.getClientRects().length && !x.closest('[inert]'));
function openModal(el,focusEl,opener){
  if(modals.some(m=>m.el===el)) return;
  if(engagedSl) release(engagedSl);
  const m={el, opener:opener||document.activeElement, inerted:[], uninerted:[]};
  for(let n=el; n && n.id!=='app'; n=n.parentElement) if(n.inert){ n.inert=false; m.uninerted.push(n); } // a dialog over a dialog (Moments over Share or Customize): the one below made this one inert
  for(let n=el; n.parentElement && n.id!=='app'; n=n.parentElement) for(const sib of n.parentElement.children) if(sib!==n && !sib.inert){ sib.inert=true; m.inerted.push(sib); }
  modals.push(m);
  setTimeout(()=>(focusEl||focusables(el)[0]||el).focus({preventScroll:true}),30);
}
function closeModal(el){
  const i=modals.findIndex(m=>m.el===el); if(i<0) return;
  const [m]=modals.splice(i,1); m.inerted.forEach(x=>x.inert=false); m.uninerted.forEach(x=>x.inert=true);
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
function hideDialog(el){ if(el.hidden) return; if(el.id==='sharemodal'){ cancelClip(); cancelBeamer(); } el.hidden=true; closeModal(el); } // closing the share dialog stops a recording
function closeTopModal(){ const m=modals[modals.length-1]; if(!m) return; m.el===drawer?closeDrawer():m.el===more?closeMore():hideDialog(m.el); }

/* ---------- drawer ---------- */
function openDrawer(tab,v,opener){
  unpeek(true); dTab=tab; dViz=v; drawer.classList.add('open'); drawer.inert=false; renderDrawer(); if(cmpSl) sizeCanvas(cmpSl); // compare: the halves move clear of the drawer
  openModal(drawer,$(`#dtab-${tab}`),opener);
}
function closeDrawer(){ if(!dTab) return; whyExit(true); dTab=null; unpeek(true); drawer.classList.remove('open'); drawer.style.transform=''; closeModal(drawer); drawer.inert=true; if(cmpSl) sizeCanvas(cmpSl); }
const isSheet=()=>matchMedia('(max-width:699px)').matches;
/* Peek (docs/ideas/round2/203, phase 1): on phones the sheet covers 82% of the screen, so a drawer action that changes
   the picture (a Try-this pill, a #preset:/#t:/#state: link, a Why-it-works step, Show me, the Mode switch) drops it to
   a 35% peek: handle, header, tabs and the control just used stay visible, the picture shows above. A tap on the handle
   or header, a tab, or Expand restores the full sheet at the scroll position it had; a swipe down still closes it. */
const PEEK=0.35;
let peekScroll=null;
const peeked=()=>drawer.classList.contains('peek');
const peekPx=()=>Math.round((drawer.offsetParent||document.body).clientHeight*PEEK);
const peekOffset=()=>Math.max(0,drawer.offsetHeight-peekPx());
/* the top of the peeked sheet in viewport coordinates, or null */
function peekTop(){ if(!peeked()) return null; const r=(drawer.offsetParent||document.body).getBoundingClientRect(); return r.bottom-peekPx(); }
function peekDrawer(src){
  if(!dTab || !isSheet() || drawer.classList.contains('editing')) return;
  const b=$('#d-body');
  if(!peeked()){ peekScroll=b.scrollTop; drawer.classList.add('peek'); $('#d-expand').hidden=false; announce('Panel lowered so the picture shows. Expand restores it.'); }
  drawer.style.transform=`translateY(${peekOffset()}px)`;
  const el=typeof src==='string'?$(src,b):src;
  if(el && b.contains(el)){ // keep the control just used inside the visible band of the body
    const band=peekPx()-(b.getBoundingClientRect().top-drawer.getBoundingClientRect().top), er=el.getBoundingClientRect(), y=er.top-b.getBoundingClientRect().top+b.scrollTop;
    if(y<b.scrollTop || y+Math.min(er.height,band-16)>b.scrollTop+band) b.scrollTop=Math.max(0,y-Math.max(8,band-er.height-8));
  }
  const sl=curSlide(); if(sl) placeOverlays(sl);
}
function unpeek(quiet){
  if(!peeked()) return; drawer.classList.remove('peek'); $('#d-expand').hidden=true;
  if(dTab) drawer.style.transform='';
  if(peekScroll!=null) $('#d-body').scrollTop=peekScroll; peekScroll=null;
  const sl=curSlide(); if(sl) placeOverlays(sl);
  if(!quiet) announce('Panel expanded.');
}
$('#d-expand').onclick=e=>{ e.stopPropagation(); unpeek(); refocus('#d-body'); };
drawer.addEventListener('click',e=>{ if(peeked() && e.target.closest('.grab,.dhead') && !e.target.closest('#d-close')) unpeek(); });
let drag=null;
drawer.addEventListener('pointerdown',e=>{ if(!isSheet() || !e.target.closest('.grab,.dhead') || e.button>0) return; drag={y:e.clientY, dy:0, t:performance.now(), id:e.pointerId, on:false, base:peeked()?peekOffset():0}; });
drawer.addEventListener('pointermove',e=>{
  if(!drag || e.pointerId!==drag.id) return; drag.dy=Math.max(-drag.base,e.clientY-drag.y);
  if(!drag.on && Math.abs(drag.dy)>8){ drag.on=true; drawer.classList.add('dragging'); try{ drawer.setPointerCapture(e.pointerId); }catch(_){} }
  if(drag.on) drawer.style.transform=`translateY(${drag.base+drag.dy}px)`;
});
const endDrag=e=>{
  if(!drag || e.pointerId!==drag.id) return; const d=drag; drag=null; if(!d.on) return;
  drawer.classList.remove('dragging'); drawer.style.transform=peeked()?`translateY(${peekOffset()}px)`:'';
  const up=e.type==='pointerup', fling=d.dy/(performance.now()-d.t);
  if(peeked()){ if(up && (d.dy<-40 || fling<-0.5)) unpeek(); else if(up && (d.dy>peekPx()*0.3 || fling>0.5)) closeDrawer(); }
  else if(up && (d.dy>drawer.offsetHeight*0.22 || fling>0.5)) closeDrawer();
  const swallow=ev=>{ ev.stopPropagation(); ev.preventDefault(); }; drawer.addEventListener('click',swallow,{capture:true, once:true}); setTimeout(()=>drawer.removeEventListener('click',swallow,{capture:true}),0);
};
drawer.addEventListener('pointerup',endDrag); drawer.addEventListener('pointercancel',endDrag);
/* a rail button that phones keep under More (.rb-desk) is not focusable there: More takes the focus instead */
function refocus(sel,root=document){ let el=$(sel,root); if(el && !el.getClientRects().length){ const s=el.closest('.slide'), m=s&&$('[data-act="more"]',s); if(m && m.getClientRects().length) el=m; } if(el) el.focus({preventScroll:true}); }

/* ---------- More (phones): the rail keeps Like, Share and More; everything else about the slide is in this sheet ----------
   On phones (narrower than 700 px, or a landscape phone) the slide shows the picture, a one-line title, the author and
   three buttons. More opens a sheet with the drawer's mechanics (the same dialog focus handling, grab handle and swipe
   down to close) listing the rail's other actions, then the piece's badges, hook, tags, license and repo, the question
   of the week and the Try-this pills. Wider screens never show More: their rail and caption are unchanged. */
const more=$('#more'), PHONE_Q='(max-width:699px), (orientation:landscape) and (max-height:500px)';
const phoneUI=()=>matchMedia(PHONE_Q).matches;
let moreSl=null;
$('#more-close').innerHTML=ICON.close;
const mrow=(act,icon,lbl,o={})=>`<button class="mrow${o.on?' on':''}" type="button" data-act="${act}"${o.aria?` aria-label="${esc(o.aria)}"`:''}${o.pressed!=null?` aria-pressed="${o.pressed}"`:''}${o.desc?` aria-describedby="${o.desc}"`:''}><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span>${o.key?`<kbd aria-hidden="true">${o.key}</kbd>`:''}</button>`;
function moreHTML(sl){
  const v=sl.v, cap=capOf(v), pz=pauseLabel(), saved=sig.saves.includes(v.id), pr=presetsOf(v), cmpWhy=cmpProblem(sl), tb=targetBadge(v,sl.fallback?null:sl.tid), rem=remixes.has(rkeyFor(v,sl.tid));
  return `<div class="m-acts" role="group" aria-label="Actions">
      ${mrow('save',ICON.bookmark,saved?'Saved':'Save',{on:saved, pressed:saved, aria:'Save', key:'B'})}
      ${mrow('pause',pz.icon,pz.lbl,{aria:pz.aria, key:'P'})}
      ${mrow('explain',ICON.sigma,'Explain',{key:'E'})}
      ${mrow('customize',ICON.sliders,'Customize',{key:'C'})}
      ${mrow('source',ICON.code,'Source',{key:'S'})}
      ${mrow('full',ICON.full,'Full screen',{key:'F'})}
      ${mrow('present',ICON.present,'Present',{desc:'m-present-d', key:'⇧F'})}
      ${mrow('frame',ICON.camera,'Save frame',{aria:'Save frame as PNG'})}
      ${mrow('focus',ICON.focus,'Focus',{pressed:focusOn, on:focusOn, desc:'m-focus-d', key:'Z'})}
      ${cmpWhy?'':mrow('compare',ICON.sliders,'Compare',{aria:'Compare two settings side by side', key:'X'})}
      ${v.pg?mrow('deletepg',ICON.trash,'Delete',{aria:`Delete ${cap.title} from the Playground`}):''}
    </div>
    <p class="fine m-note" id="m-present-d">Present is full screen for a talk: step the moments or presets with the arrow keys or a clicker.</p>
    <p class="fine m-note" id="m-focus-d">Focus shows only the picture while you scroll the feed; double-tap still likes. Tap the top edge for the top bar.</p>
    ${cmpWhy?`<p class="fine m-note">Compare (A and B side by side) ${esc(cmpWhy.replace(/^Compare /,''))}</p>`:''}
    <section class="m-about" aria-labelledby="m-about-h">
      <h3 class="flabel" id="m-about-h">About this piece</h3>
      <div class="who">${laneBadge(v)}${distBadge(v)}${tb?`<span class="lane tgt">${tb}</span>`:''}${rem?`<button class="badge" type="button" data-act="unremix" aria-label="Remixed. Use the original module"><b>Remixed</b> Use original</button>`:''}</div>
      <p class="hook">${esc(cap.hook)}</p>
      <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
      <div class="meta"><span class="oss">open source · ${esc(v.license)}</span><span>${esc(v.repo)}</span></div>
    </section>
    ${qwCard(v)}
    ${pr.length?`<section class="m-try" aria-labelledby="m-try-h"><h3 class="flabel" id="m-try-h">Try this</h3><div class="pills">${presetPills(v)}</div></section>`:''}`;
}
function renderMore(keep){
  const sl=moreSl; if(!sl) return; const cap=capOf(sl.v);
  $('#more-title').textContent=cap.title; $('#more-k').innerHTML=`More · ${userLink(sl.v.author)}`;
  const b=$('#more-body'); b.innerHTML=moreHTML(sl); typeset($('.qcard',b));
  if(keep) refocus(`[data-act="${keep}"]`,b);
}
function openMore(sl,opener){
  if(!sl || moreSl) return; if(dTab) closeDrawer();
  moreSl=sl; renderMore(); more.classList.add('open'); more.inert=false;
  const mb=$('[data-act="more"]',sl.el); if(mb) mb.setAttribute('aria-expanded','true');
  openModal(more,$('#more-body .mrow'),opener||mb);
}
function closeMore(){
  const sl=moreSl; if(!sl) return; moreSl=null;
  more.classList.remove('open'); more.style.transform=''; closeModal(more); more.inert=true;
  const mb=$('[data-act="more"]',sl.el); if(mb) mb.setAttribute('aria-expanded','false');
}
/* an action from the sheet: Save and Pause toggle in place; the rest close the sheet first, so a panel or dialog they
   open returns the focus to More when it closes */
function moreAct(act,btn){
  const sl=moreSl; if(!sl) return;
  if(act==='save' || act==='pause'){ handleAct(act,sl,btn); return renderMore(act); }
  const mb=$('[data-act="more"]',sl.el); closeMore();
  handleAct(act,sl,mb);
}
/* the drawer's swipe: down past a fifth of the sheet (or a fling) closes it */
{ let d=null;
  more.addEventListener('pointerdown',e=>{ if(!isSheet() || !e.target.closest('.grab,.dhead') || e.target.closest('button,a') || e.button>0) return; d={y:e.clientY, dy:0, t:performance.now(), id:e.pointerId, on:false}; });
  more.addEventListener('pointermove',e=>{ if(!d || e.pointerId!==d.id) return; d.dy=Math.max(0,e.clientY-d.y);
    if(!d.on && d.dy>8){ d.on=true; more.classList.add('dragging'); try{ more.setPointerCapture(e.pointerId); }catch(_){} }
    if(d.on) more.style.transform=`translateY(${d.dy}px)`; });
  const end=e=>{ if(!d || e.pointerId!==d.id) return; const x=d; d=null; if(!x.on) return; more.classList.remove('dragging'); more.style.transform='';
    if(e.type==='pointerup' && (x.dy>more.offsetHeight*0.22 || x.dy/(performance.now()-x.t)>0.5)) closeMore(); };
  more.addEventListener('pointerup',end); more.addEventListener('pointercancel',end);
  $('#more-close').onclick=closeMore;
  matchMedia(PHONE_Q).addEventListener('change',e=>{ if(!e.matches) closeMore(); });
}

/* ---------- Focus (Z, the menu, More): the feed with only the pictures ----------
   For scrolling, not for talks (that is Present): the rail, caption, top bar, chips and callouts hide, the box takes the
   slide (layoutBox) and an engageable piece shows a 32 px target in a corner outside the box. Scrolling, double-tap to
   like and every key still work. A tap on the very top edge, or a two-finger tap, brings the top bar back for a few
   seconds (with Leave Focus in it); Z or Esc leaves. The choice is kept in localStorage ('loci:focus'); it is off by default. */
let focusOn=store.get('loci:focus',false)===true, focusBarTimer=0, focusHintTimer=0;
const focusing=()=>document.body.classList.contains('focus');
function syncFocus(){
  const on=focusOn && view==='feed' && !EMBED, was=focusing();
  document.body.classList.toggle('focus',on); if(!on) focusBar(false);
  $$('[data-focus-toggle]').forEach(b=>b.setAttribute('aria-checked',String(focusOn)));
  if(was!==on){ if(on && engagedSl) release(engagedSl,true); relayout(); }
  return on;
}
function focusHint(){
  const h=$('#focus-hint'); h.textContent=coarse()?'Focus · tap top to exit':'Focus · Z or Esc to exit'; h.classList.add('on');
  clearTimeout(focusHintTimer); focusHintTimer=setTimeout(()=>h.classList.remove('on'),3000);
}
function setFocus(on){
  on=!!on; if(on===focusOn) return; focusOn=on; store.set('loci:focus',on);
  if(on && dTab) closeDrawer();
  if(syncFocus()) focusHint(); else { clearTimeout(focusHintTimer); $('#focus-hint').classList.remove('on'); }
  announce(on?`Focus on: only the pictures. Scroll as usual; double-tap to like. ${coarse()?'Tap the top edge for the top bar.':'Press Z or Escape to leave.'}`:'Focus off.');
}
/* the top bar over the picture for a few seconds (not while it has the focus or the menu is open) */
function focusBar(show){
  clearTimeout(focusBarTimer); document.body.classList.toggle('focus-peek',!!show && focusing());
  if(show) focusBarTimer=setTimeout(function hide(){ if($('#topbar').contains(document.activeElement) || !styleMenu.hidden) focusBarTimer=setTimeout(hide,1500); else focusBar(false); },4000);
}
$('#focus-edge').addEventListener('click',()=>focusBar(true));
document.addEventListener('pointerdown',e=>{ if(document.body.classList.contains('focus-peek') && !$('#topbar').contains(e.target) && !e.target.closest('#focus-edge')) focusBar(false); },true);
{ let tf=null; // a two-finger tap: both fingers down and up within 350 ms, barely moving
  const mid=e=>[...e.touches].reduce((a,t)=>[a[0]+t.clientX/e.touches.length,a[1]+t.clientY/e.touches.length],[0,0]);
  feed.addEventListener('touchstart',e=>{ if(!focusing() || engagedSl) return; if(e.touches.length===2){ const [x,y]=mid(e); tf={t:performance.now(), x, y}; } else if(e.touches.length>2) tf=null; },{passive:true});
  feed.addEventListener('touchmove',e=>{ if(!tf || e.touches.length<2) return; const [x,y]=mid(e); if(Math.hypot(x-tf.x,y-tf.y)>20) tf=null; },{passive:true});
  feed.addEventListener('touchend',e=>{ if(!tf || e.touches.length) return; const ok=performance.now()-tf.t<350; tf=null; if(ok) focusBar(true); },{passive:true});
}
/* "Before this" (the piece's own manifest "after") and "Next" (derived: the pieces whose "after" names this one).
   docs/module-api.md section 2. An author lists what their piece builds on; nobody can write another piece's Next. Nothing is gated on it. */
/* Reviewer credit (docs/ideas/17-reviewer-credit.md): the Feed-lane footer names who checked the mathematics, with profile links. */
const andList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const reviewersOf=v=>v.lane!=='new'&&Array.isArray(v.reviewers)?v.reviewers.filter(h=>typeof h==='string'&&h!==v.author):[];
const reviewersLine=v=>{ const r=reviewersOf(v); return r.length?`Mathematics checked by ${andList(r.map(h=>userLink(h)))} in ${esc(v.reviewed)}.`:`The mathematics was checked by two ${esc(site())} community reviewers.`; };
const afterOf=v=>(Array.isArray(v.manifest.after)?v.manifest.after:[]).map(vizById).filter(Boolean);
const nextOf=v=>VIZ.filter(o=>Array.isArray(o.manifest.after)&&o.manifest.after.includes(v.id));
function relatedHTML(v){
  const row=(lbl,id,list)=>list.length?`<div class="related"><span class="flabel" id="rel-${id}">${lbl}</span><div class="minis" role="list" aria-labelledby="rel-${id}">${list.map(o=>
    `<button class="mini" type="button" role="listitem" data-jump="${esc(o.id)}" aria-label="${esc(lbl)}: ${esc(o.title)}, by ${esc(o.author)}. Opens it in the feed"><canvas data-thumb="${esc(o.id)}" aria-hidden="true"></canvas><span class="mini-t"><b>${esc(o.title)}</b><small>${esc(o.author)}</small></span></button>`).join('')}</div></div>`:'';
  return row('Before this','before',afterOf(v))+row('Next','next',nextOf(v));
}
function renderDrawer(){
  if(why && (dTab!=='explain' || why.v!==dViz || explainRaw)) whyExit(true);
  const v=dViz; $('#d-kicker').innerHTML=`${userLink(v.author)} · ${esc(v.license)}`; $('#d-title').textContent=v.title;
  $$('.dtab').forEach(b=>{ const on=b.dataset.dtab===dTab; b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1; });
  const body=$('#d-body'); body.setAttribute('aria-labelledby',`dtab-${dTab}`);
  const later=u=>{ body.innerHTML=`<p class="fine">Loading…</p>`; loadText(u).then(()=>{ if(dViz===v && drawer.classList.contains('open')) renderDrawer(); },()=>{ body.innerHTML=`<p class="fine">Could not load ${esc(u)}.</p>`; }); };
  if(dTab==='explain' && LociHost.isBlocked(v.id)){ body.innerHTML=`<p class="fine">${esc(CARD.blocked[0])}. ${esc(CARD.blocked[1])}</p>`; }
  else if(dTab==='explain'){
    if(!v.md && v.mdUrl){ if(!texts.has(v.mdUrl)) return later(v.mdUrl); v.md=texts.get(v.mdUrl); }
    body.innerHTML=`${qwBlock(v)}${answersLine(v)}${distBlock(v)}<div class="seg" role="group" aria-label="Explanation format"><button type="button" data-raw="0" aria-pressed="${!explainRaw}">Rendered</button><button type="button" data-raw="1" aria-pressed="${explainRaw}">explanation.md</button></div>
      ${explainRaw?`<pre class="raw">${esc(v.md)}</pre>`:`<article class="md">${md(touchCopy(v.md))}</article>`}
      ${relatedHTML(v)}
      <p class="fine">Written by ${esc(v.author)}. ${v.lane==='new'?'Checked by machine: it passed the automated gate, and two community reviewers have not yet checked the mathematics.':reviewersLine(v)} Suggest an edit with a pull request to ${esc(v.repo)}.</p>
      ${qaBlock(v)}`;
    const art=$('article.md',body), pr=presetsOf(v);
    typeset(art); paintThumbs(body); bindQweek(v,body); bindQa(v,body);
    if(art && pr.length){ // tappable versions of the "Try this" list, set up on the slide behind the panel
      const g=document.createElement('div'); g.className='xpresets';
      g.innerHTML=`<p class="fine" id="x-try">Tap one to set it up on the slide:</p><div class="pills" role="group" aria-labelledby="x-try">${presetPills(v)}</div>`;
      const h=$$('h3',art).find(x=>/^try this$/i.test(x.textContent.trim()));
      if(h) h.after(g); else { art.insertAdjacentHTML('beforeend','<h3>Try this</h3>'); art.appendChild(g); }
    }
    if(art){ whyInit(v,art); liveify(art,v); }
  } else if(dTab==='customize') renderCustomize(v,body);
  else {
    const tgt=runningTarget(v), wasm=tgt.runtime==='wasm';
    if(wasm && !texts.has(v.sourceUrl)) return later(v.sourceUrl);
    if(remixOpen.has(v.id)) return renderRemix(v,body,wasm);
    const rem=remixes.has(rkey(v)), src=wasm?texts.get(v.sourceUrl):rem?remixes.get(rkey(v)):moduleSource(v,tgt.id), file=wasm?v.sourceUrl.split('/').pop():tgt.id==='any'?'src/index.js':`src/${tgt.entry}`;
    const others=runnableTargets(v.manifest).filter(t=>t.id!==tgt.id&&t.id!=='any'), dl=targetById(v.manifest,'download');
    body.innerHTML=`<div class="meta"><span class="oss">open source · ${esc(v.license)}</span><span>${esc(v.repo)}</span></div>
      ${rem?`<p class="note">You are running a remix of this module (this tab only, not reviewed). <button class="linkbtn" type="button" id="src-orig">Use the original</button></p>`:''}
      <p class="fine">${wasm
        ? `Every visualization on ${esc(site())} is one open-source module. This one is C with no standard library, compiled to WebAssembly by <code>build.sh</code>. The slide behind this panel runs the resulting <code>module.wasm</code> in a sandboxed worker; each frame it returns drawing commands that the site replays with the theme's colors and font.`
        : `Every visualization on ${esc(site())} is one open-source module${tgt.id!=='any'?' per target':''}. This is the exact module drawing the slide behind this panel, running in a sandboxed worker. The site supplies the canvas, the clock and the theme, and resolves <code>@loci/kit</code>${tgt.render==='webgl2'?' and <code>@loci/three</code>, and draws the labels the module returns':''}.`}</p>
      ${others.length?`<p class="fine">This is the <b>${esc(TARGET_NAME[tgt.id].toLowerCase())}</b> version (<code>${esc(tgt.render)}</code>). The piece also has ${others.map(t=>`a ${esc(TARGET_NAME[t.id].toLowerCase())} version, <code>${esc(t.entry)}</code> (<code>${esc(t.render)}</code>)`).join(' and ')}, with the same explanation, parameters and presets. Switch with Mode in Customize to see it run.</p>`:''}
      <span class="flabel">${esc(file)}</span>
      <pre class="code" tabindex="0" role="region" aria-label="Source code, ${esc(file)}"><code>${esc(src)}</code></pre>
      <span class="flabel">loci.json</span>
      <pre class="code" tabindex="0" role="region" aria-label="Manifest, loci.json"><code>${esc(manifestJSON(v.manifest))}</code></pre>
      <details class="propose"><summary>Embed config</summary><div class="propose-b">
        <pre class="code" id="cz-cfg" tabindex="0" role="region" aria-label="Embed config">${esc(cfgJSON(v))}</pre>
        <div class="btnrow"><button class="btn ghost" type="button" id="cz-copy">Copy config</button></div>
        <p class="fine">The share link's state (docs/module-api.md section 5): only what differs from the defaults, and the moment <i>t</i> this tab was opened at. Share has the link and the embed snippets.</p></div></details>
      ${dl?`<span class="flabel" id="dl-l">Download</span><div class="dl-row" role="group" aria-labelledby="dl-l"><a class="btn ghost" href="${esc(dl.url)}" rel="noopener">Download ${esc(DL_FORMAT[dl.format]||dl.format)}</a><span class="fine">${esc([DL_FORMAT[dl.format]||dl.format, dl.size?kbText(dl.size):null].filter(Boolean).join(' · '))}${dl.note?`. ${esc(dl.note)}`:''}</span></div>`:''}
      <div class="btnrow"><button class="btn" type="button" id="rx-open">${rem?'Edit remix':drafts.has(rkey(v))||rxText.has(v.id)?'Resume draft':'Remix'}</button><button class="btn ghost" type="button" id="copy-src">Copy code</button><span class="fine">Fork on GitHub is disabled in this mockup.</span></div>`;
    $('#copy-src').onclick=()=>copyText(src,'Code copied');
    $('#cz-copy').onclick=()=>copyText($('#cz-cfg').textContent,'Config copied');
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
  const tx=rxText.get(v.id)||{}, curMan=tx.manifest??rxManDefault(v), curMd=tx.explanation??rxMdDefault(v), F=rxFile;
  const tab=(id,label)=>`<button type="button" data-rxf="${id}" aria-pressed="${F===id}" aria-controls="rxp-${id}">${esc(label)}${id==='js'?'':`<span class="rx-dot" data-rxdot="${id}"${(id==='json'?tx.manifest:tx.explanation)!=null?'':' hidden'}><span aria-hidden="true"> •</span><span class="sr">, edited</span></span>`}</button>`;
  body.innerHTML=`<p class="fine" id="rx-hint">Edit the package and run it on the slide behind this panel. <kbd>Tab</kbd> indents; <kbd>Shift</kbd>+<kbd>Tab</kbd>, or <kbd>Esc</kbd> then <kbd>Tab</kbd>, leaves the editor. <kbd>${MOD_KEY}</kbd>+<kbd>Enter</kbd> runs.</p>
    <div class="seg rx-files" role="group" aria-label="File to edit">${tab('js',file.split('/').pop())}${tab('json','loci.json')}${tab('md','explanation.md')}</div>
    <div class="rx-pane" id="rxp-js"${F==='js'?'':' hidden'}>
      <label class="flabel" for="rx-src">${esc(file)}${tgt.id!=='any'?` · ${esc(TARGET_NAME[tgt.id].toLowerCase())} version`:''}${remixes.has(rkey(v))?' · remixed':''}</label>
      <textarea class="rx" id="rx-src" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-describedby="rx-hint">${esc(cur)}</textarea>
    </div>
    <div class="rx-pane" id="rxp-json"${F==='json'?'':' hidden'}>
      <label class="flabel" for="rx-man">loci.json · the fields a remix may change</label>
      <p class="fine" id="rx-man-hint">Title, hook, alt, tags, params (labels, ranges and defaults), presets, <code>after</code> and <code>bounty</code>. The param keys are fixed for remixes, so Customize and share links keep working; the rest of loci.json (id, author, license, runtime, targets, motion) is set by the remix package. Run applies the title, hook and presets to the slide, in this tab only.</p>
      <textarea class="rx rx-short" id="rx-man" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-describedby="rx-man-hint rx-man-errs">${esc(curMan)}</textarea>
      <div id="rx-man-errs"></div>
    </div>
    <div class="rx-pane" id="rxp-md"${F==='md'?'':' hidden'}>
      <div class="rx-mdhead"><span class="flabel" id="rx-md-l">explanation.md</span><div class="seg" role="group" aria-label="Explanation view"><button type="button" data-rxmd="0" aria-pressed="${!rxPreview}">Edit</button><button type="button" data-rxmd="1" aria-pressed="${rxPreview}">Preview</button></div></div>
      <textarea class="rx rx-short rx-prose" id="rx-md" spellcheck="true" aria-labelledby="rx-md-l"${rxPreview?' hidden':''}>${esc(curMd)}</textarea>
      <article class="md rx-prev" id="rx-md-prev" tabindex="-1" aria-label="Preview of explanation.md"${rxPreview?'':' hidden'}></article>
    </div>
    <div class="btnrow"><button class="btn" type="button" id="rx-run">Run</button><button class="btn ghost" type="button" id="rxc-check" aria-describedby="rxc-hint">Check this remix</button><button class="btn ghost" type="button" id="rx-revert">Revert</button><button class="btn ghost" type="button" id="rx-dl">Download .js</button><button class="btn ghost" type="button" id="rx-done">Done</button></div>
    ${LociAPI.server?`<div class="btnrow"><button class="btn ghost" type="button" id="rx-post" aria-describedby="rx-post-hint">Post to Playground</button></div>
    <p class="fine" id="rx-post-hint">Post to Playground puts the editor's three files on this demo server as ${v.starter?'a new piece':'a remix'} of yours, under ${esc(myHandle())}: only you see it, in the feed's Playground chip, labelled not reviewed, and you can delete it there. It is the unreviewed path, not a submission: to have it reviewed, Check this remix, then Prepare pull request to the registry on GitHub.</p>`:''}
    <p class="fine" id="rx-status" role="status"></p>
    <div id="rx-errs"></div>
    <p class="fine">A remix runs in the same sandboxed worker as any upload: no network, no storage, only <code>@loci/kit</code> (and <code>@loci/three</code>). What you type in the three files is kept in this browser until you Revert; a remix you Run is kept for this tab only. It is not reviewed or shareable in this mockup.</p>
    <section class="rx-check" aria-label="Check this remix">
      <p class="fine" id="rxc-hint">Check this remix runs the full automated gate from the Submit page on the editor's three files, packaged as a new piece of yours: ${v.starter?`id <code>new-…</code>, author ${esc(myHandle()||'@you')} (your handle, set on Yours), under the ${esc(v.license)} license`:`id <code>${esc(v.id)}-remix-…</code>, <code>"remixOf": "${esc(v.id)}"</code>, author ${esc(myHandle()||'@you')} (your handle, set on Yours), ${esc(v.author)} credited, under its ${esc(v.license)} license`}.${hasOtherTarget(v)?' The other target ships the original module unless you remixed it too, and an unchanged module is an exact duplicate.':''} If nothing fails, Prepare pull request takes it to the Submit page to send to the registry on GitHub.</p>
      <p class="fine" id="rxc-pkg"></p>
      <section class="sub-run" id="rxc-run" aria-labelledby="rxc-run-h" hidden>
        <h3 class="sub-h" id="rxc-run-h">Checking the remix</h3>
        <div class="pbar" id="rxc-bar" role="progressbar" aria-labelledby="rxc-run-h" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><span></span></div>
        <p class="sub-label" id="rxc-label"></p>
        <figure class="sub-prev"><figcaption class="flabel">What the checker sees</figcaption><div class="sub-canv" id="rxc-preview"></div></figure>
      </section>
      <section class="sub-report" id="rxc-report" aria-labelledby="rxc-sum" hidden></section>
    </section>`;
  const ta=$('#rx-src',body), tm=$('#rx-man',body), tmd=$('#rx-md',body); let tabIndents=true;
  const state=()=>[ta.value,tm.value,tmd.value].join('\u0000');
  const manProblems=()=>{ const r=rxCheckMan(v,tm.value); showManErrs(r.problems); return r; };
  const rxShow=f=>{ rxFile=f; $$('[data-rxf]',body).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rxf===f))); $$('.rx-pane',body).forEach(p=>p.hidden=p.id!=='rxp-'+f); };
  const run=()=>{
    setDraft(rkey(v),ta.value); const r=manProblems();
    if(r.problems.length){ rxShow('json'); const m=`Run refused: loci.json has ${r.problems.length===1?'a problem':r.problems.length+' problems'}. Fix ${r.problems.length===1?'it':'them'} and run again.`; $('#rx-status').textContent=m; $('#rx-man-errs').scrollIntoView({block:'nearest'}); announce(m); return; }
    applyRemixMan(v,r.sub); runRemix(v,ta.value);
  };
  const save=(k,el)=>{ setRxText(v,k,el.value); const d=$(`[data-rxdot="${k==='manifest'?'json':'md'}"]`,body); if(d) d.hidden=(rxText.get(v.id)||{})[k]==null; };
  ta.addEventListener('input',()=>{ tabIndents=true; setDraft(rkey(v),ta.value); });
  tm.addEventListener('input',()=>{ tabIndents=true; save('manifest',tm); manProblems(); });
  tmd.addEventListener('input',()=>{ tabIndents=true; save('explanation',tmd); });
  for(const el of [ta,tm,tmd]) el.addEventListener('keydown',e=>{
    if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); e.stopPropagation(); return run(); }
    if(e.key==='Escape' && tabIndents){ e.preventDefault(); e.stopPropagation(); tabIndents=false; return announce('Tab now moves focus out of the editor'); }
    if(e.key==='Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && tabIndents){
      e.preventDefault(); e.stopPropagation();
      if(!document.execCommand('insertText',false,'  ')){ el.setRangeText('  ',el.selectionStart,el.selectionEnd,'end'); el.dispatchEvent(new Event('input')); }
    }
  });
  const preview=on=>{ rxPreview=on; $$('[data-rxmd]',body).forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.rxmd==='1')===on))); tmd.hidden=on; const pv=$('#rx-md-prev',body); pv.hidden=!on;
    if(on){ pv.innerHTML=md(touchCopy(tmd.value)); typeset(pv); liveify(pv,v); } };
  $$('[data-rxf]',body).forEach(b=>b.onclick=()=>{ rxShow(b.dataset.rxf); b.focus(); });
  $$('[data-rxmd]',body).forEach(b=>b.onclick=()=>{ preview(b.dataset.rxmd==='1'); b.focus(); });
  if(rxPreview) preview(true);
  if(tx.manifest!=null) manProblems();
  $('#rx-run').onclick=run;
  $('#rx-revert').onclick=()=>{ delDraft(rkey(v)); delRxText(v); rxChecks.delete(rkey(v)); applyRemixMan(v,null); if(remixes.has(rkey(v))) unremix(v); else renderDrawer(); refocus('#rx-revert',body); announce('Reverted to the original module, loci.json and explanation'); };
  $('#rx-dl').onclick=()=>download(new Blob([ta.value],{type:'text/javascript'}),`${v.id}.js`);
  $('#rx-done').onclick=()=>{ remixOpen.delete(v.id); renderDrawer(); refocus('#rx-open',body); };
  const post=$('#rx-post',body);
  if(post) post.onclick=()=>{
    setDraft(rkey(v),ta.value); const r=manProblems();
    if(r.problems.length){ rxShow('json'); const m='Fix loci.json first: the remix cannot be posted while it has problems.'; $('#rx-status').textContent=m; return announce(m); }
    postPlayground(v,tgt.id,ta.value,{loci:r.sub, md:tmd.value},post);
  };
  $('#rxc-check').onclick=()=>{
    setDraft(rkey(v),ta.value); const r=manProblems();
    if(r.problems.length){ rxShow('json'); const m='Fix loci.json first: the remix cannot be packaged while it has problems.'; $('#rxc-pkg').textContent=m; return announce(m); }
    checkRemix(v,tgt.id,ta.value,{loci:r.sub, md:tmd.value, state:state()});
  };
  if(remixErrors.has(rkey(v))) showRemixError(v);
  const prior=rxChecks.get(rkey(v));
  if(checking && checking.key===rkey(v)){ $('#rxc-run').hidden=false; $('#rxc-pkg').textContent=checking.line; $('#rxc-check').disabled=true; }
  else if(prior) renderReport(prior.report,uiFor('rxc'),prior.pkg,{...prior.meta, quiet:true, stale:prior.src!==state()});
}
let rxFile='js', rxPreview=false; // the remix editor's open file and explanation view, kept across re-renders
/* the editable part of loci.json, as the editor first shows it: the parent's values */
const RX_FIELDS=['title','hook','alt','tags','params','presets','after','bounty'];
function rxManObj(v){ const m=JSON.parse(manifestJSON(v.manifest)), o={title:v.title, hook:v.hook, alt:v.alt, tags:v.tags, params:m.params, presets:m.presets||[]};
  if(m.after) o.after=m.after; if(m.bounty) o.bounty=m.bounty; return o; }
const rxManDefault=v=>JSON.stringify(rxManObj(v),null,2)+'\n';
const rxMdDefault=v=>v.md||(v.mdUrl&&texts.get(v.mdUrl))||'';
function setRxText(v,k,s){
  const o={...(rxText.get(v.id)||{})}, def=k==='manifest'?rxManDefault(v):rxMdDefault(v);
  if(s===def) delete o[k]; else o[k]=s;
  if(Object.keys(o).length){ rxText.set(v.id,o); LociAPI.drafts.set('loci:draft2:'+v.id,o); } else delRxText(v);
}
const delRxText=v=>{ rxText.delete(v.id); LociAPI.drafts.del('loci:draft2:'+v.id); };
/* the editor's loci.json: {sub (the fields, or null), problems}. The param keys (and types) are the parent's; the
   merged manifest must pass validateManifest, the same validator as the gate's "Manifest validates". */
function rxCheckMan(v,text){
  const probs=[]; let j;
  try{ j=JSON.parse(text); }catch(e){ return {sub:null, problems:[`loci.json is not valid JSON: ${e.message}`]}; }
  if(!j || typeof j!=='object' || Array.isArray(j)) return {sub:null, problems:['loci.json must be one JSON object']};
  for(const k of Object.keys(j)) if(!RX_FIELDS.includes(k)) probs.push(`"${k}" is set by the remix package, not here (a remix may change ${RX_FIELDS.join(', ')})`);
  const pk=v.manifest.params.map(p=>p.key), ps=Array.isArray(j.params)?j.params:null;
  if(!ps) probs.push(`params must be the parent's list of ${pk.length} (keys ${pk.join(', ')})`);
  else {
    const ek=ps.map(p=>p&&typeof p==='object'?p.key:undefined), added=ek.filter(k=>!pk.includes(k)), gone=pk.filter(k=>!ek.includes(k));
    if(added.length||gone.length||ek.length!==pk.length) probs.push(`params keys are fixed for remixes: keep ${pk.map(k=>`"${k}"`).join(', ')}${added.length?`; not a key of the parent: ${added.map(k=>JSON.stringify(k??null)).join(', ')}`:''}${gone.length?`; missing: ${gone.map(k=>`"${k}"`).join(', ')}`:''}`);
    else ps.forEach((p,i)=>{ const o=v.manifest.params.find(q=>q.key===p.key); if(o && p.type!==o.type) probs.push(`params[${i}] "${p.key}": the type is fixed for remixes ("${o.type}")`); });
  }
  if(!probs.length){ try{ validateManifest({...JSON.parse(manifestJSON(v.manifest)), ...j, id:v.id},{targets:false}); }catch(e){ probs.push(e.message); } }
  return {sub:probs.length?null:j, problems:probs};
}
function showManErrs(probs){
  const box=$('#rx-man-errs'), tm=$('#rx-man'); if(!box) return;
  box.innerHTML=probs.length?`<div class="rx-err"><b>loci.json: ${probs.length===1?'a problem':probs.length+' problems'}</b><ul>${probs.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><span class="fine">Run and Check this remix wait until it validates.</span></div>`:'';
  if(tm){ if(probs.length) tm.setAttribute('aria-invalid','true'); else tm.removeAttribute('aria-invalid'); }
}
/* apply (or, with null, drop) a remix's loci.json fields on the slide: caption, alt and Try-this pills. Only fields that
   differ from the parent's are kept, so an unedited loci.json leaves the published caption alone. */
function applyRemixMan(v,sub){
  const base=rxManObj(v), d={};
  if(sub) for(const k of RX_FIELDS) if(sub[k]!==undefined && JSON.stringify(sub[k])!==JSON.stringify(base[k])) d[k]=sub[k];
  if(Object.keys(d).length){ remixMan.set(v.id,d); store.set('loci:remixman:'+v.id,d,true); } else { remixMan.delete(v.id); store.del('loci:remixman:'+v.id,true); }
  syncCaption(v);
}
function syncCaption(v){
  const c=capOf(v), pr=presetsOf(v);
  slides.forEach(sl=>{ if(sl.v!==v) return;
    const t=$('.vtitle',sl.el), h=$('.hook',sl.el), a=$('.stage .sr',sl.el), tr=$('.tries',sl.el);
    if(t) t.textContent=c.title; if(h) h.textContent=c.hook; if(a) a.textContent=c.alt||c.hook;
    if(tr){ tr.innerHTML=presetPills(v); tr.hidden=!pr.length; }
    sl.canvas.setAttribute('aria-label',`${c.title}, animated visualization`); placeOverlays(sl); });
}
const hasOtherTarget=v=>runnableTargets(v.manifest).filter(t=>t.runtime==='js').length>1;
/* Check this remix: the editor's three files (and any remix of the piece's other target) as a package of its own, through
   the same gate as the Submit page, with the report under the editor. o: {loci, md, state} from the editor. */
async function checkRemix(v,tid,src,o={}){
  if(checking) return announce('The checks are already running.');
  const sources={[tid]:src};
  runnableTargets(v.manifest).forEach(t=>{ if(t.id===tid || t.runtime!=='js') return; const k=rkeyFor(v,t.id), s=drafts.get(k)??remixes.get(k); if(typeof s==='string' && s!==moduleSource(v,t.id)) sources[t.id]=s; });
  const po={author:myHandle()||undefined, loci:o.loci||undefined, md:typeof o.md==='string'?o.md:undefined};
  let pkg; try{ pkg=v.starter?await starterPackage(v,sources,po):await LociChecks.remixPackage(v,sources,po); }catch(e){ const l=$('#rxc-pkg'); if(l) l.textContent=`Could not package the remix: ${e.message}`; return announce(`Could not package the remix: ${e.message}`); }
  const meta={remix:{id:v.id, title:v.title, targets:Object.keys(sources), ...(v.starter?{fresh:true}:{})}, key:rkey(v)};
  const report=await runChecks(pkg,uiFor('rxc'),meta);
  rxChecks.set(meta.key,{pkg, report, meta, src:o.state??src});
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
  remixes.delete(rkey(v)); delDraft(rkey(v)); rxChecks.delete(rkey(v)); remixErrors.delete(rkey(v)); store.del('loci:remix:'+rkey(v),true); dropSpecs(v); applyRemixMan(v,null);
  respawn(v); if(dTab==='source' && dViz===v) renderDrawer();
  toast(`Back to the original ${v.title}`);
}
/* ---------- the Playground (demo server only) ----------
   A posted remix is the parent's package with the editor's files: its module (or modules), loci.json and
   explanation.md, the same three files Check this remix packages. pgViz turns one back into a piece: the parent's
   entry with the posted title, hook, alt, tags, params and presets, the posted module as its source, and the
   remixer as author. It runs in the sandbox like every piece. */
/* A post with no parent (New, then Post to Playground): its own loci.json is the whole manifest, as for a registry
   package; it runs in the sandbox like every piece. */
function pgNewViz(item){
  const f=item.files||{}; let man;
  try{ man=JSON.parse(f['loci.json']); }catch(_){ return null; }
  if(!man || typeof man!=='object') return null;
  const id='pg-'+item.id; man={...man, id};
  try{ validateManifest(man,{targets:false}); }catch(e){ console.info(`loci: skipping Playground post ${item.id}: ${e.message}`); return null; }
  const js=typeof f['index.js']==='string'?f['index.js']:Object.keys(f).filter(n=>/\.js$/.test(n)).map(n=>f[n])[0]; if(typeof js!=='string') return null;
  return {id, title:String(man.title||item.title), hook:String(man.hook||item.hook||''), alt:typeof man.alt==='string'?man.alt:String(man.title), author:'@'+item.author.handle,
    license:String(man.license||item.license||'MIT'), tags:Array.isArray(man.tags)&&man.tags.length?man.tags.map(String):(item.tags||[]), t0:Number.isFinite(man.t0)?man.t0:0,
    lane:'playground', reviewed:'', reviewers:[], manifest:man, md:f['explanation.md']||'', repo:'playground · a new piece', likes:0, liked:false, source:js,
    pg:{id:item.id, parent:null, createdAt:item.createdAt}};
}
function pgViz(item){
  if(!item.parent) return pgNewViz(item);
  const par=VIZ.find(v=>v.id===(item.parent&&item.parent.slug)), f=item.files||{}; if(!par) return null;
  let loci; try{ loci=JSON.parse(f['loci.json']); }catch(_){ return null; }
  if(!loci || typeof loci!=='object') return null;
  const id='pg-'+item.id, man=JSON.parse(manifestJSON(par.manifest));
  for(const k of ['params','presets','after','bounty']) if(loci[k]!==undefined) man[k]=loci[k];
  if(typeof loci.title==='string') man.title=loci.title;
  man.id=id;
  try{ validateManifest(man,{targets:false}); }catch(e){ console.info(`loci: skipping Playground post ${item.id}: ${e.message}`); return null; }
  const pv={...par, id, title:String(loci.title||item.title), hook:String(loci.hook||item.hook||''), alt:typeof loci.alt==='string'?loci.alt:par.alt,
    tags:Array.isArray(loci.tags)&&loci.tags.length?loci.tags.map(String):par.tags, author:'@'+item.author.handle, lane:'playground', reviewed:'', manifest:man,
    md:f['explanation.md']||'', mdUrl:undefined, repo:`playground · remix of ${par.id}`, likes:0, liked:false,
    pg:{id:item.id, parent:par.id, createdAt:item.createdAt}};
  delete pv.source; delete pv.sources;
  if(man.targets){ pv.sources={}; runnableTargets(man).forEach(t=>{ if(t.runtime==='js') pv.sources[t.id]=typeof f[t.entry]==='string'?f[t.entry]:moduleSource(par,t.id); }); }
  else { const js=Object.keys(f).find(n=>/\.js$/.test(n)); if(!js) return null; pv.source=f['index.js']??f[js]; }
  return pv;
}
/* ---------- registry packages (demo server only) ----------
   An entries/<slug>/ folder merged in the registry (two approvals on its pull request) and imported by the server with
   its files (demo/server/registry.js). regViz makes a piece from the package alone: its loci.json is the manifest,
   its modules the source, its explanation.md the Explanation tab. It is reviewed, so it is in the Feed lane, but it is
   code from outside this repository, so it runs in the sandbox like every piece. An id the
   bundled catalog already has stays the catalog's; WebAssembly packages are not shown yet (they need a module URL). */
const MONTH=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function regViz(item){
  const f=item.files||{}; let man;
  try{ man=JSON.parse(f['loci.json']); }catch(_){ return null; }
  if(!man || typeof man!=='object' || typeof man.id!=='string') return null;
  if(VIZ.some(v=>v.id===man.id)){ console.info(`loci: registry entry ${man.id} has the id of a catalog piece; showing the catalog's`); return null; }
  try{ validateManifest(man,{targets:false}); }catch(e){ console.info(`loci: skipping registry entry ${item.slug}: ${e.message}`); return null; }
  const ts=runnableTargets(man);
  if(!ts.length || ts.some(t=>t.runtime!=='js')){ console.info(`loci: registry entry ${man.id} is not shown: WebAssembly packages from the registry are not supported yet`); return null; }
  const d=new Date(String(item.createdAt||'').replace(' ','T')+'Z'), when=isNaN(d)?'':`${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const repo=LociAPI.registry.repo, path=String(item.registryPath||`entries/${man.id}/`).replace(/\/$/,'');
  const v={id:man.id, title:String(man.title), hook:String(man.hook||item.hook||''), author:'@'+item.author.handle, license:String(man.license||item.license||''),
    repo:repo?`github.com/${repo}/tree/${LociAPI.registry.branch}/${path}`:`the registry, ${path}`, reviewed:when, reviewers:[], likes:0,
    t0:Number.isFinite(man.t0)?man.t0:0, tags:Array.isArray(man.tags)?man.tags.map(String):(item.tags||[]), alt:typeof man.alt==='string'?man.alt:String(man.title),
    manifest:man, md:typeof f['explanation.md']==='string'?f['explanation.md']:'', reg:{pr:item.registryPr||null, path}};
  if(man.targets){ v.sources={}; ts.forEach(t=>{ v.sources[t.id]=typeof f[t.entry]==='string'?f[t.entry]:''; }); }
  else { const e=(typeof man.entry==='string'&&man.entry?man.entry:'index.js').replace(/^\.\//,''); if(typeof f[e]!=='string') return null; v.source=f[e]; }
  return v;
}
/* Single-file registry entries (entries/<slug>.js, the demo's own format), reviewed in the registry like packages. The
   server sends each with the code its guard.js prepared (with the loop guard) and the metadata it read (param, t0,
   COLORS); single.js wraps that code into a module and generates its loci.json, and it runs in the sandbox
   like every piece. The Source tab shows that module; the author's file is on GitHub (the repo line). */
function singleViz(item){
  const id=item.slug, meta=item.meta||{};
  if(typeof id!=='string' || typeof item.guarded!=='string') return null;
  if(VIZ.some(v=>v.id===id)){ console.info(`loci: registry entry ${id} has the id of a catalog piece; showing the catalog's`); return null; }
  const author='@'+item.author.handle, path=String(item.registryPath||`entries/${id}.js`);
  const man=LociSingle.manifest({id, title:item.title, hook:item.hook, author, license:item.license, tags:item.tags, t0:meta.t0, param:meta.param, colors:item.colors, code:item.code});
  try{ validateManifest(man,{targets:false}); }catch(e){ console.info(`loci: skipping registry entry ${path}: ${e.message}`); return null; }
  const d=new Date(String(item.createdAt||'').replace(' ','T')+'Z'), when=isNaN(d)?'':`${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`, repo=LociAPI.registry.repo;
  const md=String(item.explanation||'').trim()?item.explanation:`${item.hook||''}\n\n*A single-file entry from the registry; its author wrote no explanation yet.*\n`;
  return {id, title:man.title, hook:man.hook, author, license:man.license, repo:repo?`github.com/${repo}/blob/${LociAPI.registry.branch}/${path}`:`the registry, ${path}`,
    reviewed:when, reviewers:[], likes:0, t0:man.t0, tags:man.tags, alt:man.title, manifest:man, md,
    source:LociSingle.module(item.guarded,{guarded:true, key:man.params[0]&&man.params[0].key, file:path}), reg:{pr:item.registryPr||null, path, single:true}};
}
function loadRegistry(){ LociAPI.registry.list().forEach(it=>{ const v=regViz(it); if(v) VIZ.push(v); }); LociAPI.registry.singles().forEach(it=>{ const v=singleViz(it); if(v) VIZ.push(v); }); }
function loadPlayground(){
  PLAYGROUND.length=0;
  LociAPI.playground.list().forEach(it=>{ const pv=pgViz(it); if(pv) PLAYGROUND.push(pv); });
}
/* ---------- New (the demo's "Add a new visualization", bfd63c5): a piece of your own in the remix editor ----------
   The top bar's New (wide screens) and the menu's New visualization (narrower screens) open the Source tab's editor
   on a fresh piece, started from the contributor template (examples/template/visualization.js, an exact copy of
   demo/github/registry/template/visualization.js; demo/test checks it) and run through single.js like a
   registry entry, in the sandbox. It plays alone in the feed; its chip goes back to all. Run, Check this
   remix (the gate, on a package new-<hash> of yours), Prepare pull request and, on the demo server, Post to
   Playground (a post with no parent) work as for any remix, and the editor keeps your draft. If the template cannot
   be fetched, a minimal blank entry stands in. */
const NEW_ID='new-visualization'; // STARTERS is declared with PLAYGROUND
const BLANK_ENTRY=`const COLORS = { main: '#ff2e74', secondary: '#22e0e8' };

export default {
  title: 'New visualization',
  hook: 'One line about what it shows.',
  tags: ['Geometry'],
  license: 'MIT',
  param: { key: 'k', label: 'Petals k', min: 1, max: 9, step: 1, value: 3 },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, w, h);
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2, R = Math.min(B.w, B.h) * 0.42;
    ctx.strokeStyle = P.a1;
    ctx.lineWidth = P.lw * 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const th = 2 * Math.PI * i / 600, r = R * Math.cos(P.param * th + 0.3 * t);
      i ? ctx.lineTo(cx + r * Math.cos(th), cy + r * Math.sin(th)) : ctx.moveTo(cx + r, cy);
    }
    ctx.stroke();
  },
};
`;
/* the New piece's placeholders (see starterViz): alt text of a passing length and an explanation of a passing length,
   with the gate's headings and Reference line, every part marked "Replace me" */
const STARTER_ALT='Replace me: describe the picture in a sentence or two for someone who cannot see it.';
const STARTER_MD=title=>`## ${title}

Replace me. This is the Explanation tab, and everything in it is a placeholder for you to rewrite. The checks want
150 to 1200 words of plain prose (formulas between dollar signs are not counted), under the two headings below, and
a Reference line at the end. Keep the headings exactly as they are written; change everything else.

### What you're seeing

Replace me: say what the picture shows, in words a curious student can follow. Name the objects on the screen, what
each color stands for, and what changes as time passes. Then say why it is true: the one idea, formula or argument
that makes the picture look the way it does. A reader should finish this section knowing what to look for.

### Try this

- Replace me: one setting of the slider worth a look, and what to notice there.
- Replace me: a second thing to try, such as a value where the picture changes character, and why it changes.
- Replace me: a question the reader can answer by watching, with the answer a line later.

**Reference.** Replace me: a book, paper or page a reader can check, with enough detail to find it.
`;
function starterViz(code){
  const m=LociSingle.readMeta(code), author=myHandle()||'@you';
  const man=LociSingle.manifest({id:NEW_ID, title:m.title||'New visualization', hook:m.hook, author, license:m.license, tags:m.tags&&m.tags.length?m.tags:['Geometry'], t0:m.t0, param:m.param, colors:m.colors, code});
  /* The gate's content checks (a preset, alt text, the explanation) want what only the author can write. The starter
     holds a placeholder for each, marked "Replace me", so the untouched package already passes them and Check this
     remix reports what the code does; the placeholders are what to rewrite before Prepare pull request. */
  const p0=man.params[0];
  man.presets=[{label:'Replace me: a setting worth a look', params:p0&&p0.type==='range'?{[p0.key]:p0.max}:{}, note:'Replace me: what to notice at this setting, in a sentence.'}];
  validateManifest(man,{targets:false});
  return {id:NEW_ID, title:man.title, hook:man.hook, author, license:man.license, repo:'your new visualization, not posted', reviewed:'', reviewers:[], likes:0,
    t0:man.t0, tags:man.tags, alt:STARTER_ALT, manifest:man, starter:true,
    md:STARTER_MD(man.title),
    source:LociSingle.module(code,{guarded:false, key:man.params[0]&&man.params[0].key, file:'entries/<your-slug>.js'})};
}
let newOpening=false;
async function openNew(opener){
  if(newOpening) return; newOpening=true;
  try{
    let v=STARTERS[0];
    if(!v){
      let code; try{ code=await loadText('examples/template/visualization.js'); }catch(e){ console.info(`loci: the contributor template did not load (${e.message}); starting from a blank entry`); code=BLANK_ENTRY; }
      try{ v=starterViz(code); }catch(e){ console.info(`loci: the contributor template did not make a piece (${e.message}); starting from a blank entry`); v=starterViz(BLANK_ENTRY); }
      STARTERS.push(v); loadDrafts([v]);
    }
    if(view!=='feed') showView('feed');
    setFilter({type:'starter', ids:[NEW_ID], name:'New visualization'});
    remixOpen.add(NEW_ID); rxFile='js'; openDrawer('source',v,opener);
    setTimeout(()=>{ const ta=$('#rx-src'); if(ta) ta.focus({preventScroll:true}); },80); // after openModal's own focus
    announce('New visualization: the contributor template is in the editor, and plays on the slide behind it.');
  } finally { newOpening=false; }
}
/* the package Check this remix and Post to Playground send for a new piece: yours alone, no remixOf */
async function starterPackage(v,sources,o){
  const src=sources.any||Object.values(sources)[0], d=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(src)));
  const id=`new-${[...d.slice(0,3)].map(b=>b.toString(16).padStart(2,'0')).join('')}`, author=o.author||'@you';
  const pkg=LociChecks.samplePackage({...v, author},false,{sources, id, title:o.loci&&typeof o.loci.title==='string'?o.loci.title:v.title, author, ...(o.loci?{loci:o.loci}:{}), ...(typeof o.md==='string'?{md:o.md}:{}), holders:[author]});
  delete pkg.sampleOf; return pkg;
}
/* "your remix of …" or, for a new piece, "your new visualization" */
const rxWhat=rx=>rx&&rx.fresh?'your new visualization':`your remix of “${rx.title}”`;
let posting=false;
async function postPlayground(v,tid,src,o,btn){
  if(posting) return; posting=true; if(btn) btn.disabled=true;
  const st=m=>{ const s=$('#rx-status'); if(s) s.textContent=m; announce(m); };
  try{
    const par=v.starter||(v.pg&&!v.pg.parent)?null:v.pg?vizById(v.pg.parent):v, sources={[tid]:src}; // a new piece (or a remix of a posted one) goes up with no parent
    runnableTargets(v.manifest).forEach(t=>{ if(t.id===tid || t.runtime!=='js') return; const k=rkeyFor(v,t.id), s=drafts.get(k)??remixes.get(k); if(typeof s==='string' && s!==moduleSource(v,t.id)) sources[t.id]=s; });
    st('Posting to the Playground…');
    const po={author:myHandle()||undefined, loci:o.loci||undefined, md:typeof o.md==='string'?o.md:undefined};
    const pkg=v.starter?await starterPackage(v,sources,po):await LociChecks.remixPackage(v,sources,po);
    const files={}; for(const [path,x] of pkg.files){ const name=path.split('/').pop(); if(name!=='LICENSE' && typeof x.text==='string') files[name]=x.text; }
    const item=await LociAPI.playground.post(par?par.id:null,files), pv=pgViz(item);
    if(!pv) throw new Error('the server kept it, but this page could not read it back');
    PLAYGROUND.unshift(pv); renderChips(); if(filter.type==='playground') buildFeed();
    st(`Posted “${pv.title}” to the Playground.`); toast(`Posted to the Playground: ${pv.title}`,{label:'Open it', run:()=>{ closeDrawer(); jumpToViz(pv.id); }});
  }catch(e){ st(`Not posted: ${e.message}`); }
  finally{ posting=false; if(btn && btn.isConnected) btn.disabled=false; }
}
async function deletePlayground(v){
  if(!v.pg || !confirm(`Delete “${v.title}” from the Playground? This can't be undone.`)) return;
  try{ await LociAPI.playground.remove(v.pg.id); }
  catch(e){ return toast(`Not deleted: ${e.message}`); }
  const i=PLAYGROUND.indexOf(v); if(i>=0) PLAYGROUND.splice(i,1);
  sig.likes=sig.likes.filter(id=>id!==v.id); sig.saves=sig.saves.filter(id=>id!==v.id); saveSignals();
  closeMore(); closeDrawer(); renderChips();
  if(filter.type==='playground' && !PLAYGROUND.length) setFilter({type:'all'}); else buildFeed();
  toast(`Deleted “${v.title}” from the Playground.`);
}
/* Serialized state, as in docs/module-api.md section 5 (without the package hash, which this mockup does not have). */
function cfgJSON(v){ return JSON.stringify(stateOf(v),null,2); }
/* The embed is the share link plus &embed=1 (section 5, "Embeds"): one piece, a still until clicked, a compact bar. */
function embedURL(v,link){ const u=new URL(link||shareURL(v)); u.searchParams.set('embed','1'); return u.href; }
const embedHTML=(v,link)=>`<iframe src="${esc(embedURL(v,link))}" title="${esc(v.title)} on ${esc(site())}" width="480" height="480" style="border:0" allow="fullscreen" loading="lazy"></iframe>`;
/* For course sites that strip iframes: the still, linked to the share link. Kept apart from the iframe, since a
   browser never renders an iframe's children. The still is one 480 × 480 frame of the moment the snippet was made,
   rendered by one short-lived poster worker, encoded as a JPEG data URL (a fraction of the PNG's size, and a course
   page's editor may cap the HTML) so the snippet needs no hosting. */
const STILL=480, stills=new Map();
const stillHTML=(v,src,url)=>`<a href="${esc(url)}"><img src="${src}" alt="${esc(v.alt||v.title)}" width="${STILL}" height="${STILL}"></a>`;
const shortData=html=>html.replace(/(data:image\/\w+;base64,)([A-Za-z0-9+/=]{24})[A-Za-z0-9+/=]+/,(m,h,a)=>`${h}${a}… (${kbText(m.length)})`);
async function jpegURL(blob){
  const bm=await createImageBitmap(blob), cv=document.createElement('canvas'); cv.width=bm.width; cv.height=bm.height;
  cv.getContext('2d').drawImage(bm,0,0); const u=cv.toDataURL('image/jpeg',0.85); if(bm.close) bm.close(); return u;
}
function stillFor(v,t,view){
  const s=getSettings(v), box={x:12,y:12,w:STILL-24,h:STILL-24}, ch=targetFor(v.manifest,capsFor(box));
  const key=JSON.stringify([v.id,ch.id,themeFor(v),s.params,+t.toFixed(2),view]);
  if(!stills.has(key)){
    if(ch.fallback) stills.set(key,v.poster?Promise.resolve(new URL(v.poster,location.href).href):Promise.reject(new Error(ch.fallback.message)));
    else stills.set(key,LociHost.poster(originalSpec(v,ch.id),{w:STILL,h:STILL,dpr:1,box,theme:themeFor(v),params:s.params,t,view})
      .then(jpegURL));
    stills.get(key).catch(()=>stills.delete(key));
  }
  return stills.get(key);
}
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
  targetPref=id; store.set(TPREF_KEY,id); pieceMode.clear(); // the viewer's choice wins over a collection's
  slides.forEach((sl,i)=>{ if(Math.abs(i-activeIdx)>1 || (!sl.host && !sl.card)) return; const ch=chooseTarget(sl.v,boxOf(sl)); if(ch.id!==sl.tid || !!ch.fallback!==!!sl.fallback || ch.reason!==sl.treason) respawnSlide(sl); });
  if(dTab && dViz===v){ renderDrawer(); refocus(`[data-mode="${id}"]`,$('#d-body')); peekDrawer(`[data-mode="${id}"]`); }
  announce(`${v.title}: switched to the ${TARGET_NAME[tidOf(v)].toLowerCase()} version`);
}
function renderCustomize(v,body){
  const s=getSettings(v), m=v.manifest, ctrls=paramControls(m), presets=presetsOf(v), tgt=runningTarget(v);
  const cmp=cmpOn(v), eB=cmp&&cmpEdit==='B', P=eB?settingsB[v.id]:s; // comparing: the controls edit the side picked in "Editing"
  const offNote=c=>tgt&&Array.isArray(tgt.params)&&!tgt.params.includes(c.key)?`Not used by the ${TARGET_NAME[tgt.id].toLowerCase()} version.`:eB&&c.type==='seed'?'A and B share the seed: change it on A.':'';
  const sl=slides.find(x=>x.v===v), noCmp=cmp?null:cmpProblem(sl);
  body.innerHTML=`${modeField(v)}
  <div class="field"><span class="flabel">Color scheme</span><div class="swatches">${PALETTES.map(p=>{ const c=p.id==='style'?piecePalette(v):p;
    return `<button class="swatch" type="button" data-pal="${p.id}" aria-pressed="${s.palette===p.id}"><span class="dots">${['bg','fg','a1','a2'].map(k=>`<i style="background:${c[k]}"></i>`).join('')}</span>${esc(p.name)}</button>`; }).join('')}</div></div>
  <div class="field"><label class="flabel" for="cz-font">Label font</label><select class="input" id="cz-font">${FONTS.map(f=>`<option value="${f.id}"${s.font===f.id?' selected':''}>${esc(f.name)}</option>`).join('')}</select></div>
  ${cmp?`<div class="field cmp-field"><span class="flabel" id="cz-cmp-l">Compare</span>
    <div class="cmp-row"><span class="fine" id="cz-edit-l">Editing:</span><div class="seg" role="group" aria-labelledby="cz-edit-l">${['A','B'].map(x=>`<button type="button" data-cmp-edit="${x}" aria-pressed="${cmpEdit===x}">${x}</button>`).join('')}</div>
      <button class="btn ghost" type="button" id="cz-swap">Swap A and B</button><button class="btn ghost" type="button" id="cz-cmp-close">Close compare</button></div>
    <p class="fine" id="cz-cmp-diff" role="status">${esc(cmpDiffText(v))}</p>
    <p class="fine">A is on the left, B on the right. They share the clock, seed, colors, speed and view; the share link carries both.</p></div>`
  :`<div class="field cmp-field"><span class="flabel" id="cz-cmp-l">Compare</span><div class="btnrow"><button class="btn ghost" type="button" id="cz-cmp" aria-describedby="cz-cmp-n"${noCmp?' disabled':''}>Compare two settings</button></div>
    <p class="fine" id="cz-cmp-n">${esc(noCmp||'Splits the stage into A and B: the same piece on one clock, with the same seed, colors and view, and B\'s parameters yours to change. Key X.')}</p></div>`}
  ${ctrls.map(c=>paramField(c,P.params[c.key],offNote(c))).join('')}
  ${presets.length?`<div class="field"><span class="flabel" id="cz-try">Try this</span><div class="presets" role="group" aria-labelledby="cz-try">${presets.map((p,i)=>{ const b=`<button class="preset" type="button" data-preset="${i}" data-pviz="${esc(v.id)}"><b>${esc(p.label)}</b>${p.note?`<small>${esc(p.note)}</small>`:''}${foundSR(p)}</button>`;
    return p.foundBy?`<div class="presetgrp">${b}${foundLink(p,'linkbtn fb')}</div>`:b; }).join('')}</div></div>`:''}
  <div class="field"><label class="flabel" for="cz-lw">Line width <output id="o-lw">${s.lw.toFixed(1)} px</output></label><input type="range" id="cz-lw" min="0.5" max="4" step="0.1" value="${s.lw}"></div>
  <div class="field"><label class="flabel" for="cz-speed">Animation speed <output id="o-speed">${s.speed.toFixed(2)}×</output></label><input type="range" id="cz-speed" min="0" max="3" step="0.05" value="${s.speed}"></div>
  <div class="field"><label class="check" for="cz-labels"><input type="checkbox" id="cz-labels"${s.labels?' checked':''}> Show formulas and labels</label>
    <label class="check" for="cz-all"><input type="checkbox" id="cz-all"${applyAll?' checked':''}> Apply color, font, line width and speed to every visualization</label></div>
  <div class="field"><div class="btnrow"><button class="btn ghost" type="button" id="cz-reset">Reset to defaults</button></div>
    <p class="fine">To put this view on a course page, in a slide or in a clip, use Share.</p></div>
  ${momentFieldHTML(v)}`;
  const shared=['palette','font','lw','speed','labels'];
  const set=(k,val)=>{ s[k]=val; if(applyAll && shared.includes(k)) VIZ.forEach(o=>getSettings(o)[k]=val); pushTheme(); };
  // every value goes through normalizeParams, so the module only ever sees valid params
  const setParams=next=>{ P.params=normalizeParams(m,next); if(eB) pushB(v); else pushParams(v); };
  $$('[data-mode]',body).forEach(b=>b.onclick=()=>{ if(b.getAttribute('aria-pressed')!=='true') setMode(v,b.dataset.mode); });
  $$('.swatch',body).forEach(b=>b.onclick=()=>{ set('palette',b.dataset.pal); $$('.swatch',body).forEach(x=>x.setAttribute('aria-pressed',x===b)); });
  $('#cz-font').onchange=e=>set('font',e.target.value);
  $$('[data-pkey]',body).forEach(inp=>{
    const c=ctrls.find(x=>x.key===inp.dataset.pkey), out=$(`#o-${c.id}`,body), num=inp.type==='range'||inp.type==='number';
    inp.addEventListener(inp.type==='checkbox'||inp.tagName==='SELECT'?'change':'input',()=>{
      setParams({...P.params, [c.key]: inp.type==='checkbox'?inp.checked : num?+inp.value : inp.value});
      if(out) out.textContent=c.format(P.params[c.key]);
    });
    if(inp.type==='number') inp.addEventListener('change',()=>{ inp.value=P.params[c.key]; });
  });
  $$('[data-reseed]',body).forEach(b=>b.onclick=()=>{ const k=b.dataset.reseed; setParams({...P.params, [k]:Math.floor(Math.random()*4294967296)}); $(`#cz-p-${CSS.escape(k)}`,body).value=P.params[k]; });
  if(cmp){
    $$('[data-cmp-edit]',body).forEach(b=>b.onclick=()=>{ cmpEdit=b.dataset.cmpEdit; renderCustomize(v,body); refocus(`[data-cmp-edit="${cmpEdit}"]`,body); announce(`Editing ${cmpEdit}`); });
    $('#cz-swap').onclick=()=>{ const a=s.params; s.params={...settingsB[v.id].params}; for(const k of seedKeys(v)) s.params[k]=a[k]; settingsB[v.id].params=a; pushParams(v); renderCustomize(v,body); refocus('#cz-swap',body); announce(`Swapped. ${cmpDiffText(v)}`); };
    $('#cz-cmp-close').onclick=()=>{ closeCompare(); refocus('#cz-cmp',body); };
  } else if(!noCmp) $('#cz-cmp').onclick=()=>{ if(sl && openCompare(sl)) refocus('[data-cmp-edit="B"]',body); };
  $('#cz-lw').oninput=e=>{ set('lw',+e.target.value); $('#o-lw').textContent=(+e.target.value).toFixed(1)+' px'; };
  $('#cz-speed').oninput=e=>{ set('speed',+e.target.value); $('#o-speed').textContent=(+e.target.value).toFixed(2)+'×'; };
  $('#cz-labels').onchange=e=>set('labels',e.target.checked);
  $('#cz-all').onchange=e=>{ applyAll=e.target.checked; if(applyAll){ shared.forEach(k=>VIZ.forEach(o=>getSettings(o)[k]=s[k])); pushTheme(); } };
  $('#cz-moment',body).onclick=e=>openMoments(v,e.currentTarget);
  $('#cz-reset').onclick=()=>{ delete settings[v.id]; if(cmpOn(v)) settingsB[v.id]={params:normalizeParams(m,{})}; pushTheme(); pushParams(v); slides.forEach(x=>{ if(x.v===v) setViewSl(x,null); }); renderCustomize(v,body); refocus('#cz-reset',body); toast('Reset to the style defaults'); };
}

/* ---------- your lists of moments, in this browser (docs/module-api.md section 5, "Moments") ----------
   One store, 'loci:moments': [{id, title, intro, items}], items in the collection form. The first load builds it from
   the two stores it replaces: every list in 'loci:collections' and every piece's "Your lesson" draft
   ('loci:lesson:<id>'), which becomes a list of that piece's moments. The old keys are left as they were. */
const Moments={
  KEY:'loci:moments',
  migrate(){
    const out=[], old=store.get(Collection.KEY,[]);
    (Array.isArray(old)?old:[]).forEach((o,k)=>{ if(o && typeof o==='object' && !Array.isArray(o)) out.push({...o, id:typeof o.id==='string'?o.id:'c'+k}); });
    for(const v of VIZ){
      const d=store.get(Lesson.key(v),null), l=d&&Lesson.parse(d,v,'saved lesson');
      if(l && l.stops.length) out.push({id:'l-'+v.id, title:l.title||v.title, items:l.stops.map(s=>({v:v.id, ...Lesson.compact(v,s)}))});
    }
    return out;
  },
  load(){
    let a=LociAPI.lists.get();
    if(!Array.isArray(a)){ a=Moments.migrate(); LociAPI.lists.put(a); }
    return a.map((o,k)=>{ const c=Collection.parse(o,'saved list',true); return c&&{id:typeof o.id==='string'?o.id:'m'+k, title:c.title, intro:c.intro, items:c.items}; }).filter(Boolean);
  },
  save(list){ LociAPI.lists.put(list.map(c=>({id:c.id, ...Collection.compact(c)}))); },
  /* one piece, at most 8 moments, no intro, no mode: the lesson link (?v=<id>&lesson=), which keeps v= for the piece's
     link preview; anything else is the collection link (?collection=). Both are the links made before 201. */
  oneRun:c=>c.items.length>0 && c.items.length<=Lesson.MAX_STOPS && !c.intro && c.items.every(it=>it.v===c.items[0].v && !it.mode && !it.bare),
  url(c){ return Moments.oneRun(c)?Lesson.url(vizById(c.items[0].v),{title:c.title, stops:c.items}):Collection.url(c); },
};
let moV=null, moSel=null, moList=null, moNote='';
const moLists=()=>moList||(moList=Moments.load());
const moOf=()=>moLists().find(c=>c.id===moSel)||null;
function stopSummary(v,st){
  const bits=paramControls(v.manifest).filter(c=>st.p && c.key in st.p).map(c=>`${c.label} ${c.format?c.format(st.p[c.key]):st.p[c.key]}`);
  bits.push(`t = ${(st.t||0).toFixed(2)} s`); if(st.view!=null) bits.push('your view'); return bits.join(' · ');
}
/* Customize: the way into the Moments panel, and how many of this piece's moments your lists hold */
function momentFieldHTML(v){
  const n=moLists().reduce((a,c)=>a+c.items.filter(it=>it.v===v.id).length,0);
  return `<div class="field lesson-f" role="group" aria-labelledby="mo-cz-h"><h3 class="flabel" id="mo-cz-h">Moments</h3>
    <p class="fine" id="mo-cz-d">Keep this moment (the parameters, the time <i>t</i> and your view) with one sentence in a list. A piece's moments in a row step on its slide; the next piece's moment moves the feed on. One link plays the whole list, in the feed or in Present.</p>
    <div class="btnrow"><button class="btn" type="button" id="cz-moment" aria-describedby="mo-cz-d">Add this moment…</button></div>
    ${n?`<p class="fine">Your lists hold ${n} moment${n===1?'':'s'} of this piece.</p>`:''}</div>`;
}

/* ---------- the Moments panel (from Save's toast, Customize and Share): add this moment to a list, edit, copy one link ---------- */
function openMoments(v,opener,note){
  moV=v; if(!moOf()) moSel=moLists().length?moList[0].id:'new';
  moNote=note||''; $('#mo-h').textContent=v.title; renderMoments(); showDialog('#momentsmodal','#mo-note',opener);
}
function moItemsHTML(c){
  if(!c || !c.items.length) return `<p class="fine">No moments yet.</p>`;
  return `<ol class="ls-stops" role="list">${c.items.map((it,i)=>{ const v=vizById(it.v), same=i>0 && c.items[i-1].v===it.v;
    return `<li${same?' class="same"':''}><span class="ls-i" aria-hidden="true">${i+1}</span><span class="ls-txt"><b>${it.note?texText(it.note):'(no note)'}</b><small>${esc(v.title)} · ${esc(it.bare?'as the feed plays it':stopSummary(v,Lesson.compact(v,it)))}${it.mode?` · ${TARGET_NAME[it.mode].toLowerCase()}`:''}${same?' · same slide':''}</small></span>
    <button class="iconbtn" type="button" data-mo-del="${i}" aria-label="Delete moment ${i+1}: ${esc(v.title)}${it.note?`, ${esc(it.note)}`:''}">${ICON.close}</button></li>`; }).join('')}</ol>`;
}
function renderMoments(){
  const body=$('#mo-body'), v=moV, c=moOf();
  body.innerHTML=`<p class="fine" id="mo-now">This moment: ${esc(stopSummary(v,Lesson.capture(v,'')))}</p>
    <label class="flabel" for="mo-note">Note for this moment</label><input class="input" id="mo-note" type="text" maxlength="${Lesson.MAX_NOTE}" value="${esc(moNote)}" placeholder="One sentence: what should they notice?" autocomplete="off">
    <label class="flabel" for="mo-sel">List</label><select class="input" id="mo-sel">${moList.map(x=>`<option value="${esc(x.id)}"${x.id===moSel?' selected':''}>${esc(x.title||'Untitled list')} (${x.items.length})</option>`).join('')}<option value="new"${c?'':' selected'}>New list…</option></select>
    <label class="flabel" for="mo-title">Title</label><input class="input" id="mo-title" type="text" maxlength="${Lesson.MAX_TITLE}" value="${esc(c?c.title:'')}" placeholder="Week 7" autocomplete="off">
    <label class="flabel" for="mo-intro">Intro (optional, one paragraph)</label><textarea class="input mo-intro" id="mo-intro" rows="2" maxlength="${Collection.MAX_INTRO}" placeholder="Shown with the first moment.">${esc(c?c.intro:'')}</textarea>
    <div class="btnrow"><button class="btn" type="button" id="mo-add">Add this moment</button></div>
    <div id="mo-items">${moItemsHTML(c)}</div>
    <div class="btnrow"><button class="btn" type="button" id="mo-copy">Copy link</button><button class="btn ghost" type="button" id="mo-play">Play it</button>${c?`<button class="btn ghost" type="button" id="mo-delete">Delete list</button>`:''}</div>
    <p class="fine" id="mo-by">By <b data-hd-now>${esc(myHandle()||'you')}</b>, your handle (set on Yours, which lists all your lists).</p>
    <p class="fine" id="mo-status" role="status"></p>
    <label class="flabel" for="mo-url" hidden>Link to the list</label><input class="input mono" id="mo-url" type="text" readonly spellcheck="false" hidden>
    <p class="fine">Kept in this browser. A piece's moments in a row play on its slide, stepped with ‹ › or the arrow keys; the next piece's moment moves the feed on, so a piece's moments stay together. At most ${Collection.MAX_ITEMS} moments. The link carries the whole list, and only people you send it to see it.</p>`;
  bindMoments(body);
}
function bindMoments(body){
  typeset($('#mo-items',body));
  const status=m=>{ $('#mo-status',body).textContent=m; announce(m); }, save=()=>Moments.save(moList);
  const ensure=()=>{ let c=moOf(); if(!c){ c={id:'m'+Date.now().toString(36), title:$('#mo-title',body).value.trim().slice(0,Lesson.MAX_TITLE), intro:'', items:[]}; moList.unshift(c); moSel=c.id; } return c; };
  $('#mo-sel',body).onchange=e=>{ moSel=e.target.value; moNote=$('#mo-note',body).value; renderMoments(); refocus('#mo-sel',body); };
  $('#mo-note',body).oninput=e=>{ moNote=e.target.value; };
  $('#mo-note',body).onkeydown=e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); $('#mo-add',body).click(); } };
  $('#mo-title',body).oninput=e=>{ const c=moOf(); if(c){ c.title=e.target.value.trim().slice(0,Lesson.MAX_TITLE); save(); } };
  $('#mo-intro',body).oninput=e=>{ const c=moOf(); if(c){ c.intro=e.target.value.trim().replace(/\s+/g,' ').slice(0,Collection.MAX_INTRO); save(); } };
  $('#mo-add',body).onclick=()=>{
    const c=moOf(), v=moV, last=c&&c.items[c.items.length-1], k=c?c.items.findIndex(it=>it.v===v.id):-1;
    if(c && c.items.length>=Collection.MAX_ITEMS) return status(`A list holds at most ${Collection.MAX_ITEMS} moments. Delete one to add another.`);
    if(k>=0 && last.v!==v.id) return status(`${v.title} is already moment ${k+1}. A piece's moments play together on its slide, so they must be next to each other: delete moment ${k+1} first, or start a new list.`);
    const cc=ensure(), intro=$('#mo-intro',body).value.trim().replace(/\s+/g,' ').slice(0,Collection.MAX_INTRO); if(intro) cc.intro=intro;
    const it=Collection.capture(v,$('#mo-note',body).value); cc.items.push(it); save();
    moNote=''; renderMoments(); refocus('#mo-add',body);
    const n=cc.items.length;
    status(`Added moment ${n} to “${cc.title||'Untitled list'}”: ${v.title}, ${stopSummary(v,it)}.${k>=0?` It steps on the same slide as moment ${n-1}.`:''}${n===1?' Add at least one more to share it.':''}`);
  };
  $('#mo-items',body).onclick=e=>{
    const b=e.target.closest('[data-mo-del]'), c=moOf(); if(!b||!c) return; const i=+b.dataset.moDel, [it]=c.items.splice(i,1); save();
    $('#mo-items',body).innerHTML=moItemsHTML(c); typeset($('#mo-items',body));
    refocus(c.items.length?`[data-mo-del="${Math.min(i,c.items.length-1)}"]`:'#mo-add',body); status(`Deleted moment ${i+1}, ${vizById(it.v).title}. ${c.items.length} left.`);
  };
  $('#mo-copy',body).onclick=()=>{
    const c=moOf(); if(!c || c.items.length<2) return status('Add at least two moments to share a list.');
    const url=Moments.url(c), u=$('#mo-url',body); u.value=url; u.hidden=false; u.previousElementSibling.hidden=false;
    copyText(url,`Link copied: ${c.items.length} moments`);
    $('#mo-status',body).textContent=`The link is ${url.length.toLocaleString()} characters.${url.length>6000?' That is long; some chat apps cut links over about 6,000 characters, so shorten the notes.':''}`;
  };
  $('#mo-url',body).onfocus=e=>e.target.setSelectionRange(0,e.target.value.length,'backward');
  /* plays as its link would: one piece in this feed as a lesson, several as a playlist */
  $('#mo-play',body).onclick=()=>{
    const c=moOf(), pc=c&&c.items.length&&Collection.parse(Collection.compact(c),'your list'); if(!pc) return status('Add a moment first.');
    hideDialog($('#momentsmodal')); closeDrawer(); if(view!=='feed') showView('feed');
    if(Moments.oneRun(pc)){
      const v=vizById(pc.items[0].v), sl=slides.find(x=>x.v===v); if(!sl || sl!==curSlide()) jumpToViz(v.id);
      Lesson.play(v,{title:pc.title, stops:pc.items}); requestAnimationFrame(()=>{ const s2=slides.find(x=>x.v===v); if(s2) refocus('[data-ls="next"]',s2.el); });
    } else { Collection.play(pc,true); feed.focus({preventScroll:true}); }
  };
  const del=$('#mo-delete',body); if(del) del.onclick=()=>{
    const c=moOf(); if(!c) return;
    if(!del.dataset.armed){ del.dataset.armed='1'; del.textContent='Yes, delete it'; return status(`Delete “${c.title||'Untitled list'}” and its ${c.items.length} moment${c.items.length===1?'':'s'}? Press Yes, delete it to confirm.`); } // two presses: there is no undo
    moList=moList.filter(x=>x!==c); save(); moSel=moList.length?moList[0].id:'new'; renderMoments(); refocus('#mo-sel',body);
    status(`Deleted “${c.title||'Untitled list'}” from this browser.`);
  };
}

/* ---------- thumbnails ---------- */
/* A thumbnail is a poster: one frame rendered in a worker and captured as a PNG. */
const posters=new Map();
function renderThumb(cv,v,t){
  const r=cv.getBoundingClientRect(); if(!r.width) return;
  const d=dpr(); cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  const ctx=cv.getContext('2d'), B={x:10,y:10,w:r.width-20,h:r.height-20}; t=t??v.t0+6;
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
        <p>Every piece passed the automated checks, ships with an explanation, and can be restyled from its Customize panel. Most were also reviewed by two community mathematicians; the newest are checked by machine only. Pick one to open it in the feed.</p>
        <button class="row wantrow" type="button" data-wanted><strong>Wanted: pictures people have asked for →</strong><span class="fine">${WANTED.filter(c=>c.status!=='answered').length} open requests, one of them this month’s challenge. Vote for the ones you want, or propose your own.</span></button></div>
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
      <div class="card-body"><h3>${esc(v.title)}</h3><div class="by">${userLink(v.author,true)} · <span title="${esc(LIKES_NOTE)}">♥ ${fmtK(v.likes+(LociAPI.server&&v.liked?1:0))}</span></div>
        <div class="tline">${v.tags.map(t=>'#'+esc(t.toLowerCase())).join('  ')}</div>
        <div class="meta"><span class="oss">${esc(v.license)}</span><span>${v.lane==='new'?'checked by machine':`reviewed ${esc(v.reviewed)}`}</span></div></div></button>`;
}
function renderCatGrid(){
  const list=VIZ.filter(v=>[...catTags].every(t=>v.tags.includes(t)) && (!catQuery || (v.title+' '+v.tags.join(' ')+' '+v.author+' '+v.hook).toLowerCase().includes(catQuery)));
  $('#cat-grid').innerHTML=(list.length?list.map(v=>cardHTML(v)).join('')
    : `<p class="empty">No visualizations match. Clear a topic or try a shorter search.</p>`)
    + `<div class="card submit"><div class="card-body"><div class="kicker">Contribute</div><h3>Submit a visualization</h3>
        <ul><li>An OSI-approved license (MIT, BSD, Apache, GPL)</li><li>A loci.json manifest and one module (JS or WebAssembly) that draws from the site's theme and params</li><li>An explanation.md with the mathematics</li><li>Checked here in your browser, then submitted as a pull request to the registry on GitHub: its bot runs the checks again, two moderators review it, and it goes live when both approve</li></ul>
        <div class="btnrow"><button class="btn" type="button" data-view="submit">Check it and open a pull request</button><a class="btn ghost" href="docs/submitting.md" data-doc="submitting">Read the submission guide</a><button class="btn ghost" type="button" data-post="how-we-curate">How review works</button></div></div></div>`;
  paintThumbs($('#cat-grid'));
}

/* ---------- blog ---------- */
function renderBlog(){
  const el=$('#blog');
  if(!blogPost){
    el.innerHTML=`<div class="wrap">
      <div class="pagehead"><div class="kicker">Blog</div><h1>Notes from the curators</h1><p>Monthly roundups, guest lists from teachers and researchers, and how the catalog is made.</p></div>
      <div class="blog-grid"><div class="posts">${POSTS.slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).map(p=>`<button class="post" type="button" data-post="${p.id}">
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
  el.scrollTop=0; paintThumbs(el); typeset($('.article .md',el));
}
/* ---------- Docs (docs/*.md): the guides, fetched and rendered in the page through md() and KaTeX ----------
   fetch().text() always decodes UTF-8, so the raw file's server content type no longer matters. Every in-app link to
   docs/<name>.md opens here (data-doc, or any plain click on such a link); the raw file stays one click away as "View source". */
const DOCS=['submitting','module-api','review-pipeline','bounties','distinctions','questions','fidelity-assessment'];
const docsPage={name:null, from:'feed', opener:null, cache:new Map()};
const docName=href=>{ const m=/^(?:\.?\/?docs\/)?([a-z0-9-]+)\.md(#.*)?$/.exec(href||''); return m && DOCS.includes(m[1]) ? m[1] : null; };
const docLink=(name,text)=>`<a href="docs/${name}.md" data-doc="${name}">${esc(text)}</a>`;
function openDoc(name,opener){
  if(!DOCS.includes(name)) return;
  if(view!=='docs'){ docsPage.from=view; docsPage.opener=opener||document.activeElement; }
  docsPage.name=name;
  if(view==='docs') renderDocs(); else showView('docs');
}
function closeDocs(){
  const {from, opener}=docsPage; showView(from);
  if(opener && opener.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) opener.focus({preventScroll:true});
  else (from==='feed'?feed:$('#'+from)).focus({preventScroll:true});
}
async function renderDocs(){
  const el=$('#docs'), name=docsPage.name, src=`docs/${name}.md`;
  const shell=inner=>`<div class="wrap"><div class="article docpage">
      <div class="btnrow"><button class="backlink" type="button" data-docs-back>← Back</button><a class="linkbtn rawdoc" href="${src}" target="_blank" rel="noopener">View source (${esc(src)})</a></div>
      ${inner}</div></div>`;
  let text=docsPage.cache.get(name);
  if(text==null){
    el.innerHTML=shell(`<p class="fine" role="status">Loading ${esc(src)}…</p>`);
    try{ const r=await fetch(src); if(!r.ok) throw new Error(`HTTP ${r.status}`); text=await r.text(); docsPage.cache.set(name,text); }
    catch(e){ if(docsPage.name!==name || view!=='docs') return; el.innerHTML=shell(`<p role="alert">Could not load ${esc(src)} (${esc(e.message||e)}). The raw file may still open from View source.</p>`); return; }
    if(docsPage.name!==name || view!=='docs') return;
  }
  el.innerHTML=shell(`<div class="md">${md(text)}</div>`);
  // links between the guides (module-api.md, docs/x.md) stay in the Docs view
  $$('.md a[href]',el).forEach(a=>{ const n=docName(a.getAttribute('href')); if(n) a.dataset.doc=n; else if(/^https?:/.test(a.getAttribute('href'))){ a.target='_blank'; a.rel='noopener'; } });
  // the guides name the site EigenReel (config.js SITE_NAME); a server with another siteName gets its own name in the titles
  if(site()!=='EigenReel') $$('.md h1, .md h2',el).forEach(x=>{ if(x.textContent.includes('EigenReel')) x.textContent=x.textContent.replace(/EigenReel/g,site()); });
  const h=$('.md h1',el); if(h) h.tabIndex=-1;
  el.scrollTop=0; typeset($('.md',el));
  (h||el).focus({preventScroll:true}); announce(`Docs: ${h?h.textContent:src}`);
}
function openPost(id){
  const prev=blogPost; blogPost=id; if(view!=='blog') showView('blog'); else renderBlog();
  if(id) refocus('.article h1',$('#blog')); else if(prev) refocus(`.post[data-post="${prev}"]`,$('#blog'));
}

/* ---------- submit: drop a package, run the automated gate (checks.js) as the author's pre-flight, then prepare a pull
   request to the registry on GitHub (docs/submitting.md section 8). Nothing is uploaded from this page. ---------- */
let checking=null, subReport=null; // one gate run at a time: the Submit page and Check this remix share the sandbox and the clock
/* where a run shows its progress and report: the Submit page ('sub') or the remix editor ('rxc'), looked up by id each time
   because the drawer may re-render mid-run */
const reportURLs={sub:[], rxc:[]};
function uiFor(pfx){ const g=n=>$(`#${pfx}-${n}`);
  return {pfx, inline:pfx!=='sub', urls:reportURLs[pfx], get run(){ return g('run'); }, get bar(){ return g('bar'); }, get lab(){ return g('label'); }, get prev(){ return g('preview'); }, get rep(){ return g('report'); }, get line(){ return g('pkg'); },
    buttons:()=>pfx==='sub'?$$('#sub-in button'):$$('#rxc-check')}; }
const SUB_ICON={pass:'✓', fail:'✕', warn:'!', skip:'–'}, SUB_WORD={pass:'Pass', fail:'Fail', warn:'Warning', skip:'Skipped'};
const SUB_GROUPS=[['static','Static checks','Read from the files.'],['dynamic','Dynamic checks','Run in the sandboxed worker at 335×490, 700×300 and 1100×700, on the night, graph and high-contrast palettes, plus one run at 2× pixel ratio.'],['content','Content checks','']];
const SUB_SAMPLE='elliptic-group-law', SUB_FAIL_SAMPLE='times-table', SUB_GPU_SAMPLE='hopf-fibers'; // the GPU sample has two targets: three.js on desktop, canvas2d on mobile; the passing and GPU samples declare pointer input. The failing one is built from a legacy draw() piece
function renderSubmit(){
  const el=$('#submit'); if(el.firstChild) return;
  el.innerHTML=`<div class="wrap sub">
    <div class="pagehead"><div class="kicker">Submit · checks, then a pull request</div><h1>Submit a visualization</h1>
      <p>Drop your package and the automated gate from the <a href="docs/review-pipeline.md" data-doc="review-pipeline">review pipeline</a> runs here, in your browser, in the same sandbox as the feed. It takes about a minute, and nothing leaves your browser. When every check passes, this page prepares a pull request to the registry on GitHub: the registry's bot runs the same checks again, two moderators review it, and it goes live when both approve. First time? Read the <a href="docs/submitting.md" data-doc="submitting">submission guide</a>.</p>
      <p>Looking for something to make? <button class="linkbtn" type="button" data-wanted>See what people have asked for on the Wanted page</button>.</p></div>
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
  if(checking) return announce('The checks are already running.');
  const st=$('#sub-pkg'); let pkg;
  try{ pkg=await get(); }catch(e){ st.textContent=`Could not read that package: ${e.message}`; return announce(st.textContent); }
  if(!pkg.files.size){ st.textContent='That package is empty.'; return announce(st.textContent); }
  runChecks(pkg);
}
async function runChecks(pkg,ui=uiFor('sub'),meta={}){
  const files=`${pkg.files.size} file${pkg.files.size===1?'':'s'} (${[...pkg.files.keys()].map(p=>p.split('/').pop()).join(', ')})`;
  checking={key:meta.key||null, line:meta.remix?`Checking ${pkg.name}, ${rxWhat(meta.remix)}: ${files}.`:`Checking ${pkg.name}: ${files}.`};
  ui.urls.forEach(u=>URL.revokeObjectURL(u)); ui.urls.length=0;
  const set=(el,f)=>{ if(el) f(el); }, run=ui.run, prev=ui.prev;
  ui.buttons().forEach(b=>b.disabled=true);
  set(ui.line,l=>l.textContent=checking.line);
  set(ui.rep,r=>{ r.hidden=true; r.innerHTML=''; }); set(prev,p=>p.innerHTML=''); set(run,r=>r.hidden=false);
  set(ui.bar,b=>{ b.setAttribute('aria-valuenow','0'); b.firstElementChild.style.width='0%'; }); set(ui.lab,l=>l.textContent='Starting…');
  set(run,r=>r.scrollIntoView({block:'nearest', behavior:reduceMotion?'auto':'smooth'}));
  announce(`Running the checks on ${meta.remix?rxWhat(meta.remix):pkg.name}. This takes about a minute.`);
  let report;
  try{
    report=await LociChecks.run(pkg,{preview:prev||undefined, bounties:typeof WANTED!=='undefined'?WANTED:null, onProgress:(i,n,label)=>{
      set(ui.bar,bar=>{ bar.setAttribute('aria-valuemax',n); bar.setAttribute('aria-valuenow',i); bar.setAttribute('aria-valuetext',`Step ${i} of ${n}: ${label}`); bar.firstElementChild.style.width=`${Math.round(100*i/n)}%`; });
      set(ui.lab,l=>l.textContent=label); }});
  }catch(e){ report={ok:false, checks:[{id:'runner', group:'static', title:'Checker', status:'fail', detail:`The checker crashed: ${e.message}`}], counts:{total:1,pass:0,fail:1,warn:0,skip:0}, durationMs:0, posterBlob:null}; }
  checking=null; set(ui.run,r=>r.hidden=true); ui.buttons().forEach(b=>b.disabled=false);
  if(ui.rep) renderReport(report,ui,pkg,meta);
  else announce(`Checks finished: ${report.counts.pass} of ${report.counts.total} passed, ${report.counts.fail} failed. The report is in the Source tab's remix editor.`);
  return report;
}
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
/* The grouped report, on the Submit page (ui 'sub', with Submit on GitHub) or under the remix editor (ui 'rxc', with Prepare pull request).
   meta.remix says the package is a remix; meta.quiet re-renders without moving focus; meta.stale notes later edits. */
function renderReport(r,ui=uiFor('sub'),pkg=null,meta={}){
  const c=r.counts, el=ui.rep, secs=Math.round(r.durationMs/1000), P=ui.pfx, name=pkg?pkg.name:'package', rx=meta.remix, H=ui.inline?3:2;
  if(!ui.inline) subReport=r;
  const url=b=>{ const u=URL.createObjectURL(b); ui.urls.push(u); return u; };
  const sum=`Passed ${c.pass} of ${c.total} checks · ${c.fail} failed${c.warn?` · ${c.warn} warning${c.warn===1?'':'s'}`:''} · ${secs} s`;
  const row=k=>{ const w=whereText(k.where), fr=k.frame?url(k.frame):null;
    return `<li class="ck ck-${k.status}"><span class="ck-ico" aria-hidden="true">${SUB_ICON[k.status]}</span>
      <div class="ck-main"><p class="ck-top"><span class="ck-st">${SUB_WORD[k.status]}</span><span class="sr">: </span><span class="ck-t">${esc(k.title)}</span></p>
        <p class="ck-d">${esc(k.detail)}</p>${w?`<p class="ck-w"><span class="sr">Where: </span>${esc(w)}</p>`:''}</div>
      ${fr?`<a class="ck-fr" href="${fr}" target="_blank" rel="noopener"><img src="${fr}" alt="The frame where “${esc(k.title)}” failed${w?`, ${esc(w)}`:''}"></a>`:''}</li>`; };
  const again=ui.inline?'Fix what failed in the editor and check again.':rx?'Fix what failed in the remix editor (Source tab) and check again.':'Fix what failed and drop the package again.';
  el.innerHTML=`<div class="sub-sum ${r.ok?'ok':'bad'}">
      <div class="kicker">${esc(name)}${r.manifest&&r.manifest.id&&r.manifest.id!==name?` · ${esc(r.manifest.id)}`:''}</div>
      <h${H} id="${P}-sum" tabindex="-1">${esc(sum)}</h${H}>
      ${rx?`<p class="note">${rx.fresh?`This report is for <b>your new visualization</b>, checked as the package <code>${esc(r.manifest&&r.manifest.id||name)}</code>.`:`This report is for <b>your remix</b> of “${esc(rx.title)}”, checked as a new package <code>${esc(r.manifest&&r.manifest.id||name)}</code> with <code>"remixOf": "${esc(rx.id)}"</code>, not for the published piece.`}${meta.stale?' The editor has changed since this check.':''}</p>`:''}
      <p class="fine">${r.ok?`Nothing failed, so you can open a pull request${ui.inline?': Prepare pull request takes this package to the Submit page':', below'}. Warnings are shown to the reviewers but do not block.`:`${again} Warnings do not block.`}${c.skip?` ${c.skip} skipped check${c.skip===1?' is':'s are'} listed but not counted.`:''} The frame budget is measured over ${r.playSeconds||6} s per run here; the pipeline plays 20 s.</p>
      <div class="btnrow">${ui.inline?`<button class="btn" type="button" id="${P}-open"${r.ok?'':` disabled aria-describedby="${P}-open-why"`}>Prepare pull request</button>`:''}<button class="btn ghost" type="button" id="${P}-json">Download report.json</button></div>
      ${ui.inline&&!r.ok?`<p class="fine" id="${P}-open-why">Prepare pull request is enabled once no check fails.</p>`:''}</div>
    ${ui.inline?'':githubHTML(r,pkg,meta)}
    ${reportGroups(r).map(([g,h,d,ks])=>{ if(!ks.length) return '';
      const f=ks.filter(k=>k.status==='fail').length, sk=ks.filter(k=>k.status==='skip').length;
      return `<section class="ck-group" aria-labelledby="${P}g-${g}"><h${H+1} class="sub-h" id="${P}g-${g}">${esc(h)} <span class="ck-n">${ks.filter(k=>k.status==='pass').length} passed${f?`, ${f} failed`:''}${sk===ks.length?', skipped':''}</span></h${H+1}>${d?`<p class="fine">${esc(d)}</p>`:''}
        <ul class="cklist">${ks.map(row).join('')}</ul></section>`; }).join('')}`;
  el.hidden=false;
  $(`#${P}-json`).onclick=()=>{
    const out={package:name, ...(rx?{remixOf:rx.id}:{}), ok:r.ok, summary:sum, durationMs:r.durationMs, playSecondsPerRun:r.playSeconds, packageHash:r.packageHash, moduleHash:r.moduleHash, manifest:r.manifest,
      targets:r.targets, moduleHashes:r.moduleHashes,
      checks:r.checks.map(k=>({id:k.id, group:k.group, ...(k.target?{target:k.target}:{}), title:k.title, status:k.status, detail:k.detail, ...(k.where?{where:k.where}:{}), ...(k.frame?{frame:'captured (shown in the page, not included here)'}:{})}))};
    download(new Blob([JSON.stringify(out,null,2)+'\n'],{type:'application/json'}),'report.json'); toast('Saved report.json');
  };
  if(ui.inline){ if(r.ok) $(`#${P}-open`).onclick=()=>preparePR(pkg,r,meta); }
  else if(r.ok) wireGithub(el,r,pkg,meta,url);
  if(meta.quiet) return;
  $(`#${P}-sum`).focus({preventScroll:true}); $(`#${P}-sum`).scrollIntoView({block:'start', behavior:'auto'});
  announce(`Checks finished. ${sum}.${r.ok?(ui.inline?' Prepare pull request to submit it on GitHub.':' Submit on GitHub is below.'):''}`);
}
/* ---------- Submit on GitHub: a checked package as a pull request to the registry ----------
   The registry (demo/github/README.md) takes a package as a folder entries/<slug>/. The page gives the zip laid out that
   way, a link to GitHub's drag-and-drop upload page for that folder (which makes the branch, in a fork for people
   without write access, and offers the pull request), and the pull request text. The registry is the demo server's
   REGISTRY_REPO / REGISTRY_BRANCH (api/registry), else REGISTRY in config.js; without one the section says so and
   shows the layout to submit by hand. */
const REPO_RE=/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
function registryTarget(){
  if(LociAPI.registry.repo && REPO_RE.test(LociAPI.registry.repo)) return {repo:LociAPI.registry.repo, branch:LociAPI.registry.branch||'main', from:'server'};
  const R=typeof REGISTRY!=='undefined'?REGISTRY:null;
  return R && typeof R.repo==='string' && REPO_RE.test(R.repo)?{repo:R.repo, branch:typeof R.branch==='string'&&R.branch?R.branch:'main', from:'config'}:null;
}
const prSlug=(r,pkg)=>{ const id=r.manifest&&r.manifest.id; return typeof id==='string'&&/^[a-z0-9][a-z0-9-]{0,47}$/.test(id)?id:null; };
/* the package's files as the registry wants them: entries/<slug>/<file>, in a stable order */
function registryFiles(pkg,slug){
  const enc=new TextEncoder();
  return [...LociChecks.normalizePkg(pkg).files].sort((a,b)=>a[0]<b[0]?-1:1)
    .map(([p,f])=>({name:`entries/${slug}/${p}`, bytes:f.bytes?(f.bytes instanceof Uint8Array?f.bytes:new Uint8Array(f.bytes)):enc.encode(f.text||'')}));
}
/* the pull request's text: title, hook, tags, license, the check summary and the ?v= links */
function prText(r,pkg,meta,slug){
  const m=r.manifest||{}, c=r.counts, here=location.origin+location.pathname, files=[...LociChecks.normalizePkg(pkg).files.keys()].sort();
  const parent=m.remixOf||(meta.remix&&!meta.remix.fresh&&meta.remix.id)||null, sample=pkg.sampleOf||null, warns=r.checks.filter(k=>k.status==='warn');
  return [
    `## ${m.title||slug}`, '',
    ...(m.hook?[`> ${m.hook}`, '']:[]),
    `- Entry: \`entries/${slug}/\` (${files.join(', ')})`,
    `- Tags: ${(m.tags||[]).join(', ')||'none'}`,
    `- License: ${m.license||'none'}`,
    ...(m.author?[`- Author: ${m.author}`]:[]),
    ...(parent?[`- Remix of: ${parent}, ${here}?v=${encodeURIComponent(parent)}`]:[]),
    ...(m.bounty?[`- Answers the Wanted request: ${m.bounty}`]:[]),
    `- Checks in my browser (${site()} Submit page): passed ${c.pass} of ${c.total}, ${c.fail} failed, ${c.warn} warning${c.warn===1?'':'s'}, ${c.skip} skipped${r.packageHash?`; package sha256 ${r.packageHash.slice(0,16)}…`:''}`,
    ...warns.map(k=>`  - Warning, ${k.title}${k.target&&k.target!=='any'?` (${k.target})`:''}: ${k.detail}`),
    sample===slug?`- Preview: ${here}?v=${encodeURIComponent(slug)}, the catalog piece this sample package is built from`
      :`- Preview: ${here}?v=${encodeURIComponent(slug)} once it is merged${sample?`; it is built from ${here}?v=${encodeURIComponent(sample)}`:''}`,
    '', 'The registry\'s check runs these checks again; two moderators review the mathematics.',
  ].join('\n')+'\n';
}
function githubHTML(r,pkg,meta){
  if(!r.ok) return `<section class="sub-gh" aria-labelledby="sub-gh-h"><h2 class="sub-h" id="sub-gh-h">Submit on GitHub</h2>
    <p class="fine">Submissions are pull requests to the registry on GitHub. Once nothing fails here, this section gives you the package laid out for the registry, the upload link and the pull request text.</p></section>`;
  const slug=prSlug(r,pkg), T=registryTarget(), files=slug?registryFiles(pkg,slug):[];
  if(!slug) return `<section class="sub-gh" aria-labelledby="sub-gh-h"><h2 class="sub-h" id="sub-gh-h">Submit on GitHub</h2><p class="fine">The manifest's id is not a registry name (lowercase letters, numbers and dashes, up to 48), so the folder cannot be named after it.</p></section>`;
  const up=T?`https://github.com/${T.repo}/upload/${encodeURIComponent(T.branch)}/entries/${slug}`:null;
  const tree=`<pre class="sub-tree" aria-label="The registry layout">${files.map(f=>esc(f.name)).join('\n')}</pre>`;
  const poster=r.posterBlob?`<figure class="sub-poster"><img id="sub-poster" alt="Poster frame of ${esc(r.manifest.title||'the piece')} at t = ${((Number.isFinite(r.manifest.t0)?r.manifest.t0:0)+6)} s"><figcaption class="fine">The poster the checks captured, at t = t0 + 6 at 700×300 on the night palette${r.posterTarget&&r.posterTarget!=='any'?`, from the ${esc(TARGET_NAME[r.posterTarget].toLowerCase())} target`:''}.</figcaption></figure>`:'';
  const btns=`<button class="btn${T?' ghost':''}" type="button" id="sub-zipdl">Download for the registry</button><button class="btn ghost" type="button" id="sub-prcopy">Copy pull request text</button>`;
  const text=`<details class="sub-prtext"><summary>Show the pull request text</summary><pre id="sub-prtext" tabindex="0">${esc(prText(r,pkg,meta,slug))}</pre></details>`;
  if(!T) return `<section class="sub-gh" aria-labelledby="sub-gh-h"><h2 class="sub-h" id="sub-gh-h">Submit on GitHub</h2>
    <p>The registry is not set up yet, so there is no repository to link to. Here is the layout to submit by hand: a pull request that adds this folder to the registry.</p>${tree}
    <div class="btnrow">${btns}</div>${text}
    <p class="fine">An admin sets the registry with REGISTRY_REPO on the demo server, or REGISTRY in config.js for the static site (demo/github/README.md).</p>${poster}</section>`;
  return `<section class="sub-gh" aria-labelledby="sub-gh-h"><h2 class="sub-h" id="sub-gh-h">Submit on GitHub</h2>
    <p>Submissions are pull requests to <a href="https://github.com/${esc(T.repo)}" target="_blank" rel="noopener">github.com/${esc(T.repo)}</a>. Its bot runs these checks again; two moderators review the mathematics, and when both approve it merges and goes live.</p>
    <ol class="sub-steps">
      <li><b>Download for the registry.</b> A zip of your package laid out as <code>entries/${esc(slug)}/</code>. Unzip it.<div class="btnrow"><button class="btn" type="button" id="sub-zipdl">Download for the registry</button></div></li>
      <li><b>Open the registry.</b> GitHub's upload page for <code>entries/${esc(slug)}</code> on ${esc(T.branch)}: drag in the ${files.length} files from inside the unzipped <code>entries/${esc(slug)}</code> folder, choose <b>Create a new branch</b> (GitHub makes a fork for you if you can't write to the registry) and press <b>Propose changes</b>.<div class="btnrow"><a class="btn" id="sub-upload" href="${esc(up)}" target="_blank" rel="noopener">Open the registry</a></div></li>
      <li><b>Paste the pull request text</b> into the description, then <b>Create pull request</b>. The bot comments within a few minutes.<div class="btnrow"><button class="btn ghost" type="button" id="sub-prcopy">Copy pull request text</button></div>${text}</li>
    </ol>${tree.replace('class="sub-tree"','class="sub-tree" hidden')}${poster}</section>`;
}
function wireGithub(el,r,pkg,meta,url){
  const slug=prSlug(r,pkg); if(!slug) return;
  const zipb=$('#sub-zipdl',el), cp=$('#sub-prcopy',el), img=$('#sub-poster',el);
  if(img && r.posterBlob) img.src=url(r.posterBlob);
  if(zipb) zipb.onclick=()=>{ download(LociGif.zip(registryFiles(pkg,slug)),`${slug}-registry.zip`); toast(`Saved ${slug}-registry.zip: entries/${slug}/ inside`); };
  if(cp) cp.onclick=()=>{ const pre=$('#sub-prtext',el); copyText(pre?pre.textContent:prText(r,pkg,meta,slug),'Pull request text copied'); if(pre){ pre.closest('details').open=true; } };
}
/* hand a checked remix to the Submit page: the same package (its own id, remixOf the parent) and report, with Submit on GitHub */
function preparePR(pkg,r,meta){
  if(checking) return announce('The checks are already running.');
  showView('submit');
  const ui=uiFor('sub'); ui.run.hidden=true;
  ui.line.textContent=`${pkg.name}: ${rxWhat(meta.remix)}, ${pkg.files.size} files (${[...pkg.files.keys()].map(p=>p.split('/').pop()).join(', ')}), checked in the remix editor.`;
  renderReport(r,ui,pkg,{remix:meta.remix});
}

/* ---------- views ---------- */
function showView(v){
  view=v;
  if(v!=='user' && v!=='wanted' && v!=='docs' && v!=='yours') $$('.tab').forEach(t=>{ const on=t.dataset.view===v; t.setAttribute('aria-selected',on); t.tabIndex=on?0:-1; }); // a profile or the Wanted page keeps the tab it was opened from
  $('#chips').hidden=v!=='feed'; $('#feednav').hidden=v!=='feed'; feed.classList.toggle('away',v!=='feed');
  $('#admin').hidden=v!=='admin'; $('#browse').hidden=v!=='browse'; $('#blog').hidden=v!=='blog'; $('#submit').hidden=v!=='submit'; $('#user').hidden=v!=='user'; $('#wanted').hidden=v!=='wanted'; $('#docs').hidden=v!=='docs'; $('#yours').hidden=v!=='yours';
  if(v!=='feed'){ closeDrawer(); exitFull(); if(engagedSl) release(engagedSl,true); if(lessonPlay) Lesson.exit(true); }
  if(v==='browse') renderBrowse();
  if(v==='blog') renderBlog();
  if(v==='submit') renderSubmit();
  if(v==='user') renderUser();
  if(v==='wanted') renderWanted();
  if(v==='docs') renderDocs();
  if(v==='yours') renderYours();
  if(v==='admin') renderAdmin();
  syncFocus(); // Focus is for the feed; the other views keep their bar
  paintAccents(); // only the feed follows the piece on screen
  syncPlay();
}
function jumpToViz(id){
  let i=feedList().findIndex(v=>v.id===id);
  if(i<0 && PLAYGROUND.some(v=>v.id===id)){ setFilter(makeFilter('playground')); i=PLAYGROUND.findIndex(v=>v.id===id); }
  else if(i<0){ setFilter({type:'all'}); i=VIZ.findIndex(v=>v.id===id); }
  showView('feed'); requestAnimationFrame(()=>{ slideEls[i].scrollIntoView({block:'start'}); feed.focus({preventScroll:true}); });
}

/* ---------- keyboard shortcuts dialog, signals, newsletter forms ---------- */
function openKeys(opener){ renderSignals(); $('#hd-keys').innerHTML=handleEditorHTML('hd-k'); showDialog('#keysmodal',null,opener); }
function renderSignals(){
  const w=Object.values(sig.watch).reduce((a,b)=>a+b,0), n=(x,one)=>`${x} ${one}${x===1?'':'s'}`;
  $('#sig-sum').textContent=`Stored only in this browser: ${n(sig.likes.length,'like')}, ${n(sig.saves.length,'saved piece')}, ${w<60?n(Math.round(w),'second'):n(Math.round(w/60),'minute')} watched.`;
}
/* likes, saves and watch time: from Reset my signals here and on Yours */
function resetSignals(){
  sig.likes=[]; sig.saves=[]; sig.watch={}; saveSignals();
  VIZ.forEach(v=>v.liked=false);
  slides.forEach(sl=>{ const b=$('[data-act="like"]',sl.el), lk=likeLabel(sl.v); b.classList.remove('on'); b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl;
    const sv=$('[data-act="save"]',sl.el); sv.classList.remove('on'); sv.setAttribute('aria-pressed','false'); });
  if(filter.type==='saved'||filter.type==='foryou') setFilter({type:'all'}); else renderChips();
  renderSignals();
}
$('#sig-reset').onclick=()=>{ resetSignals(); announce('Your likes, saved pieces and watch time were cleared'); toast('Signals reset'); };
/* Seconds watched per piece, for For you: counted while a slide is on screen and playing. */
let watchTicks=0;
setInterval(()=>{
  const sl=curSlide(); if(view!=='feed' || document.hidden || !sl || !sl.host || !sl.host.playing) return;
  sig.watch[sl.v.id]=(sig.watch[sl.v.id]||0)+1; if(++watchTicks%5===0) LociAPI.signals.set(sig.watch);
},1000);
addEventListener('pagehide',()=>LociAPI.signals.set(sig.watch));
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

/* ---------- the theme: tokens, live pieces and thumbnails, repainted when the page colors change ---------- */
function applyTheme(){
  document.documentElement.dataset.style=curStyle; // 'night', the one theme
  PageColors.paint(); // the moderators' page colors on the theme's tokens (pagecolors.js)
  paintAccents(); // the accents are clamped against the backgrounds
  relayout(); pushTheme();
  if(dTab==='customize') renderDrawer();
  if(view==='browse') renderCatGrid();
  if(view==='blog') paintThumbs($('#blog'));
  if(view==='user') paintThumbs($('#user'));
}
addEventListener('resize',()=>readPads());
document.addEventListener('visibilitychange',syncPlay);
document.addEventListener('fullscreenchange',()=>{
  const fs=document.fullscreenElement, i=fs?slideEls.indexOf(fs):-1;
  if(i>=0 && i!==activeIdx){ activeIdx=i; onActiveChange(true); }
  syncPlay(); // a full-screen slide plays although the feed no longer sees it
  if(!fs && slideEls[activeIdx]) requestAnimationFrame(()=>{ feed.scrollTop=slideEls[activeIdx].offsetTop; }); // back in the flow, on the slide that was full screen
  relayout();
});
new ResizeObserver(()=>{ document.documentElement.style.setProperty('--top-h',$('#topbar').offsetHeight+'px'); relayout(); }).observe($('#topbar'));
$$('[data-accent-toggle]').forEach(b=>b.setAttribute('aria-checked',String(accentFollow)));

/* the menu (menu button pattern): Focus, accent, New, shortcuts, Yours, Page colors. Its button is the demo's account
   pill: your handle's picture and name once you have one (the name hides on phones), else a menu icon. */
const MENU_ICO='<svg class="i" viewBox="0 0 24 24"><path d="M4.5 7h15M4.5 12h15M4.5 17h15"/></svg>';
function syncMeBtn(){
  const h=myHandle(), b=$('#style-btn');
  $('#me-pic').innerHTML=h?pfp(h,'sm'):MENU_ICO; $('#me-name').textContent=h||'Menu';
  b.classList.toggle('has-pfp',!!h); b.setAttribute('aria-label',h?`${h}: menu`:'Menu');
}
const styleBtn=$('#style-btn'), styleMenu=$('#style-menu'), menuItems=()=>$$('.mi',styleMenu).filter(i=>!i.hidden && getComputedStyle(i).display!=='none'); // Page colors is for moderators only
function openMenu(last){
  styleMenu.hidden=false; styleBtn.setAttribute('aria-expanded','true');
  const it=menuItems(); (last?it[it.length-1]:it[0]).focus();
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
  if(EMBED) return; // embed mode wires its own controls
  const t=e.target;
  if(!t.closest('.stylepick')) closeMenu(false);
  if(t.closest('[data-open-keys]')){ closeMenu(false); return openKeys(styleBtn); }
  if(t.closest('[data-page-colors]')){ closeMenu(false); return PageColors.open(styleBtn); }
  const nv=t.closest('[data-new-viz]'); if(nv){ closeMenu(false); return openNew(nv.classList.contains('mi')?styleBtn:nv); }
  if(t.closest('[data-focus-toggle]')){ closeMenu(true); return setFocus(!focusOn); }
  if(t.closest('[data-accent-toggle]')){ closeMenu(true); return setAccentFollow(!accentFollow); }
  if(t.closest('[data-focus-exit]')) return setFocus(false);
  if(t.closest('.skip')){ e.preventDefault(); if(view!=='feed') showView('feed'); return feed.focus({preventScroll:true}); }
  const cm=t.closest('[data-close-modal]'); if(cm) return hideDialog(cm.closest('.modal'));
  if(t.classList.contains('modal')) return hideDialog(t);
  // composedPath, not closest: a drawer button may have re-rendered (and detached) itself before the click reaches here
  const path=e.composedPath();
  if(dTab && !path.includes(drawer) && !t.closest('.modal') && !t.closest('#toast')) return closeDrawer();
  if(moreSl && !path.includes(more) && !t.closest('.modal') && !t.closest('#toast')) return closeMore();
  if(moreSl && t.closest('[data-preset],[data-tag],[data-user]')) closeMore(); // a pill or a tag in the sheet: the picture (or the filtered feed) shows
  const ub=t.closest('[data-user]'); if(ub) return openUser(ub.dataset.user,ub);
  if(t.closest('[data-user-back]')) return closeUser();
  const wb=t.closest('[data-wanted]'); if(wb) return openWanted(wb.dataset.wanted||null,wb);
  if(t.closest('[data-wanted-back]')) return closeWanted();
  const dc=t.closest('a[data-doc], a[href^="docs/"]'); if(dc && !dc.classList.contains('rawdoc') && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button===0){ const n=dc.dataset.doc||docName(dc.getAttribute('href')); if(n){ e.preventDefault(); return openDoc(n,dc); } }
  if(t.closest('[data-docs-back]')) return closeDocs();
  const wv=t.closest('[data-wvote]'); if(wv) return toggleWantVote(wv.dataset.wvote);
  const wm=t.closest('[data-wmake]'); if(wm) return makeThis(wm.dataset.wmake);
  const wd=t.closest('[data-wdel]'); if(wd) return removeProposal(wd.dataset.wdel);
  const vb=t.closest('[data-view]'); if(vb){ if(vb.dataset.view==='blog') blogPost=null; return showView(vb.dataset.view); }
  const pb=t.closest('[data-post]'); if(pb) return openPost(pb.dataset.post);
  if(t.closest('[data-blog-back]')) return openPost(null);
  const pl=t.closest('[data-playlist]'); if(pl){ const p=POSTS.find(x=>x.id===pl.dataset.playlist), c=Collection.parse({title:p.title, items:p.vizIds.map(v=>({v}))},`post ${p.id}`); if(c) Collection.play(c); showView('feed'); syncURL(); return feed.focus({preventScroll:true}); } // the address bar names the first piece at once, not after the first swipe
  const lv=t.closest('[data-live]'); if(lv && dViz){ e.preventDefault(); const L=liveLink(manOf(dViz),lv.dataset.live); if(L && !L.problem){ runLive(dViz,L,lv.textContent.trim()); if(L.kind!=='param') peekDrawer(lv); } return; }
  const wy=t.closest('[data-why]'); if(wy){ const a=wy.dataset.why; if(a==='done'){ whyExit(); return refocus('[data-why="start"]',$('#d-body')); } whyGo(a==='start'?0:why?why.i+(a==='next'?1:-1):0); if(a==='start') refocus('[data-why="next"]',$('#d-body')); return; }
  const pr=t.closest('[data-preset]'); if(pr){ const v=vizById(pr.dataset.pviz), inD=drawer.contains(pr), i=pr.dataset.preset; if(v) applyPreset(v,+i); if(v && inD) peekDrawer(pr.isConnected?pr:`[data-preset="${i}"]`); return; } // phones: a pill in the panel lowers it
  const fd=t.closest('[data-found]'); if(fd){ const v=vizById(fd.dataset.found); if(!v) return; jumpToViz(v.id); return requestAnimationFrame(()=>applyPreset(v,+fd.dataset.fj)); } // a "Found" row on a profile
  const jp=t.closest('[data-jump]'); if(jp){ closeDrawer(); return jumpToViz(jp.dataset.jump); } // a "Before this" / "Next" card in the Explanation tab
  const vz=t.closest('[data-viz]'); if(vz) return jumpToViz(vz.dataset.viz);
  const ch=t.closest('[data-chip]'); if(ch){ const c=ch.dataset.chip; return setFilter(c==='all'?{type:'all'}:c==='@saved'?makeFilter('saved'):c==='@foryou'?makeFilter('foryou'):c==='@new'?makeFilter('new'):c==='@playground'?makeFilter('playground'):{type:'tag',value:c}); }
  const ct=t.closest('[data-cattag]'); if(ct){ const g=ct.dataset.cattag; catTags.has(g)?catTags.delete(g):catTags.add(g); renderBrowse(); return refocus(`[data-cattag="${CSS.escape(g)}"]`); }
  const tg=t.closest('[data-tag]'); if(tg) return setFilter({type:'tag', value:tg.dataset.tag});
  if(t.closest('[data-go="top"]')) return goTo(0);
  const dt=t.closest('[data-dtab]'); if(dt){ dTab=dt.dataset.dtab; unpeek(true); return renderDrawer(); }
  const rw=t.closest('[data-raw]'); if(rw){ explainRaw=rw.dataset.raw==='1'; renderDrawer(); return refocus(`[data-raw="${rw.dataset.raw}"]`); }
  const act=t.closest('[data-act]'); if(act) return more.contains(act)?moreAct(act.dataset.act,act):handleAct(act.dataset.act, slides.find(s=>s.el.contains(act)), act);
});
$('#prev').onclick=()=>goTo(activeIdx-1);
$('#next').onclick=()=>goTo(activeIdx+1);
$('#d-close').onclick=closeDrawer;
document.addEventListener('keydown',e=>{
  if(embedSl) return embedSl.embedKey(e); // embed mode has its own few keys and no feed
  const top=modals[modals.length-1];
  if(present && !top && view==='feed' && presentKey(e)) return;
  if(e.key==='Escape' && $('#present-prompt')){ e.preventDefault(); return hidePresentPrompt(); }
  // an engaged piece gets the keys, except Esc (release), Tab and modifier shortcuts
  if(engagedSl && !top){
    const sl=engagedSl, p=ptrOf(sl);
    if(e.key==='Escape' && styleMenu.hidden){ e.preventDefault(); return release(sl); }
    if(p && p.keys && e.key!=='Tab' && e.key!=='Escape' && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target.closest&&e.target.closest('input,select,textarea,[role="menu"]'))){ e.preventDefault(); return sl.host.input(e); }
  }
  if(e.key==='Enter' && !top){ const sl=slides.find(x=>x.canvas===e.target); if(sl && ptrOf(sl) && !sl.engaged){ e.preventDefault(); return engage(sl); } }
  if(e.key==='Escape'){ if(!styleMenu.hidden) return closeMenu(true); if(top) return closeTopModal(); if(document.body.classList.contains('immersive')) return exitFull(); if(focusing()) return setFocus(false); if(view==='user') return closeUser(); if(view==='wanted') return closeWanted(); if(view==='yours') return closeYours();
    if(lessonPlay && view==='feed' && curSlide() && curSlide().v===lessonPlay.v) return Lesson.exit(); return; }
  if(e.key==='Tab' && top) return trapTab(e,top.el);
  if(top || (e.target.closest && e.target.closest('input,select,textarea,[role="menu"]')) || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.key==='?' || (e.code==='Slash' && e.shiftKey)){ e.preventDefault(); return openKeys(); }
  if(view!=='feed') return;
  const k=e.key.toLowerCase(), sl=curSlide();
  // Shift+letter is not the letter (Shift+P used to toggle pause): only Shift+F, Present, is bound
  if(e.shiftKey && /^[a-z]$/.test(k)){ if(k==='f' && sl){ e.preventDefault(); enterPresent(sl); } return; }
  if(k==='f' && sl && $('#present-prompt')){ e.preventDefault(); return enterPresent(sl); }
  if(k==='z'){ e.preventDefault(); return setFocus(!focusOn); }
  if(k==='arrowdown'||k==='j'||k==='pagedown'){ e.preventDefault(); goTo(activeIdx+1); }
  else if(k==='arrowup'||k==='k'||k==='pageup'){ e.preventDefault(); goTo(activeIdx-1); }
  else if(!sl) return;
  else if(lessonPlay && lessonPlay.v===sl.v && (k==='arrowleft'||k==='arrowright')){ e.preventDefault(); Lesson.step(k==='arrowright'?1:-1); } // an engaged piece got them first
  else if(k==='f'){ (document.fullscreenElement||document.body.classList.contains('immersive'))?exitFull():enterFull(sl); }
  else if(k==='e') openDrawer('explain',sl.v);
  else if(k==='c') openDrawer('customize',sl.v);
  else if(k==='s') openDrawer('source',sl.v);
  else if(k==='p') togglePause();
  else if(k==='x') toggleCompare(sl);
  else if(k==='l') like(sl);
  else if(k==='b') toggleSave(sl);
  else if(k===','||k==='.'){ e.preventDefault(); seekBy(sl,k===','?-0.1:0.1); }
  else if(k==='['||k===']'){ e.preventDefault(); seekBy(sl,k==='['?-1:1); }
  else if(k==='0'){ e.preventDefault(); seekBy(sl,0,true); }
});
let toastTimer;
/* a toast may carry one action button (Save's "Add this moment…"); it then stays up longer and while focused */
function toast(msg,action){
  const t=$('#toast'); t.textContent=msg; clearTimeout(toastTimer);
  if(action){ const b=document.createElement('button'); b.className='btn toast-act'; b.type='button'; b.textContent=action.label; b.onclick=()=>{ t.textContent=''; action.run(b); }; t.append(' ',b); }
  const clear=()=>{ if(t.contains(document.activeElement)) toastTimer=setTimeout(clear,1500); else t.textContent=''; };
  toastTimer=setTimeout(clear,action?6000:3200);
}

/* ---------- embed mode (?embed=1, docs/module-api.md section 5, "Embeds") ----------
   The page shows only the piece named by ?v= (with &p= state) and never builds the feed. The stage starts as a still,
   rendered once by one short-lived poster worker that is then disposed; the live worker starts only when the viewer
   clicks Play (or presses Enter or Space on the stage). A compact bar carries the title, author, Pause and "Open in
   Loci ↗" (the full share link at the current moment). Reduced-motion viewers get a paused frame after the click. The
   parent page hears {type:'loci:ready'} once the still (or the can't-run card) is up, and {type:'loci:size', height}
   with the height this width wants (a square stage plus the bar), so an LMS page can size the frame. */
const toParent=m=>{ if(window.parent!==window) try{ window.parent.postMessage(m,'*'); }catch(_){} };
function bootEmbed(link){
  document.documentElement.classList.add('embed');
  const app=$('#app'); app.hidden=true; app.inert=true; remixes.clear(); remixMan.clear(); // an embed shows the reviewed module, never this tab's remix
  const root=document.createElement('div'); root.id='embed'; root.className='embed'; document.body.prepend(root);
  const q=new URLSearchParams(location.search); q.delete('embed');
  const fullURL=()=>location.origin+location.pathname+(q.toString()?'?'+q:'')+location.hash; // the link without embed=1: lesson, collection, b and all
  if(!link){
    const coll=q.has('collection');
    root.innerHTML=`<div class="e-stage"><div class="e-card"><p>${coll?'A list of moments across pieces can\'t be embedded yet.':'This embed does not name a piece on '+esc(site())+'.'}</p><a class="e-open" href="${esc(coll?fullURL():location.origin+location.pathname)}" target="_blank" rel="noopener">${coll?'Open the list in '+esc(site()):'Open '+esc(site())} <span aria-hidden="true">↗</span></a></div></div>`;
    toParent({type:'loci:ready', v:null}); toParent({type:'loci:size', height:root.offsetHeight}); return;
  }
  const v=link.v, L=link.lesson; settings[v.id]=link.s; document.title=`${v.title} · ${site()}`;
  /* a lesson link: the still is stop &at= (1 by default), and the bar steps through the stops (‹ 1 of 3 ›) */
  let li=link.at||0; const stopAt=i=>L.stops[i];
  if(L){ const st=stopAt(li); settings[v.id].params=normalizeParams(v.manifest,st.p); link.t=st.t||0; link.view=normalizeView(st.view); }
  { const th=themeFor(v); for(const k of ['bg','fg','a1','a2']) root.style.setProperty('--e-'+k,th[k]); root.style.setProperty('--e-font',th.font); }
  root.innerHTML=`<div class="e-stage">
      <canvas class="viz" role="img" aria-label="${esc(v.title)}, animated visualization" aria-describedby="e-alt"></canvas><canvas class="labels" aria-hidden="true"></canvas>
      <img class="e-poster" alt="" hidden>
      <p class="sr" id="e-alt">${esc(v.alt||v.hook)}</p>
      <div class="e-card" role="status" hidden></div>
    </div>
    ${L?`<p class="e-note"></p>`:''}
    <div class="e-bar">
      <p class="e-who"><b class="e-title">${esc(L&&L.title||v.title)}</b> <span class="e-by">${esc(v.author)}</span></p>
      ${L?`<div class="e-steps" role="group" aria-label="Moments"><button class="e-btn e-ic" type="button" data-e-step="-1" aria-label="Previous moment">${ICON.left}</button><span class="e-k" aria-live="polite"></span><button class="e-btn e-ic" type="button" data-e-step="1" aria-label="Next moment">${ICON.right}</button></div>`:''}
      <button class="e-btn" type="button" id="e-pause" aria-describedby="e-alt"></button>
      <a class="e-open" id="e-open" href="#" target="_blank" rel="noopener">Open in ${esc(site())} <span aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>
    </div>`;
  const es=embedSl={v, el:root, stage:$('.e-stage',root), canvas:$('canvas.viz',root), overlay:$('canvas.labels',root), host:null, used:false, card:null,
    t:link.t??v.t0+6, view:link.view, w:0, h:0, visible:true, started:false, lastH:0};
  const poster=$('.e-poster',root), pz=$('#e-pause',root), open=$('#e-open',root), card=$('.e-card',root), bar=$('.e-bar',root);
  es.stage.classList.add('e-still'); // until it starts, the whole still is the Play target (the bar's Play is the one button)
  const s=getSettings(v);
  const measureE=()=>{ es.w=Math.max(1,es.canvas.clientWidth); es.h=Math.max(1,es.canvas.clientHeight); const g=Math.round(Math.min(es.w,es.h)*0.03)+4;
    es.B={x:g, y:g, w:Math.max(100,es.w-2*g), h:Math.max(100,es.h-2*g)}; };
  measureE();
  const ch=chooseTarget(v,es.B); es.tid=ch.id; es.treason=ch.reason;
  const wants=()=>!paused && es.visible && !document.hidden && !(reduceMotion && v.manifest.motion==='static');
  const syncBtn=()=>{ const on=es.started&&!paused, lbl=on?'Pause':'Play'; pz.innerHTML=`${on?ICON.pause:ICON.play}<span>${lbl}</span>`; pz.setAttribute('aria-label',`${lbl} ${v.title}`); };
  const sync=()=>{ if(es.host) wants()?es.host.play():es.host.pause(); syncBtn(); };
  /* Open in Loci: a lesson opens at this stop of the whole lesson; otherwise this moment, keeping a comparison's &b= */
  const syncOpen=()=>{
    if(L){ q.set('at',li+1); if(!li) q.delete('at'); open.href=fullURL(); return; }
    let u=shareURL(v); const b=q.get('b'); if(b && !/[?&]b=/.test(u)) u=u.replace(/(#.*)?$/,m=>`&b=${b}${m}`); open.href=u;
  };
  const note=$('.e-note',root);
  const syncStop=()=>{ if(!L) return; const n=L.stops.length, st=stopAt(li);
    $('.e-k',root).textContent=`${li+1} of ${n}`; $('[data-e-step="-1"]',root).disabled=li===0; $('[data-e-step="1"]',root).disabled=li===n-1;
    note.innerHTML=texText(st.note); note.title=st.note; note.hidden=!st.note; syncOpen();
    if(window.LociTeX && note.querySelector('.tex')) LociTeX.typeset(note).then(()=>size()); }; // TeX as in the feed's lesson card (KaTeX loads lazily)
  const size=()=>{ const h=Math.round(innerWidth)+bar.offsetHeight+(note&&!note.hidden?note.offsetHeight:0); if(h!==es.lastH){ es.lastH=h; toParent({type:'loci:size', height:h, v:v.id}); } };
  const say=(msg,btn)=>{ syncOpen(); card.innerHTML=`<p>${esc(msg)}</p><div class="e-row">${btn?`<button class="e-btn" type="button" data-e-restart>${esc(btn)}</button>`:''}<a class="e-open" href="${esc(open.href)}" target="_blank" rel="noopener">Open in ${esc(site())} <span aria-hidden="true">↗</span></a></div>`; card.hidden=false; es.card=card; es.stage.classList.remove('e-still'); };
  const ptr=()=>es.host&&es.host.pointer&&es.host.pointer.mode!=='none'?es.host.pointer:null;
  function mountE(){
    if(es.host) return; freshCanvas(es);
    es.host=LociHost.mount(es.canvas,originalSpec(v,ch.id),{theme:themeFor(v), params:s.params, box:es.B, dpr:dpr(), t:es.t, speed:s.speed, playing:wants(), overlay:es.overlay, target:ch.id, label:'embed',
      view:es.view, onView:vw=>{ es.view=vw; }, onError:(kind,msg)=>{ if(kind==='slow') return syncBtn();
        if(es.host){ es.t=es.host.getTime(); es.view=es.host.getView(); } es.host=null; poster.hidden=!poster.src; const [h,why]=CARD[kind]||CARD.error; say(`${h}. ${why||msg||''}`,kind==='blocked'?null:kind==='crashed'?'Try again':'Restart'); }});
    const p=ptr(); es.stage.classList.toggle('e-ptr',!!p);
    if(p){ es.canvas.tabIndex=0; es.canvas.setAttribute('aria-label',`${v.title}, interactive visualization: ${p.hint}`); es.host.input({type:'engage'}); }
    const h=es.host, reveal=()=>{ if(es.host!==h) return; if(h.state==='loading') return requestAnimationFrame(reveal); if(h.state==='running') poster.hidden=true; };
    requestAnimationFrame(reveal); // the still stays up until the live module is drawing
  }
  function unmountE(){ if(!es.host) return; es.t=es.host.getTime(); es.view=es.host.getView(); es.host.dispose(); es.host=null; poster.hidden=!poster.src; }
  function start(){
    if(es.card) return; const hadFocus=root.contains(document.activeElement);
    es.started=true; es.stage.classList.remove('e-still'); mountE(); syncBtn();
    if(hadFocus && ptr() && !bar.contains(document.activeElement)) es.canvas.focus({preventScroll:true}); // an interactive piece takes the keys
    announce(paused?`${v.title}, paused. Press Play to animate.`:`Playing ${v.title}`);
  }
  function toggle(){ if(!es.started) return start(); paused=!paused; sync(); announce(paused?'Animation paused':'Animation playing'); }
  pz.onclick=()=>{ const first=!es.started; toggle();
    if(first && L && document.activeElement===pz){ const nx=$('[data-e-step="1"]',root); (nx.disabled?$('[data-e-step="-1"]',root):nx).focus({preventScroll:true}); } }; // a lesson's first Play hands focus to the steps, so › and the arrows go on from there
  /* a stop: params, t and view; paused there, like the lesson card in the feed. Before Play the still is redrawn. */
  const still=()=>LociHost.poster(originalSpec(v,ch.id),{w:es.w, h:es.h, dpr:dpr(), box:es.B, theme:themeFor(v), params:s.params, t:es.t, view:es.view});
  let stillN=0;
  function goStop(i){
    if(!L) return; li=Math.max(0,Math.min(L.stops.length-1,i)); const st=stopAt(li);
    s.params=normalizeParams(v.manifest,st.p); es.t=st.t||0; es.view=normalizeView(st.view);
    if(es.host){ es.host.setParams(s.params); es.host.seek(es.t); es.host.setView(es.view); if(!paused){ paused=true; sync(); } }
    else { const n=++stillN; still().then(b=>{ if(n!==stillN || es.host) return; const old=poster.src; poster.src=URL.createObjectURL(b); poster.hidden=false; if(old.startsWith('blob:')) URL.revokeObjectURL(old); },e=>console.warn('loci: embed still failed for',v.id,e.message)); }
    syncStop(); announce(`Moment ${li+1} of ${L.stops.length}. ${stopAt(li).note}`);
  }
  if(L) $('.e-steps',root).addEventListener('click',e=>{ const b=e.target.closest('[data-e-step]'); if(b && !b.disabled) goStop(li+(+b.dataset.eStep)); });
  card.addEventListener('click',e=>{ if(!e.target.closest('[data-e-restart]')) return; LociHost.forgive(v.id); card.hidden=true; card.innerHTML=''; es.card=null; start(); });
  ['pointerenter','focus','mousedown','touchstart'].forEach(k=>open.addEventListener(k,syncOpen,{passive:true}));
  // an interactive piece gets the pointer and the wheel once it is live (the frame is the piece, so there is no engage step)
  const fwd=e=>{ const p=ptr(); if(!p || !(p.drag||p.click) || e.target.closest('.e-card')) return; es.host.input(e); if(e.type==='pointerdown') try{ es.stage.setPointerCapture(e.pointerId); }catch(_){} };
  ['pointerdown','pointermove','pointerup','pointercancel'].forEach(k=>es.stage.addEventListener(k,fwd));
  es.stage.addEventListener('wheel',e=>{ const p=ptr(); if(!p || !p.wheel) return; e.preventDefault(); es.host.input(e); },{passive:false});
  es.stage.addEventListener('click',e=>{ if(!es.started && !es.card && !e.target.closest('button,a')) start(); }); // the whole still is the Play target
  es.embedKey=e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const p=ptr();
    if(p && p.keys && e.target===es.canvas && e.key!=='Tab'){ e.preventDefault(); return es.host.input(e); }
    const k=e.key.toLowerCase(), arrow=k==='arrowleft'||k==='arrowright';
    if(e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return; // text fields keep every key
    if(e.target.closest && e.target.closest('button,a') && !(arrow && root.contains(e.target))) return; // they handle their own Enter and Space; arrows on the embed's own buttons still step
    if(k===' '||k==='k'||k==='p'||(k==='enter'&&!es.started)){ e.preventDefault(); toggle(); }
    else if(L && (k==='arrowleft'||k==='arrowright')){ e.preventDefault(); goStop(li+(k==='arrowright'?1:-1)); }
  };
  document.addEventListener('keyup',e=>{ const p=ptr(); if(p && p.keys && e.target===es.canvas && e.key!=='Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) es.host.input(e); });
  // off screen: pause, and after a while give the worker back; scrolling back resumes an embed that was started
  let offTimer=0;
  new IntersectionObserver(([e])=>{
    es.visible=e.isIntersecting; clearTimeout(offTimer);
    if(!es.visible && es.host) offTimer=setTimeout(unmountE,8000);
    if(es.visible && es.started && !es.host && !es.card) mountE();
    sync();
  }).observe(es.stage);
  document.addEventListener('visibilitychange',sync);
  let rq=0; addEventListener('resize',()=>{ cancelAnimationFrame(rq); rq=requestAnimationFrame(()=>{ measureE(); if(es.host) es.host.resize(es.B,dpr()); size(); }); });
  syncBtn(); syncOpen(); syncStop();
  const ready=()=>{ toParent({type:'loci:ready', v:v.id}); size(); };
  if(ch.fallback){ // e.g. a desktop-only WebGL2 piece in a browser without WebGL2: no worker at all
    if(v.poster){ poster.src=v.poster; poster.hidden=false; }
    say(ch.fallback.message); pz.disabled=true; return ready();
  }
  const n0=++stillN; still()
    .then(b=>{ if(n0!==stillN || (es.host && es.host.state==='running')) return; poster.src=URL.createObjectURL(b); poster.hidden=false; },
      e=>console.warn('loci: embed still failed for',v.id,e.message))
    .finally(ready);
}

/* ---------- boot ----------
   The feed waits for LociAPI.ready (api.js): the probe that says whether the page is served by the demo server, and
   if so what is yours there. Opened as static files it settles at once, with this browser's localStorage. */
applyTheme(); // a #night, #chalk ... hash from an old link is ignored
LociAPI.ready.then(()=>{ applySiteName(); PageColors.sync(); AdminPage.sync(); loadRegistry(); loadPlayground(); loadSignals(); loadCounts(); loadDrafts(); applyServerUsers(); syncMeBtn(); boot(); });
function boot(){
if(EMBED) bootEmbed(readLink());
else { // a share link (?v=&p=) wins over the filter remembered for this tab
  const link=readLink(), pref=store.get('loci:filter',null,true), cq=new URLSearchParams(location.search).get('collection');
  const coll=cq!=null && !link?Collection.decode(cq):null; // ?collection= plays its moments as a playlist, one slide per piece (section 5, "Moments")
  if(pref==='foryou' || (pref==='saved' && sig.saves.length)) filter=makeFilter(pref);
  if(coll) filter=Collection.filter(coll,true);
  else if(cq!=null) try{ history.replaceState(history.state,'',location.pathname+location.hash); }catch(_){} // a malformed link opens the ordinary feed
  if(link){ settings[link.v.id]=link.s; if(!feedList().includes(link.v)) filter={type:'all'}; }
  if(syncFocus()) focusHint();
  readPads(); renderChips(); buildFeed();
  if(link){
    const i=slides.findIndex(x=>x.v===link.v), sl=slides[i];
    if(link.t!=null) sl.t=link.t;
    if(link.view!=null) sl.view=link.view;
    if(link.cmp) cmpPending={v:link.v, params:link.cmp}; // opened by mountPolicy once the slide's A is mounted
    if(i>0){ feed.scrollTop=slideEls[i].offsetTop; activeIdx=i; onActiveChange(); }
    if(link.lesson) Lesson.play(link.v,link.lesson,link.at); // sets stop 1's (or &at='s) params, t and view before mountPolicy mounts the slide
  }
  if(coll){
    // &at=<1-based moment>: where a list link starts (Present's QR code); clamped, absent means moment 1
    const atq=parseInt(new URLSearchParams(location.search).get('at'),10), k=Number.isFinite(atq)?Math.max(0,Math.min(coll.items.length-1,atq-1)):0;
    const r=filter.runs.find(x=>k>=x.base && k<x.base+x.items.length), i=r?slides.findIndex(x=>x.v.id===r.v):-1;
    if(k>0 && i>=0){ Collection.pending={v:r.v, at:k-r.base}; if(i>0){ feed.scrollTop=slideEls[i].offsetTop; activeIdx=i; } else Lesson.exit(true); onActiveChange(); }
    syncURL(); announce(`Playing ${slides.length} visualizations from ${filter.name}.${collSay()}`); if(coll.gone) Collection.gone(coll.gone);
  }
  moLists(); // the first load moves "Your lesson" drafts and collections into one store of lists (Moments.migrate)
  if(new URLSearchParams(location.search).get('present')==='1') showPresentPrompt();
}
}
