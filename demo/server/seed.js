// Loads the mockup's six contributors and visualizations as reviewed seed content.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guard } from './guard.js';
import { bumpSeq } from './db.js';

const SEEDS = join(dirname(fileURLToPath(import.meta.url)), 'seeds');

/** Inserts seed users and visualizations if the database has none. Returns true if it seeded. */
export function seedIfEmpty(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM viz').get().n > 0) return false;
  const { users } = JSON.parse(readFileSync(join(SEEDS, 'users.json'), 'utf8'));
  const addUser = db.prepare(`INSERT INTO users (ts_login, handle, avatar_json, bio, homepage, github, placeholder)
    VALUES (?, ?, ?, ?, ?, ?, 1)`);
  const addViz = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, title, hook, tags_json, license,
      code, code_guarded, explanation_md, created_at, updated_seq)
    VALUES (?, ?, 'code', 'reviewed', 'seed', ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?)`);
  db.transaction(() => {
    let minutesAgo = 0;
    for (const u of users) {
      const { lastInsertRowid: userId } = addUser.run(`seed:${u.handle}`, u.handle, JSON.stringify(u.avatar), u.bio, u.homepage, u.github);
      for (const slug of u.viz) {
        const code = readFileSync(join(SEEDS, `${slug}.js`), 'utf8');
        const explanation = readFileSync(join(SEEDS, `${slug}.md`), 'utf8');
        const { code: guarded, meta } = guard(code);
        addViz.run(slug, userId, meta.title, meta.hook || '', JSON.stringify(meta.tags || []), meta.license || 'MIT',
          code, guarded, explanation, `-${minutesAgo++} minutes`, bumpSeq(db));
      }
    }
  })();
  return true;
}
