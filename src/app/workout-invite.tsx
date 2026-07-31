import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { acceptWorkoutInvite, declineWorkoutInvite, fetchWorkoutInvite, inviteSubtitle } from '@/data/train-together-live';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { writeWorkoutLaunch } from '@/lib/workout-launch';

/**
 * Shared Workout Invite (S-10).
 * Built to `Forge Workout Invite.dc.html`.
 *
 * NOT A SHARED SESSION, and the design says so in the one line that matters: "You'll each do your own
 * copy — log your own sets on your own screen. At the end you'll both be credited for training together."
 * A synchronised session would mean one athlete waiting on another's rest timer, which is two people not
 * training. So accepting starts an ordinary workout with the sender already tagged as a partner, and
 * `workouts.partners` — there since 0016, read by Activity History, counted by 0079's twenty-four
 * partnership honors — finally gets a real name in it.
 *
 * ── DELTAS VS THE `.dc` ─────────────────────────────────────────────────────
 *
 * DROPPED-FREE:
 *  1. The sender's avatar was a hand-mixed `oklch` tint keyed off a hardcoded id map, falling back to
 *     bronze for anyone not in it. Real avatar, real initials, via the shared `Avatar`.
 *  2. Decline hard-navigated to Home, whoever you came from. It goes back.
 *  3. The `ready` gate blocked first paint on the design-system namespace — the design project's own
 *     CLAUDE.md names that a preview shim and says not to carry it.
 *
 * ADDED — the states an invite actually has. The design renders one PENDING invite from a literal, and
 * has nothing for an invite that was already answered, withdrawn, or is not yours. All three are
 * reachable by tapping an old notification, so all three say what happened.
 *
 * Faithful: the pulsing ember behind the sender, the rising entrance, the workout card with its note as
 * a bronze-ruled pull-quote, the "how it works" line that sets the expectation, and Accept & Start over
 * a quiet Decline.
 */

export default function WorkoutInviteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const inviteId = typeof id === 'string' ? id : '';
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const { data: invite, loading, error } = useQuery(() => (inviteId ? fetchWorkoutInvite(inviteId) : Promise.resolve(null)), [inviteId]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const accept = async () => {
    if (!invite || busy) return;
    setBusy(true);
    try {
      await acceptWorkoutInvite(invite.id);
      /* The sender rides along in the launch context so the logger opens with them already tagged —
         which is how the credit happens. No separate "shared session" object exists to keep in step. */
      /* The SNAPSHOT, not a pointer (0093) — the invite carries the workout because they may not own the
         source program, and "next session" resolves per athlete. Empty means they agreed to build it
         together as they go, which is a real answer rather than a missing one. */
      await writeWorkoutLaunch({
        freestyle: invite.exercises.length === 0,
        exercises: invite.exercises.length > 0 ? invite.exercises : undefined,
        workoutName: invite.workoutName,
        partnerId: invite.fromId,
      });
      router.replace('/workout');
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!invite || busy) return;
    setBusy(true);
    try {
      // Deleting, not flagging — nothing anywhere records that someone said no.
      await declineWorkoutInvite(invite.id);
      close();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.34)' }} />
      <AppBar title={<Text style={styles.barTitle}>Workout Invite</Text>} onBack={close} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error || !invite ? (
        /* Reachable by tapping a notification for an invite that has since been answered or withdrawn. */
        <View style={styles.center}>
          <Text style={styles.missingTitle}>This invite is gone</Text>
          <Text style={styles.missingBody}>It was answered or withdrawn. Nothing is recorded either way.</Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Back" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Back</Text>
          </Pressable>
        </View>
      ) : invite.status === 'ACCEPTED' ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Already accepted</Text>
          <Text style={styles.missingBody}>You took this one. Start whenever you’re ready.</Text>
          <Pressable onPress={() => router.replace('/workout')} accessibilityRole="button" accessibilityLabel="Go to your workout" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Open Workout</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.senderWrap}>
              <View style={styles.ember} pointerEvents="none" />
              <Avatar name={invite.fromName} src={invite.fromAvatarUrl ?? undefined} size={88} ring />
            </View>

            <Text style={styles.eyebrow}>Shared Workout</Text>
            <Text style={styles.headline}>{invite.fromName} wants to train with you</Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardIcon}>
                  <DumbbellGlyph />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={2}>
                    {invite.workoutName}
                  </Text>
                  <Text style={styles.cardSub}>{inviteSubtitle(invite)}</Text>
                </View>
              </View>

              {invite.note ? (
                <View style={styles.note}>
                  <Text style={styles.noteText}>&ldquo;{invite.note}&rdquo;</Text>
                </View>
              ) : null}
            </View>

            {/* Sets the expectation before they commit: this is not a synchronised session. */}
            <View style={styles.how}>
              <PeopleGlyph />
              <Text style={styles.howText}>
                You’ll each do your own copy — log your own sets on your own screen. At the end you’ll both be credited for training together.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button variant="primary" fullWidth onPress={accept} disabled={busy} accessibilityLabel="Accept and start">
              {busy ? 'Starting…' : 'Accept & Start'}
            </Button>
            <Button variant="text" fullWidth onPress={decline} disabled={busy} accessibilityLabel="Decline">
              Decline
            </Button>
          </View>
        </>
      )}
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

  scroll: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 34, paddingBottom: 24 },

  senderWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  /* The design's slow ember pulse, held still — a breathing ring behind a decision is pressure. */
  ember: { position: 'absolute', top: -7, left: -7, right: -7, bottom: -7, borderRadius: flRadius.round, backgroundColor: 'rgba(191,143,79,0.16)', boxShadow: flShadow.glowSubtle },

  eyebrow: { marginTop: 22, fontSize: 12, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  headline: { marginTop: 10, maxWidth: 300, fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: -0.2, lineHeight: 31, textAlign: 'center', color: flColor.cream100 },

  card: { width: '100%', marginTop: 26, paddingHorizontal: 18, paddingVertical: 20, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, boxShadow: flShadow.missionCard },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { width: 50, height: 50, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.glowSubtle },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  cardSub: { marginTop: 2, fontSize: 12.5, color: flColor.gray400 },
  note: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: flRadius.md, borderLeftWidth: 2, borderLeftColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed },
  noteText: { fontSize: 13, lineHeight: 19.5, fontStyle: 'italic', color: flColor.gray400 },

  how: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, width: '100%', marginTop: 18, paddingHorizontal: 15, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: 'rgba(255,255,255,0.015)' },
  howText: { flex: 1, fontSize: 12.5, lineHeight: 18.8, color: flColor.gray400 },

  actions: { flexShrink: 0, gap: 10, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
