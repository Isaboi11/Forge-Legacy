/**
 * HEALTH-DATA CONSENT — the two opt-ins Washington's My Health My Data Act (and Nevada SB 370) ask for.
 *
 * `Docs/Legal/Mock-Legal-Review-2026-09-25.md` item 3: consumer health data needs
 *   (a) opt-in consent before it is COLLECTED — here, `nutrition` (food log, targets and the body details
 *       used to set them, allergies and dislikes);
 *   (b) a SEPARATE consent before it is SHARED — here, `ai_sharing`: every AI feature sends what it needs
 *       to Anthropic, and that send counts as sharing.
 *
 * The live policies say what the prompts say: `site/health-data.html` (§1 what is collected, §4 who
 * receives it) and `site/privacy.html` §4 (Anthropic: "your question, the training or nutrition details
 * needed to answer it, and any photo or video frames you chose… Your name and email are not sent").
 * ⚠ If either page changes what it promises, the copy below changes with it, and the policy version goes
 * up — which re-asks everybody (see `consentStatus`).
 *
 * Stored server-side, append-only, in `health_consents` (0224): one row per answer, with the policy
 * version and a server timestamp, so it holds across devices and can be proven.
 *
 * Pure and import-free, so `node --test` can hold it (`__tests__/consent.test.mjs`).
 */

export type ConsentKind = 'nutrition' | 'ai_sharing';
export type ConsentAction = 'granted' | 'declined' | 'withdrawn';
/** `none` = never answered, or agreed to an older policy version. Both mean: ask. */
export type ConsentStatus = 'granted' | 'declined' | 'withdrawn' | 'none';

export const CONSENT_KINDS: readonly ConsentKind[] = ['nutrition', 'ai_sharing'];

/**
 * The policy each consent was given against — the "Last updated" date of `site/health-data.html` and
 * `site/privacy.html` (both 25 September 2026). Raise it when a policy changes in substance: every stored
 * grant for an older version then reads as `none`, and the athlete is asked again.
 */
export const CONSENT_POLICY_VERSION: Readonly<Record<ConsentKind, string>> = {
  nutrition: '2026-09-25',
  ai_sharing: '2026-09-25',
};

export interface ConsentRecord {
  kind: ConsentKind;
  action: ConsentAction;
  policyVersion: string;
  /** ISO timestamp. The server's for stored rows; the device's for an answer not yet stored. */
  createdAt: string;
}

const KINDS = new Set<string>(CONSENT_KINDS);
const ACTIONS = new Set<string>(['granted', 'declined', 'withdrawn']);

/** Rows off the wire (`kind, action, policy_version, created_at`) — anything malformed is dropped. */
export function sanitizeConsentRows(data: unknown): ConsentRecord[] {
  if (!Array.isArray(data)) return [];
  const out: ConsentRecord[] = [];
  for (const r of data) {
    if (!r || typeof r !== 'object') continue;
    const d = r as { kind?: unknown; action?: unknown; policy_version?: unknown; created_at?: unknown };
    if (typeof d.kind !== 'string' || !KINDS.has(d.kind)) continue;
    if (typeof d.action !== 'string' || !ACTIONS.has(d.action)) continue;
    if (typeof d.policy_version !== 'string' || typeof d.created_at !== 'string') continue;
    if (Number.isNaN(Date.parse(d.created_at))) continue;
    out.push({
      kind: d.kind as ConsentKind,
      action: d.action as ConsentAction,
      policyVersion: d.policy_version,
      createdAt: d.created_at,
    });
  }
  return out;
}

/** The newest answer for one kind. Ties go to the later row, so an answer given this second wins. */
export function latestConsent(rows: readonly ConsentRecord[], kind: ConsentKind): ConsentRecord | null {
  let best: ConsentRecord | null = null;
  let bestAt = -Infinity;
  for (const r of rows) {
    if (r.kind !== kind) continue;
    const at = Date.parse(r.createdAt);
    if (at >= bestAt) {
      best = r;
      bestAt = at;
    }
  }
  return best;
}

/**
 * What the athlete has said, as of now. A grant only counts against the CURRENT policy version: agreeing
 * to a policy that has since changed is not agreeing to this one.
 */
export function consentStatus(
  rows: readonly ConsentRecord[],
  kind: ConsentKind,
  version: string = CONSENT_POLICY_VERSION[kind],
): ConsentStatus {
  const last = latestConsent(rows, kind);
  if (!last) return 'none';
  if (last.action === 'granted') return last.policyVersion === version ? 'granted' : 'none';
  return last.action;
}

/** Only a current grant allows collection or sharing. Everything else — including "unknown" — does not. */
export function consentAllows(status: ConsentStatus | null | undefined): boolean {
  return status === 'granted';
}

/**
 * Whether opening Nutrition should raise the prompt by itself. Only for somebody never asked (or asked
 * under an older policy): an athlete who said "Not now" or withdrew sees the door instead, and is not
 * asked again every time they pass the tab. An AI feature is different — the athlete tapped it, so it
 * always asks (`ensure` in `gate.ts`).
 */
export function autoPrompts(status: ConsentStatus): boolean {
  return status === 'none';
}

/** When the current grant was given, for Settings. null unless the status is `granted`. */
export function grantedAt(rows: readonly ConsentRecord[], kind: ConsentKind): string | null {
  if (consentStatus(rows, kind) !== 'granted') return null;
  return latestConsent(rows, kind)?.createdAt ?? null;
}

/* ── routes ─────────────────────────────────────────────────────────────── */

/**
 * The screens that collect nutrition data. A door into one of them from OUTSIDE the Nutrition tab (the
 * workout summary's Log Food, the Body card's targets, one of Holt's chips) asks for consent first,
 * exactly as the tab does.
 */
const NUTRITION_ROUTES = new Set([
  'nutrition',
  'log-food',
  'food-detail',
  'create-food',
  'my-foods',
  'my-recipes',
  'recipe',
  'meal-detail',
  'meal-photo',
  'meal-plan',
  'meal-plan-setup',
  'grocery-list',
  'nutrition-details',
  'nutrition-targets',
  'scan-label',
]);

export function isNutritionRoute(path: string): boolean {
  const name = path
    .split(/[?#]/)[0]
    .replace(/^\/+/, '')
    .replace(/^\(tabs\)\/?/, '')
    .split('/')[0];
  return NUTRITION_ROUTES.has(name);
}

/* ── words ──────────────────────────────────────────────────────────────── */

export const HEALTH_DATA_URL = 'https://forgelegacy.app/health-data';
export const PRIVACY_URL = 'https://forgelegacy.app/privacy';

export interface ConsentCopy {
  title: string;
  body: readonly string[];
  linkLabel: string;
  linkUrl: string;
  agree: string;
  notNow: string;
}

export const CONSENT_COPY: Readonly<Record<ConsentKind, ConsentCopy>> = {
  nutrition: {
    title: 'Before you log food',
    body: [
      'Nutrition keeps a record of what you eat: your food log, your calorie and macro targets and the details used to set them, and any allergies or foods you avoid.',
      'Some states treat this as health data, so we ask first. It is private to you. We don’t sell it, we don’t use it for ads, and no one else sees it unless you share it.',
      'You can withdraw this any time in Settings, under Health Data & AI.',
    ],
    linkLabel: 'Read the health data policy',
    linkUrl: HEALTH_DATA_URL,
    agree: 'Agree',
    notNow: 'Not now',
  },
  ai_sharing: {
    title: 'Before Holt uses AI',
    body: [
      'Coach Holt’s AI features run on Anthropic, our AI provider. When you use one, what it needs is sent to Anthropic: your question, the training or nutrition details needed to answer it, and any photo or video frames you choose.',
      'Your name and email are never sent. Anthropic does not use this data to train its models.',
      'Nothing is sent until you agree. You can withdraw this any time in Settings, under Health Data & AI.',
    ],
    linkLabel: 'Read the health data policy',
    linkUrl: HEALTH_DATA_URL,
    agree: 'Agree',
    notNow: 'Not now',
  },
};

/** Said where an AI feature was stopped because the athlete chose "Not now". Nothing left the phone. */
export const AI_DECLINED_LINE = 'Nothing was sent. This needs your OK to use AI first. Try again when you’re ready.';

/** The same moment in Holt's chat, in his voice. The sheet rises again on the next message. */
export const AI_DECLINED_HOLT = 'No problem. Nothing was sent. Ask again when you’re ready and I’ll check with you first.';

/** The Nutrition tab when consent has not been given — the door back in. */
export const NUTRITION_DOOR = {
  title: 'Nutrition needs your OK',
  body: 'Logging food keeps health data about you, so we ask before anything is saved. The rest of Forge works without it.',
  action: 'Review and agree',
} as const;

/** Settings → Health Data & AI. */
export const CONSENT_SETTINGS: Readonly<Record<ConsentKind, { label: string; hint: string; withdrawTitle: string; withdrawBody: string }>> = {
  nutrition: {
    label: 'Nutrition',
    hint: 'Your food log, targets, allergies and the details used to set them.',
    withdrawTitle: 'Withdraw nutrition consent?',
    withdrawBody:
      'Nutrition stops saving anything new. What you have already logged stays in your account until you delete it or delete your account.',
  },
  ai_sharing: {
    label: 'AI features',
    hint: 'Sharing what an AI feature needs with Anthropic: your question, relevant training or nutrition details, and photos or frames you choose.',
    withdrawTitle: 'Withdraw AI consent?',
    withdrawBody: 'Holt’s AI features stop sending anything to Anthropic. You can agree again whenever you want to use them.',
  },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The status line under each consent in Settings. Local date; the stored row keeps the exact time. */
export function consentStatusLine(status: ConsentStatus, at: string | null): string {
  if (status === 'granted') {
    const d = at ? new Date(at) : null;
    return d && !Number.isNaN(d.getTime())
      ? `Agreed on ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      : 'Agreed';
  }
  if (status === 'withdrawn') return 'Withdrawn';
  return 'Not agreed';
}
