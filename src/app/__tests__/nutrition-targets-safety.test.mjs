/**
 * nutrition-targets-safety.test.mjs — the Targets screen's safety doors, read from its source (AI audit 2026-11-16).
 *
 * N-D2: a profile that didn't load is not a profile never filled in. The read is strict, and until it loads no
 * recommendation is calculated — the screen says so and offers Try again, with Manual still open.
 *
 * Run:  node --test --experimental-strip-types src/app/__tests__/nutrition-targets-safety.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../nutrition-targets.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('⛔ N-D2: the profile is read strictly, and a failed read is its own state', () => {
  assert.match(src, /useQuery\(\(\) => fetchNutritionProfile\(\{ strict: true \}\), \[reloads\]\)/);
  assert.match(src, /const profileFailed = profileQ\.error != null && profileQ\.data == null;/);
  assert.doesNotMatch(src, /useQuery\(fetchNutritionProfile,/, 'the lenient read (null on error) is gone');
});

test('⛔ N-D2: no recommendation is calculated while the profile has failed to load', () => {
  assert.match(src, /const rec = burn && !profileFailed[^;]*\? recommend\(facts, burn, goal, pace, todayIso\) : null;/);
  assert.match(src, /if \(profileFailed\) blocked = /);
});

/* ── N-G2: pregnant or breastfeeding? ──────────────────────────────────────────────────────────────────────── */

test('⛔ N-G2: anyone who isn’t male is asked before any recommendation, and no number exists until they answer no', () => {
  assert.match(src, /const \[pregnancy, setPregnancy\] = useState<'yes' \| 'no' \| null>\(null\);/);
  assert.match(src, /const pregnancyHold = sex !== 'male' && pregnancy !== 'no';/);
  assert.match(src, /const rec = burn && !profileFailed && !pregnancyHold \? recommend\(/);
  assert.match(src, /const preview = burn && !profileFailed && !pregnancyHold \? recommend\(/, 'the pace sheet previews no numbers either');
  assert.match(src, /else if \(pregnancyHold\) blocked = /);
  assert.match(src, /mode === 'recommended' && \(profileFailed \|\| pregnancyHold \|\|/, 'the footer steps aside');
  assert.equal((src.match(/recommend\(facts, burn,/g) ?? []).length, 2, 'every recommend() call is gated');
});

test('⛔ N-G2: the question replaces the goal, pace and number — it is not a note beside them', () => {
  const hold = src.indexOf('{pregnancyHold ? (');
  const goal = src.indexOf('{/* goal */}');
  const number = src.indexOf('{/* the number */}');
  assert.ok(hold > 0 && goal > hold && number > goal);
  assert.match(src.slice(hold, goal), /<PregnancyCard answered=\{pregnancy === 'yes'\} onAnswer=\{setPregnancy\} onManual=\{\(\) => setMode\('manual'\)\} \/>/);
});

test('⛔ N-G2: the answer is never stored — no write anywhere takes it', () => {
  for (const line of src.split('\n').filter((l) => /\b(save\w*|update|insert|upsert)\(/.test(l))) {
    assert.doesNotMatch(line, /pregnan/i, line.trim());
  }
  assert.doesNotMatch(src, /AsyncStorage|localStorage|SecureStore/);
});

test('N-G2: the card points to a doctor or registered dietitian and keeps Manual open', () => {
  const card = src.slice(src.indexOf('function PregnancyCard('), src.indexOf('function MissingCard('));
  assert.match(card, /Are you pregnant or breastfeeding\?/);
  assert.match(card, /Your answer isn’t saved\./);
  assert.match(card, /a doctor or registered dietitian is the right person to set it/);
  assert.match(card, /Enter targets I’ve been given/);
  assert.doesNotMatch(card, /#[0-9a-f]{3,6}\b|rgba?\(/i, 'no new colours — the gate card tokens only');
});

test('⛔ N-D2: the failed-read card comes before every other gate, and the footer steps aside for it', () => {
  const card = src.indexOf('{profileFailed ? (');
  const gate = src.indexOf("blocker?.kind === 'under-age' ? (");
  assert.ok(card > 0 && gate > card, 'the failed-read card is checked before the under-18 gate');
  assert.match(src.slice(card, gate), /onPress=\{profileQ\.refetch\}/);
  assert.match(src, /mode === 'recommended' && \(profileFailed \|\|/);
});
