-- 0001_init.sql — StyleMe core schema (D1/SQLite)
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,          -- device id
  locale        TEXT,
  onboarding    TEXT,                      -- json: city, vibe chips, wardrobe size
  tone          TEXT,                      -- json: ToneProfile
  prefs         TEXT NOT NULL DEFAULT '{}',-- json: PreferenceVector
  explore_state TEXT NOT NULL DEFAULT '{}',-- json: Record<signature, {alpha,beta}>
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS garments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  attrs         TEXT NOT NULL,             -- json: GarmentAttrs
  status        TEXT NOT NULL DEFAULT 'available',
  photo_ref     TEXT,
  embedding     TEXT,
  added_at      INTEGER NOT NULL,
  last_worn_at  INTEGER,
  corrections   TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_status ON garments(user_id, status);

CREATE TABLE IF NOT EXISTS wear_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  garment_ids   TEXT NOT NULL,             -- json array
  worn_at       INTEGER NOT NULL,
  occasion      TEXT,
  context       TEXT,                      -- json
  ts            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wear_user_time ON wear_log(user_id, worn_at DESC);

CREATE TABLE IF NOT EXISTS suggestions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  offered       TEXT NOT NULL,             -- json: garmentIds[][]
  picked        TEXT,                      -- json array or null
  context       TEXT,
  ts            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sugg_user_time ON suggestions(user_id, ts DESC);

CREATE TABLE IF NOT EXISTS laundry_events (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               TEXT NOT NULL,
  garment_ids           TEXT NOT NULL,
  event                 TEXT NOT NULL,     -- in_wash | washed
  expected_available_at INTEGER,
  ts                    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tone_cache (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,                   -- YYYY-MM-DD
  copy    TEXT,                            -- json: Record<canonicalKey,string>
  ts      INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
