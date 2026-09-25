# Forge Legacy — Nutrition Architecture Amendment 004
## Community Foods: a barcode one athlete adds, every athlete finds
### Status: LOCKED | 2026-09-25 — PO answered §4 the same day

**Authority:** `Nutrition-Architecture-v1.0.md` §4 (sources) · **NUT-D7** (*"private by default; sharing is
always explicit"*) · `P-6-Amendment-002-Nutrition-Data.md` **P6-A2-D1** (owner-only tables) and **P6-A2-D4**
(*sharing is one deliberate act per item*) · App Store Guideline **1.2** (user-generated content) and the
`0171`/`0173` filter that answers it
**Origin:** PO, 2026-09-25 — *"how do we get as robust as MyFitnessPal?"* → *"I would say so"* to sharing
scanned foods with other athletes.
**Scope:** `food-search` (a fourth source) · Create Food (one choice) · Food Detail (one report control) ·
one new table · the Privacy Policy's nutrition section

---

## Section 1 — Why

MyFitnessPal's advantage is not better data. It is **~20 million entries its users typed in over fifteen
years.** Forge asks USDA, FatSecret and Open Food Facts live (2026-09-25: all three in parallel), and a
barcode none of them knows ends in Create Food. Today that food is then private to the athlete who typed it.
The next athlete to scan the same bar hits the same miss.

**The fix is to keep what a miss produces.** Every miss becomes, at most once, a food the next scan finds.
The catalogue grows with use and costs nothing.

**And Forge's entries can be cleaner than MyFitnessPal's.** Theirs are hand-typed. Ours are usually read off
the label by Scan label (`Scan Nutrition Label v2.dc.html`), checked by `label-read.ts`'s %DV and
self-consistency rules, and confirmed by a human before saving.

---

## Section 2 — What it is

1. An athlete scans a barcode and **nothing is found**. Create Food opens with "No barcode match" (A2).
2. They fill the food, usually with Scan label, and save it.
3. **If they choose to share it** (§3 CF-D1), a copy goes to `community_foods` under that barcode.
4. The next athlete who scans that barcode gets it back from `food-search`, marked
   **"Added by Forge athletes"**, beside any USDA / FatSecret / Open Food Facts answer.
5. Anyone who sees wrong numbers taps **"Numbers look wrong?"** on Food Detail. Enough reports hide the
   entry until it is reviewed.

---

## Section 3 — Decisions

**CF-D1 — Sharing is a choice made on the food, never a setting.** Create Food shows one control, only when
the food has a barcode: *"Share with Forge — the next person who scans this finds it."* No account-wide
toggle exists (P6-A2-D2 holds). This is P6-A2-D4's "one deliberate act per item", so **P-6 needs no
amendment.** The box starts **ticked** (§4 Q1).

**CF-D2 — Only barcoded foods can be shared.** A barcode is what makes a food the same product for everyone.
"Mum's lasagna" and "overnight oats" are personal and have no control to share them.

**CF-D3 — The shared copy is anonymous and is a copy.** `community_foods` holds the product: barcode, name,
brand, serving, per-100 g numbers, the per-serving micros the label printed, and how it was entered
(`label_scan` / `typed`). The contributor's id is kept **for moderation only**: no policy lets any athlete
read it, and nothing on screen names who added a food. Editing or deleting the athlete's own food never
changes the shared copy (their private row stays theirs, P6-A2-D1).

**CF-D4 — A food must pass the gate to be shared.** Server-side, before insert:
calories within 20% of 4P + 4C + 9F (`checkCalories`' rule); every value under `label-read.ts`'s per-serving
ceilings; name and brand through the same `0171` filter that guards handles (Guideline 1.2); a real
GTIN check digit. A food that fails is **saved privately anyway** and the athlete is told why it was not
shared. It is never silently dropped.

**CF-D5 — Where it ranks.** `food-search` adds `community` as a fourth parallel source. The existing rule
applies: a row with all three macros beats one without. Order among complete rows: **USDA → FatSecret →
Community → Open Food Facts.** Community ranks above Open Food Facts because it came from a label photo a
person confirmed, where much of OFF is unverified. When two athletes add the same barcode and their numbers
agree (within 5%), the entry is marked **confirmed**. When they disagree, the one more athletes agree with
is shown.

**CF-D6 — Reporting and hiding.** Food Detail on a community food shows *"Numbers look wrong?"*. A report
needs no text. **Three reports from different athletes hide the entry** until the admin dashboard (`/admin`)
restores or deletes it. An athlete's own report hides it for them at once. The reporter's identity is
moderation-only, the same as the contributor's.

**CF-D7 — Label photos are not stored.** Scan label's photo stays on the phone (A5 reads it locally). The
shared entry carries only numbers. Revisit if moderation needs evidence (V2).

**CF-D8 — Counts and quota.** Nothing here calls a paid API. A community hit is answered from Postgres
before USDA/FatSecret are needed, so it **saves** FatSecret calls against the 5,000/day ceiling
(Architecture §4).

---

## Section 4 — Decisions the PO made (2026-09-25: "Yes / Yes / Not yet / Yes")

| # | Question | Decision |
|---|---|---|
| Q1 | Does "Share with Forge" start **ticked**? | ✅ **Ticked (PO).** It only appears on a barcoded food the databases missed, where sharing is plainly the point. The choice is visible, labelled, and one tap undoes it. The PO accepted this reading of NUT-D7 knowingly: the act is still per item and on screen. |
| Q2 | When an athlete **deletes their account**, do their shared foods go too? | ✅ **Kept (PO).** They are anonymous facts about a product, not about the athlete. Deletion severs the contributor id. The Privacy Policy must say so. |
| Q3 | Send shared foods **on to Open Food Facts** as well? | ✅ **Not yet (PO).** ODbL share-alike and their contribution API are a separate licence read. Revisit once the table has volume. |
| Q4 | Can Free athletes contribute, or Premium only? | ✅ **Everyone (PO).** Barcode is free (MA6-D8), and every contributor makes the product better for paying users. |

---

## Section 5 — What gets built

| Piece | Where | Notes |
|---|---|---|
| `community_foods` + `community_food_reports` | new migration | RLS: select for authenticated **excluding** `contributor_id`/`reporter_id` (a view or column grants); insert only via a definer RPC that runs CF-D4 |
| `share_community_food(...)` RPC | same | the gate; returns `shared` / `reason` |
| `report_community_food(key)` RPC | same | CF-D6; idempotent per athlete |
| `food-search` fourth source | `supabase/functions/food-search` | parallel with the three; `source: 'community'`; attribution "Added by Forge athletes" |
| Create Food control | `src/app/create-food.tsx` | the CF-D1 checkbox under the form when `gtin` is known (passed from the barcode miss) |
| Food Detail report | `src/app/food-detail.tsx` | a text link on `community` foods only |
| `/admin` queue | admin dashboard | hidden entries: restore / delete |
| Privacy Policy | `Docs/Legal/Privacy-Policy.md` nutrition section | what is shared, that it is anonymous, Q2's answer |
| Tests | domain + SQL (PGlite, as `0214` was) | the gate, the anonymity (another athlete reads no contributor id), the 3-report hide |

**Needs a new build?** No. Everything is JS, SQL and the Edge Function.

---

## Section 6 — Revision history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-25 | Proposed. Concept approved by the PO; §4 Q1–Q4 open. |
| 1.0 | 2026-09-25 | LOCKED. PO: ticked by default · kept on account deletion · not to Open Food Facts yet · everyone can share. |
