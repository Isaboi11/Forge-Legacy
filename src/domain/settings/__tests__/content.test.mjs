import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABOUT_BODY,
  forgingSince,
  LEGAL,
  rankLine,
  settingsSections,
  SIGN_OUT_CONFIRM,
  versionFooter,
  versionLine,
} from '../content.ts';

// ── legal content ───────────────────────────────────────────────────────────

test('all three legal documents carry a host, title, updated line and real body', () => {
  for (const key of ['terms', 'privacy', 'membership']) {
    const doc = LEGAL[key];
    assert.ok(doc, `${key} is missing`);
    assert.match(doc.host, /^forgelegacy\.app\//, `${key} host`);
    assert.ok(doc.title.length > 0);
    assert.ok(doc.updated.length > 0);
    assert.equal(doc.body.length, 4, `${key} should carry the design's 4 paragraphs`);
    assert.ok(doc.body.every((p) => p.length > 40), `${key} has a stub paragraph`);
  }
  assert.ok(ABOUT_BODY.length >= 3);
});

test('the sign-out confirm warns about losing device access, not about losing data', () => {
  assert.match(SIGN_OUT_CONFIRM.message, /sign back in/i);
  assert.ok(!/delete|lose|erase/i.test(SIGN_OUT_CONFIRM.message), 'signing out destroys nothing — do not imply it does');
});

// ── version ─────────────────────────────────────────────────────────────────

test('the version line reports the real build, and degrades rather than lying', () => {
  assert.equal(versionLine('1.0.0', 318), 'Forge Legacy 1.0.0 (build 318)');
  assert.equal(versionLine('1.0.0'), 'Forge Legacy 1.0.0', 'no build number — say nothing, invent nothing');
  assert.equal(versionLine('1.0.0', null), 'Forge Legacy 1.0.0');
  assert.equal(versionLine(null), 'Forge Legacy dev');
  assert.equal(versionLine('  '), 'Forge Legacy dev');
  assert.ok(!versionLine('1.0.0', 318).includes('2.4.1'), 'the design’s 2.4.1 is placeholder copy, not our version');
});

test('the footer version follows the design’s "Version X · Build Y" shape with real values', () => {
  assert.equal(versionFooter('1.0.0', 318), 'Version 1.0.0 · Build 318');
  assert.equal(versionFooter('1.0.0'), 'Version 1.0.0', 'no build — no dangling separator');
  assert.equal(versionFooter(null), 'Version dev');
  assert.ok(!versionFooter('1.0.0', 318).includes('2.4.1'));
});

// ── section map ─────────────────────────────────────────────────────────────

test('a row is never offered for a screen that is switched off', () => {
  const bare = settingsSections({});
  const keys = bare.flatMap((s) => s.rows.map((r) => r.key));
  assert.ok(!keys.includes('vis'), 'Profile Visibility gated off');
  assert.ok(!keys.includes('notif'), 'Notifications gated off');
  assert.ok(!keys.includes('prefs'), 'Preferences gated off');
  assert.ok(keys.includes('gym'), 'My Home Gym is always built, so it is always offered');
  assert.ok(!bare.some((s) => s.key === 'privacy'), 'an empty Privacy & Alerts section is not shown');
});

test('the full menu carries all three settings screens in the design’s order', () => {
  const full = settingsSections({ hasVisibility: true, hasNotifications: true, hasPreferences: true });
  assert.deepEqual(full.map((s) => s.key), ['privacy', 'training', 'membership', 'about']);
  assert.deepEqual(full[0].rows.map((r) => r.key), ['vis', 'notif'], 'Privacy & Alerts: Visibility then Notifications');
  assert.deepEqual(full[1].rows.map((r) => r.key), ['gym', 'prefs']);
});

// ── the operator row (0129/0130) ────────────────────────────────────────────

test('the Creator Dashboard row CANNOT appear for a normal athlete', () => {
  // The flag arrives from an async `isAppAdmin()` that returns false while loading and on error. This
  // asserts the two ways that value reaches the factory produce a menu byte-identical to today's — so
  // a defaulting mistake cannot leak an operator row into every athlete's settings.
  const base = { hasVisibility: true, hasNotifications: true, hasPreferences: true };
  const omitted = settingsSections({ ...base });
  const explicitlyFalse = settingsSections({ ...base, isAdmin: false });

  assert.deepEqual(explicitlyFalse, omitted, 'isAdmin:false must be identical to isAdmin omitted');
  for (const menu of [omitted, explicitlyFalse]) {
    assert.ok(!menu.some((s) => s.key === 'operator'), 'no Operator section');
    assert.ok(!menu.flatMap((s) => s.rows).some((r) => r.key === 'admin'), 'no admin row');
    assert.ok(
      !menu.flatMap((s) => s.rows).some((r) => r.action.type === 'route' && r.action.path === '/admin'),
      'nothing routes to /admin',
    );
  }
});

test('an admin gets the row, last, in its own section', () => {
  const menu = settingsSections({ hasVisibility: true, hasNotifications: true, hasPreferences: true, isAdmin: true });
  assert.deepEqual(menu.map((s) => s.key), ['privacy', 'training', 'membership', 'about', 'operator']);

  const operator = menu[menu.length - 1];
  assert.equal(operator.label, 'Operator', 'it reads as an operator tool, not one of the athlete’s settings');
  assert.deepEqual(operator.rows.map((r) => r.key), ['admin']);
  assert.equal(operator.rows[0].label, 'Creator Dashboard');
  assert.deepEqual(operator.rows[0].action, { type: 'route', path: '/admin' });
});

test('the operator row changes nothing else about the menu', () => {
  const base = { hasVisibility: true, hasNotifications: true, hasPreferences: true };
  const off = settingsSections({ ...base });
  const on = settingsSections({ ...base, isAdmin: true });
  assert.deepEqual(on.slice(0, off.length), off, 'the athlete’s own sections are untouched');
});

test('Membership stays its own group — billing is a different mental model', () => {
  const s = settingsSections({});
  const membership = s.find((x) => x.key === 'membership');
  assert.equal(membership.rows.length, 1);
  assert.equal(membership.rows[0].value, 'Free while testing');
  assert.deepEqual(membership.rows[0].action, { type: 'sheet', key: 'membership' });
  assert.ok(!s.some((x) => x.key === 'training' && x.rows.some((r) => r.key === 'sub')), 'never folded into Training');
});

test('the membership sheet claims no billing that does not exist', () => {
  // Shipped design-comp copy told every tester they held a Founder plan that "renews yearly" and was
  // "billed through your app store". There is no entitlement, no billing integration and no such tier —
  // an inaccurate subscription disclosure (App Store 3.1.2) shown to the exact cohort we intend to charge.
  const text = LEGAL.membership.body.join(' ') + ' ' + LEGAL.membership.updated;
  for (const claim of [/renews? yearly/i, /billing is handled/i, /next charge/i, /\bcancel at any time\b/i, /\bFounder\b/]) {
    assert.ok(!claim.test(text), `membership copy still asserts: ${claim}`);
  }
  assert.match(text, /free while we’re testing/i, 'says what is actually true');
});

test('the home gym row round-trips back to settings', () => {
  const gym = settingsSections({}).find((s) => s.key === 'training').rows[0];
  assert.equal(gym.action.type, 'route');
  assert.match(gym.action.path, /return=/, 'without a return the editor would strand the athlete');
  assert.match(decodeURIComponent(gym.action.path), /\/account-settings/);
});

test('the home gym row shows its summary when there is one', () => {
  assert.equal(settingsSections({ homeGymSummary: '7 items' }).find((s) => s.key === 'training').rows[0].value, '7 items');
  assert.equal(settingsSections({}).find((s) => s.key === 'training').rows[0].value, undefined);
});

// ── identity lines (P-1 orphans rehomed here) ───────────────────────────────

test('forging since renders a month and year, and nothing at all without a date', () => {
  assert.equal(forgingSince('2025-03-14T10:00:00Z'), 'Forging since March 2025');
  assert.equal(forgingSince(null), null);
  assert.equal(forgingSince(''), null);
  assert.equal(forgingSince('not-a-date'), null, 'a bad timestamp must not render "Forging since Invalid Date"');
});

test('the rank line omits what is unset rather than inventing a tier', () => {
  assert.equal(rankLine('architect', 4), 'Architect · IV');
  assert.equal(rankLine('FOUNDATION', 1), 'Foundation · I');
  assert.equal(rankLine('architect', null), 'Architect', 'no level — show the family alone');
  assert.equal(rankLine('architect', 9), 'Architect', 'out of range is not a tier');
  assert.equal(rankLine(null, 4), null, 'no family — no rank line at all');
});
