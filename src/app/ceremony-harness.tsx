import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';

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
 * ⚠ DEV HARNESS — NOT a product screen and NOT in the tab bar.
 *
 * Every trigger here is invented: a goal "Squat 315 lbs" in a chapter called "The Rebuild", and a seal
 * and delete-confirm against that same chapter. That was always the point — it exists to exercise the
 * overlay foundation (ceremony Modal, locked-order queue, Toast, ConfirmSheet) without having to earn
 * anything first.
 *
 * The five Post Detail buttons are GONE. They were the only links in the app to `/post/[id]`, and that
 * screen is now deferred to `src/deferred/post-detail.tsx`: because a file in `src/app/` is a route and
 * Metro does not tree-shake, its import of the fixture chain put every invented athlete into the
 * PRODUCTION bundle, readable in source, no matter that the screen redirected on `!__DEV__`. Losing the
 * preview is the price of that; the live post surface is `squad-post/[id]`, on real data.
 *
 * ══ WHY IT IS NOW GATED ══
 *
 * "Reachable only via `router.push`" was never true on web. expo-router routes by FILE, so this answered
 * to `/ceremony-harness` on the production domain — an unlinked page, but a typed URL away, showing a
 * fictional athlete's records to anyone who found it. `__DEV__` closes that without losing the tool.
 *
 * Real triggers now exist for two of these (M-1 from Legacy, M-3 from Goals), so the harness is no longer
 * the only caller — but it still covers the three kinds nothing fires yet, and the confirm sheets.
 */
export default function CeremonyHarness() {
  const router = useRouter();
  const { enqueue } = useCeremony();
  const { showToast } = useToast();
  const { openShare } = useShareSheet();
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  if (!__DEV__) return <Redirect href="/" />;

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
        <Button variant="primary" fullWidth onPress={() => router.push('/friends')}>
          Open Friends Feed
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
