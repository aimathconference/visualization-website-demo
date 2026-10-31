/* ---------- Wanted: requests for pictures (docs/bounties.md) ----------
   Loaded after catalog.js and before app.js; the functions below run at call time and use app.js helpers
   ($, $$, esc, store, userLink, vizById, showView, refocus, announce, toast, view).
   A challenge asks for one picture: what should be visible, with a reference a reader can check. Exactly one is
   this month's challenge. Everything in WANTED is a SAMPLE written for this prototype: nobody proposed these rows and
   no votes were cast. Votes and your own proposals live in this browser only, so no totals are shown anywhere.
   A piece that answers a challenge says so with the optional manifest field "bounty": "<challenge id>"
   (docs/module-api.md section 2); the Explanation tab then shows an "Answers:" line. Judging and prizes are described
   in docs/bounties.md and are not part of the prototype. */
const WANTED = [
  { id:'weierstrass-torus', status:'month', month:'2026-11', sample:true, by:'@kmoreau.geom', tags:['Complex analysis','Elliptic curves'],
    title:'The Weierstrass ℘ function as a torus cover',
    desc:'Show that ℘ is doubly periodic: colour the plane by ℘(z) and let the period parallelogram tile it, so one cell visibly carries everything. Then send z to (℘(z), ℘′(z)) and watch the cell, with its edges glued and its corners sent to the point at infinity, become E(ℂ), the complex points of y² = 4x³ − g₂x − g₃: a torus. (When g₂ and g₃ are real, the real points are only one or two circles on that torus.) The lattice is the knob.',
    ref:'J. H. Silverman, The Arithmetic of Elliptic Curves, 2nd ed., Springer 2009, section VI.3' },
  { id:'riemann-order', status:'answered', answer:'riemann-sums', sample:true, by:'@sofia.opt', tags:['Calculus','Numerical analysis'],
    title:'Where you sample decides how fast a Riemann sum converges',
    desc:'Refine a Riemann sum and plot its error against n on log–log axes, so the left rule shows a line of slope −1 and the midpoint rule a line of slope −2. A student should see that the choice of sample point changes the rate of convergence, not whether the sum converges.',
    ref:'R. L. Burden, J. D. Faires, A. M. Burden, Numerical Analysis, 10th ed., Cengage 2016, section 4.3' },
  { id:'riemann-hurwitz', status:'open', sample:true, by:'@villarceau', tags:['Complex analysis','Topology'],
    title:'Make the Riemann–Hurwitz count visible',
    desc:'Take a branched cover of the sphere such as z ↦ z³ + az and lift a triangulation of the sphere through it. Count the vertices, edges and faces upstairs as a changes, so that 2 − 2g = d(2 − 2h) − Σ(eₚ − 1) is checked on the screen, and show the branch points where sheets come together.',
    ref:'O. Forster, Lectures on Riemann Surfaces, GTM 81, Springer 1981, section 17' },
  { id:'gauss-bonnet-defect', status:'open', sample:true, by:'@calc-commons', tags:['Geometry','Topology','Teaching'],
    title:'Angle defects add up to 2πχ',
    desc:'Triangulate a polyhedral surface (a cube, a torus made of squares, a surface you can deform) and mark the angle defect at each vertex. As the surface is pushed around, individual defects change but their sum stays 2π times the Euler characteristic; the picture should keep that sum on screen.',
    ref:'M. P. do Carmo, Differential Geometry of Curves and Surfaces, Prentice-Hall 1976, section 4-5' },
  { id:'eisenstein-lattice', status:'open', sample:true, by:'@circle-mod-n', tags:['Number theory'],
    title:'Quadratic reciprocity by counting lattice points',
    desc:'Draw the rectangle with corners 0 and (p/2, q/2) and the diagonal from 0 to (p, q). Count the lattice points below and above the diagonal, so that the two counts give the exponents in Eisenstein’s proof and their sum (p − 1)/2 · (q − 1)/2 is the number of points in the rectangle. Let p and q be chosen among odd primes.',
    ref:'https://en.wikipedia.org/wiki/Proofs_of_quadratic_reciprocity' },
  { id:'argument-principle', status:'open', sample:true, by:'@fatou.dust', tags:['Complex analysis'],
    title:'The winding number counts the zeros inside',
    desc:'Let a loop be dragged across the plane of a polynomial with marked zeros, and draw the image of the loop under the polynomial beside it. The number of times the image winds around 0 should change exactly when the loop crosses a zero.',
    ref:'L. V. Ahlfors, Complex Analysis, 3rd ed., McGraw-Hill 1979, chapter 4, the argument principle' },
];
const WANT_CAP=3, WANT_VOTES='loci:bounty-votes', WANT_PROPS='loci:bounty-proposals';
const WANT_LIMIT={title:80, desc:600, ref:300, tags:3, words:12};
const WANT_REPO='loci-viz/registry', WANT_MAIL='editors@loci.example'; // the planned registry (PLAN.md); a placeholder address
const WANT_STATUS={month:'This month’s challenge', open:'Open', answered:'Answered'};
const MONTHS_LONG=['January','February','March','April','May','June','July','August','September','October','November','December'];
const wantMonth=m=>{ const [y,mo]=m.split('-').map(Number); return MONTHS_LONG[mo-1]+' '+y; };
const challengeById=id=>WANTED.find(c=>c.id===id);
let wantedPage={from:'browse', opener:null}, wantDraft=null;

/* Your proposals: [{id, title, desc, ref, tags, at}], validated on load. */
function wantProps(){
  const s=x=>typeof x==='string'?x:'', a=LociAPI.proposals.get(WANT_PROPS,[]);
  return (Array.isArray(a)?a:[]).filter(p=>p && typeof p==='object' && typeof p.id==='string' && s(p.title) && s(p.desc) && s(p.ref))
    .map(p=>({id:p.id, title:s(p.title).slice(0,WANT_LIMIT.title), desc:s(p.desc).slice(0,WANT_LIMIT.desc), ref:s(p.ref).slice(0,WANT_LIMIT.ref),
      tags:(Array.isArray(p.tags)?p.tags:[]).filter(t=>typeof t==='string').slice(0,WANT_LIMIT.tags), at:s(p.at)}));
}
const votable=()=>new Set([...WANTED.filter(c=>c.status==='open').map(c=>c.id), ...wantProps().map(p=>p.id)]);
function wantVotes(){ const a=LociAPI.proposals.get(WANT_VOTES,[]), ok=votable(); return Array.isArray(a)?[...new Set(a.filter(id=>ok.has(id)))].slice(0,WANT_CAP):[]; }

/* A prefilled new-issue form on the registry, and the same text as an email. Nothing is sent from the page. */
function proposalText(p){
  return `### Please visualize\n${p.title}\n\n### What should be visible\n${p.desc}\n\n### Reference\n${p.ref}\n\n### Tags\n${p.tags.join(', ')}\n\n${myHandle()?`### Proposed by\n${myHandle()}\n\n`:''}---\nProposed from the Wanted page of the ${LociAPI.siteName()} prototype.`;
}
const issueURL=p=>`https://github.com/${WANT_REPO}/issues/new?labels=challenge&title=${encodeURIComponent('Challenge: '+p.title)}&body=${encodeURIComponent(proposalText(p))}`;
const mailURL=p=>`mailto:${WANT_MAIL}?subject=${encodeURIComponent('Challenge: '+p.title)}&body=${encodeURIComponent(proposalText(p))}`;

/* The Explanation tab's line for a piece whose manifest names a challenge. */
function answersLine(v){
  const id=v.manifest.bounty; if(typeof id!=='string') return '';
  const c=challengeById(id);
  return c?`<button class="answers" type="button" data-wanted="${esc(c.id)}">Answers: <b>${esc(c.title)}</b>${c.sample?'<span class="samp">sample</span>':''}</button>`
    :`<p class="answers">Answers an unknown challenge, <code>${esc(id)}</code></p>`;
}

function openWanted(id,opener){
  if(view!=='wanted' && view!=='user'){ wantedPage.from=view; wantedPage.opener=opener||document.activeElement; }
  if(view==='wanted') renderWanted(); else showView('wanted');
  const h=id&&$(`#wc-${CSS.escape(id)}`);
  if(h){ h.focus({preventScroll:true}); h.scrollIntoView({block:'center'}); } else refocus('#wanted h1');
  announce(id&&h?`Wanted: ${h.textContent}`:'Wanted: requests for pictures');
}
function closeWanted(){
  const {from, opener}=wantedPage; showView(from);
  if(opener && opener.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) opener.focus({preventScroll:true});
  else (from==='feed'?feed:$('#'+from)).focus({preventScroll:true});
}

const refHTML=r=>/^https?:\/\/\S+$/.test(r)?`<a href="${esc(r)}" target="_blank" rel="noopener">${esc(r)}</a>`:esc(r);
function challengeHTML(c,mine,votes){
  const voted=votes.includes(c.id), ans=c.answer&&vizById(c.answer);
  return `<article class="wcard${c.status==='month'?' month':''}" aria-labelledby="wc-${esc(c.id)}">
    <div class="kicker">${mine?'Your proposal · saved in this browser':esc(WANT_STATUS[c.status])}${c.month?` · ${esc(wantMonth(c.month))}`:''}${c.sample?' <span class="samp">sample</span>':''}</div>
    <h3 id="wc-${esc(c.id)}" tabindex="-1">${esc(c.title)}</h3>
    <p class="wdesc">${esc(c.desc)}</p>
    <p class="wref"><span class="flabel">Reference</span> ${refHTML(c.ref)}</p>
    <p class="wmeta">${c.tags.map(t=>'#'+esc(t.toLowerCase())).join('  ')}${c.tags.length?' · ':''}proposed by ${mine?esc(myHandle()||'you'):userLink(c.by)}</p>
    ${c.status==='month'?`<p class="fine">Entries so far: none. To answer it, add <code>"bounty": "${esc(c.id)}"</code> to your loci.json and submit as usual, or press Make this to start from a remix with it set; the piece is reviewed like any other.</p>`:''}
    ${ans?`<p class="wans">Answered by <button class="linkbtn" type="button" data-viz="${esc(ans.id)}">${esc(ans.title)}</button>, ${userLink(ans.author)}</p>`:''}
    <div class="btnrow">
      ${!mine&&(c.status==='open'||c.status==='month')?`<button class="btn ghost" type="button" data-wmake="${esc(c.id)}" aria-describedby="wc-${esc(c.id)}">Make this</button>`:''}
      ${c.status==='open'||mine?`<button class="btn ${voted?'':'ghost'} wvote" type="button" data-wvote="${esc(c.id)}" aria-pressed="${voted}">${voted?'✓ Your vote':'Vote for this'}</button>`:''}
      ${mine?`<a class="btn ghost" href="${esc(issueURL(c))}" target="_blank" rel="noopener" data-wsend="${esc(c.id)}">Send to the editors</a>
        <a class="btn ghost" href="${esc(mailURL(c))}">Email it instead</a>
        <button class="btn ghost" type="button" data-wdel="${esc(c.id)}">Remove</button>`:''}
    </div></article>`;
}
function wantField(id,label,hint,input){
  return `<div class="wfield"><label class="flabel" for="${id}">${label}</label>${input}<p class="fine" id="${id}-hint">${hint}</p><p class="werr" id="${id}-err" hidden></p></div>`;
}
function renderWanted(){
  const el=$('#wanted'), props=wantProps(), votes=wantVotes(), d=wantDraft||{title:'',desc:'',ref:'',tags:''};
  const month=WANTED.find(c=>c.status==='month'), open=WANTED.filter(c=>c.status==='open'), done=WANTED.filter(c=>c.status==='answered');
  const back={feed:'Back to the feed', browse:'Back to the catalog', blog:'Back to the blog', submit:'Back to Submit', yours:'Back to Yours'}[wantedPage.from]||'Back';
  el.innerHTML=`<div class="wrap wanted">
    <button class="backlink" type="button" data-wanted-back>← ${back}</button>
    <div class="pagehead"><div class="kicker">Wanted · requests for pictures</div><h1 tabindex="-1">Please visualize</h1>
      <p>Pictures people have asked for and cannot make themselves. Each one says what should be visible and cites a reference you can check. Any author can answer any of them, any month; once a month the editors pick one as the month’s challenge.</p>
      <p class="note">This is a prototype. Every row marked <span class="samp">sample</span> was written to show the format: nobody proposed it and nobody voted for it. Your votes and proposals are kept in this browser only, so there are no vote totals to show. How picking and judging would work is in <a href="docs/bounties.md" data-doc="bounties">the Wanted guide</a> (<a class="rawdoc" href="docs/bounties.md" target="_blank" rel="noopener">source</a>).</p></div>
    ${month?`<section class="wsec" aria-labelledby="w-month-h"><h2 class="sechead" id="w-month-h">This month’s challenge</h2>${challengeHTML(month,false,votes)}</section>`:''}
    <section class="wsec" aria-labelledby="w-open-h"><div class="whead"><h2 class="sechead" id="w-open-h">Open requests</h2>
      <p class="wcount" id="w-count">Your votes: ${votes.length}/${WANT_CAP}</p></div>
      <p class="fine">Vote for at most ${WANT_CAP} at a time, so a vote means “of everything here, I want this”. Press a vote again to take it back.</p>
      <p class="werr" id="w-vote-msg" role="status"></p>
      <div class="wlist">${open.map(c=>challengeHTML(c,false,votes)).join('')}</div></section>
    <section class="wsec" aria-labelledby="w-mine-h"><h2 class="sechead" id="w-mine-h" tabindex="-1">Your proposals</h2>
      ${props.length?`<p class="fine">Saved in this browser and seen by nobody else. <b>Send to the editors</b> opens a new issue on github.com/${WANT_REPO} with your text filled in; nothing is filed until you press Submit there. The registry is planned, not live, in this prototype, so the page may not exist yet; the email link goes to a placeholder address.</p>
        <div class="wlist">${props.map(p=>challengeHTML(p,true,votes)).join('')}</div>`
      :`<p class="fine">None yet. Proposals you write below are listed here, apart from the samples.</p>`}</section>
    <section class="wsec" aria-labelledby="w-new-h"><h2 class="sechead" id="w-new-h">Propose a challenge</h2>
      <form class="wform" id="w-form" novalidate>
        ${wantField('w-title','Title','At most 80 characters. Name the picture, not just the subject.',`<input class="input" id="w-title" maxlength="${WANT_LIMIT.title}" value="${esc(d.title)}" aria-describedby="w-title-hint w-title-err" required>`)}
        ${wantField('w-desc','What should be visible','One paragraph, at most 600 characters: what a viewer should see happen, and what the knob is. “The Hopf fibration” is a topic; “any two fibres link once” is a picture.',`<textarea class="input" id="w-desc" rows="5" maxlength="${WANT_LIMIT.desc}" aria-describedby="w-desc-hint w-desc-err" required>${esc(d.desc)}</textarea>`)}
        ${wantField('w-ref','Reference','Required. A citation (author, title, section) or a URL where a reader can check the mathematics.',`<input class="input" id="w-ref" maxlength="${WANT_LIMIT.ref}" value="${esc(d.ref)}" aria-describedby="w-ref-hint w-ref-err" required>`)}
        ${wantField('w-tags','Tags','One to three, separated by commas, such as Topology, Teaching.',`<input class="input" id="w-tags" value="${esc(d.tags)}" aria-describedby="w-tags-hint w-tags-err" required>`)}
        <div class="btnrow"><button class="btn" type="submit">Save proposal</button></div>
      </form></section>
    ${done.length?`<section class="wsec" aria-labelledby="w-done-h"><h2 class="sechead" id="w-done-h">Answered</h2><div class="wlist">${done.map(c=>challengeHTML(c,false,votes)).join('')}</div></section>`:''}
  </div>`;
  const f=$('#w-form');
  f.oninput=()=>{ wantDraft={title:$('#w-title').value, desc:$('#w-desc').value, ref:$('#w-ref').value, tags:$('#w-tags').value}; };
  f.onsubmit=e=>{ e.preventDefault(); saveProposal(); };
}
function saveProposal(){
  const v=k=>$('#w-'+k).value.trim(), title=v('title'), desc=v('desc'), ref=v('ref');
  const tags=[...new Set(v('tags').split(',').map(t=>t.trim()).filter(Boolean))], errs={};
  if(!title) errs.title='Give the challenge a title.';
  if(desc.split(/\s+/).filter(Boolean).length<WANT_LIMIT.words) errs.desc=`Say what should be visible, in at least ${WANT_LIMIT.words} words: a bare topic is not a challenge.`;
  if(!ref) errs.ref='A reference is required, so the mathematics can be checked.';
  if(!tags.length || tags.length>WANT_LIMIT.tags) errs.tags=`Give one to ${WANT_LIMIT.tags} tags, separated by commas.`;
  ['title','desc','ref','tags'].forEach(k=>{ const inp=$('#w-'+k), er=$(`#w-${k}-err`);
    er.hidden=!errs[k]; er.textContent=errs[k]||''; if(errs[k]) inp.setAttribute('aria-invalid','true'); else inp.removeAttribute('aria-invalid'); });
  const bad=Object.keys(errs);
  if(bad.length){ $('#w-'+bad[0]).focus(); return announce(errs[bad[0]]); }
  const p={id:'mine-'+Date.now().toString(36), title, desc, ref, tags, at:new Date().toISOString().slice(0,10)};
  LociAPI.proposals.set(WANT_PROPS,[...wantProps(),p]); wantDraft=null;
  renderWanted(); refocus(`#wc-${p.id}`); $(`#wc-${p.id}`).scrollIntoView({block:'center'});
  announce(`Saved “${title}” under Your proposals, in this browser only.`); toast('Proposal saved in this browser');
}
function toggleWantVote(id){
  const votes=wantVotes(), on=votes.includes(id), msg=$('#w-vote-msg');
  if(!on && votes.length>=WANT_CAP){
    msg.textContent=`You have used all ${WANT_CAP} votes. Take one back to vote for this.`;
    toast(msg.textContent); return;
  }
  LociAPI.proposals.set(WANT_VOTES,on?votes.filter(x=>x!==id):[...votes,id]);
  renderWanted(); refocus(`[data-wvote="${CSS.escape(id)}"]`);
  announce(`${on?'Vote taken back':'Voted'}. Your votes: ${wantVotes().length} of ${WANT_CAP}.`);
}
/* "Make this" (docs/ideas/round2/210): open the Chalkboard on a starting piece with the request's id set as
   "bounty" in its loci.json, so Check this remix confirms the id names an open request. The starting piece is the
   challenge's own suggestion (starter) if it has one, else the single-module JS piece sharing the most tags, else the first. */
const remixable=v=>!v.manifest.targets && v.manifest.runtime==='js'; // one module, edited whole on the Chalkboard
function starterFor(c){
  const ok=VIZ.filter(remixable), s=c.starter&&vizById(c.starter);
  if(s && remixable(s)) return s;
  let best=null, n=0; for(const v of ok){ const k=v.tags.filter(t=>c.tags.includes(t)).length; if(k>n){ best=v; n=k; } }
  return best||ok[0];
}
function makeThis(id){
  const c=challengeById(id), v=c&&starterFor(c); if(!v) return;
  let j=null; try{ j=JSON.parse((rxText.get(v.id)||{}).manifest??rxManDefault(v)); }catch(_){}
  if(!j || typeof j!=='object' || Array.isArray(j)) j=JSON.parse(rxManDefault(v));
  j.bounty=c.id; setRxText(v,'manifest',JSON.stringify(j,null,2)+'\n');
  rxFile='json'; rxPreview=false; openBoard(v,{focus:'#rx-man'});
  announce(`“${v.title}” is on your Chalkboard to answer “${c.title}”: loci.json has "bounty": "${c.id}". Change the module, then Check this remix.`);
}
function removeProposal(id){
  const p=wantProps().find(x=>x.id===id); if(!p) return;
  LociAPI.proposals.set(WANT_PROPS,wantProps().filter(x=>x.id!==id)); LociAPI.proposals.set(WANT_VOTES,wantVotes().filter(x=>x!==id));
  renderWanted(); refocus('#w-mine-h'); announce(`Removed “${p.title}” from your proposals.`);
}
