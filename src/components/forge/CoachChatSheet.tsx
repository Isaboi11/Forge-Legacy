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
  TYPING_ENABLED,
  interpret,
  isMedical,
  nextQuestion,
  preamble,
  programCardFor,
  readyToBuild,
  greetReturning,
  refusalCardFor,
  volumeFor,
  weeksBetween,
  type ChatState,
  type Chip,
  type DayCard,
  type EditCard,
  type ProgramCard,
  type RefusalCard,
  type Turn,
} from '@/domain/coach/chat-core';
import { pick } from '@/domain/coach/rulebook/voice';
import { useProfile } from '@/lib/profile';
import { rationaleFor } from '@/domain/coach/rulebook/rationale';
import { buildDayWorkout } from '@/domain/coach/day';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { canDoExercise } from '@/domain/home-gym/equipment';
import { fetchActiveProgram } from '@/data/programs-live';
import { hasMetHolt, loadThread, rememberMetHolt, saveThread } from '@/lib/coach-thread';
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

  /* §6.5 — the introduction is three paragraphs and lands as three beats. Dropping all three at once is
     a wall of text pretending to be a greeting. */
  const [thread, setThread] = useState<Turn[]>([{ kind: 'holt', text: INTRO[0] }]);
  const [introStep, setIntroStep] = useState(1);
  const [draft, setDraft] = useState('');
  /* Declared ABOVE the intro effect, which sets it: a hook cannot close over a const declared below it,
     and react-compiler catches the attempt rather than letting it become a stale closure. */
  const [busy, setBusy] = useState<'thinking' | 'building' | null>(null);
  const [mode, setMode] = useState<'program' | 'day' | null>(null);
  const [constraints, setConstraints] = useState<ChatState>({});
  /** Which builder the card's button opens. The draft itself is already on disk by then. */
  const [built, setBuilt] = useState<{ kind: 'program' | 'day' } | null>(null);
  /** The whole plan, read-only, before the Builder. Holds the last card so it can be redrawn in full. */
  const [preview, setPreview] = useState(false);
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
        beat != null
          ? { kind: 'holt' as const, text: beat }
          : { kind: 'chips' as const, chips: OPENERS.map((label) => ({ label, patch: {} })) },
      ]);
      setIntroStep((n) => n + 1);
    }, gap);

    return () => clearTimeout(id);
  }, [introStep]);

  /* DERIVED, not a second piece of state. A beat is pending for exactly as long as the intro effect is
     mid-flight, and that is already what `introStep` says — setting a `busy` flag from the effect body
     would be a synchronous setState in an effect AND a duplicate of a fact we already hold. */
  const introTyping = INTRO[introStep] != null;
  const waiting = busy ?? (introTyping ? ('thinking' as const) : null);

  /* Guards the greeting against running twice. Read and written INSIDE the effect only — react-compiler
     errors on `ref.current` touched during render, and it is right to: that is a render whose output
     depends on something React cannot see. */
  const greeted = useRef(false);

  const say = useCallback((...turns: Turn[]) => setThread((t) => [...t, ...turns]), []);

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
      const [met, stored] = await Promise.all([hasMetHolt(), loadThread()]);
      if (!alive) return;
      if (!met) {
        void rememberMetHolt();
        return; // the intro effect is already running; leave it alone
      }
      setIntroStep(INTRO.length + 1);
      /* He greets you on arrival — unless he is already stood at the door with the openers up, which is
         what a stored thread ending in chips means. Otherwise every glance would stack another hello. */
      const endsWaiting = stored != null && stored[stored.length - 1]?.kind === 'chips';
      setThread([...(stored ?? []), ...(endsWaiting ? [] : greetReturning(firstName))]);
    })();
    return () => {
      alive = false;
    };
  }, [profileLoading, firstName]);

  useEffect(() => {
    void saveThread(thread);
  }, [thread]);

  /* ── the turn cycle ────────────────────────────────────────────────────────────────────────────── */

  const advance = useCallback(
    async (next: ChatState, mode_: 'program' | 'day') => {
      const merged = { ...next };
      setConstraints(merged);

      try {
        if (!readyToBuild(merged)) {
          // Thinking is a real state and short. It exists so the next question does not appear the instant
          // you tap — a coach who answers before you have finished is not listening, he is waiting.
          setBusy('thinking');
          await pause(420);
          setBusy(null);
          const q = nextQuestion(merged);
          /* The short beat before the question — "Good." / "Right." / "Noted." It is what the original
           hardcoded line did ("Good. What are you training for?"), now varied so it does not become the
             tic that makes him sound like a script. */
          if (q) say({ kind: 'holt', text: `${pick('ack')} ${q.ask}` }, { kind: 'chips', chips: q.chips });
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
            say({ kind: 'holt', text: pick('nothing_to_build') });
            return;
          }
          /* The wizard's own handoff, not a second one. A single day goes to the WORKOUT builder and a
             block goes to the PROGRAM builder — two different review screens, and the chat has no business
             inventing a third route to either. */
          await saveWorkoutDraft({ name: r.day.name, warmup: r.day.warmup, main: r.day.main, cooldown: r.day.cooldown, editId: null });
          setBuilt({ kind: 'day' });
          const dayCard = dayCardFor(merged, r.day);
          setLastCard({ day: dayCard });
          say({ kind: 'holt', text: dayPreamble() }, { kind: 'day', card: dayCard });
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
        const programCard = programCardFor(c, structure, volume, reason);
        setLastCard({ program: programCard });
        say({ kind: 'holt', text: preamble(c, structure.weeks) }, { kind: 'program', card: programCard });
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

    /*
     * "Run a race" NARROWS the question rather than answering it. There is no such goal, and picking one
     * on the athlete's behalf — defaulting to a 5k — would have the engine build for a distance nobody
     * chose. So it sets a chat-only flag and `nextQuestion` asks which.
     */
    if (chip.picksRace) {
      say({ kind: 'me', text: chip.label });
      void advance({ ...constraints, pickingRace: true }, mode ?? 'program');
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

    /* The only chips that leave. `goTo` is a route string the sheet pushes — nothing about training. */
    if (chip.goTo) {
      say({ kind: 'me', text: chip.label });
      onClose();
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
          { kind: 'chips', chips: [{ label: 'Paste it in', patch: {}, goTo: '/program-builder?o=import' }] },
        );
        return;
      }

      if (opener.kind === 'help') {
        say({ kind: 'holt', text: pick('help_open') }, { kind: 'chips', chips: helpChips() });
        return;
      }

      setMode(opener.mode);
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
    /* The typed path only understands the two openers that START something. Typing "how do I…" is a
       question for the model, not for a string match — see TYPING_ENABLED. */
    if (opener?.kind === 'build') {
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
          <HoltMark size={36} state={waiting ?? 'idle'} />
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

        {preview && lastCard ? (
          <PlanPreview
            program={lastCard.program}
            day={lastCard.day}
            onBack={() => setPreview(false)}
            onOpenBuilder={() => {
              setPreview(false);
              onClose();
              router.push(built?.kind === 'day' ? '/workout-builder' : '/program-builder');
            }}
          />
        ) : (
        <ScrollView ref={scroller} style={styles.thread} contentContainerStyle={styles.threadInner} keyboardShouldPersistTaps="handled">
          {thread.map((t, i) => (
            <TurnEnter key={i}>
            <TurnView
              turn={t}
              onChip={tapChip}
              onPreview={() => setPreview(true)}
              onOpenBuilder={() => {
                onClose();
                /*
                 * ⚠ PUSH, NOT REPLACE — and this was a dead back button (PO, 2026-08-09).
                 *
                 * The wizard at `/coach` uses `replace` correctly: it IS a route, so the builder takes
                 * its place and dismissing returns you where you were. This sheet is NOT a route — it
                 * is an overlay on a tab — so `replace` swapped out the TAB underneath it. Save, press
                 * back, and there was nothing beneath to go back to.
                 *
                 * Push leaves the tab in the stack: tab → builder → (builder replaces itself with the
                 * saved program) → back returns to Workouts, which is what the athlete expects.
                 */
                router.push(built?.kind === 'day' ? '/workout-builder' : '/program-builder');
              }}
            />
            </TurnEnter>
          ))}
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
        {preview || !TYPING_ENABLED ? null : (
        <View style={[styles.composer, busy ? styles.composerBusy : null]}>
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

function TurnView({
  turn,
  onChip,
  onOpenBuilder,
  onPreview,
}: {
  turn: Turn;
  onChip: (c: Chip) => void;
  onOpenBuilder: () => void;
  onPreview: () => void;
}) {
  switch (turn.kind) {
    case 'me':
      return (
        <View style={styles.meRow}>
          <Text style={styles.meText}>{turn.text}</Text>
        </View>
      );

    case 'holt':
      return <HoltLine text={turn.text} />;

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
      return <ProgramCardView card={turn.card} onPreview={onPreview} />;

    case 'day':
      return <DayCardView card={turn.card} onOpenBuilder={onOpenBuilder} onPreview={onPreview} />;

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
 * So: every week, every day, every movement, with nothing tappable. Then `Final touches`.
 */
function PlanPreview({
  program,
  day,
  onBack,
  onOpenBuilder,
}: {
  program?: ProgramCard;
  day?: DayCard;
  onBack: () => void;
  onOpenBuilder: () => void;
}) {
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
              {program.weeks.map((w) => (
                <View key={w.label} style={styles.weekRow}>
                  <Text style={styles.weekLabel}>{w.label}</Text>
                  <Text style={styles.weekDetail}>{w.detail}</Text>
                </View>
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

      <View style={styles.previewActions}>
        <Button variant="primary" fullWidth onPress={onOpenBuilder} accessibilityLabel="Final touches">
          Final touches
        </Button>
      </View>
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

/** The most important object on the surface. Every figure on it came out of the engine. */
function ProgramCardView({ card, onPreview }: { card: ProgramCard; onPreview: () => void }) {
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
          {/* ⚠ PREVIEW FIRST, BUILDER SECOND (PO, 2026-08-09). The card is a summary — weeks, peak,
              longest run — and the athlete asked to see the WHOLE thing before deciding whether it needs
              changing. Sending them straight to the Builder made the review step the editing step, which
              is the wrong order: you cannot judge a block from inside the tool for altering it. */}
          <View style={styles.ctaGrow}>
            <Button variant="primary" fullWidth onPress={onPreview} accessibilityLabel="See the whole plan">
              See the whole plan
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

function DayCardView({ card, onOpenBuilder, onPreview }: { card: DayCard; onOpenBuilder: () => void; onPreview: () => void }) {
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
            <Button variant="primary" fullWidth onPress={onPreview} accessibilityLabel="See the whole session">
              See the whole session
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

  /* ⚠ **`flexGrow: 0` PUT THE COMPOSER AT THE TOP OF THE SCREEN.** The list sized itself to its
     content, so one short line of introduction made it one line tall and the input rode up directly
     underneath it with the whole sheet empty below. It has to FILL, so the thread grows downward from
     the header and the composer stays pinned to the bottom edge where it is reachable with a thumb. */
  thread: { flex: 1 },
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

  dotsWrap: { paddingHorizontal: 18, paddingBottom: 14, alignItems: 'flex-start' },
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
  previewActions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22, borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
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
