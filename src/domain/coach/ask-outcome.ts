/**
 * WHAT HOLT SAYS WHEN A TYPED ASK DOES NOT END IN AN ANSWER (AI audit 2026-11-16 — C-D1, C-D4, C-D5).
 *
 * Kept out of `CoachChatSheet.tsx` so the routing — which line for which state — is a pure function a test
 * can walk. The sheet decides WHEN; this decides WHAT.
 *
 * ══ OUT OF CREDITS IS THREE STATES, NOT ONE (C-D1) ══
 *
 * The chat used to answer every `out_of_credits` with `allowance_program` — the Free plan's "That's the one
 * block I write for free" — so a Premium AI customer at the monthly cap was told his free block was used.
 * The meter's reply actually says which state it is (`coach_ai_spend_credits`, 0144 / 0203):
 *
 *   · `allowance` 0 — Premium AI is not on for this account at all (0203 refuses with 0 / 0).
 *   · `remaining` 0 — this month's credits are used. They come back on the 1st of next month.
 *   · `remaining` > 0 — some are left, but this ask costs more (an online search, MA3-D16 weights).
 *
 * The month is the SERVER's (`coach_ai_balance().period`, a `date_trunc('month', now())` in UTC), read by
 * `fetchCoachAiBalance`; the device's UTC month stands in only when that read fails.
 *
 * ⚠ Domain code: relative imports only.
 */

import type { Turn } from './chat-core.ts';
import { pick, type Chooser } from './rulebook/voice.ts';
import { DOORS, isHoltAction, type HoltAction } from './holt-actions.ts';
import { CHANGE_EQUIPMENT_IDS } from './ask-tools.ts';
import { narrowEdit, narrowPatch, narrowRemember, type EditIntent } from './interpret-narrow.ts';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The day the credits come back: the first of the month after `period` (`YYYY-MM-DD`, the server's month),
 * at UTC midnight. Without a readable period, the month after `now`'s UTC month.
 */
export function aiCreditsBackOn(period: string | null | undefined, now: Date = new Date()): Date {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(period ?? '');
  const month = m ? Number(m[2]) - 1 : NaN;
  if (m && month >= 0 && month <= 11) return new Date(Date.UTC(Number(m[1]), month + 1, 1));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** "December 1". Read in UTC, because that is the clock the meter keeps. */
export function aiCreditsBackOnLabel(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** How long the line waits on `fetchCoachAiBalance` for the server's month before using the device's. */
export const AI_BALANCE_LOOKUP_MS = 3_000;

/** What still works with no credits left. Taps build from the rulebook (`authorFallbackLine`), and logging never touched the meter. */
export const WITHOUT_AI_CREDITS = "Until then I'll still build from the taps, and your logging works as normal.";

/**
 * Holt's reply when the meter refused a typed ask (`out_of_credits` from coach-ask or coach-interpret).
 *
 * `web` — the ask was a tapped online search, which costs more than an ordinary question.
 * `period` — `fetchCoachAiBalance().period`, or null when that read failed.
 * `floor` — the soft floor (0272, MA12): chats and meal photos still work a few a day once the month is used. From
 * `coach_ai_credits()`; null/absent before 0272 is pasted, and then the month-only line stands.
 */
export function outOfAiCreditsLine(
  o: {
    remaining: number;
    allowance: number;
    web?: boolean;
    period?: string | null;
    floor?: { perDay: number; leftToday: number | null } | null;
  },
  now: Date = new Date(),
  choose?: Chooser,
): string {
  if (!(o.allowance > 0)) return `${pick('ai_not_on', choose)} Every tap in here still works.`;
  const back = aiCreditsBackOnLabel(aiCreditsBackOn(o.period, now));
  const left = Math.max(0, Math.floor(o.remaining));
  if (left === 0 && o.floor && o.floor.perDay > 0) {
    const perDay = Math.floor(o.floor.perDay);
    // Today's free ones are used too: "this month's are used" alone would read as nothing until the 1st.
    if (o.floor.leftToday === 0) {
      return `That's today's ${perDay} chats and meal photos. More tomorrow, and your Premium AI credits come back on ${back}.`;
    }
    // The floor still has room, so THIS ask was one the floor doesn't cover (an online search, a typed build).
    const today = o.floor.leftToday == null ? `, ${perDay} a day` : ` (${Math.floor(o.floor.leftToday)} more today)`;
    return `${o.web ? 'An online search' : 'That one'} needs Premium AI credits, and this month's are used. Ordinary questions and meal photos still work${today}, and your credits come back on ${back}.`;
  }
  if (left === 0) return `${pick('out_of_ai_credits', choose)} They come back on ${back}. ${WITHOUT_AI_CREDITS}`;
  const credits = `You have ${left} Premium AI ${left === 1 ? 'credit' : 'credits'} left this month`;
  /* An online search is weighted above an ordinary question (MA12; MA3-D16 before it) — so the question still fits. */
  if (o.web) return `${credits}, and an online search takes more than that. An ordinary question still fits, and they all come back on ${back}.`;
  return `${credits}, and that one takes more. They come back on ${back}. ${WITHOUT_AI_CREDITS}`;
}

/** The label on the chip under an outage card. The kitchen's retry chip says the same. */
export const ASK_RETRY_LABEL = 'Try again';

/**
 * The outage card (the one red thing in the chat — the app failing, never Holt deciding).
 *
 * ⚠ THE SUB-LINE SAYS WHAT HAPPENED (C-D5). It always read "The connection dropped before I finished",
 * including when nothing had started — a request that never got through, or a wait that ran out.
 *
 * `refunded` — coach-ask gave the credit back (AI Road to 10 Sprint 1, P-D2). The card then carries
 * `notCharged`, and the sheet says `NOT_CHARGED` ("Not charged.") under it — only when the SERVER said so,
 * never on a guess: an ask that died on the phone's side may well have been charged.
 */
export function askOfflineCard(o: { started: boolean; timedOut: boolean; refunded?: boolean }): {
  text: string;
  sub: string;
  action: string;
  notCharged?: true;
} {
  const action = 'Ask me again in a moment.';
  const charge = o.refunded === true ? { notCharged: true as const } : {};
  if (o.started) return { text: 'I lost the line partway through.', sub: 'The connection dropped before I finished.', action, ...charge };
  return {
    text: "I couldn't reach my notes just then.",
    sub: o.timedOut ? 'Nothing came back in time, so I stopped waiting.' : "Your question didn't get through.",
    action,
    ...charge,
  };
}

/**
 * Take back every word of one streamed reply — for a refusal, where what streamed before it is not an
 * answer (C-D4). `cutOffReply` (chat-core) is the gentler one, for a dropped line: it keeps a reply that
 * already says something.
 */
export const takeBackReply = (t: readonly Turn[], sid: number): Turn[] => t.filter((x) => !(x.kind === 'holt' && x.sid === sid));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// HOLT'S ACTIONS, ROUTED (AI Road to 10 Sprint 4a, CH-3 — Docs/AI-Sprint-4a-Build-Notes.md §1.2–§1.3)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What the sheet does with one action Holt forwarded. Pure, so the routing — which action opens a build, which is a
 * door, which is a card, and what is dropped — is walked by a test, and the sheet only decides WHEN.
 *
 *   · `patch`  — propose_program / propose_day, narrowed by `narrowPatch` (coach-interpret's own narrower): the sheet's
 *                existing 'patch' handling runs it (allowance, active-program guard, block door, room, splitAsSaid,
 *                typedEquipment, focusSaid, avoid — all of it, unchanged).
 *   · `door`   — a door the app already has (build / build_day when a build named nothing; import / pick).
 *   · `edit`   — propose_program_edit, narrowed by `narrowEdit`, through `editByWords` as today.
 *   · `web`    — the "Find one online" offer, as today.
 *   · `card`   — every other action, and open_door to a screen (meal plan, targets, form check): lane C's
 *                `HoltActionCard` (`holdTurnActions` → `confirmHoltAction`). Nothing writes without a tap.
 *
 * ONE build/door/edit per reply (the first): two would fight over the same conversation. Cards are not limited.
 */
export type HoltActionStep =
  | { kind: 'patch'; patch: Record<string, unknown>; name: 'propose_program' | 'propose_day' }
  | { kind: 'door'; to: 'build' | 'build_day' | 'import' | 'pick' }
  | { kind: 'edit'; edit: EditIntent }
  /** Holt Listens (PO D12): any change to the running program — the app rewrites from his brief and checks it. */
  | { kind: 'change'; brief: string; newEquipment: string[] }
  /** "Scratch that change" — the app's own Undo of the last change (free). */
  | { kind: 'undo' }
  | { kind: 'web'; lookingFor: string }
  | { kind: 'card'; action: HoltAction };

export interface HoltActionPlan {
  steps: HoltActionStep[];
  /** Actions that were dropped (unknown, unusable, a second build, or the turn did not end cleanly). Names only. */
  dropped: string[];
}

const FLOW = new Set(['patch', 'door', 'edit', 'change', 'undo']);

/**
 * ⛔ §1.3 FIRST: `clean` is `cardsMayShow(...)` for the turn. A refusal, a retract, an error, a length cut, a timeout,
 * Stop or a closed sheet drops EVERY action — nothing is shown, nothing is written.
 */
export function planHoltActions(
  actions: readonly { name: string; input: unknown }[],
  o: { clean: boolean; todayISO: string; knownNotes?: readonly string[]; asked?: string; nutrition?: boolean; building?: boolean },
): HoltActionPlan {
  if (!o.clean) return { steps: [], dropped: actions.map((a) => a.name) };
  const steps: HoltActionStep[] = [];
  const dropped: string[] = [];
  const flowTaken = () => steps.some((s) => FLOW.has(s.kind));
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  for (const a of actions) {
    const input = obj(a.input);
    const flow = (s: HoltActionStep) => {
      if (flowTaken()) dropped.push(a.name);
      else steps.push(s);
    };
    switch (a.name) {
      case 'propose_program_change': {
        const brief = typeof input.brief === 'string' ? input.brief.trim().slice(0, 800) : '';
        const ids: readonly string[] = CHANGE_EQUIPMENT_IDS;
        const newEquipment = Array.isArray(input.newEquipment) ? [...new Set(input.newEquipment.filter((x): x is string => typeof x === 'string' && ids.includes(x)))] : [];
        if (brief) flow({ kind: 'change', brief, newEquipment });
        else dropped.push(a.name);
        break;
      }
      case 'undo_last_change':
        flow({ kind: 'undo' });
        break;
      case 'propose_program_edit': {
        const edit = narrowEdit(input);
        if (edit) flow({ kind: 'edit', edit });
        else dropped.push(a.name);
        break;
      }
      case 'offer_online_recipe_search': {
        if (o.nutrition === false) {
          dropped.push(a.name);
          break;
        }
        const want = typeof input.looking_for === 'string' && input.looking_for.trim() ? input.looking_for : o.asked ?? '';
        const lookingFor = want.trim().slice(0, 80);
        if (lookingFor) steps.push({ kind: 'web', lookingFor });
        else dropped.push(a.name);
        break;
      }
      case 'propose_program': {
        const patch = narrowPatch(input, o.todayISO);
        delete patch.dayFocus;
        /* HL-15 — read here, not in narrowPatch: that one is coach-interpret's too (inlined in its paste copy). */
        if (input.crossTrain === 'bike') patch.crossTrain = 'bike';
        if (input.replacesCurrent === true) patch.replacesCurrent = true;
        /* Mid-build, a build with nothing usable is not a NEW build: dropped, and the question on the table comes back. */
        if (!Object.keys(patch).length && o.building) dropped.push(a.name);
        else flow(Object.keys(patch).length ? { kind: 'patch', name: 'propose_program', patch } : { kind: 'door', to: 'build' });
        break;
      }
      case 'propose_day': {
        const patch = narrowPatch(input, o.todayISO);
        const focus = typeof patch.dayFocus === 'string' ? patch.dayFocus : null;
        const bare = Object.keys(patch).filter((k) => k !== 'dayFocus').length === 0;
        /* "Give me a workout" names nothing: the build_day door, which offers the running program's session first. */
        if (bare && !focus && o.building) dropped.push(a.name);
        else if (bare && (!focus || /^full[ -]?body$/i.test(focus)) && !o.building) flow({ kind: 'door', to: 'build_day' });
        else flow({ kind: 'patch', name: 'propose_day', patch: { ...patch, dayFocus: focus ?? 'full body' } });
        break;
      }
      case 'open_door': {
        /* import / pick are the chat's own doors (the import chips, the recommender); a screen is lane C's Open card. */
        const door = input.door;
        if (door === 'import' || door === 'pick') flow({ kind: 'door', to: door });
        else if ((DOORS as readonly unknown[]).includes(door)) steps.push({ kind: 'card', action: { name: 'open_door', input: { door } } });
        else dropped.push(a.name);
        break;
      }
      case 'remember_note': {
        /* coach-interpret's `remember` rule, in code: their words, ≤80, never the body, not one they already have. */
        const lines = narrowRemember([input.text], o.knownNotes ?? []);
        if (lines.length) steps.push({ kind: 'card', action: { name: 'remember_note', input: { text: lines[0] } } });
        else dropped.push(a.name);
        break;
      }
      default:
        if (isHoltAction(a.name)) steps.push({ kind: 'card', action: { name: a.name, input } });
        else dropped.push(a.name);
    }
  }
  return { steps, dropped };
}

/** Holt's line when a card could not be drawn on this app (`cardFor` gave nothing): it was dropped, nothing changed. */
export const CARD_DROPPED_LINE = "I couldn't set that one up from here, so nothing changed.";

/** Holt's line when a card's Confirm or Undo is tapped after the app forgot it (a reload): nothing is written. */
export const CARD_EXPIRED_LINE = 'That card is from before, so nothing changed. Ask me again and I’ll set it up fresh.';
