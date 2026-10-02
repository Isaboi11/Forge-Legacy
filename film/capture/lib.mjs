// Shared capture kit for the hero film.
// The app runs on web at an iPhone-size viewport with Playwright's fake clock, so the app's "today" is whatever the
// shot needs and every frame is stepped by hand (exactly 60 fps, no dropped frames, re-shootable).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';

export const BASE = process.env.FILM_BASE_URL ?? 'https://forgelegacy.expo.app';
export const VIEW = { width: 402, height: 808 }; // the phone's screen below our drawn 54 px status bar
export const DSF = 2;
export const FPS = 60;
const AUTH = new URL('./.auth/jordan.json', import.meta.url);
const fsPath = (u) => u.pathname.replace(/^\/(\w:)/, '$1');

// The app's sans is the platform font (SF on an iPhone, Segoe UI on Windows). Inter stands in for SF.
const inter = readFileSync(new URL('../public/fonts/InterVariable.woff2', import.meta.url)).toString('base64');
const FONT_CSS = ['Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'Helvetica', 'Arial']
  .map((n) => `@font-face{font-family:'${n}';src:url(data:font/woff2;base64,${inter}) format('woff2');font-weight:100 900;font-style:normal}`)
  .join('');

// Device-local flags that keep first-run prompts out of frame (AsyncStorage = localStorage on web).
export const QUIET = {
  fl_theme_v1: 'forge',
  forge_tour_v1: 'completed',
  forge_home_tour_v1: 'completed',
  forge_unlock_announced_v1: '1',
  forge_guided_tips_enabled_v1: 'off',
  forge_coach_met_v1: '1',
  fl_holt_intro_closed_v1: '1',
  forge_swipe_hint_seen_v1: '1',
  forge_rest_timer_mode_v1: 'auto',
};

export async function launch() {
  return chromium.launch({ args: ['--font-render-hinting=none'] });
}

export async function newPhone(browser, { time, storage = {}, auth = true } = {}) {
  const ctx = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: DSF, isMobile: true, hasTouch: true,
    timezoneId: 'America/Chicago', locale: 'en-US', colorScheme: 'dark',
    storageState: auth && existsSync(AUTH) ? fsPath(AUTH) : undefined,
  });
  await ctx.addInitScript(([css, kv]) => {
    for (const [k, v] of Object.entries(kv)) { try { localStorage.setItem(k, v); } catch {} }
    const add = () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); };
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  }, [FONT_CSS, { ...QUIET, ...storage }]);
  const page = await ctx.newPage();
  if (time) await page.clock.install({ time: new Date(time) });
  return { ctx, page };
}

// Advance the fake clock while real network requests and fonts land.
export async function settle(page, ms = 3000) {
  for (let t = 0; t < ms; t += 100) { await page.clock.runFor(100); await page.waitForTimeout(40); }
}

export async function saveAuth(ctx) {
  mkdirSync(new URL('./.auth/', import.meta.url), { recursive: true });
  writeFileSync(AUTH, JSON.stringify(await ctx.storageState()));
}

// Centre of an element in screen coordinates (viewport px), for the film's touch dots.
export async function centre(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('not visible: ' + locator);
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
}

/**
 * Record a take: `seconds` of app time at 60 fps. `plan` is [{ at, run(page) → {x,y}|void }]: each step runs on the
 * first frame at or after `at` (seconds into the take); if it returns a point, that becomes a tap in the manifest.
 * Network waits inside a step happen in real time, but the app's clock only moves between frames.
 */
export async function record(page, shot, seconds, plan = [], { quality = 90 } = {}) {
  const dir = new URL(`../public/rec/${shot}/`, import.meta.url);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  const steps = [...plan].sort((a, b) => a.at - b.at);
  const taps = [];
  const n = Math.round(seconds * FPS);
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    while (steps.length && steps[0].at <= t) {
      const s = steps.shift();
      const p = await s.run(page);
      if (p && typeof p.x === 'number') taps.push({ at: +t.toFixed(3), x: p.x, y: p.y });
    }
    await page.screenshot({ path: fsPath(new URL(`f${String(f).padStart(5, '0')}.jpg`, dir)), type: 'jpeg', quality });
    await page.clock.runFor(1000 / FPS);
  }
  return { dir: `rec/${shot}`, frames: n, fps: FPS, taps };
}

// Merge a take into src/recordings.json. `from` = film time (0..20) at which frame 0 is on screen.
export function register(id, take, from) {
  const p = new URL('../src/recordings.json', import.meta.url);
  const all = JSON.parse(readFileSync(p, 'utf8'));
  all[id] = { ...take, from };
  writeFileSync(p, JSON.stringify(all, null, 2) + '\n');
}
