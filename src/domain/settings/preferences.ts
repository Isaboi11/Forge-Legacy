/**
 * Preferences (P-4b) — the app-experience settings: Units plus the three Experience toggles, ported from
 * `Forge Preferences.dc.html`.
 *
 * Units is real and drives every weight display through `units.ts`. Reduce Motion is real and gates
 * animation through `useReduceMotion`. SOUND IS NOW REAL TOO — it gates the rest-timer ding through
 * `useSoundEnabled` + `lib/ding`, on web and native alike. Haptics is still a recorded intent: the app
 * has no haptics layer, and the one vibration in it is web-only.
 */

import { DEFAULT_UNITS, isUnitSystem, type UnitSystem } from './units.ts';
import type { SymbolName } from '@/components/forge/ForgeSymbol';

export interface AppPrefs {
  units: UnitSystem;
  haptics: boolean;
  sound: boolean;
  reduceMotion: boolean;
  /**
   * "Help improve Forge" — first-party product-usage events (P6-A1-D5).
   *
   * ⚠ STORED AS AN OPT-**OUT**, NOT AN OPT-IN, and that is not cosmetic. `sanitizePrefs` fills every
   *   missing field from the defaults, so a stored blob written before this field existed — which is
   *   every athlete's today — must land on the DISCLOSED default. Modelled as `analyticsOptOut:false`
   *   that is what absence means. Modelled as `analyticsEnabled`, a `false` default would have been
   *   indistinguishable from a deliberate opt-out and a `true` default would silently re-enable anyone
   *   who had opted out and then had their prefs rewritten by an unrelated screen.
   *
   * Lives on P-6 (privacy), not on P-4b Preferences, because it is a disclosure control rather than an
   * experience setting. The value here is mirrored to AsyncStorage so the emitter can read consent
   * synchronously — see `lib/analytics.ts`.
   */
  analyticsOptOut: boolean;
}

export const APP_PREFS_DEFAULTS: AppPrefs = {
  units: DEFAULT_UNITS,
  haptics: true,
  sound: true,
  reduceMotion: false,
  analyticsOptOut: false,
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
  { key: 'sound', label: 'Sound Effects', desc: 'A small ding when your rest timer runs out', icon: 'sound', live: true },
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
    if (typeof r.analyticsOptOut === 'boolean') out.analyticsOptOut = r.analyticsOptOut;
  }
  return out;
}
