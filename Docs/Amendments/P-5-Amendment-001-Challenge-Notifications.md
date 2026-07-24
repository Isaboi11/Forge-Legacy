# Forge Legacy — P-5 Amendment 001
## Challenge Notifications Category
### June 2026

**Status:** LOCKED

**Type:** Architecture Amendment (adds one notification category to the locked P-5 architecture. Reuses P-5's existing grouped-toggle, push-delivery-only model verbatim.)

**Target document:** `P-5-Notifications-Architecture.md` (LOCKED v1.0)

**Authority:** Comparison-Philosophy-Amendment-001.md (LOCKED) — CC-D1, CC-D3 (anti-shame guardrails, guardrail 4: no failure notifications); P-5 §1 (ceremonies never push; toggles control push delivery only), §3 (grouped controls, ambient-activity-OFF default principle), §4 (toggles never hide underlying surfaces).

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Purpose

The approved Challenge System requires challenge notifications ("you moved into 1st place," "challenge ends tomorrow," etc.). P-5 currently has two grouped sections (Squad Activity, Requests) plus a non-toggleable note, and — by its central audit finding — every existing notification traces to a locked source; ceremonies never push.

Challenge notifications are a genuinely new push register (the first competitive notifications in the product). This amendment adds them as a new grouped category under P-5's existing model, and binds their tone to CC-D3's anti-shame guardrails. It invents no new notification mechanics beyond what P-5 already establishes.

---

## Decision P5-D1 — New Section C: Challenges

### Statement

**Locked:** P-5 gains a third grouped section, **Challenges**, exposing push-delivery control for challenge notifications. All rows default **OFF**, consistent with P-5's ambient-activity-OFF principle (§3.1) — challenge activity is ambient broadcast, not a direct request awaiting response.

### Rules

1. **Section C — Challenges** sits alongside Section A (Squad Activity) and Section B (Requests).

| Setting | Type | Default | Covers |
|---|---|---|---|
| Challenge Updates | Toggle | **OFF** | Challenge lifecycle pushes the athlete has consented to by joining: standing changes, "ends tomorrow," challenge started/completed |

2. **Single toggle, not a matrix.** Consistent with P-5's stated preference for grouped controls over a large toggle matrix, the Challenges section is one toggle. Per-event granularity is not invented (same reasoning P-5 applied to Workout Tags and to WSR-001's single squad toggle).
3. **Default OFF rationale:** challenge updates are ambient activity broadcasts, matching Section A's OFF default — not direct requests like Section B (which default ON). An athlete who wants competitive nudges opts in.
4. **Scope gate (CC-D1):** these notifications fire only for challenges the athlete has **opted into**. A non-participant receives nothing — there is no challenge notification to a member who did not join (also satisfies CC-D3 guardrail 1, non-participation invisible).

---

## Decision P5-D2 — Anti-Shame Notification Tone (binding)

### Statement

**Locked:** Per CC-D3 guardrail 4, no challenge notification may deliver in-the-moment failure. Notification copy is neutral or positive only.

### Rules

1. **Permitted:** positive/neutral framing — "You moved into 1st place," "You entered the Top 3," "Challenge ends tomorrow," "Challenge complete — see the final standings."
2. **Prohibited as written:** failure-framed pushes. A "[Name] passed you" alert is permitted **only** if reframed to neutral ("Standings updated in [Challenge]") **or** placed behind a separate, explicitly opt-in sub-preference. It must never be a default, failure-toned push.
3. No challenge notification names a member as losing, last, or falling behind.
4. This tone rule is binding on the net-new Challenge architecture's notification copy, not merely a P-5 setting.

---

## Decision P5-D3 — Reuse of P-5's Existing Model

### Statement

**Locked:** The Challenges section inherits P-5's established notification semantics without modification.

### Rules

1. **Toggles control push delivery only** (§4). Turning Challenge Updates OFF never hides the in-app Challenge surfaces, standings, or feed — those remain visible in the Challenge context regardless of push state. (Same principle as Squad Check-ins and Workout Tags.)
2. **Field naming deferred to backend/data architecture** (the P-8/P-5 precedent): this amendment requires that a challenge-notification preference exist and be readable/writable by P-5; it does not lock a field name, enum, or schema.
3. **No central notification tray** is introduced — P-5's confirmed absence of a notification center is unchanged.

---

## Impacted Locked Documents

| Document | Required change | Status |
|---|---|---|
| `P-5-Notifications-Architecture.md` | Add Section C (Challenges) to §3; add a Challenge Updates row to the §2 inventory and §4 state matrix; note the CC-D3 tone constraint; re-lock as v1.1 | Pending (→ v1.1) |
| P-5 Notifications wireframe spec (when authored) | Render three grouped sections instead of two | Pending (P-5 wireframe not yet authored) |

---

## Non-Behaviors

- **No per-event toggle matrix** — one Challenges toggle (P-5 grouped-control principle).
- **No notification to non-participants** — only opted-in members receive challenge pushes (CC-D1/CC-D3).
- **No failure-framed push** — neutral/positive copy only (P5-D2 / CC-D3).
- **Toggle never hides in-app surfaces** — push control only (§4 unchanged).
- **No notification center / tray** introduced.
- **Ceremonies still never push** — challenge *honors* (Honor-Catalog-Amendment-001) surface in-app via M-2 rules, not as pushes.

---

## Validation Checklist

- [ ] P5-D1 — Section C (Challenges) added; single "Challenge Updates" toggle; default OFF
- [ ] P5-D1 — notifications fire only for joined challenges; non-participants receive none
- [ ] P5-D2 — notification copy neutral/positive; no failure framing; "passed you" only if neutralized or separately opt-in
- [ ] P5-D3 — toggle controls push delivery only; in-app Challenge surfaces unaffected by toggle state
- [ ] P5-D3 — field naming deferred to backend; no tray introduced
- [ ] Challenge honors still surface via M-2 (no push), per Honor-Catalog-Amendment-001

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Adds a third P-5 grouped section, Challenges, with a single Challenge Updates toggle defaulting OFF (ambient-activity principle); fires only for opted-in challenges; binds notification tone to CC-D3's no-failure-notification guardrail; reuses P-5's push-delivery-only, no-tray, field-name-deferred model verbatim. P-5 re-lock to v1.1 pending. |

---

*Forge Legacy — P-5 Amendment 001 (Challenge Notifications Category)*
*v1.0 — June 2026*
*Authority: Comparison-Philosophy-Amendment-001.md (LOCKED); P-5-Notifications-Architecture.md (LOCKED v1.0)*
*Status: LOCKED*
