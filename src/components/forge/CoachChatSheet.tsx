import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useAnimatedValue } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { Button } from '@/components/forge/composites/Button';
import { HoltMark } from '@/components/forge/HoltMark';
import { assemble } from '@/domain/coach/assemble';
import {
  DAY_PREAMBLE,
  INTRO,
  MEDICAL_STOP,
  NOT_UNDERSTOOD,
  OPENERS,
  STOP_KICKER,
  WALL,
  dayCardFor,
  fromOpener,
  interpret,
  isMedical,
  nextQuestion,
  preamble,
  programCardFor,
  readyToBuild,
  refusalCardFor,
  type Chip,
  type DayCard,
  type EditCard,
  type ProgramCard,
  type RefusalCard,
  type Turn,
} from '@/domain/coach/chat-core';
import { isEnduranceGoal, type CoachConstraints } from '@/domain/coach/constraints';
import { weeklyVolumePlan } from '@/domain/coach/rulebook/endurance';
import { rationaleFor } from '@/domain/coach/rulebook/rationale';
import { buildDayWorkout } from '@/domain/coach/day';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { canDoExercise } from '@/domain/home-gym/equipment';
import { fetchActiveProgram } from '@/data/programs-live';
import { loadThread, saveThread } from '@/lib/coach-thread';
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
export function CoachChatSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  /*
   * §2.9 — the sheet RISES: translateY 100% → 0 over 250ms with the system's ease-out, and reverses in
   * 200ms on the way out. §2.8 — dragging the handle down past ~120px collapses it back to the bubble.
   *
   * The close path always goes through `collapse()` so the sheet is never yanked off screen: the scrim
   * tap, the header's X and the drag all play the same 200ms exit before `onClose` unmounts it.
   */
  const rise = useAnimatedValue(0);
  const drag = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 250,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  const collapse = useCallback(() => {
    Animated.timing(rise, {
      toValue: 0,
      duration: 200,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
      useNativeDriver: true,
    }).start(() => onClose());
  }, [rise, onClose]);

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

  /* §6.5 — the introduction is three paragraphs and lands as three beats, ~450ms apart. Dropping all
     three at once is a wall of text pretending to be a greeting. */
  const [thread, setThread] = useState<Turn[]>([{ kind: 'holt', text: INTRO[0], live: true }]);
  const [introStep, setIntroStep] = useState(1);

  useEffect(() => {
    if (introStep >= INTRO.length + 1) return undefined;
    const beat = INTRO[introStep];
    const id = setTimeout(
      () => {
        setThread((t) => [
          ...t,
          beat != null
            ? { kind: 'holt' as const, text: beat, live: true }
            : { kind: 'chips' as const, chips: OPENERS.map((label) => ({ label, patch: {} })) },
        ]);
        setIntroStep((n) => n + 1);
      },
      // A paragraph's beat is its own typing time plus the pause; the openers follow the last line.
      (beat ? beat.length * 42 : INTRO[INTRO.length - 1].length * 42) + 450,
    );
    return () => clearTimeout(id);
  }, [introStep]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'thinking' | 'building' | null>(null);
  const [mode, setMode] = useState<'program' | 'day' | null>(null);
  const [constraints, setConstraints] = useState<Partial<CoachConstraints>>({});
  /** What is on the table, so the card knows which builder to open and what shape to draw. */
  /** Which builder the card's button opens. The draft itself is already on disk by then. */
  const [built, setBuilt] = useState<{ kind: 'program' | 'day' } | null>(null);

  const say = useCallback((...turns: Turn[]) => setThread((t) => [...t, ...turns]), []);

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [thread, busy]);

  /* §15.2/15.3 — one rolling thread that survives leaving the app, and leaving for the Builder. Loaded
     once; if there is anything stored, it replaces the introduction and the intro beats stop. */
  useEffect(() => {
    let alive = true;
    void loadThread().then((stored) => {
      if (alive && stored) {
        setThread(stored);
        setIntroStep(INTRO.length + 1);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void saveThread(thread);
  }, [thread]);

  /* ── the turn cycle ────────────────────────────────────────────────────────────────────────────── */

  const advance = useCallback(
    async (next: Partial<CoachConstraints>, mode_: 'program' | 'day') => {
      const merged = { ...next };
      setConstraints(merged);

      if (!readyToBuild(merged)) {
        // Thinking is a real state and short. It exists so the next question does not appear the instant
        // you tap — a coach who answers before you have finished is not listening, he is waiting.
        setBusy('thinking');
        await pause(420);
        setBusy(null);
        const q = nextQuestion(merged);
        if (q) say({ kind: 'holt', text: q.ask }, { kind: 'chips', chips: q.chips });
        return;
      }

      setBusy('building');
      await pause(650);
      const c = completeFor(merged, mode_);

      if (mode_ === 'day') {
        const r = buildDayWorkout(
          { focus: { kind: 'split', split: 'full_body' }, sessionMinutes: c.sessionMinutes, experience: c.experience.lifting, environment: c.environment, ownedEquipment: c.ownedEquipment, limitations: c.limitations },
          PICKER_DB,
          canDoExercise,
        );
        setBusy(null);
        if (r.day.main.length === 0) {
          say({
            kind: 'holt',
            text: "There isn't enough here for me to build you a session. Tell me what you've got and I'll work with it.",
          });
          return;
        }
        /* The wizard's own handoff, not a second one. A single day goes to the WORKOUT builder and a
           block goes to the PROGRAM builder — two different review screens, and the chat has no business
           inventing a third route to either. */
        await saveWorkoutDraft({ name: r.day.name, warmup: r.day.warmup, main: r.day.main, cooldown: r.day.cooldown, editId: null });
        setBuilt({ kind: 'day' });
        say({ kind: 'holt', text: DAY_PREAMBLE }, { kind: 'day', card: dayCardFor(merged, r.day) });
        return;
      }

      const res = assemble(c, PICKER_DB, canDoExercise);
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
      setBuilt({ kind: 'program' });
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
      say(
        { kind: 'holt', text: preamble(c, structure.weeks) },
        { kind: 'program', card: programCardFor(c, structure, volume, reason) },
      );
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

  const guardActiveProgram = useCallback(async (): Promise<boolean> => {
    if (askedAboutReplacing.current) return true;
    const active = await fetchActiveProgram().catch(() => null);
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

  const tapChip = (chip: Chip) => {
    if (chip.label === 'Change the one I have') {
      say({ kind: 'me', text: chip.label });
      onClose();
      router.push('/(tabs)/workouts');
      return;
    }
    if (chip.label === 'Replace it') {
      say({ kind: 'me', text: chip.label });
      void advance(constraints, mode ?? 'program');
      return;
    }

    const opener = fromOpener(chip.label);
    if (opener) {
      setMode(opener.mode);
      say({ kind: 'me', text: chip.label });
      void (async () => {
        if (opener.mode === 'program' && !(await guardActiveProgram())) return;
        await advance({ ...constraints, ...opener.patch }, opener.mode);
      })();
      return;
    }
    say({ kind: 'me', text: chip.label });
    void advance({ ...constraints, ...chip.patch }, mode ?? 'program');
  };

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
    if (opener) {
      setMode(opener.mode);
      void advance({ ...constraints, ...opener.patch }, opener.mode);
      return;
    }

    const q = nextQuestion(constraints);
    const patch = q ? interpret(text, q) : null;
    if (!patch) {
      /* He asks again rather than guessing. A coach who mishears and proceeds is worse than one who
         checks — and until the model lands, this is the honest edge of what he understands. */
      say({ kind: 'holt', text: NOT_UNDERSTOOD });
      if (q) say({ kind: 'chips', chips: q.chips });
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
        {/* The grab handle, and it really grabs — drag it down and the sheet goes back to being the
            bubble it came from. */}
        <View style={styles.grabWrap} {...handleResponder.panHandlers}>
          <View style={styles.grab} />
        </View>
        <View style={styles.header}>
          <HoltMark size={36} state={busy ?? 'idle'} />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>COACH HOLT</Text>
            <Text style={styles.headerStatus}>
              {busy === 'building' ? 'Building your block' : busy === 'thinking' ? 'Thinking' : 'Ready'}
            </Text>
          </View>
          {/* §4.9 — it collapses to the bubble; it does not clear the conversation. */}
          <Pressable onPress={collapse} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.close}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView ref={scroller} style={styles.thread} contentContainerStyle={styles.threadInner} keyboardShouldPersistTaps="handled">
          {thread.map((t, i) => (
            <TurnEnter key={i}>
            <TurnView
              turn={t}
              onChip={tapChip}
              onOpenBuilder={() => {
                onClose();
                router.replace(built?.kind === 'day' ? '/workout-builder' : '/program-builder');
              }}
            />
            </TurnEnter>
          ))}
          {busy ? <Waiting kind={busy} /> : null}
        </ScrollView>

        {/* §12.3 — four states, and each says something different: ready is quiet, typing lights the
            field bronze and forges the send button, busy dims the whole bar and renames the placeholder
            so it is obvious nothing was lost. */}
        <View style={[styles.composer, busy ? styles.composerBusy : null]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={busy ? 'Holt is working' : 'Tap an answer, or type it'}
            placeholderTextColor={flColor.gray600}
            style={[styles.input, draft.trim() ? styles.inputTyping : null]}
            multiline
            maxLength={280}
            editable={!busy}
            onSubmitEditing={send}
            accessibilityLabel="Message Holt"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || !!busy}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={styles.sendWrap}
          >
            {draft.trim() && !busy ? (
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
      </LinearGradient>
      </Animated.View>
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
const SHEET_SURFACE = ['#232329', '#1E1E23'] as const;

/** `--fl-surface-elevated`. The card sits above the sheet, not level with it. */
const SURFACE_ELEVATED = ['#1F2024', flColor.charcoal700] as const;

/* ────────────────────────────────────────────────────────────────────────────────────────────────── */

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * §5.3 — a turn arrives: opacity 0→1 and 10px up, 280ms, ease-out.
 *
 * ⚠ ONCE PER MESSAGE. The spec is explicit that it must never re-animate on re-render, and the whole
 * thread re-renders on every keystroke in the composer — so the animation is started from a mount effect
 * with no dependencies and the value is never reset. Anything keyed off props would make the entire
 * conversation twitch each time a character is typed.
 */
function TurnEnter({ children }: { children: React.ReactNode }) {
  const v = useAnimatedValue(0);
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
        // The fade stays — it is the arrival. Only the travel goes.
        transform: still ? [] : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
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
function volumeFor(c: CoachConstraints, weeks: number): { mileage: number; longRunMi: number }[] {
  if (!isEnduranceGoal(c.goal)) return [];
  return weeklyVolumePlan({ goal: c.goal, weeks, startMi: c.currentWeeklyMi ?? 0 }).map((v) => ({
    mileage: v.mileage,
    longRunMi: v.longRunMi,
  }));
}

/*
 * ⚠ THE REASON PARAGRAPH IS NOT WRITTEN HERE. §11.1.10: "Sourced from the rulebook's recorded reasons —
 * the engine knows why it did what it did. Never write this string by hand."
 *
 * I had written one by hand, in this file, while `rulebook/rationale.ts` already existed for exactly this
 * — it is Holt's "why I built it this way", composed from the split note, the frequency, the goal
 * emphasis and the real deload weeks. Two sources for the same sentence is how the card ends up
 * explaining a plan the engine did not build.
 */

/** Whole weeks between now and the race, for the counter-offer's meta line. */
function weeksBetween(raceDate?: string | null): number {
  if (!raceDate) return 0;
  const ms = Date.parse(raceDate) - Date.now();
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.floor(ms / (7 * 24 * 3600 * 1000)));
}

/** Fill the fields the chat never asks, so `assemble` gets the shape it expects. */
function completeFor(c: Partial<CoachConstraints>, mode: 'program' | 'day'): CoachConstraints {
  return {
    goal: c.goal ?? 'strength',
    experience: c.experience ?? { lifting: 'intermediate', running: 'intermediate' },
    daysPerWeek: c.daysPerWeek ?? 4,
    // A race never asks this — a long run is as long as it is. 60 keeps the validator honest.
    sessionMinutes: c.sessionMinutes ?? 60,
    environment: c.environment ?? (mode === 'program' && c.goal && isEnduranceGoal(c.goal) ? 'outdoor' : 'full_gym'),
    ownedEquipment: c.ownedEquipment ?? [],
    limitations: c.limitations ?? [],
    excludeExercises: [],
    raceDate: c.raceDate ?? null,
    currentWeeklyMi: c.currentWeeklyMi ?? null,
    canRunContinuously: c.canRunContinuously ?? null,
  };
}


/** The two waits. Building names its steps, because a spinner would waste the moment. */
function Waiting({ kind }: { kind: 'thinking' | 'building' }) {
  if (kind === 'thinking') {
    // Three dots where his next line will land — staggered 0.18s so they read as a sequence rather
    // than a throb (§9.1–9.2).
    return (
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <ThinkingDot key={i} delay={i * 180} />
        ))}
      </View>
    );
  }
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
  const fill = useAnimatedValue(0);

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

function ThinkingDot({ delay }: { delay: number }) {
  const v = useAnimatedValue(0.25);
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

function TurnView({ turn, onChip, onOpenBuilder }: { turn: Turn; onChip: (c: Chip) => void; onOpenBuilder: () => void }) {
  switch (turn.kind) {
    case 'me':
      return (
        <View style={styles.meRow}>
          <Text style={styles.meText}>{turn.text}</Text>
        </View>
      );

    case 'holt':
      return <HoltLine text={turn.text} live={turn.live} />;

    case 'chips':
      return (
        <View style={styles.chipRow}>
          {turn.chips.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => onChip(c)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, pressed && styles.chipOn]}
            >
              <Text style={styles.chipText}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      );

    case 'program':
      return <ProgramCardView card={turn.card} onOpenBuilder={onOpenBuilder} />;

    case 'day':
      return <DayCardView card={turn.card} onOpenBuilder={onOpenBuilder} />;

    case 'edit':
      return <EditCardView card={turn.card} />;

    case 'refusal':
      return <RefusalCardView card={turn.card} />;

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
function HoltLine({ text, live }: { text: string; live?: boolean }) {
  /* §6.6 — a tap anywhere on the line completes it instantly. Somebody who reads faster than 42ms a
     character should not be made to wait for a flourish. */
  const [skipped, setSkipped] = useState(false);
  // §6.8 — with reduced motion the line is simply there. The 280ms turn fade still carries it in.
  const still = useReducedMotion();
  /* DERIVED, not synced. Holding a 'shown' count and setting it from the effect body is a synchronous
     setState in an effect, which react-compiler rejects — and it is a second copy of something the tick
     count already tells us. The interval callback is fine: that is the async form the rule allows. */
  const [ticks, setTicks] = useState(0);
  const shown = live && !skipped && !still ? Math.min(ticks, text.length) : text.length;

  useEffect(() => {
    if (!live || still) return undefined;
    const id = setInterval(() => setTicks((n) => n + 1), 42);
    return () => clearInterval(id);
  }, [text, live, still]);

  const done = shown >= text.length;
  return (
    <Pressable onPress={() => setSkipped(true)} accessibilityRole="none" style={styles.holtLine}>
      <Text
        style={styles.holtText}
        accessibilityLiveRegion={done ? 'polite' : 'none'}
        accessibilityLabel={done ? text : ''}
      >
        {text.slice(0, shown)}
      </Text>
      {!done ? <Caret /> : null}
    </Pressable>
  );
}

/** 8 × 17 solid bronze, blinking on a 900ms step — a struck block, not a thin line. */
function Caret() {
  const blink = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 0, delay: 450, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 0, delay: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);
  return <Animated.View style={[styles.caret, { opacity: blink }]} />;
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

/** The most important object on the surface. Every figure on it came out of the engine. */
function ProgramCardView({ card, onOpenBuilder }: { card: ProgramCard; onOpenBuilder: () => void }) {
  /* §11.1.12 — tapping the CARD BODY walks the weeks; tapping an action does not. The actions sit
     outside this Pressable for exactly that reason, rather than relying on event ordering. */
  const [open, setOpen] = useState(false);

  return (
    <CardSurface hero>
      <DraftBanner />
      {/* The warm wash the hero card carries over its top edge — `--fl-card-hero-wash`. */}
      <LinearGradient
        colors={flGradient.missionCardWash.colors}
        locations={flGradient.missionCardWash.locations}
        start={flGradient.missionCardWash.start}
        end={flGradient.missionCardWash.end}
        style={styles.heroWash}
        pointerEvents="none"
      />
      <View style={styles.cardBody}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Hide the weeks' : 'Walk the weeks'}
          accessibilityState={{ expanded: open }}
          style={styles.cardTap}
        >
          <View style={styles.cardHead}>
            <Text style={styles.kicker}>{card.kicker}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
          </View>

          <View style={styles.statGrid}>
            {card.stats.map((st) => (
              <View key={st.label} style={styles.stat}>
                <Text style={styles.statValue}>{st.value}</Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {card.ribbon.length > 1 ? <VolumeRibbon weeks={card.ribbon} caption={card.ribbonCaption} /> : null}

          {open ? (
            <View style={styles.weekList}>
              {card.weeks.map((w) => (
                <View key={w.label} style={styles.weekRow}>
                  <Text style={styles.weekLabel}>{w.label}</Text>
                  <Text style={styles.weekDetail}>{w.detail}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.reasoning}>{card.reasoning}</Text>
        </Pressable>

        {/* The design imports the design system's own Button for every action — primary and text. Rolling
            my own Pressable is what lost the forged-bronze fill, the machined rim and the glow. */}
        <View style={styles.cardActions}>
          <View style={styles.ctaGrow}>
            <Button variant="primary" fullWidth onPress={onOpenBuilder} accessibilityLabel="Final touches">
              Final touches
            </Button>
          </View>
          <Button variant="text" accessibilityLabel="Not this">
            Not this
          </Button>
        </View>
      </View>
    </CardSurface>
  );
}

function DayCardView({ card, onOpenBuilder }: { card: DayCard; onOpenBuilder: () => void }) {
  return (
    <CardSurface>
      <DraftBanner />
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text style={styles.kicker}>{card.kicker}</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
        </View>
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
        <View style={styles.cardActions}>
          <View style={styles.ctaGrow}>
            <Button variant="primary" fullWidth onPress={onOpenBuilder} accessibilityLabel="Start it">
              Start it
            </Button>
          </View>
          <Button variant="text" onPress={onOpenBuilder} accessibilityLabel="Send to the builder">
            Send to the builder
          </Button>
        </View>
      </View>
    </CardSurface>
  );
}

/** Before, after, and how far it reaches. Scope is chosen before applying, never a surprise afterwards. */
function EditCardView({ card }: { card: EditCard }) {
  const [scope, setScope] = useState<'week' | 'block'>('week');
  return (
    <View style={styles.editCard}>
      <Text style={styles.kickerBronze}>{card.kicker}</Text>
      <View style={styles.beforeAfter}>
        <View style={styles.baBox}>
          <Text style={styles.baLabel}>{card.fromLabel}</Text>
          <Text style={styles.baValue}>{card.fromValue}</Text>
        </View>
        <View style={styles.baArrow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12h14M13 6l6 6-6 6" />
          </Svg>
        </View>
        <View style={[styles.baBox, styles.baBoxTo]}>
          <Text style={styles.baLabel}>{card.toLabel}</Text>
          <Text style={styles.baValue}>{card.toValue}</Text>
        </View>
      </View>
      <Text style={styles.scopeLabel}>SCOPE</Text>
      <View style={styles.scopeRow}>
        {(['week', 'block'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setScope(k)}
            accessibilityRole="button"
            accessibilityState={{ selected: scope === k }}
            style={[styles.scopeBtn, scope === k && styles.scopeBtnOn]}
          >
            <Text style={[styles.scopeText, scope === k && styles.scopeTextOn]}>
              {k === 'week' ? 'Just this week' : 'Rest of the block'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.cardActions}>
        <View style={styles.ctaGrow}>
          <Button variant="primary" fullWidth accessibilityLabel="Apply">
            Apply
          </Button>
        </View>
        <Button variant="text" accessibilityLabel="Not that">
          Not that
        </Button>
      </View>
    </View>
  );
}

/**
 * The counter-offer. Bronze and recessed — no red, no warning icon, no apology. This is Holt being
 * right, and the alternative is framed as the better plan rather than a consolation.
 */
function RefusalCardView({ card }: { card: RefusalCard }) {
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
          <Button variant="primary" fullWidth accessibilityLabel={card.primary}>
            {card.primary}
          </Button>
        </View>
        <Button variant="text" accessibilityLabel={card.secondary}>
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
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(3,5,7,0.66)' },
  /* ⚠ A TOP INSET, NOT A MAX HEIGHT. PROMPT §2.4: 64px from the top "so a sliver of the app is always
     visible above it — this is the whole point." A percentage height looks similar on one device and
     wrong on every other. The geometry lives on the wrapper so the rise can transform it. */
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 64 },
  sheet: {
    flex: 1,
    // 24, not the token's 16 — the design opens the sheet wider than a card corner on purpose.
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    // ⚠ BRONZE, not charcoal. The lit top edge is what makes it read as raised metal.
    borderColor: flColor.bronzeBorderSubtle,
    // The inset warm highlight along the top edge is half of what makes it read as raised metal.
    boxShadow: '0 -18px 44px rgba(0,0,0,0.7), inset 0 1px 0 rgba(198,156,100,0.22)',
  },
  grabWrap: { alignItems: 'center', paddingTop: 9, paddingBottom: 4 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: flColor.charcoal500 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal600 },
  mark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  headerText: { flex: 1, gap: 2 },
  headerName: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronze400 },
  // 12.5 and SECONDARY, not tertiary — the status is information, not a footnote.
  headerStatus: { fontSize: 12.5, color: flColor.gray400 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  thread: { flexGrow: 0 },
  threadInner: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8, gap: 18 },

  meRow: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    paddingHorizontal: 15,
    paddingVertical: 11,
    // The flat corner points at the sender (§7.2).
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 16,
    // ⚠ Bronze-TINTED, never bronze-filled — it must not compete with a primary button (§7.5).
    backgroundColor: 'rgba(186, 146, 92, 0.11)',
    borderWidth: 1,
    borderColor: 'rgba(186, 146, 92, 0.30)',
    boxShadow: 'inset 0 1px 0 rgba(198,156,100,0.14)',
  },
  meText: { fontSize: 15, lineHeight: 22, color: flColor.cream100 },
  holtLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, maxWidth: '86%' },
  caret: { width: 8, height: 17, backgroundColor: flColor.bronze400, marginBottom: 3 },
  holtText: { fontSize: 15.5, lineHeight: 24, color: flColor.cream100, maxWidth: '86%' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    // Bronze-edged, not charcoal — a chip is a decision waiting to be made (§8.2).
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 13.5, fontWeight: '500', color: flColor.cream100 },

  dots: { flexDirection: 'row', gap: 5, paddingHorizontal: 18, paddingBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.bronze400, opacity: 0.5 },
  buildCard: {
    marginHorizontal: 18,
    marginBottom: 16,
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

  refusal: { borderLeftWidth: 2, borderLeftColor: flColor.bronze400, paddingLeft: 12, paddingVertical: 2 },
  refusalText: { fontSize: 15, lineHeight: 23, color: flColor.cream100 },

  error: { borderRadius: flRadius.md, borderWidth: 1, borderColor: 'rgba(196,86,72,0.45)', backgroundColor: 'rgba(196,86,72,0.08)', padding: 13, gap: 3 },
  errorTitle: { fontSize: 14.5, fontWeight: '600', color: '#E4A099' },
  errorSub: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  errorAction: { marginTop: 6, fontSize: 13.5, fontWeight: '700', color: '#E4A099' },

  /* ── shared card language ───────────────────────────────────────────────────────────────────── */
  kicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 2.2, color: flColor.gray600 },
  kickerBronze: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: flColor.bronze400 },
  cardHead: { gap: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  reasoning: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  cardTap: { gap: 14 },
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

  /* ── edit card ──────────────────────────────────────────────────────────────────────────────── */
  editCard: {
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    padding: 16,
    gap: 14,
    boxShadow: flShadow.trainTogetherCard,
  },
  beforeAfter: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  baBox: {
    flex: 1,
    padding: 12,
    borderRadius: flRadius.md,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    gap: 5,
  },
  /* The destination carries the bronze edge — it is the thing being decided, not the thing being left. */
  baBoxTo: { borderColor: flColor.bronzeBorderSubtle },
  baLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.5, color: flColor.gray600 },
  baValue: { fontSize: 14.5, color: flColor.cream100 },
  baArrow: { alignItems: 'center', justifyContent: 'center' },
  scopeLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: flColor.gray600 },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
  },
  scopeBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  scopeText: { fontSize: 13, color: flColor.gray400 },
  scopeTextOn: { color: flColor.bronze300 },

  /* ── refusal ────────────────────────────────────────────────────────────────────────────────── */
  refusalCard: {
    borderRadius: flRadius.xl,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    padding: 16,
    gap: 12,
    boxShadow: 'inset 0 1px 0 rgba(198,156,100,0.16)',
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
    backgroundColor: 'rgba(186,146,92,0.07)',
    borderBottomWidth: 1,
    /* ⚠ DASHED, and this is the whole point of the strip. §11.1.2: "The dashed edge is the signal that
       this object is provisional; every other card in the app uses a solid edge." I had it solid, which
       made a draft look exactly like a saved thing — the single worst failure this surface can have. */
    borderStyle: 'dashed',
    borderBottomColor: flColor.bronzeBorderSubtle,
  },
  draftBannerText: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: flColor.bronze400 },
  cardBody: { padding: 16, gap: 10 },
  cardTitle: { fontFamily: flFont.display, fontSize: 22, lineHeight: 27, color: flColor.cream100 },
  cardSub: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },
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
    paddingBottom: 22,
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
  inputTyping: { borderColor: flColor.bronzeBorder, boxShadow: '0 0 0 3px rgba(186,146,92,0.07)' },
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
