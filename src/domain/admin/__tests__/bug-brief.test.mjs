import test from 'node:test';
import assert from 'node:assert/strict';

import { bugBrief, bugsBrief } from '../bug-brief.ts';

const bug = (over = {}) => ({
  ref: 'F2',
  title: 'Squad goal can’t be saved on a phone',
  severity: 'critical',
  status: 'open',
  area: 'squads & social',
  source: 'qa',
  report: 'Docs/QA/Full-App-QA-2026-09-26.md',
  round: 1,
  origin: null,
  detail: '- **Where:** `src/app/squad/[id].tsx:1064`\n\nThe sheet does not scroll.',
  note: null,
  created_at: '2026-09-26T10:00:00Z',
  ...over,
});

test('one bug: ref, severity, source and the detail VERBATIM (markdown and file:line kept)', () => {
  const s = bugBrief(bug());
  assert.match(s, /## F2 — Squad goal can’t be saved on a phone/);
  assert.match(s, /Critical · Open · area: squads & social · QA report Docs\/QA\/Full-App-QA-2026-09-26\.md, round 1 · added 2026-09-26/);
  assert.ok(s.includes('- **Where:** `src/app/squad/[id].tsx:1064`'), 'detail must not be rewritten');
  assert.match(s, /which refs to mark Fixed/);
});

test('note, merged reports and a hand-filed / tracked origin', () => {
  const s = bugBrief(bug({ source: 'manual', report: null, round: null, origin: 'testflight:abc', note: ' happens on SE only ' }), [
    { origin: 'review:9', source: 'App Store' },
  ]);
  assert.match(s, /tracked from testflight:abc/);
  assert.match(s, /Also reported once more: App Store \(review:9\)/);
  assert.match(s, /Owner’s note: happens on SE only$/);
  assert.match(bugBrief(bug({ source: 'manual', origin: null, detail: null })), /filed by hand in the CRM[\s\S]*\(No description on the board\.\)/);
});

test('many bugs: most severe first, then oldest; the header names the filter and the counts', () => {
  const s = bugsBrief(
    [
      bug({ ref: 'L1', severity: 'low' }),
      bug({ ref: 'H2', severity: 'high', created_at: '2026-09-27T00:00:00Z' }),
      bug({ ref: 'H1', severity: 'high', created_at: '2026-09-25T00:00:00Z' }),
      bug({ ref: 'C1', severity: 'critical' }),
    ],
    () => [],
    'Active · Any severity',
  );
  assert.match(s, /^Fix these 4 Forge Legacy bugs from the CRM board \(Active · Any severity — 1 critical, 2 high, 1 low\)\./);
  const order = [...s.matchAll(/## \d+\. (\w+) —/g)].map((m) => m[1]);
  assert.deepEqual(order, ['C1', 'H1', 'H2', 'L1']);
});

test('negative control: an empty set says 0 and lists nothing', () => {
  const s = bugsBrief([], () => [], 'Fixed');
  assert.match(s, /Fix these 0 Forge Legacy bugs/);
  assert.doesNotMatch(s, /## 1\./);
});
