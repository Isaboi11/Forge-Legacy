/**
 * Write `Docs/Starter-Recipes-Review.md` — the 40 starter recipes removed from the app on 2026-09-24, for the PO
 * to look at. Numbers are the app's own (`deriveRecipe` over the USDA ingredient table), per serving.
 *
 *   node --experimental-strip-types scripts/starter-recipes-doc.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { STARTER_RECIPES } = await imp('src/domain/nutrition/__tests__/fixtures/starter-recipes.ts');
const { deriveRecipe } = await imp('src/domain/nutrition/meal-planner.ts');
const { INGREDIENTS } = await imp('src/domain/nutrition/recipes-data.ts');

const SLOT = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snack' };
const ALLERGEN = { peanuts: 'Peanuts', tree_nuts: 'Tree nuts', dairy: 'Dairy', eggs: 'Eggs', gluten: 'Gluten', soy: 'Soy', fish: 'Fish', shellfish: 'Shellfish', sesame: 'Sesame' };
const meals = (r) => [...new Set(r.mealTypes.map((m) => SLOT[m] ?? m))].join(' or ');
const allergens = (r) => (r.allergens.length ? r.allergens.map((a) => ALLERGEN[a] ?? a).join(' · ') : 'None');
const g = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

const rows = STARTER_RECIPES.map((src) => ({ src, r: deriveRecipe(src) }));
const bySlot = ['breakfast', 'lunch', 'dinner', 'snacks'].map((s) => [s, rows.filter((x) => x.src.slot === s)]);

let md = `# Starter recipes (removed 2026-09-24): review copy

The 40 recipes Forge shipped on 2026-09-23 and took out of the app on 2026-09-24, when you said to get rid of them
and replace them with your own. They still exist as test data (\`src/domain/nutrition/__tests__/fixtures/starter-recipes.ts\`);
nothing in the app uses them.

**Numbers are the app's own:** USDA values from the ingredient table, per ONE serving, rounded. Written by Forge,
not copied from any site.

Mark each one ✅ keep · ✏️ change · ❌ drop, and I'll put the keepers back in (as Forge recipes or in your book).

`;
md += `## At a glance\n\n| # | Recipe | Meal | Time | Per serving | Allergens | Keep? |\n|---|---|---|---|---|---|---|\n`;
for (const [, list] of bySlot) {
  for (const { src, r } of list) md += `| ${src.id} | ${src.name} | ${meals(r)} | ${src.minutes} min | ${r.kcal} cal · ${r.protein} P · ${r.carb} C · ${r.fat} F | ${allergens(r)} | ⬜ |\n`;
}
for (const [slot, list] of bySlot) {
  if (!list.length) continue;
  md += `\n---\n\n# ${SLOT[slot]} (${list.length})\n`;
  for (const { src, r } of list) {
    md += `\n## ${src.id} · ${src.name}\n\n`;
    md += `**${meals(r)}** · ${src.minutes} min${src.batch ? ' · batch cook' : ''}${src.leftoverDays ? ` · keeps ${src.leftoverDays} day${src.leftoverDays > 1 ? 's' : ''}` : ''} · **${r.kcal} cal · ${r.protein} g protein · ${r.carb} g carbs · ${r.fat} g fat** per serving · Allergens: ${allergens(r)}\n\n`;
    md += `**Ingredients** (grams as the app counts them)\n\n`;
    for (const [key, grams] of src.ingredients) md += `- ${INGREDIENTS[key]?.name ?? key}: ${g(grams)} g\n`;
    md += `\n**Steps**\n\n`;
    src.steps.forEach((s, i) => (md += `${i + 1}. **${s.title}.** ${s.text}${s.min ? ` (${s.min} min)` : ''}\n`));
  }
}
fs.writeFileSync(path.join(ROOT, 'Docs/Starter-Recipes-Review.md'), md);
console.log(`wrote Docs/Starter-Recipes-Review.md — ${rows.length} recipes`);
