// node --test src/app/__tests__/admin-ai-page.test.mjs
//
// /admin → AI health (AI Road to 10 Sprint 1, PL-4; 0269). The shaping and the rules are unit-tested in
// src/domain/admin/__tests__/ai-health-core.test.mjs; these are the wiring tripwires.
//
// ⚠ WEB / TRUNK LINE. Build 11's /admin is the old Creator Dashboard, so there /admin-ai is its own Forge page
// built on `components/forge/admin/charts` and linked from a card on /admin. This line's /admin is the Business
// CRM (no charts kit), so the page is a CRM page — `components/forge/admin/pages/AiHealthPage.tsx`, sidebar →
// Business → AI health (`/admin?p=aihealth`) — and /admin-ai is the door the alert push and the phone CRM open.
// Same promises, pinned against this line's files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const PAGE = read('../../components/forge/admin/pages/AiHealthPage.tsx');
const ROUTE = read('../admin-ai.tsx');
const NAV = read('../../components/forge/admin/pages/types.ts');
const SHELL = read('../../components/forge/admin/CrmShell.tsx');
const MORE = read('../../components/forge/admin/phone/MoreTab.tsx');
const LAYOUT = read('../_layout.tsx');
const LIVE = read('../../data/ai-health-live.ts');

test('a failed load says it failed, with Try again — it never draws the sections from nothing', () => {
  assert.match(PAGE, /health\.error \|\| !h \? \(\s*<Block\s+label="AI health didn’t load"/);
  assert.match(PAGE, /onRetry: health\.refetch/);
  assert.match(PAGE, /this is not a quiet day/);
  // The sections render only from a loaded payload.
  assert.match(PAGE, /: \(\s*<Loaded h=\{h\} \/>\s*\)/);
  assert.doesNotMatch(PAGE, /\?\? 0\b|\|\| 0\b/, 'no zero fallbacks in the page');
  // And the read itself throws on an answer it cannot read.
  assert.match(LIVE, /return shapeAiHealth\(raw\);/);
});

test('operators only: the redirect fails closed, the database is the gate', () => {
  assert.match(ROUTE, /const admin = useQuery\(\(\) => isAppAdmin\(\), \[\]\);/);
  assert.match(ROUTE, /if \(admin\.data !== true\) return <Redirect href="\/" \/>;/);
  assert.match(LAYOUT, /<Stack\.Screen name="admin-ai" \/>/);
  // /admin (the CRM) keeps its own fail-closed gate in front of the sidebar page.
  assert.match(read('../admin.tsx'), /if \(admin\.data !== true\) return <Redirect href="\/" \/>;/);
});

test('it shows everything the brief asks for', () => {
  for (const s of ['Right now', 'Canary', 'By function', 'By day', 'Unsettled reservations', 'Was it helpful?']) {
    assert.ok(PAGE.includes(`label="${s}"`), s);
  }
  for (const v of ['h.totals.calls', 'h.totals.failures', 'h.totals.refunds', 'h.totals.credits', 'h.totals.costUsd', 'h.unsettled.count', 'h.feedbackTotals', 'h.canary.last', 'failureRateLine(']) {
    assert.ok(PAGE.includes(v), v);
  }
  assert.match(PAGE, /fnLine\(r\)/, 'p50 / p95, refunds, credits and cost per function per day');
});

test('rows and figures, the CRM’s own kit and palettes — no chart and no hard-coded colour', () => {
  assert.match(PAGE, /from '@\/components\/forge\/admin\/crm-ui';/);
  assert.doesNotMatch(PAGE, /Chart\b|<Bars|Sparkline|react-native-svg/);
  assert.doesNotMatch(PAGE, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'colours come from useCrm().c');
  assert.doesNotMatch(ROUTE.slice(ROUTE.indexOf('const styles')), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'colours come from tokens');
  // The relative clock is the snapshot's, not Date.now() during render.
  assert.match(PAGE, /const nowMs = Date\.parse\(h\.generatedAt\);/);
  assert.doesNotMatch(PAGE, /Date\.now\(\)/);
  // The read covers 1–90 days (0269 clamps p_days), so the page keeps its own window instead of the CRM's 1Y.
  assert.doesNotMatch(NAV.match(/export const RANGE_PAGES[^\n]*/)[0], /'aihealth'/);
});

test('the CRM reaches it the way it reaches every page, and /admin-ai opens it', () => {
  assert.match(NAV, /\| 'aihealth'/);
  assert.match(NAV, /\{ key: 'aihealth', label: 'AI health' \}/);
  assert.match(SHELL, /case 'aihealth':\n\s*return <AiHealthPage tz=\{props\.tz\} \/>;/);
  // The phone CRM's More tab → the route; the route → the CRM page on a wide screen, the page itself on a narrow one.
  assert.match(MORE, /\{ key: 'aihealth', label: 'AI health'/);
  assert.match(MORE, /r\.key === 'aihealth' \? router\.push\('\/admin-ai'\)/);
  assert.match(ROUTE, /if \(wide\) return <Redirect href="\/admin\?p=aihealth" \/>;/);
  assert.match(ROUTE, /<AiHealthPage tz=\{dashboardTz\(\)\} \/>/);
});
