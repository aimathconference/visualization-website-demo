// Admin tools (DEMO_PLAN.md section 1, row "Admin"; every action is written to the audit log).

import { requireUser, ROLES } from '../auth.js';
import { bumpSeq, audit } from '../db.js';
import { VIZ_SELECT, toClientViz, toClientUser, parseJson } from '../lib.js';

export function adminRoutes(app, { db, reloadPosts, importer }) {
  const admin = requireUser('admin');
  const me = c => c.get('user').id;
  const reasonOf = async c => { try { return String((await c.req.json()).reason ?? '').slice(0, 300) || null; } catch { return null; } };

  app.use('/api/admin/*', admin);

  const usersQ = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM viz v WHERE v.author_id = u.id) AS n FROM users u
    WHERE u.handle IS NOT NULL ORDER BY u.placeholder, u.created_at`);
  app.get('/api/admin/users', c => c.json({ items: usersQ.all().map(u => ({ id: u.id, count: u.n, ...toClientUser(u) })) }));

  const userById = db.prepare('SELECT * FROM users WHERE id = ?');
  const setRole = db.prepare('UPDATE users SET role = ? WHERE id = ?');
  app.put('/api/admin/users/:id/role', async c => {
    const u = userById.get(Number(c.req.param('id'))), body = await c.req.json();
    if (!u || u.placeholder) return c.json({ error: 'No such person.' }, 404);
    if (!ROLES.includes(body.role)) return c.json({ error: 'Unknown role.' }, 400);
    if (u.id === me(c) && body.role !== 'admin') return c.json({ error: "You can't remove your own admin role." }, 400);
    setRole.run(body.role, u.id);
    audit(db, me(c), `role:${body.role}`, `@${u.handle}`, body.reason ? String(body.reason).slice(0, 300) : null);
    return c.json({ ok: true });
  });

  // Removing an account hides everything they posted and refuses their Tailscale login from then on.
  const removeUser = db.prepare("UPDATE users SET removed_at = datetime('now') WHERE id = ?");
  const restoreUser = db.prepare('UPDATE users SET removed_at = NULL WHERE id = ?');
  const hideTheirs = db.prepare('UPDATE viz SET hidden = ?, updated_seq = ? WHERE author_id = ?');
  app.delete('/api/admin/users/:id', async c => {
    const u = userById.get(Number(c.req.param('id'))), reason = await reasonOf(c);
    if (!u) return c.json({ error: 'No such person.' }, 404);
    if (u.id === me(c)) return c.json({ error: "You can't remove your own account." }, 400);
    db.transaction(() => { removeUser.run(u.id); hideTheirs.run(1, bumpSeq(db), u.id); audit(db, me(c), 'remove-account', `@${u.handle}`, reason); })();
    return c.json({ ok: true });
  });
  app.post('/api/admin/users/:id/restore', async c => {
    const u = userById.get(Number(c.req.param('id'))), reason = await reasonOf(c);
    if (!u) return c.json({ error: 'No such person.' }, 404);
    db.transaction(() => { restoreUser.run(u.id); hideTheirs.run(0, bumpSeq(db), u.id); audit(db, me(c), 'restore-account', `@${u.handle}`, reason); })();
    return c.json({ ok: true });
  });

  const allVizQ = db.prepare(`${VIZ_SELECT} ORDER BY v.created_at DESC`);
  app.get('/api/admin/viz', c => c.json({ items: allVizQ.all({ me: me(c) }).map(toClientViz) }));

  // promote = the wishlist's review bypass, which exists only in the demo.
  const ACTIONS = {
    hide: 'hidden = 1', unhide: 'hidden = 0', pin: 'pinned = 1', unpin: 'pinned = 0',
    promote: "status = 'reviewed', source = 'promoted'",
  };
  const vizById = db.prepare('SELECT * FROM viz WHERE id = ?');
  app.post('/api/admin/viz/:id/:action', async c => {
    const action = c.req.param('action'), v = vizById.get(Number(c.req.param('id'))), reason = await reasonOf(c);
    if (!ACTIONS[action]) return c.json({ error: 'Unknown action.' }, 400);
    if (!v) return c.json({ error: 'Not found.' }, 404);
    if (action === 'promote' && v.status === 'reviewed') return c.json({ error: 'Already in the main feed.' }, 400);
    db.transaction(() => {
      db.prepare(`UPDATE viz SET ${ACTIONS[action]}, updated_seq = ? WHERE id = ?`).run(bumpSeq(db), v.id);
      audit(db, me(c), action, v.slug, reason);
    })();
    return c.json({ ok: true });
  });

  // The kill switch: stop a piece in every viewer's browser, by its id, within a minute. Nothing else about the piece
  // changes, so restoring it brings back its likes and links. A catalog piece has no other way to be stopped.
  const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;
  const blockedQ = db.prepare('SELECT b.slug, b.reason, b.created_at, u.handle FROM blocked_pieces b LEFT JOIN users u ON u.id = b.actor_id ORDER BY b.created_at DESC');
  const block = db.prepare('INSERT INTO blocked_pieces (slug, reason, actor_id) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET reason = excluded.reason, actor_id = excluded.actor_id');
  const unblock = db.prepare('DELETE FROM blocked_pieces WHERE slug = ?');
  app.get('/api/admin/blocked', c => c.json({ items: blockedQ.all().map(b => ({ id: b.slug, reason: b.reason ?? '', by: b.handle, at: b.created_at })) }));
  app.put('/api/admin/blocked/:slug', async c => {
    const slug = c.req.param('slug'), reason = await reasonOf(c);
    if (!SLUG.test(slug)) return c.json({ error: 'That is not a piece id: lowercase letters, numbers and dashes.' }, 400);
    if (!reason) return c.json({ error: 'Say why, for the audit log.' }, 400);
    db.transaction(() => { block.run(slug, reason, me(c)); audit(db, me(c), 'stop-piece', slug, reason); })();
    return c.json({ ok: true });
  });
  app.delete('/api/admin/blocked/:slug', async c => {
    const slug = c.req.param('slug'), reason = await reasonOf(c);
    if (!unblock.run(slug).changes) return c.json({ error: 'That piece is not stopped.' }, 404);
    audit(db, me(c), 'restart-piece', slug, reason);
    return c.json({ ok: true });
  });

  const auditQ = db.prepare(`SELECT a.*, u.handle FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200`);
  app.get('/api/admin/audit', c => c.json({ items: auditQ.all().map(a => ({ id: a.id, actor: a.handle, action: a.action, target: a.target, reason: a.reason, at: a.created_at })) }));

  app.post('/api/admin/reload-posts', c => {
    const n = reloadPosts();
    audit(db, me(c), 'reload-posts', `${n} posts`);
    return c.json({ count: n });
  });

  app.post('/api/admin/import-registry', async c => {
    if (!importer) return c.json({ error: 'No practice registry configured (set REGISTRY_REPO).' }, 400);
    const result = await importer.run();
    audit(db, me(c), 'import-registry', JSON.stringify(result));
    return c.json(result);
  });

  // Everything except Tailscale logins, which stay private.
  app.get('/api/admin/export', c => {
    const users = db.prepare('SELECT * FROM users').all().map(({ ts_login, ...u }) => ({ ...u, avatar_json: parseJson(u.avatar_json, null), newsletter_json: parseJson(u.newsletter_json, null) }));
    const data = {
      exportedAt: new Date().toISOString(),
      users,
      viz: db.prepare('SELECT * FROM viz').all(),
      likes: db.prepare('SELECT * FROM likes').all(),
      newsletterSignups: db.prepare('SELECT * FROM newsletter_signups').all(),
      audit: db.prepare('SELECT * FROM audit_log').all(),
    };
    audit(db, me(c), 'export', 'all data');
    return c.body(JSON.stringify(data, null, 2), 200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="eigenreel-export-${data.exportedAt.slice(0, 10)}.json"`,
    });
  });
}
