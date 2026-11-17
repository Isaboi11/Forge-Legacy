import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

/*
 * EVERY NON-CHAT AI CALL, ON THE DEVICE (AI Road to 10 Sprint 1 — PL-3 / PL-4, audit P-G1 / P-G3 / P-G9).
 *
 * For each data module, with the function faked at `supabase.functions.invoke`:
 *   · it carries the contract §3 timeout and a signal (functions-js 2.110.7 `timeout` + `signal`);
 *   · a failure is reported — `ai.<fn>.<kind>` to client_errors/Sentry, with status, latency and the refund;
 *   · a refund rides on the result, so the screen can say "Not charged.";
 *   · the server's `no_consent` goes back to the consent sheet, and comes out as "Not now" when declined — never as
 *     a generic error;
 *   · the screen closing aborts the call, and a cancel is never reported.
 */

const { supabase, db, ATHLETE } = await import('@/lib/supabase');
const { reported, reportedOpts } = await import('./harness/stubs.mjs');
const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
const { refreshConsents, registerConsentPrompter } = await import('@/lib/consent');
const { AI_APP_TIMEOUT_MS } = await import('@/domain/ai/ai-call');
const { invokeAi } = await import('@/lib/ai-invoke');
const { tidyWrittenWorkout } = await import('@/data/workout-tidy-live');
const { cardReadFallsBack, readWorkoutCard } = await import('@/data/workout-card-read-live');
const { readProgramPhoto } = await import('@/data/program-photo-live');
const { readMealPhoto } = await import('@/data/meal-photo-live');
const { readRecipePhoto } = await import('@/data/recipe-photo-live');
const { askKitchenLive } = await import('@/data/coach-kitchen-live');
const { interpretTyped } = await import('@/data/coach-interpret-live');
const { authorLive } = await import('@/data/coach-author-live');
const { readRecipeLink } = await import('@/data/recipe-link-live');
const { writeBugPlain } = await import('@/data/crm-live');
const { readImportPhoto } = await import('@/data/import-photo-read');

/* `readAsBase64` reads the picked uri with the browser's FileReader, which node does not have. */
globalThis.FileReader ??= class {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(
      (b) => {
        this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
        this.onload?.();
      },
      () => this.onerror?.(),
    );
  }
};
/* A JPEG's first bytes, so every media sniff says image/jpeg. A different tail each time = a different picture. */
let n = 0;
const photo = () => {
  n += 1;
  return `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, n & 255, n >> 8, 7, 7]).toString('base64')}`;
};

const KITCHEN = { have: [], ask: 'something quick', avoid: [], exclude: [], nudge: null, lean: null, left: null, minor: false };
const AUTHOR = { kind: 'day', said: ['an upper body day with dumbbells'], minutes: 45, days: null, weeks: null };

/** Every module, as the screen calls it, with the signal the screen hands it. */
const MODULES = [
  { fn: 'workout-tidy', call: (s) => tidyWrittenWorkout(`Squat 5x5 #${(n += 1)}`, () => undefined, s) },
  { fn: 'workout-card-read', call: (s) => readWorkoutCard(photo(), s) },
  { fn: 'program-photo-read', call: (s) => readProgramPhoto(photo(), s) },
  { fn: 'meal-photo-read', call: (s) => readMealPhoto(photo(), s) },
  { fn: 'recipe-photo-read', call: (s) => readRecipePhoto(photo(), s) },
  { fn: 'coach-kitchen', call: (s) => askKitchenLive(KITCHEN, s) },
  { fn: 'coach-interpret', call: (s) => interpretTyped('I train in my garage with a rack and a bench', null, 'program', {}, [], [], s) },
  { fn: 'coach-author', call: (s) => authorLive(AUTHOR, s) },
];

let seen = [];
/** Fake the function: `reply(name, opts)` → what invoke resolves with. Every call's name + options is kept. */
const fake = (reply) => {
  supabase.functions.invoke = async (name, opts) => {
    seen.push({ name, opts });
    return reply(name, opts);
  };
};
const httpError = (body, status) => ({ data: null, error: { message: 'non-2xx', context: new Response(JSON.stringify(body), { status }) } });
const consent = () =>
  db.rows('health_consents').push({ athlete_id: ATHLETE, kind: 'ai_sharing', action: 'granted', policy_version: CONSENT_POLICY_VERSION.ai_sharing, created_at: new Date().toISOString() });
const reports = () => reported.map((e, i) => ({ ...e, opts: reportedOpts[i] }));

test.beforeEach(async () => {
  db.reset();
  consent();
  await refreshConsents();
  seen = [];
  reported.length = 0;
  reportedOpts.length = 0;
});

for (const m of MODULES) {
  const wall = AI_APP_TIMEOUT_MS[m.fn];

  test(`${m.fn}: carries the ${wall / 1000} s contract timeout and a signal`, async () => {
    fake(() => httpError({ ok: false, reason: 'upstream_error' }, 503));
    await m.call(new AbortController().signal);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].name, m.fn);
    assert.equal(seen[0].opts.timeout, wall, 'functions-js gets the contract value');
    assert.ok(seen[0].opts.timeout <= wall);
    assert.ok(seen[0].opts.signal instanceof AbortSignal, 'and a signal it can be stopped by');
  });

  test(`${m.fn}: a refunded server failure is reported once and comes back refunded`, async () => {
    fake(() => httpError({ ok: false, reason: 'upstream_error', refunded: true }, 503));
    const r = await m.call();
    assert.notEqual(r.kind, 'ok');
    assert.equal(r.refunded, true, 'the screen can say "Not charged."');
    const mine = reports().filter((e) => e.name.startsWith(`ai.${m.fn}.`));
    assert.equal(mine.length, 1, JSON.stringify(reports()));
    assert.equal(mine[0].name, `ai.${m.fn}.upstream`);
    assert.match(mine[0].message, new RegExp(`^fn=${m.fn} kind=upstream reason=upstream_error status=503 ms=\\d+ refunded=true$`));
    assert.deepEqual(mine[0].opts, { source: 'manual' });
  });

  test(`${m.fn}: a failure without a refund says nothing about money`, async () => {
    fake(() => httpError({ ok: false, reason: 'upstream_error' }, 503));
    const r = await m.call();
    assert.equal(r.refunded, undefined);
    assert.match(reports().at(-1).message, /reason=upstream_error status=503/);
    assert.doesNotMatch(reports().at(-1).message, /refunded/);
  });

  test(`${m.fn}: the server's no_consent goes to the consent sheet, and "Not now" is the screen's own consent state`, async () => {
    fake(() => httpError({ ok: false, reason: 'no_consent' }, 403));
    const asked = [];
    const off = registerConsentPrompter(async (kind) => {
      asked.push(kind);
      return false;
    });
    try {
      const r = await m.call();
      assert.deepEqual(r, { kind: 'no_consent' }, 'NO_AI_CONSENT — never offline / unavailable');
      assert.deepEqual(asked, ['ai_sharing'], 'the sheet, once');
      assert.equal(seen.length, 1, 'declined: not sent again');
      assert.ok(reports().some((e) => e.name === `ai.${m.fn}.no_consent`), 'the phone asked first, so the server saying no is a bug worth seeing');
    } finally {
      off();
    }
  });

  test(`${m.fn}: agreeing on the re-ask stores the yes and sends it once more`, async () => {
    let calls = 0;
    fake(() => (++calls === 1 ? httpError({ ok: false, reason: 'no_consent' }, 403) : httpError({ ok: false, reason: 'upstream_error' }, 503)));
    const off = registerConsentPrompter(async () => true);
    try {
      const r = await m.call();
      assert.equal(seen.length, 2, 'one retry, no more');
      assert.notEqual(r.kind, 'no_consent');
      const stored = db.rows('health_consents').filter((x) => x.kind === 'ai_sharing');
      assert.equal(stored.at(-1).action, 'granted', 'the fresh yes is on the server before the retry');
    } finally {
      off();
    }
  });

  test(`${m.fn}: the screen closing aborts the call, and a cancel is never reported`, async () => {
    fake(
      (_name, opts) =>
        new Promise((resolve) => {
          opts.signal.addEventListener('abort', () => resolve({ data: null, error: { message: 'AbortError' } }));
        }),
    );
    const ctl = new AbortController();
    const pending = m.call(ctl.signal);
    await new Promise((r) => setTimeout(r, 15));
    ctl.abort();
    const r = await pending;
    assert.notEqual(r.kind, 'ok');
    assert.equal(seen[0].opts.signal.aborted, true, 'the request itself was stopped');
    assert.equal(reports().length, 0, 'the athlete leaving is not a failure');
  });
}

test('invokeAi: the app’s own clock wins over a hung request, and is reported as a timeout', async () => {
  fake(() => new Promise(() => {}));
  const t0 = Date.now();
  const a = await invokeAi('workout-tidy', { text: 'x' }, { timeoutMs: 25 });
  assert.equal(a.timedOut, true);
  assert.ok(Date.now() - t0 >= 20);
  assert.equal(seen[0].opts.signal.aborted, true, 'the hung request is aborted, not just abandoned');
  assert.equal(seen[0].opts.timeout, 25);
});

test('invokeAi: never longer than the contract, whatever the caller asks for', async () => {
  fake(() => ({ data: { ok: true }, error: null }));
  await invokeAi('coach-author', {}, { timeoutMs: 999_999 });
  assert.equal(seen[0].opts.timeout, 30_000);
});

test('invokeAi: no HTTP answer is offline; a non-2xx is the function’s own body and status', async () => {
  fake(() => ({ data: null, error: { message: 'Failed to fetch' } }));
  assert.equal((await invokeAi('workout-tidy', {})).offline, true);
  fake(() => httpError({ ok: false, reason: 'too_long' }, 400));
  const a = await invokeAi('workout-tidy', {});
  assert.deepEqual([a.offline, a.status, a.body], [false, 400, { ok: false, reason: 'too_long' }]);
});

test('the card read is not retried as a table read after a timeout (V-D5) — only when it had no answer', () => {
  assert.equal(cardReadFallsBack({ kind: 'not_deployed' }), true);
  assert.equal(cardReadFallsBack({ kind: 'offline' }), true);
  assert.equal(cardReadFallsBack({ kind: 'unavailable' }), true);
  assert.equal(cardReadFallsBack({ kind: 'unavailable', slow: true }), false, 'a second 90 s read would be just as slow');
  assert.equal(cardReadFallsBack({ kind: 'not_a_program' }), false);
  assert.equal(cardReadFallsBack({ kind: 'no_consent' }), false);
});

test('a card read that ran out of time stops there: no second, paid table read', async () => {
  fake(() => httpError({ ok: false, reason: 'upstream_error', upstream: 'timeout', refunded: true }, 503));
  const r = await readImportPhoto(photo(), () => undefined);
  assert.deepEqual(seen.map((s) => s.name), ['workout-card-read']);
  assert.equal(r.kind, 'unavailable');
  assert.equal(r.refunded, true);
  assert.ok(reports().some((e) => e.name === 'ai.workout-card-read.timeout'));
});

test('interpret says which way it failed: the server’s end, a clock, or the connection', async () => {
  fake(() => httpError({ route: 'error', reason: 'upstream_error', refunded: true }, 503));
  assert.deepEqual(await interpretTyped('I train in my garage with a rack', null), { kind: 'offline', unavailable: true, refunded: true });
  fake(() => httpError({ route: 'error', reason: 'upstream_error', upstream: 'timeout', refunded: true }, 503));
  assert.deepEqual(await interpretTyped('I train in my garage with a rack', null), { kind: 'offline', unavailable: true, timedOut: true, refunded: true });
  fake(() => ({ data: null, error: { message: 'Failed to fetch' } }));
  assert.deepEqual(await interpretTyped('I train in my garage with a rack', null), { kind: 'offline' });
});

test('recipe-link-read: 30 s, a dead function is reported, a page with no recipe is an answer', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('no phone fetch in tests');
  };
  try {
    fake(() => httpError({ ok: false }, 502));
    assert.equal((await readRecipeLink('https://example.com/pie')).kind, 'unreachable');
    assert.equal(seen[0].opts.timeout, 30_000);
    assert.ok(reports().some((e) => e.name === 'ai.recipe-link-read.upstream'));
    reported.length = 0;
    fake(() => ({ data: { ok: false, reason: 'no_recipe' }, error: null }));
    assert.equal((await readRecipeLink('https://example.com/pie')).kind, 'no_recipe');
    assert.equal(reports().length, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('bug-plain: 90 s, and every failure is reported before the panel is told', async () => {
  fake(() => httpError({ ok: false, reason: 'unconfigured' }, 503));
  await assert.rejects(writeBugPlain('bug-1'), /The AI key is not set on the server\./);
  assert.equal(seen[0].opts.timeout, 90_000);
  assert.ok(reports().some((e) => e.name === 'ai.bug-plain.meter'));
  fake(() => ({ data: { ok: true, plain: { what: 'a', why: 'b', fix: 'c', scope: 'one', who: 'x' } }, error: null }));
  assert.equal((await writeBugPlain('bug-1')).what, 'a');
});
