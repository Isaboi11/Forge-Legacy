/**
 * TourProvider — the first-time guidance host (Onboarding-Amendment-003). It owns three device-local
 * decisions and renders the app-level "first move" unlock ceremony above every route:
 *
 *   1. The GUIDED TOUR, which is TWO LEGS fired at TWO MOMENTS (`domain/onboarding/tour-plan.ts`):
 *      the TABS leg — four cards, one per pillar — on first arrival, and the HOME leg — seven spotlit
 *      steps over the real cards — once a program exists to fill them. Each leg persists its own
 *      terminal decision (`tour.ts`); the run itself (`run`/`stepIndex`) is transient in-memory, so
 *      quitting mid-tour leaves that leg owed and it comes back.
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
import { HonorCeremony } from '@/components/ceremony/HonorCeremony';
import { HonorSymbol } from '@/components/ceremony/HonorSymbol';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import { legsIn, planTour, type TourLeg, type TourStep } from '@/domain/onboarding/tour-plan';
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
  type ScreenKey,
} from '@/lib/screen-prompts';

export type { TourStep } from '@/domain/onboarding/tour-plan';

/**
 * What Home currently holds. Home reports it; the provider decides which leg that state is owed.
 *
 * These were `gated` / `unlocked` while Home was a funnel that withheld itself until the athlete chose a
 * starting point. Home is now full from the first launch (Onboarding-Amendment-002), so there is no gate to
 * name — and the Home leg never actually depended on one. It depends on whether the cards it rings exist,
 * and three of its seven (Today's Workout, Current Program, Mission) appear only once there is a program.
 */
export type TourFace = 'no-program' | 'has-program';

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
  seen: ScreenKey[];
  seenLoaded: boolean;
  markSeen: (key: ScreenKey) => void;
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
  const [seen, setSeen] = useState<ScreenKey[]>([]);
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [tipsEnabled, setTips] = useState(true); // absent preference = on, the first-run default

  // Baseline the tour state ONCE the session read has resolved, so we read the restored account directly and
  // never mistake boot's null→id settle for an account switch. That false "switch" was wiping the seen-set on
  // every relaunch (and re-firing the honor ceremony). After the baseline, only a genuinely DIFFERENT account
  // signing in on this device resets to fresh-athlete defaults; a plain relaunch — or re-logging into the same
  // account — keeps the persisted "already seen" state. `resetFirstRunFlags` (AuthProvider) is gated the same way.
  const didInit = useRef(false);
  const lastRealId = useRef<string | null>(null);
  useEffect(() => {
    if (authLoading) return; // hold until getSession() resolves — userId is final from here on
    if (!didInit.current) {
      didInit.current = true;
      lastRealId.current = userId;
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
    }
    if (userId && lastRealId.current && lastRealId.current !== userId) {
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
    }
    if (userId) lastRealId.current = userId;
  }, [authLoading, userId]);

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
   * the freestyle athlete whose Home draws no Program | Mission grid at all.
   */
  const planNow = useCallback(
    (opts: { replay?: boolean; assumeFace?: TourFace } = {}) => {
      const current = opts.assumeFace ?? face;
      return planTour({
        tabsDone: tabsStatus !== 'pending',
        homeDone: homeStatus !== 'pending',
        homeHasProgram: current === 'has-program',
        anchors: registeredAnchors(),
        replay: opts.replay,
      });
    },
    [face, tabsStatus, homeStatus, registeredAnchors],
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
    const owed = face === 'no-program' ? tabsStatus === 'pending' : tabsStatus === 'pending' || homeStatus === 'pending';
    if (!owed) return;
    const t = setTimeout(() => beginRun(planNow()), START_BEAT_MS);
    return () => clearTimeout(t);
  }, [loaded, run, deferred, tipsEnabled, face, ceremony, showUnlock, tabsStatus, homeStatus, beginRun, planNow]);

  /** "Keep Building" — straight into whatever the un-gated Home owes, no beat. */
  const startFromCeremony = useCallback(() => {
    setRequested(false);
    beginRun(planNow({ assumeFace: 'has-program' }));
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
  const startTour = useCallback(() => {
    setTabsStatus('pending');
    setHomeStatus('pending');
    setSeen([]);
    void setTourStatus('pending');
    void setHomeTourStatus('pending');
    void clearScreenPrompts();
    beginRun(planNow({ replay: true, assumeFace: face ?? 'has-program' }));
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
    setRun((prev) => {
      if (prev) recordLegs(prev.slice(0, stepIndex + 1), 'skipped');
      return null;
    });
    setRequested(false);
    setStepIndex(0);
  }, [recordLegs, stepIndex]);

  const finishRun = useCallback(() => {
    setRun((prev) => {
      if (prev) recordLegs(prev, 'completed');
      return null;
    });
    setStepIndex(0);
  }, [recordLegs]);

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
    beginRun(planNow({ assumeFace: 'has-program' }));
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

  const markSeen = useCallback((key: ScreenKey) => {
    setSeen((prev) => (prev.includes(key) ? prev : [...prev, key]));
    void markPromptSeen(key);
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
export function useScreenPrompt(key: ScreenKey): { shouldShow: boolean; dismiss: () => void } {
  const { seen, seenLoaded, markSeen, status, tipsEnabled } = useTour();
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
  const shouldShow = tipsEnabled && seenLoaded && !blocking && !seen.includes(key);
  const dismiss = useCallback(() => markSeen(key), [markSeen, key]);
  return { shouldShow, dismiss };
}

const styles = StyleSheet.create({
  viewHonor: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  viewHonorText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze400 },
});

export type { TourLeg };
