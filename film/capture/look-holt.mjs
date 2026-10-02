// Look-around for shot 3 (Tue Feb 10 2026): open Holt, type the stuck-bench message, see the real reply.
// ⚠ Spends one real AI call (~2¢). Screens land in capture/frames/look/holt-*.png
import { launch, newPhone, settle, BASE } from './lib.mjs';
import { mkdirSync } from 'node:fs';

mkdirSync(new URL('./frames/look/', import.meta.url), { recursive: true });
const shot = (page, name) => page.screenshot({ path: `capture/frames/look/holt-${process.argv[3] ?? 'a'}-${name}.png` });
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-02-10T07:45:00-06:00' });
await page.goto(BASE + '/');
await settle(page, 6000);
await shot(page, '0-home');
await page.getByRole('button', { name: 'Open Coach Holt' }).click();
await settle(page, 2500);
await shot(page, '1-open');
const box = page.getByRole('textbox', { name: 'Message Holt' });
const MSG = process.argv[2] ?? 'Bench has been stuck at 225 for three weeks.';
const tag = process.argv[3] ?? 'a';
await box.fill(MSG);
await settle(page, 300);
await shot(page, '2-typed');
await page.getByLabel('Send', { exact: true }).click();
// The reply is a real network call; keep the fake clock moving while it lands.
for (let i = 0; i < 120; i++) {
  await settle(page, 500);
  if (i % 10 === 0) await shot(page, `3-wait-${String(i).padStart(3, '0')}`);
  if (await page.getByRole('button', { name: 'Do it' }).isVisible().catch(() => false)) break;
  if (await page.getByRole('button', { name: 'Just this week' }).isVisible().catch(() => false)) break;
}
await settle(page, 1500);
await shot(page, '4-reply');
console.log('Do it:', await page.getByRole('button', { name: 'Do it' }).isVisible().catch(() => false),
  '· Just this week:', await page.getByRole('button', { name: 'Just this week' }).isVisible().catch(() => false));
await browser.close();
