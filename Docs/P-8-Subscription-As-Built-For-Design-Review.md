# P-8 Subscription — As Built, for Design Review

**Source of truth for this document:** `src/app/subscription.tsx` and `src/domain/billing/plans-core.ts`
as they stand on 2026-08-17. Cap numbers are read from `entitlement_config` (defaults in migration
`0145`). **Every string below is what the screen actually renders today** — nothing here is proposed.

**What this is for:** confirming the copy, the ordering and the state coverage are what we want, before
the screen is wired to RevenueCat (checklist 4.2) and seen by a paying athlete.

**⚠ The screen has never been rendered in a browser.** It type-checks, 2,450 tests pass and the route
emits, but static export is shell-only. Nobody has looked at it.

---

## 1 · What the screen is, and what it deliberately is not

It **sells**; it does not entitle. A completed purchase means only that *the store* believes payment
happened — `src/lib/entitlement.tsx` remains the single answer to "is this athlete Premium?", and every
purchase and restore ends by re-reading the server rather than setting local state.

**No price string exists anywhere in the code.** Every price is the localized string the platform
returned. The only derived figure is the annual saving percentage, computed from two platform prices,
and it renders as *nothing at all* when it cannot be stood behind. A test fails the build if a currency
amount appears in the file — including in a comment.

---

## 2 · Four states

| State | When | What renders |
|---|---|---|
| **Loading** | entitlement check in flight | Spinner only. Content is withheld on purpose — every section below depends on which tier is being read. |
| **Unknown** | entitlement unreadable (network) | A message and a **Try Again** button. **It must not default either way**: drawing Free would show an upsell to a Premium athlete whose network dropped; drawing Premium would tell a Free athlete they had already paid. |
| **Free** | tier = FREE | The full sales surface. §4 below. |
| **Premium** | tier = PREMIUM | Plan card, benefits, reassurance, Manage. §5 below. |

**Entry context changes the header control, and it is not cosmetic.** Arriving from Account Settings
shows a **back chevron** (there is a previous screen). Arriving from an M-7 upsell gate (`?from=gate`)
shows a **× close** — the athlete never opened Settings, and the correct return is the surface that
triggered the upsell, which then re-evaluates its own limit.

Screen title: **"Subscription"** (locked twice in spec, including the a11y table — not "Membership").

---

## 3 · The hero — both states

- Bronze metallic disc with the filled Forge mark
- Overline: **FORGE PREMIUM**
- Tagline — **Free:** "Everything you build, kept for life."
  **Premium:** "Your legacy, preserved for life."
- Principle: "The training engine is always free. Premium is for the permanence, scale and story around it."
- Chip: **Current plan** → `Free` or `Premium`

---

## 4 · Free state, in render order

### 4.1 "What Premium unlocks" — 5 rows

Legacy leads and is the only **starred** row (bronze-tinted background) — the design's ordering, and
the thing no competitor can copy.

| Icon | Headline *(from config)* | Supporting sentence |
|---|---|---|
| book ⭐ | **Unlimited photos** | Every progress photo and video kept, with no ceiling to work around. |
| dumbbell | **Unlimited programs** | Build, generate and receive as many programs as your training asks for. |
| squad | **5 squads** | Lead more than one squad at a time. |
| spark | **Unlimited imports** | Bring a coach's spreadsheet across whenever you need to. |
| medal | **Unlimited Coach Holt programs, including in your workout** | A full program for any goal, and help during the set — not just between them. |

**⚠ Squads says "5", not "unlimited", and that is deliberate.** Premium's squad ceiling really is 5.
Promising "unlimited squads" on a purchase surface is forbidden because the tier cannot deliver it —
a benefit row claiming something untrue is a false claim, not loose copy. Every other paid ceiling
(500 programs, 1,000 photos) is an abuse guard set so no legitimate athlete reaches it, so those render
as "Unlimited".

**⚠ Built features only.** Advanced analytics, Communities, premium share layouts and the Legacy export
book are all part of Premium's long-term definition and **none of them appear here**, because none of
them exist. Every line maps 1:1 onto a cap the app enforces today.

### 4.2 "At a glance" — the comparison table

Two columns, **Free** and **Premium**, six rows:

| Free | Premium |
|---|---|
| 3 programs | Unlimited programs |
| 75 photos | Unlimited photos |
| 1 squad | 5 squads |
| 1 lifetime import | Unlimited imports |
| 1 Coach Holt program | Unlimited Coach Holt programs |
| 2 Coach Holt days a month | Unlimited Coach Holt days a month |

Every number is interpolated from server config, never typed. Videos and day templates are real caps
but are deliberately excluded — the table is fixed at six rows, and these six are the ones the upsell
fires on most.

**Accessibility note that constrains the layout:** each row is *one* accessible element announcing
"Free: 3 programs. Premium: Unlimited programs." Two separate column containers would look identical
but read as an unattached list, losing the pairing that makes a comparison a comparison.

### 4.3 Reassurance line

> Everything you've already built is yours — forever.

This is **Never Charge For History**, verbatim from the locked amendment. It appears identically
wherever it shows up — for a locked principle, matching copy is correct and fresh wording each time is
the error.

### 4.4 "Your usage" — 6 rows

Proximity to the free limits, so nobody first learns where a ceiling is by hitting it. **Informational
only — it never suggests deleting anything**, because Never Charge For History means there is nothing
to delete your way out of.

| Label | Value |
|---|---|
| Programs | `2 of 3` |
| Photos | `38 of 75` |
| Squads | `1 of 1` |
| Import | `Used` / `Available` |
| Coach Holt programs | `Used` / `Available` |
| Coach Holt days | `1 of 2` |

**⚠ "Squads 1 of 1" beside "Import Used" is intentional.** A squad is a thing you hold, so a fraction
describes it. The free import is a boolean wearing a counter's clothes — "1 of 1" for something already
spent reads as a bug to whoever spent it.

### 4.5 "Choose your plan" — the picker

Radio group, locked order, **annual pre-selected on every mount**:

| Row | Cadence line | Extras |
|---|---|---|
| **Annual** | Billed yearly | **"Best value"** badge · **"Save N%"** pill · store's own per-month string *if it supplies one* |
| **Monthly** | Billed monthly | — |
| **Founder** | One payment, Premium for life | **"68 of 100 left"** |
| **Lifetime** | One payment, Premium for life | — |

**⚠ Annual is pre-selected, never Lifetime or Founder.** A pre-selected three-figure one-off charge is
a dark pattern. The large commitments are offered, not defaulted into. If annual is missing the fallback
is monthly; if neither exists, nothing is selected and the buy button has nothing to do.

**⚠ The Founder row does not render at all unless the seat count was read from the server and is
positive.** An unverifiable scarcity claim is worse than no claim. Zero means the seats are gone and the
SKU delists.

**⚠ "Save N%" is computed or absent, never typed.** It renders nothing when either plan is missing, the
two are in different currencies, or annual is not actually cheaper.

**⚠ A per-month price appears only when the STORE supplies one.** The original design divided its annual
figure by twelve and printed the result — deriving a currency string we were never handed is how a wrong
price reaches a purchase screen.

**Screen-reader label** for each row carries the saving and the seat count, because the row is one
accessible element and anything inside it is never announced separately: *"Annual, $XX.XX, Save 36%
compared to monthly, selected."*

### 4.6 Auto-renewal fineprint — conditional

> Subscriptions renew automatically until you cancel them in your App Store account.

Renders **only when a renewing plan is selected** (annual or monthly). It is false for Lifetime and
Founder, which renew nothing.

*(The sentence that shipped to testers — "Your plan renews yearly. Billing is handled through your app
store." — was banned for asserting a subscription that did not exist. This wording is deliberately clear
of the five claims the content guard tests.)*

### 4.7 The commit bar — fixed footer

1. **Notice line**, when there is one (see §6)
2. **Disclosure:** "The app and your legacy, forever. Coach AI is a separate subscription."
3. **Primary button: "Continue"** (or "Opening…" while busy). Disabled when no plan is selected.
4. **Restore Purchases** link

**⚠ The disclosure's placement is a legal requirement, not a copy choice.** A buyer who pays for
"lifetime" and later finds a feature needs another subscription is the classic deceptive-practices fact
pattern. It renders in **every** Free state, not only when Lifetime is selected — the athlete *comparing*
plans is the one who needs it — and a sticky bar is the only place on a scrolling screen where "above the
button" is always true.

**⚠ The button says "Continue", not "Start Premium · $XX".** Locked in spec, and it keeps a price string
off the button.

---

## 5 · Premium state

Shorter, by design. **No comparison table and no usage review** — there is nothing left to compare
against and no limit to be proximate to.

1. **Hero** (Premium tagline, Premium chip)
2. **"Your plan" card:**
   - `Forge Premium · Monthly` / `· Annual` / `· Lifetime` / `· Founder` / `Forge Premium` (grant)
   - Second line, by kind:
     - Founder → **"Founder seat 47. Yours for life."**
     - Lifetime → **"Yours for life. Nothing renews."**
     - Grant → **"Granted. Nothing is billed to this account."**
     - Renewing → **"Renews 12 Sep 2026."**
     - No kind, no date → **"No billing on this account."**
3. **"What Premium unlocks"** — same 5 benefit rows as §4.1
4. **Reassurance line**
5. **Commit bar:** **Manage Subscription** button + **Restore Purchases**. *No disclosure, no fineprint.*

**⚠ "No billing on this account" is what every athlete sees today**, because `default_tier` is PREMIUM
and no purchase has happened yet.

**⚠ Entitlement is re-checked whenever the app returns to the foreground**, because Manage Subscription
leaves the app. Without it, an athlete who just cancelled in OS settings would come back to a screen
still showing Premium — and the next thing they would doubt is the app, not the timing.

---

## 6 · Every message the screen can show

All inline, in the commit bar. **Never an alert** — the screen stays where it is.

| Trigger | Message |
|---|---|
| Purchase succeeded | Welcome to Forge Premium. |
| Purchase — store unavailable | Purchases aren't available on this device yet. |
| Purchase cancelled | *(nothing — cancelling is not an error)* |
| Purchase failed in the native sheet | *(nothing — the platform reports its own failure)* |
| Restore succeeded | Purchase restored. |
| Restore found nothing | No previous purchases found. |
| Restore — store unavailable | Purchases aren't available on this device yet. |
| Restore failed | Couldn't reach the store. Try again. |
| Manage Subscription wouldn't open | Couldn't open your subscription settings. |
| Plans failed to load | Plans couldn't be loaded right now. **+ "Try again"** |
| Store returned an empty offering | Plans aren't available on this device yet. *(no retry — nothing the athlete can do)* |

**⚠ No price is ever invented to fill a gap.** When the picker cannot render, there is deliberately no
substitute for it.

---

## 7 · Known deltas from the original design file

The `.dc` predates the 2026-08-12 pricing lock. **The design governs the visual language; the locked
spec governs every number, plan and claim.** These were decided, not overlooked:

| Design said | Built instead | Why |
|---|---|---|
| Three plans at typed prices | Four slots, all prices from the store | No price string may exist in the code |
| No Founder or Lifetime row | Both present | Pricing lock added them |
| "Thousands of photos. Years of chapters." | **Dropped** | Unverifiable claim on a purchase screen for a product with 20 testers |
| "Start Premium · [price]" | **"Continue"** | Spec locks the label; keeps a price off the button |
| "Renews automatically until cancelled — cancel anytime" | Conditional disclosure | False for the one-off plans |
| Analytics, Communities, "unlimited Squads" benefits | Five caps the app enforces | None of those exist; the last one the tier cannot deliver |
| Annual figure ÷ 12, printed | Store's own per-month string, or nothing | Deriving a currency we weren't handed |
| Accent palette + noise overlay | **Deferred** | As elsewhere in the app |
| Picker under the hero | Picker above the buy button | Plan → disclosure → button adjacency is the whole point |

---

## 8 · Open questions worth a design opinion

1. **The picker's position contradicts the spec's own prose.** §11.2 says "between the reassurance line
   and the usage review"; §3.2's diagram puts it above the buy button. Built to the diagram. **An
   amendment is owed either way** — which is right?

2. **The Free state is long:** hero → 5 benefits → 6-row table → reassurance → 6 usage rows → 4 plans →
   fineprint. Benefits and the comparison table arguably say the same thing twice. Should one compress?

3. **"5 squads" sits in a list of four "Unlimited" rows.** It is honest and required, but it is visibly
   the odd one out. Is there a better framing that stays true?

4. **The starred Legacy row** is the only tinted row in the benefit card. Enough emphasis, or not enough?

5. **"No billing on this account"** is what every current tester sees. Is that the right sentence for
   someone who was granted Premium and never paid?

6. **Nothing has been rendered yet.** Any layout opinion here is against code, not pixels — worth
   deploying the web preview before locking answers.
