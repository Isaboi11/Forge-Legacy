// Build `public/privacy/index.html` from `Docs/Legal/Privacy-Policy.md`.
//
// ══ WHY GENERATE IT RATHER THAN HAND-WRITE IT ══
//
// A privacy policy that exists twice will disagree eventually, and the copy people READ is the one that
// matters legally. So the markdown is the single source and the page is derived from it. Re-run this
// after any edit to the policy:
//
//   node scripts/build-privacy-page.mjs
//
// ⚠ ONLY THE POLICY IS PUBLISHED. Everything from "# Before You Publish" onward is internal drafting
//   notes — TODOs, what still needs a lawyer, which claims are unverified — and must never be served.
//   The split is asserted below rather than assumed.
//
// ⚠ NOT AN EXPO-ROUTER ROUTE, DELIBERATELY. `public/` is copied verbatim into `dist/`, so this page has
//   no bundle, no auth, and no entry in `_layout.tsx`. Apple requires a privacy URL reachable WITHOUT an
//   account; a route inside the app would sit behind `<Stack.Protected>` and fail that.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = new URL('../Docs/Legal/Privacy-Policy.md', import.meta.url);

/**
 * ⚠ WRITTEN TWICE, AND BOTH ARE NEEDED.
 *
 * EAS Hosting serves `/privacy` from `privacy.html` and `/privacy/` from `privacy/index.html`. Shipping
 * only the directory form returns **404 on `/privacy`** — verified, not assumed — and that bare form is
 * exactly what goes into App Store Connect and what a person types. A privacy URL that 404s is an App
 * Store rejection and a broken promise at the same time.
 */
const OUT_FLAT = new URL('../public/privacy.html', import.meta.url);
const OUT_DIR = new URL('../public/privacy/', import.meta.url);
const OUT_INDEX = new URL('index.html', OUT_DIR);

const raw = readFileSync(SRC, 'utf8');

const SPLIT = '# Before You Publish';
if (!raw.includes(SPLIT)) {
  throw new Error(`Refusing to build: "${SPLIT}" not found, so the internal notes cannot be separated.`);
}
let md = raw.split(SPLIT)[0];

// The status line is internal bookkeeping ("not legally reviewed", what is still open). Readers get the
// dates; they do not get our TODO list.
md = md.replace(/^\*\*Status:[\s\S]*?\n\n/m, '');

if (/\[\[/.test(md)) {
  throw new Error('Refusing to build: unfilled [[PLACEHOLDER]] in the policy body.');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline markdown → HTML. Order matters: escape first, then re-introduce our own tags. */
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Bare URLs and the contact address, made clickable — a policy whose contact you cannot tap is
    // worse at its one job.
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');
}

const lines = md.split('\n');
const out = [];
let inList = false;
let inTable = false;

const closeList = () => {
  if (inList) {
    out.push('</ul>');
    inList = false;
  }
};
const closeTable = () => {
  if (inTable) {
    out.push('</tbody></table>');
    inTable = false;
  }
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const t = line.trim();

  if (!t) {
    closeList();
    closeTable();
    continue;
  }
  if (/^---+$/.test(t)) {
    closeList();
    closeTable();
    out.push('<hr>');
    continue;
  }

  const h = /^(#{1,4})\s+(.*)$/.exec(t);
  if (h) {
    closeList();
    closeTable();
    const level = h[1].length;
    out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    continue;
  }

  // Tables: header row, separator, then body.
  if (t.startsWith('|') && /^\|[\s:|-]+\|$/.test((lines[i + 1] ?? '').trim())) {
    closeList();
    const cells = t.split('|').slice(1, -1).map((c) => `<th>${inline(c.trim())}</th>`);
    out.push(`<table><thead><tr>${cells.join('')}</tr></thead><tbody>`);
    inTable = true;
    i++; // skip the separator
    continue;
  }
  if (inTable && t.startsWith('|')) {
    const cells = t.split('|').slice(1, -1).map((c) => `<td>${inline(c.trim())}</td>`);
    out.push(`<tr>${cells.join('')}</tr>`);
    continue;
  }
  closeTable();

  if (/^[-*]\s+/.test(t)) {
    if (!inList) {
      out.push('<ul>');
      inList = true;
    }
    out.push(`<li>${inline(t.replace(/^[-*]\s+/, ''))}</li>`);
    continue;
  }

  // A continuation line of the current bullet, not a new paragraph.
  if (inList && /^\s{2,}\S/.test(line)) {
    out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(t)}</li>`);
    continue;
  }

  closeList();
  out.push(`<p>${inline(t)}</p>`);
}
closeList();
closeTable();

const body = out.join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — Forge Legacy</title>
<meta name="description" content="How Forge Legacy handles your training data. No third-party analytics, no ad networks, private by default.">
<meta name="robots" content="index, follow">
<link rel="icon" href="/icon-192.png">
<style>
  /* Forge's own palette, so the policy does not look like it belongs to a different product. */
  :root {
    --bg: #05080A; --surface: #131517; --border: rgba(181,138,97,0.19);
    --text: #F0EDE8; --muted: #9E9890; --dim: #666060; --bronze: #C99767;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 40px 22px 96px; }
  .home { display: inline-block; margin-bottom: 28px; color: var(--bronze); text-decoration: none; font-size: 14px; }
  .home:hover { text-decoration: underline; }
  h1 { font-size: 30px; line-height: 1.2; margin: 0 0 8px; letter-spacing: 0.2px; }
  h2 { font-size: 20px; margin: 40px 0 12px; color: var(--text); }
  h3 { font-size: 15px; margin: 26px 0 8px; color: var(--bronze); letter-spacing: 0.4px; text-transform: uppercase; }
  p { margin: 0 0 14px; color: var(--muted); }
  strong { color: var(--text); font-weight: 600; }
  em { color: var(--muted); }
  ul { margin: 0 0 16px; padding-left: 20px; }
  li { margin: 0 0 9px; color: var(--muted); }
  hr { border: 0; border-top: 1px solid var(--border); margin: 34px 0; }
  a { color: var(--bronze); }
  code { background: var(--surface); padding: 1px 5px; border-radius: 4px; font-size: 0.92em; color: var(--text); }
  /* Wide content scrolls inside itself; the page body never scrolls sideways. */
  table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 14.5px; display: block; overflow-x: auto; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--muted); vertical-align: top; }
  th { color: var(--text); font-weight: 600; white-space: nowrap; }
  footer { margin-top: 56px; padding-top: 22px; border-top: 1px solid var(--border); color: var(--dim); font-size: 13px; }
</style>
</head>
<body>
<main class="wrap">
<a class="home" href="/">&larr; Forge Legacy</a>
${body}
<footer>
  Questions about your data? Email <a href="mailto:isaiahaltamirano@gmail.com">isaiahaltamirano@gmail.com</a>.
</footer>
</main>
</body>
</html>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FLAT, html, 'utf8');
writeFileSync(OUT_INDEX, html, 'utf8');
console.log(`Wrote public/privacy.html and public/privacy/index.html (${html.length} bytes each) from ${md.length} chars of policy.`);
console.log('Serves /privacy and /privacy/ — verify BOTH return 200 after deploying.');
