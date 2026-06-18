# Forge Legacy — Squad Management & Permissions Specification
## S-3 | Phase 2B | Version 1.1 — June 2026

---

## Preamble: What S-3 Is For

S-1 surfaces the squad. S-2 surfaces what is happening inside it. S-3 answers the operational question: **"How does this squad work?"**

Who can change the squad's name? Who decides when a member should be removed? What happens when the person who created the squad wants to leave? These are governance questions. In most software products, governance answers accumulate: roles, permissions, moderators, approval chains, admin panels. The architecture grows toward complexity because complexity feels thorough.

Forge Legacy is building accountability groups of five to ten people who trust each other. The governance model for this context is not the same governance model appropriate for a community of thousands. A close friend group does not need a moderation hierarchy. It needs one clear answer to one question: who is responsible?

S-3 is governed by a two-tier model: one owner, everyone else as members. The owner is the person who created the squad and bears the final responsibility for its existence. Members are everyone the owner (and other members) have invited in. This is the simplest model that safely covers every legitimate governance scenario while avoiding the social hierarchy dynamics that more complex role trees inevitably create.

Every permission in S-3 was challenged against a single question: **"Is this necessary for a high-trust accountability group?"** What survived is documented here. What was removed was removed because it was unnecessary, and unnecessary governance is a product design flaw in a high-trust context.

---

## Section 1 — S-3 Goals

S-3 exists to accomplish five things:

1. **Allow squad identity editing** — name and purpose, accessible to all members because the squad belongs to everyone in it
2. **Surface the permission model** — who owns this squad and what that means, visible without requiring the athlete to look it up
3. **Enable member management** — the owner can remove members when necessary; this action is available but not prominent
4. **Manage pending invitations** — view and cancel outstanding invites
5. **Provide safe exit paths** — every member has a clean way to leave; the owner has a structured path that prevents the squad from becoming ownerless

**What S-3 answers:**
- Who is the owner of this squad?
- How do I edit the squad's name or purpose?
- How do I see who has been invited but hasn't joined yet?
- How do I remove a member? (owner only)
- How do I transfer ownership?
- How do I leave this squad?
- How do I delete this squad? (owner only)

**What S-3 does NOT answer:**
- How often are members training?
- What is each member's chapter progress?
- Who is performing best?
- How do I promote a member to a role?

**Why this scope:**
S-3 is a maintenance surface. Most athletes will visit it infrequently — to rename the squad, to send an invite, to remove someone, or to clean up a squad they no longer want. It should feel complete and trustworthy, not bureaucratic. Every section serves a real governance need. Nothing is present for completeness alone.

---

## Section 2 — Information Hierarchy

**TIER 1 — Squad Identity**
The squad's editable fields: name and purpose. First because these are the most common reason an athlete opens Squad Settings. Editing squad identity is a lightweight, frequent action compared to member management or departure.

**TIER 2 — Member List with Management**
The roster. The owner sees remove affordances on each member row. Regular members see the roster without management actions. Member count relative to the squad maximum is shown here — the athlete knows how much capacity remains.

**TIER 3 — Pending Invitations**
Outstanding invites awaiting acceptance. Shown when any invites exist; absent when none do. Allows owner (and senders) to cancel invites that are no longer appropriate.

**TIER 4 — Squad Actions**
Ownership transfer (owner only). Separate from the danger zone below by visual separation.

**TIER 5 — Danger Zone**
Leave Squad and Delete Squad (owner only). Positioned last. Destructive actions belong at the bottom, require confirmation, and should never be reached accidentally while managing the squad.

**Hierarchy principle:**
Most visits to S-3 are for Squad Identity editing or member management — not departure or deletion. The hierarchy serves the common case first. Destructive actions are accessible but not foregrounded.

---

## Section 3 — Full Scroll Order

S-3 is entered from S-2 via [⋯] → Squad Settings. It is a navigation stack screen.

### 3.1 Owner View

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  [←]  Squad Settings                                    │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SQUAD IDENTITY                                         │
│                                                         │
│  Squad Name                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Iron Fathers                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Purpose  (Optional)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Helping fathers stay strong for their...       │   │
│  └─────────────────────────────────────────────────┘   │
│  60 characters max                                      │
│                                                         │
│  Squad Icon  (Optional)                                 │
│  [ ●Mtn ][ Shield ][ Barbell ][ Wolf ][ Eagle ] →      │  ← horizontally scrollable icon chips
│                                                         │
│  [  Save Changes  ]  ← Secondary CTA (enabled on edit) │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  MEMBERS  4 of 10                                       │
│                                                         │
│  [👤]  Alex — You (Owner)                               │
│  [👤]  Jordan                              [Remove]     │
│  [👤]  Maya                                [Remove]     │
│  [👤]  Sam                                 [Remove]     │
│  [👤]  Riley                               [Remove]     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PENDING INVITATIONS  1                                 │
│                                                         │
│  [👤]  Pat Johnson  ·  invited by Jordan    [Cancel]    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Transfer Ownership  →  ]                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Leave Squad  ]   ← requires ownership transfer     │
│  [  Delete Squad  ]  ← destructive, confirmation req.  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Member View

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  [←]  Squad Settings                                    │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SQUAD IDENTITY                                         │
│                                                         │
│  Squad Name                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Iron Fathers                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Purpose  (Optional)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Helping fathers stay strong for their...       │   │
│  └─────────────────────────────────────────────────┘   │
│  60 characters max                                      │
│                                                         │
│  Squad Icon  (Optional)                                 │
│  [ ●Mtn ][ Shield ][ Barbell ][ Wolf ][ Eagle ] →      │  ← horizontally scrollable icon chips
│                                                         │
│  [  Save Changes  ]  ← Secondary CTA (enabled on edit) │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  MEMBERS  4 of 10                                       │
│                                                         │
│  [👤]  Alex (Owner)                                     │
│  [👤]  Jordan — You                                     │
│  [👤]  Maya                                             │
│  [👤]  Sam                                              │
│  [👤]  Riley                                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PENDING INVITATIONS  1                                 │
│                                                         │
│  [👤]  Pat Johnson  ·  invited by Jordan    [Cancel]    │  ← Cancel only if You sent it
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Leave Squad  ]                                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**Key differences between owner view and member view:**

| Element | Owner | Member |
|---------|-------|--------|
| Remove button on member rows | Visible | Not present |
| Cancel on others' pending invites | Visible | Not present |
| Transfer Ownership CTA | Present | Not present |
| Delete Squad CTA | Present | Not present |
| Leave Squad behavior | Requires transfer first (if members remain) | Direct with confirmation |

**What is the same in both views:**
- Squad identity editing (both can edit name, purpose, and squad icon)
- Member list (both see all members)
- Pending invitations list (both see who has been invited)
- Leave Squad CTA

---

## Section 4 — Permission Model

### 4.1 Two-Tier Model

Forge Legacy squads use a two-tier permission model: **Owner** and **Member**.

No moderator tier. No admin tier. No co-owner. Two tiers only.

| Permission | Owner | Member |
|------------|-------|--------|
| Edit squad name | Yes | Yes |
| Edit squad purpose | Yes | Yes |
| Select/edit squad icon | Yes | Yes |
| Invite new members | Yes | Yes |
| Cancel their own pending invites | Yes | Yes |
| Cancel any pending invite | Yes | No |
| View all pending invites | Yes | Yes |
| Remove members | Yes | No |
| Transfer ownership | Yes | No |
| Leave squad freely | No — must transfer first (if others remain) | Yes |
| Delete squad | Yes | No |

### 4.2 Why Two Tiers, Not Three

The temptation to add a third tier (co-owner, moderator, admin) is a product design instinct borrowed from community software. It is inappropriate for this context.

A third tier creates:
- A social distinction between "elevated" members and regular members
- A question every member asks: why was this person elevated and not me?
- Governance overhead: who gets the third tier, who loses it, what do they do with it?

In a close friend accountability group, these dynamics are harmful. The squad is not an organization with a hierarchy — it is a group of people who trust each other enough to show up. Adding a third tier implies that some members are more trusted than others within the squad, which undermines the high-trust foundation.

The two-tier model answers every governance need:
- Name changes: any member (low-stakes, reversible)
- Invites: any member (organic growth through relationships)
- Removal: owner only (high-stakes, relational consequence)
- Deletion: owner only (irreversible, squad-ending)

The only actions that are owner-only are the ones with significant or irreversible consequences. Everything else is open to all members.

**Settings vs. governance actions:**
Identity settings (squad name, purpose, icon) are shared — any member can edit them because they belong to the squad as a collective. Governance actions (remove member, transfer ownership, delete squad) are owner-only because they have significant or irreversible consequences for the group. This distinction is intentional: the squad's identity is co-owned; its governance responsibility is held by one person.

### 4.3 Why All Members Can Edit Squad Identity

Squad identity — name and purpose — belongs to the squad, not just the owner. The squad is a collective. In a close friend group, anyone can suggest renaming the group chat, and if someone renames it to something the group accepts, it sticks. Restricting name editing to the owner treats the squad as the owner's property rather than the group's shared context.

This was established in S-2 v1.1 Section 4.5: "Squad Settings — opens squad edit screen (S-XX, to be defined): athlete can edit squad name and purpose. Available to all members."

**Conflict handling:** If two members edit the squad name simultaneously, last-write wins. There is no collaborative editing session. S-3 is a settings screen, not a real-time editor.

### 4.4 Why All Members Can Invite

Invitations are how squads grow. Restricting invites to the owner means the squad can only grow through one person's relationships — the owner's. For an accountability group, the athlete's training relationships span more than one person's network. Any member should be able to bring in a trusted training partner.

The owner can cancel any pending invite if a member sends one that isn't appropriate. This is the safeguard. The openness is the default.

### 4.5 Why Only the Owner Can Remove Members

Removal is a relational action with real consequences. In a small, high-trust group, removing someone changes the social dynamic for everyone. This responsibility appropriately belongs to the person who created and owns the squad — not to any member who might act unilaterally.

A non-owner cannot remove another member, even if they want to. If a member wants someone removed, the path is to ask the owner. This is not a technical limitation — it is a deliberate design decision that keeps removal a considered action rather than a reflexive one.

### 4.6 Why Only the Owner Can Delete

Deletion is permanent. All member history in this squad is gone. The squad disappears from every member's S-1. This is not a casual action — it is the end of a shared accountability relationship. Only the person who created the squad can end it. Members can leave; they cannot dissolve.

---

## Section 5 — Ownership Model

### 5.1 Who Is the Owner

The athlete who created the squad is its owner. Ownership is represented in S-3 with "(Owner)" appended to their name in the member list. On S-2, no special owner label appears — the owner is visible as a member. The owner status surfaces in S-3, the governance context.

**A squad always has exactly one owner.** The transfer requirement before leaving (Section 5.5) and automatic transfer on account deletion (Section 5.4) enforce this invariant — the squad is never left without an owner.

### 5.2 What the Owner Label Communicates

The "(Owner)" label is informational, not hierarchical in a social sense. It answers "who is responsible for this squad?" — not "who has more value in this squad?" Members who see "(Owner)" beside Alex's name understand Alex can delete the squad or remove members. They do not interpret it as "Alex's opinions matter more" or "Alex trains harder."

### 5.3 Ownership Transfer — Manual

The owner can transfer ownership to any other squad member at any time.

**Transfer flow:**

```
Owner taps [Transfer Ownership →]
        ↓
Member Selection Sheet slides up:
        
  Transfer Ownership to...
  ──────────────────────────────
  [👤]  Jordan
  [👤]  Maya
  [👤]  Sam
  [👤]  Riley
  ──────────────────────────────
  Cancel

        ↓  owner selects a member
        
Confirmation Sheet:
  "Transfer ownership to Jordan?
   You will become a regular member.
   Jordan will be able to remove members and delete this squad."
  [Transfer]  Primary
  [Cancel]    Secondary

        ↓  owner confirms
        
Ownership transferred.
S-3 refreshes:
  - Jordan's row now shows "(Owner)"
  - Alex's row shows "— You" (no Owner label)
  - Transfer Ownership CTA is gone from Alex's view
  - Delete Squad CTA is gone from Alex's view
```

The transfer is immediate and cannot be undone without Jordan initiating a new transfer back.

**Ownership transfer is unilateral.** The current owner assigns ownership; the new owner does not confirm or accept the transfer. This is a deliberate decision for the close-friend-group context — if the owner is departing, someone needs to take responsibility, and the departing owner is best positioned to choose who. The new owner is notified immediately. If the new owner does not wish to hold ownership, they can initiate their own transfer to any other member at any time using the same Transfer Ownership flow.

### 5.4 Ownership Transfer — Automatic (Account Deletion)

If the owner deletes their Forge Legacy account while the squad has other members, ownership automatically transfers to the member with the earliest squad join date. No human decision is required. The squad continues. The former owner's row is removed from the member list. The new owner is not sent a confirmation request — ownership is assigned.

**Why earliest join date:** This is a neutral, observable criterion. The earliest-joined member has been in the squad longest and most likely has the strongest connection to the squad's purpose. Seniority is the least-controversial automatic selection rule.

**The new owner is informed:** The new owner receives a notification: "You are now the owner of [Squad Name]." This surfaces the context without framing it as a burden.

### 5.5 Owner Leaving — With Other Members Present

When the owner wants to leave a squad that has other members:

**Step 1:** Owner taps "Leave Squad."

**Step 2:** Instead of the standard leave confirmation, a transfer-first sheet appears:

```
  Leave [Squad Name]?
  ──────────────────────────────────────────────
  To leave this squad, transfer ownership to
  another member first. The squad will continue
  without you.
  
  [Transfer Ownership →]   Primary
  [Cancel]                 Secondary
```

**Step 3:** Owner completes the transfer flow (Section 5.3). After transfer, they are now a regular member.

**Step 4:** As a regular member, they can now leave the squad normally via the Leave Squad flow.

**Why this two-step path:**
The squad should not become ownerless. If the owner could leave freely without transferring, the squad would either dissolve automatically or enter a state where no one can delete it or remove members. Neither outcome is correct. The transfer requirement is a constraint that preserves the squad's stability.

### 5.6 Owner Leaving — As Last Member

If the owner is the only member remaining (everyone else has left or been removed), tapping "Leave Squad" triggers a single confirmation:

```
  Leave and delete [Squad Name]?
  ──────────────────────────────────────────────
  You are the last member. Leaving will
  permanently delete this squad. This
  cannot be undone.
  
  [Delete Squad]   Destructive Primary
  [Cancel]         Secondary
```

There is no orphan state. A squad with zero members does not exist.

### 5.7 Owner Inactivity — Not Handled in MVP

There is no inactivity trigger in MVP. If the owner stops using the Forge Legacy app without leaving the squad or deleting their account, ownership does not automatically transfer. No time-based transfer mechanism exists. No member can force an ownership change through the product.

**Practical consequences of an inactive owner:**
- All accountability functions continue unaffected: Train Together, member presence visibility, and squad invitations all work without any owner action
- Any member can still invite new members
- Any member can still leave the squad voluntarily
- The owner's row remains in the member list with the "(Owner)" label — their presence state updates normally if they log workouts; shows "Not yet this week" if they do not
- What is blocked: no member can remove another member, and no member can delete the squad. These remain owner-only actions.

**What members can do:**
Members who wish to leave a squad with an inactive owner can leave voluntarily via the Leave Squad flow. There is no product-level escalation path for forcing ownership transfer from an inactive owner.

**Why this is acceptable for MVP:**
In the context of small, high-trust accountability groups, an inactive owner is an unusual and manageable situation. The squad's core function — showing up, training, accountability — is entirely unaffected. The only cost is loss of removal and deletion capability, which are low-frequency governance actions. Defining "inactive" (how long? what behavior counts?), handling disputes, and building escalation flows adds complexity beyond MVP scope.

**Future consideration:**
An inactivity-based ownership transfer mechanism may be appropriate for V1.1 if launch data shows that inactive-owner squads are a common problem. For now, the behavior is explicitly: no inactivity trigger.

---

## Section 6 — Squad Identity Editing

### 6.1 Squad Name Field

- Text input field, full-width
- Label: "Squad Name"
- No placeholder — existing name is pre-populated
- Character limit: applied at input (no silent truncation)
- Required: Yes — squad name cannot be saved as empty
- Minimum: 1 character
- Maximum: to be defined in implementation (recommend 40–50 characters for display safety)

### 6.2 Squad Purpose Field

- Text input field, full-width, multiline (2-line max input)
- Label: "Purpose (Optional)"
- Helper text: "60 characters max"
- Character counter displayed below field when approaching limit
- Pre-populated with existing purpose, or empty if none has been set
- Can be cleared to remove the purpose — saving an empty purpose field removes the purpose from the squad

### 6.3 Save Changes CTA

- Label: "Save Changes"
- Secondary CTA class
- Full-width
- **Enabled only when at least one field has been changed from its saved state**
- When no changes exist: button is disabled (visually muted, not tappable)
- On tap: changes saved immediately. Button returns to disabled state. No success toast required — the fields reflect the saved values, which is confirmation enough.
- If the squad name field is empty: save is blocked; inline error appears under the name field: "Squad name is required."

**Why disabled when unchanged:**
An always-enabled Save Changes button invites accidental taps that produce unnecessary server writes and confuse the athlete ("did something change?"). Disabling until there is something to save makes the state legible.

### 6.4 Squad Icon Field

- Horizontally scrollable row of built-in icon options
- Label: "Squad Icon (Optional)"
- Nine built-in options: Mountain, Shield, Barbell, Wolf, Eagle, Compass, Tree, Hammer, Fire
- One additional option: None — no icon displayed (default for new squads)
- Optional — a squad can exist with no icon
- Single-select — only one icon can be active at a time
- Currently selected icon is visually indicated (filled / highlighted state)
- New squads default to no icon (None selected)

**Saving squad icon:**
Icon selection is included in the Save Changes flow. Tapping Save Changes after selecting an icon saves the icon alongside any other changes. Selecting an icon without saving does not persist the change. The Save Changes CTA becomes enabled as soon as the icon selection differs from the saved state.

**Why built-in icons, not custom image uploads:**
Custom image uploads introduce content moderation requirements, storage infrastructure, and upload flow complexity that exceed the accountability value in MVP. Built-in icons provide squad identity and personality without any of that overhead. The icon set represents training contexts, values, and identities that resonate with athletes: endurance (Mountain, Compass), strength (Barbell, Shield, Hammer), team and spirit (Wolf, Eagle, Fire), and nature and growth (Tree).

**Custom uploads (V1.1+):**
Custom squad image uploads remain deferred to V1.1+. The built-in icon set is a complete MVP solution. No "upload your own" affordance appears in MVP.

**Display context:**
When set, the squad icon is displayed on:
- S-1 squad card — alongside squad name and member avatars
- S-2 squad header — alongside squad name and purpose

**Note:** S-1 v1.1 and S-2 v1.2 do not currently define squad icon display behavior. Those specs require amendments before implementation to define icon placement, sizing, and display rules on squad cards and squad headers.

---

## Section 7 — Member Management

### 7.1 Member List in S-3

The member list in S-3 differs from the member list in S-2:

| Attribute | S-2 Member List | S-3 Member List |
|-----------|-----------------|-----------------|
| Purpose | Accountability visibility | Governance roster |
| Presence states shown | Yes | No |
| Tappable rows | Yes (opens Limited Athlete Profile) | No |
| Remove button | No | Yes (owner view only) |
| "(Owner)" label | No | Yes |
| "— You" label | Yes | Yes |
| Alphabetical order | Yes | Yes |
| Chevron [›] affordance | Yes | No |

Member rows in S-3 are not tappable. S-3 is a management screen — the member row's job is to identify the member and surface the remove action (if applicable). Tapping a member row in S-3 does nothing.

**Why no presence states in S-3:**
S-3 is a governance context, not an accountability context. Presence states belong in S-2, where their purpose is clear. Showing presence states in S-3 would imply they are relevant to management decisions — which they are not. Removal is not a presence-based decision.

### 7.2 Member Count

The section label "MEMBERS" is followed by the count in format: "[current] of [maximum]"

Example: `MEMBERS  4 of 10`

This tells the athlete how much capacity the squad has before invites are blocked. When the squad is at maximum, the count reads: `MEMBERS  10 of 10 — Full`

### 7.3 Remove Member Flow

**Who can remove:** Owner only.

**Remove button:** Appears at the right edge of each non-owner member row in the owner's view. Compact, destructive text color. Does not appear on the owner's own row. Does not appear in the member view.

**Remove confirmation sheet:**

```
  Remove [Member Name] from [Squad Name]?
  ──────────────────────────────────────────────
  They will lose access to this squad and will
  no longer see squad members' presence.
  
  [Remove]   Destructive Primary
  [Cancel]   Secondary
```

**After removal:**
- Removed member's row disappears from S-3 member list
- Removed member's row disappears from S-2 member list
- Member count decreases
- Removed member is not notified with an accusatory message — the squad simply disappears from their S-1 squad list. If they navigate to a deep link, they see a neutral "This squad is no longer available."
- Remaining squad members receive no announcement of the removal. The member's row is simply gone the next time they view S-2 or S-3.

**Why silent removal:**
Announcing a removal ("Jordan was removed from Iron Fathers") creates awkwardness for remaining members and shame for the removed member. The removal is a relational decision between the owner and the removed member — it does not need to be broadcast to the squad.

### 7.4 Cannot Remove Owner

The owner's row has no Remove button in either view. The owner cannot be removed by members. If the owner should be "removed," the appropriate path is for the owner to transfer ownership and then leave voluntarily, or for the situation to be handled outside the product.

### 7.5 Effect of Removal on Training Records and WwF History

Removing a member from a squad does not modify any athlete's individual training records.

**Training history and legacy:**
The removed member's workout history, chapters, honors, accomplishments, and all legacy data remain intact on their own account. The squad is a visibility and accountability context — it does not own any athlete's training data. Removal ends the squad relationship; it does not alter what the athlete built while they were a member. The remaining squad members' training records are equally unaffected.

**WwF reference entries:**
WwF reference entries live on individual workout records, not on the squad. An entry created when two athletes trained together — "Trained with Jordan" on Alex's workout record — is a permanent part of that workout's attribution. Removing Jordan from the squad does not delete or modify this entry.

**Pending M-8 requests:**
M-8 (Unclaimed Workout) requests are generated at the moment of W-17 "Done" — when the workout is saved. If a workout was completed while the tagged partner was a squad member, the M-8 was generated at that time. Subsequent removal from the squad does not cancel pending M-8 requests already in W-1. Those requests remain pending until actioned (claimed or dismissed) or until they expire per the WwF architecture (v1.1).

**Future WwF routing after removal:**
After removal, the removed member is no longer a squad member. Any future WwF tags involving the removed member route through M-9 (Pending Approval) rather than M-8 (claim/dismiss). This is the standard WwF routing logic — the same logic that applies to any non-squad athlete.

**Summary:**

| Data type | Effect of removal |
|-----------|------------------|
| Removed member's workout history | Unaffected |
| Removed member's chapters and legacy | Unaffected |
| WwF reference entries on past workouts | Unaffected |
| Pending M-8 requests already in W-1 | Not cancelled — remain pending |
| Future WwF tagging (post-removal) | Routes through M-9, not M-8 |
| Remaining members' training records | Unaffected |

---

## Section 8 — Invite Management

### 8.1 Invite Initiation

Invite initiation (searching for an athlete, sending the invite) is handled by the Squad Invite Flow — a separate screen (S-XX, to be defined). The "+ Invite to Squad" CTA on S-2 and the "Invite to Squad" option in the [⋯] Squad Options sheet both navigate to the invite flow. S-3 does not contain the invite creation UI — it contains the pending invite management UI.

### 8.2 Pending Invitations Section

The "PENDING INVITATIONS" section appears on S-3 when at least one invite is outstanding. When no invites are pending, the section is entirely absent — no "No pending invitations" placeholder.

**Section label:** `PENDING INVITATIONS  [count]`

**Pending invite row anatomy:**

```
[👤]  [Invitee Name]  ·  invited by [Inviter Name]    [Cancel]
```

- Avatar: 36dp. Initials rendered if the invitee has no profile photo visible at invite time.
- Invitee name: the display name of the athlete who was invited
- "invited by [Inviter Name]": shows which squad member sent this invite
- [Cancel]: appears if the viewing athlete is the owner OR if the viewing athlete is the invite sender

**Why show the inviter's name:**
In a small accountability group, transparency about who invited whom is appropriate and expected. If Jordan invited Pat Johnson, the other squad members knowing this is not a privacy violation — it is honest context. There are no anonymous invites in a high-trust group.

### 8.3 Cancel Invite Permissions

| Viewer | Can cancel invites they sent? | Can cancel invites others sent? |
|--------|------------------------------|----------------------------------|
| Owner | Yes | Yes |
| Member | Yes | No |

**Cancel invite confirmation:**

```
  Cancel invitation to [Invitee Name]?
  ──────────────────────────────────────────────
  [Invitee Name] will not receive another
  notification about this invitation.
  
  [Cancel Invitation]   Destructive Primary
  [Keep Invitation]     Secondary
```

After cancellation: the invite row is removed from the Pending Invitations section. If no invites remain, the section disappears. The invitee receives no notification that the invite was cancelled.

### 8.4 What Happens to a Pending Invite When Squad Reaches Maximum

If a squad reaches its member maximum while an invite is pending:
- Existing pending invites remain valid
- No new invites can be sent until the squad has capacity
- If the invitee accepts while the squad is at capacity: the invite is accepted and the member joins (pending invites are commitments, not contingent on future capacity)
- The squad temporarily exceeds maximum by the number of pending invites accepted simultaneously — this is an acceptable implementation edge case

**Why pending invites remain valid at maximum:**
Cancelling pending invites because the squad filled up would punish the invitee for an event they had no role in. The invite was sent in good faith. It remains valid.

### 8.5 Maximum Squad Size Enforcement

When the squad is at its member maximum, the invite initiation entry points are disabled:
- "+ Invite to Squad" CTA on S-2: disabled, with tooltip/label: "Squad is full (10 of 10 members)"
- "Invite to Squad" in [⋯] on S-2: disabled with same label
- From S-3: invite entry is not surfaced — the member count `MEMBERS 10 of 10 — Full` communicates capacity

**Maximum squad size is 10 members.** This is an MVP limit, not a permanent architectural constraint. Future expansion may be considered after launch data is collected on how accountability effectiveness scales with group size.

---

## Section 9 — Leaving Squad Flows

### 9.1 Member Leaving

**Trigger:** Member taps "Leave Squad" at the bottom of S-3.

**Confirmation sheet:**

```
  Leave [Squad Name]?
  ──────────────────────────────────────────────
  You will lose access to this squad. Your
  presence will no longer be visible to
  squad members.
  
  [Leave Squad]   Destructive Primary
  [Cancel]        Secondary
```

**After leaving:**
- S-3 is dismissed; athlete returns to S-1
- Squad card is absent from S-1
- Athlete's row disappears from S-2 and S-3 for remaining members
- Member count decreases
- No announcement to remaining members
- Remaining members' presence data is unaffected
- The leaving member's historic presence contribution to S-1 aggregate indicators disappears (they are no longer in the squad)

**Leaving is irreversible.** The athlete can only rejoin if a current squad member invites them again.

### 9.2 Owner Leaving With Members Present

See Section 5.5. The owner must transfer ownership before leaving. "Leave Squad" triggers the transfer-first sheet rather than the standard confirmation.

### 9.3 Owner Leaving as Last Member

See Section 5.6. Leave triggers a "Leave and delete" confirmation.

### 9.4 Leave Squad Is Not Accessible from S-2

Leave Squad is a governance action. It lives on S-3 (Squad Settings) only. S-2's [⋯] Squad Options sheet provides "Leave Squad" as a shortcut — that shortcut navigates to or triggers the same flow. It does not bypass the confirmation.

---

## Section 10 — Ownership Transfer Flow

See Section 5.3 for the full transfer flow and Section 5.4 for automatic transfer on account deletion.

**Additional transfer behavior:**

**After a successful manual transfer:**
- The former owner's S-3 view no longer shows Transfer Ownership, Delete Squad, or Remove buttons
- The new owner's S-3 view now shows Transfer Ownership, Delete Squad, and Remove buttons
- The member list updates: "(Owner)" label moves from former owner to new owner
- No squad-wide notification is sent about the transfer
- The new owner receives a notification: "You are now the owner of [Squad Name]."

**Why no squad-wide notification:**
An ownership transfer is a governance event, not a social event. The remaining members do not need to know that Alex transferred ownership to Jordan. If they open S-3, they can see who the current owner is. The transfer does not change anything about their membership or accountability experience.

---

## Section 11 — Squad Dissolution

### 11.1 Owner Deletes Squad

**Trigger:** Owner taps "Delete Squad" at the bottom of S-3.

**Confirmation sheet:**

```
  Delete [Squad Name]?
  ──────────────────────────────────────────────
  This will permanently remove the squad for
  all [N] members. This cannot be undone.
  
  [Delete Squad]   Destructive Primary
  [Cancel]         Secondary
```

**After deletion:**
- Owner returns to S-1; squad card is absent
- All other members: squad card disappears from their S-1 on their next view or refresh
- All members receive a notification: "[Squad Name] has been deleted."
- Member presence data within the squad context is deleted; individual training records are unaffected (they still own their workout history, chapter progress, etc.)

**Why members are notified of squad deletion:**
Unlike removal (silent, relational) and leaving (personal), deletion affects everyone simultaneously. Members deserve to know the squad is gone, not just encounter a missing card. The notification is neutral: "[Squad Name] has been deleted" — not "Alex deleted [Squad Name]."

### 11.2 Squad With Zero Members

A zero-member squad does not exist. This state can only occur if the last member (always the owner at that point, per the transfer requirement) leaves via the "Leave and delete" flow (Section 5.6). The squad is atomically deleted. There is no interim zero-member state.

---

## Section 12 — Edge Cases

### 12.1 Two Members Simultaneously Edit Squad Name

Last write wins. No collaborative editing. No conflict notification. This is an acceptable edge case for a low-frequency action on a settings screen.

### 12.2 Owner Is Removed — Not Possible

The owner cannot be removed. No Remove button appears on the owner's row. No member can initiate the removal of the owner. The only path to an ownership change is: owner transfers voluntarily (Section 5.3) or owner deletes account (Section 5.4).

### 12.3 Owner Tries to Transfer Ownership to a Member Who Leaves During Transfer Flow

If the selected transfer target leaves the squad between the member selection step and the confirmation step, the confirmation sheet should fail gracefully: "This member is no longer in the squad. Please select another member." The member selection sheet reappears with the updated roster.

### 12.4 Member Attempts to Access S-3 After Being Removed

If a member is removed while they have S-3 open (edge case on a shared network state), the next interaction should fail gracefully — S-3 closes and they are returned to S-1 with the squad absent.

### 12.5 Invite Accepted While Owner Is Viewing S-3

The member list updates — the new member row appears, the member count increases, the pending invite row disappears. No special state. Standard list refresh behavior.

### 12.6 Squad at Maximum Capacity — Owner View

"MEMBERS  10 of 10 — Full" is shown in the member list section header. The "+ Invite to Squad" and "Invite to Squad" entry points elsewhere on S-2 are disabled with appropriate labels. The Pending Invitations section still appears if any invites remain outstanding.

### 12.7 Owner Attempts to Leave With No Other Members But Open Pending Invites

There are no other members yet, but one or more invites are pending. The owner taps "Leave Squad":

"Leave and delete [Squad Name]?" confirmation is shown. If the owner confirms, the squad is deleted. Pending invites are cancelled. Invitees receive no notification (the squad no longer exists; the invite is simply void).

**Owner leaves with other members AND pending invites:** If the owner wants to leave while other members exist and pending invites are outstanding, the owner must transfer ownership first (Section 5.5). After the transfer, the new owner inherits the full state of the squad — including all pending invites, which appear in the new owner's Pending Invitations section. The new owner can manage or cancel them as they see fit.

### 12.8 New Owner Does Not Know They Are Now the Owner (Auto-Transfer)

After automatic transfer (Section 5.4), the new owner receives a notification: "You are now the owner of [Squad Name]." If they open S-3, they see their row labeled "(Owner)" and the owner-only controls are present. Adequate discovery — they do not need to stumble upon it.

### 12.9 Only Two Members in Squad — Owner Removes the Last Member

Owner removes the last non-owner member. Squad now has 1 member: the owner. The squad is valid — a one-person squad is not an error state (per S-2 Section 11.1). The owner can continue using the squad, invite new members, or delete it. No prompt to delete. No "Your squad is empty" warning.

### 12.10 Member Views S-3 When No Pending Invites Exist

The Pending Invitations section is absent. The screen flows from the member list directly to the Leave Squad CTA, with a separator. Clean, uncluttered.

### 12.11 Non-Owner Member Deletes Account

When a squad member (non-owner) deletes their Forge Legacy account:
- Their row disappears from the S-3 member list
- Their row disappears from the S-2 member list
- Member count decreases
- No squad-wide announcement is sent
- The effect is identical to the member leaving voluntarily

This behavior is consistent with S-2 Section 12.5, which defines account deletion from S-2's perspective. S-3 does not add behavior beyond this — account deletion is handled by the platform-level deletion flow.

---

## Section 13 — Mobile UX Considerations

### 13.1 Screen Mode

S-3 is a standard navigation stack screen with Top App Bar and Bottom Tab Bar. Not full-screen. Standard navigation always accessible.

### 13.2 Top App Bar

- Back arrow [←] navigates to S-2 (restoring S-2 scroll position)
- Title: "Squad Settings" — fixed, not the squad name (the squad name is an editable field in the content; duplicating it in the title would create confusion if the field is being edited)
- No [⋯] action — S-3 is itself the settings layer; there is no meta-settings

### 13.3 Save Changes Behavior

The Save Changes button is disabled when no changes exist. When the athlete edits a field, the button becomes active. The athlete taps Save. Changes are saved. The button returns to disabled state.

**No auto-save.** Navigating back without saving shows a discard confirmation:

```
  Unsaved changes
  ──────────────────────────────────────────────
  You have unsaved changes to your squad name
  or purpose.
  
  [Save Changes]   Primary
  [Discard]        Secondary
```

The athlete's changes are preserved in the UI until they explicitly save or discard. They are not lost on an accidental back gesture.

### 13.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| [←] back arrow | 44×44dp |
| Text input fields | Full-width × 44dp min |
| Save Changes CTA | Full-width × 44dp |
| Member rows (non-tappable) | Full-width × 52dp |
| Remove button | 44×44dp — right-aligned within member row |
| Cancel (pending invite) | 44×44dp — right-aligned within invite row |
| Transfer Ownership CTA | Full-width × 44dp |
| Leave Squad CTA | Full-width × 44dp |
| Delete Squad CTA | Full-width × 44dp |

### 13.5 Destructive Action Styling

"Leave Squad" and "Delete Squad" use destructive text color (typically red). They are separated from the Transfer Ownership CTA by a visual divider. They are the last items on the screen. Their position and color communicate consequence without requiring the athlete to read them carefully to understand the stakes.

### 13.6 Remove Button Styling

The [Remove] button on member rows in the owner view uses destructive text color. It is compact — the minimum size is 44×44dp but the visible text is small so as not to be visually prominent. Remove is available, not foregrounded.

**Why not a swipe-to-remove interaction:**
Swipe-to-reveal-delete is a standard mobile pattern, but it is hidden — the athlete must know to swipe to discover the action. In a governance context, the Remove affordance should be consistently visible to the owner (and invisible to members) without requiring exploration. An always-visible [Remove] text button in destructive color is discoverable and consistent with the screen's purpose.

### 13.7 Section Label Typography

Section labels ("SQUAD IDENTITY," "MEMBERS," "PENDING INVITATIONS") follow the pattern established across Phase 2B: uppercase, 12sp, secondary color, letter-spacing. Consistent with S-2's "MEMBERS" section label treatment.

### 13.8 Scroll Behavior

All content scrolls. No sticky elements within the content area. The Tab Bar is sticky at the bottom. The Save Changes CTA scrolls with the Squad Identity section — it is not sticky. The athlete must scroll to see it after editing, which is acceptable because editing is intentional.

### 13.9 Orientation

Portrait only — consistent with all Forge Legacy screens.

### 13.10 Accessibility

- Squad Name field: `accessibilityLabel` = "Squad name, text field"
- Purpose field: `accessibilityLabel` = "Squad purpose, optional, text field, 60 characters maximum"
- Save Changes: "Save changes, button"
- Member rows: `accessibilityLabel` = "[Name], [Owner or member]"
- Remove button: `accessibilityLabel` = "Remove [Name] from squad, button"
- Transfer Ownership: "Transfer ownership, button"
- Leave Squad: "Leave squad, button"
- Delete Squad: "Delete squad, button"
- Cancel invite: `accessibilityLabel` = "Cancel invitation to [Name], button"

---

## Section 14 — Validation Checklist

### Screen Architecture
- [ ] Top App Bar: back arrow [←] and "Squad Settings" title, no [⋯] action
- [ ] Back arrow returns to S-2 at same scroll position
- [ ] Bottom Tab Bar visible and functional
- [ ] Not full-screen mode
- [ ] Unsaved changes trigger discard confirmation on back navigation

### Squad Identity Section
- [ ] "SQUAD IDENTITY" section label present
- [ ] Squad Name field: editable, pre-populated, required
- [ ] Purpose field: editable, pre-populated or empty, optional, 60-character max with counter
- [ ] Squad Icon field: optional, single-select, horizontally scrollable row of chips
- [ ] Squad Icon field displays 9 built-in options: Mountain, Shield, Barbell, Wolf, Eagle, Compass, Tree, Hammer, Fire
- [ ] "None" option available (no icon — default for new squads)
- [ ] Currently selected icon visually indicated
- [ ] Icon selection is optional — squad can be saved without selecting an icon
- [ ] Icon selection change enables Save Changes CTA
- [ ] Icon saved with Save Changes — not auto-saved on selection
- [ ] All members (owner and non-owner) can edit squad name, purpose, and icon
- [ ] Save Changes CTA: disabled when no changes exist; enabled when changes are present
- [ ] Save Changes blocked if squad name is empty; inline error message shown
- [ ] After successful save: Save Changes returns to disabled state

### Member List Section
- [ ] "MEMBERS [current] of [maximum]" section label present
- [ ] All squad members listed alphabetically
- [ ] Viewing athlete's row labeled "— You"
- [ ] Owner's row labeled "(Owner)"
- [ ] Member rows are NOT tappable — no chevron, no navigation
- [ ] No presence states visible on S-3 member rows
- [ ] Owner view: [Remove] button present on all non-owner rows, absent on owner's own row
- [ ] Member view: no [Remove] button on any row
- [ ] Remove button uses destructive text color
- [ ] Remove action triggers confirmation sheet before removal
- [ ] Confirmation sheet names the member and the squad
- [ ] After removal: member row disappears, count decreases, no squad-wide announcement
- [ ] Owner row has no [Remove] button in any view

### Pending Invitations Section
- [ ] Section appears only when pending invites exist; absent when no invites are pending
- [ ] "PENDING INVITATIONS [count]" section label
- [ ] Each invite row: invitee avatar, invitee name, "invited by [Inviter Name]"
- [ ] [Cancel] button: visible to owner on ALL pending invite rows
- [ ] [Cancel] button: visible to the invite sender on their OWN pending invite rows only
- [ ] [Cancel] button: not visible to members who are neither owner nor sender
- [ ] Cancel action triggers confirmation sheet before cancellation
- [ ] After cancellation: invite row removed; section disappears if no invites remain
- [ ] Cancelled invitee receives no notification

### Squad Actions — Owner View
- [ ] "Transfer Ownership →" CTA visible to owner only
- [ ] Transfer Ownership opens member selection sheet (excludes owner from list)
- [ ] Transfer confirmation names the selected member and describes consequence
- [ ] After transfer: former owner loses owner-only controls; new owner gains them
- [ ] New owner receives notification of ownership change
- [ ] No squad-wide notification of ownership transfer

### Leave Squad
- [ ] "Leave Squad" CTA present for all members (owner and non-owner)
- [ ] Member leaving: standard confirmation sheet, destructive primary
- [ ] After member leaves: squad disappears from their S-1; their row removed from S-2 and S-3; no squad-wide announcement
- [ ] Owner leaving with members present: transfer-first sheet shown instead of standard confirmation
- [ ] Owner cannot leave freely if other members exist — must transfer first
- [ ] Owner as last member: "Leave and delete" confirmation shown; destructive language

### Delete Squad — Owner View
- [ ] "Delete Squad" CTA visible to owner only
- [ ] Delete confirmation names the squad and states irreversibility
- [ ] Confirmation states number of members affected
- [ ] After deletion: owner returns to S-1; squad absent; all members notified "[Squad Name] has been deleted"
- [ ] Individual training records unaffected by squad deletion

### Permission Model
- [ ] All members can edit squad name and purpose
- [ ] All members can invite (via S-2 entry points — S-3 does not contain invite initiation UI)
- [ ] All members can cancel their own pending invites
- [ ] Owner can cancel any pending invite
- [ ] Only owner can remove members
- [ ] Only owner can transfer ownership
- [ ] Only owner can delete squad
- [ ] Owner cannot be removed by any member

### Maximum Capacity (10 Members — MVP Limit)
- [ ] Member count shown as "[current] of 10" in MEMBERS section header
- [ ] When at maximum (10 of 10): count shows "— Full" suffix
- [ ] Invite entry points on S-2 disabled when squad is at maximum
- [ ] Pending invites that predate reaching maximum remain valid
- [ ] 10-member cap is an MVP limit — no permanent architectural enforcement required

### Empty / Edge States
- [ ] Single-member squad (owner only): valid state, no error, Leave Squad shows "leave and delete" confirmation
- [ ] No pending invitations: Pending Invitations section absent, no placeholder
- [ ] Squad at maximum: member count shows "— Full," invite entry points disabled
- [ ] After ownership transfer: all owner-only controls update immediately in both old and new owner views

### Mobile UX
- [ ] All tap targets ≥ 44dp
- [ ] Destructive actions (Leave, Delete, Remove) use destructive text color
- [ ] Destructive actions positioned at bottom of screen
- [ ] Save Changes CTA disabled when no unsaved changes
- [ ] Portrait orientation only
- [ ] Screen reader accessibility labels on all interactive elements
- [ ] Unsaved changes not silently discarded on back navigation

### Governance Philosophy Compliance
- [ ] No moderator tier, no admin tier, no co-owner tier — two tiers only (Owner + Member)
- [ ] No "most active" or performance-based governance logic
- [ ] Removal is silent — no squad-wide announcement
- [ ] Deletion notifies all members with neutral language — squad name, not executor
- [ ] S-3 feels closer to "managing a shared group chat" than "administering a community"

---

## Section 15 — Decision Log

The following decisions were open at v1.0 and are resolved in v1.1.

### Decision 1 — Maximum Squad Size

**Resolved:** 10 members.

This is an MVP limit, not a permanent architectural constraint. Future expansion may be considered after launch data is collected on how accountability effectiveness scales with group size. All S-3 size references use 10.

---

### Decision 2 — Squad Identity Visual

**Resolved:** Built-in squad icons. Custom image uploads deferred to V1.1+.

Nine built-in icons: Mountain, Shield, Barbell, Wolf, Eagle, Compass, Tree, Hammer, Fire. Optional, single-select, saved with Save Changes. See Section 6.4 for full specification.

Custom squad image uploads (user-provided photos) remain deferred to V1.1+ — content moderation requirements, storage infrastructure, and upload flow complexity exceed the MVP accountability value. The built-in icon set is a complete MVP solution.

**Note:** S-1 and S-2 require display amendments before implementation to define squad icon placement and sizing on squad cards and squad headers.

---

### Decision 3 — Governance Label

**Resolved:** The governance label is "(Owner)" — system-generated, non-editable.

"Owner" communicates governance responsibility clearly and is appropriate for private accountability groups. The label is appended by the product to the owner's display name row in S-3. The owner's display name is not modified. The "(Owner)" label is not a title the owner chose and is not editable.

---

*Forge Legacy Squad Management & Permissions Specification — S-3*
*v1.1 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, and all approved Phase 2B wireframe specifications including S-1 v1.1 and S-2 v1.2.*
*This document is the authority for all Squad Management & Permissions implementation in Phase 2B.*

---

## Change Log

### v1.1 — June 2026

**Decision Resolutions:**

| Decision | v1.0 Status | v1.1 Resolution |
|----------|-------------|-----------------|
| Maximum squad size | Proposed 10, open | Approved: 10 members — MVP limit, not permanent |
| Squad identity visual | Custom uploads deferred | Built-in icons (9 options). Custom uploads deferred to V1.1+. |
| Governance label | "(Owner)" assumed | Confirmed: "(Owner)" — system-generated, non-editable |

**Governance Validation Amendments:**

| # | Type | Where | What Added |
|---|------|--------|-----------|
| 1 | Real Gap | New Section 5.7 | Owner inactivity: not handled in MVP. Accountability functions unaffected; owner-only governance actions blocked. Explicitly deferred to V1.1 evaluation. |
| 2 | Real Gap | New Section 7.5 | Removal does not affect training records or WwF history. Pending M-8s not cancelled on removal. Future tags route M-9. Summary table included. |
| 3 | Real Gap | Section 5.3 | Ownership transfer is unilateral — no acceptance required from new owner. New owner can re-transfer at any time. |
| 4 | Minor | New Section 12.11 | Non-owner account deletion: same effect as member leaving. References S-2 Section 12.5. |
| 5 | Minor | Section 5.1 | Explicit invariant: "A squad always has exactly one owner." |
| 6 | Minor | Section 12.7 | Extended to cover owner-leaves-with-members-and-pending-invites: transfer required first; new owner inherits pending invites. |
| 7 | Minor | Section 4.1 | Explicit settings vs. governance actions distinction added. |

**New Section 6.4 — Squad Icon:**
Built-in icon field added to Squad Identity. 9 icons + None. Optional, single-select, saved with Save Changes. S-1 and S-2 display behavior requires separate amendments to those locked specs.

**Validation Checklist:**
Squad Identity section updated with 7 squad icon items. Maximum Capacity section updated to explicitly reference "10 members" and note MVP-limit status.
