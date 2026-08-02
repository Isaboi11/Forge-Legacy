import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE CATALOG ↔ EVALUATOR CONTRACT, checked against the migrations themselves.
 *
 * An honor is a row in `honor_catalog` naming a `metric`; the evaluator computes metrics and compares
 * them to thresholds. If a row names a metric the evaluator does not produce, the honor is real,
 * visible, and unearnable by anybody, forever — and NOTHING ERRORS. The evaluator's own guard
 * (`v_metrics ? c.metric`) makes it worse, not better: an unknown metric is skipped in silence.
 *
 * That failure has already happened in this project in the neighbouring form — a client selecting a
 * column a migration never added — so this reads the SQL and refuses to let it happen again. It is a
 * static check, which is the only kind available: these migrations are applied by hand in the Supabase
 * SQL editor and cannot be executed from here.
 *
 * It parses migrations rather than a hand-kept list on purpose. A list would be one more thing to
 * update and forget.
 */

const DIR = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');

/** Metrics the evaluator resolves through a keyed CASE rather than the metrics object. */
const KEYED = ['lift_max', 'lift_ratio', 'session_distance', 'lifetime_distance'];
/** Metrics resolved per-chapter, from the chapter cross join. */
const CHAPTER = ['chapter_workouts', 'chapter_days'];

/** Every honor row ever inserted, latest definition winning — the shape the DB ends up in. */
function catalogRows() {
  const rows = new Map();
  for (const f of files) {
    let cols = null;
    for (const line of read(f).split('\n')) {
      const ins = line.match(/insert into public\.honor_catalog\s*\(([^)]*)\)/i);
      if (ins) {
        cols = ins[1].split(',').map((c) => c.trim());
        continue;
      }
      if (cols == null) continue;
      if (/^\s*(on conflict|;)/i.test(line)) {
        cols = null;
        continue;
      }
      // The trailing `-- 5,000 m` style comment is common in these files; a parser that rejects those
      // rows reports honors as missing that are plainly there, which is worse than no test at all.
      const tup = line.match(/^\s*\((.*)\),?\s*(?:--.*)?$/);
      if (!tup) continue;
      const vals = splitTuple(tup[1]);
      if (vals.length !== cols.length) continue;
      const r = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
      if (r.honor_type) rows.set(r.honor_type, { ...(rows.get(r.honor_type) ?? {}), ...r, file: f });
    }
  }
  return rows;
}

function splitTuple(t) {
  const out = [];
  let cur = '';
  let inq = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "'") {
      if (inq && t[i + 1] === "'") {
        cur += "'";
        i++;
        continue;
      }
      inq = !inq;
      continue;
    }
    if (!inq && c === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** The keys the latest `honor_metrics` / inline metrics object actually builds. */
function computedMetrics() {
  const withMetrics = files.filter((f) => /jsonb_build_object\(/.test(read(f)) && /'workouts_total'/.test(read(f)));
  const latest = withMetrics[withMetrics.length - 1];
  const src = read(latest);
  const start = src.indexOf("'workouts_total'");
  const end = src.indexOf('categories_topped') > 0 ? src.indexOf('$$;', start) : src.indexOf('into v_metrics');
  const block = src.slice(start, end);
  return { keys: new Set([...block.matchAll(/^\s*'([a-z_0-9]+)',/gm)].map((m) => m[1])), file: latest };
}

const rows = catalogRows();
const { keys: computed, file: metricsFile } = computedMetrics();

test('the migrations define the honors this project believes it has', () => {
  // 175 catalog rows + `initiative`, which is awarded by its own RPC (0014) and is deliberately not a
  // catalog row — 176 awardable honors in total.
  assert.ok(rows.size >= 175, `expected at least 175 catalog rows, parsed ${rows.size}`);
});

test('EVERY catalog metric has an evaluator path', () => {
  const orphans = [];
  for (const [id, r] of rows) {
    const m = r.metric;
    if (!m) continue;
    if (computed.has(m) || KEYED.includes(m) || CHAPTER.includes(m)) continue;
    orphans.push(`${id} (metric "${m}", added in ${r.file})`);
  }
  assert.deepEqual(
    orphans,
    [],
    `these honors name a metric nothing computes, so no athlete can ever earn them:\n  ${orphans.join('\n  ')}\n` +
      `(metrics object parsed from ${metricsFile})`,
  );
});

test('every metric the CHECK constraint allows is one the evaluator can produce', () => {
  // The whitelist and the evaluator are re-stated together in each migration that adds metrics. If they
  // drift, the constraint happily accepts a row the evaluator will never resolve.
  const withCheck = files.filter((f) => /add constraint honor_catalog_metric_check/.test(read(f)));
  const src = read(withCheck[withCheck.length - 1]);
  const block = src.slice(src.indexOf('add constraint honor_catalog_metric_check'));
  const allowed = [...block.slice(0, block.indexOf('));')).matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
  const unresolvable = allowed.filter((m) => !computed.has(m) && !KEYED.includes(m) && !CHAPTER.includes(m));
  assert.deepEqual(unresolvable, [], `the metric whitelist permits names the evaluator cannot resolve: ${unresolvable}`);
});

test('every prerequisite honor exists in the catalog', () => {
  // The FK enforces this in the database. Asserting it here means a broken requirement is caught before
  // the migration is ever handed over to be run by hand.
  const reqs = [];
  for (const f of files) {
    const src = read(f);
    if (!/insert into public\.honor_requires/i.test(src)) continue;
    const block = src.slice(src.indexOf('insert into public.honor_requires'));
    for (const m of block.slice(0, block.indexOf('on conflict')).matchAll(/\('([a-z_0-9]+)',\s*'([a-z_0-9]+)',\s*(\d+)\)/g)) {
      reqs.push({ honor: m[1], requires: m[2], group: Number(m[3]), file: f });
    }
  }
  assert.ok(reqs.length >= 15, `expected the Prestige prerequisites, parsed ${reqs.length}`);
  const missing = reqs.filter((r) => !rows.has(r.honor) || !rows.has(r.requires));
  assert.deepEqual(missing, [], `prerequisites naming honors that do not exist: ${JSON.stringify(missing)}`);
});

test('no honor requires itself, and Prestige never requires Prestige', () => {
  // The locked catalog's No-Prestige-on-Prestige rule. It is also what lets the evaluator settle in a
  // single extra pass instead of looping until stable.
  const reqs = [];
  for (const f of files) {
    const src = read(f);
    if (!/insert into public\.honor_requires/i.test(src)) continue;
    const block = src.slice(src.indexOf('insert into public.honor_requires'));
    for (const m of block.slice(0, block.indexOf('on conflict')).matchAll(/\('([a-z_0-9]+)',\s*'([a-z_0-9]+)',\s*\d+\)/g)) {
      reqs.push([m[1], m[2]]);
    }
  }
  for (const [honor, requires] of reqs) {
    assert.notEqual(honor, requires, `${honor} requires itself`);
    if (rows.get(honor)?.category === 'Prestige') {
      assert.notEqual(rows.get(requires)?.category, 'Prestige', `${honor} requires the Prestige honor ${requires}`);
    }
  }
});

test('the honor awarded from the evaluator rather than a threshold can never be awarded by one', () => {
  // `hidden_triple_threat` is about the award batch itself, so it has no honest threshold. It carries
  // metric `never` (constant 0) precisely so the generic loop skips it — with `always` it was handed to
  // every athlete on their first evaluation, which is the opposite of hidden.
  const tt = rows.get('hidden_triple_threat');
  assert.ok(tt, 'hidden_triple_threat is missing');
  assert.equal(tt.metric, 'never', 'Triple Threat must not sit on a metric the loop can satisfy');
  assert.ok(computed.has('never'), 'the `never` metric must exist, or the row fails its own contract test');
});

test('every honor id is unique and lower_snake_case', () => {
  for (const id of rows.keys()) {
    assert.match(id, /^[a-z][a-z0-9_]*$/, `${id} is not a usable honor id`);
  }
});

test('no honor sits at a threshold of zero — an honor earned for nothing is not an honor', () => {
  for (const [id, r] of rows) {
    const t = Number(r.threshold);
    if (!Number.isFinite(t)) continue;
    assert.ok(t > 0, `${id} has threshold ${t}`);
  }
});

test('every catalog metric has words for it in triggerText', () => {
  /*
   * `triggerText` ends in `default: return 'Earned through training.'` — so a metric with no case does
   * not error, it just describes itself in a sentence that says nothing. Thirty-seven honors landing on
   * "Earned through training." would be a visible regression that no type-check or lint would catch,
   * because nothing is technically wrong.
   */
  const src = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'honors-live.ts'), 'utf8');
  const handled = new Set([...src.matchAll(/case '([a-z_0-9]+)':/g)].map((m) => m[1]));
  const speechless = [...new Set([...rows.values()].map((r) => r.metric).filter(Boolean))]
    .filter((m) => !handled.has(m))
    .sort();
  assert.deepEqual(speechless, [], `these metrics fall through to the generic default: ${speechless.join(', ')}`);
});

test('the categories that were empty are not empty any more', () => {
  // The whole point of 0099. If a future migration removes these, that should be a decision, not a slip.
  const byCat = {};
  for (const r of rows.values()) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  for (const [cat, min] of [['Programs', 5], ['Squad', 12], ['Hidden', 6], ['Prestige', 7], ['Longevity', 10]]) {
    assert.ok((byCat[cat] ?? 0) >= min, `${cat} has ${byCat[cat] ?? 0} honors, expected at least ${min}`);
  }
});
