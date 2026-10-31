/* ---------- contributors: profile data, generated profile pictures, the #user page ----------
   Loaded before app.js. Everything here runs at call time, so it may use app.js helpers ($, esc, fmtK, cardHTML,
   paintThumbs, showView, refocus, announce, view, VIZ, POSTS) once the page has booted.
   Keys are the author strings used in catalog.js: an @handle, or a name such as "The EigenReel editors".
   Homepages use placeholder .example domains. */
const USERS = {
  '@circle-mod-n':{bio:'Chord diagrams and modular arithmetic: pictures you could draw with a compass and a lot of patience.', homepage:'https://circle-mod-n.example', github:'circle-mod-n', joined:'Mar 2026',
    pic:{kind:'chords', k:2, bg:'#2b1d4f', fg:'#ffd166'}},
  '@kmoreau.geom':{bio:'Arithmetic geometry, drawn over the reals so you can see it before you compute it.', homepage:'https://kmoreau-geom.example', github:'kmoreau-geom', joined:'Jun 2026',
    pic:{kind:'liss', a:3, b:2, bg:'#0f4c5c', fg:'#e9f5f2'}},
  '@sofia.opt':{bio:'Optimization, gradient flows, and the interesting ways they fail.', homepage:'https://sofia-opt.example', github:'sofia-opt', joined:'Aug 2026',
    pic:{kind:'spiral', turns:4, bg:'#f2e8cf', fg:'#bc4749'}},
  '@fatou.dust':{bio:'Complex dynamics. Mostly Julia sets, occasionally the Mandelbrot set they live in.', homepage:'https://fatou-dust.example', github:'fatou-dust', joined:'Feb 2026',
    pic:{kind:'rose', k:5, bg:'#14213d', fg:'#fca311'}},
  '@epicycle.lab':{bio:'Fourier analysis with spinning circles, for signal processing courses and the merely curious.', homepage:'https://epicycle-lab.example', github:'epicycle-lab', joined:'Apr 2026',
    pic:{kind:'hypo', R:5, r:3, d:5, bg:'#e63946', fg:'#f1faee'}},
  '@calc-commons':{bio:'Open calculus materials, written and shared by instructors at a dozen universities.', homepage:'https://calc-commons.example', github:'calc-commons', joined:'Jan 2026',
    pic:{kind:'liss', a:1, b:2, bg:'#2a9d8f', fg:'#ffffff'}},
  '@may.iterates':{bio:'One-dimensional maps and the period-doubling road to chaos, one iteration at a time.', homepage:'https://may-iterates.example', github:'may-iterates', joined:'May 2026',
    pic:{kind:'chords', k:3, bg:'#3d0c11', fg:'#ff9b85'}},
  '@levien.tan':{bio:'Mechanics and numerical integration. Pendulums, mostly, and the error bars that come with them.', homepage:'https://levien-tan.example', github:'levien-tan', joined:'Mar 2026',
    pic:{kind:'hypo', R:7, r:2, d:4, bg:'#1b4332', fg:'#d8f3dc'}},
  '@ed.lorenz.fan':{bio:'Strange attractors and sensitive dependence, rendered slowly enough to watch the butterfly flap.', homepage:'https://ed-lorenz-fan.example', github:'ed-lorenz-fan', joined:'Jul 2026',
    pic:{kind:'liss', a:5, b:4, bg:'#0b132b', fg:'#6fffe9'}},
  '@demoivre.hall':{bio:'Probability you can watch happen: random walks, urns, and boards full of pegs.', homepage:'https://demoivre-hall.example', github:'demoivre-hall', joined:'Sep 2026',
    pic:{kind:'rose', k:4, bg:'#fff3e0', fg:'#8d3b12'}},
  '@wasm.curious':{bio:'Small C programs compiled to WebAssembly, to see how little a visualization needs.', homepage:'https://wasm-curious.example', github:'wasm-curious', joined:'Oct 2026',
    pic:{kind:'spiral', turns:6, bg:'#312244', fg:'#f9c74f'}},
  '@escape.time':{bio:'Fractals on the GPU. Every pixel asks one question: how long until it escapes?', homepage:'https://escape-time.example', github:'escape-time', joined:'Oct 2026',
    pic:{kind:'chords', k:5, bg:'#03071e', fg:'#ffba08'}},
  '@villarceau':{bio:'Topology in three dimensions: fibrations, linked circles and tori, seen through stereographic projection.', homepage:'https://villarceau.example', github:'villarceau', joined:'Sep 2026',
    pic:{kind:'rose', k:7, bg:'#22223b', fg:'#c9ada7'}},
  'The EigenReel editors':{bio:'The curators of EigenReel. We pick the monthly roundup, run review, and write about how the catalog is made.', homepage:'https://loci.example', github:'loci-viz', joined:'Jan 2026',
    pic:{kind:'hypo', R:3, r:1, d:1, bg:'#050508', fg:'#22e0e8'}},
};
const PFP_CURVES = {
  rose:p=>s=>{ const t=2*Math.PI*s, r=Math.cos(p.k*t); return [r*Math.cos(t), r*Math.sin(t)]; },
  liss:p=>s=>{ const t=2*Math.PI*s; return [Math.sin(p.a*t+Math.PI/2), Math.sin(p.b*t)]; },
  spiral:p=>s=>{ const t=2*Math.PI*p.turns*s, r=1-s*0.94; return [r*Math.cos(t), r*Math.sin(t)]; },
  hypo:p=>s=>{ const t=2*Math.PI*p.r*s, q=(p.R-p.r)/p.r, n=p.R-p.r+p.d; return [((p.R-p.r)*Math.cos(t)+p.d*Math.cos(q*t))/n, ((p.R-p.r)*Math.sin(t)-p.d*Math.sin(q*t))/n]; },
};
const PFP_WORD = { chords:'a chord diagram', liss:'a Lissajous figure', spiral:'a spiral', rose:'a rose curve', hypo:'a hypotrochoid' };
/* An author missing from USERS (a piece added later) still gets a profile: a picture picked from a hash of the handle. */
function userOf(h){
  if(USERS[h]) return USERS[h];
  let x=0; for(const c of String(h)) x=(x*31+c.charCodeAt(0))>>>0;
  const kinds=['chords','liss','spiral','rose','hypo'], kind=kinds[x%5], hue=x%360;
  const pic={kind, k:2+x%5, a:1+x%4, b:2+x%3, turns:3+x%4, R:5, r:2+x%3, d:3, bg:`hsl(${hue} 45% 18%)`, fg:`hsl(${(hue+40)%360} 85% 72%)`};
  const slug=String(h).replace(/^@/,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase();
  return USERS[h]={bio:`A ${SITE_NAME} contributor.`, homepage:`https://${slug}.example`, github:slug, joined:'Oct 2026', pic};
}
/* On the demo server (api.js), profiles come from its users table, merged over the entries above: its bio, homepage,
   GitHub username and curve avatar win where they are set. The seed authors are the same people, so they keep their
   join dates; a person who signed up on the server gets theirs and no invented homepage or GitHub link. */
const MONTH_ABBR=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function applyServerUsers(){
  if(!LociAPI.server) return;
  for(const u of LociAPI.users.all()){
    const h='@'+u.handle, known=!!USERS[h], o={...userOf(h)};
    if(u.bio) o.bio=u.bio;
    if(!u.placeholder){ o.homepage=u.homepage||''; o.github=u.github||''; const m=/^(\d{4})-(\d{2})/.exec(u.joined||''); if(m && !known) o.joined=`${MONTH_ABBR[+m[2]-1]} ${m[1]}`; if(!u.bio && !known) o.bio=`A ${LociAPI.siteName()} member.`; }
    else { if(u.homepage) o.homepage=u.homepage; if(u.github) o.github=u.github; }
    if(u.avatar && (PFP_CURVES[u.avatar.kind] || u.avatar.kind==='chords')) o.pic={...o.pic, ...u.avatar};
    o.server=true; USERS[h]=o; delete PFP[h];
  }
}
const PFP = {};
function pfpURL(h){
  if(PFP[h]) return PFP[h];
  const p=userOf(h).pic, P=(x,y)=>`${(50+34*x).toFixed(1)},${(50-34*y).toFixed(1)}`;
  let d='';
  if(p.kind==='chords'){ const n=48; for(let i=0;i<n;i++){ const a=2*Math.PI*i/n, b=2*Math.PI*(p.k*i%n)/n; d+=`M${P(Math.cos(a),Math.sin(a))}L${P(Math.cos(b),Math.sin(b))}`; } }
  else { const f=PFP_CURVES[p.kind](p); for(let i=0;i<=720;i++){ const [x,y]=f(i/720); d+=(i?'L':'M')+P(x,y); } }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${p.bg}"/><path d="${d}" fill="none" stroke="${p.fg}" stroke-width="${p.kind==='chords'?1.2:2.4}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  return PFP[h]='data:image/svg+xml,'+encodeURIComponent(svg);
}
/* decorative next to the handle; the large one on the profile says what it shows */
const pfp=(h,cls='')=>`<img class="pfp${cls?' '+cls:''}" src="${pfpURL(h)}" alt="${cls==='xl'?`Profile picture: ${PFP_WORD[userOf(h).pic.kind]}`:''}" width="28" height="28">`;
const userViz=h=>VIZ.filter(v=>v.author===h);
/* the profile a post belongs to: its explicit by, its author string when that is a known name, or the leading @handle */
function postBy(p){ if(p.by) return p.by; if(USERS[p.author]) return p.author; const m=/^@[\w.\-]+/.exec(p.author||''); return m?m[0]:null; }
/* A byline link. Inside another button (a catalog card, a post card) it must not be a button itself, so it is a span
   that only the pointer uses; the card's own label still reads the handle, and the Contributors row reaches every profile. */
const userLink=(h,inside)=>inside?`<span class="by-user" data-user="${esc(h)}">${esc(h)}</span>`:`<button class="by-user" type="button" data-user="${esc(h)}" aria-label="${esc(h)}, profile">${esc(h)}</button>`;
function postAuthor(p,inside){ const by=postBy(p), a=esc(p.author); return by?a.replace(esc(by),userLink(by,inside)):a; }
function contributorsHTML(){
  const hs=[...new Set([...VIZ.map(v=>v.author), ...POSTS.map(postBy).filter(Boolean)])];
  return `<section class="people" aria-labelledby="people-h"><h2 class="sechead" id="people-h">Contributors</h2>
    <div class="chipwrap" role="list">${hs.map(h=>{ const n=userViz(h).length;
      return `<button class="person" type="button" role="listitem" data-user="${esc(h)}" aria-label="${esc(h)}, ${n} visualization${n===1?'':'s'}">${pfp(h,'sm')}${esc(h)}<span class="n" aria-hidden="true">${n}</span></button>`; }).join('')}</div></section>`;
}

/* ---------- the #user view: opened over whichever view was showing; Back and Esc return to it ---------- */
const userPage={id:null, from:'feed', opener:null};
function openUser(h,opener){
  if(!h) return; userOf(h);
  if(view!=='user'){ userPage.from=view; userPage.opener=opener||document.activeElement; }
  userPage.id=h;
  if(view==='user') renderUser(); else showView('user');
  refocus('#user h1'); announce(`Profile of ${h}`);
}
function closeUser(){
  const {from, opener}=userPage; showView(from);
  if(opener && opener.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) opener.focus({preventScroll:true});
  else (from==='feed'?feed:$('#'+from)).focus({preventScroll:true});
}
function renderUser(){
  const h=userPage.id, u=userOf(h), vs=userViz(h), posts=POSTS.filter(p=>postBy(p)===h), el=$('#user');
  // presets this person found on other people's pieces, credited with foundBy in the piece's manifest
  const pgs=PLAYGROUND.filter(v=>v.author===h); // demo server only (app.js, "the Playground")
  const reviewed=VIZ.filter(v=>v.lane!=='new' && Array.isArray(v.reviewers) && v.reviewers.includes(h) && v.author!==h);
  const found=VIZ.flatMap(v=>(v.manifest.presets||[]).map((p,j)=>({v,p,j}))).filter(x=>x.p.foundBy===h);
  const likes=vs.reduce((s,v)=>s+v.likes+(v.liked?1:0),0), host=(u.homepage||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
  const back={feed:'Back to the feed', browse:'Back to the catalog', blog:'Back to the blog', submit:'Back to Submit', wanted:'Back to Wanted', yours:'Back to Yours'}[userPage.from]||'Back';
  el.setAttribute('aria-label',`Profile of ${h}`);
  el.innerHTML=`<div class="wrap">
    <button class="backlink" type="button" data-user-back>← ${back}</button>
    <div class="profile">${pfp(h,'xl')}
      <div class="pinfo"><div class="kicker">Contributor</div><h1 tabindex="-1">${esc(h)}</h1><p>${esc(u.bio)}</p>
        <p class="pstats"><span><b>${vs.length}</b> visualization${vs.length===1?'':'s'}</span><span title="${esc(LIKES_NOTE)}"><b>${fmtK(likes)}</b> like${likes===1?'':'s'}${LociAPI.server?'':' (sample)'}</span><span>Joined ${esc(u.joined)}</span></p>
        ${u.homepage||u.github?`<div class="btnrow">${u.homepage?`<a class="btn ghost" href="${esc(u.homepage)}" target="_blank" rel="noopener">${USER_ICON.globe}<span><span class="sr">Homepage: </span>${esc(host)}</span></a>`:''}
          ${u.github?`<a class="btn ghost" href="https://github.com/${esc(u.github)}" target="_blank" rel="noopener">${USER_ICON.branch}<span><span class="sr">GitHub: </span>github.com/${esc(u.github)}</span></a>`:''}</div>`:''}</div></div>
    <h2 class="sechead">Visualizations</h2>
    ${vs.length?`<div class="grid">${vs.map(v=>cardHTML(v)).join('')}</div>`:`<p class="empty">No visualizations yet${posts.length?'; the writing is below':''}.</p>`}
    ${pgs.length?`<h2 class="sechead">Playground</h2><p class="fine">Remixes and new pieces posted on this demo server. Not reviewed.</p><div class="rows">${pgs.map(v=>`<button class="row" type="button" data-viz="${esc(v.id)}"><span class="pmeta">${v.pg.parent?`Remix of ${esc((vizById(v.pg.parent)||{}).title||v.pg.parent)}`:'A new piece'}</span><strong>${esc(v.title)}</strong></button>`).join('')}</div>`:''}
    ${reviewed.length?`<h2 class="sechead">Reviews</h2><p class="fine">Pieces whose mathematics they checked, one of two reviewers each (<a href="docs/review-pipeline.md" data-doc="review-pipeline">review pipeline</a>, section 4).</p><div class="rows">${reviewed.map(v=>`<button class="row" type="button" data-viz="${esc(v.id)}"><span class="pmeta">Checked ${esc(v.reviewed)} · by ${esc(v.author)}</span><strong>${esc(v.title)}</strong></button>`).join('')}</div>`:''}
    ${found.length?`<h2 class="sechead">Found</h2><p class="fine">States they found that the piece's author added as a “Try this” preset, credited “found by”.</p><div class="rows">${found.map(x=>`<button class="row" type="button" data-found="${esc(x.v.id)}" data-fj="${x.j}"><span class="pmeta">${esc(x.v.title)} · by ${esc(x.v.author)}</span><strong>${esc(x.p.label)}</strong>${x.p.note?`<span class="fine">${esc(x.p.note)}</span>`:''}</button>`).join('')}</div>`:''}
    ${posts.length?`<h2 class="sechead">Writing</h2><div class="rows">${posts.map(p=>`<button class="row" type="button" data-post="${p.id}"><span class="pmeta">${p.date} · ${p.read}</span><strong>${esc(p.title)}</strong><span class="fine">${esc(p.excerpt)}</span></button>`).join('')}</div>`:''}
  </div>`;
  el.scrollTop=0; paintThumbs(el);
}
const USER_ICON = {
  globe:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.6 5.3 3.6 8.5s-1 6.1-3.6 8.5c-2.6-2.4-3.6-5.3-3.6-8.5s1-6.1 3.6-8.5z"/></svg>',
  branch:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="5.5" r="2"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="7.5" r="2"/><path d="M6.5 7.5v9M17.5 9.5c0 4-5 3.5-9.6 7.6"/></svg>',
};
