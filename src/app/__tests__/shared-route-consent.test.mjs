/**
 * shared-route-consent.test.mjs — D-RS-3 held as source guards, on both sides of the wire.
 *
 * Route-Sharing-Amendment-001 §4: *"The map goes on a post only when the athlete includes it while
 * composing that post. Nothing shares retroactively."* And, on the same field: *"it must not become a
 * global 'always include' preference without a further amendment, because a sticky default is how a
 * choice made once in enthusiasm becomes an address published weekly."*
 *
 * That is a privacy rule with a real consequence — §2 records that the PO was advised to keep the 200 m
 * endpoint trim, considered it, and vetoed it completely, so a shared route now runs door to door. The
 * consent is the only mitigation left standing. It is worth more than a comment.
 *
 * `node --test` cannot reach a database, so the SQL guards read migration 0183's text. That is enough to
 * catch the two ways this breaks in a rebuild: the gate being dropped, and the route being returned
 * outside it.
 *
 * Run:  node --test src/app/__tests__/shared-route-consent.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SHEET = strip(read('../../components/forge/ShareSessionSheet.tsx'));
const FEED = strip(read('../../data/squad-feed-live.ts'));
const LIVE = strip(read('../../data/activity-live.ts'));
const SQL = read('../../../supabase/migrations/0183_shared_route_consent.sql');
const BUNDLE = read('../../../supabase/apply/pending-0183.sql');

// ─────────────────────────────────────────────────────────────────────────────
// the composer — where the choice is made
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the map tick starts OFF, every time', () => {
  assert.match(SHEET, /const \[shareRoute, setShareRoute\] = useState\(false\)/, 'the tick no longer defaults to off');
  // Nothing may seed it from a previous answer, a profile row or a setting.
  assert.doesNotMatch(SHEET, /setShareRoute\(true\)/, 'something turns the tick on without the athlete');
});

test('⚠ the tick is never remembered between posts', () => {
  // The component is not unmounted between opens, so a tick left standing IS a sticky default.
  const close = SHEET.slice(SHEET.indexOf('const close = ()'), SHEET.indexOf('const close = ()') + 400);
  assert.match(close, /setShareRoute\(false\)/, 'closing the sheet no longer clears the tick');
  // And after a successful share — the case that matters most, posting to a squad then to friends.
  assert.match(SHEET, /setBodyDraft\(null\);[\s\S]{0,200}setShareRoute\(false\)/, 'a completed share no longer clears the tick');
});

test('the tick is only offered when there is a map to offer', () => {
  assert.match(SHEET, /const canShareRoute = snapshot\?\.hasRoute === true;/, 'availability is no longer tied to a stored route');
  assert.match(SHEET, /\{canShareRoute \? \(/, 'the control is drawn without asking whether a route exists');
});

test('the choice rides the post snapshot, and is forced to a real boolean', () => {
  // `canShareRoute &&` matters: a snapshot that lost its route must not post a tick that outlived it.
  assert.match(
    SHEET,
    /workoutSummary: \{ \.\.\.snapshot, lead: effectiveLead \?\? snapshot\.lead, shareRoute: canShareRoute && shareRoute \}/,
    'the posted snapshot no longer carries the guarded shareRoute',
  );
});

test('hasRoute is resolved by a read, and never fails a recap', () => {
  assert.match(FEED, /export async function workoutHasRoute/, 'the route-existence read is gone');
  assert.match(FEED, /Promise\.all\(\[fetchCompletion\(workoutId\), workoutHasRoute\(workoutId\)\]\)/, 'the recap no longer resolves both together');
  // It answers a boolean, never the polyline — the composer has no use for the shape.
  assert.match(FEED, /\.select\('workout_sets\(route\)'\)/, 'the existence read changed shape');
  assert.doesNotMatch(FEED, /hasRoute: true/, 'something asserts hasRoute rather than reading it');
});

// ─────────────────────────────────────────────────────────────────────────────
// the database — where the choice is ENFORCED
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the route is returned only inside the consent gate', () => {
  // The one place the polyline is selected must sit under `if v_share_route then`.
  const gate = SQL.indexOf('if v_share_route then');
  const select = SQL.indexOf('select ws.route, ws.climb_m');
  assert.ok(gate > 0, '0183 no longer gates on v_share_route');
  assert.ok(select > gate, 'the route is selected before the consent is checked');
  assert.match(SQL, /coalesce\(p\.workout_summary ->> 'shareRoute', 'false'\) = 'true'/, 'the consent key changed');
});

test('a post that never ticked the box reads as "no" without a backfill', () => {
  // `->>` on a missing key is NULL; coalesce makes that false. This is what "nothing shares
  // retroactively" is actually made of.
  assert.match(SQL, /coalesce\(p\.workout_summary ->> 'shareRoute', 'false'\)/, 'an absent key no longer defaults to false');
  assert.doesNotMatch(SQL, /update public\.squad_posts/, '0183 writes to posts — it must only read');
});

test('⚠ the goal-contribution door never opens the map', () => {
  // 0134 added a second entitlement with no post behind it, so nobody ever chose. It resolves the
  // session; it must never resolve the route.
  const consent = SQL.slice(SQL.indexOf('v_share_route := exists'), SQL.indexOf('if v_share_route then'));
  assert.match(consent, /from public\.squad_posts p/, 'the consent no longer asks a post');
  assert.doesNotMatch(consent, /squad_members|squad_goal_window_end/, 'the goal door leaked into the consent gate');
});

test('⚠ 0183 restores the set duration_sec that 0134 deleted', () => {
  // 0127 added it, 0134 rebuilt from 0117 and lost it, and every shared hold has read blank since.
  assert.match(SQL, /'duration_sec', ws\.duration_sec/, '0183 drops the set-level duration_sec again');
});

test('the paste bundle asserts what it claims to have done', () => {
  assert.match(BUNDLE, /raise exception '0183 DID NOT FULLY APPLY/, 'the bundle no longer raises on a partial apply');
  for (const probe of ['shareRoute', 'v_share_route', 'v_route', 'v_climb_m', 'ws.duration_sec']) {
    assert.ok(BUNDLE.includes(`position('${probe}' in src)`), `the bundle stopped checking for ${probe}`);
  }
  // §3 must predict zero before the client ships — a non-zero count would mean another writer exists.
  assert.match(BUNDLE, /posts_sharing_route\s+= 0/, 'the bundle no longer predicts zero shared routes');
});

// ─────────────────────────────────────────────────────────────────────────────
// the client read — which must not grant itself anything
// ─────────────────────────────────────────────────────────────────────────────

test('the shared read renders what it is given, and decides nothing', () => {
  assert.match(LIVE, /route: r\.route \?\? null,/, 'the shared read no longer carries the route the RPC returned');
  assert.match(LIVE, /climbM: r\.climb_m \?\? null,/, 'the shared read no longer carries the climb');
  // A database without 0183 returns neither key, which reads undefined and draws nothing. The client
  // must never be the thing that decides a viewer may see a route.
  assert.doesNotMatch(LIVE, /shareRoute/, 'the client is making the consent decision instead of the database');
});
