import test from 'node:test';
import assert from 'node:assert/strict';
import { convertMeasure, displayWeight, formatLoad, previewSquat } from '../units.ts';
import {
  AUDIENCES,
  canSee,
  sanitizeVisibility,
  VISIBILITY_DEFAULTS,
  VISIBILITY_SECTIONS,
} from '../visibility.ts';
import { NOTIF_DEFAULTS, NOTIF_SECTIONS, sanitizeNotif } from '../notifications.ts';
import { APP_PREFS_DEFAULTS, EXPERIENCE_TOGGLES, sanitizePrefs } from '../preferences.ts';

// ── units ─────────────────────────────────────────────────────────────────────

test('a stored pound weight displays in the athlete’s system, storage unchanged', () => {
  assert.deepEqual(displayWeight(315, 'imperial'), { value: 315, unit: 'lb' });
  assert.deepEqual(displayWeight(315, 'metric'), { value: 143, unit: 'kg' }, '315 lb ≈ 143 kg');
  assert.equal(formatLoad(405, 'imperial', 3), '405 lb × 3');
  assert.equal(formatLoad(405, 'metric', 3), '184 kg × 3');
  assert.equal(formatLoad(1000, 'imperial'), '1,000 lb', 'thousands read as gym numbers');
});

test('convertMeasure only touches a pounds measure, and only for metric', () => {
  assert.equal(convertMeasure('315 lb', 'imperial'), '315 lb', 'imperial is a no-op');
  assert.equal(convertMeasure('315 lb', 'metric'), '143 kg');
  assert.equal(convertMeasure('225 lbs × 5', 'metric'), '102 kg × 5');
  assert.equal(convertMeasure('19:48', 'metric'), '19:48', 'a time is not a weight');
  assert.equal(convertMeasure('18.2 mi', 'metric'), '18.2 mi', 'a distance is left as authored');
  assert.equal(convertMeasure('20 reps', 'metric'), '20 reps');
});

test('the preview matches what a real 315 lb squat would render', () => {
  assert.equal(previewSquat('imperial'), '315 lb');
  assert.equal(previewSquat('metric'), '143 kg');
});

// ── visibility ────────────────────────────────────────────────────────────────

test('the sections carry the design’s defaults, plus live status', () => {
  // Seven from the design, plus `training` (0086) — live presence needed an off switch and took the
  // audience ladder rather than inventing a second privacy concept. `private` IS that off switch.
  assert.equal(VISIBILITY_SECTIONS.length, 8);
  assert.equal(VISIBILITY_DEFAULTS.chapter, 'everyone');
  assert.equal(VISIBILITY_DEFAULTS.transformation, 'friends');
  assert.equal(VISIBILITY_DEFAULTS.stats, 'squads');
  assert.equal(VISIBILITY_DEFAULTS.training, 'squads', 'squad-mates see you lifting; strangers never do');
  assert.equal(AUDIENCES.find((a) => a.id === 'private').label, 'Only me');
});

test('clearance resolves the audience ladder, and private is owner-only', () => {
  assert.equal(canSee('everyone', 'stranger'), true);
  assert.equal(canSee('squads', 'stranger'), false);
  assert.equal(canSee('squads', 'squad'), true);
  assert.equal(canSee('friends', 'squad'), false, 'a squad-mate is not a friend');
  assert.equal(canSee('friends', 'friend'), true);
  assert.equal(canSee('private', 'friend'), false, 'private means nobody but the owner');
  assert.equal(canSee('private', 'owner'), true);
  assert.equal(canSee('friends', 'owner'), true, 'the owner sees everything');
});

test('a stored visibility map merges over defaults and drops junk', () => {
  const m = sanitizeVisibility({ chapter: 'private', stats: 'nonsense', ghost: 'everyone' });
  assert.equal(m.chapter, 'private', 'a real change survives');
  assert.equal(m.stats, 'squads', 'an invalid audience falls back to the default');
  assert.ok(!('ghost' in m), 'an unknown section is dropped');
  assert.deepEqual(sanitizeVisibility(null), VISIBILITY_DEFAULTS);
});

// ── notifications ──────────────────────────────────────────────────────────────

/**
 * ⚠ TEN, NOT NINE, SINCE 0135 — and the tenth is an unapplied locked decision rather than an addition.
 *
 * `Social-System-Architecture-v1.0` SOC-D11 locks *"Comments generate notifications (to the post author;
 * new P-5 row, §13)"*. The row was never built; 0135 built the emitter and this is that row. The count
 * is asserted precisely so a tenth toggle cannot appear without somebody stating which locked decision
 * it comes from — the ceremony toggles below are what happens when one appears without that.
 *
 * REACTIONS did NOT get a row, deliberately: they ride `squad_reactions`, which P-5 §3.1 locked and 0022
 * shipped inert, and whose OFF default SOC-D11 also locks.
 */
test('ten toggles across four sections, squad off / requests on / challenges off / comments on', () => {
  assert.equal(NOTIF_SECTIONS.flatMap((s) => s.toggles).length, 10);
  assert.equal(NOTIF_SECTIONS.length, 4);
  assert.equal(NOTIF_DEFAULTS.squad_feed, false);
  assert.equal(NOTIF_DEFAULTS.squad_invites, true);
  assert.equal(NOTIF_DEFAULTS.friend_requests, true, 'a direct request stays on (P-5 §3.2b)');
  assert.equal(NOTIF_DEFAULTS.challenge_updates, false, 'ambient competition stays off (P-5 §3.2a)');
  assert.equal(NOTIF_DEFAULTS.post_comments, true, 'a comment is aimed at you by name, so it stays on (SOC-D11, P-5 §3.2b)');
  assert.equal(NOTIF_DEFAULTS.squad_reactions, false, 'SOC-D11 locks reaction pushes OFF — the inbox still shows them');
});

// P-5 Architecture §1 (LOCKED): M-1/M-2/M-4 each list "fire as a push notification" under their own
// Non-Behaviors, so the four ceremony toggles the design shipped were audited out in the 0120 pass.
// They had no event source and no sender branch — switching one on could never produce a notification.
test('no ceremony has a push toggle', () => {
  for (const key of ['goal_completed', 'honor_earned', 'chapter_sealed', 'rank_up']) {
    assert.ok(!(key in NOTIF_DEFAULTS), `${key} must not be offerable as a push preference`);
  }
});

test('a stored notification map merges over defaults and ignores junk', () => {
  const m = sanitizeNotif({ squad_feed: true, friend_requests: 'yes', ghost: true });
  assert.equal(m.squad_feed, true, 'a real change survives');
  assert.equal(m.friend_requests, true, 'a non-boolean falls back to the default');
  assert.ok(!('ghost' in m));
  assert.deepEqual(sanitizeNotif(undefined), NOTIF_DEFAULTS);
  // A map saved before 0120 still carries the retired ceremony keys; they must not survive the merge.
  assert.ok(!('honor_earned' in sanitizeNotif({ honor_earned: true })), 'a retired key is dropped on read');
});

// ── preferences ────────────────────────────────────────────────────────────────

test('app prefs default to imperial, haptics/sound on, reduce-motion off, analytics on', () => {
  assert.deepEqual(APP_PREFS_DEFAULTS, {
    units: 'imperial',
    haptics: true,
    sound: true,
    reduceMotion: false,
    // P6-A1-D5: "Help improve Forge" defaults ON, with disclosure. Stored as an opt-OUT so that
    // absence — which is every athlete whose prefs were written before this field existed — lands on
    // the disclosed default rather than on a value nobody chose.
    analyticsOptOut: false,
  });
});

test('exactly the toggles with a real consumer today are marked live', () => {
  const live = EXPERIENCE_TOGGLES.filter((t) => t.live).map((t) => t.key);
  // SOUND became real when the rest timer got its ding (`lib/ding`, gated by `useSoundEnabled`) — it
  // fires on web and native alike. HAPTICS is still an intent with nothing behind it: the app has no
  // haptics layer, and the single vibration in the codebase is web-only. Marking it live would be the
  // settings screen claiming a capability the app does not have.
  assert.deepEqual(live, ['sound', 'reduceMotion'], 'haptics still has no consumer — do not claim it fires');
});

test('sanitizePrefs coerces each field and survives a malformed blob', () => {
  const p = sanitizePrefs({ units: 'metric', haptics: false, sound: 'loud', reduceMotion: true });
  assert.deepEqual(p, { units: 'metric', haptics: false, sound: true, reduceMotion: true, analyticsOptOut: false });
  assert.deepEqual(sanitizePrefs('nope'), APP_PREFS_DEFAULTS);
  assert.equal(sanitizePrefs({ units: 'stones' }).units, 'imperial', 'an unknown system falls back');
});

test('an opt-out survives every shape sanitizePrefs is handed', () => {
  // This is a consent decision, not a preference. Losing it silently re-enables collection for somebody
  // who said no — the one failure in this file that would make the privacy policy untrue.
  assert.equal(sanitizePrefs({ analyticsOptOut: true }).analyticsOptOut, true);
  // An unrelated screen writing prefs must not clear it.
  assert.equal(sanitizePrefs({ analyticsOptOut: true, units: 'metric' }).analyticsOptOut, true);
  // Absence is the disclosed default, not an opt-out — every athlete's stored blob predates this field.
  assert.equal(sanitizePrefs({ units: 'metric' }).analyticsOptOut, false);
  // A non-boolean is junk and falls back rather than being coerced truthy.
  assert.equal(sanitizePrefs({ analyticsOptOut: 'yes' }).analyticsOptOut, false);
});
