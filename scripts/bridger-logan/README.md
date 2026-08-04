# Iron & Engine — 6 Weeks

A program the athlete **purchased**, transcribed from screenshots for their own training.

The directory keeps the author's name so its provenance is unambiguous; the PROGRAM is called
**Iron & Engine**, because the athlete's Home screen should carry a description of the training rather
than the name of whoever sold it. IRON is the barbell spine — bench, squat, deadlift, military press,
descending ladders into 5×5 and peaking on max-effort triples in week 6. ENGINE is the conditioning
that closes nearly every session: sled work, wall ball complexes, AMRAPs, assault bike, rowing.

**Personal only.** Do not move this into `src/domain/training/programs/` or give it a
`source_definition_id`. Transcribing a bought program for yourself is ordinary use; shipping its
prescription as a Forge built-in that every user can adopt is republishing someone else's paid product.
Living outside `src/` is what keeps that structural rather than a promise.

## Run it

```bash
node scripts/bridger-logan/build.mjs                          # validate + report, writes nothing
node scripts/bridger-logan/build.mjs --write --email=you@…    # + out/structure.json and out/insert.sql
node --test scripts/bridger-logan/program.test.mjs            # 17 golden vectors vs the screenshots
```

Then paste `out/insert.sql` into the Supabase SQL editor. It is one `insert … where not exists`, so
re-running it is a no-op rather than a second copy with split progress.

**No schema migration is needed.** `programs.structure` is `jsonb`, which is the whole reason the
prescription model could grow rep ladders, circuits and AMRAPs without one.

`out/` is gitignored — `insert.sql` carries the account's email address.

## Files

| | |
|---|---|
| `program.mjs` | the 32 sessions, in a small authoring DSL |
| `aliases.mjs` | written name → catalogue id, decided by hand where the matcher abstains |
| `build.mjs` | validates the shape, resolves names, emits the row |
| `program.test.mjs` | asserts what was checked against the source by eye |

## Shape

6 weeks, 32 sessions, weeks of **6, 6, 5, 5, 5, 5**. Week 4 drops Push/Pull/Legs for
Upper/Lower/Athletic; week 6 peaks on Max Effort triples. `W1D5 LOWER or RUN` and `W2D4 UPPER or RUN`
offer an unprescribed run instead — only the lifting branch is authored, which is what the source shows.
