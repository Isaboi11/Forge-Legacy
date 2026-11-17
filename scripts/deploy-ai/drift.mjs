#!/usr/bin/env node
/**
 * ══ THE NIGHTLY DRIFT CHECK — is every deployed function what the repo (main = build 11) holds? ══
 *
 * PL-5 (Docs/AI-Road-To-10-Plan-v1.0.md §2), platform gate ③ "deployed code == repo (checked daily)". Audit P-G5:
 * program-photo-read ran seven weeks stale and nobody could see it. This runs every night from
 * .github/workflows/drift.yml on `main` and records one row per function in 0271's `ai_drift_checks`; /admin-ai's
 * "Deployed code" card lists anything that is not same / same_after_normalize. $0: Management API reads and one SQL
 * call, no model.
 *
 *   SUPABASE_ACCESS_TOKEN=… node scripts/deploy-ai/drift.mjs [--record] [--json <out.json>]
 *
 * Without --record it only prints. With --record it writes the run through the Management API's SQL endpoint
 * (`select public.ai_drift_record(…)` — postgres only, 0271). Exit 1 when something unexpected differs (GitHub
 * then marks the run red and emails the repo owner); a function known not to be deployed (social-sync) or a known
 * orphan slug (recipe-phot-read) is reported but does not fail the run.
 *
 * For each live function: fetch its files (GET …/functions/{slug}/body, multipart) and compare its index.ts with
 * the repo bundle (scripts/deploy-ai/hash.mjs): same · same_after_normalize · differs. Then: live but not in the
 * repo map → missing_in_repo; in the map but not live → missing_live; a fetch that fails → fetch_failed (never
 * guessed as same).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FUNCTIONS, KNOWN_ORPHANS, PROJECT_REF } from './functions.mjs';
import { MATCHING, compareDeployed, repoBundle, sha256 } from './hash.mjs';
import { mgmtClient } from './mgmt-api.mjs';
import { driftRecordSql } from './record-sql.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Not deployed on purpose (2026-11-17): reported as missing_live without failing the run. */
export const EXPECTED_NOT_LIVE = new Set(['social-sync']);

/**
 * One run. `client` is the Management API client (or a fake in the tests).
 * @returns {Promise<{ rows: { slug: string, status: string, deployedVersion: number | null, deployedSha256: string | null, repoSha256: string | null, detail: string | null, expected: boolean }[], unexpected: number }>}
 */
export async function runDrift({ client, root = ROOT, functions = FUNCTIONS, orphans = KNOWN_ORPHANS, expectedNotLive = EXPECTED_NOT_LIVE }) {
  const live = await client.listFunctions();
  const liveBySlug = new Map(live.map((f) => [f.slug, f]));
  const rows = [];
  for (const f of [...live].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (!functions[f.slug]) {
      rows.push({
        slug: f.slug,
        status: 'missing_in_repo',
        deployedVersion: f.version ?? null,
        deployedSha256: null,
        repoSha256: null,
        detail: orphans[f.slug] ?? 'deployed, but not in scripts/deploy-ai/functions.mjs',
        expected: !!orphans[f.slug],
      });
      continue;
    }
    const repo = repoBundle(f.slug, root);
    if (!repo) {
      rows.push({ slug: f.slug, status: 'missing_in_repo', deployedVersion: f.version ?? null, deployedSha256: null, repoSha256: null, detail: 'in the map, but its file is not in this checkout', expected: false });
      continue;
    }
    let files;
    try {
      files = await client.getFunctionFiles(f.slug);
    } catch (e) {
      rows.push({ slug: f.slug, status: 'fetch_failed', deployedVersion: f.version ?? null, deployedSha256: null, repoSha256: sha256(repo.text), detail: String(e?.message ?? e).slice(0, 300), expected: false });
      continue;
    }
    const cmp = compareDeployed(files, f.entrypoint_path, repo.text);
    const jwtNote = typeof f.verify_jwt === 'boolean' && f.verify_jwt !== functions[f.slug].verifyJwt ? `verify_jwt is ${f.verify_jwt} live, ${functions[f.slug].verifyJwt} in the map` : null;
    rows.push({
      slug: f.slug,
      status: jwtNote && MATCHING.has(cmp.status) ? 'differs' : cmp.status,
      deployedVersion: f.version ?? null,
      deployedSha256: cmp.live?.raw ?? null,
      repoSha256: cmp.repo?.raw ?? null,
      detail: [cmp.detail, jwtNote].filter(Boolean).join(' · ') || null,
      expected: false,
    });
  }
  for (const slug of Object.keys(functions).sort()) {
    if (liveBySlug.has(slug)) continue;
    const repo = repoBundle(slug, root);
    rows.push({
      slug,
      status: 'missing_live',
      deployedVersion: null,
      deployedSha256: null,
      repoSha256: repo ? sha256(repo.text) : null,
      detail: expectedNotLive.has(slug) ? 'not deployed on purpose' : 'in the repo, not deployed',
      expected: expectedNotLive.has(slug),
    });
  }
  const unexpected = rows.filter((r) => !MATCHING.has(r.status) && !r.expected).length;
  return { rows, unexpected };
}

/** The commit being checked: $GITHUB_SHA in Actions, else `git rev-parse HEAD`. */
export function sourceCommit(env = process.env, root = ROOT) {
  if (/^[0-9a-f]{40}$/.test(env.GITHUB_SHA ?? '')) return env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const client = mgmtClient({ token: process.env.SUPABASE_ACCESS_TOKEN, ref: process.env.SUPABASE_PROJECT_REF || PROJECT_REF });
  const { rows, unexpected } = await runDrift({ client });
  for (const r of rows) {
    const mark = MATCHING.has(r.status) ? '✓' : r.expected ? '·' : '✕';
    console.log(`${mark} ${r.slug.padEnd(20)} ${String(r.deployedVersion ?? '-').padStart(3)}  ${r.status}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  const ji = args.indexOf('--json');
  if (ji >= 0 && args[ji + 1]) fs.writeFileSync(args[ji + 1], JSON.stringify({ rows, unexpected }, null, 2));
  if (args.includes('--record')) {
    const res = await client.runSql(driftRecordSql({ sourceCommit: sourceCommit(), rows }));
    console.log(`recorded: ${JSON.stringify(res)}`);
  }
  console.log(`${rows.length} functions · ${unexpected} unexpected`);
  process.exit(unexpected ? 1 : 0);
}
