/**
 * live-workout-wiring.test.mjs — a friend's live workout is reachable, published, gated, and cleared.
 *
 * PO (2026-08-27): *"I see a friend working out rn I should be able to see what they've logged and have
 * planned."* And, the same evening: *"the confirmation for sharing the workout at the end. Something
 * popping up confirming that I shared it."*
 *
 * The feature is four seams that all fail silently: a screen nobody routes to, a publisher nobody
 * calls, a row nobody clears, and a gate that could quietly default to open. `node --test` cannot mount
 * a screen or reach Postgres, so each seam is held as a source guard — the same shape as
 * `program-photo-wiring.test.mjs`, for the same reason.
 *
 * Run:  node --test src/app/__tests__/live-workout-wiring.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const LAYOUT = read('../_layout.tsx');
const HOME = read('../(tabs)/index.tsx');
const ATHLETE = read('../athlete/[id].tsx');
const WORKOUT = read('../workout.tsx');
const SESSION_HOOK = read('../../hooks/useWorkoutSession.tsx');
const SCREEN = read('../live-workout/[id].tsx');
const VISIBILITY = read('../../domain/settings/visibility.ts');
const MIGRATION = read('../../../supabase/migrations/0181_live_sessions.sql');
const BUNDLE = read('../../../supabase/apply/pending-0181.sql');
const SHEET = read('../../components/forge/ShareSessionSheet.tsx');

// ─────────────────────────────────────────────────────────────────────────────
// reachable
// ─────────────────────────────────────────────────────────────────────────────

test('the screen is DECLARED (a route is gated by being declared) and every live row opens it', () => {
  assert.match(LAYOUT, /<Stack\.Screen name="live-workout\/\[id\]" \/>/, 'live-workout/[id] is not declared in the root Stack');
  const home = strip(HOME);
  assert.match(home, /onViewAthlete=\{\(userId\) => router\.push\(\{ pathname: '\/live-workout\/\[id\]'/, 'the Live Now row no longer opens the live workout');
  assert.match(home, /onAthlete=\{\(userId\) => \{\s*setFriendSheetOpen\(false\);\s*router\.push\(\{ pathname: '\/live-workout\/\[id\]'/, 'the Training Now sheet row no longer opens the live workout');
  assert.match(strip(ATHLETE), /accessibilityLabel="View their live workout"/, 'the profile’s Training now row is no longer tappable');
});

// ─────────────────────────────────────────────────────────────────────────────
// published, throttled, cleared
// ─────────────────────────────────────────────────────────────────────────────

test('the session is published only when opted in, debounced, and cleared when it ends', () => {
  const w = strip(WORKOUT);
  assert.match(w, /setShareLive\(v\.live_session !== 'private'\)/, 'the publisher no longer reads the athlete’s own opt-in');
  assert.match(w, /if \(!shareLive \|\| phase !== 'active' \|\| !session\) return;\s*const t = setTimeout\(\(\) => void publishLiveSession\(liveSessionSnapshot\(session\)\), 4000\);/, 'the publish is not debounced behind the opt-in');
  const h = strip(SESSION_HOOK);
  assert.match(h, /setLiveWorkoutPresence\(false\)\s*void clearLiveSession\(\)/, 'ending a session no longer clears the published row');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ gated — default PRIVATE, on both sides of the wire
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the detail is an opt-in: private by default in the client AND in the reader', () => {
  assert.match(VISIBILITY, /key: 'live_session'[^\n]*def: 'private'/, 'the client default is no longer private');
  assert.match(MIGRATION, /vis_clears\(coalesce\(p\.visibility->>'live_session', 'private'\), v_clear\)/, 'the reader no longer defaults the gate to private');
  // The fact-of-training gate stays in front of it, so the detail can never be more visible than the fact.
  const training = MIGRATION.indexOf("coalesce(p.visibility->>'training', 'squads')");
  const detail = MIGRATION.indexOf("coalesce(p.visibility->>'live_session', 'private')");
  assert.ok(training > 0 && detail > training, 'the training gate must run before the detail gate');
  assert.match(MIGRATION, /security definer/, 'the reader must be definer — it reads a column the viewer cannot select');
  assert.match(MIGRATION, /updated_at > v_cut/, 'the reader must ignore a row older than the 4-hour ceiling');
});

test('the migration ships with a paste bundle that carries it verbatim and asserts it took', () => {
  assert.ok(BUNDLE.includes(MIGRATION), 'pending-0181.sql does not contain 0181_live_sessions.sql verbatim');
  assert.match(BUNDLE, /raise exception '0181 DID NOT FULLY APPLY/);
  assert.match(BUNDLE, /PREDICTED §3 OUTPUT/);
});

// ─────────────────────────────────────────────────────────────────────────────
// the screen keeps the privacy model honest
// ─────────────────────────────────────────────────────────────────────────────

test('the screen distinguishes not-training, not-sharing, sharing-but-empty, and sharing', () => {
  const s = strip(SCREEN);
  assert.match(s, /The session has ended\./);
  assert.match(s, /isn’t sharing the details of this session/);
  assert.match(s, /nothing has come through yet/);
  assert.match(s, /<Progress snapshot=\{view\.snapshot\} \/>/);
  // The join door stays on every branch that is still a live session.
  assert.ok((s.match(/Ask to join/g) ?? []).length >= 3, 'Ask to join must be offered on every live branch');
});

// ─────────────────────────────────────────────────────────────────────────────
// the share confirmation
// ─────────────────────────────────────────────────────────────────────────────

test('a successful share becomes a confirmation that stays until Done', () => {
  const s = strip(SHEET);
  assert.match(s, /setSharedResult\(shareSummary\(landed, includeFriends\)\);/, 'a landed share no longer sets the confirmation');
  assert.match(s, /\{sharedResult \? \(\s*<View style=\{styles\.sharedWrap\} accessibilityRole="alert"/, 'the confirmation is not rendered as an alert');
  assert.match(s, /setSharedResult\(null\);\s*onClose\(\);/, 'Done must clear the confirmation and close');
  assert.match(s, /squadStep && !sharedResult \?/, 'the picker footer must not show over the confirmation');
});
