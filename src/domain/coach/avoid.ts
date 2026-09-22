/**
 * "I hate lunges" → every lunge in the catalogue, as `excludeExercises` keys.
 *
 * Found live (2026-09-22): Holt said *"no lunges anywhere in it"* and nothing told the engine, so the card
 * could carry the very movement he had just promised away. The model names what to avoid in the athlete's
 * words; this turns each name into the catalogue rows it means — the singular stem, matched as a whole word
 * in the exercise name — so the promise is kept by the engine, not by hope.
 */

export interface AvoidCatalogEntry {
  key: string;
  name: string;
}

const stem = (w: string): string =>
  w
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/(ches|shes|sses)$/, (m) => m.slice(0, -2))
    .replace(/ies$/, 'y')
    .replace(/(?<!s)s$/, '');

/** Catalogue keys for the named exercises, capped so one broad word cannot empty a pattern. */
export function resolveAvoid(names: readonly string[], catalog: readonly AvoidCatalogEntry[], cap = 40): string[] {
  const out = new Set<string>();
  for (const raw of names) {
    const s = stem(raw);
    if (s.length < 3) continue;
    const re = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]+')}(e?s)?\\b`, 'i');
    for (const e of catalog) if (re.test(e.name)) out.add(e.key);
  }
  return [...out].slice(0, cap);
}
