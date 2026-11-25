-- 0003_auth_device_secret.sql — device proof-of-possession
--
-- Why: /v1/auth/device minted a 1-year JWT on deviceId alone — knowing a
-- device id was enough to permanently take over the account (audit §6 F2).
-- Store only a SHA-256 hash of the one-time registration secret; the
-- plaintext is returned exactly once, at first registration.

ALTER TABLE users ADD COLUMN reg_secret_hash TEXT;
