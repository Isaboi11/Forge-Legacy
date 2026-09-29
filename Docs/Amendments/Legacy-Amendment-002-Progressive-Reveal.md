# Legacy Amendment 002 — Progressive Reveal

**Status:** LOCKED (PO brief, 2026-09-29)
**Date:** 2026-09-29
**Owner:** Product
**Amends:** `Legacy-Amendment-001` (LEG-A1-D2, D3, D7: the first-run screen) · `Legacy-Hub-Wireframe-Spec-L1`
§12.1 / §17.1 (the empty and brand-new states)
**Implemented by:** `src/domain/legacy/reveal.ts` (every decision, tested) · `app/(tabs)/legacy.tsx` (draws the answer)

---

## 1. The request

> *"A brand-new user currently sees too much of the mature Legacy page at once… It feels like a profile
> they need to fill out. Legacy should progressively reveal itself as the user actually builds a history."*
> — PO, 2026-09-29

## 2. Decisions

**LEG-A2-D1 — A section renders because it has something in it.** It never renders because the feature
exists, and never because the account is old. A hidden section is **absent**: no locked card, no disabled
row, no "coming soon". (This is L-1 §12.1's rule restored everywhere except the invitations.)

**LEG-A2-D2 — The chapter is the hero.** Directly under a rank strip that is about 22% shorter (and quieter again, D10), a
**Your Current Chapter** card shows the ordinal, the title, `Day N · N workouts`, and the primary goal
when one exists. A progress bar is drawn **only for a quantifiable goal**, the one case with real
progress behind it.

**LEG-A2-D3 — State 1 (named chapter, nothing else).** Chapter hero, then **Start Building Your Legacy**:
one recommended card (**Add a Progress Photo**) and two quieter ones (**Accomplishment**, **Quote**). The
page ends there, in whitespace (D11).

**LEG-A2-D4 — State 2 (no chapter chosen).** **Your Legacy starts here.** + **Start Your First Chapter**
(the strongest action), a subtle **or**, then **Add to Your Legacy** with three compact tiles.

⚠ **"Skipped" is inferred, because it is not stored.** `complete_onboarding` always opens Chapter I
(ONB-D14, unchanged). A skip only means the chapter gets the default name. So State 2 is shown when the
open chapter is `Chapter I — Building Your Foundation`, untouched. That chapter is real and holds the
athlete's workouts, so **Start Your First Chapter names it** (`/chapter/[id]?rename=1`) rather than
creating a second one. The known cost: someone who picked that name on purpose also sees State 2 until
they rename. The PO accepted this.

**LEG-A2-D5 — State 3 (first workout), and Recent Legacy.** The start module goes away. The page shows
**Recent Legacy** and a compact **Add to Your Legacy** row.

⚠ **Workouts record what you did; Legacy records what mattered** (PO review, 2026-09-29). Recent Legacy
lists the three newest *meaningful* events from the L-2 timeline's own read: honors, real PRs (never a
first baseline), goals, rank-ups, photos, accomplishments, seals and program finishes. An ordinary
workout appears **only until the first meaningful event exists** ("Completed Upper Body · Today · 45 min"),
so the first session still shows that Forge remembered it. The header links to the full timeline once
the timeline threshold is met. The separate timeline preview block is gone, since it duplicated this one.

**LEG-A2-D6 — State 4 (collections reveal themselves).**

| Section | Appears when |
|---|---|
| Pinned Legacy | something is pinned, **or** accomplishments + honors + sealed chapters ≥ 2 |
| My Standard (quote) | a quote exists |
| Photos tile | ≥ 1 photo |
| Transformation tile | ≥ 1 entry |
| Trophy Case tile | ≥ 1 competition entered |
| Accomplishments | ≥ 1 accomplishment |
| Honors | ≥ 1 honor earned |
| Timeline link (in Recent Legacy's header) | meaningful events + saved workouts ≥ 3 |
| Chapter history / Featured moment | a chapter has been sealed (unchanged) |

The archive band draws only the tiles that have content, and they share the row's width.

**LEG-A2-D7 — Invitations still retire one at a time (LEG-A1-D5 kept).** Each compact tile leaves when its
own thing exists. The row leaves when all three do. Honors are still never invited (LEG-A1-D4 kept).
**Progress Photo opens Transformation (`/transformation-add`), not the chapter photo gallery** (PO,
2026-09-29). It retires on the first Transformation entry. A chapter photo is a memory, not a starting
point, so it does not count.

**LEG-A2-D8 — First paint waits for all four reads.** The page waits for the legacy read, the archive,
accomplishments and the timeline together, so it never draws the brand-new page and then rearranges. A failed side read
counts as empty, so the page falls back to its simpler form.

**LEG-A2-D9 — Order follows what mattered.** Chapter → Pinned Legacy → Featured moment → quote →
Accomplishments → Honors → archive band (Transformation / Photos / Trophy Case) → Recent Legacy →
chapter history → Add to Your Legacy.

**LEG-A2-D10 — The identity header is quiet.** The tagline line is gone. The portrait, name and rank
badge are about 15% smaller again, so the chapter wins the hierarchy.

**LEG-A2-D11 — The inscription closes a record, not a short page.** *"Memories can be added. History
cannot be rewritten."* appears only once the page holds a collection (pinned, accomplishments, honors,
an archive tile, or a sealed chapter). States 1–3 end in whitespace.

## 3. What this does NOT change

- Every mature section, its behaviour, and its destination: only *when* each appears has changed.
- ONB-D14 (silent Chapter I), ONB-D22 (no counters or meters), LEG-A1-D4 (honors never invited).
- The "Begin your next chapter" card after a seal (L-5 §2).

## 4. Validation

- Brand-new athlete with a named chapter: rank strip · chapter hero · start module. Nothing else, and no inscription.
- Skipped athlete: intro · Start Your First Chapter → the rename sheet opens on their Chapter I · or · three tiles.
- After one workout: no start module; Recent Legacy shows the workout; compact row present.
- First honor, PR, photo or accomplishment: Recent Legacy switches to meaningful events and the workout leaves it.
- Each collection appears on its first entry. `reveal.test.mjs` asserts every row of the table in D6.
