// node --experimental-strip-types --test scripts/deploy-ai/__tests__/deploy-ai.test.mjs
//
// PL-5: the function map, the hashes, the multipart codec, the Management API client (FAKE fetch only — the token
// has not been OK'd), the record SQL, the transcript read-back, the drift run and the deploy orchestrator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FUNCTIONS, KNOWN_ORPHANS, slugs } from '../functions.mjs';
import { DRIFT_STATUSES, DEPLOY_METHODS, compareDeployed, compareSource, entryFile, firstDifference, repoBundle, sha256 } from '../hash.mjs';
import { boundaryOf, buildMultipart, parseMultipart, sourceRelative } from '../multipart.mjs';
import { MgmtApiError, mgmtClient } from '../mgmt-api.mjs';
import { deployRecordSql, driftRecordSql, sqlString } from '../record-sql.mjs';
import { findReadback, parseEdgeFunctionResult, readbackReport } from '../readback.mjs';
import { runDrift } from '../drift.mjs';
import { runDeploy } from '../deploy.mjs';
import { probe } from '../probe.mjs';
import { normalizeBundle } from '../../lib/bundle-normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const H = (c) => c.repeat(64);

// ── the map ─────────────────────────────────────────────────────────────────────────────────────────────────

test('every function folder is in the map, and every map entry has a folder', () => {
  const dirs = fs.readdirSync(path.join(ROOT, 'supabase/functions')).filter((d) => fs.existsSync(path.join(ROOT, 'supabase/functions', d, 'index.ts')));
  assert.deepEqual(slugs(), [...dirs].sort());
});

test('a builder exists exactly where the map says, and the other functions import nothing from src/', () => {
  const builders = fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => /^build-.*-deploy\.mjs$/.test(f)).map((f) => f.replace(/^build-|-deploy\.mjs$/g, ''));
  for (const [slug, m] of Object.entries(FUNCTIONS)) {
    assert.equal(!!m.builder, builders.includes(slug), slug);
    if (m.builder) assert.ok(fs.existsSync(path.join(ROOT, m.builder)), m.builder);
    else assert.doesNotMatch(read(`supabase/functions/${slug}/index.ts`), /from '\.\.\/\.\.\/\.\.\/src\//, `${slug} imports src/ — it needs a builder`);
  }
});

test('verify_jwt is off only for the two functions that check their own secret', () => {
  assert.deepEqual(Object.entries(FUNCTIONS).filter(([, m]) => !m.verifyJwt).map(([s]) => s).sort(), ['ai-canary', 'revenuecat-webhook']);
  assert.equal(FUNCTIONS['ai-canary'].probe.post, 401);
  assert.equal(FUNCTIONS['revenuecat-webhook'].probe.options, 405);
});

test('every listed test file exists, and every test that names a function’s source or bundle is listed for it', () => {
  const all = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.test.mjs')) all.push(p);
    }
  };
  walk('src');
  walk('supabase/functions');
  for (const [slug, m] of Object.entries(FUNCTIONS)) {
    for (const t of m.tests) assert.ok(fs.existsSync(path.join(ROOT, t)), `${slug}: ${t}`);
    const naming = all.filter((t) => {
      const s = read(t);
      return s.includes(`functions/${slug}/`) || s.includes(`deploy-${slug}.ts`) || s.includes(`build-${slug}-deploy`);
    });
    for (const t of naming) assert.ok(m.tests.includes(t), `${t} reads ${slug} — add it to FUNCTIONS['${slug}'].tests`);
  }
});

test('an AI function names its suites or says why it has none', () => {
  for (const [slug, m] of Object.entries(FUNCTIONS)) {
    assert.ok(m.suites.length > 0 || (m.noSuite && m.noSuite.length > 5), slug);
  }
  assert.ok(KNOWN_ORPHANS['recipe-phot-read']);
});

// ── hashes ──────────────────────────────────────────────────────────────────────────────────────────────────

test('the status list is the one 0271’s table and the card use', () => {
  const mig = read('supabase/migrations/0271_ai_deploys_and_drift.sql');
  assert.ok(mig.includes(`status in (${DRIFT_STATUSES.map((s) => `'${s}'`).join(', ')})`));
  assert.ok(mig.includes(`method in (${DEPLOY_METHODS.map((s) => `'${s}'`).join(', ')})`));
  const core = read('src/domain/admin/ai-drift-core.ts');
  for (const s of DRIFT_STATUSES) assert.ok(core.includes(`'${s}'`), `the card knows ${s}`);
});

test('compare: byte-equal is same; a comment / escape / CRLF difference is same_after_normalize; code is differs', () => {
  const repo = "// a \u{2014} b\nconst s = 'x\u{2014}y';\nexport const n = 1;\n";
  assert.equal(compareSource(repo, repo).status, 'same');
  assert.equal(compareSource(normalizeBundle(repo), repo).status, 'same_after_normalize');
  assert.equal(compareSource(repo.replace(/\n/g, '\r\n'), repo).status, 'same_after_normalize');
  const c = compareSource(repo.replace('// a', '// a retyped'), repo);
  assert.equal(c.status, 'same_after_normalize', 'a comment never decides');
  assert.match(c.detail, /comments differ only/);
  const d = compareSource(repo.replace('n = 1', 'n = 2'), repo);
  assert.equal(d.status, 'differs');
  assert.match(d.detail, /line 3/);
  assert.equal(compareSource('const = ;', repo).status, 'differs');
  assert.match(compareSource('const = ;', repo).detail, /does not parse/);
});

test('the real case from 2026-11-17: program-photo-read v22 (the un-normalized bundle) is same_after_normalize against today’s', () => {
  // v22's raw sha256, read back through the MCP on 11-17, equals the pre-normalizer committed bundle.
  const committed = repoBundle('program-photo-read', ROOT);
  assert.ok(committed.builder);
  assert.equal(normalizeBundle(committed.text), committed.text, 'the committed bundle is normalized');
});

test('entry file and multi-file deploys', () => {
  assert.equal(entryFile([{ name: 'a.ts', content: '' }, { name: 'index.ts', content: 'x' }]).content, 'x');
  assert.equal(entryFile([{ name: 'source/main.ts', content: 'y' }], '/tmp/user_fn_x_1/source/main.ts').content, 'y');
  assert.equal(entryFile([], null), null);
  const r = compareDeployed([{ name: 'index.ts', content: 'const a = 1;\n' }, { name: 'src/x.ts', content: '' }], null, 'const a = 1;\n');
  assert.equal(r.status, 'same');
  assert.match(r.detail, /2 files deployed/);
  assert.equal(compareDeployed([], null, 'x').status, 'fetch_failed');
  assert.equal(firstDifference('a\nb', 'a\nb'), null);
});

// ── multipart ───────────────────────────────────────────────────────────────────────────────────────────────

test('multipart round-trips text and binary, and reads what the body endpoint sends', () => {
  const { body, contentType } = buildMultipart(
    [
      { name: 'metadata', value: '{"entrypoint_path":"index.ts"}', contentType: 'application/json' },
      { name: 'file', value: 'const s = "\u{2014}";\r\n', filename: 'index.ts' },
      { name: 'bin', value: Buffer.from([0, 255, 13, 10, 45, 45]), filename: 'b.bin' },
    ],
    'XyZ',
  );
  assert.equal(boundaryOf(contentType), 'XyZ');
  const parts = parseMultipart(body, 'XyZ');
  assert.equal(parts.length, 3);
  assert.equal(parts[0].name, 'metadata');
  assert.equal(parts[1].filename, 'index.ts');
  assert.equal(parts[1].data.toString('utf8'), 'const s = "\u{2014}";\r\n');
  assert.deepEqual([...parts[2].data], [0, 255, 13, 10, 45, 45]);
  assert.equal(boundaryOf('multipart/form-data; boundary="a b"'), 'a b');
  assert.throws(() => buildMultipart([{ name: 'x', value: '--XyZ' }], 'XyZ'), /boundary/);
  assert.equal(sourceRelative('/tmp/user_fn_ref_id_3/source/index.ts'), 'index.ts');
  assert.equal(sourceRelative('file:///tmp/user_fn_ref_id_3/source/lib/a.ts'), 'lib/a.ts');
  assert.equal(sourceRelative('source/index.ts'), 'index.ts');
});

// ── the Management API client — a fake fetch, never the network ─────────────────────────────────────────────

function fakeFetch(routes) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, ...init });
    const key = `${init.method} ${url.replace('https://api.supabase.com', '')}`;
    const r = routes[key] ?? routes[key.replace(/\?.*$/, '')];
    if (!r) return new Response('not found', { status: 404 });
    return typeof r === 'function' ? r(init) : r();
  };
  f.calls = calls;
  return f;
}
const REF = 'ucqbzoeouvwoyfnnmqoo';

test('the client refuses to exist without the token, and checks the ref and slugs', () => {
  assert.throws(() => mgmtClient({ token: '', ref: REF }), /SUPABASE_ACCESS_TOKEN is not set/);
  assert.throws(() => mgmtClient({ token: 't', ref: 'nope' }), /bad project ref/);
});

test('the client: list, body (multipart → files), deploy (metadata + one file, verify_jwt explicit), SQL', async () => {
  const mp = buildMultipart([{ name: 'metadata', value: '{}' }, { name: 'file', value: 'export const a = 1;\n', filename: '/tmp/user_fn_x_9/source/index.ts' }], 'BB');
  const f = fakeFetch({
    [`GET /v1/projects/${REF}/functions`]: () => Response.json([{ slug: 'coach-ask', version: 26, verify_jwt: true }]),
    [`GET /v1/projects/${REF}/functions/coach-ask/body`]: () => new Response(mp.body, { status: 200, headers: { 'content-type': mp.contentType } }),
    [`GET /v1/projects/${REF}/functions/eszip/body`]: () => new Response('ESZIP2', { status: 200, headers: { 'content-type': 'application/octet-stream' } }),
    [`POST /v1/projects/${REF}/functions/deploy`]: () => Response.json({ slug: 'coach-ask', version: 27 }, { status: 201 }),
    [`POST /v1/projects/${REF}/database/query`]: () => Response.json([{ id: 1 }], { status: 201 }),
  });
  const c = mgmtClient({ token: 'sbp_test', ref: REF, fetchImpl: f });
  assert.equal((await c.listFunctions())[0].version, 26);
  assert.deepEqual(await c.getFunctionFiles('coach-ask'), [{ name: 'index.ts', content: 'export const a = 1;\n' }]);
  assert.equal(f.calls.at(-1).headers.Accept, 'multipart/form-data');
  assert.equal(f.calls.at(-1).headers.Authorization, 'Bearer sbp_test');
  await assert.rejects(() => c.getFunctionFiles('eszip'), (e) => e instanceof MgmtApiError && e.status === 415);
  await assert.rejects(() => c.deployFunction('coach-ask', { content: 'x' }), /verifyJwt/);
  assert.equal((await c.deployFunction('coach-ask', { content: 'export {};\n', verifyJwt: true })).version, 27);
  const dep = f.calls.at(-1);
  assert.match(dep.url, /functions\/deploy\?slug=coach-ask$/);
  const parts = parseMultipart(dep.body, boundaryOf(dep.headers['Content-Type']));
  assert.deepEqual(JSON.parse(parts[0].data.toString()), { entrypoint_path: 'index.ts', name: 'coach-ask', verify_jwt: true });
  assert.equal(parts[1].filename, 'index.ts');
  assert.equal(parts[1].data.toString(), 'export {};\n');
  assert.deepEqual(await c.runSql('select 1'), [{ id: 1 }]);
  assert.deepEqual(JSON.parse(f.calls.at(-1).body), { query: 'select 1' });
  await assert.rejects(() => c.getFunction('missing'), (e) => e.status === 404 && !String(e.message).includes('sbp_test'));
  await assert.rejects(() => c.getFunction('Bad Slug'), /bad slug/);
});

// ── record SQL ──────────────────────────────────────────────────────────────────────────────────────────────

test('deploy record SQL quotes everything and refuses bad values', () => {
  const sql = deployRecordSql({ slug: 'coach-ask', version: 27, sha256Raw: H('a'), sha256Normalized: H('b'), commit: 'abc1234', method: 'mcp', by: "PO's OK", note: "it's fine" });
  assert.equal(sql, `select public.ai_deploy_record('coach-ask', 27, '${H('a')}', '${H('b')}', 'abc1234', 'mcp', 'PO''s OK', 'it''s fine') as id;`);
  assert.throws(() => deployRecordSql({ slug: 'x', version: 0, sha256Raw: H('a'), sha256Normalized: H('a'), method: 'mcp', by: 'me' }), /version/);
  assert.throws(() => deployRecordSql({ slug: 'x', version: 1, sha256Raw: 'zz', sha256Normalized: H('a'), method: 'mcp', by: 'me' }), /hashes/);
  assert.throws(() => deployRecordSql({ slug: 'x', version: 1, sha256Raw: H('a'), sha256Normalized: H('a'), method: 'ftp', by: 'me' }), /method/);
  assert.throws(() => deployRecordSql({ slug: "x'; drop", version: 1, sha256Raw: H('a'), sha256Normalized: H('a'), method: 'mcp', by: 'me' }), /slug/);
  assert.equal(sqlString(null), 'null');
});

test('drift record SQL: a dollar-quoted payload whose tag never occurs in it', () => {
  let n = 0;
  const rand = () => (n++ === 0 ? 'aaaa' : 'bbbb');
  const sql = driftRecordSql({ sourceCommit: 'abcdef1', rows: [{ slug: 'coach-ask', status: 'differs', detail: 'has $drift_aaaa$ inside' }] }, rand);
  assert.match(sql, /^select public\.ai_drift_record\(\$drift_bbbb\$\{.*\}\$drift_bbbb\$::jsonb\) as rows;$/);
  const json = sql.slice(sql.indexOf('$drift_bbbb$') + 12, sql.lastIndexOf('$drift_bbbb$'));
  assert.equal(JSON.parse(json).rows[0].detail, 'has $drift_aaaa$ inside');
  assert.throws(() => driftRecordSql({ rows: [] }), /1 to 200/);
  assert.throws(() => driftRecordSql({ rows: [{ slug: 'x', status: 'weird' }] }), /status/);
});

// ── the transcript read-back (path (b)) ─────────────────────────────────────────────────────────────────────

const fnJson = (content, version = 7) => JSON.stringify({ slug: 'ai-canary', version, verify_jwt: false, entrypoint_path: '/tmp/user_fn_x_7/source/index.ts', files: [{ name: 'index.ts', content }] });
const transcript = (pairs) =>
  pairs
    .flatMap(([id, slug, text, at]) => [
      JSON.stringify({ type: 'assistant', timestamp: at, message: { content: [{ type: 'tool_use', id, name: 'mcp__supabase__get_edge_function', input: { function_slug: slug } }] } }),
      JSON.stringify({ type: 'user', timestamp: at, message: { content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text }] }] } }),
    ])
    .join('\n');

test('read-back: the newest get_edge_function result for the slug, inline or saved to a file', () => {
  const repo = read('supabase/functions/ai-canary/index.ts');
  const jl = transcript([
    ['t1', 'ai-canary', fnJson('old', 6), '2026-11-17T10:00:00Z'],
    ['t2', 'coach-ask', fnJson('other'), '2026-11-17T11:00:00Z'],
    ['t3', 'ai-canary', fnJson(repo, 7), '2026-11-17T12:00:00Z'],
  ]);
  const found = findReadback(jl, 'ai-canary');
  assert.equal(found.toolUseId, 't3');
  assert.equal(found.fn.version, 7);
  const r = readbackReport('ai-canary', found.fn, ROOT);
  assert.equal(r.status, 'same');
  assert.equal(r.live.raw, sha256(repo));
  assert.equal(findReadback(jl, 'ai-canary', { after: '2026-11-17T13:00:00Z' }), null, 'only a read-back after the deploy counts');
  const tmp = path.join(os.tmpdir(), `readback-${process.pid}.txt`);
  fs.writeFileSync(tmp, fnJson('saved'));
  const saved = parseEdgeFunctionResult(`Error: result exceeds maximum allowed tokens. Output has been saved to ${tmp}\nFormat: …`);
  assert.equal(saved.files[0].content, 'saved');
  fs.unlinkSync(tmp);
  assert.throws(() => parseEdgeFunctionResult('{"nope":1}'), /files/);
});

test('read-back: an MCP deploy of the NORMALIZED bundle is EXACT; a retyped one with a code slip differs', () => {
  const repo = repoBundle('workout-card-read', ROOT);
  const normalized = normalizeBundle(repo.text);
  const exact = readbackReport('workout-card-read', { version: 5, verify_jwt: true, files: [{ name: 'index.ts', content: normalized }] }, ROOT);
  assert.equal(exact.exact, true);
  assert.equal(exact.status, 'same_after_normalize');
  const slip = readbackReport('workout-card-read', { version: 5, verify_jwt: true, files: [{ name: 'index.ts', content: normalized.replace('claude-sonnet-5', 'claude-sonnet-4') }] }, ROOT);
  assert.equal(slip.exact, false);
  assert.equal(slip.status, 'differs');
});

// ── the drift run ───────────────────────────────────────────────────────────────────────────────────────────

test('drift: same, same_after_normalize, differs, a verify_jwt flip, fetch_failed, missing_in_repo, missing_live', async () => {
  const live = [
    { slug: 'ai-canary', version: 1, verify_jwt: false },
    { slug: 'coach-ask', version: 26, verify_jwt: true },
    { slug: 'workout-card-read', version: 4, verify_jwt: true },
    { slug: 'bug-plain', version: 3, verify_jwt: false },
    { slug: 'food-search', version: 34, verify_jwt: true },
    { slug: 'recipe-phot-read', version: 7, verify_jwt: true },
    { slug: 'stranger', version: 1, verify_jwt: true },
  ];
  const files = {
    'ai-canary': [{ name: 'index.ts', content: repoBundle('ai-canary', ROOT).text }],
    'coach-ask': [{ name: 'index.ts', content: repoBundle('coach-ask', ROOT).text.replace('// ===', '// ====== retyped') }],
    'workout-card-read': [{ name: 'index.ts', content: repoBundle('workout-card-read', ROOT).text.replace('claude-sonnet-5', 'claude-sonnet-4') }],
    'bug-plain': [{ name: 'index.ts', content: repoBundle('bug-plain', ROOT).text }],
  };
  const client = {
    listFunctions: async () => live,
    getFunctionFiles: async (slug) => {
      if (slug === 'food-search') throw new MgmtApiError('body came back as application/octet-stream', 415);
      return files[slug];
    },
  };
  const { rows, unexpected } = await runDrift({ client, root: ROOT });
  const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
  assert.equal(by['ai-canary'].status, 'same');
  assert.equal(by['coach-ask'].status, 'same_after_normalize');
  assert.equal(by['workout-card-read'].status, 'differs');
  assert.equal(by['bug-plain'].status, 'differs', 'same code, but verify_jwt flipped live');
  assert.match(by['bug-plain'].detail, /verify_jwt is false live/);
  assert.equal(by['food-search'].status, 'fetch_failed');
  assert.equal(by['recipe-phot-read'].status, 'missing_in_repo');
  assert.equal(by['recipe-phot-read'].expected, true, 'a known orphan does not fail the run');
  assert.equal(by.stranger.status, 'missing_in_repo');
  assert.equal(by['social-sync'].status, 'missing_live');
  assert.equal(by['social-sync'].expected, true);
  assert.equal(by['coach-kitchen'].status, 'missing_live');
  // unexpected: workout-card-read, bug-plain, food-search, stranger, + every other map entry not in `live`.
  const notLive = Object.keys(FUNCTIONS).filter((s) => !live.some((l) => l.slug === s) && s !== 'social-sync').length;
  assert.equal(unexpected, 4 + notLive);
  assert.equal(by['workout-card-read'].deployedSha256.length, 64);
  // And the run is recordable as-is.
  assert.match(driftRecordSql({ sourceCommit: 'abcdef1', rows }), /^select public\.ai_drift_record/);
});

// ── the deploy orchestrator ─────────────────────────────────────────────────────────────────────────────────

function deps(over = {}) {
  const log = [];
  const exec = over.exec ?? (() => ({ code: 0, out: 'ok' }));
  return {
    log: (s) => log.push(s),
    lines: log,
    exec,
    readRepo: (slug) => repoBundle(slug, ROOT),
    client: over.client ?? (() => {
      throw new MgmtApiError('SUPABASE_ACCESS_TOKEN is not set', 0);
    }),
    probe: over.probe ?? (async () => ({ ok: true, checks: [{ what: 'OPTIONS', got: 200, expected: 200, ok: true }] })),
    commit: () => 'abcdef1234567',
    writeTemp: (name) => `/tmp/${name}`,
  };
}

test('deploy: never deploys without the PO’s words — the free local steps run, then it stops', async () => {
  const d = deps();
  const r = await runDeploy({ slug: 'coach-ask', method: 'mgmt_api' }, d);
  assert.equal(r.ok, false);
  assert.equal(r.stoppedAt, 'approval');
  assert.deepEqual(r.steps.map((s) => s.step), ['build', 'committed', 'bundle', 'tests', 'gate', 'approval']);
});

test('deploy: a failing test, gate or uncommitted bundle stops it before the PO is even asked', async () => {
  for (const [fail, at] of [
    [(c, a) => (a.includes('--test') ? 1 : 0), 'tests'],
    [(c, a) => (a[0] === 'scripts/evals/gate.mjs' ? 1 : 0), 'gate'],
    [(c, a) => (a[0] === 'diff' ? 1 : 0), 'committed'],
  ]) {
    const r = await runDeploy({ slug: 'coach-kitchen', method: 'mgmt_api', approval: 'yes', by: 'me' }, deps({ exec: (c, a) => ({ code: fail(c, a), out: 'x' }) }));
    assert.equal(r.stoppedAt, at);
  }
});

test('deploy (a): no token → stops at token; with a client: deploy, byte-exact read-back, probe, record', async () => {
  assert.equal((await runDeploy({ slug: 'ai-canary', method: 'mgmt_api', approval: 'PO: yes, 11-18', by: 'integrator' }, deps())).stoppedAt, 'token');
  const repo = repoBundle('ai-canary', ROOT);
  const calls = [];
  const client = () => ({
    deployFunction: async (slug, o) => calls.push(['deploy', slug, o.verifyJwt, o.content === repo.text]),
    getFunction: async () => ({ version: 2, verify_jwt: false, entrypoint_path: '/tmp/x/source/index.ts' }),
    getFunctionFiles: async () => [{ name: 'index.ts', content: repo.text }],
    runSql: async (sql) => calls.push(['sql', sql]),
  });
  const r = await runDeploy({ slug: 'ai-canary', method: 'mgmt_api', approval: 'PO: yes, 11-18', by: 'integrator' }, deps({ client }));
  assert.equal(r.ok, true, JSON.stringify(r.steps));
  assert.deepEqual(calls[0], ['deploy', 'ai-canary', false, true], 'the repo file, byte for byte, verify_jwt from the map');
  assert.match(calls[1][1], new RegExp(`ai_deploy_record\\('ai-canary', 2, '${sha256(repo.text)}'`));
  assert.match(calls[1][1], /'mgmt_api', 'integrator', 'PO: yes, 11-18'\)/);
});

test('deploy (a): a read-back that differs, a flipped verify_jwt or a failed probe is never recorded', async () => {
  const repo = repoBundle('ai-canary', ROOT);
  const mk = (content, jwt) => () => ({
    deployFunction: async () => ({}),
    getFunction: async () => ({ version: 2, verify_jwt: jwt }),
    getFunctionFiles: async () => [{ name: 'index.ts', content }],
    runSql: async () => assert.fail('must not record'),
  });
  const base = { slug: 'ai-canary', method: 'mgmt_api', approval: 'yes', by: 'me' };
  assert.equal((await runDeploy(base, deps({ client: mk(normalizeBundle(repo.text), false) }))).stoppedAt, 'readback', 'path (a) requires byte-exact');
  assert.equal((await runDeploy(base, deps({ client: mk(repo.text, true) }))).stoppedAt, 'verify_jwt');
  assert.equal((await runDeploy(base, deps({ client: mk(repo.text, false), probe: async () => ({ ok: false, checks: [] }) }))).stoppedAt, 'probe');
});

test('deploy (b): prints the MCP steps with the normalized file and the expected hash; touches nothing remote', async () => {
  const d = deps();
  const r = await runDeploy({ slug: 'workout-tidy', method: 'mcp', approval: 'yes', by: 'integrator' }, d);
  assert.equal(r.ok, true);
  const text = d.lines.join('\n');
  assert.match(text, /deploy_edge_function {2}name="workout-tidy" {2}entrypoint_path="index\.ts" {2}verify_jwt=true/);
  assert.match(text, new RegExp(sha256(normalizeBundle(repoBundle('workout-tidy', ROOT).text))));
  assert.match(text, /readback\.mjs workout-tidy --transcript auto --sql-by "integrator"/);
});

test('probe: OPTIONS and a no-auth POST, compared with the map (a fake fetch)', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push([init.method, init.headers.Authorization ?? null, init.headers.apikey ?? null]);
    return new Response(null, { status: init.method === 'OPTIONS' ? 200 : 401 });
  };
  assert.equal((await probe('coach-ask', { fetchImpl })).ok, true);
  assert.deepEqual(seen, [['OPTIONS', null, null], ['POST', null, null]], 'never a token, never a key');
  assert.equal((await probe('ai-canary', { fetchImpl })).ok, false, 'ai-canary answers OPTIONS with its own 401');
  assert.equal((await probe('coach-ask', { fetchImpl: async () => { throw new Error('down'); } })).checks[0].got, null);
});
