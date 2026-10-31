/* ---------- the Chalkboard: your own working copies of visualizations (docs/submitting.md, "The Chalkboard") ----------
   Loaded before app.js; everything here runs at call time and uses app.js helpers. The feed shows published pieces as
   they were reviewed: no color or font choices, and no code. To change one, Copy to Chalkboard (the feed's button) opens
   it here, on a stage of its own that never touches the feed. Here you can change its colors, edit its three files
   (the module, loci.json, explanation.md), run it, play it as a Live demo (the feed's Present, full screen), and save
   it as your own copy.

   Saved pieces are stored on the demo server under your account (viz + viz_package, status 'playground': the schema and
   the API keep the old name, /api/playground), private to you, never reviewed and never in the feed. Published pieces
   live in the registry instead. Opened as static files or signed out there is no account to keep a copy under, so the
   editor and Live demo work, what you type is kept in this browser as a draft, and Save says what it needs.

   One source of truth for a piece's colors and name: the loci.json text. The pickers edit that text, so what you see
   in the file is what gets saved, and a Check or a pull request carries the same colors. */
let rxFile='js', rxPreview=false; // the editor's open file and explanation view, kept across re-renders
let board=null, boardInit=false; // the piece open in the editor: {v, t, playing, sub, src, host, ...}; null shows the list
let staged=null; // the board whose host is mounted: not always `board`, which Back and opening a piece replace first
let demoReturn=null; // while a Live demo plays: the feed filter to go back to

function bindChalkboard(el){
  if(boardInit) return; boardInit=true;
  el.addEventListener('click',e=>{
    const t=e.target;
    if(t.closest('[data-cb-back]')){ board=null; renderChalkboard(); el.scrollTop=0; return refocus('#chalkboard h1',el); }
    const ed=t.closest('[data-cb-edit]'); if(ed){ const v=vizById(ed.dataset.cbEdit); if(v) openBoard(v); return; }
    const dm=t.closest('[data-cb-demo]'); if(dm){ const v=vizById(dm.dataset.cbDemo); if(v) playDemo(v); return; }
    const dl=t.closest('[data-cb-del]'); if(dl){ const v=vizById(dl.dataset.cbDel); if(v) deletePlayground(v); return; }
    const dd=t.closest('[data-cb-discard]'); if(dd){ const v=vizById(dd.dataset.cbDiscard); if(v) discardDraft(v); return; }
  });
}
function renderChalkboard(){
  const el=$('#chalkboard'); bindChalkboard(el); boardStop();
  if(board) renderBoard(el); else renderBoardList(el);
}
/* unsaved edits of a piece: its module(s), loci.json or explanation differ from what it was opened from */
const cbEdited=v=>rxText.has(v.id)||runnableTargets(v.manifest).some(t=>t.runtime==='js'&&drafts.has(rkeyFor(v,t.id)));
function discardDraft(v){
  runnableTargets(v.manifest).forEach(t=>{ const k=rkeyFor(v,t.id); delDraft(k); rxChecks.delete(k); }); delRxText(v);
  renderChalkboard(); announce(`Discarded your draft of ${v.title}.`);
}
function cbCard(v){
  const par=v.pg.parent&&vizById(v.pg.parent);
  return `<article class="card cb-card"><canvas data-thumb="${esc(v.id)}" aria-hidden="true"></canvas>
    <div class="card-body"><h3>${esc(v.title)}</h3>
      <div class="by">${par?`Copy of ${esc(par.title)}`:'Your own piece'}${cbEdited(v)?' · <b>unsaved changes</b>':''}</div>
      <div class="btnrow"><button class="btn" type="button" data-cb-edit="${esc(v.id)}" aria-label="Edit ${esc(v.title)}">Edit</button>
        <button class="btn ghost" type="button" data-cb-demo="${esc(v.id)}" aria-label="Live demo of ${esc(v.title)}">Live demo</button>
        <button class="btn ghost" type="button" data-cb-del="${esc(v.id)}" aria-label="Delete ${esc(v.title)}">Delete</button></div></div></article>`;
}
function renderBoardList(el){
  const srv=LociAPI.server, unsaved=yoDrafts().filter(d=>!d.v.pg);
  el.innerHTML=`<div class="wrap chalkboard"><div class="pagehead"><div class="kicker">Chalkboard${srv?` · ${PLAYGROUND.length} saved`:''}</div><h1 tabindex="-1">Your chalkboard</h1>
      <p>Your own copies of visualizations. Press <b>Copy to Chalkboard</b> on any piece in the feed to change its colors, edit its code, run a live demo and save your version. Only you can see these; they are not reviewed and never appear in the feed.</p>
      <div class="btnrow"><button class="btn" type="button" data-new-viz>New visualization</button><button class="btn ghost" type="button" data-view="feed">Find one in the feed</button></div></div>
    ${srv?'':`<p class="note">Saved pieces are stored on the demo server under your account, and this page is not connected to one (it is opened as static files, or you are signed out). You can still copy and edit a piece here: your drafts stay in this browser, but they cannot be saved.</p>`}
    <section class="cb-sec" aria-labelledby="cb-saved-h"><h2 class="sechead" id="cb-saved-h">Saved</h2>
      ${PLAYGROUND.length?`<div class="grid">${PLAYGROUND.map(cbCard).join('')}</div>`:`<p class="empty">Nothing saved yet.${srv?' Copy a piece from the feed, or start a new one, and press Save.':''}</p>`}</section>
    ${unsaved.length?`<section class="cb-sec" aria-labelledby="cb-draft-h"><h2 class="sechead" id="cb-draft-h">Not saved yet</h2><ul class="ylist">${unsaved.map(d=>`<li class="yrow"><div class="ytxt"><b>${esc(d.v.title)}</b><small>Your draft: ${esc(d.files.join(', '))}</small></div>
      <div class="btnrow"><button class="btn ghost" type="button" data-cb-edit="${esc(d.v.id)}" aria-label="Resume your draft of ${esc(d.v.title)}">Resume</button><button class="btn ghost" type="button" data-cb-discard="${esc(d.v.id)}" aria-label="Discard your draft of ${esc(d.v.title)}">Discard</button></div></li>`).join('')}</ul></section>`:''}
  </div>`;
  paintThumbs(el);
}

/* ---------- opening a piece ---------- */
/* Copy to Chalkboard: the piece as it is on the slide. Where you moved its sliders, those values become the copy's
   defaults; a draft you already have of this piece wins, so copying again never overwrites your work. */
function copyToChalkboard(v){
  if(LociHost.isBlocked(v.id)) return toast('An admin has stopped this piece, so it cannot be copied.');
  if(!(rxText.get(v.id)||{}).manifest){
    const cur=getSettings(v).params, def=normalizeParams(v.manifest,{}), moved=Object.keys(cur).filter(k=>cur[k]!==def[k]);
    if(moved.length){ const o=rxManObj(v); o.params=o.params.map(p=>moved.includes(p.key)?{...p, default:cur[p.key]}:p); setRxText(v,'manifest',JSON.stringify(o,null,2)+'\n'); }
  }
  rxFile='js'; rxPreview=false; openBoard(v,{t:timeOf(v)});
  announce(`${v.title} is on your Chalkboard. It is not saved until you press Save.`);
}
async function openBoard(v,o={}){
  const tgt=runningTarget(v), need=[!v.md&&v.mdUrl, tgt.runtime==='wasm'&&v.sourceUrl].filter(Boolean);
  const b=board={v, t:o.t??v.t0??0, playing:!paused, loading:need.length>0, focus:o.focus||null, sub:null, src:null, host:null};
  if(view!=='chalkboard') showView('chalkboard'); else renderChalkboard();
  $('#chalkboard').scrollTop=0;
  if(!need.length) return;
  try{ await Promise.all(need.map(u=>loadText(u))); if(!v.md&&v.mdUrl) v.md=texts.get(v.mdUrl); }
  catch(e){ b.loadErr=e.message; }
  b.loading=false; if(board===b && view==='chalkboard') renderChalkboard();
}

/* ---------- the stage: the module you are editing, in the same sandbox as every piece, apart from the feed ---------- */
const boardMan=b=>({...JSON.parse(manifestJSON(b.v.manifest)), ...(b.sub||{})}); // the published manifest with the editor's fields
const boardTheme=b=>({...paletteOf(boardMan(b)), font:STYLE_FONT[curStyle], lw:THEME_DEF.lw, labels:THEME_DEF.labels});
const boardBox=c=>({x:12, y:12, w:Math.max(100,c.clientWidth-24), h:Math.max(100,c.clientHeight-24)});
function boardStop(){
  const b=staged; if(!b) return; staged=null;
  if(b.ro){ b.ro.disconnect(); b.ro=null; }
  if(b.host){ b.t=b.host.getTime(); b.host.dispose(); b.host=null; }
}
function boardSync(){ const b=board; if(b&&b.host){ if(b.playing&&view==='chalkboard'&&!document.hidden) b.host.play(); else b.host.pause(); } }
function boardMount(){
  const b=board, old=$('#cb-canvas'); if(!b||!old) return; boardStop(); staged=b;
  const c=old.cloneNode(false); old.replaceWith(c); // one canvas per mount (runtime.js)
  const v=b.v, t=b.tgt, man=boardMan(b), ov=$('#cb-labels'), stage=$('#cb-stage');
  const spec=t.runtime==='wasm'?{runtime:'wasm', render:t.render, url:v.entry, manifest:manifestForTarget(man,t)}:{runtime:'js', render:t.render, source:b.src, manifest:manifestForTarget(man,t)};
  stage.style.background=paletteOf(man).bg;
  boardErr(null);
  b.host=LociHost.mount(c,spec,{theme:boardTheme(b), params:normalizeParams(man,{}), box:boardBox(c), dpr:dpr(), t:b.t, speed:THEME_DEF.speed, playing:b.playing&&!document.hidden, overlay:ov, target:t.id, label:'chalkboard',
    onError:(kind,msg)=>{ if(board!==b) return; if(kind==='slow'){ b.playing=false; syncBoardPause(); } else if(b.host){ b.t=b.host.getTime(); b.host=null; } const [title,why]=CARD[kind]||CARD.error; boardErr(title,why||msg||''); }}); // slow: the host paused it, and Play resumes it
  const p=b.host.pointer;
  if(p&&p.mode!=='none'){ c.tabIndex=0; c.setAttribute('aria-label',`${man.title}, interactive visualization: ${p.hint}`); b.host.input({type:'engage'}); }
  b.ro=new ResizeObserver(()=>{ if(b.host&&c.clientWidth) b.host.resize(boardBox(c),dpr()); }); b.ro.observe(c);
  syncBoardPause();
}
function boardErr(title,detail){
  const box=$('#rx-errs'); if(!box) return;
  box.innerHTML=title?`<div class="rx-err" role="alert"><b>${esc(title)}</b>${detail?`<pre>${esc(detail)}</pre>`:''}<span class="fine">Fix it and press Run again, or Revert.</span></div>`:'';
  if(title){ const st=$('#rx-status'); if(st) st.textContent=''; }
}
const syncBoardPause=()=>{ const b=$('#cb-pause'); if(b) b.textContent=board&&board.playing?'Pause':'Play'; };
/* forward the pointer and the keys to an interactive piece: on this stage it has no engage step, like an embed */
function bindBoardStage(){
  const stage=$('#cb-stage'), ptr=()=>{ const h=board&&board.host, p=h&&h.pointer; return p&&p.mode!=='none'?p:null; };
  const fwd=e=>{ const p=ptr(); if(!p||!(p.drag||p.click)) return; board.host.input(e); if(e.type==='pointerdown') try{ stage.setPointerCapture(e.pointerId); }catch(_){} };
  ['pointerdown','pointermove','pointerup','pointercancel'].forEach(k=>stage.addEventListener(k,fwd));
  stage.addEventListener('wheel',e=>{ const p=ptr(); if(!p||!p.wheel) return; e.preventDefault(); board.host.input(e); },{passive:false});
  const key=e=>{ const p=ptr(); if(p&&p.keys&&e.target.id==='cb-canvas'&&e.key!=='Tab'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){ e.preventDefault(); e.stopPropagation(); board.host.input(e); } };
  stage.addEventListener('keydown',key); stage.addEventListener('keyup',key);
}

/* ---------- the editor ---------- */
const COLOR_FIELDS=[['main','Main'],['secondary','Secondary'],['bg','Background'],['fg','Text']];
const colorsOf=pal=>({main:pal.a1, secondary:pal.a2, bg:pal.bg, fg:pal.fg});
function renderBoard(el){
  const b=board, v=b.v;
  if(b.loading||b.loadErr){ el.innerHTML=`<div class="wrap chalkboard"><button class="backlink" type="button" data-cb-back>← Your chalkboard</button><p class="fine">${b.loadErr?`Could not load this piece: ${esc(b.loadErr)}`:'Loading…'}</p></div>`; return; }
  const tgt=b.tgt=runningTarget(v), wasm=tgt.runtime==='wasm', k=rkey(v);
  const orig=wasm?texts.get(v.sourceUrl):moduleSource(v,tgt.id), cur=!wasm&&drafts.has(k)?drafts.get(k):orig, file=wasm?v.sourceUrl.split('/').pop():tgt.id==='any'?'index.js':tgt.entry;
  const tx=rxText.get(v.id)||{}, curMan=tx.manifest??rxManDefault(v), curMd=tx.explanation??rxMdDefault(v), F=wasm?'js':rxFile;
  const first=rxCheckMan(v,curMan); b.sub=first.sub; b.src=wasm?null:cur;
  const man=boardMan(b), pal=paletteOf(man), par=v.pg&&v.pg.parent&&vizById(v.pg.parent), srv=LociAPI.server;
  const what=v.pg?(par?`Your copy of “${par.title}” by ${par.author}`:'Your own piece'):v.starter?'A new piece, from the contributor template':`A copy of “${v.title}” by ${v.author}, under its ${v.license} license`;
  const noSave=wasm?'A WebAssembly piece cannot be saved here: changing it needs a compiler (clang --target=wasm32) this page does not have.':srv?'':'Saving needs an account on the demo server, and this page is not connected to one. Your draft stays in this browser.';
  const tab=(id,label)=>`<button type="button" data-rxf="${id}" aria-pressed="${F===id}" aria-controls="rxp-${id}">${esc(label)}${id==='js'?'':`<span class="rx-dot" data-rxdot="${id}"${(id==='json'?tx.manifest:tx.explanation)!=null?'':' hidden'}><span aria-hidden="true"> •</span><span class="sr">, edited</span></span>`}</button>`;
  el.innerHTML=`<div class="wrap chalkboard"><button class="backlink" type="button" data-cb-back>← Your chalkboard</button>
    <div class="pagehead"><div class="kicker">Chalkboard</div><h1 id="cb-title" tabindex="-1">${esc(man.title)}</h1><p>${esc(what)}. <span id="cb-state"></span></p></div>
    <div class="cb-grid">
      <div class="cb-left">
        <div class="cb-stage" id="cb-stage"><canvas class="viz" id="cb-canvas" role="img" aria-label="${esc(man.title)}, animated visualization"></canvas><canvas class="labels" id="cb-labels" aria-hidden="true"></canvas></div>
        <div class="btnrow"><button class="btn" type="button" id="rx-run" aria-describedby="cb-run-hint">Run</button><button class="btn ghost" type="button" id="cb-pause">Pause</button><button class="btn ghost" type="button" id="cb-live" aria-describedby="cb-live-hint">Live demo</button></div>
        <p class="fine" id="rx-status" role="status"></p>
        <div id="rx-errs"></div>
        <p class="fine" id="cb-run-hint">Run restarts the stage with what is in the editor. <kbd>${MOD_KEY}</kbd>+<kbd>Enter</kbd> does the same. It runs in the same sandbox as every piece: no network and no storage.</p>
        <p class="fine" id="cb-live-hint">Live demo plays your version full screen, with the keys of Present. <kbd>Esc</kbd> brings you back here.</p>
      </div>
      <div class="cb-right">
        <div class="field"><label class="flabel" for="cb-name">Name</label><input class="input" id="cb-name" type="text" maxlength="80" autocomplete="off" value="${esc(man.title)}"></div>
        <div class="field"><span class="flabel" id="cb-col-l">Colors</span>
          <div class="swatches" role="group" aria-labelledby="cb-col-l"><button class="swatch" type="button" data-cb-pal="own">${paletteDots(paletteOf(JSON.parse(manifestJSON(v.manifest))))}Its own colors</button>${PALETTES.map(p=>`<button class="swatch" type="button" data-cb-pal="${esc(p.id)}">${paletteDots(p)}${esc(p.name)}</button>`).join('')}</div>
          <div class="cb-colors">${COLOR_FIELDS.map(([id,label])=>`<label class="cb-color" for="cb-c-${id}"><input type="color" id="cb-c-${id}" data-cb-color="${id}" value="${esc(colorsOf(pal)[id])}"><span>${label}</span></label>`).join('')}</div></div>
        <div class="seg rx-files" role="group" aria-label="File to edit">${tab('js',file)}${wasm?'':tab('json','loci.json')+tab('md','explanation.md')}</div>
        <div class="rx-pane" id="rxp-js"${F==='js'?'':' hidden'}>
          ${wasm?'<p class="note">Editing a WebAssembly piece needs a compiler, which this page does not have, so here is its C source, read-only. The colors above still change the stage.</p>':''}
          <label class="flabel" for="rx-src">${esc(file)}${tgt.id!=='any'?` · ${esc(TARGET_NAME[tgt.id].toLowerCase())} version`:''}${wasm?' (read-only)':''}</label>
          <textarea class="rx" id="rx-src"${wasm?' readonly':''} spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-describedby="rx-hint">${esc(cur)}</textarea>
          <p class="fine" id="rx-hint"><kbd>Tab</kbd> indents; <kbd>Shift</kbd>+<kbd>Tab</kbd>, or <kbd>Esc</kbd> then <kbd>Tab</kbd>, leaves the editor.</p>
        </div>
        <div class="rx-pane" id="rxp-json"${F==='json'?'':' hidden'}>
          <label class="flabel" for="rx-man">loci.json · the fields you can change</label>
          <p class="fine" id="rx-man-hint">Title, hook, alt, tags, colors, params (labels, ranges and defaults), presets, <code>after</code> and <code>bounty</code>. The param keys are the original's; the rest of loci.json (id, author, license, runtime, targets, motion) is set for you.</p>
          <textarea class="rx rx-short" id="rx-man" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-describedby="rx-man-hint rx-man-errs">${esc(curMan)}</textarea>
          <div id="rx-man-errs"></div>
        </div>
        <div class="rx-pane" id="rxp-md"${F==='md'?'':' hidden'}>
          <div class="rx-mdhead"><span class="flabel" id="rx-md-l">explanation.md</span><div class="seg" role="group" aria-label="Explanation view"><button type="button" data-rxmd="0" aria-pressed="${!rxPreview}">Edit</button><button type="button" data-rxmd="1" aria-pressed="${rxPreview}">Preview</button></div></div>
          <textarea class="rx rx-short rx-prose" id="rx-md" spellcheck="true" aria-labelledby="rx-md-l"${rxPreview?' hidden':''}>${esc(curMd)}</textarea>
          <article class="md rx-prev" id="rx-md-prev" tabindex="-1" aria-label="Preview of explanation.md"${rxPreview?'':' hidden'}></article>
        </div>
        <div class="btnrow"><button class="btn" type="button" id="cb-save"${noSave?' disabled aria-describedby="cb-save-hint"':''}>${v.pg?'Save':'Save as my copy'}</button><button class="btn ghost" type="button" id="rx-revert">Revert</button><button class="btn ghost" type="button" id="rx-dl">Download ${wasm?'.c':'.js'}</button>${v.pg?'<button class="btn ghost" type="button" id="cb-delete">Delete</button>':''}</div>
        ${noSave?`<p class="fine" id="cb-save-hint">${esc(noSave)}</p>`:`<p class="fine">Saved to your account on this server, so it follows you to any device you sign in from. Only you can see it, and it is not reviewed.</p>`}
        ${wasm?'':`<section class="rx-check" aria-label="Check this remix">
          <div class="btnrow"><button class="btn ghost" type="button" id="rxc-check" aria-describedby="rxc-hint">Check this remix</button></div>
          <p class="fine" id="rxc-hint">To have it published, Check this remix runs the full automated gate from the Submit page on the editor's three files, packaged as a new piece of yours: ${!baseOf(v)?`id <code>new-…</code>, author ${esc(myHandle()||'@you')} (your handle, set on My Account), under the ${esc(v.license)} license`:`id <code>${esc(baseOf(v).id)}-remix-…</code>, <code>"remixOf": "${esc(baseOf(v).id)}"</code>, author ${esc(myHandle()||'@you')} (your handle, set on My Account), ${esc(baseOf(v).author)} credited, under its ${esc(baseOf(v).license)} license`}.${hasOtherTarget(v)?' The other target ships the original module unless you changed it too, and an unchanged module is an exact duplicate.':''} If nothing fails, Prepare pull request takes it to the Submit page to send to the registry on GitHub.</p>
          <p class="fine" id="rxc-pkg"></p>
          <section class="sub-run" id="rxc-run" aria-labelledby="rxc-run-h" hidden>
            <h3 class="sub-h" id="rxc-run-h">Checking the remix</h3>
            <div class="pbar" id="rxc-bar" role="progressbar" aria-labelledby="rxc-run-h" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><span></span></div>
            <p class="sub-label" id="rxc-label"></p>
            <figure class="sub-prev"><figcaption class="flabel">What the checker sees</figcaption><div class="sub-canv" id="rxc-preview"></div></figure>
          </section>
          <section class="sub-report" id="rxc-report" aria-labelledby="rxc-sum" hidden></section>
        </section>`}
      </div>
    </div></div>`;
  const ta=$('#rx-src',el), tm=$('#rx-man',el), tmd=$('#rx-md',el), name=$('#cb-name',el), status=m=>{ $('#rx-status',el).textContent=m; announce(m); };
  let tabIndents=true;
  const state=()=>[ta.value,tm.value,tmd.value].join('\u0000');
  const syncState=()=>{ const s=$('#cb-state',el); if(s) s.textContent=!v.pg?'Not saved yet.':cbEdited(v)?'Unsaved changes.':'Saved.'; };
  const manProblems=()=>{ const r=rxCheckMan(v,tm.value); showManErrs(r.problems); return r; };
  const rxShow=f=>{ rxFile=f; $$('[data-rxf]',el).forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.rxf===f))); $$('.rx-pane',el).forEach(p=>p.hidden=p.id!=='rxp-'+f); };
  const saveCode=()=>{ if(wasm) return; if(ta.value===orig) delDraft(k); else setDraft(k,ta.value); syncState(); };
  const saveText=(key,area)=>{ setRxText(v,key,area.value); const d=$(`[data-rxdot="${key==='manifest'?'json':'md'}"]`,el); if(d) d.hidden=(rxText.get(v.id)||{})[key]==null; syncState(); };
  /* the manifest, or null after pointing at what is wrong with it */
  const goodMan=what=>{ const r=manProblems(); if(!r.problems.length) return r; rxShow('json'); status(`${what}: loci.json has ${r.problems.length===1?'a problem':r.problems.length+' problems'}. Fix ${r.problems.length===1?'it':'them'} and try again.`); $('#rx-man-errs',el).scrollIntoView({block:'nearest'}); return null; };
  const syncFromMan=()=>{ const m=boardMan(b), p=colorsOf(paletteOf(m)); $('#cb-title',el).textContent=m.title; if(document.activeElement!==name) name.value=m.title; COLOR_FIELDS.forEach(([id])=>{ const i=$(`#cb-c-${id}`,el); if(document.activeElement!==i) i.value=p[id]; });
    $('#cb-stage',el).style.background=p.bg; if(b.host) b.host.setTheme(boardTheme(b)); };
  /* edit loci.json from a control (the name, the colors), so the text stays the one source */
  const editMan=f=>{ let j; try{ j=JSON.parse(tm.value); }catch(_){ goodMan('Fix loci.json first'); return; } if(!j||typeof j!=='object'||Array.isArray(j)){ goodMan('Fix loci.json first'); return; }
    f(j); tm.value=JSON.stringify(j,null,2)+'\n'; saveText('manifest',tm); const r=manProblems(); if(r.sub){ b.sub=r.sub; syncFromMan(); } };
  const run=()=>{ const r=goodMan('Not run'); if(!r) return; saveCode(); b.sub=r.sub; b.src=wasm?null:ta.value; b.playing=true; boardMount(); syncFromMan(); status('Running what is in the editor.'); };
  ta.addEventListener('input',()=>{ tabIndents=true; saveCode(); });
  tm.addEventListener('input',()=>{ tabIndents=true; saveText('manifest',tm); const r=manProblems(); if(r.sub){ b.sub=r.sub; syncFromMan(); } });
  tmd.addEventListener('input',()=>{ tabIndents=true; saveText('explanation',tmd); });
  for(const area of [ta,tm,tmd]) area.addEventListener('keydown',e=>{
    if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); e.stopPropagation(); return run(); }
    if(e.key==='Escape' && tabIndents){ e.preventDefault(); e.stopPropagation(); tabIndents=false; return announce('Tab now moves focus out of the editor'); }
    if(e.key==='Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && tabIndents && !area.readOnly){
      e.preventDefault(); e.stopPropagation();
      if(!document.execCommand('insertText',false,'  ')){ area.setRangeText('  ',area.selectionStart,area.selectionEnd,'end'); area.dispatchEvent(new Event('input')); }
    }
  });
  const preview=on=>{ rxPreview=on; $$('[data-rxmd]',el).forEach(x=>x.setAttribute('aria-pressed',String((x.dataset.rxmd==='1')===on))); tmd.hidden=on; const pv=$('#rx-md-prev',el); pv.hidden=!on;
    if(on){ pv.innerHTML=md(touchCopy(tmd.value)); typeset(pv); } };
  $$('[data-rxf]',el).forEach(x=>x.onclick=()=>{ rxShow(x.dataset.rxf); x.focus(); });
  $$('[data-rxmd]',el).forEach(x=>x.onclick=()=>{ preview(x.dataset.rxmd==='1'); x.focus(); });
  if(rxPreview) preview(true);
  if(tx.manifest!=null) manProblems();
  name.addEventListener('input',()=>editMan(j=>{ j.title=name.value; }));
  $$('[data-cb-color]',el).forEach(i=>i.addEventListener('input',()=>editMan(j=>{ j.colors={...colorsOf(paletteOf(boardMan(b))), [i.dataset.cbColor]:i.value.toLowerCase()}; })));
  $$('[data-cb-pal]',el).forEach(x=>x.onclick=()=>{ const id=x.dataset.cbPal, p=PALETTES.find(q=>q.id===id), own=rxManObj(v).colors;
    editMan(j=>{ if(p) j.colors=colorsOf(p); else if(own) j.colors=own; else delete j.colors; }); });
  $('#rx-run',el).onclick=run;
  $('#cb-pause',el).onclick=()=>{ b.playing=!b.playing; if(b.host) boardSync(); else if(b.playing) boardMount(); syncBoardPause(); };
  $('#cb-live',el).onclick=()=>{ const r=goodMan('Not started'); if(!r) return; saveCode(); playDemo(demoPiece(v,r.sub,ta.value,tmd.value,tgt)); };
  $('#rx-revert',el).onclick=()=>{ delDraft(k); delRxText(v); rxChecks.delete(k); renderChalkboard(); refocus('#rx-revert',el); announce(v.pg?'Back to your saved version.':'Back to the original module, loci.json and explanation.'); };
  $('#rx-dl',el).onclick=()=>download(new Blob([ta.value],{type:wasm?'text/x-c':'text/javascript'}),wasm?`${v.id}.c`:`${v.id}.js`);
  if(!noSave) $('#cb-save',el).onclick=e=>{ const r=goodMan('Not saved'); if(!r) return; saveCode(); saveToChalkboard(v,tgt.id,ta.value,{loci:r.sub, md:tmd.value},e.currentTarget); };
  const del=$('#cb-delete',el); if(del) del.onclick=()=>deletePlayground(v);
  const chk=$('#rxc-check',el);
  if(chk){
    chk.onclick=()=>{ const r=goodMan('Not checked'); if(!r) return; saveCode(); checkRemix(v,tgt.id,ta.value,{loci:r.sub, md:tmd.value, state:state()}); };
    const prior=rxChecks.get(k);
    if(checking && checking.key===k){ $('#rxc-run',el).hidden=false; $('#rxc-pkg',el).textContent=checking.line; chk.disabled=true; }
    else if(prior) renderReport(prior.report,uiFor('rxc'),prior.pkg,{...prior.meta, quiet:true, stale:prior.src!==state()});
  }
  syncState(); bindBoardStage(); boardMount();
  if(b.focus){ const f=b.focus; b.focus=null; refocus(f,el); }
}
const paletteDots=p=>`<span class="dots">${['bg','fg','a1','a2'].map(k=>`<i style="background:${esc(p[k])}"></i>`).join('')}</span>`;

/* ---------- Live demo: the piece, full screen, through the feed's own Present ---------- */
const DEMO_ID='chalkboard-demo';
/* what is in the editor right now as a piece, saved or not. It stays out of VIZ, so nothing else in the feed lists it. */
function demoPiece(v,sub,src,mdText,tgt){
  const man={...JSON.parse(manifestJSON(v.manifest)), ...sub, id:DEMO_ID};
  const d={...v, id:DEMO_ID, demo:true, title:man.title, hook:String(sub.hook??v.hook), alt:typeof sub.alt==='string'?sub.alt:v.alt, tags:Array.isArray(sub.tags)&&sub.tags.length?sub.tags.map(String):v.tags, manifest:man, md:mdText, mdUrl:undefined, likes:0, liked:false};
  if(man.targets) d.sources=tgt.runtime==='js'?{...v.sources, [tgt.id]:src}:v.sources; else if(tgt.runtime==='js') d.source=src;
  return d;
}
function playDemo(v){
  dropDemo();
  if(v.demo) STARTERS.push(v);
  if(!demoReturn) demoReturn={filter};
  setFilter({type:'demo', ids:[v.id], name:v.title});
  showView('feed');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ const sl=slides.find(x=>x.v===v); if(sl) enterPresent(sl); else endDemo(); }));
}
function dropDemo(){ const i=STARTERS.findIndex(x=>x.id===DEMO_ID); if(i>=0){ const d=STARTERS[i]; STARTERS.splice(i,1); dropSpecs(d); delete settings[DEMO_ID]; } }
/* Present has ended: back to the Chalkboard, as it was left (the editor's text is in the drafts) */
function endDemo(){
  const back=demoReturn; if(!back) return; demoReturn=null;
  setFilter(back.filter); dropDemo();
  showView('chalkboard'); refocus(board?'#cb-live':'#chalkboard h1',$('#chalkboard'));
}

/* ---------- New: a piece of your own, from the contributor template (the Chalkboard's New visualization, the top bar's New) ---------- */
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
  return {id:NEW_ID, title:man.title, hook:man.hook, author, license:man.license, repo:'your new visualization, not saved', reviewed:'', reviewers:[], likes:0,
    t0:man.t0, tags:man.tags, alt:STARTER_ALT, manifest:man, starter:true,
    md:STARTER_MD(man.title),
    source:LociSingle.module(code,{guarded:false, key:man.params[0]&&man.params[0].key, file:'entries/<your-slug>.js'})};
}
let newOpening=false;
async function openNew(){
  if(newOpening) return; newOpening=true;
  try{
    let v=STARTERS.find(x=>x.id===NEW_ID);
    if(!v){
      let code; try{ code=await loadText('examples/template/visualization.js'); }catch(e){ console.info(`loci: the contributor template did not load (${e.message}); starting from a blank entry`); code=BLANK_ENTRY; }
      try{ v=starterViz(code); }catch(e){ console.info(`loci: the contributor template did not make a piece (${e.message}); starting from a blank entry`); v=starterViz(BLANK_ENTRY); }
      STARTERS.push(v); loadDrafts([v]);
    }
    rxFile='js'; rxPreview=false; openBoard(v,{focus:'#rx-src'});
    announce('New visualization: the contributor template is in the editor, and runs on the stage beside it.');
  } finally { newOpening=false; }
}
/* the package Check this remix and Save send for a new piece: yours alone, no remixOf */
async function starterPackage(v,sources,o){
  const src=sources.any||Object.values(sources)[0], d=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(src)));
  const id=`new-${[...d.slice(0,3)].map(b=>b.toString(16).padStart(2,'0')).join('')}`, author=o.author||'@you';
  const pkg=LociChecks.samplePackage({...v, author},false,{sources, id, title:o.loci&&typeof o.loci.title==='string'?o.loci.title:v.title, author, ...(o.loci?{loci:o.loci}:{}), ...(typeof o.md==='string'?{md:o.md}:{}), holders:[author]});
  delete pkg.sampleOf; return pkg;
}
/* The published piece a copy is of, or null for a piece of your own (New, saved or not). A saved copy goes to the gate and
   to the registry as a remix of that piece: its own 'pg-<id>' is private and means nothing to anyone else. */
const baseOf=v=>v.starter?null:v.pg?(v.pg.parent&&vizById(v.pg.parent))||null:v;
function packageOf(v,sources,po){
  const base=baseOf(v); if(!base) return starterPackage(v,sources,po);
  const md=v.pg&&typeof po.md==='string'?po.md.replace(/\n*\*\*Remix\.\*\*[^\n]*\n*$/,'\n'):po.md; // remixPackage writes the credit again
  return LociChecks.remixPackage(base,sources,{...po, md});
}
/* "your remix of …" or, for a new piece, "your new visualization" */
const rxWhat=rx=>rx&&rx.fresh?'your new visualization':`your remix of “${rx.title}”`;

/* ---------- the editable part of loci.json, and the checks on it ---------- */
/* the editable part of loci.json, as the editor first shows it: the parent's values */
const RX_FIELDS=['title','hook','alt','tags','colors','params','presets','after','bounty'];
function rxManObj(v){ const m=JSON.parse(manifestJSON(v.manifest)), o={title:v.title, hook:v.hook, alt:v.alt, tags:v.tags, params:m.params, presets:m.presets||[]};
  if(m.colors) o.colors=m.colors; if(m.after) o.after=m.after; if(m.bounty) o.bounty=m.bounty; return o; }
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
  box.innerHTML=probs.length?`<div class="rx-err"><b>loci.json: ${probs.length===1?'a problem':probs.length+' problems'}</b><ul>${probs.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><span class="fine">Run, Save and Check this remix wait until it validates.</span></div>`:'';
  if(tm){ if(probs.length) tm.setAttribute('aria-invalid','true'); else tm.removeAttribute('aria-invalid'); }
}
const hasOtherTarget=v=>runnableTargets(v.manifest).filter(t=>t.runtime==='js').length>1;
/* Check this remix: the editor's three files (and any remix of the piece's other target) as a package of its own, through
   the same gate as the Submit page, with the report under the editor. o: {loci, md, state} from the editor. */
async function checkRemix(v,tid,src,o={}){
  if(checking) return announce('The checks are already running.');
  const sources={[tid]:src};
  runnableTargets(v.manifest).forEach(t=>{ if(t.id===tid || t.runtime!=='js') return; const k=rkeyFor(v,t.id), s=drafts.get(k); if(typeof s==='string' && s!==moduleSource(v,t.id)) sources[t.id]=s; });
  const po={author:myHandle()||undefined, loci:o.loci||undefined, md:typeof o.md==='string'?o.md:undefined};
  let pkg; try{ pkg=await packageOf(v,sources,po); }catch(e){ const l=$('#rxc-pkg'); if(l) l.textContent=`Could not package the remix: ${e.message}`; return announce(`Could not package the remix: ${e.message}`); }
  const base=baseOf(v), meta={remix:{id:base?base.id:v.id, title:base?base.title:v.title, targets:Object.keys(sources), ...(base?{}:{fresh:true})}, key:rkey(v)};
  const report=await runChecks(pkg,uiFor('rxc'),meta);
  rxChecks.set(meta.key,{pkg, report, meta, src:o.state??src});
}

/* ---------- saved pieces, as they come back from the server (demo server only) ----------
   A saved copy is the parent's package with the editor's files: its module (or modules), loci.json and
   explanation.md, the same three files Check this remix packages. pgViz turns one back into a piece: the parent's
   entry with the posted title, hook, alt, tags, params and presets, the posted module as its source, and the
   remixer as author. It runs in the sandbox like every piece. */
/* A piece with no parent (New, then Save): its own loci.json is the whole manifest, as for a registry
   package; it runs in the sandbox like every piece. */
function pgNewViz(item){
  const f=item.files||{}; let man;
  try{ man=JSON.parse(f['loci.json']); }catch(_){ return null; }
  if(!man || typeof man!=='object') return null;
  const id='pg-'+item.id; man={...man, id};
  try{ validateManifest(man,{targets:false}); }catch(e){ console.info(`loci: skipping Chalkboard piece ${item.id}: ${e.message}`); return null; }
  const js=typeof f['index.js']==='string'?f['index.js']:Object.keys(f).filter(n=>/\.js$/.test(n)).map(n=>f[n])[0]; if(typeof js!=='string') return null;
  return {id, title:String(man.title||item.title), hook:String(man.hook||item.hook||''), alt:typeof man.alt==='string'?man.alt:String(man.title), author:'@'+item.author.handle,
    license:String(man.license||item.license||'MIT'), tags:Array.isArray(man.tags)&&man.tags.length?man.tags.map(String):(item.tags||[]), t0:Number.isFinite(man.t0)?man.t0:0,
    lane:'playground', reviewed:'', reviewers:[], manifest:man, md:f['explanation.md']||'', repo:'your Chalkboard · a new piece', likes:0, liked:false, source:js,
    pg:{id:item.id, parent:null, createdAt:item.createdAt, files:f}};
}
function pgViz(item){
  if(!item.parent) return pgNewViz(item);
  const par=VIZ.find(v=>v.id===(item.parent&&item.parent.slug)), f=item.files||{}; if(!par) return pgNewViz(item); // the original has left the catalog: your copy stays, from its own loci.json
  let loci; try{ loci=JSON.parse(f['loci.json']); }catch(_){ return null; }
  if(!loci || typeof loci!=='object') return null;
  const id='pg-'+item.id, man=JSON.parse(manifestJSON(par.manifest));
  for(const k of ['colors','params','presets','after','bounty']) if(loci[k]!==undefined) man[k]=loci[k];
  if(typeof loci.title==='string') man.title=loci.title;
  man.id=id;
  try{ validateManifest(man,{targets:false}); }catch(e){ console.info(`loci: skipping Chalkboard piece ${item.id}: ${e.message}`); return null; }
  const pv={...par, id, title:String(loci.title||item.title), hook:String(loci.hook||item.hook||''), alt:typeof loci.alt==='string'?loci.alt:par.alt,
    tags:Array.isArray(loci.tags)&&loci.tags.length?loci.tags.map(String):par.tags, author:'@'+item.author.handle, lane:'playground', reviewed:'', manifest:man,
    md:f['explanation.md']||'', mdUrl:undefined, repo:`your Chalkboard · a copy of ${par.id}`, likes:0, liked:false,
    pg:{id:item.id, parent:par.id, createdAt:item.createdAt, files:f}};
  delete pv.source; delete pv.sources;
  if(man.targets){ pv.sources={}; runnableTargets(man).forEach(t=>{ if(t.runtime==='js') pv.sources[t.id]=typeof f[t.entry]==='string'?f[t.entry]:moduleSource(par,t.id); }); }
  else { const js=Object.keys(f).find(n=>/\.js$/.test(n)); if(!js) return null; pv.source=f['index.js']??f[js]; }
  return pv;
}
function loadPlayground(){
  PLAYGROUND.length=0;
  LociAPI.playground.list().forEach(it=>{ const pv=pgViz(it); if(pv) PLAYGROUND.push(pv); });
}

/* ---------- saving: a new copy (POST), or your edits to a saved one (PUT) ---------- */
let posting=false;
const dropPosters=v=>{ const p=JSON.stringify([v.id]).slice(0,-1)+','; for(const k of [...posters.keys()]) if(k.startsWith(p)) posters.delete(k); };
function clearDrafts(v){ runnableTargets(v.manifest).forEach(t=>{ const k=rkeyFor(v,t.id); delDraft(k); rxChecks.delete(k); }); delRxText(v); }
/* the saved package with the editor's files: its loci.json keeps what the editor does not show (id, author, license, ...) */
function updatedFiles(v,tid,src,o){
  const files={...v.pg.files}, loci=JSON.parse(files['loci.json']);
  for(const k of RX_FIELDS) delete loci[k];
  files['loci.json']=JSON.stringify({...loci, ...o.loci},null,2)+'\n';
  files['explanation.md']=o.md;
  runnableTargets(v.manifest).forEach(t=>{ if(t.runtime!=='js') return;
    const name=v.manifest.targets?t.entry:typeof files['index.js']==='string'?'index.js':Object.keys(files).find(n=>/\.js$/.test(n));
    files[name]=t.id===tid?src:drafts.get(rkeyFor(v,t.id))??moduleSource(v,t.id); });
  return files;
}
async function saveToChalkboard(v,tid,src,o,btn){
  if(posting) return; posting=true; if(btn) btn.disabled=true;
  const st=m=>{ const s=$('#rx-status'); if(s) s.textContent=m; announce(m); };
  try{
    st('Saving…');
    let item;
    if(v.pg) item=await LociAPI.playground.update(v.pg.id,updatedFiles(v,tid,src,o));
    else {
      const sources={[tid]:src};
      runnableTargets(v.manifest).forEach(t=>{ if(t.id===tid || t.runtime!=='js') return; const s=drafts.get(rkeyFor(v,t.id)); if(typeof s==='string' && s!==moduleSource(v,t.id)) sources[t.id]=s; });
      const po={author:myHandle()||undefined, loci:o.loci||undefined, md:typeof o.md==='string'?o.md:undefined};
      const pkg=await packageOf(v,sources,po);
      const files={}; for(const [path,x] of pkg.files){ const name=path.split('/').pop(); if(name!=='LICENSE' && typeof x.text==='string') files[name]=x.text; }
      if(!v.starter && o.loci && typeof o.loci.title==='string') files['loci.json']=JSON.stringify({...JSON.parse(files['loci.json']), title:o.loci.title},null,2)+'\n'; // your copy keeps the name you see; "(remix)" is for the registry
      item=await LociAPI.playground.post(v.starter?null:v.id,files);
    }
    const pv=pgViz(item); if(!pv) throw new Error('the server kept it, but this page could not read it back');
    clearDrafts(v); dropSpecs(pv); dropPosters(pv); delete settings[pv.id];
    if(v.pg) PLAYGROUND[PLAYGROUND.indexOf(v)]=pv; else PLAYGROUND.unshift(pv);
    if(v.starter) STARTERS.splice(STARTERS.indexOf(v),1); // New starts from the template again
    if(board&&board.v===v){ board.v=pv; renderChalkboard(); }
    const m=`Saved “${pv.title}” to your Chalkboard.`; st(m); toast(m);
  }catch(e){ st(`Not saved: ${e.message}`); }
  finally{ posting=false; if(btn && btn.isConnected) btn.disabled=false; }
}
async function deletePlayground(v){
  if(!v.pg || !confirm(`Delete “${v.title}” from your Chalkboard? This can't be undone.`)) return;
  try{ await LociAPI.playground.remove(v.pg.id); }
  catch(e){ return toast(`Not deleted: ${e.message}`); }
  const i=PLAYGROUND.indexOf(v); if(i>=0) PLAYGROUND.splice(i,1);
  clearDrafts(v); dropSpecs(v); dropPosters(v); delete settings[v.id];
  sig.likes=sig.likes.filter(id=>id!==v.id); sig.saves=sig.saves.filter(id=>id!==v.id); saveSignals();
  if(board&&board.v===v) board=null;
  if(view==='chalkboard'){ renderChalkboard(); refocus('#chalkboard h1',$('#chalkboard')); }
  toast(`Deleted “${v.title}” from your Chalkboard.`);
}
