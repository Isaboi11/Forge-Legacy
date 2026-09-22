import { supabase } from '@/lib/supabase';
import type { CoachConstraints } from '@/domain/coach/constraints';
import type { Question } from '@/domain/coach/chat-core';
import { interpret as interpretLocally } from '@/domain/coach/chat-core';
import { medicalRoute } from '@/domain/coach/medical-routing';
import { narrowEdit, narrowNotes, narrowRemember, type EditIntent, type HistoryTurn } from '@/domain/coach/interpret-narrow';

export type { EditIntent, HistoryTurn };

/**
 * THE ONE PLACE THE APP TALKS TO A MODEL.
 *
 * Phase D · D1. Calls the `coach-interpret` Edge Function, which holds the API key and does the
 * metering. Nothing else in `src/` may call Anthropic, and nothing here may hold a key — if a second
 * file starts answering this question they will disagree, exactly as `entitlement.ts` says about itself.
 *
 * ══ ⚠ THE LOCAL MATCHER IS STILL HERE, AND IT IS NOT A FALLBACK FOR NOTHING ══
 *
 * `interpret()` in `chat-core.ts` — chips plus a scoped number parser — runs FIRST, on every answer.
 * Two reasons, and neither is politeness to old code:
 *
 *   1. **It is free and it is right.** People type what they see. When someone taps or types "4 days",
 *      the chip matcher places it exactly, in zero milliseconds, for zero dollars. Sending that to a
 *      model would be paying a credit to be told what a string comparison already knew.
 *   2. **It is the floor when the network is not there.** A phone in a basement gym is the normal case,
 *      not the edge case. The wizard keeps working on chips alone.
 *
 * So the model is asked only about sentences the local matcher could not place — which is precisely the
 * paid capability: *"you can just talk to it."*
 *
 * ══ ⚠ AN OUTAGE MUST NOT LOOK LIKE A REFUSAL ══
 *
 * `Coach-Chat-Design-Brief-v1.0` §6: *"Offline and error must be visibly different from a refusal. One
 * is Holt deciding; the other is the app failing. Conflating them makes Holt look arbitrary."* Every
 * failure here returns `offline`, never `unclear` — the caller owes the athlete different copy.
 */

export type InterpretStep =
  /** The model placed it. `patch` is engine-shaped and safe to merge into `ChatState`. */
  | { kind: 'patch'; patch: Partial<CoachConstraints>; say: string | null; remaining: number | null }
  /** Injury language, or a question about the body. The caller shows `MEDICAL_STOP`. */
  | { kind: 'medical' }
  /** Self-harm, an emergency now, or disordered eating. The caller shows CRISIS_ / URGENT_ / CARE_STOP. */
  /** A question or a remark, answered in Holt's voice. Words only — never training on a card. */
  | { kind: 'answer'; text: string; remaining: number | null }
  /**
   * They asked for a door the app already has: change the running program, import one, or pick one.
   * An edit the model could read carries it (`edit`, the athlete's own words) — resolve it with
   * `resolveEditIntent` in `domain/coach/edit-intent.ts`. Without it, open the tap flow.
   */
  | { kind: 'door'; to: 'edit'; edit?: EditIntent }
  | { kind: 'door'; to: 'import' | 'pick' | 'build' | 'build_day' }
  | { kind: 'crisis' }
  | { kind: 'urgent' }
  | { kind: 'care' }
  /** Placed by neither the matcher nor the model. The caller shows `NOT_UNDERSTOOD` and asks again. */
  | { kind: 'unclear' }
  /** The month's credits are gone. A commercial state, not a coaching one. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** The app failed. Never conflate with `unclear`. */
  | { kind: 'offline' };

/** What one message resolved to. */
export type InterpretResult = (
  | InterpretStep
  /**
   * Several things said in one message (CA-D11 without a tool loop) — at most three, in the order said,
   * each already narrowed and converted exactly as a single reply would be. Only patch, answer and door
   * steps occur here: the medical guard runs on the whole message first, and a stop anywhere is the whole
   * reply, never one step of several.
   */
  | { kind: 'multi'; steps: InterpretStep[] }
) & {
  /**
   * CA-D2: up to two facts the athlete just stated about themselves ("Hates lunges"), ≤80 chars each,
   * never a body fact. OFFER them as notes the athlete can see and delete; never save one silently.
   */
  remember?: string[];
};

/** What the athlete has already settled, so the model does not re-fill a field it was not asked about. */
type Known = Partial<Record<string, unknown>>;

/**
 * Place a typed answer, cheaply first and then expensively.
 *
 * ⚠ NEVER THROWS. A coach that crashes mid-conversation is worse than one that says "say that again".
 */
export async function interpretTyped(
  text: string,
  question: Question | null,
  mode: 'program' | 'day' = 'program',
  known: Known = {},
  /** This job's earlier turns (CA-D1), so a follow-up resolves. The function keeps the last six. */
  history: readonly HistoryTurn[] = [],
  /**
   * Holt's notes on this athlete (CA-D2) — what they said about themselves, one line each, ≤20 of ≤80
   * chars. Sent in the user turn as "What you know about this athlete:" so answers use it.
   */
  notes: readonly string[] = [],
): Promise<InterpretResult> {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'unclear' };
  const sentNotes = narrowNotes(notes);

  // 0. The code guard, before the local matcher: "i want to hurt myself" contains "i", which the chip
  //    matcher will happily read as an answer. Offline or not, a person in danger gets the right words.
  const guard = medicalRoute(trimmed);
  if (guard === 'crisis' || guard === 'urgent' || guard === 'care') return { kind: guard };
  if (guard !== 'clear') return { kind: 'medical' };

  // 1. Free, local, instant. Only meaningful when a question is on the table — the chips belong to it.
  if (question) {
    const local = interpretLocally(trimmed, question);
    if (local) return { kind: 'patch', patch: local, say: null, remaining: null };
  }

  // 2. The paid path.
  try {
    const { data, error } = await supabase.functions.invoke('coach-interpret', {
      body: {
        text: trimmed,
        questionId: question?.id ?? null,
        ask: question?.ask ?? null,
        chips: question?.chips.map((c) => c.label) ?? [],
        mode,
        known,
        ...(history.length ? { history: history.slice(-6) } : {}),
        ...(sentNotes.length ? { notes: sentNotes } : {}),
      },
    });

    if (error || !data) return { kind: 'offline' };

    const remaining = typeof (data as { remaining?: unknown }).remaining === 'number' ? (data as { remaining: number }).remaining : null;
    // Narrowed again on this side, like every field: a stale or future function must not hand the chat junk.
    const remember = narrowRemember((data as { remember?: unknown }).remember, sentNotes);
    const withMemory = (r: InterpretResult): InterpretResult => (remember.length ? { ...r, remember } : r);

    if ((data as { route?: string }).route === 'multi') {
      const actions = (data as { actions?: unknown }).actions;
      const steps = (Array.isArray(actions) ? actions : [])
        .map((a) => stepFrom(a, remaining))
        .filter((s): s is InterpretStep => s !== null)
        .slice(0, 3);
      if (steps.length === 0) return withMemory({ kind: 'unclear' });
      return withMemory(steps.length === 1 ? steps[0] : { kind: 'multi', steps });
    }

    const route = (data as { route?: string }).route;
    const single = stepFrom(data, remaining);
    if (single) return withMemory(single);

    switch (route) {
      case 'patch':
      case 'answer':
        // A patch with nothing in it, or an answer with no line, is not one (`stepFrom` returned null).
        return withMemory({ kind: 'unclear' });
      case 'medical_stop':
        return { kind: 'medical' };
      case 'crisis':
      case 'urgent':
      case 'care':
        return { kind: route };
      case 'out_of_credits': {
        const d = data as { remaining?: number; allowance?: number };
        return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance ?? 0 };
      }
      case 'unclear':
        return withMemory({ kind: 'unclear' });
      default:
        // `error`, or a route this build does not know. Both are the app failing, not Holt deciding.
        return { kind: 'offline' };
    }
  } catch {
    return { kind: 'offline' };
  }
}

/**
 * One action off the wire — a single-route reply or one entry of a `multi` — as a step, or null when it is
 * not a usable patch / answer / door. Stops are never steps: they are whole replies, handled by the caller.
 */
function stepFrom(raw: unknown, remaining: number | null): InterpretStep | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as { route?: unknown; patch?: unknown; say?: unknown; edit?: unknown };
  const say = typeof d.say === 'string' && d.say.trim() ? d.say.trim() : null;
  switch (d.route) {
    case 'patch': {
      // A patch with nothing in it is not a patch. The function already guards this; so does the caller,
      // because two cheap checks are worth one silent no-op that reads as the coach ignoring you.
      const patch = d.patch;
      if (typeof patch !== 'object' || patch === null || Object.keys(patch).length === 0) return null;
      return { kind: 'patch', patch: patch as Partial<CoachConstraints>, say, remaining };
    }
    case 'answer':
      return say ? { kind: 'answer', text: say, remaining } : null;
    case 'edit': {
      const edit = narrowEdit(d.edit);
      return edit ? { kind: 'door', to: 'edit', edit } : { kind: 'door', to: 'edit' };
    }
    case 'import':
    case 'pick':
    case 'build':
    case 'build_day':
      return { kind: 'door', to: d.route };
    default:
      return null;
  }
}

/**
 * The month's remaining credits, for the surface that shows them.
 *
 * ⚠ FAILS TO `null`, NOT TO ZERO. A read that failed is not an athlete who is out — showing "0 left"
 * because a request dropped would tell someone they cannot use a thing they have paid for.
 */
export async function fetchCoachAiBalance(): Promise<
  { remaining: number; allowance: number; spent: number } | null
> {
  try {
    const { data, error } = await supabase.rpc('coach_ai_balance').maybeSingle();
    if (error || !data) return null;
    const d = data as { remaining: number; allowance: number; spent: number };
    return { remaining: d.remaining, allowance: d.allowance, spent: d.spent };
  } catch {
    return null;
  }
}
