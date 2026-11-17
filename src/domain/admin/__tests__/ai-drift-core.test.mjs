// node --experimental-strip-types --test src/domain/admin/__tests__/ai-drift-core.test.mjs
//
// /admin-ai → "Deployed code" (AI Road to 10 Sprint 2, PL-5; 0271 admin_ai_deploys): the answer is read strictly,
// a failed read is a failed load, alarms are differs / fetch_failed, and a missed night says so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  AiDeploysUnreadable,
  DRIFT_ALARM,
  DRIFT_FRESH_HOURS,
  DRIFT_LABEL,
  DRIFT_STATUSES,
  driftRowLine,
  driftVerdict,
  flaggedRows,
  latestDeploys,
  shapeAiDeploys,
} from '../ai-drift-core.ts';

const NOW = Date.parse('2026-11-18T12:00:00Z');
const answer = (rows, checkedAt = '2026-11-18T09:17:00Z', extra = {}) => ({
  generated_at: '2026-11-18T12:00:00Z',
  last_check: rows ? { checked_at: checkedAt, rows } : null,
  runs_7d: 3,
  deploys: [],
  ...extra,
});
const row = (slug, status, v = 3, detail = null) => ({ slug, status, deployed_version: v, repo_commit: 'abcdef1', detail });

test('the statuses are 0271’s, and every one has words', () => {
  const mig = readFileSync(new URL('../../../../supabase/migrations/0271_ai_deploys_and_drift.sql', import.meta.url), 'utf8');
  for (const s of DRIFT_STATUSES) {
    assert.ok(mig.includes(`'${s}'`), s);
    assert.ok(DRIFT_LABEL[s], s);
  }
  assert.equal(DRIFT_STATUSES.length, 6);
  assert.deepEqual([...DRIFT_ALARM], ['differs', 'fetch_failed']);
});

test('shape: strict on what it cannot read (a failed load, never an all clear)', () => {
  assert.throws(() => shapeAiDeploys(null), AiDeploysUnreadable);
  assert.throws(() => shapeAiDeploys({}), /generated_at/);
  assert.throws(() => shapeAiDeploys(answer([{ slug: 'x', status: 'weird' }])), /bad check row/);
  assert.throws(() => shapeAiDeploys({ generated_at: 'x', last_check: { rows: [] } }), /bad last_check/);
  const s = shapeAiDeploys(answer([row('coach-ask', 'same', 27)], undefined, { deploys: [{ slug: 'coach-ask', version: 27, method: 'mcp', deployed_at: '2026-11-18T08:00:00Z', deployed_by: 'integrator', source_commit: null }, { junk: 1 }] }));
  assert.equal(s.lastCheck.rows[0].deployedVersion, 27);
  assert.equal(s.deploys.length, 1, 'a malformed deploy row is skipped, not fatal');
  assert.equal(s.runs7d, 3);
});

test('verdict: never · clean · alarm · stale', () => {
  assert.equal(driftVerdict(shapeAiDeploys(answer(null)), NOW).state, 'never');
  const clean = driftVerdict(shapeAiDeploys(answer([row('a', 'same'), row('b', 'same_after_normalize'), row('social-sync', 'missing_live', null)])), NOW);
  assert.equal(clean.state, 'clean', 'a function not deployed on purpose is listed, not an alarm');
  assert.deepEqual(clean.flagged.map((r) => r.slug), ['social-sync']);
  const alarm = driftVerdict(shapeAiDeploys(answer([row('a', 'same'), row('w', 'differs', 4, 'line 336'), row('f', 'fetch_failed'), row('o', 'missing_in_repo')])), NOW);
  assert.equal(alarm.state, 'alarm');
  assert.deepEqual(alarm.alarms.map((r) => r.slug), ['w', 'f']);
  assert.deepEqual(alarm.flagged.map((r) => r.slug), ['w', 'f', 'o'], 'worst first');
  const old = new Date(NOW - (DRIFT_FRESH_HOURS + 2) * 3_600_000).toISOString();
  const stale = driftVerdict(shapeAiDeploys(answer([row('a', 'same')], old)), NOW);
  assert.equal(stale.state, 'stale');
  assert.equal(stale.hours, DRIFT_FRESH_HOURS + 2);
});

test('lines and the latest deploy per function', () => {
  assert.equal(driftRowLine({ slug: 'w', status: 'differs', deployedVersion: 4, repoCommit: null, detail: null }), 'v4 · differs from the repo');
  assert.equal(driftRowLine({ slug: 's', status: 'missing_live', deployedVersion: null, repoCommit: null, detail: null }), 'in the repo, not deployed');
  assert.deepEqual(flaggedRows([]), []);
  const d = [
    { slug: 'a', version: 1, method: 'mcp', deployedAt: '2026-11-17T01:00:00Z', deployedBy: 'x', sourceCommit: null },
    { slug: 'a', version: 2, method: 'mgmt_api', deployedAt: '2026-11-18T01:00:00Z', deployedBy: 'x', sourceCommit: null },
    { slug: 'b', version: 9, method: 'mcp', deployedAt: '2026-11-16T01:00:00Z', deployedBy: 'x', sourceCommit: null },
  ];
  assert.deepEqual(latestDeploys(d).map((x) => `${x.slug}${x.version}`), ['a2', 'b9']);
});

test('the page reads it on its own, and the card is on /admin-ai with a failed-load state', () => {
  const live = readFileSync(new URL('../../../data/ai-health-live.ts', import.meta.url), 'utf8');
  assert.match(live, /callRpc<unknown>\('admin_ai_deploys', \{ p_limit: 30 \}\)/);
  // Web / trunk: AI health is the Business CRM page (`AiHealthPage`, which /admin-ai opens), so the card is a CRM
  // Block there — build 11's `DeployedCodeCard` on its Forge page, the same read and the same promises.
  const page = readFileSync(new URL('../../../components/forge/admin/pages/AiHealthPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /<DeployedCodeBlock \/>/);
  assert.match(page, /useQuery\(\(\) => fetchAiDeploys\(\), \[\]\)/);
  assert.match(page, /this is not an all clear/);
  // Existing tokens only (both themes): no hex colours in the new card.
  const card = page.slice(page.indexOf('function DeployedCodeBlock'), page.indexOf('function verdictLine'));
  assert.ok(card.length > 200, 'the card is there');
  assert.doesNotMatch(card, /#[0-9a-fA-F]{3,8}\b/);
});
