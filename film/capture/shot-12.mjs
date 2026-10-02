// Shots 1–2 · Mon Jan 19 2026, 8:30 am. Needs seed stage 1 (or 1-REDO): stored squat best 215 × 5 on Jan 17.
// Take "home":  Home's Today's Workout card → tap Start Workout.                     film 1.75 → 2.55
// Take "tap"  (PO 10-01 pacing): the squat screen sits, full exercise card, while the problem line is read and struck
//              through; then set 1 (the card folds away), sets 2, 3, 4 → NEW PERSONAL RECORD 225 × 5 held long enough to
//              read → Not now → ▶ → the Rest ring, long enough to tell what it is.                film 2.45 → 5.70
// Rest is in MANUAL mode: armed after every set, started by ▶ — so quick taps aren't each covered by a rest overlay.
// The workout is never finished, so nothing is saved.
import { launch, newPhone, settle, record, register, centre, quietHolt, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

const T = '2026-01-19T08:30:00-06:00';
const browser = await launch();
const { page } = await newPhone(browser, { time: T, storage: { forge_rest_timer_mode_v1: 'manual' } });
await page.goto(BASE + '/');
await settle(page, 6000);
await page.getByRole('button', { name: 'Start workout' }).waitFor({ timeout: 20000 });
await quietHolt(page);
await settle(page, 1000);

// ── take: home ────────────────────────────────────────────────────────────────────────────────────────────
const homeFrom = 1.75;
const home = await record(page, 'home', realAt(2.55) - realAt(homeFrom) + 0.1, [
  { at: realAt(2.22) - realAt(homeFrom), run: async (p) => { const b = p.getByRole('button', { name: 'Start workout' }); const c = await centre(b); await b.click(); return c; } },
]);
register('home', home, homeFrom);

// ── between takes (not filmed): let the logger load fully, close Holt's "your squad got word" line ─────────────
await settle(page, 3000);
const close = page.getByRole('button', { name: /close|dismiss/i }).first();
for (let i = 0; i < 20 && !(await close.isVisible().catch(() => false)); i++) await settle(page, 200);
if (await close.isVisible().catch(() => false)) await close.click();
await settle(page, 2500);
await page.getByText('215×5', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => console.log('⚠ Best 215×5 not seen'));

// ── take: tap ─────────────────────────────────────────────────────────────────────────────────────────────
const tapFrom = 2.45;
const R0 = realAt(tapFrom);
const at = (real) => real - R0;
const press = (name) => async (p) => { const b = p.getByRole('button', { name, exact: true }); const c = await centre(b); await b.click(); return c; };
const LIT = realAt(2.85) + 1.75; // the phone lights up 1.75 s after the problem line appears (Film.tsx dimmer)
const beats = { set1: LIT + 0.6, set2: LIT + 1.4, set3: LIT + 1.9, set4: LIT + 2.4, notNow: LIT + 4.0, rest: LIT + 4.3 };
const end = realAt(5.7) - R0 + 0.1;
const tap = await record(page, 'tap', end, [
  { at: at(beats.set1), run: press('Complete set 1') },
  { at: at(beats.set2), run: press('Complete set 2') },
  { at: at(beats.set3), run: press('Complete set 3') },
  { at: at(beats.set4), run: press('Complete set 4') },  // 225 × 5 beats 215 × 5 → NEW PERSONAL RECORD
  { at: at(beats.notNow), run: press('Not now') },
  { at: at(beats.rest), run: press('Start rest now') },
]);
// PO 10-02: no outlines — the NEW PERSONAL RECORD card is lifted off the phone (~2×), in recording seconds.
tap.lifts = [
  { at: at(beats.set4) + 0.3, until: at(beats.notNow), x: 50, y: 286, w: 302, h: 344, r: 14, k: 1.9 },
];
// The rest countdown runs ~2× fast under the fake clock: play it at half speed so it reads as it really runs.
tap.slow = [+(at(beats.rest) + 0.05).toFixed(2), +end.toFixed(2), 2];
register('tap', tap, tapFrom);
console.log('home', home.frames, 'frames · tap', tap.frames, 'frames, taps', tap.taps.length, '· take seconds', end.toFixed(2));
await browser.close();
