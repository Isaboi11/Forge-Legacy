import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalId, EquipmentId } from '@/domain/onboarding/derive';

/**
 * The athlete's Home intake — goals + equipment gathered by the starting-point stepper (ONB-Amendment-002),
 * alongside the experience level in `home-level.ts`. A local flag only (mirrors `home-level.ts` /
 * `program-intent.ts`): it feeds `recommendProgram` and writes nothing to Supabase. Reversible/re-askable via
 * `clearHomeIntake` (the card's "Change"). Cleared on account switch by `first-run.ts`.
 */
const KEY = 'forge_home_intake_v1';

export interface HomeIntake {
  goals: GoalId[];
  primaryGoal: GoalId | null;
  equipment: EquipmentId[];
}

const GOAL_IDS: readonly string[] = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
const EQUIP_IDS: readonly string[] = ['fullgym', 'homegym', 'dumbbells', 'bands', 'bodyweight'];

const isGoal = (x: unknown): x is GoalId => typeof x === 'string' && GOAL_IDS.includes(x);
const isEquip = (x: unknown): x is EquipmentId => typeof x === 'string' && EQUIP_IDS.includes(x);

export async function setHomeIntake(v: HomeIntake): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // best-effort; a missing intake just recommends from the level alone
  }
}

/** Re-ask: forget the intake so the stepper restarts. No confirmation (a lens, not a setting). */
export async function clearHomeIntake(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}

export async function getHomeIntake(): Promise<HomeIntake | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    const goals = (Array.isArray(p.goals) ? p.goals.filter(isGoal) : []).slice(0, 3);
    const equipment = Array.isArray(p.equipment) ? p.equipment.filter(isEquip) : [];
    const primaryGoal = isGoal(p.primaryGoal) && goals.includes(p.primaryGoal) ? p.primaryGoal : (goals[0] ?? null);
    return { goals, primaryGoal, equipment };
  } catch {
    return null;
  }
}
