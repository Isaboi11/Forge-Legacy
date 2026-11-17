/**
 * THE LINKS IN WHAT HOLT SAYS (AI audit 2026-11-16, C-D3).
 *
 * A tapped online search costs the larger web credit, and its whole result is "name the site and give the
 * link" (coach-ask's SYSTEM). Holt's turns rendered as plain text, so that link could be neither tapped nor
 * copied. The sheet now draws his words from {@link splitLinks}: plain runs as text, links as tappable runs.
 *
 * ⚠ ONLY `http://` AND `https://`. Nothing else in a model's words becomes something the phone opens — not
 * `tel:`, `mailto:`, `javascript:`, an app scheme, or a bare `www.` that would need a scheme guessed for it.
 * The tap checks again ({@link isOpenableLink}) so a part built anywhere else cannot slip a scheme past it.
 *
 * Markdown links — `[BBC Good Food](https://…)` — show their title, linked; a bare URL shows itself. Trailing
 * sentence punctuation and an unmatched closing bracket stay text, so "see https://x.com/a." links `…/a`.
 *
 * Pure: no imports, so `node --test` can walk it.
 */

export type LinkPart = { kind: 'text'; text: string } | { kind: 'link'; text: string; url: string };

/** A markdown link with an http(s) target, or a bare http(s) URL. */
const LINKISH = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>"]+/gi;

/** True only for an http(s) URL with something after the scheme. */
export function isOpenableLink(url: string): boolean {
  return /^https?:\/\/[^\s/?#]+/i.test(url);
}

const count = (s: string, ch: string): number => s.split(ch).length - 1;

/** Strip what a sentence put after a bare URL: full stops, commas, quotes, and a closing bracket it never opened. */
function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const last = url.slice(-1);
    if (/[.,;:!?'"’”*_]/.test(last)) url = url.slice(0, -1);
    else if (last === ')' && count(url, ')') > count(url, '(')) url = url.slice(0, -1);
    else if (last === ']' && count(url, ']') > count(url, '[')) url = url.slice(0, -1);
    else return url;
  }
}

/** Holt's words as plain runs and link runs, in order. Text with no link is one text part (or none, if empty). */
export function splitLinks(text: string): LinkPart[] {
  const parts: LinkPart[] = [];
  const pushText = (s: string) => {
    if (!s) return;
    const prev = parts[parts.length - 1];
    if (prev?.kind === 'text') prev.text += s;
    else parts.push({ kind: 'text', text: s });
  };
  let at = 0;
  LINKISH.lastIndex = 0;
  for (let m = LINKISH.exec(text); m; m = LINKISH.exec(text)) {
    const start = m.index;
    if (m[1] != null && m[2] != null) {
      pushText(text.slice(at, start));
      const url = m[2];
      if (isOpenableLink(url)) parts.push({ kind: 'link', text: m[1].trim() || url, url });
      else pushText(m[0]);
      at = start + m[0].length;
      continue;
    }
    const url = trimUrl(m[0]);
    pushText(text.slice(at, start));
    if (isOpenableLink(url)) parts.push({ kind: 'link', text: url, url });
    else pushText(url);
    pushText(m[0].slice(url.length));
    at = start + m[0].length;
  }
  pushText(text.slice(at));
  return parts;
}
