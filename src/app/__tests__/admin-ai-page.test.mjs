// node --test src/app/__tests__/admin-ai-page.test.mjs
//
// /admin → AI health (AI Road to 10 Sprint 1, PL-4; 0269). The shaping and the rules are unit-tested in
// src/domain/admin/__tests__/ai-health-core.test.mjs; these are the wiring tripwires.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const PAGE = read('../admin-ai.tsx');
const ADMIN = read('../admin.tsx');
const LAYOUT = read('../_layout.tsx');
const LIVE = read('../../data/ai-health-live.ts');

test('a failed load says it failed, with Try again — it never draws the sections from nothing', () => {
  assert.match(PAGE, /health\.error \|\| !h \? \(\s*<SectionCard title="AI health didn’t load">/);
  assert.match(PAGE, /onPress=\{health\.refetch\}/);
  assert.match(PAGE, /this is not a quiet day/);
  // The sections render only from a loaded payload.
  assert.match(PAGE, /: \(\s*<Loaded h=\{h\} \/>\s*\)/);
  assert.doesNotMatch(PAGE, /\?\? 0\b|\|\| 0\b/, 'no zero fallbacks in the page');
  // And the read itself throws on an answer it cannot read.
  assert.match(LIVE, /return shapeAiHealth\(raw\);/);
});

test('operators only: the redirect fails closed, the database is the gate', () => {
  assert.match(PAGE, /const admin = useQuery\(\(\) => isAppAdmin\(\), \[\]\);/);
  assert.match(PAGE, /if \(admin\.data !== true\) return <Redirect href="\/" \/>;/);
  assert.match(LAYOUT, /<Stack\.Screen name="admin-ai" \/>/);
});

test('it shows everything the brief asks for', () => {
  for (const s of ['Right now', 'Canary', 'By function', 'By day', 'Unsettled reservations', 'Was it helpful?']) {
    assert.ok(PAGE.includes(`title="${s}"`), s);
  }
  for (const v of ['h.totals.calls', 'h.totals.failures', 'h.totals.refunds', 'h.totals.credits', 'h.totals.costUsd', 'h.unsettled.count', 'h.feedbackTotals', 'h.canary.last', 'failureRateLine(']) {
    assert.ok(PAGE.includes(v), v);
  }
  assert.match(PAGE, /fnLine\(r\)/, 'p50 / p95, refunds, credits and cost per function per day');
});

test('tables and stat rows, the admin’s own components, existing tokens — no new chart and no hard-coded colour', () => {
  assert.match(PAGE, /import \{ RangeControl, SectionCard, StatLine \} from '@\/components\/forge\/admin\/charts';/);
  assert.doesNotMatch(PAGE, /AdminLineChart|AdminBarChart|Sparkline|react-native-svg/);
  assert.doesNotMatch(PAGE.slice(PAGE.indexOf('const styles')), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'colours come from tokens');
  // The relative clock is the snapshot's, not Date.now() during render.
  assert.match(PAGE, /const nowMs = Date\.parse\(h\.generatedAt\);/);
  assert.doesNotMatch(PAGE, /Date\.now\(\)/);
});

test('/admin links to it', () => {
  assert.match(ADMIN, /onPress=\{\(\) => router\.push\('\/admin-ai'\)\}/);
  assert.match(ADMIN, /accessibilityLabel="Open AI health"/);
});
