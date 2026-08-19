---
name: status-update
description: Update Forge-Legacy-Master-Status.md after shipping work, and archive its overflow. Use whenever a unit of work is finished, a decision resolves, a percentage moves, or the status doc needs trimming. Also use for the Quick Status / Full Status / Project Audit commands.
---

# Updating the Master Status doc

`Forge-Legacy-Master-Status.md` is the project's source of truth, and `AGENTS.md` makes **every
session read it first**. Its length is therefore a tax every future session pays. On 2026-08-18
it hit 5,374 lines / 868 KB with 81% of it one week of changelog.

Keeping it short is not tidiness. It is the reason sessions can still afford to read it.

## The seven maintenance rules

They're written at the top of the file itself. In short:

1. Update after major work.
2. Never delete a completed milestone — **move** it to § Recently Completed.
3. Add newly discovered work to the relevant section.
4. Keep all six completion percentages current.
5. Keep the Decision Queue current; remove a decision only when resolved.
6. Keep Recently Completed to the **15 most recent entries**. Overflow moves — verbatim — into
   `Docs/Status-Archive-2026-08.md` (or a new month's file), leaving the pointer at the foot of
   the section.
7. Update **Last Updated** and the Dashboard on every edit.

Rule 6 is the one that gets skipped, and it's the one that costs.

## Before you edit — check the size

```
wc -l Forge-Legacy-Master-Status.md
```

Healthy is ~1,300 lines. Past ~1,500, archive the overflow **in the same pass** as your update.
Don't file a ticket to do it later; later never comes and the file doubles.

## Writing an entry

One entry per **shipped unit**, not per commit and not per file touched. An entry states:

- What now works that didn't before, in the terms a user would recognise.
- What is genuinely done vs. what is applied-but-not-deployed. A migration that landed while its
  client sits undeployed is **not** shipped — say which of the three (SQL applied / code deployed
  / observed working) are actually true.
- The deployed `entry-<hash>` when a deploy was part of it.

Several archived entries are the only surviving record of *why* something was built a certain
way. Write for that reader. Moving is not deleting — never drop one to save space.

## Honesty rules

- Do not raise a percentage because work started. Raise it when the work is verifiable.
- If a gate passed but the feature was never seen working, record both facts.
- If conversation history conflicts with the doc, **identify the discrepancy** rather than
  assuming either source is right, and ask.

## The three status commands

- **Quick Status** — the Project Dashboard summary only. 30 seconds.
- **Full Status** — Dashboard, Current Sprint, Architecture Freeze, Documentation, Content,
  Implementation, Decision Queue, Risks, Next Milestones.
- **Project Audit** — a fresh repository-wide sweep. Compare the doc against the repo, the
  amendments, git history, and the tree. Update the doc where it's wrong, then report:
  completed, missing, duplicates, documentation gaps, cleanup, recommended next priorities.

## Reading it at all

The file exceeds a single `Read` call. Use `offset`/`limit`, or grep for the section you need.
Don't pull the whole thing into context to change four lines.
