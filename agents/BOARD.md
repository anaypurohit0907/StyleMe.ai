# Task Board — Index

Live index of `agents/tasks/`. One row per task. Detailed progress lives in the task file, not here.

## Rules

- Update a row only at: claim, release, status change, done.
- Format: `T-NNN-slug.md` files, one per task — creation guide in `agents/tasks/README.md`.
- Next free ID: use highest existing `T-NNN` + 1.
- Empty `backlog` = starving team. Spotted work → create a backlog task anytime (PROTOCOL.md §4 Feed the board).

| ID | Title | Status | Owner | Priority | Updated (UTC) |
|----|-------|--------|-------|----------|---------------|
| T-001 | Initialize multi-agent coordination system | done | Coco | critical | 2026-11-24 19:01 UTC |
| T-002 | Verify on-device cutout pipeline and finish vision logs | done | Yves | high | 2026-11-24 19:48 UTC |
| T-003 | Subagent rules + prompt-quality upgrade of coordination docs | done | Coco | high | 2026-11-24 19:04 UTC |
| T-004 | Add feed-the-board rule (agents always have new tasks to pick) | done | Coco | medium | 2026-11-24 19:05 UTC |
| T-005 | Refresh root AGENTS.md with repo-specific agent guide | done | Rei | high | 2026-11-24 19:07 UTC |
| T-006 | Add apps/worker/AGENTS.md (wrangler/D1/vitest quirks) | done | Wren | medium | 2026-11-24 19:50 UTC |
| T-007 | Product quality + taste audit — find the 1000x levers | done | Vesper | high | 2026-11-24 19:41 UTC |
| T-008 | Persist tag corrections and protect them on re-scan | done | Yves | high | 2026-11-25 05:22 UTC |
| T-009 | Background-augmented slot/subtype training on Colab | in-progress | Yves | high | 2026-11-25 06:45 UTC |
| T-010 | Standing question-board answerer (act when OPEN > 4) | in-progress | Sable | medium | 2026-11-24 19:13 UTC |
| T-011 | Wire the tone engine into every screen | done | Coco | critical | 2026-11-25 05:40 UTC |
| T-012 | "Why these outfits" panel + humanized reasons + never-mix | done | Coco | critical | 2026-11-25 05:05 UTC |
| T-013 | Capture batch loop — make the 3-minute setup real | done | Wren | critical | 2026-11-24 20:41 UTC |
| T-014 | Close the learning loop end-to-end (app ↔ worker) | done | Wren | high | 2026-11-25 07:05 UTC |
| T-015 | Motion + haptics pass — make it feel alive | review | Marlow | high | 2026-11-25 07:23 UTC |
| T-016 | Dark mode + real icons + type + debug-chrome cleanup | done | Coco | high | 2026-11-25 07:08 UTC |
| T-017 | Wardrobe + item completeness (filters, wear history, safety) | review | Coco | medium | 2026-11-25 07:20 UTC |
| T-018 | Retention moments — streaks, first-outfit, spaced polls | backlog | — | medium | 2026-11-24 19:38 UTC |
| T-019 | Worker tenant scoping — fix cross-user garment overwrite | done | Indigo | critical | 2026-11-24 19:53 UTC |
| T-020 | Worker auth hardening, validation, rate limits | done | Indigo | critical | 2026-11-25 05:54 UTC |
| T-021 | Engine integrity pass — coat diversity, accessories, explore math, tests | done | Marlow | high | 2026-11-25 06:20 UTC |
| T-022 | Standing QA + taste review of tasks reaching review status | in-progress | Vesper | high | 2026-11-24 19:47 UTC |
| T-023 | Evaluate + adopt public clothing dataset for slot scoring/training | done | Wren | high | 2026-11-25 06:25 UTC |
| T-024 | Structured logging — terminal/logfile instead of reading the screen | done | Yves | high | 2026-11-25 05:15 UTC |
| T-025 | Original brand asset pack — app icon, splash, adaptive/monochrome icons | done | Viv | high | 2026-11-24 20:08 UTC |
| T-026 | Mobile lint hygiene — fix pre-existing expo lint errors | done | Coco | low | 2026-11-25 05:27 UTC |
| T-027 | Establish tech lead role + proper SWE team process | in-progress | Onyx | high | 2026-11-24 19:56 UTC |
| T-028 | Mobile — store + resend device registrationSecret (worker T-020 pairing) | done | Viv | high | 2026-11-25 05:58 UTC |
| T-029 | Standing reviewer + helper — review overflow + unblock | in-progress | Rei | high | 2026-11-24 20:15 UTC |
| T-030 | Personalize capture session target from onboarding wardrobe-size guess | backlog | — | low | 2026-11-24 20:17 UTC |
| T-031 | Dark-mode token wiring — useTheme + hardcoded hex cleanup (T-016 split) | done | Wren | high | 2026-11-25 05:07 UTC |
| T-032 | Theme pass on remaining screens — Today, item, onboarding, DNA | done | Coco | high | 2026-11-25 06:15 UTC |
| T-033 | Theme token cleanup — onAccent token + unused colors import | done | Wren | low | 2026-11-25 05:38 UTC |
| T-034 | Log rotation polish — load backup tail + accurate startup hint | backlog | — | low | 2026-11-25 05:15 UTC |
| T-035 | Reproducible mobile lint — commit ESLint flat config + devDeps | done | Coco | low | 2026-11-25 07:11 UTC |
| T-036 | Fix external log file creation — T-024 device regression | done | Coco | high | 2026-11-25 05:58 UTC |
| T-037 | Cap remaining client payload strings — learn/laundry, corrections, photo refs | done | Indigo | medium | 2026-11-25 07:15 UTC |
| T-038 | Move auth token + registrationSecret to SecureStore | review | Viv | medium | 2026-11-25 07:20 UTC |
| T-039 | Worker — import NEUTRAL_COLORS from engine instead of the local 7-name copy | done | Marlow | low | 2026-11-25 06:08 UTC |
| T-040 | Run Fashionpedia street-split eval + publish dataset report artifact | in-progress | Yves | low | 2026-11-25 06:30 UTC |
| T-041 | Idempotent learn delivery — job id + worker dedupe | review | Wren | medium | 2026-11-25 07:22 UTC |
| T-042 | Dev cleanup — reset-project script + unused tab icon assets | done | Coco | low | 2026-11-25 07:13 UTC |
| T-043 | Wardrobe filters + loading skeleton + bulk wash (T-017 split) | backlog | — | medium | 2026-11-25 07:20 UTC |
