# Honor Catalog — Amendment 002: Relative Strength and Presence

**Status:** LOCKED · 2026-07-30
**Amends:** `Honor-Catalog-v1.0-LOCKED.md` — adds four families (24 honors)
**Governed by:** `Comparison-Philosophy-Amendment-001` — CC-D2 (Performance Firewall), CC-D3 (anti-shame) · `FORGE_LEGACY_PRODUCT_DNA.md` §10
**Shipped in:** migration 0079

---

## 1 · Why

The locked catalog's strength honors are entirely **absolute** — Bench 225, Squat 315, Deadlift 405. Absolute
thresholds reward bodyweight as much as strength: a 250 lb athlete collects them years before a 150 lb
athlete who is, pound for pound, considerably stronger. The catalog had no honor the lighter athlete could
ever win first.

It also had nothing for three things the app already records: total weight moved, who you trained with, and
coming back after time away.

---

## 2 · HC2-D1 — Relative Strength (11 honors)

Bench, squat, deadlift and overhead press as a **multiple of the athlete's own bodyweight**.

| Family | Thresholds |
|---|---|
| Bench | 1× · 1.25× · 1.5× |
| Squat | 1.5× · 2× · 2.5× |
| Deadlift | 2× · 2.5× · 3× |
| Overhead Press | 0.75× · 1× |

### This is the honest form of "top percentile"

The idea this family answers is "my lift is objectively strong." The obvious implementation — a percentile
against other athletes — is **barred**, and not marginally: it requires a ranked population of users, which
is precisely what CC-D2's Performance Firewall exists to prevent and what DNA §10 lists among prohibited
comparison mechanics. A percentile honor also *tells you where you rank*, which is a comparison delivered as
a reward.

A bodyweight ratio carries the same meaning against a **fixed standard rather than a population**. Nobody
else's data is read, nothing is ranked, and the honor means the same thing regardless of who else uses the
app. It is also the version that stays true: a percentile drifts as the user base changes, while a double
bodyweight squat is a double bodyweight squat forever.

### Bodyweight is optional, so these degrade silently

`body_entries` is an opt-in log. An athlete who has never weighed in has no ratio, and those honors are
simply **unreachable** for them — never rendered as failed, never marked as missed. No default weight is
assumed: inventing a bodyweight to award a strength honor would put a fabricated number underneath a
permanent record.

---

## 3 · HC2-D2 — Lifetime Tonnage (4 honors)

Every logged set's weight × reps, for the athlete's whole history: **1M · 5M · 10M · 25M lb**.

No window, no comparison, and nothing that can be lost. It is the one number that only ever grows, which
makes it the natural counterpart to streak-shaped honors that a single missed week can end.

Mixed units normalise: a kg-logged set converts, so a history spanning both is totalled correctly rather
than silently under-counted.

---

## 4 · HC2-D3 — Partnership (6 honors)

Built on `workouts.partners` (migration 0016), which nothing had read until now.

| Honor | Meaning |
|---|---|
| Never Alone | first partnered session |
| 10 / 50 / 100 Sessions Together | partnered sessions |
| **The Regular** | 25 sessions with the **same** person |
| Wide Circle | trained with 10 different people |

**The Regular is the one worth having.** Twenty-five sessions with one person is a relationship, and a
completely different achievement from a hundred sessions with a hundred people. The catalog should be able
to tell those apart.

Consistent with 0016's rule: partners are recorded on the tagger's own workout only. Tagging someone never
writes to their legacy, so these honors describe **your** training, not theirs.

---

## 5 · HC2-D4 — Comebacks (3 honors)

Returned and logged again after **30 · 90 · 180 days** away.

A catalog that only ever rewards unbroken accumulation quietly tells anyone who stopped that their record is
finished — and the moment someone returns after months away is the moment most people don't. Nothing else in
the app notices it.

**Strictly positive, by construction.** The metric is the longest gap that was *followed by a return*: it
resolves only once a workout exists after the gap. An athlete currently away scores nothing and is never
marked as away, so absence is never annotated (CC-D3). There is no honor for leaving, only for coming back.

---

## 6 · What this does NOT introduce

- No percentile, ranking, or population comparison of any kind (CC-D2 / DNA §10).
- No honor that reads another athlete's data. Partnership honors read the tag on your own workout.
- No negative or absence marker. Comebacks reward the return; the gap alone earns nothing.
- No rank impact (CC-D5) — honors remain independent of the Rank system.

---

## 7 · Documents needing edits

- [ ] `Honor-Catalog-v1.0-LOCKED.md` §1 — add Relative Strength (11), Partnership +6, Longevity +3, Training +4; total 167 → 191
- [ ] `Honors-Authoring-Standards-v1.0.md` — record the ratio-not-percentile rule, so a future author doesn't reintroduce percentiles
- [ ] `Honors-Taxonomy-Reconciliation-v1.0.md` — add the Relative Strength category

---

## 8 · Validation

- [x] Ratio honors unreachable, not failed, when no bodyweight is logged
- [x] No divide-by-zero and no assumed default weight
- [x] Tonnage normalises kg
- [x] Partnership reads only the athlete's own workout rows
- [x] Comeback resolves only on a return; absence is never marked
- [x] Grant-once still enforced by 0012's partial unique indexes
- [x] Nothing reads another athlete's data

---

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-30 | Initial. HC2-D1 Relative Strength (11), HC2-D2 Lifetime Tonnage (4), HC2-D3 Partnership (6), HC2-D4 Comebacks (3). Records why bodyweight ratios replace the requested "top percentile" family. |
