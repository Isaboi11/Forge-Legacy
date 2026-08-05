# Forge Legacy — Social System Architecture Amendment 003
## Athlete Search Returns a List
### August 2026

**Status:** LOCKED

**Type:** Reconciliation Amendment (settles a conflict between two LOCKED documents; implements a search specification that has been locked and unbuilt since it was written)

**Authority:** Product Owner decision, 2026-08-04. `Identity-Amendment-001-Username.md` (LOCKED) §4 — the specification restored. `Social-System-Architecture-v1.0.md` (LOCKED) §16 — the document amended.

**Amends:** `Social-System-Architecture-v1.0.md` — SOC-D15 (Intentional Discovery), and the "no suggested friends / PYMK / discovery algorithm" entry in its Non-Behaviors list.

**Supersedes:** SOC-D15's **"returns at most one athlete"** implementation reading, only. SOC-D15's never-list is **not** superseded, is restated below in stronger terms than it was written, and remains binding.

---

## Purpose

The PO asked to be able to find people by name. Investigating it found that **this was never a new
request — it was an unapplied one.**

`Identity-Amendment-001-Username.md` §4 has been LOCKED, and has specified athlete search in full,
since before SOC-D15 was written:

| Identity §4 | What it specifies |
|---|---|
| §4.1 | A query matches **Display Name AND Username simultaneously**. A leading `@` forces username-only mode. "**@ prefix is a power-user feature.** Default (no @ prefix) queries both fields. This makes the default experience feel name-based, not handle-based." |
| §4.2 | Result ranking: squad members, then non-squad athletes subject to discoverability; exact before partial within each tier |
| §4.3 | The result **row** format — avatar, display name primary, @username muted secondary, shared squad tertiary |
| §4.4 | Empty state: nothing shown before a query. No suggested athletes |
| §4.5 | No-results copy, verbatim: *"No athletes found. Check the spelling or ask them to share their username."* |

§2.2 goes further and states it as a behavioural rule: an athlete who skips setting a username
"**can still be found by display name search** (if 'non-squad search' is not turned off)."

SOC-D15, written later, read "a search that returns a LIST" as the definition of a discovery surface
and narrowed discovery to one exact handle. That is what migration 0073 shipped
(`find_athlete_by_handle`, `where handle = h limit 1`), and its header records the reasoning.

**Two locked documents disagreed, and the narrower one won by being the one that got built.** This
amendment settles it in Identity's favour and states precisely what SOC-D15 still governs.

---

## Section 1 — The decisions

### SOC-A3-D1 — Athlete search returns a list, matching name and handle

**Locked.** Per Identity §4.1–4.5, in full: both fields by default, `@` forces handle-only, results
render as rows, nothing before a query, and §4.5's copy verbatim on a miss.

**SOC-D15's principle is untouched.** "Discovery is always an act the athlete chooses, never a surface
the system populates" is satisfied by *what the list is made of*: it exists only in response to
characters the athlete typed, and it contains nothing else. The never-list is unchanged and still
binding:

- **No Suggested Friends. No "People You May Know." No mutual-friend recommendations. No discovery
  algorithm of any kind.**
- Nothing is returned for an empty query.
- Nothing is ranked by engagement, popularity, recency of activity, or mutual-friend count.
- No surface populates itself with people.

The long comment at `src/app/add-friend.tsx` explaining why the design's "People You May Know" section
was deliberately not built **remains true and stays in the file.** Search is not PYMK. The distinction
is who initiated: an athlete typing a name, or a system deciding whose face to show them.

### SOC-A3-D2 — Ranking is deterministic and non-social

**Locked.** In order: exact handle → shared squad → exact name → handle prefix → name word-prefix →
name ascending. Mutual-friend count is **never** an input, at any tier.

**One deliberate deviation from Identity §4.2,** which puts squad-mates first absolutely: an **exact
handle outranks a squad-mate**. Typing somebody's complete handle is the most intentional act SOC-D15
recognises, and burying that result under a roster would defeat the one path the narrow reading of
SOC-D15 always allowed.

**Name matching is a WORD prefix, never a free substring.** "ada" finds "Ada Lovelace" and "Grace Ada
Hopper"; it does not find "Amanda". A free substring match is an enumeration tool wearing a search box
— `%a%` would return nearly every athlete in the system.

Results are capped at 25. The minimum query length is 2 characters.

### SOC-A3-D3 — The discoverability toggle ships with this, and not after it

**Locked.** Identity §7.1's **"Let non-squad athletes find me in search"** has been specified since
Identity-Amendment-001 locked and has never existed — no column, no UI, nothing.

It is now load-bearing. Exact-handle-only search was implicitly doing the toggle's job: you could not
be found unless somebody already had your handle. A name search removes that accident, so the setting
that was always specified has to become real at the same moment.

`profiles.discoverable boolean not null default true` (migration 0114).

### SOC-A3-D4 — The toggle governs browsing by name, not redeeming a handle you were given

**Locked.**

An athlete with `discoverable = false` is invisible to **name** search and still resolvable by **exact
handle**. Squad-mates always find each other regardless — you are already in a room together.

The reasoning, since Identity §7.1's table read literally ("Not searchable by any athlete outside their
squads") would say otherwise:

- Identity **§7.2 already concedes** that athletes who know your username can attempt a tag request.
- **SOC-D15 explicitly sanctions QR codes and profile links** as intentional discovery methods. Both
  of those are exactly "somebody handed me a handle."
- A literal reading would break `find_athlete_by_handle`, which has shipped ungated since 0073.

A handle is an address you gave someone. The toggle is about whether strangers can browse to you, not
about whether the address you handed out still works.

---

## Section 2 — ⚠ What the toggle is actually worth today

**`0001_spine.sql:165` is `create policy profiles_read on profiles for select using (true)`.**

Any client holding the app's anon key can page the entire `profiles` table straight through PostgREST,
without going near `find_athletes` at all. Every guard in the RPC — the escaping, the word-prefix rule,
the 25-row cap, `discoverable` itself — is therefore **advisory UX, not enforcement**, and the toggle
is a promise the database does not currently keep.

**Binding consequence:** the setting's copy must be worded as **"hide me from name search"**, never as
"no one can find me" or any absolute. Do not ship an absolute promise this schema cannot honour.

Making it real means narrowing `profiles_read`, which is **a separate ruling deliberately not taken
here**. Its blast radius needs checking first: the feed, friend-list and notification functions that
join `profiles` are all `security definer` and would be unaffected, but that has to be verified rather
than assumed. This is recorded as an open item, not as a gap that snuck through.

---

## Section 3 — What the screen becomes

`Add Friend` was built end to end around one handle resolving to one person. With a list:

- **The Add button leaves the input.** With one handle there was exactly one athlete "whatever is
  typed" could mean. With a list there is no such athlete, and a button that guesses which row you
  meant is worse than no button. The action moves onto each row — where it also becomes the *right*
  verb: **Add · Accept · Withdraw · Friends**, from `friendship_with()`, which the RPC already returns
  and `friendAction` has always known how to render.
- **Results scroll; the input stays pinned.** The field is the one control the athlete came for, but 25
  rows pinned above the fold would eat the screen and defeat that. Results become the first section
  inside the scroller.
- **The status line becomes the screen's state machine**: no query → *"Search by name, or type @ and
  their handle."* · under two characters → keep typing · in flight → *"Searching…"* · zero results →
  Identity §4.5 verbatim · results → *"Tap a name to open their profile, or Add to send a request."*
  The old cascade's already-friends / pending / they-asked-you branches move onto the rows, where they
  are statements about one athlete rather than about the whole query.
- **The `@` prefix keeps its bronze affordance** and now means *handle-only mode* rather than *the
  button is armed*. Divergence from `Add Friend by Handle.dc.html`, which draws it as permanent chrome.
- **The footnote stays verbatim**: *"Forge Legacy never suggests people. There are no recommendations,
  no mutual-friend lists, and your friends are never shown to anyone else."* It is more load-bearing
  now, not less.

The request → accept flow is **unchanged**. Nothing about mutual consent, withdrawal, or the silence of
a decline is touched by this amendment.

---

## Section 4 — Open items

1. **Narrow `profiles_read`** so `discoverable` is enforced rather than advisory (see §2). Needs its own
   ruling.
2. **`first_name` is not matched.** `profiles.name` is the display name and its first word is the first
   name in practice; matching `first_name` separately would surface rows whose visible name does not
   contain what the athlete typed, which reads as a bug. Trivially addable if wanted.
3. **Scale.** The mid-name word-prefix branch cannot use a btree index and seq-scans. Fine at current
   size and capped at 25 rows; past tens of thousands of athletes it wants `pg_trgm` + GIN, which is an
   extension decision and is deliberately not pre-empted here.
4. **The toggle's UI** (P-6 or Identity's own settings surface) is not built by this amendment — only
   the column and the search behaviour. Until it ships the default (`true`) stands for everyone.
