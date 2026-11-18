/**
 * HOLT'S FOOD TOOLS — `get_foods` (a read) and `log_food` / `propose_meal` (actions).
 * Nutrition Architecture Amendment 006 (HF-D1…HF-D6, LOCKED) + AI Road to 10 Sprint 4a §1.6.
 *
 * STUB written by the integrator so lane A can register these from day one. Lane B fills it from `095d8bf6`
 * (feat/holt-food-lookup) onto today's tree. `coach-ask/index.ts` imports it; its deploy build inlines it.
 *
 * ⚠ NO IMPORTS — bundled into `coach-ask`.
 */

export interface FoodToolDef {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
}

/** Reads — offered only with caps `actions_v1`. */
export const FOOD_TOOLS: FoodToolDef[] = [];

/** Actions — offered only with caps `actions_v1`. */
export const FOOD_ACTIONS: FoodToolDef[] = [];
