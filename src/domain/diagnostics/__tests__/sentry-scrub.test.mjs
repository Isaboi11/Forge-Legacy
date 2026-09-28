import test from 'node:test';
import assert from 'node:assert/strict';

import { dropBreadcrumb, scrubEvent, scrubSpan, scrubText, stripUrl } from '../sentry-scrub.ts';

/**
 * Sentry is a third party. `site/privacy.html` § Diagnostics → Sentry promises it never receives the step
 * trail, a name, an email, health data or typed text, and that search terms are cut from web addresses.
 * A failure in this file is not cosmetic — it is the app sending Sentry something the policy says it doesn't.
 */

const CTX = { flSession: '11111111-2222-4333-8444-555555555555', updateId: 'abcd1234-0000-4000-8000-000000000000' };
const UID = '9f3c1e2a-1b2c-4d3e-8f40-123456789abc';

// ── text ─────────────────────────────────────────────────────────────────────

test('a URL keeps its path and loses its query — a food search never reaches Sentry', () => {
  assert.equal(stripUrl('https://x.supabase.co/functions/v1/food-search?q=chicken%20breast&page=2'), 'https://x.supabase.co/functions/v1/food-search');
  assert.equal(stripUrl('https://x.supabase.co/rest/v1/food_logs#frag'), 'https://x.supabase.co/rest/v1/food_logs');
  assert.equal(stripUrl(undefined), '');
  assert.equal(
    scrubText('Network request failed: GET https://x.supabase.co/rest/v1/body_metrics?weight_kg=eq.82.5 (500)'),
    'Network request failed: GET https://x.supabase.co/rest/v1/body_metrics (500)',
  );
});

test('emails, JWTs and bearer tokens are cut from free text', () => {
  assert.equal(scrubText('no user isaiah@example.com found'), 'no user [email] found');
  assert.equal(scrubText('bad jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc_def'), 'bad jwt [token]');
  assert.equal(scrubText('header Bearer abcdefgh12345678'), 'header Bearer [token]');
});

test('database errors that echo a value lose the value, keep the fault', () => {
  assert.equal(
    scrubText('duplicate key value violates unique constraint "food_logs_pkey" Key (user_id, day)=(9f3c, 2026-09-28) already exists.'),
    'duplicate key value violates unique constraint "food_logs_pkey" Key (user_id, day)=([value]) already exists.',
  );
  assert.equal(scrubText('invalid input syntax for type integer: "12 reps"'), 'invalid input syntax for type integer: "[value]"');
  assert.equal(scrubText('invalid input syntax for type numeric: "abc"'), 'invalid input syntax for type numeric: "[value]"');
});

test('quoted PROSE goes; quoted identifiers and the words of the fault stay', () => {
  assert.equal(scrubText('Cannot read property \'name\' of undefined'), 'Cannot read property \'name\' of undefined');
  assert.equal(scrubText('column "reps" does not exist'), 'column "reps" does not exist');
  // The pair-by-pair rule: the words BETWEEN two quoted identifiers are not a quoted run.
  assert.equal(scrubText('relation "public.foo" and "bar" missing'), 'relation "public.foo" and "bar" missing');
  assert.equal(scrubText('Unknown food "grilled chicken breast"'), 'Unknown food "[text]"');
  assert.equal(scrubText("note: 'my left knee hurts' rejected"), "note: '[text]' rejected");
  assert.equal(scrubText(42), '');
  assert.ok(scrubText('x'.repeat(5000)).length <= 1000);
});

// ── spans ────────────────────────────────────────────────────────────────────

test('a performance span keeps timing and the path, never the query or a body', () => {
  const span = scrubSpan({
    description: 'GET https://x.supabase.co/rest/v1/food_logs?select=*&day=eq.2026-09-28',
    data: {
      'http.query': 'select=*&day=eq.2026-09-28',
      'http.fragment': 'x',
      url: 'https://x.supabase.co/rest/v1/food_logs?select=*',
      'http.url': 'https://world.openfoodfacts.org/api/v2/product/0123456789?fields=x',
      'route.params': { id: UID },
      'http.response.status_code': 200,
    },
  });
  assert.equal(span.description, 'GET https://x.supabase.co/rest/v1/food_logs');
  assert.equal(span.data.url, 'https://x.supabase.co/rest/v1/food_logs');
  assert.equal(span.data['http.url'], 'https://world.openfoodfacts.org/api/v2/product/0123456789');
  assert.equal(span.data['http.query'], undefined);
  assert.equal(span.data['http.fragment'], undefined);
  assert.equal(span.data['route.params'], undefined);
  assert.equal(span.data['http.response.status_code'], 200, 'the timing facts survive');
});

// ── events ───────────────────────────────────────────────────────────────────

test('an error event leaves with the account UUID only — no email, IP, request, extras or trail', () => {
  const event = scrubEvent(
    {
      user: { id: UID, email: 'a@b.co', ip_address: '1.2.3.4', username: 'isaiah' },
      request: { url: 'https://forgelegacy.expo.app/log-food?q=pizza', headers: { 'User-Agent': 'x' } },
      extra: { __serialized__: { details: 'weight 82.5' } },
      breadcrumbs: [{ category: 'console', message: 'food: pizza' }],
      server_name: "Isaiah's iPhone",
      contexts: { device: { name: "Isaiah's iPhone", model: 'iPhone16,2' }, state: { x: 1 }, response: { y: 1 } },
      exception: { values: [{ type: 'Error', value: 'no row for isaiah@example.com', stacktrace: { frames: [{ filename: 'src/a.ts', vars: { weight: 82.5 } }] } }] },
      message: { message: 'saved "chest day felt great"', params: ['x'] },
      transaction: '/log-food?date=2026-09-28',
      tags: { platform: 'ios' },
    },
    CTX,
  );
  assert.deepEqual(event.user, { id: UID });
  assert.equal(event.request, undefined);
  assert.equal(event.extra, undefined);
  assert.equal(event.server_name, undefined);
  assert.deepEqual(event.breadcrumbs, []);
  assert.equal(event.contexts.device.name, undefined);
  assert.equal(event.contexts.device.model, 'iPhone16,2', 'the model is configuration, not identity');
  assert.equal(event.contexts.state, undefined);
  assert.equal(event.contexts.response, undefined);
  assert.equal(event.exception.values[0].value, 'no row for [email]');
  assert.equal(event.exception.values[0].stacktrace.frames[0].vars, undefined);
  assert.equal(event.message.message, 'saved "[text]"');
  assert.equal(event.message.params, undefined);
  assert.equal(event.transaction, '/log-food');
  assert.deepEqual(event.tags, { platform: 'ios', fl_session: CTX.flSession, update_id: CTX.updateId });
});

test('a user that is not a bare UUID is dropped entirely, not half-sent', () => {
  assert.equal(scrubEvent({ user: { id: 'isaiah@example.com' } }, CTX).user, undefined);
  assert.equal(scrubEvent({ user: { ip_address: '{{auto}}' } }, CTX).user, undefined);
  assert.equal(scrubEvent({}, { flSession: null, updateId: null }).tags.fl_session, undefined);
});

test('a transaction event has every span scrubbed', () => {
  const ev = scrubEvent({ spans: [{ description: 'POST https://x/functions/v1/coach?msg=hi', data: { 'http.query': 'msg=hi' } }] }, CTX);
  assert.equal(ev.spans[0].description, 'POST https://x/functions/v1/coach');
  assert.equal(ev.spans[0].data['http.query'], undefined);
});

test('the scrubber never throws — a report it cannot clean is not a reason to crash the reporter', () => {
  const hostile = { get exception() { throw new Error('boom'); } };
  assert.doesNotThrow(() => scrubEvent(hostile, CTX));
  assert.doesNotThrow(() => scrubSpan({ get data() { throw new Error('boom'); } }));
  assert.equal(dropBreadcrumb(), null, 'Sentry never gets a breadcrumb');
});
