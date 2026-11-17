/**
 * ══ CREDITS YOU CAN SEE (AI Road to 10, Sprint 2 — UX-2; migration 0272; Monetization Amendment 012) ══
 *
 * A Premium AI athlete could not see what they had left until the meter said no. This is the chip's brain: the
 * server's read (`coach_ai_credits()`, 0272) → one of four states, in plain words:
 *
 *   · normal — "112 credits". Neutral ink: a balance is information, not an achievement (bronze is EARNED).
 *   · low    — "12 left · resets December 1", at the server's `low_at` or fewer (20, config — MA3-D16: never a
 *              constant here).
 *   · floor  — "5 a day until December 1": the month's credits are used, and chats with Holt and meal photos still
 *              work, a few a day (the soft floor, MA12). Never a dead stop for somebody who pays.
 *   · out    — today's floor is used ("Today's 5 used · back tomorrow"), or there is no floor ("Out until December 1").
 *
 * The reset date is the first of the month after the SERVER's period (`date_trunc('month', now())` in UTC — the
 * clock the meter keeps), read in UTC so it never says the 30th in Denver.
 *
 * ⚠ ONE READ, KEPT FRESH BY THE ANSWERS. Every AI function already returns `remaining` (Sprint 1 §1.2); that number
 * replaces the cached one (`withRemaining`) without another round trip. Only a reply that lands on 0 needs the
 * full read again, to learn where the day's floor stands.
 *
 * ⚠ FAILS TO NOTHING, NEVER TO ZERO. A read that failed draws no chip: "0 left" because a request dropped would tell
 * somebody they cannot use what they pay for (the rule `fetchCoachAiBalance` states).
 *
 * Pure and import-free: `node --test` runs it; `data/ai-credits-live.ts` and `components/forge/AiCreditsChip.tsx`
 * both read it.
 */

/** The chip's read of the meter. Every number is the server's. */
export interface AiCreditsRead {
  /** Premium AI is on (a live `coach_ai`). False → no chip, ever. */
  entitled: boolean;
  /** This month's credits left. */
  remaining: number;
  /** This month's allowance. */
  allowance: number;
  /** The month the server is counting, as its first day (`YYYY-MM-01`), or null when the read did not say. */
  period: string | null;
  /** The day the credits come back (`YYYY-MM-DD`), or null — then it is worked out from `period`. */
  resetsOn: string | null;
  /** The chip warns at this many left or fewer. Null = the server did not say (before 0272): no warning state. */
  lowAt: number | null;
  /** The soft floor: calls a day once the month is used. 0 = no floor (or a server before 0272). */
  floorPerDay: number;
  /** Floor calls left today, or null when not known (a server before 0272). */
  floorLeftToday: number | null;
}

export type AiChipKind = 'normal' | 'low' | 'floor' | 'out';

export interface AiChip {
  kind: AiChipKind;
  /** What the chip says. */
  label: string;
  /** The same in a tight header (Holt's, ~150pt wide on a 320pt phone): the month abbreviated, nothing dropped but "back tomorrow". */
  short: string;
  /** What VoiceOver says — the whole sentence, reset date included. */
  a11y: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const count = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null;

const ymd = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/**
 * `coach_ai_credits()`'s row (0272) → the read. Null when the row is not one (a failed read is no chip, not a zero).
 */
export function aiCreditsFromRow(row: unknown): AiCreditsRead | null {
  if (!row || typeof row !== 'object') return null;
  const d = row as Record<string, unknown>;
  const remaining = count(d.remaining);
  const allowance = count(d.allowance);
  if (typeof d.entitled !== 'boolean' || remaining == null || allowance == null) return null;
  const floorPerDay = count(d.floor_per_day) ?? 0;
  return {
    entitled: d.entitled,
    remaining,
    allowance,
    period: ymd(d.period),
    resetsOn: ymd(d.resets_on),
    lowAt: count(d.low_at),
    floorPerDay,
    floorLeftToday: floorPerDay > 0 ? count(d.floor_left_today) : 0,
  };
}

/**
 * `coach_ai_balance()`'s row — the read a server without 0272 still answers. It says nothing about Premium AI (it
 * answers the default allowance to anybody), the floor or the warning line, so the CALLER must already know the
 * athlete has Premium AI (`usePremiumAi`) and passes it; the chip then shows only normal / out.
 */
export function aiCreditsFromBalanceRow(row: unknown, premiumAi: boolean): AiCreditsRead | null {
  if (!row || typeof row !== 'object') return null;
  const d = row as Record<string, unknown>;
  const remaining = count(d.remaining);
  const allowance = count(d.allowance);
  if (remaining == null || allowance == null) return null;
  return { entitled: premiumAi, remaining, allowance, period: ymd(d.period), resetsOn: null, lowAt: null, floorPerDay: 0, floorLeftToday: 0 };
}

/**
 * The credits an AI function's reply says are left (`remaining`, Sprint 1 contract §1.2), or null. A refusal for
 * no Premium AI or no consent carries a `remaining` of 0 that says nothing about a balance — ignored.
 */
export function remainingFrom(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const d = body as Record<string, unknown>;
  if (d.reason === 'not_entitled' || d.reason === 'no_consent') return null;
  return typeof d.remaining === 'number' && Number.isFinite(d.remaining) ? Math.max(0, Math.floor(d.remaining)) : null;
}

/** The cached read with an answer's `remaining` in it. The same object back when nothing changed. */
export function withRemaining(read: AiCreditsRead, remaining: number): AiCreditsRead {
  const n = Math.max(0, Math.floor(remaining));
  if (!read.entitled || n === read.remaining) return read;
  return { ...read, remaining: n };
}

/**
 * The day the credits come back: the server's `resetsOn`, else the first of the month after `period`, else the
 * month after `now`'s UTC month. At UTC midnight — the meter's clock.
 */
export function creditsResetOn(read: Pick<AiCreditsRead, 'period' | 'resetsOn'> | null, now: Date = new Date()): Date {
  const on = /^(\d{4})-(\d{2})-(\d{2})$/.exec(read?.resetsOn ?? '');
  if (on) return new Date(Date.UTC(Number(on[1]), Number(on[2]) - 1, Number(on[3])));
  const p = /^(\d{4})-(\d{2})-\d{2}$/.exec(read?.period ?? '');
  const month = p ? Number(p[2]) - 1 : NaN;
  if (p && month >= 0 && month <= 11) return new Date(Date.UTC(Number(p[1]), month + 1, 1));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** "December 1". Read in UTC, because that is the clock the meter keeps. */
export function creditsResetLabel(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const credits = (n: number) => `${n} ${n === 1 ? 'credit' : 'credits'}`;

/** "Dec 1" — the chip's short form. */
export function creditsResetShort(d: Date): string {
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** The chip for a read — or null: no read, no Premium AI, or no allowance at all (nothing to show). */
export function aiCreditsChip(read: AiCreditsRead | null, now: Date = new Date()): AiChip | null {
  if (!read || !read.entitled || read.allowance <= 0) return null;
  const on = creditsResetOn(read, now);
  const reset = creditsResetLabel(on);
  const resetShort = creditsResetShort(on);
  const n = read.remaining;
  if (n > 0) {
    const a11y = `${n} Premium AI ${n === 1 ? 'credit' : 'credits'} left this month. They reset on ${reset}.`;
    if (read.lowAt != null && n <= read.lowAt) {
      return { kind: 'low', label: `${n} left · resets ${reset}`, short: `${n} left · resets ${resetShort}`, a11y };
    }
    return { kind: 'normal', label: credits(n), short: credits(n), a11y };
  }
  const perDay = read.floorPerDay;
  if (perDay > 0 && read.floorLeftToday !== 0) {
    const left = read.floorLeftToday == null ? '' : ` ${read.floorLeftToday} left today.`;
    return {
      kind: 'floor',
      label: `${perDay} a day until ${reset}`,
      short: `${perDay} a day until ${resetShort}`,
      a11y: `This month's Premium AI credits are used. Chats with Holt and meal photos still work, ${perDay} a day, until ${reset}.${left}`,
    };
  }
  if (perDay > 0) {
    return {
      kind: 'out',
      label: `Today's ${perDay} used · back tomorrow`,
      short: `Today's ${perDay} used`,
      a11y: `Today's ${perDay} chats and meal photos are used. More tomorrow, and your Premium AI credits reset on ${reset}.`,
    };
  }
  return {
    kind: 'out',
    label: `Out until ${reset}`,
    short: `Out until ${resetShort}`,
    a11y: `This month's Premium AI credits are used. They reset on ${reset}.`,
  };
}

/**
 * The line for a chat or a meal photo the meter refused while a soft floor exists: with a floor, a refusal of one of
 * those means TODAY's are used — "this month's credits are used" alone would read as nothing until the 1st. Null
 * when there is no floor to speak of (the caller keeps its own line).
 */
export function aiFloorUsedLine(read: AiCreditsRead | null, now: Date = new Date()): string | null {
  if (!read || !read.entitled || read.floorPerDay <= 0) return null;
  const reset = creditsResetLabel(creditsResetOn(read, now));
  return `That's today's ${read.floorPerDay} chats and meal photos. More tomorrow, and your Premium AI credits come back on ${reset}.`;
}
