---
name: migration
description: Write, number, and apply a Supabase SQL migration for Forge Legacy. Use for any schema change, RLS policy, trigger, RPC, or grant — and whenever asked whether a migration is applied, why a migration "didn't work", or to produce a paste bundle for the Supabase SQL editor.
---

# Migrations

There is **no Supabase CLI and no service key** in this project. Migrations are applied by the
PO pasting SQL into the Supabase SQL editor by hand. That constraint shapes everything below.

## 1. Get the real number — the ledger goes stale

```
ls supabase/migrations | tail -5
```

Never take the next number from memory, from the status doc, or from this file.
`0152` has already been used twice because someone did.

## 2. Two files per migration

- `supabase/migrations/<NNNN>_<slug>.sql` — the migration of record.
- `supabase/apply/pending-<NNNN>.sql` — **the paste bundle**, which is the form this project
  actually applies. A migration without one cannot be applied.

## 3. The paste bundle has three sections

Follow `supabase/apply/pending-0169.sql` as the reference.

**Header comment** — what it is for, what it does, and every ⚠ a future reader needs.
Say explicitly that the whole file is pasted at once and is safe to run twice.

**§1 — the statements.** Carried over from the migration file **verbatim**. Verify that by
parsing and diffing both files, not by eye, and state the count you checked ("11 of 11 present").

**§2 — the assertion.** `raise` if the column / constraint / policy / function is absent.
A migration that returns a tidy green while having done nothing is the failure mode this
section exists to prevent.

**§3 — the report.** Read-only. Shows what landed and how many rows are affected.

Everything must be idempotent and guarded: `add column if not exists`, `create ... if not exists`,
and `do $$ ... if not exists (select 1 from pg_constraint where conname = ...) ...`.

## 4. Predict §3's output before it runs

Write down what §3 *should* say, and why. If the client that writes a new column is committed
but not deployed, the answer count must be **0** — and a non-zero count means something is
writing columns it should not.

## 5. Applying is not working

`0153` landed perfectly clean and nothing appeared in the app for eleven migrations, because the
code that read it was never deployed. A migration is done when:

1. The SQL is applied (§2 didn't raise), **and**
2. The client code that uses it is deployed (`/deploy-web`), **and**
3. Someone saw the thing happen in the app.

Report which of the three are true. Do not call it shipped at step 1.

## Traps that have actually bitten

- **`SECURITY DEFINER` exempts the caller, not the callee.** A revoke on `evaluate_honors` killed
  Finish Workout with every gate green, because the definer function still called it as itself.
- **Bare column references in a function raise 42702** when the name also exists on a joined table
  (`tz` vs `profiles.tz`). Qualify every column inside functions.
- **Re-pasting an old migration reverts later ones.** `0059` reverts friends competitions to
  squad-only. Check a migration's own header before re-running it.
- **Comment-only edits to an applied migration do not need re-running.** Prove it's comment-only
  by diffing non-comment lines, then say so.
- An allow-list in the client can silently drop new kinds — `KINDS` in `notifications-live.ts`
  hid two working notification types for eleven migrations. Grep the client for allow-lists that
  need the new value.

## Handing it over

Give the PO the file path and tell them to paste the whole file. Then wait for §3's output and
read it against the prediction from step 4 before recording anything as applied.
