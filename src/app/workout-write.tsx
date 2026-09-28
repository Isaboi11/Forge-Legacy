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
import { readWrittenWorkout, roundTrips, rowsToWrittenText, tsvToWrittenText, writtenToTemplate, MAX_LIFT_KEYS, type WrittenTemplateRow } from '@/domain/workout/written-workout';
import { editSquadPost, fetchSquadPost, isPostedWorkout } from '@/data/squad-feed-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { pickImagesFromLibrary } from '@/lib/useMediaPicker';
import { putWrittenDraft } from '@/lib/written-workout-intent';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';

/**
 * Write a workout for the squad (PO 2026-09-27, Squatober): "the insta page … posts the night before. I want to
 * post the workout in the squad the night before."
 *
 * Type it, paste it, or read it from a photo — then see EXACTLY what the squad will see, live, before it is used.
 * The reader is code (`domain/workout/written-workout.ts`, §4.3 — no AI interpretation); a photo only fills the
 * box with its transcription, which the poster can fix like any typing. Nothing is posted from here: "Use this
 * workout" hands it back to the composer, where the caption and the Post button are.
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
  const reading = useRef(false);

  const written = useMemo(() => (text.trim() ? readWrittenWorkout(text) : null), [text]);
  const rows = useMemo<TemplateExercise[]>(() => (written ? (writtenToTemplate(written, resolveKey) as TemplateExercise[]) : []), [written]);
  const unmatched = rows.filter((r) => !r.catalogKey).map((r) => r.name);
  const maxNames = Object.fromEntries(Object.values(MAX_LIFT_KEYS).map((k) => [k, exerciseNameFor(k)]));
  const title = (name ?? written?.name ?? '').trim() || 'Workout';

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
      const r = await readProgramPhoto(picked[0]);
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
      setText(tsvToWrittenText(r.tsv));
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
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_GAP + 80 }]} keyboardShouldPersistTaps="handled">
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
            <Pressable onPress={() => { setText(''); setName(null); }} accessibilityRole="button" hitSlop={6}>
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

        <TextInput
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

        {written && rows.length ? (
          <>
            <Text style={styles.section}>What your squad will see</Text>
            <TextInput
              value={name ?? written.name}
              onChangeText={setName}
              style={styles.name}
              accessibilityLabel="Workout name"
              maxLength={60}
            />
            <PostedWorkoutView rows={rows} how={written.how} after={written.after} maxNames={maxNames} />
            {unmatched.length ? (
              <Text style={styles.warn}>
                Not in the exercise library, so no how-to or history: {unmatched.join(', ')}. They’ll show as written.
              </Text>
            ) : null}
            {written.unread.length ? <Text style={styles.warn}>Couldn’t read: {written.unread.join(' · ')}</Text> : null}
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
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.labelInk, marginTop: 6 },
  name: { fontFamily: flFont.display, fontSize: 21, color: flColor.cream100, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  warn: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, backgroundColor: flColor.base },
});
