// Shot 3 · Tue Feb 10 2026, 7:45 am. Needs seed stage 2 via seed-demo-jordan-2-REDO.sql (bench stuck at 225 since
// Jan 20, "Return to Strength" active, no program Holt built) + Premium AI. Re-run 2-REDO before a second take.
// ⚠ Spends real AI: one coach-interpret + one coach-author call, ~4–6¢.
// PO 10-02: "hey I've stalled with my bench, build me a program to help me build it up" → Holt: "sounds good, this
// is…" → he builds the program → the built program is the zoom-in.
// On screen: Holt's greeting while the problem line is read → Jordan's one message → (cut) Holt's own words over the
// program he wrote, held to read → (cut) the started program's screen, its first session lifted off the phone (~2×).
// Inside the cuts, between recorded frames: Holt's questions (the active program, length, days, room, session length,
// limitations) answered with his own chips, "Start it now", and "Start it anyway" (it ends Return to Strength).
// The message ends with a period: a question goes to coach-ask, not a build (chat-core looksLikeQuestion).
import { appendFileSync, writeFileSync } from 'node:fs';
import { launch, newPhone, settle, record, register, centre, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

// "at the gym": Jordan's onboarding room is 'commercial_gym', which the chat's isRoom() doesn't read (full_gym/home/
// bodyweight) — left unsaid, take 1 came back built for an empty home gym (push-ups, no bench).
const MSG = 'My bench has been stuck at 225 for three weeks. Build me a new program at the gym to bring it up.';
// Holt's chips, answered in this order of preference whenever one is showing.
const ANSWERS = ['Full gym', 'Replace it', 'Get stronger', '8 weeks', '4 days', '60 minutes', 'Nothing — build it', 'Build it'];

const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-02-10T07:45:00-06:00' });
await page.goto(BASE + '/');
await settle(page, 6000);
await page.getByRole('button', { name: 'Open Coach Holt' }).click();
await settle(page, 2500); // a fresh browser opens a fresh conversation on Holt's greeting

const visible = (t) => page.getByText(t, { exact: true }).last().isVisible().catch(() => false);
async function until(test, ms = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await test(); if (v) return v; await page.clock.runFor(100); await page.waitForTimeout(150); }
  await page.screenshot({ path: 'capture/frames/look/holt-timeout.png' });
  console.log('--- screen text at timeout ---\n' + (await page.evaluate(() => document.body.innerText)).slice(-1200));
  throw new Error('timed out');
}
const startBtn = page.getByRole('button', { name: 'Start it now' }).last();

const from = 5.6;                                   // film time the coach screen starts to show
const LIT = realAt(5.78) + 1.75 - realAt(from);     // seconds into the take when the phone lights up
const END = realAt(9.15) - realAt(from);
const beats = { type: LIT + 0.15, send: LIT + 0.75, built: LIT + 1.45, program: LIT + 4.25 };
const log = [];
writeFileSync('capture/frames/look/holt-log.txt', 'MSG: ' + MSG + '\n');
const take = await record(page, 'coach', END, [
  { at: beats.type, run: async (p) => { await p.getByRole('textbox', { name: 'Message Holt' }).fill(MSG); } },
  { at: beats.send, run: async (p) => { const s = p.getByLabel('Send', { exact: true }); const c = await centre(s); await s.click(); return c; } },
  { at: beats.built, run: async (p) => {
      // The cut: Holt's questions, answered with his own chips, until the program he wrote is on screen.
      const answered = new Set();
      await until(async () => {
        if (await startBtn.isVisible().catch(() => false)) return true;
        for (const a of ANSWERS) {
          if (answered.has(a) && a !== 'Build it') continue;
          const chip = p.getByText(a, { exact: true }).last();
          if (await chip.isVisible().catch(() => false)) {
            const said = (await p.evaluate(() => document.body.innerText)).slice(-500).replace(/\s+/g, ' ');
            await chip.click().catch(() => {}); answered.add(a); log.push(a);
            appendFileSync('capture/frames/look/holt-log.txt', `\n--- Holt, then I tapped "${a}":\n${said}\n`);
            await settle(p, 600); break;
          }
        }
        return false;
      }, 150000);
      await settle(p, 1500);
      // Holt's words above the top of his program card, so the reply and the program's name read together.
      const banner = p.getByText(/DRAFT/).last();
      await banner.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await settle(p, 800);
      await p.screenshot({ path: 'capture/frames/look/holt-built.png' });
      console.log('answered:', log.join(' → '));
      console.log('--- chat ---\n' + (await p.evaluate(() => document.body.innerText)).slice(-1600));
  } },
  { at: beats.program, run: async (p) => {
      // The cut: Start it now → Start it anyway → the program's own screen, Week 1's first session open.
      await startBtn.click();
      await settle(p, 1200);
      const anyway = p.getByText('Start it anyway', { exact: true }).last();
      if (await anyway.isVisible().catch(() => false)) { await anyway.click(); log.push('Start it anyway'); }
      await until(() => p.url().includes('/program/'));
      await settle(p, 4000);
      await p.screenshot({ path: 'capture/frames/look/holt-program-top.png' });
      // Week 1 open, its first session open (its exercises and sets), Week 1 near the top of the screen.
      const wk1 = p.getByRole('button', { name: /^Week 1,/ });
      const planned = p.getByText(/\d+ planned/).first();
      if (!(await planned.isVisible().catch(() => false))) { await wk1.scrollIntoViewIfNeeded(); await wk1.click(); await settle(p, 1500); }
      await planned.scrollIntoViewIfNeeded(); await planned.click(); await settle(p, 1500);
      await wk1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await settle(p, 600);
      const b = await wk1.boundingBox();
      if (b && b.y < 70) { await p.mouse.move(200, 400); await p.mouse.wheel(0, b.y - 90); await settle(p, 1000); }
      await p.screenshot({ path: 'capture/frames/look/holt-program.png' });
      console.log('--- program ---\n' + (await p.evaluate(() => document.body.innerText)).slice(0, 1500));
  } },
]);
// The lift: Week 1's first session and its exercises (measured on holt-program.png, take 2 of 10-02: "Bench Focus",
// Barbell Close-Grip Bench Press 5 × 4-6 … Dumbbell Lateral Raise). Re-measure if a new take lays out differently.
// Held still a beat longer to read: Jordan's sent message, then Holt's reply over his program.
take.pauses = [[+(beats.built - 0.03).toFixed(2), 0.9], [+(beats.program - 0.08).toFixed(2), 0.8]];
take.lifts = [{ at: +(beats.program + 0.6).toFixed(2), until: +END.toFixed(2), x: 22, y: 224, w: 358, h: 388, r: 10, k: 1.6 }];
register('coach', take, from);
console.log('frames', take.frames, 'taps', take.taps.length, '· program shown from', beats.program.toFixed(2), 's of', END.toFixed(2));
await browser.close();
