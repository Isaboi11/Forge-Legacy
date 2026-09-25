import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Nutrition First Run — built to `Nutrition First Run.dc.html` (Claude Design `b029488a`).
 *
 * The tab's welcome, shown only while the athlete has never logged a food or set a target
 * (`domain/nutrition/first-run.ts`, which fails toward Home). One job: the first log. It asks for
 * nothing, and "Set it up" is the optional second door into Targets.
 *
 * ⚠ **NO AI, NO PREMIUM HERE — PO 2026-09-24.** The `.dc` carries a `showPremium` line defaulting off;
 * it stays off. Holt belongs on Nutrition Home once there is a week of food to talk about.
 *
 * Header and tab bar are the app's own (the parent draws the AppBar; the shell draws the TabBar). Role
 * tokens only, so Alabaster follows the theme with no second layout.
 *
 * Small phones (the `.dc`'s 1c, 375×667) take the compact sizes and carry the actions at the end of the
 * scroll instead of pinned, exactly as 1c draws them.
 */
export function NutritionFirstRun({ onLog, onTargets }: { onLog: () => void; onTargets: () => void }) {
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const s = compact ? small : regular;

  const actions = (
    <View style={[styles.actions, s.actions]}>
      <Button variant="primary" fullWidth onPress={onLog}>
        Log your first food
      </Button>
      <View style={styles.targetLine}>
        <Text style={styles.targetAsk}>Have a calorie or macro target?</Text>
        <Pressable accessibilityRole="button" onPress={onTargets} style={styles.targetLink} hitSlop={4}>
          <Text style={styles.targetLinkText}>Set it up →</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, s.content]} showsVerticalScrollIndicator={false}>
        <View style={[styles.mark, s.mark]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <RingMark size={s.ringSize} dotted={!compact} />
        </View>

        <Text accessibilityRole="header" style={[styles.title, s.title]}>
          Food is part of the work.
        </Text>
        <Text style={[styles.lede, s.lede]}>Start by logging what you eat. No profile, no goals, nothing to fill out first.</Text>

        <Text style={[styles.sectionLabel, s.sectionLabel]}>What’s here</Text>
        <Row compact={compact} icon={<Plus />}>Log meals by search, barcode, or your own entry.</Row>
        <Row compact={compact} icon={<Clock />}>Calories, protein, carbs and fat add up as you go.</Row>
        <Row compact={compact} icon={<Calendar />}>See how your eating lines up with training days.</Row>

        {compact ? (
          <>
            <View style={styles.spacer} />
            {actions}
          </>
        ) : null}
      </ScrollView>
      {compact ? null : actions}
    </View>
  );
}

function Row({ compact, icon, children }: { compact: boolean; icon: ReactNode; children: string }) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={[styles.rowIcon, compact && styles.rowIconCompact]}>{icon}</View>
      <Text style={[styles.rowText, compact && styles.rowTextCompact]}>{children}</Text>
    </View>
  );
}

/* The `.dc`'s quiet ring: a dimmed promise of the Home ring, never a real zero. */
function RingMark({ size, dotted }: { size: number; dotted: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 176 176">
      <Circle cx={88} cy={88} r={74} fill="none" stroke={flColor.charcoal600} strokeWidth={10} />
      {dotted ? <Circle cx={88} cy={88} r={74} fill="none" stroke={flColor.charcoal500} strokeWidth={1} strokeDasharray="2 9" /> : null}
      <Circle cx={88} cy={88} r={52} fill="none" stroke={flColor.charcoal600} strokeWidth={4} />
      <Path
        d="M88 62c4 5.5 7.5 8.5 7.5 15a7.5 7.5 0 0 1-15 0c0-3 .9-5 2.2-6.3.4 2 1.9 3.2 3 3.2-.4-4.4 1.1-9.4 2.3-11.9z"
        fill="none"
        stroke={flColor.charcoal500}
        strokeWidth={1.6}
        strokeLinejoin="round"
        transform="translate(0 8)"
      />
    </Svg>
  );
}

const Plus = () => <EngravedIcon name="plus" size={17} />;

const Clock = () => <EngravedIcon name="clock" size={17} />;

const Calendar = () => <EngravedIcon name="calendar" size={17} />;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  mark: { opacity: 0.9 },
  title: { fontFamily: flFont.display, color: flColor.cream100 },
  lede: { color: flColor.gray400 },
  /* A section label, not a card — nothing here is acted inside of. */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: flColor.gray600,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  rowCompact: { gap: 12, paddingVertical: 10 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconCompact: { width: 30, height: 30 },
  rowText: { flex: 1, fontSize: 14.5, lineHeight: 21, color: flColor.cream100 },
  rowTextCompact: { fontSize: 14, lineHeight: 19.6 },
  spacer: { flexGrow: 1, minHeight: 16 },
  actions: { gap: 10 },
  targetLine: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 4 },
  targetAsk: { fontSize: 13.5, color: flColor.gray400 },
  targetLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  targetLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: flColor.cream100,
    textDecorationLine: 'underline',
    textDecorationColor: flColor.charcoal500,
  },
});

const regular = {
  ringSize: 52,
  ...StyleSheet.create({
    content: { paddingHorizontal: 24, paddingBottom: 12 },
    mark: { paddingTop: 14 },
    title: { marginTop: 16, marginBottom: 10, fontSize: 34, lineHeight: 37, letterSpacing: -0.4 },
    lede: { marginBottom: 20, fontSize: 15.5, lineHeight: 23 },
    sectionLabel: { paddingBottom: 14 },
    actions: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 14 },
  }),
};

const small = {
  ringSize: 44,
  ...StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    mark: { paddingTop: 10 },
    title: { marginTop: 14, marginBottom: 8, fontSize: 29, lineHeight: 32, letterSpacing: -0.3 },
    lede: { marginBottom: 18, fontSize: 14.5, lineHeight: 21 },
    sectionLabel: { paddingBottom: 10 },
    actions: { gap: 8 },
  }),
};
