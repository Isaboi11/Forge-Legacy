import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { paperScrim } from '@/constants/paper-scrim';
import { createChapter } from '@/data/chapter-detail-live';
import { saveGoal } from '@/data/goals-live';
import { CHAPTER_SUGGESTIONS, CHAPTER_TITLE_MAX, isValidChapterTitle, sanitizeChapterTitle } from '@/domain/legacy/chapter-name';
import { usePersist } from '@/hooks/usePersist';
import { useToast } from '@/hooks/useCeremony';

/**
 * L-5 · Chapter Creation — `Docs/L-5-Chapter-Creation-Spec.md` (LOCKED, June 2026).
 *
 * ══ ⚠ THIS SPEC WAS LOCKED FOR TWO MONTHS AND NEVER BUILT, AND SEALING WAS A ONE-WAY DOOR ══
 *
 * The only `insert into chapters` in the repo was the onboarding RPC, which `0066` guards so that a
 * second call is a retry rather than a second chapter. An athlete who sealed their chapter therefore had
 * **no way to begin another, ever** — and because goals, chapter photos, the transformation gallery,
 * Home's chapter card and the Progress hub all filter on `is_active`, the app hollowed out into empty
 * states rather than errors. Nothing looked broken. Reported by the PO 2026-08-14, minutes after sealing
 * a chapter for the first time.
 *
 * ══ THE TWO STEPS, AND WHY THE WRITE IS AT THE END ══
 *
 * §4: L-5a names the chapter, L-5b offers an optional first goal, and **creation is atomic at L-5b
 * completion — no server write happens between the steps.** So Back from L-5b is always safe and can
 * never leave a half-made chapter. Both "Done" and "Skip for now" commit; only Cancel does not.
 *
 * ⚠ THE GOAL IS A SECOND WRITE, AND THE SPEC SAYS SO (§13.2 "Partial Failure — Chapter Saves, Goal
 *   Fails"). It cannot be folded into the chapter insert without an RPC, and the honest handling is the
 *   one the spec chose: the chapter stands, the athlete is told the goal did not save, and they are not
 *   sent back to re-enter a name that already exists. Failing the whole thing would throw away the part
 *   that succeeded.
 *
 * §3: L-5 is only reachable with no active chapter. The guard is at the ENTRY POINTS — this screen shows
 * no error state of its own — but `createChapter` still translates the partial unique index's `23505`
 * into a sentence, because a deep link or a second device can arrive here anyway.
 */

const BACK = 'M15 5l-7 7 7 7';
const ARROW = 'M5 12h14M13 6l6 6-6 6';

export default function NewChapterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const persist = usePersist();
  const { showToast } = useToast();

  const [step, setStep] = useState<'name' | 'goal'>('name');
  const [title, setTitle] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalUnit, setGoalUnit] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const nameOk = isValidChapterTitle(title);
  const hasGoalText = goalName.trim().length > 0;

  /*
   * §6.6: dismissing L-5b with goal text entered asks first; with an empty goal it just closes. The
   * chapter name itself is never worth a confirmation — it is two words and retyping it is cheaper than
   * reading a dialog.
   */
  const attemptExit = () => {
    if (step === 'goal' && hasGoalText) return setConfirmOpen(true);
    router.back();
  };

  /**
   * The single commit. `skipGoal` is "Skip for now" — the chapter is still created; only the goal is
   * omitted. Nothing here writes until it is called.
   */
  const commit = (skipGoal: boolean) => {
    if (busy || !nameOk) return;
    setBusy(true);
    persist(
      async () => {
        const chapter = await createChapter(title);
        if (!skipGoal && hasGoalText) {
          /*
           * ⚠ A FAILED GOAL MUST NOT UNDO A CREATED CHAPTER (§13.2). Caught here rather than allowed to
           * reject the outer promise: the chapter exists, and reporting total failure would send the
           * athlete back to create a second one — which the partial unique index would then refuse,
           * leaving them stuck with a confusing error about a chapter they cannot see yet.
           */
          try {
            const target = parseFloat(goalTarget);
            await saveGoal({
              chapterId: chapter.id,
              name: goalName.trim(),
              target: Number.isFinite(target) && target > 0 ? target : null,
              unit: goalUnit.trim() || null,
              // The first goal of a fresh chapter is its primary — there is nothing for it to compete
              // with, and GD-D1 allows exactly one per chapter.
              isPrimary: true,
            });
          } catch {
            showToast('Chapter created — but the goal didn’t save. You can add it from the chapter.');
          }
        }
        return chapter;
      },
      {
        onOk: (chapter) => {
          setBusy(false);
          // §2: every entry point resolves to the Legacy hub on success, whatever it was launched from.
          router.replace('/(tabs)/legacy');
          showToast(`${chapter.name} has begun.`);
        },
        rollback: () => setBusy(false),
        message: 'Couldn’t start the chapter — check your connection and try again.',
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(5,5,5,0.42)' }} />

      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={step === 'goal' ? () => setStep('name') : attemptExit}
          accessibilityRole="button"
          accessibilityLabel={step === 'goal' ? 'Back' : 'Cancel'}
          style={styles.barBtn}
          hitSlop={8}
        >
          <Glyph d={BACK} size={22} color={flColor.gray400} width={1.9} />
        </Pressable>
        <Text style={styles.barTitle}>{step === 'name' ? 'New Chapter' : 'First Goal'}</Text>
        <View style={styles.barBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 'name' ? (
            <>
              <Text style={styles.eyebrow}>Begin</Text>
              <Text style={styles.title}>What do you want to call this chapter?</Text>
              <Text style={styles.sub}>
                A chapter is a season of training you’ll seal and keep. Name it for what you’re about to do — you can rename it later.
              </Text>

              <View style={styles.well}>
                <TextInput
                  value={title}
                  onChangeText={(v) => setTitle(v.slice(0, CHAPTER_TITLE_MAX))}
                  placeholder="The Comeback"
                  placeholderTextColor={flColor.gray600}
                  style={styles.input}
                  accessibilityLabel="Chapter name"
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => nameOk && setStep('goal')}
                />
              </View>
              {/* The prefix is machine-generated and never typed — see `chapter-name.ts` on why two
                  parsers with different delimiter rules make that non-negotiable. */}
              <Text style={styles.counter}>
                {sanitizeChapterTitle(title).length}/{CHAPTER_TITLE_MAX}
              </Text>

              <Text style={styles.suggestLabel}>Or start from one of these</Text>
              <View style={styles.chips}>
                {CHAPTER_SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => setTitle(s)} accessibilityRole="button" style={[styles.chip, title === s && styles.chipOn]}>
                    <Text style={[styles.chipText, title === s && styles.chipTextOn]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>Optional</Text>
              <Text style={styles.title}>Is there one thing you want from this chapter?</Text>
              <Text style={styles.sub}>
                One goal, and it can be a number or just a sentence. Skip it if you don’t know yet — you can add one any time.
              </Text>

              <Text style={styles.fieldLabel}>Goal</Text>
              <View style={styles.well}>
                <TextInput
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="Squat 405"
                  placeholderTextColor={flColor.gray600}
                  style={styles.input}
                  accessibilityLabel="Goal"
                  autoFocus
                />
              </View>

              <View style={styles.row}>
                <View style={styles.rowCell}>
                  <Text style={styles.fieldLabel}>Target</Text>
                  <View style={styles.well}>
                    <TextInput
                      value={goalTarget}
                      onChangeText={(v) => setGoalTarget(v.replace(/[^0-9.]/g, ''))}
                      placeholder="405"
                      placeholderTextColor={flColor.gray600}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      accessibilityLabel="Target number"
                    />
                  </View>
                </View>
                <View style={styles.rowCell}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <View style={styles.well}>
                    <TextInput
                      value={goalUnit}
                      onChangeText={setGoalUnit}
                      placeholder="lb"
                      placeholderTextColor={flColor.gray600}
                      style={styles.input}
                      accessibilityLabel="Unit"
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.hint}>Leave the number blank for a goal that isn’t counted.</Text>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
          {step === 'name' ? (
            <Button variant="primary" fullWidth disabled={!nameOk} onPress={() => setStep('goal')} accessibilityLabel="Next">
              <View style={styles.ctaInner}>
                <Text style={styles.ctaText}>Next</Text>
                <Glyph d={ARROW} size={16} color="#F7F5F1" width={2.2} />
              </View>
            </Button>
          ) : (
            <>
              <Button variant="primary" fullWidth disabled={busy} onPress={() => commit(false)} accessibilityLabel="Begin chapter">
                {busy ? 'Beginning…' : 'Begin Chapter'}
              </Button>
              <Pressable onPress={() => commit(true)} disabled={busy} accessibilityRole="button" accessibilityLabel="Skip for now" style={styles.tertiary}>
                <Text style={styles.tertiaryText}>Skip for now</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        headline="Leave without starting?"
        body="You’ve written a goal here. If you leave now, the chapter won’t be created."
        confirmLabel="Leave"
        onConfirm={() => {
          setConfirmOpen(false);
          router.back();
        }}
      />
    </View>
  );
}

function Glyph({ d, size = 16, color, width = 1.9 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const HAIRLINE = flColor.bronzeBorderSubtle;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  flex: { flex: 1 },

  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, paddingBottom: 6 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray400 },

  body: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: 28 },
  eyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 26, fontWeight: '700', letterSpacing: -0.3, lineHeight: 32, color: flColor.cream100, marginTop: 10 },
  sub: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400, marginTop: 12 },

  fieldLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 22, marginBottom: 8 },
  well: { paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: HAIRLINE, marginTop: 20 },
  input: { fontFamily: flFont.sans, fontSize: 17, fontWeight: '500', color: flColor.cream100 },
  counter: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, marginTop: 8, textAlign: 'right' },
  hint: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600, marginTop: 14 },

  row: { flexDirection: 'row', gap: 14 },
  rowCell: { flex: 1 },

  suggestLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600, marginTop: 26, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },

  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: paperScrim('rgba(6,7,8,0.6)') },
  ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaText: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: '#F7F5F1' },
  tertiary: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  tertiaryText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
});
