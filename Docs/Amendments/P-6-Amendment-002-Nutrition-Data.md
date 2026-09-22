# Forge Legacy — P-6 Privacy Architecture Amendment 002
## Nutrition Data
### Status: Locked | 2026-09-21

**Authority:** `P-6-Privacy-Architecture.md` (LOCKED) · `Nutrition-Architecture-v1.0.md` **NUT-D7** (PO,
2026-09-21 — *"private by default; sharing is always explicit"*) · `P-6-Amendment-001-Product-Analytics.md`
**Closes:** the gap that P-6 says nothing about nutrition or health data (Nutrition Architecture §13 row 8)
**Scope:** P-6 § 4 Visibility Rules Matrix (new rows) · `Docs/Legal/Privacy-Policy.md` (owed, see §6) ·
the App Store privacy label · every nutrition migration

---

## Section 1 — Why this exists

P-6 was written before Forge did nutrition. It covers profile, Legacy, honours, goals and workouts, and it
has no row for what an athlete eats, what they weigh against a target, or a photo of their dinner. Nutrition
is a new sensitive-data category, and it has to be private by default (NUT-D7).

**The scope is narrow on purpose.** P-6 § 1's guardrail holds: *"P-6 is a presentation surface, not a new
system."* This amendment adds **no toggle**. Nutrition privacy comes from the schema itself, with no setting
that could be set wrong. The test-phase migration `0189_testing_defaults_open`, which opened every
visibility setting to `everyone`, **cannot reach nutrition**, because nutrition has no visibility setting
to open.

---

## Section 2 — Decisions

**P6-A2-D1 — Every nutrition table is owner-only.** RLS: the athlete can select, insert, update and delete
their own rows, and nobody else can do anything. This covers food log entries, targets, preferences,
custom foods, saved meals, the athlete's own recipes, meal plans and grocery checks. There is no
squad-member policy, no friend policy, and no `SECURITY DEFINER` read path for another athlete.
`food_catalog` (USDA) and the Forge recipe library are public reference data, and they are the only
exceptions.

**P6-A2-D2 — No nutrition visibility setting exists.** No toggle, no `visibility` key, no default to
flip. Nothing appears to anyone else unless the athlete deliberately posts it (D4).

**P6-A2-D3 — Meal photos live in a new private bucket.** Forge's photo buckets are public by PO decision
(`project-photo-buckets-public-by-decision`), and that decision is **not** extended to food. Meal photos
go in their own **private** bucket and are read through signed URLs. If an athlete shares a meal (D4),
the photo is **copied** into the post's media at that moment. The private original is never exposed.

**P6-A2-D4 — Sharing is one deliberate act per item.** A meal, a recipe or a meal-prep session can become
a squad post only through the composer, one post at a time. A post **never carries** calories, macros,
bodyweight, targets, adherence, streaks or eating history. It can't carry them because the post type has
no fields for them, so this is a rule the schema enforces.

**P6-A2-D5 — Nutrition never feeds another surface automatically.** No nutrition line appears on the
Limited Athlete Profile, in squad presence or Live Now, in the notification feed, in challenges, or in
search. Honours earned from nutrition follow the existing honours rules and never state an intake figure.

**P6-A2-D6 — Analytics carry no food.** P6-A1-D3 already covers this, and it is restated here because food
names are the most tempting leak: no food name, search query, barcode, brand or photo URL in any
`app_events` payload. Event types and counts only.

**P6-A2-D7 — Model calls send only what the question needs.** When Holt AI answers a nutrition question
(Phase 4), the request carries the relevant totals and plan, without the athlete's name, handle or photo.
It goes through the existing Edge Function, never from the device. No provider receives nutrition data for
training or advertising (as P6-A1-D2 already requires).

**P6-A2-D8 — Deletion and export include nutrition.** Account deletion removes every nutrition row and the
private meal-photo objects. Data export includes the food log, targets and recipes.

---

## Section 3 — P-6 § 4 matrix, new rows

| Content | Default Visibility | Squad Members See | Outside Users See | Controlled By |
|---|---|---|---|---|
| Food log, targets, adherence, intake history | Private | Nothing | Nothing | No control — no exposure surface exists (P6-A2-D1/D2) |
| Nutrition preferences (diet, allergies, dislikes, kitchen, budget, store, household) | Private | Nothing | Nothing | No control — no exposure surface exists |
| Meal photos | Private (private bucket) | Only a copy the athlete posts | Nothing | Per-post composer (P6-A2-D3/D4) |
| Recipes the athlete wrote | Private | Only a recipe the athlete posts | Nothing | Per-post composer |

---

## Section 4 — Third-party data sources

Food *reference* lookups (USDA, Open Food Facts, FatSecret) send only a search term or a barcode, **never
an athlete identifier**. Open Food Facts lookups run from the device (Nutrition Architecture §4) and so
carry the device's IP address like any web request. FatSecret lookups go through an Edge Function, so the
athlete's IP address never reaches FatSecret.

---

## Section 5 — What this does not do

It adds no consent framework, no per-field permission model, and no HealthKit or Google Fit sync. A
future sync is a separate amendment, and it must state which direction data flows and what leaves the
device.

---

## Section 6 — Application checklist

| # | Surface | Change | Status |
|---|---|---|---|
| 1 | `P-6-Privacy-Architecture.md` § 4 | Banner pointing to § 3 of this amendment | ✅ 2026-09-21 |
| 2 | `Docs/Legal/Privacy-Policy.md` | Nutrition section: what is stored, that it is private, the private photo bucket, third-party lookups (§ 4), deletion | ☐ **before Phase 1 ships** |
| 3 | App Store privacy label | Add *Health & Fitness* (linked to the user, not used for tracking) | ☐ with the Phase 1 binary |
| 4 | Nutrition migrations | Owner-only RLS on every table; the private bucket; a test asserting another athlete reads 0 rows | ☐ Phase 1 |
| 5 | `Nutrition-Architecture-v1.0.md` §13 row 8 | → this amendment | ✅ 2026-09-21 |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-21 | Written from NUT-D7. Closes the P-6 nutrition gap. |
