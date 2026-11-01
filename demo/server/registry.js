// Imports visualizations approved in the practice registry (DEMO_PLAN.md section 8).
// Polls the registry branch through the GitHub API; when it moves, every entry is stored as a reviewed
// visualization (merged = two approvals). Entries deleted from the registry are hidden.
// An entry is the submission format of docs/submission-spec-slop.md: entries/<slug>.js (COLORS and a literal
// `export default {…}`), its explanation entries/<slug>.md, and optionally entries/<slug>.wasm (sources/<slug>/ is
// for reviewers and is not imported). The registry's check has already run the static gate; this reads the file
// with the same reader (spec.js at the front end's root) for its metadata and colors, and refuses one it cannot
// read. The code is stored as written: the EigenReel front end runs it in its worker sandbox.
// Authorship (spec section 11): the account that opened the pull request that first added the entry, by numeric
// GitHub id. Later imports never change the author. An entry with the slug of a catalog piece's row (or of an
// older package folder entries/<slug>/) takes that row over, so its likes, links and author stay.

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { bumpSeq, kvGet, kvSet, ROOT } from './db.js';
import { cleanTags } from './lib.js';

const ENTRY_RE = /^entries\/([a-z0-9][a-z0-9-]{0,39})\.(js|md|wasm)$/;
const AVATAR_COLORS = [['#2b1d4f', '#ffd166'], ['#0f4c5c', '#e9f5f2'], ['#14213d', '#fca311'], ['#2a9d8f', '#ffffff'], ['#e63946', '#f1faee'], ['#f2e8cf', '#bc4749']];

/** The shared static reader (spec.js), from the front end's root, or the repository root when that has none. */
export function loadSpec(frontendDir) {
  const require = createRequire(import.meta.url);
  const file = [frontendDir && join(frontendDir, 'spec.js'), join(ROOT, '..', 'spec.js')].find(f => f && existsSync(f));
  if (!file) throw new Error('spec.js not found (set FRONTEND_DIR to the EigenReel front end)');
  return require(file);
}

export function createImporter({ db, config, fetch = globalThis.fetch, log = console }) {
  const repo = config.registryRepo, branch = config.registryBranch;
  let spec = null;
  const api = async (path, { raw = false, etag } = {}) => {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'eigenreel-demo' };
    if (config.githubToken) headers.Authorization = `Bearer ${config.githubToken}`;
    if (etag) headers['If-None-Match'] = etag;
    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (res.status === 304) return { notModified: true };
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
    return { data: raw ? await res.text() : await res.json(), etag: res.headers.get('etag') };
  };

  const byPath = db.prepare("SELECT * FROM viz WHERE source = 'registry' AND registry_path = ?");
  const registryRows = db.prepare("SELECT id, registry_path, hidden FROM viz WHERE source = 'registry'");
  const userById = db.prepare('SELECT id FROM users WHERE github_id = ? AND removed_at IS NULL ORDER BY placeholder, id LIMIT 1');
  const userByGithub = db.prepare(`SELECT id, github_id FROM users WHERE lower(github) = lower(?) AND placeholder <> 1 AND removed_at IS NULL
    ORDER BY placeholder LIMIT 1`);
  const setGithubId = db.prepare('UPDATE users SET github_id = ? WHERE id = ?');
  const handleTaken = db.prepare('SELECT 1 FROM users WHERE handle = ?');
  const userByLogin = db.prepare('SELECT id FROM users WHERE ts_login = ?');
  const githubTaken = db.prepare("SELECT 1 FROM users WHERE lower(github) = lower(?) AND github <> ''");
  const addPlaceholder = db.prepare('INSERT INTO users (ts_login, handle, avatar_json, github, github_id, placeholder) VALUES (?, ?, ?, ?, ?, 2)');
  const slugTaken = db.prepare('SELECT 1 FROM viz WHERE slug = ?');
  const rowToAdopt = db.prepare("SELECT id FROM viz WHERE slug = ? AND (source = 'seed' OR (source = 'registry' AND registry_path = ?))");
  const adoptRow = db.prepare("UPDATE viz SET source = 'registry', registry_path = ? WHERE id = ?");
  const dropPackage = db.prepare('DELETE FROM viz_package WHERE viz_id = ?');
  const insert = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, registry_path, registry_sha, registry_pr, title, hook,
      tags_json, license, code, code_guarded, colors_json, meta_json, wasm_b64, explanation_md, updated_seq)
    VALUES (@slug, @author, 'code', 'reviewed', 'registry', @path, @sha, @pr, @title, @hook, @tags, @license, @code, NULL, @colors, @meta, @wasm, @explanation, @seq)`);
  const update = db.prepare(`UPDATE viz SET registry_sha = @sha, registry_pr = COALESCE(@pr, registry_pr), title = @title, hook = @hook,
      tags_json = @tags, license = @license, code = @code, code_guarded = NULL, colors_json = @colors, meta_json = @meta, wasm_b64 = @wasm,
      explanation_md = @explanation, thumbs_json = '{}', hidden = 0, updated_seq = @seq
    WHERE id = @id`);
  const hide = db.prepare('UPDATE viz SET hidden = 1, updated_seq = ? WHERE id = ?');

  /** The site user for a GitHub account: by numeric id, else by login (recording the id), else a placeholder. */
  function authorFor({ login, id }) {
    if (id != null) {
      const byId = userById.get(id);
      if (byId) return byId.id;
    }
    if (login) {
      const byLogin = userByGithub.get(login);
      // a login whose profile already records another id belongs to someone else now (logins can be renamed and reused)
      if (byLogin && (id == null || byLogin.github_id == null || byLogin.github_id === id)) {
        if (id != null && byLogin.github_id == null) setGithubId.run(id, byLogin.id);
        return byLogin.id;
      }
    }
    if (id == null && !login) login = 'unknown';
    const name = login || `user-${id}`;
    const tsLogin = id != null ? `github-id:${id}` : `github:${name.toLowerCase()}`;
    const old = userByLogin.get(tsLogin);
    if (old) return old.id;
    let handle = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 17);
    if (handle.length < 3) handle = `gh-${handle}`;
    for (let i = 2; handleTaken.get(handle); i++) handle = `${handle.replace(/-\d+$/, '')}-${i}`;
    const [bg, fg] = AVATAR_COLORS[[...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATAR_COLORS.length];
    const avatar = { kind: 'rose', k: 3 + (name.length % 5), bg, fg };
    // the login is unique across profiles; when another profile holds it, the placeholder goes without
    const github = login && !githubTaken.get(login) ? login : null;
    return addPlaceholder.run(tsLogin, handle, JSON.stringify(avatar), github, id ?? null).lastInsertRowid;
  }

  // The pull request that last changed the entry, and its author ({login, id}); the commit author when there is none.
  async function provenance(path) {
    const { data: commits } = await api(`/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=1`);
    const commit = commits[0];
    if (!commit) return { login: null, id: null, pr: null };
    let pr = null, login = commit.author?.login ?? null, id = commit.author?.id ?? null;
    try {
      const { data: pulls } = await api(`/repos/${repo}/commits/${commit.sha}/pulls`);
      if (pulls[0]) { pr = pulls[0].number; if (pulls[0].user) { login = pulls[0].user.login ?? null; id = pulls[0].user.id ?? null; } }
    } catch { /* fall back to the commit author */ }
    return { login, id: Number.isSafeInteger(id) ? id : null, pr };
  }

  let running = false;
  async function run({ force = false } = {}) {
    if (!repo) return { skipped: 'REGISTRY_REPO is not set' };
    if (running) return { skipped: 'already running' };
    running = true;
    const result = { imported: [], updated: [], hidden: [], errors: [] };
    try {
      spec ??= loadSpec(config.frontendDir);
      const head = await api(`/repos/${repo}/commits/${encodeURIComponent(branch)}`, { etag: force ? undefined : kvGet(db, 'registry_etag') });
      if (head.notModified) return { unchanged: true };
      const sha = head.data.sha;
      if (!force && sha === kvGet(db, 'registry_head')) { kvSet(db, 'registry_etag', head.etag || ''); return { unchanged: true }; }

      const { data: tree } = await api(`/repos/${repo}/git/trees/${sha}?recursive=1`);
      const entries = new Map();
      for (const item of tree.tree || []) {
        if (item.type !== 'blob') continue;
        const m = item.path.match(ENTRY_RE);
        if (!m) continue;
        const e = entries.get(m[1]) || { slug: m[1] };
        e[m[2]] = item;
        entries.set(m[1], e);
      }
      const blob = async item => Buffer.from((await api(`/repos/${repo}/git/blobs/${item.sha}`)).data.content, 'base64');

      for (const e of entries.values()) {
        if (!e.js) continue;
        const path = e.js.path, key = `${e.js.sha}:${e.md?.sha ?? ''}:${e.wasm?.sha ?? ''}`, existing = byPath.get(path);
        if (existing && existing.registry_sha === key && !existing.hidden) continue;
        try {
          if (!e.md) throw new Error(`entries/${e.slug}.md is missing: every entry needs its explanation`);
          if (e.js.size > spec.LIMITS.js) throw new Error(`entries/${e.slug}.js is over ${spec.LIMITS.js / 1024} KB`);
          if (e.wasm?.size > spec.LIMITS.wasm) throw new Error(`entries/${e.slug}.wasm is over ${spec.LIMITS.wasm / 1024 / 1024} MB`);
          const code = (await blob(e.js)).toString('utf8');
          const read = spec.read(code);
          if (!read.ok) {
            const first = read.errors[0];
            throw new Error(`entries/${e.slug}.js cannot be read: ${first ? `${first.line ? `line ${first.line}: ` : ''}${first.message}` : 'unknown error'}`
              + (read.errors.length > 1 ? ` (and ${read.errors.length - 1} more)` : ''));
          }
          const meta = read.meta;
          const explanation = (await blob(e.md)).toString('utf8').slice(0, spec.LIMITS.md);
          const wasm = e.wasm ? (await blob(e.wasm)).toString('base64') : null;
          const { login, id: githubId, pr } = await provenance(path);
          let tags = [];
          try { tags = cleanTags(Array.isArray(meta.tags) ? meta.tags : []); } catch { tags = (Array.isArray(meta.tags) ? meta.tags : []).slice(0, 4).map(t => String(t).slice(0, 30)); }
          const rec = {
            sha: key, pr, code, explanation, wasm,
            colors: read.colors ? JSON.stringify(read.colors) : null, meta: JSON.stringify(meta),
            title: String(meta.title || e.slug).slice(0, 60), hook: String(meta.hook || '').slice(0, 160),
            tags: JSON.stringify(tags), license: String(meta.license || 'MIT').slice(0, 40),
          };
          db.transaction(() => {
            // the first import's author stays the author: later changes come from that account (spec section 11)
            const adopted = existing ? null : rowToAdopt.get(e.slug, `entries/${e.slug}/`);
            if (existing) { update.run({ ...rec, id: existing.id, seq: bumpSeq(db) }); result.updated.push(e.slug); }
            else if (adopted) {
              adoptRow.run(path, adopted.id); dropPackage.run(adopted.id);
              update.run({ ...rec, id: adopted.id, seq: bumpSeq(db) }); result.imported.push(e.slug);
            } else {
              let slug = e.slug;
              for (let i = 2; slugTaken.get(slug); i++) slug = `${e.slug}-${i}`;
              insert.run({ ...rec, slug, path, author: authorFor({ login, id: githubId }), seq: bumpSeq(db) });
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
