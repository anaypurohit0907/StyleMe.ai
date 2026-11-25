# StyleMe.ai — Agent Constitution

Multiple AI agents work this repo in parallel. All coordination happens through markdown files in `agents/`. No scripts, no services, no message buses. The files are shared production state.

Read these rules literally and follow them in order.

## Non-negotiables

1. Read `agents/PROTOCOL.md` before any work.
2. Claim an identity: mark yourself `ACTIVE` in `agents/WORKFORCE.md` — one name per session, edit only your row. No identity, no work.
3. Claim one task on `agents/BOARD.md` before touching code. One task at a time. Spotted work → drop it on the board as a backlog task (PROTOCOL.md §4 Feed the board).
4. List every file you touch in your task's `files:` field before touching it. Grep `agents/tasks/` first; a file owned by another active task → get the owner's OK on `agents/CHATBOARD.md` before you touch it.
5. Re-read any coordination file immediately before editing it. Changed since your read → re-read, retry once, then coordinate in `agents/CHATBOARD.md`.
6. Ambiguity → post in `agents/QUESTIONS.md`, switch to other work, check back after ≥5 min. User answers there too.
7. Team talk lives in `agents/CHATBOARD.md`: append-only at the bottom, ≤3 lines per message, never touch old lines.
8. Commit every coordination change immediately: `coord: <name> <action>`.
9. Update your task's `updated_at` every ~10 min while working.
10. Write only what you own: your workforce row, your task file, your new chat/question lines. Other agents' content stays untouched (takeover exception: PROTOCOL.md §9).
11. Subagents: encouraged for research and scoped parallel work — but they run under your identity. Brief each with an exact file list; they never write `agents/`, `AGENTS.md`, or commit. You answer for them (PROTOCOL.md §5).
12. Follow the team charter (`agents/TEAM.md`): tech lead triages, assigns reviewers, and owns merge order. Independent review before `done`; never self-approve or self-merge your own code (PROTOCOL.md §12).

When two rules conflict, the one protecting shared state wins. Unsure → `agents/QUESTIONS.md`.

Full law: `agents/PROTOCOL.md`. Violations lose work for the whole team.

## Repo map

npm workspaces + Turborepo. TypeScript strict + `noUncheckedIndexedAccess` everywhere. Node ≥ 20 (24 in dev and CI). npm only — `package-lock.json`, no bun.

| Path | What it is |
|---|---|
| `apps/mobile` | Expo SDK 58 / React Native 0.88 app: Expo Router, local SQLite, on-device vision. `apps/mobile/AGENTS.md` is binding for any mobile work — read it first. |
| `apps/worker` | Cloudflare Worker API: Hono + D1 (+ optional R2). Config in `wrangler.jsonc`, SQL migrations in `apps/worker/migrations/`. |
| `packages/schema` | Shared zod types — single source of truth; engine, worker, and mobile all import from here. |
| `packages/engine` | Pure TS outfit engine; runs in the worker AND offline in the app. |
| `packages/design` | Design tokens. |
| `ml/` | Colab notebooks 00–03 (run in order), taxonomy, probe training — see `ml/README.md`. |
| `docs/` | `PLAN.md` (product/architecture), `TESTING.md` (device test guide + scan-log legend). |

Packages export raw TS source (`main: ./src/index.ts`) — no build step anywhere; `turbo run build` is a no-op.

## Commands

```bash
npm ci

# tests (the CI pair, ~25s)
npx turbo run test --filter=@styleme/engine --filter=@styleme/worker

# typecheck (the CI set)
npx turbo run typecheck --filter=@styleme/schema --filter=@styleme/engine \
  --filter=@styleme/worker --filter=@styleme/mobile

# one test file
cd packages/engine && npx vitest run tests/tone.test.ts   # same shape in apps/worker

# dev servers
npm run worker:dev     # needs apps/worker/.dev.vars: JWT_SECRET=<32+ chars> (gitignored)
npm run mobile:start
```

"Done" = the test pair + typecheck set above pass, plus independent review approval (PROTOCOL.md §4, §12). Only `apps/mobile` has lint (`npx expo lint`); root `npm run lint` lints mobile only. Worker deploy flow (D1 migrations + `JWT_SECRET` secret + `wrangler deploy`): README § "Deploy the worker".

## Gotchas

- **Vision assets ARE tracked in git** — `apps/mobile/assets/vision/` ships its ONNX models + json metadata in the repo (`slot_background_aug`, `subtype_mobilenet`, `u2netp`, probes/embeddings; `ml/artifacts/` + `ml/data/` remain ignored). CI additionally re-downloads the full release bundle `vision-v2` (101.7MB zip: `android.yml` `curl`) over the same directory — so a clean checkout builds natively without the bundle, and CI builds use the release copy.
- **Expo Go runs a deterministic mock tagger.** The real ONNX pipeline needs a dev/release build (`EXPO_PUBLIC_VISION=onnx`). Don't "fix" tagging observed in Expo Go.
- **`apps/mobile/android/` + `ios/` are generated** by `expo prebuild` and ignored — configure via `app.json` + config plugins, never by hand.
- `packages/engine/tests/uniqueness.property.test.ts` simulates 1,000 users over 40 days and takes ~20s alone — the engine suite is quiet that long by design, not hung.
- CI (`ci.yml`, every push to `main` + PRs) runs exactly the commands above, then validates every `ml/*.ipynb` (nbformat + python compile; `!` shell lines other than `pip|cp|cd|ls` fail it).
- Any push to `main` touching `apps/mobile/**` auto-builds an arm64 release APK and overwrites the `apk-latest` release asset (`android.yml`) — testers install from that link.
- Photos stay on-device by design; R2 photo backup is intentionally disabled (commented block in `wrangler.jsonc`). The worker stores attributes + embeddings, never photos.
