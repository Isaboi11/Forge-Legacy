/**
 * holt-toolbox.test.mjs — hold Holt's coin, every AI tool two taps away (AI Road to 10 Sprint 4a §1.7, UX-3, lane C).
 *
 * The rows and their rules, plus source pins on the three components: the tap still opens the chat as before, the
 * hold is labelled for VoiceOver, form check is only navigated to, and the cards use tokens and engraved icons only.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-toolbox.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PREMIUM_AI_LINE, TOOLBOX_HINT, TOOL_ROUTES, toolboxRows } from '../holt-toolbox.ts';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

test('a payer with nutrition: all six rows, each opening its tool directly (two taps: hold, row)', () => {
  const rows = toolboxRows({ premiumAi: true, nutritionAccess: true, entitlementKnown: true });
  assert.deepEqual(rows.map((r) => r.label), ['Ask', 'Snap a plate', 'Describe a meal', 'Check my form', 'Import a photo', 'What can I make']);
  assert.deepEqual(rows.map((r) => r.does), [
    { kind: 'chat' },
    { kind: 'route', to: '/meal-photo' },
    { kind: 'route', to: '/describe-meal' },
    { kind: 'route', to: '/form-check' },
    { kind: 'route', to: '/program-import' },
    { kind: 'kitchen' },
  ]);
  assert.ok(rows.every((r) => !r.premium));
});

test('the nutrition rows follow the nutrition gate — hidden, not refused', () => {
  const rows = toolboxRows({ premiumAi: true, nutritionAccess: false, entitlementKnown: true });
  assert.deepEqual(rows.map((r) => r.key), ['ask', 'form', 'import']);
});

test('not entitled: the same rows, each taking the existing upgrade path; Ask is still the chat', () => {
  const rows = toolboxRows({ premiumAi: false, nutritionAccess: true, entitlementKnown: true });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[0].does, { kind: 'chat' });
  for (const r of rows.slice(1)) {
    assert.deepEqual(r.does, { kind: 'plans' }, r.key);
    assert.equal(r.sub, PREMIUM_AI_LINE);
    assert.equal(r.premium, true);
  }
});

test('entitlement unknown: nobody is called not-Premium; AI rows take the plans door, which says it could not verify', () => {
  const rows = toolboxRows({ premiumAi: false, nutritionAccess: true, entitlementKnown: false });
  assert.ok(rows.every((r) => !r.premium && r.sub !== PREMIUM_AI_LINE));
  assert.ok(rows.slice(1).every((r) => r.does.kind === 'plans'));
});

test('the routes are the contract names; the hint says "hold", never "long-press"', () => {
  assert.equal(TOOL_ROUTES.describe, '/describe-meal');
  assert.equal(TOOL_ROUTES.form, '/form-check');
  assert.doesNotMatch(TOOLBOX_HINT, /long.?press/i);
  assert.match(TOOLBOX_HINT, /Hold/);
});

test('CoachBubble: the tap is untouched, the hold opens the toolbox, Kitchen is spent on close', () => {
  const src = read('../../../components/forge/CoachBubble.tsx');
  assert.match(src, /onPress=\{openCoach\}/);
  assert.match(src, /onLongPress=\{\(\) => setToolboxOpen\(true\)\}/);
  assert.match(src, /holdHint=\{TOOLBOX_HINT\}/);
  assert.match(src, /kitchen=\{kitchen \|\| kitchenAsked\}/);
  assert.match(src, /const closeSheet = \(\) => \{\n\s+setKitchenAsked\(false\);\n\s+closeCoach\(\);/);
});

test('CoachSays: the hold is optional (the workout mount passes none) and offered as an accessibility action', () => {
  const src = read('../../../components/forge/CoachSays.tsx');
  assert.match(src, /onLongPress\?: \(\) => void;/);
  assert.match(src, /accessibilityActions=\{onLongPress \? \[\{ name: 'longpress'/);
  assert.match(src, /accessibilityHint=\{onLongPress \? holdHint : undefined\}/);
});

test('HoltToolbox: navigates to form check as it is; waits for the sheet on iOS; nutrition consent first', () => {
  const src = read('../../../components/forge/HoltToolbox.tsx');
  assert.doesNotMatch(src, /from '@\/[^']*form-check[^']*'/, 'imports nothing of form check');
  assert.match(src, /onDismiss=\{dismissed\}/);
  assert.match(src, /consentForRoute\(does\.to\)/);
  assert.match(src, /usePlansDoor\(\)/);
  assert.doesNotMatch(src, /'\/subscription'/, 'the existing door, not a second paywall');
});

test('the card, the status line and the toolbox: tokens only, engraved icons only', () => {
  for (const f of ['HoltActionCard.tsx', 'HoltStatusLine.tsx', 'HoltToolbox.tsx']) {
    const src = read(`../../../components/forge/${f}`);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${f}: no raw hex`);
    assert.doesNotMatch(src, /rgba?\(/, `${f}: no raw rgba`);
    assert.doesNotMatch(src, /from 'react-native'[^;]*\bModal\b/, `${f}: no RN Modal of its own`);
    assert.doesNotMatch(src, /@expo\/vector-icons|Ionicons|MaterialIcons/, `${f}: engraved icons only`);
  }
  const card = read('../../../components/forge/HoltActionCard.tsx');
  assert.match(card, /Not changed\./);
  assert.match(card, /a11y=\{`\$\{card\.confirmLabel\}: \$\{card\.title\}`\}/);
  assert.doesNotMatch(card, /dangerText|redMuted/, 'no red on a card');
});
