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

/** What `coach-ask` hands a food read so it can call `food-search` AS THE ATHLETE (HF-D1). */
export interface FoodToolCtx {
  authorization: string;
  supabaseUrl: string;
  anonKey: string;
  fetch: (url: string, init: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}

/** Run `get_foods`. Lane B fills it. `seen` collects the foods returned this turn, by key (HF-D4). */
export async function runFoodTool(
  name: string,
  input: Record<string, unknown>,
  ctx: FoodToolCtx,
  seen: Map<string, unknown>,
): Promise<{ text: string; isError?: boolean }> {
  void name;
  void input;
  void ctx;
  void seen;
  return { text: 'Food lookup is not available.', isError: true };
}

/**
 * Before `log_food` / `propose_meal` is forwarded: every key must be one `get_foods` returned this turn (HF-D4).
 * On ok, `input` carries the foods WHOLE (as food-search returned them) for the device. Lane B fills it.
 */
export function checkFoodAction(
  name: string,
  input: Record<string, unknown>,
  seen: Map<string, unknown>,
): { ok: true; input: Record<string, unknown> } | { ok: false; error: string } {
  void name;
  void input;
  void seen;
  return { ok: false, error: 'Search for the foods with get_foods first.' };
}
