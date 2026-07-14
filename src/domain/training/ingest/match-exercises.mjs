/*
 * match-exercises.mjs — resolve program exercise NAMES → catalog `id`s.
 *
 * Reads the extracted programs + the authoritative catalog
 * (`exercise-relationships/source/exercises.json`) and maps each named exercise to a
 * catalog id by exact name / alias / (unique) family. High-confidence matches only;
 * anything ambiguous or unmatched is written to `unmatched-exercises.json` for PO review.
 * NEVER creates catalog entries — a name with no confident match is FLAGGED, not invented.
 *
 * Run:  node src/domain/training/ingest/match-exercises.mjs   (after extract.mjs)
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const CATALOG = join(HERE, '..', '..', 'exercise-relationships', 'source', 'exercises.json');

// Terminology synonyms so "pressdown" ≡ "pushdown", etc. (applied during normalization).
const SYNONYMS = [[/\bpressdown\b/g, 'pushdown']];
const norm = (s) => {
  let t = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  for (const [re, to] of SYNONYMS) t = t.replace(re, to);
  return t.replace(/\bprogression\b/g, '').replace(/\s+/g, ' ').trim();
};
const tokenSet = (s) => norm(s).split(' ').filter(Boolean).sort().join(' ');
/** Equipment preference for RECOMMENDING among ambiguous variants (labeled, never silent). */
const EQUIP_PRIORITY = ['dumbbell', 'cable', 'selectorized_machine', 'bodyweight', 'barbell', 'kettlebell', 'band', 'smith_machine'];

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const equipOf = new Map(catalog.map((e) => [e.id, e.equipmentId]));
const byName = new Map();
const byAlias = new Map();
const byFamily = new Map();
const byTokenSet = new Map();
for (const ex of catalog) {
  byName.set(norm(ex.name), ex.id);
  for (const a of ex.aliases || []) byAlias.set(norm(a), ex.id);
  const f = norm(ex.family);
  (byFamily.get(f) || byFamily.set(f, []).get(f)).push(ex.id);
  const ts = tokenSet(ex.name);
  (byTokenSet.get(ts) || byTokenSet.set(ts, []).get(ts)).push(ex.id);
}

/** Among candidate ids, recommend by equipment priority (labeled needs-confirmation). */
function recommend(ids) {
  const ranked = [...ids].sort((a, b) => {
    const ia = EQUIP_PRIORITY.indexOf(equipOf.get(a));
    const ib = EQUIP_PRIORITY.indexOf(equipOf.get(b));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return ranked[0] || null;
}

/** Warm-up drills that are mobility/cardio prep, not catalog resistance exercises. */
const NON_CATALOG_WARMUP = /^(light treadmill walk|arm circles|shoulder rolls|band pull apart)$/i;

function match(rawName) {
  const n = norm(rawName);
  if (byName.has(n)) return { catalogKey: byName.get(n), method: 'name', confidence: 1.0 };
  if (byAlias.has(n)) return { catalogKey: byAlias.get(n), method: 'alias', confidence: 0.95 };
  const ts = byTokenSet.get(tokenSet(rawName));
  if (ts && ts.length === 1) return { catalogKey: ts[0], method: 'token-set', confidence: 0.9 };
  const fam = byFamily.get(n);
  if (fam && fam.length === 1) return { catalogKey: fam[0], method: 'family-unique', confidence: 0.85 };
  // Ambiguous / fuzzy: gather candidates and a RECOMMENDED pick (needs PO confirmation).
  const candidates = new Set();
  if (ts && ts.length > 1) ts.forEach((id) => candidates.add(id));
  if (fam && fam.length > 1) fam.forEach((id) => candidates.add(id));
  if (!candidates.size) for (const [cn, id] of byName) if (cn.includes(n) || n.includes(cn)) candidates.add(id);
  const list = [...candidates].slice(0, 8);
  return { catalogKey: null, method: 'none', confidence: 0, candidates: list, recommended: recommend(list) };
}

// Collect every distinct exercise name across the emitted programs (with section context).
const files = readdirSync(OUT).filter((f) => f.endsWith('.extracted.json'));
const seen = new Map(); // rawName → { sections:Set, programs:Set }
for (const f of files) {
  const p = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
  if (!p.verified) continue;
  for (const b of p.blocks || []) {
    for (const w of b.workouts || []) {
      const add = (name, section) => {
        const e = seen.get(name) || { sections: new Set(), programs: new Set() };
        e.sections.add(section);
        e.programs.add(p.slug);
        seen.set(name, e);
      };
      // Warm-ups are freeform prep drills — intentionally NOT catalog-mapped.
      for (const ex of w.main || []) {
        add(ex.name, 'main');
        if (ex.substitution) add(ex.substitution.name, 'substitution');
      }
    }
  }
}

const map = {};
const unmatched = [];
for (const [name, ctx] of [...seen].sort()) {
  const res = match(name);
  const sections = [...ctx.sections];
  if (res.catalogKey) {
    map[name] = { catalogKey: res.catalogKey, method: res.method, confidence: res.confidence };
  } else {
    unmatched.push({
      name,
      sections,
      programs: [...ctx.programs],
      likelyNonCatalog: NON_CATALOG_WARMUP.test(name) && sections.every((s) => s === 'warmup'),
      candidates: res.candidates,
      recommended: res.recommended || null, // needs PO confirmation — never silently used
    });
  }
}

writeFileSync(join(OUT, 'exercise-map.json'), JSON.stringify(map, null, 2), 'utf8');
writeFileSync(join(OUT, 'unmatched-exercises.json'), JSON.stringify(unmatched, null, 2), 'utf8');

const total = seen.size;
const matched = Object.keys(map).length;
const warmupOnly = unmatched.filter((u) => u.likelyNonCatalog).length;
console.log(`distinct exercise names: ${total}`);
console.log(`matched: ${matched}  |  unmatched: ${unmatched.length}  (of which likely non-catalog warm-up drills: ${warmupOnly})`);
console.log('\nUNMATCHED (needs PO confirmation — recommended pick in [brackets]):');
for (const u of unmatched) {
  const rec = u.recommended ? `  [recommend: ${u.recommended}]` : '';
  console.log(`  ${u.likelyNonCatalog ? '· ' : '⚑ '}${u.name}  (${u.sections.join(',')})${rec}${u.candidates.length ? '  — of: ' + u.candidates.join(', ') : '  (no candidates)'}`);
}
