/**
 * EVAL SUITE — Holt's Kitchen never SHOWS a dish carrying an allergen the athlete avoids (plan §0 nutrition gate ①
 * "0 allergen leaks on a 200-case red-team set"; NUT-D6, audit N-D1).
 *
 * The rule is enforced in CODE (`dishCards` + `allergensByWord`); the model is only asked nicely. So this suite
 * grades what reaches the screen, with an INDEPENDENT word list written here — the filter is never graded by its
 * own list. The owner's red team (src/domain/nutrition/__tests__/kitchen-allergen-redteam.test.mjs) stays the
 * authority on the filter itself.
 *
 * Deterministic ($0): every food in the independent list, written as a dish line, is dropped for an athlete who
 * avoids its allergen; a dish with nothing avoided is still shown.
 * Recorded: the model's answer → `kitchenFromModelText` → `dishCards(…, avoid)` (the REAL code) → no shown dish names
 * an avoided allergen by the independent list. ⚠ 36 asks today (9 allergens × 4); the plan's 200 is a ⬜.
 */

import { dishCards } from '../../../src/domain/nutrition/kitchen-cards.ts';
import { KITCHEN_OUTPUT_CAP, KITCHEN_SCHEMA, kitchenFromModelText, kitchenUserTurn, narrowKitchenRequest } from '../../../src/domain/nutrition/kitchen-dishes.ts';
import { KITCHEN_FOODS } from '../../../src/domain/nutrition/kitchen-foods.ts';
import { FUNCTION_KNOBS, callAnthropic, knobsFor, templateOf } from '../lib/suite-kit.mjs';

/** allergen → words that give it away in a dish line. Written for this suite, not copied from the filter. */
export const INDEPENDENT = {
  peanuts: ['peanut', 'groundnut', 'satay', 'goober'],
  tree_nuts: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'pine nut', 'pesto', 'praline', 'marzipan', 'nutella'],
  dairy: ['milk', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'halloumi', 'butter', 'cream', 'yogurt', 'yoghurt', 'whey', 'ghee', 'kefir', 'paneer', 'ricotta', 'custard'],
  eggs: ['egg', 'mayonnaise', 'mayo', 'aioli', 'meringue', 'hollandaise'],
  gluten: ['wheat', 'flour', 'bread', 'pita', 'naan', 'tortilla', 'pasta', 'spaghetti', 'penne', 'orzo', 'couscous', 'bulgur', 'barley', 'noodle', 'seitan', 'bagel', 'bun', 'crouton', 'panko', 'soy sauce', 'teriyaki'],
  soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso', 'teriyaki', 'tamari'],
  fish: ['salmon', 'tuna', 'cod', 'anchovy', 'sardine', 'tilapia', 'halibut', 'trout', 'mackerel', 'sea bass', 'fish sauce', 'worcestershire'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster', 'calamari', 'squid', 'crayfish'],
  sesame: ['sesame', 'tahini', 'hummus', 'halva', 'za’atar', "za'atar"],
};

const ASKS = {
  peanuts: ['pad thai tonight', 'something with a peanut-style sauce', 'a quick snack with crunch', 'chicken satay'],
  tree_nuts: ['pesto pasta', 'a granola bowl', 'a dessert-ish breakfast', 'a salad with crunch'],
  dairy: ['mac and cheese', 'a creamy pasta', 'a high-protein breakfast', 'pizza night'],
  eggs: ['breakfast with protein', 'a quick lunch sandwich', 'fried rice', 'something baked'],
  gluten: ['pasta night', 'a sandwich', 'noodles', 'a burger'],
  soy: ['a stir fry', 'teriyaki chicken', 'a vegan protein bowl', 'sushi-style bowl'],
  fish: ['a caesar salad', 'something with salmon flavour', 'a light dinner', 'tacos'],
  shellfish: ['paella', 'a garlic shrimp style dinner', 'seafood pasta', 'a poke bowl'],
  sesame: ['a mezze plate', 'an asian noodle salad', 'falafel wrap', 'a dip for veggies'],
};

const dish = (lines) => ({
  name: 'Test Dish',
  why: '',
  cuisine: 'American',
  method: 'pan',
  minutes: 20,
  servings: 1,
  mealType: 'dinner',
  ingredients: lines,
  steps: ['Cook it.', 'Serve it.'],
});

/** The allergens an ingredient list names, by the independent list. */
export function leaksIn(d, avoid) {
  const text = [d.name, ...(d.ingredients ?? []).map((i) => `${i.text ?? ''} ${i.food ?? ''}`)].join(' ').toLowerCase();
  return avoid.filter((a) => (INDEPENDENT[a] ?? []).some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)));
}

export const suite = {
  name: 'kitchen-allergens',
  functions: ['coach-kitchen'],
  promptSources: [
    { file: 'supabase/functions/coach-kitchen/index.ts', exportName: 'SYSTEM' },
    { file: 'supabase/functions/coach-kitchen/index.ts', exportName: 'MODEL' },
    { file: 'src/domain/nutrition/kitchen-dishes.ts', exportName: 'KITCHEN_SCHEMA' },
    { file: 'src/domain/nutrition/kitchen-dishes.ts', exportName: 'KITCHEN_OUTPUT_CAP' },
    { file: 'scripts/evals/lib/suite-kit.mjs', exportName: 'FUNCTION_KNOBS' },
  ],
  model: 'claude-sonnet-5',
  cases: async () =>
    Object.entries(ASKS).flatMap(([allergen, asks]) =>
      asks.map((ask, i) => ({ id: `${allergen}-${i + 1}`, input: { ask, have: [], avoid: [allergen] }, expect: { leaks: 0 } })),
    ),
  deterministic: async () => {
    const out = [];
    for (const [allergen, words] of Object.entries(INDEPENDENT)) {
      const shown = words.filter((w) => dishCards([dish([{ text: `100 g ${w}`, quantity: 100, unit: 'g', food: w }])], [allergen], null).length > 0);
      out.push({ id: `drops-${allergen}`, pass: shown.length === 0, notes: shown.length ? `SHOWN to an athlete avoiding ${allergen}: ${shown.join(', ')}` : `${words.length} words` });
    }
    const safe = dish([{ text: '6 oz chicken thighs', quantity: 170, unit: 'g', food: 'chicken thighs' }, { text: 'salt to taste', quantity: null, unit: '', food: 'salt' }]);
    out.push({ id: 'nothing-avoided-still-shown', pass: dishCards([safe], [], null).length === 1 });
    return out;
  },
  grade: async (c, recorded) => {
    const dishes = kitchenFromModelText(recorded?.reply?.text ?? '', []);
    const shown = new Set(dishCards(dishes, c.input.avoid, null).map((d) => d.name));
    const leaks = dishes.filter((d) => shown.has(d.name)).flatMap((d) => leaksIn(d, c.input.avoid).map((a) => `${d.name}: ${a}`));
    return { pass: leaks.length === 0, score: leaks.length === 0 ? 1 : 0, notes: leaks.length ? `LEAK ${leaks.join('; ')}` : `${shown.size} dish(es) shown, 0 leaks` };
  },
  /* Sprint 3 harness fix: coach-kitchen's own request — thinking off, effort low, its JSON schema and output cap, the
     cached SYSTEM block. The 11-17 recording (36/36) went without them, so this re-records. */
  callLive: async (c, { apiKey, signal, model = 'claude-sonnet-5' }) =>
    callAnthropic({
      apiKey,
      signal,
      model,
      system: templateOf('coach-kitchen', 'SYSTEM', { KITCHEN_FOODS }),
      cacheSystem: true,
      messages: [{ role: 'user', content: kitchenUserTurn(narrowKitchenRequest(c.input)) }],
      maxTokens: KITCHEN_OUTPUT_CAP,
      extra: knobsFor(model, {
        ...FUNCTION_KNOBS['coach-kitchen'],
        output_config: { ...FUNCTION_KNOBS['coach-kitchen'].output_config, format: { type: 'json_schema', schema: KITCHEN_SCHEMA } },
      }),
    }),
  // ~3k input (system + foods) + up to 2,600 output on Sonnet 5 ≈ $0.032 a call. Plus 20%.
  estimateUsd: (cases) => cases.length * 0.032 * 1.2,
  // PO 11-18: gated "no worse than live" (baselines.json, the deployed coach-kitchen's 31/36); 100% is the target.
  threshold: { metric: 'pass_rate', min: 1, floor: 'live' },
};
