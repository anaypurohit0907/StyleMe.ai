# Sable — product review

Lens: user questions/objections — what confused the only real user (Anay) across ~24h of chatboard + QUESTIONS.md traffic (Nov 24 19:00 → Nov 26). Evidence cites chat lines + question threads.

## 1. What this app is (one sentence) / who it is for

A camera-first wardrobe assistant: photograph your clothes once, get daily outfit suggestions in a friendly human tone. Today it has exactly one real user — Anay: pragmatic, style-casual, iOS-taste, judges the app in 30-second on-device glances, and wants visible progress every time he returns.

## 2. Three biggest product problems (evidence)

1. **The user can't see product state without asking.** Three status-confusion moments in one morning: "is my collab logged out?", "how do I approve? what do I need to approve?", "@yves why are you blocked on T-008?" (chatboard 06:0x–07:1x Nov 25). He consumes the product through agent relays because the app itself surfaces no "what am I running / what changed / what needs me" state. His acceptance loop (install → glance → verdict) is the product's slowest gate — the T-062 "looks horrible" rejection cost a full build cycle because no eyes saw it before he did.
2. **Capture works; tag-trust is the emotional crux.** He corrected tags by hand, then gave the loudest order of the day: corrections must persist, "can't keep re-rating all of them" (Q-002 thread → T-008, user-critical). Then he settled accuracy pragmatically: "the model is good enough for now" — 62% flat-lay accuracy acceptable because users verify at capture time (relay 12:37). The product must never make him re-verify what he already fixed; that's where trust collapses, not in raw model metrics.
3. **First impression = restrained iOS-like chrome; "template app" reads as broken.** He rejected dark rust + fake glass instantly ("looks horrible", relay 13:42) and approved frosted-glass-bars-only in one line after seeing the direction framed as "iOS, but not too much" (relay 12:06). Taste verdicts arrive in seconds and are final; anything Expo-template-flavored or kitsch is a hard no before any feature is even assessed.

## 3. Pivot options (2–3) — what changes, effort, risk

- **A. Make the owner-demo loop a product surface.** Every build ships a 30-second self-verification path: dark/light screenshot pack of the key screens + a one-glance "what changed since your last install" line. Effort: small (CI artifact + changelog surface). Risk: low. Matches how the one real user actually consumes builds.
- **B. Camera-first simplification.** His one proven love: he added 14 items in a day. Make "scan → verify tags once → get tomorrow's outfit" the hero flow; tuck gap-lists, polls, streaks behind it. Effort: medium. Risk: retention features lose visibility (they shipped but he has never once mentioned them).
- **C. Batch user-decision points.** He answers in bursts, then goes dark (gym, calls, bed). Collect every needs-Anay item (questions, deploy gates, taste verdicts) into one digest at his morning return instead of trickling pings. Effort: small, process-only. Risk: low; keeps him unblocked and us unstalled.

## 4. Keep / kill / defer

- **Keep:** capture batch loop + corrections persistence (his two real behaviors); tone engine (zero confusion, visible delight); dark-mode restraint direction (ink, glass bars only).
- **Kill:** further tagger-training investment (his explicit call); cream/white primaries in dark; emulator-lane detours (his phone-first ruling).
- **Defer:** retention moments (streaks/polls — shipped, unobserved by him); Play-internal beta push until he asks for a second user; /gap screen (untested appeal).

## 5. One thing to test with a real user next

Hand Anay (or any fresh user) the hotfixed build and ask only: "add one clothing item tonight, and tomorrow tell me what you'd wear." Measure two things: did they correct a tag (capture trust), and did they come back unprompted (daily habit). One 24h loop tests the whole product thesis.

*Proposals only — no code, no tasks filed from this document (per agents/proposals/README.md).*
