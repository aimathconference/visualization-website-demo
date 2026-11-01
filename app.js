/* ---------- the theme ----------
   Two looks, dark (the demo's Night theme) and light (Solarized light): mode.js picks one, and styles.css holds their
   page colors. The feed offers no color or font choices: a piece draws in its own COLORS, which are final
   (docs/submission-spec-slop.md, section 2), and the page around it takes them while it is on screen. siteColors() is
   the site's own {bg, fg} in the current look, which the host uses where a piece's COLORS has no bg or fg (opts.site). */
const STYLE_PAL = {
  night:{bg:'#050508', fg:'#ecebf5'},
  light:{bg:'#fdf6e3', fg:'#073642'},
};
function siteColors(){ return {...STYLE_PAL[curStyle]}; }
const ICON = {
  trash:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg>',
  heart:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/></svg>',
  sigma:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 5h-11l6 7-6 7h11"/></svg>',
  sliders:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  board:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="12" rx="1.5"/><path d="M7 19.5h10M9 16.5l-1 3M15 16.5l1 3M7.5 12.5c1.5-3.5 3-3.5 4.5-1.5s3 1 4.5-2.5"/></svg>',
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
/* Text still to be written: shown on the page as a dashed box saying what goes there. Search for todo( and class="todo" to find them all. */
const todo=what=>`<span class="todo">To write: ${esc(what)}</span>`;
/* The site's name (config.js SITE_NAME, or the demo server's siteName once api/whoami has answered). "EigenReel" stays in identifiers only. */
const site=()=>EigenReelAPI.siteName();
function applySiteName(){
  const n=site(), b=$('.brand'), set=(sel,v)=>{ const m=document.querySelector(sel); if(m) m.setAttribute('content',v); };
  $('.brand-name').textContent=n; if(b) b.setAttribute('aria-label',`${n} home`);
  if(!EMBED) document.title=`${n} Math Feed`;
  set('meta[property="og:site_name"]',n); set('meta[property="og:title"]',n); set('meta[name="twitter:title"]',n);
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
   and come back as raw TeX in <code>; EigenReelTeX.typeset() then loads KaTeX on the page, only when there is math. */
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
  if(!window.EigenReelTeX) return DOMPurify.sanitize(marked.parse(s),MD_SAFE);
  const p=EigenReelTeX.protect(s); return DOMPurify.sanitize(p.html(marked.parse(p.src)),MD_SAFE);
};
const typeset=el=>{ if(window.EigenReelTeX && el) EigenReelTeX.typeset(el); };
/* A short plain-text note (preset, lesson stop, collection item, question) with $…$ math: escaped text, math lifted out as in md(),
   so typeset() can render it. Without tex.js it is the escaped text; offline, the raw TeX stays in <code>, as in explanations. */
const texText=s=>{ s=String(s==null?'':s); if(!window.EigenReelTeX) return esc(s); const p=EigenReelTeX.protect(s); return p.count?p.html(esc(p.src)):esc(s); };
/* set an element's note and typeset it; re-place the slide's overlays once KaTeX has changed its size */
const texInto=(el,s,sl)=>{ el.innerHTML=texText(s); if(window.EigenReelTeX && el.querySelector('.tex')) EigenReelTeX.typeset(el).then(()=>{ if(sl && el.isConnected) placeOverlays(sl); }); };

let curStyle=SiteMode.get()==='light'?'light':'night', view='feed', filter={type:'all'}, slides=[], slideEls=[], activeIdx=0, pads={t:0,r:0,b:0,l:0};
const EMBED=new URLSearchParams(location.search).get('embed')==='1'; let embedSl=null; // ?embed=1: one piece, minimal chrome (see "embed mode")
let paused=reduceMotion; // WCAG 2.2.2: motion can be paused; reduced-motion users start paused
let dTab=null, dViz=null, explainRaw=false, blogPost=null, catTags=new Set(), catQuery='';
/* A piece's state in the feed is {params, t} (docs/submission-spec-slop.md, section 4). params live here, per piece,
   always normalized against the piece's own metadata by EigenReelSpec.normalizeParams; t lives on the slide and its host. */
const settings={};
const specParams=(v,p)=>EigenReelSpec.normalizeParams(v.meta,p);
const specControls=v=>EigenReelSpec.paramControls(v.meta);
function getSettings(v){ return settings[v.id] || (settings[v.id]={params:specParams(v,{})}); }
const lengthOf=v=>v&&v.meta&&v.meta.time&&v.meta.time.length>0?+v.meta.time.length:60;

/* ---------- storage: every access may throw (private windows, blocked site data) ---------- */
const store={
  get(k,d,session){ try{ const x=(session?sessionStorage:localStorage).getItem(k); return x==null?d:JSON.parse(x); }catch(_){ return d; } },
  set(k,v,session){ try{ (session?sessionStorage:localStorage).setItem(k,JSON.stringify(v)); }catch(_){} },
  del(k,session){ try{ (session?sessionStorage:localStorage).removeItem(k); }catch(_){} },
};
/* Your Chalkboard (chalkboard.js): pieces of your own, never in the feed or the catalog. Empty as static files. */
const PLAYGROUND=[];
const STARTERS=[]; // pieces the Chalkboard opens that are not in the catalog (chalkboard.js)
const vizById=id=>VIZ.find(v=>v.id===id)||PLAYGROUND.find(v=>v.id===id)||STARTERS.find(v=>v.id===id);
const idList=x=>Array.isArray(x)?[...new Set(x.filter(id=>typeof id==='string' && vizById(id)))]:[];
/* Personal signals: likes, saved pieces (in save order) and seconds watched per piece. Kept in this browser, or on the
   demo server when the page is served by it (api.js); loadSignals runs once EigenReelAPI.ready has settled. */
const sig={likes:[], saves:[], watch:{}};
function loadSignals(){
  sig.likes=idList(EigenReelAPI.likes.get()); sig.saves=idList(EigenReelAPI.saves.get()); sig.watch={};
  const w=EigenReelAPI.signals.get(); if(w && typeof w==='object') for(const id in w) if(vizById(id) && Number.isFinite(w[id]) && w[id]>0) sig.watch[id]=w[id];
  VIZ.forEach(v=>v.liked=sig.likes.includes(v.id)); PLAYGROUND.forEach(v=>v.liked=sig.likes.includes(v.id));
}
const saveSignals=()=>{ EigenReelAPI.likes.set(sig.likes); EigenReelAPI.saves.set(sig.saves); EigenReelAPI.signals.set(sig.watch); };
/* ---------- the device (spec, sections 1 and 6): 'phone' on a coarse pointer and a narrow screen, else 'desktop' ----------
   A piece without meta.modes[device] is left out of the feed here; its share link opens as a card instead. */
const coarse=()=>matchMedia('(pointer:coarse)').matches;
const PHONE_Q='(max-width:699px), (orientation:landscape) and (max-height:500px)';
const phoneUI=()=>matchMedia(PHONE_Q).matches;
const DEVICE=coarse()&&phoneUI()?'phone':'desktop';
const runsHere=v=>!!(v.meta&&v.meta.modes&&v.meta.modes[DEVICE]);
/* a browser that cannot run the sandbox gets a card and a still, never the piece on the page */
function cannotRun(v){
  if(!runsHere(v)) return DEVICE==='phone'?{reason:'device', message:'Open this on a computer', why:'This piece is made for a larger screen. The share link opens it there, at the same moment.'}
    :{reason:'device', message:'Open this on a phone', why:'This piece is made for phones. The share link opens it there, at the same moment.'};
  if(!EigenReelHost.supported) return {reason:'browser', message:'This browser can’t run visualizations safely', why:'Update this browser, or open the share link in a current one.'};
  if(v.meta.context==='webgl2' && !EigenReelHost.hasWebGL2()) return {reason:'webgl2', message:'This piece needs WebGL2', why:'Open it in a browser with WebGL2: the share link opens this exact piece there.'};
  return null;
}
/* the slide showing a piece: a feed slide, or the one stage of embed mode (embedSl) */
const slOf=v=>slides.find(x=>x.v===v)||(embedSl&&embedSl.v===v?embedSl:null);
const presetsOf=v=>Array.isArray(v.meta.presets)?v.meta.presets:[];
/* what the host mounts: the piece as data (runtime.js) */
const HEX6=/^#[0-9a-fA-F]{6}$/;
function pieceColors(v){ const c=v&&v.colors&&typeof v.colors==='object'?v.colors:{}, o={}; for(const k in c) if(typeof c[k]==='string' && HEX6.test(c[k])) o[k]=c[k]; return o; }
const pieceOf=v=>({slug:v.id, source:v.source, meta:v.meta, colors:pieceColors(v), ...(v.wasm?{wasm:v.wasm}:{})});

/* ---------- serialized state: {v, p, t}, non-default params only (spec, section 4) ---------- */
const b64u={
  enc:s=>{ let b=''; for(const c of new TextEncoder().encode(s)) b+=String.fromCharCode(c); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  dec:s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))),
};
function timeOf(v){ const sl=slOf(v); return sl?(sl.host?sl.host.getTime():sl.t):0; }
function stateOf(v,at){
  const o={v:v.id}, p=EigenReelSpec.nonDefault(v.meta,getSettings(v).params);
  if(Object.keys(p).length) o.p=p;
  const t=at??timeOf(v); if(t>=0.005) o.t=+t.toFixed(2); // at: another moment, e.g. a recorded clip's in point
  return o;
}
/* The share link: EigenReelSpec.encodeShare in the hash (#v=<slug>&p=<non-default params>&t=<s>), at most 2 KB. */
const shareHash=(v,at)=>EigenReelSpec.encodeShare({slug:v.id, params:getSettings(v).params, t:at??timeOf(v)},v.meta);
function shareURL(v,at){ return location.origin+location.pathname+shareHash(v,at); }
const metaOf=id=>{ const v=vizById(id); return v?v.meta:null; };
/* What the address says to open: a share link in the hash (decodeShare: params validated against the current metadata,
   t clamped), or the legacy ?v=<id> (the v/<id>.html stubs redirect to ../?v=<id>), with an old &p= state and a
   ?lesson= of moments. Returns {v, params, t, lesson, at}, or null. t is null when the link names none. */
function readLink(){
  const q=new URLSearchParams(location.search);
  const d=/(^#|&)v=/.test(location.hash)?EigenReelSpec.decodeShare(location.hash,metaOf):null;
  let v=null, params=null, t=null;
  if(d){ v=vizById(d.slug); params=d.params; t=d.t==null?null:d.t; }
  else if(/(^#|&)v=/.test(location.hash)) console.warn('eigenreel: the share link names no piece in this catalog');
  if(!v && q.get('v')){
    v=vizById(q.get('v')||''); if(!v) return null;
    let o={}; if(q.get('p')) try{ o=JSON.parse(b64u.dec(q.get('p'))); if(!o || typeof o!=='object' || Array.isArray(o)) o={}; }catch(_){ console.warn('eigenreel: ignoring a malformed share link'); o={}; }
    params=specParams(v,o.p); t=Number.isFinite(o.t)&&o.t>=0?Math.min(o.t,lengthOf(v)):null;
  }
  if(!v) return null;
  const lesson=q.get('v')===v.id&&q.get('lesson')?Lesson.decode(q.get('lesson'),v):null; // ?lesson= plays its moments (section 5, "Moments")
  // &at=<1-based stop>: where a lesson link starts (Present's QR code, an embed's Open in EigenReel); clamped, absent means stop 1
  const atq=lesson?parseInt(q.get('at'),10):NaN, at=Number.isFinite(atq)?Math.max(0,Math.min(lesson.stops.length-1,atq-1)):0;
  return {v, params, t, lesson, at};
}
/* ---------- the page takes the piece's colors (spec, section 2) ----------
   While a piece is on screen its COLORS recolor the page around it: main and secondary become the accents, and bg and
   fg (where the piece sets them) the page's own background and text, with the panel, muted, line and scrim tokens
   derived from them. Only #rrggbb values are applied. Each slide keeps its own piece's tokens as it scrolls; the top bar,
   panels and dialogs take the active slide's (set on <body>). Accents move toward white or black until they read at 4.5:1
   on the background and panels; the canvas still draws the exact colors. The accents fade in styles.css, except under
   reduced motion. */
const PAGE_VARS=['--accent','--accent2','--accent-fill','--on-accent','--bg','--fg','--panel','--muted','--line','--chip','--chip-on','--chip-on-fg','--field-line','--focus-halo','--shadow','--scrim','--topbar-bg'];
/* the backgrounds accent text sits on: each look's --bg and --panel (styles.css) */
const STYLE_GROUND={night:['#050508','#101018'], light:['#fdf6e3','#f3eedd']};
const rgbOf=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mixHex=(a,b,k)=>'#'+rgbOf(a).map((x,i)=>Math.round(x+(rgbOf(b)[i]-x)*k).toString(16).padStart(2,'0')).join('');
const rgbaOf=(h,a)=>`rgba(${rgbOf(h).join(',')},${a})`;
function pieceTokens(v){
  const c=pieceColors(v); if(!c.main && !c.secondary && !c.bg && !c.fg) return null;
  const o={}, site=siteColors();
  let grounds=STYLE_GROUND[curStyle];
  if(c.bg || c.fg){
    const B=c.bg||site.bg, F=c.fg||site.fg, panel=mixHex(B,F,0.06);
    grounds=[B,panel];
    Object.assign(o,{'--bg':B, '--fg':F, '--panel':panel, '--muted':SiteMode.legible(mixHex(F,B,0.32),grounds), '--line':rgbaOf(F,0.14), '--chip':rgbaOf(F,0.12),
      '--chip-on':F, '--chip-on-fg':B, '--field-line':rgbaOf(F,0.45), '--focus-halo':B, '--shadow':`0 1px 3px ${rgbaOf(B,0.75)}`,
      '--scrim':`linear-gradient(to top, ${rgbaOf(B,0.92)}, ${rgbaOf(B,0.55)} 45%, ${rgbaOf(B,0)})`, '--topbar-bg':`linear-gradient(to bottom, ${rgbaOf(B,0.92)} 35%, ${rgbaOf(B,0)})`});
    o.scheme=SiteMode.contrast(B,'#000000')<SiteMode.contrast(B,'#ffffff')?'dark':'light';
  }
  if(c.main){ const a=SiteMode.legible(c.main,grounds); Object.assign(o,{'--accent':a, '--accent-fill':a, '--on-accent':SiteMode.onColor(a)}); }
  if(c.secondary) o['--accent2']=SiteMode.legible(c.secondary,grounds);
  return o;
}
function setTokens(el,tok){ PAGE_VARS.forEach(k=>tok&&tok[k]?el.style.setProperty(k,tok[k]):el.style.removeProperty(k)); el.style.colorScheme=tok&&tok.scheme||''; }
function paintAccents(){
  slides.forEach(sl=>setTokens(sl.el,pieceTokens(sl.v)));
  const sl=view==='feed'?curSlide():null; setTokens(document.body,sl?pieceTokens(sl.v):null);
}
function readPads(){ const cs=getComputedStyle(document.documentElement), g=k=>parseFloat(cs.getPropertyValue(k))||0; pads={t:g('--pad-t'),r:g('--pad-r'),b:g('--pad-b'),l:g('--pad-l')}; }
/* full screen: a 28 px margin, and room under the box for the interact bar (hint and Done) when the piece has one */
function boxFor(w,h,full,inter){ const p=full?{t:28,r:28,b:inter?76:28,l:28}:pads; return {x:p.l, y:p.t, w:Math.max(100,w-p.l-p.r), h:Math.max(100,h-p.t-p.b)}; }
/* The drawing box avoids the top bar, caption, rail and desktop nav that float over the canvas.
   The caption can be cleared from below or beside it, the rail from below or beside it; pick the layout with the largest square. */
function layoutBox(sl){
  const W=sl.w, H=sl.h, cr=sl.canvas.getBoundingClientRect(), sr=sl.el.getBoundingClientRect(), scr=$('#screen').getBoundingClientRect();
  const ox=cr.left-sr.left, oy=cr.top-sr.top, g=10; sl.corner=null;
  /* Focus: nothing floats over the picture. A strip along the bottom (along the left on a wide canvas) holds the 32 px
     "Click to interact" target in its bottom-left corner, outside the box, so it never covers the piece or its labels. */
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
/* the feed for this device: a piece without meta.modes[DEVICE] is left out (spec, section 1). A share link to such a
   piece (linked) is shown first, as a card with its title, hook and alt and a note to open it elsewhere. */
let linked=null;
function feedList(){
  let l=filter.type==='tag'?VIZ.filter(v=>v.tags.includes(filter.value))
    :filter.type==='new'?VIZ.filter(v=>v.lane==='new') // docs/review-pipeline.md section 3: passed the gate, review pending
    :filter.ids?filter.ids.map(vizById).filter(Boolean) // playlist, saved, for you: a snapshot taken when the filter was picked
    :VIZ;
  l=l.filter(runsHere);
  return linked && !l.includes(linked)?[linked,...l]:l;
}
/* For you: score = 2·(likes on the same tags) + 1·(saves on the same tags) + 0.5·(seconds watched on the same tags); ties keep catalog order. */
function affinity(){
  const tag=new Map(), add=(id,w)=>{ const v=vizById(id); if(v) v.tags.forEach(g=>tag.set(g,(tag.get(g)||0)+w)); };
  sig.likes.forEach(id=>add(id,2)); sig.saves.forEach(id=>add(id,1)); for(const id in sig.watch) add(id,0.5*sig.watch[id]);
  return VIZ.map((v,i)=>({id:v.id, i, s:v.tags.reduce((a,g)=>a+(tag.get(g)||0),0)})).sort((a,b)=>b.s-a.s||a.i-b.i).map(x=>x.id);
}
function makeFilter(kind){ return kind==='new'?{type:'new'} : kind==='saved'?{type:'saved', ids:[...sig.saves]} : kind==='foryou'?{type:'foryou', ids:affinity()} : {type:'all'}; }
const rbtn=(act,icon,lbl,o={})=>`<button class="rbtn${o.on?' on':''}${o.cls?' '+o.cls:''}" type="button" data-act="${act}" aria-label="${esc(o.aria||lbl)}"${o.title?` title="${esc(o.title)}" aria-description="${esc(o.title)}"`:''}${o.pressed!=null?` aria-pressed="${o.pressed}"`:''}${o.attrs||''}><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;
/* The seeded like totals in catalog.js are invented sample numbers; one note says so (the like button's title, the Browse card, the end card). */
let LIKES_NOTE='Like counts are sample numbers written for this prototype; only your own like is real, and it stays in this browser.';
/* On the demo server (api.js) the counts are everyone's likes there: v.likes becomes the others' total, so that
   likeLabel's v.likes + your own like is the server's count. */
function loadCounts(){
  if(!EigenReelAPI.server) return;
  LIKES_NOTE='Like counts are the likes of everyone on this demo server, yours included.';
  [...VIZ,...PLAYGROUND].forEach(v=>{ const n=EigenReelAPI.likes.count(v.id); v.likes=n==null?0:Math.max(0,n-(v.liked?1:0)); });
}
/* every slide of a piece shows its like state and count */
function paintLike(v){
  slides.forEach(sl=>{ if(sl.v!==v) return; const b=$('[data-act="like"]',sl.el), lk=likeLabel(v); if(!b) return; b.classList.toggle('on',!!v.liked); b.setAttribute('aria-pressed',!!v.liked); b.setAttribute('aria-label',lk.aria); $('.lbl',b).textContent=lk.lbl; });
}
/* the server's answer to a like: its count, or (count null) a refusal that puts the like back as it was */
EigenReelAPI.on('likes',(id,count,liked)=>{
  const v=vizById(id); if(!v) return;
  if(v.liked!==liked){ v.liked=liked; sig.likes=liked?[...new Set([...sig.likes,id])]:sig.likes.filter(x=>x!==id); }
  if(count!=null) v.likes=Math.max(0,count-(liked?1:0));
  paintLike(v); if(count==null) toast(`Could not ${liked?'unlike':'like'} ${v.title} on the server`);
});
const likeLabel=v=>{ const n=fmtK(v.likes+(v.liked?1:0)); return {lbl:n, aria:`Like, ${n} likes`}; };
const pauseLabel=()=>paused?{icon:ICON.play, lbl:'Play', aria:'Play animation'}:{icon:ICON.pause, lbl:'Pause', aria:'Pause animation'};
/* Lanes (docs/review-pipeline.md section 3): New = passed the automated gate; Feed = two community approvals of the mathematics. */
const laneBadge=v=>v.starter||v.demo||v.pg?`<span class="lane new">Chalkboard · not reviewed</span>`:v.lane==='new'?`<span class="lane new">Checked by machine</span>`:`<span class="lane">Community reviewed · ${esc(v.reviewed)}</span>`;
/* Distinctions (distinctions.js, docs/distinctions.md): a text mark after the lane that opens the citation in the Explanation tab. */
const distBadge=v=>distinctionsFor(v.id).map(d=>`<button class="lane dist" type="button" data-act="distinction" aria-label="Distinction: ${esc(DIST_CATS[d.cat].name)}, ${esc(distMonth(d.month))}"><span aria-hidden="true">◆ ${esc(DIST_CATS[d.cat].short)}<span class="dm"> · ${esc(distMonth(d.month,true))}</span></span></button>`).join('');
const distBlock=v=>distinctionsFor(v.id).map(d=>`<section class="distcite" aria-labelledby="dc-${esc(d.cat)}-${esc(d.month)}">
      <div class="kicker" id="dc-${esc(d.cat)}-${esc(d.month)}">◆ Distinction · ${esc(DIST_CATS[d.cat].name)} · ${esc(distMonth(d.month))}${d.sample?' <span class="samp">sample</span>':''}</div>
      <blockquote>${esc(d.citation)}</blockquote>
      <p class="fine">Cited by ${d.jury.map(h=>userLink(h)).join(', ')}, the ${esc(distMonth(d.month))} jury.</p></section>`).join('');
/* The feed slide (spec, section 8): the piece, its title and hook, and a rail with Like, Share, Explanation and Full
   screen. More (⋯) holds the rest of what used to be on the rail (Save, Pause, Copy to Chalkboard, Present, Focus) and,
   on phones, the piece's details. "Click to interact" is drawn over the stage only for a piece that declares interact. */
function slideHTML(v,i){
  const lk=likeLabel(v);
  return `<div class="stage"><canvas class="viz" role="img" aria-label="${esc(v.title)}, animated visualization" aria-describedby="alt-${i}"></canvas><p class="sr" id="alt-${i}">${esc(v.alt||v.hook)}</p></div>
  <div class="caption">
    ${qwCard(v)}
    <div class="who"><button class="who-link" type="button" data-user="${esc(v.by)}" aria-label="${esc(v.by)}, profile">${pfp(v.by)}<span>${esc(v.by)}</span></button>${laneBadge(v)}${distBadge(v)}
      </div>
    <h2 class="vtitle" data-fig="${i+1}">${esc(v.title)}</h2>
    <p class="hook">${esc(v.hook)}</p>
    <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
    <div class="meta"><span class="oss">open source · ${esc(v.license)}</span><span>${esc(v.repo)}</span></div>
  </div>
  <div class="rail">
    ${rbtn('like',ICON.heart,lk.lbl,{aria:lk.aria, title:LIKES_NOTE, on:v.liked, pressed:!!v.liked})}
    ${rbtn('share',ICON.share,'Share',{aria:'Share: link and export'})}
    ${rbtn('explain',ICON.sigma,'Explain',{aria:'Explanation'})}
    ${rbtn('full',ICON.full,'Full screen')}
    ${rbtn('more',ICON.more,'More',{aria:`More: actions and details of ${v.title}`, cls:'rb-more', attrs:' aria-haspopup="dialog" aria-expanded="false" aria-controls="more"'})}
  </div>
  <button class="btn ghost exit-fs" type="button" data-act="exitfull">Exit full screen</button>`;
}
function endHTML(n){
  const what = filter.type==='new' ? ' in the New lane' : filter.type==='tag' ? ` tagged #${esc(filter.value.toLowerCase())}` : filter.type==='playlist' ? ` from “${esc(filter.name)}”` : filter.type==='saved' ? ` you saved` : '';
  return `<div class="end"><div class="end-card">
    <div class="kicker">End of the feed${filter.type==='foryou'?' · For you':''}</div>
    <h2>You've seen all ${n} visualization${n===1?'':'s'}${what}</h2>
    ${filter.type==='foryou'?`<p>Ordered by the topics you've liked, saved and watched. Your signals stay in this browser; reset them from the keyboard shortcuts dialog (press ?).</p>`:''}
    <p>${todo('end of the feed: a line inviting people to subscribe')}</p>
    ${nlForm('end')}
    <p class="fine">${LIKES_NOTE.replace('Like counts','The like counts on the slides')}</p>
    <div class="btnrow"><button class="btn ghost" type="button" data-go="top">Back to the first</button><button class="btn ghost" type="button" data-view="browse">Browse the catalog</button><button class="btn ghost" type="button" data-view="blog">Read the blog</button>${filter.type==='saved'?'<button class="btn ghost" type="button" data-open-yours>Everything yours</button>':''}</div>
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
    <p class="fine">${todo('newsletter: how often it is sent, how to unsubscribe')}</p>
  </form>`;
}

let io, ro;
function buildFeed(){
  if(present) exitPresent(); // the slides (and the Present overlay) are about to be replaced
  closeMore();
  if(lessonPlay) Lesson.exit(true); // the slides (and the lesson card) are about to be replaced
  leaveInteract(null,true);
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
    const stage=$('.stage',el), sl={v,el,stage,canvas:$('canvas.viz',el),host:null,used:false,card:null,mode:'feed',t:paused?Math.min(6,lengthOf(v)):0,w:0,h:0,visible:false};
    slides.push(sl); ro.observe(stage); ro.observe($('.caption',el)); ro.observe($('.rail',el)); io.observe(el);
    stage.addEventListener('dblclick',e=>{ if(e.target.closest('.stall,.callout,.ihint,.ibar') || sl.mode==='interact') return; like(sl,true); burst(el,e); });
    gestures(sl);
  });
  const end=document.createElement('section'); end.className='slide'; end.setAttribute('aria-label','End of the feed'); end.innerHTML=endHTML(list.length);
  feed.appendChild(end); io.observe(end);
  Collection.applyAll(); // a list's first moment per piece (params and t), before mountPolicy mounts anything
  slideEls=[...feed.children]; feed.scrollTop=0; activeIdx=0; onActiveChange();
}
// layout size, not getBoundingClientRect
function measure(sl){ const w=sl.canvas.clientWidth, h=sl.canvas.clientHeight; if(!w) return false; sl.w=w; sl.h=h; sl.B=layoutBox(sl); return true; }
/* full screen: the slide itself (the page's container for it), or the immersive fallback where the API is refused */
const isFull=sl=>!!sl && (document.fullscreenElement===sl.el || (document.body.classList.contains('immersive') && sl===curSlide()));
function boxOf(sl){ const full=isFull(sl); return full||!sl.B?boxFor(sl.w,sl.h,full,!!sl.v.meta.interact):sl.B; }
function sizeCanvas(sl){ if(!measure(sl)) return; if(sl.host) sl.host.resize(boxOf(sl),dpr()); placeOverlays(sl); }
function relayout(){ requestAnimationFrame(()=>{ readPads(); if(peeked()){ if(isSheet()) drawer.style.transform=`translateY(${peekOffset()}px)`; else unpeek(true); } slides.forEach(sizeCanvas); }); }

/* ---------- runtime: each slide near the viewport runs its piece in a sandboxed frame (runtime.js) ---------- */
const wantsPlay=sl=>!paused && view==='feed' && (sl.visible || document.fullscreenElement===sl.el) && !sl.hold && !sl.card && !sl.scrubbing && !sl.ended && !document.hidden;
function syncPlay(){ for(const sl of slides) if(sl.host){ wantsPlay(sl)?sl.host.play():sl.host.pause(); } }
function freshCanvas(sl){ if(sl.used){ const c=sl.canvas.cloneNode(false); c.style.pointerEvents=''; sl.canvas.replaceWith(c); sl.canvas=c; } sl.used=true; } // one canvas per mount; replacing it also takes away a stopped piece's frame
function mountSlide(sl){
  if(sl.host || sl.card || !measure(sl)) return;
  const v=sl.v, why=cannotRun(v);
  if(why){ sl.fallback=why; return showFallback(sl); }
  freshCanvas(sl); sl.mode='feed'; sl.ended=false;
  sl.host=EigenReelHost.mount(sl.canvas,pieceOf(v),{params:getSettings(v).params, t:sl.t, playing:wantsPlay(sl), device:DEVICE, mode:'feed', fullscreen:isFull(sl),
    box:boxOf(sl), dpr:dpr(), site:siteColors(),
    onError:(kind,msg)=>pieceFailed(sl,kind,msg), onParam:(k,val,params)=>pieceParam(sl,params), onLeave:()=>leaveInteract(sl), onEnded:()=>{ sl.ended=true; }});
  syncInteractUI(sl);
}
/* The piece called env.setParam (interact mode): its params are the slide's from now on, and Share carries them. */
function pieceParam(sl,params){
  const v=sl.v; getSettings(v).params=specParams(v,params);
  if(shareSl && shareSl.v===v && !$('#sharemodal').hidden) shareSync();
}
/* The piece cannot run here: made for the other device (a share link to it), a browser without the sandbox, or a WebGL2
   piece without WebGL2. The stage shows a still in its colors and a card with the title, hook and alt, the note, and
   the link, so it can be opened where it runs. The slide stays in the feed, the counter and the announcements. */
function showFallback(sl){
  const v=sl.v, f=sl.fallback, i=slides.indexOf(sl);
  freshCanvas(sl); paintPoster(sl);
  const c=document.createElement('div'); c.className='stall fallback'; c.setAttribute('role','group'); c.setAttribute('aria-labelledby',`stall-${i}`);
  c.innerHTML=`<p class="stall-h" id="stall-${i}">${esc(v.title)}</p><p class="hook">${esc(v.hook)}</p><p class="fine">${esc(v.alt)}</p>
    <p class="stall-note"><b>${esc(f.message)}.</b> ${esc(f.why||'')}</p>
    <div class="btnrow"><button class="btn" type="button" data-act="copylink">Copy link</button></div>`;
  sl.stage.appendChild(c); sl.card=c; placeOverlays(sl);
}
/* A still for the card: the piece's own colors on its background. */
function paintPoster(sl){
  const cv=sl.canvas, r=cv.getBoundingClientRect(), d=dpr(); if(!r.width) return;
  cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  const c=cv.getContext('2d'), col={...siteColors(), ...pieceColors(sl.v)}, B=boxOf(sl); c.setTransform(d,0,0,d,0,0);
  c.fillStyle=col.bg; c.fillRect(0,0,r.width,r.height);
  const g=(x,y,h)=>{ if(!h) return; const rg=c.createRadialGradient(x,y,0,x,y,Math.max(B.w,B.h)*0.6); rg.addColorStop(0,rgbaOf(h,0.28)); rg.addColorStop(1,rgbaOf(h,0)); c.fillStyle=rg; c.fillRect(B.x,B.y,B.w,B.h); };
  g(B.x+B.w*0.3,B.y+B.h*0.35,col.main); g(B.x+B.w*0.7,B.y+B.h*0.65,col.secondary);
}
function unmount(sl){ if(!sl.host) return; leaveInteract(sl,true); sl.t=sl.host.getTime(); sl.host.dispose(); sl.host=null; syncInteractUI(sl); }
/* at most three live pieces: the active slide and its neighbours */
let mountTimer=0; // settle first: a fast scroll should not start and stop a frame for every slide it passes
function mountPolicy(){ clearTimeout(mountTimer); mountTimer=setTimeout(()=>{
  slides.forEach((sl,i)=>Math.abs(i-activeIdx)<=1?mountSlide(sl):unmount(sl));
},60); }
function pushParams(v){ const p=getSettings(v).params; for(const sl of [...slides,embedSl]) if(sl && sl.host && sl.v===v) sl.host.setParams(p); }
function seekSl(sl,t){ sl.t=t; sl.ended=false; if(sl.host) sl.host.seek(t); }
function seekViz(v,t){ for(const sl of slides) if(sl.v===v) seekSl(sl,t); if(embedSl && embedSl.v===v) seekSl(embedSl,t); }

/* the kill switch's list changed (api.js): a piece an admin restarted comes back, and an open explanation follows */
EigenReelAPI.on('blocked',()=>{
  for(const sl of slides) if(sl.stopped && !EigenReelHost.isBlocked(sl.v.id)){ sl.stopped=false; restart(sl); }
  if(dTab==='explain' && dViz && drawer.classList.contains('open')) renderDrawer();
});
const CARD={
  stalled:['This piece stalled','It stopped answering for more than a quarter of a second, so the site stopped it.'],
  error:['This piece hit an error',''],
  memory:['This piece ran out of memory','It used more than 64 MiB, so the site stopped it.'],
  unsupported:['This piece can’t run here',''],
  navigated:['This piece was stopped','Its frame tried to load a page, which pieces may not do.'],
  blocked:['This piece was stopped','The site’s admins have stopped it from running.'],
  crashed:['This piece was skipped','The browser tab crashed while it was running, so it did not start again.'],
};
function pieceFailed(sl,kind,msg){
  if(!slides.includes(sl)) return;
  leaveInteract(sl,true);
  if(sl.host){ sl.t=sl.host.getTime(); sl.host=null; } // the frame is stopped; its last picture stays under the card
  sl.stopped=kind==='blocked';
  const [title,why]=CARD[kind]||CARD.error, detail=why||msg||'';
  if(sl.card) sl.card.remove();
  const c=document.createElement('div'), i=slides.indexOf(sl); c.className='stall'; c.setAttribute('role','group'); c.setAttribute('aria-labelledby',`stall-${i}`);
  c.innerHTML=`<p class="stall-h" id="stall-${i}">${esc(title)}</p>${detail?`<p class="fine">${esc(detail)}</p>`:''}
    <div class="btnrow">${kind==='blocked'?'':`<button class="btn" type="button" data-act="restart">${kind==='crashed'?'Try again':'Restart'}</button>`}</div>`;
  sl.stage.appendChild(c); sl.card=c; syncInteractUI(sl); placeOverlays(sl);
  if(curSlide()===sl) announce(`${sl.v.title}: ${title}. ${detail}`);
}
/* Things drawn over the canvas, positioned against the drawing box: the stall card (centre), the preset callout
   (bottom), the time chip (top), "Click to interact" (bottom right, inside the box) and, while interacting, the bar
   with the hint and Done (outside the box: below it, else above it). */
function placeOverlays(sl){
  if(!sl.card && !sl.callout && !sl.tchip && !sl.ihint) return;
  const B=boxOf(sl), cx=(B.x+B.w/2)+'px', mw=Math.max(200,B.w-16)+'px';
  if(sl.ihint){ const st=sl.ihint.style, c=document.body.classList.contains('focus')&&sl.corner;
    if(c){ st.left=c.x+'px'; st.top=c.y+'px'; st.maxWidth=''; } else { st.left=(B.x+B.w-8)+'px'; st.top=(B.y+B.h-8)+'px'; st.maxWidth=mw; } }
  if(sl.ibox){ const st=sl.ibox.style; st.left=B.x+'px'; st.top=B.y+'px'; st.width=B.w+'px'; st.height=B.h+'px'; }
  if(sl.ibar && !sl.ibar.hidden){ const st=sl.ibar.style, h=sl.ibar.offsetHeight||40, H=sl.h||sl.stage.clientHeight;
    st.left=(B.x+B.w/2)+'px'; st.maxWidth=Math.max(240,B.w)+'px';
    st.top=(B.y+B.h+8+h<=H?B.y+B.h+8:B.y-8-h>=0?B.y-8-h:B.y+B.h-8-h)+'px'; }
  if(sl.card){ const st=sl.card.style; st.left=cx; st.top=(B.y+B.h/2)+'px'; st.maxWidth=mw; }
  if(sl.callout){
    const c=sl.callout, st=c.style, dock=c.classList.contains('lesson')?capDock(sl,B):null;
    c.classList.toggle('dock',!!dock); sl.el.classList.toggle('docked',!!dock); // the caption steps aside for the card (its space stays reserved: the box does not move)
    if(dock){ if(c.parentElement!==sl.el) sl.el.appendChild(c); st.left=dock.x+'px'; st.top=dock.y+'px'; st.width=dock.w+'px'; st.maxWidth='';
      // phones: the caption is two short lines, so while moments play it reserves the card's height (it only grows, so the box does not move per moment)
      const cap=$('.caption',sl.el), need=c.offsetHeight; if(phoneUI() && need>(parseFloat(cap.style.minHeight)||0)) cap.style.minHeight=need+'px'; }
    else {
      if(c.parentElement!==sl.stage) sl.stage.appendChild(c); st.width='';
      let y=B.y+B.h-8-(sl.ihint&&!sl.ihint.hidden?sl.ihint.offsetHeight+6:0); // above "Click to interact"
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
  if(EigenReelHost.isCrashed(sl.v.id)) EigenReelHost.forgive(sl.v.id); // the viewer asked for it
  const hadFocus=sl.card && sl.card.contains(document.activeElement);
  if(sl.card){ sl.card.remove(); sl.card=null; }
  unmount(sl); sl.t=paused?Math.min(6,lengthOf(sl.v)):0; mountSlide(sl);
  if(hadFocus) refocus('[data-act="like"]',sl.el);
  announce(`Restarted ${sl.v.title}`);
}
function curSlide(){ return slides[activeIdx]; }
function onActiveChange(say){
  EigenReelHost.noteActive(activeIdx<slides.length?slides[activeIdx].v.id:null);
  if(lessonPlay && (!curSlide() || curSlide().v!==lessonPlay.v)) Lesson.exit(true); // leaving the slide ends the lesson
  if(interSl && interSl!==curSlide()) leaveInteract(interSl,true); // scrolling the feed leaves interact mode
  const n=slides.length, note=activeIdx<n?Collection.arrive(slides[activeIdx]):'';
  if(say) announce(activeIdx<n?`${activeIdx+1} of ${n}: ${slides[activeIdx].v.title}${slides[activeIdx].fallback?`. ${slides[activeIdx].fallback.message}.`:''}${note?`. ${note}`:''}`:'End of the feed');
  slideEls.forEach((el,i)=>el.classList.toggle('active',i===activeIdx));
  if(say) syncURL();
  $('#counter').textContent=`${Math.min(activeIdx+1,n)} / ${n}`;
  $('#prev').disabled=activeIdx<=0; $('#next').disabled=activeIdx>=slideEls.length-1;
  mountPolicy();
  const sl=curSlide();
  paintAccents(); // the page takes the colors of the piece on screen
  if(dTab && sl && sl.v!==dViz){ dViz=sl.v; renderDrawer(); }
}
function goTo(i){
  i=Math.max(0,Math.min(slideEls.length-1,i));
  if(slides[i] && slideEls.includes(document.fullscreenElement)) slides[i].el.requestFullscreen().catch(()=>{}); // a full-screen slide: the next one is full screen too; Present: the page is
  slideEls[i].scrollIntoView({behavior:reduceMotion?'auto':'smooth', block:'start'});
}
/* The address bar follows the slide on screen (#v=<slug>), with replaceState so Back is not one entry per swipe. Its
   params and t go in the link only through Share. */
function syncURL(){
  const sl=curSlide(); if(!sl || view!=='feed' || EMBED) return;
  if(filter.link){ const q=`?collection=${filter.link}`; if(location.search!==q) try{ history.replaceState(history.state,'',location.pathname+q); }catch(_){} return; } // a playing list keeps its link
  const h='#v='+encodeURIComponent(sl.v.id);
  if(location.hash===h && !location.search) return;
  try{ history.replaceState(history.state,'',location.pathname+h); }catch(_){}
}
function like(sl,only){
  const v=sl.v; if(only && v.liked) return; v.liked=!v.liked;
  sig.likes=[...VIZ,...PLAYGROUND].filter(x=>x.liked).map(x=>x.id); saveSignals();
  paintLike(v);
}
function toggleSave(sl){
  const v=sl.v, i=sig.saves.indexOf(v.id), on=i<0;
  if(on) sig.saves.push(v.id); else sig.saves.splice(i,1);
  saveSignals();
  renderChips();
  announce(on?`Saved ${v.title}. ${sig.saves.length} saved. To add this moment to a list, use the button in the message, or Share.`:`Removed ${v.title} from saved.`);
  if(on) toast(`Saved ${v.title}`,{label:'Add this moment…', run:b=>openMoments(v,b)});
}

/* ---------- scrub and long-press (feed mode only: the piece itself gets no input in the feed, spec section 6) ---------- */
const SCRUB_PX=12, SCRUB_S_PER_PX=0.02, LONG_MS=500;
function gestures(sl){
  const st=sl.stage; let g=null, longAt=0;
  const skip=e=>e.target.closest('.stall,.callout,.ihint,.ibar,button');
  st.addEventListener('pointerdown',e=>{
    if(sl.mode==='interact' || e.button>0 || !e.isPrimary || skip(e)) return;
    const me={id:e.pointerId, x:e.clientX, y:e.clientY, on:false, fired:false, lp:0};
    me.lp=setTimeout(()=>{ me.lp=0; if(g!==me || me.on) return; me.fired=true; longAt=performance.now(); togglePause(); },LONG_MS);
    g=me;
  });
  st.addEventListener('pointermove',e=>{
    if(!g || e.pointerId!==g.id) return;
    const dx=e.clientX-g.x, dy=e.clientY-g.y;
    if(!g.on){
      if(g.lp && Math.hypot(dx,dy)>6){ clearTimeout(g.lp); g.lp=0; } // a long-press is a press without movement
      if(g.fired || Math.abs(dx)<=SCRUB_PX || Math.abs(dx)<=Math.abs(dy)) return; // vertical: leave it to the feed's native scrolling
      g.on=true; g.x=e.clientX; g.base=sl.host?sl.host.getTime():sl.t; sl.scrubbing=true; syncPlay();
      try{ st.setPointerCapture(e.pointerId); }catch(_){}
    }
    e.preventDefault();
    const t=Math.min(lengthOf(sl.v),Math.max(0,g.base+(e.clientX-g.x)*SCRUB_S_PER_PX)); seekSl(sl,t); showT(sl,t);
  });
  const end=e=>{
    if(!g || e.pointerId!==g.id) return; const d=g; g=null; if(d.lp) clearTimeout(d.lp);
    if(d.on){ sl.scrubbing=false; syncPlay(); announce(`t = ${sl.t.toFixed(2)} s`); }
  };
  st.addEventListener('pointerup',end); st.addEventListener('pointercancel',end); st.addEventListener('lostpointercapture',end);
  st.addEventListener('contextmenu',e=>{ if(performance.now()-longAt<1500) e.preventDefault(); });
}

/* ---------- interact mode (spec, section 6): only pieces that declare `interact` ----------
   Entered with "Click to interact" ("Tap to interact" on touch) or Enter on the focused canvas: the host gives the frame
   pointer events and focus (setMode interact), and the page's own canvas lets them through (pointer-events: none). The
   page shows the piece's hint with how to leave, and a Done button outside the box. Left with Esc or a press in the
   frame outside the box (the host's onLeave), Done, a press anywhere on the page, or the feed moving to another slide.
   Params the piece changed with env.setParam stay (pieceParam), and Share carries them. */
let interSl=null;
const canInteract=sl=>!!(sl && sl.host && !sl.card && sl.v.meta && sl.v.meta.interact);
function syncInteractUI(sl){
  const on=canInteract(sl), cv=sl.canvas, inter=sl.mode==='interact';
  sl.stage.classList.toggle('engageable',on);
  if(!on){
    if(inter) return leaveInteract(sl,true); // the piece stopped while interacting: leaving runs this again
    for(const k of ['ihint','ibox','ibar']) if(sl[k]){ sl[k].remove(); sl[k]=null; }
    cv.removeAttribute('tabindex'); cv.setAttribute('aria-label',`${sl.v.title}, animated visualization`); return;
  }
  const hint=String(sl.v.meta.interact.hint||''), how=coarse()?'Tap outside to leave':'Esc or click outside to leave';
  cv.tabIndex=0;
  cv.setAttribute('aria-label',`${sl.v.title}, interactive visualization. ${inter?`Interacting: ${hint}. Escape, Done or a click outside it leaves.`:'Press Enter to interact.'}`);
  if(!sl.ihint){
    const b=sl.ihint=document.createElement('button'); b.type='button'; b.className='ihint';
    b.addEventListener('click',e=>{ e.stopPropagation(); enterInteract(sl); });
    const o=sl.ibox=document.createElement('div'); o.className='ibox'; o.setAttribute('aria-hidden','true');
    const bar=sl.ibar=document.createElement('div'); bar.className='ibar'; bar.setAttribute('role','group'); bar.setAttribute('aria-label','Interacting');
    bar.innerHTML=`<span class="ibar-t"></span><button class="btn idone" type="button">Done</button>`;
    $('.idone',bar).addEventListener('click',e=>{ e.stopPropagation(); leaveInteract(sl); });
    sl.stage.append(o,b,bar);
  }
  sl.ihint.textContent=coarse()?'Tap to interact':'Click to interact';
  sl.ihint.hidden=inter; sl.ibar.hidden=!inter;
  $('.ibar-t',sl.ibar).textContent=`${hint}${hint?' · ':''}${how}`;
  placeOverlays(sl);
}
function enterInteract(sl){
  if(!canInteract(sl) || sl.mode==='interact') return;
  if(interSl && interSl!==sl) leaveInteract(interSl,true);
  if(dTab) closeDrawer(); closeMore();
  interSl=sl; sl.mode='interact'; sl.stage.classList.add('engaged'); document.body.classList.add('interacting');
  sl.canvas.style.pointerEvents='none';
  sl.host.setMode({mode:'interact'});
  syncInteractUI(sl);
  announce(`Interacting with ${sl.v.title}. ${sl.v.meta.interact.hint||''}. Escape, Done or a click outside it leaves.`);
}
function leaveInteract(sl,quiet){
  sl=sl||interSl; if(!sl || sl.mode!=='interact') return;
  sl.mode='feed'; if(interSl===sl) interSl=null; sl.stage.classList.remove('engaged'); document.body.classList.remove('interacting');
  sl.canvas.style.pointerEvents='';
  if(sl.host) sl.host.setMode({mode:'feed'});
  syncInteractUI(sl);
  if(quiet) return;
  if(sl.canvas.isConnected) sl.canvas.focus({preventScroll:true}); // out of the frame, back on the page
  announce(`Left ${sl.v.title}. Scrolling is back.`);
}
// a press anywhere on the page is outside the piece (presses on the piece go to its frame): it leaves interact mode
document.addEventListener('pointerdown',e=>{ const sl=interSl; if(!sl || (e.target.closest && e.target.closest('.ibar'))) return; leaveInteract(sl); },true);
function showT(sl,t){
  let c=sl.tchip;
  if(!c){ c=sl.tchip=document.createElement('div'); c.className='tchip'; c.setAttribute('aria-hidden','true'); sl.stage.appendChild(c); placeOverlays(sl); }
  c.textContent=`t = ${t.toFixed(2)} s`; c.classList.remove('out');
  clearTimeout(sl.tchipTimer); sl.tchipTimer=setTimeout(()=>c.classList.add('out'),900);
}

/* ---------- presets (spec, section 4): {id, label, params, t} ----------
   Applying one sets its params (over the current ones, through normalizeParams) and, when it has a t, seeks there and
   pauses, like #t:. The Explanation's #preset: links, Present's steps and lists of moments land here. */
function applyPreset(v,p,quiet){
  if(typeof p==='string') p=EigenReelSpec.presetById(v.meta,p);
  if(!p) return;
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true); // a preset is the piece's own callout; it ends the lesson
  const s=getSettings(v); s.params=specParams(v,{...s.params, ...(p.params||{})}); pushParams(v);
  if(Number.isFinite(p.t)){ setPaused(true,true); seekViz(v,p.t); }
  if(quiet) return;
  const sl=slides.find(x=>x.v===v); if(sl) showCallout(sl,p);
  announce(`${p.label}.${Number.isFinite(p.t)?` Paused at t = ${p.t} s.`:''}`);
}
function showCallout(sl,p){
  hideCallout(sl,true);
  const c=document.createElement('div'); c.className='callout'+(p.cls?' '+p.cls:'');
  c.setAttribute('aria-hidden','true'); // the same text goes to the live region
  c.innerHTML=`<b>${esc(p.label)}</b>${p.note?`<span>${texText(p.note)}</span>`:''}`;
  c.addEventListener('click',()=>hideCallout(sl));
  sl.stage.appendChild(c); sl.callout=c; placeOverlays(sl);
  if(window.EigenReelTeX && c.querySelector('.tex')) EigenReelTeX.typeset(c).then(()=>{ if(c.isConnected) placeOverlays(sl); });
  sl.calloutTimer=setTimeout(()=>hideCallout(sl),6000);
}
function hideCallout(sl,now){
  const c=sl.callout; if(!c) return; clearTimeout(sl.calloutTimer); sl.callout=null; sl.el.classList.remove('docked');
  if(c.classList.contains('lesson')){ const cap=$('.caption',sl.el); if(cap) cap.style.minHeight=''; }
  if(now||reduceMotion) return c.remove(); c.classList.add('out'); setTimeout(()=>c.remove(),400);
}

/* ---------- links in the explanation (spec, section 7) ----------
   EigenReelSpec.liveLink reads each #… link: [text](#preset:id) applies a preset, [text](#t:6) seeks and pauses. A
   reserved link the piece does not back (an unknown preset, a t beyond time.length) renders as its plain text, and
   so does any other in-page link. Every other link opens in a new tab with rel="noopener noreferrer". */
function liveify(root,v){
  for(const a of $$('a[href]',root)){
    const href=a.getAttribute('href');
    if(!href.startsWith('#')){ a.target='_blank'; a.rel='noopener noreferrer'; continue; }
    const L=EigenReelSpec.liveLink(v.meta,href);
    if(!L || L.kind==='error'){ if(L) console.warn(`eigenreel: ${v.id} explanation: ${L.message}`); a.replaceWith(...a.childNodes); continue; }
    a.classList.add('live'); a.dataset.live=href;
    a.title=L.kind==='t'?`Seek to t = ${L.t} s and pause`:`Set up “${L.preset.label}” on the slide`;
  }
}
/* put piece v where a #preset: or #t: link says; quiet: the caller (a step) shows its own callout */
function runLive(v,L,label,quiet){
  const sl=slides.find(x=>x.v===v);
  if(L.kind==='preset') return applyPreset(v,L.preset,quiet);
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true);
  setPaused(true,true); seekViz(v,L.t);
  if(quiet) return;
  if(sl) showT(sl,L.t);
  announce(`Paused at t = ${L.t} s.`);
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
  const link=$$('[data-live]',txt).map(a=>EigenReelSpec.liveLink(v.meta,a.dataset.live)).find(L=>L && L.kind!=='error');
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

/* ---------- lesson links (the old docs/module-api.md, "Moments"; kept for {params, t}): up to 8 moments of one piece in one link ----------
   A stop is a share-link state with a note: {p, t, note}. Everything that arrives (a link, a stored draft) goes through
   Lesson.parse: params through EigenReelSpec.normalizeParams, t clamped to [0, time.length], notes cut to 140 characters.
   An old stop's view is ignored. Stops are compact (non-default params only) in links and drafts, complete after parse.
   Lists of moments (Collection, below), Present and the clip recorder reuse stop/compact/apply and the player. */
const Lesson={
  MAX_STOPS:8, MAX_NOTE:140, MAX_TITLE:80, MAX_LINK:16384,
  key:v=>'eigenreel:lesson:'+v.id, // the old per-piece "Your lesson" draft, read once by Moments.migrate
  /* the moment v is at now, as a compact stop */
  capture(v,note){ const o=stateOf(v), st={}; if(o.p) st.p=o.p; if(o.t!=null) st.t=o.t; st.note=String(note||'').trim().slice(0,Lesson.MAX_NOTE); return st; },
  /* a stop (compact or complete) in the compact form: non-default params, t when > 0 */
  compact(v,st){
    const p=EigenReelSpec.nonDefault(v.meta,st.p||{}), o={};
    if(Object.keys(p).length) o.p=p; if(st.t>=0.005) o.t=+(+st.t).toFixed(2); o.note=st.note||''; return o;
  },
  /* one stop (an object) of piece v, complete: params through normalizeParams, t finite and within [0, time.length],
     note cut to MAX_NOTE. Shared with collection items. */
  stop(s,v,warn){
    return {v:v.id, p:specParams(v,s.p&&typeof s.p==='object'&&!Array.isArray(s.p)?s.p:{}), t:Number.isFinite(s.t)&&s.t>=0?Math.min(+s.t,lengthOf(v)):0,
      note:typeof s.note==='string'?s.note.trim().slice(0,Lesson.MAX_NOTE):''};
  },
  /* validate {title?, stops:[{v?, p, t, note}]} for piece v. Returns {title, stops} with complete stops, or null. */
  parse(o,v,from='lesson link'){
    const warn=m=>console.warn(`eigenreel: ${from}: ${m}`);
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
    if(str.length>Lesson.MAX_LINK){ console.warn('eigenreel: ignoring a lesson link longer than 16 KB'); return null; }
    let o; try{ o=JSON.parse(b64u.dec(str)); }catch(_){ console.warn('eigenreel: ignoring a malformed lesson link'); return null; }
    const l=Lesson.parse(o,v); if(l && !l.stops.length){ console.warn('eigenreel: ignoring a lesson link with no stops'); return null; } return l;
  },
  url(v,lesson){ return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}&lesson=${Lesson.encode(v,lesson)}`+location.hash; },
  /* the lesson link starting at stop i (&at=, 1-based; omitted for stop 1); bare: without the notes, for a QR code */
  link(v,lesson,i,bare){ const l=bare?{title:lesson.title, stops:lesson.stops.map(s=>({...s, note:''}))}:lesson;
    return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}&lesson=${Lesson.encode(v,l)}`+(i>0?`&at=${i+1}`:'')+location.hash; },
  /* put piece v at a stop: params replace the current ones, then t */
  apply(v,st){
    const s=getSettings(v); s.params=specParams(v,st.p); pushParams(v); seekViz(v,st.t||0);
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
    lessonPlay={v, lesson, i:-1, wasPaused:paused, list:o.list||null, live:!!o.live, was:{p:structuredClone(getSettings(v).params), t:timeOf(v)}};
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
    const now=getSettings(L.v).params, kept=keep&&!L.live?specControls(L.v).filter(c=>now[c.key]!==L.was.p[c.key]):[];
    if(!keep && !L.live) Lesson.apply(L.v,L.was); // nothing borrowed stays on
    if(!L.live && !L.wasPaused && paused) setPaused(false,true);
    if(new URLSearchParams(location.search).has('lesson')) try{ history.replaceState(history.state,'',`${location.pathname}#v=${encodeURIComponent(L.v.id)}`); }catch(_){}
    if(!quiet) announce(`Left the moments. ${L.v.title} ${keep||L.live?'keeps the moment\'s settings':'is back as it was'}${!L.live&&!L.wasPaused?' and playing again':''}.`);
    if(keep && kept.length) toast(`Kept ${kept.map(c=>`${c.label} ${c.format(now[c.key])}`).join(', ')}.`);
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

/* ---------- lists of moments (the old docs/module-api.md, "Moments"; kept for {params, t}): the collection link ----------
   A list is {title, intro, items}: moments {v, p, t, note} (a lesson stop that names its piece). Adjacent moments of one piece are a run: the feed has one slide per piece, so a run plays on that slide with
   the lesson player, and a change of piece is the next slide. Items go through Lesson.stop; unknown pieces and
   non-adjacent repeats are dropped with a warning; a moment that is only {v} plays the piece as the feed would (that
   is what a blog post's "Watch these in the feed" is). Each run's first moment is written when the feed is built
   (buildFeed), not on arrival: mountPolicy mounts the next slide before it is active. */
const Collection={
  MAX_ITEMS:30, MAX_INTRO:280, KEY:'eigenreel:collections',
  /* validate {title, intro?, items:[...]}. Returns {title, intro, items, gone} or null. */
  parse(o,from='collection link',allowEmpty){
    const warn=m=>console.warn(`eigenreel: ${from}: ${m}`);
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
      items.push(Lesson.stop(s,v,m=>warn(`moment ${i+1}: ${m}`)));
    });
    const str=(x,n)=>typeof x==='string'?x.trim().replace(/\s+/g,' ').slice(0,n):'';
    if(!items.length && !allowEmpty){ warn('ignoring it: no playable moments'); return null; }
    return {title:str(o.title,Lesson.MAX_TITLE), intro:str(o.intro,Collection.MAX_INTRO), items, gone};
  },
  /* the compact form, for links and storage */
  compact(c){
    const o={title:c.title||''}; if(c.intro) o.intro=c.intro;
    o.items=c.items.map(it=>it.bare?{v:it.v}:{v:it.v, ...Lesson.compact(vizById(it.v),it)});
    return o;
  },
  encode:c=>b64u.enc(JSON.stringify(Collection.compact(c))),
  decode(str){
    if(str.length>Lesson.MAX_LINK){ console.warn('eigenreel: ignoring a collection link longer than 16 KB'); return null; }
    let o; try{ o=JSON.parse(b64u.dec(str)); }catch(_){ console.warn('eigenreel: ignoring a malformed collection link'); return null; }
    return Collection.parse(o);
  },
  url:c=>location.origin+location.pathname+`?collection=${Collection.encode(c)}`+location.hash,
  /* the link starting at moment k (&at=, 1-based; omitted for moment 1); bare: without the notes and intro, for a QR code */
  link(c,k,bare){ const l=bare?{title:c.title, intro:'', items:c.items.map(it=>({...it, note:''}))}:c; return Collection.url(l).replace(/(#.*)?$/,m=>(k>0?`&at=${k+1}`:'')+m); },
  /* the moment piece v is at now, as an item */
  capture(v,note){ return {v:v.id, ...Lesson.capture(v,note)}; },
  /* runs of adjacent moments of one piece: [{v, base, items}], base the index of the run's first moment */
  runs(items){ const out=[]; items.forEach((it,k)=>{ const r=out[out.length-1]; if(r && r.v===it.v) r.items.push(it); else out.push({v:it.v, base:k, items:[it]}); }); return out; },
  /* the playlist filter, one slide per run; link: keep ?collection= in the address bar while it plays */
  filter(c,link){ return {type:'playlist', ids:[...new Set(c.items.map(it=>it.v))], name:c.title||'Untitled list', intro:c.intro||'', items:c.items, runs:Collection.runs(c.items),
    list:{title:c.title||'', intro:c.intro||'', items:c.items}, link:link?Collection.encode(c):null}; },
  play(c,link){ setFilter(Collection.filter(c,link)); if(c.gone) Collection.gone(c.gone); },
  gone(n){ toast(`${n} piece${n===1?' is':'s are'} no longer available`); },
  /* write each run's first moment (params and t) before anything mounts (called from buildFeed) */
  applyAll(){
    if(!filter.runs) return;
    Collection.restore(filter); filter.was={}; // a rebuild of the same list snapshots the user's params, not the moments'
    for(const r of filter.runs){
      const it=r.items[0]; if(it.bare) continue; const v=vizById(it.v), sl=slides.find(x=>x.v===v); if(!v || !sl) continue;
      filter.was[v.id]=structuredClone(getSettings(v).params); getSettings(v).params=specParams(v,it.p); sl.t=it.t||0;
      sl.hold=true; // a peeking neighbour stays at its moment until it arrives
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
   else the piece's presets; past the last step comes the next piece. The keys are the site's own and a slide clicker's:
   → PageDown for next, ← PageUp for back, ↓ ↑ for the next or previous piece, Space to pause, Esc to leave. Black and
   the QR code are buttons in the corner strip, which shows while the pointer moves. The QR (qr.js) is of the playing
   moments from this one (&at=, presentQR), else shareURL at the moment it is drawn. */
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
  const s=presentSteps(); if(atEnd && s.kind==='presets'){ P.pi=s.n-1; applyPreset(sl.v,presetsOf(sl.v)[P.pi]); }
  const el=document.createElement('div'); el.className='present'; el.tabIndex=-1; el.setAttribute('role','region'); el.setAttribute('aria-label',`Presenting ${sl.v.title}`);
  el.innerHTML=`<div class="pz-hint" role="toolbar" aria-label="Present"><span aria-hidden="true"><kbd>→</kbd> next <kbd>←</kbd> back <kbd>Esc</kbd> leave</span>
      <button class="btn ghost" type="button" data-pz="black">Black</button><button class="btn ghost" type="button" data-pz="qr">QR code</button><button class="btn ghost" type="button" data-pz="leave">Leave</button></div>
    <p class="pz-note" aria-hidden="true"></p>
    <div class="pz-qr" hidden><div class="pz-code"></div><p class="pz-url"></p></div>
    <div class="pz-strip" aria-hidden="true"><span class="pz-k"></span><i><b></b></i></div>
    <div class="pz-black" hidden></div>`;
  sl.el.appendChild(el); P.el=el;
  const hint=$('.pz-hint',el), showHint=()=>{ hint.classList.remove('out'); clearTimeout(P.hintTimer); P.hintTimer=setTimeout(()=>{ if(!hint.contains(document.activeElement)) hint.classList.add('out'); },3000); };
  el.addEventListener('pointermove',showHint); hint.addEventListener('focusin',showHint); showHint();
  hint.addEventListener('click',e=>{ const b=e.target.closest('[data-pz]'); if(!b) return; e.stopPropagation(); const a=b.dataset.pz;
    if(a==='leave') return exitPresent(); if(a==='black') return presentBlack(); presentQRToggle(); });
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
  leaveInteract(null,true);
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
  announce(`Presenting ${sl.v.title}. ${isMoments(s)?`Moment ${s.i+1} of ${s.n}.`:s.kind==='presets'?`${s.n} presets.`:''} Right arrow or Page Down for next, Left arrow or Page Up for back, Space to pause; Escape leaves. The Black and QR code buttons are in the corner.`);
}
function exitPresent(){
  const P=present; if(!P) return;
  presentOff(); present=null; document.body.classList.remove('presenting');
  const back=P.back, slEl=P.sl.el;
  Promise.resolve(leaveFull()).then(()=>requestAnimationFrame(()=>{
    if(typeof demoReturn!=='undefined' && demoReturn && typeof endDemo==='function') return endDemo(); // a Chalkboard Live demo
    if(back && back.isConnected && back!==document.body && back.getClientRects().length) back.focus({preventScroll:true});
    else refocus('[data-act="pause"]',slEl.isConnected?slEl:(slideEls[activeIdx]||document));
  }));
  announce('Left Present.');
}
function presentStep(d){
  const P=present, s=presentSteps(), j=isMoments(s)?s.j+d:s.i+d;
  if(isMoments(s) && j>=0 && j<s.m){ Lesson.go(j); return presentPaint(); }
  if(s.kind==='presets' && j>=0 && j<s.n){ P.pi=j; applyPreset(P.sl.v,presetsOf(P.sl.v)[j]); return presentPaint(); }
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
  announce(P.black?'Black screen. Black again brings the picture back.':'Picture back.');
}
function presentQRToggle(){ if(!present) return; present.qr=!present.qr; presentPaint(); announce(present.qr?'QR code of this view shown, with its link.':'QR code hidden.'); }
/* the keys while presenting (only the site's own keys, spec section 6, which a slide clicker also sends); false hands the key on */
function presentKey(e){
  const k=e.key;
  if(e.metaKey || e.ctrlKey || e.altKey) return false;
  if(e.target.closest && e.target.closest('input,select,textarea,[role="menu"],button')) return k==='Escape'?(exitPresent(),e.preventDefault(),true):false;
  const eat=()=>{ e.preventDefault(); return true; };
  if(k==='Escape'){ exitPresent(); return eat(); }
  if(k==='ArrowRight' || k==='PageDown'){ presentStep(1); return eat(); }
  if(k==='ArrowLeft' || k==='PageUp'){ presentStep(-1); return eat(); }
  if(k==='ArrowDown'){ presentPiece(1); return eat(); }
  if(k==='ArrowUp'){ presentPiece(-1,false); return eat(); }
  if(k===' '){ if(!e.repeat){ togglePause(); presentPaint(); } return eat(); }
  return false;
}
/* ?present=1: full screen needs a gesture, so a bookmarked talk opens on this prompt and one press starts it */
function showPresentPrompt(){
  const p=document.createElement('div'); p.className='present-prompt'; p.id='present-prompt';
  p.innerHTML=`<button class="btn" type="button" id="present-go">Present</button><p>Press Present to start, <kbd>Esc</kbd> to browse instead</p>`;
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
  const t=sl.host.getTime(), name=`${sl.v.id}-t${t.toFixed(2)}.png`;
  try{ download(await sl.host.capture(),name); toast(`Saved ${name}`); }
  catch(e){ console.warn('eigenreel: capture failed',e.message); toast('Could not capture this frame.'); }
}
/* The Share dialog (spec, section 4): what the viewer is looking at, as a link and as a file. Link: this moment (the
   current params, including any the piece changed in interact mode, and t), or, when a lesson or a list of moments
   plays, that lesson or list, picked with radios. Export: the frame as a PNG, or a stretch of t as a GIF, a video or
   PNG frames, rendered offline by seeking a hidden copy frame by frame. Course page: the embed and a static image.
   Slides: Present and Beamer. */
let shareSl=null, shareKind='moment', shareStill=null, shareStillN=0;
function shareChoices(v){
  const out=[{kind:'moment', label:'This moment', url:shareURL(v)}], L=lessonPlay&&lessonPlay.v===v?lessonPlay:null;
  if(L && !L.list){ const n=L.lesson.stops.length;
    out.push({kind:'lesson', label:`The lesson${L.lesson.title?` “${L.lesson.title}”`:''} (${n} moment${n===1?'':'s'})`, url:Lesson.url(v,L.lesson), def:true}); }
  if(filter.type==='playlist' && filter.items && filter.items.some(it=>it.v===v.id)){ const n=filter.items.length;
    out.push({kind:'collection', label:`The list “${filter.name}” (${n} moment${n===1?'':'s'})`, url:filter.link?location.origin+location.pathname+`?collection=${filter.link}`:Collection.url({title:filter.name, intro:filter.intro, items:filter.items}), def:!out.some(c=>c.def)}); }
  return out;
}
const shareChoice=v=>{ const cs=shareChoices(v); return cs.find(c=>c.kind===shareKind)||cs[0]; };
const SHARE_WHAT={moment:'The link opens this piece with the parameters it has now, including any you changed by interacting with it, paused at this moment <i>t</i>.',
  lesson:'The link plays the lesson from moment 1, each moment with its note.',
  collection:'The link plays the whole list in the feed, each moment with its note.'};
/* the link, the snippets and the label for the current pick */
function shareSync(){
  const sl=shareSl; if(!sl) return; const v=sl.v, c=shareChoice(v), list=c.kind!=='moment';
  $('#share-url').value=c.url;
  $('#share-url-l').textContent=list?`Link to ${c.kind==='collection'?'the list':'the lesson'}`:'Link to this moment';
  $('#share-url-d').innerHTML=SHARE_WHAT[c.kind]+(list||!$('#share-pick').hidden?'':' To send several moments with a sentence each, of this piece or of several, add each to a list with Add this moment: one link plays the list.');
  const embUrl=c.kind==='collection'?shareURL(v):c.url; // collections can't be embedded yet: the embed is this moment
  $('#share-emb').textContent=embedHTML(v,embUrl);
  $('#share-emb-n').innerHTML=`${c.kind==='collection'?'Lists across pieces can\'t be embedded yet, so this embeds this moment. ':list?'The embed steps through the lesson\'s moments. ':''}${todo('embed snippet note')}`;
  shareStillReset(); beamerSync();
}
function shareStillReset(){ shareStill=null; shareStillN++; $('#share-img').textContent='Not rendered yet: Render image draws this moment once, at 480 × 480.'; $('#share-copy-img').disabled=true; $('#share-img-go').disabled=false; }
function shareRenderStill(){
  const sl=shareSl; if(!sl) return; const v=sl.v, url=$('#share-url').value, t=timeOf(v), n=++shareStillN, pre=$('#share-img');
  pre.textContent='Rendering the still…'; $('#share-img-go').disabled=true;
  stillFor(v,t).then(src=>{ if(n!==shareStillN) return; shareStill=stillHTML(v,src,url); pre.textContent=shortData(shareStill); $('#share-copy-img').disabled=false; $('#share-img-go').disabled=false; },
    e=>{ if(n!==shareStillN) return; pre.textContent=`No still in this browser: ${e.message}`; $('#share-img-go').disabled=false; });
}
function openShare(sl,opener){
  const v=sl.v; shareSl=sl;
  const cs=shareChoices(v); shareKind=(cs.find(c=>c.def)||cs[0]).kind; // a playing lesson or list is the default link
  $('#share-pick').hidden=cs.length<2;
  $('#share-opts').innerHTML=cs.length<2?'':cs.map(c=>`<label class="check"><input type="radio" name="share-kind" value="${c.kind}"${c.kind===shareKind?' checked':''}> ${esc(c.label)}</label>`).join('');
  $('#share-h').textContent=v.title; $('#share-msg').textContent='';
  shareSync(); const url=$('#share-url').value;
  const off=!!(sl.card||!sl.host); // a piece that is not running here has no frame to export
  $('#share-export-off').hidden=!off; $$('#sg-export-b button').forEach(b=>b.disabled=off);
  $('#clip').hidden=true; $('#share-clip').setAttribute('aria-expanded','false'); // the recorder opens collapsed, with this slide's t
  renderPropose(v);
  showDialog('#sharemodal','#share-url',opener);
  const fail=()=>{ $('#share-msg').textContent=`Copying is blocked here. The link below is selected: copy it with ${MOD_KEY}+C.`; };
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(url):Promise.reject()).then(()=>{
    $('#share-msg').textContent=`${shareKind==='moment'?'Link':shareKind==='collection'?'Link to the list':'Link to the lesson'} copied to the clipboard.`;
    toast('Link copied');
  },fail);
}
$('#share-opts').addEventListener('change',e=>{ const r=e.target.closest('input[name="share-kind"]'); if(!r||!shareSl) return; shareKind=r.value; shareSync(); $('#share-msg').textContent=''; announce(`${$('#share-url-l').textContent}. Copy link copies it.`); });
$('#share-url').addEventListener('focus',e=>{ const u=e.target; u.setSelectionRange(0,u.value.length,'backward'); }); // backward: the start of the link stays in view
$('#share-copy').onclick=()=>{ const u=$('#share-url'); copyText(u.value,'Link copied'); u.focus(); };
$('#share-copy-emb').onclick=()=>copyText($('#share-emb').textContent,'Embed copied');
$('#share-img-go').onclick=shareRenderStill;
$('#share-copy-img').onclick=()=>{
  if(!shareStill) return toast('Render the image first.');
  const all=shareStill; (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(all):Promise.reject()).then(()=>toast('Static image snippet copied'),()=>{ // blocked: show it in full, selected, for Ctrl+C
    const pre=$('#share-img'); pre.textContent=all; const r=document.createRange(); r.selectNodeContents(pre); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(r);
    toast(`Copying is blocked here. The full snippet is selected: copy it with ${MOD_KEY}+C.`); });
};
$('#share-ask').onclick=()=>{ const sl=shareSl; hideDialog($('#sharemodal')); if(!sl) return; openDrawer('explain',sl.v); setTimeout(()=>{ const q=$('#qa-text'); if(q){ q.scrollIntoView({block:'center'}); q.focus({preventScroll:true}); } },80); };
$('#share-frame').onclick=()=>{ if(shareSl) saveFrame(shareSl); };

/* ---------- export a stretch of t (spec, section 4): GIF, video or PNG frames ----------
   A dedicated hidden copy, never the visible slide: mounted paused on a detached canvas at the box size (or with the
   longest side at 720 px, the same layout at a higher dpr), then seek(t) + capture() for each frame, in order. Every
   piece is a function of (t, params), so this needs nothing from the piece.
   GIF: one global palette (median cut over a few sampled frames), then each frame is mapped, cropped to what changed
   and LZW-encoded as it arrives (gif.js), with a yield to the page between frames. Video: the frames are rendered
   first (kept as PNGs), then drawn one by one on a page canvas whose captureStream(0) feeds a MediaRecorder, each
   followed by requestFrame() at the clip's frame rate, so the WebM plays at the right speed; without MediaRecorder it
   falls back to a GIF. PNG zip: the frames for Beamer's \animategraphics. The watermark strip under the box prints a
   typeable short link and the values (clipStripText). */
const CLIP_MAX=240, CLIP_SAMPLES=6, CLIP_MONO='"IBM Plex Mono", ui-monospace, monospace';
let clipJob=null;
const clipCancelled=new Error('cancelled');
const clipFmtTime=s=>s<1?'under a second':s<90?`about ${Math.round(s)} s`:`about ${Math.round(s/60)} min`;
/* bytes per output pixel measured on this piece's last recording: {first, rest} per piece, format and size (the first GIF frame is
   whole, later ones are only what changed). Without one the estimate is a dense-picture guess, which can be 20× high for a sparse piece. */
const clipCal=new Map(), clipCalKey=(v,P)=>`${v.id}|${P.fmt}|${P.size}|${P.wm?1:0}`;
const clipMB=b=>b<1048576?`${Math.max(1,Math.round(b/1024))} KB`:`${(b/1048576).toFixed(1)} MB`;
/* the video encoder this browser has, or null (then a video request records a GIF) */
function videoType(){
  if(typeof MediaRecorder==='undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>{ try{ return MediaRecorder.isTypeSupported(t); }catch(_){ return false; } })||null;
}
function clipPlan(sl){
  const i=Math.max(0,parseFloat($('#clip-in').value)), o=Math.min(lengthOf(sl.v),parseFloat($('#clip-out').value)), fps=+$('#clip-fps').value||15;
  const size=$('#clip-size').value, wm=$('#clip-wm').checked; let fmt=$('#clip-fmt').value;
  const fallback=fmt==='webm'&&!videoType(); if(fallback) fmt='gif';
  const B=boxOf(sl), W=Math.max(16,Math.round(B.w)), H=Math.max(16,Math.round(B.h)), k=size==='720'?720/Math.max(W,H):1;
  const ow=Math.round(W*k)&~1, oh=Math.round(H*k)&~1, strip=wm?Math.round(22*k)&~1:0, n=Math.round((o-i)*fps);
  const P={i, o, fps, size, fmt, fallback, wm, W, H, k, ow, oh, strip, oht:oh+strip, n};
  if(!Number.isFinite(i)||!Number.isFinite(o)) P.error='Enter an in and an out point in seconds.';
  else if(!(n>=2)) P.error=`The out point must be at least two frames after the in point (and at most t = ${lengthOf(sl.v)} s, the piece's length).`;
  else if(n>CLIP_MAX) P.error=`That is ${n} frames; a clip is ${CLIP_MAX} frames at most (${(CLIP_MAX/fps).toFixed(1)} s at ${fps} fps). Shorten the range or lower the frame rate.`;
  const MP=ow*P.oht/1e6;
  P.msPer=15+110*MP+(fmt==='zip'?40*MP:0); // review estimate: 15–40 ms a frame at 480², 60–150 ms at 1080²
  const cal=clipCal.get(clipCalKey(sl.v,P)), px=ow*P.oht; P.cal=!!cal;
  P.bytes=cal?px*(cal.first+cal.rest*(n-1)):fmt==='zip'?n*px*0.8:fmt==='webm'?(o-i)*250000:px*(0.5+0.2*(n-1));
  return P;
}
const CLIP_GO={gif:'Record GIF', webm:'Record video', zip:'Record PNG frames'}, CLIP_FILE={gif:'GIF', webm:'video', zip:'zip'};
function clipSyncUI(){
  const sl=shareSl; if(!sl || $('#clip').hidden) return;
  const P=clipPlan(sl), busy=!!clipJob, big=Math.max(P.W,P.H);
  const bx=$('#clip-size').options; bx[0].textContent=`The box, ${P.W}×${P.H}`; bx[1].textContent=`720 px, ${Math.round(P.W*720/big)}×${Math.round(P.H*720/big)}`;
  $('#clip-go').textContent=CLIP_GO[P.fmt];
  $('#clip-go').disabled=busy||!!P.error;
  ['#clip-in','#clip-out','#clip-fps','#clip-size','#clip-fmt','#clip-wm'].forEach(s=>$(s).disabled=busy);
  if(busy) return;
  const L=lengthOf(sl.v), loop=sl.v.meta.time&&sl.v.meta.time.loop, hint=loop&&!P.error&&Math.abs((P.o-P.i)-L)>0.05&&P.o-P.i>L/2?` This piece repeats every ${L} s: in 0, out ${L} loops seamlessly.`:'';
  $('#clip-est').textContent=P.error?P.error:`${P.fallback?'This browser cannot record video, so this records a GIF. ':''}${P.n} frames at ${P.ow} × ${P.oht} px: rendering takes ${clipFmtTime(P.n*P.msPer/1000)}${P.fmt==='webm'?`, then encoding ${clipFmtTime(P.o-P.i)}`:''}, and the ${CLIP_FILE[P.fmt]} is an estimated ${clipMB(P.bytes)} (${P.cal?'from your last recording of this piece':'a first guess'}).${hint}`;
}
function openClip(){
  const sl=shareSl; if(!sl) return;
  const sec=$('#clip'), show=sec.hidden; sec.hidden=!show; $('#share-clip').setAttribute('aria-expanded',show);
  if(!show) return;
  const L=lengthOf(sl.v), t=sl.host?sl.host.getTime():sl.t||0, i=Math.max(0,Math.min(L-0.5,Math.round(t*10)/10));
  $('#clip-in').value=i.toFixed(1); $('#clip-out').value=Math.min(L,i+4).toFixed(1); $('#clip-in').max=$('#clip-out').max=L; $('#clip-msg').textContent='';
  clipSyncUI(); $('#clip-in').focus();
}
/* the strip under the box: the piece's background, a hairline, and a line someone can type from a slide: the piece's
   short page (v/<id>, which redirects to ?v=<id>) and the values that differ from the defaults, with the in point,
   e.g. "example.org/v/times-table · Points on the circle 101 · t = 258 s". Too wide, it drops the host, then the values, then shrinks. */
function clipStripText(v,params,t){
  const nd=EigenReelSpec.nonDefault(v.meta,params), vals=specControls(v).filter(c=>c.key in nd).map(c=>`${c.key} = ${c.format(params[c.key])}`);
  vals.push(`t = ${+(+t).toFixed(1)} s`);
  const host=(location.host+location.pathname.replace(/[^/]*$/,'')).replace(/\/$/,''), short=`v/${v.id}`, tail=' · '+vals.join(' · ');
  return [`${host}/${short}${tail}`, `eigenreel · ${short}${tail}`, `${host}/${short}`, `eigenreel · ${short}`];
}
function paintClipStrip(c,P,col,lines){
  const k=P.k, y=P.oh, pad=Math.round(8*k), room=P.ow-2*pad;
  c.fillStyle=col.bg; c.fillRect(0,y,P.ow,P.strip);
  c.globalAlpha=0.3; c.fillStyle=col.fg; c.fillRect(0,y,P.ow,Math.max(1,Math.round(k))); c.globalAlpha=0.8;
  let fs=11*k, txt=lines[0]; const set=()=>{ c.font=`${fs}px ${CLIP_MONO}`; }; set();
  for(const l of lines){ txt=l; fs=11*k; set(); while(c.measureText(txt).width>room && fs>9*k){ fs-=0.5*k; set(); } if(c.measureText(txt).width<=room) break; }
  while(c.measureText(txt).width>room && fs>7*k){ fs-=0.5*k; set(); }
  c.textBaseline='middle'; c.textAlign='left'; c.fillText(txt,pad,y+P.strip/2+0.5*k,room); c.globalAlpha=1;
}
/* a hidden copy of piece v at params, paused, for offline frames (the clip, Beamer, stills) */
function hiddenMount(v,params,t,box,k,onError){
  return EigenReelHost.mount(document.createElement('canvas'),pieceOf(v),{params, t, playing:false, device:DEVICE, mode:'feed', box:{x:0,y:0,...box}, dpr:k,
    size:{...box}, site:siteColors(), label:'poster', onError});
}
const toPNG=cv=>new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('could not encode a PNG')),'image/png'));
async function recordClip(){
  const sl=shareSl; if(!sl || clipJob) return;
  const v=sl.v, P=clipPlan(sl), msg=$('#clip-msg'); if(P.error) return clipSyncUI();
  if(sl.card || !sl.host){ msg.textContent='This piece is not running here, so it cannot be recorded.'; return; }
  const job={cancelled:false, h:null}; clipJob=job;
  const prog=$('#clip-prog'), est=$('#clip-est');
  prog.hidden=false; prog.value=0; $('#clip-cancel').hidden=false; msg.textContent=''; clipSyncUI();
  if(P.wm && document.fonts) try{ await document.fonts.load(`11px ${CLIP_MONO}`); }catch(_){} // the strip's font, before the first frame
  const col={...siteColors(), ...pieceColors(v)}, params={...getSettings(v).params};
  const pick=shareChoice(v), list=pick.kind!=='moment'; // Share's link pick: a lesson or list goes in the .tex, and in the strip when it fits
  const link=list?pick.url:shareURL(v,P.i), strip=(list?[pick.url.replace(/^https?:\/\//,'')]:[]).concat(clipStripText(v,params,P.i)); // the full link goes in the .tex; the strip prints what can be typed
  let fail; const failed=new Promise((_,rej)=>fail=rej); failed.catch(()=>{});
  const h=hiddenMount(v,params,P.i,{w:P.W,h:P.H},P.k,(kind,m)=>fail(new Error(`${kind}: ${m}`)));
  job.h=h;
  const out=document.createElement('canvas'); out.width=P.ow; out.height=P.oht;
  const c=out.getContext('2d',{willReadFrequently:P.fmt==='gif'});
  const times=Array.from({length:P.n},(_,j)=>P.i+j/P.fps);
  const delay=j=>Math.round((j+1)*100/P.fps)-Math.round(j*100/P.fps); // centiseconds that add up to the true duration
  const yieldPage=()=>new Promise(r=>setTimeout(r,0));
  const draw=async t=>{ // seek, capture, composite into `out`
    h.seek(t); const blob=await Promise.race([h.capture(),failed]); if(job.cancelled) throw clipCancelled;
    const bm=await createImageBitmap(blob);
    c.fillStyle=col.bg; c.fillRect(0,0,P.ow,P.oht); c.drawImage(bm,0,0,P.ow,P.oh); if(bm.close) bm.close();
    if(P.wm) paintClipStrip(c,P,col,strip);
    if(job.cancelled) throw clipCancelled;
  };
  const t0=performance.now(); let done=0, bytes=0, first=0, same=0, result=null;
  // the estimate in all, from what has actually been encoded: the first frame, then the mean of the later ones
  const total=()=>done<2?first*(1+(P.fmt==='zip'?1:0.4)*(P.n-1)):first+(bytes-first)/(done-1)*(P.n-1);
  const tick=()=>{ done++; if(done===1) first=bytes; prog.value=done/P.n; const el=(performance.now()-t0)/1000, left=el/done*(P.n-done);
    est.textContent=`Frame ${done} of ${P.n} · ${done<P.n?clipFmtTime(left)+' left':'finishing'}${P.fmt==='webm'?'':` · ${clipMB(bytes)} so far, an estimated ${clipMB(total())} in all`}`; };
  const name=`${v.id}-t${P.i.toFixed(1)}-${P.o.toFixed(1)}`;
  try{
    if(P.fmt==='gif'){
      const K=Math.min(P.n,CLIP_SAMPLES), picks=[...new Set(Array.from({length:K},(_,j)=>Math.round(j*(P.n-1)/Math.max(1,K-1))))], cache=new Map();
      est.textContent=`Sampling ${picks.length} frames for the palette…`;
      for(const j of picks){ await draw(times[j]); cache.set(j,c.getImageData(0,0,P.ow,P.oht)); await yieldPage(); }
      const enc=new EigenReelGif.Encoder(P.ow,P.oht,EigenReelGif.palette([...cache.values()]));
      for(let j=0;j<P.n;j++){
        let img=cache.get(j); if(img) cache.delete(j); else { await draw(times[j]); img=c.getImageData(0,0,P.ow,P.oht); }
        if(job.cancelled) throw clipCancelled;
        const r=enc.frame(img.data,delay(j)); bytes+=r.bytes; if(r.same) same++;
        tick(); await yieldPage();
      }
      result={blob:enc.finish(), file:name+'.gif'};
    } else if(P.fmt==='webm'){
      const frames=[];
      for(let j=0;j<P.n;j++){ await draw(times[j]); frames.push(await toPNG(out)); tick(); await yieldPage(); }
      h.dispose(); job.h=null;
      est.textContent=`Encoding the video: ${clipFmtTime(P.n/P.fps)}…`;
      result={blob:await encodeVideo(frames,P,job), file:name+'.webm'};
    } else {
      const files=[], pad=n=>String(n).padStart(3,'0'); let prev=null;
      for(let j=0;j<P.n;j++){
        await draw(times[j]);
        const png=new Uint8Array(await (await toPNG(out)).arrayBuffer());
        if(job.cancelled) throw clipCancelled;
        if(prev && prev.length===png.length && prev.every((x,q)=>x===png[q])) same++;
        prev=png; files.push({name:`${v.id}-${pad(j)}.png`, bytes:png}); bytes+=png.length; tick(); await yieldPage();
      }
      const tex=`% ${v.title} on ${site()}, t = ${P.i.toFixed(1)} to ${P.o.toFixed(1)} s: ${link}\n% \\usepackage{animate} in the preamble; unzip the frames next to the .tex file.\n\\animategraphics[loop,autoplay,controls,width=\\linewidth]{${P.fps}}{${v.id}-}{000}{${pad(P.n-1)}}\n`;
      files.push({name:'animate.tex', bytes:new TextEncoder().encode(tex)});
      result={blob:EigenReelGif.zip(files), file:name+'-frames.zip'};
    }
  }catch(e){
    if(e!==clipCancelled && !job.cancelled){ console.warn('eigenreel: clip failed',e.message); msg.textContent=`Recording failed: ${e.message}`; }
  }finally{
    if(result && done>=2 && P.fmt!=='webm') clipCal.set(clipCalKey(v,P),{first:first/(P.ow*P.oht), rest:(bytes-first)/(done-1)/(P.ow*P.oht)}); // the next estimate for this piece starts from this one
    if(job.h) job.h.dispose(); h.dispose(); console.info(`eigenreel: clip ${v.id}: ${result?'finished':'stopped'} after ${done} of ${P.n} frames; recorder copy disposed`);
    if(clipJob===job) clipJob=null;
    prog.hidden=true; $('#clip-cancel').hidden=true; clipSyncUI();
  }
  if(job.cancelled){ msg.textContent='Cancelled. Nothing was saved.'; return; }
  if(!result) return;
  download(result.blob,result.file);
  const secs=(performance.now()-t0)/1000;
  const warn=P.fmt!=='webm'&&same>=P.n-1?' Every frame came out identical: a recorded frame is drawn at an exact t, so a piece that advances by frame time instead of computing from t records as a still.':P.fmt!=='webm'&&same>P.n/2?` ${same} frames repeat the one before.`:'';
  msg.textContent=`Saved ${result.file} (${clipMB(result.blob.size)}, ${P.n} frames, made in ${secs<10?secs.toFixed(1):Math.round(secs)} s).${P.fallback?' This browser cannot record video, so it is a GIF.':''}${warn}`;
  toast(`Saved ${result.file}`);
}
/* the rendered frames (PNG blobs) as a WebM: drawn in order on a page canvas whose stream has no frame rate of its own
   (captureStream(0)), each followed by requestFrame() and held for 1/fps, so the recording keeps the clip's timing */
async function encodeVideo(frames,P,job){
  const cv=document.createElement('canvas'); cv.width=P.ow; cv.height=P.oht;
  const c=cv.getContext('2d'), stream=cv.captureStream(0), track=stream.getVideoTracks()[0], type=videoType();
  const rec=new MediaRecorder(stream,{mimeType:type, videoBitsPerSecond:Math.round(Math.min(8e6,Math.max(1e6,P.ow*P.oht*P.fps*0.12)))});
  const chunks=[]; rec.ondataavailable=e=>{ if(e.data && e.data.size) chunks.push(e.data); };
  const stopped=new Promise(r=>rec.onstop=r);
  const first=await createImageBitmap(frames[0]); c.drawImage(first,0,0); if(first.close) first.close();
  rec.start(); const t0=performance.now(), dt=1000/P.fps;
  const until=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms-performance.now())));
  try{
    for(let j=0;j<frames.length;j++){
      if(job.cancelled) throw clipCancelled;
      if(j){ const bm=await createImageBitmap(frames[j]); c.drawImage(bm,0,0); if(bm.close) bm.close(); }
      if(track.requestFrame) track.requestFrame();
      $('#clip-prog').value=(j+1)/frames.length;
      await until(t0+(j+1)*dt);
    }
  }finally{ if(rec.state!=='inactive') rec.stop(); }
  await stopped; track.stop();
  return new Blob(chunks,{type:type.split(';')[0]});
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
   still is rendered as the clip recorder renders a frame: a hidden copy on a detached canvas, mounted paused at the
   moment's own params and t, then seek + capture, BEAMER_W px wide. The slide on screen is left alone. beamer.js
   writes slides.tex, qr/NN.tex, eigenreel.bib and the README. */
const BEAMER_BOX={w:800,h:500}, BEAMER_W=1600;
let beamerJob=null;
function beamerSource(v){
  const cs=shareChoices(v).filter(c=>c.kind!=='moment'), pick=cs.find(c=>c.kind===shareKind)||cs[0];
  if(pick && pick.kind==='lesson'){ const L=lessonPlay; return {title:L.lesson.title||v.title, items:L.lesson.stops.map(s=>({...s, v:v.id})), url:pick.url, what:'the lesson that is playing'}; }
  if(pick) return {title:filter.name, items:filter.items, url:pick.url, what:'the list that is playing'};
  const ls=moLists(), open=moOf(), c=(open&&open.items.length?open:null)||ls.find(x=>x.items.some(it=>it.v===v.id))||ls.find(x=>x.items.length);
  return c?{title:c.title||'Untitled list', items:c.items, url:Moments.url(c), what:'your list'}:null;
}
/* one moment's own link: the share link of its params and t */
function momentURL(v,it){
  return location.origin+location.pathname+EigenReelSpec.encodeShare({slug:v.id, params:it.bare?{}:it.p, t:it.bare?undefined:(it.t||0)},v.meta);
}
function beamerSync(){
  const sl=shareSl; if(!sl || beamerJob) return; const src=beamerSource(sl.v), b=$('#share-beamer'), d=$('#share-beamer-d');
  b.disabled=!src;
  if(!src){ d.textContent='Export to Beamer makes a zip of slides from a list of moments: play a lesson or a list, or add moments to a list with Add this moment, then export it here.'; return; }
  const n=Math.min(src.items.length,Collection.MAX_ITEMS);
  d.textContent=`Export to Beamer zips ${src.what}, “${src.title||'Untitled list'}”, as ${n} slide${n===1?'':'s'}: the note as the title, a ${BEAMER_W} px still at the moment's own settings, a QR code and its link, plus eigenreel.bib. Compile with lualatex (README.txt).`;
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
      const it=items[j], v=vizById(it.v), NN=EigenReelBeamer.pad(j+1); if(!v) continue;
      msg.textContent=`Rendering moment ${j+1} of ${n}: ${v.title}…`;
      const params=specParams(v,it.bare?{}:it.p), t=it.bare?0:(it.t||0), col={...siteColors(), ...pieceColors(v)}, why=cannotRun(v);
      let still=null;
      if(!why || why.reason==='device'){ // the other device's piece still renders here
        let fail; const err=new Promise((_,rej)=>fail=rej); err.catch(()=>{});
        const h=job.h=hiddenMount(v,params,t,BEAMER_BOX,k,(kind,m)=>fail(new Error(`${kind}: ${m}`)));
        try{
          h.seek(t); const blob=await Promise.race([h.capture(),err]); if(job.cancelled) throw clipCancelled;
          const bm=await createImageBitmap(blob); c.fillStyle=col.bg; c.fillRect(0,0,out.width,out.height); c.drawImage(bm,0,0,out.width,out.height); if(bm.close) bm.close();
          files.push({name:`stills/${NN}.png`, bytes:new Uint8Array(await (await toPNG(out)).arrayBuffer())}); still=`stills/${NN}.png`;
        }catch(e){ if(e===clipCancelled || job.cancelled) throw clipCancelled; failed++; console.warn(`eigenreel: beamer export: moment ${j+1} (${v.id}) has no still: ${e.message}`); }
        finally{ h.dispose(); job.h=null; }
      } else failed++;
      if(job.cancelled) throw clipCancelled;
      const url=momentURL(v,it), code=typeof QR!=='undefined'?QR.encode(url):null;
      if(code) files.push({name:`qr/${NN}.tex`, bytes:enc(EigenReelBeamer.qr(code,url))});
      moments.push({k:j+1, title:v.title, id:v.id, note:it.note, url, still, qr:code?`qr/${NN}.tex`:null, line:EigenReelBeamer.note(clipStripText(v,params,t)[1])});
      if(!pieces.has(v.id)) pieces.set(v.id,{id:v.id, title:v.title, author:v.by, url:location.origin+location.pathname+`#v=${encodeURIComponent(v.id)}`, reviewed:v.lane==='new'?null:v.reviewed});
      prog.value=(j+1)/n; await new Promise(r=>setTimeout(r,0));
    }
    const doc={title:src.title, listURL:src.url, moments, size:`${out.width} × ${out.height}`};
    files.unshift({name:'slides.tex', bytes:enc(EigenReelBeamer.slides(doc))}, {name:'eigenreel.bib', bytes:enc(EigenReelBeamer.bib([...pieces.values()],new Date().getFullYear()))}, {name:'README.txt', bytes:enc(EigenReelBeamer.readme(doc))});
    const slug=(src.title||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'eigenreel-list';
    result={blob:EigenReelGif.zip(files), file:`${slug}-beamer.zip`};
  }catch(e){
    if(e!==clipCancelled && !job.cancelled){ console.warn('eigenreel: beamer export failed',e.message); msg.textContent=`The export failed: ${e.message}`; }
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
/* ---------- "Propose this moment as a preset" ----------
   Captures the moment (params and t), a label and one sentence, and opens a prefilled issue on the registry, where the
   piece's author decides. The proposal is the spec's preset shape {id, label, params, t} (section 4), ready to paste into
   the presets of entries/<slug>.js. Nothing is shown as accepted: the prototype keeps only a local "Your proposals" list
   ('eigenreel:preset-proposals'). Refused: the default state, and a state equal to an authored preset (the same
   params, and a t within 3 s of a preset that has one). */
const PP_KEY='eigenreel:preset-proposals';
const ppLoad=()=>{ const a=EigenReelAPI.proposals.get(PP_KEY,[]); return Array.isArray(a)?a.filter(x=>x&&typeof x.v==='string'&&typeof x.label==='string'&&typeof x.url==='string'&&/^https:\/\/github\.com\//.test(x.url)):[]; };
function ppCapture(v){ const st=Lesson.capture(v,''); return {params:specParams(v,st.p||{}), t:st.t||0}; }
function ppProblem(v,c){
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(EigenReelSpec.isDefault(v.meta,c.params)) return 'That is the default state: change a parameter first, by interacting with the piece or from the explanation. The moment t alone is not a preset.';
  const hit=presetsOf(v).find(p=>same(specParams(v,{...specParams(v,{}), ...(p.params||{})}),c.params) && (p.t==null || Math.abs((c.t||0)-p.t)<3));
  return hit?`That is already the preset “${hit.label}”.`:null;
}
function ppSummary(v,c){
  const nd=EigenReelSpec.nonDefault(v.meta,c.params), bits=specControls(v).filter(k=>k.key in nd).map(k=>`${k.label} ${k.format(c.params[k.key])}`);
  bits.push(`t = ${(c.t||0).toFixed(2)} s`); return bits.join(' · ');
}
const ppId=(v,label)=>{ let b=label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32).replace(/-+$/,'')||'proposed'; const ids=new Set(presetsOf(v).map(p=>p.id)); let id=b, n=2; while(ids.has(id)) id=`${b.slice(0,29)}-${n++}`; return id; };
function ppListHTML(){
  const list=ppLoad();
  if(!list.length) return `<p class="fine">None yet. Proposals you send are listed here, in this browser only.</p>`;
  return `<ol class="ls-stops" role="list">${list.map((x,i)=>{ const o=vizById(x.v);
    return `<li><span class="ls-txt"><b>${esc(x.label)}</b><small>${esc(o?o.title:x.v)} · ${esc(x.at||'')} · sent to the author, not accepted</small><a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open the issue on GitHub</a></span>
      <button class="iconbtn" type="button" data-ppdel="${i}" aria-label="Remove proposal: ${esc(x.label)}">${ICON.close}</button></li>`; }).join('')}</ol>`;
}
function renderPropose(v){
  const c=ppCapture(v);
  $('#pp-state').textContent=`This moment: ${ppSummary(v,c)}.`;
  $('#pp-repo').textContent=registryRepo()?`github.com/${registryRepo()}`:v.repo;
  $('#pp-msg').textContent=''; $('#pp-list').innerHTML=ppListHTML();
  renderPpWho();
}
function renderPpWho(){ const h=myHandle(), w=$('#pp-who'); if(!w) return;
  w.innerHTML=h?`The issue says it comes from <b>${esc(h)}</b>, your handle. <button class="linkbtn" type="button" data-pp-handle>Change it</button>`
    :`No handle set, so the issue names nobody. <button class="linkbtn" type="button" data-pp-handle>Set your handle</button>`; }
$('#pp-who').addEventListener('click',e=>{ const b=e.target.closest('[data-pp-handle]'); if(b) openKeys(b); }); // the keys dialog, over Share
$('#pp-go').onclick=()=>{
  if(!shareSl) return; const v=shareSl.v, msg=$('#pp-msg'), c=ppCapture(v);
  const label=$('#pp-label').value.trim().slice(0,40), note=$('#pp-note').value.trim(), handle=myHandle();
  const bad=ppProblem(v,c)||(!label?'Give it a label with the value in it, like “r = 3.50, a 4-cycle”.':!note?'Add one sentence on what to look for.':null);
  if(bad){ msg.textContent=bad; return; }
  const preset={id:ppId(v,label), label, params:EigenReelSpec.nonDefault(v.meta,c.params), ...(c.t>=0.005?{t:+c.t.toFixed(2)}:{})};
  const fence='```', repo=registryRepo()||'EigenReel/registry';
  const body=`${handle?`${handle} proposes`:'A viewer proposes'} a preset for **${v.title}** (\`entries/${v.id}.js\`), found on ${site()}.\n\n> ${note}\n\nTo accept it, add this to \`presets\` in \`entries/${v.id}.js\`, and link to it from the explanation with \`[${label}](#preset:${preset.id})\`:\n\n${fence}js\n${JSON.stringify(preset)},\n${fence}\n\nOpen this moment: ${shareURL(v)}\n`;
  const url=`https://github.com/${repo}/issues/new?title=${encodeURIComponent('Preset proposal: '+label)}&body=${encodeURIComponent(body)}`;
  const list=ppLoad(); list.unshift({v:v.id, label, note, preset, url, at:new Date().toISOString().slice(0,10)}); EigenReelAPI.proposals.set(PP_KEY,list.slice(0,20));
  $('#pp-list').innerHTML=ppListHTML(); $('#pp-label').value=''; $('#pp-note').value='';
  msg.textContent=`Opening a prefilled issue on github.com/${repo}. The author decides; nothing changes here until they add it.`;
  window.open(url,'_blank','noopener,noreferrer');
};
$('#pp-list').addEventListener('click',e=>{ const b=e.target.closest('[data-ppdel]'); if(!b) return; const list=ppLoad(), x=list.splice(+b.dataset.ppdel,1)[0]; EigenReelAPI.proposals.set(PP_KEY,list); $('#pp-list').innerHTML=ppListHTML(); $('#pp-msg').textContent=x?`Removed “${x.label}” from your list. An issue you opened stays on GitHub.`:''; refocus('#pp-label'); });
$('#share-moment').onclick=e=>{ if(shareSl) openMoments(shareSl.v,e.currentTarget); }; // a second dialog over Share; closing it returns here
$('#share-present').onclick=()=>{ const sl=shareSl, k=shareKind; hideDialog($('#sharemodal')); if(sl){ enterPresent(sl); if(present){ present.linkKind=k; presentQR(); } } }; // the QR follows Share's link pick
function setPaused(on,quiet){
  if(paused===!!on) return; paused=!!on; const pz=pauseLabel();
  $$('[data-act="pause"]').forEach(b=>{ $('.ico',b).innerHTML=pz.icon; $('.lbl',b).textContent=pz.lbl; b.setAttribute('aria-label',pz.aria); });
  syncPlay(); if(!quiet) announce(paused?'Animation paused':'Animation playing');
}
function togglePause(){
  const sl=view==='feed'?curSlide():null;
  if(paused && sl && sl.ended){ seekSl(sl,0); } // a piece that plays once (time.loop false) starts over
  setPaused(!paused);
}
function burst(el,e){
  const r=el.getBoundingClientRect(), p=document.createElement('span'); p.className='pop'; p.innerHTML=ICON.heart;
  p.style.left=(e.clientX-r.left)+'px'; p.style.top=(e.clientY-r.top)+'px'; el.appendChild(p); setTimeout(()=>p.remove(),750);
}
/* Full screen (spec, section 6) is the page's: the slide, its container, goes full screen, never the piece's frame; the
   host hears it through setMode({fullscreen}) (syncFull). Where the API is refused, the page hides its own controls. */
async function enterFull(sl){
  try{ if(sl.el.requestFullscreen){ await sl.el.requestFullscreen(); return; } }catch(_){}
  document.body.classList.add('immersive'); requestAnimationFrame(()=>sl.el.scrollIntoView({block:'start'})); syncFull();
  toast('Full screen is blocked here, so the page controls are hidden instead. Press Esc to exit.');
}
function syncFull(){ for(const sl of slides) if(sl.host){ const f=isFull(sl); if(sl.fs!==f){ sl.fs=f; sl.host.setMode({fullscreen:f}); } } }
function exitFull(){ return present?exitPresent():leaveFull(); }
/* leave full screen completely: goTo stacks one full-screen slide on another, and exitFullscreen pops one at a time */
async function leaveFull(){
  for(let n=0; document.fullscreenElement && n<8; n++) await document.exitFullscreen().catch(()=>{});
  if(document.body.classList.contains('immersive')){ document.body.classList.remove('immersive'); syncFull(); relayout(); requestAnimationFrame(()=>slideEls[activeIdx]&&slideEls[activeIdx].scrollIntoView({block:'start'})); }
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
  else if(act==='explain') openDrawer('explain',sl.v,opener);
  else if(act==='chalkboard'){ if(typeof copyToChalkboard==='function') copyToChalkboard(sl.v); }
  else if(act==='copylink') copyText(shareURL(sl.v),'Link copied');
  else if(act==='moment') openMoments(sl.v,opener);
  else if(act==='distinction'){ openDrawer('explain',sl.v,opener); $('#d-body').scrollTop=0; } // the citation is the first thing in the tab
  else if(act==='question'){ openDrawer('explain',sl.v,opener); $('#d-body').scrollTop=0; } // the pinned question (questions.js) heads the tab
  else if(act==='full') (isFull(sl)?exitFull():enterFull(sl));
  else if(act==='save') toggleSave(sl);
  else if(act==='frame') saveFrame(sl);
  else if(act==='share') openShare(sl,opener);
  else if(act==='more') openMore(sl,opener);
  else if(act==='present') enterPresent(sl);
  else if(act==='focus') setFocus(!focusOn);
}

/* ---------- chips / filter ---------- */
const feedable=()=>VIZ.filter(runsHere); // the catalog on this device (spec, section 1)
function tagCounts(){ const m=new Map(); feedable().forEach(v=>v.tags.forEach(t=>m.set(t,(m.get(t)||0)+1))); return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])); }
function renderChips(){
  const ti=on=>` aria-pressed="${on}" tabindex="${on?0:-1}"`;
  let h=`<button class="chip" type="button" data-chip="all"${ti(filter.type==='all')}>All<span class="n"><span class="sr">,</span> ${feedable().length}</span></button>`;
  h+=`<button class="chip" type="button" data-chip="@foryou"${ti(filter.type==='foryou')}>For you</button>`;
  h+=`<button class="chip" type="button" data-chip="@new"${ti(filter.type==='new')}>New<span class="n"><span class="sr">,</span> ${feedable().filter(v=>v.lane==='new').length}</span></button>`;
  if(sig.saves.length || filter.type==='saved') h+=`<button class="chip" type="button" data-chip="@saved"${ti(filter.type==='saved')}>Saved<span class="n"><span class="sr">,</span> ${sig.saves.length}</span></button>`;
  if(filter.type==='playlist') h+=`<button class="chip" type="button" data-chip="all"${ti(true)} aria-label="Playlist: ${esc(filter.name)}. Clear playlist">▶ ${esc(filter.name)} ✕</button>`;
  h+=tagCounts().map(([t,n])=>`<button class="chip" type="button" data-chip="${esc(t)}"${ti(filter.type==='tag'&&filter.value===t)}>${esc(t)}<span class="n"><span class="sr">,</span> ${n}</span></button>`).join('');
  $('#chips').innerHTML=h;
  if(filter.type==='playlist'){ const box=$('#chips'), c=$('[aria-label^="Playlist"]',box); if(c){ const r=c.getBoundingClientRect(), b=box.getBoundingClientRect(); if(r.right>b.right) box.scrollLeft+=r.left-b.left-16; } } // the playing list's chip in view on a phone
}
function setFilter(f){
  const had=$('#chips').contains(document.activeElement);
  if(lessonPlay) Lesson.exit(true); Collection.restore(filter); // in this order: a lesson inside a list snapshotted the item's params
  filter=f; linked=null; renderChips(); buildFeed();
  if(f.link || new URLSearchParams(location.search).has('collection')){ if(f.link) syncURL(); else try{ history.replaceState(history.state,'',location.pathname+location.hash); }catch(_){} }
  store.set('eigenreel:filter',f.type==='saved'||f.type==='foryou'?f.type:null,true);
  if(had){ const c=$('#chips [aria-pressed="true"]'); c.focus(); c.scrollIntoView({block:'nearest', inline:'nearest'}); }
  const n=slides.length;
  announce(f.type==='demo'?`Live demo of ${f.name}`:f.type==='new'?`Showing ${n} new visualization${n===1?'':'s'}: checked by machine, community review of the mathematics pending`:f.type==='tag'?`Showing ${n} visualization${n===1?'':'s'} tagged ${f.value}`:f.type==='playlist'?`Playing ${n} visualizations from ${f.name}.${collSay()}`
    :f.type==='saved'?`Showing your ${n} saved visualization${n===1?'':'s'}, in the order you saved them`:f.type==='foryou'?`Showing all ${n} visualizations, ordered by the topics you've liked, saved and watched`:`Showing all ${n} visualizations`);
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

/* ---------- drawer ---------- */
/* ---------- modal dialogs: focus in, Tab trapped, Esc closes, focus returns, the rest of #app inert ---------- */
const modals=[];
const focusables=el=>$$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])',el).filter(x=>x.getClientRects().length && !x.closest('[inert]'));
function openModal(el,focusEl,opener){
  if(modals.some(m=>m.el===el)) return;
  leaveInteract(null,true);
  const m={el, opener:opener||document.activeElement, inerted:[], uninerted:[]};
  for(let n=el; n && n.id!=='app'; n=n.parentElement) if(n.inert){ n.inert=false; m.uninerted.push(n); } // a dialog over a dialog (Moments over Share): the one below made this one inert
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
/* The Explanation is the only panel that slides over the feed (spec, section 8). */
function openDrawer(tab,v,opener){
  unpeek(true); dTab='explain'; dViz=v; drawer.classList.add('open'); drawer.inert=false; renderDrawer();
  openModal(drawer,$('#d-body'),opener);
}
function closeDrawer(){ if(!dTab) return; whyExit(true); dTab=null; unpeek(true); drawer.classList.remove('open'); drawer.style.transform=''; closeModal(drawer); drawer.inert=true; }
const isSheet=()=>matchMedia('(max-width:699px)').matches;
/* Peek (docs/ideas/round2/203, phase 1): on phones the sheet covers 82% of the screen, so a drawer action that changes
   the picture (a #preset: or #t: link, a Why-it-works step, Show me) drops it to a 35% peek: handle, header and the
   control just used stay visible, the picture shows above. A tap on the handle or header, or Expand, restores the
   full sheet at the scroll position it had; a swipe down still closes it. */
const PEEK=0.35;
let peekScroll=null;
const peeked=()=>drawer.classList.contains('peek');
const peekPx=()=>Math.round((drawer.offsetParent||document.body).clientHeight*PEEK);
const peekOffset=()=>Math.max(0,drawer.offsetHeight-peekPx());
/* the top of the peeked sheet in viewport coordinates, or null */
function peekTop(){ if(!peeked()) return null; const r=(drawer.offsetParent||document.body).getBoundingClientRect(); return r.bottom-peekPx(); }
function peekDrawer(src){
  if(!dTab || !isSheet()) return;
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

/* ---------- More: the rest of what the slide offers, after Like, Share, Explanation and Full screen ----------
   Save, Pause, Add this moment, Copy to Chalkboard, Present and Focus. On wider screens More (⋯) opens a small menu
   beside the rail (the Explanation is the only panel that slides over the feed, spec section 8). On phones (narrower
   than 700 px, or a landscape phone) the slide shows the picture, a one-line title and the rail, and More opens a sheet
   with the drawer's mechanics (the same dialog focus handling, grab handle and swipe down to close) listing the same
   actions, then the piece's badges, hook, tags, license and repo, and the question of the week. */
const more=$('#more');
let moreSl=null;
$('#more-close').innerHTML=ICON.close;
const mrow=(act,icon,lbl,o={})=>`<button class="mrow${o.on?' on':''}" type="button" data-act="${act}"${o.aria?` aria-label="${esc(o.aria)}"`:''}${o.pressed!=null?` aria-pressed="${o.pressed}"`:''}${o.desc?` aria-describedby="${o.desc}"`:''}><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;
/* the actions, as [act, icon, label, options] */
function moreActs(sl){
  const v=sl.v, pz=pauseLabel(), saved=sig.saves.includes(v.id);
  return [['save',ICON.bookmark,saved?'Saved':'Save',{on:saved, pressed:saved, aria:'Save'}], ['pause',pz.icon,pz.lbl,{aria:pz.aria}],
    ['moment',ICON.bookmark,'Add this moment…',{aria:'Add this moment to a list'}], ['chalkboard',ICON.board,'Copy to Chalkboard',{aria:`Copy ${v.title} to the Chalkboard`}],
    ['present',ICON.present,'Present',{desc:'m-present-d'}], ['focus',ICON.focus,'Focus',{pressed:focusOn, on:focusOn, desc:'m-focus-d'}]];
}
function moreHTML(sl){
  const v=sl.v;
  return `<div class="m-acts" role="group" aria-label="Actions">
      ${moreActs(sl).map(a=>mrow(...a)).join('')}
    </div>
    <p class="fine m-note" id="m-present-d">Present is full screen for a talk: step the moments or presets with the arrow keys or a clicker.</p>
    <p class="fine m-note" id="m-focus-d">Focus shows only the picture while you scroll the feed; double-tap still likes. Tap the top edge for the top bar.</p>
    <section class="m-about" aria-labelledby="m-about-h">
      <h3 class="flabel" id="m-about-h">About this piece</h3>
      <div class="who">${laneBadge(v)}${distBadge(v)}</div>
      <p class="hook">${esc(v.hook)}</p>
      <div class="tags">${v.tags.map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
      <div class="meta"><span class="oss">open source · ${esc(v.license)}</span><span>${esc(v.repo)}</span></div>
    </section>
    ${qwCard(v)}`;
}
/* the menu beside the rail (wider screens): the menu button pattern, as the top bar's */
let slMenu=null; // {sl, el, btn}
function openSlideMenu(sl,btn){
  closeSlideMenu();
  const el=document.createElement('div'); el.className='menu slmenu'; el.setAttribute('role','menu'); el.setAttribute('aria-label',`More: ${sl.v.title}`);
  el.innerHTML=moreActs(sl).map(([act,icon,lbl,o])=>`<button class="mi" type="button" role="${o.pressed!=null?'menuitemcheckbox':'menuitem'}" data-act="${act}" tabindex="-1"${o.pressed!=null?` aria-checked="${o.pressed}"`:''}><span class="mi-dot" aria-hidden="true">${icon}</span><span><b>${esc(lbl)}</b></span></button>`).join('');
  btn.parentElement.appendChild(el); btn.setAttribute('aria-expanded','true');
  slMenu={sl, el, btn};
  el.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); e.preventDefault(); return closeSlideMenu(true); } if(e.key==='Tab') return closeSlideMenu(false); rove(e,$$('.mi',el),true); });
  el.addEventListener('focusout',e=>{ if(e.relatedTarget && !el.contains(e.relatedTarget) && e.relatedTarget!==btn) closeSlideMenu(false); });
  $('.mi',el).focus();
}
function closeSlideMenu(back){ const m=slMenu; if(!m) return; slMenu=null; m.el.remove(); m.btn.setAttribute('aria-expanded','false'); if(back) m.btn.focus({preventScroll:true}); }
function renderMore(keep){
  const sl=moreSl; if(!sl) return; const v=sl.v;
  $('#more-title').textContent=v.title; $('#more-k').innerHTML=`More · ${userLink(sl.v.by)}`;
  const b=$('#more-body'); b.innerHTML=moreHTML(sl); typeset($('.qcard',b));
  if(keep) refocus(`[data-act="${keep}"]`,b);
}
function openMore(sl,opener){
  if(!sl || moreSl) return;
  if(!phoneUI()){ const b=opener&&opener.closest&&opener.closest('[data-act="more"]')||$('[data-act="more"]',sl.el); if(slMenu&&slMenu.sl===sl) return closeSlideMenu(true); return b&&openSlideMenu(sl,b); }
  if(dTab) closeDrawer();
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

/* ---------- Focus (the menu, More): the feed with only the pictures ----------
   For scrolling, not for talks (that is Present): the rail, caption, top bar, chips and callouts hide, the box takes the
   slide (layoutBox) and an engageable piece shows a 32 px target in a corner outside the box. Scrolling, double-tap to
   like and every key still work. A tap on the very top edge, or a two-finger tap, brings the top bar back for a few
   seconds (with Leave Focus in it); Esc leaves. The choice is kept in localStorage ('eigenreel:focus'); it is off by default. */
let focusOn=store.get('eigenreel:focus',false)===true, focusBarTimer=0, focusHintTimer=0;
const focusing=()=>document.body.classList.contains('focus');
function syncFocus(){
  const on=focusOn && view==='feed' && !EMBED, was=focusing();
  document.body.classList.toggle('focus',on); if(!on) focusBar(false);
  $$('[data-focus-toggle]').forEach(b=>b.setAttribute('aria-checked',String(focusOn)));
  if(was!==on){ if(on) leaveInteract(null,true); relayout(); }
  return on;
}
function focusHint(){
  const h=$('#focus-hint'); h.textContent=coarse()?'Focus · tap top to exit':'Focus · Esc to exit'; h.classList.add('on');
  clearTimeout(focusHintTimer); focusHintTimer=setTimeout(()=>h.classList.remove('on'),3000);
}
function setFocus(on){
  on=!!on; if(on===focusOn) return; focusOn=on; store.set('eigenreel:focus',on);
  if(on && dTab) closeDrawer();
  if(syncFocus()) focusHint(); else { clearTimeout(focusHintTimer); $('#focus-hint').classList.remove('on'); }
  announce(on?`Focus on: only the pictures. Scroll as usual; double-tap to like. ${coarse()?'Tap the top edge for the top bar.':'Press Escape to leave.'}`:'Focus off.');
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
  feed.addEventListener('touchstart',e=>{ if(!focusing() || interSl) return; if(e.touches.length===2){ const [x,y]=mid(e); tf={t:performance.now(), x, y}; } else if(e.touches.length>2) tf=null; },{passive:true});
  feed.addEventListener('touchmove',e=>{ if(!tf || e.touches.length<2) return; const [x,y]=mid(e); if(Math.hypot(x-tf.x,y-tf.y)>20) tf=null; },{passive:true});
  feed.addEventListener('touchend',e=>{ if(!tf || e.touches.length) return; const ok=performance.now()-tf.t<350; tf=null; if(ok) focusBar(true); },{passive:true});
}
/* Reviewer credit (docs/ideas/17-reviewer-credit.md): the Feed-lane footer names who checked the mathematics, with profile links. */
const andList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const reviewersOf=v=>v.lane!=='new'&&Array.isArray(v.reviewers)?v.reviewers.filter(h=>typeof h==='string'&&h!==v.by):[];
const reviewersLine=v=>{ const r=reviewersOf(v); return r.length?`Mathematics checked by ${andList(r.map(h=>userLink(h)))} in ${esc(v.reviewed)}.`:'Community reviewed.'; };
/* The Explanation (spec, section 7): entries/<slug>.md through md() (DOMPurify, then KaTeX with EigenReelTeX.OPTS);
   its #preset: and #t: links drive the slide behind the panel (liveify), and every other link opens in a new tab. */
function renderDrawer(){
  if(why && (dTab!=='explain' || why.v!==dViz || explainRaw)) whyExit(true);
  const v=dViz; $('#d-kicker').innerHTML=`Explanation · ${userLink(v.by)} · ${esc(v.license)}`; $('#d-title').textContent=v.title;
  $('#d-tags').innerHTML=(v.tags||[]).map(tg=>`<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('');
  const body=$('#d-body'); body.setAttribute('aria-labelledby','d-title');
  if(EigenReelHost.isBlocked(v.id)){ body.innerHTML=`<p class="fine">${esc(CARD.blocked[0])}. ${esc(CARD.blocked[1])}</p>`; return; }
  const text=String(v.md||'').trim()?v.md:`${v.hook}\n\n*Its author has not written an explanation yet.*\n`;
  body.innerHTML=`${qwBlock(v)}${answersLine(v)}${distBlock(v)}<div class="seg" role="group" aria-label="Explanation format"><button type="button" data-raw="0" aria-pressed="${!explainRaw}">Rendered</button><button type="button" data-raw="1" aria-pressed="${explainRaw}">${esc(v.id)}.md</button></div>
      ${explainRaw?`<pre class="raw">${esc(text)}</pre>`:`<article class="md">${md(touchCopy(text))}</article>`}
      <p class="fine">Written by ${esc(v.meta.author&&v.meta.author.name||v.by)}${v.by&&v.by[0]==='@'?` (${userLink(v.by)})`:''}. ${v.lane==='new'?'Checked by machine.':reviewersLine(v)} ${todo('how to suggest an edit to a piece')}</p>
      ${qaBlock(v)}`;
  const art=$('article.md',body);
  typeset(art); bindQweek(v,body); bindQa(v,body);
  if(art){ whyInit(v,art); liveify(art,v); }
}

const kbText=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(0)} KB`:`${(n/1048576).toFixed(1)} MB`;
const MOD_KEY=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent)?'⌘':'Ctrl';
/* ---------- the catalog's pieces, and the registry's (demo server only) ----------
   Every piece has the catalog's shape (scripts/gen-catalog.mjs): {id, title, hook, alt, author:{name, handle?}, license,
   repo, reviewed, reviewers?, lane?, likes, tags, colors, meta, source, md, wasm?}, where meta is what
   EigenReelSpec.read() read from the source, as data. by is the byline: the author's @handle, or their name.
   The demo server's /api/registry lists the entries merged in the registry (entries/<slug>.js, after two approvals),
   each with its code as written, its metadata, colors, explanation and .wasm (a data: URL). singleViz gives them the
   same shape; they are reviewed, so they are in the Feed lane, and like every piece they run in the sandbox. An id the
   bundled catalog already has stays the catalog's. */
const MONTH=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const byOf=v=>v.author&&v.author.handle?'@'+String(v.author.handle).replace(/^@/,''):String(v.author&&v.author.name||'');
function prepViz(v){ v.by=byOf(v); if(!Array.isArray(v.tags)) v.tags=[]; if(!v.colors) v.colors={}; return v; }
const REPO_RE=/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
/* the registry repository: the demo server's REGISTRY_REPO, else REGISTRY in config.js */
function registryRepo(){
  if(EigenReelAPI.registry.repo && REPO_RE.test(EigenReelAPI.registry.repo)) return EigenReelAPI.registry.repo;
  const R=typeof REGISTRY!=='undefined'?REGISTRY:null; return R && typeof R.repo==='string' && REPO_RE.test(R.repo)?R.repo:null;
}
const registryBranch=()=>EigenReelAPI.registry.repo?EigenReelAPI.registry.branch||'main':(typeof REGISTRY!=='undefined'&&REGISTRY&&REGISTRY.branch)||'main';
function singleViz(item){
  const id=item.slug, meta=item.meta;
  if(typeof id!=='string' || !EigenReelSpec.SLUG_RE.test(id) || !meta || typeof meta!=='object' || typeof item.code!=='string') return null;
  if(VIZ.some(v=>v.id===id)){ console.info(`eigenreel: registry entry ${id} has the id of a catalog piece; showing the catalog's`); return null; }
  const problems=EigenReelSpec.validateMeta(meta,item.colors||{});
  if(problems.length){ console.info(`eigenreel: skipping registry entry ${id}: ${problems[0].field}: ${problems[0].message}`); return null; }
  const d=new Date(String(item.createdAt||'').replace(' ','T')+'Z'), when=isNaN(d)?'':`${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`, repo=registryRepo();
  const path=String(item.registryPath||`entries/${id}.js`);
  return prepViz({id, title:meta.title, hook:meta.hook, alt:meta.alt, author:{name:meta.author&&meta.author.name||item.author&&item.author.handle||'', ...(item.author&&item.author.handle?{handle:item.author.handle}:{})},
    license:meta.license, repo:repo?`github.com/${repo}/blob/${registryBranch()}/${path}`:`the registry, ${path}`, reviewed:when, reviewers:[], likes:0,
    tags:meta.tags, colors:item.colors||{}, meta, source:item.code, md:typeof item.explanation==='string'?item.explanation:'',
    ...(typeof item.wasm==='string'&&/^data:application\/wasm;base64,/.test(item.wasm)?{wasm:item.wasm}:{}), reg:{pr:item.registryPr||null, path}});
}
function loadRegistry(){ EigenReelAPI.registry.singles().forEach(it=>{ const v=singleViz(it); if(v) VIZ.push(v); }); }
VIZ.forEach(prepViz);
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
function stillFor(v,t){
  const s=getSettings(v), box={x:12,y:12,w:STILL-24,h:STILL-24}, why=cannotRun(v);
  const key=JSON.stringify([v.id,curStyle,s.params,+t.toFixed(2)]);
  if(!stills.has(key)){
    if(why && why.reason!=='device') stills.set(key,Promise.reject(new Error(why.message)));
    else stills.set(key,EigenReelHost.poster(pieceOf(v),{w:STILL,h:STILL,dpr:1,box,params:s.params,t,device:DEVICE,site:siteColors()}).then(jpegURL));
    stills.get(key).catch(()=>stills.delete(key));
  }
  return stills.get(key);
}

/* ---------- your lists of moments, in this browser (the old docs/module-api.md, "Moments"; kept for {params, t}) ----------
   One store, 'eigenreel:moments': [{id, title, intro, items}], items in the collection form. The first load builds it from
   the two stores it replaces: every list in 'eigenreel:collections' and every piece's "Your lesson" draft
   ('eigenreel:lesson:<id>'), which becomes a list of that piece's moments. The old keys are left as they were. */
const Moments={
  KEY:'eigenreel:moments',
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
    let a=EigenReelAPI.lists.get();
    if(!Array.isArray(a)){ a=Moments.migrate(); EigenReelAPI.lists.put(a); }
    return a.map((o,k)=>{ const c=Collection.parse(o,'saved list',true); return c&&{id:typeof o.id==='string'?o.id:'m'+k, title:c.title, intro:c.intro, items:c.items}; }).filter(Boolean);
  },
  save(list){ EigenReelAPI.lists.put(list.map(c=>({id:c.id, ...Collection.compact(c)}))); },
  /* one piece, at most 8 moments, no intro, no mode: the lesson link (?v=<id>&lesson=), which keeps v= for the piece's
     link preview; anything else is the collection link (?collection=). Both are the links made before 201. */
  oneRun:c=>c.items.length>0 && c.items.length<=Lesson.MAX_STOPS && !c.intro && c.items.every(it=>it.v===c.items[0].v && !it.bare),
  url(c){ return Moments.oneRun(c)?Lesson.url(vizById(c.items[0].v),{title:c.title, stops:c.items}):Collection.url(c); },
};
let moV=null, moSel=null, moList=null, moNote='';
const moLists=()=>moList||(moList=Moments.load());
const moOf=()=>moLists().find(c=>c.id===moSel)||null;
function stopSummary(v,st){
  const bits=specControls(v).filter(c=>st.p && c.key in st.p).map(c=>`${c.label} ${c.format(st.p[c.key])}`);
  bits.push(`t = ${(st.t||0).toFixed(2)} s`); return bits.join(' · ');
}
/* ---------- the Moments panel (from Save's toast, More and Share): add this moment to a list, edit, copy one link ---------- */
function openMoments(v,opener,note){
  moV=v; if(!moOf()) moSel=moLists().length?moList[0].id:'new';
  moNote=note||''; $('#mo-h').textContent=v.title; renderMoments(); showDialog('#momentsmodal','#mo-note',opener);
}
function moItemsHTML(c){
  if(!c || !c.items.length) return `<p class="fine">No moments yet.</p>`;
  return `<ol class="ls-stops" role="list">${c.items.map((it,i)=>{ const v=vizById(it.v), same=i>0 && c.items[i-1].v===it.v;
    return `<li${same?' class="same"':''}><span class="ls-i" aria-hidden="true">${i+1}</span><span class="ls-txt"><b>${it.note?texText(it.note):'(no note)'}</b><small>${esc(v.title)} · ${esc(it.bare?'as the feed plays it':stopSummary(v,Lesson.compact(v,it)))}${same?' · same slide':''}</small></span>
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
    <p class="fine" id="mo-by">By <b data-hd-now>${esc(myHandle()||'you')}</b>, your handle (set on My Account, which lists all your lists).</p>
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
function renderThumb(cv,v,t,tries=0){
  const r=cv.getBoundingClientRect(); if(!r.width || !v) return;
  const d=dpr(); cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  const ctx=cv.getContext('2d'), B={x:10,y:10,w:r.width-20,h:r.height-20}, col={...siteColors(), ...pieceColors(v)}; t=t??Math.min(6,lengthOf(v));
  const params=getSettings(v).params, why=cannotRun(v), key=JSON.stringify([v.id,curStyle,cv.width,cv.height,params,t]);
  ctx.fillStyle=col.bg; ctx.fillRect(0,0,cv.width,cv.height);
  if(why && why.reason!=='device') return; // the poster would need what this browser does not have
  if(!posters.has(key)) posters.set(key,EigenReelHost.poster(pieceOf(v),{w:r.width,h:r.height,dpr:d,box:B,params,t,device:DEVICE,site:siteColors()}).then(b=>createImageBitmap(b)));
  posters.get(key).then(bm=>{ if(cv.isConnected && cv.width===bm.width) ctx.drawImage(bm,0,0); },e=>{ posters.delete(key); console.warn('eigenreel: poster failed for',v.id,e.message);
    // the GPU sometimes drops a context under load, and is fine seconds later: a GPU piece tries again rather than staying blank
    if(tries<2 && v.meta.context==='webgl2') setTimeout(()=>{ if(cv.isConnected) renderThumb(cv,v,t,tries+1); },tries?6000:2000); });
}
function paintThumbs(root){ requestAnimationFrame(()=>$$('canvas[data-thumb]',root).forEach(cv=>renderThumb(cv,vizById(cv.dataset.thumb)))); }

/* ---------- browse ---------- */
function renderBrowse(){
  const el=$('#browse');
  if(!el.firstChild){
    el.innerHTML=`<div class="wrap">
      <div class="pagehead"><div class="kicker">Catalog · ${VIZ.length} visualizations</div><h1>Browse the collection</h1>
        <p>${todo('Browse page intro: what the catalog is and what every piece has been through')}</p>
        <button class="row wantrow" type="button" data-wanted><strong>Wanted →</strong><span class="fine">${WANTED.filter(c=>c.status!=='answered').length} open requests. ${todo('one line on the Wanted page')}</span></button></div>
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
      <div class="card-body"><h3>${esc(v.title)}</h3><div class="by">${userLink(v.by,true)} · <span title="${esc(LIKES_NOTE)}">♥ ${fmtK(v.likes+(EigenReelAPI.server&&v.liked?1:0))}</span></div>
        <div class="tline">${v.tags.map(t=>'#'+esc(t.toLowerCase())).join('  ')}</div>
        <div class="meta"><span class="oss">${esc(v.license)}</span><span>${v.lane==='new'?'checked by machine':`reviewed ${esc(v.reviewed)}`}</span></div></div></button>`;
}
function renderCatGrid(){
  const list=VIZ.filter(v=>[...catTags].every(t=>v.tags.includes(t)) && (!catQuery || (v.title+' '+v.tags.join(' ')+' '+v.by+' '+(v.author&&v.author.name||'')+' '+v.hook).toLowerCase().includes(catQuery)));
  $('#cat-grid').innerHTML=(list.length?list.map(v=>cardHTML(v)).join('')
    : `<p class="empty">No visualizations match. Clear a topic or try a shorter search.</p>`)
    + `<div class="card submit"><div class="card-body"><div class="kicker">Contribute</div><h3>Submit a visualization</h3>
        <p>${todo('Browse page submit card: what a submission needs, in a few bullets')}</p>
        <div class="btnrow"><button class="btn" type="button" data-view="submit">How to submit</button><a class="btn ghost" href="docs/submission-spec-slop.md" data-doc="submission-spec-slop">Read the submission spec</a></div></div></div>`;
  paintThumbs($('#cat-grid'));
}

/* ---------- blog ---------- */
function renderBlog(){
  const el=$('#blog');
  if(!blogPost){
    el.innerHTML=`<div class="wrap">
      <div class="pagehead"><div class="kicker">Blog</div><h1>${todo('Blog page title')}</h1><p>${todo('Blog page intro: what gets posted here')}</p></div>
      <div class="blog-grid"><div class="posts">${POSTS.length?'':`<p>${todo('blog posts (Markdown files in demo/content/blog/ on the server, or POSTS in posts.js for the static site)')}</p>`}${POSTS.slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).map(p=>`<button class="post" type="button" data-post="${p.id}">
          <canvas data-thumb="${p.vizIds[0]||'times-table'}" aria-hidden="true"></canvas>
          <div class="pb"><div class="pmeta">${p.date} · ${p.read}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p><div class="pmeta">${postAuthor(p,true)}${p.vizIds.length?` · ${p.vizIds.length} visualizations`:''}</div></div></button>`).join('')}</div>
        <aside class="side"><div class="kicker">Newsletter</div><h2>${todo('newsletter name')}</h2><p>${todo('newsletter pitch: what is in each issue')}</p>${nlForm('side')}</aside>
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
const DOCS=['submission-spec-slop','sandbox','review-pipeline','bounties','distinctions','questions'];
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
  // links between the guides (sandbox.md, docs/x.md) stay in the Docs view
  $$('.md a[href]',el).forEach(a=>{ const n=docName(a.getAttribute('href')); if(n) a.dataset.doc=n; else if(/^https?:/.test(a.getAttribute('href'))){ a.target='_blank'; a.rel='noopener noreferrer'; } });
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

/* ---------- Submit (spec, section 11): how a piece reaches the registry ----------
   Every submission is a pull request from the author's own fork of the registry; the site holds no GitHub credentials
   and never pushes, opens or merges anything. This page says how: export from the Chalkboard (or write the files by
   hand), fork the registry, add the files on a branch, open a pull request. The registry is the demo server's
   REGISTRY_REPO, else REGISTRY in config.js. */
function renderSubmit(){
  const el=$('#submit'), repo=registryRepo(), branch=registryBranch(), gh=repo?`https://github.com/${repo}`:null;
  const link=(href,text)=>href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`:esc(text);
  el.innerHTML=`<div class="wrap sub">
    <div class="pagehead"><div class="kicker">Submit</div><h1 tabindex="-1">Submit a visualization</h1>
      <p>${todo('Submit page intro: what a piece is (entries/<slug>.js + .md) and that it arrives as a pull request from your fork')}</p></div>
    <ol class="sub-steps">
      <li><b>Write it and check it</b> on the <button class="linkbtn" type="button" data-view="chalkboard">Chalkboard</button>, or by the ${docLink('submission-spec-slop','submission spec')}. ${todo('step 1')}</li>
      <li><b>Fork the registry.</b> ${gh?`${link(gh+'/fork','Fork '+repo)}`:'Fork the registry on GitHub'}. ${todo('step 2')}</li>
      <li><b>Add your files on a branch.</b> ${todo('step 3')}</li>
      <li><b>Open a pull request</b> ${gh?`to ${link(gh+'/compare/'+encodeURIComponent(branch),repo+' on '+branch)}`:'to the registry'}. ${todo('step 4: what happens after, who reviews, when it goes live')}</li>
    </ol>
    <p class="fine">${todo('authorship and later changes')} See also ${docLink('review-pipeline','the review pipeline')} and ${docLink('sandbox','the sandbox')}. <button class="linkbtn" type="button" data-wanted>Wanted</button></p>
  </div>`;
}


/* ---------- views ---------- */
function showView(v){
  view=v;
  if(v!=='user' && v!=='wanted' && v!=='docs' && v!=='yours') $$('.tab').forEach(t=>{ const on=t.dataset.view===v; t.setAttribute('aria-selected',on); t.tabIndex=on?0:-1; if(on) t.scrollIntoView({block:'nearest', inline:'nearest'}); }); // a profile or the Wanted page keeps the tab it was opened from
  $('#chips').hidden=v!=='feed'; $('#feednav').hidden=v!=='feed'; feed.classList.toggle('away',v!=='feed');
  $('#admin').hidden=v!=='admin'; $('#browse').hidden=v!=='browse'; $('#blog').hidden=v!=='blog'; $('#submit').hidden=v!=='submit'; $('#user').hidden=v!=='user'; $('#wanted').hidden=v!=='wanted'; $('#docs').hidden=v!=='docs'; $('#yours').hidden=v!=='yours'; $('#chalkboard').hidden=v!=='chalkboard';
  if(v!=='chalkboard' && typeof boardStop==='function') boardStop(); // an older chalkboard.js stops its stage here
  if(v!=='feed'){ closeDrawer(); closeSlideMenu(); exitFull(); leaveInteract(null,true); if(lessonPlay) Lesson.exit(true); }
  if(v==='browse') renderBrowse();
  if(v==='blog') renderBlog();
  if(v==='submit') renderSubmit();
  if(v==='user') renderUser();
  if(v==='wanted') renderWanted();
  if(v==='docs') renderDocs();
  if(v==='yours') renderYours();
  if(v==='admin') renderAdmin();
  if(v==='chalkboard' && typeof renderChalkboard==='function') renderChalkboard();
  syncFocus(); // Focus is for the feed; the other views keep their bar
  paintAccents(); // only the feed follows the piece on screen
  syncPlay();
}
function jumpToViz(id){
  const v=vizById(id); if(!v) return;
  if(PLAYGROUND.includes(v) || STARTERS.includes(v)){ if(typeof copyToChalkboard==='function') copyToChalkboard(v); return; } // yours: it opens on the Chalkboard, never in the feed
  if(!feedList().includes(v)){ setFilter({type:'all'}); if(!runsHere(v)){ linked=v; buildFeed(); } } // the other device's piece: shown first, as a card
  const i=slides.findIndex(x=>x.v===v); if(i<0) return;
  showView('feed'); requestAnimationFrame(()=>{ slideEls[i].scrollIntoView({block:'start'}); feed.focus({preventScroll:true}); });
}

/* ---------- keyboard shortcuts dialog, signals, newsletter forms ---------- */
function openKeys(opener){ renderSignals(); $('#hd-keys').innerHTML=handleEditorHTML('hd-k'); showDialog('#keysmodal',null,opener); }
function renderSignals(){
  const w=Object.values(sig.watch).reduce((a,b)=>a+b,0), n=(x,one)=>`${x} ${one}${x===1?'':'s'}`;
  $('#sig-sum').textContent=`Stored only in this browser: ${n(sig.likes.length,'like')}, ${n(sig.saves.length,'saved piece')}, ${w<60?n(Math.round(w),'second'):n(Math.round(w/60),'minute')} watched.`;
}
/* likes, saves and watch time: from Reset my signals here and on My Account */
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
  sig.watch[sl.v.id]=(sig.watch[sl.v.id]||0)+1; if(++watchTicks%5===0) EigenReelAPI.signals.set(sig.watch);
},1000);
addEventListener('pagehide',()=>EigenReelAPI.signals.set(sig.watch));
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
  f.outerHTML=`<div class="nl-ok" role="status" tabindex="-1"><strong>You're subscribed to ${esc(names)}.</strong><span class="fine">This is a mockup, so nothing was actually sent.</span></div>`;
  refocus('.nl-ok',host); // the form that had focus is gone
});

/* ---------- the theme: tokens, live pieces and thumbnails, repainted when the mode changes ---------- */
SiteMode.onChange=m=>{ curStyle=m==='light'?'light':'night'; syncModeItem(); applyTheme(); };
function syncModeItem(){ const l=SiteMode.get()==='light', b=$('[data-mode-toggle] b'), s=$('[data-mode-toggle] small'); b.textContent=l?'Dark mode':'Light mode'; s.textContent=l?'Switch to the dark look':'Switch to the light look'; }
function applyTheme(){
  document.documentElement.dataset.style=curStyle;
  paintAccents(); // the accents are clamped against the backgrounds
  relayout();
  // a piece whose COLORS has no bg or fg draws with the site's (opts.site): it starts again in the new look, at the same t
  for(const sl of slides){ const c=pieceColors(sl.v); if(sl.host && (!c.bg || !c.fg)){ unmount(sl); mountSlide(sl); } }
  if(view==='browse') renderCatGrid();
  if(view==='blog') paintThumbs($('#blog'));
  if(view==='user') paintThumbs($('#user'));
  if(view==='yours') paintThumbs($('#yours'));
  if(view==='chalkboard' && typeof renderChalkboard==='function') renderChalkboard();
}
addEventListener('resize',()=>readPads());
document.addEventListener('visibilitychange',syncPlay);
document.addEventListener('fullscreenchange',()=>{
  const fs=document.fullscreenElement, i=fs?slideEls.indexOf(fs):-1;
  if(i>=0 && i!==activeIdx){ activeIdx=i; onActiveChange(true); }
  syncPlay(); // a full-screen slide plays although the feed no longer sees it
  syncFull(); // the host hears it: setMode({fullscreen})
  if(!fs && slideEls[activeIdx]) requestAnimationFrame(()=>{ feed.scrollTop=slideEls[activeIdx].offsetTop; }); // back in the flow, on the slide that was full screen
  relayout();
});
new ResizeObserver(()=>{ document.documentElement.style.setProperty('--top-h',$('#topbar').offsetHeight+'px'); relayout(); }).observe($('#topbar'));

/* the menu (menu button pattern): My Account, Focus, Light or Dark mode, New, shortcuts. Its button is the demo's account
   pill: your handle's picture and name once you have one (the name hides on phones), else a menu icon. */
const MENU_ICO='<svg class="i" viewBox="0 0 24 24"><path d="M4.5 7h15M4.5 12h15M4.5 17h15"/></svg>';
function syncMeBtn(){
  const h=myHandle(), b=$('#style-btn');
  $('#me-pic').innerHTML=h?pfp(h,'sm'):MENU_ICO; $('#me-name').textContent=h||'Menu';
  b.classList.toggle('has-pfp',!!h); b.setAttribute('aria-label',h?`${h}: menu`:'Menu');
}
const styleBtn=$('#style-btn'), styleMenu=$('#style-menu'), menuItems=()=>$$('.mi',styleMenu).filter(i=>!i.hidden && getComputedStyle(i).display!=='none');
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
  if(t.closest('[data-mode-toggle]')){ closeMenu(true); SiteMode.toggle(); return announce(SiteMode.get()==='light'?'Light mode':'Dark mode'); }
  if(slMenu && !slMenu.el.contains(t) && !t.closest('[data-act="more"]')) closeSlideMenu(false);
  const nv=t.closest('[data-new-viz]'); if(nv){ closeMenu(false); if(typeof openNew==='function') return openNew(); return showView('chalkboard'); } // the Chalkboard's own New when it has one
  if(t.closest('[data-focus-toggle]')){ closeMenu(true); return setFocus(!focusOn); }
  if(t.closest('[data-focus-exit]')) return setFocus(false);
  if(t.closest('.skip')){ e.preventDefault(); if(view!=='feed') showView('feed'); return feed.focus({preventScroll:true}); }
  const cm=t.closest('[data-close-modal]'); if(cm) return hideDialog(cm.closest('.modal'));
  if(t.classList.contains('modal')) return hideDialog(t);
  // composedPath, not closest: a drawer button may have re-rendered (and detached) itself before the click reaches here
  const path=e.composedPath();
  if(dTab && !path.includes(drawer) && !t.closest('.modal') && !t.closest('#toast')) return closeDrawer();
  if(moreSl && !path.includes(more) && !t.closest('.modal') && !t.closest('#toast')) return closeMore();
  if(dTab && t.closest('#d-tags [data-tag]')) closeDrawer(); // a tag under the Explanation's title: the filtered feed shows
  if(moreSl && t.closest('[data-tag],[data-user]')) closeMore(); // a tag or a profile in the sheet: the filtered feed or the page shows
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
  const lv=t.closest('[data-live]'); if(lv && dViz){ e.preventDefault(); const L=EigenReelSpec.liveLink(dViz.meta,lv.dataset.live); if(L && L.kind!=='error'){ runLive(dViz,L,lv.textContent.trim()); peekDrawer(lv); } return; }
  const wy=t.closest('[data-why]'); if(wy){ const a=wy.dataset.why; if(a==='done'){ whyExit(); return refocus('[data-why="start"]',$('#d-body')); } whyGo(a==='start'?0:why?why.i+(a==='next'?1:-1):0); if(a==='start') refocus('[data-why="next"]',$('#d-body')); return; }
  const vz=t.closest('[data-viz]'); if(vz) return jumpToViz(vz.dataset.viz);
  const ch=t.closest('[data-chip]'); if(ch){ const c=ch.dataset.chip; return setFilter(c==='all'?{type:'all'}:c==='@saved'?makeFilter('saved'):c==='@foryou'?makeFilter('foryou'):c==='@new'?makeFilter('new'):{type:'tag',value:c}); }
  const ct=t.closest('[data-cattag]'); if(ct){ const g=ct.dataset.cattag; catTags.has(g)?catTags.delete(g):catTags.add(g); renderBrowse(); return refocus(`[data-cattag="${CSS.escape(g)}"]`); }
  const tg=t.closest('[data-tag]'); if(tg) return setFilter({type:'tag', value:tg.dataset.tag});
  if(t.closest('[data-go="top"]')) return goTo(0);
  const rw=t.closest('[data-raw]'); if(rw){ explainRaw=rw.dataset.raw==='1'; renderDrawer(); return refocus(`[data-raw="${rw.dataset.raw}"]`); }
  const act=t.closest('[data-act]'); if(!act) return;
  if(more.contains(act)) return moreAct(act.dataset.act,act);
  const sl=slides.find(s=>s.el.contains(act));
  if(slMenu && slMenu.el.contains(act)){ const a=act.dataset.act, b=slMenu.btn; if(a==='save'||a==='pause'||a==='focus'){ handleAct(a,sl,b); return openSlideMenu(sl,b); } closeSlideMenu(false); return handleAct(a,sl,b); } // Save, Pause and Focus toggle in place
  return handleAct(act.dataset.act, sl, act);
});
$('#prev').onclick=()=>goTo(activeIdx-1);
$('#next').onclick=()=>goTo(activeIdx+1);
$('#d-close').onclick=closeDrawer;
/* Keys (spec, section 6): the site's own hotkeys are only the arrow keys and Page Up / Page Down, which move through the
   feed (← → step the moments of a lesson or list while one plays), and Space, which pauses. Esc closes menus, dialogs
   and panels, and leaves interact mode, Focus and full screen; Enter on an interactive piece's canvas enters interact
   mode. While interacting, every other key belongs to the piece. */
document.addEventListener('keydown',e=>{
  if(embedSl) return embedSl.embedKey(e); // embed mode has its own few keys and no feed
  const top=modals[modals.length-1];
  if(present && !top && view==='feed' && presentKey(e)) return;
  if(e.key==='Escape' && $('#present-prompt')){ e.preventDefault(); return hidePresentPrompt(); }
  if(e.key==='Escape' && slMenu){ e.preventDefault(); return closeSlideMenu(true); }
  if(interSl && !top){ if(e.key==='Escape'){ e.preventDefault(); leaveInteract(interSl); } return; } // the piece has the keys (in its frame); the page binds none meanwhile
  if(e.key==='Enter' && !top){ const sl=slides.find(x=>x.canvas===e.target); if(sl && canInteract(sl)){ e.preventDefault(); return enterInteract(sl); } }
  if(e.key==='Escape'){ if(!styleMenu.hidden) return closeMenu(true); if(top) return closeTopModal(); if(document.body.classList.contains('immersive')) return exitFull(); if(focusing()) return setFocus(false); if(view==='user') return closeUser(); if(view==='wanted') return closeWanted(); if(view==='yours') return closeYours();
    if(lessonPlay && view==='feed' && curSlide() && curSlide().v===lessonPlay.v) return Lesson.exit(); return; }
  if(e.key==='Tab' && top) return trapTab(e,top.el);
  if(top || (e.target.closest && e.target.closest('input,select,textarea,[role="menu"],[role="toolbar"],[role="tablist"],[contenteditable]')) || e.metaKey || e.ctrlKey || e.altKey) return;
  if(view!=='feed') return;
  const k=e.key, sl=curSlide();
  if(k==='ArrowDown'||k==='PageDown'){ e.preventDefault(); goTo(activeIdx+1); }
  else if(k==='ArrowUp'||k==='PageUp'){ e.preventDefault(); goTo(activeIdx-1); }
  else if(k===' '){ if(e.target.closest && e.target.closest('button,a,summary')) return; e.preventDefault(); if(!e.repeat) togglePause(); }
  else if(sl && lessonPlay && lessonPlay.v===sl.v && (k==='ArrowLeft'||k==='ArrowRight')){ e.preventDefault(); Lesson.step(k==='ArrowRight'?1:-1); }
});
let toastTimer;
/* a toast may carry one action button (Save's "Add this moment…"); it then stays up longer and while focused */
function toast(msg,action){
  const t=$('#toast'); t.textContent=msg; clearTimeout(toastTimer);
  if(action){ const b=document.createElement('button'); b.className='btn toast-act'; b.type='button'; b.textContent=action.label; b.onclick=()=>{ t.textContent=''; action.run(b); }; t.append(' ',b); }
  const clear=()=>{ if(t.contains(document.activeElement)) toastTimer=setTimeout(clear,1500); else t.textContent=''; };
  toastTimer=setTimeout(clear,action?6000:3200);
}

/* ---------- embed mode (?embed=1, the old docs/module-api.md, "Embeds") ----------
   The page shows only the piece named by ?v= (with &p= state) and never builds the feed. The stage starts as a still,
   rendered once by one short-lived poster worker that is then disposed; the live worker starts only when the viewer
   clicks Play (or presses Enter or Space on the stage). A compact bar carries the title, author, Pause and "Open in
   EigenReel ↗" (the full share link at the current moment). Reduced-motion viewers get a paused frame after the click. The
   parent page hears {type:'eigenreel:ready'} once the still (or the can't-run card) is up, and {type:'eigenreel:size', height}
   with the height this width wants (a square stage plus the bar), so an LMS page can size the frame. */
const toParent=m=>{ if(window.parent!==window) try{ window.parent.postMessage(m,'*'); }catch(_){} };
function bootEmbed(link){
  document.documentElement.classList.add('embed');
  const app=$('#app'); app.hidden=true; app.inert=true;
  const root=document.createElement('div'); root.id='embed'; root.className='embed'; document.body.prepend(root);
  const q=new URLSearchParams(location.search); q.delete('embed');
  const fullURL=()=>location.origin+location.pathname+(q.toString()?'?'+q:'')+location.hash; // the link without embed=1: lesson, collection and all
  if(!link){
    const coll=q.has('collection');
    root.innerHTML=`<div class="e-stage"><div class="e-card"><p>${coll?'A list of moments across pieces can\'t be embedded yet.':'This embed does not name a piece on '+esc(site())+'.'}</p><a class="e-open" href="${esc(coll?fullURL():location.origin+location.pathname)}" target="_blank" rel="noopener noreferrer">${coll?'Open the list in '+esc(site()):'Open '+esc(site())} <span aria-hidden="true">↗</span></a></div></div>`;
    toParent({type:'eigenreel:ready', v:null}); toParent({type:'eigenreel:size', height:root.offsetHeight}); return;
  }
  const v=link.v, L=link.lesson, s=getSettings(v); if(link.params) s.params=link.params; document.title=`${v.title} · ${site()}`;
  /* a lesson link: the still is stop &at= (1 by default), and the bar steps through the stops (‹ 1 of 3 ›) */
  let li=link.at||0; const stopAt=i=>L.stops[i];
  if(L){ const st=stopAt(li); s.params=specParams(v,st.p); link.t=st.t||0; }
  setTokens(root,pieceTokens(v));
  root.innerHTML=`<div class="e-stage">
      <canvas class="viz" role="img" aria-label="${esc(v.title)}, animated visualization" aria-describedby="e-alt"></canvas>
      <img class="e-poster" alt="" hidden>
      <p class="sr" id="e-alt">${esc(v.alt||v.hook)}</p>
      <div class="e-card" role="status" hidden></div>
    </div>
    ${L?`<p class="e-note"></p>`:''}
    <div class="e-bar">
      <p class="e-who"><b class="e-title">${esc(L&&L.title||v.title)}</b> <span class="e-by">${esc(v.by)}</span></p>
      ${L?`<div class="e-steps" role="group" aria-label="Moments"><button class="e-btn e-ic" type="button" data-e-step="-1" aria-label="Previous moment">${ICON.left}</button><span class="e-k" aria-live="polite"></span><button class="e-btn e-ic" type="button" data-e-step="1" aria-label="Next moment">${ICON.right}</button></div>`:''}
      <button class="e-btn" type="button" id="e-pause" aria-describedby="e-alt"></button>
      <a class="e-open" id="e-open" href="#" target="_blank" rel="noopener noreferrer">Open in ${esc(site())} <span aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>
    </div>`;
  const es=embedSl={v, el:root, stage:$('.e-stage',root), canvas:$('canvas.viz',root), host:null, used:false, card:null, mode:'feed',
    t:link.t??Math.min(6,lengthOf(v)), w:0, h:0, visible:true, started:false, lastH:0};
  const poster=$('.e-poster',root), pz=$('#e-pause',root), open=$('#e-open',root), card=$('.e-card',root), bar=$('.e-bar',root);
  es.stage.classList.add('e-still'); // until it starts, the whole still is the Play target (the bar's Play is the one button)
  const measureE=()=>{ es.w=Math.max(1,es.canvas.clientWidth); es.h=Math.max(1,es.canvas.clientHeight); const g=Math.round(Math.min(es.w,es.h)*0.03)+4;
    es.B={x:g, y:g, w:Math.max(100,es.w-2*g), h:Math.max(100,es.h-2*g)}; };
  measureE();
  const why=cannotRun(v), inter=!!v.meta.interact;
  const wants=()=>!paused && es.visible && !document.hidden && !es.ended;
  const syncBtn=()=>{ const on=es.started&&!paused, lbl=on?'Pause':'Play'; pz.innerHTML=`${on?ICON.pause:ICON.play}<span>${lbl}</span>`; pz.setAttribute('aria-label',`${lbl} ${v.title}`); };
  const sync=()=>{ if(es.host) wants()?es.host.play():es.host.pause(); syncBtn(); };
  /* Open in EigenReel: a lesson opens at this stop of the whole lesson; otherwise this moment's share link */
  const syncOpen=()=>{
    if(L){ q.set('at',li+1); if(!li) q.delete('at'); open.href=fullURL(); return; }
    open.href=shareURL(v);
  };
  const note=$('.e-note',root);
  const syncStop=()=>{ if(!L) return; const n=L.stops.length, st=stopAt(li);
    $('.e-k',root).textContent=`${li+1} of ${n}`; $('[data-e-step="-1"]',root).disabled=li===0; $('[data-e-step="1"]',root).disabled=li===n-1;
    note.innerHTML=texText(st.note); note.title=st.note; note.hidden=!st.note; syncOpen();
    if(window.EigenReelTeX && note.querySelector('.tex')) EigenReelTeX.typeset(note).then(()=>size()); }; // TeX as in the feed's lesson card (KaTeX loads lazily)
  const size=()=>{ const h=Math.round(innerWidth)+bar.offsetHeight+(note&&!note.hidden?note.offsetHeight:0); if(h!==es.lastH){ es.lastH=h; toParent({type:'eigenreel:size', height:h, v:v.id}); } };
  const say=(msg,btn)=>{ syncOpen(); card.innerHTML=`<p>${esc(msg)}</p><div class="e-row">${btn?`<button class="e-btn" type="button" data-e-restart>${esc(btn)}</button>`:''}<a class="e-open" href="${esc(open.href)}" target="_blank" rel="noopener noreferrer">Open in ${esc(site())} <span aria-hidden="true">↗</span></a></div>`; card.hidden=false; es.card=card; es.stage.classList.remove('e-still'); };
  /* an interactive piece in an embed takes the pointer once it is live: the embed is the piece, so there is no Click to
     interact step. Esc (or a press outside the box) hands it back; a click on the stage takes it again. */
  const interact=on=>{ if(!es.host || !inter) return; es.mode=on?'interact':'feed'; es.canvas.style.pointerEvents=on?'none':''; es.host.setMode({mode:es.mode}); };
  function mountE(){
    if(es.host) return; freshCanvas(es); es.ended=false;
    es.host=EigenReelHost.mount(es.canvas,pieceOf(v),{params:s.params, t:es.t, playing:wants(), device:DEVICE, mode:'feed', box:es.B, dpr:dpr(), site:siteColors(),
      onParam:(k,val,params)=>{ s.params=specParams(v,params); }, onLeave:()=>interact(false), onEnded:()=>{ es.ended=true; syncBtn(); },
      onError:(kind,msg)=>{ if(es.host){ es.t=es.host.getTime(); } es.host=null; poster.hidden=!poster.src; const [h,why]=CARD[kind]||CARD.error; say(`${h}. ${why||msg||''}`,kind==='blocked'?null:kind==='crashed'?'Try again':'Restart'); }});
    es.stage.classList.toggle('e-ptr',inter);
    if(inter){ es.canvas.tabIndex=0; es.canvas.setAttribute('aria-label',`${v.title}, interactive visualization: ${v.meta.interact.hint||''}`); interact(true); }
    const h=es.host, reveal=()=>{ if(es.host!==h) return; if(h.state==='loading') return requestAnimationFrame(reveal); if(h.state==='running') poster.hidden=true; };
    requestAnimationFrame(reveal); // the still stays up until the live piece is drawing
  }
  function unmountE(){ if(!es.host) return; es.t=es.host.getTime(); es.host.dispose(); es.host=null; poster.hidden=!poster.src; }
  function start(){
    if(es.card) return; const hadFocus=root.contains(document.activeElement);
    es.started=true; es.stage.classList.remove('e-still'); mountE(); syncBtn();
    if(hadFocus && inter && !bar.contains(document.activeElement)) es.canvas.focus({preventScroll:true});
    announce(paused?`${v.title}, paused. Press Play to animate.`:`Playing ${v.title}`);
  }
  function toggle(){ if(!es.started) return start(); if(paused && es.ended && es.host){ es.host.seek(0); es.ended=false; } paused=!paused; sync(); announce(paused?'Animation paused':'Animation playing'); }
  pz.onclick=()=>{ const first=!es.started; toggle();
    if(first && L && document.activeElement===pz){ const nx=$('[data-e-step="1"]',root); (nx.disabled?$('[data-e-step="-1"]',root):nx).focus({preventScroll:true}); } }; // a lesson's first Play hands focus to the steps, so › and the arrows go on from there
  /* a stop: params and t; paused there, like the lesson card in the feed. Before Play the still is redrawn. */
  const still=()=>EigenReelHost.poster(pieceOf(v),{w:es.w, h:es.h, dpr:dpr(), box:es.B, params:s.params, t:es.t, device:DEVICE, site:siteColors()});
  let stillN=0;
  function goStop(i){
    if(!L) return; li=Math.max(0,Math.min(L.stops.length-1,i)); const st=stopAt(li);
    s.params=specParams(v,st.p); es.t=st.t||0;
    if(es.host){ es.host.setParams(s.params); es.host.seek(es.t); if(!paused){ paused=true; sync(); } }
    else { const n=++stillN; still().then(b=>{ if(n!==stillN || es.host) return; const old=poster.src; poster.src=URL.createObjectURL(b); poster.hidden=false; if(old.startsWith('blob:')) URL.revokeObjectURL(old); },e=>console.warn('eigenreel: embed still failed for',v.id,e.message)); }
    syncStop(); announce(`Moment ${li+1} of ${L.stops.length}. ${stopAt(li).note}`);
  }
  if(L) $('.e-steps',root).addEventListener('click',e=>{ const b=e.target.closest('[data-e-step]'); if(b && !b.disabled) goStop(li+(+b.dataset.eStep)); });
  card.addEventListener('click',e=>{ if(!e.target.closest('[data-e-restart]')) return; EigenReelHost.forgive(v.id); card.hidden=true; card.innerHTML=''; es.card=null; start(); });
  ['pointerenter','focus','mousedown','touchstart'].forEach(k=>open.addEventListener(k,syncOpen,{passive:true}));
  es.stage.addEventListener('click',e=>{ if(e.target.closest('button,a')) return; if(!es.started && !es.card) return start(); if(es.host && es.mode!=='interact') interact(true); }); // the whole still is the Play target
  es.embedKey=e=>{
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key;
    if(k==='Escape' && es.mode==='interact'){ e.preventDefault(); return interact(false); }
    if(k==='Enter' && e.target===es.canvas && es.host && inter){ e.preventDefault(); return interact(true); }
    if(e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return; // text fields keep every key
    const arrow=k==='ArrowLeft'||k==='ArrowRight';
    if(e.target.closest && e.target.closest('button,a') && !(arrow && root.contains(e.target))) return; // they handle their own Enter and Space; arrows on the embed's own buttons still step
    if(k===' '||(k==='Enter'&&!es.started)){ e.preventDefault(); toggle(); }
    else if(L && arrow){ e.preventDefault(); goStop(li+(k==='ArrowRight'?1:-1)); }
  };
  // off screen: pause, and after a while give the frame back; scrolling back resumes an embed that was started
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
  const ready=()=>{ toParent({type:'eigenreel:ready', v:v.id}); size(); };
  if(why && why.reason!=='device'){ // a browser without the sandbox, or a WebGL2 piece without WebGL2: no frame at all
    say(`${why.message}. ${why.why}`); pz.disabled=true; return ready();
  }
  const n0=++stillN; still()
    .then(b=>{ if(n0!==stillN || (es.host && es.host.state==='running')) return; poster.src=URL.createObjectURL(b); poster.hidden=false; },
      e=>console.warn('eigenreel: embed still failed for',v.id,e.message))
    .finally(ready);
}

/* ---------- boot ----------
   The feed waits for EigenReelAPI.ready (api.js): the probe that says whether the page is served by the demo server, and
   if so what is yours there. Opened as static files it settles at once, with this browser's localStorage. */
applyTheme();
if(typeof bindChalkboard==='function') bindChalkboard($('#chalkboard'));
EigenReelAPI.ready.then(()=>{ applySiteName(); syncModeItem(); applyTheme(); AdminPage.sync(); loadRegistry(); if(typeof loadPlayground==='function') loadPlayground(); loadSignals(); loadCounts(); applyServerUsers(); syncMeBtn(); boot(); });
/* a share link opened in a tab that is already here: the hash changes without a reload */
addEventListener('hashchange',()=>{ if(EMBED || !/(^#|&)v=/.test(location.hash)) return; const link=readLink(); if(link) openLink(link); }); // replaceState (syncURL) fires none
/* open a share link: the piece at its params, and at its t, paused there when the link names one */
function openLink(link){
  const v=link.v; if(link.params) getSettings(v).params=link.params;
  if(!feedList().includes(v)){ filter={type:'all'}; renderChips(); }
  linked=runsHere(v)?null:v;
  if(view!=='feed') showView('feed');
  buildFeed();
  const i=slides.findIndex(x=>x.v===v), sl=slides[i]; if(!sl) return;
  if(link.t!=null){ sl.t=link.t; setPaused(true,true); }
  if(i>0){ feed.scrollTop=slideEls[i].offsetTop; activeIdx=i; onActiveChange(); }
  pushParams(v); if(link.t!=null) seekSl(sl,link.t);
}
function boot(){
if(EMBED) bootEmbed(readLink());
else { // a share link (#v=&p=&t=, or ?v=) wins over the filter remembered for this tab
  const link=readLink(), pref=store.get('eigenreel:filter',null,true), cq=new URLSearchParams(location.search).get('collection');
  const coll=cq!=null && !link?Collection.decode(cq):null; // ?collection= plays its moments as a playlist, one slide per piece (section 5, "Moments")
  if(pref==='foryou' || (pref==='saved' && sig.saves.length)) filter=makeFilter(pref);
  if(coll) filter=Collection.filter(coll,true);
  else if(cq!=null) try{ history.replaceState(history.state,'',location.pathname+location.hash); }catch(_){} // a malformed link opens the ordinary feed
  if(link){ if(link.params) getSettings(link.v).params=link.params; if(!feedList().includes(link.v)) filter={type:'all'}; if(!runsHere(link.v)) linked=link.v; if(link.t!=null) paused=true; }
  if(syncFocus()) focusHint();
  readPads(); renderChips(); buildFeed();
  if(link){
    const i=slides.findIndex(x=>x.v===link.v), sl=slides[i];
    if(sl && link.t!=null) sl.t=link.t;
    if(i>0){ feed.scrollTop=slideEls[i].offsetTop; activeIdx=i; onActiveChange(); }
    if(link.lesson) Lesson.play(link.v,link.lesson,link.at); // sets stop 1's (or &at='s) params and t before mountPolicy mounts the slide
    if(link.t!=null) setPaused(true,true);
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
