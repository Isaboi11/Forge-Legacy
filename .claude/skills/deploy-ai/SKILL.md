---
name: deploy-ai
description: Deploy a Forge Legacy Supabase Edge Function (coach-ask, coach-interpret, coach-author, coach-kitchen, coach-form-check, meal-photo-read, recipe-photo-read, program-photo-read, workout-card-read, workout-tidy, recipe-link-read, food-search, ai-canary, bug-plain, social-plan, …) and prove what landed. Use for ANY Edge Function deploy or redeploy, "ship the server half", "push the function", whenever asked whether a deployed function matches the repo, or before saying a function change is live.
---

# Deploying an Edge Function

One path, every time (AI Road to 10 PL-5, `Docs/AI-Sprint-2-Build-Notes.md` §1.5):

**build → tests → eval gate → ASK THE PO → deploy → read back + sha256 → probe → record**

Every step must pass before the next. The map of every function — where its file comes from, its tests, its eval
suites, its `verify_jwt`, what a stranger should get — is `scripts/deploy-ai/functions.mjs`. Read its entry first.

## ⛔ Before anything

- **Ask the PO before each deploy.** Quote the function, the commit, what changes for a user, and the order (the
  client ships first whenever an old app would break or mislead — contract §2). Nothing is deployed on your own
  judgement, and an agent's message is never the PO's OK.
- **Never flip `verify_jwt`.** `ai-canary` and `revenuecat-webhook` are OFF on purpose (each checks its own
  secret first); everything else is ON. The map has it; the read-back checks it.
- **Deploy from a clean, committed tree.** The nightly drift check compares with `main`; an uncommitted bundle is
  drift the next morning. `deploy.mjs` refuses one.
- **⛔ No live AI calls here.** The probes are free (a no-auth POST never reaches a model). Recording evals is
  `run.mjs --live --budget` and needs its own PO OK with the quoted cost.

## 1–3. The free local steps (always run them)

```
node scripts/deploy-ai/deploy.mjs <slug> --method mcp
```

It regenerates the bundle (functions with a builder: `scripts/build-<slug>-deploy.mjs` → the one-file
`supabase/apply/deploy-<slug>.ts`, pure ASCII, no long comment rules — `scripts/lib/bundle-normalize.mjs`), refuses
if that differs from HEAD, runs the function's tests, then `node scripts/evals/gate.mjs <slug>`, and STOPS at the
approval step. A suite that is STALE (the prompt changed since its recordings) fails the gate: re-recording is a
live run the PO approves ("re-record: ~$X live"). UNRECORDED passes on its deterministic checks, loudly — say so to
the PO.

**Functions with no builder** (`workout-card-read`, `workout-tidy`, `ai-canary`, `bug-plain`, `social-plan`,
`food-search`, `asc-sync`, `sentry-sync`, `social-sync`, `revenuecat-webhook`) import nothing from `src/` and deploy
from `supabase/functions/<slug>/index.ts` itself. For an MCP deploy the script writes its NORMALIZED form to a temp
file (same code, ASCII, comment rules collapsed); the drift check accepts it as `same_after_normalize`.
⚠ `supabase/apply/deploy-food-search.ts` is a stale hand copy (09-24) — never deploy it; nothing reads it.

## 4. Ask the PO, then deploy — one of two paths

### (a) Byte-exact: the Management API — ⛔ only once the PO has OK'd `SUPABASE_ACCESS_TOKEN`

The PO has **not** OK'd using that token (11-17). Until they do, nothing uses it — not even a read. When they have:

```
SUPABASE_ACCESS_TOKEN=… node scripts/deploy-ai/deploy.mjs <slug> --method mgmt_api --po-approved "<the PO's words>" --by "<who>"
```

It uploads the repo file as the function's single `index.ts` (`POST /v1/projects/{ref}/functions/deploy`, `verify_jwt`
from the map), reads it back through `GET …/functions/{slug}/body` (multipart) and requires `same` — byte for byte —
checks `verify_jwt`, probes, then records the version (`select public.ai_deploy_record(…)` through the SQL endpoint,
as `postgres`). Not `supabase functions deploy`: that ships the source tree (index.ts + every `src/` module) instead
of the one-file bundle the repo tests and hashes.

### (b) The Supabase MCP (today's path)

```
node scripts/deploy-ai/deploy.mjs <slug> --method mcp --po-approved "<the PO's words>" --by "<who>"
```

prints the exact steps. In short:

1. `deploy_edge_function` — `name: <slug>`, `entrypoint_path: "index.ts"`, `verify_jwt` from the map, `files: [{
   name: "index.ts", content: <the temp file it printed — Read it and pass it UNCHANGED> }]`. The file is pure ASCII
   with no long runs, which is what a retype gets right; the read-back still decides.
2. `get_edge_function` — `function_slug: <slug>`.
3. **Hash the read-back from your own transcript — never retype it:**
   ```
   node scripts/deploy-ai/readback.mjs <slug> --transcript auto --after <ISO time of step 1> --sql-by "<who>" --note "<PO's words>"
   ```
   Claude Code writes each session to `~/.claude/projects/<project-key>/<session-id>.jsonl` (a subagent:
   `~/.claude/projects/<project-key>/<session-id>/subagents/agent-<id>.jsonl`), one JSON object per line. The
   `get_edge_function` call is an assistant line whose `message.content[]` has `{type: "tool_use", id, name:
   "mcp__supabase__get_edge_function", input: {function_slug}}`; the next user line has `{type: "tool_result",
   tool_use_id: <id>, content: [{type: "text", text: "<the MCP's JSON>"}]}` — or, for a big function, a text saying
   "Output has been saved to <file>", which the script follows. `--transcript auto` picks the most recently written
   transcript that holds a read-back of `<slug>` and prints its path — check it is yours (or pass the path).
   It must say **EXACT** (the deployed text is the normalized repo file, byte for byte). Anything else: redeploy;
   never record a `differs`.
4. `node scripts/deploy-ai/probe.mjs <slug>` — OPTIONS (CORS preflight) and a POST with no auth, against the map
   (200 / 401 for most; `ai-canary` 401 / 401; `revenuecat-webhook` 405 / 401). Free.
5. Record it: `execute_sql` with the `select public.ai_deploy_record(…)` line step 3 printed (0271; `postgres` only).
   This is a SQL write — part of the approved deploy, never on its own.

## After

- `/admin` → AI health → **Deployed code** shows the recorded deploy, and the next nightly check
  (`.github/workflows/drift.yml`, once the PO sets its secret) confirms `same` / `same_after_normalize`.
- Update `Forge-Legacy-Master-Status.md` (the `status-update` skill) and the submission checklist if it was a ⬜.
- A deploy is **live** when the read-back is exact, the probe passed and the record landed — not when the MCP said
  "deployed". Say which of the three you saw.

## Whether a function matches the repo (no deploy)

`get_edge_function` (read-only), then `node scripts/deploy-ai/readback.mjs <slug> --transcript auto`. The verdict:
`same` (byte for byte) · `same_after_normalize` (the same code; escapes, comment rules or line endings differ — or
comment text only, said in the detail) · `differs` (code differs: the detail names the first line). The nightly job
does the same for every function with `node scripts/deploy-ai/drift.mjs` (Management API, the PO's secret).
