/**
 * HOLT'S FORMATTING ON SCREEN (Holt Listens step 1, HL-1a — tester report 2026-11-18).
 *
 * coach-ask writes the way a chat model writes: `**Rear delts:**`, `- ` bullets, the odd `### heading`. The
 * bubble drew all of it raw, so a good answer read as broken ("- **Core:** nothing direct"). This turns his
 * words into styled RUNS that nest inside the one selectable `<Text>` the bubble already draws — so long-press
 * copy still works and nothing about the layout changes.
 *
 * What it understands, and nothing more:
 *   · `**bold**` and `__bold__` · `*italic*` (only around words — "3*8" and "5 * 5" stay as written)
 *   · `` `code` `` → the plain words · `- `, `* `, `+ ` bullets → `•` · `#…` headings → a bold line
 *   · a line of only `---` / `***` → dropped · links: `[title](https://…)` and bare https URLs (via `splitLinks`)
 *
 * ⚠ STREAMING: a reply arrives a few words at a time, so `**Rear del` is on screen before its closing `**`. A
 * marker with no partner is DROPPED, never drawn — the words show plain, then turn bold when the pair lands.
 *
 * Pure: relative imports only, so `node --test` can walk it.
 */

import { splitLinks } from './links.ts';

export interface MdRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Set only for an http(s) link (`splitLinks` decides — no other scheme ever becomes one). */
  url?: string;
}

const BULLET = /^(\s*)[-*+]\s+(?=\S)/;
const HEADING = /^\s{0,3}#{1,6}\s+/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;

/**
 * Inline marks. Order matters: bold before italic, so `**x**` is never read as two italics.
 * Italic needs a non-word, non-`*` character (or the edge) on each side and words touching the inside.
 */
const INLINE = /\*\*(?=\S)([^\n]*?\S)\*\*|__(?=\S)([^\n_]*?\S)__|`([^`\n]+)`|(^|[^\w*])\*(?=[^\s*\d])([^*\n]*?[^\s*])\*(?![\w*])/g;

/** A marker the model opened and has not closed yet (or never will) — not drawn. */
const strayMarks = (s: string): string => s.replace(/\*\*|__/g, '');

function pushRun(out: MdRun[], run: MdRun) {
  if (!run.text) return;
  const prev = out[out.length - 1];
  if (prev && !prev.url && !run.url && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic) {
    prev.text += run.text;
    return;
  }
  out.push(run);
}

/** Plain or styled text, with its links split out and any stray markers dropped. */
function pushText(out: MdRun[], text: string, style: { bold?: boolean; italic?: boolean }) {
  for (const p of splitLinks(text)) {
    if (p.kind === 'link') pushRun(out, { text: strayMarks(p.text), url: p.url, ...style });
    else pushRun(out, { text: strayMarks(p.text), ...style });
  }
}

function inline(out: MdRun[], line: string, lineBold: boolean) {
  let at = 0;
  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(line); m; m = INLINE.exec(line)) {
    const lead = m[4] ?? '';
    pushText(out, line.slice(at, m.index) + lead, { bold: lineBold || undefined });
    if (m[1] != null || m[2] != null) pushText(out, (m[1] ?? m[2]) as string, { bold: true });
    else if (m[3] != null) pushText(out, m[3], { bold: lineBold || undefined });
    else pushText(out, m[5] as string, { bold: lineBold || undefined, italic: true });
    at = m.index + m[0].length;
  }
  pushText(out, line.slice(at), { bold: lineBold || undefined });
}

/** Holt's words as styled runs, in order. Joined, the runs are exactly the words a person should read. */
export function holtMarkdown(text: string): MdRun[] {
  const out: MdRun[] = [];
  const lines = text.split('\n');
  let first = true;
  for (const raw of lines) {
    if (RULE.test(raw)) continue;
    if (!first) pushRun(out, { text: '\n' });
    first = false;
    let line = raw;
    let bold = false;
    const b = BULLET.exec(line);
    if (b) {
      const depth = Math.min(3, Math.floor(b[1].replace(/\t/g, '  ').length / 2));
      pushRun(out, { text: `${'   '.repeat(depth)}•  ` });
      line = line.slice(b[0].length);
    } else if (HEADING.test(line)) {
      line = line.replace(HEADING, '');
      bold = true;
    }
    inline(out, line, bold);
  }
  /* A dropped rule at the very end must not leave a hanging blank line. */
  while (out.length && /^\n+$/.test(out[out.length - 1].text)) out.pop();
  return out.map((r) => {
    const clean: MdRun = { text: r.text };
    if (r.bold) clean.bold = true;
    if (r.italic) clean.italic = true;
    if (r.url) clean.url = r.url;
    return clean;
  });
}

/** What Copy puts on the clipboard: the words as read, no `**`, bullets as `•`, links as their URL. */
export function holtPlainText(text: string): string {
  return holtMarkdown(text)
    .map((r) => (r.url && r.text !== r.url ? `${r.text} (${r.url})` : r.text))
    .join('');
}
