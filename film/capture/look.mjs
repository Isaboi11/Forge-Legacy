// Look-around: open the app as Jordan at a frozen date and screenshot each step, to plan a take.
// Usage: node capture/look.mjs 2026-01-19T08:30:00-06:00 home,start
import { launch, newPhone, settle, BASE } from './lib.mjs';
import { mkdirSync } from 'node:fs';

const [time = '2026-01-19T08:30:00-06:00', steps = 'home'] = process.argv.slice(2);
mkdirSync(new URL('./frames/look/', import.meta.url), { recursive: true });
const shot = (page, name) => page.screenshot({ path: `capture/frames/look/${name}.png` });

const browser = await launch();
const { page } = await newPhone(browser, { time });
const log = [];
page.on('console', (m) => { if (m.type() === 'error') log.push(m.text().slice(0, 200)); });
await page.goto(BASE + '/');
await settle(page, 6000);
await shot(page, '1-home');
for (const s of steps.split(',')) {
  if (s === 'start') {
    await page.getByRole('button', { name: 'Start workout' }).click();
    await settle(page, 4000);
    await shot(page, '2-logger');
  }
  if (s === 'set1') {
    await page.getByRole('button', { name: 'Complete set 1' }).click();
    await settle(page, 1500);
    await shot(page, '3-set1');
  }
}
console.log('url:', page.url());
console.log('errors:', log.slice(0, 8).join('\n'));
await browser.close();
