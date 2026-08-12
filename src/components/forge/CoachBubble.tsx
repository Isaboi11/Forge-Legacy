import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hasMetHolt } from '@/lib/coach-thread';
import { loadProgramDraft } from '@/lib/program-draft';
import { useCeremony } from '@/hooks/useCeremony';
import { useTour } from '@/hooks/useTour';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { CoachChatSheet } from '@/components/forge/CoachChatSheet';
import { CoachSays } from '@/components/forge/CoachSays';

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
  const [open, setOpen] = useState(false);

  /*
   * §3.4–3.5 — the teaser, and the rule that governs it: "only appears when there is a real, specific
   * thing to say. It is never generic and never a nag. If you have no line, show no teaser."
   *
   * ⚠ SO IT HAS EXACTLY ONE TRIGGER, and it is a fact rather than a prompt: there is an unsaved program
   * sitting in the Builder. That is the athlete's own unfinished action, it is true or it is not, and
   * picking the thread back up is a service. "Ready to train?" or "Need a program?" would be the app
   * talking to fill a silence, which is precisely what this rule exists to prevent.
   */
  const [teaser, setTeaser] = useState<string | null>(null);

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

  useEffect(() => {
    let alive = true;
    void loadProgramDraft().then((d) => {
      if (!alive || !d) return;
      const hasContent = d.days?.some((day) => day.main.length > 0) ?? false;
      if (hasContent && d.name) setTeaser(`${d.name} is still sitting in the builder.`);
    });
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
    setMet(true);
    setOpen(true);
  };

  /*
   * WHICH LINE, WHEN BOTH ARE TRUE. The introduction wins: a note FROM Holt about a draft you left in the
   * builder only makes sense once you know there is a Holt. Everyone sees this exactly once.
   */
  const introducing = met === false;
  const line = introducing ? 'I build the training. Tap me for a program or a session.' : teaser;
  const insets = useSafeAreaInsets();
  const { session } = useWorkoutSession();
  const { current: ceremony } = useCeremony();
  const { status: tourStatus } = useTour();

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

  if (open) return <CoachChatSheet onClose={() => setOpen(false)} />;

  return (
    /* Placement is the caller's: 18px above the tab bar, 20 from the right edge (PROMPT §3.1). The
       Active Workout mounts the same component at its own height, above its action bar. */
    <CoachSays
      line={line}
      named={introducing}
      onPress={openCoach}
      openLabel="Open Coach Holt"
      style={{ bottom: 96 + insets.bottom, right: 20 }}
    />
  );
}
