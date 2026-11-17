import test from 'node:test';
import assert from 'node:assert/strict';

import { CONSENT_POLICY_VERSION } from '../consent.ts';
import { createConsentGate } from '../gate.ts';

/*
 * The SERVER said `no_consent` (AI Road to 10 Sprint 1, P-G9 — every AI function checks `health_consents` itself)
 * although this phone believed it had a yes. `reask` is the consent sheet again, never a generic error.
 */

const V = CONSENT_POLICY_VERSION;
const row = (kind, action, createdAt) => ({ kind, action, policyVersion: V[kind], createdAt });

function fakeDeps({ rows = [], recordOk = true, answers = [] } = {}) {
  const calls = { load: 0, prompt: [], record: [] };
  let t = Date.parse('2026-11-17T12:00:00Z');
  return {
    calls,
    deps: {
      load: async () => {
        calls.load += 1;
        return typeof rows === 'function' ? rows() : rows;
      },
      prompt: async (kind) => {
        calls.prompt.push(kind);
        return answers.length ? answers.shift() : false;
      },
      record: async (kind, action) => {
        calls.record.push([kind, action]);
        return recordOk;
      },
      now: () => new Date((t += 1000)).toISOString(),
    },
  };
}

test('reask asks even though the phone thought it had a yes, and a yes is STORED before it answers', async () => {
  const { deps, calls } = fakeDeps({ rows: [row('ai_sharing', 'granted', '2026-11-01T00:00:00Z')], answers: [true] });
  const g = createConsentGate(deps);
  assert.equal(await g.ensure('ai_sharing'), true);
  assert.deepEqual(calls.prompt, [], 'the device check passes without a sheet');

  assert.equal(await g.reask('ai_sharing'), true);
  assert.deepEqual(calls.prompt, ['ai_sharing'], 'the sheet, once');
  // Awaited, so the retry that follows finds the server holding a fresh yes.
  assert.deepEqual(calls.record, [['ai_sharing', 'granted']]);
  assert.equal(calls.load, 2, 're-read from the server first');
  assert.equal(g.allowsNow('ai_sharing'), true);
});

test('"Not now" on the re-ask is stored, and the phone stops believing the old yes', async () => {
  const { deps, calls } = fakeDeps({ rows: [row('ai_sharing', 'granted', '2026-11-01T00:00:00Z')], answers: [false] });
  const g = createConsentGate(deps);
  await g.ensure('ai_sharing');
  assert.equal(await g.reask('ai_sharing'), false);
  assert.deepEqual(calls.record, [['ai_sharing', 'declined']]);
  assert.equal(g.allowsNow('ai_sharing'), false);
});

test('a yes the server never stored (this session only) is forgotten by reask, not trusted again', async () => {
  // The first answer could not be stored: it lived only on this phone, which is why the server said no.
  let recordOk = false;
  const { deps, calls } = fakeDeps({ rows: [], answers: [true, false] });
  deps.record = async (kind, action) => {
    calls.record.push([kind, action]);
    return recordOk;
  };
  const g = createConsentGate(deps);
  assert.equal(await g.ensure('ai_sharing'), true);
  assert.equal(g.allowsNow('ai_sharing'), true, 'honoured on the phone at once');
  recordOk = true;
  assert.equal(await g.reask('ai_sharing'), false);
  assert.equal(g.allowsNow('ai_sharing'), false, 'the unconfirmed yes is gone');
});

test('several calls refused at once share ONE sheet (Holt filling four meal slots)', async () => {
  const { deps, calls } = fakeDeps({ rows: [row('ai_sharing', 'granted', '2026-11-01T00:00:00Z')], answers: [true] });
  const g = createConsentGate(deps);
  await g.ensure('ai_sharing');
  const all = await Promise.all([g.reask('ai_sharing'), g.reask('ai_sharing'), g.reask('ai_sharing'), g.reask('ai_sharing')]);
  assert.deepEqual(all, [true, true, true, true]);
  assert.deepEqual(calls.prompt, ['ai_sharing']);
  assert.equal(calls.record.length, 1);
});

test('a different athlete signing in mid-reask gets nothing from it', async () => {
  let release;
  const { deps } = fakeDeps({ rows: () => new Promise((r) => (release = () => r([]))), answers: [true] });
  const g = createConsentGate(deps);
  const p = g.reask('ai_sharing');
  g.reset();
  release();
  assert.equal(await p, false);
});
