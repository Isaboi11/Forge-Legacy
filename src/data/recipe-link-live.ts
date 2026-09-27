import { Platform } from 'react-native';

import { linkPrecheck, linkResultFrom, readFetchedPage, type PasteResult } from '@/domain/nutrition/recipe-paste';
import { MAX_PAGE_BYTES } from '@/domain/nutrition/recipe-text-read';
import { supabase } from '@/lib/supabase';

/**
 * A pasted recipe LINK → the recipe (PO 2026-09-27). ⚠ NEVER THROWS — it runs behind a button on a screen
 * with unsaved work.
 *
 * ══ THE PHONE FIRST, THE SERVER SECOND ══
 *
 * A phone opens the page itself: no server, and a real iPhone is refused by fewer recipe sites than a data
 * centre is (checked 2026-09-27: allrecipes, Serious Eats, Food Network and Half Baked Harvest all answer a
 * scripted fetch with a bot page). A browser cannot — CORS refuses another site's page — so the web preview
 * goes straight to `recipe-link-read`, which the phone also falls back to when a site refuses it.
 *
 * A page that OPENED but has no recipe on it is answered at once; asking the server would read the same page.
 */
const PHONE_MS = 10_000;

export async function readRecipeLink(raw: string): Promise<PasteResult> {
  const pre = linkPrecheck(raw);
  if (pre.kind !== 'ok' || !('url' in pre)) return pre as PasteResult;

  if (Platform.OS !== 'web') {
    const html = await fetchOnPhone(pre.url);
    if (html != null) {
      const read = readFetchedPage(html);
      if (read.kind === 'ok') return read;
      // A bot page reads as "no recipe" — let the server try before saying so.
      if (!/captcha|are you a robot|access denied|just a moment|simple page/i.test(html.slice(0, 20_000))) return read;
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('recipe-link-read', { body: { url: pre.url } });
    let body: unknown = data;
    if (error) {
      // A non-2xx carries its answer on `context`; anything else (not deployed, offline) is "couldn't open".
      const ctx = (error as { context?: unknown }).context;
      body = ctx instanceof Response ? await ctx.json().catch(() => null) : null;
    }
    return linkResultFrom(body);
  } catch {
    return { kind: 'unreachable' };
  }
}

async function fetchOnPhone(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PHONE_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/html,application/xhtml+xml' } });
    if (!res.ok || !/html|xml/i.test(res.headers.get('content-type') ?? '')) return null;
    const html = await res.text();
    return html.length > MAX_PAGE_BYTES ? html.slice(0, MAX_PAGE_BYTES) : html;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
