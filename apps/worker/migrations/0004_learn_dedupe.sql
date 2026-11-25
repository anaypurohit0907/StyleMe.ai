-- 0004_learn_dedupe.sql — idempotent learn delivery (T-041)
--
-- The client sync queue is at-least-once: a learn job can be re-sent if the
-- app dies after the worker accepted it but before the queue dropped it.
-- Every retry carries the queue's job id; this table remembers the ids the
-- worker already applied so a retry is a no-op instead of a double nudge.
-- Rows are pruned opportunistically after 30 days — the client queue keeps
-- at most 200 jobs, so a month covers every realistic retry window.

CREATE TABLE IF NOT EXISTS learn_events (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL,
  ts       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learn_events_user_ts ON learn_events(user_id, ts);
