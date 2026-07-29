import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { CommitmentPanel, AcceptCommitment } from '@/components/forge/compositions/Commitment';
import { fetchSquadByCode, joinSquadByCode, type SquadByCode } from '@/data/squad-live';
import { errorMessage } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Join a Squad by invite code — the counterpart to Squad Invite (`squad-invite.tsx`). No dedicated
 * `.dc` exists for this entry; built on-brand to complete the invite loop.
 *
 * Two stages, because SQ-D14 requires it: the code resolves to the squad WITHOUT joining
 * (`squad_by_code`, 0055), and if that squad states a Commitment the athlete is shown it and must
 * accept before the join completes. A squad with no Commitment skips straight through — there is
 * nothing to agree to. The gate is enforced server-side too; this is the surface for it, not the lock.
 */

const normalizeCode = (v: string): string => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14);

export default function JoinSquadRoute() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [code, setCode] = useState(() => normalizeCode(String(params.code ?? '')));
  const [squad, setSquad] = useState<SquadByCode | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const canContinue = code.trim().length >= 4 && !busy;

  const join = (accept: boolean) => {
    setBusy(true);
    joinSquadByCode(code.trim(), accept).then(
      (res) => {
        setBusy(false);
        if (res.ok) {
          showToast(res.already ? 'You’re already in this squad' : 'Welcome to the squad');
          router.replace({ pathname: '/squad/[id]', params: { id: res.squadId } });
        } else if (res.reason === 'commitment_required') {
          showToast('Accept the squad’s commitment to join.');
        } else {
          showToast('That code didn’t match a squad. Check it and try again.');
        }
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  /** Resolve first. A squad that states values gets its own stage; one that doesn't joins outright. */
  const onContinue = () => {
    if (!canContinue) return;
    setBusy(true);
    fetchSquadByCode(code.trim()).then(
      (found) => {
        setBusy(false);
        if (found?.commitment && !found.already) {
          setAccepted(false);
          setSquad(found);
          return;
        }
        join(false);
      },
      // Pre-0055 (or an unreachable peek) — fall through to the ungated join rather than dead-end.
      () => {
        setBusy(false);
        join(false);
      },
    );
  };

  if (squad?.commitment) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
        <AppBar title="Join a Squad" serif onBack={() => setSquad(null)} />

        <ScrollView contentContainerStyle={styles.commitScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.identity}>
            <View style={styles.squadCrest}>
              {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.squadCrestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={30} color={flColor.bronze300} />}
            </View>
            <Text style={styles.squadName}>{squad.name}</Text>
            <Text style={styles.squadMeta}>
              {squad.memberCount} {squad.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>

          <CommitmentPanel text={squad.commitment} intro="Before you join, this is what this squad asks of its members." />

          <AcceptCommitment accepted={accepted} onToggle={() => setAccepted((v) => !v)} />

          <View style={styles.commitActions}>
            <Button variant="primary" fullWidth disabled={!accepted || busy} onPress={() => join(true)} accessibilityLabel="Accept and join squad">
              {busy ? 'Joining…' : 'Accept & Join'}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
      <AppBar title="Join a Squad" serif onBack={() => router.back()} />

      <View style={styles.body}>
        <View style={styles.crest}>
          <TicketIcon />
        </View>
        <Text style={styles.headline}>Enter your invite code</Text>
        <Text style={styles.sub}>Ask a squad owner for their code, or open an invite link they shared with you.</Text>

        <View style={styles.field}>
          <InputField
            label="Invite Code"
            value={code}
            onChange={(v) => setCode(normalizeCode(v))}
            placeholder="IRON-7Q2K"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={onContinue}
          />
        </View>

        <Button variant="primary" fullWidth disabled={!canContinue} onPress={onContinue} accessibilityLabel="Continue">
          {busy ? 'Checking…' : 'Continue'}
        </Button>
      </View>
    </View>
  );
}

function TicketIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v2a2 2 0 0 0 0 3v2A1.5 1.5 0 0 1 18.5 17h-13A1.5 1.5 0 0 1 4 15.5v-2a2 2 0 0 0 0-3z" />
      <Path d="M13 7v10" strokeDasharray="1.5 2.4" />
      <Circle cx={9} cy={12} r={0.6} fill={flColor.bronze300} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 26, paddingTop: 20, alignItems: 'center' },
  crest: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: '#1b130b',
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 1px rgba(207,160,99,0.25), 0 0 22px rgba(191,143,79,0.42), inset 0 1px 0 rgba(207,160,99,0.14), inset 0 0 28px rgba(0,0,0,0.6)',
  },
  headline: { marginTop: 22, textAlign: 'center', fontFamily: flFont.display, fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.2, color: flColor.cream100 },
  sub: { marginTop: 12, textAlign: 'center', fontSize: 13.5, lineHeight: 21, color: flColor.gray400, maxWidth: 290 },
  field: { alignSelf: 'stretch', marginTop: 28, marginBottom: 18 },

  // commitment stage
  commitScroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34 },
  identity: { alignItems: 'center', marginBottom: 22 },
  squadCrest: {
    width: 62,
    height: 62,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 6px 18px rgba(0,0,0,0.55)`,
  },
  squadCrestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  squadName: { marginTop: 13, fontFamily: flFont.display, fontSize: 22, fontWeight: '600', letterSpacing: -0.2, textAlign: 'center', color: flColor.cream100, maxWidth: 300 },
  squadMeta: { marginTop: 5, fontSize: 12, color: flColor.gray600 },
  commitActions: { marginTop: 22 },
});
