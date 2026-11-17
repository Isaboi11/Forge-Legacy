/**
 * The SQL that records a deploy (0271 `ai_deploy_record`) and a drift run (0271 `ai_drift_record`).
 *
 * Both writers are callable by `postgres` only, so this SQL is run through the Supabase MCP's `execute_sql` (path (b),
 * by the session the PO approved) or the Management API's `database/query` (path (a) and the nightly job). Values are
 * quoted here, never interpolated raw: a slug or a note can never become SQL.
 */

import crypto from 'node:crypto';

import { DEPLOY_METHODS, DRIFT_STATUSES } from './hash.mjs';

/** A Postgres string literal (standard_conforming_strings: only `'` needs doubling). */
export function sqlString(v) {
  if (v == null) return 'null';
  const s = String(v);
  if (s.includes('\0')) throw new Error('sqlString: NUL byte');
  return `'${s.replace(/'/g, "''")}'`;
}

const HEX64 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{7,40}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** `select public.ai_deploy_record(…) as id;` — validated here too, so a bad call fails before it reaches SQL. */
export function deployRecordSql({ slug, version, sha256Raw, sha256Normalized, commit, method, by, note = null }) {
  if (!SLUG.test(slug ?? '')) throw new Error(`deployRecordSql: bad slug ${slug}`);
  if (!Number.isInteger(version) || version < 1) throw new Error(`deployRecordSql: bad version ${version}`);
  if (!HEX64.test(sha256Raw ?? '') || !HEX64.test(sha256Normalized ?? '')) throw new Error('deployRecordSql: hashes must be 64 lowercase hex');
  if (commit != null && !COMMIT.test(commit)) throw new Error(`deployRecordSql: bad commit ${commit}`);
  if (!DEPLOY_METHODS.includes(method)) throw new Error(`deployRecordSql: method must be one of ${DEPLOY_METHODS.join(', ')}`);
  if (!by || String(by).trim().length === 0 || String(by).length > 80) throw new Error('deployRecordSql: say who deployed it (1-80 characters)');
  return `select public.ai_deploy_record(${sqlString(slug)}, ${version}, ${sqlString(sha256Raw)}, ${sqlString(sha256Normalized)}, ${sqlString(commit)}, ${sqlString(method)}, ${sqlString(by)}, ${sqlString(note)}) as id;`;
}

/**
 * `select public.ai_drift_record($tag$<json>$tag$::jsonb) as rows;` — the JSON goes in a dollar-quoted literal whose
 * tag is random and checked absent from the payload, so no character in it needs escaping.
 */
export function driftRecordSql({ sourceCommit, rows }, rand = () => crypto.randomBytes(6).toString('hex')) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) throw new Error('driftRecordSql: 1 to 200 rows');
  for (const r of rows) {
    if (!SLUG.test(r.slug ?? '')) throw new Error(`driftRecordSql: bad slug ${r.slug}`);
    if (!DRIFT_STATUSES.includes(r.status)) throw new Error(`driftRecordSql: bad status ${r.status}`);
  }
  if (sourceCommit != null && !COMMIT.test(sourceCommit)) throw new Error(`driftRecordSql: bad commit ${sourceCommit}`);
  const payload = JSON.stringify({
    source_commit: sourceCommit ?? null,
    rows: rows.map((r) => ({
      slug: r.slug,
      status: r.status,
      deployed_version: r.deployedVersion ?? null,
      deployed_sha256: r.deployedSha256 ?? null,
      repo_sha256: r.repoSha256 ?? null,
      detail: r.detail ? String(r.detail).slice(0, 500) : null,
    })),
  });
  let tag;
  do tag = `drift_${rand()}`;
  while (payload.includes(`$${tag}$`));
  return `select public.ai_drift_record($${tag}$${payload}$${tag}$::jsonb) as rows;`;
}
