import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { flColor, flGradient } from '@/constants/foundation';
import { useCeremony, useToast } from '@/hooks/useCeremony';
import { useShareSheet } from '@/hooks/useShareSheet';
import { PLACEHOLDER_RANK } from '@/domain/rank-artwork/resolver';
import type { CeremonyEvent } from '@/domain/ceremony/types';
import { chapterSealConfirm, destructiveConfirm, type ConfirmConfig } from '@/domain/ceremony/confirmations';

/**
 * ⚠ DEV HARNESS — NOT a product screen and NOT in the tab bar. Reachable only via
 * `router.push('/ceremony-harness')`. Every button here is a PLACEHOLDER trigger: there
 * is no rank/honor/goal/program evaluator yet, so this stands in for the real events that
 * will enqueue ceremonies. Delete this route once real triggers exist.
 *
 * Use it to verify the ① overlay foundation: the ceremony Modal (no tap-outside, artwork
 * slot, locked-order queue) and the Toast. "Queue of 3" enqueues out of priority order to
 * prove the queue re-orders to Rank Up → Goal → Honor and presents one at a time.
 */
export default function CeremonyHarness() {
  const router = useRouter();
  const { enqueue } = useCeremony();
  const { showToast } = useToast();
  const { openShare } = useShareSheet();
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const uid = () => `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const rankUp = (): CeremonyEvent => ({ id: uid(), kind: 'rankUp', rank: PLACEHOLDER_RANK });
  const goal = (): CeremonyEvent => ({ id: uid(), kind: 'goalAchieved', goalName: 'Squat 315 lbs', chapterName: 'The Rebuild' });
  const honor = (): CeremonyEvent => ({ id: uid(), kind: 'honorEarned', honorName: 'Century Club', citation: '100 workouts logged.' });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={flGradient.bgAtmospheric.colors}
        locations={flGradient.bgAtmospheric.locations}
        start={flGradient.bgAtmospheric.start}
        end={flGradient.bgAtmospheric.end}
        style={StyleSheet.absoluteFill}
      />
      <AppBar title="Ceremony Harness" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          DEV ONLY · placeholder triggers. No real evaluators exist yet — these stand in until rank/honor/goal/program
          events can enqueue ceremonies. Not a tab; removed when real triggers land.
        </Text>

        <Button variant="primary" fullWidth onPress={() => enqueue(rankUp())}>
          Rank Up · Foundation III (real badge)
        </Button>
        <Button variant="primary" fullWidth onPress={() => enqueue({ id: uid(), kind: 'rankUp', rank: { family: 'legend', level: 2 } })}>
          Rank Up · Legend II (real badge)
        </Button>
        <Button variant="secondary" fullWidth onPress={() => enqueue(goal())}>
          Goal Achieved (placeholder mark)
        </Button>
        <Button variant="secondary" fullWidth onPress={() => enqueue({ id: uid(), kind: 'programGraduated', programName: 'Strength Foundation I' })}>
          Program Graduated (placeholder mark)
        </Button>
        <Button variant="secondary" fullWidth onPress={() => enqueue(honor())}>
          Honor Earned (placeholder mark)
        </Button>
        <Button variant="secondary" fullWidth onPress={() => enqueue({ id: uid(), kind: 'premiumUpsell' })}>
          Premium Upsell (M-7)
        </Button>

        <View style={styles.divider} />

        <Button variant="primary" fullWidth onPress={() => enqueue([honor(), goal(), rankUp()])}>
          Queue of 3 · tests locked order
        </Button>
        <Button variant="text" fullWidth onPress={() => showToast('Chapter I has started.')}>
          Show Toast
        </Button>

        <View style={styles.divider} />
        <Text style={styles.note}>M-5 / M-6 confirmations (BottomSheet):</Text>

        <Button variant="secondary" fullWidth onPress={() => setConfirm(chapterSealConfirm('The Rebuild'))}>
          M-5 · Seal Chapter
        </Button>
        <Button variant="secondary" fullWidth onPress={() => setConfirm(destructiveConfirm.memory('The Rebuild'))}>
          M-6 · Delete Memory
        </Button>
        <Button variant="secondary" fullWidth onPress={() => setConfirm(destructiveConfirm.squad('Iron Vigil', 5))}>
          M-6 · Delete Squad
        </Button>
        <Button variant="secondary" fullWidth onPress={() => setConfirm(destructiveConfirm.removeMember('Marcus Boone', 'Iron Vigil'))}>
          M-6 · Remove Member
        </Button>

        <View style={styles.divider} />
        <Text style={styles.note}>SH-1 Share Configuration (direct preview):</Text>

        <Button variant="secondary" fullWidth onPress={() => openShare({ shareType: 'honor' })}>
          Open SH-1 · Honor
        </Button>
        <Button variant="secondary" fullWidth onPress={() => openShare({ shareType: 'pr' })}>
          Open SH-1 · PR
        </Button>

        <View style={styles.divider} />
        <Text style={styles.note}>Post Detail (full-screen keepsake):</Text>

        <Button variant="secondary" fullWidth onPress={() => router.push({ pathname: '/post/[id]', params: { id: 'honor' } })}>
          Open Post Detail · Honor
        </Button>
        <Button variant="secondary" fullWidth onPress={() => router.push({ pathname: '/post/[id]', params: { id: 'pr' } })}>
          Open Post Detail · PR
        </Button>
      </ScrollView>

      <ConfirmSheet
        open={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={() => setConfirm(null)}
        headline={confirm?.headline ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel={confirm?.confirmLabel ?? ''}
        tone={confirm?.tone}
        cancelLabel={confirm?.cancelLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, gap: 12 },
  note: {
    fontSize: 12.5,
    lineHeight: 19,
    color: flColor.gray400,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: flColor.charcoal600,
    marginVertical: 8,
  },
});
