/**
 * route-map-shows-on-any-session.test.mjs — the map is not a cardio-only feature.
 *
 * PO, 2026-08-31: *"when I go back to see a run, or any workout with a run, I want to see the map
 * there. It needs to show."*
 *
 * A run alone always drew it. A run INSIDE a lifting session never did, and the cause was one level of
 * nesting: the Route block sat in the `else` arm of Activity Detail's `isStrength ? … : …`. That arm is
 * unreachable for a mixed session on purpose — `sessionActivityType` files a workout under a cardio type
 * only when it is entirely that one kind of cardio ("a leg day with a cool-down walk is a strength
 * workout"), so a bench day carrying a tracked run saves as `strength`, takes the exercise arm, and the
 * polyline it stored is drawn by nothing.
 *
 * The read was never the problem: `fetchActivityDetail` scans every set in the session for a route
 * regardless of type. So both guards below are about PLACE, not about data.
 *
 * `node --test` cannot mount a screen, so these read the source — same shape as the other wiring guards
 * in this directory, and for the same reason.
 *
 * Run:  node --test src/app/__tests__/route-map-shows-on-any-session.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const DETAIL = strip(read('../activity/[id].tsx'));
const LIVE = strip(read('../../data/activity-live.ts'));
const CONDITIONING = strip(read('../../domain/workout/conditioning.ts'));

test('the route is read from any session, whatever it was filed as', () => {
  // The find walks every set in the workout. Nothing here narrows by activity_type — if it ever does,
  // a mixed session loses its map again one layer lower down.
  assert.match(
    LIVE,
    /const routed = \(w\.workout_exercises \?\? \[\]\)\s*\.flatMap\(\(ex\) => ex\.workout_sets \?\? \[\]\)\s*\.find\(\(st\) => st\.route\)/,
    'activity-live no longer finds the route by scanning every set',
  );
  assert.match(LIVE, /route: routed\?\.route \?\? null/, 'the found route is no longer carried onto the detail');
});

test('a mixed session really is filed as strength — which is why placement matters', () => {
  // Not a bug to fix; the reason the map may not live in the cardio arm. Stated as a guard so that if
  // this rule is ever relaxed, whoever relaxes it sees this file.
  assert.match(
    CONDITIONING,
    /if \(kinds\.size !== 1\) return fallback;/,
    'sessionActivityType no longer falls back for a session of mixed kinds',
  );
});

/*
 * The two arms of the body, by the label each one opens with. Anchoring on `{isStrength ? (` does NOT
 * work — the hero uses the same ternary to pick between the equipment icon and the shoe glyph, and it
 * comes first in the file. These two labels are unambiguous.
 */
const STRENGTH_ARM = () => DETAIL.indexOf('styles.sectionLabel}>Exercises');
const CARDIO_ARM = () => DETAIL.indexOf('styles.sectionLabel}>Session');

test('⚠ the Route block is NOT inside the strength/cardio branch', () => {
  const strength = STRENGTH_ARM();
  const cardio = CARDIO_ARM();
  assert.ok(strength > 0 && cardio > 0, 'the body arms moved — re-point this guard');

  const route = DETAIL.indexOf('{routePts.length > 1 ? (');
  assert.ok(route > 0, 'Activity Detail no longer renders a route block at all');

  // Above BOTH arms is the only position that is outside the ternary. Above one and below the other is
  // exactly the bug: that is what "inside the else branch" looked like.
  assert.ok(
    route < strength && route < cardio,
    'the Route block is back inside the type branch — a workout with a run in it will show no map',
  );
});

test('the map and its fullscreen sheet are both outside the branch, on the same condition', () => {
  const first = Math.min(STRENGTH_ARM(), CARDIO_ARM());
  // Both the inline band and the sheet it opens. A sheet left behind in the cardio arm would render a
  // tappable map that opens nothing on a lifting day.
  assert.ok(DETAIL.indexOf('testID="activity-route-map"') < first, 'the inline RouteMap fell back inside the branch');
  assert.ok(DETAIL.indexOf('<RouteSheet') < first, 'the RouteSheet fell back inside the branch');
});

test('the condition is still "more than one point", not a type check', () => {
  // Two points is the least that draws a line; `regionFor` returns null below that and RouteMap renders
  // nothing. Gating on `detail.type` instead is the exact mistake this file exists to prevent.
  assert.match(DETAIL, /\{routePts\.length > 1 \? \(/, 'the route gate is no longer a point count');
  assert.doesNotMatch(
    DETAIL.slice(0, Math.min(STRENGTH_ARM(), CARDIO_ARM())),
    /routePts[\s\S]{0,80}?(isStrength|detail\.type)/,
    'the route block gained a session-type condition',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// the cardio row inside a lifting session — PO, 2026-08-31, screenshot 2
// "Exercise not found — 'cardio:run' isn't in the catalog."
// ─────────────────────────────────────────────────────────────────────────────

test('a cardio bout never routes to the exercise catalog', () => {
  // `cardio:<activity>` is a marker, not an `exercises.json` id — `cardioKey` mints it and
  // `activityFromKey` reads it back. Exercise Detail can only ever 404 on one.
  assert.match(DETAIL, /const cardio = isCardioKey\(ex\.catalogKey\);/, 'the row no longer asks whether it is cardio');
  assert.match(
    DETAIL,
    /onPress=\{opensMap \? \(\) => setMapOpen\(true\) : cardio \? undefined : \(\) => onOpenExercise\(/,
    'a cardio row can reach onOpenExercise again — it lands on the not-in-the-catalog page',
  );
});

test('the cardio row opens the map, and only when there is one to open', () => {
  assert.match(
    DETAIL,
    /const opensMap = cardio && routePts\.length > 1;/,
    'the row opens the map on something other than a route actually existing',
  );
  // An indoor bout has no shape. The row must go quiet rather than fail — no press, no chevron.
  assert.match(DETAIL, /const tappable = !cardio \|\| opensMap;/, 'the tappable rule changed');
  assert.match(DETAIL, /disabled=\{!tappable\}/, 'a routeless cardio row is pressable again');
  assert.match(
    DETAIL,
    /\{tappable \? <Glyph d="M9 6l6 6-6 6"/,
    'the chevron is drawn on a row that goes nowhere — the arrow is the promise it breaks',
  );
});

test('a run does not wear a dumbbell', () => {
  // `equipmentForCatalogKey` has no answer for a cardio key, so EquipIcon fell back to iron. Same bug
  // the hero already fixed; the shoe is now one constant used by both.
  assert.match(DETAIL, /const SHOE = 'M3 15\.6v-3/, 'the shoe path is no longer named once');
  assert.match(DETAIL, /cardio \? \(\s*<Glyph d=\{SHOE\}/, 'a cardio row no longer draws the shoe');
});
