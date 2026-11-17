/**
 * ══ MCP-SAFE BUNDLES — every paste bundle is pure ASCII, with no long runs in its comments ══
 *
 * AI Road to 10, Sprint 2, PL-5 (Docs/AI-Sprint-2-Build-Notes.md §1.5, option 2). Sprint 1 deployed 12 functions
 * through the Supabase MCP, which means a model RETYPED each file. Three of the twelve came back different and had
 * to be redeployed; `workout-card-read` v4 still differs on comment line 336. Every miss was the same kind of
 * thing: a long `─────` rule miscounted, or a non-ASCII character (— · → ’) swapped for a look-alike.
 *
 * This makes the file a retype cannot get wrong in those ways, WITHOUT changing what the code means:
 *
 *   string / template / regex literals   every non-ASCII character becomes an escape with the same value
 *                                         ('—' → '\u{2014}', written as the 4-digit form). In a regex without the u/v flag an astral character
 *                                         is two code units, so it becomes two \uXXXX escapes (exactly what the
 *                                         engine saw before); with u/v it becomes one \u{…}.
 *   String.raw`…`                         an escape would change the RAW text, so a non-ASCII character is lifted
 *                                         out instead: `×` → ${'\u{d7}'} (String.raw inserts a substitution as-is).
 *                                         Any other tag with non-ASCII in it is refused (it could see the change).
 *   identifiers                           { à: 'a' } → { \u{e0}: 'a' } (4-digit form) — an escaped identifier has the same name.
 *   comments                              transliterated (─ → -, — → --, · → ., ’ → ', → → ->, anything unknown → ?)
 *                                         and every run of 4+ identical characters collapses to 3.
 *   line endings                          CRLF → LF; a leading BOM is dropped.
 *
 * Token-aware, never a regex over the file: the TypeScript scanner walks the text (comments included), and the
 * parser says which `/` starts a regex and which `}` continues a template — the two places a scanner alone cannot
 * know. `normalizeBundle` then PROVES its own output before returning it: pure ASCII, and the scanner's token stream
 * (kinds + cooked values, comments and whitespace aside) identical to the input's. If either fails it throws, so a
 * builder can never write a bundle that means something else.
 *
 *   import { normalizeBundle } from './lib/bundle-normalize.mjs';
 *   return normalizeBundle(compactForPaste(HEADER, inlined));   // the one line in every scripts/build-*-deploy.mjs
 *
 * Idempotent: normalizeBundle(normalizeBundle(x)) === normalizeBundle(x). The read-back hash still decides whether a
 * deploy landed (scripts/deploy-ai/hash.mjs); this only makes landing it by retype reliable.
 */

import ts from 'typescript';

const K = ts.SyntaxKind;

// ── lexing: the scanner, told by the parser where regexes and template continuations are ────────────────────

/** @typedef {{ kind: number, start: number, end: number, text: string, value: string }} Tok */

/**
 * The parsed file, plus what the scanner needs from it: every regex start, every template continuation (`}` that
 * resumes a template), and every String.raw-tagged template (other tags are kept separately, to refuse).
 */
function analyse(text) {
  const sf = ts.createSourceFile('bundle.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diags = /** @type {any} */ (sf).parseDiagnostics ?? [];
  if (diags.length) {
    const d = diags[0];
    const { line } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
    throw new Error(`bundle-normalize: the file does not parse (line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')})`);
  }
  const regexAt = new Set();
  const continueAt = new Set();
  /** start of each template part → 'raw' (String.raw) | 'other' (any other tag) */
  const taggedPart = new Map();
  /** String.raw templates: [start, end) of the template, and the node */
  const rawTemplates = [];
  const visit = (node) => {
    if (node.kind === K.RegularExpressionLiteral) regexAt.add(node.getStart(sf));
    if (node.kind === K.TemplateMiddle || node.kind === K.TemplateTail) continueAt.add(node.getStart(sf));
    if (node.kind === K.TaggedTemplateExpression) {
      const isRaw = node.tag.getText(sf) === 'String.raw';
      const tpl = node.template;
      const parts = tpl.kind === K.NoSubstitutionTemplateLiteral ? [tpl] : [tpl.head, ...tpl.templateSpans.map((s) => s.literal)];
      for (const p of parts) taggedPart.set(p.getStart(sf), isRaw ? 'raw' : 'other');
      if (isRaw) rawTemplates.push({ start: tpl.getStart(sf), end: tpl.end, node: tpl });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { sf, regexAt, continueAt, taggedPart, rawTemplates };
}

/** Every token, trivia included, in order. @returns {{ toks: Tok[], info: ReturnType<typeof analyse> }} */
export function lex(text) {
  const info = analyse(text);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ false, ts.LanguageVariant.Standard, text);
  /** @type {Tok[]} */
  const toks = [];
  for (;;) {
    let kind = scanner.scan();
    if (kind === K.EndOfFileToken) break;
    const start = scanner.getTokenStart();
    if ((kind === K.SlashToken || kind === K.SlashEqualsToken) && info.regexAt.has(start)) kind = scanner.reScanSlashToken();
    else if (kind === K.CloseBraceToken && info.continueAt.has(start)) kind = scanner.reScanTemplateToken(info.taggedPart.has(start));
    const end = scanner.getTextPos();
    toks.push({ kind, start, end, text: text.slice(start, end), value: scanner.getTokenValue() });
  }
  return { toks, info };
}

const TEMPLATE_PART = new Set([K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail]);
const COMMENT = new Set([K.SingleLineCommentTrivia, K.MultiLineCommentTrivia]);
const TRIVIA = new Set([K.WhitespaceTrivia, K.NewLineTrivia, K.SingleLineCommentTrivia, K.MultiLineCommentTrivia, K.ShebangTrivia]);

// ── escapes ──────────────────────────────────────────────────────────────────────────────────────────────────

const hex4 = (n) => n.toString(16).padStart(4, '0');
/** One code point as UTF-16 escapes (a surrogate pair for an astral one) — valid in strings, templates and non-u regexes. */
const utf16Escape = (cp) => (cp > 0xffff ? String.fromCodePoint(cp).split('').map((u) => `\\u${hex4(u.charCodeAt(0))}`).join('') : `\\u${hex4(cp)}`);
/** One code point as \u{…} — u/v-mode regexes and identifiers (where a surrogate-pair escape is not allowed). */
const braceEscape = (cp) => `\\u{${cp.toString(16)}}`;
const isNonAscii = (s) => /[^\x00-\x7f]/.test(s);

/**
 * A string or template literal's source text with every non-ASCII character escaped. A backslash in front of a
 * non-ASCII character is an identity escape (its value is the character) unless the character is U+2028/U+2029,
 * where it is a line continuation (value: nothing) — both are kept exactly.
 */
function escapeLiteralText(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (c === 0x5c) {
      const n = src.charCodeAt(i + 1);
      if (n >= 0x80) {
        const cp = src.codePointAt(i + 1);
        if (cp !== 0x2028 && cp !== 0x2029) out += utf16Escape(cp);
        i += cp > 0xffff ? 2 : 1;
        continue;
      }
      out += src.slice(i, i + 2);
      i += 1;
      continue;
    }
    out += c >= 0x80 ? `\\u${hex4(c)}` : src[i];
  }
  return out;
}

/** `/body/flags` with every non-ASCII character in the body escaped, per the flags' mode. */
function escapeRegexText(src) {
  const slash = src.lastIndexOf('/');
  const body = src.slice(1, slash);
  const flags = src.slice(slash + 1);
  const unicode = /[uv]/.test(flags);
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    if (c === 0x5c) {
      const n = body.charCodeAt(i + 1);
      if (n >= 0x80) {
        // Only legal without u/v: an identity escape, whose value is the character itself.
        const cp = body.codePointAt(i + 1);
        out += unicode ? braceEscape(cp) : utf16Escape(cp);
        i += cp > 0xffff ? 2 : 1;
        continue;
      }
      out += body.slice(i, i + 2);
      i += 1;
      continue;
    }
    if (c >= 0x80) {
      if (unicode) {
        const cp = body.codePointAt(i);
        out += braceEscape(cp);
        if (cp > 0xffff) i += 1;
      } else out += `\\u${hex4(c)}`;
      continue;
    }
    out += body[i];
  }
  return `/${out}/${flags}`;
}

/** An identifier with its non-ASCII characters as \u escapes (same name, per ECMAScript IdentifierName). */
function escapeIdentifierText(src) {
  let out = '';
  for (const ch of src) {
    const cp = ch.codePointAt(0);
    out += cp >= 0x80 ? (cp > 0xffff ? braceEscape(cp) : `\\u${hex4(cp)}`) : ch;
  }
  return out;
}

/**
 * A String.raw template part: each non-ASCII character is lifted into a substitution (`×` → ${'\u{d7}'}), which
 * String.raw inserts as-is — the result is the same string. Refused after a backslash (the backslash would then
 * escape the `$`).
 */
function liftRawTemplateText(src, line) {
  let out = '';
  for (const ch of src) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x80) {
      let bs = 0;
      for (let j = out.length - 1; j >= 0 && out[j] === '\\'; j--) bs++;
      if (bs % 2 === 1) throw new Error(`bundle-normalize: line ${line}: a backslash before a non-ASCII character inside String.raw — write the escape in the source`);
      out += `\${'${utf16Escape(cp)}'}`;
    } else out += ch;
  }
  return out;
}

// ── comments ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Comment transliteration. Anything not here becomes its accent-stripped letter, or `?`. */
const TRANSLIT = new Map(
  Object.entries({
    '─': '-', '━': '-', '┄': '-', '┈': '-', '╌': '-', '‐': '-', '‑': '-', '‒': '-', '–': '-', '−': '-', '—': '--', '―': '--',
    '═': '=', '│': '|', '┃': '|', '║': '|', '┆': '|',
    '┌': '+', '┐': '+', '└': '+', '┘': '+', '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
    '╔': '+', '╗': '+', '╚': '+', '╝': '+', '╠': '+', '╣': '+', '╦': '+', '╩': '+', '╬': '+',
    '·': '.', '•': '*', '∙': '.', '…': '...',
    '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'", '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"', '«': '"', '»': '"',
    '→': '->', '←': '<-', '↔': '<->', '⇒': '=>', '⇐': '<=', '↑': '^', '↓': 'v', '↳': '->', '⟶': '->',
    '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~', '≃': '~', '±': '+/-', '×': 'x', '÷': '/', '∞': 'inf',
    '✓': 'ok', '✔': 'ok', '✅': 'ok', '✕': 'x', '✗': 'x', '✘': 'x', '❌': 'x', '⚠': '!', '⛔': 'X', '⭐': '*',
    '⬜': '[ ]', '☐': '[ ]', '☑': '[x]', '▶': '>', '►': '>', '◀': '<', '▸': '>', '●': '*', '○': 'o', '■': '#', '□': '[ ]',
    '°': 'deg', '¢': 'c', '€': 'EUR', '£': 'GBP', '½': '1/2', '¼': '1/4', '¾': '3/4', 'µ': 'u', 'μ': 'u',
    '§': 'S', '¶': 'P', '©': '(c)', '®': '(R)', '™': '(TM)', '²': '2', '³': '3', '¹': '1',
    '\u{a0}': ' ', '\u{2009}': ' ', '\u{200a}': ' ', '\u{202f}': ' ', '\u{2002}': ' ', '\u{2003}': ' ', '\u{3000}': ' ',
    '\u{200b}': '', '\u{200c}': '', '\u{200d}': '', '\u{fe0f}': '', '\u{feff}': '',
    '\u{2028}': '\n', '\u{2029}': '\n',
  }),
);

function transliterate(s) {
  let out = '';
  for (const ch of s) {
    if (ch.codePointAt(0) < 0x80) {
      out += ch;
      continue;
    }
    if (TRANSLIT.has(ch)) {
      out += TRANSLIT.get(ch);
      continue;
    }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += base.length && !isNonAscii(base) ? base : '?';
  }
  return out;
}

/** Runs of 4+ identical characters → 3. */
export const collapseRuns = (s) => s.replace(/([\s\S])\1{3,}/g, '$1$1$1');

/** One comment token, normalized. A block comment never gains a `*\/` inside it. */
function normalizeComment(tok) {
  if (tok.kind === K.SingleLineCommentTrivia) return `//${collapseRuns(transliterate(tok.text.slice(2)))}`;
  const inner = collapseRuns(transliterate(tok.text.slice(2, -2))).replace(/\*\//g, '* /');
  return `/*${inner}*/`;
}

// ── the normaliser ───────────────────────────────────────────────────────────────────────────────────────────

const LF = (text) => text.replace(/^\u{feff}/u, '').replace(/\r\n?/g, '\n');

/** @type {string[] | null} */
let capture = null;

/**
 * Run `fn` and return every input `normalizeBundle` was handed meanwhile — how the tests get a builder's
 * un-normalized text to prove the normalized one equivalent, without a switch that could turn normalizing off.
 */
export function withCapture(fn) {
  const seen = [];
  const prev = capture;
  capture = seen;
  try {
    fn();
  } finally {
    capture = prev;
  }
  return seen;
}

/**
 * The bundle as pure ASCII with collapsed comment rules. Throws if it cannot do that without changing the code's
 * meaning, and verifies its own output (ASCII + identical token stream) before returning it.
 * @param {string} input
 * @returns {string}
 */
export function normalizeBundle(input) {
  if (capture) capture.push(input);
  const text = LF(input);
  const { toks, info } = lex(text);
  const lineOf = (pos) => info.sf.getLineAndCharacterOfPosition(pos).line + 1;
  let out = '';
  for (const t of toks) {
    if (!isNonAscii(t.text) && !COMMENT.has(t.kind)) {
      out += t.text;
      continue;
    }
    if (COMMENT.has(t.kind)) out += normalizeComment(t);
    else if (t.kind === K.StringLiteral) out += escapeLiteralText(t.text);
    else if (TEMPLATE_PART.has(t.kind)) {
      const tag = info.taggedPart.get(t.start);
      if (tag === 'raw') out += liftRawTemplateText(t.text, lineOf(t.start));
      else if (tag === 'other') throw new Error(`bundle-normalize: line ${lineOf(t.start)}: non-ASCII inside a tagged template — the tag would see an escape; move the character into a substitution`);
      else out += escapeLiteralText(t.text);
    } else if (t.kind === K.RegularExpressionLiteral) out += escapeRegexText(t.text);
    else if (t.kind === K.Identifier || t.kind === K.PrivateIdentifier) out += escapeIdentifierText(t.text);
    else if (t.kind === K.WhitespaceTrivia) out += t.text.replace(/[^\x00-\x7f]/g, ' ');
    else if (t.kind === K.NewLineTrivia) out += t.text.replace(/[\u{2028}\u{2029}]/gu, '\n');
    else throw new Error(`bundle-normalize: line ${lineOf(t.start)}: non-ASCII in a ${K[t.kind]} token — nothing safe to turn it into`);
  }
  if (isNonAscii(out)) {
    const at = out.search(/[^\x00-\x7f]/);
    throw new Error(`bundle-normalize: output still has non-ASCII at offset ${at}`);
  }
  const diff = firstTokenDifference(text, out);
  if (diff) throw new Error(`bundle-normalize: the output means something else — ${diff}`);
  return out;
}

// ── the proof: the scanner's token stream, comments and whitespace aside, with cooked values ─────────────────

/**
 * A regex literal's canonical value: the body with \uXXXX / \u{…} escapes of NON-ASCII code points decoded back to
 * the character, and identity escapes of a non-ASCII character (`\×`, legal without u/v) reduced to the character.
 * Escapes of ASCII are left alone, and a backslash that is itself escaped never starts an escape.
 */
export function canonicalRegex(src) {
  const slash = src.lastIndexOf('/');
  const body = src.slice(1, slash);
  const flags = src.slice(slash + 1);
  const unicode = /[uv]/.test(flags);
  let out = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') {
      out += body[i];
      continue;
    }
    const rest = body.slice(i + 1);
    let m;
    if ((m = /^u\{([0-9a-fA-F]+)\}/.exec(rest)) && unicode) {
      const cp = parseInt(m[1], 16);
      if (cp >= 0x80) {
        out += String.fromCodePoint(cp);
        i += m[0].length;
        continue;
      }
    } else if ((m = /^u([0-9a-fA-F]{4})/.exec(rest))) {
      const cu = parseInt(m[1], 16);
      if (cu >= 0x80) {
        out += String.fromCharCode(cu);
        i += m[0].length;
        continue;
      }
    } else if (rest.length && rest.charCodeAt(0) >= 0x80) {
      continue; // identity escape: drop the backslash, the character follows
    }
    out += body.slice(i, i + 2);
    i += 1;
  }
  // Surrogate pairs written as two escapes and the literal astral character are the same code units.
  return `/${out}/${flags}`;
}

/**
 * The canonical token stream of a file: no trivia; strings, templates and identifiers by their cooked value;
 * regexes by `canonicalRegex`; each String.raw template as ONE token whose value is the string it produces, with
 * any non-literal substitution kept as its own canonical tokens.
 * @returns {{ kind: string, value: string, line: number }[]}
 */
export function canonicalTokens(input) {
  const text = LF(input);
  const { toks, info } = lex(text);
  const lineOf = (pos) => info.sf.getLineAndCharacterOfPosition(pos).line + 1;
  const raws = [...info.rawTemplates].sort((a, b) => a.start - b.start);
  const out = [];
  let r = 0;
  for (const t of toks) {
    while (r < raws.length && raws[r].end <= t.start) r++;
    const raw = raws[r];
    if (raw && t.start >= raw.start && t.start < raw.end) {
      if (t.start === raw.start) out.push({ kind: 'StringRaw', value: JSON.stringify(rawTemplateValue(raw.node, info.sf)), line: lineOf(t.start) });
      continue;
    }
    if (TRIVIA.has(t.kind) || t.kind === K.ConflictMarkerTrivia) continue;
    let value = t.text;
    if (t.kind === K.StringLiteral || TEMPLATE_PART.has(t.kind) || t.kind === K.Identifier || t.kind === K.PrivateIdentifier) value = t.value;
    else if (t.kind === K.RegularExpressionLiteral) value = canonicalRegex(t.text);
    out.push({ kind: K[t.kind], value, line: lineOf(t.start) });
  }
  return out;
}

/** What String.raw`…` produces, as segments: static text (string-literal substitutions folded in) and expressions. */
function rawTemplateValue(tpl, sf) {
  if (tpl.kind === K.NoSubstitutionTemplateLiteral) return [tpl.rawText ?? ''];
  const segs = [tpl.head.rawText ?? ''];
  for (const span of tpl.templateSpans) {
    const e = span.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) segs[segs.length - 1] += e.text;
    else segs.push({ expr: canonicalTokens(e.getText(sf)).map((x) => [x.kind, x.value]) }, '');
    segs[segs.length - 1] += span.literal.rawText ?? '';
  }
  return segs;
}

/** null when the two files have the same canonical token stream, else where they first differ. */
export function firstTokenDifference(a, b) {
  const ta = canonicalTokens(a);
  const tb = canonicalTokens(b);
  const n = Math.max(ta.length, tb.length);
  for (let i = 0; i < n; i++) {
    const x = ta[i];
    const y = tb[i];
    if (!x || !y || x.kind !== y.kind || x.value !== y.value) {
      return `token ${i}: ${x ? `${x.kind} ${JSON.stringify(x.value).slice(0, 60)} (line ${x.line})` : 'end'} vs ${y ? `${y.kind} ${JSON.stringify(y.value).slice(0, 60)} (line ${y.line})` : 'end'}`;
    }
  }
  return null;
}

// ── checks the tests and the deploy skill share ──────────────────────────────────────────────────────────────

/** Every comment's text in a file (normalized or not). */
export function commentTexts(input) {
  return lex(LF(input)).toks.filter((t) => COMMENT.has(t.kind)).map((t) => t.text);
}

/** Runs of 4+ identical characters inside comments — what a retype miscounts. Empty for a normalized bundle. */
export function longCommentRuns(input) {
  const runs = [];
  for (const c of commentTexts(input)) for (const m of c.matchAll(/([\s\S])\1{3,}/g)) runs.push(m[0].slice(0, 20));
  return runs;
}

export const isPureAscii = (s) => !isNonAscii(s);
