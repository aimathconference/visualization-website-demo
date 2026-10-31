// npm run reset — delete ALL demo data (accounts, posts, likes, thumbnails). Asks first.
import { createInterface } from 'node:readline/promises';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../db.js';
import { loadConfig } from '../app.js';

const { dataDir } = loadConfig();
if (!process.argv.includes('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This deletes everything in ${dataDir} except backups. Type "reset" to continue: `);
  rl.close();
  if (answer.trim() !== 'reset') { console.log('Cancelled.'); process.exit(1); }
}
for (const f of ['loci.db', 'loci.db-wal', 'loci.db-shm', 'thumbs']) rmSync(join(dataDir, f), { recursive: true, force: true });
const db = openDb(join(dataDir, 'loci.db'));
db.close();
console.log('Reset done. Restart the server if it is running (sudo systemctl restart loci-demo).');
