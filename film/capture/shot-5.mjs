// Shot 5 · Fri Oct 2 2026, 5:30 am. Needs seed stage 4 (the whole year). No AI cost.
// PO 10-02: the phone holds on Legacy's sealed chapters; the two chapters float out with their real numbers; the
// real 1,000 Pound Club medal lands. No rank-up. What floats out is the app's own pixels, captured here:
//   public/rec/story/        the Legacy take (sealed chapters, still)
//   public/rec/story-lift/   chapter-1.png / chapter-2.png (each chapter screen's THIS CHAPTER card) + medal.png
//                            (the honor sheet's struck medallion), at 4× so they stay sharp when lifted 2×.
import { mkdirSync } from 'node:fs';
import { launch, newPhone, settle, record, register, quietHolt, BASE } from './lib.mjs';

// 5:30 am, not later: a fake clock past the real session's expiry makes the app refresh it and burns the saved sign-in.
const T = '2026-10-02T05:30:00-05:00';
const LIFT = 'public/rec/story-lift';
mkdirSync(LIFT, { recursive: true });
const browser = await launch();

// The smallest bordered box around a label: the card it sits in.
async function cardBox(page, label) {
  return page.evaluate((label) => {
    // The stat label, not the tab bar's "Workouts": its parent reads "82Workouts".
    const el = [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0
      && d.textContent.trim().toLowerCase() === label.toLowerCase() && /^\d/.test(d.parentElement?.textContent ?? ''));
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n), r = n.getBoundingClientRect();
      if (parseFloat(cs.borderLeftWidth) > 0 && r.width > 300 && /Chapter/.test(n.textContent)) return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return null;
  }, label);
}

// ── stills at 4× ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const { page } = await newPhone(browser, { time: T, dsf: 4 });
  for (const [i, title] of [[1, 'Chapter I — The Return'], [2, 'Chapter II — Stronger']]) {
    await page.goto(BASE + '/legacy');
    await settle(page, 7000);
    await quietHolt(page);
    const t = page.getByText(title).first();
    for (let k = 0; k < 40 && !(await t.count()); k++) { await page.mouse.wheel(0, 400); await settle(page, 300); }
    if (!(await t.count())) { await page.screenshot({ path: 'capture/frames/look/s5-fail.png' }); throw new Error('no ' + title + ' at ' + page.url()); }
    await t.scrollIntoViewIfNeeded(); await settle(page, 600);
    await t.click(); await settle(page, 3500);
    const box = await cardBox(page, 'WORKOUTS');
    if (!box) throw new Error('no THIS CHAPTER card on chapter ' + i);
    await page.screenshot({ path: `${LIFT}/chapter-${i}.png`, clip: box });
    console.log('chapter', i, box);
  }
  await page.goto(BASE + '/honors');
  await settle(page, 5000);
  const club = page.getByText('1,000 Pound Club').first();
  await club.scrollIntoViewIfNeeded(); await settle(page, 600);
  await club.click(); await settle(page, 3000);
  // The medal art is 0.8× the medallion (HonorMedallion.tsx), centred in it.
  const art = await page.locator('svg:has(text)').filter({ hasText: '1000' }).last().boundingBox();
  const d = art.width / 0.8, cx = art.x + art.width / 2, cy = art.y + art.height / 2;
  const clip = { x: cx - d / 2, y: cy - d / 2, width: d, height: d };
  await page.screenshot({ path: `${LIFT}/medal.png`, clip });
  console.log('medal', clip);
  await page.context().close();
}

// ── the take: Legacy, scrolled to the sealed chapters, held still ────────────────────────────────────────────
const { page } = await newPhone(browser, { time: T });
await page.goto(BASE + '/legacy');
await settle(page, 7000);
await quietHolt(page);
// Chapter II's sealed card and Chapter I's row, centred in the screen.
await page.getByText('Chapter II — Stronger').first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
await settle(page, 1200);
const take = await record(page, 'story', 1.0);
take.pauses = [[0.5, 30]];
register('story', take, 14.05);
console.log('story frames', take.frames);
await browser.close();
