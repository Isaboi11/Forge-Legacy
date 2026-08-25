import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { fetchWorkoutInvite, requestToJoinWorkout, type WorkoutInvite } from '@/data/train-together-live';
import { fetchTrainingNow } from '@/data/presence-live';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage } from '@/lib/useQuery';
import { writeWorkoutLaunch } from '@/lib/workout-launch';

/**
 * Asking to join a workout that is already under way (0121) — the joiner's side.
 *
 * ══ WHAT THIS REPLACES ══
 *
 * The live card on Home said "View", and it opened the athlete's profile. The PO's note: *"if someone
 * sees you working out and wants to join they can click 'join' on the active tab (right now it says view
 * and it doesn't really benefit anything) and it will notify the person working out asking if they
 * accept the person joining."* The design's own `Forge Home.dc.html` had always labelled that button
 * "Join workout"; the RN build shipped "View" because there was nothing to join.
 *
 * ══ TWO STATES, ONE ROUTE ══
 *
 *   `?athlete=<hostId>` — ASK. Confirm first, then insert the request.
 *   `?id=<requestId>`   — WAIT. Poll until the host answers.
 *
 * The ask transitions into the wait on the id it gets back, so the two are one flow and the back button
 * behaves. Landing directly on `?id=` is also valid — that is what happens if the athlete leaves and
 * comes back through their inbox.
 *
 * ══ WHY POLLING ══
 *
 * There is no realtime anywhere in this app, and adding a transport for one screen would be a subsystem
 * to serve a wait that is normally under a minute. Three seconds is well inside human patience and costs
 * one indexed row read; it stops the moment the answer arrives or the athlete leaves.
 */

/** How often to check for an answer. Short, because someone is standing in a gym looking at it. */
const POLL_MS = 3000;

/** When to stop implying an answer is imminent and say what is actually happening. */
const PATIENCE_MS = 90_000;

export default function WorkoutJoinScreen() {
  const router = useRouter();
  const { athlete, id } = useLocalSearchParams<{ athlete?: string; id?: string }>();
  const { showToast } = useToast();

  const hostId = typeof athlete === 'string' ? athlete : '';
  const [requestId, setRequestId] = useState(typeof id === 'string' ? id : '');
  const [host, setHost] = useState<{ name: string; avatarUrl: string | null; label: string } | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [waited, setWaited] = useState(0);
  const [gone, setGone] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /*
   * Who they are and what they are doing, from the presence roster — the only thing the app knows about
   * someone else's session from outside it. The label ("Pull Day B") becomes the request's
   * `workout_name`, so the ask names the thing even though the shape is unknown until the host accepts.
   */
  useEffect(() => {
    if (!hostId) return;
    let live = true;
    fetchTrainingNow().then(
      (rows) => {
        if (!live) return;
        const found = rows.find((r) => r.userId === hostId);
        // `label` is null when the athlete's session has no name yet — the ask falls back to their own.
        if (found) setHost({ name: found.name, avatarUrl: found.avatarUrl, label: found.label ?? '' });
      },
      () => {
        // A failed roster read is not a reason to block the ask — the fallback name still works.
      },
    );
    return () => {
      live = false;
    };
  }, [hostId]);

  const send = async () => {
    if (sending || !hostId) return;
    setSending(true);
    try {
      const newId = await requestToJoinWorkout({
        hostId,
        workoutName: host?.label || `${host?.name ?? 'their'} workout`,
        note,
      });
      setRequestId(newId);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  /**
   * Launch, the moment the host says yes.
   *
   * The HOST is the partner here — the reverse of an invitation, where the sender is. And `startIndex`
   * is the whole point of the feature: it is where the host actually was when they accepted, so this
   * opens on the movement they are doing rather than at the top of their workout.
   */
  const launch = useCallback(
    async (inv: WorkoutInvite) => {
      await writeWorkoutLaunch({
        freestyle: inv.exercises.length === 0,
        exercises: inv.exercises.length > 0 ? inv.exercises : undefined,
        workoutName: inv.workoutName,
        partnerId: inv.toId,
        startIndex: inv.startIndex,
      });
      router.replace('/workout');
    },
    [router],
  );

  /*
   * Poll for the answer.
   *
   * A row that VANISHES is a decline: 0092 deletes rather than tombstones, so "gone" is the only signal a
   * refusal ever produces — and saying so plainly is better than leaving someone watching a spinner.
   */
  const launched = useRef(false);
  useEffect(() => {
    if (!requestId) return;
    let live = true;
    const started = Date.now();

    const tick = () => {
      fetchWorkoutInvite(requestId).then(
        (inv) => {
          if (!live) return;
          if (!inv) {
            setGone(true);
            return;
          }
          if (inv.status === 'ACCEPTED' && !launched.current) {
            launched.current = true;
            void launch(inv);
            return;
          }
          setWaited(Date.now() - started);
        },
        () => {
          // A dropped poll is a dropped poll. The next one is three seconds away.
        },
      );
    };

    const timer = setInterval(tick, POLL_MS);
    tick();
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [requestId, launch]);

  const name = host?.name ?? 'They';

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.34)' }} />
      <AppBar title="Join Workout" onBack={close} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.senderWrap}>
          <View style={styles.ember} pointerEvents="none" />
          <Avatar name={host?.name ?? 'Athlete'} src={host?.avatarUrl ?? undefined} size={88} ring />
        </View>

        {gone ? (
          <>
            <Text style={styles.eyebrow}>No this time</Text>
            <Text style={styles.headline}>{name} didn’t take it this time</Text>
            {/* Anti-shame, the same rule 0092 and 0073 hold: state the outcome, never the judgement, and
                record nothing. A second ask later is a fresh request, not a retry against a refusal. */}
            <Text style={styles.body}>Nothing is recorded either way. Train your own — you can always ask again another day.</Text>
            <View style={styles.actions}>
              <Button variant="primary" fullWidth onPress={() => router.replace('/workout')} accessibilityLabel="Start your own workout">
                Start My Own
              </Button>
              <Button variant="text" fullWidth onPress={close} accessibilityLabel="Back">
                Back
              </Button>
            </View>
          </>
        ) : requestId ? (
          <>
            <Text style={styles.eyebrow}>Asked</Text>
            <Text style={styles.headline}>Waiting on {name}</Text>
            <View style={styles.waitRow}>
              <ActivityIndicator color={flColor.bronze400} />
              <Text style={styles.body}>
                {waited > PATIENCE_MS
                  ? 'No answer yet — they’re mid-set. The ask stays live while they’re training, so leave this open or check back.'
                  : 'They’ll get a notification. The moment they say yes, your workout opens where they are.'}
              </Text>
            </View>
            <View style={styles.actions}>
              <Button variant="text" fullWidth onPress={close} accessibilityLabel="Leave this open and go back">
                Back
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>Training now</Text>
            <Text style={styles.headline}>Join {name}?</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardIcon}>
                  <DumbbellGlyph />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={2}>
                    {host?.label || 'Their workout'}
                  </Text>
                  <Text style={styles.cardSub}>You’ll start on the exercise they’re on</Text>
                </View>
              </View>
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note — optional"
              placeholderTextColor={flColor.gray600}
              style={styles.noteInput}
              accessibilityLabel="Note"
              maxLength={140}
              returnKeyType="done"
            />

            <View style={styles.how}>
              <PeopleGlyph />
              <Text style={styles.howText}>
                They decide. If they say yes you’ll get their workout from where they are, and you’ll each log your own sets — you’ll both be credited for
                training together.
              </Text>
            </View>

            <View style={styles.actions}>
              <Button variant="primary" fullWidth onPress={send} disabled={sending || !hostId} accessibilityLabel={`Ask ${name} to join`}>
                {sending ? 'Asking…' : 'Ask to Join'}
              </Button>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancel}>
                <Text style={styles.cancelText}>Not now</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DumbbellGlyph({ size = 24, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function PeopleGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },

  scroll: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 34, paddingBottom: 34 },

  senderWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ember: { position: 'absolute', top: -7, left: -7, right: -7, bottom: -7, borderRadius: flRadius.round, backgroundColor: 'rgba(191,143,79,0.16)', boxShadow: flShadow.glowSubtle },

  eyebrow: { marginTop: 22, fontSize: 12, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  headline: { marginTop: 10, maxWidth: 300, fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: -0.2, lineHeight: 31, textAlign: 'center', color: flColor.cream100 },
  body: { marginTop: 12, maxWidth: 320, fontSize: 13, lineHeight: 19.5, textAlign: 'center', color: flColor.gray400 },

  waitRow: { alignItems: 'center', gap: 4, marginTop: 20 },

  card: { width: '100%', marginTop: 26, paddingHorizontal: 18, paddingVertical: 20, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, boxShadow: flShadow.missionCard },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { width: 50, height: 50, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.glowSubtle },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  cardSub: { marginTop: 2, fontSize: 12.5, color: flColor.gray400 },

  noteInput: { width: '100%', marginTop: 14, fontSize: 14, color: flColor.cream100, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed, borderRadius: flRadius.md, paddingHorizontal: 14, paddingVertical: 12 },

  how: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, width: '100%', marginTop: 18, paddingHorizontal: 15, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: 'rgba(255,255,255,0.015)' },
  howText: { flex: 1, fontSize: 12.5, lineHeight: 18.8, color: flColor.gray400 },

  actions: { width: '100%', gap: 10, marginTop: 22 },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray600 },
});
