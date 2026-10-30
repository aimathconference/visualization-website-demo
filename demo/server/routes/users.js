import { requireUser } from '../auth.js';
import { bumpSeq } from '../db.js';
import {
  VIZ_SELECT, toClientViz, toClientUser, InputError, cleanHandle, cleanText, cleanUrl, cleanGithub, cleanAvatar,
  NEWSLETTER_LISTS, parseJson,
} from '../lib.js';

export function userRoutes(app, { db, config, allow, getPosts }) {
  const me = c => c.get('user')?.id ?? 0;

  app.get('/api/me', c => {
    const ident = c.get('ident'), user = c.get('user');
    if (!ident) return c.json({ identified: false });
    if (user?.removed_at) return c.json({ identified: true, removed: true });
    const needsSetup = !user?.handle;
    return c.json({
      identified: true,
      needsSetup,
      user: needsSetup ? null : toClientUser(user, { self: true }),
      suggestedHandle: needsSetup ? suggestHandle(db, ident.name) : undefined,
      tailscalePic: ident.pic && /^https:\/\//.test(ident.pic) ? ident.pic : null,
    });
  });

  const insertUser = db.prepare('INSERT INTO users (ts_login, handle, avatar_json, bio, homepage, github) VALUES (?, ?, ?, ?, ?, ?)');
  const updateUser = db.prepare('UPDATE users SET handle = COALESCE(handle, ?), avatar_json = ?, bio = ?, homepage = ?, github = ? WHERE id = ?');
  const handleTaken = db.prepare('SELECT id FROM users WHERE handle = ?');
  const githubOwner = db.prepare("SELECT id, placeholder FROM users WHERE lower(github) = lower(?) AND github <> ''");
  const claimViz = db.prepare('UPDATE viz SET author_id = ?, updated_seq = ? WHERE author_id = ?');
  const clearGithub = db.prepare("UPDATE users SET github = '' WHERE id = ?");
  const dropPlaceholder = db.prepare('DELETE FROM users WHERE id = ?');
  const byLogin = db.prepare('SELECT * FROM users WHERE ts_login = ?');
  const makeAdmin = db.prepare("UPDATE users SET role = 'admin' WHERE id = ?");

  // Creates the profile on first save, updates it afterwards. The handle can't be changed once set.
  app.put('/api/me', async c => {
    const ident = c.get('ident');
    let user = c.get('user');
    if (!ident) return c.json({ error: 'Open this from a personal device signed into Tailscale.' }, 401);
    if (user?.removed_at) return c.json({ error: 'This account has been removed.' }, 403);
    const body = await c.req.json();
    try {
      const handle = user?.handle ?? cleanHandle(body.handle);
      const fields = {
        avatar: JSON.stringify(cleanAvatar(body.avatar, ident.pic)),
        bio: cleanText(body.bio, 300, 'Bio'),
        homepage: cleanUrl(body.homepage),
        github: cleanGithub(body.github),
      };
      if (!user?.handle && handleTaken.get(handle)) throw new InputError('That handle is taken.');
      const owner = fields.github ? githubOwner.get(fields.github) : null;
      // Registry authors who never set up a profile are placeholders (placeholder = 2): setting the
      // same GitHub username claims their visualizations. Seed users (placeholder = 1) can't be claimed.
      if (owner && owner.id !== user?.id && owner.placeholder !== 2) throw new InputError('That GitHub username is already on another profile.');
      db.transaction(() => {
        // Free the GitHub username first (it's unique), then move their visualizations over.
        if (owner && owner.id !== user?.id) clearGithub.run(owner.id);
        if (!user) {
          const { lastInsertRowid } = insertUser.run(ident.login, handle, fields.avatar, fields.bio, fields.homepage, fields.github);
          if (config.adminLogins.includes(ident.login)) makeAdmin.run(lastInsertRowid);
        } else updateUser.run(handle, fields.avatar, fields.bio, fields.homepage, fields.github, user.id);
        user = byLogin.get(ident.login);
        if (owner && owner.id !== user.id) { claimViz.run(user.id, bumpSeq(db), owner.id); dropPlaceholder.run(owner.id); }
      })();
      return c.json(toClientUser(user, { self: true }));
    } catch (e) {
      if (e instanceof InputError) return c.json({ error: e.message }, 422);
      throw e;
    }
  });
  const likedQ = db.prepare(`${VIZ_SELECT} JOIN likes ml ON ml.viz_id = v.id AND ml.user_id = @me WHERE v.hidden = 0 ORDER BY ml.created_at DESC, v.id DESC`);
  app.get('/api/me/likes', requireUser(), c => c.json({ items: likedQ.all({ me: me(c) }).map(toClientViz) }));

  const setNewsletter = db.prepare('UPDATE users SET newsletter_json = ? WHERE id = ?');
  const cleanLists = lists => [...new Set((Array.isArray(lists) ? lists : []).filter(l => NEWSLETTER_LISTS.includes(l)))];
  app.get('/api/me/newsletter', requireUser(), c => c.json(parseJson(c.get('user').newsletter_json, { lists: [] })));
  app.put('/api/me/newsletter', requireUser(), async c => {
    const value = { lists: cleanLists((await c.req.json()).lists) };
    setNewsletter.run(JSON.stringify(value), me(c));
    return c.json(value);
  });

  // Inline signup for people without an account. Stored only; the demo sends no email.
  const signup = db.prepare(`INSERT INTO newsletter_signups (email, lists_json) VALUES (?, ?)
    ON CONFLICT(email) DO UPDATE SET lists_json = excluded.lists_json`);
  app.post('/api/newsletter', async c => {
    if (!allow(`newsletter:${c.get('ident')?.login ?? 'anon'}`, 10, 600_000)) return c.json({ error: 'Too many signups. Try again later.' }, 429);
    const body = await c.req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return c.json({ error: 'Enter an email address like name@university.edu.' }, 422);
    const lists = cleanLists(body.lists);
    signup.run(email, JSON.stringify({ lists: lists.length ? lists : ['best-of-month'] }));
    return c.json({ ok: true });
  });

  const contributorsQ = db.prepare(`SELECT u.*, COUNT(v.id) AS n FROM users u JOIN viz v ON v.author_id = u.id AND v.hidden = 0
    WHERE u.removed_at IS NULL AND u.handle IS NOT NULL GROUP BY u.id ORDER BY n DESC, u.handle`);
  app.get('/api/users', c => c.json({ items: contributorsQ.all().map(u => ({ ...toClientUser(u), count: u.n })) }));

  const userQ = db.prepare('SELECT * FROM users WHERE handle = ?');
  const theirVizQ = db.prepare(`${VIZ_SELECT} WHERE v.author_id = @author AND v.hidden = 0 ORDER BY v.created_at DESC`);
  app.get('/api/users/:handle', c => {
    const u = userQ.get(c.req.param('handle').replace(/^@/, '').toLowerCase());
    if (!u || u.removed_at) return c.json({ error: 'No such person.' }, 404);
    const viz = theirVizQ.all({ author: u.id, me: me(c) }).map(toClientViz);
    const posts = getPosts().filter(p => p.author === u.handle).map(({ body, ...p }) => p);
    return c.json({ user: toClientUser(u), viz, posts });
  });
}

function suggestHandle(db, name) {
  const base = String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9._-]+/g, '.').replace(/^[._-]+|[._-]+$/g, '').slice(0, 20);
  if (base.length < 3) return '';
  return db.prepare('SELECT 1 FROM users WHERE handle = ?').get(base) ? '' : base;
}
