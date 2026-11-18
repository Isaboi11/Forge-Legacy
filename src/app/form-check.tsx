import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityActionEvent,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { HoltMark } from '@/components/forge/HoltMark';
import { AppBar } from '@/components/forge/composites/AppBar';
import { CloseGlyph, FC, FcPrimary, FcSecondary, FrameFill, HoltSays, MarkedFrame } from '@/components/forge/form-check/FormCheckParts';
import { SlowReplay, YourSet, scrubMode, seekPlayer, type ClipMarker } from '@/components/forge/form-check/YourSet';
import { StopCalls } from '@/components/forge/StopCalls';
import { ScreenBackground } from '@/components/screen-background';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  CARE_KICKER,
  CARE_STOP,
  CRISIS_KICKER,
  CRISIS_STOP,
  STOP_KICKER,
  URGENT_KICKER,
  URGENT_STOP,
} from '@/domain/coach/chat-core';
import {
  FORM_CLIP_MS,
  FORM_FOCUS,
  type FormFocus,
  type FormMark,
  type FormRead,
} from '@/domain/coach/form-check';
import {
  FORM_AGE_UNKNOWN_LINE,
  FORM_BIRTH_YEAR_HELP,
  FORM_HELD,
  FORM_MEDICAL_STOP,
  FORM_NO_READ,
  FORM_UNDER_18_LINE,
  formAgeGate,
  formBirthYear,
  FORM_TRIM_MIN_MS,
  knownFromCoaching,
  moveTrimGrip,
  trimWindow,
  trustRepCount,
  viewLabel,
} from '@/domain/coach/form-check-view';
import { fetchNutritionProfile, saveBirthYear } from '@/data/nutrition-live';
import {
  AI_FEEDBACK_FAILED_LINE,
  AI_FEEDBACK_IDLE,
  aiFeedbackA11y,
  aiFeedbackStep,
  aiFeedbackWrites,
  shownVote,
  type AiFeedbackState,
  type AiRating,
} from '@/domain/ai/ai-feedback-core';
import { skeletonBones, snapMarks } from '@/domain/coach/pose/pose-marks';
import type { PoseFacts } from '@/domain/coach/pose/pose-facts';
import { oneRep, repCards, repStripLabel, repsInside, showMeFrom, wrapReps, type RepCard, type RepSpan } from '@/domain/coach/pose/pose-rep-view';
import { measuredForSave } from '@/domain/coach/pose/pose-measure';
import { coachingContent } from '@/domain/exercise-coaching/query-service';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { matchesSearch, rankFor } from '@/domain/exercise-picker/search-core';
import type { PickerItem } from '@/domain/exercise-picker/catalog-core';
import {
  fetchFormQuote,
  cancelFormTracking,
  filmstrip,
  formCheck,
  formCheckAvailable,
  framesFromVideo,
  pickFormVideo,
  REP_SCAN_MAX_MS,
  repScanSpan,
  scanCovers,
  scanReps,
  type FormQuote,
  type RepScan,
} from '@/data/form-check-live';
import { fetchRecentExerciseKeys } from '@/data/exercise-prefs-live';
import { bodyPoseAvailable } from '@/lib/body-pose';
import { formLiftKey, insertFormCheck, lastSavedForm, saveFormCheck, setFormUseful, shortDate } from '@/data/form-history-live';
import { rateAiOutput } from '@/data/ai-feedback-live';
import { uuid } from '@/lib/app-session';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { usePlansDoor } from '@/hooks/usePremiumGate';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { setCoachAskSeed } from '@/lib/coach-ask-seed';
import { useEntitlementState, usePremiumAi } from '@/lib/entitlement';
import { writeExerciseInbox } from '@/lib/exercise-inbox';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { ensureConsent } from '@/lib/consent';
import { NOT_CHARGED } from '@/domain/ai/ai-failure';
import { withNotCharged } from '@/domain/ai/ai-call';
import { useCloseSignal } from '@/lib/useCloseSignal';
import { AiCreditsChip } from '@/components/forge/AiCreditsChip';

/**
 * FORM CHECK — built to `design_reference/Forge Modal Library Design (8)/Coach Holt Form Check.dc.html`
 * (PO, 2026-09-25). Holt speaks in his mark and bubbles on every screen: 01 Start → 02 Trim → 03 Watching →
 * 04 The read (04b a frame full screen) · 06 the states. 05 Form history is `form-history.tsx`.
 *
 * ══ ⚠ WHAT HOLT MAY SAY ABOUT A VIDEO OF A HUMAN BEING (PO, 2026-09-22) ══
 *
 * *"Stay away from anything that would get us into legal trouble."* Technique only. Enforced in two places
 * that cannot be talked out of it — `medicalRoute` before the model (a note mentioning pain stops the whole
 * thing, unspent) and `sanitizeFormRead` after it, which drops any sentence that strays. This screen only
 * draws what survives both.
 *
 * ══ WHY A SCREEN AND NOT A TURN IN THE CHAT ══
 *
 * The clip goes through `useMediaPicker`, and iOS refuses to present a picker over a modal that is still
 * dismissing (`project_media_capture_picker`). Holt's chat IS a sheet. A screen sidesteps that, and
 * "Ask Holt about this" carries the read back into the chat afterwards.
 *
 * ══ DELIBERATE DELTAS FROM THE .dc (each named where it happens) ══
 *
 *   · "Share to squad" is not drawn — a squad post has no way to carry a form frame yet (composer
 *     attachments + which squad + a private frame in a public feed). DEFERRED.
 *   · "Add to today" appears only while a workout is running; otherwise the drill opens its exercise page.
 *   · The per-rep strip and trim rep ticks are the .dc's "Later version" (body tracking). Not drawn.
 *   · 06e (the camera on a set row in the logger) is not built this pass — `workout.tsx` is being edited
 *     by a parallel session. BLOCKED. This screen already accepts `lift` / `key` / `detail` / `from`
 *     params for it, and draws 01's "Start from a set" variant when they arrive.
 *   · Not in the .dc, added: an athlete without Premium AI sees 06c's layout at Start ("Form check is part
 *     of Premium AI.") rather than filming a set only to be refused; and the trim screen says when a clip
 *     is longer than one read can cover.
 */

const C = FC;

/** The lifts people film most (design 01). Resolved to catalogue rows by name, so a key travels with them. */
const COMMON = ['Back Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Romanian Deadlift', 'Front Squat'];
const SHORT: Record<string, string> = { 'Romanian Deadlift': 'RDL' };

/** The best catalogue row for a name, or null. Exact name/alias first, then the picker's own ranking. */
function findLift(name: string): PickerItem | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const exact = PICKER_DB.find((x) => x.name.toLowerCase() === q || x.aliases.some((a) => a.toLowerCase() === q));
  if (exact) return exact;
  const hits = PICKER_DB.filter((x) => matchesSearch(x, name));
  hits.sort((a, b) => rankFor(a.name, name) - rankFor(b.name, name));
  return hits[0] ?? null;
}

/** A drill Holt named, only if it is exactly a catalogue exercise — never a fuzzy guess at one. */
function findDrill(name: string): PickerItem | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return PICKER_DB.find((x) => x.name.toLowerCase() === q || x.aliases.some((a) => a.toLowerCase() === q)) ?? null;
}

const mmss = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** When the model gave no view line, one made from its own view + rep count — never a claim of ours. */
function fallbackViewLine(read: FormRead): string {
  const from =
    read.view === 'side'
      ? 'From the side'
      : read.view === 'front'
        ? 'From the front'
        : read.view === 'behind'
          ? 'From behind'
          : read.view === 'diagonal'
            ? 'From this angle'
            : '';
  if (!from) return '';
  if (read.reps == null) return `${from}.`;
  const n = read.reps <= 10 ? WORDS[read.reps] : String(read.reps);
  return `${from}, ${n} rep${read.reps === 1 ? '' : 's'}.`;
}

/** The first day of next month, "Oct 1" — when `coach_ai_period` rolls over. */
function nextReset(): string {
  const d = new Date();
  return shortDate(new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString());
}

type Lift = { name: string; key: string | null };

type Picked = { uri: string; durationMs: number | null; notice: string | null; source: 'camera' | 'library' };

type ReadState = {
  read: FormRead;
  lift: Lift;
  uris: string[];
  times: number[];
  id: string | null;
  /** This read's id for the Useful vote in `ai_feedback` (0269): the `form_checks` row id, or — when that insert
      failed — one made once here, never per render. */
  ref: string;
  at: string;
  /** The athlete's joints per frame (body tracking, build 10+) — the full-screen skeleton only. Never saved. */
  stills: (number[] | null)[];
  /** This build tracks bodies and could not lock on: the read says so in one small line (plan §8). */
  poseOff: boolean;
  /** The clip itself, on the phone — "Your set" and "Show me" play it (PO 11-17). Never uploaded. */
  clip: { uri: string; durationMs: number };
  /** The part Holt watched, ms into the clip. */
  win: { start: number; end: number };
  /** Each rep body tracking found, and what it measured — the rep strip. Empty / null without tracking. */
  reps: RepSpan[];
  facts: PoseFacts | null;
  sizes: [number, number][];
};

/** Plan §8: the only thing the athlete is told when body tracking fell back. */
const POSE_OFF_LINE = "Body tracking couldn't lock on, so this read is from the frames alone.";

type Stage =
  | { step: 'start' }
  /** `scan`: body tracking looking for the reps (null on a build without it) — the trim's ticks. */
  | { step: 'trim'; clip: Picked }
  | { step: 'watching'; phase: 0 | 1 | 2; lift: Lift }
  | { step: 'read'; r: ReadState }
  | { step: 'unreadable'; charged: boolean }
  | { step: 'stopped'; kicker: string; text: string }
  /** The output scanner held the read back (Sprint 2, CH-2). */
  | { step: 'held'; refunded: boolean }
  /** 18+ (Sprint 2, FC-1): under 18, or no birth year yet — the field to add it is on this screen. */
  | { step: 'age'; minor: boolean; refunded: boolean }
  | { step: 'credits' }
  | { step: 'not_entitled' }
  | { step: 'problem'; text: string };

export default function FormCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lift?: string; key?: string; detail?: string; from?: string }>();
  const premiumAi = usePremiumAi();
  const { status: entStatus } = useEntitlementState();
  const { session } = useWorkoutSession();
  /* Form check is reachable from a workout, so the plans open only through the door that refuses mid-session
     (M7-D13, sweep G5). */
  const openPlans = usePlansDoor();
  const { openCoach } = useCoachDoor();
  const { pick, mediaPickerSheet } = useMediaPicker();

  const [fromSet, setFromSet] = useState(!!params.lift);
  /* Nothing is picked until the athlete picks (PO 11-17): a preset Back Squat read a deadlift as a squat when nobody
     changed it. A set row's camera (`?lift=`) still arrives with its lift. */
  const [lift, setLiftState] = useState<Lift | null>(() =>
    params.lift ? { name: String(params.lift).slice(0, 60), key: params.key ? String(params.key) : null } : null,
  );
  /** Film / Choose was tapped before a lift was picked: say so at the lift, not with a disabled button. */
  const [needLift, setNeedLift] = useState(false);
  const setLift = (l: Lift | null) => {
    setLiftState(l);
    if (l) setNeedLift(false);
  };
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<FormFocus[]>([]);
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<Stage>({ step: 'start' });
  const [quote, setQuote] = useState<FormQuote | null>(null);
  const [landed, setLanded] = useState<{ uri: string; ms: number }[]>([]);
  const cancelRef = useRef(false);
  /* Leaving the screen mid-read stops the request (Sprint 1, P-G3). Cancel only stops the screen — see `send`. */
  const closeSignal = useCloseSignal();
  /* The last clip sent, so a read the server refused for a missing birth year can go again once it is added. */
  const lastSend = useRef<{ clip: Picked; startMs: number; endMs: number } | null>(null);
  /*
   * ══ 18+ BEFORE THE CAMERA (Sprint 2, FC-1) ══ The function is the boundary (it refuses `under_18` / `age_unknown`
   * from the server's own age); this reads the same birth year up front so nobody films a set only to be refused.
   * A read that fails ('failed') blocks nothing here — the server still decides.
   */
  const [ageGate, setAgeGate] = useState<'loading' | 'adult' | 'minor' | 'unknown' | 'failed'>('loading');

  const canRead = formCheckAvailable();

  /*
   * The trim screen's rep scan (PO 11-17): body tracking runs on the clip as the trim opens — or, on a clip over a
   * minute, on the window the handles are on, again each time a handle is let go — so the trim can mark the reps; and a
   * read whose trim a scan covers slices it instead of tracking again (`scanCovers`).
   *
   * ⚠ ONE PASS AT A TIME. The native pass has ONE cancel flag, and starting a pass clears it — so a pass started while a
   * cancelled one is still winding down would let both run. A new scan, and a read, first wait for the cancelled one
   * (`scanSettling`); `scanToken` makes a request that was overtaken while it waited give up.
   */
  const scanJob = useRef<{ uri: string; span: { startMs: number; endMs: number; fps: number }; promise: Promise<RepScan | null> } | null>(null);
  const scanToken = useRef(0);
  const scanSettling = useRef<Promise<unknown> | null>(null);
  const stopScan = () => {
    scanToken.current += 1;
    const prev = scanJob.current;
    scanJob.current = null;
    if (prev) {
      cancelFormTracking();
      scanSettling.current = prev.promise;
    }
  };
  const beginScan = async (uri: string, durationMs: number | null, win?: { start: number; end: number }): Promise<RepScan | null> => {
    if (!bodyPoseAvailable() || !lift) return null;
    stopScan();
    const token = scanToken.current;
    const settling = scanSettling.current;
    if (settling) await settling;
    if (token !== scanToken.current) return null; // overtaken: a newer scan, or a read, took over
    scanSettling.current = null;
    const pattern = lift.key ? (PICKER_DB.find((x) => x.key === lift.key)?.pattern ?? null) : null;
    const promise = scanReps(uri, durationMs, pattern, lift.name, win);
    scanJob.current = { uri, span: repScanSpan(durationMs, win), promise };
    return promise;
  };
  useEffect(
    () => () => {
      if (scanJob.current) cancelFormTracking();
    },
    [],
  );

  /* No swipe-back while trimming or reading: on iOS 26 a sideways drag anywhere on a pushed screen is "go back", and
     the trim's grips and the read's clip timeline ARE sideways drags (PO 11-17, see TrimStage). The × still closes. */
  const navigation = useNavigation();
  const dragsSideways = stage.step === 'trim' || stage.step === 'read';
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !dragsSideways });
  }, [navigation, dragsSideways]);

  useEffect(() => {
    let live = true;
    void fetchRecentExerciseKeys(8).then(
      (keys) => {
        if (live) setRecent(keys);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void fetchFormQuote().then((q) => {
      if (live) setQuote(q);
    });
    return () => {
      live = false;
    };
  }, [stage.step]);

  useEffect(() => {
    let live = true;
    fetchNutritionProfile({ strict: true }).then(
      (p) => {
        if (live) setAgeGate(formAgeGate(p.birthYear));
      },
      () => {
        if (live) setAgeGate('failed');
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  /* Today's lifts (a workout is running), then the athlete's recent ones, then the common six — nine at most. */
  const commonChips = useMemo(() => {
    const out: { label: string; lift: Lift }[] = [];
    const add = (name: string, key: string | null) => {
      if (out.length >= 9 || out.some((c) => (key && c.lift.key === key) || c.lift.name.toLowerCase() === name.toLowerCase())) return;
      out.push({ label: SHORT[name] ?? name, lift: { name, key } });
    };
    for (const l of session?.lifts ?? []) {
      const it = l.catalogKey ? PICKER_DB.find((x) => x.key === l.catalogKey) : null;
      if (it?.modality !== 'cardio') add(l.name, l.catalogKey ?? null);
    }
    for (const k of recent) {
      const it = PICKER_DB.find((x) => x.key === k);
      if (it && it.modality !== 'cardio') add(it.name, it.key);
    }
    for (const n of COMMON) {
      const it = findLift(n);
      add(it?.name ?? n, it?.key ?? null);
    }
    return out;
  }, [session?.lifts, recent]);
  const results = useMemo(() => {
    const q = search.trim();
    if (q.length < 2) return [];
    const hits = PICKER_DB.filter((x) => matchesSearch(x, q));
    hits.sort((a, b) => rankFor(a.name, q) - rankFor(b.name, q));
    return hits.slice(0, 6);
  }, [search]);

  const toggleFocus = (f: FormFocus | 'Everything') => {
    if (f === 'Everything') return setFocus([]);
    setFocus((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  };

  // ── 01 → 02: the clip ────────────────────────────────────────────────────────
  const choose = async (source: 'camera' | 'library') => {
    if (!lift) return setNeedLift(true);
    const video = await pickFormVideo(pick, source);
    if (video.kind === 'cancelled') return;
    if (video.kind === 'unavailable') return; // the screen already shows 06d when this is true
    if (video.kind === 'not_a_video') {
      setStage({ step: 'problem', text: "That was a photo, not a clip. Film the set and I'll look at it." });
      return;
    }
    stopScan();
    setStage({ step: 'trim', clip: { uri: video.uri, durationMs: video.durationMs, notice: video.notice, source } });
  };

  // ── 02 → 03 → 04: the read ───────────────────────────────────────────────────
  const send = async (clip: Picked, startMs: number, endMs: number) => {
    if (!lift) return;
    /* Asked before a frame is pulled, so the wait is never for nothing (MHMDA consent to share). */
    if (!(await ensureConsent('ai_sharing'))) return setStage({ step: 'problem', text: AI_DECLINED_LINE });
    const chosen = lift;
    lastSend.current = { clip, startMs, endMs };
    cancelRef.current = false;
    setLanded([]);
    setStage({ step: 'watching', phase: 0, lift: chosen });

    /* The trim screen's scan: waited for when it covers this trim (it IS this read's tracking, started early), else
       stopped first — two passes must not share the native cancel flag. */
    let scan: RepScan | null = null;
    const job = scanJob.current;
    scanJob.current = null;
    scanToken.current += 1; // a scan request still waiting gives up
    if (job && job.uri === clip.uri) {
      if (scanCovers(job.span, startMs, endMs)) scan = await job.promise;
      else {
        cancelFormTracking();
        await job.promise;
      }
    }
    if (scanSettling.current) await scanSettling.current;
    scanSettling.current = null;
    if (cancelRef.current) return;

    const got = await framesFromVideo(clip.uri, {
      durationMs: clip.durationMs,
      startMs,
      endMs,
      onFrame: (uri, ms) => setLanded((l) => [...l, { uri, ms }]),
      cancelled: () => cancelRef.current,
      // Which signal body tracking watches: the catalogue's own movement pattern, else the name.
      pattern: chosen.key ? (PICKER_DB.find((x) => x.key === chosen.key)?.pattern ?? null) : null,
      lift: chosen.name,
      scan,
    });
    if (cancelRef.current) return;
    if (got.frames.length === 0) {
      // Nothing left the phone, so nothing was charged.
      setStage({ step: 'unreadable', charged: false });
      return;
    }

    setStage({ step: 'watching', phase: 1, lift: chosen });
    const last = await lastSavedForm(formLiftKey(chosen.name, chosen.key));
    const known = chosen.key ? knownFromCoaching(coachingContent.getPublished(chosen.key)) : '';
    const res = await formCheck({ lift: chosen.name, frames: got.frames, times: got.times, sizes: got.sizes, note, focus, known, last, pose: got.pose?.facts }, closeSignal());
    /* ⚠ A CANCEL DURING THE MODEL CALL ONLY STOPS THE SCREEN. The request is already out; if it comes back
       readable the function has spent the credit. The athlete asked to stop looking, not for a refund. */
    if (cancelRef.current) return;

    switch (res.kind) {
      case 'ok': {
        // "Writing it up" is real work: the read is recorded so Useful / Save have a row to act on.
        setStage({ step: 'watching', phase: 2, lift: chosen });
        // Holt's marks moved onto the real joints of the frames he named (body tracking; unchanged without it).
        const snapped = got.pose ? { ...res.read, marks: snapMarks(res.read.marks, got.pose.stills, got.sizes) } : res.read;
        /* The count shown (and saved) is the phone's, or none — never the model's guess (PO 11-17, `trustRepCount`). */
        const read = trustRepCount(snapped, got.pose && got.pose.level !== 'off' ? got.pose.reps.length : null);
        const id = await insertFormCheck({ lift: chosen.name, exerciseKey: chosen.key, read, measured: measuredForSave(got.pose?.facts ?? null) });
        if (cancelRef.current) return;
        setStage({
          step: 'read',
          r: {
            read,
            lift: chosen,
            uris: got.uris,
            times: got.times,
            id,
            ref: id ?? uuid(),
            at: shortDate(new Date().toISOString()),
            stills: got.pose?.stills ?? [],
            poseOff: got.pose?.level === 'off',
            clip: { uri: clip.uri, durationMs: clip.durationMs && clip.durationMs > 0 ? clip.durationMs : FORM_CLIP_MS },
            win: trimWindow(clip.durationMs && clip.durationMs > 0 ? clip.durationMs : FORM_CLIP_MS, startMs, endMs),
            reps: got.pose?.reps ?? [],
            facts: got.pose?.facts ?? null,
            sizes: got.sizes,
          },
        });
        return;
      }
      case 'unreadable':
        return setStage({ step: 'unreadable', charged: res.charged });
      case 'stopped':
        return setStage({
          step: 'stopped',
          kicker: res.route === 'crisis' ? CRISIS_KICKER : res.route === 'urgent' ? URGENT_KICKER : res.route === 'care' ? CARE_KICKER : STOP_KICKER,
          // 06b's own line for a form check; crisis / urgent / care keep the chat's routes word for word.
          text: res.route === 'crisis' ? CRISIS_STOP : res.route === 'urgent' ? URGENT_STOP : res.route === 'care' ? CARE_STOP : FORM_MEDICAL_STOP,
        });
      /* Sprint 2: the output scanner held the read back; the age floor refused it. Each refunded on the server. */
      case 'held':
        return setStage({ step: 'held', refunded: res.refunded === true });
      case 'under_18':
        setAgeGate('minor');
        return setStage({ step: 'age', minor: true, refunded: res.refunded === true });
      case 'age_unknown':
        setAgeGate('unknown');
        return setStage({ step: 'age', minor: false, refunded: res.refunded === true });
      case 'out_of_credits':
        return setStage({ step: 'credits' });
      case 'not_entitled':
        return setStage({ step: 'not_entitled' });
      case 'bad_frames':
        return setStage({ step: 'problem', text: 'That clip was too big to send. A shorter trim works best, from any angle.' });
      case 'unavailable_here':
        return setStage({ step: 'problem', text: 'Form check needs the latest version of the app.' });
      /* "Not charged." only when the server says it gave the credits back (Sprint 1 contract §1.2): after the app's
         own 90 s a read the server finished may still have spent them. */
      case 'unavailable':
        return setStage({ step: 'problem', text: withNotCharged('That broke on my end. Try again in a moment.', res.refunded) });
      case 'offline':
        return setStage({ step: 'problem', text: "I couldn't reach my notes just then. Check your connection and send it again." });
      /* "Not now" on the AI consent sheet — the frames never left the phone. */
      case 'no_consent':
        return setStage({ step: 'problem', text: AI_DECLINED_LINE });
    }
  };

  const restart = () => {
    stopScan();
    setStage({ step: 'start' });
  };

  /* A birth year was added on the age state. A minor is told so; an adult's refused set goes again, or Start opens. */
  const onBirthYear = (year: number) => {
    const gate = formAgeGate(year);
    setAgeGate(gate);
    if (gate === 'minor') return setStage({ step: 'age', minor: true, refunded: false });
    const again = lastSend.current;
    if (stage.step === 'age' && again) return void send(again.clip, again.startMs, again.endMs);
    return restart();
  };

  // ── What to draw ─────────────────────────────────────────────────────────────
  if (!canRead) return <NotOnDevice onClose={close} />;

  if (entStatus === 'ready' && !premiumAi && stage.step === 'start') {
    return (
      <Shell onClose={close}>
        <CreditsState notEntitled premiumAi={false} onPlans={() => void openPlans()} />
      </Shell>
    );
  }

  /* 18+ (Sprint 2): refused by the server, or known before the camera opens. */
  if (stage.step === 'age' || (stage.step === 'start' && (ageGate === 'minor' || ageGate === 'unknown'))) {
    const minor = stage.step === 'age' ? stage.minor : ageGate === 'minor';
    return (
      <Shell onClose={close}>
        {/* `age` is only ever set after a set was sent (the server refused it), so its clip is there to send again. */}
        <AgeState minor={minor} refunded={stage.step === 'age' && stage.refunded} resend={stage.step === 'age'} onSaved={onBirthYear} />
      </Shell>
    );
  }

  if (stage.step === 'held') {
    return (
      <Shell onClose={close}>
        <View style={s.center}>
          <HoltSays text={FORM_HELD} />
        </View>
        <View style={[s.bottom, { paddingBottom: 26 + insets.bottom }]}>
          <FcPrimary label="Try another clip" onPress={restart} />
          {stage.refunded ? <Text style={s.foot}>{NOT_CHARGED}</Text> : null}
        </View>
      </Shell>
    );
  }

  if (stage.step === 'trim') {
    return (
      <Shell onClose={close}>
        <TrimStage
          clip={stage.clip}
          rescan={bodyPoseAvailable() ? (w) => beginScan(stage.clip.uri, stage.clip.durationMs, w) : null}
          onSend={(a, b) => void send(stage.clip, a, b)}
          onRepick={() => {
            restart();
            void choose(stage.clip.source);
          }}
        />
        {mediaPickerSheet}
      </Shell>
    );
  }

  if (stage.step === 'watching') {
    return (
      <Shell>
        <WatchingStage
          phase={stage.phase}
          lift={stage.lift.name}
          landed={landed}
          onCancel={() => {
            cancelRef.current = true;
            cancelFormTracking();
            restart();
          }}
        />
      </Shell>
    );
  }

  if (stage.step === 'read') {
    const r = stage.r;
    return (
      <Shell onClose={close}>
        <ReadStage
          r={r}
          sessionActive={!!session}
          onAsk={(text) => {
            setCoachAskSeed(text);
            openCoach('ask');
            close();
          }}
          onDrill={(item) => {
            if (session) {
              void writeExerciseInbox({
                kind: 'add',
                items: [{ catalogKey: item.key, name: item.name, equip: item.equip, muscles: item.muscles, type: item.modality }],
              }).then(() => router.push('/workout'));
            } else {
              router.push({ pathname: '/exercise/[id]', params: { id: item.key } });
            }
          }}
          onHistory={() =>
            router.push({ pathname: '/form-history', params: { key: formLiftKey(r.lift.name, r.lift.key), lift: r.lift.name } } as unknown as Parameters<typeof router.push>[0])
          }
          onAnother={restart}
        />
      </Shell>
    );
  }

  if (stage.step === 'unreadable' || stage.step === 'problem') {
    return (
      <Shell onClose={close}>
        <View style={s.center}>
          <HoltSays text={stage.step === 'unreadable' ? FORM_NO_READ : stage.text} />
        </View>
        <View style={[s.bottom, { paddingBottom: 26 + insets.bottom }]}>
          <FcPrimary label="Try another clip" onPress={restart} />
          {stage.step === 'unreadable' && !stage.charged ? <Text style={s.foot}>{NOT_CHARGED}</Text> : null}
        </View>
      </Shell>
    );
  }

  if (stage.step === 'stopped') {
    return (
      <Shell onClose={close}>
        <View style={s.center}>
          <View style={s.stopBox}>
            <Text style={s.stopKicker}>{stage.kicker}</Text>
            <Text style={s.stopText}>{stage.text}</Text>
            {/* QA holtai-11: Call / Text under a crisis or emergency line. */}
            <StopCalls kicker={stage.kicker} />
          </View>
        </View>
      </Shell>
    );
  }

  if (stage.step === 'credits' || stage.step === 'not_entitled') {
    return (
      <Shell onClose={close}>
        <CreditsState notEntitled={stage.step === 'not_entitled'} premiumAi={premiumAi} onPlans={() => void openPlans()} />
      </Shell>
    );
  }

  // ── 01 Start ─────────────────────────────────────────────────────────────────
  return (
    <Shell onClose={close}>
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={s.flex} contentContainerStyle={s.startBody} keyboardShouldPersistTaps="handled">
        <HoltSays
          text="Show me a set. Any angle works. Get your whole body in frame and I'll tell you what I see."
          under="Technique only. Nothing about your body, nothing medical."
        />

        <View style={s.group}>
          <Text style={s.label}>WHICH LIFT</Text>
          {needLift ? (
            <Text style={s.needLift} accessibilityLiveRegion="polite">
              Pick the lift first, so I know what to look for.
            </Text>
          ) : null}
          {fromSet && lift ? (
            <>
              <View style={s.fromSet}>
                <Text style={s.fromSetName} numberOfLines={1}>
                  {lift.name}
                  {params.detail ? <Text style={s.fromSetDetail}>{`  · ${params.detail}`}</Text> : null}
                </Text>
                <Pressable onPress={() => setFromSet(false)} style={s.change} accessibilityRole="button" accessibilityLabel="Change lift">
                  <Text style={s.changeText}>Change</Text>
                </Pressable>
              </View>
              {params.from ? <Text style={s.hint}>{params.from}</Text> : null}
            </>
          ) : (
            <>
              <View style={s.search}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth={1.8} strokeLinecap="round">
                  <Circle cx={11} cy={11} r={6.5} />
                  <Path d="M16 16l4 4" />
                </Svg>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search exercises"
                  placeholderTextColor={C.ink3}
                  style={s.searchInput}
                  maxLength={60}
                  accessibilityLabel="Search exercises"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const t = search.trim();
                    if (!t) return;
                    const hit = results[0];
                    setLift(hit ? { name: hit.name, key: hit.key } : { name: t, key: null });
                    setSearch('');
                  }}
                />
              </View>
              <View style={s.chips}>
                {search.trim().length >= 2 ? (
                  <>
                    {results.map((x) => (
                      <Chip
                        key={x.key}
                        label={x.name}
                        on={lift?.key === x.key}
                        onPress={() => {
                          setLift({ name: x.name, key: x.key });
                          setSearch('');
                        }}
                      />
                    ))}
                    {results.length === 0 ? (
                      <Chip
                        label={`Use “${search.trim()}”`}
                        on={false}
                        onPress={() => {
                          setLift({ name: search.trim(), key: null });
                          setSearch('');
                        }}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    {commonChips.map((c) => (
                      <Chip key={c.label} label={c.label} on={lift?.name === c.lift.name} onPress={() => setLift(c.lift)} />
                    ))}
                    {lift && !commonChips.some((c) => c.lift.name === lift.name) ? <Chip label={lift.name} on onPress={() => undefined} /> : null}
                  </>
                )}
              </View>
            </>
          )}
        </View>

        <View style={s.group}>
          <Text style={s.label}>
            WHAT SHOULD I LOOK AT<Text style={s.labelSoft}>{'  · optional'}</Text>
          </Text>
          <View style={s.chips}>
            <Chip label="Everything" on={focus.length === 0} onPress={() => toggleFocus('Everything')} />
            {FORM_FOCUS.map((f) => (
              <Chip key={f} label={f} on={focus.includes(f)} onPress={() => toggleFocus(f)} />
            ))}
          </View>
          <TextInput returnKeyType="done"
            value={note}
            onChangeText={setNote}
            placeholder="Anything else? Rep 4 felt off…"
            placeholderTextColor={C.ink3}
            style={s.note}
            maxLength={300}
            accessibilityLabel="Anything else to look at"
          />
        </View>
      </ScrollView>

      <View style={[s.startFoot, { paddingBottom: 26 + insets.bottom }]}>
        <View style={s.twoUp}>
          <View style={s.flex}>
            <FcPrimary hero label="Film a set" onPress={() => void choose('camera')} icon={<CameraIcon color={flColor.onBronze} />} />
          </View>
          <View style={s.flex}>
            <FcSecondary height={64} label="Choose a clip" onPress={() => void choose('library')} icon={<ClipIcon color={C.ink} />} />
          </View>
        </View>
        <View style={s.footLines}>
          {quote && quote.cost > 0 ? <Text style={s.credit}>{`Uses ${quote.cost} of your ${quote.remaining} AI credits this month.`}</Text> : null}
          <Text style={s.tip}>Side view shows bar path best, but every angle gets a read.</Text>
        </View>
      </View>
      {mediaPickerSheet}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The shared AppBar (modal-native × on the leading edge) — it pads the safe-area top itself, so the
 *  shell no longer does. It drew its own FormBar (legacy-28 / visualA-29, QA 09-26). */
function Shell({ children, onClose, title = 'Form Check' }: { children: React.ReactNode; onClose?: () => void; title?: string }) {
  return (
    <View style={s.root}>
      <ScreenBackground atmospheric overlay={null} />
      <AppBar title={title} onClose={onClose} actions={<AiCreditsChip />} />
      {children}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.chip, on && s.chipOn]}>
      {on ? (
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.brz} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 12.5l5 5L20 6.5" />
        </Svg>
      ) : null}
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={6.5} width={13} height={11} rx={2} />
      <Path d="M16 10.5l5-3v9l-5-3" />
    </Svg>
  );
}

function ClipIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={16} height={14} rx={2} />
      <Circle cx={9} cy={10} r={1.6} />
      <Path d="M20 16l-5-5-8 8" />
    </Svg>
  );
}

// ── 02 Trim ────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ══ IT TRIMS LIKE THE PHOTOS APP (PO, 2026-11-17) ══
 *
 * *"The drag … is finicky and keeps trying to swipe the whole screen. As well as I can't see where I'm swiping
 * to. Should be working like apple clipping a video."* Three causes, three fixes:
 *
 *   1. THE SCREEN WAS SWIPING BACK. On iOS 26 react-native-screens hands back-navigation to iOS's own
 *      full-screen swipe (`interactiveContentPopGestureRecognizer`), so a rightward drag ANYWHERE on a pushed
 *      screen starts "go back" — and no JS responder can outbid a UIKit recogniser. `FormCheckScreen` turns the
 *      swipe off while this stage is up (`gestureEnabled: false`); the AppBar × is the way out.
 *   2. THE PICTURE DIDN'T FOLLOW THE FINGER. Now a grip pauses the clip and scrubs it to the grip's frame as it
 *      moves (expo-video's scrubbing mode: it chases the finger and drops stale seeks, Apple QA1820), so the big
 *      player IS the preview. A playhead rides the strip; touching the strip between the grips scrubs it, and
 *      Play loops the chosen part only. The play button hides while scrubbing — it sat on the lifter.
 *   3. THE GRIP JUMPED AND SLIPPED. It followed the finger's absolute position against a rail measured once on
 *      layout — mid push-animation, so off by the slide — and any other responder could take the touch. Now the
 *      drag is RELATIVE (where the grip was + how far the finger moved), the touch is held until lift-off, and
 *      each grip reaches ~50 × 92 pt, mostly OUTWARD; two grips close together split the gap at its middle.
 *
 * Drawn as the .dc draws it (bronze bracket, 14 pt grips, 64 pt strip, the shades). Not in the .dc, added: the
 * playhead, and tenths of a second on the times while a finger is down.
 *
 * ══ THE REPS, MARKED (PO 11-17, step 1 — the .dc's "Later version") ══
 *
 * Body tracking scans the clip as this screen opens (`scanReps`, started by `choose`). While it runs the tick row
 * says "Finding your reps…"; then each rep gets a numbered tick at its turnaround and — unless the athlete has
 * already moved a grip — the window wraps the reps it found. Tapping a number trims to that rep alone ("Just rep 3",
 * the .dc's label); tapping it again puts the window back. Holt's line says what happened. No tracking (web, or no
 * reps) = today's screen exactly.
 */

const HANDLE = 14;
const STRIP_H = 64;
/** Touch room above and below the strip — inside the touch layer, so nothing clips it. */
const TOUCH_PAD = 14;
/** A grip's reach past the grip itself: mostly outward (away from the other grip), a little into the window. */
const REACH_OUT = 26;
const REACH_IN = 10;
/** VoiceOver's swipe up / down on a grip moves it by this much. */
const A11Y_STEP_MS = 500;
const A11Y_ADJUST = [{ name: 'increment' }, { name: 'decrement' }];

/** "0:04.2" — the times while a finger is down, where a whole second is too coarse to see a grip move. */
const mmssT = (ms: number) => {
  const tenths = Math.max(0, Math.round(ms / 100));
  const sec = Math.floor(tenths / 10);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}.${tenths % 10}`;
};

type TrimDrag = 'start' | 'end' | 'head';
type Win = { start: number; end: number };

/** Web scrolls in the browser, where no responder reaches — the strip keeps its touches (see `useCompareDrag`). */
const TRIM_TOUCH_STYLE = Platform.OS === 'web' ? ({ touchAction: 'none' } as unknown as ViewStyle) : null;

function TrimStage({
  clip,
  rescan,
  onSend,
  onRepick,
}: {
  clip: Picked;
  /** Body tracking over the clip (or, past a minute, over `win`), or null on a build without it. */
  rescan: ((win?: Win) => Promise<RepScan | null>) | null;
  onSend: (startMs: number, endMs: number) => void;
  onRepick: () => void;
}) {
  const insets = useSafeAreaInsets();
  const dur = clip.durationMs && clip.durationMs > 0 ? clip.durationMs : FORM_CLIP_MS;
  const [trim, setTrim] = useState(() => trimWindow(dur, 0, Math.min(dur, FORM_CLIP_MS)));
  const [strip, setStrip] = useState<(string | null)[]>([]);
  /** Where the picture is, in ms — the playhead. */
  const [head, setHead] = useState(0);
  const [drag, setDrag] = useState<TrimDrag | null>(null);
  /** The strip's width in points — render needs it to split the touch room between two grips close together. */
  const [stripW, setStripW] = useState(0);
  /** The reps body tracking found: null while it looks. */
  const [reps, setReps] = useState<RepSpan[] | null>(rescan ? null : []);
  /** The rep the window is trimmed to on its own ("Just rep 3"), 0-based. */
  const [just, setJust] = useState<number | null>(null);
  const player = useVideoPlayer(clip.uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.1;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false, oldIsPlaying: false });
  /* Play covers the chosen part only: past its end (or looped round to before its start) it goes again. */
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (drag) return; // the finger owns the picture
    const ms = currentTime * 1000;
    if (isPlaying && (ms >= trim.end || ms < trim.start - 250)) {
      seekPlayer(player, trim.start);
      setHead(trim.start);
      return;
    }
    setHead(ms);
  });

  useEffect(() => {
    let alive = true;
    void filmstrip(clip.uri, dur, 8).then((f) => {
      if (alive) setStrip(f);
    });
    return () => {
      alive = false;
    };
  }, [clip.uri, dur]);

  /*
   * The gestures, built ONCE (a PanResponder keeps its gesture state in its own closure, so a rebuilt one mid-drag
   * would start again from dx 0). What they read has to be live — the window, the strip's width, where this drag
   * began — so it sits in `live`, a plain object in this closure: not a ref (the compiler forbids reaching one from
   * anything built during render) and not state (frozen at the first render). Render reads `trim` / `head` state.
   * `player` and `dur` are fixed for the life of this stage: a different clip goes back through Start.
   */
  const [pans] = useState(() => {
    /* `touched`: a grip has moved, so the scan must not move the window under the athlete. `before`: the window to put
       back when "Just rep N" is tapped off. */
    const live = { trim, w: 1, grab: 0, x0: 0, touched: false, just: null as number | null, before: null as Win | null, seq: 0, alive: true };
    /** Past a minute the whole clip is too long to scan densely: the reps are looked for where the handles are. */
    const long = dur > REP_SCAN_MAX_MS;
    const show = (ms: number) => {
      seekPlayer(player, ms);
      setHead(ms);
    };
    const begin = (which: TrimDrag) => {
      player.pause();
      scrubMode(player, true);
      setDrag(which);
    };
    const finish = () => {
      scrubMode(player, false);
      setDrag(null);
    };
    const set = (next: Win, at: number) => {
      live.trim = next;
      setTrim(next);
      show(at);
    };
    const put = (which: 'start' | 'end', want: number) => {
      const next = moveTrimGrip(which, want, live.trim, dur);
      set(next, next[which]);
    };
    /* A grip moved by hand: the window is the athlete's now, and no longer "just" one rep. */
    const handMoved = () => {
      live.touched = true;
      if (live.just != null) {
        live.just = null;
        live.before = null;
        setJust(null);
      }
    };
    const grip = (which: 'start' | 'end') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Once a grip has the finger it keeps it until lift-off.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          handMoved();
          live.grab = live.trim[which];
          begin(which);
          show(live.grab);
        },
        onPanResponderMove: (_e, g) => put(which, live.grab + (g.dx / live.w) * dur),
        onPanResponderRelease: () => {
          finish();
          if (long) look(false);
        },
        onPanResponderTerminate: finish,
      });
    /* The strip itself: touch to put the playhead there (inside the window), drag to scrub. */
    const place = (x: number) => show(Math.max(live.trim.start, Math.min(live.trim.end, (x / live.w) * dur)));
    const scrub = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        live.x0 = e.nativeEvent.locationX;
        begin('head');
        place(live.x0);
      },
      onPanResponderMove: (_e, g) => place(live.x0 + g.dx),
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
    /* VoiceOver: a grip is adjustable — swipe up / down moves it half a second. */
    const nudge = (which: 'start' | 'end') => (e: AccessibilityActionEvent) => {
      const by = e.nativeEvent.actionName === 'increment' ? A11Y_STEP_MS : e.nativeEvent.actionName === 'decrement' ? -A11Y_STEP_MS : 0;
      if (!by) return;
      handMoved();
      put(which, live.trim[which] + by);
    };
    /* Found reps are wrapped — unless a grip has already moved. */
    const wrap = (rs: RepSpan[]) => {
      const w = live.touched ? null : wrapReps(rs, dur, FORM_TRIM_MIN_MS, FORM_CLIP_MS);
      if (w) set(w, w.start);
    };
    /* Look for the reps: the whole clip, or — past a minute — the window the handles are on. `fresh`: the screen is
       already saying "Finding your reps…". Only the newest look counts; a failed one leaves the ticks empty. */
    const look = (fresh: boolean) => {
      if (!rescan) return;
      const seq = ++live.seq;
      if (!fresh) setReps(null);
      void rescan(long ? { ...live.trim } : undefined).then((found) => {
        if (!live.alive || seq !== live.seq) return;
        const rs = found?.reps ?? [];
        setReps(rs);
        wrap(rs);
      });
    };
    return {
      look,
      dispose: () => {
        live.alive = false;
      },
      /** A rep's number was tapped: that rep alone, or (null) the window from before. */
      pick: (i: number | null, rs: RepSpan[]) => {
        if (i == null || !rs[i]) {
          const back = live.before ?? live.trim;
          live.just = null;
          live.before = null;
          setJust(null);
          set(back, back.start);
          return;
        }
        if (live.just == null) live.before = live.trim;
        live.just = i;
        live.touched = true;
        setJust(i);
        const w = oneRep(rs[i], dur, FORM_TRIM_MIN_MS, FORM_CLIP_MS);
        set(w, w.start);
      },
      start: grip('start'),
      end: grip('end'),
      scrub,
      nudgeStart: nudge('start'),
      nudgeEnd: nudge('end'),
      /** The strip's width, from its onLayout — the drag turns points into milliseconds with it. */
      measured: (w: number) => {
        live.w = Math.max(1, w);
      },
    };
  });

  useEffect(() => {
    pans.look(true);
    return () => pans.dispose();
  }, [pans]);

  const leftPct = (trim.start / dur) * 100;
  const rightPct = 100 - (trim.end / dur) * 100;
  const headPct = (Math.max(0, Math.min(dur, head)) / dur) * 100;
  const win = trim.end - trim.start;
  const whole = trim.start === 0 && dur <= FORM_CLIP_MS && Math.abs(trim.end - dur) < 50;
  const found = reps?.length ?? 0;
  const held = found ? repsInside(reps ?? [], trim) : 0;
  const midLabel =
    just != null
      ? `Just rep ${just + 1}`
      : drag
        ? `${(win / 1000).toFixed(1)} s`
        : whole
          ? `${Math.round(win / 1000)} s · whole set`
          : held
            ? `${Math.round(win / 1000)} s · ${held} rep${held === 1 ? '' : 's'}`
            : `${Math.round(win / 1000)} s`;
  const at = drag ? mmssT : mmss;
  /* Each grip reaches REACH_OUT outward and, inward, up to half the window — so two grips close together split
     the space between them at the middle instead of the later one covering the other. */
  const reachIn = Math.min(HANDLE + REACH_IN, stripW > 0 ? ((win / dur) * stripW) / 2 : HANDLE + REACH_IN);

  return (
    <>
      <View style={s.player}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        <Text style={s.clipTag}>YOUR CLIP</Text>
        {drag ? null : (
          <Pressable
            onPress={() => {
              if (isPlaying) return player.pause();
              // Play starts the chosen part over unless the playhead is already inside it.
              if (head < trim.start || head >= trim.end - 100) {
                seekPlayer(player, trim.start);
                setHead(trim.start);
              }
              player.play();
            }}
            style={s.playBtn}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="#F0EDE8">
              {isPlaying ? <Path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <Path d="M8 5.5v13l10.5-6.5z" />}
            </Svg>
          </Pressable>
        )}
        <Text style={s.timeTag}>{`${at(head)} / ${mmss(dur)}`}</Text>
      </View>

      <View style={s.trimBody}>
        <HoltSays
          text={found ? `I found ${found} rep${found === 1 ? '' : 's'}. Tap a number for just that rep, or drag the handles.` : 'Drag around the reps you want me to watch.'}
          label={false}
          size={32}
        />
        {clip.notice ? (
          <Text style={s.hint}>
            {`That clip is long — I'll watch up to ${Math.round(FORM_CLIP_MS / 1000)} seconds of it.${rescan && dur > REP_SCAN_MAX_MS ? ' Put the handles over your set and I’ll find the reps.' : ''}`}
          </Text>
        ) : null}

        <View style={s.stripWrap}>
          {/* The .dc's rep ticks — over the strip's touch room (zIndex), and only the ticks themselves take a touch. */}
          {rescan ? (
            <View style={s.tickRow} pointerEvents="box-none">
              {reps === null ? (
                <Text style={s.tickWait}>Finding your reps…</Text>
              ) : (
                reps.map((r, i) => (
                  <Pressable
                    key={r.turnMs}
                    onPress={() => pans.pick(just === i ? null : i, reps)}
                    hitSlop={{ top: 8, bottom: 2, left: 4, right: 4 }}
                    style={[s.tickTap, { left: `${(r.turnMs / dur) * 100}%` }]}
                    accessibilityRole="button"
                    accessibilityLabel={just === i ? `Rep ${i + 1} on its own. Tap for every rep` : `Just rep ${i + 1}`}
                    accessibilityState={{ selected: just === i }}
                  >
                    <Text style={[s.tickN, just === i && s.tickOn]}>{i + 1}</Text>
                    <View style={[s.tickBar, just === i && s.tickBarOn]} />
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
          {/* The touch layer: the strip plus room above and below it, none of it clipped. */}
          <View
            style={[s.stripTouch, TRIM_TOUCH_STYLE]}
            onLayout={(e) => {
              pans.measured(e.nativeEvent.layout.width);
              setStripW(e.nativeEvent.layout.width);
            }}
          >
            {/* What you see — the .dc's strip and bracket. None of it takes a touch. */}
            <View pointerEvents="none" style={s.strip}>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={s.stripCell}>
                  <FrameFill />
                  {strip[i] ? <Image source={{ uri: strip[i] as string }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                </View>
              ))}
              <View style={[s.shade, { left: 0, width: `${leftPct}%` }]} />
              <View style={[s.shade, { right: 0, width: `${rightPct}%` }]} />
              <View style={[s.rail, { top: 0, left: `${leftPct}%`, right: `${rightPct}%` }]} />
              <View style={[s.rail, { bottom: 0, left: `${leftPct}%`, right: `${rightPct}%` }]} />
              <View style={[s.grip, s.gripL, { left: `${leftPct}%` }]}>
                <View style={s.gripLine} />
              </View>
              <View style={[s.grip, s.gripR, { right: `${rightPct}%` }]}>
                <View style={s.gripLine} />
              </View>
            </View>
            {/* The playhead — hidden while a grip moves, when the picture is the grip's frame anyway. */}
            {drag === 'start' || drag === 'end' ? null : <View pointerEvents="none" style={[s.playhead, { left: `${headPct}%` }]} />}

            {/* What you touch. The scrub layer first, so the grips sit over it. */}
            <View {...pans.scrub.panHandlers} style={StyleSheet.absoluteFill} />
            <View
              {...pans.start.panHandlers}
              style={[s.gripTouch, { left: `${leftPct}%`, marginLeft: -REACH_OUT, width: REACH_OUT + reachIn }]}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Trim start"
              accessibilityValue={{ text: mmss(trim.start) }}
              accessibilityActions={A11Y_ADJUST}
              onAccessibilityAction={pans.nudgeStart}
            />
            <View
              {...pans.end.panHandlers}
              style={[s.gripTouch, { right: `${rightPct}%`, marginRight: -REACH_OUT, width: REACH_OUT + reachIn }]}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Trim end"
              accessibilityValue={{ text: mmss(trim.end) }}
              accessibilityActions={A11Y_ADJUST}
              onAccessibilityAction={pans.nudgeEnd}
            />
          </View>
          <View style={s.trimLabels} pointerEvents="none">
            <Text style={[s.trimTime, drag === 'start' && s.trimTimeOn]}>{at(trim.start)}</Text>
            <Text style={s.trimMid}>{midLabel}</Text>
            <Text style={[s.trimTime, drag === 'end' && s.trimTimeOn]}>{at(trim.end)}</Text>
          </View>
        </View>
      </View>

      <View style={[s.trimFoot, { paddingBottom: 26 + insets.bottom }]}>
        <FcPrimary
          label="Send to Holt"
          onPress={() => {
            player.pause();
            onSend(trim.start, trim.end);
          }}
        />
        <Pressable onPress={onRepick} style={s.textBtn} accessibilityRole="button">
          <Text style={s.textBtnLabel}>Pick a different clip</Text>
        </Pressable>
      </View>
    </>
  );
}

// ── 03 Watching ────────────────────────────────────────────────────────────────────────────────────────

function WatchingStage({ phase, lift, landed, onCancel }: { phase: 0 | 1 | 2; lift: string; landed: { uri: string; ms: number }[]; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  const steps = ['Pulling your frames…', `Watching your ${lift.toLowerCase()}…`, 'Writing it up…'];
  return (
    <>
      <View style={s.watch}>
        <View style={[s.markRing, s.bigMark]}>
          <HoltMark size={92} state="thinking" />
        </View>
        <Text style={s.watchNow}>{steps[phase]}</Text>
        <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.landed} style={s.landedWrap}>
          {landed.map((f) => (
            <View key={f.ms} style={s.landedItem}>
              <View style={s.landedFrame}>
                <FrameFill />
                <Image source={{ uri: f.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>
              <Text style={s.landedTs}>{secs(f.ms)}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.steps}>
          {steps.map((t, i) => (
            <View key={t} style={[s.stepRow, i > phase && s.stepLater]}>
              <View style={s.stepIcon}>
                {i < phase ? (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.brz} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M4 12.5l5 5L20 6.5" />
                  </Svg>
                ) : i === phase ? (
                  <View style={s.stepNow} />
                ) : (
                  <View style={s.stepTodo} />
                )}
              </View>
              <Text style={[s.stepText, i === phase ? s.stepTextNow : null]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[s.cancelWrap, { paddingBottom: 30 + insets.bottom }]}>
        <Pressable onPress={onCancel} style={s.textBtn} accessibilityRole="button">
          <Text style={s.textBtnLabel}>Cancel</Text>
        </Pressable>
      </View>
    </>
  );
}

// ── 04 The read ────────────────────────────────────────────────────────────────────────────────────────
/*
 * ══ SEE IT IN YOUR VIDEO (PO 2026-11-17, step 1) ══
 *
 *   · "Your set" (`YourSet`) at the top: the athlete's own clip, looping the part Holt watched, with a bronze
 *     numbered mark on its timeline at each fix's moment and a tick per rep. Not in the .dc — added.
 *   · "Show me in your video" under each fix's frame: full screen, the clip plays slowly up to that moment
 *     (`SlowReplay`, from `showMeFrom`), then freezes on the marked still with Holt's drawing on it — the still IS
 *     that frame, so the picture does not jump. "Slow replay" runs it again from any frame.
 *   · The rep strip (the .dc's "Later version", "Each rep, at the bottom"): one card per rep from body tracking — the
 *     frame nearest its turnaround, what was measured (depth, the working half's seconds), and a bronze note on the
 *     rep unlike the rest (`repCards`). Added beyond the .dc: the measured line under each rep (PO: "what was
 *     measured"). Tap one for its frame full screen — captioned plainly, NOT in Holt's bubble, since the phone
 *     measured it, Holt did not say it.
 */

function ReadStage({
  r,
  sessionActive,
  onAsk,
  onDrill,
  onHistory,
  onAnother,
}: {
  r: ReadState;
  sessionActive: boolean;
  onAsk: (text: string) => void;
  onDrill: (item: PickerItem) => void;
  onHistory: () => void;
  onAnother: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { read } = r;
  /* UX-4 (Sprint 2): the vote is `AiFeedback`'s own state machine (`ai-feedback-core`) — one vote, changed never
     withdrawn, shown at once and put back with a line if the write fails — drawn as the .dc's Useful / Not useful. */
  const [vote, setVote] = useState<AiFeedbackState>(AI_FEEDBACK_IDLE);
  const [saved, setSaved] = useState<'no' | 'saving' | 'yes' | 'failed'>('no');
  /* `at` is the frame on screen; it starts on Holt's marked frame (or a rep's) and ‹ › step through the rest, so a
     mark that landed one frame off still gets the athlete to the moment he meant. `play`: the slow replay is running
     up to `at`. `holt`: the words are Holt's (his bubble) rather than a measured caption. */
  const [full, setFull] = useState<{
    mark: FormMark | null;
    text: string;
    holt: boolean;
    at: number;
    home: number;
    title?: string;
    play: boolean;
  } | null>(null);
  const endReplay = useCallback(() => setFull((f) => (f ? { ...f, play: false } : f)), []);
  const cards = useMemo(() => repCards(r.facts, r.reps, r.times, r.stills, r.sizes), [r.facts, r.reps, r.times, r.stills, r.sizes]);

  const meta = [viewLabel(read.view), read.reps ? `${read.reps} rep${read.reps === 1 ? '' : 's'}` : '', r.at].filter(Boolean).join(' · ');
  const viewLine = read.viewLine || fallbackViewLine(read);
  const drill = read.drill ? findDrill(read.drill) : null;
  const drillItem = drill && drill.key !== r.lift.key ? drill : null;
  const fixLabel = read.fix.length >= 2 ? 'TWO THINGS TO CLEAN UP' : 'ONE THING TO CLEAN UP';
  const markFor = (i: number) => read.marks.find((m) => m.fix === i) ?? null;
  const frameTag = (m: FormMark) => [m.rep ? `Rep ${m.rep}` : '', r.times[m.frame] != null ? secs(r.times[m.frame]) : ''].filter(Boolean).join(' · ');
  const fullTag = (f: { mark: FormMark | null; at: number; home: number; title?: string }) =>
    f.mark && f.at === f.mark.frame
      ? [frameTag(f.mark), f.mark.shows].filter(Boolean).join(' · ')
      : f.title && f.at === f.home
        ? f.title
        : [`Frame ${f.at + 1} of ${r.uris.length}`, r.times[f.at] != null ? secs(r.times[f.at]) : ''].filter(Boolean).join(' · ');
  /** Fix `i` in the athlete's video: full screen, slowly, up to the marked moment. */
  const showMe = (i: number) => {
    const m = markFor(i);
    if (m && r.times[m.frame] != null) setFull({ mark: m, text: read.fix[i], holt: true, at: m.frame, home: m.frame, play: true });
  };
  /* The fixes that have a moment in the clip — the bronze marks on "Your set"'s timeline, numbered as the fixes are. */
  const marked = read.fix.map((_, i) => i).filter((i) => {
    const m = markFor(i);
    return !!m && r.times[m.frame] != null;
  });
  const markers: ClipMarker[] = marked.map((i) => {
    const t = r.times[(markFor(i) as FormMark).frame];
    return { n: String(i + 1), atMs: t, label: `Show me fix ${i + 1}, at ${secs(t)}, slowly` };
  });
  const repRows: (RepCard | null)[][] = [];
  for (let k = 0; k < cards.length; k += 3) repRows.push([0, 1, 2].map((j) => cards[k + j] ?? null));
  const step = (d: number) => setFull((f) => (f ? { ...f, at: Math.max(0, Math.min(r.uris.length - 1, f.at + d)) } : f));

  /*
   * ══ "WAS THIS USEFUL?" (UX-4 · 0269 `ai_feedback`) ══
   *
   * The same rules as `AiFeedback` everywhere else, through the same core: a tap on the other one changes the vote, a
   * second tap on the chosen one does nothing (the table has no delete — a changed mind is signal, an empty one is
   * not), the choice shows at once and goes back with a line if the write failed. This screen keeps the .dc's own
   * Useful / Not useful look (no second control). `form_checks.useful` keeps form history's copy of it.
   */
  const thumbs = (v: boolean) => {
    const rating: AiRating = v ? 1 : -1;
    if (!aiFeedbackWrites(vote, rating)) return;
    setVote((now) => aiFeedbackStep(now, { type: 'tap', rating }));
    if (r.id) void setFormUseful(r.id, v);
    void rateAiOutput({ feature: 'form_check', ref: r.ref, rating }).then((ok) =>
      setVote((now) => aiFeedbackStep(now, { type: ok ? 'saved' : 'failed', rating })),
    );
  };

  const save = async () => {
    if (!r.id || saved === 'saving' || saved === 'yes') return;
    setSaved('saving');
    const m = markFor(0);
    const idx = m ? m.frame : Math.floor(r.uris.length / 2);
    const ok = await saveFormCheck(r.id, r.uris[idx] ?? null, r.times[idx] ?? null);
    setSaved(ok ? 'yes' : 'failed');
  };

  const askText = () => {
    const main = read.fix[0] ?? read.looksGood[0] ?? '';
    return `About my ${r.lift.name.toLowerCase()} form check${main ? ` — you said: "${main}"` : ''}. `;
  };

  return (
    <>
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={s.flex} contentContainerStyle={[s.readBody, { paddingBottom: 28 + insets.bottom }]}>
        <View style={s.readHead}>
          <Text style={s.readLift}>{r.lift.name}</Text>
          {meta ? <Text style={s.readMeta}>{meta}</Text> : null}
          {r.poseOff ? <Text style={s.readMeta}>{POSE_OFF_LINE}</Text> : null}
        </View>

        <YourSet
          uri={r.clip.uri}
          durationMs={r.clip.durationMs}
          win={r.win}
          frames={r.uris}
          markers={markers}
          reps={r.reps}
          hold={!!full}
          onMarker={(k) => showMe(marked[k])}
        />

        {viewLine ? <HoltSays text={viewLine} /> : null}

        <View style={s.indent}>
          {repRows.length ? (
            <View style={s.repSection}>
              <Text style={s.label}>{repStripLabel(r.facts?.kind)}</Text>
              <View style={s.repRows}>
              {repRows.map((row, ri) => (
                <View key={ri} style={s.repRow}>
                  {row.map((c, ci) =>
                    c ? (
                      <Pressable
                        key={c.n}
                        style={s.repCell}
                        onPress={() =>
                          setFull({
                            mark: c.mark,
                            text: [`Rep ${c.n}`, ...c.measured, c.note].filter(Boolean).join(' · '),
                            holt: false,
                            at: c.frame,
                            home: c.frame,
                            title: `Rep ${c.n} · ${secs(c.atMs)}`,
                            play: false,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={[`Rep ${c.n}`, ...c.measured, c.note].filter(Boolean).join(', ')}
                      >
                        <View style={s.repThumb}>
                          <MarkedFrame uri={r.uris[c.frame] ?? null} mark={c.mark} height={92} />
                        </View>
                        <Text style={s.repN}>{`Rep ${c.n}`}</Text>
                        {c.measured.length ? <Text style={s.repMeasured}>{c.measured.join(' · ')}</Text> : null}
                        {c.note ? <Text style={s.repNote}>{c.note}</Text> : null}
                      </Pressable>
                    ) : (
                      <View key={`gap-${ci}`} style={s.repCell} />
                    ),
                  )}
                </View>
              ))}
              </View>
            </View>
          ) : null}

          {read.looksGood.length ? (
            <View style={s.section}>
              <Text style={s.label}>WHAT&apos;S WORKING</Text>
              {read.looksGood.map((l, i) => (
                <Text key={i} style={s.bubble}>
                  {l}
                </Text>
              ))}
            </View>
          ) : null}

          {read.fix.length ? (
            <View style={s.section}>
              <Text style={s.label}>{fixLabel}</Text>
              {read.fix.map((f, i) => {
                const m = markFor(i);
                const uri = m ? r.uris[m.frame] : null;
                return (
                  <View key={i} style={s.fixItem}>
                    <Text style={s.bubble}>{f}</Text>
                    {m && uri ? (
                      <Pressable
                        onPress={() => setFull({ mark: m, text: f, holt: true, at: m.frame, home: m.frame, play: false })}
                        accessibilityRole="button"
                        accessibilityLabel="Open frame full screen"
                      >
                        <MarkedFrame uri={uri} mark={m} height={250} tag={frameTag(m)} />
                      </Pressable>
                    ) : null}
                    {m && r.times[m.frame] != null ? (
                      <Pressable onPress={() => showMe(i)} style={s.showMe} accessibilityRole="button" accessibilityLabel={`Show me fix ${i + 1} in my video, slowly`}>
                        <View style={s.showMeN}>
                          <Text style={s.showMeNText}>{i + 1}</Text>
                        </View>
                        <Text style={s.showMeText}>Show me in your video</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {read.cue ? (
            <View style={s.section}>
              <Text style={s.label}>NEXT SET</Text>
              <View>
                <Text style={s.think}>Think:</Text>
                <Text style={s.cue}>
                  <Text style={s.quote}>“</Text>
                  {read.cue.replace(/^["“']|["”']$/g, '')}
                  <Text style={s.quote}>”</Text>
                </Text>
              </View>
            </View>
          ) : null}

          {drillItem ? (
            <View style={s.drill}>
              <View style={s.flex}>
                <Text style={s.drillKicker}>DRILL</Text>
                <Text style={s.drillName}>{drillItem.name}</Text>
              </View>
              <Pressable onPress={() => onDrill(drillItem)} style={s.drillBtn} accessibilityRole="button">
                <Text style={s.drillBtnText}>{sessionActive ? 'Add to today' : 'See it'}</Text>
              </Pressable>
            </View>
          ) : null}

          {read.encourage ? (
            <View style={s.closeBlock}>
              <View style={s.hair} />
              <Text style={s.closeLine}>{read.encourage}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.actions}>
          <View style={s.fbRow}>
            {[true, false].map((v) => {
              const a11y = aiFeedbackA11y(vote, v ? 1 : -1);
              const on = shownVote(vote) === (v ? 1 : -1);
              return (
                <Pressable
                  key={String(v)}
                  onPress={() => thumbs(v)}
                  style={[s.fb, on && s.chipOn]}
                  accessibilityRole="button"
                  accessibilityLabel={v ? 'Useful' : 'Not useful'}
                  accessibilityState={{ selected: a11y.selected, busy: a11y.busy }}
                >
                  <View style={v ? null : s.flipY}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={on ? C.brz : C.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M7 10v10H4V10zM7 10l4-7c1.5 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 6.5A2.5 2.5 0 0 1 17.3 20H7" />
                    </Svg>
                  </View>
                  <Text style={[s.fbText, on && s.chipTextOn]}>{v ? 'Useful' : 'Not useful'}</Text>
                </Pressable>
              );
            })}
          </View>
          {vote.failed ? (
            <Text style={s.foot} accessibilityLiveRegion="polite">
              {AI_FEEDBACK_FAILED_LINE}
            </Text>
          ) : null}
          <FcPrimary label="Ask Holt about this" onPress={() => onAsk(askText())} />
          {r.id ? (
            <FcSecondary
              label={saved === 'yes' ? 'Saved · See form history' : saved === 'saving' ? 'Saving…' : saved === 'failed' ? "Couldn't save. Try again" : 'Save to form history'}
              onPress={() => (saved === 'yes' ? onHistory() : void save())}
            />
          ) : null}
          <Pressable onPress={onAnother} style={s.textBtn} accessibilityRole="button">
            <Text style={s.textBtnLabel}>Try another clip</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={!!full} animationType="fade" onRequestClose={() => setFull(null)} statusBarTranslucent>
        {full ? (
          <View style={[s.fullRoot, { paddingTop: insets.top }]}>
            <View style={s.fullBar}>
              <Text style={s.fullTitle} numberOfLines={1}>{fullTag(full) || 'Your frame'}</Text>
              <Pressable onPress={() => setFull(null)} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4}>
                <CloseGlyph color="#F0EDE8" />
              </Pressable>
            </View>
            <View style={s.fullFrame}>
              {full.play && r.times[full.at] != null ? (
                <SlowReplay uri={r.clip.uri} fromMs={showMeFrom(r.times[full.at], r.win.start)} toMs={r.times[full.at]} onDone={endReplay} />
              ) : (
                <>
                  <MarkedFrame
                    uri={r.uris[full.at]}
                    mark={full.mark && full.at === full.mark.frame ? full.mark : null}
                    skeleton={skeletonBones(r.stills[full.at])}
                    fill
                    contain
                  />
                  {r.times[full.at] != null ? (
                    <Pressable onPress={() => setFull((f) => (f ? { ...f, play: true } : f))} style={s.replayBtn} accessibilityRole="button" accessibilityLabel="Slow replay up to this frame">
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="#F0EDE8">
                        <Path d="M8 5.5v13l10.5-6.5z" />
                      </Svg>
                      <Text style={s.replayText}>Slow replay</Text>
                    </Pressable>
                  ) : null}
                  {r.uris.length > 1 ? (
                    <>
                      <Pressable
                        onPress={() => step(-1)}
                        disabled={full.at === 0}
                        style={[s.stepBtn, s.stepLeft, full.at === 0 && s.stepOff]}
                        accessibilityRole="button"
                        accessibilityLabel="Previous frame"
                      >
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M15 5l-7 7 7 7" />
                        </Svg>
                      </Pressable>
                      <Pressable
                        onPress={() => step(1)}
                        disabled={full.at === r.uris.length - 1}
                        style={[s.stepBtn, s.stepRight, full.at === r.uris.length - 1 && s.stepOff]}
                        accessibilityRole="button"
                        accessibilityLabel="Next frame"
                      >
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M9 5l7 7-7 7" />
                        </Svg>
                      </Pressable>
                </>
              ) : null}
                </>
              )}
            </View>
            <View style={[s.fullSays, { paddingBottom: 34 + insets.bottom }]}>
              {full.holt ? <HoltSays text={full.text} label={false} size={32} /> : <Text style={s.fullCaption}>{full.text}</Text>}
            </View>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

// ── 06 States ──────────────────────────────────────────────────────────────────────────────────────────

function CreditsState({ notEntitled, premiumAi, onPlans }: { notEntitled: boolean; premiumAi: boolean; onPlans: () => void }) {
  return (
    <View style={[s.center, s.gap22]}>
      <HoltSays text={notEntitled ? 'Form check is part of Premium AI.' : `That's this month's AI used up. It resets on ${nextReset()}.`} />
      {!premiumAi ? (
        <View style={s.upsell}>
          <View style={s.gap4}>
            <Text style={s.upsellTitle}>Premium AI</Text>
            <Text style={s.upsellBody}>More form checks and coaching with Holt every month.</Text>
          </View>
          <FcPrimary label="See Premium AI" onPress={onPlans} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * 18+ (AI Road to 10 Sprint 2, FC-1). Under 18: one line, no way round it here. No birth year: the field to add it,
 * saved to `profiles.birth_year` — the same field Nutrition → Targets keeps, which hides it behind sex and a weigh-in,
 * so this screen asks itself. `resend`: a set the server refused for want of it goes again once it is saved.
 */
function AgeState({ minor, refunded, resend, onSaved }: { minor: boolean; refunded: boolean; resend: boolean; onSaved: (year: number) => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'failed'>('idle');
  const year = formBirthYear(text);
  const save = async () => {
    if (year == null || saving === 'saving') return;
    setSaving('saving');
    try {
      await saveBirthYear(year);
      setSaving('idle');
      onSaved(year);
    } catch {
      setSaving('failed');
    }
  };
  return (
    <>
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={s.flex} contentContainerStyle={[s.center, s.gap22]} keyboardShouldPersistTaps="handled">
        <HoltSays text={minor ? FORM_UNDER_18_LINE : FORM_AGE_UNKNOWN_LINE} />
        {minor ? null : (
          <View style={s.group}>
            <Text style={s.label}>BIRTH YEAR</Text>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="YYYY"
              placeholderTextColor={C.ink3}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              style={s.note}
              accessibilityLabel="Birth year"
            />
            <Text style={s.hint} accessibilityLiveRegion="polite">
              {saving === 'failed' ? "Couldn't save that. Check your connection and try again." : text.length === 4 && year == null ? 'Enter a four-digit year.' : FORM_BIRTH_YEAR_HELP}
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={[s.bottom, { paddingBottom: 26 + insets.bottom }]}>
        {minor ? null : (
          <FcPrimary label={saving === 'saving' ? 'Saving…' : resend ? 'Save and read my set' : 'Save'} disabled={year == null || saving === 'saving'} onPress={() => void save()} />
        )}
        {refunded ? <Text style={s.foot}>{NOT_CHARGED}</Text> : null}
      </View>
    </>
  );
}

function NotOnDevice({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  return (
    <Shell onClose={onClose}>
      <View style={[s.center, s.needPad]}>
        <Text style={s.needTitle}>{web ? 'Form check needs a browser that can play video.' : 'Form check needs the latest version of the app.'}</Text>
        {web ? null : <Text style={s.needSub}>Build 8 and older.</Text>}
      </View>
      {web ? null : (
        <View style={[s.bottom, { paddingBottom: 26 + insets.bottom }]}>
          <FcSecondary height={54} label="Update the app" onPress={() => void Linking.openURL('itms-beta://').catch(() => Linking.openURL('https://testflight.apple.com'))} />
        </View>
      )}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  gap22: { gap: 22 },
  gap4: { gap: 4 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  bubble: { alignSelf: 'flex-start', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.bub, color: C.ink, fontSize: 15, lineHeight: 22, overflow: 'hidden' },

  startBody: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 12, gap: 22 },
  group: { gap: 12 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 2, color: C.ink3 },
  labelSoft: { letterSpacing: 0.4, fontWeight: '500' },
  hint: { fontSize: 12.5, lineHeight: 18, color: C.ink3 },
  needLift: { fontSize: 13, lineHeight: 18, color: C.ink2, fontWeight: '600' },
  fromSet: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingLeft: 16, paddingRight: 8, borderRadius: flRadius.md, backgroundColor: C.rec, borderWidth: 1, borderColor: C.recBd },
  fromSetName: { flex: 1, fontSize: 15.5, fontWeight: '600', color: C.ink },
  fromSetDetail: { fontSize: 13.5, fontWeight: '400', color: C.ink2 },
  change: { height: 44, justifyContent: 'center', paddingHorizontal: 10 },
  changeText: { fontSize: 13.5, fontWeight: '600', color: C.ink2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderRadius: flRadius.md, backgroundColor: C.rec, borderWidth: 1, borderColor: C.recBd },
  searchInput: { flex: 1, color: C.ink, fontSize: 14.5, paddingVertical: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: flRadius.pill, borderWidth: 1, borderColor: C.chipBd, backgroundColor: C.chip },
  chipOn: { backgroundColor: C.tint },
  chipText: { fontSize: 13.5, color: C.ink },
  chipTextOn: { fontWeight: '600' },
  note: { height: 50, paddingHorizontal: 14, borderRadius: flRadius.md, backgroundColor: C.rec, borderWidth: 1, borderColor: C.recBd, color: C.ink, fontSize: 14.5 },
  startFoot: { paddingTop: 14, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.line, gap: 12 },
  twoUp: { flexDirection: 'row', gap: 10 },
  footLines: { alignItems: 'center', gap: 4 },
  credit: { fontSize: 12.5, color: C.ink2, textAlign: 'center' },
  tip: { fontSize: 12, color: C.ink3, textAlign: 'center' },

  player: { height: 382, backgroundColor: '#0B0A08', alignItems: 'center', justifyContent: 'center' },
  clipTag: { position: 'absolute', left: 16, top: 14, fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(240,237,232,0.6)' },
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(10,10,10,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  timeTag: { position: 'absolute', right: 14, bottom: 12, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(10,10,10,0.6)', fontSize: 12, fontWeight: '600', color: '#F0EDE8', fontVariant: ['tabular-nums'], overflow: 'hidden' },
  trimBody: { flex: 1, paddingTop: 18, paddingHorizontal: 20, gap: 16 },
  stripWrap: { gap: 8 },
  /* The touch room overhangs by TOUCH_PAD each way and the negative margin gives it back, so the .dc's
     spacing is unchanged. The labels under it take no touches (`pointerEvents`) so the overhang works there. */
  stripTouch: { height: STRIP_H + TOUCH_PAD * 2, marginVertical: -TOUCH_PAD, justifyContent: 'center' },
  strip: { height: STRIP_H, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: C.line },
  stripCell: { flex: 1, overflow: 'hidden' },
  shade: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  rail: { position: 'absolute', height: 2, backgroundColor: C.brzHi },
  grip: { position: 'absolute', top: 0, bottom: 0, width: HANDLE, backgroundColor: C.brzHi, alignItems: 'center', justifyContent: 'center' },
  gripL: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  gripR: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  gripLine: { width: 2, height: 18, borderRadius: 1, backgroundColor: 'rgba(20,14,8,0.6)' },
  gripTouch: { position: 'absolute', top: 0, bottom: 0 },
  playhead: { position: 'absolute', top: TOUCH_PAD - 5, height: STRIP_H + 10, width: 4, marginLeft: -2, borderRadius: 2, backgroundColor: '#F0EDE8', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(10,10,10,0.45)' },
  trimLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trimTime: { fontSize: 12, color: C.ink3, fontVariant: ['tabular-nums'] },
  trimTimeOn: { color: C.ink, fontWeight: '600' },
  /* The .dc's rep ticks: a 26 pt row over the strip, number 10/700 + a 2 × 8 tick, bronze when chosen. */
  tickRow: { height: 26, zIndex: 2 },
  tickTap: { position: 'absolute', top: 0, width: 28, height: 26, marginLeft: -14, alignItems: 'center', gap: 3 },
  tickN: { fontSize: 10, fontWeight: '700', color: C.ink3 },
  tickOn: { color: C.brzHi },
  tickBar: { width: 2, height: 8, borderRadius: 1, backgroundColor: C.ink3 },
  tickBarOn: { backgroundColor: C.brzHi },
  tickWait: { fontSize: 11, lineHeight: 26, color: C.ink3 },
  trimMid: { fontSize: 12, color: C.ink2, fontWeight: '600', fontVariant: ['tabular-nums'] },
  trimFoot: { paddingTop: 12, paddingHorizontal: 20, gap: 6 },
  textBtn: { height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  textBtnLabel: { color: C.ink2, fontSize: 14, fontWeight: '600' },

  watch: { flex: 1, alignItems: 'center', paddingTop: 70, gap: 30 },
  bigMark: { width: 92, height: 92, borderRadius: 46 },
  watchNow: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: C.ink, textAlign: 'center' },
  landedWrap: { alignSelf: 'stretch', flexGrow: 0, minHeight: 104 },
  landed: { gap: 8, paddingHorizontal: 20 },
  landedItem: { width: 58, gap: 6 },
  landedFrame: { height: 80, borderRadius: 8, overflow: 'hidden' },
  landedTs: { fontSize: 11, color: C.ink3, textAlign: 'center', fontVariant: ['tabular-nums'] },
  steps: { alignSelf: 'stretch', gap: 12, paddingHorizontal: 40 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepLater: { opacity: 0.55 },
  stepIcon: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  stepNow: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.brzHi },
  stepTodo: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: C.ink3 },
  stepText: { fontSize: 14.5, color: C.ink3 },
  stepTextNow: { color: C.ink },
  cancelWrap: { paddingTop: 12, alignItems: 'center' },

  readBody: { paddingTop: 8, paddingHorizontal: 20, gap: 26 },
  readHead: { gap: 6 },
  readLift: { fontFamily: flFont.display, fontSize: 32, lineHeight: 36, fontWeight: '600', color: C.ink },
  readMeta: { fontSize: 13, color: C.ink3 },
  indent: { paddingLeft: 48, gap: 26 },
  section: { gap: 8 },
  fixItem: { gap: 8, paddingBottom: 6 },
  /* The .dc's rep strip: three to a row, 92 pt frames at radius 8, "Rep N" 11.5/600, the note in bronze. */
  repSection: { gap: 10 },
  /* The .dc's grid: 8 between rows as between cells (the section's 10 is label to grid). */
  repRows: { gap: 8 },
  repRow: { flexDirection: 'row', gap: 8 },
  repCell: { flex: 1, gap: 5 },
  repThumb: { borderRadius: 8, overflow: 'hidden' },
  repN: { fontSize: 11.5, fontWeight: '600', color: C.ink2 },
  repMeasured: { fontSize: 11, lineHeight: 15, color: C.ink3 },
  repNote: { fontSize: 11.5, lineHeight: 15, color: C.brz },
  showMe: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 8, paddingRight: 14, borderRadius: flRadius.pill, borderWidth: 1, borderColor: C.chipBd, backgroundColor: C.chip },
  showMeN: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.brzHi, alignItems: 'center', justifyContent: 'center' },
  showMeNText: { fontSize: 11, fontWeight: '700', color: 'rgba(20,14,8,0.9)' },
  showMeText: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  think: { fontSize: 14, color: C.ink2 },
  cue: { fontFamily: flFont.display, fontSize: 28, lineHeight: 34, fontWeight: '600', color: C.ink },
  quote: { color: C.brz },
  drill: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingLeft: 16, borderRadius: flRadius.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd },
  drillKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: C.ink3 },
  drillName: { fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 3 },
  drillBtn: { height: 40, paddingHorizontal: 14, borderRadius: flRadius.md, backgroundColor: C.sec, borderWidth: 1, borderColor: C.secBd, justifyContent: 'center' },
  drillBtnText: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  closeBlock: { gap: 14 },
  hair: { height: 1, backgroundColor: C.line },
  closeLine: { fontSize: 14.5, lineHeight: 22, color: C.ink3 },
  actions: { gap: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.line },
  fbRow: { flexDirection: 'row', gap: 8 },
  fb: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: flRadius.md, borderWidth: 1, borderColor: C.chipBd, backgroundColor: C.chip },
  fbText: { fontSize: 13.5, color: C.ink, fontWeight: '500' },
  flipY: { transform: [{ scaleY: -1 }] },


  fullRoot: { flex: 1, backgroundColor: '#050505' },
  fullBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8 },
  markRing: { overflow: 'hidden', borderWidth: 1, borderColor: C.markBd },
  fullTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(240,237,232,0.8)' },
  fullFrame: { flex: 1, marginVertical: 8 },
  stepBtn: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(10,10,10,0.55)', alignItems: 'center', justifyContent: 'center' },
  stepLeft: { left: 10 },
  stepRight: { right: 10 },
  stepOff: { opacity: 0.3 },
  fullSays: { paddingTop: 10, paddingHorizontal: 20 },
  fullCaption: { fontSize: 14, lineHeight: 20, color: 'rgba(240,237,232,0.8)' },
  replayBtn: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: 'rgba(10,10,10,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  replayText: { fontSize: 13, fontWeight: '600', color: '#F0EDE8' },

  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  bottom: { paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  foot: { fontSize: 12.5, color: C.ink3 },
  stopBox: { gap: 8, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.rec, borderWidth: 1, borderColor: C.recBd },
  stopKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: C.ink3 },
  stopText: { fontSize: 14.5, lineHeight: 22, color: C.ink2 },
  upsell: { gap: 12, padding: 16, borderRadius: flRadius.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd },
  upsellTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: C.ink },
  upsellBody: { fontSize: 13.5, lineHeight: 20, color: C.ink2 },
  needPad: { paddingHorizontal: 28 },
  needSub: { fontSize: 13, color: C.ink3 },
  needTitle: { fontFamily: flFont.display, fontSize: 22, lineHeight: 28, fontWeight: '600', color: C.ink },
});
