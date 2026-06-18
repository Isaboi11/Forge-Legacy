# Forge Legacy — Username Architecture
## Identity Amendment 001 | Version 1.0 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 8 (Workout With Friend), Section 16 (Privacy), Product DNA
**Supersedes:** O-1 Risk 4 (Username vs. Display Name Ambiguity)
**Impacts:** O-2, P-1, P-2, P-6, WwF v1.1, S-1, S-3

---

## Context

O-1 Account Creation is locked. It collects Display Name only and flags "username vs. display name ambiguity" as a Medium-priority dependency (Risk 4) requiring resolution before O-2 and O-1 implementation can begin.

The Master PRD assumes a username system exists in two places:
- Section 8 (Workout With Friend / W-20): "Squad members AND non-squad **username search**"
- Section 17 (Privacy / P-6): "Who can find me, squad visibility, **username search opt-out**"

The locked WwF spec (v1.1) and Squad Management spec (S-3) use Display Name exclusively in all visible UI — rosters, notifications, history entries, partner indicators. There is no @handle visible to athletes in any normal app surface.

This amendment resolves the architecture, determines the correct identity model, establishes its rules, and specifies its impact on O-2 and all downstream specs.

---

## Architecture Decision: Display Name + Username (Two-Tier Identity)

**Forge Legacy uses two distinct identity fields. They serve different purposes and must never compete visually.**

### Display Name
**Purpose:** Human identity. Personal expression. How the athlete thinks of themselves and how Forge Legacy addresses them.

- Not unique system-wide
- Any characters accepted (given name, nickname, handle-style expression, emoji)
- Examples: Isaiah, Dad Strength Era, Coach Mike, Sarah, The Forge
- Used everywhere in visible UI: profile, rosters, notifications, workout history, chapter records, honor lists, goal cards
- Collected in O-1c (already locked)

### Username
**Purpose:** Unique system address. Search disambiguation. How athletes find each other when they need to be precise.

- Unique system-wide
- Lowercase letters, numbers, underscores only. 3–20 characters. Must start with a letter or number. No spaces. No special characters except underscore.
- Examples: @isaiahaltamirano, @dadstrength, @coachmike
- Used only in: search input, search results (secondary line), your own profile, privacy settings label
- **Never used in:** notifications, workout history entries, squad rosters, chapter records, goal cards, honor lists, or any copy string that describes what happened
- Collected in O-2 (first-time setup)

---

### Why Not Display Name Only

Display names are not unique. The WwF spec states search returns "squad members first, then non-squad athletes." For squad members, squad context disambiguates identically-named athletes. For non-squad athletes — the primary use case for needing search — only `[Avatar] [Name]` is shown. Two athletes named "Isaiah" are indistinguishable in non-squad search results. Username solves this. When the search returns both, the secondary @username line allows the searcher to recognize the right person.

### Why Not Username Only

Display names carry identity and expression the Product DNA requires. An athlete named "Dad Strength Era" or "The Forge" cannot be reduced to "@dadstrengthera." The display name IS the product's identity layer. Replacing it with usernames would make Forge Legacy feel like every other platform.

### Why Not Display Name as the Searchable Identifier

"Username search opt-out" in the Master PRD (P-6) is semantically incoherent if username = display name. Separating the two — display name is how you're known, username is how you're found — makes the opt-out meaningful: "don't let strangers find me by my address, but I'm still visible by name to people who already know me in squads."

---

### Product DNA Check

| Principle | Assessment |
|-----------|-----------|
| Legacy First | Username does not appear in legacy records. History entries, chapters, goals, and honors are all display-name driven. Legacy is unaffected. |
| Identity Over Performance | Display name supports identity and expression. Username is an address, not an identity. It does not compete with the display name. |
| Simplicity Wins | Two fields, one of which is auto-suggested. Athletes encounter it once (O-2) and rarely think about it again. |
| High Trust Relationships | Username enables finding real people you already know in real life. It is not a public follower system. It serves accountability, not audience-building. |
| Accountability Without Shame | Username does not appear anywhere shame-adjacent. No public posting of workout partners. |

---

## Section 1 — Username Definition and Rules

### 1.1 Format Rules

| Rule | Specification |
|------|--------------|
| Characters | Lowercase letters (a–z), numbers (0–9), underscores (_) only |
| Length | Minimum 3 characters. Maximum 20 characters. |
| First character | Must be a letter or number. Cannot start with underscore. |
| Spaces | Not allowed |
| Special characters | No hyphens, periods, @, or any character other than underscore |
| Case | Stored and displayed lowercase. Input auto-lowercased. |
| Uniqueness | System-wide unique at any given time |

### 1.2 Uniqueness Behavior

Usernames are unique at any given time, not historically unique. When an athlete changes their username, the old username becomes available for another athlete to claim after a 14-day hold (prevents immediate re-registration by an athlete watching for a username to free up).

### 1.3 Display Convention

The @ symbol is used as a visual prefix when displaying usernames in the UI:
- Profile: @isaiahaltamirano (13sp, muted, below display name)
- Search results: @isaiahaltamirano (13sp, muted, second line)
- Privacy settings: "username: @isaiahaltamirano"

The @ is a display convention — it is NOT stored in the database. The stored value is `isaiahaltamirano`, not `@isaiahaltamirano`. The @ is prepended by the UI layer.

---

## Section 2 — Collection: O-2 First-Time Setup

Username is collected in O-2, not O-1. O-1 is locked and unchanged.

### 2.1 Username Step in O-2

The username step is **optional but strongly encouraged.** Athletes may skip it and proceed through O-2 and into the app without a username. The step is low-friction when taken because the system auto-suggests a username derived from the display name.

**Auto-suggestion logic:**
1. Take the display name collected in O-1c
2. Strip spaces and special characters, lowercase everything
3. Suggest the result as a username (e.g., "Isaiah Altamirano" → suggests "isaiahaltamirano")
4. If the suggestion is taken: append an incrementing number ("isaiahaltamirano2", "isaiahaltamirano3")
5. If the display name produces a string shorter than 3 characters or fails format rules: show an empty field with placeholder, athlete types manually
6. The athlete can accept the suggestion (one tap Continue) or edit it before saving

**Wireframe concept — O-2 Username Step:**
```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                     [Skip for now]   │
│                                                         │
│  Choose your username          [22sp, primary weight]   │
│                                                         │
│  This is how athletes find you.        [15sp, secondary]│
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Username                           [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  @  isaiahaltamirano                             │   │  ← Auto-suggested, editable
│  └─────────────────────────────────────────────────┘   │
│  Available ✓                    [13sp, muted green]     │
│                                                         │
│  [  Continue  ]                     ← Primary, 52dp    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Validation feedback (live, 300ms debounce after typing stops):**
- Available: "Available ✓" — muted green below field
- Taken: "That username is taken. Try [suggested_alternative]." — muted below field; tappable suggestion populates field
- Too short: "Usernames must be at least 3 characters." — shown when field blurs with < 3 characters
- Invalid characters: input blocked — non-allowed characters do not register at all. No error message needed; the blocked input communicates the constraint.

### 2.2 "Skip for now" Behavior

Athletes can skip the username step in O-2. If skipped:
- The athlete has no username
- They cannot be found via username search by non-squad athletes
- They can still be found by display name search (if "non-squad search" is not turned off)
- A nudge appears in P-1 Profile until a username is set: "Add a username so athletes can find you" — tappable, navigates to P-2
- Username can be set at any time via P-2

---

## Section 3 — Username Changeability

### 3.1 Editability

Yes. Username is editable in P-2 (Edit Profile) at any time, subject to:

**Cooldown:** 30-day cooldown between changes. After a change, the username field in P-2 shows: "You can change your username again in [N] days."

**No lifetime limit:** Athletes can change their username as many times as they want, subject to the 30-day cooldown between each change.

### 3.2 Rationale for 30-Day Cooldown

Prevents username cycling attacks, harassment via repeated name changes, and accidental changes. Does not prevent legitimate changes — athletes who genuinely need to change can wait 30 days or contact Support for an expedited reset.

### 3.3 Impact on History After Username Change

Username does not appear in any history entries, workout records, chapter records, or legacy data. All historical copy uses Display Name snapshots. Changing username has zero impact on legacy records.

### 3.4 Old Username Availability

After a username change, the old username is held for 14 days before being released.

---

## Section 4 — Search Architecture

### 4.1 Query Behavior

Athlete search queries **both** Display Name and Username simultaneously.

| Input | Match type | Returns |
|-------|-----------|---------|
| `isaiah` | Partial match on Display Name containing "isaiah" AND Username starting with "isaiah" | Both types merged |
| `@isaiah` | Username search only — input beginning with @ forces username-only mode | Username matches only |
| `@isaiahaltamirano` | Username exact match | One result (or zero) |

**@ prefix is a power-user feature.** Default (no @ prefix) queries both fields. This makes the default experience feel name-based, not handle-based.

### 4.2 Result Ranking

1. Squad members matching the query (any shared squad)
2. Non-squad athletes matching the query (subject to their discoverability settings)
3. Within each tier: exact matches before partial; display name matches before username-only matches

### 4.3 Search Result Row Format

```
┌──────────────────────────────────────────────────────────────┐
│  [Avatar 40dp]  Isaiah Altamirano    [15sp, primary weight]  │
│                 @isaiahaltamirano    [13sp, muted]            │
│                 [Squad Name — if shared squad, 12sp muted]   │
└──────────────────────────────────────────────────────────────┘
```

Display Name is always the primary line — visually dominant, larger, primary weight.
@username is the secondary line — smaller, muted, subordinate.
Squad affiliation is the tertiary line — only shown when athlete is in a shared squad.

When athlete has no username set: secondary line is absent (not a blank line — the row is a single-line display name row).

### 4.4 Empty Search State

No athletes shown before any query is typed. No suggested athletes. This is not a discovery or recommendation system.

### 4.5 No Results State

"No athletes found. Check the spelling or ask them to share their username."

This copy reinforces: username search is for finding people you already know, not strangers.

---

## Section 5 — Workout With Friend Impacts

### 5.1 Partner Selection Search

WwF partner selection (S-10 and W-20 sheets) uses unified athlete search (Section 4).

**Changes to WwF spec (v1.1 → v1.2):**
- Search field in S-10 and W-20 queries Display Name AND Username simultaneously
- Result rows show: Display Name (primary), @username (secondary, muted) — instead of Display Name only
- No other changes to WwF spec

### 5.2 What Username Does NOT Appear In (Unchanged)

All WwF copy strings remain Display Name only:

| Surface | Copy | Status |
|---------|------|--------|
| Training indicator during workout | "Training with [Display Name]" | Unchanged |
| Tagger's workout annotation | "Trained with [Display Name]" | Unchanged |
| Tagged athlete's reference entry | "Trained with [Display Name]" | Unchanged |
| Push notification — tag request | "[Display Name] wants to tag you in..." | Unchanged |
| Push notification — tag accepted | "[Display Name] accepted your tag request" | Unchanged |
| Multiple partners annotation | "Trained with [Name 1], [Name 2]" | Unchanged |

Username is a search address, not a record identifier. Events involve people with names, not addresses.

---

## Section 6 — Squad Architecture Impacts

### 6.1 Squad Rosters

Display Name only. Username is not shown in any squad roster context. S-2 and S-3 are unchanged in visible copy.

### 6.2 Squad Invitations

Inviter finds athlete via search (Display Name or Username). Invitation preview and pending invitation rows show Display Name. S-3 is unchanged in visible copy; only the invite-search mechanism gains username search capability.

### 6.3 Squad Notifications

All squad notification copy uses Display Name. No @username in any notification string. Squad specs are unchanged.

### 6.4 Squad Handle (Separate Concept)

The Master PRD references "squad name or **handle**" for squad search. This is a squad-level handle — a separate concept from the athlete's personal username. Squad handles are defined by the Squad creation architecture (S-1 or W-4 amendments). This amendment covers athlete usernames only.

---

## Section 7 — Privacy and Opt-Out Model

### 7.1 Non-Squad Search Toggle

This replaces the Master PRD's "username search opt-out" label with clearer framing.

**Setting location:** P-6 Privacy Settings
**Setting label:** "Let non-squad athletes find me in search"
**Default:** On (athletes are searchable by default)

| Setting | Effect |
|---------|--------|
| On (default) | Athlete appears in all search results (display name and username queries) |
| Off | Athlete appears only for athletes in a shared squad. Not searchable by any athlete outside their squads. |

When opted out: the athlete's username still exists, but it returns no results for athletes outside their squads. Squad members can still find and tag them normally.

### 7.2 What Privacy Does NOT Control

- Whether squad members can find or tag you (squad membership implies discoverability within the squad)
- Whether athletes who already know your username can attempt a tag request (they can attempt; the M-9 approval/decline flow handles acceptance)

---

## Section 8 — Profile Display (P-1 Amendment)

### 8.1 Identity Block Addition

The P-1 Profile identity block gains an @username line below the Display Name.

**Amended P-1 Identity Block:**
```
[Avatar]
[Display Name — 22sp, primary weight]
[@username — 13sp, muted secondary]     ← NEW
[Rank — e.g., "Architect IV"]
[Athlete Type — e.g., "Strength"]
[Forging Since — e.g., "Forging since June 2026"]
```

The @username line:
- 13sp, muted secondary color
- Tappable: copies "@username" to clipboard with brief toast "Copied"
- Absent if no username has been set (no blank line)

### 8.2 P-2 Edit Profile Addition

P-2 gains a Username field:
- Label: "Username"
- Display: @ prefix shown as non-editable prefix, athlete edits the value portion
- Live availability check (300ms debounce)
- Locked with cooldown message when changed within 30 days
- Same validation rules as O-2 username step

---

## Section 9 — O-2 Changes Required

O-1 is unchanged. O-2 must add a username collection step.

### 9.1 O-2 Username Screen Requirements

**Position in O-2 flow:** After Athlete Type selection. The exact O-2 flow is defined by the O-2 spec (not yet written); this amendment establishes that a username step should exist within O-2 as an optional, skippable step.

**Screen requirements:**
- Title: "Choose your username" — 22sp, primary weight
- Subtitle: "This is how athletes find you in Forge Legacy." — 15sp
- Username field with @ prefix, auto-suggested value, editable
- Live availability check
- Continue button: enabled when username is available and format-valid
- "Skip for now" option — tertiary text link — proceeds without username
- Auto-suggestion logic as defined in Section 2.1

---

## Section 10 — Edge Cases

### 10.1 Athlete Has No Username

Profile: no @username line. Search: athlete appears in display name search only. P-1: nudge appears prompting username creation. WwF: athlete may be hard to distinguish in non-squad results if display name is common.

### 10.2 Two Athletes With Identical Display Names in Search Results

Both appear with their respective @usernames as the disambiguating secondary line. Searcher identifies the correct person by @username or avatar.

### 10.3 Display Name Change Does Not Affect Username

Username is set and changed independently. Historical records store Display Name snapshots per "History Cannot Be Rewritten" — changing display name does not alter WwF history entries.

### 10.4 Auto-Suggestion Produces Username Under 3 Characters

If display name processes to < 3 characters (e.g., "Ed" → "ed"), the auto-suggestion is not used. Field shown empty; athlete types manually.

### 10.5 @ in Search Field Without Following Characters

Shows empty state ("Enter a username to search") — no results, no error. @ prefix triggers username-only mode, which requires at least 1 character after @.

### 10.6 Username Taken Mid-Edit

If the athlete types a username and it becomes taken between their last keystroke and the Continue tap (race condition), the server rejects it and shows "That username was just taken. Please try another."

### 10.7 Display Name Change After Username Is Set

No impact on username. Username was set based on display name at O-2 time. Changing display name later (P-2) does not change the username. The athlete may choose to update their username separately to match their new display name.

---

## Section 11 — Architecture Risks

### Risk 1 — All Auto-Suggestion Variants Taken

For very common display names at scale ("John"), all obvious auto-suggestions ("john", "john2"...) may be taken. Auto-suggestion falls back to empty field with prompt to type manually.

**Risk level:** Low. Affects only athletes with extremely common names.

### Risk 2 — Username Squatting at Launch

Early athletes will register common usernames. First-come-first-served is the correct MVP policy — no reservation or identity verification. A future Support process can address rare legitimate disputes.

**Risk level:** Low for MVP.

### Risk 3 — Squad Handle Architecture Undefined

Squad handles (for squad search) are a separate system not defined here. Must be addressed in S-1 or W-4 amendments before squad search is implemented.

**Risk level:** Medium. Blocks squad search implementation.

### Risk 4 — Granular Search Privacy Not Defined

This amendment provides one "non-squad searchability" toggle. Separate per-field opt-outs (display name only vs. username only) are deferred to V1.1.

**Risk level:** Low for MVP.

---

## Section 12 — Validation Checklist

### Username System
- [ ] Format: lowercase letters, numbers, underscores only; 3–20 characters; starts with letter or number
- [ ] System-wide unique at any given time
- [ ] @ prefix is display convention only — not stored in database
- [ ] Invalid characters blocked at input (no error message; input simply does not register)
- [ ] Old username held 14 days after change before release

### O-2 Username Step
- [ ] Screen title: "Choose your username" — 22sp
- [ ] Subtitle: "This is how athletes find you in Forge Legacy." — 15sp
- [ ] @ prefix shown as non-editable prefix on field
- [ ] Auto-suggested value pre-filled and editable
- [ ] Live availability check — "Available ✓" shown when free
- [ ] "That username is taken" with tappable alternative when taken
- [ ] Continue enabled when username is available and format-valid
- [ ] "Skip for now" always present and functional — proceeds through O-2 and into the app without a username
- [ ] Skipping username does not block O-2 completion or app access

### Username Changeability
- [ ] Editable in P-2
- [ ] 30-day cooldown between changes — cooldown message shown in P-2 field
- [ ] No lifetime limit on number of changes

### Search
- [ ] Queries both Display Name and Username simultaneously (no @ prefix)
- [ ] @ prefix in search triggers username-only mode
- [ ] Result row: Display Name primary (15sp, primary weight), @username secondary (13sp, muted)
- [ ] Squad members ranked above non-squad
- [ ] Empty search state: no results shown
- [ ] No results state: "No athletes found. Check the spelling or ask them to share their username."

### Workout With Friend
- [ ] S-10 and W-20 partner search uses unified search
- [ ] WwF result rows show @username secondary line
- [ ] All WwF notification copy uses Display Name only
- [ ] All WwF history copy uses Display Name only

### Squad
- [ ] Squad rosters: Display Name only — S-2 and S-3 copy unchanged
- [ ] Invite search: gains username capability — no visible copy changes

### P-1 Profile
- [ ] @username shown below Display Name — 13sp, muted secondary
- [ ] @username line absent when no username set
- [ ] @username tappable — copies to clipboard — toast: "Copied"

### P-2 Edit Profile
- [ ] Username field present and editable
- [ ] Cooldown message shown within 30-day window

### Privacy (P-6)
- [ ] "Let non-squad athletes find me in search" toggle — default: on
- [ ] When off: athlete unsearchable by non-squad athletes (both display name and username)
- [ ] When off: squad members unaffected

---

## Section 13 — Downstream Specs Affected

| Spec | Change Required |
|------|----------------|
| O-2 (not yet written) | Must include Username collection step — required, auto-suggested, skippable |
| P-1 Profile v1.0 | Add @username line to identity block below Display Name |
| P-2 Edit Profile (not yet written) | Must include Username field with cooldown display |
| P-6 Privacy (not yet written) | Must include "Let non-squad athletes find me in search" toggle |
| WwF v1.1 → v1.2 | Search queries Display Name + Username; result rows show @username secondary |
| S-1, S-3 | Invite search gains username capability; no visible copy changes |
| Search service (implementation) | Unified query, @ prefix routing, squad-first ranking |

---

## Change Log

### v1.1 — June 2026

Wording clarification. Section 2.1 and Section 9.1 corrected to reflect username as **optional but strongly encouraged**, not required. v1.0 contained an internal inconsistency: Section 2.1 stated username was "required — athletes cannot complete O-2 without a username" while Section 2.2 defined a "Skip for now" path. The skip path was architecturally correct. Skipping username does not block O-2 completion or app access. Athletes who skip are not searchable by non-squad athletes via username but may still be found by display name search. Validation checklist updated to make the skip path explicit. No other architectural changes.

### v1.0 — June 2026

Initial architecture document. Resolves O-1 Risk 4 (username vs. display name ambiguity). Establishes two-tier identity model: Display Name (human expression, not unique, visible everywhere) + Username (system address, unique, visible in search and profile only). Defines format rules, collection in O-2 with auto-suggestion, 30-day changeability cooldown, unified search behavior with @ prefix for username-only mode, result row format, WwF amendment (search only — no copy changes), Squad amendment (search only — no copy changes), P-1 identity block addition, P-2 edit capability, P-6 privacy toggle. Explicitly excludes: squad handle architecture (separate concern), granular per-field privacy opt-outs (V1.1), account deletion username release (MVP scope dependency).

---

*Forge Legacy — Username Architecture / Identity Amendment 001*
*v1.0 — June 2026*
*Authority: Master PRD Section 8 (Workout With Friend), Section 16 (Privacy), Product DNA*
