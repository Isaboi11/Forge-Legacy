# Admin Analytics Amendment 002 — The Business CRM

**Status:** LOCKED
**Date:** 2026-09-28
**Owner:** Product (PO decisions 2026-09-28)
**Amends:** `Admin-Analytics-Architecture-v1.0.md` (AA-D2, AA-D7 context) and `Admin-Analytics-Amendment-001.md` (AA-D8 ceiling)
**Implemented by:** migration `0238_business_crm.sql`, Edge Function `asc-sync`, `/admin` rebuilt as a sectioned CRM

---

## 1. The request

> *"We need to build a full CRM to help me with my business with this app. We have a couple of things we
> need to connect into the CRM to make it easy to find and see numbers. Also a spot to have all of our
> documents."* — PO, 2026-09-28

The PO then named what must connect: app users and activity, RevenueCat revenue, App Store Connect,
the landing-site waitlist, the bug tracker, users per tier, AI usage, most-used features, conversion,
churn and revenue. The CRM tracks **app users, Forge Coach trainers and testers**, plus business
contacts. Documents cover **business/legal files, marketing assets and project specs**.

The PO chose (2026-09-28, three questions):

1. **User lookup — "Account + billing only."** Not "totals only", and explicitly not "full profile".
2. **App Store Connect — build it now**; the PO creates the API key.
3. **QA bugs — import all 311** items of `Docs/QA/Full-App-QA-2026-09-26.md` into a trackable board.

## 2. What it collides with

AA-D2 (never a roster, never a named athlete beside performance) as narrowed by AA-D8/AA-D9
(account existence only; never a roster **of training data**). A user lookup that shows a plan and an
invoice history names an athlete beside **billing**, which AA-D8's ceiling does not include. Nothing in
this amendment touches the performance prohibitions.

## 3. The decisions

**AA-D12 — The operator may see an athlete's ACCOUNT, BILLING and SUPPORT record, one athlete at a time
or as a billing list.** `admin_user_card()` returns, and its ceiling is:

* account — display name, handle, created date, onboarded or not (AA-D8's list, unchanged);
* billing — effective tier, `premium_kind`, `premium_until`, Premium AI flag and expiry, founder seat,
  comped-tester flag, every `store_subscriptions` row, and the store event history (type, product,
  price, date, sandbox or production);
* AI allowance — credits spent and allowance per period, calls and dollar cost by action;
* support — the feedback they sent and the count of crash reports tied to their account;
* business — whether they hold a trainer seat and how many clients (a count), and any CRM contact
  linked to them.

A billing list (for example "everyone on Premium AI") is permitted: it is a roster of the service's own
customer relationship, not of training data (AA-D9's narrowing).

**AA-D13 — Everything else stays dark, and no successor RPC may add it.** No workouts, sets, volume, PRs,
rank, honors, streaks, goals, body weight or measurements, photos, nutrition logs, health imports,
routes or location, squads, friends, challenge standing, presence or last-active time, and never the
auth email (`auth.users` stays unread). A request to add any of these to the user card is a new decision
against AA-D2, not an extension of this one.

**AA-D14 — AI usage is metered, never read.** The operator sees credits, calls, tokens and dollars per
action. Never a prompt, a reply, a Holt memory, a photo that was read, or a form-check frame.

**AA-D15 — CRM contacts and notes are operator records.** `crm_contacts` / `crm_activity` hold people
the business deals with: testers (seeded from `testflight_requests`, whose email the person typed into
our site to be contacted), trainers (seeded from `trainers`), business contacts and linked app users.
A note may never copy training data out of the app into the CRM — AA-D13 applies to what is typed as
much as to what is queried.

**AA-D16 — Business documents live in a PRIVATE bucket, `ops-docs`, readable and writable only by an
app admin.** Never in git, never in a public bucket (the photo buckets' public decision does not extend
here). Files are opened through signed URLs that expire in five minutes. `ops_documents` holds the
metadata, including links to documents kept elsewhere.

**AA-D17 — App Store Connect data arrives through the `asc-sync` Edge Function only.** The API key
(`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`, `ASC_VENDOR_NUMBER`) lives in Edge Function secrets
and nowhere else. The function refuses any caller that is not an app admin. It writes `asc_daily`,
`asc_reviews` and `asc_sync_log`, all RLS-on with zero policies (AA-D6's pattern).

**AA-D18 — Revenue is GROSS, in USD, from RevenueCat's own `price` field.** Summed across the events
recorded in `store_events` (refunds arrive as negative prices). It is labelled "before Apple's cut" on
every surface; the net figure is labelled an estimate at the 15% Small Business Program rate. Sandbox
(TestFlight) purchases are excluded by default and can be switched on with a visible label, never
silently mixed.

**AA-D19 — One bug board, three sources, originals untouched.** `ops_bugs` holds QA-report items and
bugs the operator files by hand. Feedback and crash groups stay in their own tables; "Track this" copies
one into `ops_bugs` with a back-reference and never edits or deletes the original.

**AA-D20 — The leak check splits in two.** `supabase/seed/admin-roundtrip.mjs` keeps asserting that
AGGREGATE payloads contain no `handle`, `athlete_id` or `user_id`. The person-level functions of this
amendment (`admin_user_search`, `admin_user_card`, `admin_billing_list`, `admin_contacts`) are listed
separately and are instead asserted never to contain a training key (`workouts`, `volume`, `sets`,
`rank`, `streak`, `photo`, `weight`, `last_active`, `email` from auth).

**AA-D3 and AA-D7 are unchanged.** Nothing here may reach an athlete-facing surface, and admin is still
granted by hand in the SQL editor — the CRM has no operator-management screen.

## 4. Consequential corrections

* `/admin` footer: the "one exception" paragraph now names both exceptions (Newest athletes, and the
  account-and-billing lookup) and restates what neither may show.
* `Docs/Legal/Privacy-Policy.md` §5 gains a line saying Forge Legacy staff can see account, subscription
  and support details to provide support and run the business, and cannot see training records, photos
  or anything in §5's private list. §7 gains RevenueCat as a processor (it already was one since 0214).
  **The PO must approve that text before the page is rebuilt and republished.** Proposed wording:

  > §5, new bullet: **Forge Legacy staff.** A small number of people who run Forge Legacy can see your
  > account (name, handle, when you joined), your subscription and purchase history, how much of your AI
  > allowance you have used, and any messages or bug reports you send us — so we can give you support and
  > run the business. Staff cannot see your workouts, progress photos, body metrics, nutrition, health
  > data, routes or anything else in the private list above.
  >
  > §7, new table row: **RevenueCat** | Manages App Store subscriptions and tells us when you subscribe,
  > renew or cancel. It never sees your card details.

  Once approved: edit `Docs/Legal/Privacy-Policy.md`, run `scripts/build-privacy-page.mjs`, publish.

## 5. What did not change

| Document | Status |
| --- | --- |
| AA-D2 performance prohibitions | Unchanged and absolute (AA-D9, AA-D13). |
| AA-D3 (no admin metric in the product) | Unchanged; binds every new RPC. |
| AA-D5 (three-layer gate) | Every new `admin_*` function opens with `perform public.admin_guard()`. |
| AA-D6 / AA-D7 | Unchanged; new operator tables follow AA-D6's zero-policy pattern. |
| The Performance Firewall (CS-D22.4, SQ-D13) | Unchanged. |
| `Forge-Coach-Architecture-v1.0.md` | Unchanged. The CRM reads the seat register; it does not write it (FC-D18). |
