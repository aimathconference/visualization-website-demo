/* ---------- the pinned question (docs/questions.md) ----------
   Loaded after catalog.js and before app.js; the functions below run at call time and use app.js helpers
   ($, esc, store, vizById, slides, stateOf, shareURL, Lesson, stopSummary, setPaused, showCallout, announce, toast).
   One question, pinned on one piece, that the picture answers with a state (params and a moment t). Answers stay in
   this browser ('loci:question:<id>'); "Send to the editors" opens a prefilled GitHub issue, and nothing is sent from
   the page. The question and its reveal are a SAMPLE written for this prototype: no editor is reading answers yet. */
const QUESTION = {
  id:'2026-w44', v:'times-table', posted:'2026-10-26', by:'The Loci editors', sample:true,
  q:'Find a moment on this slide when every chord is parallel to every other. For which n and k does that happen?',
  how:'Pause, choose n in Customize, and scrub with , and . (or [ and ] for whole seconds, or drag sideways on the stage) until the chords line up. Then press Answer with this moment and say in one sentence why it works.',
  reveal:{ state:{p:{n:50}, t:261.11},
    text:'Take k ≡ −1 (mod n), for example n = 50 and k = 49 (t ≈ 261.1 s, since k = 2 + 0.18 t). Then i ↦ k·i ≡ −i joins each point to its mirror image across the vertical diameter, so every chord is horizontal: the map is a reflection of the circle. The label still says “epicycloid, 48 cusps”, because that is the limit as n → ∞ with k fixed; here k is as large as n, and only k mod n matters. Any n from 20 to 63 works on this slide, with k = n − 1, and for n up to 31 also k = 2n − 1.' },
};
const QW_REPO='loci-viz/registry', QW_MAX=280; // the planned registry (PLAN.md), the same as the Wanted page's
const qwKey=()=>'loci:question:'+QUESTION.id;
let qwReveal=false; // "Show the reveal" lasts for this page view
/* your stored answer {st:{p,t,view}, url, text, at}, or null */
function qwAnswer(){
  const a=store.get(qwKey(),null), v=vizById(QUESTION.v);
  if(!a || typeof a!=='object' || !a.st || typeof a.st!=='object' || !v) return null;
  return {st:Lesson.stop(a.st,v,m=>console.warn('loci: your saved answer:',m)), url:typeof a.url==='string'?a.url:'', text:typeof a.text==='string'?a.text.slice(0,QW_MAX):'', at:a.at};
}
const qwDate=d=>{ const [y,m,day]=d.split('-').map(Number); return `${MONTHS_LONG[m-1]} ${day}, ${y}`; };
/* a state link for a stored stop (the theme left out) */
function qwLink(v,st){ const o={v:v.id, ...Lesson.compact(v,st)}; delete o.note; return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}&p=${b64u.enc(JSON.stringify(o))}`; }
function qwIssueURL(a){
  const v=vizById(QUESTION.v);
  const body=`### Question (${QUESTION.id})\n${QUESTION.q}\n\n### My answer\n${a.text||'(no sentence)'}\n\n### My moment\n${a.url}\n${stopSummary(v,a.st)}\n\n---\nSent from the Loci prototype. Answers are read by the editors; nothing is public until the reveal.`;
  return `https://github.com/${QW_REPO}/issues/new?labels=question-of-the-week&title=${encodeURIComponent(`Answer to ${QUESTION.id}: ${v.title}`)}&body=${encodeURIComponent(body)}`;
}
/* the small card in the slide's caption */
const qwCard=v=>v.id===QUESTION.v?`<button class="qcard" type="button" data-act="question"><span class="kicker">This week’s question${QUESTION.sample?' · sample':''}</span><span class="qtext">${esc(QUESTION.q)}</span></button>`:'';
/* the block at the top of the Explanation tab */
function qwBlock(v){
  if(v.id!==QUESTION.v) return '';
  const a=qwAnswer(), R=QUESTION.reveal, rst=Lesson.stop(R.state,v,()=>{});
  return `<section class="qweek" id="qweek" aria-labelledby="qw-h" tabindex="-1">
    <div class="kicker" id="qw-h">This week’s question · posted ${esc(qwDate(QUESTION.posted))}${QUESTION.sample?' <span class="samp">sample</span>':''}</div>
    <p class="qtext">${esc(QUESTION.q)}</p>
    <p class="fine">${esc(QUESTION.how)}</p>
    <label class="flabel" for="qw-text">Your sentence <output id="qw-n">${(a?a.text.length:0)}/${QW_MAX}</output></label>
    <textarea class="input" id="qw-text" rows="2" maxlength="${QW_MAX}" placeholder="Why does it happen at this moment?">${esc(a?a.text:'')}</textarea>
    <div class="btnrow"><button class="btn" type="button" id="qw-answer">${a?'Answer again with this moment':'Answer with this moment'}</button></div>
    <div id="qw-mine">${qwMineHTML(v,a)}</div>
    <div class="btnrow"><button class="btn ghost" type="button" id="qw-reveal" aria-expanded="${qwReveal}" aria-controls="qw-rv">${qwReveal?'Hide the reveal':'Show the reveal'}</button></div>
    <div class="qreveal" id="qw-rv"${qwReveal?'':' hidden'}>
      <p class="flabel">The reveal</p>
      <p>${esc(R.text)}</p>
      <div class="btnrow"><button class="btn" type="button" id="qw-show">Show me</button><button class="btn ghost" type="button" id="qw-copy">Copy the link</button><span class="fine">${esc(stopSummary(v,rst))}</span></div>
      ${a?`<p class="fine">Your answer was at ${esc(stopSummary(v,a.st))}.</p>`:''}
    </div></section>`;
}
function qwMineHTML(v,a){
  if(!a) return `<p class="fine">Nothing saved yet. Your answer is kept in this browser only.</p>`;
  return `<div class="qmine" role="group" aria-labelledby="qw-mh"><p class="flabel" id="qw-mh">Your answer</p>
    <p>${a.text?esc(a.text):'<i>No sentence yet.</i>'}</p><p class="fine">${esc(stopSummary(v,a.st))}</p>
    <div class="btnrow"><button class="btn ghost" type="button" id="qw-mine-show">Show my moment</button><a class="btn ghost" id="qw-send" href="${esc(qwIssueURL(a))}" target="_blank" rel="noopener">Send to the editors</a><button class="linkbtn" type="button" id="qw-del">Delete</button></div>
    <p class="fine">Saved in this browser and seen by nobody else. <b>Send to the editors</b> opens a new issue on github.com/${esc(QW_REPO)} with your sentence and your moment's link filled in; nothing is filed until you press Submit there. The registry is planned, not live, in this prototype, so the page may not exist yet.</p></div>`;
}
/* put the slide behind the panel at a stop and hold it there */
function qwApply(v,st,label){
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true);
  setPaused(true,true); Lesson.apply(v,st); // pause first, as Lesson.go does
  setTimeout(()=>seekViz(v,st.t||0),150); // a frame report sent before the pause arrived can overwrite the host's t; seek once more
  const sl=slides.find(x=>x.v===v); if(sl) showCallout(sl,{label, note:stopSummary(v,st)});
  announce(`${label}: ${stopSummary(v,st)}. Paused.`);
}
function bindQweek(v,body){
  if(v.id!==QUESTION.v || !$('#qweek',body)) return;
  const txt=$('#qw-text',body), redo=()=>{ const a=qwAnswer(); $('#qw-mine',body).innerHTML=qwMineHTML(v,a); bindMine(); $('#qw-answer',body).textContent=a?'Answer again with this moment':'Answer with this moment'; };
  txt.oninput=()=>{ $('#qw-n',body).textContent=`${txt.value.length}/${QW_MAX}`; const a=qwAnswer(); if(a){ a.text=txt.value.slice(0,QW_MAX); store.set(qwKey(),{st:Lesson.compact(v,a.st),url:a.url,text:a.text,at:a.at}); const s=$('#qw-send',body); if(s) s.href=qwIssueURL(a); } };
  $('#qw-answer',body).onclick=()=>{
    const st=Lesson.capture(v,''); delete st.note;
    store.set(qwKey(),{st, url:shareURL(v), text:txt.value.trim().slice(0,QW_MAX), at:new Date().toISOString()});
    redo(); const a=qwAnswer(); announce(`Saved your answer at ${stopSummary(v,a.st)}.`); toast('Answer saved in this browser');
  };
  const bindMine=()=>{
    const s=$('#qw-mine-show',body); if(!s) return;
    s.onclick=()=>{ const a=qwAnswer(); if(a) qwApply(v,a.st,'Your answer'); };
    $('#qw-del',body).onclick=()=>{ store.del(qwKey()); txt.value=''; $('#qw-n',body).textContent=`0/${QW_MAX}`; redo(); $('#qw-answer',body).focus(); announce('Deleted your answer.'); };
  };
  bindMine();
  $('#qw-reveal',body).onclick=e=>{ qwReveal=!qwReveal; $('#qw-rv',body).hidden=!qwReveal; e.currentTarget.textContent=qwReveal?'Hide the reveal':'Show the reveal'; e.currentTarget.setAttribute('aria-expanded',qwReveal); if(qwReveal) announce('The reveal: '+QUESTION.reveal.text); };
  const rst=()=>Lesson.stop(QUESTION.reveal.state,v,m=>console.warn('loci: the question\'s reveal:',m));
  $('#qw-show',body).onclick=()=>qwApply(v,rst(),'The reveal');
  $('#qw-copy',body).onclick=()=>copyText(qwLink(v,rst()),'Link to the reveal copied');
}
