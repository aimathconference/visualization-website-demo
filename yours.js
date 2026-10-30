/* ---------- your handle, and the Yours page (docs/ideas/round2/202-yours-page.md) ----------
   Loaded after users.js and before app.js; the functions below run at call time and use app.js helpers
   ($, $$, esc, store, sig, VIZ, vizById, showView, jumpToViz, openDrawer, refocus, announce, toast, view, Moments,
   moLists, openMoments, drafts, delDraft, rxText, delRxText, rxChecks, ppLoad, PP_KEY, resetSignals, Lesson, showCallout)
   and those of bounties.js and questions.js.
   One handle ('loci:handle', validated by LociManifest.isHandle) is the name on everything you send: the remix package's
   author, Wanted proposals, preset proposals, the question-of-the-week answer and Ask. Without one, the text says "you"
   (the remix package, which needs a handle, says "@you"). It is edited in the keyboard shortcuts dialog and on Yours.
   The Yours view (#yours) is read-only: it lists what this browser keeps for you, with an Open for each thing and a
   Clear per section. Export and import are parked. Session-only stores ('loci:remix:', 'loci:filter') are not listed. */
const HANDLE_KEY='loci:handle';
function myHandle(){ const h=LociAPI.handle.get(); return typeof h==='string' && LociManifest.isHandle(h)?h:''; }
/* the editor: the same markup in the keys dialog (p = 'hd-k') and on Yours (p = 'hd-y') */
function handleEditorHTML(p,label='Your handle'){
  return `<div class="hd-ed" role="group" aria-labelledby="${p}-l"><label class="flabel" for="${p}-in" id="${p}-l">${label}</label>
    <div class="hd-row"><input class="input" id="${p}-in" data-hd-in type="text" maxlength="40" placeholder="@name" value="${esc(myHandle())}" autocomplete="off" spellcheck="false" aria-describedby="${p}-msg"><button class="btn ghost" type="button" data-hd-save="${p}">Save handle</button></div>
    <p class="fine" id="${p}-msg" data-hd-msg role="status">${handleNow()}</p></div>`;
}
const handleNow=()=>{ const h=myHandle();
  if(LociAPI.server) return `Your handle on this demo server, the name on your profile and on everything you post or send: <b>${esc(h)}</b>. Lowercase letters, digits, dots, dashes and underscores, 3 to 20 of them.`;
  return h?`Your name on remixes, Wanted and preset proposals, answers and questions you send: <b>${esc(h)}</b>. Kept in this browser only; empty it to be “you”.`
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
}

/* ---------- the Yours view: opened over whichever view was showing; Back and Esc return to it ---------- */
const yoursPage={from:'feed', opener:null};
function openYours(opener){
  $$('.modal:not([hidden])').forEach(hideDialog);
  if(view!=='yours'){ yoursPage.from=view; yoursPage.opener=opener||document.activeElement; }
  if(view==='yours') renderYours(); else showView('yours');
  refocus('#yours h1'); announce('Yours: what this browser keeps for you');
}
function closeYours(){
  const {from, opener}=yoursPage; showView(from);
  if(opener && opener.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) opener.focus({preventScroll:true});
  else (from==='feed'?feed:$('#'+from)).focus({preventScroll:true});
}
/* stored keys with a prefix: this browser's localStorage, or yours on the demo server (api.js) */
const storeKeys=prefix=>LociAPI.kv.keys(prefix);
/* remix drafts by piece: [{v, keys, files}], from 'loci:draft:<rkey>' (the module) and 'loci:draft2:<id>' (loci.json, explanation.md) */
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
const LOCAL=' · in this browser only', SHARED=' · on the demo server';
function yoRow(title,meta,btns){
  return `<li class="yrow"><div class="ytxt"><b>${title}</b><small>${meta}${LociAPI.server?SHARED:LOCAL}</small></div>${btns?`<div class="btnrow">${btns}</div>`:''}</li>`;
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
    {id:'drafts', title:'Remix drafts', n:dr.length, what:'your remix drafts (a remix you ran stays for this tab)', empty:'No drafts. Source, then Remix, keeps what you type here until Revert.',
      rows:dr.map(d=>yoRow(esc(d.v.title),`Edited: ${esc(d.files.join(', '))} · author ${esc(myHandle()||'@you')}`,
        yoBtn(`data-yo-draft="${esc(d.v.id)}"`,'Open',`Open the remix draft of ${d.v.title}`)))},
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
    <div class="pagehead"><div class="kicker">Yours</div><h1 tabindex="-1">${srv?'What the demo server keeps for you':'What this browser keeps for you'}</h1>
      ${srv?`<p id="y-who">Signed in as <button class="by-user" type="button" data-user="${esc(who.handle)}">${esc(who.handle)}</button>${who.user&&who.user.role!=='user'?` (${esc(who.user.role)})`:''}.</p>`:''}
      <p>Everything you made or marked on Loci, in one place: ${total?`${total} thing${total===1?'':'s'}`:'nothing yet'}. Open goes to each one where it lives.</p>
      ${srv?`<p class="note">Kept on the demo server under your profile, so it follows you to any device you sign in from. Your likes count toward the totals everyone sees; the rest is yours alone. A remix you ran, the feed filter and the Mode preference stay in this browser.</p>${actingHTML(who)}`
        :`<p class="note">Kept in this browser only. Nobody else sees it, it does not move to another device, and clearing this site’s data deletes it. This is not an account.</p>`}</div>
    <section class="ysec" aria-labelledby="y-hd-h"><h2 class="sechead" id="y-hd-h">Your handle</h2>${handleEditorHTML('hd-y','The name on what you send')}</section>
    ${S.map(s=>`<section class="ysec" id="ys-${s.id}" aria-labelledby="yh-${s.id}"><div class="yhead"><h2 class="sechead" id="yh-${s.id}" tabindex="-1">${esc(s.title)} <span class="ycount">${s.n}</span></h2>
      ${s.n?`<button class="btn ghost" type="button" data-yo-clear="${s.id}" aria-describedby="yc-${s.id}">${s.id==='saved'?'Reset my signals':'Clear'}</button>`:''}</div>
      ${s.n?`<p class="fine" id="yc-${s.id}">${s.id==='saved'?'Reset':'Clear'} deletes ${esc(s.what)} from ${LociAPI.server?'the demo server':'this browser'}, and nothing else. There is no undo.</p><ul class="ylist" role="list">${s.rows.join('')}</ul>`
        :`<p class="fine yempty">${esc(s.empty)}</p>`}</section>`).join('')}
    <p class="fine">Not listed: a remix you ran (kept for this tab), the feed filter and the Mode preference. Export and import are not in this prototype.</p>
  </div>`;
  el.scrollTop=0; $('#screen').scrollTop=0; // a scrollIntoView elsewhere can leave the screen itself scrolled, hiding the top bar
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
  document.cookie=login?`dev_login=${encodeURIComponent(login)}; path=/; SameSite=Strict`:'dev_login=; path=/; max-age=0';
  location.reload();
}
/* Clear, pressed twice: the first press asks */
function yoClear(id,b){
  const s=yoSections().find(x=>x.id===id); if(!s) return;
  if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent=`Yes, ${id==='saved'?'reset':'clear'} ${s.n}`; return announce(`${id==='saved'?'Reset':'Clear'} ${s.n} of ${s.what}? Press again to confirm.`); }
  if(id==='lists'){ Moments.save([]); moList=null; moSel=null; }
  else if(id==='drafts'){ for(const d of yoDrafts()){ d.keys.forEach(k=>{ delDraft(k); rxChecks.delete(k); }); if(d.text) delRxText(d.v); remixOpen.delete(d.v.id); } }
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
  if(d.yoDraft!=null){ const v=vizById(d.yoDraft); if(!v) return; remixOpen.add(v.id); jumpToViz(v.id);
    return requestAnimationFrame(()=>requestAnimationFrame(()=>{ const sl=slides.find(x=>x.v===v); openDrawer('source',v,sl&&$('[data-act="source"]',sl.el)); announce(`The remix draft of ${v.title}`); })); }
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
  const hs=t.closest('[data-hd-save]'); if(hs) return saveHandle(hs.dataset.hdSave);
  if(t.closest('[data-act-as]')) return actAs();
  const cl=t.closest('[data-yo-clear]'); if(cl) return yoClear(cl.dataset.yoClear,cl);
  const op=t.closest('[data-yo-list],[data-yo-draft],[data-yo-qw],[data-yo-ask],[data-yo-pp]'); if(op) return yoOpen(op);
},true);
document.addEventListener('keydown',e=>{ if(e.target.id==='y-act-in' && e.key==='Enter' && !e.isComposing){ e.preventDefault(); return actAs(); } const i=e.target.closest&&e.target.closest('[data-hd-in]'); if(i && e.key==='Enter' && !e.isComposing){ e.preventDefault(); saveHandle(i.id.replace(/-in$/,'')); } });
