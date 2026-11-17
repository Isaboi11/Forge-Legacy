// node --test scripts/lib/__tests__/bundle-normalize.test.mjs
//
// PL-5 (Docs/AI-Sprint-2-Build-Notes.md §1.5, option 2): every paste bundle is pure ASCII with no long comment runs,
// and normalizing never changes what the code means — proven on every committed bundle and every function source.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  canonicalTokens,
  collapseRuns,
  firstTokenDifference,
  isPureAscii,
  lex,
  longCommentRuns,
  normalizeBundle,
  withCapture,
} from '../bundle-normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/** The escape TEXT for a code unit (written this way so no literal escape sits in this file). */
const esc = (hex) => '\\' + 'u' + hex;

/** Evaluate a JS expression (a normalized TS bundle snippet with no types) and return its value. */
const run = (code) => vm.runInNewContext(code);

// ── literals keep their value ───────────────────────────────────────────────────────────────────────────────

test('a string literal: every non-ASCII character becomes an escape with the same value', () => {
  const src = "const a = 'Holt \u{2014} coach \u{00b7} 5\u{00d7}5 \u{2019}';";
  const out = normalizeBundle(src);
  assert.ok(isPureAscii(out));
  assert.ok(out.includes(esc('2014')) && out.includes(esc('00b7')) && out.includes(esc('00d7')) && out.includes(esc('2019')));
  assert.equal(run(out.replace('const a = ', '')), run(src.replace('const a = ', '')));
});

test('astral characters, identity escapes and line continuations keep their value', () => {
  for (const lit of ["'lift \u{1f4aa}!'", "'\\\u{00e9}t\u{00e9}'", "'a\\\u{2028}b'", '"double \u{201c}quotes\u{201d}"', "'\\\\\u{2014}'"]) {
    const out = normalizeBundle(`x = ${lit};`);
    assert.ok(isPureAscii(out), lit);
    assert.equal(run(out), run(`x = ${lit};`), lit);
  }
});

test('templates: cooked value unchanged, substitutions untouched', () => {
  const src = 'const n = 3; const s = `${n}\u{00d7}5 \u{2014} ${`inner \u{00b7}`} \u{2192} done`; s';
  const out = normalizeBundle(src);
  assert.ok(isPureAscii(out));
  assert.equal(run(out), run(src));
});

test('a regex without u/v: BMP and astral characters become \\uXXXX code units, and match exactly as before', () => {
  const src = '/[x\u{00d7}\u{2014}\u{1f4aa}]+|caf\u{00e9}|\\\u{00b7}/g';
  const out = normalizeBundle(src);
  assert.ok(isPureAscii(out), out);
  const a = run(src);
  const b = run(out);
  for (const probe of ['5\u{00d7}5', 'a\u{2014}b', '\u{1f4aa}\u{1f4aa}', 'caf\u{00e9}', 'x\u{00b7}y', 'plain']) {
    assert.deepEqual([...(probe.match(b) ?? [])], [...(probe.match(a) ?? [])], probe);
  }
  assert.equal(b.source.includes(esc('d83d') ) || b.source.includes(esc('d83d').toUpperCase()), true, 'two code units for the astral one');
});

test('a regex with u: one \\u{…} per code point', () => {
  const src = '/[\u{1f4aa}\u{00e9}]/u';
  const out = normalizeBundle(src);
  assert.equal(out, '/[\\u{1f4aa}\\u{e9}]/u');
  for (const probe of ['\u{1f4aa}', '\u{00e9}', 'e']) assert.equal(run(out).test(probe), run(src).test(probe), probe);
});

test('identifiers: an escaped identifier has the same name', () => {
  const src = "const ACCENTS = { \u{00e0}: 'a', \u{00f1}: 'n' }; ACCENTS['\u{00e0}'] + ACCENTS.\u{00f1}";
  const out = normalizeBundle(src);
  assert.ok(isPureAscii(out));
  assert.equal(run(out), 'an');
});

test('String.raw: the character is lifted into a substitution, so the raw string is the same', () => {
  const src = 'const LIFT = String.raw`\\d[ \\t]*[x\u{00d7}][ \\t]*\\d`; LIFT';
  const out = normalizeBundle(src);
  assert.ok(isPureAscii(out), out);
  assert.equal(run(out), run(src));
  assert.ok(new RegExp(run(out)).test('5\u{00d7}5'));
});

test('String.raw with a backslash right before the character, and any other tag, are refused', () => {
  assert.throws(() => normalizeBundle('String.raw`\\\u{00d7}`'), /backslash before a non-ASCII/);
  assert.throws(() => normalizeBundle('tag`a\u{2014}b`'), /tagged template/);
  assert.equal(normalizeBundle('tag`plain ascii ${1}`'), 'tag`plain ascii ${1}`', 'an ASCII tagged template is left alone');
});

test('a non-ASCII character in code itself (not a literal) is refused, never guessed', () => {
  assert.throws(() => normalizeBundle('const a = 1 \u{2212} 2;'), /non-ASCII|does not parse/);
});

// ── comments ────────────────────────────────────────────────────────────────────────────────────────────────

test('comments: transliterated, and runs of 4+ identical characters collapse to 3', () => {
  const src = [
    '// \u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500} inlined \u{2500}\u{2500}\u{2500}\u{2500}',
    '// =====================================',
    '/* Holt \u{2014} 5\u{00d7}5 \u{00b7} \u{2018}it\u{2019}s\u{2019} \u{201c}ok\u{201d} \u{2192} next \u{2265} 3 \u{26a0} caf\u{00e9} \u{1f4aa} */',
    'const x = 1;',
  ].join('\n');
  const out = normalizeBundle(src);
  assert.ok(isPureAscii(out));
  assert.deepEqual(longCommentRuns(out), []);
  const lines = out.split('\n');
  assert.equal(lines[0], '// --- inlined ---');
  assert.equal(lines[1], '// ===');
  assert.equal(lines[2], "/* Holt -- 5x5 . 'it's' \"ok\" -> next >= 3 ! cafe ? */");
  assert.equal(lines[3], 'const x = 1;');
});

test('a block comment never gains a closer inside it; a line separator in it stays a line break (ASI)', () => {
  assert.equal(normalizeBundle('/* a \u{2022}/ b */ 1'), '/* a * / b */ 1');
  const asi = 'let a = 1\nlet b = a /* x\u{2028}y */ ++b';
  // Both must parse the same way (the comment holds a line terminator either way).
  assert.equal(firstTokenDifference(asi, normalizeBundle(asi)), null);
  assert.ok(normalizeBundle(asi).includes('x\ny'));
});

test('collapseRuns', () => {
  assert.equal(collapseRuns('a----b'), 'a---b');
  assert.equal(collapseRuns('a---b'), 'a---b');
  assert.equal(collapseRuns('xxxxxxxx yyyy'), 'xxx yyy');
});

test('CRLF and a BOM are dropped; normalizing twice changes nothing', () => {
  const src = '\u{feff}// a \u{2014} b\r\nconst s = \'\u{00b7}\';\r\n';
  const once = normalizeBundle(src);
  assert.ok(!once.includes('\r') && !once.startsWith('\u{feff}'));
  assert.equal(normalizeBundle(once), once);
});

test('a file that does not parse is refused', () => {
  assert.throws(() => normalizeBundle('const = ;'), /does not parse/);
});

test('the proof notices a real change', () => {
  assert.match(firstTokenDifference("x = 'a\u{2014}b'", "x = 'a--b'"), /token 2/);
  assert.equal(firstTokenDifference("x = 'a\u{2014}b' // c\u{2014}", `x = 'a${esc('2014')}b' // other`), null, 'comments aside');
});

test('the scanner is told where regexes and template continuations are (a divide is not a regex)', () => {
  const src = 'const a = 4 / 2 / 1; const r = /\u{00b7}/; const t = `${a}\u{00b7}${a}`;';
  const kinds = lex(normalizeBundle(src)).toks.map((t) => t.kind);
  assert.ok(kinds.length > 0);
  assert.equal(run(normalizeBundle(src) + ' [a, r.test("\u{00b7}"), t]').join('|'), '2|true|2\u{00b7}2');
  assert.ok(canonicalTokens(src).some((t) => t.kind === 'RegularExpressionLiteral'));
});

// ── every real bundle and every function source ─────────────────────────────────────────────────────────────

const BUILDERS = fs
  .readdirSync(path.join(ROOT, 'scripts'))
  .filter((f) => /^build-.*-deploy\.mjs$/.test(f))
  .sort();

test('every bundle builder calls the normaliser on what it returns (one line, at the return)', () => {
  assert.ok(BUILDERS.length >= 9, `found ${BUILDERS.length} builders`);
  for (const f of BUILDERS) {
    const src = read(`scripts/${f}`);
    assert.match(src, /import \{ normalizeBundle \} from '\.\/lib\/bundle-normalize\.mjs';/, f);
    assert.match(src, /return normalizeBundle\(compactForPaste\(HEADER, inlined\)\);/, f);
  }
});

for (const f of BUILDERS) {
  test(`${f}: the committed bundle is ASCII, has no long comment runs, and means exactly what the un-normalized build means`, async () => {
    const mod = await import(pathToFileURL(path.join(ROOT, 'scripts', f)).href);
    const build = Object.entries(mod).find(([k, v]) => typeof v === 'function' && /^build/.test(k))?.[1];
    assert.ok(build && mod.DEPLOY_COPY, `${f} exports its build function and DEPLOY_COPY`);
    let built;
    const [raw] = withCapture(() => {
      built = build();
    });
    assert.ok(typeof raw === 'string' && raw.length > 1000, 'the builder handed the normaliser its un-normalized text');
    const committed = read(mod.DEPLOY_COPY);
    assert.equal(committed, built, `run \`node scripts/${f}\``);
    assert.ok(isPureAscii(committed), 'pure ASCII');
    assert.deepEqual(longCommentRuns(committed), [], 'no run of 4+ identical characters in a comment');
    assert.equal(firstTokenDifference(raw, committed), null, 'same token stream (kinds + cooked values), comments aside');
    assert.equal(normalizeBundle(committed), committed, 'idempotent');
    assertRegexesBehaveTheSame(raw, committed);
  });
}

const FUNCTION_DIRS = fs
  .readdirSync(path.join(ROOT, 'supabase/functions'))
  .filter((d) => fs.existsSync(path.join(ROOT, 'supabase/functions', d, 'index.ts')))
  .sort();

test('every function source (the ones with no builder are deployed straight from here) normalizes to an equivalent ASCII file', () => {
  assert.ok(FUNCTION_DIRS.length >= 19);
  for (const d of FUNCTION_DIRS) {
    const src = read(`supabase/functions/${d}/index.ts`);
    const out = normalizeBundle(src);
    assert.ok(isPureAscii(out), d);
    assert.deepEqual(longCommentRuns(out), [], d);
    assert.equal(firstTokenDifference(src, out), null, d);
    assertRegexesBehaveTheSame(src, out);
  }
});

/** Every regex literal whose text changed matches the same way on probes built from its own non-ASCII characters. */
function assertRegexesBehaveTheSame(before, after) {
  const pick = (text) => lex(text.replace(/\r\n/g, '\n')).toks.filter((t) => t.kind === lexKindRegex).map((t) => t.text);
  const a = pick(before);
  const b = pick(after);
  assert.equal(a.length, b.length, 'same number of regex literals');
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const ra = toRegExp(a[i]);
    const rb = toRegExp(b[i]);
    const chars = [...new Set([...a[i]].filter((c) => c.codePointAt(0) >= 0x80))];
    const probes = ['', 'plain ascii 5x5', ...chars, ...chars.map((c) => `a ${c} b`), chars.join(''), chars.join(' 1 ')];
    for (const p of probes) {
      ra.lastIndex = 0;
      rb.lastIndex = 0;
      assert.deepEqual(rb.exec(p)?.slice(), ra.exec(p)?.slice(), `${a[i]} vs ${b[i]} on ${JSON.stringify(p)}`);
    }
  }
}

const lexKindRegex = lex('/a/').toks[0].kind;
function toRegExp(lit) {
  const at = lit.lastIndexOf('/');
  return new RegExp(lit.slice(1, at), lit.slice(at + 1));
}
