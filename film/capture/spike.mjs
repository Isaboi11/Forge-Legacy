// Spike: can a frozen, hand-stepped browser clock drive the real web app frame by frame?
// Usage: node capture/spike.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const url = process.argv[2] ?? 'https://forgelegacy.expo.app/';
const out = new URL('./frames/spike/', import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  timezoneId: 'America/Chicago', locale: 'en-US', colorScheme: 'dark',
});
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-01-19T08:30:00-06:00') });
await page.goto(url, { waitUntil: 'domcontentloaded' });
// Let the bundle boot on the fake clock: fonts and network are real, timers are not.
for (let i = 0; i < 40; i++) { await page.clock.runFor(100); await page.waitForTimeout(50); }

const hashes = [];
for (let f = 0; f < 30; f++) {
  await page.clock.runFor(1000 / 60);
  const buf = await page.screenshot({ path: new URL(`f${String(f).padStart(3, '0')}.png`, out).pathname.replace(/^\/(\w:)/, '$1') });
  hashes.push(createHash('md5').update(buf).digest('hex').slice(0, 8));
}
console.log('page date:', await page.evaluate(() => new Date().toString()));
console.log('distinct frames:', new Set(hashes).size, 'of', hashes.length);
console.log(hashes.join(' '));
await browser.close();
