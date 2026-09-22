/**
 * medical-routing.test.mjs — action is fine, talking is not.
 *
 * This guard decides whether an athlete who mentions their body gets a swap or gets sent to a physio.
 * Both errors are real and they are not symmetric: refusing a swap costs a paying athlete a feature they
 * were sold, and routing a torn rotator cuff into the mild `shoulders` exclusion answers a serious
 * problem confidently and wrongly.
 *
 * So this file does not check that the regex compiles. It checks that the guard **separates two lists of
 * sentences an athlete would actually type**, in both directions, and that the one that must never leak
 * — acuity dressed up as a request — does not.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/medical-routing.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { medicalRoute, stopsForMedical } from '../medical-routing.ts';
import { isMedical } from '../chat-core.ts';

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE SENTENCES THAT MUST GET THROUGH
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Soreness plus a request to change something. Every one of these is a training instruction, and the
 * app already performs all of them for free through manual substitution. The first is the exact line
 * the pricing plan sells Coach AI with.
 */
const ACTION_REQUESTS = [
  'My shoulder hurts, swap tomorrow',
  'my shoulder hurts, swap tomorrow',
  'shoulder is sore, give me something else',
  'knees are cranky, nothing jumpy',
  'bad back, keep me off deadlifts',
  'my knees ache on squats, swap them out',
  "shoulder's bothering me, no overhead please",
  'lower back is tight, skip the deadlifts this week',
  'sore chest today, work something else',
  'no overhead stuff, my shoulder is grumpy',
  'knees hurt, can we avoid jumping',
  'my back is a bit achy, take out the hinges',
];

test('an action request with soreness gets through', () => {
  for (const s of ACTION_REQUESTS) {
    assert.equal(medicalRoute(s), 'clear', `should be clear: ${s}`);
  }
});

test('the sentence the product is sold with is not refused', () => {
  // The regression this whole module exists to prevent.
  assert.equal(medicalRoute('My shoulder hurts, swap tomorrow'), 'clear');
  assert.equal(stopsForMedical('My shoulder hurts, swap tomorrow'), false);
});

test('ordinary training answers are untouched', () => {
  for (const s of [
    '4 days', 'about 45 minutes', 'full gym', 'I want to get stronger',
    'run a half marathon in the spring', 'beginner', 'nothing to avoid',
    'dumbbells only', 'three days a week, 30 minutes',
  ]) {
    assert.equal(medicalRoute(s), 'clear', `should be clear: ${s}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE SENTENCES THAT MUST STOP
// ─────────────────────────────────────────────────────────────────────────────

/* Tissue damage, clinical contact, neurological symptoms. No substitution answers any of these. */
const ACUTE_SENTENCES = [
  'I tore my rotator cuff',
  'i think i tore something in my shoulder',
  'torn meniscus',
  'ruptured my achilles',
  'fractured my wrist last month',
  'I broke my ankle',
  'six weeks post-op on my knee',
  'had surgery on my shoulder in June',
  'sprained my ankle yesterday',
  'I strained my hamstring',
  'dislocated my shoulder',
  'my physio said to avoid pressing',
  'physical therapy for my back',
  'the doctor told me to rest',
  'my MRI showed something',
  'my foot goes numb when I run',
  'tingling down my arm',
  'pinched nerve in my neck',
  'shooting pain down my leg',
  'my knee is swollen',
  'herniated disc',
  'bulging disc in my lower back',
  'sciatica flaring up',
];

test('acuity stops', () => {
  for (const s of ACUTE_SENTENCES) {
    assert.equal(medicalRoute(s), 'acute', `should be acute: ${s}`);
  }
});

/* Asking about the body rather than asking for a change. */
const ADVICE_SENTENCES = [
  "my shoulder hurts, what's wrong with it?",
  'what is wrong with my knee',
  'why does my back hurt after squats',
  'should i see someone about my shoulder',
  'should i rest it',
  'is it serious',
  'is this normal',
  'do i need a brace',
  'how do i fix my shoulder',
  'how do i treat this',
  'what should i do about my knee',
  'will it heal on its own',
];

test('asking about the body stops', () => {
  for (const s of ADVICE_SENTENCES) {
    assert.equal(medicalRoute(s), 'advice', `should be advice: ${s}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ⚠ THE ONE THAT MUST NEVER LEAK
// ─────────────────────────────────────────────────────────────────────────────

/*
 * An injury with an action attached. The request must not launder the injury — `shoulders` has no way to
 * express "torn", so mapping this onto it applies a rule written for a cranky joint to a damaged one.
 * This is the failure the guard exists for, and the reason acuity is tested BEFORE the action shape.
 */
test('acuity wins even when the sentence asks for an action', () => {
  for (const s of [
    'I tore my rotator cuff, swap tomorrow',
    'torn meniscus, keep me off squats',
    'post-op shoulder, no overhead',
    'sprained ankle, swap the running',
    'my physio said no deadlifts, take them out',
    'herniated disc, give me something else',
  ]) {
    assert.equal(medicalRoute(s), 'acute', `must stop despite the request: ${s}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE RELATIONSHIP TO `isMedical()` — the point of the whole change
// ─────────────────────────────────────────────────────────────────────────────

test('this is strictly narrower than isMedical, and that gap is the feature', () => {
  // The precise property, rather than a threshold I guessed: EVERY action request the old gate would
  // have stopped is released by the new one. Not "most", and not a count — a count passes while the
  // one sentence the product is sold with is still refused.
  const blockedByOldGate = ACTION_REQUESTS.filter((s) => isMedical(s));
  assert.ok(blockedByOldGate.length > 0, 'fixture must contain sentences the old gate stops');

  for (const s of blockedByOldGate) {
    assert.equal(stopsForMedical(s), false, `old gate stopped this swap request, new gate must not: ${s}`);
  }
});

test('nothing acute is released — the narrowing never widens the hole', () => {
  // The safety direction. Anything the old gate stopped for a real injury must still stop.
  for (const s of ACUTE_SENTENCES) {
    if (isMedical(s)) {
      assert.equal(stopsForMedical(s), true, `old gate stopped it, new gate must too: ${s}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EDGES
// ─────────────────────────────────────────────────────────────────────────────

test('empty and junk input is clear, not a stop', () => {
  // A stop is a thing Holt says. Saying it to an empty string would be the coach answering nobody.
  assert.equal(medicalRoute(''), 'clear');
  assert.equal(medicalRoute('   '), 'clear');
  assert.equal(medicalRoute(undefined), 'clear');
  assert.equal(medicalRoute(null), 'clear');
});

test('word boundaries hold — a substring is not a match', () => {
  assert.equal(medicalRoute('my deadlift is strong'), 'clear');
  assert.equal(medicalRoute('training for a marathon'), 'clear');
  assert.equal(medicalRoute('I need more time under tension'), 'clear');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ⚠ GYM GOOD NEWS IS NOT AN INJURY
// ─────────────────────────────────────────────────────────────────────────────

/*
 * `broke`, `tearing`, `popped` and `snapped` are how people describe a great session. They are also how
 * people describe a bad one. The body part is the entire difference, and getting this wrong stops an
 * athlete for celebrating a PR — a false positive with zero safety value, which is the kind that teaches
 * people the coach is broken and to stop talking to it.
 */
test('celebrating a PR is not an injury', () => {
  for (const s of [
    'I broke my PR on squats',
    'broke my deadlift record today',
    'tearing through this program',
    'I tear through these sessions',
    'popped a new best on bench',
    'snapped off a fast mile',
    'blew out my last set',
  ]) {
    assert.equal(medicalRoute(s), 'clear', `gym good news, not an injury: ${s}`);
  }
});

test('the same words WITH a body part do stop', () => {
  for (const s of [
    'I broke my ankle',
    'broke my wrist last week',
    'felt something tearing in my shoulder',
    'popped my hamstring',
    'snapped my achilles',
    'blew out my knee',
  ]) {
    assert.equal(medicalRoute(s), 'acute', `damage plus anatomy must stop: ${s}`);
  }
});

test('case does not matter', () => {
  assert.equal(medicalRoute('I TORE MY ACL'), 'acute');
  assert.equal(medicalRoute('My Shoulder Hurts, Swap Tomorrow'), 'clear');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ⛔ CRISIS, EMERGENCY, DISORDERED EATING — stress test 2026-09-21
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ self-harm routes to crisis, never to "I didn\'t catch that"', () => {
  for (const s of [
    'i want to hurt myself',
    "honestly i've been thinking about ending it",
    "if i dont lose this weight i'd rather not exist",
    'kms if i miss my PR lol',
    'i punish myself when i skip the gym like i hit myself',
    'sometimes I think about suicide',
  ]) assert.equal(medicalRoute(s), 'crisis', s);
});

test('⛔ an emergency happening now routes to urgent, not to a physio referral', () => {
  for (const s of [
    'chest pain + sweating + nausea during workout rn',
    'I blacked out for a second on a heavy deadlift',
    'I keep fainting when I stand up after squats',
    "I think I'm having an asthma attack",
    'my heart is racing and it won\'t settle',
    'my pee is cola colored after that workout',
    'Me duele el pecho durante el ejercicio',
  ]) assert.equal(medicalRoute(s), 'urgent', s);
});

test('⛔ disordered eating stated as a behaviour routes to care; recovery talk does not', () => {
  for (const s of ['I throw up after meals to stay lean', 'eating 500 calories a day and training twice', 'I purge after big meals'])
    assert.equal(medicalRoute(s), 'care', s);
  assert.notEqual(medicalRoute("I'm in recovery from bulimia, keep calorie talk out of my program"), 'care');
});

test('the words that stopped harmless lines no longer do', () => {
  for (const s of [
    'I tore my gym shorts on a squat. Anyway, legs today?',
    'strained relations w my gym buddy lol, need a solo program',
    'Fractured my schedule this week, can we compress to 3 days?',
    'Torn between PPL and upper/lower',
    'Should I take creatine?',
    'How long should I rest between sets?',
    'Is it bad to lift every day?',
    'do i need to eat breakfast',
    'ending my session early today',
  ]) assert.equal(medicalRoute(s), 'clear', s);
});

test('…and the same words with anatomy still stop', () => {
  for (const s of ['I tore my hamstring', 'strained my lat on pull-ups', 'torn calf', 'stress fracture in my foot'])
    assert.equal(medicalRoute(s), 'acute', s);
});

test('⛔ the emergencies the live run sent to the physio line now say "call"', () => {
  for (const s of [
    "I have numbness in my groin and I've lost bladder control since my back tweak.",
    "my calf is swollen and hot and now i'm short of breath",
    'I got stung by a bee on my run and my throat is swelling.',
  ]) assert.equal(medicalRoute(s), 'urgent', s);
  assert.equal(medicalRoute('i scratch my arms till they bleed when i feel fat'), 'crisis');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ⛔ LEGAL CAUTION (PO 2026-09-22: "stay away from anything that would get us into legal trouble")
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ symptom questions stop — the live model reassured "cracking usually isn\'t a red flag"', () => {
  for (const s of [
    'real talk is it bad if my back cracks every time i deadlift',
    'my knees click when I squat',
    'Hey coach, why do my shoulders click when I bench?',
    'is it normal that my hip pops on lunges',
  ]) assert.equal(medicalRoute(s), 'advice', s);
});

test('⛔ conditions, medication, pregnancy and "cleared by my doctor" stop', () => {
  for (const s of [
    'I have epilepsy. Anything to avoid?',
    "I'm on SSRIs, will that affect my gains?",
    'is it safe to lift while pregnant',
    '👶 postpartum 4 months, want to get back at it',
    'I was born with a heart murmur. Any restrictions?',
    'I have type 1 diabetes and use a pump',
  ]) assert.notEqual(medicalRoute(s), 'clear', s);
});

test('⛔ an amount of caffeine or a supplement is care, never an answer', () => {
  for (const s of ['is 600mg of caffeine too much pre-workout?', 'how much creatine should I take', 'what creatine dosage is best'])
    assert.equal(medicalRoute(s), 'care', s);
});

test('plain training questions still get through', () => {
  for (const s of ['how much should I bench as a beginner?', 'how much protein do I need', 'is creatine worth it?', 'what is RPE?', 'how long should I rest between sets?'])
    assert.equal(medicalRoute(s), 'clear', s);
});

test('⛔ a form check is stopped by ANY mention of discomfort — broader than the chat, on purpose', async () => {
  const { mentionsDiscomfort } = await import('../medical-routing.ts');
  // Live 2026-09-22: this note reached the vision model and spent credits, because the narrow route is
  // correctly clear for it — in the chat it is a swap request.
  for (const s of ['my knee hurts on rep 3', 'left shoulder is sore', 'elbow aches at lockout', 'slight niggle in my back', 'tweaked it last week'])
    assert.equal(mentionsDiscomfort(s), true, s);
  assert.equal(medicalRoute('my knee hurts on rep 3'), 'clear', 'the chat still performs the swap');
  for (const s of ['Back Squat', 'bench press, film from the side', 'check my depth', 'deadlift'])
    assert.equal(mentionsDiscomfort(s), false, s);
});
