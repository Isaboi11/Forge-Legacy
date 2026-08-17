import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  AI_DISCLOSURE,
  AUTO_RENEWAL_NOTE,
  COMPARISON_KEYS,
  FOUNDER_SEATS_TOTAL,
  PLAN_ORDER,
  REASSURANCE,
  capPhrase,
  comparisonRows,
  defaultSelection,
  founderSeatLine,
  orderPlans,
  premiumBenefitLines,
  premiumPhrase,
  renews,
  savingLabel,
  savingPercent,
  usageRows,
} from '../plans-core.ts';

/**
 * P-8's plan picker.
 *
 * Every rule the wireframe spec numbers — annual pre-selected, lifetime never pre-selected, the Founder
 * row hidden unless the count is real, the saving computed rather than typed, "5 squads" not "unlimited
 * squads" — is a claim made on the screen that takes money. Being wrong about one of them is a false
 * statement about a commercial transaction, not a UI bug, so they are pinned here rather than trusted.
 */

const plan = (slot, amount, currency = 'USD', priceLabel = `[${slot}]`, pricePerMonthLabel = null) => ({
  slot,
  priceLabel,
  pricePerMonthLabel,
  amount,
  currency,
});

const ANNUAL = plan('annual', 99.99);
const MONTHLY = plan('monthly', 12.99);
const LIFETIME = plan('lifetime', 299);
const FOUNDER = plan('founder', 149);
const ALL = [LIFETIME, FOUNDER, MONTHLY, ANNUAL]; // deliberately out of order

const FREE_CAPS = {
  programs: 3,
  short_programs: 3,
  photos: 75,
  videos: 5,
  squads: 1,
  templates: 5,
  imports: 1,
  holt_programs: 1,
  holt_days_per_month: 2,
  holt_in_workout: 0,
};

const PAID_CAPS = {
  programs: 500,
  short_programs: -1,
  photos: 1000,
  videos: 100,
  squads: 5,
  templates: -1,
  imports: -1,
  holt_programs: -1,
  holt_days_per_month: -1,
  holt_in_workout: -1,
};

// ── ordering and selection ───────────────────────────────────────────────────

test('rows render in the locked order, whatever order the store returned them in', () => {
  const rows = orderPlans(ALL, 68).map((p) => p.slot);
  assert.deepEqual(rows, ['annual', 'monthly', 'founder', 'lifetime']);
  assert.deepEqual(rows, [...PLAN_ORDER]);
});

test('lifetime is last — the largest commitment is offered, never led with (P8W-D8)', () => {
  const rows = orderPlans(ALL, 68).map((p) => p.slot);
  assert.equal(rows[rows.length - 1], 'lifetime');
  assert.equal(rows[0], 'annual');
});

test('the Founder row is hidden unless the seat count is BOTH read and positive (P8W-D5)', () => {
  const slots = (seats) => orderPlans(ALL, seats).map((p) => p.slot);

  // ⚠ null is "the server could not be asked", and it is the case that matters. An unverifiable scarcity
  // claim is worse than no claim — and selling seat 101 is a deceptive practice, not a rounding error.
  assert.ok(!slots(null).includes('founder'), 'unreadable count must not render a guess');
  assert.ok(!slots(0).includes('founder'), 'seats gone — the SKU is delisted (MA3-D24)');
  assert.ok(slots(1).includes('founder'), 'one seat left still renders');
  assert.ok(slots(68).includes('founder'));
});

test('a misconfigured offering with two annual packages still draws one annual row', () => {
  const rows = orderPlans([ANNUAL, plan('annual', 89.99), MONTHLY], null);
  assert.equal(rows.filter((p) => p.slot === 'annual').length, 1);
  assert.equal(rows[0].amount, 99.99, 'the first one wins, deterministically');
});

test('slots the store did not return simply do not render', () => {
  assert.deepEqual(orderPlans([MONTHLY], 68).map((p) => p.slot), ['monthly']);
  assert.deepEqual(orderPlans([], 68), []);
});

test('annual is pre-selected on every mount, and lifetime never is (P8W-D2, P8W-D8)', () => {
  assert.equal(defaultSelection(orderPlans(ALL, 68)), 'annual');

  // A pre-selected three-figure one-off charge is a dark pattern. When annual is gone the fallback is the
  // other renewing cadence — never the big one, and never Founder either.
  assert.equal(defaultSelection(orderPlans([LIFETIME, FOUNDER, MONTHLY], 68)), 'monthly');
  assert.equal(defaultSelection(orderPlans([LIFETIME, FOUNDER], 68)), null);
  assert.equal(defaultSelection([]), null, 'nothing selected means the buy button has nothing to do');
});

// ── the saving ───────────────────────────────────────────────────────────────

test('the annual saving is computed from platform prices (P8W-D3)', () => {
  // 99.99 against 12 × 12.99 = 155.88 → 35.85%, rounded.
  assert.equal(savingPercent(ANNUAL, MONTHLY), 36);
  assert.equal(savingLabel(savingPercent(ANNUAL, MONTHLY)), 'Save 36%');
});

test('the saving renders NOTHING rather than a claim it cannot stand behind (P8W-D3)', () => {
  assert.equal(savingPercent(undefined, MONTHLY), null, 'no annual price to compare');
  assert.equal(savingPercent(ANNUAL, undefined), null, 'no monthly price to compare');
  assert.equal(savingPercent(ANNUAL, plan('monthly', 12.99, 'EUR')), null, 'cross-currency ratio is meaningless');
  assert.equal(savingPercent(ANNUAL, plan('monthly', 0)), null);
  assert.equal(savingPercent(ANNUAL, plan('monthly', Number.NaN)), null);
  assert.equal(savingPercent(plan('annual', 200), MONTHLY), null, 'annual dearer — there is no saving to announce');
  assert.equal(savingPercent(plan('annual', 155.88), MONTHLY), null, 'exactly equal is not a saving');
  assert.equal(savingLabel(null), null, 'and null renders nothing at all');
});

// ── the Founder counter ──────────────────────────────────────────────────────

test('the Founder denominator matches what the server actually enforces', () => {
  /*
   * ⚠ THE ONE NUMBER ON THIS SCREEN THAT IS A PROMISE RATHER THAN A CAP.
   *
   * MA3-D24 makes selling the 101st seat a deceptive practice, and `claim_founder_seat()` raises past
   * `entitlement_config.founder_seats_total`. If the client's denominator ever drifts from the server's
   * total, "68 of 100 left" becomes a false scarcity claim — so this reads the migration rather than
   * trusting two numbers to stay equal by hand.
   */
  const sql = readFileSync(new URL('../../../../supabase/migrations/0145_entitlement.sql', import.meta.url), 'utf8');
  const m = sql.match(/founder_seats_total\s+int\s+not\s+null\s+default\s+(\d+)/);
  assert.ok(m, 'founder_seats_total is no longer declared the way this guard reads it — re-check 0145');
  assert.equal(Number(m[1]), FOUNDER_SEATS_TOTAL);
});

test('the seat line reads as the spec writes it', () => {
  assert.equal(founderSeatLine(68), '68 of 100 left');
  assert.equal(founderSeatLine(1), '1 of 100 left');
  assert.equal(founderSeatLine(-3), '0 of 100 left', 'a nonsense count never renders as negative scarcity');
});

// ── the comparison table ─────────────────────────────────────────────────────

test('every number in the comparison comes from config, and pluralises with it (MA3-D16, M7-D14)', () => {
  assert.equal(capPhrase('photos', 75), '75 photos');
  assert.equal(capPhrase('squads', 1), '1 squad');
  assert.equal(capPhrase('squads', 5), '5 squads');
  assert.equal(capPhrase('holt_days_per_month', 2), '2 Coach Holt days a month');
  assert.equal(capPhrase('holt_programs', 1), '1 Coach Holt program');
  assert.equal(capPhrase('imports', 1), '1 lifetime import');
  assert.equal(capPhrase('imports', -1), 'Unlimited imports', 'not "Unlimited lifetime imports"');
  assert.equal(capPhrase('programs', -1), 'Unlimited programs');
});

test('in-workout Holt is a capability, not a quantity', () => {
  // "0 Coach Holt in-workouts" is not a sentence, and running it through the plural path would produce one.
  assert.equal(capPhrase('holt_in_workout', 0), 'No Coach Holt mid-workout');
  assert.equal(capPhrase('holt_in_workout', -1), 'Coach Holt in your workout');
});

test('Premium never claims unlimited squads (M7-D15)', () => {
  /*
   * `paid_caps` mixes abuse guards with a real product ceiling. 500 programs is a backstop no legitimate
   * athlete reaches, so the honest claim is "Unlimited programs". 5 squads is genuinely the ceiling, it is
   * stated to the athlete on purpose, and promising "unlimited" on a purchase surface would be a false
   * claim about what the tier delivers.
   */
  assert.equal(premiumPhrase('squads', 5), '5 squads');
  assert.equal(premiumPhrase('programs', 500), 'Unlimited programs');
  assert.equal(premiumPhrase('photos', 1000), 'Unlimited photos');

  const premium = comparisonRows(FREE_CAPS, PAID_CAPS).map((r) => r.premium).join(' ');
  assert.ok(!/unlimited squads/i.test(premium));
  assert.ok(/5 squads/.test(premium));
});

test('the comparison is the six locked rows, both columns from config', () => {
  const rows = comparisonRows(FREE_CAPS, PAID_CAPS);
  assert.deepEqual(rows.map((r) => r.key), [...COMPARISON_KEYS]);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[0], { key: 'programs', free: '3 programs', premium: 'Unlimited programs' });
  assert.deepEqual(rows[2], { key: 'squads', free: '1 squad', premium: '5 squads' });
});

test('no config means no table — never a half-true one', () => {
  assert.deepEqual(comparisonRows(null, PAID_CAPS), []);
  assert.deepEqual(comparisonRows(FREE_CAPS, null), []);
  assert.deepEqual(premiumBenefitLines(null), []);
  assert.deepEqual(usageRows(null, null), []);
});

// ── benefits ─────────────────────────────────────────────────────────────────

test('the benefits list is built features only (P-8 §8)', () => {
  const lines = premiumBenefitLines(PAID_CAPS);
  const text = lines.map((b) => b.line).join(' | ');

  assert.equal(lines.length, 5);
  // Keyed to the cap that makes each one true, so the screen can pair copy to a row without counting.
  assert.deepEqual(lines.map((b) => b.key), ['photos', 'programs', 'squads', 'imports', 'holt_programs']);
  assert.match(text, /including in your workout/, 'the in-workout half is the recurring reason to pay');
  assert.match(text, /5 squads/);

  // Analytics, Communities, premium share layouts and the Legacy export book are all part of Premium's
  // long-term definition and none of them exist. Showing one as a current benefit on the screen that
  // takes the money is the overpromise §8 forbids.
  for (const unbuilt of [/analytic/i, /communit/i, /dashboard/i, /recap/i, /export/i, /before.?after/i]) {
    assert.ok(!unbuilt.test(text), `benefits promise something unbuilt: ${unbuilt}`);
  }
});

test('the in-workout clause drops when the tier does not carry it', () => {
  const lines = premiumBenefitLines({ ...PAID_CAPS, holt_in_workout: 0 });
  assert.ok(!lines.map((b) => b.line).join(' ').includes('including in your workout'));
});

// ── usage ────────────────────────────────────────────────────────────────────

test('usage shows proximity, and spends read as spent', () => {
  const usage = {
    programs: 2,
    shortPrograms: 0,
    photos: 38,
    videos: 0,
    squads: 1,
    templates: 0,
    imports: 1,
    holtPrograms: 0,
    holtDays: 1,
  };
  const rows = usageRows(FREE_CAPS, usage);
  const by = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  assert.equal(by.programs, '2 of 3');
  assert.equal(by.photos, '38 of 75');
  // ⚠ A fraction for squads, "Used" for the import — the spec's own usage block shows both, and the
  // difference is real: a squad is a thing you hold, the free import is a boolean wearing a counter's
  // clothes.
  assert.equal(by.squads, '1 of 1');
  assert.equal(by.imports, 'Used');
  assert.equal(by.holt_programs, 'Available');
  assert.equal(by.holt_days_per_month, '1 of 2');
});

test('a raised one-shot allowance stops reading as a boolean', () => {
  const usage = { programs: 0, shortPrograms: 0, photos: 0, videos: 0, squads: 0, templates: 0, imports: 1, holtPrograms: 2, holtDays: 0 };
  const rows = usageRows({ ...FREE_CAPS, holt_programs: 4 }, usage);
  assert.equal(rows.find((r) => r.key === 'holt_programs').value, '2 of 4');
});

// ── locked copy ──────────────────────────────────────────────────────────────

test('the Coach AI disclosure is verbatim (P8W-D4)', () => {
  // A legal requirement, not copy. A buyer who pays for "lifetime" and later finds a feature needs
  // another subscription is the classic deceptive-practices fact pattern.
  assert.equal(AI_DISCLOSURE, 'The app and your legacy, forever. Coach AI is a separate subscription.');
});

test('Never Charge For History is restated identically, not paraphrased', () => {
  assert.equal(REASSURANCE, 'Everything you’ve already built is yours — forever.');
});

test('the auto-renewal note is clear of the five banned claims, and only shown where it is true', () => {
  // The sentence that shipped to testers was banned for asserting a subscription that did not exist —
  // not for describing one that does. Disclosing renewal terms before purchase is required; saying it of
  // Lifetime or Founder, which renew nothing, would be false.
  for (const claim of [/renews? yearly/i, /billing is handled/i, /next charge/i, /\bcancel at any time\b/i]) {
    assert.ok(!claim.test(AUTO_RENEWAL_NOTE), `auto-renewal note reuses a banned claim: ${claim}`);
  }
  assert.equal(renews('annual'), true);
  assert.equal(renews('monthly'), true);
  assert.equal(renews('lifetime'), false);
  assert.equal(renews('founder'), false);
  assert.equal(renews(null), false);
});

// ── the §9 grep, as a test ───────────────────────────────────────────────────

test('no price string is hardcoded anywhere in the P-8 surface (P-8 §80, §11.6)', () => {
  /*
   * The wireframe's own validation list says to grep for every launch price and expect zero hits. Doing
   * it by hand is a step somebody skips; doing it here means the release cannot be cut with a stale price
   * baked into the bundle. Six SKUs make a hardcoded price six times as likely to be wrong.
   *
   * The SKU identifiers carry their price in their name (`premium_annual_9999`), which is why they live
   * in the RevenueCat dashboard and are banned here too — importing one would smuggle a price past a
   * grep that only looks for currency.
   */
  const files = ['../plans-core.ts', '../../../lib/billing.ts', '../../../app/subscription.tsx'];
  const banned = [
    { re: /\$\d/, why: 'a literal currency amount' },
    { re: /\b\d+\.99\b/, why: 'a launch price' },
    { re: /premium_(monthly|annual|lifetime)_\d/, why: 'a SKU identifier, which carries its price' },
    { re: /founder_lifetime_\d/, why: 'a SKU identifier, which carries its price' },
    { re: /coach_ai_(monthly|annual)_\d/, why: 'a SKU identifier, which carries its price' },
  ];

  for (const f of files) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    // Comments explain the rule and legitimately name the SKUs; the rule is about shipped code.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const { re, why } of banned) {
      assert.ok(!re.test(code), `${f} contains ${why} — ${re}`);
    }
  }
});
