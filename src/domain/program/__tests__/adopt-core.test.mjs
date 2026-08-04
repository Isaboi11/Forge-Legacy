import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blockForWeek, structureFromDefinition } from '../adopt-core.ts';

const rx = (name, sets, reps) => ({ catalogKey: name.toLowerCase().replace(/ /g, '-'), displayName: name, sets, reps, unit: 'reps' });

const block = (label, weekStart, weekEnd, workouts) => ({ label, weekStart, weekEnd, workouts });
const workout = (code, name, main, warmup = []) => ({ code, name, modality: 'strength', split: 'full_body', warmup, main });

const singleBlock = {
  id: 'sf-i-3day',
  name: 'Strength Foundation I (3-Day)',
  family: 'Strength',
  durationWeeks: 6,
  frequencyPerWeek: 3,
  goals: [],
  blocks: [
    block('Weeks 1–6', 1, 6, [
      workout('A', 'Confidence Builder', [rx('Back Squat', 3, 5), rx('Bench Press', 3, 8)], [{ name: 'Bike', text: '5 min easy bike' }]),
      workout('B', 'Steady Hands', [rx('Deadlift', 1, 5)]),
      workout('C', 'Full Circle', [rx('Overhead Press', 3, 8)]),
    ]),
  ],
  status: 'LOCKED',
  source: 'forge',
  sourceFile: 'x.docx',
};

const multiBlock = {
  ...singleBlock,
  durationWeeks: 4,
  frequencyPerWeek: 2,
  blocks: [
    block('Weeks 1–2', 1, 2, [workout('A', 'Base', [rx('Back Squat', 3, 8)]), workout('B', 'Base B', [rx('Bench Press', 3, 8)])]),
    block('Weeks 3–4', 3, 4, [workout('A', 'Peak', [rx('Back Squat', 5, 3)]), workout('B', 'Peak B', [rx('Bench Press', 5, 3)])]),
  ],
};

test('a single-block program becomes a repeating week', () => {
  const s = structureFromDefinition(singleBlock);
  assert.equal(s.name, 'Strength Foundation I (3-Day)');
  assert.equal(s.weeks, 6);
  assert.equal(s.daysPerWeek, 3);
  assert.equal(s.vary, false, 'nothing changes week to week — a repeating template is the honest shape');
  assert.equal(s.weekPlans, null);
  assert.deepEqual(s.days.map((d) => d.letter), ['A', 'B', 'C']);
  assert.deepEqual(s.days.map((d) => d.name), ['Confidence Builder', 'Steady Hands', 'Full Circle']);
});

test('prescriptions carry across intact — sets, reps, name and catalog key', () => {
  const day = structureFromDefinition(singleBlock).days[0];
  assert.deepEqual(
    day.main.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, catalogKey: e.catalogKey })),
    [
      { name: 'Back Squat', sets: 3, reps: 5, catalogKey: 'back-squat' },
      { name: 'Bench Press', sets: 3, reps: 8, catalogKey: 'bench-press' },
    ],
  );
});

/**
 * Warm-ups carry `name` ("Bodyweight Squat") and `detail` ("10 reps") separately, with `text` joining
 * them. Using `text` as the exercise name buried the prescription inside it — a logged warm-up read
 * "Bodyweight Squat — 10 reps" and never resolved back to the catalog, so warm-ups showed no exercise
 * detail at all. The name must stay clean.
 */
test('a warm-up takes the exercise NAME, never the prose with its prescription attached', () => {
  const day = structureFromDefinition(singleBlock).days[0];
  assert.equal(day.warmup.length, 1);
  assert.equal(day.warmup[0].name, 'Bike', 'the name alone — not "5 min easy bike"');
  assert.ok(!day.warmup[0].name.includes('min'), 'the prescription must not be inside the name');
});

test('a warm-up reps count is read from the detail, and nothing is invented when it is prose', () => {
  const reps = structureFromDefinition({
    ...singleBlock,
    blocks: [block('W', 1, 6, [workout('A', 'Day', [rx('Back Squat', 3, 5)], [{ name: 'Bodyweight Squat', detail: '10 reps', text: 'Bodyweight Squat — 10 reps' }])])],
  }).days[0].warmup[0];
  assert.deepEqual([reps.name, reps.sets, reps.reps], ['Bodyweight Squat', 1, 10]);

  const prose = structureFromDefinition({
    ...singleBlock,
    blocks: [block('W', 1, 6, [workout('A', 'Day', [rx('Back Squat', 3, 5)], [{ name: 'Light treadmill walk', detail: '2 minutes', text: 'Light treadmill walk — 2 minutes' }])])],
  }).days[0].warmup[0];
  assert.equal(prose.sets, undefined, '"2 minutes" is not a rep count — invent nothing');
  assert.equal(prose.reps, undefined);
});

test('a warm-up resolves to its catalog exercise when the name is known', () => {
  const day = structureFromDefinition(
    singleBlock,
    undefined,
    (n) => (n === 'Bike' ? 'stationary-bike' : undefined),
  ).days[0];
  assert.equal(day.warmup[0].catalogKey, 'stationary-bike', 'without this the warm-up opens no detail page');
});

test('equipment is resolved through the catalog when a lookup is supplied', () => {
  const s = structureFromDefinition(singleBlock, (key) => (key === 'back-squat' ? 'Barbell' : undefined));
  assert.equal(s.days[0].main[0].equip, 'Barbell');
  assert.equal(s.days[0].main[1].equip, undefined, 'unknown equipment stays absent rather than guessed');
});

// ── the part most easily lost: progression ──────────────────────────────────

test('a multi-block program becomes per-week plans so its progression survives', () => {
  const s = structureFromDefinition(multiBlock);
  assert.equal(s.vary, true, 'collapsing to one repeating week would throw the progression away');
  assert.equal(s.weekPlans.length, 4);
  assert.equal(s.weekPlans[0].days[0].name, 'Base');
  assert.equal(s.weekPlans[1].days[0].name, 'Base', 'week 2 still sits in the first block');
  assert.equal(s.weekPlans[2].days[0].name, 'Peak', 'week 3 crosses into the second block');
  assert.equal(s.weekPlans[3].days[0].name, 'Peak');
});

test('the later block’s prescriptions really are different', () => {
  const s = structureFromDefinition(multiBlock);
  assert.deepEqual([s.weekPlans[0].days[0].main[0].sets, s.weekPlans[0].days[0].main[0].reps], [3, 8]);
  assert.deepEqual([s.weekPlans[3].days[0].main[0].sets, s.weekPlans[3].days[0].main[0].reps], [5, 3]);
});

test('blockForWeek maps weeks to their block and never falls off the end', () => {
  const blocks = multiBlock.blocks;
  assert.equal(blockForWeek(blocks, 1).label, 'Weeks 1–2');
  assert.equal(blockForWeek(blocks, 2).label, 'Weeks 1–2');
  assert.equal(blockForWeek(blocks, 3).label, 'Weeks 3–4');
  assert.equal(blockForWeek(blocks, 99).label, 'Weeks 3–4', 'a week past the last block holds the last block');
  assert.equal(blockForWeek([], 1), null);
});

test('a definition with no blocks degrades to an empty week rather than throwing', () => {
  const s = structureFromDefinition({ ...singleBlock, blocks: [] });
  assert.deepEqual(s.days, []);
  assert.equal(s.weeks, 6);
  assert.ok(s.daysPerWeek >= 1, 'never zero — downstream divides by this');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CONDITIONING CROSSING — a catalog program's richer prescription must survive adoption
//
// `structureFromDefinition` is the ONLY path from a built-in program to a runnable one. It used to copy
// four fields and drop the rest, so a shipped program could describe a ladder, a finisher or a row erg
// and the athlete would receive plain sets of reps with no error anywhere. These assert the crossing
// against the real Iron & Engine definition, not a fixture — the fixture would pass forever while the
// shipped program silently lost its Engine.
// ─────────────────────────────────────────────────────────────────────────────

const ironAndEngine = JSON.parse(
  readFileSync(new URL('../../training/programs/iron-and-engine.json', import.meta.url), 'utf8'),
);

const adopted = structureFromDefinition(ironAndEngine);
/** Every exercise the athlete would actually receive, across every authored week. */
const allAdopted = [
  ...adopted.days,
  ...(adopted.weekPlans ?? []).flatMap((p) => p.days),
].flatMap((d) => [...d.warmup, ...d.main, ...d.cooldown]);

test('adoption carries the ladders across, per set', () => {
  const squat = allAdopted.find((e) => e.catalogKey === 'barbell-back-squat' && e.repScheme);
  assert.ok(squat, 'the squat ladder did not survive adoption');
  assert.deepEqual(squat.repScheme, [6, 6, 4, 4]);

  const pushUp = allAdopted.find((e) => e.catalogKey === 'push-up' && e.repScheme);
  assert.deepEqual(pushUp.repScheme, ['F', 'F'], "to-failure must cross as 'F', not as a number");
});

test('adoption carries timed work across as a duration, not as reps', () => {
  const sled = allAdopted.find((e) => e.catalogKey === 'sled-push');
  assert.equal(sled.durationSec, 30);
  assert.equal(sled.sets, 1, 'a circuit member is one bout — the block supplies the repetition');
});

test('adoption carries circuit membership, rounds and AMRAP caps', () => {
  const rounds = allAdopted.find((e) => e.groupId === 'w12a-engine');
  assert.equal(rounds.groupKind, 'circuit');
  assert.equal(rounds.groupName, 'Engine — Sled Ladder');
  assert.equal(rounds.groupRounds, 3);
  assert.equal(rounds.groupCapSec, null, 'a rounds block states an explicit null cap');

  const amrap = allAdopted.find((e) => e.groupId === 'w34a-engine');
  assert.equal(amrap.groupCapSec, 480);
  assert.equal(amrap.groupRounds, undefined, 'an AMRAP prescribes no round count');
});

test('adoption carries a cardio bout with its target intact', () => {
  const bouts = allAdopted.filter((e) => e.kind === 'cardio');
  assert.ok(bouts.length > 1, 'expected several cardio bouts across the program');

  for (const b of bouts) {
    assert.equal(b.catalogKey, `cardio:${b.activity}`, 'the key and the activity must agree');
    assert.ok(b.modality === 'indoor' || b.modality === 'outdoor');
    assert.ok(b.targetSec > 0, 'a bout that survived adoption still prescribes its duration');
    assert.equal(b.targetMi, null, 'null is a real statement — no target — and must not become 0');
    assert.equal(b.equip, undefined, 'a cardio key is not a row in exercises.json, so no equipment lookup');
  }

  // The steady pieces get LONGER block by block — asserted on the durations that actually crossed,
  // rather than on one hard-coded number that moves whenever the program is re-authored.
  const rowSecs = bouts.filter((b) => b.activity === 'row').map((b) => b.targetSec);
  assert.ok(rowSecs.length >= 3, 'day F rows in every block');
  assert.ok(Math.max(...rowSecs) > Math.min(...rowSecs), 'the steady row should not be the same length all six weeks');
});

test('a plain prescription still crosses as a plain prescription', () => {
  // The two Foundation programs set none of the new fields; adoption must not invent any.
  const s = structureFromDefinition(singleBlock);
  const squat = s.days[0].main[0];
  assert.deepEqual(Object.keys(squat).sort(), ['catalogKey', 'name', 'reps', 'sets']);
});

test('adoption carries percentage loading across (0111)', () => {
  // No shipped catalog program prescribes a percentage yet, so this guards the crossing BEFORE one does
  // — the same hole that swallowed ladders and circuits, closed while it is still theoretical.
  const s = structureFromDefinition({
    ...singleBlock,
    blocks: [
      block('Weeks 1–6', 1, 6, [
        workout('A', 'Peak', [
          { ...rx('Back Squat', 5, 5), percentOfMax: 75 },
          { ...rx('Front Squat', 5, 5), percentScheme: [65, 75, 80, 87, 92], percentOf: 'back-squat' },
        ]),
      ]),
    ],
  });
  const [squat, front] = s.days[0].main;
  assert.equal(squat.percentOfMax, 75);
  assert.deepEqual(front.percentScheme, [65, 75, 80, 87, 92]);
  assert.equal(front.percentOf, 'back-squat', 'a percentage pointed at another lift must keep pointing there');
});
