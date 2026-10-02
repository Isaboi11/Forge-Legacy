// Shot 3 · Tue Feb 10 2026, 7:45 am. Needs seed stage 2 (bench stuck at 225 since Jan 20) + Premium AI.
// ⚠ Spends ~3 real AI calls (~6¢). PO 10-01 chose the SPECIFIC ask: Holt's answer to a bare "I'm stuck" rebuilt
// Upper B with almost nothing changed, so Jordan says what he wants and Holt writes exactly that into the program.
//
// One continuous take, recorded frame by frame; every wait for the model happens BETWEEN frames, so on screen
// the reply simply arrives. events.json logs the frame of each beat so the edit can cut the dead air.
import { launch, newPhone, settle, record, register, centre, BASE, FPS } from './lib.mjs';
import { writeFileSync } from 'node:fs';

// No weekday in the ask: programs are sequential, so "Thursday" makes Holt explain that first (true, but a detour).
// The catalogue has no paused bench (it has pause squat / pause deadlift); close-grip bench is the classic fix.
const MSG = 'Bench is stuck at 225 for three weeks. Add close-grip bench, 4 sets of 6.';
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-02-10T07:45:00-06:00' });
await page.goto(BASE + '/');
await settle(page, 6000);

// ── off camera: undo any earlier Holt change on Week 6, so the program is as Jordan left it ───────────────
await page.getByText('Return to Strength', { exact: true }).first().click();
await settle(page, 4000);
const wk = page.getByRole('button', { name: /^Week 6,/ });
await wk.scrollIntoViewIfNeeded(); await wk.click(); await settle(page, 1200);
console.log('Holt pills on Week 6 before the take:', await page.getByRole('button', { name: 'Updated by Holt. See what changed' }).count());
for (let i = 0; i < 4; i++) {
  const pill = page.getByRole('button', { name: 'Updated by Holt. See what changed' }).first();
  if (!(await pill.isVisible().catch(() => false))) break;
  await pill.scrollIntoViewIfNeeded(); await pill.click(); await settle(page, 1200);
  await page.getByText('Undo this change', { exact: false }).first().click(); await settle(page, 2500);
  console.log('undid an earlier Holt change');
}
await page.goto(BASE + '/');
await settle(page, 5000);
await page.getByRole('button', { name: 'Open Coach Holt' }).click();
await settle(page, 2500);
// A fresh browser opens a fresh conversation on Holt's greeting (no "New chat" tap — that opens a menu).

// ── the take ─────────────────────────────────────────────────────────────────────────────────────────────
const events = {};
let frameNow = 0;
const visible = (t) => page.getByText(t, { exact: true }).first().isVisible().catch(() => false);
// Wait for the model with the app's clock ticking (its handlers need timers), but no frames recorded: the cut.
async function until(names, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { for (const n of names) if (await visible(n)) return n; await page.clock.runFor(100); await page.waitForTimeout(150); }
  await page.screenshot({ path: 'capture/frames/look/holt-timeout.png' });
  const txt = await page.evaluate(() => document.body.innerText);
  console.log('--- screen text at timeout ---\n' + txt.slice(-900));
  throw new Error('timed out waiting for ' + names.join(' | '));
}
const mark = (name) => (p) => { events[name] = frameNow; };
const tapText = (t) => async (p) => { const el = p.getByText(t, { exact: true }).first(); const c = await centre(el); await el.click(); return c; };

// record() runs each step on its frame; steps that wait block the frame loop, which is the cut.
const steps = [
  { at: 1.0, run: async (p) => { await p.getByRole('textbox', { name: 'Message Holt' }).fill(MSG); events.typed = Math.round(1.0 * FPS); } },
  { at: 1.6, run: async (p) => { const s = p.getByLabel('Send', { exact: true }); const c = await centre(s); await s.click(); events.sent = Math.round(1.6 * FPS); return c; } },
  { at: 2.6, run: async (p) => {
      const got = await until(['Week 6, Upper B', 'Do it', 'Just this week', 'The rest of the block']);
      events.reply1 = Math.round(2.6 * FPS); events.reply1Kind = got;
  } },
  { at: 4.0, run: async (p) => {
      if (events.reply1Kind === 'Week 6, Upper B') {
        const c = await tapText('Week 6, Upper B')(p);
        await until(['Do it', 'Just this week', 'The rest of the block']);
        events.proposal = Math.round(4.0 * FPS);
        return c;
      }
  } },
  { at: 5.6, run: async (p) => {
      const choice = (await visible('Do it')) ? 'Do it' : 'The rest of the block';
      const c = await tapText(choice)(p);
      await until(['Show me the program', 'Undo']);
      events.accepted = Math.round(5.6 * FPS); events.choice = choice;
      return c;
  } },
  { at: 7.0, run: async (p) => { const c = await tapText('Show me the program')(p); events.program = Math.round(7.0 * FPS); return c; } },
  { at: 8.4, run: async (p) => {
      const w = p.getByRole('button', { name: /^Week 6,/ });
      await w.scrollIntoViewIfNeeded(); const c = await centre(w); await w.click(); events.week = Math.round(8.4 * FPS); return c;
  } },
  { at: 9.4, run: async (p) => {
      const pill = p.getByRole('button', { name: 'Updated by Holt. See what changed' }).first();
      await pill.scrollIntoViewIfNeeded(); events.pill = Math.round(9.4 * FPS);
  } },
  { at: 10.4, run: async (p) => {
      const pill = p.getByRole('button', { name: 'Updated by Holt. See what changed' }).first();
      const c = await centre(pill); await pill.click(); events.sheet = Math.round(10.4 * FPS); return c;
  } },
];
const take = await record(page, 'coach', 13.0, steps);
writeFileSync(new URL('../public/rec/coach/events.json', import.meta.url), JSON.stringify(events, null, 2));
// Film time 5.6 is when the coach screen starts to show (Screens.tsx screenStack).
register('coach', take, 5.6);
console.log('events', events, 'frames', take.frames, 'taps', take.taps.length);
await browser.close();
