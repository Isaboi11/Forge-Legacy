import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The athlete's onboarding program choice — 'build_own' (chose "I will build my own") vs 'recommended'.
 * A local flag (survives the onboarding→Home boot swap; no backend needed for the demo). The Home isNew
 * card reads it to decide whether to show the "Build program" variant. The real, synced version is a
 * profile column (BU-1); this flag is the interim.
 */
const KEY = 'forge_program_intent_v1';
export type ProgramIntent = 'build_own' | 'recommended';

export async function setProgramIntent(intent: ProgramIntent): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, intent);
  } catch {
    // best-effort; a missing flag just falls back to the default Home card
  }
}

export async function getProgramIntent(): Promise<ProgramIntent | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'build_own' || v === 'recommended' ? v : null;
  } catch {
    return null;
  }
}
