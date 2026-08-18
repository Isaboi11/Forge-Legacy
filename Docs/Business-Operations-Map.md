# Business Operations Map

**v1.0 · 2026-08-17 · Isaiah Altamirano, Forge Legacy LLC**

> **What this is.** One page answering *"where do I look, and when?"* — the map a first-time owner
> needs before a dashboard is worth building. Everything here is a **pointer**, never a copy: the
> authority for migrations is `Forge-Legacy-Master-Status.md`, for launch it is `Docs/GO-LIVE.md`.
> When this file disagrees with either, **they win and this file is stale.**
>
> ⛔ **No credentials in this file, ever.** It records *where to log in*, never how. If you find
> yourself pasting a key, secret, or password here, stop — that is what the password manager is for.

---

## 1 · Identity block — the answers institutions ask for

Every bank, processor, and store asks the same eight questions. Keep them here so you never dig.

| Field | Value |
|---|---|
| Legal entity | **Forge Legacy LLC** (Utah) |
| Utah registration | `14725906-0160` — Certificate of Organization effective **2026-08-13 02:06 PM** |
| EIN | `42-4433633` (CP 575 issued 2026-08-13) |
| Parent / sole member | **Altimealix Holdings LLC** |
| Ownership chain | Isaiah → Altimealix Holdings LLC → Forge Legacy LLC |
| D-U-N-S | `149910851` (case `10803372`, issued 2026-08-17) |
| Apple Team ID | `G722GV8H8C` — ⚠️ currently **Individual**, conversion to Organization pending |
| Bundle ID / App ID | `com.qest4.forgelegacy` / `6798436104` |

⚠️ **The ownership chain is proven by ONE document.** Utah's certificate has no member field, so the
**executed operating agreement** is the only proof Altimealix owns Forge Legacy. Its **Exhibit B**
(authorized principals and titles) is the page every institution asks for. Keep both within reach —
you will send them repeatedly.

⚠️ **`com.qest4.forgelegacy` contains "qest4" and that is fine.** A bundle ID is an opaque string; it
does not need to match the entity name and changing it would orphan the existing app record. There is
no second entity and never was — earlier drafts of GO-LIVE §9 said otherwise and were wrong.

---

## 2 · Systems map — where to look

| System | Answers | Where | How often |
|---|---|---|---|
| **App Store Connect** | Sales, payouts, crashes (native only), customer reviews, TestFlight, agreements & tax forms | appstoreconnect.apple.com | Weekly · **daily during review** |
| **`/admin` in the app** | Athletes, signups, retention, onboarding funnel, feature adoption, programs, social | Forge Legacy → Account Settings → Creator Dashboard | Weekly |
| **Supabase** | The database itself. SQL editor is how every migration is applied — there is no CLI or service key in this workflow | supabase.com/dashboard | As needed · **check cron monthly** |
| **Cloudflare** | Website traffic *(already collecting — see §5)*, the `forgelegacy` Worker, DNS, email routing | dash.cloudflare.com → `forgelegacy.app` zone | Monthly |
| **Zions Bank** | The business account | zionsbank.com | Weekly until open, then monthly |
| **RevenueCat** | Subscriptions, MRR, churn, trial conversion — **once Phase E ships** | app.revenuecat.com | Not yet configured |
| **Expo / EAS** | Builds, OTA updates, which build testers are on | expo.dev | Per release |
| **D&B** | The D-U-N-S record Apple checks | dnb.com | Only when Apple asks |

**Email:** `support@forgelegacy.app` (public) and `isaiah@forgelegacy.app` (personal) — both via
Cloudflare Email Routing, forwarding to your inbox. There is no mailbox to log into.

⚠️ **`forgelegacy.expo.app` is not the product.** It is the Expo web preview, a testing surface. Apple
rejected it as an org website because it is Expo's domain, not yours. The product website is
**forgelegacy.app**. Note that `/admin` is a *public static route* on the preview — the real gate is
Postgres (`app_admins` + `admin_guard()`), not the URL, so this is safe but looks alarming.

---

## 3 · The deadline calendar

Sorted by date. **This is the section that actually costs money if ignored.**

| Date | What | Consequence of missing it |
|---|---|---|
| **2026-08-31** | ⛔ **Zions bank application auto-closes** if they need more and get no answer | Application dies; restart from zero. Documents were sent 08-17 — **expect a second ask for Altimealix's certificate + EIN letter**, because an entity (not a person) is the member |
| ~2026-08-19 | D-U-N-S propagates to Apple's lookup tool (~24–48 h from 08-17 18:14 UTC) | ⚠️ **Do not enroll until it resolves there.** Enrolling against a missing record restarts the clock — this project has already paid that once |
| After the above | Apple **Individual → Organization** conversion (`G722GV8H8C`) | ⚠️ **One support request, not two.** In the same message confirm bundle ID, app `6798436104`, TestFlight, EAS credentials **and the APNs key** all survive. ⛔ Never create a second Apple ID. Then enroll in the **Small Business Program** — 15% commission instead of 30% |
| Before submission | **Paid Applications Agreement in effect** (Apple §9b) | ⛔ **This is a SUBMISSION gate, not a payout chore.** In-app purchases cannot ship without it. Needs: (a) acceptance by someone who can bind the entity, (b) a bank account held in exactly `FORGE LEGACY LLC`, (c) a W-9 |
| Before money moves | Counsel review of terms + privacy | Legal exposure |
| **~2027-08-13** | Utah LLC annual renewal (anniversary of registration) | Administrative dissolution if lapsed. ⚠️ **Confirm the exact date and fee with the state** — do not trust this row alone |
| Annually | Federal + Utah tax filing | ⚠️ **CPA question, not a form question.** The two-tier disregarded chain (Forge Legacy → Altimealix → you) determines how income is reported. *Wrong here is a federal filing, not a rejected form* |

---

## 4 · The routine

**Weekly (15 min).** Open `/admin` → signups, activation %, retention. Open App Store Connect →
sales, reviews, crashes. Check `support@forgelegacy.app`. Glance at the deadline table above.

**Monthly (30 min).** Cloudflare traffic. Bank reconciliation. Supabase cron health —
`select jobname, active from cron.job;` (this is the only thing making the 90-day data-retention
promise in your privacy policy true). Re-read §3.

**Per release.** `git status` clean → gates green → `fingerprint:compare` → build/OTA → verify live.
⚠️ **Publishing bundles the working tree, not the last commit.** A dirty tree ships uncommitted code.

---

## 5 · Things that already work that you may not know about

- **Website traffic is already being collected.** Cloudflare → `forgelegacy.app` → Analytics & Logs →
  Traffic. Server-side, free, no script on the page, running since 2026-08-16. **Nothing to build.**
- **Apple collects native crashes for free** — App Store Connect → Analytics → Crashes. No SDK needed.
  ⚠️ It captures **nothing** about JavaScript errors, which is where a React Native app actually
  breaks. That gap is Tier 1.1 of the ops plan and is currently on hold.
- **New-signup push alerts already fire** to your phone (migration `0137`).
- **Apple retains your full review history**, so a reviews dashboard built later backfills everything.
  Nothing is being lost by waiting.

---

## 6 · Honest gaps — what nothing is recording

Listed so a future "the dashboard says zero" is never mistaken for a fact.

| Gap | Status |
|---|---|
| **JavaScript errors / crashes** | ⛔ Nothing records them. Error boundaries catch and `console.error` into the void. **Genuinely lost forever while this is open** |
| **Feedback / suggestions** | ⛔ No intake anywhere. **Also an open App Store blocker** — a Support URL is required and a `mailto:` alone is rejected. In progress |
| **Revenue in our own database** | Deliberate hold. RevenueCat records everything in its own dashboard from the first sale, so this is recoverable — not lost |
| **App Store reviews in our own database** | Deliberate hold. Apple retains the history |
| **Unified business dashboard** | Deliberate hold until revenue exists. Plan: a password-protected page on `forgelegacy.app` reusing the `app_admins` gate |
| **Android** | ⛔ Zero builds. Every revenue projection is computed on the smaller half of the market |

---

## 7 · Rules that have already cost this project time

- ⛔ **Never re-paste migration `0059`** — it silently reverts every friends competition to unjoinable.
- ⚠️ **Applying a migration ≠ the feature working.** `0153` landed and nothing appeared, because the
  *code* was undeployed. Check both.
- ⚠️ **The migration ledger goes stale in the reassuring direction** — it says "pending" for things
  already applied. Run `supabase/apply/preflight-launch-audit.sql` rather than trusting a checklist.
- ⚠️ **"It worked on my phone" is not proof.** A device holds grandfathered state. Date the binary.
- ⚠️ **Green gates ≠ working on device.** A launch crash once shipped with every check green.
- ⚠️ **Adding any native module changes the Expo fingerprint** and cuts OTA delivery to everyone on
  the current build until a new binary ships. `fingerprint:compare` before every publish.

---

*Update this file whenever a deadline resolves or a system is added. It is a map, not a record —
if it starts accumulating history, that belongs in `Forge-Legacy-Master-Status.md` instead.*
