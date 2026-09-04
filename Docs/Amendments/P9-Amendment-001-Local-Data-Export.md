# P-9 Amendment 001 — Export My Data is a file, not an email

**Amends:** `P-9-Account-Wireframe-Spec.md` §4.2 (confirmation copy)
**Leaves untouched:** §2 (two rows, nothing else) · §3 (row structure, hairline separation) · §4.1 (no
confirmation step) · §4.3 (format, delivery, rate limiting and configuration all undefined)
**Status:** 🔒 LOCKED
**Date:** 2026-09-04
**Built:** same day — see §4

---

## 1. What changed, and why it had to

P-9 §4.2 specifies exactly one piece of in-app feedback:

> "We'll email your data export to [athlete's email]."

**The export is not emailed. It is handed straight to the athlete as a file.** On the phone that is the
iOS share sheet; on the web it is a browser download.

Three reasons, in order of weight:

1. **There is no email pipeline, and no way to build one from here.** Emailing an export means a
   server-side generator plus a transactional email provider plus a secret to hold its key. This project
   has **no Supabase CLI and no service key** — migrations are pasted into the dashboard by hand
   (`project_migrations_ledger`). An edge function and an email provider are not a paste bundle. Spec'd
   this way, Export My Data stays unbuilt indefinitely, which is exactly what happened for the whole life
   of the document.
2. **A file in two seconds beats an inbox later.** The athlete taps and has their training log. No
   delivery window, no spam folder, no "did it send?".
3. **§4.3 already left this open.** *"Delivery timing or mechanism (email attachment, download link,
   etc.)"* is named as something the screen does not define. §4.2's copy was the only place the email
   assumption was load-bearing, and it is the only thing this amendment moves.

**P9-A1-D1 — The confirmation copy names the file, not a delivery.** Replaces §4.2's sentence. It stays a
single toast, and it stays the only in-app feedback: no progress indicator, no delivery status, no export
history, exactly as §4.2 requires of whatever sentence sits there.

The toast reports **what is in the file** — workout count and set count — because the one thing that
sentence has to earn is letting an athlete tell a real export from an empty one. An athlete with nothing
logged is told so plainly rather than handed a file and left to wonder.

**P9-A1-D2 — The toast names what is NOT in the file.** *"Photos aren't included."* An export that
quietly omits things is worse than one that admits it: the athlete cannot tell the difference, and
"I exported my data" is a claim they may go on to rely on.

---

## 2. Format — CSV, one row per set

§4.3 leaves format undefined, so this records the choice rather than amending anything.

**P9-A1-D3 — One tap produces one CSV file.** `forge-legacy-YYYY-MM-DD.csv`, oldest workout first, one row
per set, columns `Date · Workout · Activity · Exercise · Set · Weight · Unit · Reps · Duration · Distance ·
Distance unit · Notes`.

- **CSV over JSON** because the gap this closes is *portability*. It is the shape every lifting tracker
  imports and the shape a person can open. An export only a programmer can read is not really an export.
- **One file** because P-9 §2 allows exactly one row and forbids configuration. A format chooser would
  make the smallest screen in the app into a settings surface.
- A **JSON archive** would be the better lossless answer and is a named follow-up, not a silent omission.

**P9-A1-D4 — A workout with no exercises still exports a row.** A run or a walk carries its own distance
and duration. Without this rule a runner's export would be an empty file, and they would reasonably
conclude we had lost their training.

**⚠ P9-A1-D5 — The export is never capped.** Every other history read in this app limits its rows because
a screen renders them. Here a cap is a defect: an export that silently stopped at 200 workouts would tell
an athlete they had less training than they do, and nothing would show them otherwise.

---

## 3. What this does to the Terms

`domain/settings/content.ts` records that the Terms' "export or delete" was amended down to "delete"
because promising a control that does not exist is worse in a legal document than anywhere else — and it
says in as many words that *"if a data export is built, this sentence is where it gets its promise back."*

**P9-A1-D6 — The Terms sentence may now say "export or delete" again.** ⚠ Not done in this pass. The copy
change belongs with a Terms review, not smuggled in beside a build, and is listed here so it is owed
rather than forgotten.

---

## 4. As built — 2026-09-04

| File | What it is |
|---|---|
| `src/domain/settings/export-core.ts` | **new** — pure: RFC 4180 escaping, the CSV shape, filename, counts |
| `src/domain/settings/__tests__/export-core.test.mjs` | **new** — 15 tests |
| `src/data/export-live.ts` | **new** — the uncapped read, ordered oldest first |
| `src/lib/save-file.ts` · `save-file.web.ts` | **new** — share sheet / browser download, one signature |
| `src/app/account-settings.tsx` | the P-9 row, the handler, the toast |

**⚠ The column list is a reliability decision.** `activity-live.ts` records the rule: *"Selecting a column
that might not exist fails the WHOLE query."* The read takes the `0001` spine plus `0096`'s conditioning
columns and stops. `modality` (0097), `floors` (0151) and `route`/`climb_m` (0162) are all applied and all
omitted — being wrong there costs the athlete their entire export rather than one column.

**⚠ Embedded rows are sorted client-side.** PostgREST does not order embeds, so exercises and sets are
sorted by `position` and `set_index` after the fetch. An export whose exercises shuffle between two runs
looks untrustworthy even when every number in it is right.

**A UTF-8 BOM is written on the web path.** Excel on Windows reads a UTF-8 CSV as the system codepage
without one, so a curly apostrophe or an accent arrives mangled. Every other reader ignores it.

**Gates:** `tsc --noEmit` clean · `expo lint` at baseline (1 pre-existing error, 14 pre-existing warnings)
· **3224 tests pass, 0 fail**.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-04 | Moved §4.2's confirmation copy off "we'll email it" and onto a file handed over directly, on the grounds that the email mechanism is undeployable from this project and had kept a locked row unbuilt since the spec was written. Recorded the CSV format, the uncapped read, and the no-exercises row rule under §4.3's existing latitude. Left §2, §3, §4.1 and §4.3 untouched. Flagged the owed Terms restoration (P9-A1-D6) rather than making it here. |
