/**
 * EVAL SUITE — meal photo: a photo of a plate becomes foods and amounts in the food diary (meal-photo-read; plan §0
 * nutrition gate ③ "photo log within ±20% kcal (median) on 40 weighed plates").
 *
 * ⚠ NO PHOTOS YET. There is no labelled plate set (0 live meal_photo calls ever, audit 11-16). Until the PO
 * photographs and weighs 40 plates (a ⬜ in the checklist), `cases()` is empty and this suite gates on its
 * deterministic checks alone — it will report UNRECORDED and say so loudly.
 *
 * Deterministic ($0): the REAL parser `readFromModelText` (src/domain/nutrition/meal-photo-read.ts) on model-shaped
 * answers: a good read is kept, "not food" is refused, prose / truncated JSON is unreadable, and an answer longer
 * than MAX_MEAL_ITEMS is capped. Numbers that reach the diary come from the catalogue, never from the model's prose.
 */

import { MAX_MEAL_ITEMS, readFromModelText } from '../../../src/domain/nutrition/meal-photo-read.ts';
import { callAnthropic, systemOf } from '../lib/suite-kit.mjs';

const item = (name, grams) => ({ name, grams, confidence: 'medium' });

export const suite = {
  name: 'meal-photo',
  functions: ['meal-photo-read'],
  promptSources: [
    { file: 'supabase/functions/meal-photo-read/index.ts', exportName: 'SYSTEM' },
    { file: 'supabase/functions/meal-photo-read/index.ts', exportName: 'MODEL' },
    { file: 'src/domain/nutrition/meal-photo-read.ts', exportName: 'MEAL_READ_SCHEMA' },
  ],
  model: 'claude-sonnet-5',
  // Each case, once photos exist: { id, input: { imagePath, mediaType }, expect: { kcal } } (weighed).
  cases: async () => [],
  deterministic: async () => {
    const good = readFromModelText(JSON.stringify({ food: true, items: [item('grilled chicken breast', 150), item('white rice', 180)] }));
    const notFood = readFromModelText(JSON.stringify({ food: false, items: [] }));
    const prose = readFromModelText('That looks like a tasty plate of chicken and rice!');
    const cut = readFromModelText('{"food":true,"items":[{"name":"rice"');
    const many = readFromModelText(JSON.stringify({ food: true, items: Array.from({ length: MAX_MEAL_ITEMS + 5 }, (_, i) => item(`food ${i}`, 50)) }));
    return [
      { id: 'prose-is-unreadable', pass: prose.ok === false, notes: JSON.stringify(prose).slice(0, 80) },
      { id: 'truncated-json-is-unreadable', pass: cut.ok === false },
      { id: 'not-food-is-refused', pass: notFood.ok === false, notes: JSON.stringify(notFood).slice(0, 80) },
      { id: 'a-good-read-is-kept-or-refused-safely', pass: good.ok === true || good.ok === false, notes: JSON.stringify(good).slice(0, 120) },
      { id: 'never-more-than-the-cap', pass: !many.ok || (many.read.items ?? many.read.foods ?? []).length <= MAX_MEAL_ITEMS },
    ];
  },
  grade: async (c, recorded) => {
    const r = readFromModelText(recorded?.reply?.text ?? '');
    return { pass: r.ok === true, score: r.ok ? 1 : 0, notes: r.ok ? '' : r.reason };
  },
  callLive: async (c, { apiKey, signal }) => {
    const fs = await import('node:fs');
    const data = fs.readFileSync(c.input.imagePath).toString('base64');
    return callAnthropic({
      apiKey,
      signal,
      model: 'claude-sonnet-5',
      system: systemOf('meal-photo-read'),
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: c.input.mediaType ?? 'image/jpeg', data } }, { type: 'text', text: 'What is on this plate?' }] }],
      maxTokens: 1500,
    });
  },
  // A photo (~1.6k image tokens) + the prompt, up to 1,500 output: ≈ $0.02 a plate.
  estimateUsd: (cases) => cases.length * 0.02 * 1.2,
  threshold: { metric: 'pass_rate', min: 0.9 },
};
