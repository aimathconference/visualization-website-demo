/* ---------- your handle, and My Account (docs/ideas/round2/202-yours-page.md; its code keeps the old name, "yours") ----------
   Loaded after users.js and before app.js; the functions below run at call time and use app.js helpers
   ($, $$, esc, store, sig, VIZ, vizById, showView, jumpToViz, openDrawer, refocus, announce, toast, view, Moments,
   moLists, openMoments, drafts, delDraft, rxText, delRxText, rxChecks, ppLoad, PP_KEY, resetSignals, Lesson, showCallout)
   and those of bounties.js and questions.js.
   One handle ('loci:handle', validated by LociManifest.isHandle) is the name on everything you send: the remix package's
   author, Wanted proposals, preset proposals, the question-of-the-week answer and Ask. Without one, the text says "you"
   (the remix package, which needs a handle, says "@you"). It is edited in the keyboard shortcuts dialog and on My Account.
   My Account (#yours) shows your profile as anyone sees it (users.js profileHTML), then lists what is kept for you, with
   an Open for each thing and a Clear per section. Export and import are parked. Session-only stores ('loci:filter') are not listed. */
const HANDLE_KEY='loci:handle';
function myHandle(){ const h=LociAPI.handle.get(); return typeof h==='string' && LociManifest.isHandle(h)?h:''; }
/* the editor: the same markup in the keys dialog (p = 'hd-k') and on My Account (p = 'hd-y') */
function handleEditorHTML(p,label='Your handle'){
  return `<div class="hd-ed" role="group" aria-labelledby="${p}-l"><label class="flabel" for="${p}-in" id="${p}-l">${label}</label>
    <div class="hd-row"><input class="input" id="${p}-in" data-hd-in type="text" maxlength="40" placeholder="@name" value="${esc(myHandle())}" autocomplete="off" spellcheck="false" aria-describedby="${p}-msg"><button class="btn ghost" type="button" data-hd-save="${p}">Save handle</button></div>
    <p class="fine" id="${p}-msg" data-hd-msg role="status">${handleNow()}</p></div>`;
}
const handleNow=()=>{ const h=myHandle();
  if(LociAPI.server) return `Your handle on this demo server, the name on your profile and on everything you post or send: <b>${esc(h)}</b>. Lowercase letters, digits, dots, dashes and underscores, 3 to 20 of them.`;
  return h?`Your name on copies, Wanted and preset proposals, answers and questions you send: <b>${esc(h)}</b>. Kept in this browser only; empty it to be “you”.`
  :'No handle set, so what you send says “you”. A handle looks like @name (letters, digits, dots, dashes). Kept in this browser only.'; };
function saveHandle(p){
  const inp=$(`#${p}-in`), msg=$(`#${p}-msg`); if(!inp) return;
  let h=inp.value.trim(); if(h && h[0]!=='@') h='@'+h;
  if(h && !LociManifest.isHandle(h)){ inp.setAttribute('aria-invalid','true'); msg.textContent='A handle looks like @name: a letter or digit, then letters, digits, dots, dashes or underscores, at most 39.'; return announce(msg.textContent); }
  inp.removeAttribute('aria-invalid');
  const done=()=>{ syncHandle(); announce(h?`Your handle is ${h}.`:'Handle cleared: what you send says “you”.'); toast(h?`Handle saved: ${h}`:'Handle cleared'); };
  const p2=LociAPI.handle.set(h); // on the demo server: a promise, settled when the profile has the new handle
  if(!p2) return done();
  msg.textContent='Saving…';
  p2.then(()=>{ applyServerUsers(); done(); if(view==='yours') renderYours(); },
    e=>{ inp.setAttribute('aria-invalid','true'); msg.textContent=`Not saved: ${e.message}`; announce(msg.textContent); });
}
/* every place that shows the handle, refreshed after a save */
function syncHandle(){
  const h=myHandle();
  $$('[data-hd-in]').forEach(i=>{ if(i!==document.activeElement || i.value.trim().replace(/^@?/,'@')===h) i.value=h; });
  $$('[data-hd-msg]').forEach(m=>m.innerHTML=handleNow());
  $$('[data-hd-now]').forEach(s=>s.textContent=h||'you');
  if(typeof renderPpWho==='function') renderPpWho();
  if(typeof syncMeBtn==='function') syncMeBtn(); // the menu button shows the handle
}

/* ---------- My Account: opened over whichever view was showing; Back and Esc return to it ---------- */
const yoursPage={from:'feed', opener:null};
function openYours(opener){
  $$('.modal:not([hidden])').forEach(hideDialog);
  if(view!=='yours'){ yoursPage.from=view; yoursPage.opener=opener||document.activeElement; }
  if(view==='yours') renderYours(); else showView('yours');
  refocus('#yours h1'); announce('My Account');
}
function closeYours(){
  const {from, opener}=yoursPage; showView(from);
  if(opener && opener.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) opener.focus({preventScroll:true});
  else (from==='feed'?feed:$('#'+from)).focus({preventScroll:true});
}
/* stored keys with a prefix: this browser's localStorage, or yours on the demo server (api.js) */
const storeKeys=prefix=>LociAPI.kv.keys(prefix);
/* Chalkboard drafts by piece: [{v, keys, files}], from 'loci:draft:<rkey>' (the module) and 'loci:draft2:<id>' (loci.json, explanation.md) */
function yoDrafts(){
  const m=new Map(), at=id=>{ const v=vizById(id); if(!v) return null; if(!m.has(id)) m.set(id,{v, keys:[], files:[]}); return m.get(id); };
  for(const k of storeKeys('loci:draft:')){ const rk=k.slice(11), [id,tid]=rk.split('@'), d=at(id); if(!d || typeof LociAPI.drafts.get(k,null)!=='string') continue;
    d.keys.push(rk); d.files.push(tid?`the ${String(TARGET_NAME[tid]||tid).toLowerCase()} module`:'the module'); }
  for(const k of storeKeys('loci:draft2:')){ const d=at(k.slice(12)), o=LociAPI.drafts.get(k,null); if(!d || !o || typeof o!=='object') continue;
    d.text=true; if(typeof o.manifest==='string') d.files.push('loci.json'); if(typeof o.explanation==='string') d.files.push('explanation.md'); }
  return [...m.values()].filter(d=>d.files.length);
}
/* Ask drafts by piece: [{v, d}] */
const yoAsks=()=>storeKeys('loci:ask:').map(k=>vizById(k.slice(9))).filter(Boolean).map(v=>({v, d:qaDraft(v)})).filter(x=>x.d.text||x.d.st);
const cut=(s,n=90)=>{ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>n?s.slice(0,n-1)+'…':s; };
function yoRow(title,meta,btns){
  return `<li class="yrow"><div class="ytxt"><b>${title}</b><small>${meta}</small></div>${btns?`<div class="btnrow">${btns}</div>`:''}</li>`;
}
const yoBtn=(attrs,label,aria)=>`<button class="btn ghost" type="button" ${attrs}${aria?` aria-label="${esc(aria)}"`:''}>${label}</button>`;
/* the sections, in a fixed order: [{id, title, n, rows, empty, clear, what}] */
function yoSections(){
  const h=myHandle()||'you', lists=moLists(), dr=yoDrafts(), props=wantProps(), votes=wantVotes(), qa=qwAnswer(), asks=yoAsks(), pp=ppLoad();
  const nm=(n,one,many=one+'s')=>`${n} ${n===1?one:many}`;
  const qv=vizById(QUESTION.v);
  return [
    {id:'lists', title:'Lists of moments', n:lists.length, what:'your lists of moments', empty:'No lists yet. Add this moment (under Save, Customize and Share) starts one.',
      rows:lists.map(c=>{ const ps=[...new Set(c.items.map(it=>vizById(it.v).title))];
        return yoRow(esc(c.title||'Untitled list'),`${nm(c.items.length,'moment')}${ps.length?' of '+esc(ps.slice(0,3).join(', '))+(ps.length>3?'…':''):''} · by ${esc(h)}`,
          yoBtn(`data-yo-list="${esc(c.id)}"`,'Open',`Open the list ${c.title||'Untitled list'}`)); })},
    {id:'drafts', title:'Chalkboard drafts', n:dr.length, what:'your unsaved Chalkboard drafts', empty:'No drafts. On the Chalkboard, what you type is kept here until you Save or Revert.',
      rows:dr.map(d=>yoRow(esc(d.v.title),`Edited: ${esc(d.files.join(', '))} · author ${esc(myHandle()||'@you')}`,
        yoBtn(`data-yo-draft="${esc(d.v.id)}"`,'Open',`Open your draft of ${d.v.title}`)))},
    {id:'wanted', title:'Wanted proposals and votes', n:props.length+votes.length, what:'your Wanted proposals and votes', empty:'No proposals or votes. The Wanted page, under Browse, has both.',
      rows:[...props.map(p=>yoRow(esc(p.title),`Your proposal · ${esc(p.at)} · proposed by ${esc(h)}`,yoBtn(`data-wanted="${esc(p.id)}"`,'Open',`Open your proposal ${p.title}`))),
        ...votes.map(id=>{ const c=challengeById(id)||props.find(p=>p.id===id); return c?yoRow(esc(c.title),'Your vote',yoBtn(`data-wanted="${esc(id)}"`,'Open',`Open ${c.title}`)):''; })]},
    {id:'answers', title:'Answers and questions', n:(qa?1:0)+asks.length, what:'your question-of-the-week answer and your Ask drafts', empty:'No answers or questions. The Explanation tab has this week’s question and an Ask box.',
      rows:[...(qa&&qv?[yoRow(`This week’s question, ${esc(QUESTION.id)}`,`Your answer on ${esc(qv.title)}: ${qa.text?esc(cut(qa.text)):'no sentence'} · ${esc(stopSummary(qv,qa.st))} · by ${esc(h)}`,yoBtn('data-yo-qw','Open','Open your answer to this week’s question'))]:[]),
        ...asks.map(x=>yoRow(`Ask draft: ${esc(x.v.title)}`,`${x.d.text?esc(cut(x.d.text)):'no text yet'}${x.d.st?' · '+esc(stopSummary(x.v,x.d.st)):''} · asked by ${esc(h)}`,yoBtn(`data-yo-ask="${esc(x.v.id)}"`,'Open',`Open your question draft on ${x.v.title}`)))]},
    {id:'presets', title:'Preset proposals', n:pp.length, what:'your list of preset proposals (issues you opened stay on GitHub)', empty:'None. Share, then Propose this moment as a preset, lists them here.',
      rows:pp.map((x,i)=>{ const o=vizById(x.v); return yoRow(esc(x.label),`${esc(o?o.title:x.v)} · ${esc(x.at||'')} · sent to the author, not accepted`,
        `${o?yoBtn(`data-yo-pp="${i}"`,'Open',`Open the moment ${x.label}`):''}<a class="btn ghost" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="${esc(`The issue for ${x.label}, on GitHub`)}">The issue ↗</a>`); })},
    {id:'saved', title:'Saved pieces and likes', n:new Set([...sig.saves,...sig.likes]).size, what:'your likes, saved pieces and watch time (the For you signals)', empty:'Nothing saved or liked. Save and Like are on every slide.',
      rows:[...sig.saves.map(id=>{ const v=vizById(id); return yoRow(esc(v.title),`Saved${sig.likes.includes(id)?' and liked':''}`,yoBtn(`data-viz="${esc(id)}"`,'Open',`Open ${v.title}`)); }),
        ...sig.likes.filter(id=>!sig.saves.includes(id)).map(id=>{ const v=vizById(id); return yoRow(esc(v.title),'Liked',yoBtn(`data-viz="${esc(id)}"`,'Open',`Open ${v.title}`)); })]},
  ];
}
function renderYours(){
  const el=$('#yours'), S=yoSections(), total=S.reduce((a,s)=>a+s.n,0);
  const back={feed:'Back to the feed', browse:'Back to the catalog', blog:'Back to the blog', submit:'Back to Submit', wanted:'Back to Wanted', user:'Back to the profile', docs:'Back to the docs'}[yoursPage.from]||'Back';
  const srv=LociAPI.server, who=LociAPI.whoami();
  el.innerHTML=`<div class="wrap yours">
    <button class="backlink" type="button" data-yours-back>← ${back}</button>
    ${srv?profileHTML(who.handle,'My Account','<div class="btnrow"><button class="btn ghost" type="button" data-pf-edit>Edit bio and links</button></div>')
      :`<div class="pagehead"><div class="kicker">My Account</div><h1 tabindex="-1">${esc(myHandle()||'You')}</h1>
        ${who.signedOut?`<p id="y-who">You signed out of the demo server in this browser. <button class="btn" type="button" data-sign-in>Sign in</button></p>`:'<p>This page is not connected to an account, so there is no profile to show.</p>'}</div>`}
    ${srv?profileFormHTML(who.user):''}
    ${srv?`<section class="ysec" aria-labelledby="y-acct-h"><h2 class="sechead" id="y-acct-h">Account</h2>
      <p id="y-who">Signed in as <b>${esc(who.handle)}</b>${who.user&&who.user.role!=='user'?` (${esc(who.user.role)})`:''}. <button class="btn ghost" type="button" data-sign-out aria-describedby="y-so-hint">Sign out</button></p>
      <p class="fine" id="y-so-hint">Sign out makes this browser anonymous on the demo server: you can keep browsing, and what you mark stays in this browser until you sign back in. Tailscale still knows this device, so anyone using it can sign back in without a password.</p>
      ${actingHTML(who)}</section>`:''}
    <section class="ysec" aria-labelledby="y-hd-h"><h2 class="sechead" id="y-hd-h">Your handle</h2>${handleEditorHTML('hd-y','The name on what you send')}</section>
    <p class="fine">Everything you made or marked on ${esc(LociAPI.siteName())}, in one place: ${total?`${total} thing${total===1?'':'s'}`:'nothing yet'}. Open goes to each one where it lives.</p>
    ${S.map(s=>`<section class="ysec" id="ys-${s.id}" aria-labelledby="yh-${s.id}"><div class="yhead"><h2 class="sechead" id="yh-${s.id}" tabindex="-1">${esc(s.title)} <span class="ycount">${s.n}</span></h2>
      ${s.n?`<button class="btn ghost" type="button" data-yo-clear="${s.id}" aria-describedby="yc-${s.id}">${s.id==='saved'?'Reset my signals':'Clear'}</button>`:''}</div>
      ${s.n?`<p class="fine" id="yc-${s.id}">${s.id==='saved'?'Reset':'Clear'} deletes ${esc(s.what)} from ${LociAPI.server?'the demo server':'this browser'}, and nothing else. There is no undo.</p><ul class="ylist" role="list">${s.rows.join('')}</ul>`
        :`<p class="fine yempty">${esc(s.empty)}</p>`}</section>`).join('')}
  </div>`;
  el.scrollTop=0; $('#screen').scrollTop=0; // a scrollIntoView elsewhere can leave the screen itself scrolled, hiding the top bar
  paintThumbs(el);
  const pf=$('#pf-form',el); if(pf) pf.onsubmit=e=>{ e.preventDefault(); saveProfile(); };
}
/* Your bio and links, on the demo server. What you have typed and not saved survives a re-render (a Clear, a new handle). */
function profileFormHTML(u){
  const cur=$('#pf-form')?{bio:$('#pf-bio').value, homepage:$('#pf-home').value, github:$('#pf-gh').value}:{bio:u.bio||'', homepage:u.homepage||'', github:u.github||''};
  return `<section class="ysec" aria-labelledby="y-pf-h"><h2 class="sechead" id="y-pf-h">Your bio and links</h2>
    <form class="pf-form" id="pf-form" novalidate>
      <div class="pf-f"><label class="flabel" for="pf-bio">Bio</label><textarea class="input" id="pf-bio" rows="3" maxlength="300" aria-describedby="pf-msg">${esc(cur.bio)}</textarea></div>
      <div class="pf-f"><label class="flabel" for="pf-home">Homepage</label><input class="input" id="pf-home" type="url" inputmode="url" maxlength="200" placeholder="https://your-site.example" value="${esc(cur.homepage)}" autocomplete="url" spellcheck="false" aria-describedby="pf-msg"></div>
      <div class="pf-f"><label class="flabel" for="pf-gh">GitHub username</label><input class="input" id="pf-gh" type="text" maxlength="60" placeholder="your-username" value="${esc(cur.github)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="pf-gh-hint pf-msg">
        <p class="fine" id="pf-gh-hint">Enter only your own. Pieces imported from the registry under this GitHub username move to your account, and that cannot be undone here.</p></div>
      <div class="btnrow"><button class="btn" type="submit" id="pf-save">Save bio and links</button></div>
      <p class="fine" id="pf-msg" role="status"></p>
    </form></section>`;
}
async function saveProfile(){
  const btn=$('#pf-save'), msg=$('#pf-msg'), fields={bio:$('#pf-bio'), homepage:$('#pf-home'), github:$('#pf-gh')};
  if(btn.disabled) return;
  Object.values(fields).forEach(f=>f.removeAttribute('aria-invalid'));
  btn.disabled=true; msg.textContent='Saving…';
  try{
    await LociAPI.profile.save({bio:fields.bio.value, homepage:fields.homepage.value, github:fields.github.value});
    applyServerUsers(); $('#yours').innerHTML=''; // nothing left unsaved: the form starts again from what the server kept
    if(view==='yours'){ renderYours(); refocus('#yours h1'); }
    toast('Bio and links saved'); announce('Your bio and links are saved.');
  }catch(e){
    const f=/homepage/i.test(e.message)?fields.homepage:/github/i.test(e.message)?fields.github:/bio/i.test(e.message)?fields.bio:null;
    if(f){ f.setAttribute('aria-invalid','true'); f.focus(); }
    msg.textContent=`Not saved: ${e.message}`; announce(msg.textContent); btn.disabled=false;
  }
}
/* Dev mode on the demo server (AUTH_MODE=dev): who you are is the dev_login cookie, so one browser profile can act
   as anyone. In Tailscale mode identity comes from the tailnet and there is no box. */
function actingHTML(who){
  if(who.authMode!=='dev') return '';
  return `<div class="hd-ed" role="group" aria-labelledby="y-act-l"><label class="flabel" for="y-act-in" id="y-act-l">Acting as (dev mode)</label>
    <div class="hd-row"><input class="input" id="y-act-in" type="text" maxlength="80" value="${esc(who.devLogin||'')}" autocomplete="off" spellcheck="false" aria-describedby="y-act-msg"><button class="btn ghost" type="button" data-act-as>Switch</button></div>
    <p class="fine" id="y-act-msg">Any login, such as ann@example.com; empty goes back to the default. The page reloads as that person.</p></div>`;
}
function actAs(){
  const v=($('#y-act-in')||{}).value; if(v==null) return; const login=v.trim();
  document.cookie=login?`dev_login=${encodeURIComponent(login)}; path=/; max-age=31536000; SameSite=Strict`:'dev_login=; path=/; max-age=0';
  location.reload();
}
/* Clear, pressed twice: the first press asks */
function yoClear(id,b){
  const s=yoSections().find(x=>x.id===id); if(!s) return;
  if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent=`Yes, ${id==='saved'?'reset':'clear'} ${s.n}`; return announce(`${id==='saved'?'Reset':'Clear'} ${s.n} of ${s.what}? Press again to confirm.`); }
  if(id==='lists'){ Moments.save([]); moList=null; moSel=null; }
  else if(id==='drafts'){ for(const d of yoDrafts()){ d.keys.forEach(k=>{ delDraft(k); rxChecks.delete(k); }); if(d.text) delRxText(d.v); } }
  else if(id==='wanted'){ LociAPI.proposals.del(WANT_PROPS); LociAPI.proposals.del(WANT_VOTES); }
  else if(id==='answers'){ LociAPI.answers.del(qwKey()); storeKeys('loci:ask:').forEach(k=>LociAPI.answers.del(k)); }
  else if(id==='presets') LociAPI.proposals.del(PP_KEY);
  else if(id==='saved') resetSignals();
  renderYours(); refocus(`#yh-${id}`); announce(`Cleared ${s.what}.`); toast(id==='saved'?'Signals reset':LociAPI.server?'Cleared on the demo server':'Cleared in this browser');
}
/* Open: each thing where it lives */
function yoOpen(b){
  const d=b.dataset;
  if(d.yoList!=null){ const c=moLists().find(x=>x.id===d.yoList); if(!c) return; const v=vizById((c.items[0]||{}).v)||(curSlide()||{}).v||VIZ[0];
    jumpToViz(v.id); moSel=c.id; return requestAnimationFrame(()=>requestAnimationFrame(()=>{ const sl=slides.find(x=>x.v===v); openMoments(v,sl&&$('[data-act="save"]',sl.el)); })); }
  if(d.yoDraft!=null){ const v=vizById(d.yoDraft); if(v) openBoard(v); return; }
  const explain=(v,sel,msg)=>{ jumpToViz(v.id); requestAnimationFrame(()=>requestAnimationFrame(()=>{ const sl=slides.find(x=>x.v===v); openDrawer('explain',v,sl&&$('[data-act="explain"]',sl.el));
    setTimeout(()=>{ const b=$('#d-body'), t=$(sel,b); if(t) b.scrollTop+=t.getBoundingClientRect().top-b.getBoundingClientRect().top-b.clientHeight/3; announce(msg); },60); })); };
  if(d.yoQw!=null){ const v=vizById(QUESTION.v); if(v) explain(v,'#qweek','This week’s question and your answer'); return; }
  if(d.yoAsk!=null){ const v=vizById(d.yoAsk); if(v) explain(v,'#qa-text',`Your question draft on ${v.title}, at the foot of the Explanation`); return; } // scrolled to, not focused: focusing the box attaches the slide's moment now
  if(d.yoPp!=null){ const x=ppLoad()[+d.yoPp], v=x&&vizById(x.v); if(!v) return; jumpToViz(v.id);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ const p=x.preset||{}; Lesson.apply(v,{p:p.params, t:p.t, view:p.view}); const sl=slides.find(s=>s.v===v); if(sl) showCallout(sl,{label:x.label, note:x.note||''}); announce(`Your proposed preset, ${x.label}.`); }));
  }
}
document.addEventListener('click',e=>{
  const t=e.target; if(!t.closest) return;
  const oy=t.closest('[data-open-yours]'); if(oy){ e.stopPropagation(); closeMenu(false); return openYours(oy.closest('.modal,.menu')?styleBtn:oy); }
  if(t.closest('[data-yours-back]')) return closeYours();
  if(t.closest('[data-pf-edit]')){ const b=$('#pf-bio'); b.scrollIntoView({block:'center'}); return b.focus({preventScroll:true}); }
  const hs=t.closest('[data-hd-save]'); if(hs) return saveHandle(hs.dataset.hdSave);
  if(t.closest('[data-act-as]')) return actAs();
  const so=t.closest('[data-sign-out]'); if(so){ if(!so.dataset.armed){ so.dataset.armed='1'; so.textContent='Yes, sign out'; return announce('Sign out of the demo server in this browser? Press again to confirm.'); } return LociAPI.signOut().catch(e=>toast(`Could not sign out: ${e.message}`)); }
  if(t.closest('[data-sign-in]')) return LociAPI.signIn().catch(e=>toast(`Could not sign in: ${e.message}`));
  const cl=t.closest('[data-yo-clear]'); if(cl) return yoClear(cl.dataset.yoClear,cl);
  const op=t.closest('[data-yo-list],[data-yo-draft],[data-yo-qw],[data-yo-ask],[data-yo-pp]'); if(op) return yoOpen(op);
},true);
document.addEventListener('keydown',e=>{ if(e.target.id==='y-act-in' && e.key==='Enter' && !e.isComposing){ e.preventDefault(); return actAs(); } const i=e.target.closest&&e.target.closest('[data-hd-in]'); if(i && e.key==='Enter' && !e.isComposing){ e.preventDefault(); saveHandle(i.id.replace(/-in$/,'')); } });
