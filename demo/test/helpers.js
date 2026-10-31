import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../server/db.js';
import { createApp, loadConfig } from '../server/app.js';
import { seedIfEmpty } from './fixtures/seed.js';

/** A fresh seeded app on an in-memory database. `as(login)` returns a request helper acting as that person. */
export function testApp({ env = {}, importer = null } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'loci-test-'));
  const config = loadConfig({ AUTH_MODE: 'dev', DEV_LOGIN: 'admin@example.com', DATA_DIR: dataDir, ...env });
  const db = openDb(':memory:');
  seedIfEmpty(db);
  const app = createApp({ db, config, importer });
  const as = (login, headers = {}) => async (method, path, body) => {
    const h = { 'x-loci': '1', ...headers };
    if (login) h[config.authMode === 'dev' ? 'x-dev-login' : 'tailscale-user-login'] = login;
    if (body !== undefined) h['content-type'] = 'application/json';
    const res = await app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  return { app, db, config, as };
}

export const AVATAR = { kind: 'rose', k: 4, bg: '#112233', fg: '#ffeedd' };

export async function setUp(req, handle, extra = {}) {
  const r = await req('PUT', '/api/me', { handle, avatar: AVATAR, ...extra });
  if (r.status !== 200) throw new Error(`setup failed: ${r.text}`);
  return r.json;
}
