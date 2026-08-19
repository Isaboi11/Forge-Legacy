/**
 * TourProvider — the first-time guidance host (Onboarding-Amendment-003). It owns three device-local
 * decisions and renders the app-level "first move" unlock ceremony above every route:
 *
 *   1. The GUIDED TOUR, which is TWO LEGS fired at TWO MOMENTS (`domain/onboarding/tour-plan.ts`):
 *      the TABS leg — four cards, one per pillar — on first arrival, and the HOME leg — seven spotlit
 *      steps over the real cards — once the athlete is settled (a program, or a session logged). Each
 *      leg persists its own terminal decision (`tour.ts`); the run itself (`run`/`stepIndex`) is
 *      transient in-memory, so quitting mid-tour leaves that leg owed and it comes back.
 *
 *      A RUN HOLDS EXACTLY ONE LEG. When both are owed, the tabs leg runs, records itself, and the arm
 *      effect below fires the Home leg a beat later — planned fresh, against a mounted Home. Combining
 *      them meant planning Home's steps against anchors that the tabs leg then navigated away from and
 *      unmounted, so the run "ended early" at the cards it had already counted. See `planTour`.
 *   2. The FIRST-VISIT SEEN-SET (`screen-prompts.ts`) — which surfaces have shown their one-time tour.
 *   3. The Guided Tips master switch, which silences all of the above.
 *
 * THE TWO LEGS USED TO BE ONE THING, AND THAT WAS THE BUG. The tabs tour existed only as the honor
 * ceremony's continuation, so both fired at the same instant — the athlete was handed a map of four tabs at
 * the exact moment the screen in front of them filled with cards nobody explained (`SCREEN_TOURS.home` was
 * literally `[]`). The map now runs on arrival, when there is genuinely nothing on Home to point at; the
 * walkthrough runs once there is.
 *
 * The ceremony is unchanged in every way but its claim: the forged-medallion `HonorCeremony` fires once the
 * athlete makes their first move (program built or chosen, announced by Home via `requestPrompt`) carrying
 * the earned Initiative honor, and its "Keep Building" CTA hands straight to the Home leg. It used to say
 * "the full forge is open", which was true only while Home was withholding itself. Nothing is withheld now,
 * so it announces the honor and what changed — a program — rather than an unlock that never happened. There is NO "skip the tour"
 * choice; the tour just runs (the mid-tour "Skip" remains the escape hatch).
 *
 * Mounted INSIDE `CeremonyProvider` (so the unlock ceremony can defer to a live ceremony — Modal Library
 * "never stack") and INSIDE `TourAnchorProvider` (so a run can be filtered to the cards actually on screen).
 * It re-reads persisted state on mount and force-resets its in-memory state whenever the auth user id
 * changes, staying in step with `resetFirstRunFlags()`.
 *
 * This is the guided tour the locked ONB-D20/D21 Non-Behavior originally prohibited; Amendment-003
 * narrows that rule to admit it (one-time, dismissible, emits no progression event — ONB-D22 preserved).
 * The element-level spotlight ONB-A3-D2 deferred to "a v2 pass" is the Home leg, built here.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import { useCeremony } from '@/hooks/useCeremony';
import { useTourAnchors } from '@/hooks/useTourAnchors';
import { useAuth } from '@/lib/auth';
import { track } from '@/lib/analytics';
import { HonorCeremony } from '@/components/ceremony/HonorCeremony';
import { HonorSymbol } from '@/components/ceremony/HonorSymbol';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import {
  legsIn,
  phaseFor,
  planTour,
  stepsFor,
  type ScreenTourStep,
  type TourLeg,
  type TourPhase,
  type TourStep,
} from '@/domain/onboarding/tour-plan';
import {
  getHomeTourStatus,
  getTourStatus,
  getUnlockAnnounced,
  setHomeTourStatus,
  setTourStatus,
  setUnlockAnnounced,
  type TourStatus,
} from '@/lib/tour';
import {
  clearScreenPrompts,
  getGuidedTipsEnabled,
  getSeenPrompts,
  markPromptSeen,
  setGuidedTipsEnabled,
  promptKeyFor,
  type PromptKey,
  type ScreenKey,
} from '@/lib/screen-prompts';
import { getWorkoutsLogged } from '@/lib/tour-phase';
/* The SIGNAL, not `lib/first-run` itself — subscribing must not drag AsyncStorage, supabase and the
   autosave module into this provider's graph. See the module header for the bug it closes. */
import { onFirstRunReset } from '@/domain/auth/first-run-signal';

export type { TourStep } from '@/domain/onboarding/tour-plan';

/**
 * Which face Home is wearing. Home reports it; the provider decides which leg that state is owed.
 *
 * `first-run` — the athlete has arrived and not yet trained. Home is asking "how do you want to start?",
 * so the map of the app (the tabs leg) is worth having and the seven-step Home walkthrough is not: there
 * is one card in front of them and a question they haven't answered.
 *
 * `settled` — they have a program OR they have trained. Either way Home is drawing its real cards.
 *
 * ══ THESE WERE `no-program` / `has-program`, AND THAT EXCLUDED SOMEBODY ══
 *
 * The provider owed the Home leg only to the program face, which meant an athlete who trains day to day
 * and never builds a program was never shown around Home — not once, ever, on the screen they open every
 * morning. Having a program was standing in for "there is something here to show you", and it is simply
 * not the same claim. Training is the thing that settles an athlete; a program is one way to do it.
 *
 * (Before that they were `gated`/`unlocked`, naming a gate removed by Onboarding-Amendment-002.)
 */
export type TourFace = 'first-run' | 'settled';

/**
 * The beat before a run starts — the screen has just settled and the athlete has not read it yet. The
 * design's coach engine waits ~1s for the same reason; this also gives late cards a moment to register
 * their anchors, since a card that isn't mounted when the run is planned loses its step.
 */
const START_BEAT_MS = 850;

/**
 * NOTHING IS PRE-MARKED ANY MORE, AND THIS LIST IS GONE ON PURPOSE.
 *
 * A completed tabs leg used to mark Workouts, Legacy and Squads as "seen", so their first-visit
 * walkthroughs never fired. That was fair when each of those was two or three cards restating the one
 * sentence the tab step had already said. It stopped being fair the moment those walkthroughs became real:
 * six spotlit steps on Workouts, seven on Legacy, each teaching what the screen does not explain about
 * itself. Pre-marking them meant the athletes who ACCEPTED being shown around were the only ones who never
 * got shown anything.
 *
 * Workouts was removed when its cluster was built and Legacy was left behind — the identical mistake, made
 * twice, three hours apart. The rule that prevents a third: **a one-sentence tab step introduces a screen;
 * it never covers one.** Finishing the guided run now suppresses nothing.
 */

// 'deferred' = the athlete tapped "View Honor" — the tour is owed but paused while they go look at the honor;
// it resumes when they leave the Honors Hub.
type UiStatus = 'loading' | 'idle' | 'deferred' | 'running';

interface TourContextValue {
  status: UiStatus;
  /** The steps of the active run — already filtered to the cards on screen, so `length` is the honest total. */
  steps: TourStep[];
  stepIndex: number;
  currentStep: TourStep | null;
  /** Announce the athlete reached the open forge — shows the honor ceremony (once, ever). */
  requestPrompt: () => void;
  /** Suppress the unlock ceremony for good — used when the honor turns out to be already held. */
  markAnnounced: () => void;
  /** Home reports which face it is showing; a run for whatever leg that face owes follows after a beat. */
  requestTour: (face: TourFace) => void;
  /** "Replay all tips" (Account Settings) — re-run every leg available on the current face, immediately. */
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  /** Resume a tour deferred by "View Honor" — the Honors Hub calls this as it's left. */
  resumeTour: () => void;
  // first-visit seen-set (consumed by useScreenPrompt)
  seen: PromptKey[];
  /** Lifetime workouts, or null while unknown — null means every phase is unlocked (see the state above). */
  workoutsLogged: number | null;
  seenLoaded: boolean;
  markSeen: (key: ScreenKey, phase?: TourPhase) => void;
  /** The Guided Tips master switch (Account Settings). Off suppresses every first-visit banner. */
  tipsEnabled: boolean;
  setTipsEnabled: (on: boolean) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { current: ceremony } = useCeremony();
  const { session, loading: authLoading } = useAuth();
  const { registeredAnchors } = useTourAnchors();
  const userId = session?.user?.id ?? null;

  const [loaded, setLoaded] = useState(false);
  const [tabsStatus, setTabsStatus] = useState<TourStatus>('pending');
  const [homeStatus, setHomeStatus] = useState<TourStatus>('pending');
  const [run, setRun] = useState<TourStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [face, setFace] = useState<TourFace | null>(null);
  const [deferred, setDeferred] = useState(false);
  const [requested, setRequested] = useState(false);
  const [announced, setAnnounced] = useState(true); // assume announced until storage says otherwise — never flash a repeat
  /* Composite keys — a surface plus the phase of it that was delivered. See `promptKeyFor`. */
  const [seen, setSeen] = useState<PromptKey[]>([]);
  /**
   * Lifetime workouts, which decides how much of each walkthrough is unlocked.
   *
   * ⚠ `null` UNTIL IT IS KNOWN, AND NULL MEANS "NO RESTRICTION". Defaulting to 0 while the read is in
   * flight would hand a veteran the beginner tutorial for the first second of every launch — and on a
   * failed read, forever. Under-teaching on a missing number is the failure that looks like the feature
   * working, so absence unlocks rather than restricts.
   */
  const [workoutsLogged, setWorkoutsLogged] = useState<number | null>(null);
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [tipsEnabled, setTips] = useState(true); // absent preference = on, the first-run default

  // Baseline the tour state ONCE the session read has resolved, so we read the restored account directly and
  // never mistake boot's null→id settle for an account switch. That false "switch" was wiping the seen-set on
  // every relaunch (and re-firing the honor ceremony). A plain relaunch — or re-logging into the same
  // account — keeps the persisted "already seen" state.
  const didInit = useRef(false);
  useEffect(() => {
    if (authLoading) return; // hold until getSession() resolves — userId is final from here on
    if (didInit.current) return;
    didInit.current = true;
    let alive = true;
    void (async () => {
      const [tabs, home, seenList, wasAnnounced, tips] = await Promise.all([
        getTourStatus(),
        getHomeTourStatus(),
        getSeenPrompts(),
        getUnlockAnnounced(),
        getGuidedTipsEnabled(),
      ]);
      if (!alive) return;
      setTabsStatus(tabs);
      setHomeStatus(home);
      setSeen(seenList);
      setSeenLoaded(true);
      setAnnounced(wasAnnounced);
      setTips(tips);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [authLoading, userId]);

  /**
   * ══ THE HANDOVER, AND IT IS NOW TOLD RATHER THAN GUESSED ══
   *
   * This provider used to work out for itself whether a different athlete had appeared, by comparing the
   * live user id against an in-memory ref of the last REAL one:
   *
   *     if (userId && lastRealId.current && lastRealId.current !== userId) { …reset… }
   *
   * That is the same shape of bug `domain/auth/device-handover.ts` was written to close in `AuthProvider`,
   * left behind in a second place. The app mounts this provider ABOVE the navigator, so on a device
   * sitting at the sign-in screen it baselines with `userId = null` — and `lastRealId.current && …` then
   * short-circuits on the very transition that matters, the one where somebody signs UP. Storage got
   * wiped by `resetFirstRunFlags`; this component's state did not; the stale `completed` won, and a
   * brand-new athlete was never shown the four-tab map. Only on a device that had signed somebody in
   * before — so never on a fresh install, and always on the PO's own phone.
   *
   * ⚠ RE-READING STORAGE ON AN ID CHANGE WOULD NOT HAVE FIXED IT EITHER. The wipe is async and races
   * this read; React runs child effects before parent ones, so the provider tends to read FIRST and
   * win the race with the previous athlete's values. The signal fires after the wipe has finished, which
   * removes the race rather than betting on it.
   *
   * The reset is deliberately to LITERAL fresh-athlete defaults rather than a re-read, for the same
   * reason: after a wipe those defaults are exactly what storage now says, and asserting them costs
   * nothing while another read reopens the ordering question.
   */
  useEffect(
    () =>
      onFirstRunReset(() => {
        setTabsStatus('pending');
        setHomeStatus('pending');
        setRun(null);
        setStepIndex(0);
        setDeferred(false);
        setRequested(false);
        setAnnounced(false); // a different account has not been told anything yet
        setSeen([]);
        setSeenLoaded(true);
        setTips(true);
        /*
         * ⚠ NULL, THEN RE-SEED — and the order matters more than it looks. Null means "unknown", which
         * every phase check treats as NO RESTRICTION, so leaving it there would hand the new athlete the
         * complete 105-step tutorial. `getWorkoutsLogged` re-seeds from the server for whoever is signed
         * in now, because `forgetWorkoutsLogged` (in the same wipe) cleared both the stored value and
         * that module's in-memory cache. For a genuinely new account that resolves to 0 — phase 1.
         */
        setWorkoutsLogged(null);
        void getWorkoutsLogged().then((n) => {
          if (n != null) setWorkoutsLogged(n);
        });
      }),
    [],
  );

  /** Record a leg's terminal decision — in memory and on the device — for every leg the run contained. */
  const recordLegs = useCallback((steps: TourStep[], outcome: 'completed' | 'skipped') => {
    for (const leg of legsIn(steps)) {
      if (leg === 'tabs') {
        setTabsStatus(outcome);
        void setTourStatus(outcome);
      } else {
        setHomeStatus(outcome);
        void setHomeTourStatus(outcome);
      }
    }
  }, []);

  /**
   * STARTING A RUN NO LONGER CONSUMES THE HONOR ANNOUNCEMENT, and the bug that forced this is worth
   * keeping written down.
   *
   * This used to mark the Initiative ceremony as announced, on the reasoning that "entering a run is the
   * moment the ceremony has served its purpose". That was TRUE while the only door into a run was the
   * ceremony's own "Keep Building". Splitting the tour into two legs moved the tabs leg to first arrival —
   * BEFORE the athlete has a program, and therefore before the honor exists — so every new athlete's tabs
   * tour silently stamped `forge_unlock_announced_v1` on the way past. They then earned Initiative and the
   * ceremony refused to fire, because `showUnlock` requires `!announced`. The honor still landed in their
   * Legacy, which is exactly how it was reported: "it's there, it just never popped up."
   *
   * The three paths that genuinely consume the ceremony — `startFromCeremony`, `viewHonor` and
   * `markAnnounced` — each record it themselves. A run started by anything else must leave it alone.
   */
  /*
   * WHERE PEOPLE STOP.
   *
   * ⚠ THE PREMISE OF THE PHASED TUTORIAL IS CURRENTLY UNMEASURED. "People skip it or get overwhelmed"
   * is a reasonable read of the shape of the thing — 105 authored steps, ~23 of them before a first
   * workout — but nothing in this app has ever recorded a skip. Without these three events the phasing
   * ships blind and we cannot tell afterwards whether it helped.
   *
   * An effect rather than a call inside `nextStep`, so it fires once per step no matter how many renders
   * the spotlight's measure-and-scroll pass causes, and so it also catches the first step of a run.
   */
  useEffect(() => {
    if (!run || run.length === 0) return;
    track('tour_step_shown', { section: 'guided', step: stepIndex, total: run.length });
  }, [run, stepIndex]);

  const beginRun = useCallback((steps: TourStep[]) => {
    if (steps.length === 0) return;
    setStepIndex(0);
    setDeferred(false);
    setRequested(false);
    setRun(steps);
  }, []);

  /**
   * Plan against the CURRENT screen. Anchors are read here rather than held in state on purpose: the
   * registry is ref-held and notifies nobody, so the only correct time to ask it is the instant a run is
   * about to start. A card that hasn't mounted yet simply isn't in this run — which is exactly right for
   * the day-to-day athlete, whose Home draws every card but Current Program. Their run reads "of 6".
   */
  const planNow = useCallback(
    (opts: { replay?: boolean; assumeFace?: TourFace } = {}) => {
      const current = opts.assumeFace ?? face;
      return planTour({
        workoutsLogged: workoutsLogged ?? undefined,
        tabsDone: tabsStatus !== 'pending',
        homeDone: homeStatus !== 'pending',
        homeHasCards: current === 'settled',
        anchors: registeredAnchors(),
        replay: opts.replay,
      });
    },
    [face, tabsStatus, homeStatus, registeredAnchors, workoutsLogged],
  );

  // Home reports its face on focus. Stable identity on purpose: it must not react to tour state, or setting
  // `deferred` in `viewHonor` would re-fire Home's focus effect and start a run before the honors hub opens.
  const requestTour = useCallback((f: TourFace) => setFace(f), []);

  // Called by Home once the athlete reaches the open forge — shows the honor ceremony (only while un-announced).
  const requestPrompt = useCallback(() => setRequested(true), []);

  const markAnnounced = useCallback(() => {
    setAnnounced(true);
    void setUnlockAnnounced();
  }, []);

  const showUnlock = tipsEnabled && requested && !ceremony && !announced && !run;

  /**
   * Arm the beat. Deliberately schedules a timer and nothing else — no state is written in this effect
   * body (the strict react-compiler rules forbid it, and it would also mean planning against a screen that
   * has only just been told to draw). The cheap leg check here avoids arming a timer that would plan an
   * empty run; the real plan happens when it fires.
   */
  useEffect(() => {
    if (!loaded || run || deferred || !tipsEnabled || face == null) return;
    if (ceremony || showUnlock) return; // never over an earned moment — it re-arms when the ceremony closes
    const owed = face === 'first-run' ? tabsStatus === 'pending' : tabsStatus === 'pending' || homeStatus === 'pending';
    if (!owed) return;
    const t = setTimeout(() => beginRun(planNow()), START_BEAT_MS);
    return () => clearTimeout(t);
  }, [loaded, run, deferred, tipsEnabled, face, ceremony, showUnlock, tabsStatus, homeStatus, beginRun, planNow]);

  /** "Keep Building" — straight into whatever the un-gated Home owes, no beat. */
  const startFromCeremony = useCallback(() => {
    setRequested(false);
    beginRun(planNow({ assumeFace: 'settled' }));
    // A plan that came back empty (tips off mid-flight, or Home not mounted) must still close the ceremony.
    setAnnounced(true);
    void setUnlockAnnounced();
  }, [beginRun, planNow]);

  /**
   * "Replay all tips" (Account Settings) — everything, again. ALL of it.
   *
   * This used to reset only the guided run's two legs, which was defensible when the seen-set held four
   * tab names and a completed tour pre-marked three of them. It is not defensible now: the seen-set governs
   * twenty-one per-surface walkthroughs across the Workouts and Legacy clusters, and leaving it untouched
   * meant a control labelled "Replay all tips" replayed eleven steps and skipped sixty-three. The label is
   * the contract.
   */
  /*
   * ⚠ "REPLAY ALL TIPS" DOES NOT TOUCH THE WORKOUT COUNTER, and that is one easily-missed line away from
   * undoing the whole phasing feature. Replaying is a request to be shown what you are OWED again; the
   * counter is what you have EARNED. Clearing it would hand a two-year athlete the beginner tutorial and
   * make them re-earn phases 2 and 3 by training ten more times. `forgetWorkoutsLogged` exists for the
   * account switch, which is a genuinely different athlete, and is deliberately not called here.
   */
  const startTour = useCallback(() => {
    setTabsStatus('pending');
    setHomeStatus('pending');
    setSeen([]);
    void setTourStatus('pending');
    void setHomeTourStatus('pending');
    void clearScreenPrompts();
    beginRun(planNow({ replay: true, assumeFace: face ?? 'settled' }));
  }, [beginRun, planNow, face]);

  /**
   * "Skip" retires only what the athlete has actually been shown.
   *
   * It used to retire every leg in the run, so skipping out of the four-tab map on step 2 also silently
   * consumed the seven-step Home walkthrough the athlete had not seen a single card of. Skip plainly means
   * the thing in front of you — a walkthrough you were never offered cannot be one you declined. Legs that
   * begin after the current step stay owed and fire at their own moment.
   *
   * The control was labelled "Skip all" until this reasoning was applied to the label as well: it retires
   * one walkthrough, so it now reads "Skip". The global silence its old name promised is Guided Tips in
   * Account Settings, which really does turn everything off.
   */
  const skipTour = useCallback(() => {
    /* ⚠ OUTSIDE THE UPDATER. `setRun`'s callback already carries one side effect (`recordLegs`), and a
       state updater must stay pure — StrictMode calls it twice, which would double every event. */
    if (run) track('tour_skipped', { section: 'guided', step: stepIndex, total: run.length });
    setRun((prev) => {
      if (prev) recordLegs(prev.slice(0, stepIndex + 1), 'skipped');
      return null;
    });
    setRequested(false);
    setStepIndex(0);
  }, [recordLegs, stepIndex, run]);

  const finishRun = useCallback(() => {
    // Both ends of the funnel, or a skip rate has no denominator.
    if (run) track('tour_completed', { section: 'guided', total: run.length });
    setRun((prev) => {
      if (prev) recordLegs(prev, 'completed');
      return null;
    });
    setStepIndex(0);
  }, [recordLegs, run]);

  const nextStep = useCallback(() => {
    const total = run?.length ?? 0;
    if (stepIndex >= total - 1) finishRun();
    else setStepIndex(stepIndex + 1);
  }, [run, stepIndex, finishRun]);

  const prevStep = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  // "View Honor" — the ceremony's secondary: go see the just-earned honor NOW and take the walkthrough
  // AFTER. Defers the tour (hides the ceremony + suppresses the per-screen tours) and sends them to their
  // honors; the tour resumes when they leave the hub. Navigation uses expo-router's imperative `router`
  // because the provider sits above the navigator.
  const viewHonor = useCallback(() => {
    setRequested(false);
    setDeferred(true);
    setAnnounced(true);
    void setUnlockAnnounced();
    router.navigate('/honors');
  }, []);

  // Resume the deferred tour — called by the Honors Hub as the athlete LEAVES it (they've viewed the honor).
  // An explicit exit event, kept off Home's focus path so navigating to the hub can't race into the tour.
  const doResume = useCallback(() => {
    if (!deferred) return;
    setDeferred(false);
    beginRun(planNow({ assumeFace: 'settled' }));
  }, [deferred, beginRun, planNow]);

  /**
   * …exposed behind a STABLE identity, because of how it is consumed: the Honors Hub calls it from an effect
   * CLEANUP keyed on this very function. A changing identity means that cleanup runs while the athlete is
   * still standing on the hub — and the tour starts underneath the screen they are reading. Nothing else
   * about this needs to be a ref; the hazard is entirely in the caller's shape, so the fix belongs here.
   */
  const resumeRef = useRef(doResume);
  useEffect(() => {
    resumeRef.current = doResume;
  }, [doResume]);
  const resumeTour = useCallback(() => resumeRef.current(), []);

  const setTipsEnabled = useCallback((on: boolean) => {
    setTips(on);
    void setGuidedTipsEnabled(on);
  }, []);

  useEffect(() => {
    let alive = true;
    void getWorkoutsLogged().then((n) => {
      if (alive && n != null) setWorkoutsLogged(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  const markSeen = useCallback((key: ScreenKey, phase: TourPhase = 1) => {
    const composite = promptKeyFor(key, phase);
    setSeen((prev) => (prev.includes(composite) ? prev : [...prev, composite]));
    void markPromptSeen(key, phase);
  }, []);

  // Memoized so an idle provider doesn't hand a fresh `[]` to every consumer on every render.
  const steps = useMemo(() => run ?? [], [run]);
  const currentStep = run ? (run[stepIndex] ?? null) : null;
  const status: UiStatus = !loaded ? 'loading' : run ? 'running' : deferred ? 'deferred' : 'idle';

  const value = useMemo<TourContextValue>(
    () => ({
      status,
      steps,
      stepIndex,
      currentStep,
      requestPrompt,
      markAnnounced,
      requestTour,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      resumeTour,
      seen,
      seenLoaded,
      markSeen,
      workoutsLogged,
      tipsEnabled,
      setTipsEnabled,
    }),
    [
      status,
      steps,
      stepIndex,
      currentStep,
      requestPrompt,
      markAnnounced,
      requestTour,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      resumeTour,
      seen,
      seenLoaded,
      markSeen,
      workoutsLogged,
      tipsEnabled,
      setTipsEnabled,
    ],
  );

  // The "first move" unlock ceremony: announced by Home once a program exists, never while a ceremony is
  // showing (don't stack over an earned moment — it re-appears after), never while a run is walking, and —
  // critically — never once the honor has been announced. An honor is celebrated exactly once; without that
  // last clause a mid-tour interruption (which intentionally leaves the leg owed) replayed the whole
  // ceremony for an honor earned days ago.
  //
  // `tipsEnabled` gates it too, so the Account Settings "Guided Tips" switch is a TRUE global off-switch:
  // off means no ceremony, no auto-tour, and (via `useScreenPrompt`) no first-visit banners — one control
  // that silences every piece of the walkthrough, which is what "off" plainly promises.
  return (
    <TourContext.Provider value={value}>
      {children}
      <HonorCeremony
        open={showUnlock}
        honorName="Initiative"
        body="You made your first move. The work has a shape now — everything after this is showing up." 
        symbol={<HonorSymbol honorName="Initiative" />}
        footer={
          <>
            <Button variant="primary" fullWidth onPress={startFromCeremony} accessibilityLabel="Keep Building — enter the forge">
              Keep Building
            </Button>
            {/* Centered tertiary — the Button `text` variant left-aligns (it's the "View all →" affordance),
                so render View Honor as its own centered pressable. */}
            <Pressable onPress={viewHonor} accessibilityRole="button" accessibilityLabel="View Honor — see it in your Legacy" style={styles.viewHonor}>
              <Text style={styles.viewHonorText}>View Honor</Text>
            </Pressable>
          </>
        }
        onRequestClose={startFromCeremony}
      />
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}

/**
 * First-visit banner controller for one screen. Visibility is derived purely from the shared seen-set —
 * shown while the screen isn't yet seen, the state has loaded, and the tour flow isn't in the way.
 * `dismiss` marks the screen seen (an event-handler write), which updates that state and hides the banner —
 * and persists it, so it never returns on relaunch. No effect, no render-phase ref: the strict hooks rules
 * forbid both, and this needs neither.
 */
export function useScreenPrompt(key: ScreenKey): {
  shouldShow: boolean;
  dismiss: () => void;
  /** How many steps of this surface are unlocked — the caller renders exactly these. */
  steps: readonly ScreenTourStep[];
} {
  const { seen, seenLoaded, markSeen, status, tipsEnabled, workoutsLogged } = useTour();
  /**
   * BLOCKING MEANS "SOMETHING IS ON SCREEN", NOT "THE TOUR IS UNFINISHED".
   *
   * The owed-but-unanswered states used to block too, and they are not transient: an athlete who never
   * reached their first move, or who stepped away to look at their honor and never came back, sits in one
   * forever. So a first-visit tip on Workouts, Legacy or Squads would never appear again for that account,
   * for the rest of its life — a brand-new athlete who ignored one prompt silently lost every tip in the app.
   *
   * Only `running` genuinely conflicts (a run is drawing over the screen), and `loading` is the honest wait
   * for storage. The rest is the athlete having said "not now" to ONE thing, which is not consent to be
   * told nothing.
   */
  const blocking = status === 'loading' || status === 'running';

  /*
   * WHICH PHASE THIS ATHLETE IS OWED, and the steps that come with it.
   *
   * ⚠ A SURFACE IS OWED AGAIN WHEN A NEW PHASE OPENS, which is the whole feature: the seen-set is keyed
   * by (surface, phase), so "Workouts" seen at phase 1 does not cover the phase-2 steps that unlock at
   * three workouts. It also means an athlete never re-reads a step they have already been shown — the
   * earlier phases stay marked.
   */
  const phase = phaseFor(workoutsLogged ?? Number.MAX_SAFE_INTEGER);
  const steps = useMemo(() => stepsFor(key, workoutsLogged ?? Number.MAX_SAFE_INTEGER), [key, workoutsLogged]);

  const shouldShow = tipsEnabled && seenLoaded && !blocking && steps.length > 0 && !seen.includes(promptKeyFor(key, phase));
  const dismiss = useCallback(() => markSeen(key, phase), [markSeen, key, phase]);
  return { shouldShow, dismiss, steps };
}

const styles = StyleSheet.create({
  viewHonor: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  viewHonorText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze400 },
});

export type { TourLeg };
