import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { bodyLimit } from 'hono/body-limit';
import { requireUser, rank } from '../auth.js';
import { bumpSeq, currentSeq, kvGet, kvSet, audit } from '../db.js';
import { guard, requireColors, GuardError } from '../guard.js';
import { runnerPage, runnerErrorPage } from '../runner-template.js';
import {
  VIZ_SELECT, toClientViz, parseJson, InputError, cleanText, cleanTags, cleanSettings, uniqueSlug, LICENSES, STYLES,
} from '../lib.js';

const PREVIEW_TTL_MS = 30 * 60 * 1000;
const MAX_TOMBSTONES = 500;

export function vizRoutes(app, { db, config, allow }) {
  const me = c => c.get('user')?.id ?? 0;
  const feedQ = db.prepare(`${VIZ_SELECT} WHERE v.status = @status AND v.hidden = 0 ORDER BY v.pinned DESC, v.created_at DESC, v.id DESC`);
  const byId = db.prepare(`${VIZ_SELECT} WHERE v.id = @id`);
  const bySlug = db.prepare(`${VIZ_SELECT} WHERE v.slug = @slug`);
  const rawById = db.prepare('SELECT * FROM viz WHERE id = ?');
  const touch = db.prepare('UPDATE viz SET updated_seq = ? WHERE id = ?');

  const canSee = (c, row) => row && (!row.hidden || row.author_id === me(c) || rank(c.get('user')?.role) >= rank('admin'));
  const canManage = (c, row) => row.author_id === me(c) || rank(c.get('user')?.role) >= rank('admin');

  const findViz = c => {
    const key = c.req.param('id');
    return /^\d+$/.test(key) ? byId.get({ id: Number(key), me: me(c) }) : bySlug.get({ slug: key, me: me(c) });
  };

  app.get('/api/feed', c => {
    const status = c.req.query('tab') === 'playground' ? 'playground' : 'reviewed';
    return c.json({ seq: currentSeq(db), items: feedQ.all({ status, me: me(c) }).map(toClientViz) });
  });

  app.get('/api/viz/:id', c => {
    const row = findViz(c);
    if (!canSee(c, row)) return c.json({ error: 'Not found.' }, 404);
    const codeRow = row.kind === 'remix' ? rawById.get(row.parent_id) : row;
    return c.json({ ...toClientViz(row), code: codeRow?.code ?? '' });
  });

  // Polling (DEMO_PLAN.md section 5): everything that changed since the client's cursor.
  const changedQ = db.prepare(`SELECT id, status, hidden, pinned, (SELECT COUNT(*) FROM likes l WHERE l.viz_id = viz.id) AS likes
    FROM viz WHERE updated_seq > ?`);
  app.get('/api/changes', c => {
    const since = Number(c.req.query('since')) || 0;
    const seq = currentSeq(db);
    if (since >= seq) return c.json({ seq, changes: [], removed: [] });
    const removed = parseJson(kvGet(db, 'tombstones'), []).filter(t => t.seq > since).map(t => t.id);
    return c.json({ seq, changes: changedQ.all(since), removed });
  });

  const like = db.prepare('INSERT OR IGNORE INTO likes (user_id, viz_id) VALUES (?, ?)');
  const unlike = db.prepare('DELETE FROM likes WHERE user_id = ? AND viz_id = ?');
  const likeCount = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE viz_id = ?');
  for (const [method, stmt] of [['put', like], ['delete', unlike]]) {
    app[method]('/api/viz/:id/like', requireUser(), c => {
      const row = findViz(c);
      if (!row || row.hidden) return c.json({ error: 'Not found.' }, 404);
      if (!allow(`like:${me(c)}`, 120, 60_000)) return c.json({ error: 'Slow down a little.' }, 429);
      db.transaction(() => { if (stmt.run(me(c), row.id).changes) touch.run(bumpSeq(db), row.id); })();
      return c.json({ likes: likeCount.get(row.id).n, liked: method === 'put' });
    });
  }

  // Playground preview: guard the code and keep it for 30 minutes so /run/preview/:id can serve it.
  const addPreview = db.prepare('INSERT INTO previews (id, user_id, code_guarded, expires_at) VALUES (?, ?, ?, ?)');
  app.post('/api/preview', requireUser(), async c => {
    if (!allow(`preview:${me(c)}`, 60, 600_000)) return c.json({ error: 'Too many previews. Wait a few minutes.' }, 429);
    const { code } = await c.req.json();
    try {
      const { code: guarded, meta } = guard(code);
      const id = randomBytes(12).toString('base64url');
      addPreview.run(id, me(c), guarded, Date.now() + PREVIEW_TTL_MS);
      return c.json({ id, meta });
    } catch (e) {
      if (e instanceof GuardError) return c.json({ error: e.message, line: e.line }, 422);
      throw e;
    }
  });

  const insertViz = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, parent_id, title, hook, tags_json, license,
      code, code_guarded, settings_json, colors_json, explanation_md, updated_seq)
    VALUES (@slug, @author, @kind, 'playground', 'playground', @parent, @title, @hook, @tags, @license, @code, @guarded, @settings, @colors, @explanation, @seq)`);
  app.post('/api/viz', requireUser(), async c => {
    if (!allow(`post:${me(c)}`, 20, 600_000)) return c.json({ error: 'Too many posts. Wait a few minutes.' }, 429);
    const body = await c.req.json();
    try {
      let rec;
      if (body.kind === 'remix') {
        let parent = rawById.get(Number(body.parentId));
        if (parent?.kind === 'remix') parent = rawById.get(parent.parent_id);
        if (!parent || parent.hidden) throw new InputError('The original visualization is no longer available.');
        rec = {
          kind: 'remix', parent: parent.id, title: cleanText(body.title || `${parent.title} (remix)`, 80, 'Title', { required: true }),
          hook: cleanText(body.hook, 160, 'Description'), tags: parent.tags_json, license: parent.license,
          code: null, guarded: null, settings: JSON.stringify(cleanSettings(body.settings)), colors: null, explanation: '',
        };
      } else {
        // Title, description, tags and license come from the code's export (as in the registry) unless sent explicitly.
        const { code: guarded, meta } = guard(body.code);
        requireColors(meta);
        const license = [body.license, meta.license].find(l => LICENSES.includes(l)) || 'MIT';
        rec = {
          kind: 'code', parent: null, title: cleanText(body.title ?? meta.title, 80, 'Title', { required: true }),
          hook: cleanText(body.hook ?? meta.hook, 160, 'Description'), tags: JSON.stringify(cleanTags(body.tags ?? meta.tags ?? [])), license,
          code: body.code, guarded, settings: null, colors: JSON.stringify(meta.colors), explanation: cleanText(body.explanation, 10_000, 'Explanation'),
        };
      }
      const id = db.transaction(() => insertViz.run({ ...rec, slug: uniqueSlug(db, rec.title), author: me(c), seq: bumpSeq(db) }).lastInsertRowid)();
      return c.json(toClientViz(byId.get({ id, me: me(c) })), 201);
    } catch (e) {
      if (e instanceof GuardError) return c.json({ error: e.message, line: e.line }, 422);
      if (e instanceof InputError) return c.json({ error: e.message }, 422);
      throw e;
    }
  });

  // Thumbnails are rendered in a browser (the author's or an admin's) and uploaded once per style.
  const setThumbs = db.prepare('UPDATE viz SET thumbs_json = ? WHERE id = ?');
  app.put('/api/viz/:id/thumb/:style', requireUser(), bodyLimit({ maxSize: 600_000 }), async c => {
    const row = findViz(c), style = c.req.param('style');
    if (!row) return c.json({ error: 'Not found.' }, 404);
    if (!canManage(c, row)) return c.json({ error: 'Only the author or an admin can set thumbnails.' }, 403);
    if (!STYLES.includes(style)) return c.json({ error: 'Unknown style.' }, 400);
    const m = String((await c.req.json()).data || '').match(/^data:image\/(webp|png);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return c.json({ error: 'Expected a WebP or PNG data URL.' }, 400);
    const dir = join(config.dataDir, 'thumbs', String(row.id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${style}.${m[1]}`), Buffer.from(m[2], 'base64'));
    const thumbs = { ...parseJson(row.thumbs_json, {}), [style]: m[1] };
    setThumbs.run(JSON.stringify(thumbs), row.id);
    return c.json({ thumbs });
  });

  app.get('/thumbs/:id/:file', c => {
    const m = c.req.param('file').match(/^([a-z]+)\.(webp|png)$/);
    if (!/^\d+$/.test(c.req.param('id')) || !m) return c.notFound();
    const file = join(config.dataDir, 'thumbs', c.req.param('id'), `${m[1]}.${m[2]}`);
    if (!existsSync(file)) return c.notFound();
    return c.body(readFileSync(file), 200, { 'Content-Type': `image/${m[2]}`, 'Cache-Control': 'no-cache' });
  });

  const del = db.prepare('DELETE FROM viz WHERE id = ?');
  const orphanRemixes = db.prepare('UPDATE viz SET hidden = 1, updated_seq = ? WHERE parent_id = ?');
  app.delete('/api/viz/:id', requireUser(), c => {
    const row = findViz(c);
    if (!row) return c.json({ error: 'Not found.' }, 404);
    if (!canManage(c, row)) return c.json({ error: 'Only the author or an admin can delete this.' }, 403);
    db.transaction(() => {
      const seq = bumpSeq(db);
      orphanRemixes.run(seq, row.id);
      del.run(row.id);
      const tombs = parseJson(kvGet(db, 'tombstones'), []);
      tombs.push({ id: row.id, seq });
      kvSet(db, 'tombstones', JSON.stringify(tombs.slice(-MAX_TOMBSTONES)));
      if (row.author_id !== me(c)) audit(db, me(c), 'delete-viz', row.slug, null);
    })();
    rmSync(join(config.dataDir, 'thumbs', String(row.id)), { recursive: true, force: true });
    return c.json({ ok: true });
  });

  // Runner pages (DEMO_PLAN.md section 6). Remixes run their parent's code.
  const sendRunner = (c, guarded) => {
    const { html, csp } = guarded ? runnerPage(guarded) : runnerErrorPage('This visualization is no longer available.');
    return c.html(html, 200, {
      'Content-Security-Policy': csp,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    });
  };
  app.get('/run/:id', c => {
    let row = /^\d+$/.test(c.req.param('id')) ? rawById.get(Number(c.req.param('id'))) : null;
    if (row?.kind === 'remix') row = rawById.get(row.parent_id);
    return sendRunner(c, row && !row.hidden ? row.code_guarded : null);
  });
  const previewQ = db.prepare('SELECT code_guarded FROM previews WHERE id = ? AND expires_at > ?');
  app.get('/run/preview/:pid', c => sendRunner(c, previewQ.get(c.req.param('pid'), Date.now())?.code_guarded));
}

export function purgeExpiredPreviews(db) {
  db.prepare('DELETE FROM previews WHERE expires_at <= ?').run(Date.now());
}
