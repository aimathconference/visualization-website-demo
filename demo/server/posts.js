// Blog posts are Markdown files in content/blog/, added by pull request (DEMO_PLAN.md section 8).
// Front matter: title, date (YYYY-MM-DD), authors (one or more comma-separated handles), byline (an optional note shown
// after their names), read, excerpt, viz (comma-separated slugs).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanHandle } from './lib.js';

const FIELDS = ['title', 'date', 'authors', 'byline', 'read', 'excerpt', 'viz'];

export function parsePost(slug, text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${slug}.md: missing front matter`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim(), value = line.slice(i + 1).trim();
    if (FIELDS.includes(key)) meta[key] = value;
  }
  if (!meta.title || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date || '')) throw new Error(`${slug}.md: needs a title and a date like 2026-10-28`);
  const authors = [...new Set((meta.authors || '').split(',').map(s => s.trim()).filter(Boolean).map(cleanHandle))];
  if (!authors.length) throw new Error(`${slug}.md: needs at least one author, like authors: calc-commons, sofia.opt`);
  return {
    slug,
    title: meta.title,
    date: meta.date,
    authors,
    byline: meta.byline || '',
    read: meta.read || '',
    excerpt: meta.excerpt || '',
    viz: (meta.viz || '').split(',').map(s => s.trim()).filter(Boolean),
    body: m[2].trim(),
  };
}

/** Loads every post; a malformed file is skipped with a warning instead of taking the site down. */
export function loadPosts(dir) {
  const posts = [];
  let files = [];
  try { files = readdirSync(dir).filter(f => /^[a-z0-9-]+\.md$/.test(f)); } catch { return posts; }
  for (const f of files) {
    try { posts.push(parsePost(f.slice(0, -3), readFileSync(join(dir, f), 'utf8'))); }
    catch (e) { console.warn(`[posts] skipped ${f}: ${e.message}`); }
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** Every post author is a user: a handle with no account yet becomes a placeholder, as catalog authors do (catalog.js). */
export function ensurePostAuthors(db, posts) {
  const addUser = db.prepare('INSERT OR IGNORE INTO users (ts_login, handle, placeholder) VALUES (?, ?, 1)');
  db.transaction(() => { for (const h of new Set(posts.flatMap(p => p.authors))) addUser.run(`seed:${h}`, h); })();
}
