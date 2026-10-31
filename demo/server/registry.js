// Imports visualizations approved in the practice registry (DEMO_PLAN.md section 8).
// Polls the registry branch through the GitHub API; when it moves, every entry is stored as a reviewed
// visualization (merged = two approvals). Entries deleted from the registry are hidden. Authorship comes from
// the pull request that last changed the entry.
//  - a single file entries/<slug>.js (plus optional entries/<slug>.md explanation) is guarded, as before;
//  - a package folder entries/<slug>/ (loci.json, its .js or .wasm entries, explanation.md, LICENSE; the Loci
//    format) is stored as a viz row with no code plus a viz_package row holding the files, {name: text}
//    (binary files as a data: URL). The Loci front end runs it in its worker sandbox with its manifest, like a
//    Playground post. The registry's check job has already run the static gate on it; this only re-checks shape.
//    A package with the slug of a catalog piece's row takes that row over, so its likes, links and author stay.

import { bumpSeq, kvGet, kvSet } from './db.js';
import { guard } from './guard.js';
import { LICENSES, cleanTags } from './lib.js';
import { cleanPackage } from './routes/loci.js';

const ENTRY_RE = /^entries\/([a-z0-9][a-z0-9-]{0,47})\.(js|md)$/;
const PKG_RE = /^entries\/([a-z0-9][a-z0-9-]{0,47})\/([^/]+)$/;
const BINARY = /\.wasm$/;
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
  const seedBySlug = db.prepare("SELECT id FROM viz WHERE slug = ? AND source = 'seed'");
  const adoptSeed = db.prepare("UPDATE viz SET source = 'registry', registry_path = ? WHERE id = ?");
  const insert = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, registry_path, registry_sha, registry_pr, title, hook,
      tags_json, license, code, code_guarded, colors_json, explanation_md, updated_seq)
    VALUES (@slug, @author, 'code', 'reviewed', 'registry', @path, @sha, @pr, @title, @hook, @tags, @license, @code, @guarded, @colors, @explanation, @seq)`);
  const update = db.prepare(`UPDATE viz SET registry_sha = @sha, registry_pr = COALESCE(@pr, registry_pr), title = @title, hook = @hook,
      tags_json = @tags, license = @license, code = @code, code_guarded = @guarded, colors_json = @colors, explanation_md = @explanation, hidden = 0, updated_seq = @seq
    WHERE id = @id`);
  const hide = db.prepare('UPDATE viz SET hidden = 1, updated_seq = ? WHERE id = ?');
  const insertPkgViz = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, registry_path, registry_sha, registry_pr, title, hook,
      tags_json, license, code, code_guarded, colors_json, explanation_md, updated_seq)
    VALUES (@slug, @author, 'code', 'reviewed', 'registry', @path, @sha, @pr, @title, @hook, @tags, @license, NULL, NULL, @colors, @explanation, @seq)`);
  const updatePkgViz = db.prepare(`UPDATE viz SET registry_sha = @sha, registry_pr = COALESCE(@pr, registry_pr), title = @title, hook = @hook,
      tags_json = @tags, license = @license, code = NULL, code_guarded = NULL, colors_json = @colors, explanation_md = @explanation, hidden = 0, updated_seq = @seq
    WHERE id = @id`);
  const putPkg = db.prepare(`INSERT INTO viz_package (viz_id, files_json) VALUES (?, ?)
    ON CONFLICT(viz_id) DO UPDATE SET files_json = excluded.files_json`);

  // A package's {main, secondary, bg?, fg?, ...} colors as stored in colors_json, or null when absent or malformed.
  function packageColors(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    const ok = Object.entries(c).every(([k, v]) => /^[A-Za-z_][A-Za-z0-9_]{0,30}$/.test(k) && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v));
    return ok && c.main && c.secondary ? JSON.stringify(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.toLowerCase()]))) : null;
  }

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
      const entries = new Map(), packages = new Map();
      for (const item of tree.tree || []) {
        if (item.type !== 'blob') continue;
        const p = item.path.match(PKG_RE);
        if (p) { const k = packages.get(p[1]) || { slug: p[1], files: [] }; k.files.push({ name: p[2], ...item }); packages.set(p[1], k); continue; }
        const m = item.path.match(ENTRY_RE);
        if (!m) continue;
        const e = entries.get(m[1]) || { slug: m[1] };
        e[m[2]] = item;
        entries.set(m[1], e);
      }
      const blob = async item => Buffer.from((await api(`/repos/${repo}/git/blobs/${item.sha}`)).data.content, 'base64');

      for (const e of entries.values()) {
        if (!e.js) continue;
        const path = e.js.path, key = `${e.js.sha}:${e.md?.sha ?? ''}`, existing = byPath.get(path);
        if (existing && existing.registry_sha === key && !existing.hidden) continue;
        try {
          const code = (await blob(e.js)).toString('utf8'), explanation = e.md ? (await blob(e.md)).toString('utf8').slice(0, 10_000) : '';
          const { code: guarded, meta } = guard(code);
          const { login, pr } = await provenance(path);
          let tags = [];
          try { tags = cleanTags(meta.tags || []); } catch { tags = (meta.tags || []).slice(0, 4).map(t => String(t).slice(0, 30)); }
          const rec = {
            sha: key, pr, code, guarded, explanation, colors: meta.colors ? JSON.stringify(meta.colors) : null,
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

      for (const k of packages.values()) {
        const path = `entries/${k.slug}/`, key = k.files.map(f => `${f.name}=${f.sha}`).sort().join(','), existing = byPath.get(path);
        if (existing && existing.registry_sha === key && !existing.hidden) continue;
        try {
          if (entries.has(k.slug)) throw new Error(`entries/${k.slug}.js and entries/${k.slug}/ both exist; the folder is skipped`);
          if (!k.files.some(f => f.name === 'loci.json')) throw new Error('a package folder needs a loci.json');
          const raw = {};
          for (const f of k.files) {
            const b = await blob(f);
            raw[f.name] = BINARY.test(f.name) ? `data:application/wasm;base64,${b.toString('base64')}` : b.toString('utf8');
          }
          // the same shape rules as a Playground post; a WebAssembly package has no .js, so its module stands in
          const shape = { ...raw };
          for (const n of Object.keys(shape)) if (BINARY.test(n)) { delete shape[n]; shape[n.replace(BINARY, '.js')] = ''; }
          const { loci } = cleanPackage(shape);
          if (loci.id !== k.slug) throw new Error(`loci.json "id" is ${JSON.stringify(loci.id ?? null)}, not "${k.slug}"`);
          const { login, pr } = await provenance(path.slice(0, -1));
          let tags = [];
          try { tags = cleanTags(loci.tags || []); } catch { tags = (Array.isArray(loci.tags) ? loci.tags : []).slice(0, 6).map(t => String(t).slice(0, 30)); }
          const rec = {
            sha: key, pr, explanation: String(raw['explanation.md'] || '').slice(0, 20_000),
            title: String(loci.title || k.slug).slice(0, 80), hook: String(loci.hook || '').slice(0, 160),
            tags: JSON.stringify(tags), license: String(loci.license || 'MIT').slice(0, 40),
            // loci.json "colors" is the package form of a single file's COLORS block (demo/github/README.md)
            colors: packageColors(loci.colors),
          };
          db.transaction(() => {
            let id;
            const seed = existing ? null : seedBySlug.get(k.slug);
            if (existing) { updatePkgViz.run({ ...rec, id: existing.id, seq: bumpSeq(db) }); id = existing.id; result.updated.push(k.slug); }
            else if (seed) { adoptSeed.run(path, seed.id); updatePkgViz.run({ ...rec, id: seed.id, seq: bumpSeq(db) }); id = seed.id; result.imported.push(k.slug); }
            else {
              let slug = k.slug;
              for (let i = 2; slugTaken.get(slug); i++) slug = `${k.slug}-${i}`;
              id = insertPkgViz.run({ ...rec, slug, path, author: authorFor(login), seq: bumpSeq(db) }).lastInsertRowid;
              result.imported.push(slug);
            }
            putPkg.run(id, JSON.stringify(raw));
          })();
        } catch (err) {
          result.errors.push({ entry: path, error: err.message });
        }
      }

      const present = new Set([...[...entries.values()].filter(e => e.js).map(e => e.js.path), ...[...packages.keys()].map(s => `entries/${s}/`)]);
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
