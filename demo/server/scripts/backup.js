// npm run backup — consistent copy of the database into data/backups/, keeping the newest 14.
// Safe while the server is running. Run it daily from cron (see deploy/README.md).
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../db.js';
import { loadConfig } from '../app.js';

const { dataDir } = loadConfig();
const dir = join(dataDir, 'backups');
mkdirSync(dir, { recursive: true });
const db = openDb(join(dataDir, 'loci.db'));
const file = join(dir, `loci-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
await db.backup(file);
db.close();
const old = readdirSync(dir).filter(f => f.endsWith('.db')).sort().slice(0, -14);
for (const f of old) rmSync(join(dir, f));
console.log(`Backed up to ${file}${old.length ? ` (removed ${old.length} old backups)` : ''}`);
