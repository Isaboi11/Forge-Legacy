import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { addChapterPhoto, fetchActivePhotoChapter, fetchPhotoChapter, uploadChapterPhoto } from '@/data/photos-live';
import { useToast } from '@/hooks/useCeremony';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useCapGate } from '@/lib/entitlement';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Add a photo to a chapter — the archive's one door.
 *
 * `L-15-Photos-Architecture` §2 names the chapter screens as the only photo creation paths, and this is
 * the shared implementation behind them: Chapter Detail sends you here for a named chapter, Workout
 * Complete sends you here for the one you're living in.
 *
 * WHY THIS SCREEN EXISTS AT ALL. The first cut uploaded the picked asset and inserted the row, and that
 * was it — no label, no caption, no date, no star. It worked, and it made most of the gallery
 * unreachable: with no caption the timeline's pull-quote can never appear, with no label the viewer's
 * pose pill and the thumbnail captions never appear, and with nothing starred three of the five cover
 * tiers never fire, so every album cover was just "most recent photo". The read side was more capable
 * than the thing filling it.
 *
 * THE DATE MATTERS MORE THAN IT LOOKS. Events in the timeline are derived from a photo's date (0085) —
 * land on the chapter's start date and it reads "Chapter opened", on its seal date "Chapter sealed", on
 * a day you set a PR it reads that PR, and any of those makes it a milestone day with the larger
 * bronze-edged cover. So backdating is not a nicety; it is how a memory added later takes its right
 * place in the record. Stepped by day rather than a calendar: `ForgeDateInput` belongs to the retired
 * input library and needs `@react-native-community/datetimepicker`, which does not render on the web
 * preview this app is reviewed on.
 *
 * Floors at the chapter's start date and ceilings at today — a photo cannot predate the chapter that
 * holds it, and the archive does not accept the future.
 */

/**
 * Quick labels. Free text stays available — a label is often a lift, not a pose.
 *
 * "Lift" USED TO BE ONE OF THESE, and it was the only one that said nothing. "Front", "Side" and "Back"
 * name the pose you can't tell from the thumbnail; "Clip" says it moves. A photo labelled "Lift" tells
 * you what the picture already shows. The useful label for a photo of a lift is WHICH lift — so it moved
 * out of this row and became a chip that opens the catalog (see `liftOpen`), which also lets a photo added
 * from the gallery attach to the exercise (0090). Before this, only a photo taken from the PR moment in
 * the logger could ever carry one.
 */
const LABELS = ['Front', 'Side', 'Back', 'Clip'];

/** "barbell-back-squat" → "Back Squat". Same rule the timeline and the trophy card use. */
function prettyLift(slug: string): string {
  const words = slug.split('-').filter(Boolean);
  const trimmed = words.length > 2 ? words.slice(1) : words;
  return trimmed.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());

function shiftDay(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
}

function pretty(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateIso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AddPhotoScreen() {
  const router = useRouter();
  const { chapter, exercise, perf } = useLocalSearchParams<{ chapter?: string; exercise?: string; perf?: string }>();
  const chapterId = typeof chapter === 'string' && chapter.length > 0 ? chapter : null;
  /* Arriving from a PR: the photo is OF a specific lift, not just of a day in a chapter (0090). The
     label is prefilled and locked to the lift, because the whole point is that this one is not generic. */
  const liftKey = typeof exercise === 'string' && exercise.length > 0 ? exercise : null;
  const liftPerf = typeof perf === 'string' && perf.length > 0 ? perf : null;
  const liftLabel = liftKey ? prettyLift(liftKey) : null;

  const { pick, mediaPickerSheet } = useMediaPicker();
  const { showToast } = useToast();

  const { data: target, loading: loadingChapter } = useQuery(
    () => (chapterId ? fetchPhotoChapter(chapterId) : fetchActivePhotoChapter()),
    [chapterId],
  );

  // Photos and video are counted separately and capped separately (Amendment 001 §3, MA3-D8/D14): 75
  // photos, 5 persistent videos. Both counters are account-wide and both include Transformation Gallery
  // entries; neither includes squad check-ins, whose media 0141 destroys at 24 hours.
  const photoGate = useCapGate('photos');
  const videoGate = useCapGate('videos');
  const guard = usePremiumGate();

  const [uri, setUri] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [takenOn, setTakenOn] = useState(today());
  const [label, setLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [starred, setStarred] = useState(false);
  const [saving, setSaving] = useState(false);
  /* The lift chosen from the catalog, when one was. Held as {key, name} because the label carries the
     NAME and the column stores the KEY (0090). */
  const [picked, setPicked] = useState<{ key: string; name: string } | null>(null);
  const [liftOpen, setLiftOpen] = useState(false);
  const primeKeyboard = useKeyboardPrimer();
  const [liftSearch, setLiftSearch] = useState('');

  const liftResults = (() => {
    const q = liftSearch.trim().toLowerCase();
    return (q ? PICKER_DB.filter((x) => x.name.toLowerCase().includes(q)) : PICKER_DB).slice(0, 40);
  })();

  /* The attachment follows the LABEL. Pick "Back Squat" and then type over it, and the photo is no longer
     of that lift — so the key is only sent while the label still says so. Derived, not an effect: writing
     this back into state on every keystroke is exactly what the react-compiler lint forbids. */
  const pickedKey = picked && label === picked.name ? picked.key : null;

  /**
   * ⚠ THE CAP IS CHECKED BEFORE THE PICKER OPENS, AND IT DECIDES WHAT THE PICKER OFFERS.
   *
   * M-7 §2 requires a pre-action check: the athlete must never choose a photo and only then be told they
   * cannot keep it. But this screen takes either medium, and photos (75) and video (5) are counted
   * separately — so "check the cap first" is not one question, it is two, and the honest answer is to
   * narrow what the picker will accept rather than to refuse the whole screen:
   *
   *   both have room  → offer both
   *   only photos     → offer images only
   *   only video      → offer video only
   *   neither         → M-7, on the photo cap, since this is the photo surface
   *
   * A picker that offered video to an athlete with no video slots left would be the dead end the spec
   * forbids, one step later.
   */
  const choose = async () => {
    const photoRoom = photoGate.ok;
    const videoRoom = videoGate.ok;

    // Unverifiable entitlement blocks and offers a retry — it never opens the picker and never upsells
    // (M-7 §10). `guard` shows the retry toast for us.
    if (photoGate.showRetry || videoGate.showRetry) {
      guard('photos');
      return;
    }
    if (!photoRoom && !videoRoom) {
      guard('photos');
      return;
    }

    const kind = photoRoom && videoRoom ? 'both' : photoRoom ? 'images' : 'videos';
    const asset = await pick({
      kind,
      title: kind === 'videos' ? 'Add a video' : 'Add a photo',
      hint: 'It joins this chapter’s album.',
      quality: 0.85,
    });
    if (!asset) return;
    setUri(asset.uri);
    setIsVideo(asset.type === 'video');
  };

  const floor = target?.startDate ?? '1970-01-01';
  const canGoBack = takenOn > floor;
  const canGoFwd = takenOn < today();
  const stepDate = (days: number) => {
    const next = shiftDay(takenOn, days);
    if (next < floor || next > today()) return;
    setTakenOn(next);
  };

  const save = async () => {
    if (!uri || !target) return;
    setSaving(true);
    try {
      const url = await uploadChapterPhoto(target.id, uri, isVideo ? 'video' : 'image');
      await addChapterPhoto({
        chapterId: target.id,
        url,
        takenOn,
        pose: liftLabel ?? label,
        caption,
        isVideo,
        // A PR shot is a highlight by definition — it can stand in as the chapter's cover.
        isStarred: liftKey ? true : starred,
        // From the PR moment, or chosen from the catalog here — both are a photo OF a lift.
        exercise: liftKey ?? pickedKey,
      });
      showToast(isVideo ? 'Video added to your chapter.' : 'Photo added to your chapter.');
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
      setSaving(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/legacy'));

  if (loadingChapter) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
        <AppBar title="Add a Photo" onClose={close} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  /* No chapter, nothing to add to. Onboarding opens Chapter I, so this is close to unreachable —
     but a photo with no chapter has nowhere to live, and that is worth saying rather than crashing. */
  if (!target) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
        <AppBar title="Add a Photo" onClose={close} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No open chapter</Text>
          <Text style={styles.emptyBody}>Photos live inside a chapter. Start one and this will have somewhere to go.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title="Add a Photo" onClose={close} />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.destination}>
            Adding to <Text style={styles.destinationName}>{target.name}</Text>
          </Text>

          {/* The PR banner. Present only when this photo is OF a lift. */}
          {liftLabel ? (
            <View style={styles.liftBanner}>
              <MedalGlyph />
              <View style={styles.liftBody}>
                <Text style={styles.liftTitle}>{liftLabel}</Text>
                {liftPerf ? <Text style={styles.liftPerf}>{liftPerf}</Text> : null}
              </View>
            </View>
          ) : null}

          {/* ── the photo ── */}
          <Pressable
            onPress={choose}
            accessibilityRole="button"
            accessibilityLabel={uri ? 'Change the photo' : 'Choose a photo or video'}
            style={({ pressed }) => [styles.frame, uri ? null : styles.frameEmpty, pressed ? styles.pressed : null]}
          >
            {uri ? (
              <>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
                <View style={styles.changeChip}>
                  <Text style={styles.changeChipText}>{isVideo ? 'Video · Change' : 'Change'}</Text>
                </View>
              </>
            ) : (
              <View style={styles.frameInner}>
                <CameraGlyph size={26} />
                <Text style={styles.frameLabel}>Choose a photo or video</Text>
              </View>
            )}
          </Pressable>

          {/* ── date ── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Taken</Text>
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => stepDate(-1)}
                disabled={!canGoBack}
                accessibilityRole="button"
                accessibilityLabel="One day earlier"
                accessibilityState={{ disabled: !canGoBack }}
                style={({ pressed }) => [styles.stepBtn, !canGoBack ? styles.stepBtnOff : null, pressed && canGoBack ? styles.pressed : null]}
              >
                <ChevronGlyph dir="left" color={canGoBack ? flColor.bronze300 : flColor.gray600} />
              </Pressable>

              <Text style={styles.dateText}>{pretty(takenOn)}</Text>

              <Pressable
                onPress={() => stepDate(1)}
                disabled={!canGoFwd}
                accessibilityRole="button"
                accessibilityLabel="One day later"
                accessibilityState={{ disabled: !canGoFwd }}
                style={({ pressed }) => [styles.stepBtn, !canGoFwd ? styles.stepBtnOff : null, pressed && canGoFwd ? styles.pressed : null]}
              >
                <ChevronGlyph dir="right" color={canGoFwd ? flColor.bronze300 : flColor.gray600} />
              </Pressable>
            </View>
            {takenOn !== today() ? (
              <Pressable onPress={() => setTakenOn(today())} accessibilityRole="button" accessibilityLabel="Back to today" hitSlop={8} style={styles.todayRow}>
                <Text style={styles.todayText}>Back to today</Text>
              </Pressable>
            ) : null}
            {takenOn === floor ? <Text style={styles.fieldHint}>This is the day the chapter opened.</Text> : null}
          </View>

          {/* ── label ── generic photos only; a PR shot is labelled by its lift. */}
          <View style={[styles.field, liftLabel ? styles.hidden : null]} pointerEvents={liftLabel ? 'none' : 'auto'}>
            <Text style={styles.fieldLabel}>Label</Text>
            <Text style={styles.fieldHint}>Optional. Shown under the photo when you open it.</Text>
            <View style={styles.chipRow}>
              {LABELS.map((l) => {
                const on = label === l;
                return (
                  <Pressable
                    key={l}
                    onPress={() => setLabel(on ? '' : l)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Label: ${l}`}
                    style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed ? styles.pressed : null]}
                  >
                    <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{l}</Text>
                  </Pressable>
                );
              })}
              {/* Names the lift instead of just saying "Lift". Shows the chosen one so the chip reads back
                  what it did — and stays on only while the label still matches, same rule as `pickedKey`. */}
              <Pressable
                /* `primeKeyboard` first, synchronously: the sheet's search field is inside a `<Modal>`
                   and does not exist yet, so its `autoFocus` fires outside this gesture and iOS Safari
                   declines to raise a keyboard. See `KeyboardPrimer`. */
                onPress={() => {
                  primeKeyboard();
                  setLiftOpen(true);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: !!pickedKey }}
                accessibilityLabel={pickedKey ? `Lift: ${picked?.name}` : 'Choose a lift'}
                style={({ pressed }) => [styles.chip, pickedKey ? styles.chipOn : null, pressed ? styles.pressed : null]}
              >
                <Text style={[styles.chipText, pickedKey ? styles.chipTextOn : null]}>{pickedKey ? picked?.name : 'A lift…'}</Text>
              </Pressable>
            </View>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Or write your own"
              placeholderTextColor={flColor.gray600}
              style={styles.input}
              accessibilityLabel="Photo label"
              maxLength={40}
            />
          </View>

          {/* ── caption ── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>A line about it</Text>
            <Text style={styles.fieldHint}>Optional. This is what shows in the timeline, in your own words.</Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Today sucked. Showed up anyway."
              placeholderTextColor={flColor.gray600}
              style={[styles.input, styles.inputMulti]}
              multiline
              accessibilityLabel="A line about this photo"
              maxLength={240}
            />
          </View>

          {/* ── star ── a PR is a highlight by definition, so there is nothing to decide. */}
          <Pressable
            onPress={() => setStarred((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: starred }}
            accessibilityLabel="Mark as a highlight"
            style={({ pressed }) => [styles.starRow, starred ? styles.starRowOn : null, pressed ? styles.pressed : null, liftLabel ? styles.hidden : null]}
          >
            <StarGlyph filled={starred} />
            <View style={styles.starBody}>
              <Text style={styles.starTitle}>Mark as a highlight</Text>
              <Text style={styles.starSub}>Highlights can stand in as the chapter’s cover.</Text>
            </View>
          </Pressable>

          <View style={styles.save}>
            <Button variant="primary" fullWidth onPress={save} disabled={!uri || saving} accessibilityLabel="Add to the chapter">
              {saving ? 'Adding…' : 'Add to Chapter'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* The real 809-exercise catalog — the same `PICKER_DB` the logger and Goals search. Choosing sets
          the label AND the attachment, which is the whole reason this replaced a chip reading "Lift". */}
      <BottomSheet open={liftOpen} onClose={() => setLiftOpen(false)} title="Which lift?">
        <View style={styles.liftSheet}>
          <TextInput
            style={styles.input}
            value={liftSearch}
            onChangeText={setLiftSearch}
            placeholder="Search exercises…"
            placeholderTextColor={flColor.gray600}
            accessibilityLabel="Search exercises"
            autoFocus
          />
          <ScrollView style={styles.liftList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {liftResults.map((x) => (
              <Pressable
                key={x.key}
                onPress={() => {
                  setPicked({ key: x.key, name: x.name });
                  setLabel(x.name);
                  setLiftOpen(false);
                  setLiftSearch('');
                }}
                accessibilityRole="button"
                accessibilityLabel={x.name}
                style={styles.liftRow}
              >
                <Text style={styles.liftRowText}>{x.name}</Text>
              </Pressable>
            ))}
            {liftResults.length === 0 ? <Text style={styles.liftEmpty}>No exercise matches “{liftSearch.trim()}”.</Text> : null}
          </ScrollView>
        </View>
      </BottomSheet>

      {mediaPickerSheet}
    </View>
  );
}

// ── glyphs ──
function MedalGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.6 7.1H22l-6 4.4 2.3 7.1-6.3-4.6-6.3 4.6 2.3-7.1-6-4.4h7.4z" />
    </Svg>
  );
}
function CameraGlyph({ size = 22, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <Path d="M15.2 13a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z" />
    </Svg>
  );
}
function ChevronGlyph({ dir, size = 18, color = flColor.bronze300 }: { dir: 'left' | 'right'; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </Svg>
  );
}
function StarGlyph({ filled, size = 19 }: { filled: boolean; size?: number }) {
  const d = 'M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z';
  return filled ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d={d} />
    </Svg>
  ) : (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.7} strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  pressed: { opacity: 0.88 },

  scroll: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 40 },

  destination: { marginBottom: 16, fontSize: 12.5, color: flColor.gray600 },
  destinationName: { fontWeight: '600', color: flColor.bronze300 },

  frame: { width: '100%', aspectRatio: 4 / 5, borderRadius: flRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: '#0b0a09' },
  frameEmpty: { borderStyle: 'dashed', borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  frameInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  frameLabel: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  changeChip: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 11, paddingVertical: 5, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(8,11,14,0.78)' },
  changeChipText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

  hidden: { display: 'none' },
  liftBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18, paddingHorizontal: 14, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  liftBody: { flex: 1, minWidth: 0 },
  liftTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  liftPerf: { marginTop: 2, fontSize: 12, fontWeight: '600', color: flColor.bronze300 },
  field: { marginTop: 24 },
  fieldLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  fieldHint: { marginTop: 5, fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, paddingHorizontal: 6, paddingVertical: 6, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.sm },
  stepBtnOff: { opacity: 0.45 },
  dateText: { flex: 1, textAlign: 'center', fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  todayRow: { marginTop: 8, alignSelf: 'flex-start' },
  todayText: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },
  chipTextOn: { color: flColor.bronze300 },

  input: { marginTop: 10, paddingHorizontal: 13, paddingVertical: 11, minHeight: 44, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 13.5, color: flColor.cream100 },

  liftSheet: { gap: 12 },
  liftList: { maxHeight: 320 },
  liftRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: flColor.charcoal800 },
  liftRowText: { fontSize: 15, color: flColor.cream100 },
  liftEmpty: { paddingVertical: 18, fontSize: 13, color: flColor.gray400 },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },

  starRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 14, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  starRowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  starBody: { flex: 1, minWidth: 0 },
  starTitle: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  starSub: { marginTop: 2, fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },

  save: { marginTop: 30 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
});
