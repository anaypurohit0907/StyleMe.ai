This is the Cloudflare Worker API. Hono + D1 (optional R2), TypeScript strict. Prioritize edge constraints, tenant scoping, and honest tests.

## Commands

```bash
cd apps/worker
npx wrangler dev              # local dev — needs .dev.vars first (see Secrets)
npx vitest run                # worker tests (or: npx turbo run test --filter=@styleme/worker)
npx tsc --noEmit              # typecheck
npm run db:migrate            # wrangler d1 migrations apply styleme --remote
```

`package.json` raw TS is imported via `@styleme/schema` / `@styleme/engine` — no build step anywhere; `turbo run build` is a no-op.

## Secrets

- Local: copy the `vars` comment block from `wrangler.jsonc` into `.dev.vars` — `JWT_SECRET=<32+ chars random>` is required for `wrangler dev` (routes read it from env; requests fail without it). Tests inject their own secret via `makeEnv()`. `.dev.vars` is gitignored; never commit it.
- Remote: `npx wrangler secret put JWT_SECRET` (README § "Deploy the worker").

## D1

- `database_id` in `wrangler.jsonc` is already live — do not run `wrangler d1 create styleme` again.
- Migrations live in `migrations/` and are applied **remotely** via `npm run db:migrate`. Additive numbered files only; never edit an applied migration — write a new `NNNN_*.sql`.
- `0002` rebuilds `garments` via shadow table `garments_scoped`: if it fails mid-apply (e.g. FK violation from orphaned rows), drop the shadow (`npx wrangler d1 execute styleme --remote --command "DROP TABLE garments_scoped"`) before re-running — the original `garments` table is untouched until the final `DROP`/`RENAME`.
- As of `migrations/0002_tenant_scoping.sql`, the `garments` PK is composite `(user_id, id)` — every query must filter by `user_id`. Cross-user overwrite is the bug class that spawned this PK; keep it scoping-correct.

## Tests + the MockD1 pattern

- `tests/mockdb.ts` is a pattern-routing in-memory D1: `Stmt.all()/run()` match on normalized SQL prefixes. When you add or change a query in `src/db.ts`, extend the mock's branches to match — both reads (`all()`) and writes (`run()`) — or your tests green-light against nothing.
- No false-green mock paths: if the mock can't express a query, make it throw, never silently return `[]`. Tests must be able to fail.
- `MockEnv.garments` is keyed by composite `(user_id, id)`; use `MockD1.garment(userId, id)` for tenant-scoped lookups in assertions.
- CI pair (`@styleme/engine` + `@styleme/worker`, ~25s): the engine's uniqueness property test simulates 1,000 users over 40 days and is silent ~20s by design — not hung.

## R2 is optional by design

Photos stay on-device; the worker stores attributes + embeddings, never photos. The `r2_buckets` block in `wrangler.jsonc` is commented out intentionally — leave it that way unless the user orders backup enabled.

## Rules

- Validation goes in `packages/schema` (zod) — worker routes validate with it; don't hand-roll checks in `src/index.ts`.
- Response shape changes must update `packages/schema` first — mobile imports the same types.
- Deploy flow (D1 migrations + `JWT_SECRET` + `wrangler deploy`) is README § "Deploy the worker" — run migrations before deploy, never after.

## Deploy runbook (auth proof-of-possession, since 0003)

- **Order matters:** mobile T-028 (registrationSecret storage) must ship in the same window or BEFORE the worker deploy — old APKs only send `registrationSecret` after T-028; a pre-T-028 install that loses its cached token gets a hard 403 (re-onboard under a fresh device id is the only recovery).
- **Legacy first-caller-wins window:** pre-0003 users (NULL `reg_secret_hash`) get their secret minted at first re-contact after deploy. Until a device's first re-contact, anyone who knows its bare deviceId can claim that upgrade. Window closes per-user at first re-contact; treat lingering 403 reports after the T-028 wave as "re-onboard with a new device id".
- **0002/0003 are live-schema-sensitive:** the deployed code and the D1 schema must move together — old sync SQL (`ON CONFLICT(id)`) errors against the composite PK and vice versa. Never migrate without deploying in the same session (and never deploy without migrating).
