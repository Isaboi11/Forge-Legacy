import { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { HoltMark } from '@/components/forge/HoltMark';
import { CloseGlyph, FC, FcPrimary, FcSecondary, FormBar, FrameFill, HoltSays, MarkedFrame } from '@/components/forge/form-check/FormCheckParts';
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
  FORM_MEDICAL_STOP,
  FORM_NO_READ,
  FORM_TRIM_MIN_MS,
  knownFromCoaching,
  trimWindow,
  viewLabel,
} from '@/domain/coach/form-check-view';
import { coachingContent } from '@/domain/exercise-coaching/query-service';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { matchesSearch, rankFor } from '@/domain/exercise-picker/search-core';
import type { PickerItem } from '@/domain/exercise-picker/catalog-core';
import {
  fetchFormQuote,
  filmstrip,
  formCheck,
  formCheckAvailable,
  framesFromVideo,
  pickFormVideo,
  type FormQuote,
} from '@/data/form-check-live';
import { formLiftKey, insertFormCheck, lastSavedForm, saveFormCheck, setFormUseful, shortDate } from '@/data/form-history-live';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { setCoachAskSeed } from '@/lib/coach-ask-seed';
import { useEntitlementState, usePremiumAi } from '@/lib/entitlement';
import { writeExerciseInbox } from '@/lib/exercise-inbox';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { ensureConsent } from '@/lib/consent';

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
  at: string;
};

type Stage =
  | { step: 'start' }
  | { step: 'trim'; clip: Picked }
  | { step: 'watching'; phase: 0 | 1 | 2; lift: Lift }
  | { step: 'read'; r: ReadState }
  | { step: 'unreadable'; charged: boolean }
  | { step: 'stopped'; kicker: string; text: string }
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
  const { openCoach } = useCoachDoor();
  const { pick, mediaPickerSheet } = useMediaPicker();

  const [fromSet, setFromSet] = useState(!!params.lift);
  const [lift, setLift] = useState<Lift | null>(() => {
    if (params.lift) return { name: String(params.lift).slice(0, 60), key: params.key ? String(params.key) : null };
    const first = findLift(COMMON[0]);
    return first ? { name: first.name, key: first.key } : { name: COMMON[0], key: null };
  });
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<FormFocus[]>([]);
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<Stage>({ step: 'start' });
  const [quote, setQuote] = useState<FormQuote | null>(null);
  const [landed, setLanded] = useState<{ uri: string; ms: number }[]>([]);
  const cancelRef = useRef(false);

  const canRead = formCheckAvailable();

  useEffect(() => {
    let live = true;
    void fetchFormQuote().then((q) => {
      if (live) setQuote(q);
    });
    return () => {
      live = false;
    };
  }, [stage.step]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const commonChips = useMemo(
    () =>
      COMMON.map((n) => {
        const it = findLift(n);
        return { label: SHORT[n] ?? n, lift: { name: it?.name ?? n, key: it?.key ?? null } };
      }),
    [],
  );
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
    if (!lift) return;
    const video = await pickFormVideo(pick, source);
    if (video.kind === 'cancelled') return;
    if (video.kind === 'unavailable') return; // the screen already shows 06d when this is true
    if (video.kind === 'not_a_video') {
      setStage({ step: 'problem', text: "That was a photo, not a clip. Film the set and I'll look at it." });
      return;
    }
    setStage({ step: 'trim', clip: { uri: video.uri, durationMs: video.durationMs, notice: video.notice, source } });
  };

  // ── 02 → 03 → 04: the read ───────────────────────────────────────────────────
  const send = async (clip: Picked, startMs: number, endMs: number) => {
    if (!lift) return;
    /* Asked before a frame is pulled, so the wait is never for nothing (MHMDA consent to share). */
    if (!(await ensureConsent('ai_sharing'))) return setStage({ step: 'problem', text: AI_DECLINED_LINE });
    const chosen = lift;
    cancelRef.current = false;
    setLanded([]);
    setStage({ step: 'watching', phase: 0, lift: chosen });

    const got = await framesFromVideo(clip.uri, {
      durationMs: clip.durationMs,
      startMs,
      endMs,
      onFrame: (uri, ms) => setLanded((l) => [...l, { uri, ms }]),
      cancelled: () => cancelRef.current,
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
    const res = await formCheck({ lift: chosen.name, frames: got.frames, times: got.times, sizes: got.sizes, note, focus, known, last });
    /* ⚠ A CANCEL DURING THE MODEL CALL ONLY STOPS THE SCREEN. The request is already out; if it comes back
       readable the function has spent the credit. The athlete asked to stop looking, not for a refund. */
    if (cancelRef.current) return;

    switch (res.kind) {
      case 'ok': {
        // "Writing it up" is real work: the read is recorded so Useful / Save have a row to act on.
        setStage({ step: 'watching', phase: 2, lift: chosen });
        const id = await insertFormCheck({ lift: chosen.name, exerciseKey: chosen.key, read: res.read });
        if (cancelRef.current) return;
        setStage({
          step: 'read',
          r: { read: res.read, lift: chosen, uris: got.uris, times: got.times, id, at: shortDate(new Date().toISOString()) },
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
      case 'out_of_credits':
        return setStage({ step: 'credits' });
      case 'not_entitled':
        return setStage({ step: 'not_entitled' });
      case 'bad_frames':
        return setStage({ step: 'problem', text: 'That clip was too big to send. A shorter trim works best, from any angle.' });
      case 'unavailable_here':
        return setStage({ step: 'problem', text: 'Form check needs the latest version of the app.' });
      case 'unavailable':
        return setStage({ step: 'problem', text: 'That broke on my end. Nothing was charged. Try again in a moment.' });
      case 'offline':
        return setStage({ step: 'problem', text: "I couldn't reach my notes just then. Check your connection and send it again." });
      /* "Not now" on the AI consent sheet — the frames never left the phone. */
      case 'no_consent':
        return setStage({ step: 'problem', text: AI_DECLINED_LINE });
    }
  };

  const restart = () => setStage({ step: 'start' });

  // ── What to draw ─────────────────────────────────────────────────────────────
  const top = { paddingTop: insets.top };

  if (!canRead) return <NotOnDevice onClose={close} top={top} />;

  if (entStatus === 'ready' && !premiumAi && stage.step === 'start') {
    return (
      <Shell top={top} onClose={close}>
        <CreditsState notEntitled premiumAi={false} onPlans={() => router.push('/subscription')} />
      </Shell>
    );
  }

  if (stage.step === 'trim') {
    return (
      <Shell top={top} onClose={close}>
        <TrimStage
          clip={stage.clip}
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
      <Shell top={top}>
        <WatchingStage
          phase={stage.phase}
          lift={stage.lift.name}
          landed={landed}
          onCancel={() => {
            cancelRef.current = true;
            restart();
          }}
        />
      </Shell>
    );
  }

  if (stage.step === 'read') {
    const r = stage.r;
    return (
      <Shell top={top} onClose={close}>
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
      <Shell top={top} onClose={close}>
        <View style={s.center}>
          <HoltSays text={stage.step === 'unreadable' ? FORM_NO_READ : stage.text} />
        </View>
        <View style={[s.bottom, { paddingBottom: 26 + insets.bottom }]}>
          <FcPrimary label="Try another clip" onPress={restart} />
          {stage.step === 'unreadable' && !stage.charged ? <Text style={s.foot}>Not charged.</Text> : null}
        </View>
      </Shell>
    );
  }

  if (stage.step === 'stopped') {
    return (
      <Shell top={top} onClose={close}>
        <View style={s.center}>
          <View style={s.stopBox}>
            <Text style={s.stopKicker}>{stage.kicker}</Text>
            <Text style={s.stopText}>{stage.text}</Text>
          </View>
        </View>
      </Shell>
    );
  }

  if (stage.step === 'credits' || stage.step === 'not_entitled') {
    return (
      <Shell top={top} onClose={close}>
        <CreditsState notEntitled={stage.step === 'not_entitled'} premiumAi={premiumAi} onPlans={() => router.push('/subscription')} />
      </Shell>
    );
  }

  // ── 01 Start ─────────────────────────────────────────────────────────────────
  return (
    <Shell top={top} onClose={close}>
      <ScrollView style={s.flex} contentContainerStyle={s.startBody} keyboardShouldPersistTaps="handled">
        <HoltSays
          text="Show me a set. Any angle works. Get your whole body in frame and I'll tell you what I see."
          under="Technique only. Nothing about your body, nothing medical."
        />

        <View style={s.group}>
          <Text style={s.label}>WHICH LIFT</Text>
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
          <TextInput
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

function Shell({ children, top, onClose, title = 'Form Check' }: { children: React.ReactNode; top: { paddingTop: number }; onClose?: () => void; title?: string }) {
  return (
    <View style={[s.root, top]}>
      <ScreenBackground atmospheric overlay={null} />
      <FormBar
        title={title}
        right={
          onClose ? (
            <Pressable onPress={onClose} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4}>
              <CloseGlyph />
            </Pressable>
          ) : undefined
        }
      />
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

const HANDLE = 14;

function TrimStage({ clip, onSend, onRepick }: { clip: Picked; onSend: (startMs: number, endMs: number) => void; onRepick: () => void }) {
  const insets = useSafeAreaInsets();
  const dur = clip.durationMs && clip.durationMs > 0 ? clip.durationMs : FORM_CLIP_MS;
  const [trim, setTrim] = useState(() => trimWindow(dur, 0, Math.min(dur, FORM_CLIP_MS)));
  const [strip, setStrip] = useState<(string | null)[]>([]);
  /* Where the strip sits in the window. The handles follow the finger's ABSOLUTE position against it, so a
     drag needs no remembered starting point (and no ref read during render — the react-compiler rule). */
  const stripRef = useRef<View>(null);
  const [rail, setRail] = useState({ x: 0, w: 1 });

  const player = useVideoPlayer(clip.uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false, oldIsPlaying: false });
  const tick = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });

  useEffect(() => {
    let live = true;
    void filmstrip(clip.uri, dur, 8).then((f) => {
      if (live) setStrip(f);
    });
    return () => {
      live = false;
    };
  }, [clip.uri, dur]);

  const pans = useMemo(() => {
    const at = (pageX: number) => Math.max(0, Math.min(dur, ((pageX - rail.x) / rail.w) * dur));
    return {
      start: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_e, g) => {
          const p = at(g.moveX);
          setTrim((t) => {
            const start = Math.min(p, t.end - FORM_TRIM_MIN_MS);
            return { start: Math.max(0, start), end: Math.min(t.end, Math.max(0, start) + FORM_CLIP_MS) };
          });
        },
      }),
      end: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_e, g) => {
          const p = at(g.moveX);
          setTrim((t) => {
            const end = Math.min(dur, Math.max(p, t.start + FORM_TRIM_MIN_MS));
            return { start: Math.max(t.start, end - FORM_CLIP_MS), end };
          });
        },
      }),
    };
  }, [rail, dur]);

  const leftPct = (trim.start / dur) * 100;
  const rightPct = 100 - (trim.end / dur) * 100;
  const win = trim.end - trim.start;
  const whole = trim.start === 0 && dur <= FORM_CLIP_MS && Math.abs(trim.end - dur) < 50;

  return (
    <>
      <View style={s.player}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        <Text style={s.clipTag}>YOUR CLIP</Text>
        <Pressable onPress={() => (isPlaying ? player.pause() : player.play())} style={s.playBtn} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="#F0EDE8">
            {isPlaying ? <Path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <Path d="M8 5.5v13l10.5-6.5z" />}
          </Svg>
        </Pressable>
        <Text style={s.timeTag}>{`${mmss((tick.currentTime ?? 0) * 1000)} / ${mmss(dur)}`}</Text>
      </View>

      <View style={s.trimBody}>
        <HoltSays text="Drag around the reps you want me to watch." label={false} size={32} />
        {clip.notice ? <Text style={s.hint}>{`That clip is long — I'll watch up to ${Math.round(FORM_CLIP_MS / 1000)} seconds of it.`}</Text> : null}

        <View style={s.stripWrap}>
          <View
            ref={stripRef}
            style={s.strip}
            onLayout={() => {
              stripRef.current?.measureInWindow((x, _y, w) => setRail({ x, w: Math.max(1, w) }));
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <View key={i} style={s.stripCell}>
                <FrameFill />
                {strip[i] ? <Image source={{ uri: strip[i] as string }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              </View>
            ))}
            <View pointerEvents="none" style={[s.shade, { left: 0, width: `${leftPct}%` }]} />
            <View pointerEvents="none" style={[s.shade, { right: 0, width: `${rightPct}%` }]} />
            <View pointerEvents="none" style={[s.rail, { top: 0, left: `${leftPct}%`, right: `${rightPct}%` }]} />
            <View pointerEvents="none" style={[s.rail, { bottom: 0, left: `${leftPct}%`, right: `${rightPct}%` }]} />
            <View
              {...pans.start.panHandlers}
              style={[s.handle, { left: `${leftPct}%`, marginLeft: -8 }]}
              accessibilityRole="adjustable"
              accessibilityLabel={`Trim start, ${mmss(trim.start)}`}
            >
              <View style={[s.grip, s.gripL]}>
                <View style={s.gripLine} />
              </View>
            </View>
            <View
              {...pans.end.panHandlers}
              style={[s.handle, { right: `${rightPct}%`, marginRight: -8 }]}
              accessibilityRole="adjustable"
              accessibilityLabel={`Trim end, ${mmss(trim.end)}`}
            >
              <View style={[s.grip, s.gripR]}>
                <View style={s.gripLine} />
              </View>
            </View>
          </View>
          <View style={s.trimLabels}>
            <Text style={s.trimTime}>{mmss(trim.start)}</Text>
            <Text style={s.trimMid}>{whole ? `${Math.round(win / 1000)} s · whole set` : `${Math.round(win / 1000)} s`}</Text>
            <Text style={s.trimTime}>{mmss(trim.end)}</Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.landed} style={s.landedWrap}>
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
  const [useful, setUseful] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<'no' | 'saving' | 'yes' | 'failed'>('no');
  /* `at` is the frame on screen; it starts on Holt's marked frame and ‹ › step through the rest, so a mark
     that landed one frame off still gets the athlete to the moment he meant. */
  const [full, setFull] = useState<{ mark: FormMark; text: string; at: number } | null>(null);

  const meta = [viewLabel(read.view), read.reps ? `${read.reps} rep${read.reps === 1 ? '' : 's'}` : '', r.at].filter(Boolean).join(' · ');
  const viewLine = read.viewLine || fallbackViewLine(read);
  const drill = read.drill ? findDrill(read.drill) : null;
  const drillItem = drill && drill.key !== r.lift.key ? drill : null;
  const fixLabel = read.fix.length >= 2 ? 'TWO THINGS TO CLEAN UP' : 'ONE THING TO CLEAN UP';
  const markFor = (i: number) => read.marks.find((m) => m.fix === i) ?? null;
  const frameTag = (m: FormMark) => [m.rep ? `Rep ${m.rep}` : '', r.times[m.frame] != null ? secs(r.times[m.frame]) : ''].filter(Boolean).join(' · ');
  const fullTag = (f: { mark: FormMark; at: number }) =>
    f.at === f.mark.frame
      ? [frameTag(f.mark), f.mark.shows].filter(Boolean).join(' · ')
      : [`Frame ${f.at + 1} of ${r.uris.length}`, r.times[f.at] != null ? secs(r.times[f.at]) : ''].filter(Boolean).join(' · ');
  const step = (d: number) => setFull((f) => (f ? { ...f, at: Math.max(0, Math.min(r.uris.length - 1, f.at + d)) } : f));

  const thumbs = (v: boolean) => {
    const next = useful === v ? null : v;
    setUseful(next);
    if (r.id) void setFormUseful(r.id, next);
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
      <ScrollView style={s.flex} contentContainerStyle={[s.readBody, { paddingBottom: 28 + insets.bottom }]}>
        <View style={s.readHead}>
          <Text style={s.readLift}>{r.lift.name}</Text>
          {meta ? <Text style={s.readMeta}>{meta}</Text> : null}
        </View>

        {viewLine ? <HoltSays text={viewLine} /> : null}

        <View style={s.indent}>
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
                      <Pressable onPress={() => setFull({ mark: m, text: f, at: m.frame })} accessibilityRole="button" accessibilityLabel="Open frame full screen">
                        <MarkedFrame uri={uri} mark={m} height={250} tag={frameTag(m)} />
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
              const on = useful === v;
              return (
                <Pressable key={String(v)} onPress={() => thumbs(v)} style={[s.fb, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
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
              <MarkedFrame uri={r.uris[full.at]} mark={full.at === full.mark.frame ? full.mark : null} fill contain />
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
            </View>
            <View style={[s.fullSays, { paddingBottom: 34 + insets.bottom }]}>
              <HoltSays text={full.text} label={false} size={32} />
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

function NotOnDevice({ onClose, top }: { onClose: () => void; top: { paddingTop: number } }) {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  return (
    <Shell top={top} onClose={onClose}>
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
  strip: { height: 64, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: C.line },
  stripCell: { flex: 1, overflow: 'hidden' },
  shade: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  rail: { position: 'absolute', height: 2, backgroundColor: C.brzHi },
  handle: { position: 'absolute', top: 0, bottom: 0, width: HANDLE + 16, alignItems: 'center', justifyContent: 'center' },
  grip: { width: HANDLE, alignSelf: 'stretch', backgroundColor: C.brzHi, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  gripL: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  gripR: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  gripLine: { width: 2, height: 18, borderRadius: 1, backgroundColor: 'rgba(20,14,8,0.6)' },
  trimLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trimTime: { fontSize: 12, color: C.ink3, fontVariant: ['tabular-nums'] },
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
