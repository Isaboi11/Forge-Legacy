import test from 'node:test';
import assert from 'node:assert/strict';

import {
  actionLabel,
  storeEventLabel,
  aiMargin,
  bytes,
  churnRate,
  followUpLabel,
  guessCategory,
  money,
  netEstimate,
  parseTags,
  pctText,
  productLabel,
  rate,
  storagePathFor,
  titleFromFile,
} from '../crm-core.ts';

test('money: whole dollars, cents under $100, tiny AI costs keep four digits, refunds signed', () => {
  assert.equal(money(1234), '$1,234');
  assert.equal(money(14.99), '$14.99');
  assert.equal(money(169.99), '$170');
  assert.equal(money(169.99, { cents: true }), '$169.99');
  assert.equal(money(0.0064), '$0.0064');
  assert.equal(money(0), '$0');
  assert.equal(money(-14.99), '−$14.99');
  assert.equal(money(null), '—');
});

test('rate: null on a zero denominator, never 0%', () => {
  assert.equal(rate(1, 3), 33.3);
  assert.equal(rate(0, 5), 0);
  assert.equal(rate(3, 0), null);
  assert.equal(pctText(null), '—');
  assert.equal(pctText(50), '50%');
  assert.equal(pctText(33.3), '33.3%');
});

test('net estimate is 85% of gross (Small Business Program)', () => {
  assert.equal(netEstimate(100), 85);
  assert.equal(netEstimate(169.99), 144.49);
});

test('churn: lapsed over (paying + lapsed); never above 100%', () => {
  assert.equal(churnRate(1, 9), 10);
  assert.equal(churnRate(5, 0), 100);
  assert.equal(churnRate(0, 0), null);
});

test('AI margin', () => {
  assert.deepEqual(aiMargin(20, 5), { margin: 15, pct: 75 });
  assert.deepEqual(aiMargin(0, 5), { margin: -5, pct: null });
});

test('bytes', () => {
  assert.equal(bytes(512), '512 B');
  assert.equal(bytes(1536), '1.5 KB');
  assert.equal(bytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(bytes(null), '—');
});

test('guessCategory puts common business files on the right shelf', () => {
  assert.equal(guessCategory('Forge Legacy LLC Operating Agreement.pdf'), 'legal');
  assert.equal(guessCategory('2026 taxes W-9.pdf'), 'finance');
  assert.equal(guessCategory('press-kit-logo.png'), 'marketing');
  assert.equal(guessCategory('Admin-Analytics-Architecture-v1.0.md'), 'spec');
  assert.equal(guessCategory('launch strategy.docx'), 'business');
  assert.equal(guessCategory('random.zip'), 'other');
});

test('titleFromFile', () => {
  assert.equal(titleFromFile('LLC_Operating-Agreement.v2.pdf'), 'LLC Operating Agreement v2');
  assert.equal(titleFromFile('.pdf'), '.pdf');
});

test('storagePathFor: category/yyyy-mm/rand-safe-name, no spaces or odd characters', () => {
  const p = storagePathFor('legal', 'My Contract (final) é.pdf', new Date(Date.UTC(2026, 8, 28)), 'ab12');
  assert.equal(p, 'legal/2026-09/ab12-My-Contract-final-e.pdf');
  assert.match(storagePathFor('other', '???', new Date(Date.UTC(2026, 0, 1)), 'x'), /^other\/2026-01\/x-file$/);
});

test('followUpLabel', () => {
  assert.deepEqual(followUpLabel('2026-09-27', '2026-09-28'), { text: 'follow up — 1 day overdue', overdue: true });
  assert.deepEqual(followUpLabel('2026-09-28', '2026-09-28'), { text: 'follow up today', overdue: true });
  assert.deepEqual(followUpLabel('2026-09-29', '2026-09-28'), { text: 'follow up tomorrow', overdue: false });
  assert.deepEqual(followUpLabel('2026-10-05', '2026-09-28'), { text: 'follow up in 7 days', overdue: false });
  assert.equal(followUpLabel(null, '2026-09-28'), null);
});

test('productLabel', () => {
  assert.equal(productLabel('premium_ai_annual_v1'), 'Premium AI · Annual');
  assert.equal(productLabel('earlybird_premium_monthly'), 'Early Bird Premium · Monthly');
  assert.equal(productLabel('something_else'), 'something_else');
});

test('actionLabel and storeEventLabel read as words; unknown values pass through readable', () => {
  assert.equal(actionLabel('form_check'), 'Form check');
  assert.equal(actionLabel('brand_new_thing'), 'brand new thing');
  assert.equal(storeEventLabel('INITIAL_PURCHASE'), 'First purchase');
  assert.equal(storeEventLabel('SOMETHING_NEW'), 'Something new');
});

test('parseTags', () => {
  assert.deepEqual(parseTags('Gym, #austin, gym,  influencer\nPodcast'), ['gym', 'austin', 'influencer', 'podcast']);
});
