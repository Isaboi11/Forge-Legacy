# Hero film — handoff (2026-10-02)

Continue producing the forgelegacy.app homepage hero film. Read AGENTS.md, then `film/PLAN.md` (§0 is the
current cut), then this file. Work only in the worktree `C:\Users\isaia\forge-film-wt` (branch `feat/hero-film`,
outside OneDrive). Commit with explicit paths (`git commit -o`). Keep chat answers short and plain.

## Where it stands
- Engine: Remotion project in `film/` (`src/timeline.ts` = film clock + reading HOLDS + captions; `src/Film.tsx`;
  `src/Screens.tsx` = recording playback with holds/skips/slow + bronze outlines; `src/recordings.json` = takes).
- Generic phone (Apple bans 3D/spinning iPhone renders). Official App Store badge, cut in still.
- Screens are REAL: Playwright drives forgelegacy.expo.app at 402×808 with a frozen clock (`capture/lib.mjs`,
  `capture/shot-*.mjs`). Frames go to `film/public/rec/<shot>/` (git-ignored). Sign in first: `node capture/signin.mjs`
  (password in git-ignored `capture/.auth/password`); the session dies after ~1 h — re-run signin before each take.
- Shots 1–4 captured and cut. Latest render: `film/out/rough-v5-shots1234.mp4` (~25 s). PO: "much better", likes the pace.
- Music is a placeholder (the mock-up's score, `capture/mock-score.mjs`). PO still to license a track (PLAN §5).

## Seed (demo athlete Jordan, production DB, PO pastes SQL)
- Files: `supabase/apply/seed-demo-jordan-{0..4}*.sql`, `-1-REDO.sql`, `-REMOVE.sql`; notes `film/SEED-NOTES.md`.
- Applied now: stage 4 (whole year). The May 12 ceremonies (RANK ASCENDED Craftsman I, HONOR EARNED 1,000 Pound Club)
  were already dismissed in a look-around; they won't replay unless reset.
- To re-film an earlier date, rewind: stage 1 REDO works only before stage 4. After stage 4 you need a new "stage 2
  REDO" that also undoes stage 4 (delete chapters 2/3, unseal chapter 1, un-graduate the program — copy stage 4's
  rewind block) — OR REMOVE → 0 → 1 → 2. Put each paste on the PO's clipboard (PowerShell `Get-Content -Raw -Encoding
  UTF8 … | Set-Clipboard`) and wait for their result table.

## Open asks from the PO (answer "go" before building)
1. Zoom-outs: lift ONE key element per shot off the phone, ~2× (PR card, Holt's new workout, Welcome back card,
   the chapter cards), replacing the bronze outline. I recommended yes; PO asked "tell me simply" — confirm.
2. Holt shot must END ON THE ACTUAL WORKOUT: re-record at Feb 10 (needs stage 2 state): message "Bench is stuck at
   225 for three weeks. Add close-grip bench to Upper B, 4 sets of 6." → proposal → "The rest of the block" →
   "Show me the program" → Week 6 → Upper B showing "Barbell Close-Grip Bench Press 4 × 6" + "Updated by Holt".
   `capture/shot-3.mjs` undoes earlier Holt edits first. ~2 AI calls (~4¢); PO has OK'd spend (total so far ~45¢).
3. Shot 5 (Legacy, current state is ready): phone on Legacy's sealed chapters; the two chapters float out
   (real text: "Chapter I — The Return · Jan – Apr 2026 · 82 workouts"; "Chapter II — Stronger Than Before ·
   May 1 – Aug 31 · 89 workouts · 3 honors"); the real 1,000 Pound Club medal lands; "Day 100 · Still here".
   Update `src/story.ts` numbers (still the mock-up's 48/61). No rank-up.
Then: shot 6 end card (headline + "Lifting, running and nutrition. One app." + badge + url), phone 9:16 render,
<5 MB H.264 + WebM, poster, 15 s cut, site embed (`site/`, wrangler versions upload → preview → "go live" only).

## PO decisions to respect (all 10-01)
Simplify: one idea + one action per shot, held to read. No dimming. Phone motion stays as is. Captions:
"Most people quit their workout app within 100 days." → "Let's change that." / "One tap per set." /
"Your AI coach gets you unstuck." / "Miss a week. Keep your progress." / "A year that tells your story."
Real app wording only; change the film, never fake a screen. Never publish without the PO's explicit OK.

## Gotchas learned
- Capture runs the rest countdown ~2× fast (fake clock) — play it slowed (`slow` in recordings.json).
- `quietHolt()` must match Holt's bubble exactly — a prefix match closed "Close welcome back".
- Recording outlines are gated to their own shot's caption; caption `spot`s are removed (they were mock positions).
- A frozen-clock wait must still tick the clock (`until()` in shot-3) or the app's handlers never run.
- Holt has no "paused bench" in the catalogue (pause squat/deadlift exist); his reply to a bare "I'm stuck" rebuilt
  Upper B with almost no change; one reply started lowercase ("bench shows up in more than one session…"). Reported, not fixed.
- Shipped this session: ramp-prefill fix (web `index-52b8a28d`, build 11 OTA `bfd32e9e`, trunk `94b37f61`).
