/**
 * holt-memory.test.mjs — the Sprint 4b contract module's pure rules (Docs/AI-Sprint-4b-Build-Notes.md §1.2, §1.3):
 * the memory filter (`keepFact`), which facts are written (`factsToKeep`), the recap's cleaning and where it goes in the
 * messages (`cleanRecap`, `withEarlier`), the memory summary's reading (`parseMemorySummary`) — and that the module
 * stays import-free (it is inlined into coach-ask's paste copy).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  cleanRecap,
  earlierBlock,
  factIsPersonalHealth,
  FACT_KINDS,
  factsToKeep,
  keepFact,
  MEMORY_SUMMARY_SCHEMA,
  memorySummaryTurn,
  OPENED_PLACEHOLDER,
  parseMemorySummary,
  RECAP_MAX_CHARS,
  RECAP_SYSTEM,
  SUMMARY_SYSTEM_V1,
  withEarlier,
} from '../holt-memory.ts';
import { medicalRoute, mentionsDiscomfort } from '../medical-routing.ts';
import { scanReply } from '../../ai/output-scan.ts';
import { SUMMARY_SYSTEM } from '../ask-tools.ts';
import { HOLT_NOTES_MAX, HOLT_NOTE_CHARS } from '../holt-notes.ts';

const SRC = fs.readFileSync(path.join(import.meta.dirname, '..', 'holt-memory.ts'), 'utf8');
/** coach-ask's memory stop test for an adult (memoryStops(false)). */
const stops = (s) => medicalRoute(s) !== 'clear' || mentionsDiscomfort(s) || scanReply(s).hit;

test('import-free, so the paste copy can inline it', () => {
  assert.doesNotMatch(SRC, /^import /m);
});

test('the numbers mirror the stores: one line of 80, a cap of 20, the kinds in the schema', async () => {
  const m = await import('../holt-memory.ts');
  assert.equal(m.FACT_MAX_CHARS, HOLT_NOTE_CHARS);
  assert.equal(m.HOLT_NOTES_CAP, HOLT_NOTES_MAX);
  assert.deepEqual(MEMORY_SUMMARY_SCHEMA.properties.facts.items.properties.kind.enum, [...FACT_KINDS]);
});

// ─────────────────────────────────────────────────────────────────────────────
// keepFact — the memory filter
// ─────────────────────────────────────────────────────────────────────────────

const KEPT = [
  ['dislike', 'Hates burpees'],
  ['schedule', 'Trains Mon, Wed, Fri mornings'],
  ['schedule', '45 minutes max on weekdays'],
  ['gym', 'Trains at home: adjustable dumbbells to 50 lb and a bench'],
  ['gym', 'Gym has no leg press'],
  ['gym', 'Trains at the Y'],
  ['avoid', 'Avoid jumping'],
  ['avoid', 'Avoid overhead pressing'],
  ['avoid', 'No burpees'],
  ['goal', 'Half marathon on April 12'],
  ['goal', 'Wants a 225 bench by March'],
  ['goal', 'Sub-25 5K this spring'],
  ['like', 'Loves leg day'],
  ['like', 'Likes shoulder press'],
  ['like', 'Likes rowing for conditioning'],
  ['like', 'Prefers free weights'],
  ['like', 'Likes booty day'],
  ['like', 'Likes core work'],
  ['like', 'Likes back squats'],
  ['dislike', 'Hates medicine ball slams'],
  ['gym', 'Prefers bodyweight workouts'],
  ['other', 'Left-handed'],
  ['other', 'Prefers to be told the why'],
  ['goal', 'Squats 315 lb, wants 365'],
  ['like', 'Does hip thrusts on Mondays'],
];

test('keepFact keeps ordinary coaching facts as they are (one line, kind kept)', () => {
  for (const [kind, text] of KEPT) assert.deepEqual(keepFact({ kind, text }), { kind, text }, text);
});

const DROPPED = [
  // body parts, symptoms, injuries — said any way
  'Bad knees', 'Bad left knee', 'My lower back gets tight', 'Knee pain on stairs', 'Shoulder surgery in March', 'Tore an ACL in 2019',
  'Has a weak core', 'Trains around my shoulder', 'Sore after leg day', 'Physio says no overhead', 'Sees a chiropractor', 'Recovering from a sprain',
  // avoid with a reason
  'Avoid jumping because of knees', 'Avoid jumping because it bugs me', 'Avoid squats, doctor said so', 'Avoid running until the PT clears it',
  // conditions, mental health, medication, supplements, pregnancy, diagnosis
  'Has asthma', 'Type 2 diabetic', 'Gets anxiety at the gym', 'In therapy for depression', 'Recovering from an eating disorder',
  'Takes creatine daily', 'Takes 2 advil before runs', 'On Ozempic', 'Uses pre-workout', 'Drinks a protein shake after',
  'Is 20 weeks pregnant', 'Six months postpartum', 'Diagnosed with scoliosis', 'Had an MRI last month', 'Allergic to peanuts',
  // weight and shape
  'Wants to lose 20 lbs', 'Down 10 lbs since June', 'Weighs 180', 'Wants to get lean', 'Wants a six-pack', 'Wants to shred for summer',
  'On a 1500 calorie diet', 'Wants a flat stomach', 'Hates her thighs', 'Wants to lose the dad bod',
];

test('⛔ keepFact drops anything about the body, health, medicine, pregnancy, weight or shape — and an avoid with a reason', () => {
  for (const text of DROPPED) {
    const kind = text.startsWith('Avoid') ? 'avoid' : 'other';
    assert.equal(keepFact({ kind, text }), null, `kept: ${text}`);
  }
});

test('keepFact: one line of 2–80 characters (never cut), quotes and a full stop trimmed, an unknown kind is "other"', () => {
  assert.equal(keepFact({ kind: 'like', text: 'x' }), null);
  assert.equal(keepFact({ kind: 'like', text: 'a'.repeat(81) }), null);
  assert.equal(keepFact({ kind: 'like', text: 42 }), null);
  assert.equal(keepFact(null), null);
  assert.deepEqual(keepFact({ kind: 'like', text: '  "Likes   rowing."  ' }), { kind: 'like', text: 'Likes rowing' });
  assert.deepEqual(keepFact({ kind: 'superpower', text: 'Left-handed' }), { kind: 'other', text: 'Left-handed' });
  assert.deepEqual(keepFact({ text: 'Left-handed' }), { kind: 'other', text: 'Left-handed' });
});

test('factIsPersonalHealth: training phrases that name a body part are not the body', () => {
  for (const t of ['shoulder press day', 'leg press', 'hip thrusts', 'back squat', 'chest day', 'upper body', 'full-body', 'push-ups', 'weight training', 'medicine ball']) assert.equal(factIsPersonalHealth(t), false, t);
  for (const t of ['my shoulder', 'my back', 'hip', 'knees', 'my arms are skinny']) assert.equal(factIsPersonalHealth(t), true, t);
});

// ─────────────────────────────────────────────────────────────────────────────
// factsToKeep — what is written
// ─────────────────────────────────────────────────────────────────────────────

test('factsToKeep: the filter, the guard, no duplicates (stored or in the batch), the cap, at most 5', () => {
  const proposed = [
    { kind: 'dislike', text: 'Hates burpees' },
    { kind: 'dislike', text: 'hates burpees!' },
    { kind: 'schedule', text: 'Trains Mon, Wed, Fri mornings' },
    { kind: 'other', text: 'Bad knee' },
    { kind: 'like', text: 'Likes rowing' },
    { kind: 'goal', text: 'Half marathon on April 12' },
    { kind: 'gym', text: 'Gym has no leg press' },
    { kind: 'like', text: 'Likes sled pushes' },
    { kind: 'like', text: 'Likes farmer carries' },
  ];
  const out = factsToKeep(proposed, ['Trains Mon, Wed, Fri mornings'], 20, stops);
  assert.deepEqual(out.map((f) => f.text), ['Hates burpees', 'Likes rowing', 'Half marathon on April 12', 'Gym has no leg press', 'Likes sled pushes']);
  assert.equal(factsToKeep(proposed, [], 2, stops).length, 2);
  assert.equal(factsToKeep(proposed, [], 0, stops).length, 0);
  assert.equal(factsToKeep(proposed, [], -3, stops).length, 0);
  // The guard passed in decides too (a dose the word lists might miss).
  assert.deepEqual(factsToKeep([{ kind: 'other', text: 'Likes 200 mg before runs' }], [], 20, stops), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// The prompts and the JSON
// ─────────────────────────────────────────────────────────────────────────────

test('SUMMARY_SYSTEM_V1 carries 4a’s summary rules word for word, plus the facts; nothing interpolated', () => {
  for (const rule of [
    'The athlete reads these notes, so write to them in the second person',
    'Only what was actually said in the chat. Never guess or infer.',
    'Lines in [square brackets] are notes from the app about what it actually did.',
    'Never include anything about health, pain, injury, illness, medication, supplements, pregnancy, mental health, or their body or weight.',
  ]) {
    assert.ok(SUMMARY_SYSTEM.includes(rule), `4a's prompt lost: ${rule}`);
    assert.ok(SUMMARY_SYSTEM_V1.includes(rule), `the memory prompt lost: ${rule}`);
  }
  for (const k of FACT_KINDS) assert.ok(SUMMARY_SYSTEM_V1.includes(`- ${k} —`), `kind ${k} is not explained`);
  assert.match(SUMMARY_SYSTEM_V1, /keep only "Avoid <movement>" — no body part, no reason/);
  assert.match(SUMMARY_SYSTEM_V1, /Never something Holt suggested, offered or built/);
  assert.match(SUMMARY_SYSTEM_V1, /At most 5 facts/);
  for (const p of [SUMMARY_SYSTEM_V1, RECAP_SYSTEM]) assert.ok(!p.includes('${'));
  assert.match(RECAP_SYSTEM, /at most 600 characters/);
  assert.match(RECAP_SYSTEM, /Never include anything about health/);
});

test('memorySummaryTurn says what is already kept, then the chat', () => {
  assert.equal(memorySummaryTurn('Athlete: hi', []), 'Already kept about this athlete:\n(nothing yet)\n\nThe chat:\nAthlete: hi');
  assert.equal(memorySummaryTurn('Athlete: hi', ['Hates  burpees', '']), 'Already kept about this athlete:\n- Hates burpees\n\nThe chat:\nAthlete: hi');
});

test('parseMemorySummary reads the JSON leniently and refuses any other shape', () => {
  assert.deepEqual(parseMemorySummary('{"summary":"You asked.","facts":[{"kind":"like","text":"Likes rowing"}]}'), { summary: 'You asked.', facts: [{ kind: 'like', text: 'Likes rowing' }] });
  assert.deepEqual(parseMemorySummary('```json\n{"summary":"x","facts":[]}\n```'), { summary: 'x', facts: [] });
  assert.deepEqual(parseMemorySummary('{"summary":"x","facts":["junk",{"kind":"like","text":"a"}]}').facts, [{ kind: 'like', text: 'a' }]);
  assert.equal(parseMemorySummary('NOTHING'), null);
  assert.equal(parseMemorySummary('[1,2]'), null);
  assert.equal(parseMemorySummary(null), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// The recap
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ cleanRecap drops every sentence the guard stops, caps at 600 on a sentence end, NOTHING is nothing', () => {
  assert.equal(cleanRecap('NOTHING', stops), null);
  assert.equal(cleanRecap('', stops), null);
  assert.equal(cleanRecap(42, stops), null);
  assert.equal(
    cleanRecap('The athlete trains Mondays. Their knee has been aching for a week. Holt offered a 3-day block.', stops),
    'The athlete trains Mondays. Holt offered a 3-day block.',
  );
  const long = cleanRecap('The athlete trains every single morning at six. '.repeat(40), stops);
  assert.ok(long.length <= RECAP_MAX_CHARS, `${long.length}`);
  assert.match(long, /six\.$/);
  // One enormous sentence is cut, not lost.
  const one = cleanRecap(`The athlete said ${'a lot of things '.repeat(60)}today.`, stops, 100);
  assert.ok(one.length <= 100 && one.endsWith('…'));
});

test('withEarlier: the recap takes the opener placeholder’s place, or leads the first user turn — never anything else', () => {
  const r = 'The athlete trains Mondays.';
  const block = earlierBlock(r);
  assert.match(block, /^\[Earlier in this conversation — .*: The athlete trains Mondays\.\]$/);
  const opener = [{ role: 'user', content: OPENED_PLACEHOLDER }, { role: 'assistant', content: 'Hey.' }, { role: 'user', content: 'q' }];
  assert.deepEqual(withEarlier(opener, r), [{ role: 'user', content: block }, opener[1], opener[2]]);
  const athlete = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hey.' }];
  assert.deepEqual(withEarlier(athlete, r), [{ role: 'user', content: `${block}\n\nhi` }, athlete[1]]);
  const holtFirst = [{ role: 'assistant', content: 'Hey.' }];
  assert.deepEqual(withEarlier(holtFirst, r), [{ role: 'user', content: block }, holtFirst[0]]);
  // No recap: the same array, untouched.
  assert.equal(withEarlier(athlete, null), athlete);
  assert.equal(withEarlier(athlete, ''), athlete);
  assert.deepEqual(athlete, [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hey.' }]);
});

test('memory eval 11-18: a one-off is not a fact, and "Avoid burpees" beside "Hates burpees" is a duplicate', async () => {
  const { factSubject } = await import('../holt-memory.ts');
  for (const t of ['Hotel gym with dumbbells only this week', '30 minutes per session this week', 'Legs today', 'Nothing overhead for now', 'Traveling next week']) {
    assert.equal(keepFact({ kind: 'gym', text: t }), null, t);
  }
  assert.equal(factSubject('Hates burpees'), 'burpees');
  assert.equal(factSubject('Avoid burpees.'), 'burpees');
  assert.equal(factSubject("Doesn't like burpees"), 'burpees');
  assert.deepEqual(factsToKeep([{ kind: 'avoid', text: 'Avoid burpees' }, { kind: 'other', text: 'Left-handed' }], ['Hates burpees'], 20, stops).map((f) => f.text), ['Left-handed']);
});
