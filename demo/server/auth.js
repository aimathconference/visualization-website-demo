// Who is making the request (DEMO_PLAN.md section 5, "Accounts from Tailscale identity").
//
// AUTH_MODE=tailscale (default): identity comes from the headers `tailscale serve` adds. The server
//   only listens on 127.0.0.1, so every request has come through Serve, which strips client-sent copies.
// AUTH_MODE=dev: for local development. Identity comes from the X-Dev-Login header or the dev_login
//   cookie (so you can act as several people in different browsers), falling back to DEV_LOGIN.
// Either way, the signed_out cookie (see "Sign out" in routes/users.js) makes this browser anonymous.

import { getCookie } from 'hono/cookie';

export const SIGNED_OUT_COOKIE = 'signed_out';
export const ROLES = ['user', 'moderator', 'blog', 'admin'];
export const rank = role => ROLES.indexOf(role) + 1;

/** RFC 2047 "encoded-word" values such as =?utf-8?q?Ren=C3=A9?= (how non-ASCII names may arrive). */
export function decodeHeaderValue(v) {
  if (!v) return v;
  return v.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, charset, enc, text) => {
    try {
      const bytes = enc.toUpperCase() === 'B'
        ? Buffer.from(text, 'base64')
        : Buffer.from(text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
      return new TextDecoder(charset).decode(bytes);
    } catch { return text; }
  });
}

function identity(c, config) {
  if (config.authMode === 'dev') {
    const login = c.req.header('x-dev-login') || getCookie(c, 'dev_login') || config.devLogin;
    if (!login) return null;
    return { login, name: login.split('@')[0], pic: null };
  }
  const login = c.req.header('tailscale-user-login');
  if (!login) return null;
  return {
    login,
    name: decodeHeaderValue(c.req.header('tailscale-user-name')) || login.split('@')[0],
    pic: c.req.header('tailscale-user-profile-pic') || null,
  };
}

/** Middleware: sets c.var.ident (or null) and c.var.user (the row, or null if they have none yet). */
export function authMiddleware(db, config) {
  const byLogin = db.prepare('SELECT * FROM users WHERE ts_login = ?');
  const makeAdmin = db.prepare("UPDATE users SET role = 'admin' WHERE id = ?");
  return async (c, next) => {
    const signedOut = getCookie(c, SIGNED_OUT_COOKIE) === '1';
    const ident = signedOut ? null : identity(c, config);
    let user = ident ? byLogin.get(ident.login) || null : null;
    if (user && config.adminLogins.includes(ident.login) && user.role !== 'admin') {
      makeAdmin.run(user.id);
      user = { ...user, role: 'admin' };
    }
    c.set('signedOut', signedOut);
    c.set('ident', ident);
    c.set('user', user);
    await next();
  };
}

/** Guard for routes that need a finished profile, optionally with a minimum role. */
export function requireUser(minRole = 'user') {
  return async (c, next) => {
    const ident = c.get('ident'), user = c.get('user');
    if (!ident) return c.json({ error: c.get('signedOut') ? 'Sign in to do that.' : 'Open this from a personal device signed into Tailscale.' }, 401);
    if (!user || !user.handle) return c.json({ error: 'Finish setting up your profile first.' }, 403);
    if (user.removed_at) return c.json({ error: 'This account has been removed.' }, 403);
    if (rank(user.role) < rank(minRole)) return c.json({ error: 'You do not have permission to do that.' }, 403);
    await next();
  };
}
