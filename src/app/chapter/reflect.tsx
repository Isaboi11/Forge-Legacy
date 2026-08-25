import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchChapterDetail, saveReflection, sealChapter } from '@/data/chapter-detail-live';
import { isAchieved, isQuantifiable, progressLabel } from '@/domain/goals/goals';
import { usePersist } from '@/hooks/usePersist';
import { useQuery } from '@/lib/useQuery';

/**
 * M-5 · Chapter Reflection ceremony (`Forge Chapter Reflection.dc.html`). The closing surface of sealing
 * a chapter — the athlete writes what the chapter meant before it becomes permanent. Two entry paths
 * (query `path`):
 *
 *   • sealing — reached from Chapter Detail's "Seal Chapter". This screen IS the seal ceremony: writing a
 *     reflection + "Seal Chapter" seals WITH it; "Skip for now" seals WITHOUT one (add it later). Both
 *     archive the chapter.
 *   • post — add a reflection to an already-sealed chapter that never got one. "Save Reflection" writes it.
 *     If the chapter already has a reflection, it's shown locked/read-only (a reflection is permanent).
 *
 * Safety deviation from the .dc (which hides the app-bar back on the sealing path): sealing is
 * irreversible, so a back arrow is kept on BOTH paths to cancel without sealing. An exit while there's
 * unsaved text raises the M-6 discard ConfirmSheet.
 */

const BACK = 'M15 5l-7 7 7 7';
const CHECK = 'M20 6L9 17l-5-5';
const CHEVRON_DOWN = 'M6 9l6 6 6-6';
const ARROW = 'M5 12h14M13 6l6 6-6 6';

const PROMPTS = [
  'What part of this chapter challenged you the most?',
  'What surprised you?',
  'What are you proud of?',
  'What would you tell yourself on day one?',
];

type ReflectPath = 'sealing' | 'post';

export default function ChapterReflectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; path?: string }>();
  const id = String(params.id);
  const path: ReflectPath = params.path === 'post' ? 'post' : 'sealing';
  const isPost = path === 'post';

  const { data, loading, refetch } = useQuery(() => fetchChapterDetail(id), [id]);

  const existing = data?.reflection?.trim() ?? '';
  const locked = isPost && existing.length > 0;

  // Sealing pre-fills any in-progress chapter notes (our reflection field doubles as notes) so nothing is
  // lost; the post path starts blank (a locked reflection is handled separately).
  const [draft, setDraft] = useState<string | null>(null);
  const seed = isPost ? '' : existing;
  const text = draft ?? seed;
  const hasText = text.trim().length > 0;

  const [focus, setFocus] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const persist = usePersist();

  const header = useMemo(() => {
    if (!data) return null;
    const primary = data.goals.find((g) => g.isPrimary) ?? data.goals[0];
    let goalLine: string | null = null;
    let goalAchieved = false;
    if (primary) {
      goalAchieved = isAchieved(primary);
      const detail = isQuantifiable(primary) ? progressLabel(primary) : '';
      goalLine = goalAchieved ? `${primary.name} achieved` : `${primary.name}${detail ? ` · ${detail}` : ''} · In progress at sealing`;
    }
    const ctx = [`${data.workoutCount} ${data.workoutCount === 1 ? 'workout' : 'workouts'}`, `${data.honorCount} ${data.honorCount === 1 ? 'honor' : 'honors'}`].join(' · ');
    return { name: `${data.number} · ${data.title}`, range: data.statusLabel, goalLine, goalAchieved, ctx };
  }, [data]);

  const leave = () => {
    if (isPost) return router.back();
    router.replace('/legacy');
  };
  const attemptExit = () => {
    if (hasText && !saved) return setConfirmOpen(true);
    // Nothing written — a bare back cancels (no seal).
    router.back();
  };

  /*
   * ⚠ THE LEAST REVERSIBLE ACTION IN THE PRODUCT, AND IT USED TO FAIL IN SILENCE.
   *
   * This was `void action.then(() => setSaved(true)).finally(() => setBusy(false))` — no rejection arm on
   * either branch. `sealChapter` and `saveReflection` both throw correctly; nobody caught it. `saved` is
   * the sole gate on the "This chapter has been sealed." overlay, so on a failed write the button simply
   * un-greyed and NOTHING else happened. Backing out then offered to discard the reflection they had just
   * written, which reads as though the app threw their words away on purpose.
   *
   * `busy` is cleared by `usePersist`'s own arms rather than a `finally`, because `.finally()` re-throws
   * and that is how the rejection escaped in the first place.
   */
  const complete = () => {
    if (!hasText || busy) return;
    setBusy(true);
    persist(() => (isPost ? saveReflection(id, text.trim()) : sealChapter(id, text.trim())), {
      onOk: () => {
        setSaved(true);
        setBusy(false);
        // The summary underneath describes a chapter that is only NOW sealed — its date range, duration
        // and reflection all change with the write. Reading the pre-seal copy under the word "Sealed"
        // would be a confident, specific, false claim.
        refetch();
      },
      rollback: () => setBusy(false),
      message: isPost
        ? 'Couldn’t save your reflection — check your connection and try again.'
        : 'Couldn’t seal the chapter — check your connection and try again. Your reflection is still here.',
    });
  };
  // Sealing only: seal without a reflection. Same failure shape as `complete` — a seal that did not
  // happen must never look like one that did.
  const skip = () => {
    if (busy || isPost) return;
    setBusy(true);
    persist(() => sealChapter(id), {
      onOk: () => {
        setSaved(true);
        setBusy(false);
        refetch(); // same reason as `complete` — the summary must describe the sealed chapter
      },
      rollback: () => setBusy(false),
      message: 'Couldn’t seal the chapter — check your connection and try again.',
    });
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(5,5,5,0.42)' }} />

      {/* app bar — a back/cancel only on the POST path (matches the .dc). On the sealing path the screen IS
          the commitment: the only ways forward both seal (write + "Seal Chapter", or "Skip for now"). */}
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        {isPost ? (
          <>
            <Pressable onPress={attemptExit} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.barBtn} hitSlop={8}>
              <Glyph d={BACK} size={22} color={flColor.gray400} width={1.9} />
            </Pressable>
            <Text style={styles.barTitle}>Reflection</Text>
            <View style={styles.barBtn} />
          </>
        ) : null}
      </View>

      {loading || !data || !header ? (
        <View style={styles.center}>{loading ? <ActivityIndicator color={flColor.bronze400} /> : <Text style={styles.err}>Chapter not found.</Text>}</View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* what they built — read-only */}
            <Text style={styles.eyebrow}>Chapter Sealed</Text>
            <Text style={styles.title}>{header.name}</Text>
            <Text style={styles.range}>{header.range}</Text>
            {header.goalLine ? (
              <View style={styles.goalRow}>
                {header.goalAchieved ? <Glyph d={CHECK} size={16} color={flColor.bronze300} width={2.4} /> : null}
                <Text style={[styles.goalLine, !header.goalAchieved && styles.goalLineDim]}>{header.goalLine}</Text>
              </View>
            ) : null}
            <Text style={styles.ctx}>{header.ctx}</Text>

            {locked ? (
              /* reading an archived reflection */
              <View style={styles.lockedCard}>
                <Text style={styles.lockedLabel}>Reflection</Text>
                <Text style={styles.lockedText}>&ldquo;{existing}&rdquo;</Text>
                {data.sealedDateLabel ? <Text style={styles.lockedMeta}>{data.sealedDateLabel} · This is now part of your story.</Text> : null}
              </View>
            ) : (
              /* the writing focus */
              <View style={styles.form}>
                <Text style={styles.prompt}>What did this chapter mean to you?</Text>
                <View style={[styles.well, focus && styles.wellFocus]}>
                  <TextInput
                    value={text}
                    onChangeText={setDraft}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    placeholder="Start writing…"
                    placeholderTextColor={flColor.gray600}
                    multiline
                    style={styles.input}
                    accessibilityLabel="Your reflection"
                  />
                </View>

                <Pressable onPress={() => setPromptsOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Need a prompt" style={styles.promptToggle}>
                  <Text style={styles.promptToggleText}>Need a prompt?</Text>
                  <Glyph d={CHEVRON_DOWN} size={14} color={flColor.gray600} width={2} rotate={promptsOpen ? 180 : 0} />
                </Pressable>
                {promptsOpen ? (
                  <View style={styles.prompts}>
                    {PROMPTS.map((p) => (
                      <Text key={p} style={styles.promptItem}>
                        {p}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          {/* footer — hidden while reading a locked reflection */}
          {!locked ? (
            <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
              <Text style={styles.permanence}>
                {isPost ? 'Once saved, this reflection becomes part of your legacy. It can’t be edited.' : 'Your reflection becomes a permanent part of this chapter.'}
              </Text>
              <Button variant="primary" fullWidth disabled={!hasText || busy} onPress={complete} accessibilityLabel={isPost ? 'Save reflection' : 'Seal chapter'}>
                {isPost ? 'Save Reflection' : 'Seal Chapter'}
              </Button>
              <Pressable onPress={isPost ? attemptExit : skip} disabled={busy} accessibilityRole="button" accessibilityLabel={isPost ? 'Cancel' : 'Skip for now'} style={styles.tertiary}>
                <Text style={styles.tertiaryText}>{isPost ? 'Cancel' : 'Skip for now'}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      {/* exit confirm — unsaved text */}
      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        headline={isPost ? 'Discard your reflection?' : 'Leave without saving?'}
        body="You’ve written something here. If you leave now, it won’t be saved."
        confirmLabel={isPost ? 'Discard' : 'Leave'}
        cancelLabel="Keep writing"
        tone="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          router.back();
        }}
      />

      {/*
        * SEALED · the chapter's own record, and the door to the next one.
        *
        * ══ ⚠ WHAT THIS REPLACED, AND WHY ══
        *
        * A checkmark, "Reflection saved.", one line, and Continue. PO, 2026-08-14: *"the seal just
        * doesn't look good, doesn't give an overview… the workout complete card is better and shows a
        * lot more. We want it to be a great celebration."* Sealing a chapter is the most significant
        * act in the product — months of training becoming permanent — and it was acknowledged more
        * quietly than finishing a single set.
        *
        * ⚠ EVERY FIGURE HERE IS ALREADY COMPUTED — `outcomeStats` has existed on `ChapterDetail` for the
        *   L-4 sealed record the whole time and no screen showed it at this moment. Nothing is invented
        *   and nothing is a placeholder: workouts, honors, goals met and duration are spine data, so a
        *   chapter with little in it shows little rather than a fabricated milestone.
        *
        * ⚠ AND IT IS REFETCHED AFTER THE WRITE. The detail loaded on mount described an ACTIVE chapter;
        *   the date range and duration only become correct once `sealed_at` exists. Rendering the
        *   pre-seal copy under the word "Sealed" would be a confident, specific, wrong claim — the exact
        *   failure this project keeps recording.
        */}
      {saved ? (
        <View style={[StyleSheet.absoluteFill, styles.savedWrap]}>
          <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.3} overlay={{ flat: 'rgba(5,5,5,0.72)' }} />
          <ScrollView contentContainerStyle={[styles.sealedScroll, { paddingTop: insets.top + 28, paddingBottom: 190 + insets.bottom }]} showsVerticalScrollIndicator={false}>
            <View style={styles.savedMark}>
              <Glyph d={CHECK} size={26} color={flColor.onBronze} width={2.4} />
            </View>

            <Text style={styles.sealedEyebrow}>{isPost ? 'Reflection Saved' : 'Chapter Sealed'}</Text>
            <Text style={styles.sealedName}>{data?.number ?? ''}</Text>
            <Text style={styles.sealedTitleBig}>{data?.title ?? ''}</Text>
            {data?.statusLabel ? <Text style={styles.sealedRange}>{data.statusLabel}</Text> : null}

            {/* The outcome line — an achieved primary goal names itself, otherwise this is the chapter. */}
            {data?.outcomeHeadline && data.outcomeHeadline !== `${data.number} — ${data.title}` ? (
              <View style={styles.sealedOutcome}>
                <Glyph d={CHECK} size={15} color={flColor.bronze300} width={2.4} />
                <Text style={styles.sealedOutcomeText}>{data.outcomeHeadline}</Text>
              </View>
            ) : null}

            {/* What the chapter actually contained. Two columns, real numbers only. */}
            {data?.outcomeStats?.length ? (
              <View style={styles.statGrid}>
                {data.outcomeStats.map((s) => (
                  <View key={s.label} style={styles.statCell}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Their own words, if they wrote any. Shown because this is the last moment it is new. */}
            {data?.reflection?.trim() ? (
              <View style={styles.sealedReflection}>
                <Text style={styles.sealedReflectionLabel}>Reflection</Text>
                <Text style={styles.sealedReflectionText}>&ldquo;{data.reflection.trim()}&rdquo;</Text>
              </View>
            ) : null}

            <Text style={styles.sealedPermanence}>This is permanent now. It stays in your legacy whatever comes next.</Text>
          </ScrollView>

          {/*
            * ⚠ THE WAY FORWARD, WHICH DID NOT EXIST. Sealing was a one-way door: the only
            *   `insert into chapters` in the repo is the onboarding RPC. `/chapter/new` is L-5, a locked
            *   spec that had never been built, and this is the moment an athlete most wants it.
            *   Secondary on the POST path — that athlete already has an active chapter and must not be
            *   offered a second (the partial unique index would refuse it anyway).
            */}
          <View style={[styles.continue, { bottom: 20 + insets.bottom }]}>
            {!isPost ? (
              <Button variant="primary" fullWidth onPress={() => router.replace('/chapter/new')} accessibilityLabel="Begin your next chapter">
                <View style={styles.continueInner}>
                  <Text style={styles.continueText}>Begin Your Next Chapter</Text>
                  <Glyph d={ARROW} size={16} color="#F7F5F1" width={2.2} />
                </View>
              </Button>
            ) : (
              <Button variant="primary" fullWidth onPress={leave} accessibilityLabel="Continue">
                <View style={styles.continueInner}>
                  <Text style={styles.continueText}>Continue</Text>
                  <Glyph d={ARROW} size={16} color="#F7F5F1" width={2.2} />
                </View>
              </Button>
            )}
            {!isPost ? (
              <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Not now" style={styles.sealedTertiary}>
                <Text style={styles.sealedTertiaryText}>Not now</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Glyph({ d, size = 16, color, width = 1.9, rotate = 0 }: { d: string; size?: number; color: string; width?: number; rotate?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}>
      <Path d={d} />
    </Svg>
  );
}

const HAIRLINE = flColor.bronzeBorderSubtle;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 14, color: flColor.gray400 },

  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, paddingBottom: 6 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray400 },

  body: { paddingHorizontal: 26, paddingTop: 8 },
  eyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 30, color: flColor.cream100, marginTop: 10 },
  range: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400, marginTop: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  goalLine: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  goalLineDim: { color: flColor.gray400 },
  ctx: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, marginTop: 12 },

  form: { marginTop: 22, paddingTop: 22, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  prompt: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100, marginBottom: 16 },
  well: { paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: HAIRLINE },
  wellFocus: { borderColor: flColor.bronze400 },
  input: { minHeight: 168, fontFamily: flFont.sans, fontSize: 16, fontWeight: '500', lineHeight: 27, color: flColor.cream100, textAlignVertical: 'top' },

  promptToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, marginTop: 14 },
  promptToggleText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  prompts: { marginTop: 8, gap: 11, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  promptItem: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },

  lockedCard: { marginTop: 24, padding: 22, borderRadius: flRadius.xl, borderWidth: 1, borderColor: HAIRLINE, backgroundColor: flColor.surfaceRecessed },
  lockedLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 14 },
  lockedText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 17.5, lineHeight: 29, color: flColor.gray400 },
  lockedMeta: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: 'rgba(6,7,8,0.6)' },
  permanence: { fontFamily: flFont.sans, fontSize: 11, lineHeight: 16, color: flColor.gray600, textAlign: 'center', marginBottom: 11 },
  tertiary: { alignItems: 'center', paddingVertical: 10, marginTop: 6 },
  tertiaryText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  /* ── the sealed record ─────────────────────────────────────────────────────
     Was a centred check + two lines. It is now a scrollable summary, because a chapter with six months
     in it has more to say than one screen height — and `justifyContent: 'center'` on a scrolling parent
     silently clips the top of tall content, so the wrapper no longer centres. */
  savedWrap: {},
  sealedScroll: { alignItems: 'center', paddingHorizontal: 30 },
  savedMark: { width: 52, height: 52, borderRadius: flRadius.md, backgroundColor: flColor.bronzeSolid, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },

  sealedEyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  sealedName: { fontFamily: flFont.sans, fontSize: 12, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.gray400, textAlign: 'center', marginTop: 14 },
  sealedTitleBig: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', letterSpacing: -0.4, lineHeight: 35, color: flColor.cream100, textAlign: 'center', marginTop: 6 },
  sealedRange: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400, textAlign: 'center', marginTop: 12 },

  sealedOutcome: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingVertical: 10, paddingHorizontal: 16, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  sealedOutcomeText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  /* Two columns rather than a row: four stats in a row on a 390pt screen sets the numbers at a size that
     reads as a footnote, and these are the point of the screen. */
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 30, borderTopWidth: 1, borderTopColor: HAIRLINE },
  statCell: { width: '50%', paddingVertical: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: HAIRLINE },
  statValue: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginTop: 7 },

  sealedReflection: { marginTop: 28, padding: 20, borderRadius: flRadius.xl, borderWidth: 1, borderColor: HAIRLINE, backgroundColor: flColor.surfaceRecessed, alignSelf: 'stretch' },
  sealedReflectionLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 12 },
  sealedReflectionText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 16, lineHeight: 27, color: flColor.gray400 },

  sealedPermanence: { fontFamily: flFont.sans, fontSize: 12.5, lineHeight: 20, color: flColor.gray600, textAlign: 'center', marginTop: 28 },
  sealedTertiary: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  sealedTertiaryText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  continue: { position: 'absolute', left: 24, right: 24 },
  continueInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: '#F7F5F1' },
});
