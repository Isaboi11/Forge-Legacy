import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { useQuery } from '@/lib/useQuery';
import { fetchCompletion, saveReflection } from '@/data/workout-complete-live';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

type Step = 'seal' | 'record' | 'reflect' | 'share';

function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

/**
 * W-17 Workout Complete (minimal-real, 4-stage: Seal · Record · Reflect · Share). A separate route
 * reached by W-9 Finish (`router.replace('/workout-complete?id=…')`) — the workout is already durably
 * committed (seam (b)); this renders it back from the DB. The Reflect note is the one post-commit write
 * (optional, `workouts.reflection`). Deferred: honor hero moment, "How You Improved" deltas, resurfaced
 * memory (need the honor service / set-history). Primary path = Seal → hold → Legacy; the note lives on
 * the secondary "See the details → Reflect" branch, so most workouts intentionally carry no reflection.
 */
export default function WorkoutComplete() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { data, loading, error } = useQuery(() => fetchCompletion(String(id)), [id]);
  const [step, setStep] = useState<Step>('seal');
  const [note, setNote] = useState('');
  const [sealed, setSealed] = useState(false);
  const [hold] = useState(() => new Animated.Value(0));

  const goHome = () => router.replace('/(tabs)/legacy');

  const startHold = () => {
    Animated.timing(hold, { toValue: 1, duration: 900, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        setSealed(true);
        setTimeout(goHome, 650);
      }
    });
  };
  const cancelHold = () => {
    if (sealed) return;
    hold.stopAnimation();
    Animated.timing(hold, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const onSealNote = async () => {
    if (note.trim() && data) {
      try {
        await saveReflection(data.workoutId, note.trim());
      } catch {
        /* note is optional — never block the return home */
      }
    }
    goHome();
  };
  const onShare = () => {
    if (!data) return;
    void Share.share({ title: 'Forge Legacy', message: `${data.workoutName} — sealed. ${data.volume.toLocaleString()} lb moved.` });
  };

  if (loading || !data) {
    return (
      <Shell>
        <View style={styles.center}>{error ? <Text style={styles.err}>Couldn’t load your summary.</Text> : <ActivityIndicator color={flColor.bronze400} />}</View>
      </Shell>
    );
  }

  // ── Stage 1 · Seal ──
  if (step === 'seal') {
    const fillW = hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
      <Shell>
        <Pressable style={styles.shareIcon} onPress={() => setStep('share')} accessibilityRole="button" accessibilityLabel="Share">
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" />
          </Svg>
        </Pressable>
        <View style={styles.center}>
          {data.chapterName ? <Text style={styles.eyebrow}>{data.chapterName}</Text> : null}
          <Seal />
          <Text style={styles.sealStatus}>{sealed ? 'Session Sealed' : 'Session Complete'}</Text>
          <Text style={styles.sealTitle}>{data.workoutName}</Text>
          <View style={styles.sealStats}>
            <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
            <Stat n={data.volume.toLocaleString()} label="Volume · lb" />
          </View>
          {data.prs.length > 0 ? (
            <View style={styles.prCallout}>
              <Text style={styles.prKicker}>New personal record{data.prs.length > 1 ? 's' : ''}</Text>
              <Text style={styles.prLine}>
                {data.prs[0].exercise} · {data.prs[0].weight} × {data.prs[0].reps}
              </Text>
            </View>
          ) : (
            <Text style={styles.quote}>History is permanent. Outcomes cannot change.</Text>
          )}

          <Pressable
            style={styles.holdBtn}
            onPressIn={startHold}
            onPressOut={cancelHold}
            accessibilityRole="button"
            accessibilityLabel="Press and hold to seal"
          >
            <Animated.View style={[styles.holdFill, { width: fillW }]} />
            <Text style={styles.holdText}>{sealed ? 'Sealed' : 'Hold to Seal'}</Text>
          </Pressable>
          <Pressable onPress={() => setStep('record')} accessibilityRole="button" accessibilityLabel="See the details" style={styles.textLink}>
            <Text style={styles.textLinkText}>See the details</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  // ── Stage 2 · Record ──
  if (step === 'record') {
    return (
      <Shell>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setStep('seal')} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <Text style={styles.backText}>‹ The Record</Text>
          </Pressable>
          <Text style={styles.recVolume}>{data.volume.toLocaleString()}</Text>
          <Text style={styles.recVolumeLabel}>Total volume · lb</Text>

          <View style={styles.recList}>
            <Text style={styles.recHeading}>How You Improved</Text>
            {data.exercises.map((ex) => (
              <View key={ex.name} style={styles.recRow}>
                <View style={styles.recRowText}>
                  <Text style={styles.recExName}>{ex.name}</Text>
                  {ex.topSet ? <Text style={styles.recTop}>top {ex.topSet}</Text> : null}
                </View>
                {ex.isPR ? (
                  <View style={styles.prBadge}>
                    <Text style={styles.prBadgeText}>PR</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <Card variant="default" style={styles.longGame}>
            <Text style={styles.longGameCopy}>This session is now permanent — another entry in a chapter still being written.</Text>
            {data.chapterName ? <Text style={styles.longGameChapter}>{data.chapterName}</Text> : null}
          </Card>

          <View style={styles.recAction}>
            <Button variant="primary" fullWidth onPress={() => setStep('reflect')} accessibilityLabel="Done">
              Done
            </Button>
          </View>
        </ScrollView>
      </Shell>
    );
  }

  // ── Stage 3 · Reflect ──
  if (step === 'reflect') {
    return (
      <Shell>
        <View style={styles.reflectWrap}>
          <Text style={styles.eyebrow}>One Last Thing</Text>
          <Text style={styles.reflectTitle}>A note for future you</Text>
          <Text style={styles.reflectSub}>One line. You’ll read it again someday.</Text>
          <TextInput
            style={styles.reflectInput}
            placeholder="Today I…"
            placeholderTextColor={flColor.gray600}
            multiline
            value={note}
            onChangeText={setNote}
            accessibilityLabel="Your reflection"
          />
          <View style={styles.reflectActions}>
            <Button variant="primary" fullWidth onPress={onSealNote} accessibilityLabel="Seal the note">
              Seal the Note
            </Button>
            <Button variant="text" fullWidth onPress={goHome} accessibilityLabel="Skip for today">
              Skip for today
            </Button>
          </View>
        </View>
      </Shell>
    );
  }

  // ── Stage 4 · Share ──
  return (
    <Shell>
      <View style={styles.center}>
        <Card variant="hero" style={styles.shareCard}>
          <Seal small />
          <Text style={styles.shareSealed}>Session Sealed</Text>
          <Text style={styles.shareName}>{data.workoutName}</Text>
          {data.chapterName ? <Text style={styles.shareChapter}>{data.chapterName}</Text> : null}
          <View style={styles.shareDivider} />
          <View style={styles.sealStats}>
            <Stat n={data.volume.toLocaleString()} label="Volume" />
            <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
          </View>
          <Text style={styles.shareWordmark}>FORGE LEGACY</Text>
        </Card>
        <View style={styles.shareActions}>
          <Button variant="primary" fullWidth onPress={onShare} accessibilityLabel="Share">
            Share
          </Button>
          <Button variant="text" fullWidth onPress={() => setStep('seal')} accessibilityLabel="Back">
            Back
          </Button>
        </View>
      </View>
    </Shell>
  );
}

// ── pieces ──
function Shell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.4)' }} />
      {children}
    </View>
  );
}
function Seal({ small }: { small?: boolean }) {
  const d = small ? 54 : 76;
  return (
    <View style={[styles.seal, { width: d, height: d, borderRadius: d / 2 }]}>
      <View style={styles.sealInner}>
        <View style={styles.sealDiamond} />
      </View>
    </View>
  );
}
function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 12 },
  scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  err: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15 },

  shareIcon: { position: 'absolute', top: 54, right: 22, zIndex: 2, padding: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },

  seal: { alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronze400, boxShadow: flShadow.glowSubtle },
  sealInner: { width: '82%', height: '82%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal900 },
  sealDiamond: { width: 18, height: 18, transform: [{ rotate: '45deg' }], borderWidth: 1.5, borderColor: flColor.bronze300 },

  sealStatus: { fontFamily: flFont.sans, fontSize: 13, letterSpacing: 0.5, color: flColor.gray400, marginTop: 4 },
  sealTitle: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  sealStats: { flexDirection: 'row', gap: 34, marginTop: 6 },
  stat: { alignItems: 'center', gap: 2 },
  statN: { fontFamily: flFont.display, fontSize: 22, color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600 },

  prCallout: { alignItems: 'center', gap: 3, marginTop: 8 },
  prKicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },
  prLine: { fontFamily: flFont.display, fontSize: 18, color: flColor.bronze400 },
  quote: { fontFamily: flFont.display, fontSize: 15, fontStyle: 'italic', color: flColor.bronze400, textAlign: 'center', marginTop: 8 },

  holdBtn: { marginTop: 26, width: '100%', height: 52, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: flColor.bronzeTint },
  holdText: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.bronze400 },
  textLink: { paddingVertical: 12 },
  textLinkText: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },

  back: { alignSelf: 'flex-start', marginBottom: 14 },
  backText: { fontFamily: flFont.sans, fontSize: 15, color: flColor.gray400 },
  recVolume: { fontFamily: flFont.display, fontSize: 46, fontWeight: '600', color: flColor.cream100 },
  recVolumeLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600, marginTop: -2 },
  recList: { marginTop: 26, gap: 2 },
  recHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  recRowText: { gap: 2 },
  recExName: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  recTop: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  prBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronze400 },
  prBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: flColor.bronze400 },
  longGame: { marginTop: 26, gap: 8 },
  longGameCopy: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  longGameChapter: { fontFamily: flFont.display, fontSize: 15, color: flColor.bronze400 },
  recAction: { marginTop: 30 },

  reflectWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  reflectTitle: { fontFamily: flFont.display, fontSize: 30, fontWeight: '600', color: flColor.cream100 },
  reflectSub: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },
  reflectInput: {
    marginTop: 10, minHeight: 96, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900,
    borderRadius: flRadius.md, padding: 16, fontFamily: flFont.sans, fontSize: 16, color: flColor.cream100, textAlignVertical: 'top',
  },
  reflectActions: { marginTop: 14, gap: 4 },

  shareCard: { width: '100%', alignItems: 'center', gap: 8 },
  shareSealed: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 6 },
  shareName: { fontFamily: flFont.display, fontSize: 24, color: flColor.cream100 },
  shareChapter: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  shareDivider: { width: '60%', height: 1, backgroundColor: flColor.bronzeBorderSubtle, marginVertical: 10 },
  shareWordmark: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: flColor.bronze400, marginTop: 10 },
  shareActions: { width: '100%', gap: 4, marginTop: 24 },
});
