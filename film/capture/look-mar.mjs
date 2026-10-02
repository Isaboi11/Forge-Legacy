// Look-around for shot 4 (Mon Mar 16 2026): Activity History (March) and Home's Welcome back card. No AI cost.
import { launch, newPhone, settle, quietHolt, BASE } from './lib.mjs';
const shot = (page, name) => page.screenshot({ path: `capture/frames/look/mar-${name}.png` });
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-03-16T08:30:00-05:00' });
await page.goto(BASE + '/activity-history');
await settle(page, 6000);
await quietHolt(page);
await shot(page, '1-calendar');
await page.goto(BASE + '/');
await settle(page, 6000);
await shot(page, '2-home');
console.log('welcome back visible:', await page.getByText(/good to see you/i).first().isVisible().catch(() => false));
await browser.close();
