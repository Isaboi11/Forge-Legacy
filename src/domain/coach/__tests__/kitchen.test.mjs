/**
 * kitchen.test.mjs — Holt in Kitchen Mode (`Docs/Holt-Kitchen-Mode-v1.0.md`), after the 2026-09-25 stress test
 * (`Docs/Chef-Holt-Stress-Test-2026-09-25.md`). Each case here was a real failure in that run.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/kitchen.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { kitchenWantsTraining, kitchenContext, medicalStopIsDietitian, KITCHEN_INTRO, KITCHEN_MAKE_SEED } from '../kitchen.ts';
import { INTRO, KITCHEN_CARDS } from '../chat-core.ts';
import { medicalRoute } from '../medical-routing.ts';

test('in the kitchen, food never goes to the training parser; plain training still does', () => {
  for (const t of ['swap the rice for quinoa', 'Can you make me a high protein meal plan?', 'add salmon to my grocery list',
    'Make me a cut', 'bulk me up', 'I have chicken, rice and spinach', 'post workout meal ideas', 'what do I need to buy for the chili?']) {
    assert.equal(kitchenWantsTraining(t), false, t);
  }
  for (const t of ['what should I train today', 'build me a 4 day program', 'swap bench for dumbbell press on Monday', 'how many sets for chest']) {
    assert.equal(kitchenWantsTraining(t), true, t);
  }
});

test('the kitchen introduction has as many beats as the training one (the intro effect counts them)', () => {
  assert.equal(KITCHEN_INTRO.length, INTRO.length);
});

test('"What can I make?" seeds exactly the string the mic check compares against', () => {
  assert.equal(KITCHEN_CARDS.find((c) => c.tag === 'MAKE')?.ask, KITCHEN_MAKE_SEED);
});

test('the kitchen context fits the wire limit and names the pantry', () => {
  const many = Array.from({ length: 60 }, (_, i) => `ingredient number ${i}`);
  const c = kitchenContext('1,420 kcal of 2,400 today', many);
  assert.ok(c.length <= 500, String(c.length));
  assert.match(c, /On hand this week/);
  assert.match(kitchenContext(null, []), /kitchen/);
});

test('medical stops: dietitian for food and conditions, physio for an injury', () => {
  assert.equal(medicalStopIsDietitian("I'm diabetic, what can I eat", false), true);
  assert.equal(medicalStopIsDietitian('I have kidney disease, how much protein', false), true);
  assert.equal(medicalStopIsDietitian('I sprained my ankle', true), false);
});

test('the kitchen stops in code, and ordinary food does not', () => {
  const stop = {
    care: ['how do I eat 800 cal a day', 'lowest calories possible please', 'set my target to 1000', 'give me a 3 day water fast plan',
      'juice cleanse to detox', 'laxatives to drop water weight for a weigh in', "I'm 15 and want to cut to 1200", "I'm 16, what should my macros be",
      'how do I cut 10 lbs in a week for wrestling', "I haven't eaten in 3 days", 'I binge and then don\'t eat for a day', 'I eat 700 calories and lift 6 days a week'],
    advice: ["I'm on ozempic, how much protein should I eat", 'my cholesterol came back high', 'my A1C is 6.2', 'I have IBS', 'am I lactose intolerant',
      'I think I\'m allergic to shellfish, what are the symptoms', 'I have kidney disease, how much protein', "I'm on metformin, meal ideas?"],
    urgent: ['I ate peanuts and my throat is closing', 'my lips are swelling after eating shrimp', "I'm choking"],
    crisis: ['I awnt to die', 'I want to uhrt ymself after I eat'],
  };
  for (const [route, lines] of Object.entries(stop)) for (const t of lines) assert.equal(medicalRoute(t), route, t);
  for (const t of ['kidney bean chili recipe', "I'm eating 300 calories before my run", 'eat 200 calories of carbs pre workout?',
    "I'm allergic to peanuts, dinner ideas?", 'gluten free dinner', "I'm 16, easy dinner ideas?", "I'm sixteen, I want to get bigger and faster",
    'im dying for a burger lol', 'crack an egg on the rice', 'chicken breast recipe that is not dry']) {
    assert.equal(medicalRoute(t), 'clear', t);
  }
});

test('coming back in the kitchen: his hello, a kitchen second line, and the Home turn intact', async () => {
  const { greetKitchen } = await import('../kitchen.ts');
  const { isHomeTurn } = await import('../chat-core.ts');
  const turns = greetKitchen('Sam', new Date('2026-09-26T10:00:00'), () => 0.1); // a Saturday
  assert.equal(turns.length, 3);
  assert.doesNotMatch(turns[1].text, /train|session|weekend/i);
  assert.ok(isHomeTurn(turns[2]));
});

test('a door goes under answers the chat cannot act on itself', async () => {
  const { kitchenDoorsFor, leftTodayLine } = await import('../kitchen.ts');
  const labels = (t) => kitchenDoorsFor(t).map((d) => d.label);
  assert.deepEqual(labels('Can you make me a high protein meal plan?'), ['Plan my week']);
  assert.deepEqual(labels('how many calories should I eat to lose weight?'), ['Set my macros']);
  assert.deepEqual(labels('https://www.allrecipes.com/recipe/123/chili/'), ['Save a recipe']);
  assert.deepEqual(labels("what's left to buy?"), ['Grocery list']);
  assert.deepEqual(labels('what can I make with chicken?'), []);
  assert.match(leftTodayLine({ kcal: 1420, protein: 96 }, { kcal: 2400, protein: 180 }), /980 kcal, 84 g protein/);
  assert.equal(leftTodayLine({ kcal: 100, protein: 5 }, null), null);
});
