// npm run seed — create the database and load the seed visualizations (only if it's empty).
import { join } from 'node:path';
import { openDb } from '../db.js';
import { loadConfig } from '../app.js';
import { seedIfEmpty } from '../seed.js';

const db = openDb(join(loadConfig().dataDir, 'loci.db'));
console.log(seedIfEmpty(db) ? 'Seeded.' : 'The database already has visualizations; nothing to do.');
db.close();
