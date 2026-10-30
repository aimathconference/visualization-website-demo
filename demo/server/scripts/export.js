// npm run export — write data/export-<date>.json with everything except Tailscale logins.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../db.js';
import { loadConfig } from '../app.js';

const { dataDir } = loadConfig();
const db = openDb(join(dataDir, 'loci.db'));
const data = {
  exportedAt: new Date().toISOString(),
  users: db.prepare('SELECT * FROM users').all().map(({ ts_login, ...u }) => u),
  viz: db.prepare('SELECT * FROM viz').all(),
  likes: db.prepare('SELECT * FROM likes').all(),
  newsletterSignups: db.prepare('SELECT * FROM newsletter_signups').all(),
  audit: db.prepare('SELECT * FROM audit_log').all(),
};
const file = join(dataDir, `export-${data.exportedAt.slice(0, 10)}.json`);
writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Wrote ${file}`);
db.close();
