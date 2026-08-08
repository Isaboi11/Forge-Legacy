/**
 * Builds `animation-review.html` — a one-clip-at-a-time verdict pass over every animation that is
 * actually IN the `exercise-media` bucket.
 *
 * WHY A GENERATOR AND NOT A CHECKED-IN PAGE: the bucket is the moving part. Clips land in batches
 * (`pending-clips.json` → process → upload), so the review queue has to be re-derived, not edited by
 * hand. Re-run this after every upload pass and the page picks up the new clips; verdicts already
 * recorded survive, because they are keyed by `variant/id` in the browser's localStorage, not by
 * position in the queue.
 *
 * WHY THE MANIFEST IS INLINED: the page is meant to be double-clicked. A `fetch('manifest.json')`
 * from a `file://` origin is blocked by CORS, so the list is written into the HTML as a literal and
 * the whole review tool stays one portable file.
 *
 *     node scripts/animation-processing/build_review.mjs
 *     → scripts/animation-processing/animation-review.html
 *
 *     node scripts/animation-processing/build_review.mjs --serve
 *     → the same file, served on http://localhost:4173
 *
 * `--serve` exists for ONE reason: `localStorage` on a `file://` page is a browser-by-browser
 * coin flip (Safari refuses outright), and a 714-clip pass that loses its verdicts on reload is
 * worthless. A real origin makes the saving reliable. The page says so itself if storage fails.
 *
 * Reads `.env` for `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`. The anon key is only used HERE, to list
 * the bucket; it is never written into the page — the clips are served from the bucket's PUBLIC
 * object URLs, so the generated file carries no credential and is safe to hand to anyone.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SOURCE = path.join(ROOT, 'src', 'domain', 'exercise-relationships', 'source');
const OUT = path.join(HERE, 'animation-review.html');

const BUCKET = 'exercise-media';

// ── env ──────────────────────────────────────────────────────────────────────────────────────────

function readEnv() {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('=') || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('.env is missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return { url, key };
}

// ── the bucket ───────────────────────────────────────────────────────────────────────────────────

/** Every object name under `prefix`, paged out. Storage caps a list at 1000 rows per call. */
async function listAll({ url, key }, prefix) {
  const names = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    const page = await res.json();
    if (!Array.isArray(page)) throw new Error(`listing ${prefix} failed: ${JSON.stringify(page)}`);
    // A folder placeholder comes back with a null id; only real objects count.
    names.push(...page.filter((o) => o.id).map((o) => o.name.replace(/\.webp$/i, '')));
    if (page.length < 1000) return names;
  }
}

// ── build ────────────────────────────────────────────────────────────────────────────────────────

const env = readEnv();
const exercises = JSON.parse(fs.readFileSync(path.join(SOURCE, 'exercises.json'), 'utf8'));
const equipment = new Map(
  JSON.parse(fs.readFileSync(path.join(SOURCE, 'equipment.json'), 'utf8')).map((e) => [e.id, e.name])
);
const byId = new Map(exercises.map((e) => [e.id, e]));

const male = new Set(await listAll(env, 'male/'));
const female = new Set(await listAll(env, 'female/'));

const orphans = [...new Set([...male, ...female])].filter((id) => !byId.has(id));
if (orphans.length) {
  // Not fatal — a clip whose id left the catalog is worth SEEING, not hiding. It reviews under its
  // own id with no metadata line.
  console.warn(`⚠ ${orphans.length} clip(s) have no catalog row: ${orphans.slice(0, 8).join(', ')}`);
}

/** One row per exercise, in the order an athlete would read them. `v` is which variants exist. */
const rows = [...new Set([...male, ...female])]
  .map((id) => {
    const ex = byId.get(id);
    const meta = ex ? [equipment.get(ex.equipmentId) || ex.equipmentId, ex.movementPattern].filter(Boolean).join(' · ') : '';
    return {
      i: id,
      n: ex?.name || id,
      m: meta,
      v: `${male.has(id) ? 'm' : ''}${female.has(id) ? 'f' : ''}`,
    };
  })
  .sort((a, b) => a.n.localeCompare(b.n));

const clipCount = rows.reduce((n, r) => n + r.v.length, 0);

const html = fs
  .readFileSync(path.join(HERE, 'review-template.html'), 'utf8')
  .replace('"__SUPABASE_URL__"', JSON.stringify(env.url))
  .replace('"__BUILT_AT__"', JSON.stringify(new Date().toISOString().slice(0, 10)))
  .replace('"__ROWS__"', JSON.stringify(rows));

fs.writeFileSync(OUT, html);

console.log(`male ${male.size} · female ${female.size} · ${rows.length} exercises · ${clipCount} clips to review`);
console.log(`→ ${path.relative(ROOT, OUT)}`);

if (process.argv.includes('--serve')) {
  const { createServer } = await import('node:http');
  const PORT = 4173;
  createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(OUT));
  }).listen(PORT, () => console.log(`\nreviewing at  http://localhost:${PORT}   (ctrl-c to stop)`));
}
