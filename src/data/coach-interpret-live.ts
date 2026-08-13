import { supabase } from '@/lib/supabase';
import type { CoachConstraints } from '@/domain/coach/constraints';
import type { Question } from '@/domain/coach/chat-core';
import { interpret as interpretLocally } from '@/domain/coach/chat-core';

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

export type InterpretResult =
  /** The model placed it. `patch` is engine-shaped and safe to merge into `ChatState`. */
  | { kind: 'patch'; patch: Partial<CoachConstraints>; say: string | null; remaining: number | null }
  /** Injury language, or a question about the body. The caller shows `MEDICAL_STOP`. */
  | { kind: 'medical' }
  /** Placed by neither the matcher nor the model. The caller shows `NOT_UNDERSTOOD` and asks again. */
  | { kind: 'unclear' }
  /** The month's credits are gone. A commercial state, not a coaching one. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** The app failed. Never conflate with `unclear`. */
  | { kind: 'offline' };

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
): Promise<InterpretResult> {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'unclear' };

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
      },
    });

    if (error || !data) return { kind: 'offline' };

    const route = (data as { route?: string }).route;

    switch (route) {
      case 'patch': {
        const d = data as { patch?: Partial<CoachConstraints>; say?: string | null; remaining?: number };
        // A patch with nothing in it is not a patch. The function already guards this; so does the
        // caller, because two cheap checks are worth one silent no-op that reads as the coach ignoring you.
        if (!d.patch || Object.keys(d.patch).length === 0) return { kind: 'unclear' };
        return {
          kind: 'patch',
          patch: d.patch,
          say: d.say ?? null,
          remaining: typeof d.remaining === 'number' ? d.remaining : null,
        };
      }
      case 'medical_stop':
        return { kind: 'medical' };
      case 'out_of_credits': {
        const d = data as { remaining?: number; allowance?: number };
        return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance ?? 0 };
      }
      case 'unclear':
        return { kind: 'unclear' };
      default:
        // `error`, or a route this build does not know. Both are the app failing, not Holt deciding.
        return { kind: 'offline' };
    }
  } catch {
    return { kind: 'offline' };
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
