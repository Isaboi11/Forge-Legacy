import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Create Food's unsaved form (QA 09-26 N-30) — the same durable-draft pattern as the Workout Builder's
 * (`workout-builder-draft.ts`): AsyncStorage (localStorage on the web), best-effort, repaired on read.
 *
 * A label is fifteen numbers typed off a package; a refresh on the web, or iOS dropping the app while the
 * athlete checks the barcode, threw all of it away. Only a NEW food is drafted — editing re-reads the saved
 * food, which is already durable. The draft is tied to the barcode it was typed for (or none), so the form a
 * different scan opens is never filled with another product's numbers, and it goes stale after a day.
 */
export interface CreateFoodDraft {
  fields: Record<string, string>;
  unitKey: string;
  /** The barcode the form was opened for, digits only; '' for a food with none. */
  gtin: string;
  savedAt: number;
}

const KEY = 'forge_create_food_draft_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Worth keeping? A name or any number typed. */
export const createFoodDraftHasContent = (fields: Record<string, string>): boolean =>
  Object.values(fields).some((v) => typeof v === 'string' && v.trim().length > 0);

export async function loadCreateFoodDraft(gtin: string, now: number): Promise<CreateFoodDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<CreateFoodDraft>;
    if (!v || typeof v !== 'object' || !v.fields || typeof v.fields !== 'object') return null;
    if (typeof v.savedAt !== 'number' || now - v.savedAt > MAX_AGE_MS) return null;
    if ((typeof v.gtin === 'string' ? v.gtin : '') !== gtin) return null;
    const fields: Record<string, string> = {};
    for (const [k, val] of Object.entries(v.fields)) if (typeof val === 'string') fields[k] = val;
    if (!createFoodDraftHasContent(fields)) return null;
    return { fields, unitKey: typeof v.unitKey === 'string' ? v.unitKey : 'g', gtin, savedAt: v.savedAt };
  } catch {
    return null;
  }
}

export async function saveCreateFoodDraft(d: CreateFoodDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // best-effort; a dropped autosave costs the draft, never a saved food
  }
}

export async function clearCreateFoodDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
