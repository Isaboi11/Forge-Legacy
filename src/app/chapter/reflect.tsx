import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { themeScrim } from '@/constants/theme-scrim';
import { fetchChapterDetail, saveReflection } from '@/data/chapter-detail-live';
import { isAchieved, isQuantifiable, progressLabel } from '@/domain/goals/goals';
import { usePersist } from '@/hooks/usePersist';
import { useQuery } from '@/lib/useQuery';

/**
 * L-6 · Chapter Reflection (`Forge Chapter Reflection.dc.html`, `Chapter-Reflection-Wireframe-Spec-L6`).
 * The athlete writes what the chapter meant. It NEVER seals anything — the seal is M-5's, confirmed on
 * Chapter Detail before this screen opens (L-6 Decision 1: "The chapter seals at M-5 confirmation — not at
 * L-6 exit… 'Skip' has no archival consequences. Nothing is pending."). Two entry paths (query `path`):
 *
 *   • sealing (Path A, §4.1) — reached from M-5 on a chapter that is ALREADY sealed. "Complete
 *     Reflection" writes the reflection; "Skip" skips only the reflection (Decision 3: never required).
 *     Both then show the sealed record. No app-bar back (§4.1 — the chapter is archived; there is nothing
 *     to go back to); "Skip" is the exit, and it confirms first only if unsaved words would be lost (§9.3).
 *   • post (Path B, §4.2) — add a reflection to an already-sealed chapter that never got one. "Save
 *     Reflection" writes it; back/Cancel return to L-4. If the chapter already has a reflection, it's shown
 *     locked/read-only (a reflection is permanent, Decision 9).
 *
 * ⚠ QA F4 (2026-09-26): this screen used to BE the seal — no way back, "Skip for now" sealed the chapter
 *   permanently with no confirm, and the eyebrow read "Chapter Sealed" before anything was. The seal moved
 *   to M-5 on Chapter Detail, so every word on this screen is now true when it is shown.
 */

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
  // Words that leaving would lose. The pre-filled notes are already on the chapter record, so leaving them
  // untouched loses nothing and must not raise a "discard?" question.
  const dirty = draft !== null && draft.trim() !== seed.trim();

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
    if (dirty && !saved) return setConfirmOpen(true);
    // Nothing unsaved — a bare back/Cancel returns to L-4.
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
    persist(() => saveReflection(id, text.trim()), {
      onOk: () => {
        setSaved(true);
        setBusy(false);
        // The sealed record underneath shows the reflection — re-read so it shows the words just written.
        refetch();
      },
      rollback: () => setBusy(false),
      message: isPost
        ? 'Couldn’t save your reflection — check your connection and try again.'
        : 'Couldn’t save your reflection — check your connection and try again. Your chapter is sealed and your words are still here.',
    });
  };
  // Path A "Skip": skip the REFLECTION, nothing else. The chapter was sealed at M-5, so this writes nothing
  // and goes on to the sealed record (L-6 §9.2 / §13.4 — no confirm unless unsaved words would be lost).
  const skip = () => {
    if (busy || isPost) return;
    if (dirty) return setConfirmOpen(true);
    setSaved(true);
  };

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(5,5,5,0.42)' }} />

      {/* app bar — back/Cancel only on the POST path (L-6 §4.2). Path A has none (§4.1): the chapter is
          already sealed, so there is nothing behind this screen to return to — "Skip" is the exit. */}
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        {isPost ? (
          <>
            <Pressable onPress={attemptExit} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.barBtn} hitSlop={8}>
              <EngravedIcon name="chevron-left" size={22} color={flColor.gray400} />
            </Pressable>
            <Text style={styles.barTitle}>Reflection</Text>
            <View style={styles.barBtn} />
          </>
        ) : null}
      </View>

      {/* Path A on a chapter that is NOT sealed can only be a stale link (M-5 now seals before routing
          here). Send it back to Chapter Detail, where the seal is confirmed — never show the "sealed"
          ceremony for a chapter that is still open. */}
      {!isPost && data?.isActive ? <Redirect href={{ pathname: '/chapter/[id]', params: { id } }} /> : null}

      {loading || !data || !header ? (
        <View style={styles.center}>{loading ? <ActivityIndicator color={flColor.bronze400} /> : <Text style={styles.err}>Chapter not found.</Text>}</View>
      ) : (
        <>
          <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={[styles.body, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* what they built — read-only. True on both paths: this screen only ever shows a sealed chapter
                (M-5 seals before Path A opens; Path B is reached from L-4). */}
            <Text style={styles.eyebrow}>Chapter Sealed</Text>
            <Text style={styles.title}>{header.name}</Text>
            <Text style={styles.range}>{header.range}</Text>
            {header.goalLine ? (
              <View style={styles.goalRow}>
                {header.goalAchieved ? <EngravedIcon name="check" size={16} color={flColor.bronze300} /> : null}
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
                  <EngravedIcon name={promptsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={flColor.gray600} />
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
                {isPost
                  ? 'Once saved, this reflection becomes part of your legacy. It can’t be edited.'
                  : 'Your chapter is sealed. A reflection is optional — once written, it becomes a permanent part of it.'}
              </Text>
              <Button
                variant="primary"
                fullWidth
                disabled={!hasText || busy}
                onPress={complete}
                accessibilityLabel={isPost ? 'Save reflection' : 'Complete reflection'}
              >
                {isPost ? 'Save Reflection' : 'Complete Reflection'}
              </Button>
              <Pressable
                onPress={isPost ? attemptExit : skip}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={isPost ? 'Cancel, return to chapter without saving' : 'Skip, continue without saving a reflection'}
                style={styles.tertiary}
              >
                <Text style={styles.tertiaryText}>{isPost ? 'Cancel' : 'Skip'}</Text>
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
        body={
          isPost
            ? 'You’ve written something here. If you leave now, it won’t be saved.'
            : 'You’ve written something here. If you skip now, it won’t be saved. Your chapter stays sealed either way.'
        }
        confirmLabel={isPost ? 'Discard' : 'Leave'}
        cancelLabel="Keep writing"
        tone="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          // Path B → back to L-4. Path A → on to the sealed record, exactly as a bare "Skip" does (§9.3).
          if (isPost) router.back();
          else setSaved(true);
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
          <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacyMountains} imageOpacity={0.3} overlay={{ flat: 'rgba(5,5,5,0.72)' }} />
          <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={[styles.sealedScroll, { paddingTop: insets.top + 28, paddingBottom: 190 + insets.bottom }]} showsVerticalScrollIndicator={false}>
            <View style={styles.savedMark}>
              <EngravedIcon name="check" size={26} color={flColor.onBronze} />
            </View>

            <Text style={styles.sealedEyebrow}>{isPost ? 'Reflection Saved' : 'Chapter Sealed'}</Text>
            <Text style={styles.sealedName}>{data?.number ?? ''}</Text>
            <Text style={styles.sealedTitleBig}>{data?.title ?? ''}</Text>
            {data?.statusLabel ? <Text style={styles.sealedRange}>{data.statusLabel}</Text> : null}

            {/* The outcome line — an achieved primary goal names itself, otherwise this is the chapter. */}
            {data?.outcomeHeadline && data.outcomeHeadline !== `${data.number} — ${data.title}` ? (
              <View style={styles.sealedOutcome}>
                <EngravedIcon name="check" size={15} color={flColor.bronze300} />
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
                  <EngravedIcon name="arrow-right" size={16} color="#F7F5F1" />
                </View>
              </Button>
            ) : (
              <Button variant="primary" fullWidth onPress={leave} accessibilityLabel="Continue">
                <View style={styles.continueInner}>
                  <Text style={styles.continueText}>Continue</Text>
                  <EngravedIcon name="arrow-right" size={16} color="#F7F5F1" />
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

const HAIRLINE = flColor.bronzeBorderSubtle;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 14, color: flColor.gray400 },

  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, paddingBottom: 6 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray400 },

  body: { paddingHorizontal: 26, paddingTop: 8 },
  eyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.labelInk },
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
  lockedLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk, marginBottom: 14 },
  lockedText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 17.5, lineHeight: 29, color: flColor.gray400 },
  lockedMeta: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: themeScrim('rgba(6,7,8,0.6)') },
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

  sealedEyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.labelInk, textAlign: 'center' },
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
  sealedReflectionLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk, marginBottom: 12 },
  sealedReflectionText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 16, lineHeight: 27, color: flColor.gray400 },

  sealedPermanence: { fontFamily: flFont.sans, fontSize: 12.5, lineHeight: 20, color: flColor.gray600, textAlign: 'center', marginTop: 28 },
  sealedTertiary: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  sealedTertiaryText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  continue: { position: 'absolute', left: 24, right: 24 },
  continueInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  continueText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: '#F7F5F1' },
});
