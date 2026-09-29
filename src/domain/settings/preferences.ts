/**
 * Preferences (P-4b) — the app-experience settings: Units plus the three Experience toggles, ported from
 * `Forge Preferences.dc.html`.
 *
 * Units is real and drives every weight display through `units.ts`. Reduce Motion is real and gates
 * animation through `useReduceMotion`. SOUND IS REAL — it gates the rest-timer ding through
 * `useSoundEnabled` + `lib/ding`, on web and native alike. HAPTICS IS NOW REAL TOO: `useHaptics`
 * returns pre-gated callables backed by `lib/haptics` (`expo-haptics` on native, `navigator.vibrate`
 * on web), so all four toggles on this screen now do something.
 *
 * ⚠ HAPTICS NEEDS A NATIVE BUILD, NOT AN OTA. `expo-haptics` is a native module, so it changes the
 *   runtime fingerprint — an `eas update` cannot deliver it and the toggle will keep doing nothing on
 *   any build made before 2026-08-26. The web preview vibrates on Chrome/Android only; Safari has
 *   never implemented `navigator.vibrate`, so a silent web preview is expected, not a bug.
 */

import { DEFAULT_UNITS, isUnitSystem, type UnitSystem } from './units.ts';
import { DEFAULT_THEME, isThemeName, type ThemeName } from '../../constants/theme-choice-shared.ts';
/* ⚠ RELATIVE AND EXTENSIONED, NOT `@/`. `DEFAULT_INTENSITY` and `INTENSITY_LEVELS` are RUNTIME values
   and `node --test` loads this file directly, where the alias does not resolve. The `SymbolName` import
   below survives on `@/` only because it is type-only and stripped before anything tries. */
import { DEFAULT_INTENSITY, INTENSITY_LEVELS, type IntensityLevel } from '../coach/rulebook/intensity.ts';
import type { SymbolName } from '@/components/forge/ForgeSymbol';
// Type-only, so it is erased before `node --test` runs and adds no runtime edge to the workout model.
import type { RowUnit } from '../workout/conditioning.ts';
// Relative and extensioned for the same reason as the intensity import above: `sanitizeAutoPost` is a runtime value.
import { AUTO_POST_DEFAULT, sanitizeAutoPost, type AutoPostPref } from '../share/auto-post.ts';

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
  /**
   * How hard Coach Holt pushes — `reminders` | `steady` | `push` | `drive`.
   *
   * ⚠ NOT A BOOLEAN, SO IT IS NOT AN `EXPERIENCE_TOGGLE`. It is a four-way choice with a sentence
   * against each option, and `ecosystem.test.mjs` asserts exactly which toggles are `live` — adding a
   * non-boolean there would break the honest "no consumer yet" accounting that list exists for.
   *
   * Device-independent on purpose. `coach-memory.ts` holds EXPERIENCE device-locally because losing it
   * costs one extra tap in a questionnaire; losing this would silently return an athlete who asked to be
   * pushed to the middle setting on a new phone, and they would have no idea why the coach went quiet.
   * See `domain/coach/rulebook/intensity.ts` for what each level actually changes.
   */
  coachIntensity: IntensityLevel;
  /**
   * Which palette the app resolves at launch — `forge` (dark) or `paper` (light).
   *
   * ⚠ NOT AN `EXPERIENCE_TOGGLE`, for the same reason `coachIntensity` is not: it is a choice between
   *   named options rather than a boolean, and `ecosystem.test.mjs` asserts exactly which toggles are
   *   `live`. Adding a non-boolean there would break the honest accounting that list exists for.
   *
   * ⚠ APPLIED AT LAUNCH, NOT ON CHANGE. The app's 277 stylesheets are built at module scope and freeze
   *   their colours when first imported, so switching reloads the JS — see `constants/theme-choice.ts`.
   *   Server-backed like `units` rather than device-local, so an athlete who chose Paper does not get
   *   dark again on a new phone with no idea why.
   */
  theme: ThemeName;
  /**
   * A rower's distance: `'m'` metres (default — PO, 2026-09-11, *"default meters"*) or `'road'`, the
   * athlete's miles/km. Server-backed like `units`, so it reads the same on every device and every
   * screen can take it synchronously. See `distanceUnitFor`.
   */
  rowUnit: RowUnit;
  /**
   * "Tips from Holt": his short in-app notes, such as the gap line on the Home Nutrition card (*"15 g protein
   * to go. Did you pick up the Greek yogurt on your list?"*). PO, 2026-09-24: *"some people probably don't want
   * him that involved."* and then *"have him suggest one time and ask if it's helpful and if they want that
   * for the future."* So it has THREE states, and absence is the first:
   *   · `ask`: nobody has answered yet. The first tip shows WITH "Helpful? Keep these · No thanks".
   *   · `on`: they said keep them. Tips show quietly.
   *   · `off`: they said no, or switched it off in Preferences. The tip is never loaded.
   * Pushes are not governed here; a reminder only exists because the athlete asked for it.
   */
  holtTips: HoltTips;
  /**
   * The Nutrition care line's dismissal (`domain/nutrition/care-line.ts`): the first day, `YYYY-MM-DD`, the line
   * may show again. `null` = never dismissed. "I only log some meals" sets it 30 days out, "Got it" 7.
   * Server-backed like `holtTips`, so a dismissal on the phone holds on the web too. No migration: `app_prefs`
   * is a JSONB blob and this is one more key in it.
   */
  careLineUntil: string | null;
  /**
   * Where a finished workout posts itself, if anywhere — see `domain/share/auto-post.ts`. OFF by default
   * (no friends, no squads), and a stored blob without the key lands there too, so nobody is ever opted
   * into social posting by a code change. No migration: one more key in the `app_prefs` blob.
   */
  autoPost: AutoPostPref;
  /**
   * Holt during a live workout — `on` or `off` (PO, 2026-09-29: "should people be able to completely
   * silence Holt during live workouts?" — yes).
   *
   * ⚠ A SEPARATE KEY, NOT A FIFTH INTENSITY LEVEL. Three things would break if `off` sat below `reminders`
   * on the dial: `proposeIntensity` auto-applies a step DOWN, so Holt would switch himself off; the
   * server's morning briefing reads `coachIntensity` in SQL (0159) and would need a migration; and turning
   * him back on would forget the level the athlete had. Stored apart, `off` silences the workout and
   * turning it back on returns the dial exactly where it was.
   *
   * ⚠ OFF MEANS OFF, INCLUDING TECHNIQUE CUES — the PO's explicit choice, knowing `reminders` keeps them
   * on purpose. The picker says so. A squad-mate's message still shows: it is a person, not Holt.
   */
  holtInWorkout: 'on' | 'off';
}

export const APP_PREFS_DEFAULTS: AppPrefs = {
  units: DEFAULT_UNITS,
  haptics: true,
  sound: true,
  reduceMotion: false,
  analyticsOptOut: false,
  coachIntensity: DEFAULT_INTENSITY,
  theme: DEFAULT_THEME,
  rowUnit: 'm',
  holtTips: 'ask',
  careLineUntil: null,
  autoPost: AUTO_POST_DEFAULT,
  holtInWorkout: 'on',
};

export type HoltTips = 'ask' | 'on' | 'off';

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
  { key: 'haptics', label: 'Haptics', desc: 'Subtle taps confirm actions and PRs', icon: 'haptics', live: true },
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
    /* Validated against the level list rather than trusted as a string: a stale or hand-edited value
       reaches `profileFor` as a coaching threshold, and an unrecognised one there would silently fall
       to the default anyway — better to drop it here, where the default is stated once. */
    if (typeof r.coachIntensity === 'string' && (INTENSITY_LEVELS as readonly string[]).includes(r.coachIntensity)) {
      out.coachIntensity = r.coachIntensity as IntensityLevel;
    }
    if (isThemeName(r.theme)) out.theme = r.theme;
    if (r.rowUnit === 'm' || r.rowUnit === 'road') out.rowUnit = r.rowUnit;
    if (r.holtTips === 'ask' || r.holtTips === 'on' || r.holtTips === 'off') out.holtTips = r.holtTips;
    if (typeof r.careLineUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.careLineUntil)) out.careLineUntil = r.careLineUntil;
    out.autoPost = sanitizeAutoPost(r.autoPost);
    if (r.holtInWorkout === 'on' || r.holtInWorkout === 'off') out.holtInWorkout = r.holtInWorkout;
  }
  return out;
}
