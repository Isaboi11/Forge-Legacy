import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
/*
 * ⚠ NOT `useAnimatedValue` — IT DOES NOT EXIST ON WEB, AND IT TAKES THE WHOLE PAGE DOWN.
 *
 * React Native ships `useAnimatedValue`; **react-native-web does not implement it at all**. On web the
 * import is `undefined`, calling it throws `(0, b.useAnimatedValue) is not a function` during render, and
 * an uncaught throw in render is a WHITE SCREEN, not a broken component. Reported from the web preview
 * 2026-08-14. This file and `HoltMark.tsx` were the only two using it; the other ~30 animated values in
 * this codebase already use the `useState` lazy-initialiser form below, which is stable across renders
 * and does not trip the react-compiler rule against reading `ref.current` during render.
 *
 * ⚠ IT IS ALSO A REMINDER THAT `tsc` CANNOT SEE THIS CLASS OF BUG. The export exists in
 * `@types/react-native`, so the types are correct and the runtime is not — the same shape as the
 * `useSafeAreaInsets` crash that shipped with every gate green.
 */
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { bronzeWash, wash } from '@/constants/washes';
import { themeScrim } from '@/constants/theme-scrim';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { HoltMark } from '@/components/forge/HoltMark';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { launchRowsFor, templateRowsFor } from '@/domain/coach/save-shapes';
import { saveTemplate } from '@/data/templates-live';
import { saveWeekTemplate, startWeekTemplate } from '@/data/week-templates-live';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { assemble } from '@/domain/coach/assemble';
import { recommendFromShelf, SHELF_CANNOT_ADAPT, type ShelfProgram } from '@/domain/coach/recommend';
import { getProgramDefinitions } from '@/domain/training/programs';
import {
  dayPreamble,
  INTRO,
  MEDICAL_STOP,
  NOT_UNDERSTOOD,
  OPENERS,
  STOP_KICKER,
  WALL,
  dayCardFor,
  completeFor,
  fromOpener,
  HELP_TOPICS,
  HOME_CARDS,
  HOME_ROWS,
  isHomeTurn,
  TYPING_ENABLED,
  interpret,
  isMedical,
  LEVEL_CHIPS,
  nextQuestion,
  preamble,
  pickCardFor,
  programCardFor,
  readyToBuild,
  startingLoadLine,
  thinDayFor,
  toggleFocus,
  hasFocus,
  mergeFocus,
  greetReturning,
  refusalCardFor,
  volumeFor,
  weeksBetween,
  type ChatState,
  type Chip,
  type FocusPick,
  type DayCard,
  type PickCard,
  type ProgramCard,
  type ChatMode,
  type QuestionControl,
  type RefusalCard,
  type Turn,
} from '@/domain/coach/chat-core';
import { pick } from '@/domain/coach/rulebook/voice';
import { setStartChoice } from '@/lib/program-intent';
import type { CoachIntent } from '@/hooks/useCoachDoor';
import { useProfile } from '@/lib/profile';
import { rationaleFor } from '@/domain/coach/rulebook/rationale';
import { buildDayWorkout, whyThin } from '@/domain/coach/day';
import { itemByKey, PICKER_DB } from '@/domain/exercise-picker/data';
import { fetchLearnedPreferences } from '@/data/learned-preference-live';
import { appliedSentence } from '@/domain/coach/learned-preference';
import { canDoExercise } from '@/domain/home-gym/equipment';
import { fetchActiveProgram } from '@/data/programs-live';
import { fetchHomeGym } from '@/data/home-gym-live';
import { clearThread, hasMetHolt, loadThread, rememberMetHolt, saveThread } from '@/lib/coach-thread';
import { clearsOnUnmount, type Exit } from '@/domain/coach/thread-lifecycle';
import { forgetExperience, loadExperience, rememberExperience } from '@/lib/coach-memory';
import {
  createProgram,
  fetchProgramSessions,
  startProgram,
  updateProgram,
  type ProgramDay,
  type ProgramStructure,
  type SavedProgram,
} from '@/data/programs-live';
import type { SessionMark } from '@/domain/program/progress-core';
import { contextFrom } from '@/domain/coach/candidates';
import { setCardioTarget, setPrescription, swapExercise, type EditScope } from '@/domain/coach/edit-ops';
import { limitationPatterns } from '@/domain/coach/rulebook/limitations';
import type { Limitation } from '@/domain/coach/constraints';
import {
  changesFor,
  editableSessions,
  replacementsFor,
  rowsFor,
  valuesFor,
  SCOPE_CHOICES,
  type EditChangeId,
} from '@/domain/coach/edit-chat';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { draftFromStructure, saveProgramDraft } from '@/lib/program-draft';
import { saveWorkoutDraft } from '@/lib/workout-builder-draft';

/**
 * Coach Holt, as a conversation — `Coach Holt Chat.dc.html`.
 *
 * ══ A SHEET, NOT A SCREEN, AND THAT WAS THE DESIGN'S CALL ══
 *
 * The brief specified a full-screen modal. The design pushed back and it is right: the bubble **grows**
 * into this rather than pushing a route, so the screen you were already on stays behind it. The coach
 * answers a question that arrives while you are doing something else, and taking the something-else away
 * to answer it is the wrong shape.
 *
 * ══ THE FIVE RULES THE SURFACE KEEPS ══
 *
 * 1. One question at a time, typed out. Chips carry the closed answers; typing always works.
 * 2. Text is conversation, cards are objects. A turn is text then card, never card then text.
 * 3. Every draft carries NOT SAVED YET. Only the Program Builder saves.
 * 4. A refusal is bronze and carries the alternative. A failure is red and says it was the app.
 * 5. The mark is the only bronze that moves — it warms while thinking, sweeps while building.
 *
 * ⚠ NO MODEL IS INVOLVED. Every question comes from `chat-core`, which is the shipped wizard's own
 * question set; every program comes from `assemble()`. The paid tier replaces exactly one function
 * (`interpret`) and nothing on this screen changes.
 */
/** PROMPT §2.4 — the sheet's top inset. The thread's bottom reserve is a share of `window - SHEET_TOP`. */
const SHEET_TOP = 64;

/**
 * What Holt just built — the object, not a label for it.
 *
 * A week and a block come out of `assemble()` as the same shape and are two different things to save,
 * so the distinction is made once, where the engine's own `structure.weeks` can be read, rather than
 * re-derived at each button.
 */
type Built =
  | { kind: 'program'; structure: ProgramStructure }
  | { kind: 'week'; structure: ProgramStructure }
  | { kind: 'day'; day: ProgramDay };

/**
 * The label on the chip that declines the import, used by the offer and by the handler that answers it.
 * A literal in two places is how one of them gets reworded and the other silently stops matching.
 */
const DECLINE_IMPORT = "I'll log as I go";
/**
 * ⚠ "I'VE GOT A PROGRAM" IS NOT "I'VE GOT A SPREADSHEET".
 *
 * The import offer used to assume the two were the same thing, so an athlete whose program lives on a
 * whiteboard, in a coach's message, or in their own head had one door and it was the wrong one. Pasting
 * is only the fastest route when the thing is already in rows.
 */
const BUILD_IT_OUT = 'Build it out';

export function CoachChatSheet({ onClose, intent }: { onClose: () => void; intent?: CoachIntent | null }) {
  const router = useRouter();
  /*
   * ⚠ **THIS SHEET HAD NO GATE AT ALL**, while the dead wizard at `/coach` had two. Free athletes could
   * walk the whole conversation and every one of Holt's ceilings was open.
   *
   * The doors are gated, not the buttons: M-7 §2 is explicit that the check is PRE-ACTION, and being
   * asked six questions about your goal and your equipment and only then being refused is the worst
   * possible order to do it in.
   */
  const guard = usePremiumGate();

  /*
   * §2.9 — the sheet RISES: translateY 100% → 0 over 250ms with the system's ease-out, and reverses in
   * 200ms on the way out. §2.8 — dragging the handle down past ~120px collapses it back to the bubble.
   *
   * The close path always goes through `collapse()` so the sheet is never yanked off screen: the scrim
   * tap, the header's X and the drag all play the same 200ms exit before `onClose` unmounts it.
   */
  const [rise] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 250,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  /**
   * The conversation is over, and how it ended — read by the save effect and the unmount cleanup, both
   * far below. A ref rather than state because it must take effect on the SAME tick as the close: a
   * `setState` would not be visible to a `say()` that resolves two ticks later, which is exactly the
   * write this exists to stop.
   *
   * ⚠ DECLARED ABOVE ITS READERS, for the reason already written against `busy` further down — a hook
   * cannot close over a `const` declared below it, and this project's react-compiler lint rejects the
   * attempt outright rather than letting it become a stale closure. It was declared with the other state
   * first and `collapse` and `handOff`, both of which sit up here, errored on it.
   */
  const ending = useRef<Exit | null>(null);

  /**
   * Closing him ends the conversation. Opening him again starts a new one.
   *
   * §15.2's rolling thread meant every visit resumed mid-sentence — days later, still holding a question
   * about a session already trained. A coach you walked away from should not pick up where you left off
   * as though you never left; the athlete's own framing was that closing it should restart it.
   *
   * ⚠ THE DEFAULT IS NOW "CLEARS", AND THE HAND-OFF IS THE EXCEPTION — it used to be the other way round
   * and that is what left the report open. This covers the three deliberate closes (the X, the scrim and
   * the drag); every OTHER way the sheet can vanish — a session, a ceremony, the tour, or the route
   * leaving the four home surfaces — is caught by the unmount cleanup further down. Only `handOff`
   * survives, which is §15.3: leaving FOR the builder is one errand inside a single conversation.
   *
   * Clears the conversation, not the athlete: `clearThread` drops only the thread's own key, so the
   * remembered skill level and having met him both survive. He greets you next time; he does not
   * re-introduce himself, and he does not ask how long you have been training all over again.
   */
  const collapse = useCallback(() => {
    /* ⚠ `clearThread` DOES BOTH HALVES. It deletes the thread AND closes the write gate in
       `thread-lifecycle`, so a `say()` still in flight cannot put the conversation back. The gate lives
       there rather than in a ref here because `collapse` is handed to `PanResponder.create`, which runs
       during render, and react-compiler rejects a ref reaching render at all. */
    void clearThread();
    Animated.timing(rise, {
      toValue: 0,
      duration: 200,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
      useNativeDriver: true,
    }).start(() => onClose());
  }, [rise, onClose]);

  /**
   * Leave for another screen WITHOUT ending the conversation — §15.3.
   *
   * ⚠ THIS IS THE ONLY EXIT THAT KEEPS THE THREAD, and it has to be explicit now that the unmount
   * cleanup clears by default. Every one of these is a hand-off: the Program Builder, a chip's `goTo`,
   * "Change the one I have". Holt writes the outcome back into the conversation that produced it when
   * the athlete comes back, which is the entire reason the thread survives leaving the app at all.
   */
  const handOff = useCallback(() => {
    ending.current = 'hand-off';
    onClose();
  }, [onClose]);

  /* `useState(() => ...)` not `useRef(...).current` — the panHandlers are read during render, and
     react-compiler rejects reading a ref there. Created once either way. */
  const handleResponder = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        // Past ~120px, or thrown downward — either reads as "put it away".
        if (g.dy > 120 || g.vy > 0.8) {
          drag.setValue(0);
          collapse();
          return;
        }
        Animated.timing(drag, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      },
    }),
  )[0];
  const keyboardInset = useKeyboardInset();
  const scroller = useRef<ScrollView | null>(null);

  /**
   * ══ ROOM UNDER THE OPTIONS ══
   *
   * Two problems wearing one symptom. The PO's report was that a turn's choices sit at the very bottom
   * edge and cannot be read in full.
   *
   * 1. NO SAFE-AREA INSET, ANYWHERE ON THIS SCREEN. The last chip row rendered 8px from the PHYSICAL
   *    bottom, so on any phone with a home indicator it sat underneath it. That is the defect.
   * 2. NO READING ROOM. Even inset-correct, a control flush to the bottom of a sheet reads as the end
   *    of the screen rather than as something you scroll past — so a long turn looked truncated.
   *
   * A QUARTER OF THE SHEET, COMPUTED, NOT A CONSTANT. The sheet starts at `top: 64`, so its height is
   * the window minus that. 200px is a quarter of one phone and a third of another, and the whole point
   * is that the proportion holds.
   *
   * It is CONTENT PADDING rather than a spacer view, so a short conversation that does not fill the
   * thread costs nothing — there is no invisible block pushing a two-line greeting up the screen.
   */
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /*
   * ⚠ THE INSET IS BACK, because the pinned row beneath the thread is gone (PO, 2026-08-14) and the
   * scroll reaches the physical bottom of the phone again. It has to clear the home indicator itself,
   * and the quarter sits on top of that as reading room.
   */
  const threadPad = insets.bottom + Math.round((winH - SHEET_TOP) * 0.25);

  /* §6.5 — the introduction is three paragraphs and lands as three beats. Dropping all three at once is
     a wall of text pretending to be a greeting. */
  const [thread, setThread] = useState<Turn[]>(() => stamped([{ kind: 'holt', text: INTRO[0] }]));
  const [introStep, setIntroStep] = useState(1);
  const [draft, setDraft] = useState('');
  /* Declared ABOVE the intro effect, which sets it: a hook cannot close over a const declared below it,
     and react-compiler catches the attempt rather than letting it become a stale closure. */
  /* ⚠ `reading` IS NOT A SYNONYM FOR `building`. He is not building anything when he reads the shelf —
     saying BUILDING over a catalogue lookup would be the status strip claiming authorship of somebody
     else's program, which is the same lie the card's kicker exists to prevent. */
  const [busy, setBusy] = useState<'thinking' | 'building' | 'reading' | null>(null);
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [constraints, setConstraints] = useState<ChatState>({});
  /**
   * What Holt just built, and enough of it to act on.
   *
   * ⚠ IT USED TO BE `{ kind }` ALONE, which was enough to pick a builder route and nothing else. The
   * artifact's buttons need the OBJECT: a week has to be written to `week_templates`, a day to
   * `workout_templates`, and neither can be reconstructed from a card that only carries strings.
   */
  const [built, setBuilt] = useState<Built | null>(null);
  /** Naming what a Start is about to end (W-29). Null until there is genuinely something to lose. */
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const [handing, setHanding] = useState(false);
  /** The whole plan, read-only, before the Builder. Holds the last card so it can be redrawn in full. */
  const [preview, setPreview] = useState(false);
  /** §2's NEW CHAT popover. Open is a look, not an action — nothing happens until a row is tapped. */
  const [menu, setMenu] = useState(false);

  /**
   * Where we are in changing a live program.
   *
   * ⚠ HELD IN THE SHEET, NOT THE THREAD. The thread is persisted and a program can change underneath a
   * stored conversation — a session trained on another device, the block ended. Resuming a half-finished
   * edit against a stale structure is how you edit the wrong day, so the flow starts again on each visit
   * and the chips from last time simply do nothing.
   */
  const [edit, setEdit] = useState<{
    program: SavedProgram;
    marks: SessionMark[];
    at?: { weekIndex: number; dayIndex: number };
    day?: ProgramDay;
    change?: EditChangeId;
    rowIndex?: number;
    value?: { sets?: number; targetMi?: number; targetSec?: number; replacementKey?: string; replacementName?: string };
  } | null>(null);
  const [lastCard, setLastCard] = useState<{ program?: ProgramCard; day?: DayCard } | null>(null);

  useEffect(() => {
    if (introStep >= INTRO.length + 1) return undefined;
    const beat = INTRO[introStep];

    /* Each beat is a typing bubble, then the line lands whole. The pause used to be the paragraph's
       TYPING time plus 450ms, which was right when the words appeared one at a time and is far too long
       now — a long paragraph would have left him silently "typing" for four seconds. It is a flat beat
       scaled gently by length, so a short line does not sit as long as a long one. */
    const gap = beat ? Math.min(1400, 500 + beat.length * 4) : 500;

    const id = setTimeout(() => {
      setThread((t) => [
        ...t,
        ...stamped([
          beat != null
            ? { kind: 'holt' as const, text: beat }
            /* ⚠ NO OPENER LIST WHEN THEY ARRIVED THROUGH A DOOR THAT ALREADY ANSWERED IT. Offering five
               choices to somebody who has just tapped "Build it with me" is the app asking a question it
               was already given the answer to. The build fires straight after the introduction instead —
               see the effect below. */
            : intent
              ? { kind: 'chips' as const, chips: [] }
              : { kind: 'chips' as const, chips: OPENERS.map((label) => ({ label, patch: {} })) },
        ]),
      ]);
      setIntroStep((n) => n + 1);
    }, gap);

    return () => clearTimeout(id);
  }, [introStep, intent]);

  /* DERIVED, not a second piece of state. A beat is pending for exactly as long as the intro effect is
     mid-flight, and that is already what `introStep` says — setting a `busy` flag from the effect body
     would be a synchronous setState in an effect AND a duplicate of a fact we already hold. */
  const introTyping = INTRO[introStep] != null;
  /*
   * ⚠ `reading` COLLAPSES TO `thinking` HERE, AND ONLY THE WORD IN THE HEADER KEEPS THE DISTINCTION.
   *
   * The medallion and the typing indicator answer one question — is he working — and they have exactly
   * two animations for it. Inventing a third state for both would be new artwork in service of a
   * distinction nobody can see at 52pt. What the athlete CAN read is the status word, and that is where
   * "READING" earns its keep: it is the difference between Holt writing them a block and Holt looking
   * something up, which is the one claim this whole flow is careful about.
   */
  const working = busy === 'reading' ? ('thinking' as const) : busy;
  const waiting = working ?? (introTyping ? ('thinking' as const) : null);

  /* Guards the greeting against running twice. Read and written INSIDE the effect only — react-compiler
     errors on `ref.current` touched during render, and it is right to: that is a render whose output
     depends on something React cannot see. */
  const greeted = useRef(false);

  const say = useCallback((...turns: Turn[]) => setThread((t) => [...t, ...stamped(turns)]), []);

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [thread, busy]);

  /* §15.2/15.3 — one rolling thread that survives leaving the app, and leaving for the Builder. Loaded
     once; if there is anything stored, it replaces the introduction and the intro beats stop. */
  const { profile, loading: profileLoading } = useProfile();
  const firstName = profile?.firstName ?? null;

  /*
   * ⚠ **THE INTRODUCTION RUNS ONCE, EVER.** Replaying "I'm Holt. I don't pick a program off a shelf…" at
   * somebody who has already heard it is the clearest possible signal that nobody is home. From the
   * second visit he opens like a person: your name, then the actual question.
   *
   * `hasMetHolt` is a separate flag rather than "is a thread stored", because those are different facts —
   * you can read the introduction, close the sheet and never say a word, and you have still met him.
   */
  useEffect(() => {
    let alive = true;
    /* ⚠ WAITS FOR THE PROFILE. Greeting before it resolves would say "Hey." to somebody who has a name,
       once, unrepeatably — the one impression that is supposed to prove he knows who you are. */
    if (profileLoading || greeted.current) return undefined;
    greeted.current = true;
    void (async () => {
      const [met, stored, remembered, gym] = await Promise.all([
        hasMetHolt(),
        loadThread(),
        loadExperience(),
        /*
         * ⚠ **THE CHAT NEVER READ THE ATHLETE'S HOME GYM, AND THAT IS WHY "MY HOME GYM" BUILT
         * BODYWEIGHT.** `equipmentForEnvironment('home', owned)` returns `owned` verbatim, and the sheet
         * never set it — so choosing *My home gym* resolved to an empty list, byte-identical to
         * *Bodyweight only*. An athlete with a rack in their garage was handed push-ups. The dead wizard
         * at `/coach` has read this since it was written (`fetchHomeGym`, line 153); the chat simply
         * never did.
         *
         * ⚠ `null` ≠ `[]` (Home Gym profile rule). `null` means never set up and must NOT become "I own
         * nothing" — that is a claim the athlete has not made, and it is the difference between Holt
         * asking what they've got and Holt assuming the worst.
         */
        fetchHomeGym().catch(() => null),
      ]);
      if (!alive) return;
      if (gym) setConstraints((c) => ({ ownedEquipment: gym, ...c }));
      /* ⚠ ASKED ONCE, EVER. How long somebody has been training does not change between Tuesday and
         Thursday, and asking again every session is the app visibly not remembering a conversation it
         just had. Everything else — the time they have, the room they are in, what hurts — genuinely
         varies week to week and is still asked. */
      if (remembered) setConstraints((c) => ({ experience: remembered, ...c }));
      if (!met) {
        void rememberMetHolt();
        return; // the intro effect is already running; leave it alone
      }
      setIntroStep(INTRO.length + 1);
      /* He greets you on arrival — unless he is already stood at the door with the openers up, which is
         what a stored thread ending in chips means. Otherwise every glance would stack another hello. */
      const endsWaiting = stored != null && stored[stored.length - 1]?.kind === 'chips';
      setThread([...(stored ?? []), ...stamped(endsWaiting ? [] : greetReturning(firstName))]);
    })();
    return () => {
      alive = false;
    };
  }, [profileLoading, firstName]);

  /**
   * ⚠ **NOTHING WRITES AFTER THE CONVERSATION HAS BEEN ENDED.**
   *
   * PO, 2026-08-26: *"with coach holt if I close him then the conversation should delete and restart."*
   * `collapse` had cleared the thread since 2026-08-11 and it still came back, because clearing storage
   * does not stop this effect. Half a dozen paths `say()` AFTER an `await pause(…)` — `advance`, the
   * opener chips, the guard — and the intro beats land on a `setTimeout` of up to 1400 ms. The exit
   * animation is 200 ms. Close him while any of those is in flight and the turn lands on a sheet that is
   * still mounted, `thread` changes, and this effect writes the conversation straight back over the
   * `removeItem` that just deleted it.
   *
   * ⚠ THE GUARD IS INSIDE `saveThread`, NOT HERE. It has to hold for every writer, and putting it in the
   * effect would leave it true only for the one that happens to be looking. `clearThread` closes the
   * gate as it deletes, so the two can never drift apart. See `domain/coach/thread-lifecycle.ts`.
   */
  useEffect(() => {
    void saveThread(thread);
  }, [thread]);

  /**
   * ⚠ **AND CLOSING IS NOT ONLY THE X.** `collapse` covers the three deliberate closes — the X, the
   * scrim and the drag — but the sheet is rendered by `CoachBubble`, which returns `null` the moment a
   * session, a ceremony or the tour starts, or the route leaves the four home surfaces. Every one of
   * those unmounts the conversation without going anywhere near `collapse`, and `open` stays true in the
   * door, so the next time the bubble is allowed to render he reopens holding a conversation the athlete
   * had walked away from. That is the same "picked up mid-sentence" complaint the 2026-08-11 fix was for.
   *
   * ⚠ EXCEPT A HAND-OFF, which is §15.3 and the whole reason the thread persists at all: leaving FOR the
   * Program Builder is one errand inside a single conversation, not the end of it. Those paths go through
   * `handOff` and are the only ones that survive.
   */
  useEffect(
    () => () => {
      if (clearsOnUnmount(ending.current)) void clearThread();
    },
    [],
  );

  /* ── the turn cycle ────────────────────────────────────────────────────────────────────────────── */

  const advance = useCallback(
    async (next: ChatState, mode_: ChatMode) => {
      const merged = { ...next };
      setConstraints(merged);
      if (merged.experience) void rememberExperience(merged.experience);

      try {
        if (!readyToBuild(merged, mode_)) {
          // Thinking is a real state and short. It exists so the next question does not appear the instant
          // you tap — a coach who answers before you have finished is not listening, he is waiting.
          setBusy('thinking');
          await pause(420);
          setBusy(null);
          const q = nextQuestion(merged, mode_);
          /* The short beat before the question — "Good." / "Right." / "Noted." It is what the original
           hardcoded line did ("Good. What are you training for?"), now varied so it does not become the
             tic that makes him sound like a script. */
          if (q) say({ kind: 'holt', text: `${pick('ack')} ${q.ask}` }, { kind: 'chips', chips: q.chips, ctl: q.ctl });
          return;
        }

        /*
         * ⚠ **THE SHELF BRANCH RETURNS BEFORE `completeFor`, AND THAT IS LOAD-BEARING.**
         *
         * `completeFor` fills a `CoachConstraints` — session length, limitations, equipment — with
         * defaults for anything the questionnaire did not ask. That is exactly right for a build and
         * exactly wrong here: this flow deliberately never asks about session length or a bad shoulder
         * (see `askShelf`), so running it would manufacture answers the athlete never gave and then
         * match a program against them. Nothing downstream would notice, and the card would quietly be
         * claiming a fit computed from invented input.
         */
        if (mode_ === 'pick') {
          setBusy('reading');
          await pause(650);
          /*
           * ⚠ **THE PROGRAM THEY ARE ALREADY ON COMES OFF THE SHELF FIRST.**
           *
           * Nothing in `recommend.ts` knows what the athlete owns — it is pure, and it ranks a list it is
           * handed. So without this it will happily answer "which of these should I take" with the block
           * they are four weeks into, because that block genuinely is the best match for their goal,
           * their level and their week. Correct by the numbers and useless as an answer.
           *
           * Swallowed to null rather than surfaced: failing to read the active program is a reason to
           * recommend from the whole shelf, never a reason to refuse to recommend at all.
           */
          const active = await fetchActiveProgram().catch(() => null);
          const running = active?.sourceDefinitionId ?? null;

          /* Projected here, at the boundary, exactly like `learned` — `domain/coach/**` reads no data of
             its own, so the shelf is handed in rather than imported by the recommender. */
          const shelf: ShelfProgram[] = getProgramDefinitions()
            .filter((d) => d.id !== running)
            .map((d) => ({
              id: d.id,
              name: d.name,
              family: d.family,
              difficulty: d.difficulty ?? null,
              durationWeeks: d.durationWeeks,
              frequencyPerWeek: d.frequencyPerWeek,
              environment: d.environment ?? null,
              description: d.description ?? null,
              theme: d.theme ?? null,
              goals: d.goals ?? [],
            }));
          const answer = recommendFromShelf(
            {
              /* Always answered. `askShelf` asks the goal first and cannot report ready without it. */
              goal: merged.goal!,
              /*
               * ⚠ **THESE THREE ARE DEFAULTED, AND THE DEFAULTS ARE PROVABLY NEVER READ.**
               *
               * `askShelf` reports ready in exactly two situations: every question answered, or an
               * ENDURANCE goal — which it short-circuits on the goal alone, because no amount of asking
               * about a room changes the fact that the shelf has no running programs. On that second
               * path none of these three has been asked, and `recommendFromShelf` refuses on
               * `isEnduranceGoal` before reading a single other field.
               *
               * ⚠ Written as defaults rather than a `!` because `experience!.lifting` is a CRASH, not a
               * lint complaint: a brand-new athlete whose very first tap is "Run a race" has no
               * remembered level, and the non-null assertion would have thrown a TypeError on a coach
               * about to say something perfectly sensible. And a default is only safe here because the
               * refusal makes it unreachable — this is the project's own standing lesson about a value
               * that is only ever its default, which is worse than an absent one precisely because it
               * renders a confident, specific, false claim. It renders nothing.
               */
              experience: merged.experience?.lifting ?? 'beginner',
              daysPerWeek: merged.daysPerWeek ?? 3,
              environment: merged.environment ?? 'full_gym',
            },
            shelf,
          );
          setBusy(null);

          if (!answer.ok) {
            /* ⚠ A REFUSAL IS NOT AN ERROR — the same rule the endurance path already keeps. He says the
               no in his own voice and then offers the door that CAN help, because a recommendation flow
               that dead-ends is the defect the Discover link was added to fix. */
            say(
              { kind: 'holt', text: answer.reason },
              { kind: 'chips', chips: [{ label: 'Write me one instead', patch: {}, startsBuild: true }, { label: "I'll look myself", patch: {}, goTo: '/workouts' }] },
            );
            return;
          }

          setBuilt(null);
          say(
            { kind: 'holt', text: pick('ack') + " Here's the one I'd put you on." },
            { kind: 'pick', card: pickCardFor(answer.best, answer.runnerUp) },
            /* ⚠ SAID EVERY TIME, NOT ONLY WHEN SOMETHING LOOKS WRONG. It is the standing limit of this
               whole flow — he did not write these and cannot bend one around anybody — and it doubles as
               the honest reason to have him write one. See `SHELF_CANNOT_ADAPT`. */
            { kind: 'holt', text: SHELF_CANNOT_ADAPT },
          );
          return;
        }

        setBusy('building');
        await pause(650);
        const c = completeFor(merged, mode_);
        /* Resolved at the boundary and handed down — see the note on the same call in `coach.tsx`. The
           chat and the wizard must build the same program from the same answers, so both paths get it. */
        const learned = await fetchLearnedPreferences();

        if (mode_ === 'day') {
          const dayReq = {
            /* ⚠ WAS HARDCODED `full_body`, WHICH IS WHY A BACK-AND-BICEPS ASK CAME BACK AS A FULL BODY
               SESSION. The day builder has supported muscle groups since it was written; the chat was
               handing it the same focus every time and never asking. */
            focus: merged.dayFocus ?? ({ kind: 'split', split: 'full_body' } as const),
            /* The goal decides the prescription AND the cue — 5 × 5 heavy or 3 × 12, and what he says about it. */
            goal: c.goal,
            sessionMinutes: c.sessionMinutes,
            experience: c.experience.lifting,
            environment: c.environment,
            ownedEquipment: c.ownedEquipment,
            limitations: c.limitations,
            learned,
          };
          const r = buildDayWorkout(dayReq, PICKER_DB, canDoExercise);
          setBusy(null);
          /*
           * ⚠ **TWO MOVEMENTS IS NOT A SESSION, AND THIS USED TO SHIP THEM.** The old guard was
           * `length === 0`, so a bodyweight pull day came back as a single Plank and a beginner with a
           * bad back got "Walking Lunge, Dead Bug" — reported by the PO as *"it came up with one thing"*.
           *
           * `whyThin` re-runs the builder to find out WHICH lever would have fixed it rather than
           * inferring it from the request, because Holt is about to name a cause and offer a fix, and
           * being confidently wrong about which one is worse than saying nothing.
           */
          const thin = whyThin(dayReq, r.day.main.length, PICKER_DB, canDoExercise);
          if (thin) {
            const out = thinDayFor(thin);
            say({ kind: 'holt', text: out.text }, { kind: 'chips', chips: out.chips });
            return;
          }
          /* The wizard's own handoff, not a second one. A single day goes to the WORKOUT builder and a
             block goes to the PROGRAM builder — two different review screens, and the chat has no business
             inventing a third route to either. */
          await saveWorkoutDraft({ name: r.day.name, warmup: r.day.warmup, main: r.day.main, cooldown: r.day.cooldown, editId: null });
          setBuilt({ kind: 'day', day: r.day });
          const dayCard = dayCardFor(merged, r.day);
          setLastCard({ day: dayCard });
          /* CL-D2 — if a learned preference actually landed in this session, he says so in his own
             turn rather than burying it in the card. `appliedSentence` reads the keys the assembler
             CHOSE, so he can never claim a movement the day does not contain. */
          const learnedSaid = appliedSentence(
            learned,
            r.day.main.map((e) => e.catalogKey ?? ''),
            (k) => itemByKey(k)?.name ?? k,
          );
          say({ kind: 'holt', text: learnedSaid ? `${dayPreamble()} ${learnedSaid}` : dayPreamble() }, { kind: 'day', card: dayCard });
          return;
        }

        const res = assemble({ ...c, learned }, PICKER_DB, canDoExercise);
        setBusy(null);

        if (!res.ok) {
          /* ⚠ A REFUSAL IS NOT AN ERROR AND MUST NOT LOOK LIKE ONE. Holt says the no in his own voice, and
             the counter-offer follows as a CARD — the alternative becomes a thing with a button rather
             than a sentence the athlete has to act on themselves. */
          const weeks = weeksBetween(c.raceDate);
          const card = refusalCardFor(c.goal, weeks, c.daysPerWeek, res.refusal.message);
          say({ kind: 'holt', text: res.refusal.message });
          if (card) say({ kind: 'refusal', card });
          return;
        }

        const structure = res.assembly.structure;
        await saveProgramDraft(draftFromStructure(structure));
        /* A week and a block are the same object from the engine and two different things to save — one
           goes to `week_templates`, the other to the Program Builder's draft. The size answer is what
           tells them apart, and `structure.weeks` is the engine's own word for it rather than the
           request's, so a clamp cannot make the buttons lie. */
        setBuilt({ kind: structure.weeks === 1 ? 'week' : 'program', structure });
        const volume = volumeFor(c, structure.weeks);
        const reason = rationaleFor({
          goal: c.goal,
          daysPerWeek: c.daysPerWeek,
          sessionMinutes: c.sessionMinutes,
          weeks: structure.weeks,
          splitStyle: c.splitStyle ?? null,
          deloadWeeks: res.assembly.deloadWeeks,
          restructuredBecause: res.assembly.restructured?.because,
        });
        const programCard = programCardFor(c, structure, volume, reason);
        setLastCard({ program: programCard });
        /*
         * ⚠ A SECOND BUBBLE, NOT A LONGER FIRST ONE. For a first-timer Holt says how to LOAD week one —
         * the question no prescription in the app answers, because none of them carries a weight. It is
         * its own line so it reads as the instruction it is rather than a clause at the end of a summary,
         * and it lands here, with the build, because in-workout coaching is capped at zero on Free and
         * anything said mid-set would never reach the athletes who need it. See `startingLoadLine`.
         */
        const load = startingLoadLine(c);
        say(
          { kind: 'holt', text: preamble(c, structure.weeks) },
          ...(load ? [{ kind: 'holt' as const, text: load }] : []),
          { kind: 'program', card: programCard },
        );
      } catch (e) {
        /*
         * ⚠ **THE SHEET FREEZING WAS THIS, AND THE FAILURE CARD BELOW HAD NO CALLER.**
         *
         * `busy` disables the composer — that is the point of it, you cannot answer a question Holt
         * has not finished asking. But it was cleared only on the happy paths, so ONE throw anywhere
         * in assembly left it set forever: the typing bubble pulsing, the input dead, no error, no
         * way out but to kill the app. A stall with no explanation, which is exactly what was
         * reported.
         *
         * The `error` turn has existed since the first version of this sheet and was rendered by
         * nothing — the failure state was designed, styled, and unreachable. Same write-only shape
         * this repo has shipped before, in the direction that hurts more: the UI was there and the
         * path to it was not.
         */
        say({
          kind: 'error',
          text: 'That one broke on my end.',
          sub: e instanceof Error ? e.message : String(e),
          action: 'Tell me again and I’ll have another go.',
        });
      } finally {
        /* ⚠ THE ONLY PLACE `busy` IS GUARANTEED TO CLEAR. Every early return above passes through
           here, so a path added later cannot reintroduce the freeze by forgetting to reset it. */
        setBusy(null);
      }
    },
    [say],
  );

  /*
   * §13.12 — ONE ACTIVE PROGRAM IS AN INVARIANT, so Holt asks rather than starting a second.
   *
   * ⚠ NOT A WARNING DIALOG. The athlete asked for something reasonable and the honest answer is a
   * question with two real options, in his voice. Silently building a second block would break an
   * invariant the whole progress model rests on; a modal saying "are you sure?" would just be the app
   * being nervous at them.
   */
  const askedAboutReplacing = useRef(false);

  /** Long enough for a slow connection, short enough that it never reads as a hang. */
  const ACTIVE_LOOKUP_TIMEOUT_MS = 4000;

  const guardActiveProgram = useCallback(async (): Promise<boolean> => {
    if (askedAboutReplacing.current) return true;
    /*
     * ⚠ **A SILENT AWAIT IS A STALL, WHICH IS WHAT THIS LOOKED LIKE.** The athlete taps "Build me a
     * program", their own line appears, and then nothing happens at all while this round-trip runs —
     * no bubble, no dimmed composer, no sign anybody heard them. On a phone with one bar that is
     * indistinguishable from a frozen app, so the wait is SHOWN.
     */
    setBusy('thinking');
    /*
     * And it is BOUNDED. `fetchActiveProgram` already fell back to "no active program" when it threw;
     * a socket that hangs open is the same unknown arriving more slowly, and waiting forever on it is
     * strictly worse than assuming. Safe to assume, because nothing is created here — `advance` writes
     * a DRAFT and hands off to the Program Builder, where starting a block is a deliberate act and the
     * one-active-program invariant is enforced for real.
     */
    const active = await Promise.race([
      fetchActiveProgram().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ACTIVE_LOOKUP_TIMEOUT_MS)),
    ]);
    setBusy(null);
    if (!active) return true;
    askedAboutReplacing.current = true;
    say(
      { kind: 'holt', text: `You've already got ${active.name} running. I'm not going to start a second one behind your back.`, live: true },
      {
        kind: 'chips',
        chips: [
          { label: 'Replace it', patch: {} },
          { label: 'Change the one I have', patch: {} },
        ],
      },
    );
    return false;
  }, [say]);

  const helpChips = (): Chip[] => HELP_TOPICS.map((t) => ({ label: t.q, patch: {}, helpTopic: t.q }));

  /**
   * Wipe the conversation and open a fresh one.
   *
   * ⚠ IT CLEARS THE CONVERSATION, NOT THE ATHLETE. The remembered skill level survives — that is a fact
   * about them, not part of this chat, and making them re-answer it would defeat the point of having
   * remembered it. Same for having met him: a new conversation does not make him a stranger again, so he
   * greets rather than re-introducing himself.
   */
  const newChat = () => {
    void clearThread();
    setEdit(null);
    setMode(null);
    setBuilt(null);
    setLastCard(null);
    setPreview(false);
    setDraft('');
    askedAboutReplacing.current = false;
    /* Facts about the ATHLETE survive a new conversation; everything situational deliberately does not.
       Their skill level and the kit in their garage did not change because they tapped New chat, and
       making them re-answer either would defeat the point of having read it. */
    setConstraints((c) => ({
      ...(c.experience ? { experience: c.experience } : {}),
      ...(c.ownedEquipment ? { ownedEquipment: c.ownedEquipment } : {}),
    }));
    setIntroStep(INTRO.length + 1);
    setThread(stamped(greetReturning(firstName)));
  };

  /**
   * ASK ME AGAIN — throw the block away and re-run the questionnaire.
   *
   * ⚠ THIS EXISTS BECAUSE "ADJUST IT" IS NOT AN ANSWER FOR A BEGINNER. The card's other secondary opens
   * the Program Builder, which is the right door for somebody who knows what they would change. Somebody
   * who has never trained has no basis for editing a program at all — what they can say is *"not that
   * one"*, and until now the only way to say it was to close Holt and start him again.
   *
   * Distinct from `newChat` on purpose. New chat RESETS and greets, leaving the athlete to find their way
   * back to the build door. This one keeps going: it drops the block and lands directly on the first
   * question, because they have already said what they want to do.
   *
   * Facts about the ATHLETE survive, exactly as they do across a new conversation — their level and the
   * kit in their garage did not change because the block was wrong, and re-asking either would be the
   * coach not listening. Everything situational (goal, days, length, room, session time) is cleared, and
   * those are the answers that produce a different program.
   */
  /**
   * CHANGE MY TRAINING LEVEL — the missing half of "asked once, ever".
   *
   * ⚠ `forgetExperience()` HAD ZERO CALLERS. The level is seeded from storage on every mount and the
   * questionnaire skips the question whenever it is already set, so the first answer an athlete ever gave
   * was permanent: not changeable in the coach, not in settings, and not by starting a new conversation,
   * which keeps it on purpose. Somebody who tapped "I know what I'm doing" on day one could never tell
   * Holt they had been off for a year, and a beginner who had grown out of it had no way to say so.
   *
   * Clears the stored value AND the one in flight, then asks. Answering is `levelOnly`, so it records and
   * stops rather than starting a build nobody asked for.
   */
  const changeLevel = () => {
    void forgetExperience();
    setConstraints(({ experience: _cleared, ...rest }) => rest);
    say({ kind: 'holt', text: pick('ask_level_again') }, { kind: 'chips', chips: [...LEVEL_CHIPS] });
  };

  const rebuild = () => {
    setBuilt(null);
    setLastCard(null);
    setPreview(false);
    setEdit(null);
    setDraft('');
    askedAboutReplacing.current = false;
    const kept: ChatState = {
      ...(constraints.experience ? { experience: constraints.experience } : {}),
      ...(constraints.ownedEquipment ? { ownedEquipment: constraints.ownedEquipment } : {}),
    };
    setConstraints(kept);
    setMode('program');
    say({ kind: 'holt', text: pick('rebuild_open') });
    void advance(kept, 'program');
  };

  /* ── changing a plan already running ─────────────────────────────────────────────────────────────
   *
   * Five taps at most: which session, what about it, which movement, what to, how far it reaches.
   *
   * ⚠ EVERY LIST BELOW COMES OUT OF `edit-chat.ts`, WHICH ONLY OFFERS WHAT `edit-ops` WOULD ALLOW. The
   * sheet does no filtering of its own — duplicating the safety rules in a component is how the two
   * copies drift and the app starts offering something it then refuses.
   */

  const beginEdit = async () => {
    setBusy('thinking');
    const active = await Promise.race([
      fetchActiveProgram().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ACTIVE_LOOKUP_TIMEOUT_MS)),
    ]);
    if (!active) {
      setBusy(null);
      say(
        { kind: 'holt', text: pick('no_active_program') },
        { kind: 'chips', chips: [{ label: 'Build me something', patch: {} }] },
      );
      return;
    }
    const marks = await fetchProgramSessions(active.id).catch(() => [] as SessionMark[]);
    setBusy(null);

    const sessions = editableSessions(active.structure, marks, 6);
    if (sessions.length === 0) {
      /* Everything left is already trained. Not a failure — the block is essentially done. */
      say({ kind: 'holt', text: "There's nothing left in that block I'd change — you've trained all of it." });
      return;
    }
    setEdit({ program: active, marks });
    say(
      { kind: 'holt', text: pick('ask_edit_session') },
      { kind: 'chips', chips: sessions.map((sn) => ({ label: sn.label, patch: {}, edit: { step: 'session', ...sn.at } })) },
    );
  };

  /** One tap inside the flow. Each step narrows and asks the next question. */
  const stepEdit = (pickStep: NonNullable<Chip['edit']>) => {
    if (!edit) return;

    if (pickStep.step === 'session') {
      const at = { weekIndex: pickStep.weekIndex, dayIndex: pickStep.dayIndex };
      const found = editableSessions(edit.program.structure, edit.marks, 60).find(
        (sn) => sn.at.weekIndex === at.weekIndex && sn.at.dayIndex === at.dayIndex,
      );
      if (!found) return;
      setEdit({ ...edit, at, day: found.day, change: undefined, rowIndex: undefined, value: undefined });
      say(
        { kind: 'holt', text: pick('ask_edit_change') },
        { kind: 'chips', chips: changesFor(found.day).map((c) => ({ label: c.label, patch: {}, edit: { step: 'change', change: c.id } })) },
      );
      return;
    }

    if (pickStep.step === 'change') {
      const change = pickStep.change as EditChangeId;
      const day = edit.day;
      if (!day) return;
      if (change === 'rebuild') {
        /* ⚠ REBUILD IS DELIBERATELY NOT WIRED YET. `rebuildDay` exists and is tested, but it needs the
           athlete to name what to work around, and a limitation picker is its own conversation. Saying so
           is better than a chip that quietly does the wrong thing. */
        say({
          kind: 'holt',
          text: "I can rebuild a day around an injury, but I haven't finished teaching myself to ask about it properly yet. Change the exercise or the sets for now.",
        });
        return;
      }
      const rows = rowsFor(day, change);
      setEdit({ ...edit, change, rowIndex: undefined, value: undefined });
      say(
        { kind: 'holt', text: pick('ask_edit_row') },
        { kind: 'chips', chips: rows.map((r) => ({ label: r.label, patch: {}, edit: { step: 'row', index: r.index } })) },
      );
      return;
    }

    if (pickStep.step === 'row') {
      const { day, change } = edit;
      if (!day || !change) return;
      const options =
        change === 'swap'
          ? replacementsFor(day.main[pickStep.index], PICKER_DB, editCtx())
          : valuesFor(day, change, pickStep.index);
      setEdit({ ...edit, rowIndex: pickStep.index, value: undefined });
      say(
        { kind: 'holt', text: pick('ask_edit_value') },
        {
          kind: 'chips',
          chips: options.map((v) => ({
            label: v.label,
            patch: {},
            edit: {
              step: 'value',
              sets: v.sets,
              targetMi: v.targetMi,
              targetSec: v.targetSec,
              replacementKey: v.replacement?.key,
              replacementName: v.replacement?.name,
            },
          })),
        },
      );
      return;
    }

    if (pickStep.step === 'value') {
      setEdit({ ...edit, value: pickStep });
      say(
        { kind: 'holt', text: pick('ask_edit_scope') },
        { kind: 'chips', chips: SCOPE_CHOICES.map((c) => ({ label: c.label, patch: {}, edit: { step: 'scope', scope: c.scope } })) },
      );
      return;
    }

    if (pickStep.step === 'scope') void applyEdit(pickStep.scope);
  };

  /** The athlete's own constraints, as the candidate ranker needs them. */
  const editCtx = () =>
    contextFrom({
      owned: constraints.ownedEquipment ?? [],
      canDo: canDoExercise,
      experience: constraints.experience?.lifting ?? 'intermediate',
      limitations: constraints.limitations ?? [],
      limitationPatterns,
      excludeExercises: [],
    });

  const applyEdit = async (scope: EditScope) => {
    if (!edit?.at || !edit.change || edit.rowIndex == null || !edit.value) return;
    const at = { ...edit.at, exerciseIndex: edit.rowIndex };
    const v = edit.value;

    /* ⚠ THE REPLACEMENT IS LOOKED UP, NOT RECONSTRUCTED. A chip carries only a key and a name, because
       the thread is persisted and must stay JSON. Handing `swapExercise` a two-field object shaped like
       a CatalogExercise would compile today and quietly pass `undefined` for anything it starts reading
       tomorrow — so the real record comes back out of the catalogue. */
    const replacement = edit.change === 'swap' ? PICKER_DB.find((e) => e.key === v.replacementKey) : null;
    if (edit.change === 'swap' && !replacement) {
      say({ kind: 'holt', text: "I can't find that movement any more. Pick another one." });
      return;
    }

    setBusy('thinking');
    try {
      const res =
        edit.change === 'swap'
          ? swapExercise(edit.program.structure, edit.marks, at, replacement!, scope)
          : edit.change === 'sets'
            ? setPrescription(edit.program.structure, edit.marks, at, { sets: v.sets }, scope)
            : setCardioTarget(edit.program.structure, edit.marks, at, { targetMi: v.targetMi, targetSec: v.targetSec }, scope);

      if (!res.ok) {
        /* The guard should be unreachable from here — everything offered was checked before it was shown.
           It fires on a race: a session trained on another device since the list was drawn. */
        say({ kind: 'holt', text: res.refusal.message });
        setEdit(null);
        return;
      }

      await updateProgram(edit.program.id, res.structure);
      setEdit({ ...edit, program: { ...edit.program, structure: res.structure }, at: undefined, change: undefined, rowIndex: undefined, value: undefined });
      say(
        { kind: 'holt', text: pick('edit_done') },
        { kind: 'chips', chips: [{ label: 'Change something else', patch: {} }, { label: 'Show me the program', patch: {}, goTo: '/(tabs)' }] },
      );
    } catch (e) {
      say({
        kind: 'error',
        text: "That did not save.",
        sub: e instanceof Error ? e.message : String(e),
        action: 'Your program is unchanged. Try again in a moment.',
      });
    } finally {
      setBusy(null);
    }
  };

  const tapChip = (chip: Chip) => {
    if (chip.label === 'Change the one I have') {
      say({ kind: 'me', text: chip.label });
      handOff();
      router.push('/(tabs)/workouts');
      return;
    }
    if (chip.label === 'Replace it') {
      say({ kind: 'me', text: chip.label });
      void advance(constraints, mode ?? 'program');
      return;
    }

    /*
     * "Run a race" NARROWS the question rather than answering it. There is no such goal, and picking one
     * on the athlete's behalf — defaulting to a 5k — would have the engine build for a distance nobody
     * chose. So it sets a chat-only flag and `nextQuestion` asks which.
     */
    /* Recording a corrected level, NOT answering the build's identical question — see `Chip.levelOnly`.
       It saves and stops; `advance` is deliberately not called, because nobody asked for a program. */
    if (chip.levelOnly) {
      say({ kind: 'me', text: chip.label });
      const next = { ...constraints, ...chip.patch };
      setConstraints(next);
      if (next.experience) void rememberExperience(next.experience);
      say({ kind: 'holt', text: pick('level_saved') });
      return;
    }

    if (chip.edit) {
      say({ kind: 'me', text: chip.label });
      stepEdit(chip.edit);
      return;
    }

    /*
     * Declining the import — he acknowledges, records the choice, and gets out of the way.
     *
     * ⚠ IT WRITES A START CHOICE AND CLOSES. "I'll log as I go" is an ANSWER to Home's "how do you want
     * to start?", not a remark — and leaving the sheet open over an unchanged chooser was the athlete
     * saying what they wanted and the screen behind it carrying on as though they had not. Recording
     * `freestyle` is what swaps that card for the Train Today hero.
     *
     * The line is said BEFORE the close so it lands in the thread they can scroll back to, and the close
     * is deferred a beat so it is readable rather than a flash.
     */
    if (chip.label === DECLINE_IMPORT) {
      say({ kind: 'me', text: chip.label });
      say({ kind: 'holt', text: pick('import_later') });
      void setStartChoice('freestyle');
      setTimeout(handOff, 900);
      return;
    }

    if (chip.label === 'Change something else') {
      say({ kind: 'me', text: chip.label });
      void beginEdit();
      return;
    }

    if (chip.picksRace) {
      say({ kind: 'me', text: chip.label });
      /* ⚠ THE PATCH IS APPLIED HERE TOO, and it was not. "Run a race" carries an empty one, so nothing
         changed and nobody noticed — until the refusal card's "Pick another race" needed to CLEAR the
         goal it was refused for. Without this it would set `pickingRace` over a goal that is still set,
         `askProgram` would skip straight past the distances, and the button would look broken. */
      void advance({ ...constraints, ...chip.patch, pickingRace: true }, mode ?? 'program');
      return;
    }

    /* A help answer is a written paragraph and a real destination. He takes you; he does not point. */
    if (chip.helpTopic) {
      const topic = HELP_TOPICS.find((t) => t.q === chip.helpTopic);
      say({ kind: 'me', text: chip.label });
      if (topic) {
        say(
          { kind: 'holt', text: topic.a },
          { kind: 'chips', chips: [{ label: topic.cta, patch: {}, goTo: topic.route }, ...helpChips()] },
        );
      }
      return;
    }

    /*
     * Leaving the shelf for the workshop. The mode has to move, which no patch can do — see `startsBuild`.
     *
     * ⚠ AND IT PAYS THE ALLOWANCE THE OPENER WOULD HAVE. Reading the shelf is free; having Holt write a
     * block is what `holt_programs` meters, and this chip is the same request the BUILD door makes. A
     * free bypass of a metered door is a hole in the gate, not a kindness.
     */
    if (chip.startsBuild) {
      say({ kind: 'me', text: chip.label });
      if (!guard('holt_programs')) {
        say({ kind: 'holt', text: pick('allowance_program') });
        return;
      }
      setMode('program');
      void (async () => {
        if (!(await guardActiveProgram())) return;
        await advance({ ...constraints, ...chip.patch }, 'program');
      })();
      return;
    }

    /* The only chips that leave. `goTo` is a route string the sheet pushes — nothing about training. */
    if (chip.goTo) {
      say({ kind: 'me', text: chip.label });
      handOff();
      router.push(chip.goTo as Parameters<typeof router.push>[0]);
      return;
    }

    const opener = fromOpener(chip.label);
    if (opener) {
      say({ kind: 'me', text: chip.label });

      if (opener.kind === 'import') {
        /* ⚠ THE IMPORTER ALREADY EXISTS AND HE HANDS OVER TO IT rather than growing a second one. The
           Program Builder reads a pasted plan, shows what it found, and saves nothing until it is read —
           which is the same promise Holt makes about the blocks he writes himself. */
        say(
          { kind: 'holt', text: pick('import_open') },
          {
            kind: 'chips',
            /* ⚠ TWO CHIPS, NOT ONE. With only "Paste it in" the sole way to decline was closing the
               sheet — see `import_later`. The second door is also the only one that fits an athlete
               whose program is in their head rather than written down. */
            chips: [
              { label: 'Paste it in', patch: {}, goTo: '/program-builder?o=import' },
              /* The builder WITHOUT the paste sheet — an empty week grid to lay it out by hand. Same
                 screen, different door, because they have nothing to paste. */
              { label: BUILD_IT_OUT, patch: {}, goTo: '/program-builder' },
              { label: DECLINE_IMPORT, patch: {} },
            ],
          },
        );
        return;
      }

      if (opener.kind === 'edit') {
        void beginEdit();
        return;
      }

      /*
       * ⚠ **NO ALLOWANCE IS SPENT HERE, AND IT RETURNS ABOVE THE GUARD TO MAKE SURE OF IT.**
       *
       * `holt_programs` meters what it costs to have Holt WRITE something. He writes nothing on this
       * path — he names a program that has been sitting in the catalogue since before the conversation
       * started, and the cap that actually applies is the one on programs you KEEP, which is charged at
       * the adopt on Program Detail. Charging his authoring allowance for a recommendation would be
       * billing for a signpost.
       */
      if (opener.kind === 'pick') {
        setMode('pick');
        void advance({ ...constraints }, 'pick');
        return;
      }

      if (opener.kind === 'help') {
        say({ kind: 'holt', text: pick('help_open') }, { kind: 'chips', chips: helpChips() });
        return;
      }

      /*
       * ⚠ THE GATE IS HERE, AT THE DOOR, BEFORE A SINGLE QUESTION (M-7 §2).
       *
       * `holt_programs` and `holt_days_per_month` are Holt's OWN allowances — what it costs to have him
       * write something — and they are the two the wizard already gates on. The caps on what you then
       * KEEP (`short_programs` for a week, `templates` for a day) are checked at the save, because
       * "what should I train today?" is a free question whose answer you can train without saving, and
       * refusing it at the door would take away something the athlete is entitled to.
       */
      /*
       * ⚠ AND HE ANSWERS WHEN IT REFUSES. The athlete's own message is said into the thread a few lines
       * above, before this check — so a blocked build used to leave their question sitting there with no
       * reply. Dismissing the M-7 modal returned them to a conversation in which they had asked a coach
       * for something and been ignored, which reads as a broken sheet rather than a spent allowance.
       *
       * The modal keeps the commercial half. This is only the conversational one, and it deliberately
       * does not repeat the offer — see `allowance_program` in `voice.ts`.
       */
      if (!guard(opener.mode === 'day' ? 'holt_days_per_month' : 'holt_programs')) {
        say({ kind: 'holt', text: pick(opener.mode === 'day' ? 'allowance_day' : 'allowance_program') });
        return;
      }

      setMode(opener.mode);
      void (async () => {
        /* ⚠ THE LENGTH QUESTION USED TO BE ASKED HERE, AT THE DOOR, AND IT MOVED INTO `askProgram` —
           after the goal, so a race can skip it instead of having its answer overruled by the calendar.
           See the note on `sizeQuestion`. Nothing special happens at this door any more. */
        if (opener.mode === 'program' && !(await guardActiveProgram())) return;
        await advance({ ...constraints, ...opener.patch }, opener.mode);
      })();
      return;
    }
    say({ kind: 'me', text: chip.label });
    void advance({ ...constraints, ...chip.patch }, mode ?? 'program');
  };

  /**
   * ARRIVED THROUGH A DOOR THAT ALREADY SAID WHAT THEY WANTED — start building, do not offer a menu.
   *
   * ⚠ AFTER THE INTRODUCTION, NOT INSTEAD OF IT. `introStep` passing its last beat is the signal: on a
   * first meeting he says who he is and what he does, and only then starts asking. Firing immediately
   * would talk over his own introduction on the one screen where it matters most.
   *
   * ⚠ THE `setTimeout` IS NOT A FLOURISH. `tapChip` calls `setState`, and this project's react-compiler
   * lint rejects a synchronous `setState` inside an effect body outright. Deferring it by a tick makes it
   * an ordinary event, which is what it actually is — the same trick the intro effect above already uses.
   *
   * The ref guard is what keeps it to once: `tapChip` is recreated every render, so this effect re-runs
   * often and must be idempotent.
   */
  const intentFired = useRef(false);
  /* ⚠ HELD IN A REF SO THE EFFECT DOES NOT DEPEND ON IT. `tapChip` is rebuilt every render, so listing
     it would re-run this effect constantly; wrapping `tapChip` itself in `useCallback` would mean
     memoising a function that closes over a dozen pieces of live state, which is a far bigger change
     than this earns. The effect fires exactly once, so it only ever needs the CURRENT tapChip. */
  const tapChipRef = useRef(tapChip);
  /* ⚠ WRITTEN IN AN EFFECT, NEVER IN RENDER. react-compiler ERRORS on `ref.current` touched during
     render — rightly, because it is a render whose output depends on something React cannot see. */
  useEffect(() => {
    tapChipRef.current = tapChip;
  });
  useEffect(() => {
    if (!intent || intentFired.current) return undefined;
    if (introStep < INTRO.length + 1) return undefined;
    intentFired.current = true;
    /* Every opener already exists and every one is a real chip — the door is only choosing which one the
       athlete would have tapped, having already said so on the previous screen. */
    const label =
      intent === 'import'
        ? "I've got a program already"
        : intent === 'recommend'
          ? 'Which one should I pick?'
          : 'Build me something';
    const id = setTimeout(() => tapChipRef.current({ label, patch: {} }), 240);
    return () => clearTimeout(id);
  }, [intent, introStep]);

  /* §12.7 — a message sent while Holt is working is HELD, not dropped and not interleaved. The composer
     is dimmed rather than disabled precisely so a thought can be typed while he finishes. */
  const queued = useRef<string[]>([]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    /* The echo happens exactly once, HERE, whether the message is handled now or held. Putting it inside
       `process` instead is what made a queued message show up twice — once on send, once on drain. */
    say({ kind: 'me', text });
    if (busy) {
      queued.current.push(text);
      return;
    }
    process(text);
  };

  /** Everything that happens to a message after it is on screen. */
  const process = (text: string) => {
    /* ⚠ CHECKED BEFORE ANYTHING ELSE, and before any attempt to understand the sentence as training.
       Someone describing an injury is not answering the question on the table, and treating their knee
       as an answer to "how many days a week" would be the worst possible reading of it. */
    if (isMedical(text)) {
      say({ kind: 'stop', text: MEDICAL_STOP });
      return;
    }

    const opener = fromOpener(text);
    /* The typed path only understands the two openers that START something. Typing "how do I…" is a
       question for the model, not for a string match — see TYPING_ENABLED. */
    if (opener?.kind === 'build') {
      setMode(opener.mode);
      void advance({ ...constraints, ...opener.patch }, opener.mode);
      return;
    }

    const q = nextQuestion(constraints, mode ?? 'program');
    const patch = q ? interpret(text, q) : null;
    if (!patch) {
      /* He asks again rather than guessing. A coach who mishears and proceeds is worse than one who
         checks — and until the model lands, this is the honest edge of what he understands. */
      say({ kind: 'holt', text: NOT_UNDERSTOOD });
      if (q) say({ kind: 'chips', chips: q.chips, ctl: q.ctl });
      return;
    }
    void advance({ ...constraints, ...patch }, mode ?? 'program');
  };

  /* Drain the queue when Holt finishes. Declared AFTER `process` on purpose: a hook cannot close over a
     const that is declared below it, and react-compiler catches the attempt rather than letting it
     become a stale-closure bug that only shows up under load. */
  useEffect(() => {
    if (busy || queued.current.length === 0) return;
    const next = queued.current.shift();
    // Already echoed when it was queued — `process`, not `send`, or the message appears twice.
    if (next) process(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  /* ── render ────────────────────────────────────────────────────────────────────────────────────── */

  /* The flat thread, grouped into what the design draws: Home, the greeting stack, and Holt turns that
     carry their own controls. Derived every render on purpose — the thread is capped at 100 turns and a
     memo here would be a second copy that can go stale. */
  const blocks = layOut(thread);

  const openBuilder = () => {
    handOff();
    /*
     * ⚠ PUSH, NOT REPLACE — and this was a dead back button (PO, 2026-08-09).
     *
     * The wizard at `/coach` uses `replace` correctly: it IS a route, so the builder takes its place and
     * dismissing returns you where you were. This sheet is NOT a route — it is an overlay on a tab — so
     * `replace` swapped out the TAB underneath it. Save, press back, and there was nothing beneath.
     *
     * Push leaves the tab in the stack: tab → builder → (builder replaces itself with the saved
     * program) → back returns to Workouts, which is what the athlete expects.
     */
    router.push(built?.kind === 'day' ? '/workout-builder' : '/program-builder');
  };

  /* ── what the artifact's two buttons do ────────────────────────────────────────────────────────
   *
   * ══ SAVE FOR LATER MUST ACTUALLY SAVE ══
   *
   * ⚠ A DAY USED TO SAVE A *DRAFT*, NOT A TEMPLATE. `saveWorkoutDraft` writes to
   * `forge_workout_builder_draft_v1` and hands over to `/workout-builder`, where saving is a second,
   * deliberate act — so "Save for later" would have been a button that saved nothing and an athlete
   * who closed the builder would have lost it. It calls `saveTemplate` directly.
   *
   * A PROGRAM is the exception and it is not one: the draft IS the handover, because a multi-week block
   * is reviewed and named in the Program Builder before it becomes a row. That is the same promise Holt
   * makes about everything else he writes — nothing is saved until you have seen it.
   *
   * ⚠ `buildDayWorkout` RETURNS EMPTY `warmup`/`cooldown` — only `main` is populated. The template is
   * saved as exactly that and never implies a warm-up it does not contain.
   */
  const leaveFor = (route: string) => {
    handOff();
    router.push(route as Parameters<typeof router.push>[0]);
  };

  const saveForLater = () => {
    if (!built || handing) return;
    void (async () => {
      /* The PROGRAM path spends nothing here — the block becomes a row in the Builder, where the caps
         are enforced at the point of creation. The other two write immediately, so they ask first. */
      if (built.kind === 'week' && !guard('short_programs')) return;
      if (built.kind === 'day' && !guard('templates')) return;
      setHanding(true);
      try {
        if (built.kind === 'program') {
          openBuilder();
          return;
        }
        if (built.kind === 'week') {
          const { id } = await saveWeekTemplate(built.structure.name, built.structure);
          say({ kind: 'saved', text: `Saved as a week. It's under Your Weeks whenever you want it.` });
          leaveFor(`/week-template/${id}`);
          return;
        }
        const id = await saveTemplate(built.day.name, templateRowsFor(built.day));
        say({ kind: 'saved', text: `Saved as a template. It's under Your Templates whenever you want it.` });
        leaveFor(`/template/${id}`);
      } catch (e) {
        say({ kind: 'error', text: "That didn't save.", sub: errorText(e), action: 'Nothing was lost. Try again in a moment.' });
      } finally {
        setHanding(false);
      }
    })();
  };

  /**
   * ⚠ **STARTING ANYTHING ENDS THE PROGRAM THAT IS RUNNING** (Amendment 001 §2), and neither
   * `startProgram` nor `startWeekTemplate` warns — by design, they are data functions, and one that
   * opened a dialog would be unusable from anywhere else. W-29 asks first, by name, and so does this.
   *
   * A DAY does not: starting a workout ends nothing.
   */
  const startNow = () => {
    if (!built || handing) return;
    if (built.kind === 'week' && !guard('short_programs')) return;
    if (built.kind === 'day') {
      void (async () => {
        setHanding(true);
        try {
          await writeWorkoutLaunch({ exercises: launchRowsFor(built.day), workoutName: built.day.name });
          leaveFor('/workout');
        } catch (e) {
          say({ kind: 'error', text: "I couldn't open that.", sub: errorText(e), action: 'Try again in a moment.' });
        } finally {
          setHanding(false);
        }
      })();
      return;
    }
    void (async () => {
      setBusy('thinking');
      const active = await Promise.race([
        fetchActiveProgram().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ACTIVE_LOOKUP_TIMEOUT_MS)),
      ]);
      setBusy(null);
      // Only ask when there is genuinely something to lose — the same rule W-29 keeps.
      if (active) {
        setConfirmEnd(active.name);
        return;
      }
      await reallyStart();
    })();
  };

  /* One object, built once, so a card cannot be given half a handoff. A block goes to the Builder to be
     finished and named, which is a different promise from "saved" — so it says so.
     *
     * ⚠ THE SECOND DOOR IS DIFFERENT FOR SOMEBODY WHO HAS NEVER TRAINED, AND THE LABEL AND THE ACTION
     * CHANGE TOGETHER.
     *
     * "Adjust it" opens the Program Builder, which is the right offer for an athlete who knows what they
     * would change. A beginner has no basis for editing a program, so that button reads to them as a hint
     * that something is wrong with what they were just handed — and following it drops them into an
     * authoring tool they cannot use.
     *
     * What they CAN say is "not that one", so that is what they are given: `rebuild` throws the block
     * away and starts asking again. The label was not softened over the same action — a button promising
     * to ask again while opening an editor would be worse than the blunt one it replaced. */
  const isNewToTraining = constraints.experience?.lifting === 'beginner';
  const rebuildable = built?.kind === 'program' && isNewToTraining;
  const handoff: Handoff = {
    onPreview: () => setPreview(true),
    onStart: startNow,
    onSave: rebuildable ? rebuild : saveForLater,
    saveLabel: rebuildable ? 'Ask me again' : built?.kind === 'program' ? 'Adjust it' : 'Save for later',
  };

  const reallyStart = async () => {
    if (!built || built.kind === 'day') return;
    setConfirmEnd(null);
    setHanding(true);
    try {
      if (built.kind === 'week') {
        /* ⚠ SAVED FIRST, THEN STARTED, AND THAT COSTS ONE ALLOWANCE RATHER THAN TWO. `createProgram`
           takes the week template's id and 0157's guard reads it: starting a week you have already paid
           for does not spend a second unit (MA4-D4). Going straight to `createProgram` without the
           template would charge for the program AND leave nothing to run again. */
        const { id } = await saveWeekTemplate(built.structure.name, built.structure);
        const { programId, endedProgramId } = await startWeekTemplate(id);
        if (endedProgramId) say({ kind: 'saved', text: 'Your previous program was ended.' });
        leaveFor(`/program/${programId}`);
        return;
      }
      const { id } = await createProgram(built.structure);
      const res = await startProgram(id);
      if (res?.ended) say({ kind: 'saved', text: 'Your previous program was ended.' });
      leaveFor(`/program/${id}`);
    } catch (e) {
      say({ kind: 'error', text: "That didn't start.", sub: errorText(e), action: 'Your training is unchanged. Try again in a moment.' });
    } finally {
      setHanding(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.backdrop, { opacity: rise }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={collapse} accessibilityLabel="Close the coach" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheetWrap,
          {
            transform: [
              { translateY: Animated.add(rise.interpolate({ inputRange: [0, 1], outputRange: [900, 0] }), drag) },
            ],
          },
        ]}
      >
      <LinearGradient
        colors={SHEET_SURFACE}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.sheet, keyboardInset > 0 && { paddingBottom: keyboardInset }]}
      >
        {/*
          §1's warm wash — the ONE atmospheric layer, over the top 300px and nothing below it. RN has no
          radial gradient, so this is the vertical component of it: the design's falls to zero by 76% of
          a 300px box, which is what the stops below reproduce. `pointerEvents="none"` because it sits
          over the header and would otherwise eat the taps.
        */}
        <LinearGradient
          colors={[bronzeWash(0.055), bronzeWash(0.022), bronzeWash(0)]}
          locations={[0, 0.4, 0.76]}
          start={{ x: 0.14, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.warmWash}
          pointerEvents="none"
        />
        {/* The grab handle, and it really grabs — drag it down and the sheet goes back to being the
            bubble it came from. */}
        <View style={styles.grabWrap} {...handleResponder.panHandlers}>
          <View style={styles.grab} />
        </View>
        {/* §2 — medallion, name, liveness line, two icon-over-caption actions. NO RULE UNDERNEATH:
            the separation is spacing plus the warm wash, and a hard line under it flattens the header
            into a toolbar. */}
        <View style={styles.header}>
          <HoltMark size={52} state={waiting ?? 'idle'} />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>COACH HOLT</Text>
            {/* `YOUR COACH · ● · READY`. The dot is the ONLY green on this surface, and it is a liveness
                indicator rather than a colour in the palette — so it stays lit while he works and the
                word beside it changes instead. */}
            <View style={styles.headerStatusRow}>
              <Text style={styles.headerStatus}>YOUR COACH</Text>
              <View style={styles.headerDot} />
              <Text style={styles.headerStatus}>
                {busy === 'building' ? 'BUILDING' : busy === 'reading' ? 'READING' : busy === 'thinking' ? 'THINKING' : 'READY'}
              </Text>
            </View>
          </View>
          {/*
            ⚠ **STARTING AGAIN USED TO MEAN SCROLLING.** Come back after finishing a conversation and the
            openers were down at the bottom of everything you had already said — the PO had to hunt for
            the way in. §15 is right that the thread persists, and a rolling thread with no way to clear
            it is a filing cabinet you have to read to get a new sheet of paper.
          */}
          <HeaderAction
            label="NEW CHAT"
            on={menu}
            onPress={() => setMenu((v) => !v)}
            accessibilityLabel="Start something new"
            expanded={menu}
          >
            <Path d="M12 5v14M5 12h14" />
          </HeaderAction>
          {/* §4.9 — it collapses to the bubble, and it DOES end the conversation. The comment here used
              to say the opposite; it had been wrong since 2026-08-11, when closing started clearing. */}
          <HeaderAction label="CLOSE" onPress={collapse} accessibilityLabel="Close" pad>
            <Path d="M6 6l12 12M18 6L6 18" />
          </HeaderAction>
        </View>

        {/*
          ⚠ **IT MUST NOT DESTROY THE THREAD** (§2). Two of the three rows START something inside the
          conversation already running; only the one that says so ends it. A menu behind a `+` that
          silently wiped five minutes of answers would be the worst button on the surface.
        */}
        {menu ? (
          <>
            <Pressable style={styles.menuScrim} onPress={() => setMenu(false)} accessibilityLabel="Dismiss" />
            <MenuPop>
              <MenuRow
                label="New conversation"
                onPress={() => {
                  setMenu(false);
                  newChat();
                }}
              />
              <MenuRow
                divided
                label="Build something"
                onPress={() => {
                  setMenu(false);
                  tapChip({ label: 'Build me something', patch: {} });
                }}
              />
              <MenuRow
                divided
                label="Training question"
                onPress={() => {
                  setMenu(false);
                  tapChip({ label: 'How do I…?', patch: {} });
                }}
              />
              {/* The only correction path for the one answer Holt keeps between conversations. */}
              <MenuRow
                divided
                label="Change my training level"
                onPress={() => {
                  setMenu(false);
                  changeLevel();
                }}
              />
            </MenuPop>
          </>
        ) : null}

        {preview && lastCard ? (
          <PlanPreview
            program={lastCard.program}
            day={lastCard.day}
            onBack={() => setPreview(false)}
            /* Preview closes FIRST. `startNow` can raise the "end your current program?" confirm, and
               that dialog is a sibling of this screen rather than a child — left open, the preview
               would sit over the question it just asked. */
            onStart={() => {
              setPreview(false);
              handoff.onStart();
            }}
            secondaryLabel={rebuildable ? 'Ask me again' : 'Final touches'}
            onSecondary={() => {
              setPreview(false);
              // Same split as the card's own secondary — a beginner is asked again rather than handed an
              // authoring tool, and the label above says which of the two this is.
              if (rebuildable) {
                rebuild();
                return;
              }
              handOff();
              router.push(built?.kind === 'day' ? '/workout-builder' : '/program-builder');
            }}
          />
        ) : (
        <ScrollView
          ref={scroller}
          style={styles.thread}
          contentContainerStyle={[styles.threadInner, { paddingBottom: threadPad }]}
          keyboardShouldPersistTaps="handled"
        >
          {blocks.map((b, bi) => {
            /*
             * ══ COACH HOME, DRAWN IN PLACE OF THE OPENER CHIPS ══
             *
             * The design's rule: *"Home is not a screen you leave. It stays pinned above the conversation
             * and scrolls away with it."* The opener turn is already exactly that position — it is the
             * last thing in the thread before the athlete says anything — so Home is a RENDERING of it
             * rather than a sixth piece of state that could disagree with the thread about where it is.
             */
            if (b.kind === 'home') {
              return (
                <TurnEnter key={b.key}>
                  <CoachHome onOpener={(label) => tapChip({ label, patch: {} })} />
                  {/* §4 — the bronze rule only exists once there is a conversation under it. */}
                  {bi < blocks.length - 1 ? <ConversationDivider /> : null}
                </TurnEnter>
              );
            }
            if (b.kind === 'greeting') {
              return (
                <TurnEnter key={b.key} pullUp={GREETING_PULL[b.slot]}>
                  <Text style={styles[GREETING_STYLE[b.slot]]}>{b.text}</Text>
                </TurnEnter>
              );
            }
            if (b.kind === 'holt') {
              return (
                <TurnEnter key={b.key}>
                  <HoltTurn
                    text={b.text}
                    at={b.at}
                    attached={b.attached}
                    answer={b.answer}
                    /* §5's live turn is the one still on the table: brighter text, a lit mark. Everything
                       above it is history and steps back a level of contrast. */
                    live={bi === blocks.length - 1}
                    onChip={tapChip}
                    handoff={handoff}
                  />
                </TurnEnter>
              );
            }
            return (
              <TurnEnter key={b.key}>
                <TurnView turn={b.turn} onChip={tapChip} handoff={handoff} />
              </TurnEnter>
            );
          })}
          {waiting ? <Waiting kind={waiting} /> : null}
        </ScrollView>
        )}

        {/* §12.3 — four states, and each says something different: ready is quiet, typing lights the
            field bronze and forges the send button, busy dims the whole bar and renames the placeholder
            so it is obvious nothing was lost. Hidden while previewing: that screen is for reading, and a
            composer under it would invite a reply to something that is not a question. */}
        {/*
          * ⚠ **DIMMED, NOT DISABLED — AND IT WAS DISABLED.** §12.7 is explicit that a message sent while
          * Holt is working is HELD rather than refused, and the comment on `queued` above quotes it. The
          * input said otherwise: `editable={!busy}` with the send button disabled alongside it.
          *
          * Two consequences, and the second is the one the PO felt. It made `queued` DEAD CODE — nothing
          * can ever be typed while busy, so nothing can ever be queued, so the hold-and-drain machinery
          * ran zero times. And it made a working app indistinguishable from a broken one: while Holt
          * thinks, tapping the box raised no keyboard and the send arrow did nothing. There is no way to
          * tell that apart from frozen, because from the athlete's side it IS frozen — the app has
          * stopped accepting input and has not said why.
          *
          * So the composer stays live. `send()` queues when busy and the drain effect plays it back the
          * moment he finishes.
          */}
        {/* The inset below is for the day this returns rather than something anyone can see now — fixed
            alongside the two visible ones so all three stop guessing at the home indicator together. */}
        {preview || !TYPING_ENABLED ? null : (
        <View style={[styles.composer, { paddingBottom: 12 + insets.bottom }, busy ? styles.composerBusy : null]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={busy ? 'Holt is working — go ahead, he’ll get it' : 'Tap an answer, or type it'}
            placeholderTextColor={flColor.gray600}
            style={[styles.input, draft.trim() ? styles.inputTyping : null]}
            multiline
            maxLength={280}
            onSubmitEditing={send}
            accessibilityLabel="Message Holt"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={styles.sendWrap}
          >
            {draft.trim() ? (
              <LinearGradient
                colors={flGradient.bronzeFill.colors}
                locations={flGradient.bronzeFill.locations}
                start={flGradient.bronzeFill.start}
                end={flGradient.bronzeFill.end}
                style={styles.sendOn}
              >
                <SendGlyph color={flColor.bronze300} />
              </LinearGradient>
            ) : (
              <View style={styles.sendOff}>
                <SendGlyph color={flColor.gray600} />
              </View>
            )}
          </Pressable>
        </View>
        )}
      </LinearGradient>
      </Animated.View>

      {/*
        ⚠ **STARTING THIS ENDS THE BLOCK THAT IS RUNNING**, and it is named (W-29 · Amendment 001 §2).
        `startProgram` and `startWeekTemplate` both do it server-side, atomically, without a word — the
        caller is responsible for having asked, and a silent swap is how an athlete finds out days later
        that their twelve-week block stopped in week six.
      */}
      <ConfirmSheet
        open={confirmEnd != null}
        onClose={() => setConfirmEnd(null)}
        headline="This ends your current program"
        body={`${confirmEnd ?? 'Your program'} will end and anything you have already trained stays exactly as it happened. Only one program runs at a time.`}
        confirmLabel="Start it anyway"
        cancelLabel="Keep what I've got"
        onConfirm={() => void reallyStart()}
      />
    </View>
  );
}

/**
 * `--fl-surface-modal` — the sheet is a lifted, slightly warm steel panel, not the page background.
 *
 * ⚠ IT WAS FLAT `charcoal900` (#0C1013), which is the PAGE colour. The sheet read as a hole cut in the
 * screen instead of a panel raised above it, and no shadow or border could rescue that — the material
 * was simply wrong.
 */
const SHEET_SURFACE = flGradient.surfaceSheet.colors;

/** `--fl-surface-elevated`. The card sits above the sheet, not level with it. */
const SURFACE_ELEVATED = flGradient.surfaceSheetRaised.colors;

/* ────────────────────────────────────────────────────────────────────────────────────────────────── */

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * §5.3 — a turn arrives: opacity 0→1 and 10px up, 280ms, ease-out.
 *
 * ⚠ ONCE PER MESSAGE. The spec is explicit that it must never re-animate on re-render, and the whole
 * thread re-renders on every keystroke in the composer — so the animation is started from a mount effect
 * with no dependencies and the value is never reset. Anything keyed off props would make the entire
 * conversation twitch each time a character is typed.
 */
function TurnEnter({ children, pullUp = 0 }: { children: React.ReactNode; pullUp?: number }) {
  const [v] = useState(() => new Animated.Value(0));
  const still = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 280,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        /* The thread's own `gap` is the space between two TURNS. Home's greeting stack is three lines of
           one paragraph, at `gap: 4`, so the lines after the first pull back against it. A negative
           margin rather than a second container, because the lines have to stay individual turns — they
           arrive one beat at a time and each animates in on its own. */
        marginTop: pullUp ? -pullUp : undefined,
        // The fade stays — it is the arrival. Only the travel goes.
        transform: still ? [] : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * ══ COACH HOME — `Coach Holt Chat v2.dc.html` §3 ══
 *
 * Three capability cards over two quiet rows. The five doors are the same five `OPENERS` the chip wrap
 * offered; what changes is that they no longer look equal, because they are not. BUILD is what Holt is
 * for and carries the warm wash and the only shadow; TODAY and ADJUST sit beside it in the plain
 * treatment; the import and the help menu drop below a rule as rows.
 *
 * ⚠ **THE CONTEXTUAL ACTION ROW IS NOT BUILT, DELIBERATELY.** §3 draws up to two actions above the cards
 * for the states the design ships — *scheduled tomorrow*, *missed a day*, *Week 4 · Day 2* — and every one
 * of them needs the athlete's live program and their last session, which this sheet does not read and
 * cannot read without making the greeting wait on the network. That is the silent stall this surface has
 * already been fixed for once. Drawing the row from anything less than the real schedule would be Holt
 * claiming to know what you trained yesterday. It is left out rather than faked.
 */
function CoachHome({ onOpener }: { onOpener: (opener: string) => void }) {
  return (
    <View style={styles.home}>
      <View style={styles.homeCards}>
        {HOME_CARDS.map((c) => (
          <Pressable
            key={c.tag}
            onPress={() => onOpener(c.opener)}
            accessibilityRole="button"
            accessibilityLabel={`${c.title}. ${c.sub}`}
            style={({ pressed }) => [
              styles.homeCard,
              c.tag === 'BUILD' ? styles.homeCardPrimary : styles.homeCardPlain,
              pressed && styles.homeCardPressed,
            ]}
          >
            <HomeCardIcon tag={c.tag} />
            <Text style={styles.homeTag}>{c.tag}</Text>
            <Text style={styles.homeCardTitle}>{c.title}</Text>
            <Text style={styles.homeCardSub}>{c.sub}</Text>
            {/* `marginTop: auto` is what keeps the three arrows on one baseline when the subs are
                different lengths — the design calls it out by name. Keep it. */}
            <View style={styles.homeArrow}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12h14M13 6l6 6-6 6" />
              </Svg>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.homeRows}>
        {HOME_ROWS.map((r, i) => (
          <Pressable
            key={r.icon}
            onPress={() => onOpener(r.opener)}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            style={({ pressed }) => [styles.homeRow, i === HOME_ROWS.length - 1 && styles.homeRowLast, pressed && styles.homeRowPressed]}
          >
            {/* Rounded square for the document and the shelf, a circle for the question — the container's
                shape is most of what separates rows that are otherwise identical, and the glyph does the
                rest. */}
            <View style={[styles.homeGlyph, r.icon === 'question' && styles.homeGlyphRound]}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {r.icon === 'document' ? (
                  <>
                    <Path d="M6.5 3.5h7L18 8v12.5h-11.5z" />
                    <Path d="M13.5 3.5V8H18" />
                  </>
                ) : r.icon === 'shelf' ? (
                  /* Three spines stood on a shelf — the fourteen programs you are stood in front of, which
                     is the picture the question is about. Not a magnifying glass: this is not a search. */
                  <>
                    <Path d="M5 4.5v13M9.5 4.5v13M14 5.5l3.5 12.2" />
                    <Path d="M3 19.5h18" />
                  </>
                ) : (
                  <>
                    <Path d="M9.3 9.2a2.8 2.8 0 115.4 1.4c-.8 1.1-2.1 1.4-2.1 2.9" />
                    <Path d="M12.6 17.2h-.01" />
                  </>
                )}
              </Svg>
            </View>
            <Text style={styles.homeRowLabel}>{r.label}</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 6l6 6-6 6" />
            </Svg>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** BUILD dumbbell · TODAY calendar · ADJUST sliders — 22×22, 1.8 stroke, bronze (§3). */
function HomeCardIcon({ tag }: { tag: HomeCardTag }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {tag === 'BUILD' ? (
        <>
          <Path d="M7 8.5v7M17 8.5v7" />
          <Path d="M4.5 10v4M19.5 10v4" />
          <Path d="M7 12h10" />
        </>
      ) : tag === 'TODAY' ? (
        <>
          <Path d="M5 5.5h14v14H5z" />
          <Path d="M8.5 3.5v4M15.5 3.5v4M5 10h14" />
        </>
      ) : (
        <>
          <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <Path d="M15 4.8v4.4M9 14.8v4.4" />
        </>
      )}
    </Svg>
  );
}

type HomeCardTag = (typeof HOME_CARDS)[number]['tag'];

/** §4 — `CONVERSATION` in bronze between two rules that fade outward. */
function ConversationDivider() {
  return (
    <View style={styles.dividerRow}>
      <LinearGradient
        colors={[bronzeWash(0), bronzeWash(0.28)]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.dividerRule}
      />
      <Text style={styles.dividerLabel}>CONVERSATION</Text>
      <LinearGradient
        colors={[bronzeWash(0.28), bronzeWash(0)]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.dividerRule}
      />
    </View>
  );
}

/** Turns carry the wall clock they arrived at — §5 draws it under the mark and beside the ticks. */
const stamped = (turns: Turn[]): Turn[] =>
  turns.map((t) => ((t.kind === 'holt' || t.kind === 'me') && t.at == null ? { ...t, at: Date.now() } : t));

/** `4:31 PM`. Absent on threads stored before v2, and then nothing is drawn rather than a guess. */
function clockOf(at: number | undefined): string | null {
  if (at == null) return null;
  try {
    return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

/**
 * ══ THE THREAD, LAID OUT ══
 *
 * §5: *"Controls live INSIDE the content column, so they align to Holt's text and not to the gutter."*
 * The state machine emits them as separate turns — `say({kind:'holt'}, {kind:'chips'})` is the shape of
 * every question — so the grouping happens here, at render, and the thread keeps the flat shape its
 * tests and its storage describe.
 *
 * What attaches: anything Holt SHOWED you as part of the same breath — the answers, the card he built,
 * the counter-offer. What does not: `stop` and `error`, which are their own moment and are already
 * emitted alone.
 */
const ATTACHES: ReadonlySet<Turn['kind']> = new Set(['chips', 'program', 'day', 'refusal', 'explain', 'saved', 'wall']);

type Block =
  | { key: number; kind: 'home' }
  | { key: number; kind: 'greeting'; text: string; slot: GreetingSlot }
  | {
      key: number;
      kind: 'holt';
      text: string;
      at?: number;
      attached: Turn[];
      /**
       * What the athlete answered this block with, if anything — the text of the `me` turn that follows
       * it. §6's selection model, DERIVED: the thread already records the answer one turn later, and a
       * second copy of it on the chips turn is a second thing that can disagree.
       */
      answer: string | null;
    }
  | { key: number; kind: 'turn'; turn: Turn };

function layOut(thread: Turn[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < thread.length; i += 1) {
    const t = thread[i];
    if (isHomeTurn(t)) {
      out.push({ key: i, kind: 'home' });
      continue;
    }
    if (t.kind === 'holt') {
      const slot = greetingSlot(thread, i);
      if (slot) {
        out.push({ key: i, kind: 'greeting', text: t.text, slot });
        continue;
      }
      const attached: Turn[] = [];
      let j = i + 1;
      while (j < thread.length && ATTACHES.has(thread[j].kind) && !isHomeTurn(thread[j])) {
        attached.push(thread[j]);
        j += 1;
      }
      const next = thread[j];
      out.push({ key: i, kind: 'holt', text: t.text, at: t.at, attached, answer: next?.kind === 'me' ? next.text : null });
      i = j - 1;
      continue;
    }
    out.push({ key: i, kind: 'turn', turn: t });
  }
  return out;
}

/** Which slot of Home's greeting stack a turn occupies, if any. */
type GreetingSlot = 'greeting' | 'line' | 'sub';
const GREETING_SLOTS: readonly GreetingSlot[] = ['greeting', 'line', 'sub'];

/**
 * Is this Holt turn part of the greeting Home is wearing, and which line of it?
 *
 * The greeting stack is the run of Holt lines immediately before the opener turn — the introduction's
 * three beats on a first visit, `greetReturning`'s two on every one after. Derived rather than stored,
 * because the thread already knows: a second flag saying which lines are "the greeting" is a second
 * thing that can disagree with it.
 *
 * ⚠ CAPPED AT THREE, which is how many slots the design's stack has. It also stops a stored conversation
 * that happens to end in Holt speech from being swallowed into the greeting when he greets over the top
 * of it — those lines stay conversation, which is what they are.
 */
function greetingSlot(thread: Turn[], i: number): GreetingSlot | null {
  if (thread[i].kind !== 'holt') return null;
  let home = i;
  while (home < thread.length && thread[home].kind === 'holt') home += 1;
  if (home >= thread.length || !isHomeTurn(thread[home])) return null;
  let runStart = home;
  while (runStart > 0 && thread[runStart - 1].kind === 'holt') runStart -= 1;
  const start = Math.max(runStart, home - GREETING_SLOTS.length);
  return i < start ? null : (GREETING_SLOTS[i - start] ?? null);
}

/** How far a greeting line pulls back against the thread's turn gap to reach the design's 4px. */
const GREETING_PULL: Record<GreetingSlot, number> = { greeting: 0, line: 16, sub: 14 };
const GREETING_STYLE: Record<GreetingSlot, 'homeGreeting' | 'homeLine' | 'homeSub'> = {
  greeting: 'homeGreeting',
  line: 'homeLine',
  sub: 'homeSub',
};

/**
 * ══ HOLT SPEAKS IN THE OPEN — §5, and rule 2 of the whole design ══
 *
 * *"Holt's speech is open on the background. It never gets a bubble. Only the athlete's own turns get a
 * container."* The mark and the time sit in a 40px gutter on the left; his words, and everything he put
 * on the table with them, sit in the column beside it.
 *
 * The controls are INSIDE that column rather than below the turn, so an answer lines up with the
 * question it answers instead of with the avatar. That indent is the difference between a conversation
 * and a form with a portrait next to it.
 */
function HoltTurn({
  text,
  at,
  attached,
  answer,
  live,
  onChip,
  handoff,
}: {
  text: string;
  at?: number;
  attached: Turn[];
  answer: string | null;
  live: boolean;
  onChip: (c: Chip) => void;
  handoff: Handoff;
}) {
  const clock = clockOf(at);
  return (
    <View style={styles.holtRow}>
      <View style={[styles.holtGutter, !live && styles.holtGutterPast]}>
        <HoltMark size={40} />
        {clock ? <Text style={styles.holtTime} numberOfLines={1}>{clock}</Text> : null}
      </View>
      <View style={styles.holtBody}>
        <Text style={styles.holtEyebrow}>HOLT</Text>
        <Text style={[styles.holtText, !live && styles.holtTextPast]}>{text}</Text>
        {attached.length ? (
          <View style={styles.holtAttached}>
            {attached.map((t, i) => (
              <TurnView key={i} turn={t} answer={answer} onChip={onChip} handoff={handoff} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The athlete's own turn — §5. Eyebrow, bubble, then the time and two ticks.
 *
 * ⚠ QUIETER THAN HOLT AND QUIETER THAN ANY CONTROL, deliberately. It is history: a record of what you
 * already said, not a thing to act on. Bronze-TINTED, never bronze-filled, so it cannot be mistaken for
 * a button.
 */
function MeTurn({ text, at }: { text: string; at?: number }) {
  const clock = clockOf(at);
  return (
    <View style={styles.meBlock}>
      <Text style={styles.meEyebrow}>YOU</Text>
      <View style={styles.meRow}>
        <Text style={styles.meText}>{text}</Text>
      </View>
      <View style={styles.meMeta}>
        {clock ? <Text style={styles.meTime}>{clock}</Text> : null}
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze600} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M1.5 13l4 4L13 8" />
          <Path d="M9 17l1.5 1.5L22 7" />
        </Svg>
      </View>
    </View>
  );
}

/**
 * A header action — §2: a 20×20 stroke icon over an 8px caption, not a bare glyph.
 *
 * The caption is the point. Two unlabelled icons in the corner of a sheet are two guesses, and one of
 * them wipes the conversation.
 */
function HeaderAction({
  label,
  children,
  onPress,
  accessibilityLabel,
  on = false,
  pad = false,
  expanded,
}: {
  label: string;
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  on?: boolean;
  pad?: boolean;
  expanded?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={expanded == null ? undefined : { expanded }}
      hitSlop={8}
      style={[styles.headerAction, pad && styles.headerActionPad]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={on ? flColor.bronze300 : flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </Svg>
      <Text style={[styles.headerActionLabel, on && styles.headerActionLabelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** §2's popover — 224 wide, elevated, rising 8px over 180ms. */
function MenuPop({ children }: { children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  const still = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 180, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View
      style={[
        styles.menu,
        { opacity: v, transform: still ? [] : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <LinearGradient colors={SURFACE_ELEVATED} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}>
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

function MenuRow({ label, onPress, divided = false }: { label: string; onPress: () => void; divided?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuRow, divided && styles.menuRowDivided, pressed && styles.menuRowPressed]}
    >
      <Text style={styles.menuText}>{label}</Text>
    </Pressable>
  );
}

function SendGlyph({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

/**
 * The engine's own weekly volume, so the ribbon is the block's real shape rather than a decoration.
 *
 * A strength block gets an empty array on purpose: its weekly shape is flat by design, and drawing a
 * ribbon of identical bars would be inventing a curve to look like the running one.
 */
/*
 * ⚠ THE REASON PARAGRAPH IS NOT WRITTEN HERE. §11.1.10: "Sourced from the rulebook's recorded reasons —
 * the engine knows why it did what it did. Never write this string by hand."
 *
 * I had written one by hand, in this file, while `rulebook/rationale.ts` already existed for exactly this
 * — it is Holt's "why I built it this way", composed from the split note, the frequency, the goal
 * emphasis and the real deload weeks. Two sources for the same sentence is how the card ends up
 * explaining a plan the engine did not build.
 */


/** The two waits. Building names its steps, because a spinner would waste the moment. */
function Waiting({ kind }: { kind: 'thinking' | 'building' }) {
  // Where his next line will land, in the shape it will land in (§9.1–9.2).
  if (kind === 'thinking') return <View style={styles.dotsWrap}><TypingBubble /></View>;
  return <BuildingCard />;
}

/**
 * Building gets a CARD, not a spinner — §10.1: "the moment the product does the thing it exists for."
 *
 * ⚠ THE STEP NAMES ARE REAL WORK, not decoration. Each names something `assemble()` genuinely does, in
 * the order it does it: read what they already run, set the peak, place the long runs, balance the taper.
 *
 * ⚠ AND ONE HONEST LIMITATION, STATED RATHER THAN HIDDEN. §10.4 asks for the steps to be emitted from the
 * engine as it works. The engine is SYNCHRONOUS and returns in a few milliseconds, so there is nothing to
 * stream — the steps advance on the minimum-duration hold §10.7 requires anyway. That is a timer, and
 * calling it anything else would be the interface lying about how long its own work took. Making it real
 * means making `assemble` async and yielding between phases, which is a change to the engine, not to
 * this card.
 */
const BUILD_STEPS = [
  'Reading your last four weeks',
  'Setting peak volume',
  'Placing the long runs',
  'Balancing the taper',
];

function BuildingCard() {
  const [step, setStep] = useState(0);
  const [fill] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const id = setInterval(() => setStep((n) => Math.min(n + 1, BUILD_STEPS.length)), 175);
    Animated.timing(fill, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    return () => clearInterval(id);
  }, [fill]);

  return (
    <View style={styles.buildCard}>
      <Text style={styles.buildLabel}>ASSEMBLING</Text>
      <View style={styles.buildSteps}>
        {BUILD_STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <View key={label} style={styles.buildStep}>
              <View style={styles.buildIcon}>
                {done ? (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M20 6L9 17l-5-5" />
                  </Svg>
                ) : null}
              </View>
              <Text style={[styles.buildStepText, done && styles.buildStepDone, active && styles.buildStepActive]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      {/* The rail fills left to right and never drains (§10.6). */}
      <View style={styles.rail}>
        <Animated.View
          style={[styles.railFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
    </View>
  );
}

/**
 * The typing bubble — three dots in a container, then the line arrives whole.
 *
 * ⚠ THIS REPLACES THE TYPEWRITER, by PO decision (2026-08-09). `PROMPT.md` §6.3–6.4 specifies text
 * arriving character by character at 42ms with a bronze block caret, and it was built that way. In use
 * it read as the app being slow rather than as somebody talking: you cannot skim a sentence that is
 * still being spelled, and every line made you wait for information you could already half-see.
 *
 * A typing bubble says the same thing — "he is composing" — without holding the sentence hostage. It is
 * also the convention every messaging app has settled on, which matters more here than novelty.
 *
 * The dots are the same component the `thinking` state uses. That is deliberate: both mean Holt is
 * working, and giving them two different animations would be inventing a distinction nobody asked for.
 */
function TypingBubble() {
  return (
    <View style={styles.typingBubble} accessibilityLabel="Holt is typing">
      {[0, 1, 2].map((i) => (
        <ThinkingDot key={i} delay={i * 180} />
      ))}
    </View>
  );
}

function ThinkingDot({ delay }: { delay: number }) {
  const [v] = useState(() => new Animated.Value(0.25));
  const still = useReducedMotion();
  useEffect(() => {
    if (still) {
      v.setValue(0.7);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 550, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.25, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, still]);
  return <Animated.View style={[styles.dot, { opacity: v }]} />;
}

/** Everything a card's buttons need, passed as one object so a new card cannot forget half of it. */
interface Handoff {
  onPreview: () => void;
  onStart: () => void;
  onSave: () => void;
  /** "Save for later" everywhere except a multi-week block, which goes to the Builder to be finished. */
  saveLabel: string;
}

function TurnView({
  turn,
  answer,
  onChip,
  handoff,
}: {
  turn: Turn;
  /** §6 — what the athlete answered the question above with, so the chosen control reads as chosen. */
  answer?: string | null;
  onChip: (c: Chip) => void;
  handoff: Handoff;
}) {
  switch (turn.kind) {
    case 'me':
      return <MeTurn text={turn.text} at={turn.at} />;

    /* Reached only by a stored thread whose Holt line lost its grouping — `layOut` renders every live
       one as a `HoltTurn`. Kept so a turn can never render as nothing. */
    case 'holt':
      return <HoltLine text={turn.text} />;

    case 'chips':
      return <Answers chips={turn.chips} ctl={turn.ctl} answer={answer ?? null} onChip={onChip} />;

    case 'program':
      return (
        <ProgramCardView
          card={turn.card}
          onPreview={handoff.onPreview}
          onStart={handoff.onStart}
          onSave={handoff.onSave}
          saveLabel={handoff.saveLabel}
        />
      );

    case 'day':
      return <DayCardView card={turn.card} onPreview={handoff.onPreview} onStart={handoff.onStart} onSave={handoff.onSave} />;

    case 'pick':
      return <PickCardView card={turn.card} onChip={onChip} />;

    case 'refusal':
      return <RefusalCardView card={turn.card} onChip={onChip} />;

    case 'explain':
      return <ExplainerView name={turn.name} />;

    case 'stop':
      /* Anything medical stops flat. Recessed and quiet — NO red, because nothing has gone wrong. */
      return (
        <View style={styles.stop}>
          <Text style={styles.stopKicker}>{STOP_KICKER}</Text>
          <Text style={styles.stopText}>{turn.text}</Text>
        </View>
      );

    case 'error':
      /* The ONE place red appears. A refusal is Holt deciding; this is the app failing, and conflating
         the two would make him look arbitrary. */
      return (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>{turn.text}</Text>
          <Text style={styles.errorSub}>{turn.sub}</Text>
          <Text style={styles.errorAction}>{turn.action}</Text>
        </View>
      );

    case 'saved':
      return (
        <View style={styles.saved}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 6L9 17l-5-5" />
          </Svg>
          <Text style={styles.savedText}>{turn.text}</Text>
        </View>
      );

    case 'wall':
      return (
        <View style={styles.wall}>
          <Text style={styles.wallTitle}>{WALL.title}</Text>
          <Text style={styles.wallBody}>{WALL.body}</Text>
          <Button variant="primary" fullWidth accessibilityLabel={WALL.primary}>
            {WALL.primary}
          </Button>
          <Button variant="text" fullWidth accessibilityLabel={WALL.secondary}>
            {WALL.secondary}
          </Button>
        </View>
      );

    default:
      return null;
  }
}

/**
 * The answers to one question — **layer 2 of Coach Holt Chat v2: the question picks the control.**
 *
 * Every answer used to be the same wrap of pills, which is what made the screen read as a form rather
 * than a conversation. The shape now carries meaning, and `chat-core`'s `CONTROL_FOR` decides it, so
 * this component holds no opinion about which question gets what.
 *
 * ⚠ `ctl` ABSENT MEANS `chips`. The openers, the help menu and the edit flow all emit bare chip turns
 * and must keep rendering exactly as they do — this is additive by construction, not by care.
 */
function Answers({
  chips,
  ctl,
  answer,
  onChip,
}: {
  chips: Chip[];
  ctl?: QuestionControl;
  /** The label the athlete went with, once they have. §6's selected state, read off the thread. */
  answer?: string | null;
  onChip: (c: Chip) => void;
}) {
  const chosen = (c: Chip) => answer != null && c.label === answer;

  /* The two questions you answer more than once — see `CONTROL_FOR.day_focus` / `.limits`. */
  if (ctl === 'multi') return <MultiAnswers chips={chips} answer={answer ?? null} onChip={onChip} />;
  if (ctl === 'multi_limits') return <MultiLimitAnswers chips={chips} answer={answer ?? null} onChip={onChip} />;

  /* An ordered scale — 2·3·4·5·6 days, 30·45·60·75 minutes. A ROW, left to right, because the order is
     the information; wrapped pills throw that away and a stepper hides the range. Equal widths so no
     option looks weightier than its neighbour. */
  if (ctl === 'segmented') {
    return (
      <View style={styles.segRow}>
        {chips.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => onChip(c)}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityState={{ selected: chosen(c) }}
            style={({ pressed }) => [styles.seg, (pressed || chosen(c)) && styles.ctlOn]}
          >
            <Text style={[styles.segText, chosen(c) && styles.segTextOn]} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  /* A choice that needs a sentence to be fair. "A year or two, on and off" is not a pill, and reducing
     it to one would make the athlete guess what they were agreeing to. Full width, title over sub. */
  if (ctl === 'cards') {
    return (
      <View style={styles.cardCol}>
        {chips.map((c) => {
          // The copy already carries its own qualifier after an em dash; split it rather than rewriting
          // the voice bank, so Holt's words stay Holt's.
          const [title, sub] = splitCardLabel(c.label);
          return (
            <Pressable
              key={c.label}
              onPress={() => onChip(c)}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              accessibilityState={{ selected: chosen(c) }}
              style={({ pressed }) => [styles.optCard, (pressed || chosen(c)) && styles.ctlOn]}
            >
              <View style={styles.optCardText}>
                <Text style={[styles.optCardTitle, chosen(c) && styles.ctlTextOn]}>{title}</Text>
                {sub ? <Text style={styles.optCardSub}>{sub}</Text> : null}
              </View>
              {/* ⚠ ROUND = PICK ONE. §6 hangs the whole rule on the indicator's shape, so a circle here
                  and a square on the grid is a promise about how many answers are allowed. */}
              <View style={[styles.optDot, chosen(c) && styles.optDotOn]}>{chosen(c) ? <Tick size={10} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  /* Places and kit — two columns, a little taller than a chip. Same idea as `chips`; the wider cell
     exists because equipment names are longer than intentions are. */
  if (ctl === 'grid') {
    return (
      <View style={styles.gridWrap}>
        {chips.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => onChip(c)}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityState={{ selected: chosen(c) }}
            style={({ pressed }) => [styles.gridCell, (pressed || chosen(c)) && styles.ctlOn]}
          >
            <Text style={[styles.gridText, chosen(c) && styles.ctlTextOn]} numberOfLines={2}>{c.label}</Text>
            <View style={[styles.optSquare, chosen(c) && styles.optDotOn]}>{chosen(c) ? <Tick size={9} /> : null}</View>
          </Pressable>
        ))}
      </View>
    );
  }

  /* Bringing something in is an ACT, not a selection — and it leaves the conversation. So: action rows
     with a chevron, the shape the rest of the app uses for "this takes you somewhere". */
  if (ctl === 'imports') {
    return (
      <View style={styles.cardCol}>
        {chips.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => onChip(c)}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            style={({ pressed }) => [styles.importRow, pressed && styles.ctlOn]}
          >
            <Text style={styles.importText}>{c.label}</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 5l7 7-7 7" />
            </Svg>
          </Pressable>
        ))}
      </View>
    );
  }

  /* The default, and what every question used to be: a set of unlike things, two to a row. */
  return (
    <View style={styles.chipGrid}>
      {chips.map((c) => (
        <Pressable
          key={c.label}
          onPress={() => onChip(c)}
          accessibilityRole="button"
          accessibilityLabel={c.label}
          accessibilityState={{ selected: chosen(c) }}
          style={({ pressed }) => [styles.chipCell, (pressed || chosen(c)) && styles.ctlOn]}
        >
          <Text style={[styles.chipCellText, chosen(c) && styles.ctlTextOn]} numberOfLines={1}>{c.label}</Text>
          {chosen(c) ? <Tick size={13} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * ══ THE ONE CONTROL THAT COLLECTS BEFORE IT ANSWERS ══
 *
 * PO: *"I should be able to select multiple to have him build the template."* Every other question on
 * this surface advances on the tap, which is right when the answer is one thing. "What are we training?"
 * is not one thing — chest and triceps and a bit of conditioning is a single answer with three parts —
 * so this one gathers and waits for a deliberate "Build it".
 *
 * ⚠ **THE SPLIT/PARTS RULE IS `toggleFocus`'s, NOT THIS COMPONENT'S.** Tapping Push after Chest replaces
 * rather than merges, because "Push" already contains a chest movement and quietly combining them would
 * spend a third of the session's budget pressing. That belongs somewhere `node --test` can prove it.
 *
 * ⚠ AND IT IS SQUARE INDICATORS THROUGHOUT (§6): round means pick one, square means pick many. The shape
 * is the promise about how many answers are allowed, so it has to be right before the first tap.
 */
function MultiAnswers({ chips, answer, onChip }: { chips: Chip[]; answer: string | null; onChip: (c: Chip) => void }) {
  const [picks, setPicks] = useState<FocusPick[]>([]);
  /* Once answered, the turn is history: it shows what was chosen and does not invite a second go. */
  const settled = answer != null;
  const on = (c: Chip) =>
    settled ? (answer ?? '').split(', ').includes(c.label) : c.focus != null && hasFocus(picks, c.focus);

  const build = () => {
    const focus = mergeFocus(picks);
    if (!focus) return;
    /* The label IS the transcript line, so it reads back as what they picked rather than as a shape
       nobody chose: "Chest, Triceps, Cardio". Drawn in the pills' own order, not the tapping order,
       for the same reason `mergeFocus` sorts: the same three taps must read back the same way. */
    const label = chips.filter((c) => c.focus && hasFocus(picks, c.focus)).map((c) => c.label).join(', ');
    onChip({ label, patch: { dayFocus: focus } });
  };

  return (
    <View style={styles.multiWrap}>
      <View style={styles.chipGrid}>
        {chips.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => (settled || !c.focus ? undefined : setPicks((p) => toggleFocus(p, c.focus!)))}
            disabled={settled}
            accessibilityRole="checkbox"
            accessibilityLabel={c.label}
            accessibilityState={{ checked: on(c), disabled: settled }}
            style={({ pressed }) => [styles.chipCell, (on(c) || pressed) && styles.ctlOn]}
          >
            <Text style={[styles.chipCellText, on(c) && styles.ctlTextOn]} numberOfLines={1}>{c.label}</Text>
            <View style={[styles.optSquare, on(c) && styles.optDotOn]}>{on(c) ? <Tick size={9} /> : null}</View>
          </Pressable>
        ))}
      </View>
      {/* Absent once answered, and absent until something is picked — a Build button that refuses is a
          button that lies about being ready. */}
      {settled || picks.length === 0 ? null : (
        <Button variant="primary" fullWidth onPress={build} accessibilityLabel="Build it">
          {picks.length === 1 ? 'Build it' : `Build these ${picks.length}`}
        </Button>
      )}
    </View>
  );
}

/**
 * "Anything I should work around?" — collect every one of them, then build.
 *
 * The sibling of `MultiAnswers`, and a separate component on purpose: that one runs body parts and
 * splits through `mergeFocus`, where picking "Push" has to clear "Chest". Limitations have no such
 * rule — a shoulder and a knee are simply both true — so the commit here is the list itself.
 *
 * ⚠ SELECTION IS READ OFF THE CHIP'S OWN PATCH, with no new field on `Chip`. Every limitation chip
 * already carries `{ limitations: [one] }`; the "Nothing — build it" chip carries `{ limitations: [] }`
 * and is therefore the one that commits on the tap, which is exactly right — "nothing" is a complete
 * answer and making the athlete confirm it would be asking twice.
 */
function MultiLimitAnswers({ chips, answer, onChip }: { chips: Chip[]; answer: string | null; onChip: (c: Chip) => void }) {
  const [picks, setPicks] = useState<string[]>([]);
  /* Once answered, the turn is history: it shows what was chosen and does not invite a second go. */
  const settled = answer != null;
  /** The single limitation a chip stands for, or null for "Nothing — build it". */
  const limitOf = (c: Chip): string | null => {
    const l = c.patch.limitations;
    return l && l.length === 1 ? l[0] : null;
  };
  const on = (c: Chip) => (settled ? (answer ?? '').split(', ').includes(c.label) : picks.includes(c.label));

  const build = () => {
    /* Drawn in the CHIPS' order, not the tapping order — the same three taps must read back the same
       way, which is the rule `mergeFocus` sorts for on the focus question. */
    const picked = chips.filter((c) => limitOf(c) != null && picks.includes(c.label));
    const limitations = picked.map((c) => limitOf(c)!) as Limitation[];
    onChip({ label: picked.map((c) => c.label).join(', '), patch: { limitations } });
  };

  return (
    <View style={styles.multiWrap}>
      <View style={styles.chipGrid}>
        {chips.map((c) => {
          const one = limitOf(c);
          return (
            <Pressable
              key={c.label}
              /* "Nothing" still answers on the tap; a named complaint collects and waits. */
              onPress={() =>
                settled
                  ? undefined
                  : one == null
                    ? onChip(c)
                    : setPicks((p) => (p.includes(c.label) ? p.filter((x) => x !== c.label) : [...p, c.label]))
              }
              disabled={settled}
              accessibilityRole={one == null ? 'button' : 'checkbox'}
              accessibilityLabel={c.label}
              accessibilityState={one == null ? { disabled: settled } : { checked: on(c), disabled: settled }}
              style={({ pressed }) => [styles.chipCell, (on(c) || pressed) && styles.ctlOn]}
            >
              <Text style={[styles.chipCellText, on(c) && styles.ctlTextOn]} numberOfLines={1}>{c.label}</Text>
              {one == null ? null : (
                <View style={[styles.optSquare, on(c) && styles.optDotOn]}>{on(c) ? <Tick size={9} /> : null}</View>
              )}
            </Pressable>
          );
        })}
      </View>
      {settled || picks.length === 0 ? null : (
        <Button variant="primary" fullWidth onPress={build} accessibilityLabel="Build it">
          {picks.length === 1 ? 'Build around it' : `Build around these ${picks.length}`}
        </Button>
      )}
    </View>
  );
}

/** §6's check — bronze-bright, and drawn only when a control is actually chosen. */
function Tick({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

/** `"Beginner — new to lifting"` → `['Beginner', 'new to lifting']`. No dash → title only. */
function splitCardLabel(label: string): [string, string | null] {
  const i = label.indexOf('—');
  return i < 0 ? [label, null] : [label.slice(0, i).trim(), label.slice(i + 1).trim()];
}

/**
 * Holt types. §6.3–6.4: ~42ms a character, with a solid bronze block caret that vanishes the moment the
 * line ends.
 *
 * ⚠ WITHOUT THIS THE SURFACE IS A FORM. The handoff's build order stops at the conversation and says so
 * plainly: "if the conversation does not already feel like a person at this point, the cards will not
 * save it." Text that simply appears is a label; text that arrives is somebody talking.
 *
 * §6.7 — the container is NOT a live region. Streaming characters to a screen reader would read the
 * sentence out one letter at a time. The finished line is announced once, when it is finished.
 */
function HoltLine({ text }: { text: string; live?: boolean }) {
  return <Text style={styles.holtText}>{text}</Text>;
}

/**
 * A card is FORGED STEEL, never a flat gray rectangle.
 *
 * ⚠ THIS IS WHAT WAS MISSING. The first pass painted every surface with a flat `backgroundColor`, which
 * is precisely what `foundation.css` says the system never does: each surface carries a faint
 * top-to-bottom gradient and an inset top highlight, as if catching light along its upper edge. Flat
 * fills are why the screen read as a wireframe of the design rather than the design.
 *
 * `flGradient` and `flShadow.missionCard` already existed — the tokens were there the whole time.
 */
function CardSurface({ children, hero = false }: { children: React.ReactNode; hero?: boolean }) {
  return (
    <LinearGradient
      // §11.1.1 — surface-ELEVATED, a step brighter than a list card. It is the object the whole
      // conversation was building toward and it should sit above everything around it.
      colors={SURFACE_ELEVATED}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.card, hero ? styles.cardHero : styles.cardSoft]}
    >
      {children}
    </LinearGradient>
  );
}

/**
 * The whole plan, read-only, before anything can be changed.
 *
 * ⚠ WHY THIS SITS BETWEEN THE CARD AND THE BUILDER (PO, 2026-08-09).
 *
 * The card is a summary and the Builder is an editor, and the athlete asked for the step in between:
 * *"so I can see the whole thing to know if I need adjustments."* Sending them from a summary straight
 * into the editing tool makes the review step and the editing step the same step — and you cannot judge
 * a block from inside the thing for altering it, because everything is a control and nothing is a
 * statement.
 *
 * So: every week, every day, every movement. Then `Final touches`.
 *
 * ⚠ AND IT SHOWED NONE OF THAT UNTIL 2026-08-16. The comment above has said "every day, every movement"
 * since the screen landed; the body rendered `w.label` and `w.detail` and stopped, so the athlete got
 * eight rows reading "5 sessions" and no way to reach a single lift. PO: *"It shows the weeks, but I
 * need to be able to see the days and what's within the days."* The days were missing from the DATA
 * (`ProgramCard.weeks[].days` carried no movements) — the same shape as the drill-down defect on the
 * card itself, one layer down.
 *
 * ⚠ "NOTHING TAPPABLE" MEANT NO EDITING CONTROLS, AND STILL DOES. That line was about the difference
 * between this screen and the Builder — *"you cannot judge a block from inside the thing for altering
 * it"* — not a ban on disclosure. Holt writes `vary: true` always, so eight weeks are eight genuinely
 * different weeks: at five sessions and five or six movements each that is upwards of 240 rows, and a
 * flat wall of them is not a thing anyone can read either. Weeks collapse. **Week one opens by
 * default**, so the substance is on screen without the athlete having to discover the affordance —
 * which is the state the PO was actually complaining about.
 */
function PlanPreview({
  program,
  day,
  onBack,
  onStart,
  onSecondary,
  secondaryLabel,
}: {
  program?: ProgramCard;
  day?: DayCard;
  onBack: () => void;
  /**
   * ⚠ READING THE PLAN HAS TO BE ABLE TO END IN AGREEMENT.
   *
   * This screen used to close with one button — "Final touches" — which opens the Builder. Holt's own
   * introduction asks the athlete to read every week before anything is saved, so the athlete who does
   * exactly that arrived at the bottom and was offered an AUTHORING TOOL as the only way forward. To
   * start the thing they had just approved they had to go back and find the card again.
   *
   * That is a bad ending for anyone and a worse one for a beginner, who has no basis for "adjusting" a
   * program and reads the offer as a hint that something is wrong with it.
   */
  onStart: () => void;
  /**
   * The second door, which is not the same door for everybody — "Final touches" opens the Builder, and a
   * beginner is offered "Ask me again" instead, for the reason spelled out beside `handoff`.
   *
   * ⚠ THE HANDLER AND THE LABEL ARRIVE TOGETHER, AND THE PROP IS NOT CALLED `onOpenBuilder` ANY MORE.
   * It was, and passing a rebuild through a prop named for the Builder is precisely how a button ends up
   * promising one thing and doing another. Both come from the caller so the card and this screen cannot
   * offer the same athlete different things.
   */
  onSecondary: () => void;
  secondaryLabel: string;
}) {
  /* 22 was a guess at the home indicator, made before this screen had insets. On a phone with a taller
     indicator the Final-touches button sat under it; on one with none, it floated. */
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.previewWrap}>
      <View style={styles.previewBar}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to the conversation" style={styles.previewBack}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </Pressable>
        <Text style={styles.previewTitle} numberOfLines={1}>
          {program?.title ?? day?.title ?? 'Your plan'}
        </Text>
      </View>

      <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewInner}>
        <View style={styles.draftBanner}>
          <Text style={styles.draftBannerText}>DRAFT — NOT SAVED YET</Text>
        </View>

        {program ? (
          <>
            <View style={styles.statGrid}>
              {program.stats.map((st) => (
                <View key={st.label} style={styles.stat}>
                  <Text style={styles.statValue}>{st.value}</Text>
                  <Text style={styles.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.reasoning}>{program.reasoning}</Text>
            <View style={styles.weekList}>
              {program.weeks.map((w, i) => (
                <PreviewWeek key={w.label} week={w} defaultOpen={i === 0} />
              ))}
            </View>
          </>
        ) : null}

        {day ? (
          <View style={styles.dayList}>
            {day.rows.map((r, i) => (
              <View key={r.name + i} style={styles.dayRow}>
                <Text style={styles.dayName}>{r.name}</Text>
                <Text style={styles.dayPrescription}>{r.prescription}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.previewActions, { paddingBottom: 12 + insets.bottom }]}>
        <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel="Start this plan">
          Start it
        </Button>
        {/* Demoted, not removed — the athlete who came here to change something still has the door, it
            is simply no longer the only one. */}
        <Button variant="secondary" fullWidth onPress={onSecondary} accessibilityLabel={secondaryLabel}>
          {secondaryLabel}
        </Button>
      </View>
    </View>
  );
}

/**
 * One week of the preview, opened onto its sessions and every movement in them.
 *
 * The card's `WeekRow` opens onto session TITLES, because the card is a summary and a twelve-week block
 * would otherwise bury the two buttons that decide anything. This is the other screen — the one whose
 * entire job is the full read — so it goes one level deeper and states the prescriptions.
 *
 * The row shape under a day is the design's own DAY CARD row: name left, scheme right, tabular figures
 * so the column lines up (§11.2.4/11.2.6). Reusing `dayRow`/`dayName`/`dayPrescription` rather than
 * inventing a third row style is deliberate — a prescription should look the same everywhere it is read.
 */
function PreviewWeek({ week, defaultOpen }: { week: ProgramCard['weeks'][number]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const has = week.days.length > 0;

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        disabled={!has}
        accessibilityRole={has ? 'button' : undefined}
        accessibilityLabel={`${week.label} — ${week.detail}`}
        accessibilityState={has ? { expanded: open } : undefined}
        style={styles.weekRow}
      >
        <Text style={styles.weekLabel}>{week.label}</Text>
        <View style={styles.weekRight}>
          <Text style={styles.weekDetail}>{week.detail}</Text>
          {/* No chevron on a week with nothing to open — an endurance block's weeks are mileage, not
              named sessions, and an affordance that does nothing is worse than none. */}
          {has ? (
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {open ? <Path d="M18 15l-6-6-6 6" /> : <Path d="M6 9l6 6 6-6" />}
            </Svg>
          ) : null}
        </View>
      </Pressable>

      {open && has ? (
        <View style={styles.previewDays}>
          {week.days.map((d, i) => (
            <View key={d.marker + i} style={styles.previewDay}>
              <View style={styles.previewDayHead}>
                <Text style={styles.previewDayMarker}>{d.marker}</Text>
                <Text style={styles.previewDayTitle} numberOfLines={1}>{d.title}</Text>
              </View>
              {d.items.length ? (
                d.items.map((it, j) => (
                  <View key={it.name + j} style={styles.dayRow}>
                    <Text style={styles.dayName}>{it.name}</Text>
                    {/* An empty scheme renders as nothing rather than as a guess — see `daysOfWeek`. */}
                    {it.scheme ? <Text style={styles.dayPrescription}>{it.scheme}</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={styles.previewDayEmpty}>Nothing prescribed</Text>
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The banner. Rule 03, and not decoration — a card that looked saved and was not would be the single
 * worst thing this surface could do.
 */
function DraftBanner() {
  return (
    <View style={styles.draftBanner}>
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={4} y={10.5} width={16} height={10} rx={2} />
        <Path d="M8 10.5V7a4 4 0 018 0" />
      </Svg>
      <Text style={styles.draftBannerText}>DRAFT — NOT SAVED YET</Text>
    </View>
  );
}

/**
 * ══ THE ARTIFACT — §7, four bands ══
 *
 * The most important object on the surface, and every figure on it came out of the engine.
 *
 * Draft strip · title block over the warm wash · the block's rows · the way into the full read. The
 * design is explicit that *"reading the object happens inside the card; deciding about it happens
 * outside"* — so `Preview program` is a row within the card, and the two decisions are buttons beneath
 * it.
 *
 * ⚠ **THE WEEKS ARE NO LONGER HIDDEN BEHIND A TAP.** They were the card's body doubling as a button,
 * which is an affordance nobody discovers and the reason the ribbon caption had to end with "Tap to walk
 * the weeks". §7 draws the rows as a band, so they are one.
 *
 * ⚠ **AND "NOT THIS" IS GONE RATHER THAN REDRAWN.** It had no `onPress` and never had — a button that
 * was a picture of a button. What it meant is now covered honestly: read it in full, save it, or start
 * it.
 */
function ProgramCardView({
  card,
  onPreview,
  onStart,
  onSave,
  saveLabel,
}: {
  card: ProgramCard;
  onPreview: () => void;
  onStart: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <View style={styles.artifactWrap}>
      <CardSurface hero>
        <DraftBanner />
        <View style={styles.titleBlock}>
          {/* The warm wash the hero card carries over its top edge — `--fl-card-hero-wash`. */}
          <LinearGradient
            colors={flGradient.missionCardWash.colors}
            locations={flGradient.missionCardWash.locations}
            start={flGradient.missionCardWash.start}
            end={flGradient.missionCardWash.end}
            style={styles.heroWash}
            pointerEvents="none"
          />
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
        </View>

        <View style={styles.artifactBody}>
          <View style={styles.statGrid}>
            {card.stats.map((st) => (
              <View key={st.label} style={styles.stat}>
                <Text style={styles.statValue}>{st.value}</Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {card.ribbon.length > 1 ? <VolumeRibbon weeks={card.ribbon} caption={card.ribbonCaption} /> : null}

          {/* §7's rows band — a bronze marker in a 32px column, then what that week actually is. */}
          <View style={styles.markerList}>
            {card.weeks.map((w) => (
              <WeekRow key={w.label} week={w} />
            ))}
            <View style={styles.markerClosing}>
              <Text style={styles.markerClosingText}>{card.closing}</Text>
            </View>
          </View>

          <Text style={styles.reasoning}>{card.reasoning}</Text>
        </View>

        {/* ⚠ PREVIEW FIRST, BUILDER SECOND (PO, 2026-08-09). The card is a summary and the athlete asked
            to see the WHOLE thing before deciding whether it needs changing. Sending them straight to
            the Builder made the review step the editing step, which is the wrong order: you cannot judge
            a block from inside the tool for altering it. */}
        <Pressable
          onPress={onPreview}
          accessibilityRole="button"
          accessibilityLabel="Preview the whole program"
          style={({ pressed }) => [styles.previewRow, pressed && styles.previewRowPressed]}
        >
          <Text style={styles.previewRowText}>Preview program</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 6l6 6-6 6" />
          </Svg>
        </Pressable>
      </CardSurface>

      <ArtifactActions onStart={onStart} onSave={onSave} saveLabel={saveLabel} />
    </View>
  );
}

/**
 * One week of the block, and the sessions inside it.
 *
 * ⚠ **THE DAYS WERE NOT MISSING FROM THE UI, THEY WERE MISSING FROM THE CARD.** PO: *"be sure that we
 * can see each individual day in a drop down from the week. It won't show them right now."* The row
 * carried the string `"4 sessions"` — a count, composed for display — so there was nothing to open onto.
 * `ProgramCard.weeks[].days` now carries the real sessions, read per week off the structure the engine
 * built.
 *
 * Closed by default: a twelve-week block is twelve rows, and opening all of them by default would put
 * sixty lines between the athlete and the two buttons that decide anything.
 */
function WeekRow({ week }: { week: ProgramCard['weeks'][number] }) {
  const [open, setOpen] = useState(false);
  const has = week.days.length > 0;

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        disabled={!has}
        accessibilityRole={has ? 'button' : undefined}
        accessibilityLabel={`${week.label} — ${week.detail}`}
        accessibilityState={has ? { expanded: open } : undefined}
        style={({ pressed }) => [styles.markerRow, pressed && has && styles.markerRowPressed]}
      >
        <Text style={styles.marker}>{week.label.replace(/^Week /, 'WK ')}</Text>
        <Text style={styles.markerText}>{week.detail}</Text>
        {/* No chevron on a week with nothing to open — an affordance that does nothing is worse than
            none, and an endurance block's weeks are mileage rather than named sessions. */}
        {has ? (
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {open ? <Path d="M18 15l-6-6-6 6" /> : <Path d="M6 9l6 6 6-6" />}
          </Svg>
        ) : null}
      </Pressable>
      {open ? (
        <View style={styles.dayDrop}>
          {week.days.map((d, i) => (
            <View key={d.marker + i} style={styles.dayDropRow}>
              <Text style={styles.dayDropMarker}>{d.marker}</Text>
              <Text style={styles.dayDropTitle} numberOfLines={1}>{d.title}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The two decisions, outside the card (§7).
 *
 * PO decision, this session: `Start it now` / `Save for later`, and what each MEANS depends on what was
 * built — a program hands over to the Builder, a week becomes a week template, a day becomes a workout
 * template. The design system's own Button for both; rolling my own Pressable is what lost the
 * forged-bronze fill, the machined rim and the glow.
 */
function ArtifactActions({ onStart, onSave, saveLabel }: { onStart: () => void; onSave: () => void; saveLabel: string }) {
  return (
    <View style={styles.artifactActions}>
      <View style={styles.ctaGrow}>
        <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel="Start it now">
          Start it now
        </Button>
      </View>
      <Button variant="text" onPress={onSave} accessibilityLabel={saveLabel}>
        {saveLabel}
      </Button>
    </View>
  );
}

function DayCardView({
  card,
  onPreview,
  onStart,
  onSave,
}: {
  card: DayCard;
  onPreview: () => void;
  onStart: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.artifactWrap}>
      <CardSurface>
        <DraftBanner />
        <View style={styles.titleBlock}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSubtitle}>{card.kicker.split(' · ').join(' · ').toLowerCase()}</Text>
        </View>
        <View style={styles.artifactBody}>
          <View style={styles.dayList}>
            {card.rows.map((r, i) => (
              <View key={r.name + i} style={styles.dayRow}>
                <Text style={styles.dayName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.dayPrescription}>{r.prescription}</Text>
              </View>
            ))}
          </View>
        </View>
        <Pressable
          onPress={onPreview}
          accessibilityRole="button"
          accessibilityLabel="Preview the whole session"
          style={({ pressed }) => [styles.previewRow, pressed && styles.previewRowPressed]}
        >
          <Text style={styles.previewRowText}>Preview session</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 6l6 6-6 6" />
          </Svg>
        </Pressable>
      </CardSurface>
      <ArtifactActions onStart={onStart} onSave={onSave} saveLabel="Save for later" />
    </View>
  );
}

/**
 * The counter-offer. Bronze and recessed — no red, no warning icon, no apology. This is Holt being
 * right, and the alternative is framed as the better plan rather than a consolation.
 *
 * ⚠ **BOTH BUTTONS WERE DEAD AND ARE NOW WIRED.** They rendered with no `onPress` at all, which made the
 * one card whose entire purpose is *"the alternative is a thing with a button"* the one card whose
 * buttons did nothing. `altGoal` on the card is what made the primary possible: the label was a
 * sentence, and a sentence is not a goal key.
 */
/**
 * ══ A PROGRAM HOLT DID NOT WRITE ══
 *
 * Deliberately NOT the `ProgramCardView` treatment. That card is an artifact — weeks, days, every
 * movement, and buttons that start or save something Holt just built out of the athlete's answers. This
 * one names an authored, shipped program and sends them to its own screen to read it.
 *
 * ⚠ **THE CAVEATS RENDER AT THE SAME WEIGHT AS THE REASONS, NOT AS SMALL PRINT.** They are the honest
 * half of a recommendation — the days that do not match, the rung that is a stretch, the kit the block
 * assumes — and a card that whispered them would be the app asserting a fit it did not achieve. The
 * project's own standing lesson is about exactly this shape: a confident, specific, false claim about
 * the athlete is worse than no claim at all.
 *
 * ⚠ **AND THERE IS NO NUMBER ON IT.** `Recommendation.score` orders the shelf and never leaves the
 * domain — a percentage would invite the comparison this whole flow exists to spare somebody.
 */
function PickCardView({ card, onChip }: { card: PickCard; onChip: (c: Chip) => void }) {
  return (
    <View style={styles.pickCard}>
      <Text style={styles.kickerBronze}>{card.kicker}</Text>
      <View style={styles.pickHead}>
        <Text style={styles.pickTitle}>{card.title}</Text>
        <Text style={styles.pickMeta}>{card.subtitle}</Text>
      </View>

      {/* The program's own authored aims, in its author's words — the best copy the catalogue owns. */}
      {card.aims.length > 0 ? (
        <View style={styles.pickAims}>
          {card.aims.map((a) => (
            <Text key={a} style={styles.pickAim}>
              {a}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.pickReasons}>
        {card.because.map((b) => (
          <View key={b} style={styles.pickReasonRow}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 6L9 17l-5-5" />
            </Svg>
            <Text style={styles.pickReason}>{b}</Text>
          </View>
        ))}
        {card.caveats.map((c) => (
          <View key={c} style={styles.pickReasonRow}>
            {/* An open circle, not a warning triangle. Nothing has gone wrong — these are the terms. */}
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" />
            </Svg>
            <Text style={styles.pickCaveat}>{c}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardActions}>
        <View style={styles.ctaGrow}>
          {/* ⚠ "SEE THE PROGRAM", NOT "START IT". Program Detail is where a block is read, adopted and
              charged against the plan cap — routing straight into an adopt would take a decision the
              athlete has not made yet, off a card they have had for four seconds. */}
          <Button
            variant="primary"
            fullWidth
            onPress={() => onChip({ label: 'See the program', patch: {}, goTo: `/program/${card.programId}` })}
            accessibilityLabel={`See ${card.title}`}
          >
            See the program
          </Button>
        </View>
        <Button
          variant="text"
          onPress={() => onChip({ label: 'Write me one instead', patch: {}, startsBuild: true })}
          accessibilityLabel="Have Coach Holt write a program instead"
        >
          Write me one
        </Button>
      </View>

      {/* The runner-up is a row, not a second card. It exists so the recommendation reads as a CHOICE
          rather than an instruction — and it is absent whenever nothing else was genuinely in contention,
          because a distant second is filler dressed as an option. */}
      {card.runnerUpName && card.runnerUpId ? (
        <Pressable
          onPress={() => onChip({ label: card.runnerUpName!, patch: {}, goTo: `/program/${card.runnerUpId}` })}
          accessibilityRole="button"
          accessibilityLabel={`Or look at ${card.runnerUpName}`}
          style={({ pressed }) => [styles.pickAlt, pressed && styles.homeRowPressed]}
        >
          <Text style={styles.pickAltLabel}>
            Or have a look at <Text style={styles.pickAltName}>{card.runnerUpName}</Text>
          </Text>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round">
            <Path d="M9 6l6 6-6 6" />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}

function RefusalCardView({ card, onChip }: { card: RefusalCard; onChip: (c: Chip) => void }) {
  return (
    <View style={styles.refusalCard}>
      <Text style={styles.kickerBronze}>WHAT I&rsquo;D BUILD INSTEAD</Text>
      <View style={styles.refusalHead}>
        <Text style={styles.refusalTitle}>{card.title}</Text>
        <Text style={styles.refusalMeta}>{card.meta}</Text>
      </View>
      <Text style={styles.refusalBody}>{card.body}</Text>
      <View style={styles.cardActions}>
        <View style={styles.ctaGrow}>
          <Button
            variant="primary"
            fullWidth
            onPress={() => onChip({ label: card.primary, patch: { goal: card.altGoal } })}
            accessibilityLabel={card.primary}
          >
            {card.primary}
          </Button>
        </View>
        {/* Back to the distances. `picksRace` is the same flag "Run a race" carries — it NARROWS the
            question rather than answering it, so the engine is never handed a distance nobody chose. */}
        <Button
          variant="text"
          onPress={() => onChip({ label: card.secondary, patch: { goal: undefined }, picksRace: true })}
          accessibilityLabel={card.secondary}
        >
          {card.secondary}
        </Button>
      </View>
    </View>
  );
}

/** A pointer, not a rewrite — 735 exercises already carry published coaching content. */
function ExplainerView({ name }: { name: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + name} style={styles.explain}>
      <View style={styles.explainIcon}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
          <Path d="M10 8.5l6 3.5-6 3.5z" />
        </Svg>
      </View>
      <View style={styles.explainText}>
        <Text style={styles.explainName}>{name}</Text>
        <Text style={styles.explainSub}>Setup · cues · common mistakes</Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round">
        <Path d="M9 6l6 6-6 6" />
      </Svg>
    </Pressable>
  );
}

/**
 * THE BLOCK'S REAL SHAPE, and the design's best idea.
 *
 * One bar per week, each the actual weekly mileage `weeklyVolumePlan` produced. The every-fourth-week
 * cutback dips and the taper falls away BEFORE a word has been read — the athlete sees that the block
 * has a shape, and that the shape was deliberate, in about a second.
 *
 * Drawn from the engine's own numbers rather than anything decorative: if the ribbon and the plan could
 * disagree, the ribbon would be a picture of a plan that does not exist.
 */
function VolumeRibbon({ weeks, caption }: { weeks: number[]; caption: string }) {
  const peak = Math.max(...weeks, 1);
  const peakAt = weeks.indexOf(peak);
  return (
    <View style={styles.ribbonWrap}>
      <View style={styles.ribbon}>
        {weeks.map((mi, i) => {
          /* §11.1.8 — colour carries the week's ROLE, which is what makes the shape readable at a
             glance: a cutback is visibly a step back, the peak is unmistakable, and the taper reads as
             a deliberate descent rather than the plan running out. */
          const previous = weeks[i - 1] ?? 0;
          const role =
            i === peakAt ? styles.barPeak : mi < previous ? styles.barDown : mi > peak * 0.8 ? styles.barHeavy : null;
          return (
            <View
              key={i}
              style={[styles.bar, { height: (Math.max(8, (mi / peak) * 100) + '%') as `${number}%` }, role]}
            />
          );
        })}
      </View>
      {caption ? <Text style={styles.ribbonCaption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 60 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: themeScrim('rgba(3,5,7,0.66)') },
  /* ⚠ A TOP INSET, NOT A MAX HEIGHT. PROMPT §2.4: 64px from the top "so a sliver of the app is always
     visible above it — this is the whole point." A percentage height looks similar on one device and
     wrong on every other. The geometry lives on the wrapper so the rise can transform it.

     Named because the thread's bottom reserve is measured against the sheet's height, and that height
     is `window - SHEET_TOP`. Two copies of 64 would silently disagree the day this moves. */
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: SHEET_TOP },
  sheet: {
    flex: 1,
    // 24, not the token's 16 — the design opens the sheet wider than a card corner on purpose.
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    // ⚠ BRONZE, not charcoal. The lit top edge is what makes it read as raised metal.
    borderColor: flColor.bronzeBorderSubtle,
    // The inset warm highlight along the top edge is half of what makes it read as raised metal.
    boxShadow: flShadow.sheet,
  },
  /* §1 — the only atmospheric layer on the surface, and it stops dead at 300px. */
  warmWash: { position: 'absolute', left: 0, right: 0, top: 0, height: 300 },
  grabWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: flColor.charcoal500 },
  /* ⚠ NO BOTTOM BORDER (§2). "Separation is spacing plus the warm wash. Do not add a rule." A hard line
     here turns the header into a toolbar and the sheet into a screen. */
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerText: { flex: 1, gap: 5 },
  headerName: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: 1.4, color: flColor.bronze400 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerStatus: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2.2, color: flColor.gray600 },
  /* The only green on this surface, and it is a liveness indicator rather than a palette colour. */
  headerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: flColor.statusOnline, boxShadow: flShadow.statusOnlineGlow },
  headerAction: { alignItems: 'center', gap: 5 },
  headerActionPad: { paddingLeft: 12 },
  headerActionLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600 },
  headerActionLabelOn: { color: flColor.bronze300 },

  /* §2's popover. Anchored under NEW CHAT rather than centred — it belongs to that button. */
  menuScrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 5 },
  menu: {
    position: 'absolute',
    right: 52,
    top: 66,
    width: 224,
    zIndex: 6,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    overflow: 'hidden',
    boxShadow: flShadow.elevated,
  },
  menuRow: { paddingHorizontal: 15, paddingVertical: 13 },
  menuRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  menuRowPressed: { backgroundColor: bronzeWash(0.06) },
  menuText: { fontSize: 14, color: flColor.cream100 },

  /* ⚠ **`flexGrow: 0` PUT THE COMPOSER AT THE TOP OF THE SCREEN.** The list sized itself to its
     content, so one short line of introduction made it one line tall and the input rode up directly
     underneath it with the whole sheet empty below. It has to FILL, so the thread grows downward from
     the header and the composer stays pinned to the bottom edge where it is reachable with a thumb. */
  thread: { flex: 1 },
  /**
   * ⚠ `paddingBottom` IS APPLIED AT RENDER, NOT HERE — see `threadPad` in the component.
   *
   * It was a flat 8, which was right while a ~90px composer sat underneath. `TYPING_ENABLED` is false,
   * so the composer is not rendered, and 8 became the entire distance between the last answer chip and
   * the physical bottom of the phone — underneath the home indicator. Two separate things were missing:
   * a safe-area inset, and room to actually read the options.
   */
  threadInner: { paddingHorizontal: 16, paddingTop: 4, gap: 20 },

  /* ══ COACH HOME (§3) ══════════════════════════════════════════════════════════════════════════ */
  /* The greeting stack. Serif, then the sentence, then the quiet third — one paragraph in three
     weights, not three messages. */
  homeGreeting: { fontFamily: flFont.display, fontSize: 25, lineHeight: 30, fontWeight: '600', color: flColor.cream100 },
  homeLine: { fontSize: 16, lineHeight: 23, color: flColor.gray400 },
  homeSub: { fontSize: 14, lineHeight: 21, color: flColor.gray600 },

  home: { gap: 16, paddingTop: 4, paddingBottom: 4 },
  homeCards: { flexDirection: 'row', gap: 8 },
  homeCard: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 11, borderRadius: 14, gap: 9 },
  /* BUILD is the primary and the only card that carries a shadow — it is what Holt is for. */
  homeCardPrimary: {
    backgroundColor: bronzeWash(0.045),
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: flShadow.trainTogetherCard,
  },
  homeCardPlain: { backgroundColor: wash(0.028), borderWidth: 1, borderColor: wash(0.07) },
  homeCardPressed: { backgroundColor: bronzeWash(0.08), borderColor: flColor.bronzeBorderSubtle },
  homeTag: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.8, color: flColor.bronze400 },
  homeCardTitle: { fontSize: 13.5, fontWeight: '600', lineHeight: 17.5, color: flColor.cream100 },
  homeCardSub: { fontSize: 11, lineHeight: 15.5, color: flColor.gray600 },
  /* ⚠ `marginTop: auto` is load-bearing — it holds the three arrows on one baseline when the three subs
     wrap to different heights. The design names it explicitly. */
  homeArrow: { alignSelf: 'flex-end', marginTop: 'auto', paddingTop: 8 },

  /* The two quiet rows: a stacked pair, not cards. Rules top and bottom rather than a container. */
  homeRows: {},
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
  },
  homeRowLast: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal600 },
  homeRowPressed: { backgroundColor: bronzeWash(0.055) },
  homeGlyph: {
    width: 26,
    height: 26,
    borderRadius: flRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  homeGlyphRound: { borderRadius: 13 },
  homeRowLabel: { flex: 1, minWidth: 0, fontSize: 14.5, color: flColor.cream100 },

  /* §4 — the conversation begins here, and only once there is one. */
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 18, paddingBottom: 4 },
  dividerRule: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronze400 },

  /* ══ THE ATHLETE'S TURN (§5) ══ Eyebrow, bubble, then the time and the ticks. */
  meBlock: { alignItems: 'flex-end', gap: 5 },
  meEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 2.2, color: flColor.bronze400 },
  meRow: {
    maxWidth: '78%',
    paddingHorizontal: 15,
    paddingVertical: 11,
    // The flat corner points at the sender (§5).
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
    // ⚠ Bronze-TINTED, never bronze-filled — it must not compete with a primary button.
    backgroundColor: bronzeWash(0.10),
    borderWidth: 1,
    borderColor: bronzeWash(0.28),
  },
  meText: { fontSize: 14.5, lineHeight: 20, color: flColor.cream100 },
  meMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meTime: { fontSize: 9.5, color: flColor.gray600 },

  /* ══ HOLT'S TURN (§5) ══ A gutter and a column, and NEVER a bubble. */
  holtRow: { flexDirection: 'row', gap: 12 },
  holtGutter: { width: 40, flexGrow: 0, flexShrink: 0, alignItems: 'center', gap: 6 },
  /* History steps back a level rather than changing shape. */
  holtGutterPast: { opacity: 0.7 },
  holtTime: { fontSize: 9, color: flColor.gray600 },
  holtBody: { flex: 1, minWidth: 0, gap: 7 },
  holtEyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronze400 },
  holtText: { fontSize: 16.5, lineHeight: 24, color: flColor.cream100 },
  holtTextPast: { fontSize: 15.5, lineHeight: 22.5, color: flColor.gray400 },
  /* ⚠ INSIDE the content column, so the answers align to the question and not to the mark. */
  holtAttached: { paddingTop: 6, gap: 12 },

  /* ══ v2 LAYER 2 — THE ANSWER CONTROLS ══
     One vocabulary, five shapes: 48pt tall, 13px radius, never a full pill.

     ⚠ **UNSELECTED IS WHITE, NOT BRONZE** (§6). The first pass gave every control a bronze edge on the
     v1 handoff's reasoning that "a chip is a decision waiting to be made". v2 reverses it, and the
     reason is the rule above everything else on this surface: bronze is the ACCENT. When every option
     is already bronze-edged, choosing one has nowhere left to go — the selected state had no contrast
     to gain, so the whole indicator system was invisible. */
  ctlOn: { borderColor: flColor.bronzeBorder, backgroundColor: bronzeWash(0.13) },
  ctlTextOn: { fontWeight: '600' },

  // multi — collects taps, then a deliberate Build.
  multiWrap: { gap: 12 },

  // chips — two to a row, a set of unlike things.
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipCell: {
    // Two per row, accounting for the 8px gap. `flexBasis` rather than `width: '48%'` so a lone
    // trailing option stays half-width instead of stretching across.
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: wash(0.075),
    backgroundColor: wash(0.032),
  },
  /* ⚠ `flex: 1; minWidth: 0` with one line and an ellipsis. §6: a fixed-height control must never wrap,
     because the text then spills out of a box that cannot grow. */
  chipCellText: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.cream100 },

  // segmented — an ordered scale, so a row, equal widths, order left to right.
  segRow: { flexDirection: 'row', gap: 7 },
  seg: {
    flex: 1,
    minWidth: 0,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wash(0.075),
    backgroundColor: wash(0.032),
  },
  segText: { fontSize: 13, color: flColor.cream100 },
  segTextOn: { fontWeight: '600', color: flColor.bronze300 },

  // cards — a choice that needs a sentence.
  cardCol: { gap: 8 },
  optCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: wash(0.075),
    backgroundColor: wash(0.032),
  },
  optCardText: { flex: 1, minWidth: 0, gap: 4 },
  optCardTitle: { fontSize: 14.5, fontWeight: '500', color: flColor.cream100 },
  optCardSub: { fontSize: 12, lineHeight: 17.5, color: flColor.gray600 },
  /* ⚠ ROUND = PICK ONE, SQUARE = PICK MANY. The indicator's shape carries the rule (§6). */
  optDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: wash(0.16), alignItems: 'center', justifyContent: 'center' },
  optSquare: { width: 17, height: 17, borderRadius: 5, borderWidth: 1, borderColor: wash(0.16), alignItems: 'center', justifyContent: 'center' },
  optDotOn: { borderColor: flColor.bronzeBorder, backgroundColor: bronzeWash(0.18) },

  // grid — places and kit. Taller than a chip because the names are longer.
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: wash(0.075),
    backgroundColor: wash(0.032),
  },
  gridText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, color: flColor.cream100 },

  // imports — an act, not a selection. Chevron, because it leaves.
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: wash(0.075),
    backgroundColor: wash(0.032),
  },
  importText: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },

  /* Indented to the Holt gutter (40 + 12), so the dots sit exactly where his line will and nothing
     jumps sideways when the line replaces them. */
  dotsWrap: { paddingLeft: 52, alignItems: 'flex-start' },
  /* Left-aligned and small — it sits where the line will, so nothing jumps when the line replaces it. */
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.bronze400, opacity: 0.5 },
  buildCard: {
    marginLeft: 52,
    padding: 18,
    paddingBottom: 16,
    gap: 14,
    borderRadius: 16,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    boxShadow: flShadow.trainTogetherCard,
  },
  buildLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 2.2, color: flColor.bronze400 },
  buildSteps: { gap: 11 },
  buildStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buildIcon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  buildStepText: { fontSize: 14, color: flColor.gray600 },
  buildStepDone: { color: flColor.gray400 },
  buildStepActive: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rail: { height: 3, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  railFill: { height: 3, borderRadius: 2, backgroundColor: flColor.bronze400 },

  error: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.dangerBorder, backgroundColor: flColor.dangerBg, padding: 13, gap: 3 },
  errorTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.dangerText },
  errorSub: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  errorAction: { marginTop: 6, fontSize: 13.5, fontWeight: '700', color: flColor.dangerText },

  /* ── shared card language ───────────────────────────────────────────────────────────────────── */
  kickerBronze: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: flColor.bronze400 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  reasoning: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },

  /* ══ THE ARTIFACT (§7) ══ Reading it happens inside the card; deciding happens outside. */
  artifactWrap: { gap: 10 },
  titleBlock: { paddingHorizontal: 15, paddingTop: 16, paddingBottom: 6, gap: 4 },
  artifactBody: { paddingHorizontal: 15, paddingTop: 14, gap: 14 },
  cardSubtitle: { fontSize: 12.5, color: flColor.gray400 },
  /* The rows band — a bronze marker in a fixed column, then what that week actually is. */
  markerList: {},
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  markerRowPressed: { backgroundColor: bronzeWash(0.06) },
  marker: { width: 34, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, color: flColor.bronze400 },
  markerText: { flex: 1, minWidth: 0, fontSize: 14, color: flColor.cream100 },
  /* The sessions inside a week. Indented to the marker column so they read as belonging to the row
     above rather than as more weeks, and recessed so an open week is visibly a drawer. */
  dayDrop: {
    marginLeft: 34,
    paddingLeft: 14,
    paddingBottom: 4,
    borderLeftWidth: 1,
    borderLeftColor: flColor.bronzeBorderSubtle,
  },
  dayDropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dayDropMarker: { width: 14, fontSize: 10, fontWeight: '700', color: flColor.bronze600 },
  dayDropTitle: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.gray400 },
  markerClosing: { paddingTop: 11, paddingBottom: 13, borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  markerClosingText: { fontSize: 12.5, color: flColor.gray600 },
  /* Inside the card, under its own rule: the way into the full read, not a decision about it. */
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
    backgroundColor: wash(0.02),
  },
  previewRowPressed: { backgroundColor: bronzeWash(0.06) },
  previewRowText: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  artifactActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewWrap: { flex: 1 },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  previewBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  previewTitle: { flex: 1, fontFamily: flFont.display, fontSize: 18, color: flColor.cream100 },
  previewScroll: { flex: 1 },
  previewInner: { padding: 18, gap: 16 },
  /* `paddingBottom` is applied at render from the safe-area inset — see `PlanPreview`. */
  previewActions: { paddingHorizontal: 16, paddingTop: 12, gap: 9, borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  weekList: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  weekLabel: { fontSize: 13.5, color: flColor.cream100 },
  weekDetail: { fontSize: 13.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  /* The count and the chevron travel together on the right, so the disclosure reads as belonging to the
     count rather than floating at the edge of the row. */
  weekRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* The week's sessions, indented under a bronze spine so a long scroll never loses which week it is in. */
  previewDays: {
    marginLeft: 8,
    paddingLeft: 14,
    paddingBottom: 10,
    borderLeftWidth: 1,
    borderLeftColor: flColor.bronzeBorderSubtle,
  },
  previewDay: { paddingTop: 12 },
  previewDayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 2 },
  previewDayMarker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: flColor.bronze600 },
  previewDayTitle: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  previewDayEmpty: { paddingVertical: 11, fontSize: 13.5, color: flColor.gray600 },

  /* ── day card ───────────────────────────────────────────────────────────────────────────────── */
  dayList: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  dayName: { flex: 1, fontSize: 14.5, color: flColor.cream100 },
  // Tabular figures so the prescriptions line up in a column, and it never wraps (§11.2.4/11.2.6).
  dayPrescription: { fontSize: 14.5, color: flColor.gray400, fontVariant: ['tabular-nums'], flexShrink: 0 },

  /* ⚠ THE EDIT CARD'S STYLES ARE GONE WITH `EditCardView`. Nothing ever emitted a `kind: 'edit'` turn —
     the whole card was designed, styled and unreachable, and its Apply button had no `onPress` either.
     Changing a live program is the CHIP flow in `stepEdit`, which works. The `edit` Turn kind and the
     `EditCard` type stay in `chat-core` for now: removing them is a retirement pass with its own grep,
     not something to do inside a design pass. */

  /* ── refusal ────────────────────────────────────────────────────────────────────────────────── */
  /* ══ THE SHELF CARD ══ Modelled on the refusal card — recessed, bronze-edged — because both are Holt
     pointing at something rather than handing over something he made. */
  pickCard: {
    borderRadius: flRadius.xl,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    padding: 16,
    gap: 12,
    boxShadow: `inset 0 1px 0 ${bronzeWash(0.16)}`,
  },
  pickHead: { gap: 3 },
  pickTitle: { fontFamily: flFont.display, fontSize: 21, color: flColor.cream100 },
  pickMeta: { fontSize: 12.5, color: flColor.gray600 },
  pickAims: { gap: 4, paddingLeft: 11, borderLeftWidth: 2, borderLeftColor: flColor.bronzeBorderSubtle },
  pickAim: { fontSize: 13, lineHeight: 20, color: flColor.gray400, fontStyle: 'italic' },
  pickReasons: { gap: 8 },
  pickReasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  /* ⚠ THE SAME SIZE AND LINE HEIGHT AS A REASON. Only the colour separates them, and only by one step —
     see the note on `PickCardView`. Shrinking a caveat is how it becomes small print. */
  pickReason: { flex: 1, fontSize: 13.5, lineHeight: 20, color: flColor.cream100 },
  pickCaveat: { flex: 1, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },
  pickAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal500,
  },
  pickAltLabel: { flex: 1, fontSize: 12.5, color: flColor.gray600 },
  pickAltName: { color: flColor.bronze400 },

  refusalCard: {
    borderRadius: flRadius.xl,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    padding: 16,
    gap: 12,
    boxShadow: `inset 0 1px 0 ${bronzeWash(0.16)}`,
  },
  refusalHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  refusalTitle: { fontFamily: flFont.display, fontSize: 21, color: flColor.cream100 },
  refusalMeta: { fontSize: 12.5, color: flColor.gray600 },
  refusalBody: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },

  /* ── the stop ───────────────────────────────────────────────────────────────────────────────── */
  stop: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    gap: 6,
  },
  stopKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: flColor.gray600 },
  stopText: { fontSize: 14.5, lineHeight: 22, color: flColor.gray400 },

  /* ── explainer ──────────────────────────────────────────────────────────────────────────────── */
  explain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  explainIcon: {
    width: 34,
    height: 34,
    borderRadius: flRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  explainText: { flex: 1, gap: 2 },
  explainName: { fontSize: 14.5, color: flColor.cream100 },
  explainSub: { fontSize: 12, color: flColor.gray600 },

  /* ── saved ──────────────────────────────────────────────────────────────────────────────────── */
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  savedText: { flex: 1, fontSize: 14, color: flColor.cream100 },

  /* ── the wall ───────────────────────────────────────────────────────────────────────────────── */
  wall: {
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    padding: 18,
    gap: 10,
  },
  wallTitle: { fontFamily: flFont.display, fontSize: 21, lineHeight: 27, color: flColor.cream100 },
  wallBody: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },

  card: { borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.charcoal500, overflow: 'hidden' },
  /* The two canonical forged-card treatments. Hero is the Mission Card's weight — the program card
     earns it; everything else steps down. */
  cardHero: { boxShadow: flShadow.missionCard },
  cardSoft: { boxShadow: flShadow.trainTogetherCard },
  heroWash: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
  ctaGrow: { flex: 1 },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: bronzeWash(0.07),
    borderBottomWidth: 1,
    /* ⚠ DASHED, and this is the whole point of the strip. §11.1.2: "The dashed edge is the signal that
       this object is provisional; every other card in the app uses a solid edge." I had it solid, which
       made a draft look exactly like a saved thing — the single worst failure this surface can have. */
    borderStyle: 'dashed',
    borderBottomColor: flColor.bronzeBorderSubtle,
  },
  draftBannerText: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: flColor.bronze400 },
  cardTitle: { fontFamily: flFont.display, fontSize: 24, lineHeight: 29, fontWeight: '600', letterSpacing: 0.4, color: flColor.cream100 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 10 },
  // Three across, so six stats form two clean rows and a dropped cell reflows rather than leaving a hole.
  stat: { width: '31%', gap: 3 },
  statValue: { fontFamily: flFont.display, fontSize: 19, color: flColor.cream100 },
  statLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: flColor.bronze400 },
  ribbonWrap: { gap: 7 },
  ribbon: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 46 },
  bar: { flex: 1, borderRadius: 1, backgroundColor: flColor.bronze600 },
  barPeak: { backgroundColor: flColor.bronze300 },
  barHeavy: { backgroundColor: flColor.bronze400 },
  barDown: { backgroundColor: flColor.bronzeDark },
  ribbonCaption: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    /* `paddingBottom` applied at render from the safe-area inset. */
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  composerBusy: { opacity: 0.55 },
  input: {
    flex: 1,
    minHeight: 44,
    // Four lines, then it scrolls inside itself (§12.6).
    maxHeight: 108,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 14.5,
    lineHeight: 20,
    outlineWidth: 0,
  },
  inputTyping: { borderColor: flColor.bronzeBorder, boxShadow: `0 0 0 3px ${bronzeWash(0.07)}` },
  sendWrap: { width: 44, height: 44 },
  sendOff: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },
  /* The only large bronze fill the system permits, and this is a sanctioned use of it (§17.4). */
  sendOn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: flShadow.buttonPrimary,
  },
});
