import { sanitizeRecipeRead, type RecipeRead } from './recipe-photo-read.ts';
import { linkTarget, looksLikeLink, recipeFromHtml, recipeFromText } from './recipe-text-read.ts';

/**
 * "PASTE A RECIPE" — what a paste becomes, and the app's words for every way it can fail. Pure; the fetch
 * lives in `data/recipe-link-live.ts`. Every read passes through `sanitizeRecipeRead`, the same boundary a
 * photographed recipe crosses, so a paste can carry nothing a photo could not.
 */

export type PasteFailure = 'empty' | 'no_ingredients' | 'bad_url' | 'social' | 'no_recipe' | 'unreachable';
export type PasteResult = { kind: 'ok'; read: RecipeRead; from: 'link' | 'text' } | { kind: PasteFailure; site?: string };

/** What the box holds — a link to read, a link Forge won't open, or a recipe's text. */
export function pasteKind(raw: string): 'empty' | 'link' | 'text' {
  const t = raw.trim();
  if (!t) return 'empty';
  return looksLikeLink(t) ? 'link' : 'text';
}

/** A pasted recipe's TEXT → a read, on the device. */
export function readPastedText(raw: string): PasteResult {
  if (!raw.trim()) return { kind: 'empty' };
  const read = sanitizeRecipeRead(recipeFromText(raw));
  return read ? { kind: 'ok', read, from: 'text' } : { kind: 'no_ingredients' };
}

/** A page's HTML, fetched on the device → a read. */
export function readFetchedPage(html: string): PasteResult {
  const read = sanitizeRecipeRead(recipeFromHtml(html));
  return read ? { kind: 'ok', read, from: 'link' } : { kind: 'no_recipe' };
}

/** `recipe-link-read`'s answer → a read. Anything unexpected is "couldn't open it", never a crash. */
export function linkResultFrom(body: unknown): PasteResult {
  const b = (body && typeof body === 'object' ? body : {}) as { ok?: unknown; read?: unknown; reason?: unknown };
  if (b.ok === true) {
    const read = sanitizeRecipeRead(b.read);
    return read ? { kind: 'ok', read, from: 'link' } : { kind: 'no_recipe' };
  }
  if (b.reason === 'no_recipe' || b.reason === 'social' || b.reason === 'bad_url') return { kind: b.reason };
  return { kind: 'unreachable' };
}

/** Checked before anything is fetched: a social link or a non-link is answered at once. */
export function linkPrecheck(raw: string): { kind: 'ok'; url: string } | PasteResult {
  const t = linkTarget(raw);
  if (t.kind === 'social') return { kind: 'social', site: t.site };
  if (t.kind === 'bad_url') return { kind: 'bad_url' };
  return t;
}

const SITE_NAME: Record<string, string> = {
  'instagram.com': 'Instagram',
  'tiktok.com': 'TikTok',
  'facebook.com': 'Facebook',
  'fb.watch': 'Facebook',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'threads.net': 'Threads',
  'x.com': 'X',
  'twitter.com': 'X',
};

/** `picture`: the athlete has "Add a picture" (Premium AI) — only then is it offered as the way round. */
export function pasteError(r: { kind: PasteFailure; site?: string }, picture = false): string {
  const or = picture ? 'Paste the recipe’s text, or add a picture of it.' : 'Paste the recipe’s text instead.';
  switch (r.kind) {
    case 'empty':
      return 'Paste a link to a recipe, or the recipe itself.';
    case 'no_ingredients':
      return 'Couldn’t find the ingredients. Paste the ingredient list with one ingredient on each line.';
    case 'bad_url':
      return 'That link can’t be opened. Paste the web address of the recipe page, or the recipe’s text.';
    case 'social':
      return `${SITE_NAME[r.site ?? ''] ?? 'That app'} keeps recipes inside its app. Copy the caption and paste the text here instead.`;
    case 'no_recipe':
      return `Couldn’t find a recipe on that page. ${or}`;
    case 'unreachable':
      return `Couldn’t open that page. Some sites block apps. ${or}`;
  }
}

export const PASTE_PLACEHOLDER = 'Paste a recipe link, or the whole recipe…';
