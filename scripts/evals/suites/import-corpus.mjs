/**
 * import-corpus.mjs — IM-2: the photo-import eval (AI Road to 10, Sprint 2), to the §1.4 suite interface.
 *
 * ══ WHAT IT GATES ══
 *
 * A real program photo, read by the app's REAL import path: `readImportPhoto` (src/data/import-photo-read.ts) —
 * the card reader, the multi-day-sheet test, the AI layout pass and its number check, the written reader, the
 * preview's weeks. Nothing is re-implemented here: `grade()` loads that module under the repo's own node harness
 * (src/data/__tests__/harness/hooks.mjs) and answers its two function calls with what the functions RETURNED when
 * the case was recorded. A change to any parser, the gate between the two readers, or the number check changes
 * the grade for free; a change to either function's prompt stales the recordings (`promptSources`).
 *
 * ══ "STRUCTURE-CORRECT", PRECISELY ══
 *
 * A case passes when the preview the athlete would see has, against the answer key in corpus/import/manifest.json:
 *   1. the same number of weeks, and of days in each week;
 *   2. in each day, the same MAIN rows in the same order — a warm-up or cool-down row the reader filed as such
 *      is not main work; a key row marked "? " may be present or absent; no extra rows;
 *   3. each row: the name matches (normalised words — "DB" = dumbbell, plural-insensitive, one contained in the
 *      other or half the words shared) and the prescription matches — the set count; the reps (a range's bottom,
 *      and its top whenever the reader kept one); a clock in seconds; a per-set ladder; to-failure; and the
 *      percentage(s) when the key states them.
 *   A rest-day card passes when nothing is imported. Two things are COUNTED but not failed, because the
 *   preview cannot hold them on every path today, and that is a parser gap rather than a misread: a rep range's
 *   top on the table path (`ParsedItem` has no field for it), and a carry's distance. They are listed in notes.
 *
 * ══ WHAT IT COSTS ══
 *
 * Offline (grade, deterministic): $0. `callLive` sends the image to the card reader's model with the function's
 * own SYSTEM prompt and settings, and — for a single workout, exactly as the app does — the transcript to the
 * layout pass's model. `estimateUsd` prices both from `src/domain/ai/model-rates.ts`. ⛔ Only `run.mjs --live
 * --budget` may call it; nothing in this file runs it.
 *
 * ══ THE CORPUS ══
 *
 * Binaries live OUTSIDE the repo (IMPORT_CORPUS_DIR, default C:/Users/isaia/import-corpus) — 171 MB, and the
 * Instagram screenshots show other people's faces and handles. The manifest pins each file by sha256.
 */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { knobsFor } from '../lib/suite-kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MANIFEST = path.join(ROOT, 'scripts/evals/corpus/import/manifest.json');
const CARD_FN = 'supabase/functions/workout-card-read/index.ts';
const TIDY_FN = 'supabase/functions/workout-tidy/index.ts';

const readManifest = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const corpusDir = (m = readManifest()) => process.env.IMPORT_CORPUS_DIR || m.defaultRoot;
const source = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE KEY FORMAT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One key row — "Back Squat | 5x5 @70%", "? KB Swings | 3x10", "Dips | F/F/F". Throws on a row it cannot read. */
export function parseSpec(line) {
  const optional = /^\?\s/.test(line);
  const [rawName, rawRx] = line.replace(/^\?\s+/, '').split('|').map((s) => s.trim());
  if (!rawName || rawRx == null) throw new Error(`key row "${line}" is not "<name> | <rx>"`);
  const pctM = /\s*@([\d.,\s]+)%\s*$/.exec(rawRx);
  const pct = pctM ? pctM[1].split(',').map((s) => Number(s.trim())) : null;
  const rx = pctM ? rawRx.slice(0, pctM.index).trim() : rawRx;
  const base = { line, optional, name: rawName, pct };
  const setsOf = (s) => (s === '?' ? null : Number(s));
  let m;
  if ((m = /^((?:\d+|F)(?:\/(?:\d+|F))+)$/.exec(rx))) {
    const ladder = m[1].split('/').map((v) => (v === 'F' ? 'F' : Number(v)));
    return { ...base, kind: 'ladder', sets: ladder.length, ladder };
  }
  if ((m = /^(\?|\d+)x\?$/.exec(rx))) return { ...base, kind: 'any', sets: setsOf(m[1]) };
  if ((m = /^(\?|\d+)xF$/.exec(rx))) return { ...base, kind: 'failure', sets: setsOf(m[1]) };
  if ((m = /^(\?|\d+)x(\d+)-(\d+)$/.exec(rx))) return { ...base, kind: 'range', sets: setsOf(m[1]), reps: Number(m[2]), repsMax: Number(m[3]) };
  if ((m = /^(\?|\d+)x(\d+)(s|min)$/.exec(rx))) return { ...base, kind: 'time', sets: setsOf(m[1]), sec: Number(m[2]) * (m[3] === 'min' ? 60 : 1) };
  if ((m = /^(\?|\d+)x(\d+(?:\.\d+)?)(yd|m|km|mi)$/.exec(rx))) return { ...base, kind: 'distance', sets: setsOf(m[1]), dist: `${m[2]}${m[3]}` };
  if ((m = /^(\?|\d+)x(\d+)$/.exec(rx))) return { ...base, kind: 'reps', sets: setsOf(m[1]), reps: Number(m[2]) };
  throw new Error(`key row "${line}": cannot read "${rx}"`);
}

/* "BB", "barbell" and "bar" are one word here, so "EzBar/or BB Skullcrushers" (the card) and "EZ Bar Skullcrushers"
   (the reader's tidy of it) agree; "or" is dropped, so an "A/or B" card matches a read that kept either. */
const ABBREV = { db: 'dumbbell', dbs: 'dumbbell', bb: 'bar', barbell: 'bar', ezbar: 'ez bar', kb: 'kettlebell', kbs: 'kettlebell', bw: 'bodyweight', oh: 'overhead', alt: 'alternating', rdl: 'romanian deadlift', rdls: 'romanian deadlift' };
const words = (s) =>
  s
    .toLowerCase()
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .flatMap((w) => (ABBREV[w] ?? w).split(' '))
    .map((w) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w))
    .filter((w) => w && !['or', 'and', 'the', 'a', 'of', 'with'].includes(w));

/**
 * A name match that forgives spelling-level drift and nothing more: the same normalised words, or at least two
 * thirds of them shared (Jaccard). "DB/or KB Farmers Walk" ~ "DB Farmers Walk" (3/4); "Back Squat" ≠ "Front
 * Squat" (1/3); "Bench Press" ≠ "Close Grip Bench Press" (2/4) — a variant is a different lift.
 */
export function nameMatches(key, read) {
  const sa = new Set(words(key));
  const sb = new Set(words(read ?? ''));
  if (!sa.size || !sb.size) return false;
  const shared = [...sa].filter((w) => sb.has(w)).length;
  return shared / new Set([...sa, ...sb]).size >= 2 / 3;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GRADING ONE READ AGAINST ITS KEY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Why one read row is not this key row, or null when it is. `tally` collects the counted-not-failed gaps. */
export function rowProblem(k, r, tally = {}) {
  if (!nameMatches(k.name, r.name)) return `name "${r.name}" is not "${k.name}"`;
  if (k.sets != null && r.sets !== k.sets) return `${k.name}: ${r.sets} sets, key ${k.sets}`;
  const repScheme = r.rx?.repScheme;
  const failure = r.toFailure === true || (Array.isArray(repScheme) && repScheme.length > 0 && repScheme.every((x) => x === 'F'));
  switch (k.kind) {
    case 'any':
      break;
    case 'failure':
      if (!failure) return `${k.name}: not to failure`;
      break;
    case 'reps':
      if (r.durationSec) return `${k.name}: read as ${r.durationSec}s, key ${k.reps} reps`;
      if (r.reps !== k.reps) return `${k.name}: ${r.reps} reps, key ${k.reps}`;
      if (r.rx?.repsMax != null && r.rx.repsMax !== k.reps) return `${k.name}: a range to ${r.rx.repsMax}, key exactly ${k.reps}`;
      break;
    case 'range':
      if (r.reps !== k.reps) return `${k.name}: ${r.reps} reps, key ${k.reps}-${k.repsMax}`;
      if (r.rx?.repsMax != null) {
        if (r.rx.repsMax !== k.repsMax) return `${k.name}: range top ${r.rx.repsMax}, key ${k.repsMax}`;
      } else tally.rangeTopDropped = (tally.rangeTopDropped ?? 0) + 1;
      break;
    case 'time': {
      const sec = r.durationSec ?? r.targetSec ?? null;
      if (sec !== k.sec) return `${k.name}: ${sec == null ? 'no clock' : `${sec}s`}, key ${k.sec}s`;
      break;
    }
    case 'distance':
      tally.distanceNotHeld = (tally.distanceNotHeld ?? 0) + 1;
      break;
    case 'ladder': {
      if (k.ladder.every((v) => v === 'F')) {
        if (!failure) return `${k.name}: not to failure`;
        break;
      }
      const same = k.ladder.every((v) => v === k.ladder[0]);
      if (Array.isArray(repScheme) && repScheme.length) {
        if (JSON.stringify(repScheme) !== JSON.stringify(k.ladder)) return `${k.name}: ladder ${repScheme.join('/')}, key ${k.ladder.join('/')}`;
      } else if (!same || r.reps !== k.ladder[0]) return `${k.name}: ${r.sets}×${r.reps}, key ${k.ladder.join('/')}`;
      break;
    }
  }
  if (k.pct) {
    const scheme = r.rx?.percentScheme;
    const one = r.rx?.percentOfMax;
    const ok =
      k.pct.length === 1
        ? one === k.pct[0] || (Array.isArray(scheme) && scheme.length > 0 && scheme.every((p) => p === k.pct[0]))
        : Array.isArray(scheme) && JSON.stringify(scheme) === JSON.stringify(k.pct);
    if (!ok) return `${k.name}: ${scheme ? `${scheme.join(',')}%` : one != null ? `${one}%` : 'no percentage'}, key ${k.pct.join(',')}%`;
  }
  return null;
}

/** Key rows vs read rows, optional key rows skippable, no read row skippable. Returns the first problem or null. */
function alignDay(keyRows, readRows, tally) {
  const memo = new Map();
  const go = (i, j) => {
    const id = `${i}:${j}`;
    if (memo.has(id)) return memo.get(id);
    let out;
    if (i === keyRows.length) out = j === readRows.length ? { ok: true, tally: {} } : { ok: false, why: `extra row "${readRows[j].name}"`, at: j };
    else {
      const k = keyRows[i];
      const t = {};
      const here = j < readRows.length ? rowProblem(k, readRows[j], t) : `missing "${k.name}"`;
      let take = null;
      if (here == null) {
        const rest = go(i + 1, j + 1);
        if (rest.ok) take = { ok: true, tally: merge(t, rest.tally) };
      }
      if (take) out = take;
      else if (k.optional) {
        const skip = go(i + 1, j);
        // Report the reason past the optional row: it was skippable, so it is never the problem.
        out = skip.ok ? skip : { ok: false, why: skip.why, at: j };
      } else out = { ok: false, why: here ?? go(i + 1, j + 1).why, at: j };
    }
    memo.set(id, out);
    return out;
  };
  const r = go(0, 0);
  if (r.ok) Object.assign(tally, merge(tally, r.tally));
  return r.ok ? null : r.why;
}
const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = (out[k] ?? 0) + v;
  return out;
};

/** How many key rows the read got right, greedily in order — the partial-credit score for a failed case. */
function rowsRight(keyRows, readRows) {
  let j = 0;
  let right = 0;
  for (const k of keyRows) {
    if (j < readRows.length && rowProblem(k, readRows[j]) == null) {
      right++;
      j++;
    } else if (!k.optional) j++;
  }
  return right;
}

/** Grade a `readImportPhoto` result against one manifest item. */
export function gradeRead(item, result) {
  const mainOf = (d) => (d.items ?? []).filter((i) => !i.section);
  const weeks = result?.kind === 'ok' ? result.weeks : [];
  const rowsRead = weeks.flatMap((w) => w.days.flatMap(mainOf)).length;
  if (item.expect === 'refuse') {
    const pass = result?.kind !== 'ok' || rowsRead === 0;
    return { pass, score: pass ? 1 : 0, notes: pass ? `nothing imported (${result?.kind})` : `a rest-day card imported ${rowsRead} rows` };
  }
  const keyWeeks = item.key.weeks.map((w) => w.days.map((d) => d.main.map(parseSpec)));
  const keyRows = keyWeeks.flat(2).filter((k) => !k.optional).length;
  if (result?.kind !== 'ok') return { pass: false, score: 0, notes: `no import: ${result?.kind}${result?.error ? ` (${result.error})` : ''}` };
  const tally = {};
  const problems = [];
  if (weeks.length !== keyWeeks.length) problems.push(`${weeks.length} weeks, key ${keyWeeks.length}`);
  let right = 0;
  keyWeeks.forEach((days, w) => {
    const readDays = weeks[w]?.days ?? [];
    if (readDays.length !== days.length) problems.push(`week ${w + 1}: ${readDays.length} days, key ${days.length}`);
    days.forEach((rows, d) => {
      const read = readDays[d] ? mainOf(readDays[d]) : [];
      right += rowsRight(rows, read);
      const why = alignDay(rows, read, tally);
      if (why) problems.push(`w${w + 1}d${d + 1}: ${why}`);
    });
  });
  const pass = problems.length === 0;
  const counted = Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ');
  return {
    pass,
    score: pass ? 1 : Math.round((right / Math.max(1, keyRows)) * 100) / 100,
    notes: [pass ? `structure-correct via ${result.via}` : problems.slice(0, 4).join(' · '), counted].filter(Boolean).join(' · '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE REAL PATH, UNDER THE REPO'S HARNESS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

let HARNESS = null;
/** Load `readImportPhoto` the way `import-photo-read.test.mjs` does — once, on first use (it registers module hooks). */
async function harness() {
  if (HARNESS) return HARNESS;
  await import(pathToFileURL(path.join(ROOT, 'src/data/__tests__/harness/hooks.mjs')).href);
  const { supabase, db, ATHLETE } = await import('@/lib/supabase');
  const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
  const { refreshConsents } = await import('@/lib/consent');
  const { readImportPhoto } = await import('@/data/import-photo-read');
  const { resolveExerciseName } = await import('@/domain/exercise-picker/data');
  globalThis.FileReader ??= class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then(
        (b) => {
          this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
          this.onload?.();
        },
        () => this.onerror?.(),
      );
    }
  };
  HARNESS = { supabase, db, ATHLETE, CONSENT_POLICY_VERSION, refreshConsents, readImportPhoto, resolveKey: (n) => resolveExerciseName(n)?.key };
  return HARNESS;
}

let PHOTO = 0;
/** A photo the client has never seen (its card cache is keyed by the bytes) — the bytes do not matter offline. */
const freshPhoto = () => {
  PHOTO += 1;
  return `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, PHOTO & 255, (PHOTO >> 8) & 255, 7]).toString('base64')}`;
};

/** Run `readImportPhoto` on `uri`, every function call answered by `answer(name, body)` → `{ status, body }`. */
export async function readThroughApp(uri, answer) {
  const h = await harness();
  h.db.reset();
  h.db.rows('health_consents').push({
    athlete_id: h.ATHLETE,
    kind: 'ai_sharing',
    action: 'granted',
    policy_version: h.CONSENT_POLICY_VERSION.ai_sharing,
    created_at: new Date().toISOString(),
  });
  await h.refreshConsents();
  h.supabase.functions.invoke = async (name, opts) => {
    const { status = 200, body } = await answer(name, opts?.body ?? {}, opts?.signal);
    if (status === 200) return { data: body, error: null };
    return { data: null, error: { message: 'non-2xx', context: new Response(JSON.stringify(body), { status }) } };
  };
  return h.readImportPhoto(uri, h.resolveKey);
}

/** Grade a recording: the recorded function answers, through the real path. */
async function gradeRecorded(item, recorded) {
  const bodies = recorded?.reply?.bodies ?? {};
  const asked = [];
  let missing = null;
  const result = await readThroughApp(freshPhoto(), async (name) => {
    asked.push(name);
    const b = bodies[name];
    if (!b) {
      missing = name;
      return { status: 503, body: { ok: false, reason: 'unavailable' } };
    }
    return b;
  });
  if (missing) return { pass: false, score: 0, notes: `the path asked ${missing}, which this recording has no answer for — re-record (asked: ${asked.join(', ')})` };
  return gradeRead(item, result);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// LIVE — the function's own prompt, settings and boundary, sent straight to the model
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const systemOf = (file) => {
  const m = /const SYSTEM = `([\s\S]*?)`;/.exec(source(file));
  if (!m || m[1].includes('${')) throw new Error(`${file}: SYSTEM is not one plain template`);
  return m[1];
};
const constOf = (file, name) => {
  const m = new RegExp(`const ${name} = ([^;]+);`).exec(source(file));
  if (!m) throw new Error(`${file}: no ${name}`);
  return JSON.parse(m[1].replace(/_/g, '').replace(/'/g, '"'));
};
/** The card reader's own "is training written here" rule, compiled from its source (as card-rule.test.mjs does). */
const cardLifty = () => {
  const src = source(CARD_FN);
  const a = src.indexOf('// ── LIFTY: begin ──');
  const b = src.indexOf('// ── LIFTY: end ──');
  return new Function(`${src.slice(a + '// ── LIFTY: begin ──'.length, b)}\nreturn LIFTY;`)();
};

async function messages(apiKey, payload, signal) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
const textOf = (json) => (json?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');

/** The card reader's answer for an image, shaped exactly as `workout-card-read` returns it. */
async function liveCardRead(apiKey, body, signal, usage, model = null) {
  const m = model ?? constOf(CARD_FN, 'MODEL');
  const { status, json } = await messages(
    apiKey,
    {
      model: m,
      max_tokens: 4096,
      ...knobsFor(m, { thinking: { type: 'disabled' }, output_config: { effort: 'low' } }),
      system: [{ type: 'text', text: systemOf(CARD_FN), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.image } }, { type: 'text', text: 'Copy this workout card as text.' }] }],
    },
    signal,
  );
  usage['workout-card-read'] = { ...(json?.usage ?? {}), model: json?.model };
  if (status !== 200) return { status: 503, body: { ok: false, reason: 'upstream_error' } };
  if (json?.stop_reason === 'refusal' || json?.stop_reason === 'max_tokens') return { status: 200, body: { ok: false, reason: 'unreadable' } };
  const text = textOf(json)
    .replace(/\r/g, '')
    .replace(/^\s*```[a-z]*\s*\n?|\n?\s*```\s*$/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .slice(0, constOf(CARD_FN, 'MAX_CARD_LINES'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, constOf(CARD_FN, 'MAX_CARD_CHARS'));
  if (!text) return { status: 200, body: { ok: false, reason: 'unreadable' } };
  if (/^NOT_A_WORKOUT\b/.test(text) || !cardLifty().test(text)) return { status: 200, body: { ok: false, reason: 'not_a_program' } };
  return { status: 200, body: { ok: true, text } };
}

/** The layout pass's answer for a card's text, shaped exactly as `workout-tidy` returns it. */
async function liveTidy(apiKey, body, signal, usage, model = null) {
  const text = String(body.text ?? '');
  const m = model ?? constOf(TIDY_FN, 'MODEL');
  const { status, json } = await messages(
    apiKey,
    {
      model: m,
      max_tokens: 8000,
      ...knobsFor(m, { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } }),
      system: [{ type: 'text', text: systemOf(TIDY_FN), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `<card>\n${text}\n</card>\n\nRewrite this card in the layout.` }],
    },
    signal,
  );
  usage['workout-tidy'] = { ...(json?.usage ?? {}), model: json?.model };
  if (status !== 200) return { status: 503, body: { ok: false, reason: 'upstream_error' } };
  if (json?.stop_reason === 'refusal' || json?.stop_reason === 'max_tokens') return { status: 200, body: { ok: false, reason: 'unreadable' } };
  const out = textOf(json).replace(/^\s*```[a-z]*\s*\n?|\n?\s*```\s*$/g, '').trim();
  if (!out || /^NOT_A_WORKOUT\b/.test(out)) return { status: 200, body: { ok: false, reason: 'not_a_workout' } };
  return { status: 200, body: { ok: true, text: out.slice(0, constOf(TIDY_FN, 'MAX_CHARS') * 2) } };
}

/** The function's upload ceiling (base64 chars). The app shrinks a photo before sending; so does this. */
const MAX_BASE64 = () => constOf(CARD_FN, 'MAX_BASE64_CHARS');

/** A PNG over the ceiling, halved (box filter) until it fits — pngjs is already in node_modules. */
async function fitPng(buf) {
  const { PNG } = (await import('pngjs')).default ?? (await import('pngjs'));
  let img = PNG.sync.read(buf);
  let out = buf;
  while (out.toString('base64').length > MAX_BASE64()) {
    const w = Math.floor(img.width / 2);
    const h = Math.floor(img.height / 2);
    const half = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let c = 0; c < 4; c++) {
          let s = 0;
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s += img.data[((y * 2 + dy) * img.width + (x * 2 + dx)) * 4 + c];
          half.data[(y * w + x) * 4 + c] = s >> 2;
        }
      }
    }
    img = half;
    out = PNG.sync.write(half);
  }
  return out;
}

/** The image for a case, verified against the manifest's sha256 and shrunk to the upload ceiling. */
async function imageFor(item) {
  const file = path.join(corpusDir(), item.file);
  const raw = fs.readFileSync(file);
  const sha = createHash('sha256').update(raw).digest('hex');
  if (sha !== item.sha256) throw new Error(`${item.id}: ${item.file} is not the file the key was written for (sha256 differs)`);
  const png = /\.png$/i.test(item.file);
  const data = png ? await fitPng(raw) : raw;
  if (data.toString('base64').length > MAX_BASE64()) throw new Error(`${item.id}: over the upload ceiling and not a PNG — shrink it first`);
  return `data:${png ? 'image/png' : 'image/jpeg'};base64,${data.toString('base64')}`;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// COST
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Tokens per case, honestly rounded UP. Card read: ~330 system + ~1,520 for a phone screenshot (resized to
 * 1,568 px on the long edge, ~1.15 MP / 750) + the turn ≈ 1,900 in; ~450 out (a card is 150–400 tokens of text,
 * the 3-week sheet ~1,000). Layout pass, for every single-workout case: ~1,150 system (cached after the first:
 * 0.1× after the write) + ~450 card ≈ 1,650 in; ~1,100 out with its adaptive thinking.
 */
const TOKENS = { card: { input: 1900, output: 450 }, tidy: { input: 1650, output: 1100 } };

let RATES = null;
async function rates() {
  RATES ??= await import(pathToFileURL(path.join(ROOT, 'src/domain/ai/model-rates.ts')).href);
  return RATES;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SUITE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Graded cases: every manifest item that is a workout or a rest day. Excluded and pending items are not cases. */
const casesOf = (m = readManifest()) =>
  m.items.filter((i) => i.expect === 'workout' || i.expect === 'refuse').map((i) => ({ id: i.id, input: { file: i.file, sha256: i.sha256 }, expect: i }));

/**
 * Today's parser on the TYPED transcripts the repo already holds for corpus items (Squatober cards typed from the
 * images, and the 3-week sheet's table read) — $0, no model. A floor that only ever moves up: a parser change that
 * reads fewer of these right fails the deterministic check. 9 of 10 on 2026-11-17; 10 of 10 from 2026-11-18 (Sprint
 * 3b: Day 10's "Skullcrushers x 50 reps" is one set of fifty, not a total to reach).
 */
export const LEGACY_FLOOR = 10;

async function legacyReplays() {
  const m = readManifest();
  const out = [];
  for (const item of m.items.filter((i) => i.legacy && (i.expect === 'workout' || i.expect === 'refuse'))) {
    const [file, exportName] = item.legacy.fixture.split('#');
    let text;
    if (exportName) text = (await import(pathToFileURL(path.join(ROOT, file)).href))[exportName];
    else {
      // The table reader's TSV, laid out as the card reader writes a table (import-photo-read.test.mjs does the same).
      const tsv = source(file);
      text = `${item.id}\n${tsv.split('\n').filter((l) => l.trim()).map((l) => l.split('\t').join(' | ')).join('\n')}`;
    }
    const result = await readThroughApp(freshPhoto(), async (name) =>
      name === 'workout-card-read' ? { body: { ok: true, text } } : { status: 503, body: { ok: false, reason: 'unavailable' } },
    );
    out.push({ id: item.id, ...gradeRead(item, result) });
  }
  return out;
}

export const suite = {
  name: 'import-corpus',
  // The two functions this path calls. `program-photo-read` is the table reader the app falls back to only when the
  // card reader is not deployed; its recordings would be a second read of every photo (×2 cost), so it is NOT gated
  // here — say so before deploying it on this suite's say-so.
  functions: ['workout-card-read', 'workout-tidy'],
  promptSources: [
    { file: CARD_FN, exportName: 'SYSTEM' },
    { file: TIDY_FN, exportName: 'SYSTEM' },
  ],
  model: 'claude-sonnet-5',
  cases: async () => casesOf(),
  deterministic: async () => {
    const m = readManifest();
    const checks = [];
    // 1. Every key row reads, and every graded item is keyed or a rest day.
    const bad = [];
    for (const i of m.items) {
      if (i.expect === 'workout') {
        if (!i.key?.weeks?.length) bad.push(`${i.id}: no key`);
        for (const w of i.key?.weeks ?? []) for (const d of w.days) for (const row of d.main) {
          try {
            parseSpec(row);
          } catch (e) {
            bad.push(`${i.id}: ${e.message}`);
          }
        }
      } else if (!['refuse', 'excluded', 'pending'].includes(i.expect)) bad.push(`${i.id}: expect "${i.expect}"`);
      if (!/^[0-9a-f]{64}$/.test(i.sha256 ?? '')) bad.push(`${i.id}: no sha256`);
    }
    const ids = m.items.map((i) => i.id);
    for (const id of ids.filter((x, n) => ids.indexOf(x) !== n)) bad.push(`duplicate id ${id}`);
    checks.push({ id: 'manifest-keys', pass: bad.length === 0, notes: bad.length ? bad.slice(0, 8).join(' · ') : `${casesOf(m).length} graded cases, every key row readable` });

    // 2. The grader tells right from wrong, through the real path: a perfect read of a key passes, one changed set fails.
    const item = m.items.find((i) => i.id === 'squatober-2024-08');
    const card = (sets) => `"TEMPO TUESDAY"\nDay: 8 Tuesday 10-08-24\n1. BACK SQUAT ${sets} sets of 4 reps @ 60%\n2. FRONT SQUAT 3 sets of 4 reps @ 45%\n3. DB Bulgarian Split Squats 3 sets of 5 reps each leg\nCardio\nBB RDL's 3 sets of 5 reps`;
    const run = async (text) => gradeRead(item, await readThroughApp(freshPhoto(), async (name) => (name === 'workout-card-read' ? { body: { ok: true, text } } : { status: 503, body: { ok: false, reason: 'unavailable' } })));
    const right = await run(card(4));
    const wrong = await run(card(5));
    checks.push({ id: 'grader-discriminates', pass: right.pass && !wrong.pass, notes: `right: ${right.notes} | wrong: ${wrong.notes}` });

    // 3. The parser on the typed transcripts already in the repo — a floor, $0.
    const legacy = await legacyReplays();
    const passed = legacy.filter((l) => l.pass).length;
    checks.push({
      id: 'legacy-transcripts',
      pass: passed >= LEGACY_FLOOR,
      notes: `${passed}/${legacy.length} typed transcripts structure-correct (floor ${LEGACY_FLOOR}) — ${legacy.filter((l) => !l.pass).map((l) => `${l.id}: ${l.notes}`).slice(0, 4).join(' · ')}`,
    });

    // 4. The binaries, when this machine has them (CI does not — a note, never a failure).
    const dir = corpusDir(m);
    if (fs.existsSync(dir)) {
      const missing = m.items.filter((i) => !fs.existsSync(path.join(dir, i.file))).map((i) => i.file);
      checks.push({ id: 'corpus-files', pass: missing.length === 0, notes: missing.length ? `missing under ${dir}: ${missing.slice(0, 5).join(', ')}` : `all ${m.items.length} files under ${dir}` });
    }
    return checks;
  },
  grade: async (testCase, recorded) => gradeRecorded(testCase.expect, recorded),
  callLive: async (testCase, { apiKey, signal, model = null }) => {
    if (!apiKey) throw new Error('import-corpus: callLive needs an Anthropic API key');
    /* The suite's own model is the functions' model today; only a --model run swaps both functions onto another. */
    const swap = model && model !== 'claude-sonnet-5' ? model : null;
    const uri = await imageFor(testCase.expect);
    const usage = {};
    const bodies = {};
    await readThroughApp(uri, async (name, body) => {
      let answer;
      if (name === 'workout-card-read') answer = await liveCardRead(apiKey, body, signal, usage, swap);
      else if (name === 'workout-tidy') answer = await liveTidy(apiKey, body, signal, usage, swap);
      else answer = { status: 404, body: { code: 'NOT_FOUND', message: `${name} is not part of this recording` } };
      bodies[name] = answer;
      return answer;
    });
    return { reply: { bodies }, usage };
  },
  estimateUsd: (cases) => {
    // Synchronous by contract; the rates are the same table the meter uses, read once at module load below.
    const r = RATE_TABLE['claude-sonnet-5'];
    const usd = (t) => (t.input * r.input + t.output * r.output) / 1_000_000;
    const list = cases ?? [];
    const sheets = list.filter((c) => (c.expect?.key?.weeks?.length ?? 1) > 1 || /sheet/.test(c.expect?.kind?.join(' ') ?? '')).length;
    const total = list.length * usd(TOKENS.card) + (list.length - sheets) * usd(TOKENS.tidy);
    return Math.round(total * 100) / 100;
  },
  // PO 11-18: gated "no worse than live" (baselines.json, the deployed workout-tidy's 29/61); 95% is the target.
  threshold: { metric: 'pass_rate', min: 0.95, floor: 'live' },
};

/** The meter's own rate table, loaded at import so `estimateUsd` can stay synchronous. */
const RATE_TABLE = (await rates()).MODEL_RATES;

export default suite;
