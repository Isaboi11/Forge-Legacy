// Shot 3 · Tue Feb 10 2026, 7:45 am. Needs seed stage 2 (bench stuck at 225 since Jan 20) + Premium AI.
// ⚠ Spends ~2 real AI calls (~4¢).
// PO 10-01: "Simplify it and go slower… Hey Holt, I have this problem. You do? Let me help with that."
// So: Holt's greeting sits (dimmed) while the problem line is read → Jordan's one message → Holt's proposal, held
// long enough to read → "The rest of the block" → "Changed. That's your plan now." No program screen, no sheet.
// Naming the session ("Upper B") is what the athlete would say, and it means Holt doesn't have to ask which day
// (bench is in two sessions; programs aren't tied to weekdays).
// Every wait for the model happens BETWEEN recorded frames, so on screen the reply simply arrives (a cut).
import { launch, newPhone, settle, record, register, centre, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

const MSG = 'Bench is stuck at 225 for three weeks. Add close-grip bench to Upper B, 4 sets of 6.';
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-02-10T07:45:00-06:00' });
await page.goto(BASE + '/');
await settle(page, 6000);

// Off camera: undo any earlier Holt change (a previous take), through the program's own "Undo this change".
await page.getByText('Return to Strength', { exact: true }).first().click();
await settle(page, 4000);
const pills = () => page.getByRole('button', { name: 'Updated by Holt. See what changed' });
for (let round = 0; round < 6; round++) {
  if (!(await pills().count())) {                      // weeks start collapsed; open Week 6 if needed
    const wk = page.getByRole('button', { name: /^Week 6,/ });
    await wk.scrollIntoViewIfNeeded(); await wk.click(); await settle(page, 1200);
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
const box = async (loc, pad = 10) => { const b = await loc.boundingBox({ timeout: 5000 }); return b && { x: Math.round(b.x - pad), y: Math.round(b.y - pad + 54), w: Math.round(b.width + 2 * pad), h: Math.round(b.height + 2 * pad) }; };

const from = 5.6;                                   // film time the coach screen starts to show
const LIT = realAt(5.78) + 1.75 - realAt(from);     // seconds into the take when the phone lights up
const END = realAt(9.15) - realAt(from);
const beats = { type: LIT + 0.15, send: LIT + 0.75, proposal: LIT + 1.45, accept: LIT + 3.55, changed: LIT + 3.65 };
const spots = [];
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
      const r = await box(proposalText); if (r) spots.push({ at: beats.proposal + 0.2, until: beats.accept, ...r });
  } },
  { at: beats.accept, run: async (p) => { const el = p.getByText('The rest of the block', { exact: true }).first(); const c = await centre(el); await el.click(); return c; } },
  { at: beats.changed, run: async (p) => {
      await until(() => visible('Show me the program'));
      // Holt's confirmation varies ("Changed. That's your plan now." / "Done. Everything else stays where it was.").
      const ch = p.getByText(/^(Changed|Done)/).last();
      const r = await box(ch).catch(() => null); if (r) spots.push({ at: beats.changed + 0.3, until: END, ...r });
  } },
]);
take.spots = spots;
register('coach', take, from);
console.log('frames', take.frames, 'taps', take.taps.length, 'spots', JSON.stringify(spots));
await browser.close();
