import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * A FAILED SETTINGS READ IS NEVER THE ATHLETE'S SETTINGS (launch QA B12 / UX-003, 2026-11-09), through the real
 * `settings-live.ts`.
 *
 * `readColumn` answered the code DEFAULTS for any error. On qa1109-05 the server held Photos "Only me" and
 * Accomplishments "Friends"; with the visibility read failing, Profile Visibility showed "Friends" and
 * "Everyone", and the next tap on any row saved the whole map — the athlete's privacy widened by a network
 * blip, with no error on screen. Preferences and Notifications were overwritten the same way.
 *
 * What is held here:
 *   · a failed read THROWS; only a genuinely empty column (or no row) reads as defaults;
 *   · a one-key change merges onto the column as the SERVER holds it, and writes nothing if that read fails;
 *   · two quick changes both land;
 *   · the three screens show "Couldn't load" with Try Again instead of controls, and never write a map
 *     built from defaults.
 */

const { db, ATHLETE, supabase } = await import('./harness/fake-supabase.mjs');
const settings = await import('../settings-live.ts');
const { VISIBILITY_DEFAULTS } = await import('../../domain/settings/visibility.ts');
const { APP_PREFS_DEFAULTS } = await import('../../domain/settings/preferences.ts');
const { NOTIF_DEFAULTS } = await import('../../domain/settings/notifications.ts');
const { BRIEFING_DEFAULT } = await import('../../domain/settings/briefing.ts');

const REFUSED = { code: '57014', message: 'canceling statement due to statement timeout' };
const failReads = (table) => (t, mode) => (t === table && mode === 'select' ? REFUSED : null);
const profile = () => db.rows('profiles').find((r) => r.id === ATHLETE);
const writes = () => db.log.filter((l) => l.table === 'profiles' && l.mode === 'update');

/** The QA account's real choices: narrower than the defaults on exactly the rows that matter. */
function seed() {
  db.reset();
  db.rows('profiles').push({
    id: ATHLETE,
    visibility: { photos: 'private', accomplishments: 'friends', transformation: 'private' },
    app_prefs: { units: 'metric', analyticsOptOut: true },
    notif_prefs: { friend_requests: false },
  });
}

// ── reads ───────────────────────────────────────────────────────────────────

test('a failed read throws — it is never the defaults', async () => {
  seed();
  db.fail = failReads('profiles');
  await assert.rejects(() => settings.fetchVisibility(), (e) => e.code === '57014');
  await assert.rejects(() => settings.fetchAppPrefs(), (e) => e.code === '57014');
  await assert.rejects(() => settings.fetchNotifPrefs(), (e) => e.code === '57014');

  db.fail = null;
  db.offline = true;
  await assert.rejects(() => settings.fetchVisibility(), 'offline read the defaults as real');
});

test('a failed identity read throws too, rather than reading as nobody’s defaults', async () => {
  seed();
  const real = supabase.auth.getUser;
  supabase.auth.getUser = async () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
  try {
    await assert.rejects(() => settings.fetchVisibility(), (e) => e.name === 'AuthRetryableFetchError');
  } finally {
    supabase.auth.getUser = real;
  }
});

test('a read that lands answers what the server holds; only an empty column or no row is the defaults', async () => {
  seed();
  const vis = await settings.fetchVisibility();
  assert.equal(vis.photos, 'private');
  assert.equal(vis.accomplishments, 'friends');
  assert.equal(vis.chapter, VISIBILITY_DEFAULTS.chapter, 'a key never written is its default');

  profile().visibility = null;
  assert.deepEqual(await settings.fetchVisibility(), VISIBILITY_DEFAULTS);

  db.reset(); // no profile row at all
  assert.deepEqual(await settings.fetchAppPrefs(), APP_PREFS_DEFAULTS);
  assert.deepEqual(await settings.fetchNotifPrefs(), NOTIF_DEFAULTS);
});

// ── writes ──────────────────────────────────────────────────────────────────

test('⚠ changing one audience changes ONLY that one — Photos "Only me" survives a tap on another row', async () => {
  seed();
  await settings.patchVisibility({ stats: 'private' });
  assert.equal(profile().visibility.photos, 'private');
  assert.equal(profile().visibility.accomplishments, 'friends');
  assert.equal(profile().visibility.stats, 'private');
});

test('⚠ if the read under a change fails, NOTHING is written', async () => {
  seed();
  db.fail = failReads('profiles');
  await assert.rejects(() => settings.patchVisibility({ stats: 'private' }));
  await assert.rejects(() => settings.patchAppPrefs({ haptics: false }));
  await assert.rejects(() => settings.patchNotifPrefs({ squad_feed: false }));
  db.fail = null;

  assert.equal(writes().length, 0, 'a write went out over a column that was never read');
  assert.equal(profile().visibility.photos, 'private');
  assert.equal(profile().app_prefs.units, 'metric');
});

test('the analytics opt-out and every other preference survive a single change', async () => {
  seed();
  await settings.patchAppPrefs({ haptics: false });
  assert.equal(profile().app_prefs.units, 'metric', 'units went back to the default');
  assert.equal(profile().app_prefs.analyticsOptOut, true, 'the analytics opt-out was undone');
  assert.equal(profile().app_prefs.haptics, false);

  await settings.patchNotifPrefs({ squad_feed: false });
  assert.equal(profile().notif_prefs.friend_requests, false);
  assert.equal(profile().notif_prefs.squad_feed, false);
});

test('two quick changes both land — the second never puts back what the first changed', async () => {
  seed();
  await Promise.all([settings.patchVisibility({ stats: 'private' }), settings.patchVisibility({ timeline: 'friends' })]);
  assert.equal(profile().visibility.stats, 'private');
  assert.equal(profile().visibility.timeline, 'friends');
  assert.equal(profile().visibility.photos, 'private');
});

// ── the briefing schedule ───────────────────────────────────────────────────

test('briefing: a failed read throws; an absent row or a missing table is the default schedule', async () => {
  seed();
  db.rows('briefing_schedule').push({ athlete_id: ATHLETE, days: [1, 3], hour: 9 });
  assert.deepEqual(await settings.fetchBriefing(), { days: [1, 3], hour: 9 });

  db.fail = failReads('briefing_schedule');
  await assert.rejects(() => settings.fetchBriefing(), (e) => e.code === '57014');

  db.fail = (t, mode) => (t === 'briefing_schedule' && mode === 'select' ? { code: 'PGRST205', message: 'Could not find the table' } : null);
  assert.deepEqual(await settings.fetchBriefing(), BRIEFING_DEFAULT);

  db.fail = null;
  db.tables.delete('briefing_schedule');
  assert.deepEqual(await settings.fetchBriefing(), BRIEFING_DEFAULT);
});

// ── the screens ─────────────────────────────────────────────────────────────

const code = (p) =>
  readFileSync(new URL(p, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/ .*$/gm, '');

const SCREENS = [
  ['Profile Visibility', '../../app/profile-visibility.tsx', /patchVisibility\(\{ \[k\]: id \}\)/],
  ['Preferences', '../../app/preferences.tsx', /patchAppPrefs\(\{ \.\.\.patch, theme: activeTheme\(\) \}\)/],
  ['Notifications', '../../app/notifications.tsx', /patchNotifPrefs\(patch\)/],
];

for (const [label, path, patchCall] of SCREENS) {
  test(`${label}: a failed read shows "Couldn’t load" with Try Again, not controls`, () => {
    const src = code(path);
    assert.match(src, /<NotFoundBody title="Couldn’t load your [^"]+\." reason=\{[^}]+\} onRetry=\{\w+\}/, 'no error state with a retry');
    // The error branch sits between the spinner and the controls — the ScrollView is the third arm.
    const spinner = src.indexOf('<ActivityIndicator');
    const failed = src.indexOf('<NotFoundBody');
    const controls = src.indexOf('<ScrollView');
    assert.ok(spinner > 0 && spinner < failed && failed < controls, 'the controls can render before or instead of the error state');
  });

  test(`${label}: a change writes one key through patch…, never a map built from defaults`, () => {
    const src = code(path);
    assert.match(src, patchCall, 'the single-key write is gone');
    assert.doesNotMatch(src, /save(Visibility|AppPrefs|NotifPrefs)\(\{\s*\.\.\.(VISIBILITY_DEFAULTS|APP_PREFS_DEFAULTS|NOTIF_DEFAULTS),\s*\.\.\./, 'a write spreads the defaults under the screen’s copy again');
    assert.doesNotMatch(src, /saveAppPrefs\(|saveNotifPrefs\(/, 'a whole-column write is back on this screen');
  });
}

test('Profile Visibility still writes the whole map in exactly one place — the confirmed Reset', () => {
  const src = code('../../app/profile-visibility.tsx');
  assert.equal(src.match(/saveVisibility\(/g)?.length, 1);
  assert.match(src, /saveVisibility\(\{ \.\.\.VISIBILITY_DEFAULTS \}\)/);
});

test('the app-wide settings provider retries a failed read instead of serving it as loaded', () => {
  const src = code('../../lib/settings.tsx');
  assert.match(src, /const \{ data, error, refetch \} = useQuery<AppPrefs>/);
  assert.match(src, /if \(uid == null \|\| error == null\) return;\s*const t = setTimeout\(refetch, \d+\);/);
  assert.match(src, /loaded: data != null/, '`loaded` must mean a real read landed');
});
