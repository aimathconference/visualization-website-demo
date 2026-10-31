// Shared helpers: validation, serialization, rate limiting.

// Thumbnails are stored per style; the demo ships only the mockup's Night feed style.
export const STYLES = ['night'];
export const NEWSLETTER_LISTS = ['best-of-month', 'dev-blog', 'miscellany'];
export const LICENSES = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'GPL-3.0-or-later', 'MPL-2.0', 'CC0-1.0'];
export const AVATAR_KINDS = ['rose', 'liss', 'spiral', 'hypo', 'chords'];

const HANDLE_RE = /^[a-z0-9._-]{3,20}$/;
const GITHUB_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const RESERVED = new Set(['admin', 'administrator', 'root', 'system', 'loci', 'eigenreel', 'moderator', 'mod', 'staff', 'support',
  'help', 'api', 'me', 'null', 'undefined', 'anonymous', 'everyone', 'official', 'tailscale', 'github']);

export class InputError extends Error {}

export const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

export function cleanHandle(h) {
  h = String(h ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!HANDLE_RE.test(h)) throw new InputError('Handles are 3–20 characters: lowercase letters, numbers, dots, dashes and underscores.');
  if (RESERVED.has(h)) throw new InputError('That handle is reserved. Please pick another.');
  return h;
}

export function cleanText(s, max, label, { required = false } = {}) {
  s = String(s ?? '').trim();
  if (required && !s) throw new InputError(`${label} is required.`);
  if (s.length > max) throw new InputError(`${label} must be at most ${max} characters.`);
  return s;
}

export function cleanUrl(u) {
  u = String(u ?? '').trim();
  if (!u) return '';
  let url;
  try { url = new URL(u); } catch { throw new InputError('Homepage must be a full link starting with https:// or http://'); }
  if (!['http:', 'https:'].includes(url.protocol) || u.length > 200) throw new InputError('Homepage must be a link starting with https:// or http:// (at most 200 characters).');
  return url.href;
}

export function cleanGithub(g) {
  g = String(g ?? '').trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
  if (!g) return '';
  if (!GITHUB_RE.test(g)) throw new InputError("That doesn't look like a GitHub username.");
  return g;
}

export function cleanTags(tags) {
  if (!Array.isArray(tags)) tags = String(tags ?? '').split(',');
  const out = [...new Set(tags.map(t => String(t).trim().replace(/\s+/g, ' ')).filter(Boolean))];
  if (out.length > 4) throw new InputError('Use at most 4 tags.');
  if (out.some(t => t.length > 30)) throw new InputError('Tags must be at most 30 characters each.');
  return out;
}

export function cleanAvatar(a, tailscalePic) {
  if (!a || typeof a !== 'object') throw new InputError('Pick an avatar.');
  if (a.tailscale) {
    if (!tailscalePic || !/^https:\/\//.test(tailscalePic)) throw new InputError('Your Tailscale account has no profile picture to use.');
    return { tailscale: true, url: tailscalePic };
  }
  if (!AVATAR_KINDS.includes(a.kind) || !HEX_RE.test(a.bg || '') || !HEX_RE.test(a.fg || '')) throw new InputError('Invalid avatar.');
  const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));
  const out = { kind: a.kind, bg: a.bg.toLowerCase(), fg: a.fg.toLowerCase() };
  if (a.kind === 'rose' || a.kind === 'chords') out.k = int(a.k, 2, 9);
  if (a.kind === 'liss') { out.a = int(a.a, 1, 7); out.b = int(a.b, 1, 7); }
  if (a.kind === 'spiral') out.turns = int(a.turns, 2, 8);
  if (a.kind === 'hypo') { out.R = int(a.R, 3, 9); out.r = int(a.r, 1, out.R - 1); out.d = int(a.d, 1, 9); }
  return out;
}

/** Customize settings saved with a remix. Unknown keys are dropped. */
export function cleanSettings(s) {
  if (!s || typeof s !== 'object') throw new InputError('Missing settings.');
  const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : undefined);
  const out = {
    palette: typeof s.palette === 'string' && s.palette.length <= 20 ? s.palette : 'style',
    font: typeof s.font === 'string' && s.font.length <= 20 ? s.font : 'style',
    lw: num(s.lw, 0.5, 4) ?? 1.5,
    speed: num(s.speed, 0, 3) ?? 1,
    labels: s.labels !== false,
  };
  const p = num(s.param, -1e6, 1e6);
  if (p !== undefined) out.param = p;
  return out;
}

export function slugify(title) {
  const base = String(title).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'visualization';
  return base;
}

export function uniqueSlug(db, title) {
  const base = slugify(title), has = db.prepare('SELECT 1 FROM viz WHERE slug = ?');
  if (!has.get(base)) return base;
  for (let i = 2; ; i++) if (!has.get(`${base}-${i}`)) return `${base}-${i}`;
}

// A Playground post is private to its author, admins included (they moderate through /api/admin/viz). Queries that list
// visualizations AND in MINE_IF_PLAYGROUND; a route holding one row asks isPrivateTo(row, viewer's id).
export const MINE_IF_PLAYGROUND = "(v.status <> 'playground' OR v.author_id = @me)";
export const isPrivateTo = (row, me) => row.status === 'playground' && row.author_id !== me;

// Every visualization query goes through this so the client always gets the same shape. @me = viewer's user id (0 if none).
export const VIZ_SELECT = `
SELECT v.*, u.handle AS author_handle, u.avatar_json AS author_avatar, u.github AS author_github, u.placeholder AS author_placeholder,
  (SELECT COUNT(*) FROM likes l WHERE l.viz_id = v.id) AS like_count,
  EXISTS (SELECT 1 FROM likes l WHERE l.viz_id = v.id AND l.user_id = @me) AS liked,
  p.slug AS parent_slug, p.title AS parent_title, p.explanation_md AS parent_explanation, p.colors_json AS parent_colors, pu.handle AS parent_handle
FROM viz v
JOIN users u ON u.id = v.author_id
LEFT JOIN viz p ON p.id = v.parent_id
LEFT JOIN users pu ON pu.id = p.author_id`;

export function toClientViz(r) {
  return {
    id: r.id,
    slug: r.slug,
    kind: r.kind,
    status: r.status,
    source: r.source,
    title: r.title,
    hook: r.hook,
    tags: parseJson(r.tags_json, []),
    license: r.license,
    author: { handle: r.author_handle, avatar: parseJson(r.author_avatar, null), github: r.author_github || '' },
    parent: r.parent_id ? { id: r.parent_id, slug: r.parent_slug, title: r.parent_title, handle: r.parent_handle } : null,
    runId: r.kind === 'remix' ? r.parent_id : r.id,
    settings: parseJson(r.settings_json, null),
    colors: parseJson(r.colors_json ?? r.parent_colors, null),
    explanation: r.explanation_md || r.parent_explanation || '',
    thumbs: parseJson(r.thumbs_json, {}),
    likes: r.like_count,
    liked: !!r.liked,
    pinned: !!r.pinned,
    hidden: !!r.hidden,
    createdAt: r.created_at,
    registryPr: r.registry_pr,
  };
}

export function toClientUser(u, { self = false } = {}) {
  if (!u) return null;
  const out = {
    handle: u.handle,
    avatar: parseJson(u.avatar_json, null),
    bio: u.bio || '',
    homepage: u.homepage || '',
    github: u.github || '',
    role: u.role,
    placeholder: !!u.placeholder,
    joined: u.created_at,
    removed: !!u.removed_at,
  };
  if (self) out.newsletter = parseJson(u.newsletter_json, { lists: [] });
  return out;
}

/** Sliding-window limiter kept in memory: allow(key, max, windowMs) → boolean. */
export function rateLimiter() {
  const hits = new Map();
  return (key, max, windowMs) => {
    const now = Date.now(), recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    const ok = recent.length < max;
    if (ok) recent.push(now);
    hits.set(key, recent);
    return ok;
  };
}
