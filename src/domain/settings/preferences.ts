/**
 * Preferences (P-4b) — the app-experience settings: Units plus the three Experience toggles, ported from
 * `Forge Preferences.dc.html`.
 *
 * Units is real and drives every weight display through `units.ts`. Reduce Motion is real and gates
 * animation through `useReduceMotion`. Haptics and Sound are persisted preferences whose consumers are
 * native-only: on the web preview they are no-ops, and the app has no haptics/audio layer yet, so they
 * record intent (exactly as the design persists them) rather than pretending to fire.
 */

import { DEFAULT_UNITS, isUnitSystem, type UnitSystem } from './units.ts';
import type { SymbolName } from '@/components/forge/ForgeSymbol';

export interface AppPrefs {
  units: UnitSystem;
  haptics: boolean;
  sound: boolean;
  reduceMotion: boolean;
}

export const APP_PREFS_DEFAULTS: AppPrefs = {
  units: DEFAULT_UNITS,
  haptics: true,
  sound: true,
  reduceMotion: false,
};

export type ExperienceKey = 'haptics' | 'sound' | 'reduceMotion';

export interface ExperienceToggle {
  key: ExperienceKey;
  label: string;
  desc: string;
  icon: SymbolName;
  /** Whether a consumer acts on this today. Drives an honest "native only" note in the UI. */
  live: boolean;
}

export const EXPERIENCE_TOGGLES: ExperienceToggle[] = [
  { key: 'haptics', label: 'Haptics', desc: 'Subtle taps confirm actions and PRs', icon: 'haptics', live: false },
  { key: 'sound', label: 'Sound Effects', desc: 'Rest-timer chimes and completion tones', icon: 'sound', live: false },
  { key: 'reduceMotion', label: 'Reduce Motion', desc: 'Simplifies animations across Forge', icon: 'motion', live: true },
];

/** Merge stored prefs over defaults, coercing each field and dropping anything malformed. */
export function sanitizePrefs(raw: unknown): AppPrefs {
  const out: AppPrefs = { ...APP_PREFS_DEFAULTS };
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (isUnitSystem(r.units)) out.units = r.units;
    if (typeof r.haptics === 'boolean') out.haptics = r.haptics;
    if (typeof r.sound === 'boolean') out.sound = r.sound;
    if (typeof r.reduceMotion === 'boolean') out.reduceMotion = r.reduceMotion;
  }
  return out;
}
