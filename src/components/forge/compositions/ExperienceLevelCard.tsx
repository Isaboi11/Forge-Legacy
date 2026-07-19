import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/forge/composites/Surface';
import { Button } from '@/components/forge/composites/Button';
import { SelectTile } from '@/components/onboarding/kit';
import { flColor, flFont } from '@/constants/foundation';
import { recommendProgram } from '@/domain/onboarding/recommend';
import type { HomeLevel } from '@/lib/home-level';

/**
 * ExperienceLevelCard — the opt-in personalization on-ramp on Home (ONB-Amendment-002). ONE card, two
 * faces, built on the same `Card` container `FirstSessionCard` uses so it reads as always-part-of-the-app:
 *
 *  • Question face (level == null): "Want us to point you somewhere?" + three level tiles + a clear
 *    "Build my own program" button (→ the Program Builder). No level is required to build.
 *  • Suggested face (level set): the recommended starting program for that level (via the existing
 *    `recommendProgram` — level→program mapping already exists), a Start Training primary, and two
 *    distinct exits — "Explore everything" (→ the catalog) and a low-emphasis "Change" (re-ask).
 *
 * Honest notes: with only SF I + SF II authored, 'training' and 'experienced' both resolve to SF II — a
 * real mechanism over a thin catalog, not a stub. "Start Training" runs the existing demo logger (no
 * per-program enrollment exists — W-3/BU-1 deferred), so the suggested program is a signpost, not an enroll.
 */

const LEVELS: HomeLevel[] = ['new', 'training', 'experienced'];

const LEVEL_META: Record<HomeLevel, { mark: string; title: string; desc: string; because: string }> = {
  new: { mark: 'I', title: 'New to this', desc: 'New to training, or coming back.', because: "you're new to this" },
  training: { mark: 'II', title: 'Been training a while', desc: 'Comfortable and consistent.', because: "you've been training a while" },
  experienced: { mark: 'III', title: 'Very experienced', desc: 'Years of structured training.', because: "you're very experienced" },
};

/** The Home level ids map onto `recommendProgram`'s experience ids. */
const EXPERIENCE_FOR: Record<HomeLevel, 'beginner' | 'intermediate' | 'advanced'> = {
  new: 'beginner',
  training: 'intermediate',
  experienced: 'advanced',
};

type Props =
  | { level: null; onPick: (l: HomeLevel) => void; onBuild: () => void }
  | { level: HomeLevel; onStart: () => void; onExplore: () => void; onChange: () => void };

export function ExperienceLevelCard(props: Props) {
  // ── question face ──
  if (props.level === null) {
    const { onPick, onBuild } = props;
    return (
      <Card padding={24} style={styles.card}>
        <View style={styles.qWrap}>
          <View style={styles.header}>
            <Text style={styles.title}>Want us to point you somewhere?</Text>
            <Text style={styles.subline}>
              Tell us roughly where you&apos;re at and we&apos;ll suggest a starting program — change it anytime.
            </Text>
          </View>

          <View style={styles.tiles}>
            {LEVELS.map((l) => (
              <SelectTile
                key={l}
                mark={LEVEL_META[l].mark}
                title={LEVEL_META[l].title}
                desc={LEVEL_META[l].desc}
                selected={false}
                onPress={() => onPick(l)}
              />
            ))}
          </View>

          <Button variant="secondary" fullWidth onPress={onBuild} accessibilityLabel="Build my own program">
            Build my own program
          </Button>
        </View>
      </Card>
    );
  }

  // ── suggested face ──
  const { level, onStart, onExplore, onChange } = props;
  const meta = LEVEL_META[level];
  const rec = recommendProgram({ experience: EXPERIENCE_FOR[level] });
  const metaLine = [rec.family, rec.difficulty, rec.weeks ? `${rec.weeks} weeks` : null].filter(Boolean).join(' · ');

  return (
    <Card padding={24} style={styles.card}>
      <View style={styles.sWrap}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Suggested for you</Text>
          <Text style={styles.progName}>{rec.name}</Text>
          {metaLine ? <Text style={styles.progMeta}>{metaLine}</Text> : null}
          <Text style={styles.because}>Because {meta.because}.</Text>
        </View>

        <View style={styles.actions}>
          <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel="Start Training — begin your first workout">
            Start Training
          </Button>
          <Button variant="secondary" fullWidth onPress={onExplore} accessibilityLabel="Explore everything — see all programs">
            Explore everything
          </Button>
          <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel="Change your level" style={styles.change}>
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  qWrap: { gap: 18 },
  sWrap: { gap: 18 },
  header: { alignItems: 'center', gap: 6 },
  title: {
    fontFamily: flFont.display,
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
    textAlign: 'center',
  },
  subline: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center', maxWidth: 300 },
  tiles: { gap: 10 },

  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  progName: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100, textAlign: 'center' },
  progMeta: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400, textAlign: 'center' },
  because: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, textAlign: 'center' },

  actions: { gap: 10 },
  change: { alignItems: 'center', paddingVertical: 6 },
  changeText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
});
