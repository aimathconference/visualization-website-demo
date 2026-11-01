// Routes for the EigenReel front end (the repository root; docs/server.md). Additive: nothing here changes the demo's
// own routes. The front end's api.js probes /api/whoami at boot; a 200 with server: true switches it from
// localStorage to these endpoints.

import { requireUser } from '../auth.js';
import { bumpSeq } from '../db.js';
import { toClientUser, toClientViz, VIZ_SELECT, MINE_IF_PLAYGROUND, isPrivateTo, cleanHandle, cleanText, cleanTags, uniqueSlug, parseJson, InputError, LICENSES } from '../lib.js';

// One JSON value per front-end storage key, per person. The keys are the front end's own localStorage keys.
const KEY_RE = /^eigenreel:[A-Za-z0-9:._@-]{1,120}$/;
const MAX_VALUE = 256 * 1024, MAX_KEYS = 500;

// A Playground remix's package. The front end has already run its checks; these are a backstop. Viewers run the
// module in the front end's worker sandbox (no network, no storage), like any unreviewed remix.
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/;
const MAX_FILES = 6, MAX_PACKAGE = 400_000;
const FORBIDDEN = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|indexedDB|localStorage|sessionStorage|eval(?=\s*\())\b/;

/** {files} from a request body → a clean {name: text} with eigenreel.json, explanation.md and at least one .js module. */
export function cleanPackage(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new InputError('Missing the package files.');
  const names = Object.keys(files);
  if (names.length > MAX_FILES) throw new InputError(`At most ${MAX_FILES} files.`);
  let total = 0;
  for (const n of names) {
    if (!FILE_RE.test(n) || typeof files[n] !== 'string') throw new InputError(`Not a package file: ${n}`);
    total += files[n].length;
    if (/\.js$/.test(n) && FORBIDDEN.test(files[n])) throw new InputError(`${n} uses ${files[n].match(FORBIDDEN)[1]}, which a module may not.`);
  }
  if (total > MAX_PACKAGE) throw new InputError('The package is too large.');
  if (!names.some(n => /\.js$/.test(n))) throw new InputError('The package has no module.');
  if (typeof files['explanation.md'] !== 'string') throw new InputError('The package has no explanation.md.');
  const eigenreel = parseJson(files['eigenreel.json'], null);
  if (!eigenreel || typeof eigenreel !== 'object' || Array.isArray(eigenreel)) throw new InputError('eigenreel.json is missing or not a JSON object.');
  return { files: Object.fromEntries(names.map(n => [n, files[n]])), eigenreel };
}

export function eigenreelRoutes(app, { db, config, allow }) {
  const me = c => c.get('user')?.id ?? 0;

  // The kill switch (routes/admin.js): public, because a signed-out visitor's browser must stop these pieces too.
  const blockedQ = db.prepare('SELECT slug, reason FROM blocked_pieces ORDER BY created_at DESC');
  app.get('/api/blocked', c => { c.header('Cache-Control', 'no-store'); return c.json({ items: blockedQ.all().map(b => ({ id: b.slug, reason: b.reason ?? '' })) }); });

  app.get('/api/whoami', c => {
    const ident = c.get('ident'), user = c.get('user');
    const base = { server: true, authMode: config.authMode, siteName: config.siteName, ...(config.runnerUrl ? { runnerUrl: config.runnerUrl } : {}) };
    // signedOut: this browser chose Sign out (the signed_out cookie, routes/users.js), so the identity is ignored.
    if (!ident) return c.json({ ...base, identified: false, ...(c.get('signedOut') ? { signedOut: true } : {}) });
    if (user?.removed_at) return c.json({ ...base, identified: true, removed: true });
    const needsSetup = !user?.handle;
    return c.json({
      ...base, identified: true, needsSetup,
      user: needsSetup ? null : toClientUser(user, { self: true }),
      // In dev mode the login is the person's own choice (the Acting as box), so it may be shown back to them.
      devLogin: config.authMode === 'dev' ? ident.login : undefined,
    });
  });

  // The front end's handle editor. PUT /api/me keeps a handle once it is set (the demo's profile sheet has no
  // handle field after setup); this one changes it, with the same rules and uniqueness.
  const handleOwner = db.prepare('SELECT id FROM users WHERE handle = ?');
  const setHandle = db.prepare('UPDATE users SET handle = ? WHERE id = ?');
  const userById = db.prepare('SELECT * FROM users WHERE id = ?');
  app.put('/api/me/handle', requireUser(), async c => {
    if (!allow(`handle:${me(c)}`, 10, 600_000)) return c.json({ error: 'Too many changes. Wait a few minutes.' }, 429);
    let handle;
    try { handle = cleanHandle((await c.req.json()).handle); } catch (e) { if (e instanceof InputError) return c.json({ error: e.message }, 422); throw e; }
    const owner = handleOwner.get(handle);
    if (owner && owner.id !== me(c)) return c.json({ error: 'That handle is taken.' }, 422);
    setHandle.run(handle, me(c));
    return c.json(toClientUser(userById.get(me(c)), { self: true }));
  });

  // The Chalkboard (the front end's name for what the schema calls the playground): your own copies, kept here on the
  // server, unlike published pieces, which live in the registry. A copy of a piece is a viz row (kind remix, status
  // playground, the parent the reviewed piece) plus its package. GET lists your own that have a package, newest first,
  // with their files. PUT replaces one's files, DELETE /api/viz/:id removes it; only its author reaches either.
  const vizBySlug = db.prepare('SELECT * FROM viz WHERE slug = ?');
  const rawById = db.prepare('SELECT * FROM viz WHERE id = ?');
  const insertViz = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, parent_id, title, hook, tags_json, license,
      explanation_md, updated_seq) VALUES (@slug, @author, 'remix', 'playground', 'playground', @parent, @title, @hook, @tags, @license, @explanation, @seq)`);
  // A new visualization (the New button: no parent, started from the contributor template) is a top-level post.
  const insertNew = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, parent_id, title, hook, tags_json, license,
      explanation_md, colors_json, updated_seq) VALUES (@slug, @author, 'code', 'playground', 'playground', NULL, @title, @hook, @tags, @license, @explanation, @colors, @seq)`);
  const insertPkg = db.prepare('INSERT INTO viz_package (viz_id, files_json) VALUES (?, ?)');
  const pgQ = db.prepare(`${VIZ_SELECT} JOIN viz_package pk ON pk.viz_id = v.id WHERE v.status = 'playground' AND v.hidden = 0 AND ${MINE_IF_PLAYGROUND}
    ORDER BY v.created_at DESC, v.id DESC`);
  const pkgOf = db.prepare('SELECT files_json FROM viz_package WHERE viz_id = ?');
  const updateViz = db.prepare(`UPDATE viz SET title = @title, hook = @hook, tags_json = @tags, explanation_md = @explanation, colors_json = @colors, thumbs_json = '{}', updated_seq = @seq WHERE id = @id`);
  const updatePkg = db.prepare('UPDATE viz_package SET files_json = ? WHERE viz_id = ?');
  const cleanColors = eigenreel => (eigenreel.colors && typeof eigenreel.colors === 'object' && Object.values(eigenreel.colors).every(v => /^#[0-9a-f]{6}$/i.test(v)) ? JSON.stringify(eigenreel.colors) : null);
  const byId = db.prepare(`${VIZ_SELECT} WHERE v.id = @id`);
  const withFiles = r => ({ ...toClientViz(r), files: parseJson(pkgOf.get(r.id)?.files_json, {}) });

  app.get('/api/playground', c => c.json({ items: pgQ.all({ me: me(c) }).map(withFiles) }));
  app.post('/api/playground', requireUser(), async c => {
    if (!allow(`post:${me(c)}`, 20, 600_000)) return c.json({ error: 'Too many posts. Wait a few minutes.' }, 429);
    const body = await c.req.json();
    try {
      const fresh = body.parent == null; // no parent: a new visualization, not a remix
      let parent = fresh ? null : vizBySlug.get(String(body.parent));
      if (parent && isPrivateTo(parent, me(c))) parent = null;
      if (parent?.kind === 'remix') parent = rawById.get(parent.parent_id);
      if (!fresh && (!parent || parent.hidden || isPrivateTo(parent, me(c)))) throw new InputError('The original visualization is no longer available.');
      const { files, eigenreel } = cleanPackage(body.files);
      if (fresh) {
        let tags = [];
        try { tags = cleanTags(Array.isArray(eigenreel.tags) ? eigenreel.tags : []); } catch { tags = []; }
        const colors = cleanColors(eigenreel);
        const rec = { title: cleanText(eigenreel.title, 80, 'Title', { required: true }), hook: cleanText(eigenreel.hook, 160, 'Description'), tags: JSON.stringify(tags),
          license: LICENSES.includes(eigenreel.license) ? eigenreel.license : 'MIT', explanation: cleanText(files['explanation.md'], 20_000, 'Explanation'), colors };
        const id = db.transaction(() => {
          const { lastInsertRowid } = insertNew.run({ ...rec, slug: uniqueSlug(db, rec.title), author: me(c), seq: bumpSeq(db) });
          insertPkg.run(lastInsertRowid, JSON.stringify(files));
          return lastInsertRowid;
        })();
        return c.json(withFiles(byId.get({ id, me: me(c) })), 201);
      }
      const rec = {
        parent: parent.id, title: cleanText(eigenreel.title || `${parent.title} (remix)`, 80, 'Title', { required: true }),
        hook: cleanText(eigenreel.hook, 160, 'Description'), tags: parent.tags_json, license: parent.license,
        explanation: cleanText(files['explanation.md'], 20_000, 'Explanation'),
      };
      const id = db.transaction(() => {
        const { lastInsertRowid } = insertViz.run({ ...rec, slug: uniqueSlug(db, rec.title), author: me(c), seq: bumpSeq(db) });
        insertPkg.run(lastInsertRowid, JSON.stringify(files));
        return lastInsertRowid;
      })();
      return c.json(withFiles(byId.get({ id, me: me(c) })), 201);
    } catch (e) {
      if (e instanceof InputError) return c.json({ error: e.message }, 422);
      throw e;
    }
  });

  app.put('/api/playground/:id', requireUser(), async c => {
    if (!allow(`save:${me(c)}`, 120, 600_000)) return c.json({ error: 'Too many saves. Wait a few minutes.' }, 429);
    const row = rawById.get(Number(c.req.param('id')));
    // 404, not 403, for someone else's: a Chalkboard piece is private, so its existence is too.
    if (!row || row.status !== 'playground' || row.author_id !== me(c) || row.hidden || !pkgOf.get(row.id)) return c.json({ error: 'No such piece on your Chalkboard.' }, 404);
    try {
      const { files, eigenreel } = cleanPackage((await c.req.json()).files);
      let tags = parseJson(row.tags_json, []);
      if (row.kind !== 'remix') { try { tags = cleanTags(Array.isArray(eigenreel.tags) ? eigenreel.tags : []); } catch { tags = []; } } // a copy keeps its parent's tags, as when it was posted
      const rec = { id: row.id, title: cleanText(eigenreel.title, 80, 'Title', { required: true }), hook: cleanText(eigenreel.hook, 160, 'Description'), tags: JSON.stringify(tags),
        explanation: cleanText(files['explanation.md'], 20_000, 'Explanation'), colors: cleanColors(eigenreel) };
      db.transaction(() => { updateViz.run({ ...rec, seq: bumpSeq(db) }); updatePkg.run(JSON.stringify(files), row.id); })();
      return c.json(withFiles(byId.get({ id: row.id, me: me(c) })));
    } catch (e) {
      if (e instanceof InputError) return c.json({ error: e.message }, 422);
      throw e;
    }
  });

  // The registry's entries (server/registry.js): entries/<slug>.js in the submission format (docs/submission-spec-slop.md),
  // merged after review. Each comes with its code as written, the metadata spec.js read from it (meta), its colors,
  // explanation and WebAssembly module (a data: URL, or null); the front end runs it in its worker sandbox.
  // `items` (the old package folders) stays empty, for front ends that still read it.
  const singleQ = db.prepare(`${VIZ_SELECT} WHERE v.source = 'registry' AND v.status = 'reviewed' AND v.hidden = 0 AND v.code IS NOT NULL
    AND v.meta_json IS NOT NULL ORDER BY v.created_at DESC, v.id DESC`);
  app.get('/api/registry', c => c.json({
    repo: config.registryRepo || null, branch: config.registryBranch,
    items: [],
    singles: singleQ.all({ me: me(c) }).map(r => ({
      ...toClientViz(r), registryPath: r.registry_path, meta: parseJson(r.meta_json, null), code: r.code,
      wasm: r.wasm_b64 ? `data:application/wasm;base64,${r.wasm_b64}` : null,
    })),
  }));

  const kvAll = db.prepare('SELECT key, json FROM user_kv WHERE user_id = ? ORDER BY key');
  const kvCount = db.prepare('SELECT COUNT(*) AS n FROM user_kv WHERE user_id = ?');
  const kvHas = db.prepare('SELECT 1 FROM user_kv WHERE user_id = ? AND key = ?');
  const kvPut = db.prepare(`INSERT INTO user_kv (user_id, key, json) VALUES (?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET json = excluded.json, updated_at = CURRENT_TIMESTAMP`);
  const kvDel = db.prepare('DELETE FROM user_kv WHERE user_id = ? AND key = ?');

  app.get('/api/me/kv', requireUser(), c => {
    const items = {};
    for (const r of kvAll.all(me(c))) { try { items[r.key] = JSON.parse(r.json); } catch { /* skip a damaged row */ } }
    return c.json({ items });
  });
  app.put('/api/me/kv/:key', requireUser(), async c => {
    const key = c.req.param('key');
    if (!KEY_RE.test(key)) return c.json({ error: 'Unknown key.' }, 400);
    if (!allow(`kv:${me(c)}`, 600, 60_000)) return c.json({ error: 'Slow down a little.' }, 429);
    const body = await c.req.json();
    if (!body || typeof body !== 'object' || !('value' in body)) return c.json({ error: 'Expected {value}.' }, 400);
    const json = JSON.stringify(body.value);
    if (json === undefined) return c.json({ error: 'Expected {value}.' }, 400);
    if (json.length > MAX_VALUE) return c.json({ error: 'That value is too large.' }, 413);
    if (!kvHas.get(me(c), key) && kvCount.get(me(c)).n >= MAX_KEYS) return c.json({ error: 'Too many stored items.' }, 413);
    kvPut.run(me(c), key, json);
    return c.json({ ok: true });
  });
  app.delete('/api/me/kv/:key', requireUser(), c => {
    const key = c.req.param('key');
    if (!KEY_RE.test(key)) return c.json({ error: 'Unknown key.' }, 400);
    kvDel.run(me(c), key);
    return c.json({ ok: true });
  });
}
