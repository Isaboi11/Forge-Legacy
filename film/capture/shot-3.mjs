// Shot 3 · Tue Feb 10 2026, 7:45 am. Needs seed stage 2 (or 2-REDO): bench stuck at 225 since Jan 20 + Premium AI.
// ⚠ Spends ~2 real AI calls (~4¢).
// PO 10-02: the shot ENDS ON THE ACTUAL WORKOUT. Holt's greeting sits while the problem line is read → Jordan's one
// message → Holt's proposal, held to read → "The rest of the block" → cut to the program: Week 6 · Upper B open,
// "Updated by Holt" and Barbell Close-Grip Bench Press 4 × 6 — that block is lifted off the phone (~2×).
// Naming the session ("Upper B") is what the athlete would say, and it means Holt doesn't have to ask which day
// (bench is in two sessions; programs aren't tied to weekdays).
// Every wait for the model, and the walk to the program, happens BETWEEN recorded frames, so on screen it's a cut.
import { launch, newPhone, settle, record, register, centre, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

const MSG = 'Bench is stuck at 225 for three weeks. Add close-grip bench to Upper B, 4 sets of 6.';
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-02-10T07:45:00-06:00' });
await page.goto(BASE + '/');
await settle(page, 6000);

// Off camera: undo any earlier Holt change (a previous take), through the program's own "Undo this change".
// (seed-demo-jordan-2-REDO.sql already resets the plan; this keeps a second take honest too.)
await page.getByText('Return to Strength', { exact: true }).first().click();
await settle(page, 4000);
const pills = () => page.getByRole('button', { name: 'Updated by Holt. See what changed' });
const week6 = () => page.getByRole('button', { name: /^Week 6,/ });
for (let round = 0; round < 6; round++) {
  if (!(await pills().count())) {                      // weeks start collapsed; open Week 6 if needed
    await week6().scrollIntoViewIfNeeded(); await week6().click(); await settle(page, 1200);
  }
  if (!(await pills().count())) break;
  const pill = pills().first();
  await pill.scrollIntoViewIfNeeded(); await pill.click(); await settle(page, 1200);
  await page.getByText(/undo this change/i).first().click(); await settle(page, 2500);
  console.log('undid an earlier Holt change');
  await page.goto(BASE + '/program/' + page.url().split('/program/')[1]); await settle(page, 4000);
}
console.log('Holt marks left on Week 6:', await pills().count());
await page.goto(BASE + '/');
await settle(page, 5000);
await page.getByRole('button', { name: 'Open Coach Holt' }).click();
await settle(page, 2500); // a fresh browser opens a fresh conversation on Holt's greeting

const visible = (t) => page.getByText(t, { exact: true }).first().isVisible().catch(() => false);
const proposalText = page.getByText(/^In Return to Strength:/).last();
async function until(test, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await test(); if (v) return v; await page.clock.runFor(100); await page.waitForTimeout(150); }
  await page.screenshot({ path: 'capture/frames/look/holt-timeout.png' });
  console.log('--- screen text at timeout ---\n' + (await page.evaluate(() => document.body.innerText)).slice(-900));
  throw new Error('timed out');
}

const from = 5.6;                                   // film time the coach screen starts to show
const LIT = realAt(5.78) + 1.75 - realAt(from);     // seconds into the take when the phone lights up
const END = realAt(9.15) - realAt(from);
const beats = { type: LIT + 0.15, send: LIT + 0.75, proposal: LIT + 1.45, accept: LIT + 3.45, program: LIT + 3.95 };
let workout = null;
const take = await record(page, 'coach', END, [
  { at: beats.type, run: async (p) => { await p.getByRole('textbox', { name: 'Message Holt' }).fill(MSG); } },
  { at: beats.send, run: async (p) => { const s = p.getByLabel('Send', { exact: true }); const c = await centre(s); await s.click(); return c; } },
  { at: beats.proposal, run: async (p) => {
      // If Holt still asks which session, answering it happens inside the cut.
      await until(async () => (await proposalText.isVisible().catch(() => false)) || (await visible('Week 6, Upper B')));
      if (!(await proposalText.isVisible().catch(() => false))) {
        console.log('⚠ Holt asked which session — answered off camera');
        await p.getByText('Week 6, Upper B', { exact: true }).first().click();
        await until(() => proposalText.isVisible().catch(() => false));
      }
      await until(() => visible('The rest of the block'));
      console.log('proposal:', await proposalText.innerText());
  } },
  { at: beats.accept, run: async (p) => { const el = p.getByText('The rest of the block', { exact: true }).first(); const c = await centre(el); await el.click(); return c; } },
  { at: beats.program, run: async (p) => {
      // The cut: Holt confirms, "Show me the program", Week 6, Upper B open — all between two frames.
      await until(() => visible('Show me the program'));
      await p.getByText('Show me the program', { exact: true }).first().click();
      await until(() => week6().count());
      await settle(p, 2500);
      if (!(await pills().first().isVisible().catch(() => false))) { await week6().scrollIntoViewIfNeeded(); await week6().click(); await settle(p, 1500); }
      const cg = p.getByText(/Close-Grip Bench Press/).first();
      if (!(await cg.isVisible().catch(() => false))) { await p.getByText('Upper B', { exact: true }).first().click(); await settle(p, 1500); }
      // Upper B's title near the top third, so its exercises sit clear of the CONTINUE TRAINING bar.
      const title = p.getByText('Upper B', { exact: true }).first();
      await title.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await settle(p, 600);
      const t0 = await title.boundingBox();
      if (t0 && t0.y > 230) { await p.mouse.move(200, 400); await p.mouse.wheel(0, t0.y - 200); await settle(p, 1200); }
      await p.screenshot({ path: 'capture/frames/look/holt-end.png' });
      const t = await title.boundingBox(), c = await cg.boundingBox();
      if (!t || !c) throw new Error('Upper B / Close-Grip not on screen');
      // The lift: Upper B's title and its "Updated by Holt" pill, down to the Close-Grip row and its "4 × 6".
      const y0 = t.y - 16, y1 = c.y + c.height + 44;
      workout = { x: 24, y: Math.round(y0 + 54), w: 354, h: Math.round(y1 - y0) };
      console.log('workout block', workout, '\n', (await p.evaluate(() => document.body.innerText.split('Upper B')[1]?.slice(0, 300))));
  } },
]);
take.lifts = workout ? [{ at: +(beats.program + 0.6).toFixed(2), until: +END.toFixed(2), ...workout, r: 14, k: 1.8 }] : [];
register('coach', take, from);
console.log('frames', take.frames, 'taps', take.taps.length, 'lifts', JSON.stringify(take.lifts));
await browser.close();
