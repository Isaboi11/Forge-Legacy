# Coach Holt — the stress-test corpus

3,375 messages written to sound like real athletes typing and dictating to Holt: clean, sloppy, voice
homophones, slang, emoji, six languages, one-word replies, prompt injections, and every shape of injury and
emergency sentence. They are the input to the 2026-09-21/22 stress test
(`Docs/Coach-Holt-Stress-Test-2026-09-21.md`), and they are here so the numbers in that document can be
reproduced and beaten rather than remembered.

| File | Lines | What each line carries |
|---|---|---|
| `corpus-answers.jsonl` | 1,158 | An answer to ONE of Holt's questions (`qid`), and the fields a correct parse produces |
| `corpus-build.jsonl` | 705 | An opening request, the fields it should yield, and `unsupported` — what the engine could not express when it was written |
| `corpus-safety.jsonl` | 704 | `route`: acute · advice · urgent · crisis-adjacent · sensitive · swap · benign · benign_soreness |
| `corpus-misc.jsonl` | 808 | `intent`: edit_program · ask_training · app_help · import · pick · smalltalk · off_topic · adversarial · multilingual · mixed |

## Running them

**Free, offline, every test run.** `src/domain/coach/__tests__/safety-corpus.test.mjs` puts the whole safety
corpus through the code guard and holds it to floors and ceilings — an emergency must still be caught, a
"sore shoulder, swap tomorrow" must still go through.

```
node --experimental-strip-types scripts/holt-corpus/score-guard.mjs        # the guard, by route
```

**Live, and it spends real money** (~$0.002 a message on Sonnet 5 — 1,400 messages cost $2.19 on
2026-09-22). Quote the cost and check the Anthropic balance first: one bulk run once drained it and took
photo import down with it. `coach-interpret` and `coach-ask` must be deployed.

```
HOLT_EMAIL=… HOLT_PASSWORD=… node --experimental-strip-types scripts/holt-corpus/run-live.mjs misc 1
HOLT_EMAIL=… HOLT_PASSWORD=… node --experimental-strip-types scripts/holt-corpus/run-live.mjs safety 2   # every 2nd
node scripts/holt-corpus/score-live.mjs                                     # scores live3-*.jsonl
```

`run-live.mjs` routes each message the way the app does — a question to `coach-ask` (streamed), anything
else to `coach-interpret` — and records the route, the fields, the first-word latency and the token usage,
so cost and speed come out of the same run as accuracy.

## Adding to it

Add lines, never rewrite them: the value is that the same sentences are asked again after every change. A
new line needs the same shape as its neighbours (`id`, `text`, and the expectation fields for that file).
When a gap is closed, leave the line and let the score move.
