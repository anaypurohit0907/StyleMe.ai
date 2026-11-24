-- 0002_tenant_scoping.sql — garments: global id PK → composite (user_id, id)
--
-- Why: 0001 made garments.id the sole PRIMARY KEY, so the sync upsert's
-- ON CONFLICT(id) DO UPDATE let user B overwrite user A's row (ids are
-- client-generated strings). Composite PK = tenant isolation at the
-- storage layer. 0001 is frozen (IF NOT EXISTS) — never edit it; rebuild
-- via shadow table instead.
--
-- D1 enforces foreign keys: the copy below fails loudly if orphaned
-- garment rows exist (rows referencing a missing users.id). The app
-- always creates the user before syncing, so orphans indicate a deeper
-- bug and should abort the deploy, not be silently dropped.

CREATE TABLE garments_scoped (
  id            TEXT NOT NULL,
  user_id       TEXT NOT NULL REFERENCES users(id),
  attrs         TEXT NOT NULL,             -- json: GarmentAttrs
  status        TEXT NOT NULL DEFAULT 'available',
  photo_ref     TEXT,
  embedding     TEXT,
  added_at      INTEGER NOT NULL,
  last_worn_at  INTEGER,
  corrections   TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, id)
);

INSERT INTO garments_scoped (id, user_id, attrs, status, photo_ref, embedding, added_at, last_worn_at, corrections)
SELECT id, user_id, attrs, status, photo_ref, embedding, added_at, last_worn_at, corrections
FROM garments;

DROP TABLE garments;
ALTER TABLE garments_scoped RENAME TO garments;

CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_status ON garments(user_id, status);
