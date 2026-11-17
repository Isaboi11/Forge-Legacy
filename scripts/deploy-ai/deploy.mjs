#!/usr/bin/env node
/**
 * ══ deploy-ai: build → test → eval gate → ASK THE PO → deploy → read back + hash → probe → record ══
 *
 * The one way an Edge Function deploys (PL-5, Docs/AI-Sprint-2-Build-Notes.md §1.5; the skill that drives it is
 * .claude/skills/deploy-ai/SKILL.md). Every step must pass before the next; nothing remote happens before the PO's
 * words are passed in.
 *
 *   node scripts/deploy-ai/deploy.mjs <slug> --method mcp                      # steps 1-3 locally, then the MCP steps to do by hand
 *   node scripts/deploy-ai/deploy.mjs <slug> --method mgmt_api --po-approved "<the PO's words>" --by "<who>"
 *
 * --method mgmt_api  (path (a), byte-exact) ⛔ needs SUPABASE_ACCESS_TOKEN, which the PO has NOT OK'd yet. Uploads the
 *                    repo file as the function's single index.ts (scripts/deploy-ai/mgmt-api.mjs), reads it back
 *                    through the body endpoint and requires `same` (byte for byte), probes, then records the version
 *                    through the SQL endpoint (0271 ai_deploy_record, postgres only).
 * --method mcp       (path (b)) prints what the session does with the Supabase MCP: deploy_edge_function with the
 *                    NORMALIZED file (written to a temp path — the model reads it and passes it as content),
 *                    get_edge_function, then `node scripts/deploy-ai/readback.mjs <slug> --transcript auto --sql-by …`
 *                    for the hash verdict and the record SQL.
 *
 * Without --po-approved it never deploys: it runs the free local steps (build, tests, gate) and stops.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FUNCTIONS, PROJECT_REF } from './functions.mjs';
import { compareDeployed, hashes, normalizedOrNull, repoBundle } from './hash.mjs';
import { mgmtClient } from './mgmt-api.mjs';
import { probe as probeFn } from './probe.mjs';
import { deployRecordSql } from './record-sql.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Run a command; { code, out }. */
function sh(cmd, args, cwd = ROOT) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: false });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** The real side effects, injectable for the tests. */
export function realDeps() {
  return {
    exec: sh,
    readRepo: (slug) => repoBundle(slug, ROOT),
    client: () => mgmtClient({ token: process.env.SUPABASE_ACCESS_TOKEN, ref: process.env.SUPABASE_PROJECT_REF || PROJECT_REF }),
    probe: (slug) => probeFn(slug),
    commit: () => sh('git', ['rev-parse', 'HEAD']).out.trim(),
    writeTemp: (name, text) => {
      const p = path.join(os.tmpdir(), name);
      fs.writeFileSync(p, text);
      return p;
    },
    log: (s) => console.log(s),
  };
}

/**
 * @param {{ slug: string, method: 'mgmt_api' | 'mcp', approval?: string | null, by?: string | null }} req
 * @param {ReturnType<typeof realDeps>} deps
 * @returns {Promise<{ ok: boolean, stoppedAt: string | null, steps: { step: string, ok: boolean, note?: string }[], record?: string }>}
 */
export async function runDeploy({ slug, method, approval = null, by = null }, deps) {
  const steps = [];
  const done = (step, ok, note) => {
    steps.push({ step, ok, note });
    deps.log(`${ok ? '✓' : '✕'} ${step}${note ? ` — ${note}` : ''}`);
    return ok;
  };
  const stop = (step) => ({ ok: false, stoppedAt: step, steps });
  const meta = FUNCTIONS[slug];
  if (!meta) {
    done('map', false, `${slug} is not in scripts/deploy-ai/functions.mjs`);
    return stop('map');
  }
  if (method !== 'mgmt_api' && method !== 'mcp') {
    done('method', false, 'say --method mgmt_api or --method mcp');
    return stop('method');
  }

  // 1. BUILD — regenerate, and refuse if the committed file is not what the builder makes (drift is checked
  //    against main, so an uncommitted bundle would show as drift the next night).
  if (meta.builder) {
    const b = deps.exec('node', [meta.builder]);
    if (!done('build', b.code === 0, b.code === 0 ? meta.builder : b.out.slice(-300))) return stop('build');
  }
  const file = meta.builder ? `supabase/apply/deploy-${slug}.ts` : `supabase/functions/${slug}`;
  const clean = deps.exec('git', ['diff', '--quiet', 'HEAD', '--', file]);
  if (!done('committed', clean.code === 0, clean.code === 0 ? `${file} is committed and current` : `${file} differs from HEAD — commit it first`)) return stop('committed');
  const repo = deps.readRepo(slug);
  if (!done('bundle', !!repo, repo ? `${repo.path} (${repo.text.length} chars)` : 'no file')) return stop('bundle');

  // 2. TESTS — the files that read this function's source.
  if (meta.tests.length) {
    const t = deps.exec('node', ['--experimental-strip-types', '--test', ...meta.tests]);
    if (!done('tests', t.code === 0, `${meta.tests.length} file(s)${t.code === 0 ? '' : `: ${t.out.slice(-400)}`}`)) return stop('tests');
  } else done('tests', true, 'no test reads this function — read the diff by hand');

  // 3. EVAL GATE
  const g = deps.exec('node', ['scripts/evals/gate.mjs', slug]);
  if (!done('gate', g.code === 0, g.out.trim().split('\n').slice(-3).join(' | ').slice(0, 300))) return stop('gate');

  // 4. THE PO
  if (!approval || !String(approval).trim()) {
    done('approval', false, 'not deployed: ask the PO, then pass their words with --po-approved "…"');
    return stop('approval');
  }
  if (!by || !String(by).trim()) {
    done('approval', false, 'say who is deploying with --by "…"');
    return stop('approval');
  }
  done('approval', true, String(approval).slice(0, 120));

  if (method === 'mcp') {
    const normalized = normalizedOrNull(repo.text);
    if (!done('normalize', normalized != null, 'the MCP-safe file (pure ASCII, no long comment runs)')) return stop('normalize');
    const tmp = deps.writeTemp(`deploy-ai-${slug}.ts`, normalized);
    const h = hashes(normalized);
    deps.log(
      [
        '',
        'NEXT, in this session (Supabase MCP):',
        `  1. deploy_edge_function  name="${slug}"  entrypoint_path="index.ts"  verify_jwt=${meta.verifyJwt}`,
        `       files=[{ name: "index.ts", content: <the file ${tmp}, read it and pass it unchanged> }]`,
        `  2. get_edge_function  function_slug="${slug}"`,
        `  3. node scripts/deploy-ai/readback.mjs ${slug} --transcript auto --sql-by "${by}" --note "${String(approval).replace(/"/g, "'").slice(0, 120)}"`,
        `       must say EXACT (expected normalized sha256 ${h.raw}); anything else → redeploy, never record`,
        `  4. node scripts/deploy-ai/probe.mjs ${slug}`,
        '  5. execute_sql with the record SQL step 3 printed',
      ].join('\n'),
    );
    done('handoff', true, `MCP steps printed; temp file ${tmp}`);
    return { ok: true, stoppedAt: null, steps };
  }

  // 5. DEPLOY (path (a), byte-exact)
  let client;
  try {
    client = deps.client();
  } catch (e) {
    done('token', false, String(e?.message ?? e));
    return stop('token');
  }
  try {
    await client.deployFunction(slug, { content: repo.text, verifyJwt: meta.verifyJwt });
    done('deploy', true, `uploaded ${repo.path} as index.ts, verify_jwt=${meta.verifyJwt}`);
  } catch (e) {
    done('deploy', false, String(e?.message ?? e));
    return stop('deploy');
  }

  // 6. READ BACK — byte for byte, or it is not recorded.
  let info;
  let cmp;
  try {
    info = await client.getFunction(slug);
    const files = await client.getFunctionFiles(slug);
    cmp = compareDeployed(files, info.entrypoint_path, repo.text);
  } catch (e) {
    done('readback', false, String(e?.message ?? e));
    return stop('readback');
  }
  if (!done('readback', cmp.status === 'same', `v${info.version} ${cmp.status}${cmp.detail ? ` — ${cmp.detail}` : ''}`)) return stop('readback');
  if (!done('verify_jwt', info.verify_jwt === meta.verifyJwt, `live ${info.verify_jwt}, map ${meta.verifyJwt}`)) return stop('verify_jwt');

  // 7. PROBE
  const p = await deps.probe(slug);
  if (!done('probe', p.ok, p.checks.map((c) => `${c.what} ${c.got}/${c.expected}`).join(' · '))) return stop('probe');

  // 8. RECORD
  const sql = deployRecordSql({
    slug,
    version: info.version,
    sha256Raw: cmp.live.raw,
    sha256Normalized: cmp.live.normalized ?? cmp.live.raw,
    commit: deps.commit() || null,
    method: 'mgmt_api',
    by,
    note: String(approval).slice(0, 500),
  });
  try {
    await client.runSql(sql);
    done('record', true, `ai_deploy_log ${slug} v${info.version}`);
  } catch (e) {
    done('record', false, `deployed and verified, but not recorded: ${String(e?.message ?? e)} — run the SQL by hand: ${sql}`);
    return { ok: false, stoppedAt: 'record', steps, record: sql };
  }
  return { ok: true, stoppedAt: null, steps, record: sql };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const opt = (k) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : null;
  };
  const slug = args[0];
  if (!slug || slug.startsWith('--')) {
    console.error('usage: node scripts/deploy-ai/deploy.mjs <slug> --method mcp|mgmt_api [--po-approved "<words>"] [--by "<who>"]');
    process.exit(2);
  }
  const r = await runDeploy({ slug, method: opt('--method'), approval: opt('--po-approved'), by: opt('--by') }, realDeps());
  process.exit(r.ok ? 0 : 1);
}
