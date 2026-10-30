-- EigenReel demo schema. Mirrors the production data model in ../PLAN.md so it can move to Cloudflare D1.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  ts_login TEXT UNIQUE NOT NULL,          -- from Tailscale-User-Login; never sent to clients
  handle TEXT UNIQUE,                     -- NULL until profile setup is finished
  avatar_json TEXT,                       -- {kind, ...params, bg, fg} curve avatar, or {tailscale: true, url}
  bio TEXT, homepage TEXT, github TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','blog','admin')),
  newsletter_json TEXT,                   -- {lists: ["best-of-month","dev-blog","miscellany"]}; stored only
  placeholder INTEGER NOT NULL DEFAULT 0, -- 1 for seed users and unmatched registry authors
  removed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS users_github ON users(lower(github)) WHERE github IS NOT NULL AND github <> '';

CREATE TABLE IF NOT EXISTS viz (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('code','remix')),
  status TEXT NOT NULL CHECK (status IN ('reviewed','playground')),
  source TEXT NOT NULL CHECK (source IN ('seed','playground','registry','promoted')),
  registry_path TEXT,                     -- entries/<slug>.js for imported pieces
  registry_sha TEXT,                      -- blob sha last imported
  registry_pr INTEGER,
  parent_id INTEGER REFERENCES viz(id),   -- remixes point at the original
  title TEXT NOT NULL,
  hook TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  license TEXT NOT NULL DEFAULT 'MIT',
  code TEXT,                              -- original source (NULL for remixes)
  code_guarded TEXT,                      -- after guard.js
  settings_json TEXT,                     -- remix settings / default settings
  colors_json TEXT,                       -- the code's COLORS block; NULL for remixes and older pieces
  explanation_md TEXT NOT NULL DEFAULT '',
  thumbs_json TEXT NOT NULL DEFAULT '{}', -- {style: 'webp'|'png'} for thumbnails on disk
  pinned INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_seq INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS viz_feed ON viz(status, hidden, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS viz_seq ON viz(updated_seq);

CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL REFERENCES users(id),
  viz_id INTEGER NOT NULL REFERENCES viz(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, viz_id)
);

CREATE TABLE IF NOT EXISTS previews (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  code_guarded TEXT NOT NULL,
  expires_at INTEGER NOT NULL             -- epoch ms
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_signups (
  email TEXT PRIMARY KEY,
  lists_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);  -- polling cursor, registry state

INSERT OR IGNORE INTO kv (key, value) VALUES ('seq', '0');
