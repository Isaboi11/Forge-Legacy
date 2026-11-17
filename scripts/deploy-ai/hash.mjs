/**
 * ══ IS WHAT RUNS WHAT THE REPO HOLDS? — one comparison, used by the deploy read-back and the nightly drift check ══
 *
 * PL-5 (Docs/AI-Sprint-2-Build-Notes.md §1.5). Two hashes per file, both sha256 of the UTF-8 text:
 *
 *   raw         the exact text. "same" means byte for byte (a Management API deploy of the repo bundle).
 *   normalized  after scripts/lib/bundle-normalize.mjs (ASCII escapes, comments transliterated, long runs collapsed,
 *               CRLF → LF). "same_after_normalize" means the same program with only comment / escape / line-ending
 *               differences — an MCP deploy (retyped) of the normalized bundle, or an older deploy of the
 *               un-normalized one — or the same token stream with only COMMENT text changed (said in the detail).
 *               Never for a code change: that is decided by the scanner’s token stream, comments aside.
 *
 * Statuses (the 0271 table's check constraint, the /admin-ai card and the drift job share this list):
 *   same · same_after_normalize · differs · missing_in_repo · missing_live · fetch_failed
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { firstTokenDifference, normalizeBundle } from '../lib/bundle-normalize.mjs';
import { FUNCTIONS } from './functions.mjs';

export const DRIFT_STATUSES = ['same', 'same_after_normalize', 'differs', 'missing_in_repo', 'missing_live', 'fetch_failed'];
/** The two statuses that mean "what runs is what the repo holds". */
export const MATCHING = new Set(['same', 'same_after_normalize']);
export const DEPLOY_METHODS = ['mgmt_api', 'mcp', 'dashboard', 'cli'];

export const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

/** The normalized text, or null when it cannot be normalized (a file that does not parse is simply "differs"). */
export function normalizedOrNull(text) {
  try {
    return normalizeBundle(text);
  } catch {
    return null;
  }
}

/** True when two parseable files are the same token stream (kinds + cooked values), comments and whitespace aside. */
function sameTokens(a, b) {
  try {
    return firstTokenDifference(a, b) === null;
  } catch {
    return false;
  }
}

/** Both hashes of one text. */
export function hashes(text) {
  const n = normalizedOrNull(text);
  return { raw: sha256(text), normalized: n == null ? null : sha256(n) };
}

/**
 * What the repo would deploy for `slug`: the committed bundle when a builder exists, else the function source.
 * @returns {{ slug: string, path: string, text: string, builder: boolean } | null}
 */
export function repoBundle(slug, root) {
  const meta = FUNCTIONS[slug];
  const rel = meta?.builder ? `supabase/apply/deploy-${slug}.ts` : `supabase/functions/${slug}/index.ts`;
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  // The committed form is LF (git stores LF; Windows checkouts add CR, which is not what gets deployed).
  return { slug, path: rel, text: fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n'), builder: !!meta?.builder };
}

/** "line 336: live `…` vs repo `…`" — where two texts first part, for a human (code is not secret; it is clipped). */
export function firstDifference(a, b) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) {
      const clip = (s) => (s == null ? '(end of file)' : JSON.stringify(s.length > 70 ? `${s.slice(0, 70)}…` : s));
      return `line ${i + 1}: live ${clip(la[i])} vs repo ${clip(lb[i])}`;
    }
  }
  return null;
}

/**
 * Compare a deployed file with the repo's.
 * @returns {{ status: 'same' | 'same_after_normalize' | 'differs', detail: string | null, live: { raw: string, normalized: string | null }, repo: { raw: string, normalized: string | null } }}
 */
export function compareSource(liveText, repoText) {
  const liveN = normalizedOrNull(liveText);
  const repoN = normalizedOrNull(repoText);
  const live = { raw: sha256(liveText), normalized: liveN == null ? null : sha256(liveN) };
  const repo = { raw: sha256(repoText), normalized: repoN == null ? null : sha256(repoN) };
  if (live.raw === repo.raw) return { status: 'same', detail: null, live, repo };
  if (live.normalized && live.normalized === repo.normalized) return { status: 'same_after_normalize', detail: null, live, repo };
  const where = firstDifference(liveN ?? liveText, repoN ?? repoText);
  // The same program with different COMMENT text (a retyped rule, a reworded note — workout-card-read v4's line 336)
  // is the same code: the scanner's token stream, comments aside, is identical. Said in the detail, never hidden.
  if (liveN != null && repoN != null && sameTokens(liveText, repoText)) {
    return { status: 'same_after_normalize', detail: `comments differ only (${where ?? 'whitespace'})`.slice(0, 480), live, repo };
  }
  const why = liveN == null ? 'the deployed file does not parse' : where ? `first difference (normalized) at ${where}` : 'differs';
  return { status: 'differs', detail: why.slice(0, 480), live, repo };
}

/**
 * The deployed entry file out of a function's file list ([{ name, content }], names as the MCP / body endpoint give
 * them). `index.ts` by name, else the one the entrypoint path ends with, else the only file.
 */
export function entryFile(files, entrypointPath) {
  if (!Array.isArray(files) || files.length === 0) return null;
  const tail = (p) => String(p ?? '').replace(/\\/g, '/').replace(/^.*\/source\//, '').replace(/^\.?\//, '');
  const byName = files.find((f) => tail(f.name) === 'index.ts');
  if (byName) return byName;
  const ep = tail(entrypointPath);
  return files.find((f) => tail(f.name) === ep) ?? (files.length === 1 ? files[0] : null);
}

/** Compare a deployed function's files with the repo bundle; a multi-file deploy is named in the detail. */
export function compareDeployed(files, entrypointPath, repoText) {
  const entry = entryFile(files, entrypointPath);
  if (!entry || typeof entry.content !== 'string') {
    return { status: 'fetch_failed', detail: `no entry file among ${files?.length ?? 0} deployed file(s)`, live: null, repo: { raw: sha256(repoText), normalized: null } };
  }
  const r = compareSource(entry.content, repoText);
  if (files.length > 1) {
    const extra = `${files.length} files deployed (${files.map((f) => f.name).join(', ').slice(0, 200)}); the repo bundle is one`;
    return { ...r, detail: [r.detail, extra].filter(Boolean).join(' · ').slice(0, 480) };
  }
  return r;
}
