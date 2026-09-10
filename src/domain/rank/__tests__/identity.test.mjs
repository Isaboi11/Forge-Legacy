/**
 * The rank identity statements must equal the LOCKED table, and must exist in exactly one place.
 *
 * ══ WHY THIS TEST EXISTS ══
 *
 * These sentences were in the app twice and neither copy was checked against the spec. `progress-hub`
 * had six right and Established wrong ("What I built outlives me" for "I've built something real." — a
 * different claim, not a rewording). `rank-progression` had a wholly separate set of seven that appear
 * in no locked document. The rank-up ceremony had neither and said one generic line at every rank.
 *
 * Nothing about that was catchable: copy is not typechecked, and three plausible sentences in three
 * files look like three deliberate choices. So the doc is the fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RANK_ASCENT, RANK_IDENTITY, rankAscent, rankIdentity } from '../identity.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.join(here, '../../../../Docs/Rank-System-Architecture.md');
const AMD3 = path.join(here, '../../../../Docs/Amendments/Rank-System-Architecture-Amendment-003-Sub-Tier-Statements.md');
const FAMILIES = ['foundation', 'builder', 'craftsman', 'architect', 'established', 'legend', 'legacy'];
const ROMAN = { I: 1, II: 2, III: 3, IV: 4 };

/** §2.2's table: `| Foundation | "I've started." |` — family, then the quoted sentence. */
function lockedIdentities() {
  const src = readFileSync(SPEC, 'utf8');
  const out = {};
  for (const line of src.split('\n')) {
    const m = line.match(/^\|\s*(Foundation|Builder|Craftsman|Architect|Established|Legend|Legacy)\s*\|\s*"(.+?)"\s*\|\s*$/);
    if (m) out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

/** The doc is plain ASCII quotes; the app renders typographic ones. Compare like for like. */
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').trim();

test('the locked table is still readable — this test is worthless if the parse silently finds nothing', () => {
  const locked = lockedIdentities();
  assert.equal(Object.keys(locked).length, 7, `expected 7 identities in RSA §2.2, parsed ${Object.keys(locked).length}`);
});

test('every family in the app matches the sentence the spec locked', () => {
  const locked = lockedIdentities();
  for (const [family, sentence] of Object.entries(locked)) {
    assert.equal(norm(RANK_IDENTITY[family]), norm(sentence), `${family} drifted from RSA §2.2`);
  }
});

test('all seven families are covered — a missing one renders as empty, not as a fallback sentence', () => {
  for (const f of ['foundation', 'builder', 'craftsman', 'architect', 'established', 'legend', 'legacy']) {
    assert.ok(rankIdentity(f).length > 0, `${f} has no identity statement`);
  }
});

test('an unknown family is empty, never an invented sentence', () => {
  assert.equal(rankIdentity('apprentice'), '', 'RSA §639 records "Apprentice" as a placeholder that is not a rank');
});

/* ══ RSA-A3 — the 28 ascent statements ══ */

/** §4's table: `| Builder | II | "I'm becoming consistent." |`. */
function lockedAscents() {
  const src = readFileSync(AMD3, 'utf8');
  const out = {};
  for (const line of src.split('\n')) {
    const m = line.match(/^\|\s*(Foundation|Builder|Craftsman|Architect|Established|Legend|Legacy)\s*\|\s*(I|II|III|IV)\s*\|\s*"(.+?)"\s*\|\s*$/);
    if (m) (out[m[1].toLowerCase()] ??= {})[ROMAN[m[2]]] = m[3];
  }
  return out;
}

test('the amendment table is still readable — 28 rows, or this whole block proves nothing', () => {
  const locked = lockedAscents();
  const rows = Object.values(locked).reduce((n, tiers) => n + Object.keys(tiers).length, 0);
  assert.equal(rows, 28, `expected 28 ascent statements in RSA-A3 §4, parsed ${rows}`);
});

test('every rung in the app matches the sentence the amendment locked', () => {
  const locked = lockedAscents();
  for (const [family, tiers] of Object.entries(locked)) {
    for (const [level, sentence] of Object.entries(tiers)) {
      assert.equal(norm(RANK_ASCENT[family][level]), norm(sentence), `${family} ${level} drifted from RSA-A3 §4`);
    }
  }
});

test('⚠ RSA-A3-D2.2 — tier I IS the family identity, verbatim', () => {
  /*
   * The structural guarantee that this is ONE identity at four depths rather than four identities.
   * §13.1 is the clause the whole amendment turns on; if a tier-I line is ever edited into something of
   * its own, the table has quietly become the second identity set that Amendment 002 §3 banned.
   */
  for (const f of FAMILIES) {
    assert.equal(RANK_ASCENT[f][1], RANK_IDENTITY[f], `${f} · I is no longer the §2.2 identity statement`);
  }
});

test('⚠ RSA-A3-D2.1 — every statement is first person, present tense, and sayable', () => {
  for (const f of FAMILIES) {
    for (const lvl of [1, 2, 3, 4]) {
      const line = RANK_ASCENT[f][lvl];
      assert.ok(line.length > 0, `${f} ${lvl} is empty`);
      assert.ok(/[.!]$/.test(line), `${f} ${lvl} is not a finished sentence: ${line}`);
      // "self-descriptions the athlete should be able to say honestly" (§2.2) — so the athlete is in it.
      assert.match(line, /\b(I|I’m|I’ve|My|me|myself)\b/, `${f} ${lvl} is not first person: ${line}`);
      // §3.4 — no comparison, no standing, no numbers.
      assert.doesNotMatch(line, /\b(rank|better|best|top|others|everyone else|percent|%|\d)\b/i, `${f} ${lvl} makes a comparison or a performance claim: ${line}`);
    }
  }
});

test('all 28 rungs are distinct — the entire point of the amendment', () => {
  const seen = new Map();
  for (const f of FAMILIES) {
    for (const lvl of [1, 2, 3, 4]) {
      const line = RANK_ASCENT[f][lvl];
      assert.ok(!seen.has(line), `"${line}" is used by both ${seen.get(line)} and ${f} ${lvl}`);
      seen.set(line, `${f} ${lvl}`);
    }
  }
  assert.equal(seen.size, 28);
});

test('an unknown level falls back to the family identity; an unknown family to empty', () => {
  // A fifth sub-tier would otherwise be announced in silence, and the family identity is always true
  // of any rung of that family. An unknown family has nothing true to say at all.
  assert.equal(rankAscent('builder', 9), RANK_IDENTITY.builder);
  assert.equal(rankAscent('apprentice', 1), '');
});

test('⚠ the family surfaces still say the FAMILY identity (RSA-A3-D4)', () => {
  /*
   * The §13.1 error in the other direction: picking one of four rungs to stand for a whole family. Rank
   * Progression displays families, so it must not reach for `rankAscent`.
   */
  const src = readFileSync(path.join(here, '../../../app/rank-progression.tsx'), 'utf8');
  assert.ok(!src.includes('rankAscent'), 'rank-progression shows FAMILIES — it must use rankIdentity, not rankAscent');
});

test('the Progress Hub ladder shows RUNGS, so it says ascent statements — its hero still says the identity (RSA-A3-D5)', () => {
  /*
   * PO, 2026-09-10: "I want each sub division to be showing here too. With the sayings underneath." The
   * ladder became 28 rungs, and D4's own rule — the split is by what the surface shows — then puts the
   * ascent statement on each. The hero is still "who you are", the family identity.
   */
  const src = readFileSync(path.join(here, '../../../app/progress-hub.tsx'), 'utf8');
  assert.ok(src.includes('rankAscent(def.key, level)'), 'the ladder must say each rung its own ascent statement');
  assert.ok(src.includes('rankIdentity(curDef.key)'), 'the hero must keep the family identity');
  // The JS string literal, not the words — the screen's own comment quotes the old line to explain why it went.
  assert.ok(!src.includes("'Sealed until earned'"), 'unreached rungs are named and quoted now, not sealed');
});

test('⚠ the two screens that used to hold their own copies no longer do', () => {
  /*
   * A source guard, because the failure was DUPLICATION rather than a wrong value: re-adding a local
   * table would typecheck, render, and drift again in silence. `essence` was `rank-progression`'s
   * unlocked second set; `statement:` was `progress-hub`'s field.
   */
  /* ⚠ THE OBJECT FIELD, NOT THE WORD. Matching bare "essence" also caught the comment in
     `rank-progression` that explains why the lines went — a guard that fails on its own documentation
     teaches the next person to delete the documentation. `rankEssence` (the surviving STYLE name) has a
     capital E and is deliberately not matched by `essence:`. */
  for (const [file, banned] of [
    ['../../../app/rank-progression.tsx', 'essence:'],
    ['../../../app/progress-hub.tsx', 'statement:'],
  ]) {
    const src = readFileSync(path.join(here, file), 'utf8');
    assert.ok(!src.includes(banned), `${file} carries its own rank copy again (${banned}) — import rankIdentity instead`);
  }
});
