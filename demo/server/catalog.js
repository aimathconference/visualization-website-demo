// The Loci front end's reviewed catalog lives in catalog.js at the repository root, a browser script. Likes need a
// viz row per piece, so at startup every piece that has a share page (v/<id>.html, generated from the catalog by
// scripts/gen-share-pages.mjs) gets one if it has none yet: reviewed, source 'seed', no server-side code (the
// front end runs its own modules in its worker sandbox). Authors without a profile become placeholder users,
// like the seed authors. Existing rows (the six seeds among them) are left exactly as they are.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { bumpSeq } from './db.js';

const unescape = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Reads v/*.html: [{slug, title, hook, handle}] (handle without the @, or null). */
export function readShareStubs(dir) {
  const vdir = join(dir, 'v');
  if (!existsSync(vdir)) return [];
  return readdirSync(vdir).filter(f => /^[a-z0-9-]+\.html$/.test(f)).sort().map(f => {
    const html = readFileSync(join(vdir, f), 'utf8');
    const meta = p => { const m = html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)); return m ? unescape(m[1]) : ''; };
    const by = html.match(/, by @([a-z0-9._-]+), on Loci/i);
    return { slug: f.slice(0, -5), title: meta('og:title'), hook: meta('og:description'), handle: by ? by[1].toLowerCase() : null };
  }).filter(p => p.title);
}

/** Ensures a viz row for each catalog piece. Returns the slugs it added. */
export function syncCatalog(db, dir) {
  const pieces = readShareStubs(dir);
  const hasViz = db.prepare('SELECT 1 FROM viz WHERE slug = ?');
  const userByHandle = db.prepare('SELECT id FROM users WHERE handle = ?');
  const addUser = db.prepare('INSERT INTO users (ts_login, handle, placeholder) VALUES (?, ?, 1)');
  const addViz = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, title, hook, updated_seq)
    VALUES (?, ?, 'code', 'reviewed', 'seed', ?, ?, ?)`);
  const added = [];
  db.transaction(() => {
    for (const p of pieces) {
      if (hasViz.get(p.slug)) continue;
      const handle = p.handle && /^[a-z0-9._-]{3,20}$/.test(p.handle) ? p.handle : 'loci-editors';
      const author = userByHandle.get(handle)?.id ?? addUser.run(`seed:${handle}`, handle).lastInsertRowid;
      addViz.run(p.slug, author, p.title.slice(0, 80), p.hook.slice(0, 160), bumpSeq(db));
      added.push(p.slug);
    }
  })();
  return added;
}
