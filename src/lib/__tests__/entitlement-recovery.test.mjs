import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * Eva, 2026-10-15: "I was just starting my chest & shoulder workout. I tried to copy and paste but this
 * happened" — Home → Import a workout → "Unable to verify your subscription. Try again.", with no Nutrition
 * tab. The one entitlement read had failed, nothing read again, and "Try again" could never work.
 *
 * Source-level, because the provider and the gate are React and import through `@/`.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const PROVIDER = read('../entitlement.tsx');
const LIVE = read('../../data/entitlement-live.ts');
const GATE = read('../../hooks/usePremiumGate.ts');
const JOIN = read('../../app/join-squad.tsx');

test('a failed read keeps the last good answer, and the failure it handles is the null one', () => {
  // `fetchEntitlement` reports failure as null, never a throw — the premise of the fallback's placement.
  assert.match(LIVE, /if \(error\) \{[\s\S]{0,400}?return null;\s*\}/);
  assert.match(PROVIDER, /if \(snap\) \{\s*LAST_GOOD\.set\(uid, snap\);\s*return \{ uid, snap \};\s*\}/);
  assert.match(PROVIDER, /return \{ uid, snap: LAST_GOOD\.get\(uid\) \?\? null \};/);
  // The old shape — fallback only inside `catch`, null passed straight through — must not come back.
  assert.doesNotMatch(PROVIDER, /if \(snap\) LAST_GOOD\.set\(uid, snap\);\s*return \{ uid, snap \};/);
});

test('the provider reads again whenever the app comes back to the foreground', () => {
  assert.match(PROVIDER, /import \{ AppState \} from 'react-native';/);
  assert.match(
    PROVIDER,
    /if \(!uid\) return;\s*const sub = AppState\.addEventListener\('change', \(next\) => \{\s*if \(next === 'active'\) refetch\(\);\s*\}\);\s*return \(\) => sub\.remove\(\);\s*\}, \[uid, refetch\]\);/,
  );
});

test('the retry toast starts a re-read, but never cancels a first read still in flight', () => {
  assert.match(
    GATE,
    /showToast\(ENTITLEMENT_RETRY_MESSAGE\);[\s\S]{0,500}?if \(status === 'unknown'\) refetch\(\);\s*return false;/,
  );
  assert.match(GATE, /\[gates, status, refetch, enqueue, showToast, inWorkout\]/);
});

test('join-squad leans on the gate for the retry instead of a second copy of it', () => {
  assert.match(JOIN, /if \(!guard\('squads'\)\) return;/);
  assert.doesNotMatch(JOIN, /refetchEntitlement/);
});
