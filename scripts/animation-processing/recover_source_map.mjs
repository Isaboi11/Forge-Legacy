/**
 * Rebuilds the catalog-id -> source-clip mapping that `final_mapping.json` used to hold, and writes
 * it to `source-map.json` — COMMITTED this time.
 *
 * WHY THIS EXISTS: `final_mapping.json` lived in a scratch directory, was never committed, and is
 * gone. Without it nothing can be re-processed: the bucket is keyed by catalog id, the raw library is
 * keyed by the vendor's filename, and the bridge between them was the lost file.
 *
 * HOW IT IS RECOVERED WITHOUT GUESSING: the upload was a rename, not a re-encode. Every object in the
 * bucket is a byte-identical copy of a local file under `Processed_small/<variant>/`, and those local
 * files still carry the SOURCE filename. So the mapping is recoverable exactly:
 *
 *     bucket male/cable-crossover.webp  ==bytes==  Processed_small/male/Cable-Standing-Crossover-_male__Chest.webp
 *     => cable-crossover (male) came from Cable-Standing-Crossover-(male)_Chest_.mp4
 *
 * Size is the cheap discriminator (the list API returns it, so no download); SHA-256 settles any
 * collision. A clip whose local twin is missing, or whose bytes differ, is reported as UNRESOLVED
 * rather than guessed at — a wrong source silently re-processes the wrong movement.
 *
 *   node scripts/animation-processing/recover_source_map.mjs [--verify-all]
 *
 * `--verify-all` hashes every object instead of only the size-collisions. Slow (downloads the bucket)
 * but proves the whole map rather than sampling it.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'source-map.json');
const BUCKET = 'exercise-media';

/** The Seagate moves between drive letters between sessions; find it rather than pinning one. */
function findLibrary() {
  const roots = ['F:', 'D:', 'E:', 'G:'].map((d) => path.join(d + '\\', 'Forge Legacy Animations'));
  const hit = roots.find((r) => fs.existsSync(path.join(r, 'Processed_small')));
  if (!hit) throw new Error(`Seagate not mounted — looked for "Forge Legacy Animations" on ${roots.join(', ')}`);
  return hit;
}

function readEnv() {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('=') || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { url: env.EXPO_PUBLIC_SUPABASE_URL, key: env.EXPO_PUBLIC_SUPABASE_ANON_KEY };
}

async function listAll({ url, key }, prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    const page = await res.json();
    if (!Array.isArray(page)) throw new Error(`listing ${prefix} failed: ${JSON.stringify(page)}`);
    out.push(...page.filter((o) => o.id).map((o) => ({ name: o.name, size: o.metadata?.size })));
    if (page.length < 1000) return out;
  }
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * `Processed_small` names are the source mp4 name with the shell-hostile characters flattened:
 * `(male)` became `_male_`, a trailing `_` may be dropped. Recover the real file by walking the raw
 * library once and matching on that same flattening — never by fuzzy similarity.
 */
function indexRawClips(lib) {
  const byFlat = new Map();
  for (const sex of ['MALE', 'FEMALE']) {
    const base = path.join(lib, 'MP4', sex);
    if (!fs.existsSync(base)) continue;
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.toLowerCase().endsWith('.mp4')) {
          const flat = e.name.replace(/\.mp4$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '').toLowerCase();
          if (!byFlat.has(flat)) byFlat.set(flat, []);
          byFlat.get(flat).push(p);
        }
      }
    };
    walk(base);
  }
  return byFlat;
}

const env = readEnv();
const LIB = findLibrary();
console.log(`library: ${LIB}`);

const raw = indexRawClips(LIB);
console.log(`raw library: ${[...raw.values()].reduce((n, v) => n + v.length, 0)} mp4s under ${raw.size} distinct names`);

const map = {};
const unresolved = [];
let verified = 0;

for (const variant of ['male', 'female']) {
  const objects = await listAll(env, `${variant}/`);
  const dir = path.join(LIB, 'Processed_small', variant);
  const locals = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.webp'))
    .map((f) => ({ file: f, full: path.join(dir, f), size: fs.statSync(path.join(dir, f)).size }));

  const bySize = new Map();
  for (const l of locals) {
    if (!bySize.has(l.size)) bySize.set(l.size, []);
    bySize.get(l.size).push(l);
  }

  for (const obj of objects) {
    const id = obj.name.replace(/\.webp$/i, '');
    const candidates = bySize.get(obj.size) || [];
    let picked = null;

    if (candidates.length === 1 && !process.argv.includes('--verify-all')) {
      picked = candidates[0];
    } else if (candidates.length) {
      // Size collision (or --verify-all): settle it on the bytes.
      const res = await fetch(`${env.url}/storage/v1/object/public/${BUCKET}/${variant}/${id}.webp`);
      const remote = sha(Buffer.from(await res.arrayBuffer()));
      picked = candidates.find((c) => sha(fs.readFileSync(c.full)) === remote) || null;
      if (picked) verified++;
    }

    if (!picked) {
      unresolved.push(`${variant}/${id}`);
      continue;
    }

    // Local processed name -> the raw mp4 it came from.
    const flat = picked.file.replace(/\.webp$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '').toLowerCase();
    const hits = raw.get(flat) || [];
    map[`${variant}/${id}`] = {
      id,
      variant,
      processed: picked.file,
      source: hits[0] ? path.relative(LIB, hits[0]).replace(/\\/g, '/') : null,
      source_candidates: hits.length > 1 ? hits.length : undefined,
      // An id-named processed file came from a later `process_pending.py` pass, whose source is
      // recorded in pending-clips.json instead — flag it rather than inventing a link.
      via_pending: /^[a-z0-9-]+$/.test(picked.file.replace(/\.webp$/i, '')) || undefined,
    };
  }
  console.log(`${variant}: ${objects.length} objects · ${objects.length - unresolved.length} matched so far`);
}

const noSource = Object.values(map).filter((m) => !m.source);
fs.writeFileSync(OUT, JSON.stringify({
  _comment: 'Recovered by recover_source_map.mjs — bucket objects are byte-identical to Processed_small/<variant>/<source-name>.webp, which carries the source clip name. Regenerate with that script; do not hand-edit.',
  _recovered_from: LIB,
  _counts: { mapped: Object.keys(map).length, unresolved: unresolved.length, no_source_file: noSource.length },
  map,
}, null, 2));

console.log(`\nmapped ${Object.keys(map).length} · hash-verified ${verified} · unresolved ${unresolved.length}`);
console.log(`no raw .mp4 found for ${noSource.length} (these came via pending-clips.json or the source was renamed)`);
if (unresolved.length) console.log(`UNRESOLVED: ${unresolved.slice(0, 20).join(', ')}${unresolved.length > 20 ? ' …' : ''}`);
console.log(`-> ${path.relative(ROOT, OUT)}`);
