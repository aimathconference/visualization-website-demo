/* ---------- Page colors: the moderators' colors for the whole site (docs/server.md, "Page colors") ----------
   Ported from the demo's own front end (demo/public/js/page-theme.js). There a moderator recolors the site for
   themselves; here a moderator (or blog editor, or admin) sets four colors once, for everyone: PUT api/page-theme
   saves them on the demo server, api/whoami brings them to every page as pageTheme, and this file expands them into
   the tokens of styles.css, set on <html> so they win over its :root block. The site keeps its type, shapes and
   layout; only its colors change. As static files there is no page theme.

   The mapping, from the four picked colors {bg, fg, accent, accent2} to the tokens (as the demo's page-theme.js):
     --bg bg · --panel bg mixed 6 % toward fg (4 % on a light bg) · --fg fg · --muted fg mixed toward bg, at most 35 %,
     while it keeps 4.5:1 on bg and panel · --accent, --accent2 the accents, lightened or darkened until they read at
     4.5:1 on bg and panel (they are also text) · --accent-fill the accent · --on-accent white or black, whichever reads
     better on it · --line, --chip, --field-line fg at 14 %, 12 %, 45 % · --chip-on fg, --chip-on-fg bg · --focus-halo
     bg · --shadow, --scrim and --topbar-bg (a fade) from bg · color-scheme from bg.
   Visualizations on the site's palette draw in the page colors too (app.js piecePalette), as in the demo; a
   viewer's other Customize palettes still apply. The panel warns, and will not save, when the text reads below 4.5:1
   on the background.
   Also the color helpers the accent that follows the piece uses (app.js, "accent follows the piece").
   Loaded after api.js, before app.js; the panel uses app.js's helpers (esc, showDialog, toast, announce) when opened. */
(function(root){
'use strict';
const KEYS=['bg','fg','accent','accent2'];
const FIELDS=[['bg','Background'],['fg','Text'],['accent','Accent'],['accent2','Second accent']];
/* the demo's presets (demo/public/js/page-theme.js) */
const PRESETS=[
  {id:'night', name:'Night', bg:'#050508', fg:'#f4f4f8', accent:'#ff2e74', accent2:'#22e0e8'},
  {id:'viridis', name:'Viridis', bg:'#100c24', fg:'#f1f1e6', accent:'#fde725', accent2:'#22a884'},
  {id:'solar-dark', name:'Solarized dark', bg:'#002b36', fg:'#eee8d5', accent:'#cb4b16', accent2:'#2aa198'},
  {id:'solar-light', name:'Solarized light', bg:'#fdf6e3', fg:'#073642', accent:'#d33682', accent2:'#268bd2'},
  {id:'paper', name:'Ink on paper', bg:'#fbfaf5', fg:'#1b1b1b', accent:'#b3261e', accent2:'#33598f'},
  {id:'contrast', name:'High contrast', bg:'#000000', fg:'#ffffff', accent:'#ffd400', accent2:'#00b3ff'},
];

/* ---------- colors ---------- */
const isHex=c=>typeof c==='string' && /^#[0-9a-f]{6}$/i.test(c);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const toHex=a=>'#'+a.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{ const B=rgb(b); return toHex(rgb(a).map((x,i)=>x+(B[i]-x)*t)); };
const rgba=(h,a)=>`rgba(${rgb(h).join(',')},${a})`;
const lum=h=>{ const [r,g,b]=rgb(h).map(v=>{ v/=255; return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4; }); return 0.2126*r+0.7152*g+0.0722*b; };
const contrast=(a,b)=>{ const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const onColor=c=>contrast(c,'#ffffff')>=contrast(c,'#000000')?'#ffffff':'#000000';
/* c, moved toward white on a dark ground or black on a light one in 5 % steps, until it reads at `min`:1 on every
   color of `grounds`; the hue is kept as long as it can be. Unchanged when it already reads. */
function legible(c,grounds,min=4.5){
  const gs=[].concat(grounds).filter(isHex), worst=x=>Math.min(...gs.map(g=>contrast(x,g)));
  if(!isHex(c) || !gs.length || worst(c)>=min) return c;
  const dark=gs.reduce((s,g)=>s+lum(g),0)/gs.length<0.18;
  for(const to of dark?['#ffffff','#000000']:['#000000','#ffffff'])
    for(let t=0.05;t<=1.0001;t+=0.05){ const x=mix(c,to,t); if(worst(x)>=min) return x; }
  return worst('#ffffff')>=worst('#000000')?'#ffffff':'#000000';
}

/* ---------- the tokens ---------- */
const VARS=['--bg','--panel','--fg','--muted','--accent','--accent2','--accent-fill','--on-accent','--line','--chip','--chip-on','--chip-on-fg',
  '--field-line','--focus-halo','--shadow','--scrim','--topbar-bg','color-scheme'];
function tokens(t){
  const {bg,fg}=t, dark=lum(bg)<0.25, panel=mix(bg,fg,dark?0.06:0.04);
  let k=0.35; while(k>0 && Math.min(contrast(mix(fg,bg,k),bg),contrast(mix(fg,bg,k),panel))<4.5) k-=0.05;
  const accent=legible(t.accent,[bg,panel]), accent2=legible(t.accent2,[bg,panel]);
  const o={'--bg':bg, '--panel':panel, '--fg':fg, '--muted':mix(fg,bg,Math.max(0,k)), '--accent':accent, '--accent2':accent2,
    '--accent-fill':accent, '--on-accent':onColor(accent), '--line':rgba(fg,0.14), '--chip':rgba(fg,0.12), '--chip-on':fg, '--chip-on-fg':bg,
    '--field-line':rgba(fg,0.45), '--focus-halo':bg, 'color-scheme':dark?'dark':'light',
    '--topbar-bg':`linear-gradient(to bottom, ${rgba(bg,0.92)} 35%, ${rgba(bg,0)})`, '--shadow':`0 1px 3px ${rgba(bg,0.75)}`,
    '--scrim':`linear-gradient(to top, ${rgba(bg,0.92)}, ${rgba(bg,0.55)} 45%, ${rgba(bg,0)})`};
  return o;
}

/* ---------- state: the saved theme (everyone's), and the preview while the panel is open ---------- */
const CACHE='loci:page-theme'; // this browser's copy, so a reload does not flash the default colors first
const clean=t=>t && typeof t==='object' && KEYS.every(k=>isHex(t[k]))?Object.fromEntries(KEYS.map(k=>[k,t[k].toLowerCase()])):null;
const cacheGet=()=>{ try{ return clean(JSON.parse(localStorage.getItem(CACHE))); }catch(_){ return null; } };
const cacheSet=t=>{ try{ if(t) localStorage.setItem(CACHE,JSON.stringify(t)); else localStorage.removeItem(CACHE); }catch(_){} };
let saved=cacheGet(), shown=saved;

/* the tokens of `shown` on <html>, or none (the stylesheet's own colors) */
function paint(){
  const s=document.documentElement.style;
  VARS.forEach(v=>s.removeProperty(v));
  if(shown) Object.entries(tokens(shown)).forEach(([k,v])=>s.setProperty(k,v));
}
/* app.js repaints everything the theme touches (tokens, live pieces, thumbnails) */
const repaint=()=>{ if(typeof applyTheme==='function') applyTheme(); else paint(); };
function show(t){ shown=clean(t); repaint(); }
/* once LociAPI.ready has settled: the server's theme (null as static files, or when the server has none) */
function sync(){
  saved=clean(root.LociAPI&&LociAPI.pageTheme()); cacheSet(saved); shown=saved; repaint();
  const mi=document.querySelector('[data-page-colors]'); if(mi) mi.hidden=!(root.LociAPI&&LociAPI.canModerate());
}

/* ---------- the panel (menu > Page colors, moderators only) ---------- */
const same=(a,b)=>!!a&&!!b&&KEYS.every(k=>a[k]===b[k]);
function panelHTML(cur){
  return `<p class="fine" id="pc-d">For moderators: the colors of the whole site, for everyone who opens it. Visualizations draw in them too, unless a viewer picks another scheme in Customize. Saved on this demo server.</p>
    <div class="swatches pc-presets" role="group" aria-label="Presets">${PRESETS.map(p=>`<button class="swatch" type="button" data-pc-preset="${p.id}" aria-pressed="false"><span class="dots">${KEYS.map(k=>`<i style="background:${p[k]}"></i>`).join('')}</span>${esc(p.name)}</button>`).join('')}</div>
    <div class="pc-fields">${FIELDS.map(([k,label])=>`<label class="pc-f" for="pc-${k}"><span class="flabel">${label}</span><input class="pc-color" type="color" id="pc-${k}" name="${k}" value="${cur[k]}"></label>`).join('')}</div>
    <p class="fine pc-warn" id="pc-warn" role="status"></p>
    <div class="btnrow"><button class="btn" type="button" id="pc-save">Save colors</button><button class="btn ghost" type="button" id="pc-clear">Back to the default colors</button></div>
    <p class="fine" id="pc-now"></p>`;
}
function open(opener){
  if(!(root.LociAPI&&LociAPI.canModerate())) return;
  const modal=document.getElementById('pcmodal'), body=document.getElementById('pc-body');
  body.innerHTML=panelHTML(saved||PRESETS[0]);
  const read=()=>Object.fromEntries(KEYS.map(k=>[k,body.querySelector('#pc-'+k).value.toLowerCase()]));
  const now=()=>{ body.querySelector('#pc-now').textContent=saved?`Everyone sees: background ${saved.bg}, text ${saved.fg}, accents ${saved.accent} and ${saved.accent2}.`:'Everyone sees the default colors.'; };
  const preview=()=>{
    const t=read(), ratio=contrast(t.bg,t.fg), tk=tokens(t), msgs=[];
    show(t);
    if(ratio<4.5) msgs.push(`The text and background are hard to tell apart (contrast ${ratio.toFixed(1)}:1; it needs at least 4.5 to be saved).`);
    if(tk['--accent']!==t.accent) msgs.push(`The accent shows as ${tk['--accent']}, so it reads as text on this background.`);
    if(tk['--accent2']!==t.accent2) msgs.push(`The second accent shows as ${tk['--accent2']}, for the same reason.`);
    body.querySelector('#pc-warn').textContent=msgs.join(' ');
    const sv=body.querySelector('#pc-save'); sv.disabled=ratio<4.5;
    body.querySelectorAll('[data-pc-preset]').forEach(b=>b.setAttribute('aria-pressed',String(same(PRESETS.find(p=>p.id===b.dataset.pcPreset),t))));
  };
  const fill=t=>{ KEYS.forEach(k=>{ body.querySelector('#pc-'+k).value=t[k]; }); preview(); };
  body.addEventListener('input',preview);
  body.querySelectorAll('[data-pc-preset]').forEach(b=>b.onclick=()=>{ const p=PRESETS.find(x=>x.id===b.dataset.pcPreset); fill(p); announce(`Previewing ${p.name}. Save colors applies it for everyone.`); });
  const put=async(t,btn,msg)=>{
    btn.disabled=true;
    try{ saved=clean(await LociAPI.setPageTheme(t)); cacheSet(saved); show(saved); now(); toast(msg); announce(msg); }
    catch(e){ toast(`Not saved: ${e.message}`); announce(`Not saved: ${e.message}`); }
    finally{ btn.disabled=false; if(t) preview(); }
  };
  body.querySelector('#pc-save').onclick=e=>{ const t=read(); if(contrast(t.bg,t.fg)<4.5) return; put(t,e.currentTarget,'Page colors saved for everyone'); };
  body.querySelector('#pc-clear').onclick=e=>{ put(null,e.currentTarget,'Back to the default colors, for everyone').then(()=>fill(PRESETS[0])).then(()=>show(saved)); };
  now(); preview(); show(saved); // the panel opens on the saved colors; a preview starts with the first change
  showDialog('#pcmodal','#pc-bg',opener);
  // closing without saving drops the preview
  const mo=new MutationObserver(()=>{ if(modal.hidden){ mo.disconnect(); show(saved); } });
  mo.observe(modal,{attributes:true, attributeFilter:['hidden']});
}

root.PageColors={PRESETS, KEYS, contrast, legible, mix, onColor, lum, isHex, tokens, paint, sync, open,
  /* the theme on screen ({bg, fg, accent, accent2}), or null */ active:()=>shown};
})(typeof globalThis!=='undefined'?globalThis:this);
