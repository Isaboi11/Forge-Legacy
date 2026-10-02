// Look-around for the squad shot: Ironside's screen as Jordan, real time. No AI cost.
// ensure_weekly_recap is answered locally (null) so a look never writes the week's summary post.
import { launch, newPhone, settle, BASE } from './lib.mjs';
const SQUAD = 'f11de000-8216-4f18-8520-21f981211dca';
const shot = (page, name) => page.screenshot({ path: `capture/frames/look/sq-${name}.png` });
const browser = await launch();
const { page } = await newPhone(browser, { time: new Date(Date.now() - 60_000).toISOString() });
await page.route('**/rest/v1/rpc/ensure_weekly_recap', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
await page.goto(BASE + '/squads');
await settle(page, 6000);
await shot(page, '0-tab');
await page.goto(BASE + '/squad/' + SQUAD);
await settle(page, 6000);
await shot(page, '1-top');
for (let i = 2; i <= 4; i++) { await page.mouse.wheel(0, 650); await settle(page, 900); await shot(page, `${i}-scroll`); }
console.log(await page.locator('body').innerText().then((s) => s.slice(0, 2500)));
await browser.close();
