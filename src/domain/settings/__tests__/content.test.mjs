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
    /*
     * ⚠ WAS `=== 4`, "the design's 4 paragraphs", AND THAT COUNT WAS ENFORCING A DEFECT.
     *
     * The privacy document's four paragraphs claimed to list what the app collects and omitted precise
     * location, photos/video, and usage analytics — all three genuinely collected. The 2026-08-12 launch
     * audit flagged the omission (§4-3); this assertion would have failed the correction.
     *
     * A count is the wrong thing to pin on a document whose job is to be COMPLETE. Length is now a floor,
     * and the substance is asserted below.
     */
    assert.ok(doc.body.length >= 4, `${key} should carry at least the design's 4 paragraphs`);
    assert.ok(doc.body.every((p) => p.length > 40), `${key} has a stub paragraph`);
  }
  assert.ok(ABOUT_BODY.length >= 3);
});

/**
 * ⚠ THE COLLECTION LIST MUST NAME EVERYTHING SENSITIVE THE APP ACTUALLY TAKES.
 *
 * App Store Connect's App Privacy labels are a declaration Apple holds you to, and a label that
 * contradicts your own posted policy is worse than either error alone. These three are the categories
 * most likely to be forgotten, because none of them is what the product is *about*: precise location
 * (tracked runs), photos and video (progress and squad media), and product-usage analytics.
 *
 * ⚠ THIS IS THE IN-APP SUMMARY OF `site/privacy.html`, WHICH GOVERNS. Shorter by design, never different
 *   in substance — if the hosted document gains a category, this fails until it gains one too.
 */
test('the in-app privacy summary names location, media and analytics', () => {
  const text = LEGAL.privacy.body.join(' ').toLowerCase();
  assert.match(text, /location/, 'tracked runs read precise location — say so');
  assert.match(text, /photo|video/, 'progress photos and squad video are collected — say so');
  assert.match(text, /usage|analytics|events/, 'product-usage events are recorded — say so');
  assert.match(text, /delete/, 'App Store 5.1.1(v): in-app deletion exists and must be findable');
  // A collection list that says "only" is making a completeness claim it cannot keep as the app grows.
  assert.ok(!/\bonly what\b/.test(text), '"only what the app needs" is the phrasing that made this wrong');
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
  /*
   * ⚠ THIS ASSERTION WAS INVERTED BY 0171, AND THE INVERSION IS THE POINT.
   *
   * It used to read `!bare.some(s => s.key === 'privacy')` — an empty Privacy & Alerts section is not
   * shown. Correct while every row in it was flag-gated. **Blocked People is not gated**, so the section
   * can no longer be empty, and that is deliberate: blocking is reachable from a profile but UNBLOCKING is
   * not, because a blocked athlete's content and profile are gone from every surface. Without this row a
   * block is one-way in practice.
   *
   * App Store Guideline 1.2 requires the ability to block, and it is also the only screen where blocking is
   * visible to a reviewer without two accounts. Gating it behind a flag would reproduce the exact failure
   * 0171 exists to fix.
   */
  const barePrivacy = bare.find((s) => s.key === 'privacy');
  assert.ok(barePrivacy, 'Privacy & Alerts survives every flag being off, because Blocked People is ungated');
  assert.deepEqual(barePrivacy.rows.map((r) => r.key), ['blocked'], 'and it is the ONLY row left when the flags are off');
});

test('the full menu carries all three settings screens in the design’s order', () => {
  const full = settingsSections({ hasVisibility: true, hasNotifications: true, hasPreferences: true });
  assert.deepEqual(full.map((s) => s.key), ['privacy', 'training', 'membership', 'about', 'danger']);
  // Blocked People (0171) sits LAST in the group: the two above are things you configure, this is a list
  // you visit only when undoing something. It is ungated — see the note in the previous test.
  assert.deepEqual(
    full[0].rows.map((r) => r.key),
    ['vis', 'notif', 'blocked'],
    'Privacy & Alerts: Visibility, Notifications, then Blocked People',
  );
  assert.deepEqual(full[1].rows.map((r) => r.key), ['gym', 'prefs']);
});

// ── Send Feedback (the support-URL obligation) ──────────────────────────────

test('Send Feedback is reachable from settings, for every athlete, with no flag', () => {
  // ⚠ THIS IS THE GUARD AGAINST A SILENT ZERO. The `/feedback` screen and the `feedback` table can both
  //   be perfect while the dashboard reads "no feedback yet" — because nothing linked to the screen.
  //   That failure mode has already shipped here once: `notifications-live.ts`'s KINDS allow-list left
  //   two notification kinds invisible in /inbox for eleven migrations. An empty inbox and an unreachable
  //   screen look identical from the operator's chair, so the reachability is asserted, not assumed.
  //
  // It takes no option because it is not a feature flag: App Store Review requires a support path, and
  // one that appears only for some athletes is not a support path.
  for (const opts of [
    {},
    { hasVisibility: true, hasNotifications: true, hasPreferences: true },
    { hasVisibility: true, hasNotifications: true, hasPreferences: true, isAdmin: true },
  ]) {
    const rows = settingsSections(opts).flatMap((s) => s.rows);
    const feedback = rows.find((r) => r.key === 'feedback');
    assert.ok(feedback, `Send Feedback missing from ${JSON.stringify(opts)}`);
    assert.equal(feedback.label, 'Send Feedback');
    assert.deepEqual(feedback.action, { type: 'route', path: '/feedback' });
    assert.ok(!feedback.destructive, 'Send Feedback is not a destructive row');
  }
});

test('Send Feedback sits above About, in the Help & About section', () => {
  const menu = settingsSections({ hasVisibility: true, hasNotifications: true, hasPreferences: true });
  const about = menu.find((s) => s.key === 'about');
  assert.equal(about.label, 'Help & About', 'the section is where someone looks for help, and says so');
  assert.deepEqual(about.rows.map((r) => r.key), ['feedback', 'about'], 'the actionable row comes first');
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
  assert.deepEqual(menu.map((s) => s.key), ['privacy', 'training', 'membership', 'about', 'danger', 'operator']);

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
  // P-8's first entry context (§2.1): a push, so the screen draws a back chevron and popping returns here.
  assert.deepEqual(membership.rows[0].action, { type: 'route', path: '/subscription' });
  assert.ok(!s.some((x) => x.key === 'training' && x.rows.some((r) => r.key === 'sub')), 'never folded into Training');
});

test('the Subscription row names a tier only when one has been read', () => {
  // "Free while testing" was true while nothing could be bought, and becomes a claim about billing the
  // moment something can. Unresolved entitlement must render no value at all rather than pick a side —
  // the same `unknown ≠ blocked` discipline the cap gates run on (M-7 §10).
  const row = (tier) => settingsSections(tier ? { tier } : {}).find((s) => s.key === 'membership').rows[0];
  assert.equal(row(undefined).value, undefined, 'unresolved entitlement asserts nothing');
  assert.equal(row('FREE').value, 'Free');
  assert.equal(row('PREMIUM').value, 'Premium');
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


test('⚠ deleting your account is reachable from inside the app — App Store 5.1.1(v)', () => {
  /*
   * Not a feature: an app that lets you create an account MUST let you delete it in-app, and `LEGAL.terms`
   * has promised exactly that since it was written — "you may export or delete it at any time from Account
   * settings" — while no such control existed. The audit found the Terms describing a screen that did not.
   *
   * Asserted for every menu shape, because the row must not be one of the ones gated behind a flag.
   */
  for (const opts of [{}, { hasVisibility: true, hasNotifications: true, hasPreferences: true }, { isAdmin: true }]) {
    const menu = settingsSections(opts);
    const danger = menu.find((s) => s.key === 'danger');
    assert.ok(danger, `a delete path must exist for every menu shape (${JSON.stringify(opts)})`);
    assert.deepEqual(danger.rows.map((r) => r.key), ['delete']);
    assert.equal(danger.rows[0].action.type, 'deleteAccount');
    assert.equal(danger.rows[0].destructive, true, 'it must render as destructive, not as an ordinary row');
  }
});

test('the delete row sits in its own section, never beside an ordinary setting', () => {
  // A mis-tap must not be able to reach it from a list of harmless rows.
  const menu = settingsSections({ hasVisibility: true, hasNotifications: true, hasPreferences: true });
  const danger = menu.find((s) => s.key === 'danger');
  assert.equal(danger.rows.length, 1, 'nothing else may share the section');
  assert.equal(danger.label, 'Account');
  assert.ok(
    menu.every((s) => s.key === 'danger' || s.rows.every((r) => r.action.type !== 'deleteAccount')),
    'no other section may carry a delete action',
  );
});
