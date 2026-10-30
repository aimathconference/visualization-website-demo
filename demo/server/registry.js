// Imports visualizations approved in the practice registry (DEMO_PLAN.md section 8).
// Polls the registry branch through the GitHub API; when it moves, every entries/<slug>.js (plus optional
// entries/<slug>.md explanation) is guarded and stored as a reviewed visualization. Entries deleted from
// the registry are hidden. Authorship comes from the pull request that last changed the file.

import { bumpSeq, kvGet, kvSet } from './db.js';
import { guard } from './guard.js';
import { LICENSES, cleanTags } from './lib.js';

const ENTRY_RE = /^entries\/([a-z0-9][a-z0-9-]{0,47})\.(js|md)$/;
const AVATAR_COLORS = [['#2b1d4f', '#ffd166'], ['#0f4c5c', '#e9f5f2'], ['#14213d', '#fca311'], ['#2a9d8f', '#ffffff'], ['#e63946', '#f1faee'], ['#f2e8cf', '#bc4749']];

export function createImporter({ db, config, fetch = globalThis.fetch, log = console }) {
  const repo = config.registryRepo, branch = config.registryBranch;
  const api = async (path, { raw = false, etag } = {}) => {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'loci-demo' };
    if (config.githubToken) headers.Authorization = `Bearer ${config.githubToken}`;
    if (etag) headers['If-None-Match'] = etag;
    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (res.status === 304) return { notModified: true };
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
    return { data: raw ? await res.text() : await res.json(), etag: res.headers.get('etag') };
  };

  const byPath = db.prepare("SELECT * FROM viz WHERE source = 'registry' AND registry_path = ?");
  const registryRows = db.prepare("SELECT id, registry_path, hidden FROM viz WHERE source = 'registry'");
  const userByGithub = db.prepare("SELECT id FROM users WHERE lower(github) = lower(?) AND placeholder <> 1 AND removed_at IS NULL");
  const handleTaken = db.prepare('SELECT 1 FROM users WHERE handle = ?');
  const addPlaceholder = db.prepare('INSERT INTO users (ts_login, handle, avatar_json, github, placeholder) VALUES (?, ?, ?, ?, 2)');
  const slugTaken = db.prepare('SELECT 1 FROM viz WHERE slug = ?');
  const insert = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, registry_path, registry_sha, registry_pr, title, hook,
      tags_json, license, code, code_guarded, explanation_md, updated_seq)
    VALUES (@slug, @author, 'code', 'reviewed', 'registry', @path, @sha, @pr, @title, @hook, @tags, @license, @code, @guarded, @explanation, @seq)`);
  const update = db.prepare(`UPDATE viz SET registry_sha = @sha, registry_pr = COALESCE(@pr, registry_pr), title = @title, hook = @hook,
      tags_json = @tags, license = @license, code = @code, code_guarded = @guarded, explanation_md = @explanation, hidden = 0, updated_seq = @seq
    WHERE id = @id`);
  const hide = db.prepare('UPDATE viz SET hidden = 1, updated_seq = ? WHERE id = ?');

  function authorFor(login) {
    if (!login) login = 'unknown';
    const existing = userByGithub.get(login);
    if (existing) return existing.id;
    const placeholder = db.prepare("SELECT id FROM users WHERE ts_login = ?").get(`github:${login.toLowerCase()}`);
    if (placeholder) return placeholder.id;
    let handle = login.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 17);
    if (handle.length < 3) handle = `gh-${handle}`;
    for (let i = 2; handleTaken.get(handle); i++) handle = `${handle.replace(/-\d+$/, '')}-${i}`;
    const [bg, fg] = AVATAR_COLORS[[...login].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATAR_COLORS.length];
    const avatar = { kind: 'rose', k: 3 + (login.length % 5), bg, fg };
    return addPlaceholder.run(`github:${login.toLowerCase()}`, handle, JSON.stringify(avatar), login).lastInsertRowid;
  }

  async function provenance(path) {
    const { data: commits } = await api(`/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=1`);
    const commit = commits[0];
    if (!commit) return { login: null, pr: null };
    let pr = null, login = commit.author?.login ?? null;
    try {
      const { data: pulls } = await api(`/repos/${repo}/commits/${commit.sha}/pulls`);
      if (pulls[0]) { pr = pulls[0].number; login = pulls[0].user?.login ?? login; }
    } catch { /* fall back to the commit author */ }
    return { login, pr };
  }

  let running = false;
  async function run({ force = false } = {}) {
    if (!repo) return { skipped: 'REGISTRY_REPO is not set' };
    if (running) return { skipped: 'already running' };
    running = true;
    const result = { imported: [], updated: [], hidden: [], errors: [] };
    try {
      const head = await api(`/repos/${repo}/commits/${encodeURIComponent(branch)}`, { etag: force ? undefined : kvGet(db, 'registry_etag') });
      if (head.notModified) return { unchanged: true };
      const sha = head.data.sha;
      if (!force && sha === kvGet(db, 'registry_head')) { kvSet(db, 'registry_etag', head.etag || ''); return { unchanged: true }; }

      const { data: tree } = await api(`/repos/${repo}/git/trees/${sha}?recursive=1`);
      const entries = new Map();
      for (const item of tree.tree || []) {
        const m = item.type === 'blob' && item.path.match(ENTRY_RE);
        if (!m) continue;
        const e = entries.get(m[1]) || { slug: m[1] };
        e[m[2]] = item;
        entries.set(m[1], e);
      }

      for (const e of entries.values()) {
        if (!e.js) continue;
        const path = e.js.path, key = `${e.js.sha}:${e.md?.sha ?? ''}`, existing = byPath.get(path);
        if (existing && existing.registry_sha === key && !existing.hidden) continue;
        try {
          const blob = async item => Buffer.from((await api(`/repos/${repo}/git/blobs/${item.sha}`)).data.content, 'base64').toString('utf8');
          const code = await blob(e.js), explanation = e.md ? (await blob(e.md)).slice(0, 10_000) : '';
          const { code: guarded, meta } = guard(code);
          const { login, pr } = await provenance(path);
          let tags = [];
          try { tags = cleanTags(meta.tags || []); } catch { tags = (meta.tags || []).slice(0, 4).map(t => String(t).slice(0, 30)); }
          const rec = {
            sha: key, pr, code, guarded, explanation,
            title: String(meta.title || e.slug).slice(0, 80), hook: String(meta.hook || '').slice(0, 160),
            tags: JSON.stringify(tags), license: LICENSES.includes(meta.license) ? meta.license : (meta.license ? String(meta.license).slice(0, 40) : 'MIT'),
          };
          db.transaction(() => {
            if (existing) { update.run({ ...rec, id: existing.id, seq: bumpSeq(db) }); result.updated.push(e.slug); }
            else {
              let slug = e.slug;
              for (let i = 2; slugTaken.get(slug); i++) slug = `${e.slug}-${i}`;
              insert.run({ ...rec, slug, path, author: authorFor(login), seq: bumpSeq(db) });
              result.imported.push(slug);
            }
          })();
        } catch (err) {
          result.errors.push({ entry: path, error: err.message });
        }
      }

      const present = new Set([...entries.values()].filter(e => e.js).map(e => e.js.path));
      for (const row of registryRows.all()) {
        if (!present.has(row.registry_path) && !row.hidden) { hide.run(bumpSeq(db), row.id); result.hidden.push(row.registry_path); }
      }
      kvSet(db, 'registry_head', sha);
      kvSet(db, 'registry_etag', head.etag || '');
      if (result.imported.length || result.updated.length || result.hidden.length || result.errors.length) log.info('[registry]', JSON.stringify(result));
      return result;
    } finally {
      running = false;
    }
  }

  let timer = null;
  return {
    run,
    start() {
      if (!repo || timer) return;
      // Unauthenticated GitHub API calls are limited to 60 an hour, so poll less often without a token.
      const seconds = Math.max(config.githubToken ? 30 : 300, config.registryPollSeconds);
      const tick = () => run().catch(err => log.warn('[registry]', err.message));
      tick();
      timer = setInterval(tick, seconds * 1000);
      timer.unref?.();
    },
    stop() { clearInterval(timer); timer = null; },
  };
}
