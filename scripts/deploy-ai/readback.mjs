#!/usr/bin/env node
/**
 * ══ DEPLOY PATH (b): HASH WHAT THE MCP SAYS IS DEPLOYED — straight from the session's own transcript ══
 *
 * After `deploy_edge_function` (the Supabase MCP), the deploying session calls `get_edge_function` for the same slug.
 * The model never copies that answer anywhere — a model retyping 140 KB to hash it is the very error this checks
 * for. Instead this script reads the tool result OUT OF THE SESSION'S TRANSCRIPT, byte for byte, and hashes it:
 *
 *   node scripts/deploy-ai/readback.mjs <slug> --transcript auto [--after <ISO time>] [--json]
 *   node scripts/deploy-ai/readback.mjs <slug> --transcript <path/to/session.jsonl>
 *
 * Where the transcript is: Claude Code writes every session to
 *   ~/.claude/projects/<project-key>/<session-id>.jsonl                          (a top-level session)
 *   ~/.claude/projects/<project-key>/<session-id>/subagents/agent-<id>.jsonl     (a subagent)
 * `--transcript auto` takes the most recently written .jsonl under ~/.claude/projects that holds a
 * `get_edge_function` call for <slug> (the session that just made the call is the one writing). It prints the path
 * it used — check it is yours. In each file, one JSON object per line: the assistant line carries
 * `message.content[] = { type: 'tool_use', id, name: 'mcp__supabase__get_edge_function', input: { function_slug } }`
 * and the next user line `message.content[] = { type: 'tool_result', tool_use_id: <that id>, content: [{ type:
 * 'text', text: '<the JSON the MCP returned>' }] }`. A big answer is not inline: the text says "Output has been
 * saved to <file>", and that file holds the JSON — this script follows it.
 *
 * It prints the deployed version, verify_jwt, both hashes of the deployed index.ts, and the verdict against the repo:
 *   exact                 the deployed text IS the normalized repo bundle, byte for byte (what an MCP deploy sends)
 *   same / same_after_normalize / differs   (scripts/deploy-ai/hash.mjs)
 * Exit 0 only when exact or same — an MCP deploy that lands `differs` is redeployed, never recorded as good.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execFileSync } from 'node:child_process';

import { compareDeployed, entryFile, hashes, normalizedOrNull, repoBundle, sha256 } from './hash.mjs';
import { deployRecordSql } from './record-sql.mjs';

const TOOL = 'mcp__supabase__get_edge_function';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

/** The text of a tool_result block (string, or an array of text parts). */
function resultText(block) {
  if (typeof block.content === 'string') return block.content;
  if (Array.isArray(block.content)) return block.content.filter((c) => c?.type === 'text').map((c) => c.text).join('');
  return '';
}

/** The MCP's JSON out of a tool result's text — inline, wrapped in {result}, or saved to a file. */
export function parseEdgeFunctionResult(text, readFile = (p) => fs.readFileSync(p, 'utf8')) {
  let t = text.trim();
  const saved = /saved to:?\s*([^\n]+?\.txt)\b/i.exec(t);
  if (!t.startsWith('{') && saved) t = readFile(saved[1].trim()).trim();
  let j = JSON.parse(t);
  if (typeof j?.result === 'string' && j.result.trim().startsWith('{')) j = JSON.parse(j.result);
  if (!j || !Array.isArray(j.files)) throw new Error('readback: the tool result has no files[]');
  return j;
}

/**
 * The newest get_edge_function read-back for `slug` in one transcript (optionally only after `after`).
 * @returns {{ toolUseId: string, at: string | null, fn: { version: number, verify_jwt: boolean, entrypoint_path?: string, files: { name: string, content: string }[] } } | null}
 */
export function findReadback(jsonlText, slug, { after = null, readFile } = {}) {
  const uses = new Map();
  const results = new Map();
  for (const line of jsonlText.split('\n')) {
    if (!line.includes(TOOL) && !line.includes('tool_result')) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const content = o?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (b?.type === 'tool_use' && b.name === TOOL && b.input?.function_slug === slug) uses.set(b.id, o.timestamp ?? null);
      if (b?.type === 'tool_result' && b.tool_use_id) results.set(b.tool_use_id, { text: resultText(b), at: o.timestamp ?? null });
    }
  }
  const ids = [...uses.keys()].filter((id) => results.has(id) && (!after || (uses.get(id) ?? '') >= after));
  if (!ids.length) return null;
  const id = ids[ids.length - 1];
  return { toolUseId: id, at: uses.get(id), fn: parseEdgeFunctionResult(results.get(id).text, readFile) };
}

/** Every .jsonl under ~/.claude/projects, newest first. */
function transcripts(home = os.homedir()) {
  const top = path.join(home, '.claude', 'projects');
  const out = [];
  const walk = (dir, depth) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < 4) walk(p, depth + 1);
      else if (e.isFile() && e.name.endsWith('.jsonl')) out.push({ p, m: fs.statSync(p).mtimeMs });
    }
  };
  walk(top, 0);
  return out.sort((a, b) => b.m - a.m).map((x) => x.p);
}

/** The newest transcript that holds a read-back of `slug` (looks at the 40 most recently written). */
export function autoTranscript(slug, list = transcripts()) {
  const needle = `"function_slug":"${slug}"`;
  for (const p of list.slice(0, 40)) {
    const t = fs.readFileSync(p, 'utf8');
    if (t.includes(needle) && t.includes(TOOL)) return p;
  }
  return null;
}

/** The verdict for one read-back against the repo. */
export function readbackReport(slug, fn, root = ROOT) {
  const repo = repoBundle(slug, root);
  const entry = entryFile(fn.files, fn.entrypoint_path);
  const live = entry ? hashes(entry.content) : null;
  if (!repo) return { slug, version: fn.version, verifyJwt: fn.verify_jwt, live, repo: null, status: 'missing_in_repo', exact: false, detail: null };
  const repoNormalized = normalizedOrNull(repo.text);
  const cmp = compareDeployed(fn.files, fn.entrypoint_path, repo.text);
  const exact = !!entry && repoNormalized != null && sha256(entry.content) === sha256(repoNormalized);
  return {
    slug,
    version: fn.version,
    verifyJwt: fn.verify_jwt,
    files: fn.files.length,
    live,
    repo: { path: repo.path, raw: sha256(repo.text), normalized: repoNormalized == null ? null : sha256(repoNormalized) },
    status: cmp.status,
    exact,
    detail: cmp.detail,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const slug = args[0];
  const opt = (k) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : null;
  };
  if (!slug || slug.startsWith('--')) {
    console.error('usage: node scripts/deploy-ai/readback.mjs <slug> --transcript auto|<file.jsonl> [--after <ISO>] [--json]');
    process.exit(2);
  }
  const t = opt('--transcript') ?? 'auto';
  const file = t === 'auto' ? autoTranscript(slug) : t;
  if (!file) {
    console.error(`no transcript holds a get_edge_function call for ${slug} — call it first, then run this`);
    process.exit(2);
  }
  const found = findReadback(fs.readFileSync(file, 'utf8'), slug, { after: opt('--after') });
  if (!found) {
    console.error(`${file}: no get_edge_function result for ${slug}${opt('--after') ? ` after ${opt('--after')}` : ''}`);
    process.exit(2);
  }
  const r = readbackReport(slug, found.fn);
  const by = opt('--sql-by');
  const good = r.exact || r.status === 'same';
  // The record is printed only for a good read-back: a `differs` deploy is redeployed, never recorded.
  const sql =
    by && good && r.live?.raw
      ? deployRecordSql({ slug, version: r.version, sha256Raw: r.live.raw, sha256Normalized: r.live.normalized ?? r.live.raw, commit: gitHead(), method: 'mcp', by, note: opt('--note') })
      : null;
  if (args.includes('--json')) console.log(JSON.stringify({ transcript: file, toolUseId: found.toolUseId, at: found.at, ...r, recordSql: sql }, null, 2));
  else {
    console.log(`transcript   ${file}`);
    console.log(`read-back    ${found.toolUseId} at ${found.at ?? '?'}`);
    console.log(`${slug} v${r.version} · verify_jwt ${r.verifyJwt} · ${r.files} file(s)`);
    console.log(`deployed     raw ${r.live?.raw ?? '-'}  normalized ${r.live?.normalized ?? '-'}`);
    console.log(`repo         ${r.repo?.path ?? '(none)'}  raw ${r.repo?.raw ?? '-'}  normalized ${r.repo?.normalized ?? '-'}`);
    console.log(`verdict      ${r.exact ? 'EXACT (the normalized repo bundle, byte for byte)' : r.status}${r.detail ? ` — ${r.detail}` : ''}`);
    if (sql) console.log(`\nrecord it (Supabase MCP execute_sql, as postgres):\n${sql}`);
    else if (by) console.log('\nNOT recorded: the read-back is not exact — redeploy.');
  }
  process.exit(good ? 0 : 1);
}
