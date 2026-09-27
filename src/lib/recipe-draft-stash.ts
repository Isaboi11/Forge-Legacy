import type { RecipeRead } from '@/domain/nutrition/recipe-photo-read';

/**
 * ONE RECIPE, HANDED TO MY RECIPES — Holt's "See the recipe" (Kitchen Scope §1.4).
 *
 * My Recipes builds a draft from a `RecipeRead` for a photographed recipe (`draftFromRead`) but only ever from
 * its own scan. A dish Holt wrote is the same shape, so the chat leaves it here and pushes `/my-recipes?draft=1`;
 * the screen takes it once on mount and opens it UNSAVED, exactly like a scan. Taking clears it, so a second
 * visit is an ordinary one.
 */
let stashed: RecipeRead | null = null;

export function stashRecipeDraft(read: RecipeRead): void {
  stashed = read;
}

export function takeRecipeDraft(): RecipeRead | null {
  const r = stashed;
  stashed = null;
  return r;
}

/**
 * ONE PICKED PICTURE, HANDED TO MY RECIPES — the Nutrition tab's "Recipe from a screenshot" (PO 09-26: "have a
 * screenshot of the recipe and be able to import it … in an easy access spot").
 *
 * ⚠ THE PICK HAPPENS ON THE TAB, INSIDE THE TAP. A web file input only opens on a user gesture, so My Recipes
 * cannot open the picker by itself on arrival. The tab picks, leaves the uri here, and pushes
 * `/my-recipes?scan=1`; the screen takes it on focus and runs the same read as its own "Scan a recipe".
 */
let stashedPhoto: string | null = null;

export function stashRecipePhoto(uri: string): void {
  stashedPhoto = uri;
}

export function takeRecipePhoto(): string | null {
  const u = stashedPhoto;
  stashedPhoto = null;
  return u;
}
