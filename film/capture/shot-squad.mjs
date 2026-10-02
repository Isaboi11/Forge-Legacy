// Squad shot (PO 10-02: add Squads) · the Squads tab, today at real time. Needs seed stage 5 pasted TODAY
// (all six Ironside members have a session since Chicago midnight). No AI cost.
// One still screen: Ironside's card reads "6 / 6 trained today", every member's bar lit; the card is lifted off the
// phone. The clock is frozen at real time (never later — a later clock burns the saved sign-in).
import { launch, newPhone, settle, record, register, quietHolt, BASE } from './lib.mjs';

const browser = await launch();
const { page } = await newPhone(browser, { time: new Date(Date.now() - 60_000).toISOString() });
await page.goto(BASE + '/squads');
for (let i = 0; i < 80; i++) { await settle(page, 100); if (await page.getByText('trained today').first().isVisible().catch(() => false)) break; }
await settle(page, 2500);
await quietHolt(page);
await settle(page, 1000);

const text = await page.locator('body').innerText();
if (!/6\s*\/\s*6\s*trained today/.test(text.replace(/\n/g, ' '))) throw new Error('the card does not read 6 / 6 trained today:\n' + text.slice(0, 600));

// The card: the innermost block holding both the squad name and the daily row. Screen coordinates = viewport + 54
// (the drawn status bar).
const card = page.locator('div').filter({ hasText: 'YOUR SQUAD' }).filter({ hasText: 'trained today' }).last();
const b = await card.boundingBox();
if (!b) throw new Error('no card');
console.log('card', b);

const take = await record(page, 'squad', 2.0);
take.pauses = [[1.5, 30]];                               // a still screen: hold it for the whole shot
take.lifts = [{ at: 0.2, until: 30, x: Math.round(b.x), y: Math.round(b.y) + 54, w: Math.round(b.width), h: Math.round(b.height), r: 20, k: 1.35 }];
register('squad', take, 11.45);
console.log('frames', take.frames, 'lift', JSON.stringify(take.lifts[0]));
await browser.close();
