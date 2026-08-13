import test from 'node:test';
import assert from 'node:assert/strict';

import { honorMeta, categoryGlyph, categoryMeta } from '../catalog.ts';

/**
 * ══ WHY THIS FILE EXISTS ══
 *
 * `HonorMeta.trigger` used to be render-only decoration for the Honors Hub, and three of the four
 * entries were written as RULE NOTATION — *"Total sessions ≥ 25"*. That was harmless while the DB
 * catalog held a row for all three, because every surface took the derived-sentence branch instead.
 *
 * It stopped being harmless when this map became the M-2 ceremony's fallback. The ceremony is the
 * full-screen medallion an athlete sees the moment they earn something, and `copy.ts` puts the citation
 * in its body — so a missing catalog row now means this string is what a person reads after finishing a
 * workout. "Total sessions ≥ 25" is not a sentence anybody wants there.
 *
 * The PO's report is the reason the fallback exists at all: *"When earning an honor the card should tell
 * me why I earned it. Right now it doesn't tell me why on the card that fires off."*
 */

test('every trigger is a sentence an athlete could be shown, not rule notation', () => {
  for (const slug of ['initiative', 'first_workout_logged', 'workouts_logged_25', 'workouts_in_chapter_10']) {
    const t = honorMeta(slug).trigger;
    assert.ok(t.length > 0, `${slug} has no trigger`);
    assert.ok(/[.!]$/.test(t), `${slug}'s trigger is not punctuated as a sentence: "${t}"`);
    // The three ways this file used to speak in schema rather than in English.
    assert.doesNotMatch(t, /[≥≤<>]/, `${slug}'s trigger uses a comparison operator: "${t}"`);
    assert.doesNotMatch(t, /^Total\b|^Sessions\b/, `${slug}'s trigger reads as a metric name: "${t}"`);
    assert.ok(t[0] === t[0].toUpperCase(), `${slug}'s trigger does not start with a capital: "${t}"`);
  }
});

/**
 * ⚠ `initiative` IS THE ONE HONOR THAT CAN NEVER HAVE A DERIVED SENTENCE, which is why it is the one
 * this fallback was actually built for.
 *
 * It is granted by its own RPC (`claim_initiative_honor`, 0014) rather than by `evaluate_honors`, so it
 * has no metric and no threshold and will never appear in `honor_catalog`. `triggerText` cannot speak
 * for it. Before the fallback, the FIRST honor an athlete ever earns was the only one whose ceremony
 * could not say what it was for.
 */
test('initiative carries its own reason, since the database will never hold one', () => {
  const m = honorMeta('initiative');
  assert.equal(m.category, 'origin');
  assert.match(m.trigger, /first move/i);
  assert.equal(categoryGlyph('origin'), 'flame');
  assert.equal(categoryMeta('origin')?.name, 'Origin');
});

/**
 * An unknown slug degrades to a name and NO trigger — deliberately, and the ceremony depends on it.
 *
 * `fetchUncelebratedHonors` only uses this fallback when the string is non-empty; an honor this map has
 * never heard of falls through to M-2's own locked line ("A permanent part of your legacy.") rather than
 * to a blank body. An empty string here is the signal for "say nothing rather than something wrong".
 */
test('an unknown honor yields no trigger at all, so the ceremony keeps the locked line', () => {
  const m = honorMeta('some_future_honor', 'Some Future Honor');
  assert.equal(m.trigger, '');
  assert.equal(m.name, 'Some Future Honor');
  assert.equal(m.category, 'training');
});
