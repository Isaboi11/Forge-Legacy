# Onboarding Amendment 007 — Theme First, Plans After

**Status:** LOCKED
**Date:** 2026-09-21
**Owner:** Product
**Amends:** the onboarding step list (`src/app/onboarding.tsx` `BASE_SETUP`) · `Onboarding-Amendment-006`
(the arrival Home gains a one-time plans screen for Free athletes)
**Related:** `Monetization-Architecture-Amendment-006` MA6-D9 ① (the post-onboarding paywall) ·
`project_alabaster_light_theme` (why a theme change is a reload)
**Implemented by:** `app/onboarding.tsx`, `lib/onboarding-plans.ts`, `hooks/usePlansAfterOnboarding.ts`,
`app/(tabs)/index.tsx`, `app/subscription.tsx`, `lib/first-run.ts`, `domain/billing/plans-core.ts`

---

## 1. The request

> *"Where should we put these options in onboarding? Also with onboarding we need to ask them if they want
> to be in light or dark mode."* — PO, 2026-09-21. Agreed placement: theme first, plans at the end.
> *"We got rid of holt making them a first week. Also, in the premium it needs to say 'basic holt'… that
> way they see it's not a full blown ai holt."*

## 2. Decisions

**ONB-A7-D1 — The theme is the first onboarding question.** "Choose your look": **Forge · Dark** and
**Alabaster · Light**, each with a thumbnail of its own ground, ink and metal. Current theme pre-selected.
It is first because changing theme **reloads the app** (every stylesheet freezes its colours at import):
at step one there is no answer yet to lose. Coming back up on a non-default theme resumes at the account
step. The choice is device-local until the account is finished, then copied to `app_prefs.theme` so
Preferences shows what is actually on screen. Unchanged: Forge is the default (`DEFAULT_THEME`), and
Preferences → Appearance still changes it any time.

**ONB-A7-D2 — The plans screen opens once, after onboarding, for a Free athlete only.** Finishing
onboarding leaves a device flag; Home's first mount spends it and pushes `/subscription?from=onboarding`
**only when the tier is known and FREE**. `loading` waits; `unknown` keeps the flag for the next mount
(M-7 §10). A Premium athlete spends the flag and sees nothing, so **while `default_tier` is PREMIUM
(today, pre-Phase F) nobody sees it**, and a tester never meets it weeks later. From onboarding the screen
has a close button **and a full-contrast "Continue with Free"**. Cleared on account switch.
It is P-8, not M-7 — M-7's rules are untouched (MA6-D9).

**ONB-A7-D3 — The finish no longer says "Building your first week…".** Holt's signup week is off
(`HOLT_FIRST_WEEK = false`, PO 2026-09-21); the button now says "Opening your forge…". Flipping the
constant restores both the week and its copy.

**ONB-A7-D4 — "Basic Holt" on every plan surface.** The rules-engine Holt that Free and Premium include is
named **Basic Holt** in the P-8 comparison, usage and benefit copy and on the pricing page; the AI coach
is **Holt AI**, in Premium AI. Nobody should read Premium as buying the AI coach.

## 3. What is not built

- P-8 still renders the MA3 plan picker; the two plan groups (Premium / Premium AI) arrive with the
  store products (MA6 §6 rows 4–5). Until RevenueCat is installed the picker shows *unavailable*.
- The testing-only Premium AI switch on P-8 is still visible to every account; it must become a purchase
  or admin-only before public release (see `project_premium_ai_owner_only`).

## 4. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-21 | Locked and implemented. |
