/**
 * Where an Apple Health workout came from (Build 10 · `Docs/Apple-Health-Build-Plan.md` §5).
 *
 * Three answers, all pure:
 *   `sourceLabel`  the short name shown on the row — "Imported from Garmin Connect" (≤ 60 chars, §6)
 *   `sourceRank`   the DEDUP §5 precedence: the most direct recording wins
 *   `isForgeEcho`  did Forge write this workout itself? (the §5 rule-1 echo check)
 *
 * ══ MOST DIRECT WINS ══
 *
 * A Garmin run reaches Health from Garmin Connect, and then again from Strava if the athlete also syncs
 * there. The device's own app is the record; Strava is a copy of it. So a watch (Apple or otherwise) or a
 * manufacturer's app outranks an aggregator. Two direct sources are a tie — `dedup.ts` decides those.
 */

/** Forge's own bundle ID. The Watch companion is `com.qest4.forgelegacy.watchkitapp`, so this is a PREFIX. */
export const FORGE_BUNDLE_ID = 'com.qest4.forgelegacy';

export const SOURCE_LABEL_MAX = 60;

export const RANK_DIRECT = 2;
export const RANK_AGGREGATOR = 1;

interface KnownSource {
  /** Bundle-ID prefix, lower case. */
  prefix: string;
  label: string;
  direct: boolean;
}

/**
 * Apps seen writing workouts to Health. Matched by bundle prefix; an app not listed keeps its own name and
 * ranks as an aggregator — the conservative default, since an unknown app is more likely a copy than a
 * device.
 */
const KNOWN: readonly KnownSource[] = [
  { prefix: 'com.garmin.', label: 'Garmin Connect', direct: true },
  { prefix: 'com.coros.', label: 'COROS', direct: true },
  { prefix: 'fi.polar.', label: 'Polar Flow', direct: true },
  { prefix: 'com.wahoofitness.', label: 'Wahoo', direct: true },
  { prefix: 'com.suunto.', label: 'Suunto', direct: true },
  { prefix: 'com.strava.', label: 'Strava', direct: false },
  { prefix: 'com.nike.', label: 'Nike Run Club', direct: false },
  { prefix: 'com.fitnesskeeper.', label: 'Runkeeper', direct: false },
  { prefix: 'com.fitbit.', label: 'Fitbit', direct: false },
  { prefix: 'com.onepeloton.', label: 'Peloton', direct: false },
  { prefix: 'com.zwift.', label: 'Zwift', direct: false },
];

export interface SourceInfo {
  sourceName: string | null | undefined;
  bundleId: string | null | undefined;
  /** `HKDevice.model` / product type, e.g. "Watch7,1" or "iPhone16,2". Null when Health doesn't say. */
  productType: string | null | undefined;
}

const lower = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const isWatch = (productType: string | null | undefined) => lower(productType).startsWith('watch');
const isApple = (bundleId: string | null | undefined) => lower(bundleId).startsWith('com.apple.');
const known = (bundleId: string | null | undefined) => {
  const b = lower(bundleId);
  return b ? KNOWN.find((k) => b.startsWith(k.prefix)) ?? null : null;
};

/** The label stored in `workouts.source_label` and shown as "Imported from …". Never empty, ≤ 60 chars. */
export function sourceLabel(sourceName: string | null | undefined, bundleId: string | null | undefined, productType: string | null | undefined): string {
  const k = known(bundleId);
  let label: string;
  if (k) label = k.label;
  else if (isApple(bundleId) && isWatch(productType)) label = 'Apple Watch';
  else if (isApple(bundleId)) label = 'iPhone'; // the Fitness / Workout app recorded on the phone
  else label = (sourceName ?? '').trim() || 'Apple Health';
  return label.slice(0, SOURCE_LABEL_MAX);
}

/**
 * DEDUP §5 precedence — higher is more direct. Any recording made ON a watch is direct (Apple's Workout app,
 * or a third-party watch app); so is Apple's own phone recording and a manufacturer app. Everything else is
 * an aggregator.
 */
export function sourceRank(s: SourceInfo): number {
  const k = known(s.bundleId);
  if (k) return k.direct ? RANK_DIRECT : RANK_AGGREGATOR;
  if (isWatch(s.productType) || isApple(s.bundleId)) return RANK_DIRECT;
  return RANK_AGGREGATOR;
}

/**
 * The §5 rule-1 echo check: Forge wrote this workout (write-back, §3.5) and Health is handing it back.
 * Either the bundle is Forge's (the app or its Watch companion), or the `HKExternalUUID` metadata names a
 * Forge workout id.
 */
export function isForgeEcho(
  w: { bundleId: string | null | undefined; externalUuid: string | null | undefined },
  forgeWorkoutIds: ReadonlySet<string>,
): boolean {
  const b = lower(w.bundleId);
  if (b === FORGE_BUNDLE_ID || b.startsWith(`${FORGE_BUNDLE_ID}.`)) return true;
  return w.externalUuid != null && forgeWorkoutIds.has(w.externalUuid);
}
