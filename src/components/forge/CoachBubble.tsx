import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flColor } from '@/constants/foundation';

import { hasMetHolt } from '@/lib/coach-thread';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { loadProgramDraft } from '@/lib/program-draft';
import { useCeremony } from '@/hooks/useCeremony';
import { useTour } from '@/hooks/useTour';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { CoachChatSheet } from '@/components/forge/CoachChatSheet';
import { CoachSays } from '@/components/forge/CoachSays';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { chooseNudge, type NudgeDef } from '@/domain/coach/nudges';
import { fetchNudgeHistory, fetchNudgeSignals, markNudge } from '@/data/nudge-live';

/**
 * The four surfaces the coach belongs on, and nowhere else.
 *
 * ⚠ IT USED TO BE EVERYWHERE, which is what the PO reported: "sometimes it blocks things on screens and
 * it just doesn't need to be there." Both halves of that are right. A floating button over a detail
 * screen is in the way of the thing you opened, and a coach offering to build you a program while you are
 * reading an exercise's coaching notes is answering a question nobody asked.
 *
 * The tabs are where you are DECIDING — what to train, what the week looks like, where you are up to.
 * That is the moment the coach is worth having one tap away. Everywhere else you have already decided and
 * gone somewhere specific, and the useful thing the app can do is get out of the way.
 */
const HOME_SURFACES = new Set(['/', '/workouts', '/legacy', '/squads']);

/**
 * The coach, one tap from anywhere.
 *
 * ══ WHY A FLOATING BUBBLE AND NOT A TAB OR A CARD ══
 *
 * The coach answers a question that arrives at an unpredictable moment — standing in a gym that turned
 * out to be busier than expected, or on a Sunday deciding what the week looks like. Anything that lives
 * on one screen can only be found by someone who already went looking.
 *
 * ⚠ IT USED TO SAY "deliberately everywhere" HERE, and that was the bug. Everywhere includes over the
 * thing you just opened. It now lives on the four tab surfaces — see `HOME_SURFACES` above — which is
 * still one tap from wherever you are without standing in front of anything.
 *
 * ⚠ IT ALSO STAYS OFF THE ONBOARDING FLOW ENTIRELY, which is a governance point rather than a layout one.
 * `ONB-D13` (LOCKED) requires the first-run program recommendation to be *"rule-based and deterministic…
 * not AI, never presented as AI"*. This engine is rule-based and deterministic, so it satisfies that on
 * the merits — but the recommendation the spec governs is a specific surface, and quietly putting a
 * second recommender on top of it would be answering a question the spec already answered. The bubble
 * appears once an athlete is in the app proper; onboarding is untouched.
 *
 * ══ WHEN IT HIDES ══
 *
 * It is an ALLOW-LIST, not a block-list, and that is the change: the old version tried to enumerate every
 * screen the coach should stay off and inevitably missed some — including `/sign-in` and onboarding,
 * where `ONB-D13` is explicit that a second recommender must not appear. Listing where it belongs cannot
 * have that failure mode.
 *
 * Three states hide it even on those four surfaces, because each owns the whole screen: a live workout
 * (you are mid-set), a ceremony (an earned moment, and the one thing this app refuses to interrupt), and
 * the guided tour (a spotlight with an uninvited bubble in the corner is a bug report). Its own route is
 * excluded by simply not being in the list.
 */
export function CoachBubble() {
  const pathname = usePathname();
  /*
   * ⚠ THE BUBBLE GROWS INTO THE SHEET — it does not push a route, and that was the design's call over
   * the brief's. `Coach Holt Chat.dc.html`: *"tapping it grows the mark into the sheet rather than
   * pushing a new screen."* The coach answers a question that arrived while you were doing something
   * else, and taking the something-else off the screen to answer it is the wrong shape.
   *
   * `/coach` still exists and is untouched — it is the wizard, and the tap-through path for anyone who
   * would rather not type.
   */
  /* ⚠ FROM CONTEXT, NOT `useState` — so Home can open him. The sheet is still rendered here; only the
     flag moved. See `useCoachDoor`. */
  const { open, intent, openCoach: openSheet, closeCoach } = useCoachDoor();

  /*
   * §3.4–3.5 — the teaser, and the rule that governs it: "only appears when there is a real, specific
   * thing to say. It is never generic and never a nag. If you have no line, show no teaser."
   *
   * ⚠ SO IT HAS EXACTLY ONE TRIGGER, and it is a fact rather than a prompt: there is an unsaved program
   * sitting in the Builder. That is the athlete's own unfinished action, it is true or it is not, and
   * picking the thread back up is a service. "Ready to train?" or "Need a program?" would be the app
   * talking to fill a silence, which is precisely what this rule exists to prevent.
   *
   * ══ AND IT BECAME THE NAG THAT RULE EXISTS TO PREVENT ══
   *
   * PO, 2026-08-16: *"Coach Holt is saying that my program is still in his pending. I clicked on him. The
   * message still hasn't gone away."* Two separate defects, both of them here:
   *
   *   1. THE FACT WAS READ ONCE PER APP LAUNCH. `CoachBubble` is mounted in `_layout.tsx`, OUTSIDE the
   *      navigator, so it mounts once and never again for the life of the session — and the draft read
   *      was a `[]` effect. The Builder clears the draft correctly on save and on cancel; this line never
   *      looked again. So an athlete could finish and save the program and be told for the rest of the
   *      day that it was still sitting unsaved. It was not "pending" anywhere. It was gone.
   *   2. NOTHING RETIRED IT. `openCoach` closed the INTRODUCTION and left the teaser up, so tapping the
   *      coach, reading the line and closing the sheet put you back in front of the same sentence — told
   *      again by the coach you had just finished talking to.
   *
   * Both are now: the fact is re-read whenever the athlete lands on a surface the bubble appears on, and
   * the tap that answers the line spends it.
   */
  const [draftName, setDraftName] = useState<string | null>(null);
  /*
   * Which draft they have already been told about — the NAME, not a bare "dismissed" boolean.
   *
   * A boolean would silence the teaser for the whole session, including for a DIFFERENT program abandoned
   * an hour later, which is a real fact that has never been mentioned. Keying on the name spends exactly
   * the one line that was actually shown.
   */
  const [seenDraft, setSeenDraft] = useState<string | null>(null);

  /*
   * ══ AN INTRODUCTION IS THE ONE GENERIC LINE THAT EARNS ITS PLACE ══
   *
   * Reported by the PO: **"we need to somehow let everyone know who Holt is. Some sort of prompt coming
   * from the token in the bottom right letting them know he's there. And then after the first click he
   * doesn't have that anymore."** They are right, and the gap was real: the whole coach was behind an
   * unlabelled bronze medallion. An athlete who never guessed it was tappable never met him at all —
   * `hasMetHolt` has been sitting there since the sheet was built, recording an introduction most people
   * were never in a position to receive.
   *
   * ⚠ AND IT DOES NOT BREAK §3.5 ("never generic and never a nag"). That rule exists to stop the app
   * talking to fill a silence — "Ready to train?", "Need a program?" — questions with no answer behind
   * them. This is not a prompt; it is a label on an unlabelled control, it is true exactly once, and the
   * tap it asks for is the thing that retires it forever. A nag is something you have to dismiss twice.
   *
   * `null` while unknown, so nothing flashes on screen before the answer arrives. An unreadable flag
   * reads as "new" (see `hasMetHolt`) — a second introduction is a small cost, a missing one is not.
   */
  const [met, setMet] = useState<boolean | null>(null);

  /**
   * ══ THE EXPLORATION NUDGE — Holt inviting them into a corner of the app they have not opened ══
   *
   * PO: *"Coach holt should invite people to do things they haven't in the app once in a while… Subtly
   * help them explore the app to get more buy in… When he says something and they click on him he
   * should help them get to that thing."*
   *
   * ⚠ THE CADENCE LIVES IN `domain/coach/nudges.ts`, NOT HERE. Everything this component does is ask
   * once per arrival and render the answer; the rules that make it not-a-nag are pure and tested.
   *
   * ⚠ IT RANKS BELOW BOTH EXISTING LINES. The introduction wins (a note from Holt only makes sense once
   * you know there is a Holt) and an abandoned draft wins after that, because that is something the
   * athlete already started. An invitation is the least urgent thing he has to say.
   *
   * ⚠ AND IT NEVER RUNS MID-WORKOUT — `if (session) return null` below already covers it, which is why
   * this hook can be unconditional. The coin during a session carries the progression call and the plan
   * cue; an invitation to try progress photos in that slot would displace the sentence the athlete is
   * standing at a rack waiting for.
   */
  /* ⚠ THE LINE IS RESOLVED HERE, WITH THE SIGNALS, NOT AT RENDER. Several lines interpolate a count
     ("You've earned 4 honors"), and keeping the signals alive purely to format a string later would be a
     second copy of state that can go stale against the nudge it belongs to. */
  const [nudge, setNudge] = useState<{ def: NudgeDef; line: string } | null>(null);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!HOME_SURFACES.has(pathname)) return;
    let alive = true;
    void (async () => {
      const [signals, history] = await Promise.all([fetchNudgeSignals(), fetchNudgeHistory()]);
      /* Null signals means 0179 has not been applied, or the read failed. Either way: say nothing. */
      if (!alive || !signals) return;
      const chosen = chooseNudge(signals, history, Date.now());
      setNudge(chosen ? { def: chosen, line: chosen.line(signals) } : null);
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  /*
   * RE-READ ON ARRIVAL, not once on mount. `usePathname` already re-renders this component on every
   * navigation — it is what the allow-list below is built on — so keying the read to it costs one small
   * AsyncStorage get when the athlete lands somewhere the line could appear, and nothing anywhere else.
   * That is what makes "I saved it" and "I cancelled it" both clear the line, since the Builder's own
   * `clearProgramDraft` is the thing being observed.
   */
  useEffect(() => {
    if (!HOME_SURFACES.has(pathname)) return;
    let alive = true;
    void loadProgramDraft().then((d) => {
      if (!alive) return;
      const hasContent = d?.days?.some((day) => day.main.length > 0) ?? false;
      /* ⚠ SET TO NULL, NOT MERELY LEFT ALONE. The old read could only ever turn the line ON — there was
         no branch that took it back down — so even re-reading would not have cleared a saved draft. */
      setDraftName(hasContent && d?.name ? d.name : null);
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    void hasMetHolt().then((v) => {
      if (alive) setMet(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Open him — and stop introducing him.
   *
   * The flag is PERSISTED BY THE SHEET, on the same read that decides whether to play the introduction,
   * so the two can never disagree about whether it actually happened. This only closes the teaser for
   * the rest of this session, which is what "after the first click he doesn't have that anymore" asks
   * for and is all this side is entitled to claim.
   */
  const openCoach = () => {
    /*
     * ⚠ THE TAP ANSWERS WHATEVER HE ACTUALLY SAID. If the line on screen is an invitation, opening the
     * generic chat sheet would be the coach ignoring his own sentence — the PO asked for the opposite:
     * *"have him prompt your way there."* The introduction and the draft teaser still open the sheet.
     */
    if (!introducing && !teaser && nudge) {
      setNudgeOpen(true);
      /* ⚠ NO `shown` WRITE HERE ANY MORE. The display records it (see the effect below), and writing it
         again on the tap would re-stamp `shown_at` later than the moment he actually said it, pushing
         the seven-day gap out every time somebody opens the sheet to read the line properly. */
      return;
    }
    setMet(true);
    /* THE TAP IS THE ANSWER, so the line is spent by it. Leaving it up meant closing the sheet and being
       told the same thing again by the coach you had just been talking to — which is the definition of
       the nag §3.5 forbids. Whether they act on the draft is their business; being informed of it is
       something that has now definitively happened. */
    setSeenDraft(draftName);
    openSheet();
  };

  /* DERIVED, not a second piece of state — the line is simply the fact, minus the ones already told. */
  const teaser = draftName && draftName !== seenDraft ? `${draftName} is still sitting in the builder.` : null;

  /*
   * WHICH LINE, WHEN BOTH ARE TRUE. The introduction wins: a note FROM Holt about a draft you left in the
   * builder only makes sense once you know there is a Holt. Everyone sees this exactly once.
   */
  const introducing = met === false;
  /* Introduction, then the draft they already started, then an invitation. See `nudge` above. */
  const line = introducing
    ? 'I build the training. Tap me for a program or a session.'
    : (teaser ?? nudge?.line ?? null);
  const insets = useSafeAreaInsets();
  const { session } = useWorkoutSession();
  const { current: ceremony } = useCeremony();
  const { status: tourStatus } = useTour();

  /**
   * ⚠ THE DISPLAY IS WHAT COUNTS AS "SHOWN" — NOT THE TAP.
   *
   * PO, 2026-08-26: *"coach holt as prompted me the same prompt about honors about three times now… why
   * it's repeating even after I clicked on it, and why other things haven't come up."*
   *
   * `shown` used to be written from `openCoach`, so a line the athlete READ and did not tap left no
   * trace at all. The effect above re-runs on every arrival at a home surface — and there are four of
   * them, so switching tabs re-asked the question — and `chooseNudge` was handed an empty history each
   * time and picked the same invitation again.
   *
   * ⚠ IT ALSO STARVED THE REST OF THE CATALOGUE, which is the half that is not obvious. `honors` is
   * eligible whenever `honors > 0`, which is forever once earned, and it sits third in a strictly
   * ordered list. An un-retired nudge at the head is not merely repetitive: nothing below it is ever
   * reachable. The answer to *"is it because I've used everything?"* is no — `program`, `templates`,
   * `progress`, `squads` and `metrics` were all waiting behind one row that was never written.
   *
   * `src/domain/coach/__tests__/nudge-repeat.test.mjs` holds both halves.
   *
   * ⚠ GUARDED BY EVERY SUPPRESSION BELOW. The early returns after this hook mean the coin is not on
   * screen during a session, a ceremony, the tour, or off the four home surfaces — and a nudge recorded
   * while invisible is one the athlete never got, spent. Hooks cannot run after a conditional return,
   * so the conditions are repeated here rather than the effect moved.
   *
   * ⚠ THE REF IS PER-NUDGE, NOT A BOOLEAN. It keys on the id so a genuinely different invitation later
   * in the same mount still records its own display.
   */
  const recordedShown = useRef<string | null>(null);
  const nudgeOnScreen =
    Boolean(nudge) && !introducing && !teaser &&
    !session && !ceremony && tourStatus !== 'running' && HOME_SURFACES.has(pathname);
  useEffect(() => {
    if (!nudgeOnScreen || !nudge) return;
    if (recordedShown.current === nudge.def.id) return;
    recordedShown.current = nudge.def.id;
    void markNudge(nudge.def.id, 'shown');
  }, [nudgeOnScreen, nudge]);

  if (session) return null;
  if (ceremony) return null;
  if (tourStatus === 'running') return null;
  /*
   * ⚠ THIS ALSO CLOSES A REAL DEFECT. The header above has always claimed the bubble hides on "the
   * signed-out routes", and it did not — nothing here ever checked. It rendered over `/sign-in` and over
   * onboarding, which is the one place `ONB-D13` is explicit that a second recommender must not appear.
   * The claim was mine and it was wrong; the allow-list makes it true rather than restating it.
   */
  if (!HOME_SURFACES.has(pathname)) return null;

  if (open) return <CoachChatSheet onClose={closeCoach} intent={intent} />;

  return (
    <>
      {/*
        ══ THE INVITATION, AND THE WAY THERE ══

        PO: *"if he says 'I see you haven't done progress pictures yet. Want to do those?' then have him
        prompt your way there."* One line, one destination, one way to decline — no wizard.

        ⚠ "NOT NOW" IS A DISMISSAL AND CLOSING IS NOT. Tapping Not now records a refusal, and two of
        those end the invitation forever; swiping the sheet away or tapping the backdrop is somebody who
        opened it by accident, and counting that as a no would retire nudges nobody ever read. The
        distinction only exists because `markNudge` is called from the button and not from `onClose`.
      */}
      {nudge ? (
        <BottomSheet open={nudgeOpen} onClose={() => setNudgeOpen(false)} title="Coach Holt">
          <Text style={styles.nudgeLine}>{nudge.line}</Text>
          <View style={styles.nudgeActions}>
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                const def = nudge.def;
                setNudgeOpen(false);
                setNudge(null); // spent — he does not say it again on the way back
                /* ⚠ `used` RETIRES IT PERMANENTLY, and it is written on ACCEPTANCE rather than on the
                   feature actually being used. Following him there is the athlete answering the
                   question; whether they finish is their business, and asking again because they backed
                   out of the camera would be the nag the cadence exists to prevent. */
                void markNudge(def.id, 'used');
                router.push(def.route as never);
              }}
              accessibilityLabel="Show me"
            >
              Show me
            </Button>
            <Button
              variant="text"
              fullWidth
              onPress={() => {
                const def = nudge.def;
                setNudgeOpen(false);
                setNudge(null);
                void markNudge(def.id, 'dismissed');
              }}
              accessibilityLabel="Not now"
            >
              Not now
            </Button>
          </View>
        </BottomSheet>
      ) : null}

      {/* Placement is the caller’s: 18px above the tab bar, 20 from the right edge (PROMPT §3.1). The
          Active Workout mounts the same component at its own height, above its action bar. */}
      <CoachSays
      line={line}
      named={introducing}
      onPress={openCoach}
      openLabel="Open Coach Holt"
      style={{ bottom: 96 + insets.bottom, right: 20 }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  nudgeLine: { fontSize: 16, lineHeight: 23, color: flColor.cream100 },
  nudgeActions: { gap: 8, marginTop: 18 },
});
