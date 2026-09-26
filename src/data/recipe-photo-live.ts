import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { readAsBase64 } from '@/data/program-photo-live';
import { sniffMediaType } from '@/domain/program/photo-read-result';
import { RECIPE_PHOTO_MEDIA, recipePhotoResultFrom, type RecipePhotoResult } from '@/domain/nutrition/recipe-photo-read';

/**
 * READING A PHOTOGRAPHED RECIPE — the client half of `recipe-photo-read`.
 *
 * Hands back a `RecipeRead` — the page's own words and amounts, never a calorie (NUT-D4) — re-guarded by
 * `recipePhotoResultFrom` on arrival. The caller turns it into a draft with `draftFromRead`
 * (`domain/nutrition/recipe-import.ts`), which matches every line to Forge's USDA catalogue or leaves it
 * unmatched for the athlete. Nothing here saves anything.
 *
 * ⚠ NOTHING HERE HOLDS A KEY — the Edge Function is the only place Anthropic is called from.
 *
 * ⚠ AN OUTAGE MUST NOT LOOK LIKE A VERDICT ON THE PHOTO — the same three-way split as
 * `program-photo-live.ts`: `offline` (the app failed), `unavailable` (the server failed), and
 * `not_a_recipe` / `unreadable` (we looked).
 */

export type { RecipePhotoResult };

/** The same picture picked twice is read once — keyed by its bytes, successful reads only. Session-only. */
const readByContent = new Map<string, RecipePhotoResult>();
const MAX_REMEMBERED = 8;

function fingerprint(base64: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < base64.length; i++) {
    h ^= base64.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${base64.length}:${(h >>> 0).toString(36)}`;
}

/** Read one picked recipe image. ⚠ NEVER THROWS — it runs behind a button on a screen with unsaved work. */
export async function readRecipePhoto(uri: string): Promise<RecipePhotoResult | NoAiConsent> {
  const file = await readAsBase64(uri);
  if (!file) return { kind: 'offline' };

  const mediaType = sniffMediaType(file.data) ?? file.mediaType;
  if (!RECIPE_PHOTO_MEDIA.includes(mediaType)) return { kind: 'unsupported_format' };

  const key = fingerprint(file.data);
  const already = readByContent.get(key);
  if (already) return already;

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  try {
    const { data, error } = await supabase.functions.invoke('recipe-photo-read', {
      body: { image: file.data, mediaType },
    });

    // ⚠ A non-2xx is NOT "offline" — its body is on the error's `context` (see `program-photo-live.ts`).
    let body: unknown = data;
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };

    const result = recipePhotoResultFrom(body);
    if (result.kind === 'ok') {
      if (readByContent.size >= MAX_REMEMBERED) readByContent.delete(readByContent.keys().next().value!);
      readByContent.set(key, result);
    }
    return result;
  } catch {
    return { kind: 'offline' };
  }
}
