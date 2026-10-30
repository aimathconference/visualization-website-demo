// Boot, routing, the account menu, polling, and delegated events.
import { $, $$, esc, api, get, toast, ICON, openModal, closeModal, storage } from './util.js';
import { state, can, ROLE_NAMES } from './state.js';
import { pfp } from './avatar.js';
import * as F from './feed.js';
import * as Pg from './pages.js';
import { renderPlay, leavePlay } from './play.js';
import { paintPage } from './theme.js';
import { loadPageTheme } from './page-theme.js'; // page theme (temporary)

const POLL_MS = 5000;

/* ---------- views and routing ---------- */
function setView(view, tabName) {
  if (state.view === 'play' && view !== 'play') leavePlay();
  state.view = view;
  const isFeed = view === 'feed';
  $('#page').hidden = isFeed;
  $('#chips').hidden = !isFeed;
  $('#feednav').hidden = !isFeed;
  if (!isFeed) { F.closeDrawer(); F.exitFull(); paintPage(null); }
  $$('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === tabName));
  F.feedVisibilityChanged();
}

async function loadItems(tab, force = false) {
  if (!state.items[tab] || force) {
    const r = await get(`/api/feed?tab=${tab}`);
    state.items[tab] = r.items;
    if (!state.seq) state.seq = r.seq;
  }
  return state.items[tab];
}

async function showFeed(tab, { slug, filter } = {}) {
  await Promise.all([loadItems('reviewed'), loadItems('playground')]);
  const changed = state.tab !== tab || filter || (F.currentFilter().type !== 'all' && !slug);
  state.tab = tab;
  setView('feed', tab === 'playground' ? 'playground' : 'feed');
  if (filter) F.setFilter(filter);
  else if (changed || !$('#feed').children.length) F.setFilter({ type: 'all' });
  if (slug && !F.scrollToViz(slug)) {
    const v = F.findItem(slug);
    if (v) { state.tab = v.status === 'playground' ? 'playground' : 'reviewed'; F.setFilter({ type: 'all' }); F.scrollToViz(slug); setView('feed', state.tab === 'playground' ? 'playground' : 'feed'); }
    else toast('That visualization isn’t available.');
  }
}

async function route() {
  const [path, query] = (location.hash.slice(1) || '/feed').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query || '');
  closeModal(true);
  try {
    switch (parts[0]) {
      case 'playground': return await showFeed('playground');
      case 'v': return await showFeed(state.tab, { slug: parts[1] });
      case 'browse': setView('browse', 'browse'); await loadItems('reviewed'); return Pg.renderBrowse();
      case 'blog': setView('blog', 'blog'); await Promise.all([loadItems('reviewed'), loadItems('playground')]); return Pg.renderBlog(parts[1]);
      case 'u': setView('user'); return Pg.renderUser(parts[1]);
      case 'me': setView(parts[1]); return parts[1] === 'settings' ? Pg.renderSettings() : Pg.renderLikes();
      case 'play': setView('play'); return renderPlay(params.get('from'));
      case 'admin': setView('admin'); return Pg.renderAdmin();
      default: return await showFeed('reviewed');
    }
  } catch (e) { toast(e.message); }
}
addEventListener('hashchange', route);

/* ---------- account menu ---------- */
function renderActs() {
  const acts = $('#acts'), info = state.meInfo;
  if (state.me) {
    acts.innerHTML = `<button class="me-btn" type="button" id="me-btn" aria-haspopup="menu" aria-expanded="false">${pfp(state.me.avatar)}<span>@${esc(state.me.handle)}</span></button>
      <div class="me-menu" id="me-menu" role="menu" hidden>
        <div class="role">${esc(ROLE_NAMES[state.me.role] || state.me.role)}</div>
        <button type="button" role="menuitem" data-user="${esc(state.me.handle)}">My profile</button>
        <button type="button" role="menuitem" data-route="#/me/likes">My likes</button>
        <button type="button" role="menuitem" data-route="#/play">Write a visualization</button>
        <button type="button" role="menuitem" data-route="#/me/settings">Settings and newsletter</button>
        ${can('moderator') ? '<button type="button" role="menuitem" data-route="#/me/settings" data-pt-jump>Page colors</button>' : '' /* page theme (temporary) */}
        ${can('admin') ? '<button type="button" role="menuitem" data-route="#/admin">Admin</button>' : ''}
        <button type="button" role="menuitem" data-sign-out>Sign out</button>
      </div>`;
  } else if (info?.signedOut) {
    acts.innerHTML = '<button class="btn" type="button" data-sign-in>Sign in</button>';
  } else if (info?.identified && !info.removed) {
    acts.innerHTML = '<button class="btn" type="button" data-setup><span>Set up<span class="wide-only"> profile</span></span></button>';
  } else acts.innerHTML = '';
  // Feed slides show moderator controls based on role, so rebuild them.
  if (state.view === 'feed' && $('#feed').children.length) F.buildFeed({ keepPosition: true });
}
function toggleMenu(open) {
  const m = $('#me-menu'), b = $('#me-btn');
  if (!m) return;
  m.hidden = open === undefined ? !m.hidden : !open;
  b.setAttribute('aria-expanded', String(!m.hidden));
}

/* ---------- signing out and back in (see "Sign out" in server/routes/users.js) ---------- */
// Reloading puts every part of the page, including the moderator-only parts, in the new state.
function confirmSignOut() {
  const card = openModal(`<div class="top"><div><div class="kicker">Sign out</div><h2>Sign out of this browser?</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Cancel"></button></div>
    <p>You can keep browsing, but you won't be able to like, remix or post until you sign back in.</p>
    <p class="fine">Tailscale still knows this device, so anyone using it can sign back in without a password. To lock it, turn off Tailscale too.</p>
    <div class="btnrow"><button class="btn" type="button" id="sign-out-yes">Sign out</button><button class="btn ghost" type="button" data-close-modal>Cancel</button></div>`);
  $('#sign-out-yes', card).onclick = async () => {
    try { await api('POST', '/api/sign-out'); } catch (e) { return toast(e.message); }
    location.hash = '#/feed'; // the page you're on may be for signed-in people only
    location.reload();
  };
}
async function signIn() {
  try { await api('POST', '/api/sign-in'); } catch (e) { return toast(e.message); }
  location.reload();
}

function showNotice() {
  const n = $('#notice'), info = state.meInfo;
  if (info?.signedOut) n.hidden = true; // the Sign in button in the top bar says it all
  else if (!info?.identified) {
    n.innerHTML = state.config.authMode === 'dev'
      ? 'Dev mode: type a login in the “Acting as” box at the top to act as someone.'
      : 'You can look around, but to like, remix or post, open this from a personal device that’s signed into Tailscale (not a tagged or shared server device).';
    n.hidden = false;
  } else if (info.removed) {
    n.textContent = 'An admin removed this account. You can still look around.';
    n.hidden = false;
  } else n.hidden = true;
}

/* ---------- polling for live updates ---------- */
let pollTimer = null, polling = false;
async function poll() {
  if (polling || document.hidden) return;
  polling = true;
  try {
    const r = await get(`/api/changes?since=${state.seq}`);
    let stale = false;
    const known = new Map([...(state.items.reviewed || []), ...(state.items.playground || [])].map(v => [v.id, v]));
    for (const c of r.changes) {
      const v = known.get(c.id);
      if (!v) { stale = true; continue; }
      if (v.likes !== c.likes) F.updateLikes(c.id, c.likes);
      if (v.status !== c.status || v.hidden !== !!c.hidden || v.pinned !== !!c.pinned) stale = true;
    }
    if (r.removed.some(id => known.has(id))) stale = true;
    state.seq = r.seq;
    if (stale) { state.stale = true; $('#refresh-pill').hidden = state.view !== 'feed'; }
  } catch { /* offline for a moment; try again next time */ }
  polling = false;
}
async function refreshItems({ rebuild = true } = {}) {
  await Promise.all([loadItems('reviewed', true), loadItems('playground', true)]);
  state.stale = false;
  $('#refresh-pill').hidden = true;
  if (rebuild && state.view === 'feed') F.buildFeed({ keepPosition: true });
}
document.addEventListener('visibilitychange', () => { F.feedVisibilityChanged(); if (!document.hidden) poll(); });

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const t = e.target;
  if (!t.closest('#acts')) toggleMenu(false);
  if (t.id === 'modal' && $('#modal').dataset.dismissable) return closeModal();
  if (t.closest('[data-close-modal]')) return closeModal();
  if (t.closest('#me-btn')) return toggleMenu();
  if (state.view === 'admin' && await Pg.adminClick(t)) return;
  if (t.closest('[data-sign-out]')) { toggleMenu(false); return confirmSignOut(); }
  if (t.closest('[data-sign-in]')) return signIn();
  if (t.closest('[data-setup]')) return Pg.openSetupSheet();
  const fu = t.closest('[data-flag-user]'); if (fu) return Pg.flagMenu({ handle: fu.dataset.flagUser });
  const ub = t.closest('[data-user]'); if (ub) { toggleMenu(false); location.hash = `#/u/${encodeURIComponent(ub.dataset.user)}`; return; }
  const rb = t.closest('[data-route]'); if (rb) { toggleMenu(false); if (location.hash === rb.dataset.route) route(); else location.hash = rb.dataset.route; return; }
  if (t.closest('[data-back]')) return history.length > 1 ? history.back() : (location.hash = '#/feed');
  const vz = t.closest('[data-viz]'); if (vz) { location.hash = `#/v/${encodeURIComponent(vz.dataset.viz)}`; return; }
  const pl = t.closest('[data-playlist]'); if (pl) { const f = await Pg.playlistForPost(pl.dataset.playlist); return showFeed('reviewed', { filter: f }); }
  if (t.closest('[data-play-likes]')) return showFeed(state.tab, { filter: Pg.likesPlaylist() });
  const ch = t.closest('[data-chip]'); if (ch) return F.setFilter(ch.dataset.chip === 'all' ? { type: 'all' } : { type: 'tag', value: ch.dataset.chip });
  const ct = t.closest('[data-cattag]'); if (ct) return Pg.toggleCatTag(ct.dataset.cattag);
  const tg = t.closest('[data-tag]'); if (tg) { if (state.view !== 'feed') location.hash = '#/feed'; return F.setFilter({ type: 'tag', value: tg.dataset.tag }); }
  if (t.closest('[data-go="top"]')) return F.goTo(0);
  const dt = t.closest('[data-dtab]'); if (dt) return F.setDrawerTab(dt.dataset.dtab);
  const rw = t.closest('[data-raw]'); if (rw) return F.setExplainRaw(rw.dataset.raw === '1');
  const act = t.closest('[data-act]'); if (act) return F.handleAct(act.dataset.act, act);
});
$('#prev').onclick = () => F.goTo(F.curSlideIndex() - 1);
$('#next').onclick = () => F.goTo(F.curSlideIndex() + 1);
$('#d-close').onclick = F.closeDrawer;
$('#refresh-pill').onclick = () => refreshItems();

// Newsletter signup forms (end of feed, blog). No account needed.
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-newsletter]');
  if (!f) return;
  e.preventDefault();
  const email = $('input[type="email"]', f).value.trim(), err = $('.nl-err', f);
  const lists = $$('input[name="list"]:checked', f).map(i => i.value);
  try {
    await api('POST', '/api/newsletter', { email, lists });
    f.outerHTML = `<div class="nl-ok" role="status"><strong>You're on the list.</strong><span class="fine">${esc(email)} is saved. This is a demo, so nothing will actually be sent.</span></div>`;
  } catch (ex) { err.hidden = false; err.textContent = ex.message; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#modal').hidden) return closeModal();
    if (!$('#me-menu')?.hidden) return toggleMenu(false);
    if (F.drawerOpen()) return F.closeDrawer();
    if (document.body.classList.contains('immersive')) return F.exitFull();
    return;
  }
  if (e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey || !$('#modal').hidden) return;
  F.onKey(e);
});

document.addEventListener('loci:need-setup', () => {
  if (state.meInfo?.identified && !state.meInfo.removed) Pg.openSetupSheet();
  else if (state.meInfo?.signedOut) toast('Sign in to do that.');
  else toast('Open this from a personal device signed into Tailscale to do that.');
});
document.addEventListener('loci:me-changed', () => { state.meInfo = { ...state.meInfo, needsSetup: false }; renderActs(); showNotice(); refreshItems(); if (state.view === 'play') route(); });
document.addEventListener('loci:refresh-items', () => refreshItems({ rebuild: state.view === 'feed' }));

/* ---------- dev-mode identity switcher ---------- */
function setupActing() {
  if (state.config.authMode !== 'dev') return;
  const input = $('#acting-input');
  const current = document.cookie.match(/(?:^|; )dev_login=([^;]*)/)?.[1];
  input.value = current ? decodeURIComponent(current) : '';
  input.placeholder = 'default dev login';
  $('#devbar').hidden = false;
  input.addEventListener('change', () => {
    const v = input.value.trim();
    document.cookie = v ? `dev_login=${encodeURIComponent(v)}; path=/; SameSite=Strict` : 'dev_login=; path=/; max-age=0';
    location.reload();
  });
}

/* ---------- boot ---------- */
async function boot() {
  $('#prev').innerHTML = ICON.up; $('#next').innerHTML = ICON.down; $('#d-close').innerHTML = ICON.close;
  [state.config, state.meInfo] = await Promise.all([get('/api/config'), get('/api/me')]);
  state.me = state.meInfo.user || null;
  await loadPageTheme(); // page theme (temporary)
  document.title = state.config.siteName;
  $('#brand-name').textContent = state.config.siteName;
  setupActing();
  renderActs();
  showNotice();
  await route();
  if (state.meInfo.identified && state.meInfo.needsSetup && !storage.get('loci-setup-later')) Pg.openSetupSheet();
  pollTimer = setInterval(poll, POLL_MS);
}
boot().catch(e => { document.body.innerHTML = `<p style="padding:24px;font-family:system-ui">Couldn't start: ${esc(e.message)}</p>`; });
