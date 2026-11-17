#!/usr/bin/env node
/**
 * ══ EVERY PUBLIC TABLE GETS ROW-LEVEL SECURITY — checked from the migrations, no database needed ══
 *
 * AI Road to 10, PL-1 (Docs/AI-Road-To-10-Plan-v1.0.md §2) and platform gate ① "0 public tables without row
 * security (checked in CI)". `coach_ai_config` sat world-writable from 0144 (09-21) to 0267 (11-17) because
 * nothing checked: a `create table` with no `enable row level security` after it reads exactly like one with.
 *
 * It replays `supabase/migrations/*.sql` in file order, statement by statement, and keeps a ledger of the
 * public tables that exist and whether RLS is on:
 *
 *   create table [if not exists] [public.]name     → the table exists, RLS off (temp tables are not tracked;
 *                                                     `if not exists` on a table that already exists is a no-op)
 *   alter table [if exists] [only] name enable/disable row level security
 *   alter table … rename to new                     → the ledger entry moves with it
 *   drop table [if exists] a[, b] …                 → gone, so exempt
 *
 * Function and procedure bodies are skipped — they do not run when the migration runs. DO blocks are read,
 * including `execute '…'` text, because they do. A table name built at run time (`execute format(… %I …)`)
 * cannot be resolved statically: it is reported, never guessed.
 *
 *   node scripts/rls-static-check.mjs          → exit 1 and the list when any public table is left without RLS
 *
 * Pure: `node:fs` only for the CLI; `checkRls` takes the SQL text, so the tests can feed it a ledger with a
 * migration taken out (src/app/__tests__/rls-static.test.mjs proves it would have caught 0144 → 0267).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Split SQL into top-level statements on `;`, never inside a string, a quoted identifier, a comment or a
 * dollar-quoted body. Each statement comes back with comments removed (`code`) and the raw text (`raw`).
 * @param {string} sql
 * @returns {{ raw: string, code: string }[]}
 */
export function splitSqlStatements(sql) {
  const out = [];
  let raw = '';
  let code = '';
  let i = 0;
  const n = sql.length;
  const flush = () => {
    if (code.trim()) out.push({ raw: raw.trim(), code: code.trim() });
    raw = '';
    code = '';
  };
  while (i < n) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);
    if (two === '--') {
      const end = sql.indexOf('\n', i);
      const stop = end < 0 ? n : end;
      raw += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (two === '/*') {
      // Postgres block comments nest.
      let depth = 0;
      let j = i;
      while (j < n) {
        if (sql.startsWith('/*', j)) {
          depth += 1;
          j += 2;
        } else if (sql.startsWith('*/', j)) {
          depth -= 1;
          j += 2;
          if (depth === 0) break;
        } else j += 1;
      }
      raw += sql.slice(i, j);
      code += ' ';
      i = j;
      continue;
    }
    if (ch === "'" || ((ch === 'E' || ch === 'e') && sql[i + 1] === "'" && !/[\w$]/.test(sql[i - 1] ?? ''))) {
      const escapes = ch !== "'";
      let j = escapes ? i + 2 : i + 1;
      while (j < n) {
        if (escapes && sql[j] === '\\') j += 2;
        else if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") {
          j += 1;
          break;
        } else j += 1;
      }
      raw += sql.slice(i, j);
      code += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '"' && sql[j + 1] === '"') j += 2;
        else if (sql[j] === '"') {
          j += 1;
          break;
        } else j += 1;
      }
      raw += sql.slice(i, j);
      code += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m && !/[\w]/.test(sql[i - 1] ?? '')) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end < 0 ? n : end + tag.length;
        raw += sql.slice(i, stop);
        code += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ';') {
      raw += ';';
      flush();
      i += 1;
      continue;
    }
    raw += ch;
    code += ch;
    i += 1;
  }
  flush();
  return out;
}

/** Whitespace-normalised statement text, for comparing a paste bundle's §1 with its migration. */
export function normaliseStatement(code) {
  return code.replace(/\s+/g, ' ').trim();
}

const NAME = String.raw`((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)`;
const CREATE = new RegExp(
  String.raw`\bcreate\s+(?:(?:global|local)\s+)?(temp|temporary|unlogged)?\s*table\s+(if\s+not\s+exists\s+)?` + NAME,
  'gi',
);
const RLS = new RegExp(
  String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?` + NAME + String.raw`\s+(enable|disable)\s+row\s+level\s+security`,
  'gi',
);
const RENAME = new RegExp(
  String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?` + NAME + String.raw`\s+rename\s+to\s+("[^"]+"|[A-Za-z_][\w$]*)`,
  'gi',
);
const DROP = /\bdrop\s+table\s+(?:if\s+exists\s+)?([^;]*?)(?:\s+(?:cascade|restrict))?\s*(?:;|'|$)/gi;
const DYNAMIC = /\b(create\s+(?:\w+\s+)?table|alter\s+table|drop\s+table)\b[^;']*%[IsL]/i;

/** `public.x`, `"public"."x"`, `x` → `{ schema, table }`, lowercased; an unqualified name lands in public. */
export function tableName(name) {
  const parts = name.split('.').map((p) => p.trim().replace(/^"|"$/g, '').toLowerCase());
  return parts.length === 2 ? { schema: parts[0], table: parts[1] } : { schema: 'public', table: parts[0] };
}

/** Blank the inside of every single-quoted string, so a comment like `'create table x'` is not read as DDL. */
function withoutStrings(code) {
  return code.replace(/'(?:[^']|'')*'/g, "''");
}

/** The text of a DO block's body (between its dollar quotes), or null when the statement is not a DO. */
function doBody(code) {
  const m = /^do\s+(?:language\s+\w+\s+)?(\$[A-Za-z0-9_]*\$)([\s\S]*?)\1/i.exec(code);
  return m ? m[2] : null;
}

/**
 * The events one statement makes, in order. Function/procedure bodies make none.
 * @returns {{ kind: 'create'|'rls'|'rename'|'drop'|'dynamic', schema?: string, table?: string, to?: string, on?: boolean, ifNotExists?: boolean, temp?: boolean, text?: string }[]}
 */
export function statementEvents(code) {
  const head = code.replace(/^\s+/, '');
  if (/^create\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(head)) return [];
  const body = doBody(head);
  const scan = body != null ? body.replace(/--[^\n]*/g, ' ') : withoutStrings(head);
  const events = [];
  if (body != null && DYNAMIC.test(scan)) events.push({ kind: 'dynamic', at: 0, text: scan.match(DYNAMIC)[0] });
  for (const m of scan.matchAll(CREATE)) {
    events.push({ kind: 'create', at: m.index, ...tableName(m[3]), temp: /^temp/i.test(m[1] ?? ''), ifNotExists: !!m[2] });
  }
  for (const m of scan.matchAll(RLS)) events.push({ kind: 'rls', at: m.index, ...tableName(m[1]), on: /enable/i.test(m[2]) });
  for (const m of scan.matchAll(RENAME)) events.push({ kind: 'rename', at: m.index, ...tableName(m[1]), to: tableName(m[2]).table });
  for (const m of scan.matchAll(DROP)) {
    for (const n of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      if (/^(?:"[^"]+"|[A-Za-z_][\w$]*)(?:\.(?:"[^"]+"|[A-Za-z_][\w$]*))?$/.test(n)) events.push({ kind: 'drop', at: m.index, ...tableName(n) });
    }
  }
  return events.sort((a, b) => a.at - b.at);
}

/**
 * Replay the files in order. Returns every public table that ends WITHOUT row-level security, where each was
 * created, and any DDL whose table name is built at run time.
 * @param {{ name: string, sql: string }[]} files in apply order
 */
export function checkRls(files) {
  /** table → { rls, createdIn } */
  const ledger = new Map();
  const dynamic = [];
  for (const f of files) {
    for (const st of splitSqlStatements(f.sql)) {
      for (const e of statementEvents(st.code)) {
        if (e.kind === 'dynamic') {
          dynamic.push({ file: f.name, text: e.text });
          continue;
        }
        if (e.schema !== 'public') continue;
        if (e.kind === 'create') {
          if (e.temp) continue;
          if (ledger.has(e.table) && e.ifNotExists) continue;
          ledger.set(e.table, { rls: false, createdIn: f.name });
        } else if (e.kind === 'rls') {
          const row = ledger.get(e.table);
          if (row) row.rls = e.on;
        } else if (e.kind === 'rename') {
          const row = ledger.get(e.table);
          if (row) {
            ledger.delete(e.table);
            ledger.set(e.to, row);
          }
        } else if (e.kind === 'drop') {
          ledger.delete(e.table);
        }
      }
    }
  }
  const missing = [...ledger]
    .filter(([, v]) => !v.rls)
    .map(([table, v]) => ({ table, createdIn: v.createdIn }))
    .sort((a, b) => a.table.localeCompare(b.table));
  return { tables: ledger.size, missing, dynamic, ledger };
}

/** The migrations directory, in apply order (file name order — the numbers are the order). */
export function readMigrations(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n') }));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { tables, missing, dynamic } = checkRls(readMigrations(join(root, 'supabase/migrations')));
  for (const d of dynamic) console.error(`? ${d.file}: table name built at run time — check it by hand: ${d.text}`);
  if (missing.length) {
    for (const m of missing) console.error(`✕ public.${m.table} (created in ${m.createdIn}) never gets row-level security`);
    process.exit(1);
  }
  console.log(`✓ ${tables} public tables, every one with row-level security`);
  process.exit(dynamic.length ? 1 : 0);
}
