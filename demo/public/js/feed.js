// The snap-scrolling feed, its drawer, and the runners behind each slide.
import { $, $$, esc, fmtK, md, api, get, toast, copyText, ICON, openModal, closeModal, reduceMotion } from './util.js';
import { state, can, needSetup } from './state.js';
import { pfp } from './avatar.js';
import {
  vizPalette, PALETTES, FONTS, curStyle, getSettings, resetSettings, themeFor, runnerSettings, readPads,
  fontsFor, fmtParam, paintSlide, paintPage,
} from './theme.js';
import { mountRunner, initMessage, thumbURL, makeAndUploadThumb } from './runner.js';
import { flagMenu } from './pages.js';

const feed = $('#feed'), drawer = $('#drawer');
let slides = [], slideEls = [], activeIdx = 0, io = null;
let filter = { type: 'all' };
let dTab = null, dViz = null, explainRaw = false, applyAll = false;
const paramCache = new Map(); // runId -> parameter definition reported by the runner

const allItems = () => [...(state.items.reviewed || []), ...(state.items.playground || [])];
export const findItem = key => allItems().find(v => v.slug === key || String(v.id) === String(key));

export function feedList() {
  if (filter.type === 'playlist') return filter.items;
  const items = state.items[state.tab] || [];
  return filter.type === 'tag' ? items.filter(v => v.tags.includes(filter.value)) : items;
}

/* ---------- slides ---------- */
const rbtn = (act, icon, lbl, extra = '') =>
  `<button class="rbtn${extra}" type="button" data-act="${act}" aria-label="${esc(lbl)}"><span class="ico">${icon}</span><span class="lbl">${esc(lbl)}</span></button>`;

function provenance(v) {
  if (v.status === 'playground') return '<span class="badge">not reviewed</span>';
  if (v.source === 'registry') return `<span class="muted">· reviewed${v.registryPr ? ` · PR #${v.registryPr}` : ''}</span>`;
  if (v.source === 'promoted') return '<span class="muted">· promoted by an admin</span>';
  return '<span class="muted">· seed</span>';
}

function slideHTML(v) {
  const tn = thumbURL(v);
  return `<div class="stage">${tn ? `<img class="thumb" src="${esc(tn)}" alt="">` : ''}</div>
  <div class="caption">
    <div class="who"><button class="who-link" type="button" data-user="${esc(v.author.handle)}">${pfp(v.author.avatar)}<span>@${esc(v.author.handle)}</span></button>${provenance(v)}</div>
    ${v.parent ? `<div class="remixof">remix of <button class="tag" type="button" data-viz="${esc(v.parent.slug)}">${esc(v.parent.title)}</button> by <span class="by-user" data-user="${esc(v.parent.handle)}">@${esc(v.parent.handle)}</span></div>` : ''}
    <h2 class="vtitle">${esc(v.title)}</h2>
    ${v.hook ? `<p class="hook">${esc(v.hook)}</p>` : ''}
    <div class="tags">${v.tags.map(tg => `<button class="tag" type="button" data-tag="${esc(tg)}">#${esc(tg.toLowerCase())}</button>`).join('')}</div>
    <div class="meta"><span class="oss">open source · ${esc(v.license)}</span>${v.kind === 'remix' ? '<span>remix</span>' : ''}</div>
  </div>
  <div class="rail">
    ${rbtn('like', ICON.heart, fmtK(v.likes), v.liked ? ' on' : '')}
    ${rbtn('explain', ICON.sigma, 'Explain')}
    ${rbtn('customize', ICON.sliders, 'Customize')}
    ${rbtn('source', ICON.code, 'Source')}
    ${rbtn('full', ICON.full, 'Full screen')}
    ${rbtn('share', ICON.share, 'Share')}
    ${can('moderator') ? rbtn('flag', ICON.flag, 'Flag') : ''}
    ${v.status === 'playground' && v.author.handle === state.me?.handle ? rbtn('delete', ICON.trash, 'Delete') : ''}
  </div>
  <button class="btn ghost exit-fs" type="button" data-act="exitfull">Exit full screen</button>`;
}

function endHTML(n) {
  const what = filter.type === 'tag' ? ` tagged #${esc(filter.value.toLowerCase())}` : filter.type === 'playlist' ? ` in “${esc(filter.name)}”` : state.tab === 'playground' ? ' in the Playground' : '';
  const lists = state.config.newsletterLists;
  const names = { 'best-of-month': 'Best of the month', 'dev-blog': 'Development blog', miscellany: 'Miscellany' };
  return `<div class="end"><div class="end-card">
    <div class="kicker">End of the feed</div>
    <h2>You've seen all ${n} visualization${n === 1 ? '' : 's'}${what}</h2>
    ${state.tab === 'playground' && filter.type !== 'playlist' ? '<p>The Playground holds what you have posted. Only you can see it, and nothing here has been reviewed yet.</p>' : '<p>New pieces arrive as they are approved. Get the roundup by email.</p>'}
    <form class="nl-form" data-newsletter novalidate>
      <label class="flabel" for="end-email">Email</label>
      <div class="nl-row"><input class="input" type="email" id="end-email" placeholder="you@university.edu" autocomplete="email"><button class="btn" type="submit">Subscribe</button></div>
      <div class="checks">${lists.map(l => `<label class="check"><input type="checkbox" name="list" value="${l}"${l === 'best-of-month' ? ' checked' : ''}> ${names[l] || l}</label>`).join('')}</div>
      <p class="nl-err" hidden></p>
      <p class="fine">This is a demo: your address is stored but nothing is sent.</p>
    </form>
    <div class="btnrow"><button class="btn ghost" type="button" data-go="top">Back to the first</button><button class="btn ghost" type="button" data-route="#/play">Write your own</button><button class="btn ghost" type="button" data-route="#/browse">Browse the catalog</button></div>
  </div></div>`;
}

export function buildFeed({ keepPosition = false } = {}) {
  const keepId = keepPosition ? slides[activeIdx]?.v.id : null;
  io?.disconnect();
  slides.forEach(unmount);
  feed.innerHTML = ''; slides = [];
  const list = feedList();
  io = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.6) {
      const i = slideEls.indexOf(e.target);
      if (i !== activeIdx) { activeIdx = i; onActiveChange(); }
    }
  }, { root: feed, threshold: [0, 0.6] });
  list.forEach((v, i) => {
    const el = document.createElement('section');
    el.className = 'slide'; el.setAttribute('aria-label', v.title); el.innerHTML = slideHTML(v);
    paintSlide(el, themeFor(v));
    feed.appendChild(el);
    slides.push({ v, el, stage: $('.stage', el), runner: null, ready: false, dead: false, slow: false, slowOk: false });
    io.observe(el);
  });
  const end = document.createElement('section');
  end.className = 'slide'; end.setAttribute('aria-label', 'End of the feed'); end.innerHTML = endHTML(list.length);
  feed.appendChild(end); io.observe(end);
  slideEls = [...feed.children];
  const keepIdx = keepId ? slides.findIndex(s => s.v.id === keepId) : -1;
  activeIdx = Math.max(0, keepIdx);
  feed.scrollTop = keepIdx > 0 ? slideEls[keepIdx].offsetTop : 0;
  renderChips();
  onActiveChange();
}

const isFull = sl => document.fullscreenElement === sl.el || document.body.classList.contains('immersive');

function mount(sl) {
  sl.ready = false;
  sl.runner = mountRunner(sl.stage, `/run/${sl.v.runId}`, m => onRunnerMessage(sl, m), `Live visualization: ${sl.v.title}`);
}
function unmount(sl) {
  sl.runner?.destroy();
  sl.runner = null; sl.ready = false;
}

/** Keep runners only for the current slide and its neighbours; run only the current one. */
function updateMounts() {
  slides.forEach((sl, i) => {
    const want = state.view === 'feed' && !document.hidden && Math.abs(i - activeIdx) <= 1;
    if (want && !sl.runner && !sl.dead) mount(sl);
    else if (!want && sl.runner) unmount(sl);
    if (sl.runner && sl.ready) sl.runner.post({ type: i === activeIdx && !sl.slow ? 'resume' : 'pause' });
  });
}

async function onRunnerMessage(sl, m) {
  const i = slides.indexOf(sl);
  switch (m.type) {
    case 'loaded':
      sl.runner?.post(await initMessage(sl.v, { paused: i !== activeIdx || sl.slow, full: isFull(sl) }));
      break;
    case 'ready':
      sl.ready = true;
      sl.runner?.iframe.classList.add('ready');
      if (m.param) {
        paramCache.set(sl.v.runId, m.param);
        const s = getSettings(sl.v);
        if (s.param == null) s.param = m.param.value;
      }
      if (dTab === 'customize' && dViz === sl.v) renderDrawer();
      if (i === activeIdx) sl.runner?.post({ type: 'resume' });
      maybeThumb(sl);
      break;
    case 'error':
      sl.dead = true;
      unmount(sl);
      showStopped(sl, `This visualization stopped: ${m.message}`, m.line, 'Try again', () => { sl.dead = false; clearStopped(sl); updateMounts(); });
      break;
    case 'perf':
      if (m.avgFrameMs > 50 && !sl.slowOk && !sl.slow) {
        sl.slow = true;
        sl.runner?.post({ type: 'pause' });
        showStopped(sl, `Paused: this is running slowly on your device (${Math.round(m.avgFrameMs)} ms per frame).`, null, 'Run anyway', () => {
          sl.slow = false; sl.slowOk = true; clearStopped(sl); sl.runner?.post({ type: 'resume' });
        });
      }
      break;
    case 'dblclick': {
      like(sl, true);
      const r = sl.runner?.iframe.getBoundingClientRect(), s = sl.el.getBoundingClientRect();
      if (r) burst(sl.el, r.left - s.left + m.x, r.top - s.top + m.y);
      break;
    }
    case 'key':
      onKey({ key: m.key, target: document.body, preventDefault() {} });
      break;
  }
}

function showStopped(sl, message, line, actionLabel, action) {
  clearStopped(sl);
  const box = document.createElement('div');
  box.className = 'stopped';
  box.innerHTML = `<span>${esc(message)}${line ? ` <code>(line ${line})</code>` : ''}</span><button class="btn ghost sm" type="button">${esc(actionLabel)}</button>`;
  $('button', box).onclick = action;
  sl.stage.appendChild(box);
}
const clearStopped = sl => $('.stopped', sl.stage)?.remove();

// Authors and admins upload a thumbnail for the current style the first time they see one without it.
function maybeThumb(sl) {
  const v = sl.v;
  if (v.thumbs?.[curStyle] || !(can('admin') || state.me?.handle === v.author.handle)) return;
  makeAndUploadThumb(v).then(thumbs => {
    if (!thumbs) return;
    let img = $('.thumb', sl.stage);
    if (!img) { img = document.createElement('img'); img.className = 'thumb'; img.alt = ''; sl.stage.insertBefore(img, sl.stage.querySelector('iframe')); }
    img.src = `${thumbURL(v)}?t=${Date.now()}`;
  }).catch(() => {});
}

/** The page takes the current visualization's main and secondary color (the end slide has none). */
function paintActive() {
  if (state.view !== 'feed') return;
  const sl = slides[activeIdx];
  paintPage(sl ? themeFor(sl.v) : null);
}

function onActiveChange() {
  const n = slides.length;
  $('#counter').textContent = `${Math.min(activeIdx + 1, n)} / ${n}`;
  $('#prev').disabled = activeIdx <= 0;
  $('#next').disabled = activeIdx >= slideEls.length - 1;
  updateMounts();
  paintActive();
  const sl = slides[activeIdx];
  if (dTab && sl && sl.v !== dViz) { dViz = sl.v; renderDrawer(); }
}

export function goTo(i) {
  i = Math.max(0, Math.min(slideEls.length - 1, i));
  if (document.fullscreenElement && slides[i]) slides[i].el.requestFullscreen().catch(() => {});
  slideEls[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
export const curSlide = () => slides[activeIdx];

/* ---------- likes ---------- */
async function like(sl, onlyLike = false) {
  if (!state.me) return needSetup();
  const v = sl.v;
  if (onlyLike && v.liked) return;
  const was = v.liked;
  setLiked(v, !was, v.likes + (was ? -1 : 1));
  try {
    const r = await api(was ? 'DELETE' : 'PUT', `/api/viz/${v.id}/like`);
    setLiked(v, r.liked, r.likes);
  } catch (e) { setLiked(v, was, v.likes + (was ? 1 : -1)); toast(e.message); }
}
function setLiked(v, liked, likes) {
  for (const item of allItems().filter(x => x.id === v.id).concat(v)) { item.liked = liked; item.likes = likes; }
  for (const sl of slides.filter(s => s.v.id === v.id)) {
    const b = $('[data-act="like"]', sl.el);
    b.classList.toggle('on', liked); $('.lbl', b).textContent = fmtK(likes);
  }
}
/** Polling: other people's likes. */
export function updateLikes(id, likes) {
  for (const item of allItems().filter(x => x.id === id)) item.likes = likes;
  for (const sl of slides.filter(s => s.v.id === id)) { sl.v.likes = likes; $('[data-act="like"] .lbl', sl.el).textContent = fmtK(likes); }
}
function burst(el, x, y) {
  const p = document.createElement('span');
  p.className = 'pop'; p.innerHTML = ICON.heart; p.style.left = x + 'px'; p.style.top = y + 'px';
  el.appendChild(p); setTimeout(() => p.remove(), 750);
}

/* ---------- full screen ---------- */
async function enterFull(sl) {
  try { if (sl.el.requestFullscreen) { await sl.el.requestFullscreen(); return; } } catch { /* fall through */ }
  document.body.classList.add('immersive');
  requestAnimationFrame(() => { sl.el.scrollIntoView({ block: 'start' }); sendPads(); });
  toast('Full screen is blocked here, so the page controls are hidden instead. Press Esc to exit.');
}
export function exitFull() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (document.body.classList.contains('immersive')) {
    document.body.classList.remove('immersive');
    requestAnimationFrame(() => { slideEls[activeIdx]?.scrollIntoView({ block: 'start' }); sendPads(); });
  }
}
document.addEventListener('fullscreenchange', () => sendPads());
function sendPads() { for (const sl of slides) if (sl.runner) sl.runner.post({ type: 'set', pads: readPads(isFull(sl)) }); }
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(sendPads, 150); });

/* ---------- actions ---------- */
export function handleAct(act, el) {
  if (act === 'exitfull') return exitFull();
  const sl = slides.find(s => s.el.contains(el));
  if (!sl) return;
  if (act === 'like') like(sl);
  else if (act === 'explain' || act === 'customize' || act === 'source') openDrawer(act, sl.v);
  else if (act === 'full') enterFull(sl);
  else if (act === 'share') copyText(`${location.origin}/#/v/${sl.v.slug}`, 'Link copied');
  else if (act === 'flag') flagMenu({ viz: sl.v });
  else if (act === 'delete') deleteFromPlayground(sl.v);
}

async function deleteFromPlayground(v) {
  if (!confirm(`Delete “${v.title}” from the Playground? This can't be undone.`)) return;
  try { await api('DELETE', `/api/viz/${v.id}`); }
  catch (e) { return toast(e.message); }
  state.items.playground = (state.items.playground || []).filter(x => x.id !== v.id);
  closeDrawer();
  if (location.hash === '#/playground') buildFeed({ keepPosition: true }); else location.hash = '#/playground';
  toast('Deleted from the Playground');
}

/* ---------- chips / filters ---------- */
function tagCounts() {
  const m = new Map();
  (state.items[state.tab] || []).forEach(v => v.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
function renderChips() {
  const items = state.items[state.tab] || [];
  let h = `<button class="chip" type="button" data-chip="all" aria-pressed="${filter.type === 'all'}">All<span class="n">${items.length}</span></button>`;
  if (filter.type === 'playlist') h += `<button class="chip" type="button" data-chip="all" aria-pressed="true" title="Clear playlist">▶ ${esc(filter.name)} ✕</button>`;
  h += tagCounts().map(([t, n]) => `<button class="chip" type="button" data-chip="${esc(t)}" aria-pressed="${filter.type === 'tag' && filter.value === t}">${esc(t)}<span class="n">${n}</span></button>`).join('');
  $('#chips').innerHTML = h;
}
export function setFilter(f) { filter = f; buildFeed(); }
export function currentFilter() { return filter; }

/* ---------- drawer ---------- */
export function openDrawer(tab, v) { dTab = tab; dViz = v; drawer.classList.add('open'); drawer.inert = false; renderDrawer(); }
export function closeDrawer() { dTab = null; drawer.classList.remove('open'); drawer.inert = true; }
export const drawerOpen = () => !!dTab;
export function setDrawerTab(t) { dTab = t; renderDrawer(); }
export function setExplainRaw(raw) { explainRaw = raw; renderDrawer(); }

function renderDrawer() {
  const v = dViz;
  $('#d-kicker').innerHTML = `<span class="by-user" data-user="${esc(v.author.handle)}">@${esc(v.author.handle)}</span> · ${esc(v.license)}`;
  $('#d-title').textContent = v.title;
  $$('.dtab').forEach(b => b.setAttribute('aria-selected', b.dataset.dtab === dTab));
  const body = $('#d-body');
  if (dTab === 'explain') {
    const text = v.explanation || `## ${v.title}\n\n${v.hook || 'No explanation yet.'}`;
    body.innerHTML = `<div class="seg" role="group" aria-label="Explanation format"><button type="button" data-raw="0" aria-pressed="${!explainRaw}">Rendered</button><button type="button" data-raw="1" aria-pressed="${explainRaw}">explanation.md</button></div>
      ${explainRaw ? `<pre class="raw">${esc(text)}</pre>` : `<article class="md">${md(text)}</article>`}
      <p class="fine">${v.status === 'playground' ? 'Posted to the Playground. Only you can see this, and nobody has reviewed it yet.' : v.source === 'registry' ? `Approved by two reviewers in the practice registry${v.registryPr ? ` (pull request #${v.registryPr})` : ''}.` : v.source === 'promoted' ? 'Promoted to the feed by an admin, bypassing review (demo only).' : 'Seed content from the mockup.'}</p>`;
  } else if (dTab === 'customize') renderCustomize(v, body);
  else renderSource(v, body);
}

async function renderSource(v, body) {
  body.innerHTML = '<p class="fine">Loading…</p>';
  let code = '';
  try { code = (await get(`/api/viz/${v.id}`)).code; } catch (e) { body.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  if (dViz !== v || dTab !== 'source') return;
  const header = `// ${v.title}\n// by @${v.parent?.handle ?? v.author.handle} · ${v.license} License${v.kind === 'remix' ? `\n// (this remix runs the original's code with saved settings)` : ''}\n\n`;
  body.innerHTML = `<div class="meta"><span class="oss">open source · ${esc(v.license)}</span></div>
    <p class="fine">This is the exact code drawing the slide behind this panel, running in a sandbox. The site supplies the canvas, the clock and the theme.</p>
    <pre class="code"><code>${esc(header + code)}</code></pre>
    <div class="btnrow"><button class="btn" type="button" id="copy-src">Copy code</button><button class="btn ghost" type="button" data-route="#/play?from=${esc(v.parent?.slug ?? v.slug)}">Open a copy in the Playground</button></div>`;
  $('#copy-src').onclick = () => copyText(code, 'Code copied');
}

function renderCustomize(v, body) {
  const s = getSettings(v), pm = paramCache.get(v.runId);
  body.innerHTML = `
  <div class="field"><span class="flabel">Color scheme</span><div class="swatches">${PALETTES.map(p => { const c = p.id === 'style' ? vizPalette(v) : p;
    return `<button class="swatch" type="button" data-pal="${p.id}" aria-pressed="${s.palette === p.id}"><span class="dots">${['bg', 'fg', 'a1', 'a2'].map(k => `<i style="background:${c[k]}"></i>`).join('')}</span>${esc(p.name)}</button>`; }).join('')}</div></div>
  <div class="field"><label class="flabel" for="cz-font">Label font</label><select class="input" id="cz-font">${FONTS.map(f => `<option value="${f.id}"${s.font === f.id ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div>
  ${pm && typeof pm.min === 'number' ? `<div class="field"><label class="flabel" for="cz-param">${esc(pm.label || pm.key || 'Parameter')} <output id="o-param">${esc(fmtParam(pm, s.param ?? pm.value))}</output></label><input type="range" id="cz-param" min="${pm.min}" max="${pm.max}" step="${pm.step || 1}" value="${s.param ?? pm.value}"></div>` : pm ? '' : '<div class="field"><p class="fine">The parameter slider appears once the visualization has loaded.</p></div>'}
  <div class="field"><label class="flabel" for="cz-lw">Line width <output id="o-lw">${s.lw.toFixed(1)} px</output></label><input type="range" id="cz-lw" min="0.5" max="4" step="0.1" value="${s.lw}"></div>
  <div class="field"><label class="flabel" for="cz-speed">Animation speed <output id="o-speed">${s.speed.toFixed(2)}×</output></label><input type="range" id="cz-speed" min="0" max="3" step="0.05" value="${s.speed}"></div>
  <div class="field"><label class="check" for="cz-labels"><input type="checkbox" id="cz-labels"${s.labels ? ' checked' : ''}> Show formulas and labels</label>
    <label class="check" for="cz-all"><input type="checkbox" id="cz-all"${applyAll ? ' checked' : ''}> Apply color, font, line width and speed to every visualization</label></div>
  <div class="field"><span class="flabel">Keep this version</span>
    <p class="fine">Save these settings as a remix, credited to the original author. It appears on your profile and in the Playground, where only you can see it.</p>
    <div class="btnrow"><button class="btn" type="button" id="cz-remix">Save as remix</button><button class="btn ghost" type="button" id="cz-reset">Reset to defaults</button></div></div>`;

  const shared = ['palette', 'font', 'lw', 'speed', 'labels'];
  const push = async keys => {
    const targets = applyAll && keys.some(k => shared.includes(k)) ? slides : slides.filter(sl => sl.v.id === v.id);
    if (keys.includes('palette')) { targets.forEach(sl => paintSlide(sl.el, themeFor(sl.v))); paintActive(); }
    for (const sl of targets) {
      if (!sl.runner) continue;
      const theme = themeFor(sl.v);
      const msg = { type: 'set', settings: runnerSettings(getSettings(sl.v)) };
      if (keys.includes('palette') || keys.includes('font')) { msg.theme = theme; msg.fonts = await fontsFor(theme.font); }
      sl.runner.post(msg);
    }
  };
  const set = (k, val) => {
    s[k] = val;
    if (applyAll && shared.includes(k)) for (const o of allItems()) getSettings(o)[k] = val;
    push([k]);
  };
  $$('.swatch', body).forEach(b => (b.onclick = () => { set('palette', b.dataset.pal); $$('.swatch', body).forEach(x => x.setAttribute('aria-pressed', x === b)); }));
  $('#cz-font').onchange = e => set('font', e.target.value);
  const param = $('#cz-param');
  if (param) param.oninput = e => { set('param', +e.target.value); $('#o-param').textContent = fmtParam(pm, +e.target.value); };
  $('#cz-lw').oninput = e => { set('lw', +e.target.value); $('#o-lw').textContent = (+e.target.value).toFixed(1) + ' px'; };
  $('#cz-speed').oninput = e => { set('speed', +e.target.value); $('#o-speed').textContent = (+e.target.value).toFixed(2) + '×'; };
  $('#cz-labels').onchange = e => set('labels', e.target.checked);
  $('#cz-all').onchange = e => { applyAll = e.target.checked; if (applyAll) { shared.forEach(k => allItems().forEach(o => (getSettings(o)[k] = s[k]))); push(shared); } };
  $('#cz-reset').onclick = () => { resetSettings(v); const ns = getSettings(v); if (pm) ns.param = pm.value; push(['palette', 'font']); renderCustomize(v, body); toast('Reset to the style defaults'); };
  $('#cz-remix').onclick = () => saveRemix(v);
}

function saveRemix(v) {
  if (!state.me) return needSetup();
  const card = openModal(`<div class="top"><div><div class="kicker">Save as remix</div><h2>Name your version</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Close"></button></div>
    <form class="form" id="remix-form" novalidate>
      <label class="f">Title<input class="input" name="title" maxlength="80" value="${esc(`${v.parent?.title ?? v.title} (remix)`)}"></label>
      <label class="f">Description <small>optional</small><input class="input" name="hook" maxlength="160" placeholder="What did you change, and why?"></label>
      <p class="err" hidden></p>
      <div class="btnrow"><button class="btn" type="submit">Save remix</button><button class="btn ghost" type="button" data-close-modal>Cancel</button></div>
    </form>`);
  $('#remix-form', card).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, err = $('.err', f);
    try {
      const saved = await api('POST', '/api/viz', { kind: 'remix', parentId: v.id, title: f.title.value, hook: f.hook.value, settings: getSettings(v) });
      closeModal();
      (state.items.playground ||= []).unshift(saved);
      toast('Saved. Your remix is in the Playground and on your profile.');
    } catch (ex) { err.hidden = false; err.textContent = ex.message; }
  };
}

/* ---------- keyboard ---------- */
export function onKey(e) {
  if (state.view !== 'feed') return;
  const k = e.key.toLowerCase(), sl = curSlide();
  if (k === 'arrowdown' || k === 'j' || k === 'pagedown') { e.preventDefault(); goTo(activeIdx + 1); }
  else if (k === 'arrowup' || k === 'k' || k === 'pageup') { e.preventDefault(); goTo(activeIdx - 1); }
  else if (!sl) return;
  else if (k === 'f') (document.fullscreenElement || document.body.classList.contains('immersive')) ? exitFull() : enterFull(sl);
  else if (k === 'e') openDrawer('explain', sl.v);
  else if (k === 'c') openDrawer('customize', sl.v);
  else if (k === 'l') like(sl);
  else if (k === 'escape') { if (dTab) closeDrawer(); else exitFull(); }
}

/** Feed visible or hidden (another page is open, or the browser tab is in the background). */
export function feedVisibilityChanged() {
  updateMounts();
  // A moderator may have changed their page colors while the feed was hidden.
  slides.forEach(sl => paintSlide(sl.el, themeFor(sl.v)));
  paintActive();
}

/** Scroll to a visualization in the current list; returns false if it isn't there. */
export function scrollToViz(key) {
  const i = slides.findIndex(s => s.v.slug === key || String(s.v.id) === String(key));
  if (i < 0) return false;
  requestAnimationFrame(() => slideEls[i].scrollIntoView({ block: 'start' }));
  return true;
}

export const curSlideIndex = () => activeIdx;
