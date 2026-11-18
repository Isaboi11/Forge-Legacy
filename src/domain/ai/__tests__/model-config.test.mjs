import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

import { choiceFromRow, MODEL_CONFIG_FAIL_TTL_MS, modelConfigReader, uidFromAuthorization } from '../model-config.ts';
import { EFFORTS, KNOWN_MODELS } from '../model-request.ts';

/*
 * PL-7 (Sprint 3b, contract §1.2): which model a function runs comes from coach_ai_model_config (0274), read with the
 * service role, kept ~60 s — and ANY failure runs the function's in-code default. Never a dead function.
 */

const DFLT = { model: 'claude-sonnet-5', effort: 'low' };
const UID = '0b9a3c1e-2f4d-4e5a-9b6c-7d8e9f0a1b2c';
const jwt = (payload) => `Bearer h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;

function harness(answers, { serviceKey = 'svc', url = 'https://x.supabase.co' } = {}) {
  let t = 0;
  const calls = [];
  const reader = modelConfigReader({
    url,
    serviceKey,
    known: KNOWN_MODELS,
    efforts: EFFORTS,
    now: () => t,
    fetch: async (u, init) => {
      calls.push({ u, init });
      const a = answers.shift();
      if (a instanceof Error) throw a;
      return { ok: a?.ok ?? true, json: async () => a?.body };
    },
  });
  return { reader, calls, tick: (ms) => (t += ms) };
}

test('a config row runs its model and effort; the read is the service-role RPC with the athlete', async () => {
  const h = harness([{ body: [{ model: 'claude-haiku-5-5', effort: 'low', canary: false }] }]);
  const c = await h.reader.pick('coach-author', UID, DFLT);
  assert.deepEqual(c, { model: 'claude-haiku-5-5', effort: 'low', canary: false, source: 'config' });
  assert.equal(h.calls[0].u, 'https://x.supabase.co/rest/v1/rpc/coach_ai_model_pick');
  assert.equal(h.calls[0].init.headers.apikey, 'svc');
  assert.equal(h.calls[0].init.headers.Authorization, 'Bearer svc');
  assert.deepEqual(JSON.parse(h.calls[0].init.body), { p_fn: 'coach-author', p_uid: UID });
});

test('no row, a failed read, a thrown fetch, junk, an unknown model or effort → the in-code default', async () => {
  const cases = [
    [{ body: [] }, 'default_no_row'],
    [{ body: null }, 'default_no_row'],
    [{ ok: false, body: { message: 'permission denied' } }, 'default_read_failed'],
    [new TypeError('fetch failed'), 'default_read_failed'],
    [{ body: [{ model: 'gpt-4', effort: 'low' }] }, 'default_invalid'],
    [{ body: [{ model: 'claude-haiku-4-5-20251001', effort: null }] }, 'default_invalid'],
    [{ body: [{ model: 'claude-sonnet-5-5', effort: 'turbo' }] }, 'default_invalid'],
  ];
  for (const [answer, source] of cases) {
    const h = harness([answer]);
    const c = await h.reader.pick('coach-kitchen', UID, DFLT);
    assert.deepEqual(c, { ...DFLT, canary: false, source }, JSON.stringify(answer));
  }
});

test('no service key (or URL) → the default, and nothing is fetched', async () => {
  const h = harness([], { serviceKey: '' });
  assert.deepEqual(await h.reader.pick('coach-ask', UID, DFLT), { ...DFLT, canary: false, source: 'default' });
  assert.equal(h.calls.length, 0);
});

test('kept 60 s per function and athlete; a failure only 10 s', async () => {
  const h = harness([
    { body: [{ model: 'claude-sonnet-5-5', effort: 'low', canary: true }] },
    { body: [{ model: 'claude-sonnet-5', effort: 'low', canary: false }] },
  ]);
  await h.reader.pick('coach-ask', UID, DFLT);
  h.tick(59_000);
  assert.equal((await h.reader.pick('coach-ask', UID, DFLT)).model, 'claude-sonnet-5-5');
  assert.equal(h.calls.length, 1);
  h.tick(2_000);
  assert.equal((await h.reader.pick('coach-ask', UID, DFLT)).model, 'claude-sonnet-5');
  assert.equal(h.calls.length, 2);

  const f = harness([new TypeError('down'), { body: [{ model: 'claude-haiku-5-5', effort: 'low' }] }]);
  assert.equal((await f.reader.pick('coach-author', UID, DFLT)).source, 'default_read_failed');
  f.tick(MODEL_CONFIG_FAIL_TTL_MS - 1);
  assert.equal((await f.reader.pick('coach-author', UID, DFLT)).source, 'default_read_failed', 'still cached');
  f.tick(2);
  assert.equal((await f.reader.pick('coach-author', UID, DFLT)).model, 'claude-haiku-5-5', 'healed');
});

test('the canary flag and effort come through; a null effort stays null', () => {
  const deps = { known: KNOWN_MODELS, efforts: EFFORTS };
  assert.deepEqual(choiceFromRow({ model: 'claude-sonnet-5-5', effort: null, canary: true }, DFLT, deps), { model: 'claude-sonnet-5-5', effort: null, canary: true, source: 'config' });
});

test('the athlete id is the verified token\'s sub — junk is null, never a throw', () => {
  assert.equal(uidFromAuthorization(jwt({ sub: UID, role: 'authenticated' })), UID);
  assert.equal(uidFromAuthorization(jwt({ role: 'anon' })), null, 'the anon key has no sub');
  assert.equal(uidFromAuthorization(jwt({ sub: 'not-a-uuid' })), null);
  assert.equal(uidFromAuthorization('Bearer nonsense'), null);
  assert.equal(uidFromAuthorization(''), null);
  assert.equal(uidFromAuthorization(null), null);
  assert.equal(uidFromAuthorization('Bearer a.%%%.c'), null);
});
