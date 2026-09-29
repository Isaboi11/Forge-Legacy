import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildRecipeLinkReadDeploy, DEPLOY_COPY } from '../../../../scripts/build-recipe-link-read-deploy.mjs';
import { draftFromRead, matchFood } from '../recipe-import.ts';
import { linkResultFrom, pasteError, pasteKind, readFetchedPage, readPastedText } from '../recipe-paste.ts';
import { sanitizeRecipeRead } from '../recipe-photo-read.ts';
import { INGREDIENTS } from '../recipes-data.ts';
import { isoMinutes, leadingAmount, linkTarget, looksLikeLink, parseIngredientLine, recipeFromHtml, recipeFromText } from '../recipe-text-read.ts';

/*
 * "Paste a recipe" (PO 2026-09-27). The page fixtures are the REAL JSON-LD cut from three live recipe pages
 * on 2026-09-27 (`fixtures/recipe-pages/`) — nothing tidied — because a tidy fixture is how the last
 * real-world paste broke (`feedback_test_fixtures_must_be_real_input`).
 */
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const page = (name) => read(`src/domain/nutrition/__tests__/fixtures/recipe-pages/${name}.html`);

/* ── links ──────────────────────────────────────────────────────────────── */

test('a link is one web address; anything else is text', () => {
  assert.equal(looksLikeLink('https://www.bbcgoodfood.com/recipes/easy-pancakes'), true);
  assert.equal(looksLikeLink('  www.budgetbytes.com/one-pot-pasta/  '), true);
  assert.equal(looksLikeLink('Pancakes\n100g flour'), false);
  assert.equal(looksLikeLink('see https://x.com/a for it'), false);
  assert.equal(pasteKind('   '), 'empty');
  assert.equal(pasteKind('https://tasty.co/recipe/x'), 'link');
  assert.equal(pasteKind('2 eggs\n1 cup milk'), 'text');
});

test('⛔ the server only opens the public web: no IPs, no local names, no ports, no other schemes', () => {
  for (const bad of [
    'http://169.254.169.254/latest/meta-data',
    'http://127.0.0.1/',
    'http://10.0.0.5/recipe',
    'http://[::1]/',
    'http://localhost:3000/',
    'https://printer.local/',
    'https://db.internal/x',
    'https://example.com:8443/recipe',
    'https://user:pass@example.com/',
    'ftp://example.com/recipe',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://intranet/recipe',
  ]) assert.equal(linkTarget(bad).kind, 'bad_url', bad);
  assert.deepEqual(linkTarget('www.bbcgoodfood.com/recipes/easy-pancakes'), { kind: 'ok', url: 'https://www.bbcgoodfood.com/recipes/easy-pancakes' });
});

test('Instagram, TikTok, YouTube and Facebook are answered at once with "paste the caption"', () => {
  for (const [url, site] of [
    ['https://www.instagram.com/p/C0abc/', 'instagram.com'],
    ['https://vm.tiktok.com/ZM123/', 'tiktok.com'],
    ['https://youtu.be/abc', 'youtu.be'],
    ['https://m.facebook.com/watch', 'facebook.com'],
  ]) assert.deepEqual(linkTarget(url), { kind: 'social', site }, url);
  assert.match(pasteError({ kind: 'social', site: 'instagram.com' }), /^Instagram keeps recipes inside its app\. Copy the caption/);
});

/* ── one line ───────────────────────────────────────────────────────────── */

test('amounts: fractions, mixed numbers, unicode, ranges', () => {
  assert.equal(leadingAmount('1 1/2 tbsp soy').quantity, 1.5);
  assert.equal(leadingAmount('3/4 cup water').quantity, 0.75);
  assert.equal(leadingAmount('¼ cup parmesan').quantity, 0.25);
  assert.equal(leadingAmount('1½ cups rice').quantity, 1.5);
  assert.equal(leadingAmount('1 ½ cups rice').quantity, 1.5);
  assert.deepEqual(leadingAmount('5 - 6 stems choy sum'), { quantity: 5, rest: 'stems choy sum' });
  assert.deepEqual(leadingAmount('2 to 3 cloves garlic'), { quantity: 2, rest: 'cloves garlic' });
  assert.equal(leadingAmount('Salt to taste').quantity, null);
});

test('lines as real pages write them (recipetineats, delish, tasty, BBC)', () => {
  const cases = [
    ['1 1/2 tbsp light soy sauce (, or all purpose soy(Note 3))', 1.5, 'tbsp', 'light soy sauce'],
    ['1/2 tsp sesame oil ((optional))', 0.5, 'tsp', 'sesame oil'],
    ['3/4 cup (185 ml) water', 0.75, 'cup', 'water'],
    ['4 (6- to 8-oz.) boneless, skinless chicken breasts', 4, '', 'chicken breasts'],
    ['1 1/2 c. cherry tomatoes, halved', 1.5, 'c', 'cherry tomatoes'],
    ['1/2 oz. Parmesan, finely grated (about 1/4 cup)', 0.5, 'oz', 'Parmesan'],
    ['4 cloves garlic, minced', 4, 'cloves', 'garlic'],
    ['salt, to taste', null, '', 'salt'],
    ['2 large eggs', 2, 'large', 'eggs'],
    ['100g plain flour', 100, 'g', 'plain flour'],
    ['1 (14 oz) can chickpeas, drained', 14, 'oz', 'chickpeas'],
    ['2 fl oz lime juice', 2, 'fl oz', 'lime juice'],
  ];
  for (const [line, q, unit, food] of cases) {
    const r = parseIngredientLine(line);
    assert.deepEqual([r.quantity, r.unit, r.food], [q, unit, food], line);
    assert.equal(r.text, line.slice(0, 120), 'the line as written is kept');
  }
  assert.equal(parseIngredientLine('For the sauce:'), null, 'a sub-heading is not an ingredient');
});

test('ISO durations', () => {
  assert.equal(isoMinutes('PT1H30M'), 90);
  assert.equal(isoMinutes('P0DT0H20M'), 20);
  assert.equal(isoMinutes('PT45M'), 45);
  assert.equal(isoMinutes('nonsense'), null);
});

/* ── real pages ─────────────────────────────────────────────────────────── */

test('recipetineats: the @graph Recipe, 16 ingredients, steps, servings, time', () => {
  const r = recipeFromHtml(page('recipetineats-stir-fry'));
  assert.equal(r.name, 'Chop Suey - Chicken Stir Fry');
  assert.equal(r.servings, 2);
  assert.equal(r.minutes, 14);
  assert.equal(r.ingredients.length, 16);
  assert.ok(r.steps.length >= 5);
  assert.ok(r.steps.every((s) => !/<|&[a-z]+;/.test(s)), 'no tags or entities in a step');
});

test('delish: HowToSteps, boneless-skinless line, dinner', () => {
  const r = recipeFromHtml(page('delish-tuscan-chicken'));
  assert.equal(r.name, 'Creamy Tuscan Chicken');
  assert.equal(r.ingredients.length, 12);
  assert.equal(r.ingredients.find((x) => /chicken breasts/.test(x.text)).food, 'chicken breasts');
  assert.equal(r.mealType, 'dinner');
});

test('tasty: the "Recipe by <author>" byline is not part of the name', () => {
  assert.equal(recipeFromHtml(page('tasty-garlic-pasta')).name, 'One-Pot Garlic Parmesan Pasta');
});

test('⛔ NUT-D4: every page prints its own calories; none survives the read', () => {
  for (const name of ['recipetineats-stir-fry', 'delish-tuscan-chicken', 'tasty-garlic-pasta']) {
    assert.match(page(name), /"calories"/, `${name} fixture carries a nutrition block`);
    const r = readFetchedPage(page(name));
    assert.equal(r.kind, 'ok');
    const flat = JSON.stringify(r.read);
    assert.ok(!/calorie|kcal|protein|carbohydrate|fatContent|nutrition/i.test(flat), name);
  }
});

test('a page without a recipe is "no recipe" — including a bot page', () => {
  assert.equal(recipeFromHtml('<html><title>Simple Page</title><body>Checking your browser</body></html>'), null);
  assert.equal(readFetchedPage('<html><body>hi</body></html>').kind, 'no_recipe');
});

test('microdata pages (older plugins) still read', () => {
  const html = `<html><head><meta property="og:title" content="Grandma&#39;s Oats"></head><body>
    <li itemprop="recipeIngredient">1 cup rolled oats</li><li itemprop="recipeIngredient">2 cups milk</li>
    <div itemprop="recipeInstructions">Simmer the oats in the milk for 5 minutes.</div></body></html>`;
  const r = recipeFromHtml(html);
  assert.equal(r.name, "Grandma's Oats");
  assert.deepEqual(r.ingredients.map((x) => x.food), ['rolled oats', 'milk']);
  assert.equal(r.steps.length, 1);
});

/* ── pasted text ────────────────────────────────────────────────────────── */

const CAPTION = `High protein chicken burrito bowls 🔥 save this for meal prep!!

Serves 4 | Total time: 35 minutes

🛒 INGREDIENTS:
🔸 1.5 lb chicken breast
🔸 1 cup long-grain white rice (dry)
🔸 1 (15 oz) can black beans, drained
🔸 1 cup salsa
🔸 ½ cup plain greek yogurt
🔸 1 tsp cumin
🔸 salt & pepper to taste

👩‍🍳 INSTRUCTIONS:
1. Season the chicken with cumin, salt and pepper and cook 6-7 min per side.
2. Cook the rice and warm the beans.
3. Slice the chicken and build the bowls with salsa and yogurt.

#mealprep #highprotein`;

test('an Instagram-style caption: emoji bullets, headings, servings and time', () => {
  const r = recipeFromText(CAPTION);
  assert.equal(r.name, 'High protein chicken burrito bowls');
  assert.equal(r.servings, 4);
  assert.equal(r.minutes, 35);
  assert.equal(r.ingredients.length, 7);
  assert.deepEqual([r.ingredients[0].quantity, r.ingredients[0].unit, r.ingredients[0].food], [1.5, 'lb', 'chicken breast']);
  assert.deepEqual([r.ingredients[2].quantity, r.ingredients[2].unit, r.ingredients[2].food], [15, 'oz', 'black beans']);
  assert.equal(r.steps.length, 3);
  assert.match(r.steps[0], /^Season the chicken/);
  assert.ok(!r.steps.some((s) => s.startsWith('#')), 'hashtags are not a step');
});

test('a note with no headings: amount lines are ingredients, sentences are steps', () => {
  const r = recipeFromText('Overnight oats\n1/2 cup rolled oats\n1/2 cup milk\n1 tbsp chia seeds\nMix everything in a jar and leave it in the fridge overnight.');
  assert.equal(r.name, 'Overnight oats');
  assert.deepEqual(r.ingredients.map((x) => x.food), ['rolled oats', 'milk', 'chia seeds']);
  assert.equal(r.steps.length, 1);
});

test('text with no ingredient in it says so, in words', () => {
  assert.equal(readPastedText('This was so good, making it again next week!').kind, 'no_ingredients');
  assert.match(pasteError({ kind: 'no_ingredients' }), /one ingredient on each line/);
});

test('a paste becomes the same draft as a photo — through sanitize and draftFromRead', () => {
  const r = readPastedText(CAPTION);
  assert.equal(r.kind, 'ok');
  assert.equal(r.from, 'text');
  const d = draftFromRead(r.read);
  assert.equal(d.matched + d.unmatched.length, 7);
  assert.equal(d.form.yield, 4);
  assert.equal(d.form.confirmed, false, 'allergens start unconfirmed — never planned until a person confirms');
});

/* ── the server's answer ────────────────────────────────────────────────── */

test('recipe-link-read answers are sanitized; anything odd is "couldn\'t open it"', () => {
  const ok = linkResultFrom({ ok: true, read: { name: 'X', servings: 2, minutes: 10, mealType: null, ingredients: [{ text: '1 egg', quantity: 1, unit: '', food: 'egg' }], steps: [], calories: 900 } });
  assert.equal(ok.kind, 'ok');
  assert.ok(!('calories' in ok.read));
  assert.equal(linkResultFrom({ ok: false, reason: 'no_recipe' }).kind, 'no_recipe');
  assert.equal(linkResultFrom({ ok: false, reason: 'no_nutrition' }).kind, 'unreachable');
  assert.equal(linkResultFrom(null).kind, 'unreachable');
  assert.equal(linkResultFrom({ ok: true, read: { ingredients: [] } }).kind, 'no_recipe');
});

test('the picture is only offered as the way round to those who have it', () => {
  assert.match(pasteError({ kind: 'unreachable' }, true), /add a picture of it/);
  assert.doesNotMatch(pasteError({ kind: 'unreachable' }, false), /picture/);
});

/* ── matching the words round a food ────────────────────────────────────── */

test('"extra-virgin olive oil", "unsalted butter", "freshly ground black pepper" match their food', () => {
  const name = (food) => {
    const k = matchFood(food).key;
    return k ? INGREDIENTS[k].name : null;
  };
  assert.equal(name('extra-virgin olive oil'), 'Olive oil');
  assert.equal(name('unsalted butter'), 'Butter');
  assert.equal(name('Freshly ground black pepper'), 'Black pepper');
  assert.equal(name('kosher salt'), 'Salt');
  assert.equal(name('garlic cloves'), 'Garlic');
  // ⚠ Never a word that changes the numbers.
  assert.equal(name('light coconut milk'), null, '"light" is not dropped');
  assert.equal(name('Light butter'), 'Light butter', 'a whole-name match wins first');
});

/* ── the function and its paste copy ────────────────────────────────────── */

test('the dashboard paste copy is current, self-contained, and small enough to paste', () => {
  const committed = read(DEPLOY_COPY);
  assert.equal(committed, buildRecipeLinkReadDeploy(), 'run `node scripts/build-recipe-link-read-deploy.mjs`');
  assert.ok(!committed.includes("from '../../../src/"));
  assert.ok(committed.includes('function recipeFromHtml'));
  assert.ok(committed.length < 40_000);
});

test('the function: CORS first, the nutrition gate before any fetch, redirects re-checked by hand', () => {
  const SRC = read('supabase/functions/recipe-link-read/index.ts');
  const at = (s) => {
    const i = SRC.indexOf(s);
    assert.ok(i >= 0, s);
    return i;
  };
  assert.ok(at("req.method === 'OPTIONS'") < at('await req.json()'));
  // 0244: building a recipe is Premium — the planner gate, before any fetch.
  assert.ok(at(".rpc('has_nutrition_planner')") < at('await fetchPage(target.url)'));
  assert.match(SRC, /redirect: 'manual'/);
  assert.match(SRC, /const t = linkTarget\(new URL\(next, url\)\.toString\(\)\);/);
  assert.match(SRC, /signal: AbortSignal\.timeout\(FETCH_MS\)/);
  assert.ok(!/SERVICE_ROLE/.test(SRC), 'no service key');
});

test('the screen: "Paste a recipe" is live and a link goes through readRecipeLink', () => {
  const SCREEN = read('src/app/my-recipes.tsx');
  assert.match(SCREEN, /\{ id: 'paste', title: 'Paste a recipe', sub: '[^']*', soon: false \}/);
  assert.match(SCREEN, /kind === 'link' \? await readRecipeLink\(pasteText\) : readPastedText\(pasteText\)/);
  assert.match(SCREEN, /openDraft\(r\.read, r\.from\)/);
});
