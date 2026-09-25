import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/forge/composites/Pill';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flRadius, flShadow } from '@/constants/foundation';
import type { Program } from '@/domain/training/schema';

/**
 * One Forge program on a shelf — Discover's "For You" and search results, and the full `/program-catalog`.
 *
 * Name · `Family · N wk · N×/wk` · a difficulty badge · chevron. Typography and a glyph, no artwork: the
 * restructure's brief rules out stock imagery on these rows, and the authored descriptions are paragraphs,
 * so a one-line blurb would be copy nobody wrote.
 *
 * `held` — the athlete's live state for this definition ('future' | 'active'). The badge says so instead
 * of the catalogue hiding the row: a program you planned is still one Forge offers, and the caller's tap
 * already opens YOUR copy of it.
 */
export function ProgramCatalogRow({ program, held, onPress }: { program: Program; held?: string | null; onPress: () => void }) {
  const badge = held === 'active' ? 'Active' : held === 'future' ? 'In your plans' : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `Open ${program.name} — ${badge}` : `Open ${program.name}`}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.tile}>
        <EngravedIcon name="layers" size={20} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {program.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {catalogMeta(program)}
        </Text>
        <View style={styles.badgeRow}>
          <Pill tone={badge ? 'bronze' : 'muted'} size="sm">
            {badge ?? program.difficulty}
          </Pill>
        </View>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

/** `Strength · 6 wk · 3×/wk` — all from the authored definition. Weeks omitted when it has none. */
export function catalogMeta(p: Program): string {
  const freq = p.frequencyPerWeek ?? p.schedule.length;
  const weeks = p.durationWeeks ?? (p.progress ? Math.round(p.progress.total / Math.max(1, freq)) : undefined);
  return weeks ? `${p.family} · ${weeks} wk · ${freq}×/wk` : `${p.family} · ${freq}×/wk`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  pressed: { opacity: 0.88 },
  tile: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', lineHeight: 19, color: flColor.cream100 },
  meta: { fontSize: 12.5, color: flColor.gray400 },
  badgeRow: { flexDirection: 'row', marginTop: 5 },
});
