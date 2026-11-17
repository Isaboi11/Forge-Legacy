#!/usr/bin/env node
/**
 * ══ EVERY SECURITY DEFINER FUNCTION IS CLOSED TO `public` AND `anon` — checked from the migrations ══
 *
 * AI Road to 10, PL-1 (Docs/AI-Road-To-10-Plan-v1.0.md §2): "CI test: … every SECURITY DEFINER function revokes
 * `public`." The definer-revoke half of the RLS check. The row-security half is scripts/rls-static-check.mjs; the
 * live half of both is supabase/apply/check-rls.sql.
 *
 * Why both roles: Postgres grants EXECUTE to PUBLIC on every new function, AND Supabase's default privileges grant
 * it to `anon` directly. `revoke … from public` alone leaves the direct anon grant; `revoke … from anon` alone
 * leaves PUBLIC (which anon is a member of). 0147 found 33 revokes from public that "never worked" — this checks
 * the pair.
 *
 * It replays `supabase/migrations/*.sql` in order and keeps each function's EXECUTE grants for `public` and
 * `anon`, by identity (name + input argument types):
 *
 *   create function / create or replace of a NEW identity   → open to public AND anon. Deliberately NOT trusting
 *                                                              0147's `alter default privileges`: live, the 0182/0183
 *                                                              trainer_* functions were created after it and still
 *                                                              hold PUBLIC (whoever ran them, the default did not
 *                                                              apply). A function is closed only by a statement here.
 *   create or replace of an EXISTING identity                → grants kept (that is what Postgres does)
 *   drop function                                            → gone (a later create starts open again)
 *   revoke … on function f(…)[, g(…)] from r[, …]            → closed for r; no argument list = every overload
 *   revoke … on all functions in schema public from r        → closed for every function that exists then
 *   grant execute (or all) … to r                            → open again
 *   DO blocks                                                → `execute '…'` text, and the `foreach f in array
 *                                                              [...] … execute format('revoke … %s …', f)` loop
 *                                                              0147/0170/0238… use, expanded element by element
 *   alter function f(…) security definer|invoker / rename to → followed
 *
 * The verdict per function is about its LATEST definition: is it SECURITY DEFINER, and at the end of the replay is
 * EXECUTE still open to public or anon. Trigger functions are exempt by rule — Postgres refuses to call a function
 * that returns trigger/event_trigger outside a trigger, so the grant reaches nothing.
 *
 *   node scripts/definer-grants-check.mjs   → every open definer function, and exit 1 when one is not on the
 *                                             allowlists in src/app/__tests__/rls-static.test.mjs
 *
 * Pure: `checkDefinerGrants` takes the SQL text, so the tests feed it migrations with one taken out.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { splitSqlStatements } from './rls-static-check.mjs';

// ── identities: name + normalized input argument types ──────────────────────────────────────────────────────

const TYPE_ALIASES = new Map([
  ['int', 'integer'], ['int4', 'integer'], ['integer', 'integer'],
  ['int8', 'bigint'], ['bigint', 'bigint'], ['int2', 'smallint'], ['smallint', 'smallint'],
  ['bool', 'boolean'], ['boolean', 'boolean'],
  ['float8', 'double precision'], ['double precision', 'double precision'], ['float4', 'real'], ['real', 'real'],
  ['varchar', 'character varying'], ['character varying', 'character varying'],
  ['char', 'character'], ['character', 'character'], ['bpchar', 'character'],
  ['timestamptz', 'timestamp with time zone'], ['timestamp with time zone', 'timestamp with time zone'],
  ['timestamp', 'timestamp without time zone'], ['timestamp without time zone', 'timestamp without time zone'],
  ['timetz', 'time with time zone'], ['time with time zone', 'time with time zone'],
  ['time', 'time without time zone'], ['time without time zone', 'time without time zone'],
  ['decimal', 'numeric'], ['numeric', 'numeric'],
]);

/** Words that can start a (multi-word) type — so `double precision` is a type, not a parameter named double. */
const TYPE_START = new Set(['double', 'character', 'timestamp', 'time', 'bit', 'interval', 'national']);

/** A type as Postgres prints it in an identity: lowercased, aliases resolved, modifiers and `public.` dropped. */
export function normalizeType(t) {
  let s = t.trim().toLowerCase().replace(/\s+/g, ' ').replace(/"/g, '');
  let arr = '';
  const m = /^(.*?)((?:\s*\[\s*\d*\s*\])+)$/.exec(s);
  if (m) {
    s = m[1].trim();
    arr = '[]'.repeat((m[2].match(/\[/g) ?? []).length);
  }
  s = s.replace(/\s*\([^)]*\)/g, '').replace(/^public\./, '').replace(/^pg_catalog\./, '').trim();
  if (s.endsWith('%type') || s.endsWith('%rowtype')) return s + arr;
  return (TYPE_ALIASES.get(s) ?? s) + arr;
}

/** Split on commas that are not inside parentheses, brackets or quotes. */
export function splitTopLevel(s, sep = ',') {
  const out = [];
  let depth = 0;
  let cur = '';
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === quote) {
        if (s[i + 1] === quote) {
          cur += s[++i];
        } else quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      cur += c;
      continue;
    }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === sep && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * The input argument types of one argument list (`p_a text default 'x', out p_b int, variadic p_c text[]`) →
 * `['text', 'text[]']`. OUT arguments are not part of the identity.
 */
export function identityTypes(argList) {
  const types = [];
  for (const raw of splitTopLevel(argList)) {
    let a = raw.replace(/\s+default\s+[\s\S]*$/i, '').replace(/\s*=\s*[\s\S]*$/, '').trim();
    if (!a) continue;
    let mode = 'in';
    const mm = /^(in|out|inout|variadic)\s+/i.exec(a);
    if (mm) {
      mode = mm[1].toLowerCase();
      a = a.slice(mm[0].length).trim();
    }
    if (mode === 'out') continue;
    const words = a.split(/\s+/);
    // `name type…` unless the whole thing is a type (`double precision`, `timestamp with time zone`, `text`).
    const first = words[0].toLowerCase().replace(/"/g, '');
    const isTypeOnly = words.length === 1 || TYPE_START.has(first) || /[.(\[]/.test(words[0]);
    types.push(normalizeType(isTypeOnly ? a : words.slice(1).join(' ')));
  }
  return types;
}

/** `public.f`, `"public"."f"`, `f` → { schema, name }; unqualified = public. */
export function functionName(n) {
  const parts = n.split('.').map((p) => p.trim().replace(/^"|"$/g, '').toLowerCase());
  return parts.length === 2 ? { schema: parts[0], name: parts[1] } : { schema: 'public', name: parts[0] };
}

const NAME = String.raw`((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)`;

/** The text inside the parenthesis that opens at `open` (index of `(`), and the index after its `)`. */
function parenBody(s, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return { body: s.slice(open + 1, i), after: i + 1 };
    }
  }
  return null;
}

/** `f(a, b), public.g(c)` or `f, g` → [{ schema, name, types | null }]. */
export function parseSignatureList(list) {
  const out = [];
  for (const item of splitTopLevel(list)) {
    const s = item.trim();
    const m = new RegExp('^' + NAME).exec(s);
    if (!m) continue;
    const { schema, name } = functionName(m[1]);
    const rest = s.slice(m[0].length).trim();
    let types = null;
    if (rest.startsWith('(')) {
      const p = parenBody(rest, 0);
      types = p ? identityTypes(p.body) : null;
    }
    out.push({ schema, name, types });
  }
  return out;
}

export const identityKey = (name, types) => `${name}(${types.join(', ')})`;

// ── statements → events ─────────────────────────────────────────────────────────────────────────────────────

/** Blank every dollar-quoted body and string, so a function's attributes can be read around them. */
function withoutBodies(code) {
  return code.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
}

const ROLE_LIST = (s) =>
  s
    .replace(/\s+(cascade|restrict)\s*$/i, '')
    .replace(/\s+granted\s+by\s+\S+\s*$/i, '')
    .replace(/\s+with\s+grant\s+option\s*$/i, '')
    .split(',')
    .map((r) => r.trim().replace(/^"|"$/g, '').toLowerCase().replace(/^group\s+/, ''))
    .filter(Boolean);

/** Does a privilege list cover EXECUTE? (`all`, `all privileges`, `execute`) */
const coversExecute = (privs) => /\b(all|execute)\b/i.test(privs);

/**
 * The events one statement makes (no DO handling here — see `doEvents`).
 * @returns {object[]}
 */
export function functionEvents(code) {
  const head = code.replace(/^\s+/, '');
  const events = [];
  let m;
  if ((m = new RegExp(String.raw`^create\s+(or\s+replace\s+)?function\s+` + NAME + String.raw`\s*\(`, 'i').exec(head))) {
    const { schema, name } = functionName(m[2]);
    const p = parenBody(head, m[0].length - 1);
    if (!p) return events;
    const rest = withoutBodies(head.slice(p.after));
    events.push({
      kind: 'create',
      schema,
      name,
      types: identityTypes(p.body),
      orReplace: !!m[1],
      definer: /\bsecurity\s+definer\b/i.test(rest),
      trigger: /\breturns\s+(event_)?trigger\b/i.test(rest),
    });
    return events;
  }
  if ((m = /^drop\s+function\s+(?:if\s+exists\s+)?([\s\S]*?)(?:\s+(?:cascade|restrict))?\s*$/i.exec(head))) {
    for (const f of parseSignatureList(m[1])) events.push({ kind: 'drop', ...f });
    return events;
  }
  if ((m = new RegExp(String.raw`^alter\s+function\s+` + NAME + String.raw`\s*\(`, 'i').exec(head))) {
    const { schema, name } = functionName(m[1]);
    const p = parenBody(head, m[0].length - 1);
    if (!p) return events;
    const rest = head.slice(p.after);
    const types = identityTypes(p.body);
    if (/\bsecurity\s+definer\b/i.test(rest)) events.push({ kind: 'security', schema, name, types, definer: true });
    if (/\bsecurity\s+invoker\b/i.test(rest)) events.push({ kind: 'security', schema, name, types, definer: false });
    const rn = /\brename\s+to\s+("[^"]+"|[A-Za-z_][\w$]*)/i.exec(rest);
    if (rn) events.push({ kind: 'rename', schema, name, types, to: rn[1].replace(/"/g, '').toLowerCase() });
    return events;
  }
  if ((m = /^(revoke|grant)\s+(?:grant\s+option\s+for\s+)?([\s\S]+?)\s+on\s+all\s+functions\s+in\s+schema\s+([\s\S]+?)\s+(from|to)\s+([\s\S]+)$/i.exec(head))) {
    if (!coversExecute(m[2])) return events;
    const schemas = m[3].split(',').map((s) => s.trim().replace(/"/g, '').toLowerCase());
    events.push({ kind: m[1].toLowerCase() === 'revoke' ? 'revokeAll' : 'grantAll', schemas, roles: ROLE_LIST(m[5]) });
    return events;
  }
  if ((m = /^(revoke|grant)\s+(?:grant\s+option\s+for\s+)?([\s\S]+?)\s+on\s+(?:function|routine)s?\s+([\s\S]+?)\s+(from|to)\s+([\s\S]+)$/i.exec(head))) {
    if (!coversExecute(m[2])) return events;
    // `grant option for` only removes the grant option, not the privilege.
    if (/^revoke\s+grant\s+option\s+for/i.test(head)) return events;
    for (const f of parseSignatureList(m[3])) events.push({ kind: m[1].toLowerCase(), ...f, roles: ROLE_LIST(m[5]) });
    return events;
  }
  return events;
}

/**
 * The string elements of every `array[ … ]` literal in a block, bracket- and quote-aware (an element such as
 * 'public.f(text[])' holds a `]` of its own).
 */
export function arrayLiterals(text) {
  const out = [];
  for (const m of text.matchAll(/\barray\s*\[/gi)) {
    let i = m.index + m[0].length;
    let depth = 1;
    const els = [];
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (c === "'") {
        let j = i + 1;
        let s = '';
        while (j < text.length) {
          if (text[j] === "'" && text[j + 1] === "'") {
            s += "'";
            j += 2;
          } else if (text[j] === "'") break;
          else s += text[j++];
        }
        els.push(s);
        i = j + 1;
        continue;
      }
      if (c === '[') depth++;
      else if (c === ']') depth--;
      i++;
    }
    out.push(els);
  }
  return out;
}

/** The body of a DO block, or null. */
function doBody(code) {
  const m = /^do\s+(?:language\s+\w+\s+)?(\$[A-Za-z0-9_]*\$)([\s\S]*?)\1/i.exec(code.replace(/^\s+/, ''));
  return m ? m[2] : null;
}

/**
 * Events a DO block makes: its static `execute '…'` statements, and the array-loop pattern
 * `… array['public.f(int)', 'g(uuid)'] … execute format('revoke execute on function %s from anon', f)` (and the
 * `public.%s` variant), expanded once per element. Anything else that builds a grant at run time is reported.
 */
export function doEvents(code) {
  const body = doBody(code);
  if (body == null) return { events: [], dynamic: [] };
  const text = body.replace(/--[^\n]*/g, ' ');
  const events = [];
  const dynamic = [];
  for (const m of text.matchAll(/\bexecute\s+'((?:[^']|'')*)'\s*;/gi)) {
    for (const st of splitSqlStatements(m[1].replace(/''/g, "'"))) events.push(...functionEvents(st.code));
  }
  const elements = arrayLiterals(text).flat();
  for (const m of text.matchAll(/\bexecute\s+format\s*\(\s*'((?:[^']|'')*)'\s*,\s*([A-Za-z_]\w*)\s*\)/gi)) {
    const tpl = m[1].replace(/''/g, "'");
    if (!/\bon\s+(function|routine|all\s+functions)\b/i.test(tpl)) continue;
    if (!elements.length || !/%s/.test(tpl)) {
      dynamic.push(tpl);
      continue;
    }
    for (const el of elements) events.push(...functionEvents(tpl.replace('%s', el)));
  }
  return { events, dynamic };
}

// ── the replay ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Replay the files in order. Returns every function's final state, the open SECURITY DEFINER functions
 * (non-trigger, EXECUTE still open to public or anon), and anything that could not be resolved statically.
 * @param {{ name: string, sql: string }[]} files in apply order
 */
export function checkDefinerGrants(files) {
  /** key → { name, types, definer, trigger, public, anon, definedIn } */
  const fns = new Map();
  const dynamic = [];
  const unresolved = [];
  const matching = (e) => {
    if (e.schema !== 'public') return [];
    if (e.types) {
      const k = identityKey(e.name, e.types);
      return fns.has(k) ? [k] : [];
    }
    return [...fns.keys()].filter((k) => fns.get(k).name === e.name);
  };
  const apply = (e, file) => {
    if (e.kind === 'create') {
      if (e.schema !== 'public') return;
      const k = identityKey(e.name, e.types);
      const prev = fns.get(k);
      if (prev && e.orReplace) Object.assign(prev, { definer: e.definer, trigger: e.trigger, definedIn: file });
      else fns.set(k, { name: e.name, types: e.types, definer: e.definer, trigger: e.trigger, public: true, anon: true, definedIn: file });
      return;
    }
    if (e.kind === 'revokeAll' || e.kind === 'grantAll') {
      if (!e.schemas.includes('public')) return;
      for (const f of fns.values()) for (const r of e.roles) if (r === 'public' || r === 'anon') f[r] = e.kind === 'grantAll';
      return;
    }
    const keys = matching(e);
    if (!keys.length && e.schema === 'public' && (e.kind === 'revoke' || e.kind === 'grant')) unresolved.push({ file, kind: e.kind, name: e.name, types: e.types });
    for (const k of keys) {
      const f = fns.get(k);
      if (e.kind === 'drop') fns.delete(k);
      else if (e.kind === 'security') f.definer = e.definer;
      else if (e.kind === 'rename') {
        fns.delete(k);
        f.name = e.to;
        fns.set(identityKey(e.to, f.types), f);
      } else if (e.kind === 'revoke' || e.kind === 'grant') {
        for (const r of e.roles) if (r === 'public' || r === 'anon') f[r] = e.kind === 'grant';
      }
    }
  };
  for (const file of files) {
    for (const st of splitSqlStatements(file.sql)) {
      const d = doEvents(st.code);
      for (const t of d.dynamic) dynamic.push({ file: file.name, text: t });
      for (const e of [...functionEvents(st.code), ...d.events]) apply(e, file.name);
    }
  }
  const open = [...fns.entries()]
    .filter(([, f]) => f.definer && !f.trigger && (f.public || f.anon))
    .map(([key, f]) => ({ key, public: f.public, anon: f.anon, definedIn: f.definedIn }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const definers = [...fns.values()].filter((f) => f.definer).length;
  return { functions: fns, definers, open, dynamic, unresolved };
}

/** The migrations directory, in apply order. */
export function readMigrations(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n') }));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { definers, open, dynamic } = checkDefinerGrants(readMigrations(join(root, 'supabase/migrations')));
  for (const d of dynamic) console.error(`? ${d.file}: a grant built at run time — check it by hand: ${d.text}`);
  for (const o of open) console.log(`${o.anon ? 'anon' : '    '} ${o.public ? 'PUBLIC' : '      '}  ${o.key}  (latest definition: ${o.definedIn})`);
  console.log(`${definers} SECURITY DEFINER functions; ${open.length} still open to public or anon (non-trigger).`);
  console.log('The allowlists (meant to be anon-callable / known, listed for the integrator) live in src/app/__tests__/rls-static.test.mjs.');
}
