import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * ⚠ A USER-INITIATED SAVE MUST NEVER FAIL IN SILENCE.
 *
 * The 2026-08-12 audit found FIFTEEN places doing `void save(...)` with no rejection arm. In each, the
 * control moved, the write rejected unhandled, and the server kept the old value with nothing said. The
 * worst were promises rather than preferences — an athlete shown "Only me" on a photo audience the server
 * never accepted has been told something untrue about their own privacy.
 *
 * `preferences.tsx` had the correct shape the whole time, under a comment that named the rule:
 *
 *     "A settings screen that lies about what it saved is worse than one that fails loudly."
 *
 * It was applied to that one screen and copied to none. `usePersist` makes it importable, and this test
 * makes it stay imported. Each assertion below fails if that call site regresses to a bare `void`.
 *
 * ⚠ NOT A BAN ON `void`. Best-effort telemetry — presence, analytics, capture stamps, and the post-commit
 *   annotations in `save.ts` — is deliberately silent, because a mark ON a thing the athlete did must
 *   never be able to fail the thing itself. Only the sites listed here are user-initiated saves.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/**
 * ⚠ CODE ONLY — a source-text guard cannot tell code from prose ABOUT code.
 *
 * Every fix in this batch documents the shape it replaced, quoting the old line verbatim so the next
 * reader knows what was wrong. The first version of this test read those comments and reported the bug as
 * still present. A guard that fires on its own explanation is worse than no guard: the obvious way to make
 * it pass is to delete the comment that says why the code is the way it is.
 */
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments, including the JSDoc that quotes the old shape
    .replace(/^\s*\/\/.*$/gm, ''); // line comments

/** Every screen that persists something the athlete pressed a control to change. */
const GUARDED = [
  ['Seal Chapter + reflection', '../../../app/chapter/reflect.tsx'],
  ['Profile Visibility (audience + analytics opt-out)', '../../../app/profile-visibility.tsx'],
  ['Notification preferences', '../../../app/notifications.tsx'],
  ['Goal — mark achieved', '../../../app/goals.tsx'],
  ['Log weigh-in', '../../../components/forge/LogWeightSheet.tsx'],
  ['Preferences (units, coach intensity)', '../../../app/preferences.tsx'],
];

for (const [label, path] of GUARDED) {
  test(`${label}: a failed save is surfaced, not swallowed`, () => {
    const src = read(path);
    const usesHelper = /usePersist/.test(src);
    // preferences.tsx predates the helper and carries the pattern inline — either is acceptable, a bare
    // `void` is not.
    const usesInlineCatch = /\.catch\(/.test(src);
    assert.ok(
      usesHelper || usesInlineCatch,
      `${path} must route user-initiated writes through usePersist (or an explicit .catch)`,
    );
  });
}

test("Seal Chapter has a rejection arm on BOTH the seal and the skip", () => {
  const src = code('../../../app/chapter/reflect.tsx');
  // `saved` gates the "This chapter has been sealed." overlay. If it can be reached without the write
  // resolving, a failed seal looks exactly like a successful one.
  assert.ok(
    !/void\s+action\s*\.then/.test(src),
    'the old `void action.then(...).finally(...)` shape drops the rejection — .finally() re-throws',
  );
  const persistCalls = src.match(/persist\(/g) ?? [];
  assert.ok(persistCalls.length >= 2, 'both `complete` (seal/reflect) and `skip` (seal only) must be guarded');
});

test('Profile Visibility never writes defaults over a blob it has not read', () => {
  const src = code('../../../app/profile-visibility.tsx');
  // `useQuery` returns `data: null` while loading AND on error, and `saveAppPrefs` fills every field —
  // so spreading a null `prefs` writes pure defaults over the athlete's real settings, app-wide.
  assert.ok(
    /prefsReady/.test(src),
    'the analytics toggle must refuse until the app-prefs read has actually resolved',
  );
  assert.ok(
    /if \(!prefsReady\)/.test(src),
    'the guard must be a real early return in the handler, not just a rendering hint',
  );
});

test('"Reset to defaults" only claims success once the server accepted it', () => {
  const src = code('../../../app/profile-visibility.tsx');
  const reset = src.slice(src.indexOf('const reset ='));
  const body = reset.slice(0, reset.indexOf('\n  };'));
  assert.ok(/onOk:\s*\(\)\s*=>\s*setToast\(true\)/.test(body), 'the toast must be inside onOk');
  assert.ok(
    !/setToast\(true\);\s*\n\s*\}/.test(body),
    'setToast must not fire unconditionally after the write is dispatched',
  );
});

test('usePersist rolls back before it toasts', () => {
  const src = read('../../../hooks/usePersist.ts');
  const rollbackAt = src.indexOf('opts?.rollback?.()');
  const toastAt = src.indexOf('showToast(opts?.message');
  assert.ok(rollbackAt > 0 && toastAt > 0, 'both must exist');
  assert.ok(
    rollbackAt < toastAt,
    'the control must move back BEFORE the message appears — otherwise the athlete reads "couldn’t save" beside the value it failed to save',
  );
});
