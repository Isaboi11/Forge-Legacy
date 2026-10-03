// Web-loop "one app" shot (2026-10-03, after the simulated visitor panel: runners and macro trackers never saw a run or
// a food screen) · Sun Sep 27 2026, 7:30 pm. Jordan's 7.5 mi run → his food day (2,061 of 2,800). Needs the seeded
// runs (stage 4) and `node capture/seed-food-sep27.mjs` (run once). No AI cost. Run `node capture/signin.mjs` first.
// Only the web loop shows it (cut 'web' in src/timeline.ts) — it plays in the squad shot's slot, so it is registered
// at the squad's film time and takes that shot's pose and light.
import { launch, newPhone, settle, record, register, quietHolt, BASE } from './lib.mjs';

const RUN = '/activity/f11de000-ea6d-4f1b-8cc4-7489e3167c9c';   // Run · 7.5 mi · 9:11 /mi · 1 hr 9 min
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-09-27T19:30:00-05:00' });
const until = async (fn, ms = 20000) => { for (let t = 0; t < ms; t += 100) { await settle(page, 100); if (await fn().catch(() => false)) return true; } return false; };
// Screen coordinates = viewport + 54 (the drawn status bar).
const box = async (loc) => { const b = await loc.boundingBox(); if (!b) throw new Error('no box'); return { x: Math.round(b.x), y: Math.round(b.y) + 54, w: Math.round(b.width), h: Math.round(b.height) }; };

await page.goto(BASE + RUN);
if (!(await until(() => page.getByText('AVG PACE').isVisible()))) throw new Error('run detail did not load');
await settle(page, 2000);
await quietHolt(page);
await settle(page, 800);
const tiles = await box(page.locator('div').filter({ hasText: 'DISTANCE' }).filter({ hasText: 'AVG PACE' }).filter({ hasText: 'DURATION' }).last());
console.log('tiles', tiles);

let ring = null;
const CUT = 3.6;                                         // recording second where the phone moves to Nutrition
const take = await record(page, 'oneapp', 5.0, [
  { at: CUT, run: async (p) => {                         // the cut: Nutrition loads between frames
      await p.goto(BASE + '/nutrition');
      if (!(await until(() => p.getByText(/of 2,800/).isVisible()))) throw new Error('nutrition day did not load');
      await settle(p, 1500);
      await quietHolt(p);
      const text = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
      if (!/SEP 27, 2026/.test(text) || !/2,061/.test(text)) throw new Error('not Sep 27 / 2,061:\n' + text.slice(0, 400));
      // The calorie ring and the three macro rings. They share no container of their own (the innermost block holding
      // both is the whole scroll content, 1,084 px), so the box is measured on the take: ring top to "of 85g".
      ring = { x: 18, y: 184, w: 366, h: 392 };
  } },
]);
console.log('ring', ring);

// The run screen holds 0.6 s longer (still frames) so its lift is read, then dissolves to Nutrition, held to the end.
take.pauses = [[3.4, 0.6], [4.9, 30]];
take.dissolves = [CUT];
take.lifts = [
  { at: 2.0, until: 3.55, ...tiles, r: 16, k: 1.55 },    // DISTANCE 7.5 mi · AVG PACE 9:11 /mi · DURATION 1 hr 9 min
  { at: 3.95, until: 30, ...ring, r: 24, k: 1.15 },      // 2,061 CALORIES of 2,800 · protein / carbs / fat
];
register('oneapp', take, 11.45);
console.log('frames', take.frames, 'lifts', JSON.stringify(take.lifts));
await browser.close();
