# Rank-Badge Artwork Import & Wiring Spec (for Claude Code)

Status: SPEC — verified in the design project (`Forge Home.dc.html` renders
`assets/rank-foundation-i.png` in the title-block medallion; asset confirmed loaded 425×460).
Not fabricated art — every badge PNG already exists in the project. This task IMPORTS them
into the app and WIRES the two slots that currently show a bronze placeholder.

## Why
Phase 2 imported only the four workout collections (`assets/artwork/*`) into the RN app. The
rank PNGs at `assets/` root were never imported, so the Home ChapterTitleBlock medallion and
the Legacy rank seal fall back to bronze placeholders. The art exists and is proven in the DC.

## Rank taxonomy (source of truth: Rank System Reference.dc.html)
7 families, 25 levels total:
- Foundation  — I · II · III · IV
- Builder     — I · II · III · IV
- Craftsman   — I · II · III · IV
- Architect   — I · II · III · IV
- Established  — I · II · III · IV   (SEX-SPECIFIC — has -m / -f variants)
- Legend      — I · II · III · IV
- Legacy      — I · II · III · IV   (I Discovery · II Ascent · III Presence · IV Legacy — overrides the reference's "no sub-tiers")

## Assets present in the project (assets/ root)
- foundation-1..4.png
- builder-1..4.png
- craftsman-1..4.png
- architect-1..4.png
- established-m-1..4.png, established-f-1..4.png
- legacy-rank-1..4.png
- hall-1..4.png
- legacy-1..4.png
- Composed seals: rank-foundation-i.png, rank-craftsman-i.png  (framed medallion form)
- rank-foundation-i.svg  (vector source for Foundation I seal)

## Asset → family map (RESOLVED 2026-07-14)
- foundation-1..4  → Foundation I–IV
- builder-1..4     → Builder I–IV
- craftsman-1..4   → Craftsman I–IV
- architect-1..4   → Architect I–IV
- established-m/f-1..4 → Established I–IV (sex-specific)
- **hall-1..4      → Legend I–IV**  (forge-hall doorway + flame crest + numeral; “Hall of Legends”)
- **legacy-rank-1..4 → Legacy I–IV**  (the monument landscape: I Discovery / II Ascent /
    III Presence / IV Legacy). Use `legacy-rank-*` as CANONICAL.
- **`legacy-1..4` is a DUPLICATE** of `legacy-rank-*` (visually identical) — do NOT copy it;
    import only `legacy-rank-*`. (Flag for later cleanup, non-destructive: leave root files.)

## ⚑ FLAGS — resolve before import (do NOT guess)
1. ~~Legend / Legacy / Hall mapping~~ **RESOLVED** (see map above). Legend=`hall-*`,
   Legacy=`legacy-rank-*` (4 ranks), `legacy-*` is a duplicate to skip. Import all 7 families.
2. **Why is only Established sex-specific?** Confirm the other families are intentionally
   sex-neutral (one badge for all users) and only Established forks -m/-f. If more families
   should be sex-specific, the art doesn't exist yet → flag, don't fabricate.
3. **Composed seal vs raw badge.** `rank-foundation-i.png` (framed medallion, used in the DC)
   vs `foundation-1.png` (raw badge). Confirm which form each slot wants: the Home medallion
   used the composed `rank-*-i` seal; the Legacy hero seal + rank ladders may want the raw
   `<family>-<level>` badge. Define per slot.

## Asset key scheme (mirror the workout-collection pattern)
Canonical (underscore) keys; files copied into `assets/artwork/ranks/`:

    home.rank.<family>.<level>            e.g. home.rank.foundation.1
    home.rank.established.<level>.<sex>   e.g. home.rank.established.3.female
    home.rank.legacy.<level>              e.g. home.rank.legacy.4 (4 ranks — no longer level-less)

- `<family>`: foundation | builder | craftsman | architect | established | legend | legacy
- `<level>`: 1 | 2 | 3 | 4  (ALL seven families have 4 levels)
- `<sex>`: male | female  (Established only, until/unless more families fork)
- Legacy/Honors collections remain RESERVED from the workout card (unchanged) — ranks are a
  NEW, separate collection and are legit in rank/identity contexts.

## Import steps
1. Copy the resolved rank PNGs from `assets/` (root) → `assets/artwork/ranks/<family>/…`
   using the key→file map the PO confirms at the flags above. Non-destructive: COPY, the
   root files stay. Do NOT copy the ambiguous sets until flag 1 is resolved.
2. Extend the asset registry (`asset-registry.ts` / `gen-asset-registry.mjs`) so every
   `home.rank.*` key resolves to a `require()`d module, same as the workout collections.
3. Add a tiny rank resolver `resolveRankArtwork({ family, level, sex })` → key → assetPath,
   with the Established sex-fork and the Legacy no-level case. Deterministic; pure.
4. Registry-coverage test: fails if any producible `home.rank.*` key lacks an entry OR a file
   (the workout-collection test pattern). No silent broken image.

## Wiring targets (the two slots on placeholder today)
1. **Home — ChapterTitleBlock medallion** (`src/components/.../ChapterTitleBlock`): replace
   the bronze placeholder with the resolved rank seal (composed `rank-*-i` form). Data: the
   user's current rank. NO rank service exists yet → read from a documented placeholder rank
   (Foundation I today, matching the DC) exactly like chapter/week; flag pending-rank-service.
2. **Legacy — hero rank seal** (`src/app/legacy.tsx`): replace the bronze seal placeholder
   with the resolved rank badge. Same placeholder-rank source + flag.
(Optionally the Legacy rank ladder / progression list later — separate sub-task.)

## Guards (same discipline as prior phases)
- Graceful fallback: `resolveRankArtwork` returning undefined → the existing bronze placeholder,
  never a crash, never a broken image.
- Placeholder rank clearly labeled (no rank backend yet); never presented as a real earned rank.
- Prototype-crop caveat: these are prototype-resolution PNGs; high-res masters are a Phase-4
  swap on the same keys (no call-site change).
- Non-destructive: COPY assets (root originals stay); no .docx / domain-data touched.

## Verification
- tsc 0 · eslint clean (own surface) · node --test incl. the new rank registry-coverage test.
- expo export web builds clean; Home + Legacy static-render the real rank seal (not the bronze
  placeholder) for the placeholder rank.
- git: each commit stray-checked; rank import its own commit.

## Gate
Bring the PO: (a) the resolved flag-1 mapping applied, (b) the key→file map actually used,
(c) verification output — before committing. Legend/Legacy stay on placeholder until flag 1
is answered.
