/**
 * onboarding-escape.test.mjs — onboarding is not a one-way door.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * Reported as *"the app is frozen — it only lets them sign in and nothing else."* Nothing was frozen.
 * `routeFor` sends every signed-in athlete with a null `onboarded_at` to onboarding, and onboarding is
 * the only thing that ever clears it — so an athlete who stopped partway was returned to the same
 * screen on every launch, forever. There was **no sign-out, no account switch and no exit of any kind**
 * on the screen; `Back` only walks between steps and is hidden on the first one.
 *
 * The tester who reported it held two accounts and had signed into the wrong one. He was not stuck on a
 * bug in onboarding — he was stuck because leaving was impossible.
 *
 * ⚠ **AND IT PRESENTS AS A FREEZE, WHICH IS WHY IT SURVIVED THIS LONG.** There is no error, no spinner
 * and no message. Three of the first twenty-eight accounts were in this state when it was found, and
 * every one of them looked to their owner like an app that does not work.
 *
 * ══ WHY A SOURCE GUARD ══
 *
 * The failure is a missing control, and a missing control is invisible to `tsc`, to lint, and to every
 * unit test — nothing is broken, a door simply is not there. The behavioural half (`routeFor`) already
 * passes and always did: it is *correct* to route an un-onboarded athlete to onboarding. What can only
 * be held in the shape of the code is that the screen it routes to can be left.
 *
 * Each test reads ONE NAMED FILE rather than grepping the repo — a source guard that searches for a
 * string it must also SAY will match itself (`svg-gradient-stops.test.mjs` did exactly that).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { routeFor } from '../../lib/route-for.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const SCREEN = read('../onboarding.tsx');
const KIT = read('../../components/onboarding/kit.tsx');

/**
 * ⚠ COMMENTS STRIPPED, and this is a fix rather than a loophole — `svg-gradient-stops.test.mjs` states
 * the same rule after being born failing for the same reason.
 *
 * The Alert check below forbids a literal that the code fixing the bug has to SPELL OUT in its own
 * comment to explain what it prevents. Scanning the raw file, that comment matches, and the guard
 * reports the explanation as the defect. Dropping comment lines keeps every line of real code in scope
 * and only ignores prose, which cannot render anything.
 */
const CODE = SCREEN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. THE TRAP IS REAL — pinned, so the escape hatch cannot be deleted as unnecessary
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('a signed-in athlete with no onboarded_at is sent to onboarding, every time', () => {
  const route = routeFor({
    authLoading: false,
    hasSession: true,
    profileLoading: false,
    onboardedAt: null,
  });
  assert.equal(route, 'onboarding');
});

test('and nothing but finishing onboarding ever changes that', () => {
  // Same input, repeated: there is no attempt counter, no timeout, no fallback to the app. This is what
  // makes "no way out" permanent rather than merely annoying, and it is why the door below must exist.
  for (let i = 0; i < 3; i++) {
    assert.equal(
      routeFor({ authLoading: false, hasSession: true, profileLoading: false, onboardedAt: null }),
      'onboarding',
    );
  }
  assert.equal(
    routeFor({ authLoading: false, hasSession: true, profileLoading: false, onboardedAt: '2026-08-20T00:00:00Z' }),
    'app',
  );
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 2. THE DOOR EXISTS AND IS WIRED
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the header renders an exit control when given one', () => {
  assert.match(KIT, /onExit\?: \(\) => void/);
  assert.match(KIT, /accessibilityLabel="Sign out and use a different account"/);
});

test('⚠ the screen passes onExit — a prop nothing supplies is a door nothing opens', () => {
  assert.match(SCREEN, /onExit=\{/);
});

test('⚠ the exit is NOT hidden on the first step, which is the step that needs it', () => {
  // `onBack` is deliberately absent on step one (`idx > 0`). If `onExit` were gated the same way, the
  // screen a wrong-account athlete lands on at every launch would again have no control at all — the
  // precise defect, reintroduced while every other test here still passed.
  const call = /onExit=\{([^}]*)\}/.exec(SCREEN);
  assert.ok(call, 'onExit is not passed at all');
  assert.ok(!/idx\s*[><=]/.test(call[1]), `onExit is gated on the step index: ${call[1]}`);
});

test('it actually signs out, rather than only navigating away', () => {
  // Routing to '/sign-in' while the session lives would bounce straight back through `routeFor`.
  assert.match(SCREEN, /const \{ signOut \} = useAuth\(\)/);
  assert.match(SCREEN, /await signOut\(\)/);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 3. IT WORKS ON THE SURFACE THE ATHLETES ACTUALLY TEST
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ the confirmation is a sheet, not Alert.alert, which is inert on web', () => {
  // The deployed web preview is where the testers are. An `Alert` here would silently do nothing on the
  // exact surface this fix exists for — green everywhere, dead where it counts.
  assert.ok(!/Alert\.alert/.test(CODE), 'Alert.alert is used; it does nothing on web');
  assert.match(CODE, /<BottomSheet[\s\S]{0,400}?open=\{exitOpen\}/);
});

test('the confirm says the answers are discarded, because they are', () => {
  // Nothing persists until `complete_onboarding` runs at the very end, so signing out silently throws
  // away everything typed. Saying so is the difference between a door and a trapdoor.
  assert.match(SCREEN, /nothing has been saved yet/);
  assert.match(SCREEN, /more than one account/);
});

test('a failed sign-out does not strand the sheet in its loading state', () => {
  const handler = /const onExitConfirmed[\s\S]*?\n  \};/.exec(SCREEN);
  assert.ok(handler, 'onExitConfirmed moved — this guard needs updating with it');
  assert.match(handler[0], /catch \{[\s\S]*?setExiting\(false\)/);
});
