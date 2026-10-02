// Shot 4 · Mon Mar 16 2026, 8:30 am. Needs seed stage 3 (last workout Sun Mar 8, nothing Mar 9–15). No AI cost.
// PO 10-01 simplified cut: the March calendar (Mar 9–15 empty) → Home's WELCOME BACK card. Both are still screens,
// so the take is short and the edit holds still frames; the move from one to the other is a cut.
import { launch, newPhone, settle, record, register, quietHolt, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-03-16T08:30:00-05:00' });
await page.goto(BASE + '/activity-history');
await settle(page, 6000);
await quietHolt(page);
await settle(page, 1000);

const take = await record(page, 'missed', 3.0, [
  { at: 1.0, run: async (p) => {               // the cut: Home loads between frames
      await p.goto(BASE + '/');
      for (let i = 0; i < 80; i++) { await settle(p, 100); if (await p.getByText(/good to see you/i).first().isVisible().catch(() => false)) break; }
      await settle(p, 1500);
      await quietHolt(p);
  } },
]);

// Edit (on-screen seconds from film 9.05): hold the calendar until the date counter has run through the missed
// week (film 10.6), then Home's Welcome back card, held to the end of the shot.
const from = 9.05;
const toHome = realAt(10.6) - realAt(from);
take.pauses = [[0.5, +(toHome - 1.0).toFixed(3)], [2.5, 30]];
take.spots = [
  { at: 0.0, until: 0.98, x: 16, y: 340, w: 370, h: 46 },     // Mar 9–15, empty
  { at: 1.6, until: 3.2, x: 12, y: 372, w: 378, h: 134 },     // WELCOME BACK · Good to see you, Jordan.
];
register('missed', take, from);
console.log('frames', take.frames, '· calendar until', toHome.toFixed(2), 's · shot', (realAt(14.25) - realAt(from)).toFixed(2), 's');
await browser.close();
