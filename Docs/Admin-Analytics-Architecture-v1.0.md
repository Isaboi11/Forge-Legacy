# Admin Analytics Architecture v1.0

**Status:** LOCKED
**Date:** 2026-08-11
**Owner:** Product
**Governs:** the operator-facing `/admin` dashboard, the `app_admins` gate, and every `admin_*` RPC.
**Governed by:** `Product-DNA.md`, `P-6-Privacy-Architecture.md`, `Challenge-System-Architecture-v1.0.md` §13, `Squad-System-Architecture-v1.0.md` §13.

---

## 1. What this is, and why it needs its own document

Forge Legacy has 128 migrations of fully-timestamped, user-scoped state and **no way for the operator of the service to read any of it in aggregate**. There is no telemetry, no admin role, no metrics surface, and — deliberately — no service-role key anywhere in the repository.

That gap is not an oversight in the locked architecture; it is a subject the locked architecture never addressed. Every existing document that says the word "analytics" is talking about an **athlete-facing product surface**, and almost always to forbid something. None of them contemplated the operator.

This document supplies the missing authority, and — more importantly — draws the line that keeps an operator dashboard from becoming the thing those documents forbid.

**AA-D1.** An operator analytics surface exists. It is `/admin`, it is gated on an `app_admins` table in Postgres, and it is the only surface in the product permitted to read population-wide aggregates.

---

## 2. Why this does not breach the locked Firewalls

Two locked provisions look, at first reading, like they prohibit this.

**`Challenge-System-Architecture-v1.0.md` §13 (CS-D22.4/22.5) — the Performance Firewall.** It states as a binding correctness test that no surface *other than* the C-series, the owning squad's Competitions section, and its Analytics summary line may **render challenge performance data** — and it enumerates the surfaces it is protecting: S-1 squad cards, the S-2 member list, the Limited Athlete Profile, Today's Check-ins, another squad's S-2 page, the Friends Feed, Community surfaces. CS-D22.5 scopes every challenge query to the challenge's roster set, "and the requester must belong to that scope."

**`Squad-System-Architecture-v1.0.md` §13 (SQ-D13).** Squad-level analytics are display-only — workouts, participation, streak, goal progress, mission completion, competition record — and "no advanced analytics."

**Neither provision reaches `/admin`, for three reasons:**

1. **It is not in their vocabulary.** Both rules enumerate the athlete-facing surfaces they bind. `/admin` is not a squad surface, a friends surface, a community surface, or a C-series screen. It did not exist to be enumerated, and it is not a member of the category being regulated.
2. **It renders no athlete's performance to another athlete.** That is the harm both Firewalls are built to prevent — a peer seeing what a peer lifted, outside the one context where both consented to compete. `/admin` renders population aggregates to the operator of the database.
3. **The requester is not a peer in a roster.** CS-D22.5's scoping rule presumes a requester who is *inside* the social graph. The operator is outside it, in the same way the person holding the SQL editor is already outside it.

SQ-D13's "no advanced analytics" is a bar on what the **Squad page may show its members**. It is a rule about a product screen. It is not, and was never written as, a constraint on the operator of the service reading their own database.

---

## 3. The three constraints that keep that argument honest

The reasoning in §2 is only sound while all three of the following hold. **They are binding, and they are the reason this document exists rather than a code comment.**

**AA-D2 — No per-athlete drill-down.** Every `admin_*` RPC returns population aggregates. No RPC returns a named athlete beside a volume number, a challenge standing, a leaderboard position, or a rank. Histograms, distributions and counts; never a roster.

> *Why:* a per-athlete performance view is the exact artefact the Performance Firewall exists to prevent, and the fact that only one person can open it does not change what it is. If such a view is ever wanted it requires its own amendment to this document, its own decision id, and its own reasoning — it does not arrive as an incremental feature of a screen that already exists.

**AA-D3 — No admin metric may flow back into a product surface.** `admin_content_popularity` produces a popularity ranking of exercises. `Social-Architecture-Amendment-003` bars any ranking by engagement or popularity in athlete-facing discovery, and `0114_athlete_search.sql` carries that rule in its header. Rendering "most popular exercises" in the Exercise Library would be a direct breach of a locked decision, arrived at sideways.

> The output of these RPCs is for the operator's screen. It informs what gets built. It is never itself shipped.

**AA-D4 — No new athlete-visible read path.** Nothing in this system widens an RLS policy, relaxes a `with check`, or adds a column to a world-readable table. Specifically: `profiles_read` is `using (true)` and is not touched, and no presence or activity column is added to `profiles` (see §5).

---

## 4. The gate

**AA-D5.** Authorisation is a row in `public.app_admins`, checked by `public.is_app_admin()`, enforced by `public.admin_guard()` as the **first statement of every `admin_*` function body**.

Three layers, each sufficient alone:

| Layer | Mechanism | What it stops |
|---|---|---|
| Grant | `revoke execute … from public` + `grant … to authenticated` | The anon key cannot invoke an `admin_*` RPC at all, including by hand-crafted POST. |
| Guard | `perform public.admin_guard()` | A signed-in non-admin gets `42501 not authorized` — **not an empty result**. |
| Route | `<Stack.Protected>` + a redirect on a failed `is_app_admin()` | Nothing. It is convenience. |

**The route layer is cosmetic and must always be described as such.** `expo-router` compiles every route into the bundle and `app.json` sets `web.output: "static"`, so `/admin` will exist as a public URL on `forgelegacy.expo.app` whatever we do. The security boundary is the database. A design that depended on the URL being secret would already be broken.

**AA-D6 — `app_admins` has RLS enabled and zero policies.** That is deny-by-default for anon and authenticated alike. It is not an omission, and a future migration must not "fix" it by adding an owner policy. `profiles_read` is `using (true)`, so the profile table is already world-readable; the one table that must never become joinable to it is the list of who holds the keys.

**AA-D7 — Admin is granted by hand, in the SQL editor. There is no in-app management screen and there will not be one.** A UI for granting admin is a UI for escalating privilege, and the population of admins is one. If the last row is deleted, the SQL editor is the only way back — which is acceptable, because the SQL editor belongs to the same person.

---

## 5. Data collection

**AA-D8 — Phase 1 collects nothing.** Every Phase 1 metric is computed from state the athlete already created by using the product: signups, workouts, sets, programs, goals, squads, challenges, honors. No new write, no new column on any athlete-facing table, no client change.

**AA-D9 — Phase 2 collects first-party product-usage events, and cannot ship before its disclosure does.** `P-6-Privacy-Architecture.md` §6 Open Question 3 records that there is "no existing authority either way" on analytics disclosure, and `Docs/Legal/Privacy-Policy.md` currently promises that no third-party analytics or tracking tools exist. That promise stays true — nothing third-party is introduced — but the policy must state what *is* collected before the first event is written. The authority is supplied by `P-6-Amendment-001-Product-Analytics`, and the ordering is not negotiable: **amendment and policy edit land first, table and emitter second.**

**AA-D10 — Presence lives on its own table, never on `profiles`.** Adding `last_active_at` to `profiles` would publish every athlete's last app-open time to the public internet, because `profiles_read` is `using (true)`. That is a materially worse exposure than the timezone already there, because presence is a social signal. `athlete_activity` is owner-scoped and read by `admin_engagement` as SECURITY DEFINER.

**AA-D11 — Event payloads are allowlisted, never free text.** No workout names, notes, handles, photo URLs, search queries, or location. Ids, enums, booleans and numbers only. This is what makes the sentence in the privacy policy literally true rather than aspirational.

---

## 6. Honesty rules for the numbers

A dashboard that misleads its only reader is worse than no dashboard, because it is acted on. Four failure modes are known and are handled in the payload rather than left to the renderer:

- **A cohort cell beyond a cohort's age is UNKNOWN, not 0%.** Every cohort carries `max_k`; cells past it render as bare surface, never as the first step of the ramp.
- **The current week is partial and always dips.** The payload carries `current_week` so the column can be greyed and labelled. Left alone, this makes the reader conclude retention is collapsing when in fact it is Tuesday.
- **The last funnel stage has its own denominator.** An athlete who signed up yesterday cannot have returned in week two. Counting them in the base makes the final stage a function of growth rate, which is the opposite of what a funnel is for.
- **"Active" has a stated definition that changes.** In Phase 1 it means "saved a workout"; in Phase 2 it becomes "opened the app". Every payload carries `active_def` so the screen can say which, and so the meaning change is visible rather than silent.

---

## 7. Decision ledger

| ID | Decision |
|---|---|
| AA-D1 | An operator analytics surface exists at `/admin`, gated on `app_admins`. |
| AA-D2 | No per-athlete drill-down. Population aggregates only. |
| AA-D3 | No admin metric may flow back into an athlete-facing product surface. |
| AA-D4 | No new athlete-visible read path; no RLS policy is widened. |
| AA-D5 | Three-layer gate; `admin_guard()` first in every function body. |
| AA-D6 | `app_admins` is RLS-on with zero policies, deliberately. |
| AA-D7 | Admin granted by hand in the SQL editor; no management UI. |
| AA-D8 | Phase 1 collects nothing new. |
| AA-D9 | Phase 2 disclosure ships before Phase 2 collection. |
| AA-D10 | Presence on `athlete_activity`, never on `profiles`. |
| AA-D11 | Event props allowlisted; no free text, ever. |

## 8. Reconciliation

| Document | Relationship |
|---|---|
| `Challenge-System-Architecture-v1.0.md` §13 | Unchanged. §2 explains why `/admin` is outside its scope; AA-D2 keeps it that way. |
| `Squad-System-Architecture-v1.0.md` §13 | Unchanged. SQ-D13 binds the Squad page, not the operator. |
| `P-6-Privacy-Architecture.md` §6 Q3 | Closed by `P-6-Amendment-001-Product-Analytics` (Phase 2). P-6 itself is not edited. |
| `Docs/Legal/Privacy-Policy.md` | Edited in Phase 2, before collection begins. The "no third-party analytics" claim survives intact. |
| `Social-Architecture-Amendment-003` | Unchanged, and AA-D3 exists specifically to protect it. |
| `Monetization-Architecture-Amendment-001` | Unaffected. "Advanced analytics" there is a deferred *athlete-facing premium feature*; this is an operator surface and is not part of any tier. |
