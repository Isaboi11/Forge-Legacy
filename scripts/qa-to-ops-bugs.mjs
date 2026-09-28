#!/usr/bin/env node
// Turns every finding in Docs/QA/Full-App-QA-2026-09-26.md into a row for
// public.ops_bugs and writes supabase/apply/seed-ops-bugs-qa-0926.sql.
//
// How the doc counts (and so how this parser counts):
//
// Round 1 (203 items). One item per severity-tagged entry:
//   - `### F1. [Critical] …` headings (section 1),
//   - `### B1. [Medium] …` headings (section 2; B16 "Slow spots" has no
//     severity and is not counted by the doc),
//   - `- [Medium] …` bullets in sections 3, 4 and 5.
//   Not findings: the Summary, the tap-count table, the untagged
//   "Console errors" bullets, section 6 (coverage / QA data left behind) and
//   Appendix A (skeptic re-check table, whose final severities are already
//   the ones printed on the items).
//
// Round 2 (108 items). The doc counts round-2 LANE FINDINGS: 122 raw lane ids
// (N-xx, holtai-xx, kitchen-xx, social2-xx), minus 10 that were round-1 items
// seen again (they appear only in the round-1 part as "also seen in round 2"),
// minus 4 merged pairs (two ids on one entry). So:
//   - `#### R2-F1. [Critical] …` headings are one item each (ref = R2-Fn),
//   - tagged `- [Low] …` bullets are one item each (ref = lead lane id),
//   - the R2-B bundles (R2-B1…R2-B8) are summaries: each lane finding inside
//     a bundle that has no tagged entry of its own becomes an item (ref = its
//     lane id) with the bundle's severity. R2-B8 "Slow spots" has no severity;
//     its one new finding (N-25) is rated low (the doc: "None of these felt
//     broken").
//   - The two tagged bullets in R2.5 that only restate R2-F1 / R2-F6 are
//     duplicates and are skipped. The R2.7 re-check table is not findings.
//
// Usage: node scripts/qa-to-ops-bugs.mjs   (node builtins only)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
export const DOC_PATH = resolve(ROOT, 'Docs/QA/Full-App-QA-2026-09-26.md');
export const SQL_PATH = resolve(ROOT, 'supabase/apply/seed-ops-bugs-qa-0926.sql');
export const REPORT = 'Full-App-QA-2026-09-26';
const MAX_DETAIL = 4000;

const SEV_RE = /\[(Critical|High|Medium|Low)[^\]]*\]/;
const R1_ID_RE = /\b(?:auth|home|library|programs|holt|workout|legacy|social|settings|firstuser|visualA|visualB)-\d+/g;
const R2_ID_RE = /\b(?:N|holtai|kitchen|social2)-\d+\b/g;

const R2_LANE_AREA = { N: 'nutrition', kitchen: "holt's kitchen", holtai: 'holt', social2: 'squads & social' };
const R1_LANE_AREA = {
  auth: 'sign-in & account', home: 'home', library: 'exercise library & builders', programs: 'programs',
  holt: 'holt', workout: 'workout', legacy: 'legacy', social: 'squads & social', settings: 'settings',
  firstuser: 'first-time user', visualA: 'app-wide visuals', visualB: 'app-wide visuals',
};
const R1_SUBSECTION_AREA = [
  [/^sign-in/, 'sign-in & account'],
  [/^home/, 'home'],
  [/^(workouts, programs|programs)/, 'programs'],
  [/^(logging a workout|workout)/, 'workout'],
  [/^holt/, 'holt'],
  [/^legacy/, 'legacy'],
  [/^squads/, 'squads & social'],
  [/^settings/, 'settings'],
  [/^(tab bar|lines you should|alabaster leaks)/, 'app-wide visuals'],
  [/^(builders|exercise library)/, 'exercise library & builders'],
];

const indentOf = (l) => l.match(/^ */)[0].length;
const isBlank = (l) => l.trim() === '';
// Drop cross-references like "(…; see holt-04)" / "see B9 (" so only an entry's own ids count.
const stripSee = (s) => s.replace(/\bsee (?=(?:[A-Za-z0-9]+-)?[A-Z]?\d|[a-z]+\d?-\d)[^);(]*/g, '');
const r2IdsIn = (s) => [...new Set(stripSee(s).match(R2_ID_RE) ?? [])];
const laneOf = (id) => id.replace(/-\d+$/, '');

function plain(s) {
  return s
    .replace(/`[^`]*\.png`/g, '')
    .replace(/\*\*/g, '')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1$2')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(s) {
  const masked = s.replace(/\b(e\.g|i\.e|vs)\./g, (x) => x.replace(/\./g, '\u0000'));
  const m = masked.match(/^(.+?[.!?])(?:\s|$)/);
  return (m ? m[1] : masked).replace(/\u0000/g, '.').trim();
}

function cap(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

/** Title for a bullet line (first line of the block, plus first child if the line is only a label). */
function bulletTitle(firstLine, firstChild) {
  let t = firstLine.replace(/^\s*- /, '').replace(SEV_RE, '').trim();
  // A bold lead that is a whole sentence is the title; a bold fragment ("When you're over target,") is not.
  const bold = t.match(/^\*\*(.+?)\*\*/);
  if (bold && /[.!?]$/.test(bold[1].trim())) {
    return cap(plain(bold[1]).replace(/[.,:]$/, ''), 140);
  }
  let p = plain(t)
    .replace(/\((?:[^()]*?\b(?:[A-Za-z]+\d?-\d+|R2-[FB]\d+)\b[^()]*)\)/g, '')
    .replace(/\s+([,.:;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (p.endsWith(':') && firstChild) p = `${p} ${plain(firstChild.replace(/^\s*- /, ''))}`;
  return cap(firstSentence(p).replace(/[.,:]$/, ''), 140);
}

function headingTitle(text) {
  return cap(plain(text).replace(/\s*\((?:[^()]*\b[A-Za-z]+\d?-\d+\b[^()]*)\)\s*$/, '').trim(), 140);
}

function clipDetail(s) {
  const t = s.replace(/\s+$/, '').replace(/^\s*\n/, '');
  return t.length <= MAX_DETAIL ? t : t.slice(0, MAX_DETAIL - 1) + '…';
}

/** Lines [start, end) of a bullet block: the bullet plus every deeper-indented line under it. */
function blockEnd(lines, start, end) {
  const base = indentOf(lines[start]);
  let i = start + 1;
  while (i < end && !isBlank(lines[i]) && indentOf(lines[i]) > base) i++;
  return i;
}

function dedent(blockLines) {
  const base = indentOf(blockLines[0]);
  return blockLines.map((l) => l.slice(Math.min(base, indentOf(l)))).join('\n').replace(/^- /, '');
}

export function parseQa(md) {
  const lines = md.split(/\r?\n/);
  const find = (re, from = 0) => { for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i; return -1; };
  const r1Start = find(/^## 1\. /);
  const r1End = find(/^## 6\. /);
  const r2Start = find(/^## Round 2/);
  if (r1Start < 0 || r1End < 0 || r2Start < 0) throw new Error('doc layout changed: section markers not found');

  const items = [];
  const usedRefs = new Set();
  const push = (it) => {
    if (usedRefs.has(it.ref)) throw new Error(`duplicate ref ${it.ref}`);
    usedRefs.add(it.ref);
    items.push({ status: 'open', ...it, detail: clipDetail(it.detail) });
  };
  const headingEnd = (from) => {
    let i = from + 1;
    while (i < lines.length && !/^#{1,4} /.test(lines[i]) && lines[i].trim() !== '---') i++;
    return i;
  };

  // ---------------- Round 1 ----------------
  let h3 = '';
  let ordinal = 0;
  for (let i = r1Start; i < r1End; i++) {
    const l = lines[i];
    const hm = l.match(/^### ([FB]\d+)\. (?:\[(Critical|High|Medium|Low)\] )?(.*)$/);
    if (hm) {
      h3 = hm[3];
      const end = headingEnd(i);
      if (hm[2]) {
        const body = lines.slice(i + 1, end).join('\n');
        const lane = body.match(/^- Lanes: (\w+)/m)?.[1];
        push({
          ref: hm[1],
          title: headingTitle(hm[3]),
          severity: hm[2].toLowerCase(),
          area: hm[1].startsWith('F') ? (R1_LANE_AREA[lane] ?? 'cross-app') : 'cross-app',
          round: 1,
          detail: body,
          source_line: l,
        });
      }
      i = end - 1;
      continue;
    }
    const h3m = l.match(/^### (.*)$/);
    if (h3m) { h3 = h3m[1]; continue; }
    const bm = l.match(/^- (?:\*\*)?\[(Critical|High|Medium|Low)\]/);
    if (!bm) continue;
    const end = blockEnd(lines, i, r1End);
    const block = lines.slice(i, end);
    const lead = l.split(/\*Also seen/)[0];
    const laneIds = lead.match(R1_ID_RE) ?? [];
    ordinal++;
    let ref = laneIds.find((id) => !usedRefs.has(id));
    if (!ref) ref = `R1-${ordinal}`;
    const sub = h3.toLowerCase();
    const area = R1_SUBSECTION_AREA.find(([re]) => re.test(sub))?.[1] ?? 'cross-app';
    push({
      ref,
      title: bulletTitle(l, block[1]),
      severity: bm[1].toLowerCase(),
      area,
      round: 1,
      detail: dedent(block),
      source_line: l,
      status: /\*\*fixed\*\*/i.test(l) ? 'fixed' : 'open',
    });
    i = end - 1;
  }

  // ---------------- Round 2 ----------------
  // Pass 1: tagged entries (R2-F headings and tagged bullets). They claim their lane ids.
  const claimed = new Set();
  const bundles = [];
  for (let i = r2Start; i < lines.length; i++) {
    const l = lines[i];
    if (/^### R2\.7 /.test(l)) break; // skeptic re-check table: not findings
    const hm = l.match(/^#### (R2-[FB]\d+)\. (?:\[(Critical|High|Medium|Low)\] )?(.*)$/);
    if (hm) {
      const end = headingEnd(i);
      if (hm[1].startsWith('R2-F')) {
        const ids = r2IdsIn(hm[3]);
        ids.forEach((id) => claimed.add(id));
        push({
          ref: hm[1],
          title: headingTitle(hm[3]),
          severity: hm[2].toLowerCase(),
          area: R2_LANE_AREA[laneOf(ids[0])],
          round: 2,
          detail: lines.slice(i + 1, end).join('\n'),
          source_line: l,
          lane_ids: ids,
        });
      } else {
        bundles.push({ ref: hm[1], severity: hm[2]?.toLowerCase() ?? null, title: headingTitle(hm[3]), start: i + 1, end });
      }
      i = end - 1;
      continue;
    }
    const bm = l.match(/^- (?:\*\*)?\[(Critical|High|Medium|Low)[^\]]*\]/);
    if (!bm) continue;
    const end = blockEnd(lines, i, lines.length);
    // The lane id is usually on the first line; a few list-style entries carry it on the last child.
    let ids = r2IdsIn(l);
    if (ids.length === 0) ids = r2IdsIn(lines.slice(i, end).join('\n'));
    if (ids.length === 0) {
      // R2.5 restates R2-F1 / R2-F6 as bullets; those are duplicates, not new items.
      if (!/\(R2-F\d+\)/.test(l)) throw new Error(`tagged round-2 bullet with no lane id: ${l}`);
      i = end - 1;
      continue;
    }
    ids.forEach((id) => claimed.add(id));
    const block = lines.slice(i, end);
    push({
      ref: ids[0],
      title: bulletTitle(l, block[1]),
      severity: bm[1].toLowerCase(),
      area: R2_LANE_AREA[laneOf(ids[0])],
      round: 2,
      detail: dedent(block),
      source_line: l,
      lane_ids: ids,
    });
    i = end - 1;
  }

  // Pass 2: lane findings inside the R2-B bundles that have no tagged entry of their own.
  for (const b of bundles) {
    const severity = b.severity ?? 'low'; // R2-B8 "Slow spots" is untagged; see header note
    const context = `\n\n_Part of ${b.ref}: ${b.title}._`;
    const emit = (start, end) => {
      const block = lines.slice(start, end);
      const ids = r2IdsIn(block.join('\n')).filter((id) => !claimed.has(id));
      if (ids.length === 0) return;
      ids.forEach((id) => claimed.add(id));
      const child = block.find((x, k) => k > 0 && /^\s*- /.test(x));
      push({
        ref: ids[0],
        title: bulletTitle(block[0], child),
        severity,
        area: R2_LANE_AREA[laneOf(ids[0])],
        round: 2,
        detail: dedent(block) + context,
        source_line: block[0],
        lane_ids: ids,
        bundle: b.ref,
      });
    };
    for (let i = b.start; i < b.end; i++) {
      if (!/^- /.test(lines[i])) continue;
      const end = blockEnd(lines, i, b.end);
      const all = r2IdsIn(lines.slice(i, end).join('\n')).filter((id) => !claimed.has(id));
      const ownLine = r2IdsIn(lines[i]).filter((id) => !claimed.has(id));
      if (all.length > 1 && ownLine.length === 0) {
        // A label bullet ("Editing a logged food:") whose children are separate findings.
        const childIndent = indentOf(lines[i + 1]);
        for (let k = i + 1; k < end; k++) {
          if (indentOf(lines[k]) === childIndent && /^\s*- /.test(lines[k])) emit(k, blockEnd(lines, k, end));
        }
      } else {
        emit(i, end);
      }
      i = end - 1;
    }
  }

  // Round-1 items the doc explicitly reports as fixed ("- **F13** (…) is **fixed**; …").
  for (const l of lines.slice(r2Start)) {
    const m = l.match(/^- \*\*([FB]\d+)\*\*.*\bis \*\*fixed\*\*/);
    if (m) {
      const it = items.find((x) => x.ref === m[1]);
      if (it) { it.status = 'fixed'; it.detail = clipDetail(`${it.detail}\n\n_Round 2: ${plain(l.replace(/^- /, ''))}_`); }
    }
  }

  return items;
}

/** Lane ids that appear in the round-2 part of the doc (excluding the re-check table), and those only in round 1. */
export function laneIdCensus(md) {
  const lines = md.split(/\r?\n/);
  const r2Start = lines.findIndex((l) => /^## Round 2/.test(l));
  const r27 = lines.findIndex((l) => /^### R2\.7 /.test(l));
  const r1 = new Set(lines.slice(0, r2Start).join('\n').match(R2_ID_RE) ?? []);
  const r2 = new Set(lines.slice(r2Start, r27).join('\n').match(R2_ID_RE) ?? []);
  return { inRound2: r2, onlyInRound1: [...r1].filter((id) => !r2.has(id)) };
}

function dq(s) {
  let tag = 'qa';
  while (s.includes(`$${tag}$`)) tag += 'x';
  return `$${tag}$${s}$${tag}$`;
}

export function toSql(items) {
  const rows = items.map((it) =>
    `  ('qa', '${REPORT}', ${dq(it.ref)}, ${dq(it.title)}, '${it.severity}', ${dq(it.area)}, ${it.round}, ${dq(it.detail)}, '${it.status}')`,
  );
  return [
    `-- seed-ops-bugs-qa-0926.sql`,
    `-- Seeds public.ops_bugs with every finding from Docs/QA/Full-App-QA-2026-09-26.md`,
    `-- (${items.length} rows, source='qa', report='${REPORT}') for triage on the Bugs board.`,
    `-- Generated by scripts/qa-to-ops-bugs.mjs; do not hand-edit, re-run the script.`,
    `-- Safe to run twice: "on conflict (source, report, ref) do nothing" skips rows already present,`,
    `-- so statuses changed on the board are never overwritten.`,
    `-- REQUIRES migration 0236 (public.ops_bugs) to be applied first.`,
    ``,
    `insert into public.ops_bugs (source, report, ref, title, severity, area, round, detail, status) values`,
    rows.join(',\n'),
    `on conflict (source, report, ref) do nothing;`,
    ``,
    `select severity, count(*) from public.ops_bugs where report='${REPORT}' group by 1 order by 1;`,
    ``,
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = parseQa(readFileSync(DOC_PATH, 'utf8'));
  writeFileSync(SQL_PATH, toSql(items));
  const by = (k) => items.reduce((a, it) => ((a[it[k]] = (a[it[k]] ?? 0) + 1), a), {});
  console.log(`wrote ${SQL_PATH}`);
  console.log(`items: ${items.length}`, by('severity'), 'rounds:', by('round'), 'status:', by('status'));
}
