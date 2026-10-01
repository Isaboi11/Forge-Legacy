# Admin Analytics Amendment 003 — Social (Numbers, Content, Playbook)

**Status:** LOCKED
**Date:** 2026-09-30
**Owner:** Product (PO request and decisions 2026-09-30; PO 2026-09-30: "Build the social side in the CRM")
**Amends:** `Admin-Analytics-Amendment-002-Business-CRM.md` (adds a fifth sidebar group; extends AA-D15, AA-D16, AA-D17, AA-D18, AA-D20)
**Implemented by:** migration `0247_crm_social.sql`, Edge Function `social-sync`, three CRM pages (`SocialNumbersPage`, `SocialContentPage`, `SocialPlaybookPage`), the phone CRM's More → Social, and `site/go/tiktok.html` + `site/go/instagram.html`
**Design:** `design_reference/Forge CRM Social/Forge CRM Social.mock.html` (a mock with example numbers, not a Claude Design `.dc.html`)
**Setup the owner does once:** `Docs/Social-Accounts-Setup.md`

---

## 1. The request

> *"In the CRM I'm thinking of having a social media section. Where it obviously shows all of the
> important numbers there; followers gained, high performing videos, revenue. Split into each platform.
> And then a schedule for posting and video ideas and playbook essentially."* — PO, 2026-09-30

The PO accepted these additions: a post-to-signup funnel, an idea pipeline tied to results, content
tags, rates rather than counts, an experiment log, captured audience questions, competitor notes, an
asset shelf, and goals against actuals. The PO asked that it stay clean and flow well.

The PO then decided (2026-09-30):

1. **Platforms — "Instagram and TikTok mainly."**
2. **Links — "It's fine to link specific links to specific platforms."** One tracked link per platform,
   not one per video. No question is added to onboarding.
3. **Name — "Social. Marketing will be ads."** The group is Social. "Marketing" is kept for a future
   ads section and is not used here.
4. **Numbers arrive on their own — "Make sure I can connect at least a TikTok and Insta account where
   it can auto get the numbers so I don't have to manually."**

## 2. What it collides with

* **AA-D2 / AA-D13** — nothing here may say anything about an athlete. AA-D28 keeps every figure a count
  and reads no athlete, training or billing table.
* **AA-D17** — outside data reaches the CRM through an Edge Function only. AA-D26 holds the platform
  sync to that rule.
* **AA-D18** — revenue is gross, USD, sandbox excluded. AA-D29 keeps platform payouts separate from it.
* **`admin_social_health` (0130)** — that is the app's own social pillar (squads, friends). This
  amendment is about the owner's public TikTok and Instagram. Tables are `ops_social_*`.
* **`0170` referral attribution** — untouched and not reused. It records which ATHLETE invited an
  athlete and drives money. Nothing in this amendment records an athlete.

## 3. The decisions

**AA-D23 — One record: the video, with one posting per platform.** A video starts as an idea and moves
through `idea → scripted → filmed → scheduled → posted`. It carries its title, first line, script notes,
tags (AA-D24) and, once it has run, its lesson (AA-D30). A video goes out as one or more **postings** —
one per platform — and each posting carries its own date and numbers. The calendar, the pipeline, the
top-videos table and the Playbook are all views of these two tables. No feature in this section gets
its own store of videos.

**AA-D24 — Tags are fields on the video, chosen from short lists the operator owns.** Topic, hook and
format; length is a number. The lists are edited on the Playbook page; renaming a tag renames it on
every video. "What is working" is computed from these fields, never typed.

**AA-D25 — Three pages in a new sidebar group, "Social".**

| Page | What it is for |
| --- | --- |
| **Numbers** | Followers gained, top videos, rates, the funnel, the platform links, revenue, goals, and the connected accounts. |
| **Content** | The work: the pipeline, the posting calendar, quick idea capture, the video panel. |
| **Playbook** | What has been learned: what is working by tag, the experiment log, rules, audience questions, competitor notes, the asset shelf, and the tag lists. |

Platform is a filter across the top of Numbers and Content (All · TikTok · Instagram), never a page per
platform. Numbers uses the CRM's existing 7D / 30D / 90D / 1Y range control. On the phone CRM the group
sits at the top of More, with "New idea" one tap away; the phone leaves out the list editors (rules,
notes, tags), which stay on the desktop. V1 platforms are TikTok and Instagram.

**AA-D26 — Accounts are connected once and the numbers arrive on their own.** The `social-sync` Edge
Function handles each platform's sign-in, keeps the resulting tokens on the server, refreshes them, and
pulls numbers once a day (pg_cron → `social_sync_tick()`) and whenever the operator presses **Sync
now**. It refuses any caller that is not an app admin; the daily call proves itself with a secret the
database holds. Tokens live in `ops_social_accounts`, RLS on with zero policies (AA-D6); they are never
returned to the client and never shown in the CRM — `admin_social_media()` returns `connected`, a
boolean. Follower counts are stored as one snapshot per platform per day, so growth is the difference
between two snapshots.

What each connection brings in (checked against the platforms' own documentation on 2026-09-30):

| | TikTok (Display API) | Instagram (API with Instagram Login) |
| --- | --- | --- |
| Account | Followers | Followers; reach over the last day |
| Each video | Views, likes, comments, shares, length | Views, reach, likes, comments, shares, saves; average watch TIME for reels |
| Not shared | Watch time, saves, profile views | The video's length; profile views |
| Conditions | A TikTok developer app in Sandbox, with the owner's account as a target user | A professional (Business or Creator) account; a Meta developer app the account has a role on; account figures need 100+ followers; data can run up to 48 hours behind |

* **"Watched" is a percentage, and each platform is missing half of it.** TikTok shares no watch time,
  so the percentage is an optional field the owner types on each TikTok posting, labelled "typed".
  Instagram shares watch TIME but not the video's length, so its percentage appears once the length is
  on the video record. With neither, the page shows "—", never 0. The Playbook therefore defaults to
  **shares per 1,000 views**, which comes in from both platforms.
* **Access without a platform review.** Both platforms let an app read its owner's own account without
  a public review. This is read from documentation and **is proven only when the two developer apps
  exist** — that is the owner's first step (`Docs/Social-Accounts-Setup.md`). One known risk: TikTok may
  ask to verify ownership of the redirect address, which is on `supabase.co`; if it does, the redirect
  moves behind `forgelegacy.app`.
* **History starts at connection.** Neither platform hands over a follower history. Until an account is
  connected, the owner can type the day's follower count.
* **Posts that were never planned** are imported as posted videos marked "needs tags". A planned posting
  is matched to the platform's post by platform and date (within a day); the operator can split a wrong
  match off, or move an imported post onto the plan it belongs to.
* **A broken connection is said plainly**: the page names the platform, says its numbers have stopped
  updating, and offers the reconnect. The numbers already in stay.

**AA-D27 — One tracked link per platform.** `forgelegacy.app/go/tiktok` and `/go/instagram`, one for
each platform's bio. The link adds one to a counter for that platform and day (`social_link_hit()`,
called with the site's public key, able to do nothing else) and sends the visitor on.

* **Today** it sends them to the home page with the platform as the source, and the early-access form
  records that source with the address. "Early-access signups" on Numbers is a count of those, per
  platform per day.
* **Once the app is on the App Store**, setting `appStoreUrl` in the site's config sends an iPhone
  straight to the App Store with Apple's campaign token for that platform. Apple then reports
  first-time downloads per campaign. Reading those reports into the CRM is an addition to `asc-sync`
  that is **not built**, because Apple offers campaign links only once an app has downloads. Until
  then Numbers says "After launch" on that line.

Per-video attribution is not attempted: a caption link is not tappable on either platform, and Apple
does not pass a link through an install.

**AA-D28 — Counted, never listed.** The operator sees clicks and early-access signups per platform.
No function in 0247 reads an athlete, training or billing table, and the user card (AA-D12) gains
nothing. The early-access count never carries an address. Attributing a PAYING ATHLETE to a platform
would need an athlete-level record; none is created, and adding one is a new decision.

**AA-D29 — Two kinds of revenue, never silently summed.** *App revenue from social* — subscriptions
that came through a platform link — is not knowable before launch (AA-D27) and shows "After launch".
*Platform income* — creator payouts, brand deals — is typed by hand as dated entries per platform.
Numbers shows both, side by side and named.

**AA-D30 — The Playbook is mostly computed.** "What is working" ranks topics, hooks, formats and
lengths by a measure the operator picks (shares per 1,000 views, watched, views per video), with the
number of videos behind each line shown so a ranking built on one video reads as one video. A video
with no tag on the chosen dimension is left out. The **experiment log** is the lesson on each video —
what was tried, what happened, and a verdict of keep, retest or kill — newest first.

**AA-D31 — Audience questions, competitor notes and assets are operator records (AA-D15 extended).**

* **Audience questions** are typed by hand, with the platform and how often the question comes up. One
  tap turns a question into a video idea. A note may never copy an athlete's training data into the CRM.
* **Competitor notes** are typed by hand. Nothing is scraped.
* **Assets** live in the existing private `ops-docs` bucket under Documents' existing Marketing
  category (AA-D16 unchanged). The Playbook shows that shelf; it does not create a second one.

**AA-D32 — Goals are per platform and per week.** Postings per week and a follower target. Numbers
shows actual against target, and the calendar counts each week against it. A finished week is met or
missed; nothing is rolled forward.

**AA-D33 — Deferred, by name.** Ads (the future Marketing group), creator and affiliate tracking,
publishing to a platform from the CRM, reading comments or messages automatically, TikTok's
business-level API (the one that carries watch time; it needs a TikTok Business account), Apple
campaign reports (AA-D27), any athlete-level attribution (AA-D28), and any AI that writes scripts or
ideas. None may be added under this amendment.

## 4. What is built, and what the owner still does

Built and tested (2026-09-30): the migration, the three pages, the phone views, the sync function, the
two link pages, and the early-access form carrying the platform as its source.

The owner's steps, in order:

1. Paste `supabase/apply/pending-0247.sql` into the SQL editor. The Social pages work from here: ideas,
   the pipeline, the calendar, the playbook, typed followers.
2. Approve the web deploy of the CRM.
3. Follow `Docs/Social-Accounts-Setup.md`: two developer apps, four secrets, deploy `social-sync` with
   Verify JWT **off**, then press Connect. Numbers arrive on their own from here.
4. Approve the site deploy (`site/go/*`, `site/assets/site.js`) and put each link in its platform's bio.

## 5. Consequential corrections

* `pages/types.ts` `NAV` gains a fifth group, **Social**: `social` (label "Numbers"), `content`,
  `playbook`. `social` joins `RANGE_PAGES`.
* `supabase/seed/admin-roundtrip.mjs` (AA-D20): every `admin_social_*` function is in the gate list;
  `admin_social_media` joins the AGGREGATE list and is also asserted to carry no token. Its account
  name key is `username`, not `handle`, which that check reserves for athletes.
* `crm-ui` `Chart` and the phone `ScrubChart` gain an opt-in `zoom` (axis starts near the lowest value),
  used only for the follower line.
* `Docs/Legal/Privacy-Policy.md`: the early-access form now records which link a person arrived through.
  **The PO must approve this wording before the site is redeployed:**

  > **How you found us.** If you arrive through one of our links, we record which link it was. We use
  > this to count how many people each platform brings in. It is not shown to other people and is not
  > used for advertising.

## 6. What did not change

| Document | Status |
| --- | --- |
| AA-D2 performance prohibitions, AA-D13 | Unchanged and absolute. |
| AA-D3 (no admin metric in the product) | Unchanged. Nothing here reaches an athlete-facing surface. |
| AA-D5 / AA-D6 / AA-D7 | Unchanged; every new table and function follows them. |
| AA-D12 user card | Unchanged; no social field is added to it. |
| `0170` referral attribution, MA3-D19/D20 | Unchanged and not reused. |
| Onboarding | Unchanged. No "How did you hear about us?" question (PO 09-30). |
| The Performance Firewall | Unchanged. |

## 7. Still open

1. **The two developer apps** (§4 step 3), which only the owner can create, and which prove the
   "no review" reading.
2. **TikTok watch time**: stay with the typed field, or later move the TikTok account to a Business
   account and apply for TikTok's business-level API. A Business account changes which sounds TikTok
   lets the account use, so this is the owner's call.
3. **After launch**: set `appStoreUrl`, create the two Apple campaign links, and build the campaign
   pull in `asc-sync` (AA-D27).

## 8. Sources for AA-D26 and AA-D27

* Instagram media insights, account insights, Instagram Login — Meta developer documentation.
* TikTok Login Kit for Web, scopes, user info, video list, video object, sandbox — TikTok for Developers.
* Campaign links and the Analytics Reports API — Apple, App Store Connect Analytics help.
