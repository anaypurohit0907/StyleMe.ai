-- 0004_learn_dedupe.sql — idempotent learn delivery (T-041)
--
-- The client sync queue is at-least-once: a learn job can be re-sent if the
-- app dies after the worker accepted it but before the queue dropped it.
-- Every retry carries the queue's job id; this table remembers the ids the
-- worker already applied so a retry is a no-op instead of a double nudge.
--
-- Tenant-scoped PK: a job id collision across users must never suppress
-- another user's event. `created_at` is server time — the prune window must
-- not be defeatable by a skewed client timestamp. The learn handler deletes
-- a job's row if the apply fails, so a retry re-applies instead of dying on
-- a poisoned dedupe entry.

CREATE TABLE IF NOT EXISTS learn_events (
  user_id    TEXT NOT NULL,
  id         TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_learn_events_prune ON learn_events(user_id, created_at);
