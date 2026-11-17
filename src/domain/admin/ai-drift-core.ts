/**
 * /admin-ai → "Deployed code" (AI Road to 10, Sprint 2 — PL-5; migration 0271 `admin_ai_deploys`).
 *
 * Pure: the shape of the answer, and what the card says. The nightly job (scripts/deploy-ai/drift.mjs, from
 * .github/workflows/drift.yml on main) records one row per function; this lists every function that is NOT
 * `same` / `same_after_normalize` from the latest run, with its deployed version and when it was checked, and says
 * plainly when no run has happened or the job has missed a night.
 *
 * ⛔ A failed read is a failed load, never "all clear": `shapeAiDeploys` throws on an answer it cannot read, for
 * the same reason AI health does (audit G1 — a check that cannot see looks exactly like a check that saw nothing).
 */

export type DriftStatus = 'same' | 'same_after_normalize' | 'differs' | 'missing_in_repo' | 'missing_live' | 'fetch_failed';

/** 0271's check constraint, in the order the card lists a problem (worst first). */
export const DRIFT_STATUSES: readonly DriftStatus[] = ['differs', 'fetch_failed', 'missing_live', 'missing_in_repo', 'same_after_normalize', 'same'];

/** The two statuses that mean "what runs is what the repo holds". */
export const DRIFT_MATCHING: readonly DriftStatus[] = ['same', 'same_after_normalize'];

/** The job runs nightly; a check older than this is a missed night. */
export const DRIFT_FRESH_HOURS = 30;

export const DRIFT_LABEL: Readonly<Record<DriftStatus, string>> = {
  same: 'matches the repo',
  same_after_normalize: 'matches the repo (normalized)',
  differs: 'differs from the repo',
  fetch_failed: 'could not be read',
  missing_live: 'in the repo, not deployed',
  missing_in_repo: 'deployed, not in the repo',
};

export interface DriftRow {
  slug: string;
  status: DriftStatus;
  deployedVersion: number | null;
  repoCommit: string | null;
  detail: string | null;
}

export interface DeployRow {
  slug: string;
  version: number;
  method: string;
  deployedAt: string;
  deployedBy: string;
  sourceCommit: string | null;
}

export interface AiDeploys {
  generatedAt: string;
  lastCheck: { checkedAt: string; rows: DriftRow[] } | null;
  runs7d: number;
  deploys: DeployRow[];
}

export class AiDeploysUnreadable extends Error {
  constructor(what: string) {
    super(`The deployed-code answer could not be read (${what}).`);
    this.name = 'AiDeploysUnreadable';
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const intOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const isStatus = (v: unknown): v is DriftStatus => typeof v === 'string' && (DRIFT_STATUSES as readonly string[]).includes(v);

export function shapeAiDeploys(raw: unknown): AiDeploys {
  if (!isObj(raw)) throw new AiDeploysUnreadable('not an object');
  const generatedAt = str(raw.generated_at);
  if (!generatedAt) throw new AiDeploysUnreadable('no generated_at');
  let lastCheck: AiDeploys['lastCheck'] = null;
  if (raw.last_check != null) {
    if (!isObj(raw.last_check) || !str(raw.last_check.checked_at) || !Array.isArray(raw.last_check.rows)) throw new AiDeploysUnreadable('bad last_check');
    const rows: DriftRow[] = [];
    for (const r of raw.last_check.rows) {
      if (!isObj(r) || !str(r.slug) || !isStatus(r.status)) throw new AiDeploysUnreadable('bad check row');
      rows.push({ slug: String(r.slug), status: r.status, deployedVersion: intOrNull(r.deployed_version), repoCommit: str(r.repo_commit), detail: str(r.detail) });
    }
    lastCheck = { checkedAt: String(raw.last_check.checked_at), rows };
  }
  const deploys: DeployRow[] = [];
  for (const d of Array.isArray(raw.deploys) ? raw.deploys : []) {
    if (!isObj(d) || !str(d.slug) || intOrNull(d.version) == null || !str(d.deployed_at)) continue;
    deploys.push({
      slug: String(d.slug),
      version: intOrNull(d.version) ?? 0,
      method: str(d.method) ?? 'unknown',
      deployedAt: String(d.deployed_at),
      deployedBy: str(d.deployed_by) ?? 'unknown',
      sourceCommit: str(d.source_commit),
    });
  }
  return { generatedAt, lastCheck, runs7d: intOrNull(raw.runs_7d) ?? 0, deploys };
}

/** Every row that is not a match, worst first, then by name. */
export function flaggedRows(rows: readonly DriftRow[]): DriftRow[] {
  const rank = (s: DriftStatus) => DRIFT_STATUSES.indexOf(s);
  return rows.filter((r) => !DRIFT_MATCHING.includes(r.status)).sort((a, b) => rank(a.status) - rank(b.status) || a.slug.localeCompare(b.slug));
}

/** What pages a person: the code that runs is not the repo's, or nobody could read it. */
export const DRIFT_ALARM: readonly DriftStatus[] = ['differs', 'fetch_failed'];

/**
 * The card's headline. `flagged` = every non-matching row (alarms first); `alarms` = differs / fetch_failed
 * only. A function that is in the repo but not deployed on purpose (social-sync) or a known orphan slug
 * (recipe-phot-read) is listed every night, quietly — it is not an alarm.
 */
export type DriftVerdict =
  | { state: 'never' }
  | { state: 'stale'; hours: number; at: string; flagged: DriftRow[] }
  | { state: 'clean'; at: string; count: number; flagged: DriftRow[] }
  | { state: 'alarm'; at: string; count: number; alarms: DriftRow[]; flagged: DriftRow[] };

export function driftVerdict(d: AiDeploys, nowMs: number): DriftVerdict {
  if (!d.lastCheck) return { state: 'never' };
  const at = d.lastCheck.checkedAt;
  const flagged = flaggedRows(d.lastCheck.rows);
  const alarms = flagged.filter((r) => DRIFT_ALARM.includes(r.status));
  const hours = Math.floor((nowMs - Date.parse(at)) / 3_600_000);
  if (Number.isFinite(hours) && hours > DRIFT_FRESH_HOURS) return { state: 'stale', hours, at, flagged };
  if (alarms.length === 0) return { state: 'clean', at, count: d.lastCheck.rows.length, flagged };
  return { state: 'alarm', at, count: d.lastCheck.rows.length, alarms, flagged };
}

/** "v27 · differs from the repo" for one flagged row. */
export function driftRowLine(r: DriftRow): string {
  return [r.deployedVersion != null ? `v${r.deployedVersion}` : null, DRIFT_LABEL[r.status]].filter(Boolean).join(' · ');
}

/** The newest recorded deploy of each function, newest first. */
export function latestDeploys(deploys: readonly DeployRow[], limit = 6): DeployRow[] {
  const seen = new Set<string>();
  const out: DeployRow[] = [];
  for (const d of [...deploys].sort((a, b) => Date.parse(b.deployedAt) - Date.parse(a.deployedAt))) {
    if (seen.has(d.slug)) continue;
    seen.add(d.slug);
    out.push(d);
    if (out.length >= limit) break;
  }
  return out;
}
