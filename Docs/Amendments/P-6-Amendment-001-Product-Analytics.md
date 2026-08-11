# Forge Legacy — P-6 Privacy Architecture Amendment 001
## First-Party Product Analytics
### Status: Locked | 2026-08-11

**Authority:** `P-6-Privacy-Architecture.md` (LOCKED, June 2026) | `Admin-Analytics-Architecture-v1.0.md` (LOCKED, 2026-08-11) | `Product-DNA.md`
**Supersedes:** P-6 § 6 Open Question 3, which is CLOSED by this amendment
**Scope:** P-6 Profile Visibility (a third toggle), `Docs/Legal/Privacy-Policy.md`, and migration 0131

---

## Section 1 — Why this exists

P-6 § 6 Open Question 3 says, in as many words:

> Legal/analytics-disclosure controls (e.g. CCPA "Do Not Sell," ad-tracking opt-out). **No existing authority either way anywhere in the docs.** Flagged as needing product/legal confirmation before launch.

That question was correct to be open and is now answerable, because the product has changed: an operator dashboard exists (`Admin-Analytics-Architecture-v1.0.md`, AA-D1), and its Phase 2 collects information the athlete did not create by training. Nothing in the locked corpus permitted that, and nothing forbade it. This amendment supplies the missing authority and draws the boundary.

**It is deliberately narrow.** P-6 § 1's governing guardrail — *"P-6 is a presentation surface, not a new system"* — still holds. This adds one toggle to that surface. It does not introduce a `PrivacySettings` entity, a consent framework, or a per-field permission model, and a future amendment must not read it as licence for one.

---

## Section 2 — What is permitted

**P6-A1-D1 — First-party product analytics are PERMITTED.** The app may record which screens are opened and which features are used, in Forge Legacy's own Supabase database, for the sole purpose of deciding what to build, fix, or remove.

**P6-A1-D2 — Third-party analytics and advertising SDKs remain PROHIBITED.** No Google Analytics, Firebase, Amplitude, Mixpanel, Segment, or any successor. No ad network, no ad identifier, no cross-app or cross-site tracking, no data broker. This prohibition is permanent and is not a limit that a later revision may relax for convenience; reversing it requires a new amendment that says so explicitly and a privacy-policy change that ships first.

> The distinction that makes both statements true at once: the privacy policy's strongest claim is *"nothing follows you."* An event row in our own database does not follow anybody anywhere. An SDK does.

**P6-A1-D3 — Collection is ALLOWLISTED, never free text.** An event payload may contain identifiers, enumerated values, booleans and numbers. It may **never** contain workout names, notes, reflections, handles, search queries, photo URLs, message bodies, or any other text the athlete authored. Enforced by a pure `sanitizeProps()` at the boundary (`src/domain/analytics/props-core.ts`), tested, so the rule is a property of the code rather than a habit.

**P6-A1-D4 — Location is untouched.** P-6 § 4 and Privacy Policy § 4 stand unchanged: coordinates are read on device, never transmitted, never stored. No analytics event carries a coordinate, a place name, or an IP-derived region.

---

## Section 3 — The third toggle

P-6 hosted exactly two toggles and its § 1 said so. It now hosts three.

| Toggle | Default | Owning authority |
|---|---|---|
| Let non-squad athletes find me in search | ON | Identity-Amendment-001 § 7.1 |
| Share workouts with my squad | OFF | WSR-001 |
| **Help improve Forge** | **ON** | **This amendment (P6-A1-D5)** |

**P6-A1-D5 — "Help improve Forge" defaults ON, with disclosure.** Turning it off stops event collection for that athlete from the next app launch.

> **Why ON rather than OFF.** The two existing toggles govern *what other people can see about you* — an exposure surface, where the conservative default is the only defensible one, which is why sharing workouts defaults OFF. This toggle governs nothing of the kind: no other athlete can ever see an event, and no event carries anything the athlete wrote. It is disclosed in the policy, in the app, and reversible in one tap. Defaulting it OFF would measure only the athletes who went looking for a setting, which is a biased sample that would inform worse product decisions while protecting nobody. **If the PO prefers the stricter reading, flipping this to OFF is a one-line change and nothing else in this amendment moves.**

**P6-A1-D6 — The toggle persists in `profiles.app_prefs` (0022) and is mirrored to AsyncStorage.** The mirror is not a cache for speed; it is what lets the emitter check consent **synchronously**, so no event can be queued in the window before a network read returns. Consent that is only known asynchronously is consent that gets ignored on launch.

---

## Section 4 — What is collected, exactly

Stated at field granularity, because § 5 requires the privacy policy to list it and a vaguer statement could not be checked.

| Field | What it is |
|---|---|
| `user_id` | The athlete's account id |
| `session_id` | A random id for one app session. Not stable across sessions, not a device id, not derived from hardware |
| `kind` | The event name, e.g. `screen_view`, `workout_started` |
| `screen` | The route path, e.g. `/workouts` |
| `props` | Allowlisted ids/enums/booleans/numbers (P6-A1-D3) |
| `occurred_at` | The device clock |
| `received_at` | The server clock — **every metric is computed from this one** |
| `platform`, `app_version` | ios / android / web, and the build |

**Presence** is recorded separately as `athlete_activity.last_active_at` — one row per athlete, overwritten on each launch. It is not an event log and carries no history of individual sessions.

**P6-A1-D7 — Presence is NOT stored on `profiles`.** `profiles_read` is `using (true)`, so anything on that table is world-readable to any holder of the anon key. A `last_active_at` column there would publish every athlete's last app-open time to the public internet — a presence signal, and materially worse than the timezone already there. `athlete_activity` is owner-scoped and read only by a `SECURITY DEFINER` function.

---

## Section 5 — Obligations that ship BEFORE collection

**P6-A1-D8 — The disclosure ships before the first event is written.** Not in the same release; before it. Concretely, `Docs/Legal/Privacy-Policy.md` must state what is collected, what is never collected, how long it is kept, and that it can be turned off — and that edit must be live before migration 0131 is applied.

> This ordering is the whole point of writing an amendment rather than a migration comment. A policy updated afterwards is a policy that was wrong for however long the gap lasted.

**P6-A1-D9 — Retention: 90 days raw, aggregates indefinitely.** Individual event rows are deleted after 90 days by a scheduled job. What survives is daily totals with no athlete attached. An analytics store that keeps raw rows forever has quietly become a permanent behavioural record, which is not what was disclosed.

**P6-A1-D10 — An athlete can read their own events.** Own-row `SELECT` on `app_events`, matching `push_outbox`'s precedent. This is what makes "you can see what we collect" true without building an export endpoint. There is no `UPDATE` and no `DELETE` policy: an append-only log the subject can rewrite is not a log. Deleting the account removes every row by FK cascade.

**P6-A1-D11 — Analytics failure is invisible to the athlete.** Every emitter path is wrapped; a failed batch is dropped, not retried forever; a missing table disables the emitter for the process. Nothing about measuring the product may degrade using it.

---

## Section 6 — CCPA / ad-tracking, answered

P-6 § 6 Q3 named two specific controls. Both are now answerable:

- **"Do Not Sell or Share" is not required**, because nothing is sold or shared. There is no ad network, no broker, no third-party recipient of behavioural data. Privacy Policy § 3 and § 7 already say so and remain true after this amendment.
- **An ad-tracking opt-out is not required**, because no advertising identifier is ever read (P6-A1-D2). There is nothing to opt out of.
- What *is* required, and is delivered here, is **disclosure plus a control** — § 5 and the P-6 toggle in § 3.

If Forge Legacy ever distributes in the EU/UK, GDPR adds a lawful-basis statement for this processing. That is flagged in the policy's own "Before You Publish" § 2 and is not resolved by this amendment.

---

## Section 7 — Decision ledger

| ID | Decision |
|---|---|
| P6-A1-D1 | First-party product analytics permitted |
| P6-A1-D2 | Third-party analytics and ad SDKs permanently prohibited |
| P6-A1-D3 | Allowlisted payloads; never athlete-authored text |
| P6-A1-D4 | Location handling unchanged |
| P6-A1-D5 | "Help improve Forge" toggle on P-6, default ON with disclosure |
| P6-A1-D6 | Persisted in `app_prefs`, mirrored to AsyncStorage for a synchronous check |
| P6-A1-D7 | Presence on `athlete_activity`, never on `profiles` |
| P6-A1-D8 | Policy edit ships before collection begins |
| P6-A1-D9 | 90-day raw retention; aggregates indefinite |
| P6-A1-D10 | Own-row read; no update, no delete; cascade on account deletion |
| P6-A1-D11 | Analytics failure never visible to the athlete |

## Section 8 — Reconciliation

| Document | Effect |
|---|---|
| `P-6-Privacy-Architecture.md` | **§ 6 Open Question 3 CLOSED.** § 1's "two toggles" becomes three; the guardrail that P-6 is a presentation surface is unchanged. The doc itself is LOCKED and is not edited in place — this amendment is the mechanism. |
| `Docs/Legal/Privacy-Policy.md` | Edited: short version, § 2 (a *Product usage* subsection), § 3 (the no-third-party bullet **stays** — it is still true — with one sentence beneath so § 3 does not contradict § 2). |
| `Admin-Analytics-Architecture-v1.0.md` | AA-D9 required exactly this amendment. Satisfied. |
| `Global-Search-Architecture-v1.0.md` § 269 | Unchanged and reinforced: search queries are named in P6-A1-D3 as text that is never collected. |
| `Monetization-Architecture-Amendment-001` | Unaffected. Operator analytics is not a tier feature. |
| `P-5-Notifications-Architecture` | Unaffected. No event triggers a notification. |
