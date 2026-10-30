import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..');
export const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');

export function openDb(file = join(DATA_DIR, 'loci.db')) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
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
