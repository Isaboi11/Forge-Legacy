// Look-around for shot 5 (after seed stage 4). No AI cost. Screens land in capture/frames/look/leg-*.png
//   1. Tue May 12 2026: Legacy deep-linked — the ceremonies queue (RANK ASCENDED, then HONOR EARNED · 1,000 Pound Club).
//   2. Today: Legacy after the ceremonies, top and the sealed chapter cards; the Honors screen's medal for the honor.
import { launch, newPhone, settle, BASE } from './lib.mjs';

const shot = (page, name) => page.screenshot({ path: `capture/frames/look/leg-${name}.png` });
const browser = await launch();
{
  const { page } = await newPhone(browser, { time: '2026-05-12T19:30:00-05:00' });
  await page.goto(BASE + '/legacy');
  await settle(page, 8000);
  await shot(page, '1-may12');
  for (let i = 0; i < 3; i++) {
    const cont = page.getByRole('button', { name: 'Continue' }).first();
    if (!(await cont.isVisible().catch(() => false))) break;
    await cont.click(); await settle(page, 3500);
    await shot(page, `2-may12-after-${i}`);
  }
  await page.context().close();
}
{
  const { page } = await newPhone(browser, { time: '2026-10-02T09:00:00-05:00' });
  await page.goto(BASE + '/legacy');
  await settle(page, 8000);
  for (let i = 0; i < 3; i++) {
    const cont = page.getByRole('button', { name: 'Continue' }).first();
    if (!(await cont.isVisible().catch(() => false))) break;
    await shot(page, `3-oct-ceremony-${i}`);
    await cont.click(); await settle(page, 3500);
  }
  await shot(page, '4-oct-top');
  const sealed = page.getByText(/Sealed/).last();
  if (await sealed.count()) { await sealed.scrollIntoViewIfNeeded(); await settle(page, 800); await shot(page, '5-oct-sealed'); }
  await page.goto(BASE + '/honors');
  await settle(page, 5000);
  const club = page.getByText('1,000 Pound Club').first();
  if (await club.count()) { await club.scrollIntoViewIfNeeded(); await settle(page, 800); }
  await shot(page, '6-honors');
}
await browser.close();
