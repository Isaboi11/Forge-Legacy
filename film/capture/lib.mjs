// Shared capture setup: an iPhone-sized page on a frozen clock, with the system sans swapped for Inter
// (the app's sans is the platform font; on Windows that is Segoe UI, on an iPhone it is SF).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const inter = readFileSync(new URL('../public/fonts/InterVariable.woff2', import.meta.url)).toString('base64');
const FONT_CSS = ['Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'Helvetica', 'Arial']
  .map(n => `@font-face{font-family:'${n}';src:url(data:font/woff2;base64,${inter}) format('woff2');font-weight:100 900;font-style:normal}`)
  .join('');

export async function openPhone({ time, url = 'https://forgelegacy.expo.app/', storage = {} } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    timezoneId: 'America/Chicago', locale: 'en-US', colorScheme: 'dark',
  });
  await ctx.addInitScript(([css, kv]) => {
    for (const [k, v] of Object.entries(kv)) { try { localStorage.setItem(k, v); } catch {} }
    const add = () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); };
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  }, [FONT_CSS, storage]);
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(time) });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { browser, ctx, page };
}

// Advance the app clock while giving real network/fonts time to land.
export async function settle(page, ms = 4000) {
  for (let t = 0; t < ms; t += 100) { await page.clock.runFor(100); await page.waitForTimeout(40); }
}
