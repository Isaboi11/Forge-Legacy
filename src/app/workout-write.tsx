import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { PostedWorkoutView } from '@/components/forge/PostedWorkoutView';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { readProgramPhoto } from '@/data/program-photo-live';
import type { TemplateExercise } from '@/data/templates-live';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { resolveExerciseName } from '@/domain/exercise-picker/data';
import { checkBeforePosting, readWrittenWorkout, roundTrips, rowsToWrittenText, tsvToWrittenText, writtenToTemplate, MAX_LIFT_KEYS, type WrittenTemplateRow } from '@/domain/workout/written-workout';
import { editSquadPost, fetchSquadPost, isPostedWorkout } from '@/data/squad-feed-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { pickImagesFromLibrary } from '@/lib/useMediaPicker';
import { putWrittenDraft } from '@/lib/written-workout-intent';
import { tidyWrittenWorkout } from '@/data/workout-tidy-live';
import { readWorkoutCard } from '@/data/workout-card-read-live';
import { whenToUseAi } from '@/domain/workout/workout-ai-gate';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';

/**
 * Write a workout for the squad (PO 2026-09-27, Squatober): "the insta page … posts the night before. I want to
 * post the workout in the squad the night before."
 *
 * Type it, paste it, or read it from a photo — then see EXACTLY what the squad will see, live, before it is used.
 * The reader is code (`domain/workout/written-workout.ts`); a photo only fills the box with its transcription,
 * which the poster can fix like any typing. Nothing is posted from here: "Use this workout" hands it back to the
 * composer, where the caption and the Post button are.
 *
 * ══ AI ONLY WHEN THE CODE CANNOT (Import Amendment 002, PO 2026-09-28: "use AI when needed") ══ `whenToUseAi`
 * draws the line. When the reader could not read the card, "Fix it with AI" rewrites the card's words in the
 * reader's layout; the reader still reads the numbers, `checkAiRewrite` throws away any rewrite with a number
 * not on the card, and the box shows the rewrite marked "Tidied by AI" with Undo. A photo is tidied the same way
 * every time, without a second tap (amended 2026-09-30).
 */

const EXAMPLE = `"For Those About to Squat"  Day 1
Warm up: 5 jumping jacks, 3 claps
1. Back Squat 4,6,8,6,4 reps @ 67%
2 min rest between each set
2. Deadlift 4 sets of 4 reps @ 70%
3a. Chin Up 4 sets of 2-4 reps
super set b. DB RDL 4 sets of 5 reps
2 min rest between each super set
Recovery: 30 min walk, steak & eggs, 8-9 hrs sleep`;

const resolveKey = (n: string) => resolveExerciseName(n)?.key;

export default function WorkoutWriteScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  /*
   * ══ EDIT MODE (0230, PO 2026-09-28: "edit posts") ══ `?edit=<post id>` opens a posted workout back in this box as
   * words (`rowsToWrittenText`) — but only when those words read back to the IDENTICAL workout (`roundTrips`); a
   * workout that went up from a saved template may hold something the words cannot say, and opening and saving it
   * must never quietly change it. Save writes the post (`edit_squad_post`); copies already taken are untouched.
   */
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = typeof edit === 'string' && edit ? edit : null;
  const editQ = useQuery(() => (editId ? fetchSquadPost(editId) : Promise.resolve(null)), [editId]);
  const editPost = editQ.data?.post ?? null;
  const editLayout = editPost && isPostedWorkout(editPost.layout) ? editPost.layout : null;
  const editText = useMemo(() => {
    if (!editLayout) return null;
    const w = { name: editLayout.name, how: editLayout.how ?? null, after: editLayout.after ?? null, rows: editLayout.exercises as unknown as WrittenTemplateRow[] };
    return roundTrips(w, resolveKey) ? rowsToWrittenText(w) : '';
  }, [editLayout]);
  const [typed, setText] = useState<string | null>(null);
  /* Until they type, the box holds the post as words — derived, never copied into state by an effect. */
  const text = typed ?? editText ?? '';
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* The poster's own words from before AI tidied them — Undo puts them back. Null = AI has not touched the box. */
  const [beforeAi, setBeforeAi] = useState<string | null>(null);
  const reading = useRef(false);
  /* "Edit" beside the preview (PO 2026-09-30: "it doesn't look like I can edit") takes you back up to the box. */
  const scrollRef = useRef<ScrollView>(null);
  const boxRef = useRef<TextInput>(null);
  const editWords = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => boxRef.current?.focus(), 250);
  };

  const written = useMemo(() => (text.trim() ? readWrittenWorkout(text) : null), [text]);
  const rows = useMemo<TemplateExercise[]>(() => (written ? (writtenToTemplate(written, resolveKey) as TemplateExercise[]) : []), [written]);
  /* Anything the reader is not sure of, pointed at before posting — never guessed at (`checkBeforePosting`). */
  const checks = useMemo(() => (written ? checkBeforePosting(written, rows as unknown as WrittenTemplateRow[]) : []), [written, rows]);
  const maxNames = Object.fromEntries(Object.values(MAX_LIFT_KEYS).map((k) => [k, exerciseNameFor(k)]));
  const title = (name ?? written?.name ?? '').trim() || 'Workout';
  /* Once AI has rewritten the box it is not offered again on its own rewrite: what is left is the poster's to check. */
  const aiCall = useMemo(() => (beforeAi != null ? ({ kind: 'rules' } as const) : whenToUseAi(text, written, rows as unknown as WrittenTemplateRow[])), [beforeAi, text, written, rows]);

  /**
   * Rewrite `card` with AI and put it in the box, or say plainly why not. The poster's words are kept for Undo.
   * `quiet` is the pass every photo gets even when the code reader found nothing wrong: if AI can't improve on that
   * reading, the reading stands and nothing is said — there is no problem to report.
   */
  const tidy = async (card: string, quiet = false) => {
    setBusy('Tidying it up with AI…');
    setError(null);
    try {
      const r = await tidyWrittenWorkout(card, resolveKey);
      if (r.kind === 'ok') {
        if (quiet) {
          /* Over a reading with nothing wrong in it, AI's layout is taken only if it too reads with nothing wrong. */
          const w = readWrittenWorkout(r.text);
          if (whenToUseAi(r.text, w, writtenToTemplate(w, resolveKey)).kind !== 'rules') return;
        }
        setBeforeAi(card);
        setText(r.text);
        setName(null);
        return;
      }
      if (quiet) return;
      setError(
        r.kind === 'no_consent'
          ? AI_DECLINED_LINE
          : r.kind === 'unfaithful'
            ? 'AI changed a number on the card, so your words are kept as they are. Check the list below and fix those lines by hand.'
            : r.kind === 'not_entitled'
              ? 'Fixing a workout with AI is part of Premium AI. Fix the lines below by hand instead.'
              : r.kind === 'out_of_credits'
                ? 'You’re out of Premium AI credits for this month. Fix the lines below by hand instead.'
                : r.kind === 'daily_limit'
                  ? 'That’s a lot of AI fixes for one day. Fix the lines below by hand, or try again tomorrow.'
                  : r.kind === 'not_a_workout'
                    ? 'AI didn’t find a workout in that.'
                    : r.kind === 'too_long'
                      ? 'That’s too long to fix in one go. Post it as two workouts.'
                      : r.kind === 'unreadable'
                        ? 'AI couldn’t make sense of it either. Fix the lines below by hand.'
                        : 'Couldn’t reach AI just now. Try again in a moment, or fix the lines below by hand.',
      );
    } finally {
      setBusy(null);
    }
  };

  const fromPhoto = async () => {
    if (reading.current) return;
    reading.current = true;
    setError(null);
    try {
      const picked = await pickImagesFromLibrary(1);
      if (picked === 'failed') {
        setError('That photo couldn’t be opened here. Take a screenshot of it and use that instead.');
        return;
      }
      if (!picked.length) return;
      setBusy('Reading your photo…');
      /*
       * THE WHOLE CARD, LINE BY LINE (`workout-card-read`, PO 2026-09-30: "yes I want the title") — its name, the
       * warm-up, every rest, the margin's "super set all 3". The table read below has no row for a title and puts
       * the rest wherever it lands that day. It stays as the fallback for the one case the card read has no answer:
       * the function not deployed yet (a 404 on the phone; on the web the preflight fails and it reads as offline),
       * or down. A refusal — not a workout, no credits — is an answer, and is not asked twice.
       */
      const card = await readWorkoutCard(picked[0]);
      let r: Awaited<ReturnType<typeof readProgramPhoto>> | { kind: 'ok'; text: string };
      if (card.kind === 'not_deployed' || card.kind === 'offline' || card.kind === 'unavailable') r = await readProgramPhoto(picked[0]);
      else r = card;
      if (r.kind === 'no_consent') {
        setError(AI_DECLINED_LINE);
        return;
      }
      if (r.kind !== 'ok') {
        setError(
          r.kind === 'not_a_program'
            ? 'That doesn’t look like a workout. Try a photo of the card itself.'
            : r.kind === 'not_entitled'
              ? 'Reading photos is part of Premium AI. Type or paste the workout instead.'
              : r.kind === 'out_of_credits'
                ? 'You’re out of Premium AI credits for this month. Type or paste the workout instead.'
                : 'Couldn’t read that photo. Try a closer, straighter shot — or type it in.',
        );
        return;
      }
      /* The transcription goes IN THE BOX — the poster reads it against the card and fixes anything before use. */
      const words = 'text' in r ? r.text : tsvToWrittenText(r.tsv);
      setText(words);
      setBeforeAi(null);
      /*
       * EVERY photo gets the AI pass (Import Amendment 002, amended PO 2026-09-30: "I thought we were having ai read it
       * to make sure it gets it right"). The poster already chose AI by choosing a photo, and a handwritten card's
       * transcription is not a layout the code reader can be trusted on alone: Season 12 Day 1 read "clean" as one
       * squat set where the card has nine. The code still reads every number, and `checkAiRewrite` still throws away
       * a rewrite with a number that is not on the card. Typed and pasted workouts are unchanged: rules first.
       */
      const w = readWrittenWorkout(words);
      const call = whenToUseAi(words, w, writtenToTemplate(w, resolveKey));
      if (call.kind === 'ai') await tidy(words);
      else if (call.kind === 'rules') await tidy(words, true);
    } finally {
      setBusy(null);
      reading.current = false;
    }
  };

  const use = async () => {
    if (!written || !rows.length || saving) return;
    if (editId && editPost) {
      setSaving(true);
      try {
        await editSquadPost(editId, editPost.body ?? '', { kind: 'posted-workout', name: title, exercises: rows, how: written.how, after: written.after });
        showToast('Workout updated. Anyone who already took it keeps their copy.');
        router.back();
      } catch (e) {
        showToast(errorMessage(e));
      } finally {
        setSaving(false);
      }
      return;
    }
    putWrittenDraft({ name: title, exercises: rows, how: written.how, after: written.after });
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.4)' }} />
      <AppBar title={editId ? 'Edit the workout' : 'Write a workout'} transparent onBack={() => router.back()} />
      <ScrollView ref={scrollRef} keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_GAP + 80 }]} keyboardShouldPersistTaps="handled">
        {editId && editText === '' ? (
          /* Posted from a saved workout: something in it has no words here, so it is not reopened as words. */
          <Text style={styles.warn}>
            This workout was posted from a saved workout, so it can’t be edited as text. Delete the post and post it again to change it.
          </Text>
        ) : null}
        <Text style={styles.lede}>
          {editId
            ? 'Change it the way it’s written. Anyone who already took it keeps the copy they took.'
            : 'Type it or paste it the way it’s written: numbers, percentages, supersets, rest. Your squad sees it with their own weights, from their own maxes.'}
        </Text>

        <View style={styles.actions}>
          <Pressable onPress={() => void fromPhoto()} disabled={!!busy} accessibilityRole="button" style={({ pressed }) => [styles.photoBtn, pressed && styles.pressed]}>
            <EngravedIcon name="camera" size={16} color={flColor.cream100} />
            <Text style={styles.photoText}>From a photo</Text>
          </Pressable>
          {text ? (
            <Pressable onPress={() => { setText(''); setName(null); setBeforeAi(null); setError(null); }} accessibilityRole="button" hitSlop={6}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={flColor.bronze400} />
            <Text style={styles.busyText}>{busy}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {beforeAi != null ? (
          <View style={styles.aiBar}>
            <Text style={styles.aiText}>Tidied by AI. Check every number against the card before you use it.</Text>
            <Pressable
              onPress={() => {
                setText(beforeAi);
                setBeforeAi(null);
                setName(null);
              }}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.undo}>Undo</Text>
            </Pressable>
          </View>
        ) : aiCall.kind === 'ai' && !busy ? (
          <View style={styles.aiBar}>
            <Text style={styles.aiText}>Part of this is written in a way the reader doesn’t know yet.</Text>
            <Pressable onPress={() => void tidy(text)} accessibilityRole="button" style={({ pressed }) => [styles.aiBtn, pressed && styles.pressed]}>
              <Text style={styles.aiBtnText}>Fix it with AI</Text>
            </Pressable>
          </View>
        ) : aiCall.kind === 'too_long' ? (
          <Text style={styles.warn}>That’s too long for AI to fix in one go. Fix the lines below by hand, or post it as two workouts.</Text>
        ) : null}

        <TextInput
          ref={boxRef}
          value={text}
          onChangeText={setText}
          multiline
          placeholder={EXAMPLE}
          placeholderTextColor={flColor.gray600}
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect={false}
          style={styles.box}
          accessibilityLabel="The workout, as written"
        />
        {text.trim() ? (
          /* The box IS the editor, and a superset is two words away — said, since neither is obvious. */
          <Text style={styles.editHint}>
            Change anything in the box and the preview below updates. To superset lifts, write the first as “4. a. Dips …” and the next ones as “super set b. …”, “super set c. …”.
          </Text>
        ) : null}

        {written && rows.length ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>What your squad will see</Text>
              <Pressable onPress={editWords} accessibilityRole="button" accessibilityLabel="Edit the workout" hitSlop={8} style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
                <EngravedIcon name="edit" size={13} color={flColor.bronze300} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </View>
            <TextInput returnKeyType="done"
              value={name ?? written.name}
              onChangeText={setName}
              style={styles.name}
              accessibilityLabel="Workout name"
              maxLength={60}
            />
            {checks.length ? (
              <View style={styles.checks}>
                <Text style={styles.checksHead}>Check {checks.length === 1 ? 'this' : 'these'} before posting</Text>
                {checks.map((c) => (
                  <Text key={c} style={styles.checkLine}>
                    · {c}
                  </Text>
                ))}
              </View>
            ) : null}
            <PostedWorkoutView rows={rows} how={written.how} after={written.after} maxNames={maxNames} />
          </>
        ) : text.trim() && written?.how && !/\d+\s*(?:sets?|reps?|x)\b/i.test(text) ? (
          /* Squatober's Days 4 & 5 — a walk, food, sleep. Nothing to run, so nothing is invented to fill it. */
          <Text style={styles.warn}>No lifts in this one. It reads like a rest day, so post it to the squad as a note instead.</Text>
        ) : text.trim() ? (
          <Text style={styles.warn}>No exercises found yet. Number each one: “1. Back Squat 5 sets of 5 reps @ 75%”.</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth disabled={!rows.length || saving || (!!editId && editText === '')} onPress={() => void use()}>
          {editId ? (saving ? 'Saving…' : 'Save changes') : 'Use this workout'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  lede: { fontSize: 14, lineHeight: 20, color: flColor.gray400 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  photoText: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  clear: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  pressed: { opacity: 0.8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  busyText: { fontSize: 13, color: flColor.gray400 },
  error: { fontSize: 13, lineHeight: 18, color: flColor.cream100 },
  box: {
    minHeight: 220,
    padding: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    fontSize: 14.5,
    lineHeight: 21,
    color: flColor.cream100,
  },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.labelInk },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 11, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  editBtnText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  editHint: { fontSize: 12, lineHeight: 17, color: flColor.gray400, marginTop: -6 },
  name: { fontFamily: flFont.display, fontSize: 21, color: flColor.cream100, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: flColor.divider },
  warn: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  checks: { gap: 4, padding: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  checksHead: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.labelInk },
  checkLine: { fontSize: 13, lineHeight: 19, color: flColor.cream100 },
  aiBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  aiText: { flex: 1, fontSize: 13, lineHeight: 18, color: flColor.cream100 },
  aiBtn: { height: 34, paddingHorizontal: 12, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal700, justifyContent: 'center' },
  aiBtnText: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  undo: { fontSize: 13, fontWeight: '700', color: flColor.cream100 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, backgroundColor: flColor.base },
});
