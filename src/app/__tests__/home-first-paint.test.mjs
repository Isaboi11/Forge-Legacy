/**
 * home-first-paint.test.mjs — Home opens once, or it opens in pieces.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * Reported by the PO from the tester build: *"the home screen doesn't all load at once, so I see it all
 * get pieced together."* Home makes fourteen reads and every section drew the instant its OWN read
 * landed — chapter block, then hero, then mission tile, then Your Circle, then a badge on the quick
 * actions — each one shoving the next down the screen. The fix holds the whole screen on the splash
 * until every read is in (`isHomeReady`, with a ceiling), then reveals it as one.
 *
 * ══ WHY THIS HAS TO BE A SOURCE GUARD ══
 *
 * The gate is only as complete as its list. Add a fifteenth `useQuery` to Home six months from now, and
 * the screen goes back to assembling itself in front of the athlete — for that one section — with tsc
 * green, every unit test green, and nothing to see on the web preview but a slightly late card. There is
 * no runtime assertion that can catch "somebody added a read and did not gate it", because the read
 * works. The list has to be checked against the reads themselves.
 *
 * This is the same shape as `route-guard.test.mjs`: a rule about a screen that only a reader of the
 * screen's source can enforce.
 *
 * Run:  node --test src/app/__tests__/home-first-paint.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = join(HERE, '..', '(tabs)', 'index.tsx');

/** Comments stripped, always — this file's own prose names the things it forbids in order to explain them. */
const src = readFileSync(HOME, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

/** The array literal handed to `isHomeReady([...], ceilingReached)`. */
function gateList() {
  const inner = /isHomeReady\(\s*\[([\s\S]*?)\]\s*,/.exec(src)?.[1];
  assert.ok(inner, 'Home no longer calls isHomeReady([...]) — the first-paint gate is gone');
  return inner;
}

test('every read Home makes is gated on the first paint', () => {
  const calls = (src.match(/useQuery\(/g) ?? []).length;
  const settled = [...src.matchAll(/settled:\s*(\w+)/g)].map((m) => m[1]);

  assert.equal(
    settled.length,
    calls,
    `Home makes ${calls} reads but only ${settled.length} report \`settled\`. An ungated read is a ` +
      'section that appears after the rest of the screen — which is the whole defect.',
  );

  const list = gateList();
  for (const flag of settled) {
    assert.ok(
      new RegExp(`\\b${flag}\\b`).test(list),
      `\`${flag}\` is destructured but missing from isHomeReady([...]), so whatever it feeds pops in late`,
    );
  }
});

/**
 * The autosave read is not a `useQuery`, so the count above cannot see it — and it is the one whose
 * pop-in is loudest, because it decides whether the hero says "Train Today" or "In Progress · 12 sets".
 */
test('the local resume read is gated too, even though it is not a query', () => {
  assert.match(src, /setResumeSettled\(true\)/, 'the autosave read no longer latches');
  assert.match(gateList(), /\bresumeSettled\b/, 'resumeSettled is not in the gate — the hero can still swap');
});

/**
 * ⚠ THE WATERFALL, WHICH THE GATE MADE EXPENSIVE.
 *
 * `fetchProgramSessions(builtId)` took its id from `fetchMyPrograms`, so it could not start until that
 * finished — the one read on Home behind another read. Harmless while sections drew independently;
 * once the whole screen waits for the slowest, that chain IS the wait. It also lied to the gate: with
 * `builtId` still null it resolved instantly with `[]`, reporting settled before it had asked anything.
 */
test('Home reads session marks in one unchained query', () => {
  assert.match(src, /useQuery\(fetchAllProgramSessions, \[\]\)/, 'the marks read is no longer dependency-free');
  assert.doesNotMatch(
    src,
    /fetchProgramSessions\(/,
    'Home is back to fetching marks per-program, which puts a round trip behind a round trip and ' +
      'reports itself settled before it has asked anything',
  );
});

/**
 * Monotonicity is what makes holding the screen safe. Home refetches five reads on every focus, and
 * `useQuery` deliberately sets `loading` true again when it does — so a gate reading `loading` would
 * black the screen out every time the athlete came back from another tab. That is a worse stutter than
 * the one being fixed, and it would only show on a device.
 */
test('the gate reads latched flags, never loading', () => {
  assert.doesNotMatch(gateList(), /[Ll]oading/, 'a loading flag in the gate re-closes it on every focus');
});
