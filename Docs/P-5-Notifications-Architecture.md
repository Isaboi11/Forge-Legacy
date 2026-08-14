# P-5 Notifications Architecture
## Architecture Specification — Notification Preferences Information Architecture
### June 2026

**Status:** LOCKED

**Type:** Screen Architecture (architecture-level, not a pixel wireframe — mirrors the role P-6-Privacy-Architecture.md and P-8-Subscription-Architecture.md played before their wireframe specs)

**Date:** June 2026

**Authority Chain:**
- WSR-001-Workout-Share-Result-Architecture.md (LOCKED) — Sections 3.2, 6.4, 6.5, 9.1 — owns Squad Check-ins and Squad Reactions
- Workout-With-Friend-Spec-WwF.md (LOCKED) — Sections 6.4, 7.1, 14.1, 14.2 — owns Workout Tags
- Squad-Management-Permissions-Spec-S3.md (LOCKED) — Sections 5.4, 11.1 — owns squad ownership transfer and squad deletion notifications
- Squads-Hub-Wireframe-Spec-S1.md (LOCKED) — Section 12.7 — confirms squad invitation notifications were explicitly deferred, not specified
- Rank-Up-Modal-Spec-M1.md, Honor-Earned-Modal-Spec-M2.md, M-4-Program-Graduated-Spec.md (all LOCKED) — each document's own Non-Behaviors section confirming no push notification is ever fired
- P-2-Progress-Hub-Spec.md (LOCKED) — Section 2 — the rejected in-app notification tray decision for sub-tier rank advances
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — entry point, modal stack behavior, pushed-screen header convention
- P-8-Subscription-Architecture.md (LOCKED) — establishes the concept-level field-naming precedent reused here

**Downstream Dependents:**
- P-5 Notifications wireframe spec (recommended immediately — see Section 7)
- Backend/data architecture (must define and expose Workout Tags and Squad Invitations notification preferences — see Section 3; this document states the requirement, not the implementation)

**Amendment Log:** v1.5 — added **Section F — Training** per `P-5-Amendment-003-Training-Briefing.md` (P5B-D1): one **Morning Briefing** toggle, default **OFF**, plus a delivery schedule (`briefing_schedule`: weekdays + local hour). Inventory item 22. **The first category in this document whose trigger names no person**, and therefore the first bounded narrowing of §1's "no marketing or re-engagement notification" finding — see §3.2e for the five conditions that bound it. Not a branch of `notification_events_for` and produces no `/inbox` row (P5B-D9). v1.4 — added **Squad Goal & Mission Updates** to Section A (Goal Completed, Mission Started, Mission Ending Soon, Everyone Checked In — merged into one new toggle, default OFF); relabeled "Squad Check-ins" → "Squad Feed Activity" and "Squad Reactions" → "Squad Reactions & Mentions" (same backing fields, expanded scope per `Squad-System-Architecture-v1.0` SQ-D12 — no schema change); reconciled Competition Started/Ending to the existing "Challenge Updates" toggle (no new toggle) and Honors Earned to the existing M-2 ceremony-only rule (no push, no toggle). v1.3 — added **Section E (Communities)** per `P-5-Amendment-002-Community-Notifications.md` (`Community-System-Architecture-v1.0` COM-D12): Replies & Mentions / Pinned Announcements / Event Reminders (default OFF); Membership Approval / Moderator Actions (non-toggleable, always ON); binding no-per-post-push rule; Community competitions route through the existing Challenges category, no new toggle. v1.2.1 — reconciliation pass for `Social-System-Architecture-v1.0`: reserved downstream Post Comments / optional Post Reactions notifications (§3.2c), no new locked toggle. v1.2 — added Section D (Friend Requests) per Friend-Relationship-Architecture-Amendment-001 FR-D7 (Requests-class, default ON). v1.1 — added Section C (Challenges) per P-5-Amendment-001. v1.0 LOCKED initial.

---

## Section 1 — P-5 Architecture Review

A full dependency audit was performed before any control was proposed, per this workstream's explicit instruction. The audit's central finding governs everything else in this document:

**Ceremonies are not notifications.** M-1 (Rank Up), M-2 (Honor Earned), and M-4 (Program Graduated) each explicitly list "fire as a push notification" under their own locked Non-Behaviors sections — meaning each document states outright that it does *not* do this. All three are in-app-only modals, consumed at the next W-17 load. M-3 (Goal Achieved) and M-5 (Chapter Sealing) don't mention push notifications at all, consistent with the same in-app-only pattern. A sub-tier rank advance went through its own explicit design decision (P-2-Progress-Hub-Spec.md §2) that *rejected* an in-app notification tray in favor of a silent UI badge on the Rank Journey Preview, specifically because "a dedicated notification tray feels disproportionate for a progress marker."

**Consequence:** Four of the commonly-expected notification categories — Honors, Rank Ups, Program Graduations, Goal Achievements — never reach this document as independent controls, because none of the underlying events ever produces a push notification directly. The only way any of these becomes a notification to anyone is if the athlete deliberately shares it via WSR-001's squad check-in mechanism. WSR-001 already governs that path with a single toggle (`squadNotificationsEnabled`) applied uniformly across all five of its share types (WORKOUT_COMPLETE, PROGRAM_GRADUATED, HONOR_EARNED, GOAL_ACHIEVED, RANK_UP). WSR-001 never split this into per-share-type toggles, so this document does not invent that granularity either.

**What this audit confirms is absent from every locked document** (and is therefore not proposed here): administrative/account/security notifications (password reset, payment failure, policy-change disclosures), any marketing or re-engagement notification, and any centralized in-app notification tray or center.

**What this audit confirms exists but was explicitly deferred:** squad invitation notifications. Squads-Hub-Wireframe-Spec-S1.md §12.7 states plainly that squad invitations are "handled in notification or settings flow (out of scope for this spec)" — this document is that flow, and resolves it (Section 3).

**Toast messages are out of scope.** Research surfaced several transient in-app toasts (chapter-creation confirmation, network-error feedback, athlete-type re-evaluation status) that are tied directly to the action that produced them. These are UI feedback, not a deliverable/mutable notification channel, and have no place on this screen.

---

## Section 2 — Notification Inventory

Every notification-producing event found during the audit, with its trigger, recipient, current default, and locked authority.

| # | Notification | Trigger | Recipient | Default | Authority |
|---|---|---|---|---|---|
| 1 | Squad check-in | Athlete shares any WSR-001 share type to a squad | Squad members | OFF (`AthleteShareSettings.squadNotificationsEnabled`) | WSR-001 §3.2, §6.5, §9.1 |
| 2 | Squad reaction | Squad member reacts to a check-in card | The sharer | OFF (`AthleteShareSettings.reactionsNotificationEnabled`), capped at 1/24h per share | WSR-001 §6.4 |
| 3 | Workout tag (squad) | Squad member tags the athlete (M-8) | Tagged athlete | Not previously locked | WwF §6.4, §14.1 |
| 4 | Workout tag (non-squad) | Non-squad athlete tags the athlete (M-9) | Tagged athlete | Not previously locked | WwF §7.1, §14.2 |
| 5 | Squad ownership transfer | Automatic or manual transfer | New owner only | Always fires; not a settable field | S-3 §5.4, §11.1 |
| 6 | Squad deletion | Owner deletes the squad | All members | Always fires; not a settable field | S-3 §11.1 |
| 7 | Squad invitation | Member invites an athlete | Invitee | Explicitly deferred prior to this document | S-1 §12.7, S-3, Master PRD |
| 8 | Challenge update | Lifecycle/standing event in a challenge the athlete **joined** | Participant | OFF | P-5-Amendment-001 (Challenge-System-Architecture) |
| 9 | Friend request received | Another athlete sends a friend request | Recipient | ON | Friend-Relationship-Architecture-Amendment-001 FR-D7 |
| 10 | Friend request accepted | The recipient accepts the athlete's request | Original requester | ON | Friend-Relationship-Architecture-Amendment-001 FR-D7 |
| 11 | Community reply | A member replies to the athlete's comment in a community | Replied-to comment's author | OFF | P-5-Amendment-002 |
| 12 | Community mention | A member @-mentions the athlete in a community | Mentioned athlete | OFF | P-5-Amendment-002 |
| 13 | Community membership approval | A Private community approves/declines the athlete's join request | Requester (approval only; decline is silent) | ON | P-5-Amendment-002 / Community-System-Architecture-v1.0 COM-D6 |
| 14 | Community pinned announcement | A community Owner/Admin pins an announcement | All members of that community | OFF | P-5-Amendment-002 |
| 15 | Community competition start | A `COMMUNITY`-context challenge the athlete joined goes ACTIVE | Participant | OFF — routes through item 8's existing toggle | Challenge-Architecture-Amendment-004 |
| 16 | Community event reminder | A Community Event the athlete is attending is approaching | Attendee | OFF | P-5-Amendment-002 |
| 17 | Community moderator action | Athlete is muted/kicked/banned, or their post/comment removed | The acted-upon member | ON | P-5-Amendment-002 / Community-Roles-and-Moderation-v1.0 CRM-D4 |
| 18 | Squad Goal completed | The squad's active Goal target is reached | All current squad members | OFF — merged into "Squad Goal & Mission Updates" | `Squad-System-Architecture-v1.0` SQ-D3, SQ-D12 |
| 19 | Squad Mission started / ending soon | A new Mission is set, or the active Mission is approaching its end date | All current squad members | OFF — merged into "Squad Goal & Mission Updates" | `Squad-System-Architecture-v1.0` SQ-D4, SQ-D12 |
| 20 | Everyone checked in | Every current squad member has logged today's check-in | All current squad members | OFF — merged into "Squad Goal & Mission Updates" | `Squad-System-Architecture-v1.0` SQ-D5, SQ-D12 |
| 21 | Squad Feed mention | A member is @-mentioned in a Squad Feed comment | Mentioned member | OFF — merged into "Squad Reactions & Mentions" | `Squad-System-Architecture-v1.0` SQ-D9.4, SQ-D12 |
| 22 | Morning briefing | **The athlete's own chosen weekday and local hour** — `pg_cron`, not a person | The athlete themselves | OFF | `P-5-Amendment-003-Training-Briefing.md` (P5B-D1) |

⚠ **Item 22 is the first row in this table whose Trigger column names no person, and the first whose Recipient is the athlete themselves.** Every row above it is an arrival. That difference is why it required a formal amendment rather than a new toggle, and why §3.2e states the conditions bounding it.

This document resolves items 3, 4, and 7 (Section 3); items 9–10 are added in Section 3.2b (Section D); **items 11–17 are added in Section 3.2d (Section E)**; **items 18–21 are added in Section 3.1 (Section A)**, per `Squad-System-Architecture-v1.0` SQ-D12. Items 1 and 2 are exposed as-is from WSR-001, **now relabeled and scope-expanded** (Section 3.1) rather than left unmodified. Items 5 and 6 remain non-optional (Section 3). **Challenge updates (item 8) are already participant-based** — the toggle fires for joined challenges in **any** context (SQUAD, FRIENDS, or — v1.3 — COMMUNITY); Friend and Community Challenges introduce no new notification category (CA3-D9 / CC4-D7). **Squad Competition Started/Ending routes through item 8's existing toggle** — no new category, same pattern as Community competition-start (item 15). **Squad Honors Earned is not a notification category at all** — per the standing Ceremonies-are-not-notifications rule (§1), it surfaces via M-2 only, exactly like every other honor.

---

## Section 3 — Notification Settings Inventory

Per this workstream's explicit preference for grouped controls over a large toggle matrix, and because the inventory evidences two distinct *kinds* of notification (passive activity broadcasts vs. direct requests awaiting a response), P-5 is organized into grouped sections plus non-toggleable notes. As of v1.5 these are **six** grouped sections — **A — Squad Activity** (broadcasts, default OFF), **B — Requests** (Workout Tags + Squad Invitations, default ON), **C — Challenges** (ambient competition, default OFF; participant-based, context-agnostic across SQUAD/FRIENDS/COMMUNITY), **D — Friend Requests** (Requests-class, default ON), **E — Communities** (mixed: ambient items default OFF, direct-consequence items non-toggleable/always ON), **F — Training** (self-directed, default OFF — the only section not about another person) — plus the non-toggleable Squad Updates note.

### 3.1 Section A — Squad Activity

Three rows as of v1.4. The first two are relabeled and scope-expanded per `Squad-System-Architecture-v1.0` SQ-D12 (same backing fields — no schema change); the third is new.

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Squad Feed Activity *(v1.4 — relabeled from "Squad Check-ins")* | Toggle | OFF | `AthleteShareSettings.squadNotificationsEnabled` — now covers workout completions, PRs, and optional video check-ins natively carried by the Squad Feed (`Squad-System-Architecture-v1.0` SQ-D9), superseding its prior WSR-001-share-only scope for Squad surfaces |
| Squad Reactions & Mentions *(v1.4 — relabeled from "Squad Reactions")* | Toggle | OFF | `AthleteShareSettings.reactionsNotificationEnabled` — now also covers @-mentions in Squad Feed comments (item 21), capped the same way reactions already are (1/24h per share) |
| Squad Goal & Mission Updates *(v1.4, new)* | Toggle | OFF | A new squad-systems notification preference covering Goal Completed (item 18), Mission Started / Ending Soon (item 19), and Everyone Checked In (item 20) — merged into one toggle per the Workout Tags merge precedent (§3.2): the athlete's interest is "tell me about squad milestones," not which specific one happened |

**Why these stay OFF, not ON:** these remain ambient activity broadcasts, not direct requests — the same risk profile that kept the original two rows OFF. Merging Goal/Mission/Check-in-completion events into one toggle, rather than three, follows the same reasoning Workout Tags and Friend Requests already established for this document: split toggles for variations on "your squad did something" add configuration surface with no evidenced athlete benefit.

**Reconciliation — Competition Started/Ending and Honors Earned (`Squad-System-Architecture-v1.0` SQ-D12):** Squad competition start/end notifications are **not** a new row here — they route through the existing Section C "Challenge Updates" toggle (§3.2a), context-agnostically, exactly as Community competition-start did (item 15) with zero new toggle. Squad Honors Earned is **not a notification category** — per §1's Ceremonies-are-not-notifications audit finding, a Squad Honor reaches its earner via the M-2 Honor Earned modal only, the same as every other honor in the catalog; nothing pushes for it.

### 3.2 Section B — Requests

Grouped because both rows share the same nature — someone is asking the athlete to respond to something — as opposed to Section A's passive activity broadcasts.

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Workout Tags | Toggle | **ON (locked)** | A workout-tag notification preference, covering both M-8 (squad) and M-9 (non-squad) tag requests. Merged into one toggle because the recipient's experience is identical regardless of who tagged them, and no document anywhere suggests these need independent control. |
| Squad Invitations | Toggle | **ON (locked)** | A squad-invitation notification preference, resolving the gap left open by Squads-Hub-Wireframe-Spec-S1.md §12.7. |

**Default rationale for both rows:** a tag or an invitation is a direct request requiring a response — missing one defeats the entire point of the feature it belongs to. This is a different risk profile than Section A's ambient activity broadcasts, which default OFF to avoid noise. Both defaults are locked by this document, not left open.

**Field naming:** Consistent with the precedent set in P-8-Subscription-Architecture.md (which required a canonical subscription entitlement state at the *concept* level without locking a specific field name), this document requires that Workout Tags and Squad Invitations notification preferences exist and are readable/writable by P-5. It does not propose specific field names, enums, or schema — that remains backend/data architecture's decision.

### 3.2a Section C — Challenges  *(P-5-Amendment-001)*

A third grouped section, added when the Challenge System ships. Ambient competition activity — defaults OFF, matching Section A's broadcast profile (not a direct request like Section B).

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Challenge Updates | Toggle | **OFF** | A challenge-notification preference covering standing changes, "ends tomorrow," started/completed for challenges the athlete **joined** |

**Scope (CC-D1):** fires only for opted-in participants; a non-participant receives nothing. This is **context-agnostic** (FR-D6 / CA3-D9) — it covers challenges the athlete joined in **either** the SQUAD or FRIENDS context; no separate "friend challenge" toggle exists. **Tone (CC-D3 / P5-D2):** neutral/positive copy only — no failure-framed pushes; "passed you" must be neutralized or separately opt-in. **Push-only (P-5 §4):** the toggle controls push delivery; in-app Challenge surfaces (C-series) always show standings/feed regardless. Field naming deferred to backend, per the existing §3.2 precedent.

### 3.2b Section D — Friend Requests  *(Friend-Relationship-Architecture-Amendment-001, FR-D7)*

A fourth grouped section, added with the persistent Friend relationship. Both rows are **Requests-class** — the same nature as Section B (Squad Invitations): a direct request awaiting / completing a response. Per FR-D7 they default **ON**, matching Squad Invitations' rationale (missing a direct request defeats the feature).

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Friend Requests | Toggle | **ON (locked)** | A friend-request notification preference, covering **"friend request received"** (a new incoming request, item 9) and **"friend request accepted"** (the original requester is told their request became a mutual Friend, item 10) |

**Why one toggle, both events:** consistent with the §3.2 Workout Tags precedent (M-8 + M-9 merged) — the athlete's interest is "tell me about friend-request activity," and no document suggests received vs. accepted need independent control. **Decline / cancel / unfriend are silent (FR-D1/D7):** declining a request, cancelling a sent request, and unfriending fire **no** notification — consistent with the product's no-shame stance (parallel to WwF's silent decline). There is therefore **no** "request declined" or "friend removed" notification. **Discovery is unchanged:** friend requests originate from the existing athlete search + discoverability toggle (Identity-Amendment-001); P-5 adds no discovery surface.

**Scope:** fires only to the two athletes in the relationship (requester and recipient) — never to any third party; there is no public or squad-visible friend activity (FR-D2/D3). **Push-only (P-5 §4):** the toggle controls push delivery only; the in-app friend-request surface (the pending-request UI, owned by the Friend system) always shows the request regardless of toggle — same principle as Squad Invitations and Workout Tags.

### 3.2d Section E — Communities  *(P-5-Amendment-002, Community-System-Architecture-v1.0 COM-D12)*

A fifth grouped section, added when the Communities subsystem shipped. Mixed defaults — ambient activity follows Section A/C's OFF-by-default pattern; direct-consequence items follow Section B/D's always-on Requests pattern.

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Replies & Mentions | Toggle | **OFF** | Items 11–12, merged (mirrors the Workout Tags / Friend Requests merge precedent — the athlete's interest is "someone addressed me," not which of the two happened) |
| Pinned Announcements | Toggle | **OFF** | Item 14 |
| Event Reminders | Toggle | **OFF** | Item 16 |

**Why OFF, not ON like Section B/D:** replies and mentions are more directed than a generic post, but Communities are explicitly unbounded in membership (`Community-System-Architecture-v1.0` §4) — unlike the small, 1:1/few-person scope of Friend Requests or Squad Invitations, an athlete in a large active community could otherwise be paged constantly. This is the same ambient-activity risk profile as Section A/C, not the small-direct-request profile of B/D.

**Non-toggleable, always ON** (joins the existing Squad Updates note in spirit, listed here for proximity to its trigger):

| Notification | Maps To |
|---|---|
| Membership Approval | Item 13 — a direct outcome of the athlete's own join request; missing it defeats the request flow, same rationale as Squad Invitations |
| Moderator Actions | Item 17 — a consequential action taken against the athlete; always delivered, no toggle, same posture as Squad ownership-transfer/deletion |

**Binding rule (COM-D12, restated here for proximity):** **no toggle in this section, or anywhere in P-5, fires for a generic new community post.** This is the one notification category deliberately absent from the inventory — consistent with every other Forge Legacy feed never broadcasting routine activity by default.

**Community competition-start (item 15)** is **not** a Section E row — it routes through the existing Section C "Challenge Updates" toggle, context-agnostically, exactly as Friend Challenges did when added (no new toggle was created for them either).

### 3.2e Section F — Training  *(P-5-Amendment-003-Training-Briefing.md)*

A sixth grouped section, and the first that is not about another person at all. One toggle plus a delivery schedule.

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Morning Briefing | Toggle + schedule | **OFF** | `notif_prefs.training_briefing`; the chosen weekdays and local hour live in `briefing_schedule` (0159), not in `notif_prefs` |

**Why it is its own section:** it is neither an ambient broadcast about a squad (A/C/E) nor a direct request awaiting a reply (B/D). Nobody is asking the athlete for anything; the notification reports the athlete's own plan back to them. It is the only self-directed control on this screen.

**Why OFF, when it is not ambient either:** the ON class (§3.2, §3.2b) is *"a direct request requiring a response — missing one defeats the entire point of the feature it belongs to."* Nothing is missed here: the same answer is on the Home hero whenever the athlete opens the app. And DNA §8's *"always feel invited, never pushed"* is difficult to square with a daily push nobody asked for. ⚠ It deliberately does **not** follow §3.1's `squad_training` exception (default ON) — that row defaults ON only because two other people-facing switches must already be on before it can fire, so OFF would silently discard a preference set elsewhere. This one answers to nobody but the athlete, so no such trap exists.

**⚠ The bounded narrowing of §1.** §1 records that *"any marketing or re-engagement notification"* is absent from every locked document, and `Calendar-System-Architecture-v1.0` CAL-D19 holds that the app *"never notifies about inactivity."* Both stand in their general form. The exception carved here is bounded to a notification that is **all five** of:

1. **opt-in** — default OFF, and the schedule row exists only once the athlete turns it on;
2. **self-directed** — it reports the athlete's own plan and mentions no other person;
3. **content-bearing** — it names a specific session, and sends nothing when it has nothing to name (P5B-D4);
4. **self-silencing** — it announces any one open session at most twice and then goes quiet until progress is recorded, rather than escalating (P5B-D3); and
5. **never absence-referencing** — no elapsed time, no missed session, no streak, no "days since" (P5B-D6).

A notification failing **any** of these five is the re-engagement pattern §1 rules out, and is not authorised by this section.

**⚠ It says "Next up", never "today" (P5B-D2).** Forge Legacy has no calendar — `planned_workouts` carries no date, `ProgramStructure` has no weekday, and progress moves only when a session is logged. The chosen weekdays are a **delivery schedule, not a training schedule** (P5B-D7); a "I train Mon/Wed/Fri" field belongs to `Calendar-System-Architecture-v1.0` (LOCKED, unbuilt) and would hand the app the ability to decide a Tuesday was a failure.

**⚠ The one category with no in-app counterpart (P5B-D9).** It is not a branch of `notification_events_for` and writes no `/inbox` row — nobody caused it, it belongs to no relationship, and it has no actor. This is a narrow, deliberate exception to §4's principle: the in-app surface for "what's next" is the Home hero, which is always present and was never gated by this toggle. **Tone follows `coachIntensity` (CI-D1/D10), not a control of its own** (P5B-D5).

### 3.2c Reconciliation Note — Post Engagement (downstream from Social-System-Architecture-v1.0)

> **Reconciliation note — Social-System-Architecture-v1.0 (LOCKED, June 2026; governing social authority).** The Social System (SOC-D11 / SOC-D16) defines **two future P-5 additions** for the intentional Posts / Friends Feed surface. They are **identified and reserved here, not yet locked as toggles** — they are authored when P-5 is next formally revised alongside the social wireframes, exactly as FR-D7's Friend Requests were reserved before being added in v1.2:
> - **Post Comments** — when a comment is left on the athlete's Post, notify the **author**. Activity/Requests-class. Push-only; the in-app comment thread always shows regardless of toggle (P-5 §4 principle).
> - **Optional Post Reactions** — mirror WSR-001's optional squad-reaction model; **default OFF**. Reactions are lightweight acknowledgements (SOC-D11) and carry no count-as-status.
>
> Both obey the standing P-5 principles: toggles control **push delivery only** and never hide the in-app surface (§4); no popularity metric is ever surfaced (SOC-D11); and no notification affects any progression (SOC-D13). This note adds **no new locked toggle** — it records the governing authority and the reserved scope so the next P-5 revision implements them consistently.

### 3.3 Non-Toggleable Note — Squad Updates

Ownership transfer and squad deletion notifications (inventory items 5–6) remain **not user-mutable** — always delivered, no toggle. These are rare, structurally important, low-volume events; silencing them could leave an athlete confused about why a squad disappeared or who's now responsible for it. This is a judgment call made by this document (nothing locks it either way), justified by the volume and importance of the underlying events, not by avoidance of complexity.

Squad invitations are **not** part of this note — they were moved into Section 3.2 as a toggle, since an invitation is a request, not a passive update.

---

## Section 4 — Notification State Matrix

| State | Push Fires? | In-App Surface Still Shows? |
|---|---|---|
| Squad Feed Activity ON | Yes | Squad Feed entries (workout completions, PRs, video check-ins) always visible in S-2 regardless of toggle state |
| Squad Feed Activity OFF | No | Squad Feed entries still appear in S-2 — muting push never hides the underlying surface, same rationale WSR-001 originally established for offline members |
| Squad Reactions & Mentions ON/OFF | Yes/No | No separate in-app surface for this notification beyond the notification itself — reactions and the @-mention remain visible in the Squad Feed regardless |
| Squad Goal & Mission Updates ON/OFF | Yes/No | The Current Goal card, Current Mission card, and Today's Check-ins card (S-2 §§15–17) always reflect current state regardless of toggle |
| Workout Tags ON (locked) | Yes | W-1 action card (Unclaimed Workout / Pending Approval) always appears regardless of toggle state — same principle as Squad Check-ins |
| Squad Invitations ON (locked) | Yes | Invitation also appears in S-3's pending invitations list, independent of notification delivery |
| Squad Updates (always on) | Always | No separate in-app surface other than the notification itself, for ownership transfer or deletion |
| Challenge Updates ON | Yes (joined challenges only) | C-series Challenge surfaces always show standings/feed regardless of toggle |
| Challenge Updates OFF | No | C-series Challenge surfaces still show standings/feed — muting push never hides the surface |
| Friend Requests ON (locked) | Yes | The in-app friend-request surface (pending requests / Friend List) always shows the request regardless of toggle |
| Friend Requests OFF | No | Pending friend requests still appear in-app — muting push never hides the request surface |
| Replies & Mentions ON/OFF | Yes/No | The comment thread / mention always shows in the community feed regardless of toggle |
| Pinned Announcements ON/OFF | Yes/No | Pinned post remains at the top of the community feed regardless of toggle |
| Event Reminders ON/OFF | Yes/No | The event remains visible on the Community Page's Events tab regardless of toggle |
| Membership Approval (always on) | Always | The athlete's membership state is visible in-app regardless of the notification |
| Moderator Actions (always on) | Always | No separate in-app surface beyond the notification and the action's own visible effect |
| Morning Briefing ON | Yes — on the athlete's chosen days, at most twice per open session (P5B-D3) | The Home hero always names the next session, and is not gated by this or any toggle (H-1) |
| Morning Briefing OFF | No | Unchanged — the Home hero is exactly as it was; this toggle has never conditioned it |

**Principle carried through every row:** toggles control push delivery only. They never hide or condition the underlying in-app data or surface. This is already established behavior in WSR-001 and WwF; this document doesn't change it — it only exposes the push-layer control that was previously unreachable by the athlete.

---

## Section 5 — Navigation Dependencies

- **P-4 Settings Root → Notifications row → P-5** — push onto the Profile modal's navigation stack, reusing the established P-4 pattern exactly, identical to P-6 and P-8's entry behavior.
- **P-5 has no child screens.** It is a flat list of two grouped sections plus one informational note — the same shape as P-6.
- **Back: P-5 → P-4** — standard stack pop.

---

## Section 6 — Open Questions

1. ~~Workout Tags default~~ — **RESOLVED: locked ON** (Section 3.2).
2. ~~Should squad invitations be toggleable?~~ — **RESOLVED: yes, as a toggle under Requests, default ON** (Section 3.2) — moved out of the non-toggleable Squad Updates note.
3. **Field naming for Workout Tags and Squad Invitations preferences** — explicitly deferred to backend/data architecture, consistent with the P-8 precedent. This document states only that the concept must exist and be readable/writable by P-5.
4. **Administrative/account notifications** — confirmed absent from every locked document. Not proposed here. Flagged as a likely future need (e.g., policy-change disclosures may eventually require a non-optional channel), but explicitly out of scope until some other document locks it.

**Status of P-5 itself: fully resolved.** Item 3 is a backend/data architecture decision, not a P-5 blocker. Item 4 is an acknowledged future gap, not a current requirement.

---

## Section 7 — Recommendation for P-5 Wireframe Spec Scope

P-5 is small: four toggles across two grouped sections, plus one informational note, no child screens. It is fully unblocked by the open questions above — all are field-naming or future-scope items, not architectural blockers. **Recommend authoring the full P-5 wireframe spec immediately**, the same recommendation given for P-6.

---

## Section 8 — Lock Recommendation

**LOCKED.** Every notification category in this document traces to a specific locked document and section. No category was proposed without that trace, per this workstream's explicit constraint. The two genuinely new decisions this document makes — Workout Tags and Squad Invitations as toggles, both defaulting ON, and ownership transfer/deletion remaining non-optional — are each justified by the evidence in Section 2, not invented complexity.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.5 | 2026-08-14 | `P-5-Amendment-003-Training-Briefing.md` (LOCKED) merged. Added inventory item 22 (§2) and **Section F — Training** (§3.2e): one **Morning Briefing** toggle, default **OFF**, plus a weekday/local-hour delivery schedule in `briefing_schedule` (0159). **The first category in this document not caused by another person**, and therefore the first bounded narrowing of §1's "no marketing or re-engagement notification" finding — §3.2e states the five conditions (opt-in · self-directed · content-bearing · self-silencing · never absence-referencing) that bound it, and records that failing any one of them is not authorised. It says "Next up", never "today" (P5B-D2); the chosen days are a delivery schedule and never a training schedule (P5B-D7); tone rides the existing `coachIntensity` dial rather than a new control (P5B-D5). Not a branch of `notification_events_for` and no `/inbox` row — a narrow, stated exception to §4 (P5B-D9). §4 state-matrix rows added. **No existing Section A/B/C/D/E row changed, and no existing default changed.** |
| 1.4 | June 2026 | `Squad-System-Architecture-v1.0.md` (LOCKED) SQ-D12 merged. Relabeled "Squad Check-ins" → **Squad Feed Activity** and "Squad Reactions" → **Squad Reactions & Mentions** in Section A (same backing fields, `squadNotificationsEnabled` / `reactionsNotificationEnabled` — no schema change; scope expanded to the new Squad Feed and @-mentions). Added **Squad Goal & Mission Updates** (new merged toggle, default OFF) covering Goal Completed, Mission Started/Ending Soon, and Everyone Checked In (inventory items 18–20). Added inventory item 21 (Squad Feed mention). **Competition Started/Ending routes through the existing Section C "Challenge Updates" toggle — no new toggle.** **Honors Earned is not a notification category — reconciled to the existing M-2 ceremony-only rule (§1), no push, no toggle.** §4 state-matrix rows updated. No change to Sections B/C/D/E. |
| 1.3 | June 2026 | `P-5-Amendment-002-Community-Notifications.md` merged. Added inventory items 11–17 (§2) and **Section E — Communities** (§3.2d): Replies & Mentions (merged, default OFF), Pinned Announcements (OFF), Event Reminders (OFF) as toggles; Membership Approval and Moderator Actions as non-toggleable, always-ON rows. Restated the binding no-per-post-push rule (`Community-System-Architecture-v1.0` COM-D12). Community competition-start notifications route through the existing Section C "Challenge Updates" toggle — no new toggle created. §4 state-matrix rows added. No existing Section A/B/C/D row changed. |
| 1.2.1 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. Added §3.2c reconciliation note **reserving** two downstream P-5 additions (Post Comments — notify author, activity-class; optional Post Reactions — mirror WSR-001, default OFF), to be authored at the next P-5 revision per SOC-D11/SOC-D16. **No new locked toggle added; no existing decision changed.** |
| 1.2 | June 2026 | Added **Section D (Friend Requests)** per Friend-Relationship-Architecture-Amendment-001 FR-D7: one Requests-class toggle (default **ON, locked**) covering "friend request received" + "friend request accepted"; decline/cancel/unfriend are silent (no notification — no-shame stance), so no "declined"/"removed" notifications exist; discovery unchanged (Identity-Amendment-001). Inventory items 9–10 and §4 state-matrix rows added. Clarified that Challenge Updates (item 8) is context-agnostic — covers SQUAD and FRIENDS challenges with no new toggle (CA3-D9). Push-only; in-app surfaces unaffected. No change to Sections A/B/C or the non-toggleable note. |
| 1.1 | June 2026 | Added Section C (Challenges) per P-5-Amendment-001: single "Challenge Updates" toggle, default OFF, fires only for joined challenges, neutral/positive copy only (CC-D3); inventory item 8 and §4 state-matrix rows added. Push-only; in-app Challenge surfaces unaffected. No change to existing Sections A/B or the non-toggleable note. |
| 1.0 | June 2026 | Initial. Dependency audit confirmed ceremonies (M-1, M-2, M-4) never produce push notifications, collapsing four candidate categories into WSR-001's existing squad-activity toggle. Resolved Workout Tags and Squad Invitations as toggles under a "Requests" grouping, both locked ON. Ownership transfer and squad deletion remain non-optional. |

---

*P-5 Notifications Architecture — v1.5 (Section F — Training merged: the Morning Briefing, the first notification here that nobody causes)*
*Architecture Specification — Notification Preferences Information Architecture*
*June 2026*
*Authority: WSR-001-Workout-Share-Result-Architecture.md (LOCKED), Workout-With-Friend-Spec-WwF.md (LOCKED), Squad-Management-Permissions-Spec-S3.md (LOCKED), Squads-Hub-Wireframe-Spec-S1.md (LOCKED), Rank-Up-Modal-Spec-M1.md / Honor-Earned-Modal-Spec-M2.md / M-4-Program-Graduated-Spec.md (all LOCKED), P-2-Progress-Hub-Spec.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED), Community-System-Architecture-v1.0 (LOCKED), Community-Roles-and-Moderation-v1.0 (LOCKED), Squad-System-Architecture-v1.0 (LOCKED)*
*Status: LOCKED*
