# Squad Management — Amendment 001: Identity and Invite Governance

**Status:** LOCKED
**Date:** 2026-07-28
**Amends:** `Squad-Management-Permissions-Spec-S3.md` — §4.3, §4.4, §6.2, §6.5, §12, and the permission table in §11
**Also touches:** `Squad-System-Architecture-v1.0.md` SQ-D3.2 / SQ-D4.3 / SQ-D14 §1 (all defer to S-3 §4.3)
**Introduces:** SM-D1 (owner-only squad identity), SM-D2 (owner-controlled invites)
**Code status:** SM-D1 was already conformant (docs corrected, not the build); SM-D2 shipped as migration 0056

---

## 1 · The contradiction

S-3 §4.3 is titled "Why All Members Can Edit Squad Identity" and argues the case at length:

> Squad identity — name and purpose — belongs to the squad, not just the owner. The squad is a
> collective. In a close friend group, anyone can suggest renaming the group chat […] Restricting name
> editing to the owner treats the squad as the owner's property rather than the group's shared context.

The built app has never worked that way. `Squad Settings Member.dc.html` renders the member view
**read-only** — not disabled controls, simply absent ones — and the implementation follows it: the
`squads` UPDATE policy is `owner_id = auth.uid()`, and Squad Settings forks to a read-only screen for
non-owners.

The contradiction surfaced while implementing SQ-D14, whose §1 grants Commitment editing to any member
"same governance as squad name/purpose (S-3 §4.3)". Implementing the Commitment required deciding which
of the two was right.

## 2 · SM-D1 — Squad identity is owner-only

**Locked:** Only the squad owner may edit squad identity — **name, purpose/description, motto, icon,
Commitment** — and the squad **Goal and Mission**. Members see identity read-only.

Two reasons, in order:

1. **PD-7.** Where the design project and the documents disagree, the design governs and the documents
   are what get corrected. The design draws a read-only member view. S-3 is the stale artefact.
2. **Confirmed as intent, not accident** (2026-07-28). Asked directly whether members should be able to
   rename a squad, the product owner's answer was no — owner only. So this is not a case of the build
   drifting from a considered decision; the considered decision is the one the build already encodes.

S-3 §4.3's reasoning isn't wrong about squads being collective — it's wrong about which lever expresses
that. A squad's shared ownership shows up in its feed, its goal progress, its check-ins and its records,
all of which every member contributes to. The *name* is the one thing that shouldn't change under a
member's feet without the owner's involvement.

## 3 · SM-D2 — Inviting is owner-only by default, openable to members

**Locked:** Only the owner may invite by default. The owner may grant invite rights to all members via
**Squad Settings → Permissions → Who Can Invite** (Owner Only / Any Member). S-3 §4.4 previously granted
invites to every member unconditionally.

1. **The design already specified this.** `Squad Settings.dc.html` carries a Permissions section whose
   "Who Can Invite" control defaults to **Owner Only**. It was skipped at build time for having no
   backend, which left invites open with nothing able to close them. Migration 0056 builds it.
2. **It follows SM-D1.** Who enters a squad changes it for everyone already in it. The owner holds what
   the squad *is*; holding who it *admits* belongs with that.
3. **The organic-growth argument survives as the opt-in.** S-3 §4.4's reasoning — that squads grow
   through the relationships of all their members — is why the setting exists, not why it defaults on.
4. **Enforced server-side.** The invite code is served by `squad_invite_info()`, which withholds it from
   a member without permission. A client-side gate would have been cosmetic: `squads` RLS lets any
   member read the row, invite code included.

**Not built:** the design's second Permissions row, "Who Can Post Check-ins" (Everyone / Approved).
"Approved" has no meaning in this data model — there is no approved-member concept, and check-in posting
is already gated to membership. Shipping a control whose second option does nothing would be worse than
omitting the row; it returns when the semantics are decided.

## 4 · What is NOT changed

- **Every owner-only governance action** (remove member, transfer ownership, delete squad) — already
  owner-only in both spec and build.
- **The two-tier Owner/Member model** itself. This narrows what "Member" can edit; it does not add a
  tier.
- **Leave Squad**, available to all members. Unchanged.

## 5 · Corrections applied to S-3

| Location | Was | Now |
|---|---|---|
| §1 goals list | "accessible to all members" | owner-only |
| §4.3 (heading + body) | "Why All Members Can Edit Squad Identity" | "Why Squad Identity Is Owner-Only" |
| §4.2 rationale | "identity settings … any member can edit them" | identity is owner-held |
| §11 permission table | Edit name / purpose / Commitment = Yes for Member | No for Member |
| §12 shared-vs-owner list | "both can edit name, purpose, and squad icon" | owner edits; member views |
| §6.5 Commitment | "Editable by all members" | owner-edited |
| §16 Goal/Mission | "any member may set or edit" | owner sets or edits |
| §22 checklist | "editable by all members" | "editable by the owner" |
| §4.4 (heading + body) | "Why All Members Can Invite" | "Why Inviting Is Owner-Controlled" (SM-D2) |

`Squad-System-Architecture-v1.0` SQ-D3.2 / SQ-D4.3 / SQ-D14 §1 all defer to S-3 §4.3 for this rule and
therefore inherit the correction without needing their own edits; a pointer note is added at SQ-D14.

## 6 · Validation

- [x] SM-D1 — identity (name · description · motto · icon · Commitment) owner-only in spec and build
- [x] Goal / Mission owner-only in spec and build (`squad/[id].tsx` gates both on `squad.isOwner`)
- [x] `squads` UPDATE policy enforces it server-side, not just in the UI
- [x] Member Settings remains a read-only fork, matching `Squad Settings Member.dc.html`
- [x] SM-D2 — invites owner-only by default; Settings → Permissions opens them to members
- [x] Invite code withheld server-side by `squad_invite_info()`, not merely hidden in the UI
- [x] SM-D1 required no code change (build was already conformant); SM-D2 shipped as migration 0056 + the Permissions control

---

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-28 | Initial. Locks SM-D1 (owner-only squad identity, Commitment, Goal and Mission), reversing S-3 §4.3. Corrects eight locations in S-3. Confirms the build was already correct. |
| 1.1 | 2026-07-28 | Adds SM-D2 — inviting is owner-only by default, openable to all members via Settings → Permissions. Reverses S-3 §4.4. Shipped as migration 0056 (`invite_permission` + `squad_invite_info()`), building the Permissions control the design already specified. |
