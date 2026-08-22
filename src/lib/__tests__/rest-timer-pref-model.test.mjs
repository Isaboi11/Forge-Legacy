/**
 * rest-timer-pref-model.test.mjs — ⚠ **the preference a new feature could silently erase.**
 *
 * PO, 2026-08-21: *"can we make an option for manual start for the timer on active workouts."*
 *
 * The rest timer used to be a boolean under `forge_rest_timer_on_v1`. Adding a third mode moved it to
 * `forge_rest_timer_mode_v1` — and every athlete who had ever turned the timer ON has a `'1'` under the
 * OLD key and nothing under the new one. Read only the new key and all of them come back from the update
 * switched OFF: a preference destroyed by the feature meant to extend it, with no error, on a screen
 * nobody re-checks.
 *
 * ⚠ THIS IS WHY THE MODEL IS SPLIT OUT. `rest-timer-pref.ts` imports AsyncStorage, which `node --test`
 * cannot load, so the only test possible beside it would have read the source as text — and a regex
 * cannot tell `=== '1'` from `!== '1'`. These run the decision.
 *
 * Run:  node --test src/lib/__tests__/rest-timer-pref-model.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRestMode,
  legacyFlagFor,
  nextRestMode,
  resolveRestMode,
  REST_MODES,
  REST_MODE_KEY,
  REST_MODE_LEGACY_KEY,
} from '../rest-timer-pref-model.ts';

test('⭐ THE REGRESSION: an athlete who had the timer on keeps it', () => {
  // The update has shipped, the new key does not exist yet, and the old one says they turned it on.
  assert.equal(resolveRestMode(null, '1'), 'auto', 'a stored preference was thrown away by the migration');
});

test('a fresh device starts off — the timer is opt-in', () => {
  assert.equal(resolveRestMode(null, null), 'off');
});

test('an athlete who had it OFF is not turned on by the migration', () => {
  // The mirror of the headline case, and the direction that would be a nuisance rather than a loss.
  assert.equal(resolveRestMode(null, '0'), 'off');
});

test('⚠ the new key wins even when it says `off`, because the legacy flag is deliberately stale', () => {
  /*
   * `setRestMode` keeps writing the legacy key for roll-back safety, so `'1'` survives under an athlete
   * who has since chosen a mode on this build. If the legacy flag were allowed to win — or even to break
   * a tie — choosing "off" would not stick: it would be overridden on the next launch by the athlete's
   * own months-old "on". Only an ABSENT or UNREADABLE new key may defer.
   */
  assert.equal(resolveRestMode('off', '1'), 'off');
  assert.equal(resolveRestMode('manual', '1'), 'manual');
  assert.equal(resolveRestMode('auto', '0'), 'auto');
});

test('every mode round-trips through storage as itself', () => {
  for (const m of REST_MODES) {
    assert.equal(resolveRestMode(m, legacyFlagFor(m)), m, `${m} did not survive a write/read`);
  }
});

test('⚠ junk under the new key falls back to the legacy flag rather than to a default', () => {
  /*
   * A half-written value, a key collision, a value from a future build. Treating unreadable as "off"
   * directly would lose the same preference the migration exists to protect — the legacy flag is still
   * the better evidence.
   */
  assert.equal(resolveRestMode('', '1'), 'auto');
  assert.equal(resolveRestMode('ON', '1'), 'auto');
  assert.equal(resolveRestMode('true', '1'), 'auto');
  assert.equal(resolveRestMode('{}', null), 'off', 'with no legacy flag either, off is the honest answer');
});

test('the legacy flag maps on/off, and both live modes count as on', () => {
  assert.equal(legacyFlagFor('off'), '0');
  assert.equal(legacyFlagFor('auto'), '1');
  assert.equal(legacyFlagFor('manual'), '1', 'manual rolled back to the boolean build must stay ON');
});

test('the toggle cycles all three and returns to where it started', () => {
  assert.equal(nextRestMode('off'), 'auto');
  assert.equal(nextRestMode('auto'), 'manual');
  assert.equal(nextRestMode('manual'), 'off');
  // Stepping once per mode must land home, or the chip has a state it cannot leave.
  let m = 'off';
  for (let i = 0; i < REST_MODES.length; i += 1) m = nextRestMode(m);
  assert.equal(m, 'off');
});

test('the cycle reaches every mode there is', () => {
  const seen = new Set();
  let m = 'off';
  for (let i = 0; i < REST_MODES.length; i += 1) {
    seen.add(m);
    m = nextRestMode(m);
  }
  assert.deepEqual([...seen].sort(), [...REST_MODES].sort(), 'a mode the toggle cannot reach is unreachable in the app');
});

test('isRestMode accepts exactly the union, and nothing adjacent to it', () => {
  for (const m of REST_MODES) assert.ok(isRestMode(m));
  for (const v of [null, '', 'Off', 'AUTO', '1', '0', 'on', 'true']) {
    assert.equal(isRestMode(v), false, `"${v}" must not be read as a mode`);
  }
});

test('⚠ the storage keys are frozen — renaming one orphans every stored preference', () => {
  /*
   * These strings are the only link to what is already on athletes' devices. A rename compiles cleanly
   * and reads as a tidy-up, and it is the exact failure this whole file exists to prevent, one step
   * further along.
   */
  assert.equal(REST_MODE_KEY, 'forge_rest_timer_mode_v1');
  assert.equal(REST_MODE_LEGACY_KEY, 'forge_rest_timer_on_v1');
  assert.notEqual(REST_MODE_KEY, REST_MODE_LEGACY_KEY);
});
