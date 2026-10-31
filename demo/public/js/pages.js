// Every page that isn't the feed: browse, blog, profiles, my likes, settings, admin, plus the profile-setup
// sheet and the moderators' flag menu.
import { $, $$, esc, fmtK, md, api, get, toast, ICON, openModal, closeModal, storage } from './util.js';
import { state, can, needSetup, ROLE_NAMES } from './state.js';
import { pfp, avatarURL, AVATAR_KINDS, randomAvatar, withDefaults } from './avatar.js';
import { thumbURL, makeAndUploadThumb } from './runner.js';
import { STYLE_PAL } from './theme.js';
import { pageThemePanel, bindPageThemePanel } from './page-theme.js'; // page theme (temporary)

const page = $('#page');
const LIST_NAMES = { 'best-of-month': 'Best of the month', 'dev-blog': 'Development blog', miscellany: 'Miscellany' };
const LIST_HINTS = { 'best-of-month': 'The month’s top visualizations', 'dev-blog': 'News about the site and how it’s built', miscellany: 'Everything else' };
const host = u => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');

const thumbHTML = v => {
  const u = thumbURL(v);
  return u ? `<img class="tn" src="${esc(u)}" alt="" loading="lazy">` : '<div class="tn empty">No preview yet</div>';
};
export function cardHTML(v) {
  return `<button class="card" type="button" data-viz="${esc(v.slug)}">
    ${thumbHTML(v)}
    <div class="card-body"><h3>${esc(v.title)}</h3>
      <div class="by"><span class="by-user" data-user="${esc(v.author.handle)}">@${esc(v.author.handle)}</span> · ♥ ${fmtK(v.likes)}${v.status === 'playground' ? ' · <span class="badge">not reviewed</span>' : ''}</div>
      ${v.parent ? `<div class="by">remix of ${esc(v.parent.title)}</div>` : ''}
      <div class="tline">${v.tags.map(t => '#' + esc(t.toLowerCase())).join('  ')}</div>
      <div class="meta"><span class="oss">${esc(v.license)}</span></div></div></button>`;
}
const wrap = inner => `<div class="wrap">${inner}</div>`;
function show(html) { page.innerHTML = wrap(html); page.scrollTop = 0; }
const loading = () => show('<p class="fine">Loading…</p>');
const failed = e => show(`<div class="pagehead"><h1>Something went wrong</h1><p>${esc(e.message)}</p></div>`);

/* ---------- browse ---------- */
let catTags = new Set(), catQuery = '';
export async function renderBrowse() {
  const items = state.items.reviewed || [];
  let people = [];
  try { people = (await get('/api/users')).items; } catch { /* the grid still works */ }
  const counts = new Map();
  items.forEach(v => v.tags.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  show(`<div class="pagehead"><div class="kicker">Catalog · ${items.length} reviewed visualizations · all open source</div><h1>Browse the collection</h1>
      <p>Everything here was reviewed, either as seed content or approved by two moderators in the practice registry. Unreviewed work lives in the Playground.</p></div>
    <div class="filters"><label class="sr" for="cat-search">Search the catalog</label><input class="input" id="cat-search" type="search" placeholder="Search titles, topics, authors" style="max-width:420px" value="${esc(catQuery)}">
      <div class="chipwrap">${[...counts].sort((a, b) => b[1] - a[1]).map(([t, n]) => `<button class="chip" type="button" data-cattag="${esc(t)}" aria-pressed="${catTags.has(t)}">${esc(t)}<span class="n">${n}</span></button>`).join('')}</div></div>
    <div class="grid" id="cat-grid"></div>
    <div class="people"><h2 class="sechead">Contributors</h2><div class="chipwrap">${people.map(u => `<button class="person" type="button" data-user="${esc(u.handle)}">${pfp(u.avatar, 'sm')}@${esc(u.handle)}<span class="n">${u.count}</span></button>`).join('')}</div></div>`);
  $('#cat-search').oninput = e => { catQuery = e.target.value.trim().toLowerCase(); renderGrid(); };
  renderGrid();
}
function renderGrid() {
  const list = (state.items.reviewed || []).filter(v => [...catTags].every(t => v.tags.includes(t)) &&
    (!catQuery || `${v.title} ${v.tags.join(' ')} ${v.author.handle} ${v.hook}`.toLowerCase().includes(catQuery)));
  $('#cat-grid').innerHTML = (list.length ? list.map(cardHTML).join('') : '<p class="empty">No visualizations match. Clear a topic or try a shorter search.</p>')
    + `<div class="card submit"><div class="card-body"><div class="kicker">Contribute</div><h3>Write a visualization</h3>
      <ul><li>Try it in the Playground: only you can see it there, marked as not reviewed</li><li>Submit it for review: two moderators approve it on GitHub, then it joins this catalog</li></ul>
      <button class="btn ghost" type="button" data-route="#/play">Open the Playground</button></div></div>`;
}
export function toggleCatTag(t) { catTags.has(t) ? catTags.delete(t) : catTags.add(t); renderBrowse(); }

/* ---------- blog ---------- */
const byline = p => {
  const names = new Intl.ListFormat('en').format(p.authors.map(h => `<span class="by-user" data-user="${esc(h)}">@${esc(h)}</span>`));
  return p.byline ? `${names}, ${esc(p.byline)}` : names;
};
const lookup = slug => [...(state.items.reviewed || []), ...(state.items.playground || [])].find(v => v.slug === slug);
const newsletterForm = id => `<form class="nl-form" data-newsletter novalidate>
    <label class="flabel" for="${id}">Email</label>
    <div class="nl-row"><input class="input" type="email" id="${id}" placeholder="you@university.edu" autocomplete="email"><button class="btn" type="submit">Subscribe</button></div>
    <div class="checks">${Object.entries(LIST_NAMES).map(([k, n]) => `<label class="check"><input type="checkbox" name="list" value="${k}"${k === 'best-of-month' ? ' checked' : ''}> ${n}</label>`).join('')}</div>
    <p class="nl-err" hidden></p><p class="fine">Demo: your address is stored but nothing is sent.</p></form>`;

export async function renderBlog(slug) {
  loading();
  try {
    if (!slug) {
      const posts = (await get('/api/posts')).items;
      show(`<div class="pagehead"><div class="kicker">Blog</div><h1>Notes from the curators</h1><p>Monthly roundups, guest lists from teachers and researchers, and how the catalog is made. Blog maintainers add posts by pull request.</p></div>
        <div class="blog-grid"><div class="posts">${posts.map(p => { const v = lookup(p.viz[0]);
          return `<button class="post" type="button" data-route="#/blog/${esc(p.slug)}">${v ? thumbHTML(v) : '<div class="tn empty">Essay</div>'}
            <div class="pb"><div class="pmeta">${esc(p.date)} · ${esc(p.read)}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p><div class="pmeta">${byline(p)}${p.viz.length ? ` · ${p.viz.length} visualizations` : ''}</div></div></button>`; }).join('')}</div>
          <aside class="side"><div class="kicker">Newsletter</div><h2>Three lists</h2><p>Best of the month, the development blog, and miscellany. Pick any.</p>${newsletterForm('side-email')}</aside></div>`);
      return;
    }
    const p = await get(`/api/posts/${encodeURIComponent(slug)}`);
    const viz = p.viz.map(lookup).filter(Boolean);
    show(`<div class="article"><button class="backlink" type="button" data-route="#/blog">← All posts</button>
      <div class="pmeta">${esc(p.date)} · ${esc(p.read)} · ${byline(p)}</div><h1>${esc(p.title)}</h1>
      ${viz.length ? `<div class="btnrow"><button class="btn" type="button" data-playlist="${esc(p.slug)}">▶ Watch these ${viz.length} in the feed</button></div>
        <div class="inpost">${viz.map(v => `<button class="mini" type="button" data-viz="${esc(v.slug)}">${thumbHTML(v)}${esc(v.title)}</button>`).join('')}</div>` : ''}
      <div class="md">${md(p.body)}</div>
      <div class="side" style="position:static"><div class="kicker">Newsletter</div><h2>Get the next one</h2>${newsletterForm('art-email')}</div></div>`);
  } catch (e) { failed(e); }
}
export async function playlistForPost(slug) {
  const p = await get(`/api/posts/${encodeURIComponent(slug)}`);
  return { type: 'playlist', name: p.title, items: p.viz.map(lookup).filter(Boolean) };
}

/* ---------- profiles ---------- */
export async function renderUser(handle) {
  loading();
  try {
    const { user: u, viz, posts } = await get(`/api/users/${encodeURIComponent(handle)}`);
    const likes = viz.reduce((s, v) => s + v.likes, 0), isMe = state.me?.handle === u.handle;
    show(`<button class="backlink" type="button" data-back>← Back</button>
      <div class="profile">${pfp(u.avatar, 'xl')}
        <div class="pinfo"><div class="kicker">${u.placeholder ? 'Contributor (seed or registry author)' : ROLE_NAMES[u.role] || 'Contributor'}</div><h1>@${esc(u.handle)}</h1>${u.bio ? `<p>${esc(u.bio)}</p>` : ''}
          <div class="pstats"><span><b>${viz.length}</b> visualization${viz.length === 1 ? '' : 's'}</span><span><b>${fmtK(likes)}</b> likes</span><span>Joined ${esc((u.joined || '').slice(0, 10))}</span></div>
          <div class="btnrow">
            ${u.homepage ? `<a class="btn ghost" href="${esc(u.homepage)}" target="_blank" rel="noopener noreferrer">${ICON.globe}<span>${esc(host(u.homepage))}</span></a>` : ''}
            ${u.github ? `<a class="btn ghost" href="https://github.com/${esc(u.github)}" target="_blank" rel="noopener noreferrer">${ICON.branch}<span>github.com/${esc(u.github)}</span></a>` : ''}
            ${isMe ? '<button class="btn ghost" type="button" data-route="#/me/settings">Edit profile</button>' : ''}
            ${can('moderator') && !isMe && !u.placeholder ? `<button class="btn ghost" type="button" data-flag-user="${esc(u.handle)}">${ICON.flag}<span>Flag account</span></button>` : ''}
          </div></div></div>
      <h2 class="sechead">Visualizations</h2>
      <div class="grid">${viz.length ? viz.map(cardHTML).join('') : `<p class="empty">${isMe ? 'Nothing yet. Try the Playground.' : 'Nothing yet.'}</p>`}</div>
      ${posts.length ? `<h2 class="sechead">Writing</h2><div class="rows">${posts.map(p => `<button class="row" type="button" data-route="#/blog/${esc(p.slug)}"><span class="pmeta">${esc(p.date)} · ${esc(p.read)}</span><strong>${esc(p.title)}</strong><span class="fine">${esc(p.excerpt)}</span></button>`).join('')}</div>` : ''}`);
  } catch (e) { failed(e); }
}

/* ---------- my likes ---------- */
let myLikes = [];
export async function renderLikes() {
  if (!state.me) { show('<div class="pagehead"><h1>My likes</h1><p>Set up your profile to start liking visualizations.</p></div>'); return needSetup(); }
  loading();
  try {
    myLikes = (await get('/api/me/likes')).items;
    show(`<div class="pagehead"><div class="kicker">My likes · ${myLikes.length}</div><h1>Everything you've liked</h1><p>Newest first. Play them as a feed, or open any one.</p></div>
      ${myLikes.length ? '<div class="btnrow"><button class="btn" type="button" data-play-likes>▶ Play in the feed</button></div>' : ''}
      <div class="grid">${myLikes.length ? myLikes.map(cardHTML).join('') : '<p class="empty">No likes yet. Double-click a visualization, or tap the heart.</p>'}</div>`);
  } catch (e) { failed(e); }
}
export const likesPlaylist = () => ({ type: 'playlist', name: 'My likes', items: myLikes });

/* ---------- avatar picker + profile forms ---------- */
function avatarPicker(initial, tailscalePic) {
  let a = initial?.tailscale ? initial : withDefaults(initial || randomAvatar());
  const html = `<div class="avpick"><img class="pfp xl" id="av-img" alt="">
    <div class="form" style="gap:8px">
      <div class="avkinds" id="av-kinds">${Object.entries(AVATAR_KINDS).map(([k, n]) => `<button type="button" data-kind="${k}">${n}</button>`).join('')}${tailscalePic ? '<button type="button" data-kind="tailscale">Tailscale picture</button>' : ''}</div>
      <div class="avcolors" id="av-colors"><label>Background <input type="color" id="av-bg"></label><label>Curve <input type="color" id="av-fg"></label><button class="btn ghost sm" type="button" id="av-shuffle">Shuffle</button></div>
    </div></div>`;
  const bind = root => {
    const sync = () => {
      $('#av-img', root).src = a.tailscale ? tailscalePic : avatarURL(a);
      $$('#av-kinds button', root).forEach(b => b.setAttribute('aria-pressed', a.tailscale ? b.dataset.kind === 'tailscale' : b.dataset.kind === a.kind));
      $('#av-colors', root).hidden = !!a.tailscale;
      if (!a.tailscale) { $('#av-bg', root).value = a.bg; $('#av-fg', root).value = a.fg; }
    };
    $$('#av-kinds button', root).forEach(b => (b.onclick = () => {
      if (b.dataset.kind === 'tailscale') a = { tailscale: true };
      else { const prev = a.tailscale ? randomAvatar() : a; a = withDefaults({ kind: b.dataset.kind, bg: prev.bg, fg: prev.fg }); }
      sync();
    }));
    $('#av-bg', root).oninput = e => { a.bg = e.target.value; sync(); };
    $('#av-fg', root).oninput = e => { a.fg = e.target.value; sync(); };
    $('#av-shuffle', root).onclick = () => { a = randomAvatar(); sync(); };
    sync();
  };
  return { html, bind, value: () => (a.tailscale ? { tailscale: true } : a) };
}

const profileFields = u => `
  <label class="f">Homepage <small>optional</small><input class="input" name="homepage" type="url" maxlength="200" placeholder="https://" value="${esc(u?.homepage || '')}"></label>
  <label class="f">GitHub username <small>needed to submit for review or moderate; links your approved work to this profile</small><input class="input" name="github" maxlength="39" placeholder="octocat" value="${esc(u?.github || '')}"></label>
  <label class="f">Bio <small>optional, 300 characters</small><textarea class="input" name="bio" rows="2" maxlength="300">${esc(u?.bio || '')}</textarea></label>`;

export function openSetupSheet() {
  const info = state.meInfo;
  if (!info?.identified || info.removed || state.me) return;
  const picker = avatarPicker(null, info.tailscalePic);
  const card = openModal(`<div class="top"><div><div class="kicker">Welcome</div><h2>Set up your profile</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Later"></button></div>
    <p class="fine" style="font-size:14px">Tailscale already knows who you are, so there's no password. Pick how you'll appear to the trial team. Everything you post is visible to the team and will be deleted when the trial ends.</p>
    <form class="form" id="setup-form" novalidate>
      <label class="f">Handle <small>3–20 characters: a–z, 0–9, dot, dash, underscore. You can't change it later.</small><input class="input" name="handle" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(info.suggestedHandle || '')}" required></label>
      <div class="f" style="font-weight:700;font-size:13px">Avatar</div>${picker.html}
      ${profileFields(null)}
      <p class="err" hidden></p>
      <div class="btnrow"><button class="btn" type="submit">Save profile</button><button class="btn ghost" type="button" data-close-modal>Later</button></div>
    </form>`);
  picker.bind(card);
  // "Later": don't pop up again on this device; the "Set up profile" button stays in the top bar.
  $('#modal').addEventListener('loci:closed', () => storage.set('loci-setup-later', true), { once: true });
  $('#setup-form', card).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, err = $('.err', f);
    try {
      state.me = await api('PUT', '/api/me', { handle: f.handle.value, avatar: picker.value(), homepage: f.homepage.value, github: f.github.value, bio: f.bio.value });
      closeModal(true);
      document.dispatchEvent(new CustomEvent('loci:me-changed'));
      toast(`Welcome, @${state.me.handle}`);
    } catch (ex) { err.hidden = false; err.textContent = ex.message; }
  };
}

export function renderSettings() {
  if (!state.me) { show('<div class="pagehead"><h1>Settings</h1><p>Set up your profile first.</p></div>'); return needSetup(); }
  const u = state.me, picker = avatarPicker(u.avatar, state.meInfo?.tailscalePic), lists = u.newsletter?.lists || [];
  show(`<div class="pagehead"><div class="kicker">Settings</div><h1>@${esc(u.handle)}</h1><p>Signed in through Tailscale as a ${esc(ROLE_NAMES[u.role] || u.role)}.</p></div>
    <form class="panel form" id="profile-form" novalidate><h2>Profile</h2>${picker.html}${profileFields(u)}<p class="err" hidden></p><div class="btnrow"><button class="btn" type="submit">Save profile</button><button class="btn ghost" type="button" data-user="${esc(u.handle)}">View profile</button></div></form>
    <form class="panel" id="nl-form" novalidate><h2>Newsletter</h2><p class="fine">Choose any of the three lists. In this demo your choices are saved, but no email is sent.</p>
      <div class="checks">${Object.entries(LIST_NAMES).map(([k, n]) => `<label class="check"><input type="checkbox" name="list" value="${k}"${lists.includes(k) ? ' checked' : ''}><span>${n}<small>${LIST_HINTS[k]}</small></span></label>`).join('')}</div>
      <div class="btnrow"><button class="btn" type="submit">Save newsletter preferences</button></div></form>
    ${can('moderator') ? pageThemePanel() : ''}`); // page theme (temporary)
  picker.bind($('#profile-form'));
  if (can('moderator')) bindPageThemePanel($('#page-theme-form')); // page theme (temporary)
  $('#profile-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, err = $('.err', f);
    err.hidden = true;
    try {
      state.me = await api('PUT', '/api/me', { avatar: picker.value(), homepage: f.homepage.value, github: f.github.value, bio: f.bio.value });
      document.dispatchEvent(new CustomEvent('loci:me-changed'));
      toast('Profile saved');
    } catch (ex) { err.hidden = false; err.textContent = ex.message; }
  };
  $('#nl-form').onsubmit = async e => {
    e.preventDefault();
    const chosen = $$('input[name="list"]:checked', e.target).map(i => i.value);
    try { state.me.newsletter = await api('PUT', '/api/me/newsletter', { lists: chosen }); toast(chosen.length ? 'Newsletter preferences saved' : 'Unsubscribed from all lists'); }
    catch (ex) { toast(ex.message); }
  };
}

/* ---------- flags (moderators): prefilled GitHub issue forms ---------- */
export function flagMenu({ viz, handle }) {
  const { registryRepo, moderationRepo } = state.config;
  const site = location.origin;
  const issue = (repo, template, title, fields) => `https://github.com/${repo}/issues/new?${new URLSearchParams({ template, title, ...fields })}`;
  let links = '';
  if (viz) {
    if (!registryRepo) links = '<p class="err">Flags open issues in the practice registry, but REGISTRY_REPO isn’t configured on the server.</p>';
    else {
      const url = `${site}/#/v/${viz.slug}`;
      links = `<a href="${esc(issue(registryRepo, 'flag-changes.yml', `Changes requested: ${viz.title}`, { visualization: url, author: viz.author.github ? `@${viz.author.github}` : `@${viz.author.handle} (demo handle)` }))}" target="_blank" rel="noopener"><b>Request changes</b><small>Sends it back to the author for edits, which then go through review again.</small></a>
        <a href="${esc(issue(registryRepo, 'flag-removal.yml', `Remove: ${viz.title}`, { visualization: url }))}" target="_blank" rel="noopener"><b>Flag for removal</b><small>Admins see this and decide whether to remove it.</small></a>`;
    }
  }
  const who = handle ?? viz?.author.handle;
  if (who) {
    links += moderationRepo
      ? `<a href="${esc(issue(moderationRepo, 'flag-account.yml', `Account: @${who}`, { account: `${site}/#/u/${who}` }))}" target="_blank" rel="noopener"><b>Flag @${esc(who)}’s account</b><small>Goes to a private repo that only moderators and admins can see.</small></a>`
      : '<p class="fine">Account flags need MODERATION_REPO configured on the server.</p>';
  }
  openModal(`<div class="top"><div><div class="kicker">Moderator</div><h2>Flag</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Close"></button></div>
    <p class="fine" style="font-size:14px">Flags are GitHub issues, as they will be in production. Each link opens a prefilled form; add your reason there.</p>
    <div class="flaglinks">${links}</div>`);
}

/* ---------- admin ---------- */
function askReason(title, { required = false, confirmLabel = 'Confirm' } = {}) {
  return new Promise(resolve => {
    const card = openModal(`<div class="top"><div><div class="kicker">Admin</div><h2>${esc(title)}</h2></div><button class="iconbtn" type="button" data-close-modal aria-label="Cancel"></button></div>
      <form class="form" novalidate><label class="f">Reason <small>${required ? 'required, recorded in the audit log' : 'optional, recorded in the audit log'}</small><input class="input" name="reason" maxlength="300"></label>
      <div class="btnrow"><button class="btn" type="submit">${esc(confirmLabel)}</button><button class="btn ghost" type="button" data-close-modal>Cancel</button></div></form>`);
    $('#modal').addEventListener('loci:closed', () => resolve(null), { once: true });
    $('form', card).onsubmit = e => {
      e.preventDefault();
      const r = e.target.reason.value.trim();
      if (required && !r) return e.target.reason.focus();
      closeModal(true); resolve(r);
    };
  });
}

export async function renderAdmin() {
  if (!can('admin')) { show('<div class="pagehead"><h1>Admin</h1><p>Only admins can see this page.</p></div>'); return; }
  loading();
  try {
    const [users, viz, auditLog] = await Promise.all([get('/api/admin/users'), get('/api/admin/viz'), get('/api/admin/audit')]);
    const missing = viz.items.filter(v => !v.hidden && viewable(v) && Object.keys(v.thumbs).length < Object.keys(STYLE_PAL).length).length;
    show(`<div class="pagehead"><div class="kicker">Admin</div><h1>Run the trial</h1><p>Every action here is recorded in the audit log below. “Promote” is the wishlist’s review bypass and exists only in this demo.</p></div>
      <div class="btnrow">
        <button class="btn ghost" type="button" data-admin-tool="import">Import from the practice registry now</button>
        <button class="btn ghost" type="button" data-admin-tool="posts">Reload blog posts</button>
        <button class="btn ghost" type="button" data-admin-tool="thumbs">Generate missing thumbnails (${missing})</button>
        <a class="btn ghost" href="/api/admin/export" download>Export all data (JSON)</a>
      </div>
      <h2 class="sechead">People</h2>
      <div class="tablewrap"><table class="admin"><thead><tr><th>Person</th><th>Role</th><th>Posts</th><th>Joined</th><th></th></tr></thead><tbody>
      ${users.items.map(u => `<tr class="${u.removed ? 'dim' : ''}"><td><span class="who-cell">${pfp(u.avatar, 'sm')}<span class="by-user" data-user="${esc(u.handle)}">@${esc(u.handle)}</span>${u.placeholder ? ' <span class="badge">placeholder</span>' : ''}${u.removed ? ' <span class="badge">removed</span>' : ''}</span></td>
        <td>${u.placeholder ? '—' : `<select class="input" data-role-for="${u.id}" style="padding:4px 8px">${Object.entries(ROLE_NAMES).map(([r, n]) => `<option value="${r}"${u.role === r ? ' selected' : ''}>${n}</option>`).join('')}</select>`}</td>
        <td>${u.count}</td><td>${esc((u.joined || '').slice(0, 10))}</td>
        <td>${u.handle === state.me.handle ? '' : u.removed ? `<button class="btn ghost sm" type="button" data-restore-user="${u.id}">Restore</button>` : `<button class="btn ghost sm" type="button" data-remove-user="${u.id}" data-handle="${esc(u.handle)}">Remove account</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <h2 class="sechead">Visualizations</h2>
      <div class="tablewrap"><table class="admin"><thead><tr><th>Title</th><th>Author</th><th>Where</th><th>Likes</th><th>Actions</th></tr></thead><tbody>
      ${viz.items.map(v => `<tr class="${v.hidden ? 'dim' : ''}"><td class="wrap">${viewable(v) ? `<button class="tag" type="button" data-viz="${esc(v.slug)}">${esc(v.title)}</button>` : esc(v.title)}${v.hidden ? ' <span class="badge">hidden</span>' : ''}${v.pinned ? ' <span class="badge">pinned</span>' : ''}</td>
        <td><span class="by-user" data-user="${esc(v.author.handle)}">@${esc(v.author.handle)}</span></td>
        <td>${v.status === 'reviewed' ? `Feed · ${esc(v.source)}` : `Playground${v.kind === 'remix' ? ' · remix' : ''}`}</td><td>${v.likes}</td>
        <td><div class="btnrow">${v.hidden ? `<button class="btn ghost sm" data-viz-act="unhide" data-id="${v.id}">Unhide</button>` : `<button class="btn ghost sm" data-viz-act="hide" data-id="${v.id}">Hide</button>`}
          ${v.pinned ? `<button class="btn ghost sm" data-viz-act="unpin" data-id="${v.id}">Unpin</button>` : `<button class="btn ghost sm" data-viz-act="pin" data-id="${v.id}">Pin</button>`}
          ${v.status === 'playground' ? `<button class="btn ghost sm" data-viz-act="promote" data-id="${v.id}">Promote to feed</button>` : ''}
          <button class="btn ghost sm" data-viz-act="delete" data-id="${v.id}" data-title="${esc(v.title)}">Delete</button></div></td></tr>`).join('')}
      </tbody></table></div>
      <h2 class="sechead">Audit log</h2>
      <div class="tablewrap"><table class="admin"><thead><tr><th>When (UTC)</th><th>Who</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead><tbody>
      ${auditLog.items.length ? auditLog.items.map(a => `<tr><td>${esc(a.at)}</td><td>${a.actor ? `@${esc(a.actor)}` : '—'}</td><td>${esc(a.action)}</td><td class="wrap">${esc(a.target)}</td><td class="wrap">${esc(a.reason || '')}</td></tr>`).join('') : '<tr><td colspan="5">Nothing yet.</td></tr>'}
      </tbody></table></div>`);
    $$('[data-role-for]').forEach(s => (s.onchange = async () => {
      try { await api('PUT', `/api/admin/users/${s.dataset.roleFor}/role`, { role: s.value }); toast(`Role changed. Remember to update their GitHub team membership too.`); renderAdmin(); }
      catch (e) { toast(e.message); renderAdmin(); }
    }));
  } catch (e) { failed(e); }
}

/** Click handling for the admin page; returns true if it handled the click. */
export async function adminClick(t) {
  const act = t.closest('[data-viz-act]'), rm = t.closest('[data-remove-user]'), rs = t.closest('[data-restore-user]'), tool = t.closest('[data-admin-tool]');
  try {
    if (act) {
      const { vizAct: a, id } = act.dataset;
      if (a === 'delete') {
        const reason = await askReason(`Delete “${act.dataset.title}”?`, { confirmLabel: 'Delete permanently' });
        if (reason === null) return true;
        await api('DELETE', `/api/viz/${id}`);
      } else {
        const reason = ['hide', 'promote'].includes(a) ? await askReason(a === 'hide' ? 'Hide this visualization' : 'Promote to the main feed (bypasses review)') : '';
        if (reason === null) return true;
        await api('POST', `/api/admin/viz/${id}/${a}`, { reason });
      }
      document.dispatchEvent(new CustomEvent('loci:refresh-items'));
      toast('Done'); renderAdmin(); return true;
    }
    if (rm) {
      const reason = await askReason(`Remove @${rm.dataset.handle}’s account?`, { required: true, confirmLabel: 'Remove account' });
      if (reason === null) return true;
      await api('DELETE', `/api/admin/users/${rm.dataset.removeUser}`, { reason });
      document.dispatchEvent(new CustomEvent('loci:refresh-items'));
      toast('Account removed and their posts hidden'); renderAdmin(); return true;
    }
    if (rs) { await api('POST', `/api/admin/users/${rs.dataset.restoreUser}/restore`, {}); document.dispatchEvent(new CustomEvent('loci:refresh-items')); toast('Account restored'); renderAdmin(); return true; }
    if (tool) {
      const k = tool.dataset.adminTool;
      if (k === 'import') { const r = await api('POST', '/api/admin/import-registry'); toast(r.unchanged ? 'The registry has not changed' : `Imported ${r.imported?.length ?? 0}, updated ${r.updated?.length ?? 0}, hidden ${r.hidden?.length ?? 0}${r.errors?.length ? `, ${r.errors.length} failed the guard` : ''}`); document.dispatchEvent(new CustomEvent('loci:refresh-items')); }
      if (k === 'posts') { const r = await api('POST', '/api/admin/reload-posts'); toast(`${r.count} blog posts loaded`); }
      if (k === 'thumbs') await generateThumbs(tool);
      renderAdmin(); return true;
    }
  } catch (e) { toast(e.message); return true; }
  return false;
}

// The admin table lists everything, but someone else's Playground post is private even to an admin: no link, no thumbnail.
const viewable = v => v.status !== 'playground' || v.author.handle === state.me.handle;

async function generateThumbs(button) {
  const { items } = await get('/api/admin/viz');
  const jobs = [];
  for (const v of items.filter(v => !v.hidden && viewable(v))) for (const style of Object.keys(STYLE_PAL)) if (!v.thumbs[style]) jobs.push([v, style]);
  let done = 0;
  for (const [v, style] of jobs) {
    button.textContent = `Rendering thumbnails… ${done}/${jobs.length}`;
    try { await makeAndUploadThumb(v, style); } catch { /* skip */ }
    done++;
  }
  toast(`Rendered ${done} thumbnails`);
  document.dispatchEvent(new CustomEvent('loci:refresh-items'));
}
