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
  const a=LociAPI.answers.get(qwKey(),null), v=vizById(QUESTION.v);
  if(!a || typeof a!=='object' || !a.st || typeof a.st!=='object' || !v) return null;
  return {st:Lesson.stop(a.st,v,m=>console.warn('loci: your saved answer:',m)), url:typeof a.url==='string'?a.url:'', text:typeof a.text==='string'?a.text.slice(0,QW_MAX):'', at:a.at};
}
const qwDate=d=>{ const [y,m,day]=d.split('-').map(Number); return `${MONTHS_LONG[m-1]} ${day}, ${y}`; };
/* a state link for a stored stop (the theme left out) */
function qwLink(v,st){ const o={v:v.id, ...Lesson.compact(v,st)}; delete o.note; return location.origin+location.pathname+`?v=${encodeURIComponent(v.id)}&p=${b64u.enc(JSON.stringify(o))}`; }
function qwIssueURL(a){
  const v=vizById(QUESTION.v);
  const body=`### Question (${QUESTION.id})\n${QUESTION.q}\n\n### My answer\n${a.text||'(no sentence)'}\n\n### My moment\n${a.url}\n${stopSummary(v,a.st)}\n\n${myHandle()?`### Answered by\n${myHandle()}\n\n`:''}---\nSent from the Loci prototype. Answers are read by the editors; nothing is public until the reveal.`;
  return `https://github.com/${QW_REPO}/issues/new?labels=question-of-the-week&title=${encodeURIComponent(`Answer to ${QUESTION.id}: ${v.title}`)}&body=${encodeURIComponent(body)}`;
}
/* the small card in the slide's caption */
const qwCard=v=>v.id===QUESTION.v?`<button class="qcard" type="button" data-act="question"><span class="kicker">This week’s question${QUESTION.sample?' · sample':''}</span><span class="qtext">${texText(QUESTION.q)}</span></button>`:'';
/* the block at the top of the Explanation tab */
function qwBlock(v){
  if(v.id!==QUESTION.v) return '';
  const a=qwAnswer(), R=QUESTION.reveal, rst=Lesson.stop(R.state,v,()=>{});
  return `<section class="qweek" id="qweek" aria-labelledby="qw-h" tabindex="-1">
    <div class="kicker" id="qw-h">This week’s question · posted ${esc(qwDate(QUESTION.posted))}${QUESTION.sample?' <span class="samp">sample</span>':''}</div>
    <p class="qtext">${texText(QUESTION.q)}</p>
    <p class="fine">${texText(touchCopy(QUESTION.how))}</p>
    <label class="flabel" for="qw-text">Your sentence <output id="qw-n">${(a?a.text.length:0)}/${QW_MAX}</output></label>
    <textarea class="input" id="qw-text" rows="2" maxlength="${QW_MAX}" placeholder="Why does it happen at this moment?">${esc(a?a.text:'')}</textarea>
    <div class="btnrow"><button class="btn" type="button" id="qw-answer">${a?'Answer again with this moment':'Answer with this moment'}</button></div>
    <div id="qw-mine">${qwMineHTML(v,a)}</div>
    <div class="btnrow"><button class="btn ghost" type="button" id="qw-reveal" aria-expanded="${qwReveal}" aria-controls="qw-rv">${qwReveal?'Hide the reveal':'Show the reveal'}</button></div>
    <div class="qreveal" id="qw-rv"${qwReveal?'':' hidden'}>
      <p class="flabel">The reveal</p>
      <p>${texText(R.text)}</p>
      <div class="btnrow"><button class="btn" type="button" id="qw-show">Show me</button><button class="btn ghost" type="button" id="qw-copy">Copy the link</button><span class="fine">${esc(stopSummary(v,rst))}</span></div>
      ${a?`<p class="fine">Your answer was at ${esc(stopSummary(v,a.st))}.</p>`:''}
    </div></section>`;
}
function qwMineHTML(v,a){
  if(!a) return `<p class="fine">Nothing saved yet. Your answer is kept in this browser only.</p>`;
  return `<div class="qmine" role="group" aria-labelledby="qw-mh"><p class="flabel" id="qw-mh">Your answer</p>
    <p>${a.text?texText(a.text):'<i>No sentence yet.</i>'}</p><p class="fine">${esc(stopSummary(v,a.st))}</p>
    <div class="btnrow"><button class="btn ghost" type="button" id="qw-mine-show">Show my moment</button><a class="btn ghost" id="qw-send" href="${esc(qwIssueURL(a))}" target="_blank" rel="noopener">Send to the editors</a><button class="linkbtn" type="button" id="qw-del">Delete</button></div>
    <p class="fine">Saved in this browser and seen by nobody else. <b>Send to the editors</b> opens a new issue on github.com/${esc(QW_REPO)} with your sentence and your moment's link filled in; nothing is filed until you ${touchCopy('press Submit')} there. The registry is planned, not live, in this prototype, so the page may not exist yet.</p></div>`;
}
/* put the slide behind the panel at a stop and hold it there */
function qwApply(v,st,label,src){
  if(lessonPlay && lessonPlay.v===v) Lesson.exit(true);
  setPaused(true,true); Lesson.apply(v,st); // pause first, as Lesson.go does
  setTimeout(()=>seekViz(v,st.t||0),150); // a frame report sent before the pause arrived can overwrite the host's t; seek once more
  peekDrawer(src); // phones: lower the sheet so the moment shows
  const sl=slides.find(x=>x.v===v); if(sl) showCallout(sl,{label, note:stopSummary(v,st)});
  announce(`${label}: ${stopSummary(v,st)}. Paused.`);
}
function bindQweek(v,body){
  if(v.id!==QUESTION.v || !$('#qweek',body)) return;
  typeset($('#qweek',body)); // the question, the hint and the reveal may carry $…$ math, as explanations do
  const txt=$('#qw-text',body), redo=()=>{ const a=qwAnswer(); $('#qw-mine',body).innerHTML=qwMineHTML(v,a); typeset($('#qw-mine',body)); bindMine(); $('#qw-answer',body).textContent=a?'Answer again with this moment':'Answer with this moment'; };
  txt.oninput=()=>{ $('#qw-n',body).textContent=`${txt.value.length}/${QW_MAX}`; const a=qwAnswer(); if(a){ a.text=txt.value.slice(0,QW_MAX); LociAPI.answers.set(qwKey(),{st:Lesson.compact(v,a.st),url:a.url,text:a.text,at:a.at}); const s=$('#qw-send',body); if(s) s.href=qwIssueURL(a); } };
  $('#qw-answer',body).onclick=()=>{
    const st=Lesson.capture(v,''); delete st.note;
    LociAPI.answers.set(qwKey(),{st, url:shareURL(v), text:txt.value.trim().slice(0,QW_MAX), at:new Date().toISOString()});
    redo(); const a=qwAnswer(); announce(`Saved your answer at ${stopSummary(v,a.st)}.`); toast('Answer saved in this browser');
  };
  const bindMine=()=>{
    const s=$('#qw-mine-show',body); if(!s) return;
    s.onclick=()=>{ const a=qwAnswer(); if(a) qwApply(v,a.st,'Your answer',s); };
    $('#qw-del',body).onclick=()=>{ LociAPI.answers.del(qwKey()); txt.value=''; $('#qw-n',body).textContent=`0/${QW_MAX}`; redo(); $('#qw-answer',body).focus(); announce('Deleted your answer.'); };
  };
  bindMine();
  $('#qw-reveal',body).onclick=e=>{ qwReveal=!qwReveal; $('#qw-rv',body).hidden=!qwReveal; e.currentTarget.textContent=qwReveal?'Hide the reveal':'Show the reveal'; e.currentTarget.setAttribute('aria-expanded',qwReveal); if(qwReveal) announce('The reveal: '+QUESTION.reveal.text); };
  const rst=()=>Lesson.stop(QUESTION.reveal.state,v,m=>console.warn('loci: the question\'s reveal:',m));
  $('#qw-show',body).onclick=e=>qwApply(v,rst(),'The reveal',e.currentTarget);
  $('#qw-copy',body).onclick=()=>copyText(qwLink(v,rst()),'Link to the reveal copied');
}

/* ---------- questions on a moment (docs/questions.md, "Questions on a moment") ----------
   A read-only "Questions" section at the bottom of the Explanation tab. Each question is anchored to a state
   {p, t, view} (a lesson stop without a note), and "Show me" puts the slide behind the panel at it. Everything in
   SAMPLE_QUESTIONS is a SAMPLE written for this prototype, not by the pieces' authors, and is labelled so on the page:
   there is no thread backend. The Ask box captures the slide's state when you click into it, keeps your draft in this
   browser ('loci:ask:<piece id>'), and opens a prefilled new issue on the piece's own repository. */
const SAMPLE_QUESTIONS = {
  'elliptic-group-law':[
    { state:{p:{b:40}, t:2.2},
      q:'At b = 0.40 the curve nearly pinches near x ≈ 0.58. What happens there as b goes down?',
      a:'The curve is y² = f(x) with f(x) = x³ − x + b, and f has a local minimum at x = 1/√3 ≈ 0.577 with value b − 2/(3√3) ≈ b − 0.385. At b = 0.40 that minimum is about 0.015, so y = ±√f(x) is nearly 0 there: that is the waist. At b = 2/(3√3) the minimum touches 0, f has a double root and the curve has a node (Δ = 0), so it is not an elliptic curve. Below that value f is negative on an interval and the curve splits into an oval and an unbounded branch; try b = 0.35.' },
    { state:{p:{b:100}, t:2.2, view:{P:[1.2,1], Q:[1.2,-1]}},
      q:'Here P and Q are mirror images and the readout says P + Q = 𝒪. Where is the third intersection point?',
      a:'The line through P and −P is vertical, and in the projective plane every vertical line passes through the point at infinity 𝒪 = [0 : 1 : 0], which lies on the curve. So the third point is 𝒪, its reflection is 𝒪 again, and P + (−P) = 𝒪: reflection across the x-axis is negation, and 𝒪 is the identity.' },
    { state:{p:{b:30}, t:2.2, view:{P:[-0.9,1], Q:[-0.9,1]}},
      q:'With P on the oval, 2P lands on the unbounded branch. Is that an accident of this P?',
      a:'No. For b below 0.385 the real points form a group E(ℝ) ≅ S¹ × ℤ/2ℤ. The unbounded branch contains 𝒪 and is the identity component, and the oval is its other coset. The quotient has order 2, so the sum of two points of the oval, 2P in particular, always lies on the unbounded branch, while a point of the oval plus a point of the branch lies on the oval.' },
  ],
  'riemann-sums':[
    { state:{p:{rule:0}, t:17.5},
      q:'The left-rule error at n = 64 is −0.0860. Could I have predicted that without adding up 64 rectangles?',
      a:'To two digits, yes. On each piece the left rectangle misses about f′(x)Δx²/2 of area, and adding these up gives about (Δx/2)∫₀⁵ f′(x) dx = (f(5) − f(0))Δx/2. With f(5) ≈ 3.388, f(0) = 1.2 and Δx = 5/64 that predicts an error of −0.0855, against −0.0860 on the screen. The rest is O(1/n²).' },
    { state:{p:{rule:1}, t:0.5},
      q:'At n = 2 the midpoint error is +0.420, but (f′(5) − f′(0))Δx²/24 has size only 0.255. Is the 1/n² rule wrong here?',
      a:'It is only the first term. The midpoint error expands as −(Δx²/24)(f′(5) − f′(0)) + (7Δx⁴/5760)(f‴(5) − f‴(0)) − …, and with Δx = 2.5 the later terms are not small: f contains sin(1.5x), whose period 4.19 is shorter than two rectangles. From n = 8 on the first term is within 3% of the error, which is why the inset’s midpoint line is steeper at its left end and settles to slope −2.' },
  ],
};
const QA_MAX=1000, qaKey=v=>'loci:ask:'+v.id;
const repoPath=v=>String(v.repo||'').replace(/^https?:\/\//,'').replace(/^github\.com\//,'');
/* your draft {text, st, url} for piece v, or an empty one */
function qaDraft(v){
  const o=LociAPI.answers.get(qaKey(v),null); if(!o || typeof o!=='object') return {text:'', st:null, url:''};
  return {text:typeof o.text==='string'?o.text.slice(0,QA_MAX):'', st:o.st&&typeof o.st==='object'?Lesson.stop(o.st,v,m=>console.warn('loci: your question draft:',m)):null, url:typeof o.url==='string'?o.url:''};
}
function qaIssueURL(v,d){
  const first=(d.text.trim().split(/\n/)[0]||'A question').slice(0,70);
  const body=`### Question\n${d.text.trim()||'(write your question here)'}\n\n### The moment\n${d.url||'(no moment attached)'}\n${d.st?stopSummary(v,d.st):''}\n\n${myHandle()?`### Asked by\n${myHandle()}\n\n`:''}---\nAsked from the Explanation tab of ${v.title} on the Loci prototype.`;
  return `https://github.com/${repoPath(v)}/issues/new?labels=question&title=${encodeURIComponent('Question: '+first)}&body=${encodeURIComponent(body)}`;
}
function qaBlock(v){
  const qs=SAMPLE_QUESTIONS[v.id]||[], d=qaDraft(v);
  return `<section class="qa" aria-labelledby="qa-h"><h3 class="flabel" id="qa-h">Questions</h3>
    ${qs.length?`<p class="fine">Each question is pinned to the moment it was asked about. <b>Show me</b> sets up that moment on the slide. These are <b>samples</b> written for the prototype, not by ${esc(v.author)}; there is no question thread yet.</p>
    <ol class="qalist" role="list">${qs.map((x,i)=>`<li class="qitem"><p class="qq"><span class="samp">sample</span> ${esc(x.q)}</p>
      <div class="btnrow"><button class="btn ghost" type="button" data-qa-show="${i}">Show me</button><span class="fine">${esc(stopSummary(v,Lesson.stop(x.state,v,()=>{})))}</span></div>
      <p class="qa-a"><b>Answer</b> (sample, in the voice of ${userLink(v.author)}): ${esc(x.a)}</p></li>`).join('')}</ol>`:''}
    <label class="flabel" for="qa-text">Ask about this moment</label>
    <textarea class="input" id="qa-text" rows="3" maxlength="${QA_MAX}" placeholder="What do you see here that you can’t explain?" aria-describedby="qa-attach">${esc(d.text)}</textarea>
    <p class="fine" id="qa-attach">${d.st?`Attach this moment: ${esc(stopSummary(v,d.st))}`:esc(touchCopy('Click in the box to attach the moment the slide is at now.'))}</p>
    <div class="btnrow"><a class="btn" id="qa-send" href="${esc(qaIssueURL(v,d))}" target="_blank" rel="noopener">Ask on GitHub</a><button class="linkbtn" type="button" id="qa-clear">Clear draft</button></div>
    <p class="fine">Your draft is kept in this browser. <b>Ask on GitHub</b> opens a new issue on ${esc(v.repo)} with your question and a link to the moment filled in; nothing is posted until you ${touchCopy('press Submit')} there.</p></section>`;
}
function bindQa(v,body){
  const txt=$('#qa-text',body); if(!txt) return;
  const qs=SAMPLE_QUESTIONS[v.id]||[];
  $$('[data-qa-show]',body).forEach(b=>b.onclick=()=>{ const x=qs[+b.dataset.qaShow]; if(x) qwApply(v,Lesson.stop(x.state,v,m=>console.warn('loci: sample question:',m)),'The question’s moment',b); });
  const save=d=>{ if(!d.text && !d.st) LociAPI.answers.del(qaKey(v)); else { const c=d.st?Lesson.compact(v,d.st):null; if(c) delete c.note; LociAPI.answers.set(qaKey(v),{text:d.text, st:c, url:d.url}); } $('#qa-send',body).href=qaIssueURL(v,d); };
  const capture=()=>{ const st=Lesson.capture(v,''); delete st.note; const d={text:txt.value.slice(0,QA_MAX), st:Lesson.stop(st,v,()=>{}), url:shareURL(v)}; save(d); $('#qa-attach',body).textContent=`Attach this moment: ${stopSummary(v,d.st)}`; };
  txt.onfocus=capture; // pause, then click in the box: the moment you were looking at is the one attached
  txt.oninput=()=>{ const d=qaDraft(v); if(!d.st) return capture(); d.text=txt.value.slice(0,QA_MAX); save(d); }; // typing without a focus event still attaches the moment
  $('#qa-clear',body).onclick=()=>{ LociAPI.answers.del(qaKey(v)); txt.value=''; $('#qa-attach',body).textContent=touchCopy('Click in the box to attach the moment the slide is at now.'); $('#qa-send',body).href=qaIssueURL(v,qaDraft(v)); announce('Cleared your question draft.'); };
}
