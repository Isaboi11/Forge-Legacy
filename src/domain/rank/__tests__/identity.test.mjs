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

import { RANK_IDENTITY, rankIdentity } from '../identity.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.join(here, '../../../../Docs/Rank-System-Architecture.md');

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
