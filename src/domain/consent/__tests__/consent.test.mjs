import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AI_DECLINED_LINE,
  autoPrompts,
  CONSENT_COPY,
  CONSENT_KINDS,
  CONSENT_POLICY_VERSION,
  consentAllows,
  consentKindsShown,
  consentStatus,
  consentStatusLine,
  grantedAt,
  isNutritionRoute,
  latestConsent,
  sanitizeConsentRows,
} from '../consent.ts';
import { createConsentGate } from '../gate.ts';

const V = CONSENT_POLICY_VERSION;
const row = (kind, action, createdAt, policyVersion = V[kind]) => ({ kind, action, policyVersion, createdAt });

// ── status ──────────────────────────────────────────────────────────────────

test('never answered is none, and none is the only status that raises the prompt by itself', () => {
  assert.equal(consentStatus([], 'nutrition'), 'none');
  assert.equal(autoPrompts('none'), true);
  for (const s of ['granted', 'declined', 'withdrawn']) assert.equal(autoPrompts(s), false, s);
});

test('the newest answer wins, per kind', () => {
  const rows = [
    row('nutrition', 'granted', '2026-09-26T10:00:00Z'),
    row('nutrition', 'withdrawn', '2026-09-26T11:00:00Z'),
    row('ai_sharing', 'declined', '2026-09-26T09:00:00Z'),
    row('ai_sharing', 'granted', '2026-09-26T12:00:00Z'),
  ];
  assert.equal(consentStatus(rows, 'nutrition'), 'withdrawn');
  assert.equal(consentStatus(rows, 'ai_sharing'), 'granted');
  // Order on the wire does not matter.
  assert.equal(consentStatus([...rows].reverse(), 'nutrition'), 'withdrawn');
});

test('a tie on the timestamp goes to the later row — an answer given this second wins', () => {
  const at = '2026-09-26T10:00:00Z';
  assert.equal(latestConsent([row('nutrition', 'granted', at), row('nutrition', 'withdrawn', at)], 'nutrition').action, 'withdrawn');
});

test('a grant for an OLDER policy version is not consent to this one — the athlete is asked again', () => {
  const rows = [row('ai_sharing', 'granted', '2026-01-01T00:00:00Z', '2026-01-01')];
  assert.equal(consentStatus(rows, 'ai_sharing'), 'none');
  assert.equal(consentAllows(consentStatus(rows, 'ai_sharing')), false);
  assert.equal(grantedAt(rows, 'ai_sharing'), null);
});

test('only a current grant allows anything; unknown never does', () => {
  assert.equal(consentAllows('granted'), true);
  for (const s of ['declined', 'withdrawn', 'none', null, undefined]) assert.equal(consentAllows(s), false, String(s));
});

test('the two consents are independent — agreeing to Nutrition is not agreeing to AI sharing', () => {
  const rows = [row('nutrition', 'granted', '2026-09-26T10:00:00Z')];
  assert.equal(consentStatus(rows, 'nutrition'), 'granted');
  assert.equal(consentStatus(rows, 'ai_sharing'), 'none');
});

test('rows off the wire are sanitized, never trusted', () => {
  const rows = sanitizeConsentRows([
    { kind: 'nutrition', action: 'granted', policy_version: V.nutrition, created_at: '2026-09-26T10:00:00Z' },
    { kind: 'marketing', action: 'granted', policy_version: 'x', created_at: '2026-09-26T10:00:00Z' },
    { kind: 'nutrition', action: 'maybe', policy_version: 'x', created_at: '2026-09-26T10:00:00Z' },
    { kind: 'nutrition', action: 'granted', policy_version: 'x', created_at: 'not a date' },
    null,
    'nope',
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(sanitizeConsentRows(null), []);
});

test('the Settings status line', () => {
  assert.match(consentStatusLine('granted', '2026-09-26T15:00:00Z'), /^Agreed on \d{1,2} Sep 2026$/);
  assert.equal(consentStatusLine('withdrawn', null), 'Withdrawn');
  assert.equal(consentStatusLine('declined', null), 'Not agreed');
  assert.equal(consentStatusLine('none', null), 'Not agreed');
});

test('apple_health is its own consent — agreeing to Nutrition or AI is not agreeing to read Apple Health', () => {
  const rows = [row('nutrition', 'granted', '2026-09-26T10:00:00Z'), row('ai_sharing', 'granted', '2026-09-26T10:00:00Z')];
  assert.equal(consentStatus(rows, 'apple_health'), 'none');
  assert.equal(consentStatus([...rows, row('apple_health', 'granted', '2026-09-28T10:00:00Z')], 'apple_health'), 'granted');
  // Rows off the wire with the new kind survive sanitizing (0234 widened the server check to match).
  assert.equal(
    sanitizeConsentRows([{ kind: 'apple_health', action: 'granted', policy_version: V.apple_health, created_at: '2026-09-28T10:00:00Z' }]).length,
    1,
  );
});

test('Health Data & AI lists Apple Health only where it can be connected, or once it has been answered', () => {
  const st = (apple) => ({ nutrition: 'none', ai_sharing: 'granted', apple_health: apple });
  assert.deepEqual(consentKindsShown(st('none'), false), ['nutrition', 'ai_sharing'], 'web / build 9: no Agree button for a feature that is not there');
  assert.deepEqual(consentKindsShown(st('none'), true), ['nutrition', 'ai_sharing', 'apple_health']);
  for (const answered of ['granted', 'declined', 'withdrawn']) {
    assert.ok(consentKindsShown(st(answered), false).includes('apple_health'), `${answered} on the phone stays visible (and withdrawable) on the web`);
  }
});

test('the Apple Health prompt says what the plan says is read — and what is not', () => {
  const t = CONSENT_COPY.apple_health.body.join(' ');
  for (const w of ['type', 'started and ended', 'distance', 'which app or watch']) assert.match(t, new RegExp(w), w);
  for (const w of ['heart rate', 'calories', 'routes', 'sleep']) assert.match(t, new RegExp(`not read[^.]*${w}`), `says it does not read ${w}`);
  assert.match(CONSENT_COPY.apple_health.title, /Apple Health/);
});

// ── routes ──────────────────────────────────────────────────────────────────

test('nutrition routes are recognised in every shape a push takes', () => {
  for (const p of ['/log-food', 'log-food?date=2026-09-26', '/(tabs)/nutrition', '/meal-plan', '/nutrition-targets', '/my-recipes#x']) {
    assert.equal(isNutritionRoute(p), true, p);
  }
  for (const p of ['/workouts', '/(tabs)', '/program-import', '/holt-memory', '/nutrition-thing']) {
    assert.equal(isNutritionRoute(p), false, p);
  }
});

// ── words: must match the live policies ─────────────────────────────────────

test('the AI prompt says what the privacy policy says: Anthropic, what is sent, never name or email', () => {
  const t = CONSENT_COPY.ai_sharing.body.join(' ');
  assert.match(t, /Anthropic/);
  assert.match(t, /question/);
  assert.match(t, /training or nutrition details/);
  assert.match(t, /photo or video frames/);
  assert.match(t, /name and email are never sent/);
  assert.match(t, /not use this data to train/);
  const policy = readFileSync(join(process.cwd(), 'site', 'privacy.html'), 'utf8');
  assert.match(policy, /Your\s+name\s+and\s+email\s+are\s+not\s+sent/, 'privacy.html no longer promises this — re-read it and fix the prompt');
  assert.match(policy, /does not use this data to\s+train its models/);
});

test('the Nutrition prompt names what health-data.html §1 names', () => {
  const t = CONSENT_COPY.nutrition.body.join(' ');
  for (const w of ['food log', 'targets', 'allergies']) assert.match(t, new RegExp(w), w);
  const page = readFileSync(join(process.cwd(), 'site', 'health-data.html'), 'utf8');
  assert.match(page, /food\s+allergies/);
  assert.match(page, /calorie\s+and\s+macro\s+targets/);
});

test('both prompts link to the health data page, and it exists', () => {
  for (const k of CONSENT_KINDS) {
    assert.equal(CONSENT_COPY[k].linkUrl, 'https://forgelegacy.app/health-data');
    assert.equal(CONSENT_COPY[k].agree, 'Agree');
    assert.equal(CONSENT_COPY[k].notNow, 'Not now');
  }
  readFileSync(join(process.cwd(), 'site', 'health-data.html'), 'utf8');
});

test('the policy version is the policies’ own "Last updated" date', () => {
  const months = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06', July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
  for (const [file, kind] of [['health-data.html', 'nutrition'], ['health-data.html', 'ai_sharing']]) {
    const src = readFileSync(join(process.cwd(), 'site', file), 'utf8');
    const m = src.match(/Last updated (\d{1,2}) (\w+) (\d{4})/);
    assert.ok(m, `${file} has no Last updated line`);
    const iso = `${m[3]}-${months[m[2]]}-${m[1].padStart(2, '0')}`;
    assert.equal(V[kind], iso, `${file} was updated — decide whether the ${kind} consent must be asked again, then move CONSENT_POLICY_VERSION`);
  }
  assert.ok(AI_DECLINED_LINE.startsWith('Nothing was sent'));
});

// ── the gate ────────────────────────────────────────────────────────────────

function fakeDeps({ rows = [], loadFails = false, recordOk = true, answers = [] } = {}) {
  const calls = { load: 0, prompt: [], record: [] };
  let t = Date.parse('2026-09-26T12:00:00Z');
  return {
    calls,
    deps: {
      load: async () => {
        calls.load += 1;
        return loadFails ? null : rows;
      },
      prompt: async (kind) => {
        calls.prompt.push(kind);
        return answers.length ? answers.shift() : false;
      },
      record: async (kind, action, v) => {
        calls.record.push([kind, action, v]);
        return typeof recordOk === 'function' ? recordOk() : recordOk;
      },
      now: () => new Date((t += 1000)).toISOString(),
    },
  };
}

test('gate: already granted → true, and no sheet', async () => {
  const { deps, calls } = fakeDeps({ rows: [row('ai_sharing', 'granted', '2026-09-25T00:00:00Z')] });
  const g = createConsentGate(deps);
  assert.equal(await g.ensure('ai_sharing'), true);
  assert.deepEqual(calls.prompt, []);
  assert.equal(g.allowsNow('ai_sharing'), true);
});

test('gate: never asked → sheet; Agree is stored with the current policy version', async () => {
  const { deps, calls } = fakeDeps({ answers: [true] });
  const g = createConsentGate(deps);
  assert.equal(g.allowsNow('ai_sharing'), false);
  assert.equal(await g.ensure('ai_sharing'), true);
  assert.deepEqual(calls.prompt, ['ai_sharing']);
  assert.deepEqual(calls.record, [['ai_sharing', 'granted', V.ai_sharing]]);
  assert.equal(g.allowsNow('ai_sharing'), true);
  // Once agreed, no second sheet.
  assert.equal(await g.ensure('ai_sharing'), true);
  assert.equal(calls.prompt.length, 1);
});

test('gate: Not now → false, stored as declined, and the next tap asks again', async () => {
  const { deps, calls } = fakeDeps({ answers: [false, false] });
  const g = createConsentGate(deps);
  assert.equal(await g.ensure('ai_sharing'), false);
  assert.deepEqual(calls.record[0], ['ai_sharing', 'declined', V.ai_sharing]);
  assert.equal(g.snapshot().status.ai_sharing, 'declined');
  assert.equal(await g.ensure('ai_sharing'), false);
  assert.equal(calls.prompt.length, 2);
});

test('gate: ⚠ a missing table (load → null) is "not yet consented" — it asks, and does not throw', async () => {
  const { deps, calls } = fakeDeps({ loadFails: true, recordOk: false, answers: [true] });
  const g = createConsentGate(deps);
  assert.equal(await g.ensure('nutrition'), true);
  assert.equal(calls.prompt.length, 1);
  const s = g.snapshot();
  assert.equal(s.loaded, true);
  assert.equal(s.unreadable, true);
  // Held for this session even though nothing was stored…
  assert.equal(s.status.nutrition, 'granted');
  assert.equal(await g.ensure('nutrition'), true);
  assert.equal(calls.prompt.length, 1);
  // …and a new session (reset) knows nothing, so it asks again.
  g.reset();
  assert.equal(g.allowsNow('nutrition'), false);
});

test('gate: a load that throws is treated like a missing table', async () => {
  const { deps } = fakeDeps({ answers: [false] });
  deps.load = async () => {
    throw new Error('PGRST205');
  };
  const g = createConsentGate(deps);
  assert.equal(await g.ensure('ai_sharing'), false);
  assert.equal(g.snapshot().unreadable, true);
});

test('gate: withdrawing stops sharing AT ONCE, before the server answers, and even if it refuses', async () => {
  let release;
  const { deps } = fakeDeps({
    rows: [row('ai_sharing', 'granted', '2026-09-25T00:00:00Z')],
    recordOk: () => new Promise((r) => (release = r)),
  });
  const g = createConsentGate(deps);
  await g.ready();
  assert.equal(g.allowsNow('ai_sharing'), true);
  const saving = g.answer('ai_sharing', 'withdrawn');
  assert.equal(g.allowsNow('ai_sharing'), false, 'still allowed while the write is in flight');
  release(false);
  assert.equal(await saving, false);
  assert.equal(g.allowsNow('ai_sharing'), false, 'a refused write must not undo the withdrawal on this phone');
});

test('gate: two features asking at once share ONE sheet', async () => {
  const { deps, calls } = fakeDeps({ answers: [true] });
  const g = createConsentGate(deps);
  const all = await Promise.all([g.ensure('ai_sharing'), g.ensure('ai_sharing'), g.ensure('ai_sharing')]);
  assert.deepEqual(all, [true, true, true]);
  assert.equal(calls.prompt.length, 1);
  assert.equal(calls.record.length, 1);
});

test('gate: reads once, re-reads only after a failure', async () => {
  const { deps, calls } = fakeDeps({ rows: [row('nutrition', 'granted', '2026-09-25T00:00:00Z')] });
  const g = createConsentGate(deps);
  await Promise.all([g.ready(), g.ready()]);
  await g.ready();
  assert.equal(calls.load, 1);
  const bad = fakeDeps({ loadFails: true });
  const g2 = createConsentGate(bad.deps);
  await g2.ready();
  await g2.ready();
  assert.equal(bad.calls.load, 2);
});

test('gate: a read that began for the last athlete never lands on the next', async () => {
  let resolve;
  const { deps } = fakeDeps();
  deps.load = () => new Promise((r) => (resolve = r));
  const g = createConsentGate(deps);
  const first = g.ready();
  g.reset();
  resolve([row('ai_sharing', 'granted', '2026-09-25T00:00:00Z')]);
  await first;
  assert.equal(g.allowsNow('ai_sharing'), false);
});

test('gate: subscribers hear every change', async () => {
  const { deps } = fakeDeps({ answers: [true] });
  const g = createConsentGate(deps);
  let n = 0;
  const off = g.subscribe(() => (n += 1));
  await g.ensure('nutrition');
  assert.ok(n >= 2, `heard ${n}`);
  off();
  const before = n;
  g.reset();
  assert.equal(n, before);
});

// ── the Settings door ───────────────────────────────────────────────────────

test('Settings → Privacy & Alerts carries Health Data & AI when the flag is on, and only then', async () => {
  const { settingsSections } = await import('../../settings/content.ts');
  const rowsOf = (opts) => settingsSections(opts).find((s) => s.key === 'privacy').rows;
  const on = rowsOf({ hasVisibility: true, hasHealthConsent: true });
  const row = on.find((r) => r.key === 'health');
  assert.ok(row, 'the withdrawal screen must be reachable');
  assert.deepEqual(row.action, { type: 'route', path: '/health-consent' });
  assert.equal(on[1].key, 'health', 'sits right under Profile Visibility');
  assert.equal(rowsOf({ hasVisibility: true }).some((r) => r.key === 'health'), false);
});

// ── wiring: every Anthropic-backed call is gated ────────────────────────────

test('every client call to an Anthropic-backed Edge Function waits on the AI consent', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const fnDir = join(process.cwd(), 'supabase', 'functions');
  // Discovered, not listed: a new AI function fails this test until its caller is gated.
  const aiFunctions = readdirSync(fnDir).filter((d) => {
    const p = join(fnDir, d);
    if (!statSync(p).isDirectory()) return false;
    return readdirSync(p).some((f) => f.endsWith('.ts') && /anthropic/i.test(readFileSync(join(p, f), 'utf8')));
  });
  assert.ok(aiFunctions.includes('coach-ask') && aiFunctions.length >= 7, `found ${aiFunctions.join(', ')}`);

  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) {
        if (e !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(e)) files.push(p);
    }
  };
  walk(join(process.cwd(), 'src'));

  const callers = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const fn of aiFunctions) {
      if (src.includes(`invoke('${fn}'`) || src.includes(`functions/v1/${fn}`)) callers.push([f, fn, src]);
    }
  }
  assert.ok(callers.length >= 7, `only ${callers.length} callers found — the scan is broken`);
  for (const [f, fn, src] of callers) {
    assert.ok(
      /ensureConsent\('ai_sharing'\)|consentAllowsNow\('ai_sharing'\)/.test(src),
      `${f} calls ${fn} (Anthropic) without waiting on the AI consent`,
    );
  }
});
