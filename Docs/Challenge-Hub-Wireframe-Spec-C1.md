# Forge Legacy — Challenge Hub Wireframe Specification
## C-1 | Challenge System | v1.1 — June 2026

**Status:** Lock-ready

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.3.md` (CS-D1–D27); `Challenge-Architecture-Amendment-003` v1.1 (CA3-D10/D11 — participant-scoped hub + dual entry); `Friend-Relationship-Architecture-Amendment-001` (FR-D6); `Comparison-Philosophy-Amendment-001.md` (CC-D1 four gates, CC-D2 Firewall, CC-D3 guardrails, CC-D4 badges); `Squad-Architecture-Amendment-001-Challenge-Surfaces.md` (SA-D2 S-1/S-2 entry, SA-D3 creator role); `P-5-Amendment-001` (notifications); S-1/S-2/S-3 (parent squad surfaces); UX Framework v1.0.

**Amendment Log:** v1.1 — generalized to a participant-scoped Challenge Hub spanning SQUAD + FRIENDS contexts (CA3-D10/D11). v1.0 initial.

> **v1.1 reconciliation note (CA3-D10/D11):** C-1 is now a **participant-scoped** Challenge Hub. It is reachable two ways: (a) **from a squad surface** (S-2 / SA-D2) — opened **filtered to that squad's challenges** (the squad-scoped view this v1.0 spec describes throughout); and (b) **from a participant-level entry** (H-1 recommended) — opened in **participant scope**, listing the athlete's challenges across **both** SQUAD and FRIENDS contexts. **Friend challenges** (`context = FRIENDS`) appear only in the participant-scoped view, never on any squad surface, and carry **no** squad-legacy sections (Current Champions / Hall of Champions / Squad Records are **SQUAD-context only**, CA3-D8). Everywhere this spec says "squad-scoped" / "this squad," read it as the **squad-filtered view** of the hub; the participant-scoped view applies the same card/positive-framing/Firewall rules with the roster being the friend set. Pixel layout of the participant-scoped view is deferred to a later wireframe revision; no card design changes.

---

## Preamble: What C-1 Is For

C-1 is the squad's competition surface. It answers: **"What are we competing in, and what have we won?"**

C-1 is a **Challenge surface** in the Performance Firewall sense (CS-D22): it is the *only* place — alongside its sibling C-screens — where challenge data may appear. It is reached *from* S-2 (per SA-D2), but it is not S-2. The always-on squad surfaces (S-1 cards, S-2 member list, Limited Athlete Profile, check-ins) remain performance-free. Entering C-1 is a deliberate step into the consenting competition context.

C-1 lists the squad's challenges by lifecycle state, opens the path to create one (any member, per SA-D3), and provides the entry points to the squad's competitive legacy — Current Champions (C-7), Hall of Champions (C-5), and Squad Records (C-6).

**C-1 must honor:**
- **Squad-scoped only** — every challenge shown belongs to this squad; nothing public or cross-squad.
- **Positive framing** — no failure language, no "you didn't join," no loser markers (CC-D3).
- **The Firewall** — C-1 reads challenge data; the surfaces it was reached from never do.

---

## Section 1 — C-1 Goals

1. **Surface the squad's challenges** grouped by state (Active, Enrolling, Past).
2. **Open challenge creation** — available to any squad member.
3. **Route to a specific challenge** (C-3 Detail).
4. **Surface competitive legacy** — Current Champions preview + entry to Hall of Champions and Squad Records.

**What C-1 answers:**
- What challenges are live right now in my squad?
- What can I still join?
- What has my squad competed in before, and who won?
- How do I start a challenge?

**What C-1 does NOT answer (Firewall / scope):**
- Any member's training performance outside a challenge context.
- Anything about a member who chose not to join (non-participation is invisible).
- Anything about another squad.

---

## Section 2 — Information Hierarchy

**TIER 1 — Active Challenges** — challenges in ACTIVE state. The live competition the athlete most likely came to check.
**TIER 2 — Open for Enrollment** — challenges in ENROLLMENT state the athlete can still join.
**TIER 3 — Create a Challenge CTA** — Secondary class; always available to any member.
**TIER 4 — Current Champions** — a compact preview of standing champions by category (C-7), with "View All."
**TIER 5 — Past Challenges / Legacy** — links into Hall of Champions (C-5) and Squad Records (C-6); a short recent-archived preview.

**Hierarchy principle:** live competition first, joinable second, creation third, legacy last. Nothing competitive appears above the squad context the athlete navigated from — C-1 is entered, not pushed.

---

## Section 3 — Full Scroll Order

C-1 is a navigation-stack screen entered from S-2. Top App Bar with back arrow. Bottom Tab Bar visible (not full-screen).

```
┌─────────────────────────────────────────────────────────┐
│  [←]  Challenges · [Squad Name]                          │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ACTIVE                                                 │  ← Section label (absent if none)
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔥 No Excuses June           Most Workouts        │   │  ← Challenge card
│  │ Ends in 4 days · 5 in                            │   │
│  │ You're 2nd  ·  [Current Leader: Maya]      [ → ] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  OPEN FOR ENROLLMENT                                    │  ← Section label (absent if none)
│  ┌─────────────────────────────────────────────────┐   │
│  │ Bench Wars                    Max Lift · Bench    │   │
│  │ Starts in 2 days · 3 joined                      │   │
│  │ [  Join  ]                                  [ → ] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  + Create a Challenge  ]                             │  ← Secondary CTA
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  CURRENT CHAMPIONS                          [View All]  │  ← → C-7
│  🏅 Consistency — Maya   🏅 Volume — Sam               │
│  ─────────────────────────────────────────────────────  │
│  PAST CHALLENGES                                        │
│  Spring Shred · Winner: John          [Hall of Champions ›]  ← → C-5
│  [ Squad Records › ]                                    │  ← → C-6
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:** back arrow [←] → S-2; title "Challenges · [Squad Name]" (truncates). No [⋯].

**Above the fold (375×812):** the first Active card (or, if none active, the first Enrollment card or the Create CTA) must be fully visible.

---

## Section 4 — Challenge Card Architecture

### 4.1 Card anatomy (state-dependent)

```
[type-icon] [Challenge Name]              [Type · target if MAX_LIFT]
[State line]
[Athlete's own standing — neutral]   [optional badge]        [ → ]
```

| Field | Rule |
|---|---|
| Name | Athlete-authored, 16–18sp, primary. Wraps to 2 lines max. |
| Type label | From `ChallengeType` (Most Workouts / Most Volume / Max Lift / Most Duration / Most PRs). For `MAX_LIFT` with `targetExerciseId`: "Max Lift · [Exercise]". |
| State line | ACTIVE: "Ends in [N] days · [X] in". ENROLLMENT: "Starts in [N] days · [X] joined". |
| Own standing | ACTIVE only, and only if the athlete is a participant: "You're [Nth]" — neutral, never "last," never a deficit. Absent for non-participants (no "you didn't join"). |
| Badge | Optional derived badge chip (Current Leader, Defending Champion) per CC-D4. Never a negative badge. |

### 4.2 Card states
- **ACTIVE card:** shows standing line; whole card tappable → C-3.
- **ENROLLMENT card:** shows a **[Join]** inline CTA + tappable card → C-3. If the athlete already joined: CTA reads "Joined ✓" (non-pressuring), card still → C-3.
- **Archived** challenges do not appear as Tier-1/2 cards; they live under Past Challenges / Hall of Champions.

**Positive-framing rule (CC-D3):** a participant who is currently last sees "You're [Nth] of [X]" with no color alarm, no "last," no "behind by." A non-participant sees no standing at all.

---

## Section 5 — Create a Challenge CTA

- Secondary CTA, full-width, always present (any member may create, SA-D3 / CS-D6).
- Tap → C-2 Create Challenge, with this squad's context.
- Never gated by role; never gated by the free-tier squad limit (challenges sit inside an existing squad, CS edge 15.10).

---

## Section 6 — Current Champions, Hall, Records (downstream previews)

### 6.1 Current Champions preview (→ C-7)
Compact row of standing champions by category (Consistency / Volume / Max Lift / Duration / PR), each "🏅 [Category] — [Name]". "View All" → C-7. Absent entirely if the squad has never completed a challenge (no placeholder).

### 6.2 Past Challenges / Hall of Champions (→ C-5)
A 1–2 item preview of most-recent archived results ("[Challenge] · Winner: [Name]"), with "Hall of Champions ›" → C-5.

### 6.3 Squad Records (→ C-6)
A single "Squad Records ›" row → C-6. Positive records only (CS-D19).

All three are squad-scoped and read challenge data on a Challenge surface only.

---

## Section 7 — Navigation Paths

| Action | Destination |
|---|---|
| Back [←] | S-2 Squad Detail (restores S-2 scroll position) |
| Tap Active/Enrollment card | C-3 Challenge Detail |
| Tap [Join] on enrollment card | Join confirmation → joins → card updates to "Joined ✓" (stays on C-1) |
| Tap "+ Create a Challenge" | C-2 Create Challenge |
| Tap "View All" (Current Champions) | C-7 Current Champions |
| Tap "Hall of Champions ›" | C-5 Hall of Champions |
| Tap "Squad Records ›" | C-6 Squad Records |
| Tab Bar | H-1 / L-1 / W-1 / Profile |

**Entry to C-1:** from S-2 via the challenge entry affordance defined by SA-D2 (S-2 edit Pending). C-1 is not reachable from W-1 or during an active workout (Tab Bar hidden in W-9–W-16).

---

## Section 8 — State Rules

| State | C-1 behavior |
|---|---|
| Squad has ≥1 ACTIVE challenge | ACTIVE section renders, most-recently-started first |
| Squad has ≥1 ENROLLMENT challenge | OPEN FOR ENROLLMENT section renders |
| Athlete already joined an enrollment challenge | That card's CTA shows "Joined ✓"; no pressure copy |
| Challenge just transitioned ENROLLMENT→ACTIVE | Card moves from Enrollment to Active section on next load |
| Challenge COMPLETED | Drops out of Active; appears under Past / feeds Current Champions + C-5 |
| Squad has no challenges ever | Empty state (§9.1) |

---

## Section 9 — Empty / Error / Edge States

### 9.1 Empty — no challenges ever
```
        [muted trophy icon ~48dp]
        No challenges yet
        Start a friendly competition with your squad.
        [  + Create a Challenge  ]   ← Primary class here
```
- No "you haven't competed" shaming. Invitational tone. Current Champions / Hall / Records sections absent (no history). "Create a Challenge" is Primary class in the empty state only.

### 9.2 Active-only / Enrollment-only
If only one section has content, only that section renders. No "no enrollment challenges" placeholder for the empty section.

### 9.3 Non-participant viewing
A squad member who joined nothing sees all squad challenges (squad-scoped visibility) and their cards, but **no personal standing line** and **no indication anywhere that they declined** (CC-D3). Viewing ≠ participating.

### 9.4 Challenge cancelled (<2 participants, or by creator/owner)
A CANCELLED challenge is removed from C-1 silently — no "cancelled" tombstone, no result, no marker (CS-D5). If the athlete had joined, it simply disappears.

### 9.5 Squad deleted while viewing C-1
Next interaction resolves to S-1 with the squad (and its challenges) absent — consistent with S-2/S-3 squad-deletion handling.

### 9.6 Load/refresh
Leaderboard standings shown on cards are accurate as of load (MVP, per CS-D12 / S-1 §9.4). Pull-to-refresh re-reads.

---

## Section 10 — Firewall & Anti-Shame Compliance

- [ ] C-1 reads challenge data; the surfaces it is reached from (S-1, S-2 member list, Limited Profile, check-ins) display none (CS-D22).
- [ ] Every challenge shown is scoped to this squad; no public/cross-squad content.
- [ ] No personal standing for non-participants; non-participation produces no marker anywhere.
- [ ] No standing rendered as failure/"last"/deficit; no negative badge.
- [ ] No member named for not joining or for losing.

---

## Section 11 — Mobile UX

- Portrait only. Navigation-stack screen; Tab Bar visible.
- Tap targets ≥ 44dp; challenge card ≥ 72dp; [Join] inline CTA 44dp.
- Section labels: uppercase 12sp, secondary, letter-spaced (matches S-2/S-3).
- Back from C-3/C-2 restores C-1 scroll position; Tab Bar re-entry resets to top.
- Accessibility: card label = "[Challenge name], [type], [state]. [your standing if participant]. Double-tap to open." Join button = "Join [challenge name]."

---

## Section 12 — Validation Checklist

- [ ] Top App Bar: back → S-2; squad-scoped title
- [ ] Active section (most-recent-started first) and Enrollment section render only when populated
- [ ] Challenge card shows name, type (Max Lift shows target exercise), state line, own standing (participants only), optional positive badge
- [ ] [Join] inline CTA on enrollment cards; "Joined ✓" when already in
- [ ] "+ Create a Challenge" available to any member; Primary in empty state, Secondary otherwise
- [ ] Current Champions preview → C-7; Hall of Champions → C-5; Squad Records → C-6
- [ ] Empty state invitational; no history sections when no completed challenges
- [ ] Non-participant: no personal standing, no decline marker
- [ ] Cancelled challenges disappear silently; no tombstone
- [ ] Firewall + anti-shame items (§10) all satisfied
- [ ] Portrait; tap targets ≥ 44dp; Tab Bar visible

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | Participant-based reconciliation (CA3-D10/D11): C-1 generalized to a **participant-scoped Challenge Hub** reachable from a squad surface (squad-filtered) and from a participant-level entry (H-1 recommended; SQUAD + FRIENDS challenges). Friend challenges carry no squad-legacy sections (SQUAD-context only, CA3-D8). Authority updated to Challenge-System-Architecture-v1.3. No card redesign; participant-view pixel layout deferred. |
| 1.0 | June 2026 | Initial. Squad Challenge Hub: Active / Enrollment challenge lists, any-member Create CTA, Current Champions preview (→C-7), Hall of Champions (→C-5) and Squad Records (→C-6) entries. Firewall-compliant Challenge surface entered from S-2 (SA-D2). Positive framing; invisible non-participation. |

---

*Forge Legacy — Challenge Hub Wireframe Specification — C-1*
*v1.1 — June 2026 (participant-scoped: SQUAD + FRIENDS)*
*Authority: Challenge-System-Architecture-v1.0.md (v1.5), Challenge-Architecture-Amendment-003 v1.1, Friend-Relationship-Architecture-Amendment-001 (and governing Challenge amendments), all LOCKED*
*Status: Lock-ready*
