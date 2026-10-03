// Web-loop "one app" shot · seed Jordan's food for Sun Sep 27 2026 (the 7.5 mi run day) THROUGH THE APP, as a user
// would: manual daily targets, then nine foods from the app's own search (FatSecret / USDA rows), each checked by the
// calories on its ADD button. Run once, after `node capture/signin.mjs`. No AI cost.
// Undo: Nutrition → Sep 27 → delete the entries; Daily targets → history.
import { launch, newPhone, settle, BASE } from './lib.mjs';

const DAY = '2026-09-27';
const TARGETS = { 'Calories / day': '2800', 'Protein g': '180', 'Carbs g': '330', 'Fat g': '85' };
// [meal, search, exact result name, kcal per serving as listed, servings]
const FOODS = [
  ['breakfast', 'oatmeal', 'Oatmeal', 145, 2],
  ['breakfast', 'banana', 'Banana, raw', 122, 1],
  ['lunch', 'burrito bowl', 'Burrito Bowl', 543, 1],
  ['snacks', 'greek yogurt', 'Greek Yogurt', 226, 1],
  ['dinner', 'salmon', 'Salmon', 41, 8],
  ['dinner', 'white rice', 'White Rice', 204, 2],
  ['dinner', 'broccoli', 'Broccoli', 31, 1],
  ['dinner', 'sweet potato', 'Sweet Potato', 112, 1],
];

const browser = await launch();
const { page } = await newPhone(browser, { time: `${DAY}T19:30:00-05:00` });
const until = async (fn, ms = 20000) => { for (let t = 0; t < ms; t += 250) { await settle(page, 250); if (await fn().catch(() => false)) return true; } return false; };

// 1 · targets (Manual), effective from the frozen "today"
if (!process.argv.includes('--skip-targets')) {
  await page.goto(BASE + '/nutrition-targets');
  await until(() => page.getByText('Manual', { exact: true }).isVisible());
  await page.getByText('Manual', { exact: true }).click(); await settle(page, 800);
  for (const [label, v] of Object.entries(TARGETS)) await page.getByLabel(label).fill(v);
  await settle(page, 500);
  await page.getByText('USE THESE TARGETS').click();
  await settle(page, 3000);
  console.log('targets:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').match(/TARGET HISTORY.{0,160}/)?.[0]);
}

// 2 · foods
const FROM = Number(process.argv.find((a) => a.startsWith('--from='))?.slice(7) ?? 0); // resume after a partial run
for (const [meal, q, name, kcal, n] of FOODS.slice(FROM)) {
  await page.goto(`${BASE}/log-food?date=${DAY}`);
  await until(() => page.locator('input').first().isVisible());
  const Meal = meal[0].toUpperCase() + meal.slice(1);
  if (!(await page.getByRole('button', { name: new RegExp('Adding to ' + Meal) }).isVisible())) {
    await page.getByRole('button', { name: /Change meal/ }).click(); await settle(page, 800);
    await page.getByRole('button', { name: Meal, exact: true }).click(); await settle(page, 800);
  }
  const hit = page.getByText(name, { exact: true }).first();
  let found = false;
  for (let a = 0; a < 3 && !found; a++) {           // the search box can swallow a fill made while it mounts
    await page.locator('input').first().fill('');
    await page.locator('input').first().pressSequentially(q, { delay: 30 });
    found = await until(() => hit.isVisible(), 12000);
  }
  if (!found) { await page.screenshot({ path: 'out/seed-food-fail.png' }); throw new Error('no result: ' + name); }
  await hit.click();
  await until(() => Promise.resolve(page.url().includes('food-detail')));
  if (!page.url().includes('meal=' + meal)) throw new Error(`${name}: detail opened for ${page.url()}`);
  const add = page.getByRole('button', { name: /^add to (breakfast|lunch|dinner|snacks)/i }).first();
  if (!(await until(() => add.isVisible()))) {
    await page.screenshot({ path: 'out/seed-food-fail.png' });
    console.log(page.url(), await page.getByRole('button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label') || x.innerText)));
    throw new Error('no ADD button: ' + name);
  }
  // The label is "Add to Breakfast" in the DOM (CSS capitalises it); the calories are only in the button's text.
  const cal = async () => Number((await add.innerText()).replace(/,/g, '').match(/(\d+)\s*CAL/i)?.[1] ?? NaN);
  if ((await cal()) !== kcal) throw new Error(`${name}: listed ${kcal}, detail says ${await cal()}`);
  // The + step depends on the unit (half a cup, one ounce…), so step until the calories reach the planned amount.
  const want = kcal * n;
  for (let i = 0; i < 30 && (await cal()) < want - 2; i++) { await page.getByRole('button', { name: 'Increase amount' }).click(); await settle(page, 300); }
  const got = await cal();
  if (Math.abs(got - want) > 2) throw new Error(`${name}: wanted ${want} cal, button says ${got} (${await add.innerText()})`);
  await add.click();
  await until(() => Promise.resolve(!page.url().includes('food-detail')));
  await settle(page, 1200);
  console.log('logged', meal, name, got, 'cal');
}

await page.goto(BASE + '/nutrition');
await settle(page, 5000);
console.log((await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 700));
await browser.close();
