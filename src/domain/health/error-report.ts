/**
 * Apple Health error reports carry a CODE and nothing else (Build 10 · Apple-Health-Build-Plan §7).
 *
 * HealthKit terms and Guideline 5.1.3: health data never leaves for a third party that isn't improving the
 * athlete's health management — and Sentry / `client_errors` are not that. So a report is an allow-listed
 * code: never a sample, a date, a distance or a source name. The builder accepts `unknown` on purpose, so
 * the one place a careless `report(err)` could smuggle a sample through is the place that refuses it.
 */

export const HK_ERROR_CODES = ['hk_auth_failed', 'hk_query_failed', 'hk_save_failed', 'hk_anchor_invalid'] as const;
export type HkErrorCode = (typeof HK_ERROR_CODES)[number];

export interface HkErrorReport {
  code: HkErrorCode;
}

const CODES: ReadonlySet<string> = new Set(HK_ERROR_CODES);

/** `{ code }` for an allow-listed code string; null for anything else — objects, errors, samples, prose. */
export function hkErrorReport(code: unknown): HkErrorReport | null {
  if (typeof code !== 'string' || !CODES.has(code)) return null;
  return { code: code as HkErrorCode };
}
