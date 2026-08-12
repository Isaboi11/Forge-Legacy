# Admin Analytics Amendment 001 — Who Signed Up

**Status:** LOCKED
**Date:** 2026-08-11
**Owner:** Product
**Amends:** `Admin-Analytics-Architecture-v1.0.md` (AA-D2)
**Implemented by:** migration `0137_signup_alerts.sql`, `admin_recent_signups()`, `/admin` › Newest athletes

---

## 1. The request

> *"Is there a way for me to get notified whenever someone signs up? And to get the name of who? I'm
> waiting on some that I don't know if they have or not."* — PO, 2026-08-11

The dashboard already reports a **signup count** (0130, `admin_overview`). During a hand-run tester
rollout the count is the wrong shape of answer: invitations go out one at a time, to named people, and
what the operator needs to know is which of those specific people arrived. A number cannot answer that,
and neither can a bigger number.

## 2. What it collides with

**AA-D2** (LOCKED) reads:

> No per-athlete drill-down. Every `admin_*` RPC returns population aggregates. No RPC returns a named
> athlete beside a volume number, a challenge standing, a leaderboard position, or a rank. Histograms,
> distributions and counts; **never a roster.**

A list of who signed up is a roster. The first sentence of the rule and the last are doing different
jobs, and this request sits precisely between them.

**The enumerated prohibitions are all PERFORMANCE.** Volume, standing, leaderboard position, rank — AA-D2
exists to keep `/admin` from becoming the thing the Performance Firewall forbids (CS-D22.4, SQ-D13): a
surface where one person's training is read by another. "Never a roster" is the belt-and-braces
generalisation of that, written when no legitimate roster had been proposed.

An account-existence list carries **none** of the enumerated data. It answers "does this person have an
account", which is a fact about the service's own customer relationship rather than a fact about
anybody's training.

## 3. The decision

**AA-D8 — The operator may see WHO HAS AN ACCOUNT, and nothing else about them.**

`admin_recent_signups()` returns, for the newest accounts: display name, handle, when the account was
created, and whether onboarding has named them yet. That list is exhaustive and it is a ceiling.

It may never carry, and no successor RPC may add:

* any training figure — workouts, volume, streak, rank, honors, PRs, bodyweight, photos;
* any social position — squads, friends, challenge standing;
* activity or presence — when they last opened the app, whether they are training now;
* email or any other auth credential (it lives in `auth.users`, not `profiles`, and stays there).

**AA-D9 — AA-D2's performance prohibition is unamended and absolute.** This amendment narrows the phrase
"never a roster" to "never a roster of training data". Every enumerated prohibition in AA-D2 stands
exactly as written. A future request to add "…and how many workouts they have done" to this list is a
new decision against AA-D2, not an extension of this one.

**AA-D10 — The signup alert is an operator event and lives outside the athlete notification model.**
`push_tg_athlete_signup` writes `push_outbox` directly. It is deliberately NOT a branch of
`notification_events_for()`, which is the athlete's own `/inbox` feed: a signup belongs to no athlete's
inbox, has no route inside the social model, and adding it there would put a 70-line union that six
triggers depend on at risk for an operator convenience.

**AA-D11 — The alert may never cost a signup.** The trigger sits on `public.profiles`, inside the
onboarding write path. It checks `to_regclass` before touching 0120's tables and swallows every
exception. A missed alert is a missed alert; a raised one is a lost athlete.

**AA-D3 is untouched and now binds this list too.** Nothing here may appear on an athlete-facing surface.
There is no "new athletes" module for the app.

## 4. Consequential correction

`/admin`'s own footer claimed *"no athlete is named on this screen."* That sentence was true when it was
written and is not true now. It has been corrected in place rather than deleted — the honest statement is
that names appear **only** as account existence, and that no training data is attached to any of them.

## 5. What did not change

| Document | Status |
| --- | --- |
| `Admin-Analytics-Architecture-v1.0.md` AA-D1, AA-D3…AA-D7 | Unchanged. |
| `Admin-Analytics-Architecture-v1.0.md` AA-D2 | Narrowed by AA-D8/AA-D9. Its performance prohibitions stand verbatim. |
| `P-6-Privacy-Architecture.md` | Unchanged. Account existence is not analytics and is not opt-out-able — it is the service knowing its own customers. |
| `Social-Architecture-Amendment-003` | Unchanged, and AA-D3 still protects it. |
| The Performance Firewall (CS-D22.4, SQ-D13) | Unchanged, and AA-D9 restates why. |
