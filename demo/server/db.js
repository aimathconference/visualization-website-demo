import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..');
export const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');

export function openDb(file = join(DATA_DIR, 'eigenreel.db')) {
  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true });
    // The site was called Loci: a data folder from then has loci.db (and its WAL files). Take it over once.
    const old = join(dirname(file), 'loci.db');
    if (!existsSync(file) && existsSync(old)) for (const x of ['', '-wal', '-shm']) if (existsSync(old + x)) renameSync(old + x, file + x);
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
  // Databases made before visualizations declared their colors.
  if (!db.pragma('table_info(viz)').some(c => c.name === 'colors_json')) db.exec('ALTER TABLE viz ADD COLUMN colors_json TEXT');
  // Databases made before registry entries were the single-file format of docs/submission-spec-slop.md.
  const vizCols = db.pragma('table_info(viz)').map(c => c.name), userCols = db.pragma('table_info(users)').map(c => c.name);
  if (!vizCols.includes('meta_json')) db.exec('ALTER TABLE viz ADD COLUMN meta_json TEXT');
  if (!vizCols.includes('wasm_b64')) db.exec('ALTER TABLE viz ADD COLUMN wasm_b64 TEXT');
  if (!userCols.includes('github_id')) db.exec('ALTER TABLE users ADD COLUMN github_id INTEGER');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_github_id ON users(github_id) WHERE github_id IS NOT NULL');
  // Stored items from when the site was called Loci: loci:… keys become eigenreel:… (a newer value wins).
  db.exec(`UPDATE OR IGNORE user_kv SET key = 'eigenreel' || substr(key, 5) WHERE key GLOB 'loci:*';
           DELETE FROM user_kv WHERE key GLOB 'loci:*';`);
  return db;
}

/** Bump the polling cursor; returns the new value. Call inside the same transaction as the change. */
export function bumpSeq(db) {
  db.prepare("UPDATE kv SET value = CAST(value AS INTEGER) + 1 WHERE key = 'seq'").run();
  return Number(db.prepare("SELECT value FROM kv WHERE key = 'seq'").get().value);
}

export function currentSeq(db) {
  return Number(db.prepare("SELECT value FROM kv WHERE key = 'seq'").get().value);
}

export function kvGet(db, key) {
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function kvSet(db, key, value) {
  db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

export function audit(db, actorId, action, target, reason = null) {
  db.prepare('INSERT INTO audit_log (actor_id, action, target, reason) VALUES (?, ?, ?, ?)').run(actorId, action, String(target), reason);
}
