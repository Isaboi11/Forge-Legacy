import type { CatalogFood } from '@/domain/nutrition/serving';

/**
 * Create Food → My Recipes. When the recipe builder opens Create Food to scan (or type) an ingredient's
 * label (`/create-food?for=recipe`), the saved food crosses a `router.back()` — params cannot carry it —
 * so Create Food leaves it here and the builder takes it on focus. Taken, not read: a second focus must
 * not add the same ingredient twice. Same shape as `label-scan`'s hand-off.
 */
let pending: CatalogFood | null = null;

export function leaveRecipeFood(food: CatalogFood): void {
  pending = food;
}

export function takeRecipeFood(): CatalogFood | null {
  const food = pending;
  pending = null;
  return food;
}
