// Shot 5 · Fri Oct 2 2026, 5:30 am. Needs seed stage 4 + 4b (the whole year, Legacy filled in). No AI cost.
// PO 10-02: "more awards on the legacy page… some accomplishments… more in depth — that's where the emotional hits".
// The phone scrolls Legacy slowly, top to bottom: Pinned Legacy → Accomplishments → Honors → the sealed chapters.
// What floats out is the app's own pixels, captured here at 4× so they stay sharp when lifted ~2×:
//   public/rec/story/        the Legacy take (a slow scroll, then held on the sealed chapters)
//   public/rec/story-lift/   chapter-1.png / chapter-2.png  each chapter screen's THIS CHAPTER card
//                            medal.png + medal-<key>.png     the honor sheet's struck medallion, per honor
//                            acc-<key>.png                   Legacy's accomplishment cards
import { mkdirSync } from 'node:fs';
import { launch, newPhone, settle, record, register, quietHolt, BASE } from './lib.mjs';
import { realAt } from '../src/timeline.ts';

// 5:30 am, not later: a fake clock past the real session's expiry makes the app refresh it and burns the saved sign-in.
const T = '2026-10-02T05:30:00-05:00';
const LIFT = 'public/rec/story-lift';
mkdirSync(LIFT, { recursive: true });
const MEDALS = [['', '1,000 Pound Club'], ['squat-315', 'Squat 315'], ['deadlift-405', 'Deadlift 405'], ['first-10k', 'First 10K Run'], ['miles-100', '100 Lifetime Running Miles']];
const ACCS = [['bench-235', 'Bench Press 235'], ['dl-475', 'Deadlift 475'], ['first-10k', 'First 10K — 6.2 mi']];
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

// After a restore the app owes Jordan two ceremonies (RANK ASCENDED, HONOR EARNED · 1,000 Pound Club). They are
// dismissed off camera with their own Continue — PO: no rank-up in the film.
async function openLegacy(page) {
  await page.goto(BASE + '/legacy');
  await settle(page, 7000);
  for (let i = 0; i < 4; i++) {
    const cont = page.getByRole('button', { name: 'Continue' }).first();
    if (!(await cont.isVisible().catch(() => false))) break;
    await cont.click(); await settle(page, 3500);
    console.log('dismissed a ceremony');
  }
  await quietHolt(page);
}

// ── stills at 4× ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const { page } = await newPhone(browser, { time: T, dsf: 4 });
  for (const [i, title] of [[1, 'Chapter I — The Return'], [2, 'Chapter II — Stronger']]) {
    await openLegacy(page);
    const t = page.getByText(title).last();
    for (let k = 0; k < 40 && !(await t.count()); k++) { await page.mouse.wheel(0, 400); await settle(page, 300); }
    if (!(await t.count())) { await page.screenshot({ path: 'capture/frames/look/s5-fail.png' }); throw new Error('no ' + title + ' at ' + page.url()); }
    await t.scrollIntoViewIfNeeded(); await settle(page, 600);
    await t.click(); await settle(page, 3500);
    const box = await cardBox(page, 'WORKOUTS');
    if (!box) throw new Error('no THIS CHAPTER card on chapter ' + i);
    await page.screenshot({ path: `${LIFT}/chapter-${i}.png`, clip: box });
    console.log('chapter', i, box);
  }
  // Accomplishment cards, from Legacy's Accomplishments strip (AccomplishmentCard, 184 × 200).
  await openLegacy(page);
  for (const [key, name] of ACCS) {
    // The name also sits on its Pinned Legacy tile (150 × 196): take the leaf whose card is the 184 × 200 one.
    const box = await page.evaluate((name) => {
      for (const el of [...document.querySelectorAll('div')].filter((d) => d.childElementCount === 0 && d.textContent.trim() === name)) {
        for (let n = el; n; n = n.parentElement) {
          const r = n.getBoundingClientRect();
          if (r.width >= 170 && r.width <= 200 && r.height >= 180 && r.height <= 230) { n.scrollIntoView({ block: 'center', inline: 'center' }); window.__flCard = n; return true; }
        }
      }
      return false;
    }, name);
    if (!box) throw new Error('no accomplishment card: ' + name);
    await settle(page, 900);
    const clip = await page.evaluate(() => { const r = window.__flCard.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await page.screenshot({ path: `${LIFT}/acc-${key}.png`, clip });
    console.log('accomplishment', name, clip);
  }
  // Honor medallions, each from its honor sheet. The medal art is 0.8× the medallion (HonorMedallion.tsx).
  for (const [key, name] of MEDALS) {
    await page.goto(BASE + '/honors');
    await settle(page, 5000);
    const h = page.getByText(name, { exact: true }).first();
    await h.scrollIntoViewIfNeeded(); await settle(page, 600);
    await h.click(); await settle(page, 3000);
    const art = await page.evaluate(() => {
      const c = [...document.querySelectorAll('svg')].map((s) => s.getBoundingClientRect())
        .filter((r) => r.width > 60 && r.width < 100 && Math.abs(r.x + r.width / 2 - 201) < 14 && r.y > 300 && r.y < 560);
      const r = c.pop();
      return r && { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    if (!art) { await page.screenshot({ path: 'capture/frames/look/s5-fail.png' }); throw new Error('no medallion for ' + name); }
    const d = art.width / 0.8, cx = art.x + art.width / 2, cy = art.y + art.height / 2;
    const clip = { x: cx - d / 2, y: cy - d / 2, width: d, height: d };
    await page.screenshot({ path: `${LIFT}/medal${key ? '-' + key : ''}.png`, clip });
    console.log('medal', name, clip);
  }
  await page.context().close();
}

// ── the take: Legacy scrolled slowly from Pinned Legacy to the sealed chapters ──────────────────────────────
const { page } = await newPhone(browser, { time: T });
await openLegacy(page);
// The page's scroller, and the two scroll positions: Pinned Legacy's heading under the header bar → Chapter II
// sealed card centred.
const pos = await page.evaluate(() => {
  const leaf = (t) => [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && d.textContent.trim().toLowerCase() === t.toLowerCase());
  const pin = leaf('Pinned Legacy');
  let sc = pin;
  while (sc && !(sc.scrollHeight > sc.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
  if (!sc) return null;
  window.__flScroller = sc;
  const top = (el) => el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
  const ch2 = [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && /^Chapter II — Stronger/.test(d.textContent.trim()));
  return { start: top(pin) - 24, end: top(ch2) - sc.clientHeight / 2 + 120 };
});
if (!pos) throw new Error('no Legacy scroller');
await page.evaluate((y) => { window.__flScroller.scrollTop = y; }, pos.start);
await settle(page, 1500);
console.log('scroll', pos);

// Edit: the take starts on screen at film 14.05 (the pull-back). The scroll runs while the phone is small and the
// pieces float out, and lands on the sealed chapters before the shot ends.
const from = 14.05;
const SECS = realAt(16.9) - realAt(from);
const S0 = 1.0, S1 = SECS - 1.2;
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const steps = [];
for (let f = Math.round(S0 * 60); f <= Math.round(S1 * 60); f++) {
  const y = pos.start + (pos.end - pos.start) * io((f / 60 - S0) / (S1 - S0));
  steps.push({ at: f / 60, run: async (p) => { await p.evaluate((y) => { window.__flScroller.scrollTop = y; }, y); } });
}
const take = await record(page, 'story', SECS, steps);
take.pauses = [[SECS - 0.05, 30]];
register('story', take, from);
console.log('story frames', take.frames, 'secs', SECS.toFixed(2));
await browser.close();
