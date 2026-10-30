// Routes for the Loci front end (the repository root; docs/server.md). Additive: nothing here changes the demo's
// own routes. The front end's api.js probes /api/whoami at boot; a 200 with server: true switches it from
// localStorage to these endpoints.

import { requireUser } from '../auth.js';
import { toClientUser } from '../lib.js';

// One JSON value per front-end storage key, per person. The keys are the front end's own localStorage keys.
const KEY_RE = /^loci:[A-Za-z0-9:._@-]{1,120}$/;
const MAX_VALUE = 256 * 1024, MAX_KEYS = 500;

export function lociRoutes(app, { db, config, allow }) {
  const me = c => c.get('user')?.id ?? 0;

  app.get('/api/whoami', c => {
    const ident = c.get('ident'), user = c.get('user');
    const base = { server: true, authMode: config.authMode, siteName: config.siteName };
    if (!ident) return c.json({ ...base, identified: false });
    if (user?.removed_at) return c.json({ ...base, identified: true, removed: true });
    const needsSetup = !user?.handle;
    return c.json({
      ...base, identified: true, needsSetup,
      user: needsSetup ? null : toClientUser(user, { self: true }),
      // In dev mode the login is the person's own choice (the Acting as box), so it may be shown back to them.
      devLogin: config.authMode === 'dev' ? ident.login : undefined,
    });
  });

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
