// Shots 1–2 · Mon Jan 19 2026, 8:30 am. Needs seed stage 1 (stored squat best 215 × 5 on Jan 17).
// Take "home":  Home's Today's Workout card → tap Start Workout.                     film 1.75 → 2.55
// Take "tap":   sets 2, 3, 4 in three taps → NEW PERSONAL RECORD 225 × 5 → Not now
//               → ▶ start rest → the Rest ring counts.                                film 2.45 → 5.70
// Rest is in MANUAL mode for the take: armed after every set, started by ▶ — so the three quick taps aren't
// covered by a rest overlay each time. The workout is never finished, so nothing is saved.
import { launch, newPhone, settle, record, register, centre, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

const T = '2026-01-19T08:30:00-06:00';
const browser = await launch();
const { page } = await newPhone(browser, { time: T, storage: { forge_rest_timer_mode_v1: 'manual' } });
await page.goto(BASE + '/');
await settle(page, 6000);

// ── take: home ────────────────────────────────────────────────────────────────────────────────────────────
const homeFrom = 1.75;
const tapStartAt = realAt(2.22) - realAt(homeFrom);
const home = await record(page, 'home', realAt(2.55) - realAt(homeFrom) + 0.1, [
  { at: tapStartAt, run: async (p) => { const b = p.getByRole('button', { name: 'Start workout' }); const c = await centre(b); await b.click(); return c; } },
]);
register('home', home, homeFrom);

// ── between takes (not filmed): close Holt's "your squad got word" line, log set 1 ─────────────────────────
await settle(page, 3000);
const close = page.getByRole('button', { name: /close|dismiss/i }).first();
for (let i = 0; i < 20 && !(await close.isVisible().catch(() => false)); i++) await settle(page, 200);
if (await close.isVisible().catch(() => false)) await close.click();
await settle(page, 1500);
await page.getByRole('button', { name: 'Complete set 1' }).click();
await settle(page, 3000);

// ── take: tap ─────────────────────────────────────────────────────────────────────────────────────────────
const tapFrom = 2.45;
const R0 = realAt(tapFrom);
const at = (real) => real - R0;
const press = (name) => async (p) => { const b = p.getByRole('button', { name, exact: true }); const c = await centre(b); await b.click(); return c; };
const tap = await record(page, 'tap', realAt(5.7) - R0 + 0.1, [
  { at: at(5.75), run: press('Complete set 2') },
  { at: at(6.25), run: press('Complete set 3') },
  { at: at(6.75), run: press('Complete set 4') },  // 225 × 5 beats 215 × 5 → NEW PERSONAL RECORD
  { at: at(7.55), run: press('Not now') },
  { at: at(7.85), run: press('Start rest now') },
]);
register('tap', tap, tapFrom);
console.log('home', home.frames, 'frames, taps', home.taps.length, '· tap', tap.frames, 'frames, taps', tap.taps.length);
await browser.close();
