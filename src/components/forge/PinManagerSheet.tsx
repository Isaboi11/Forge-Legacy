import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchPinManager, pinCandidate, unpin } from '@/data/legacy-pins-live';
import { canPinMore, pinCountLabel, pinFor, type PinCandidate, type PinRef } from '@/domain/legacy/pins';
import type { PinKind } from '@/types/legacy';
import { useQuery } from '@/lib/useQuery';

/**
 * L-13 Pin manager (`Forge Legacy.dc.html` §pin sheet) — curate the "My Museum · Pinned Legacy" strip.
 *
 * Lists the athlete's real pinnable content (accomplishments · honors · chapters), each a toggle: a
 * check when pinned, a plus when not, disabled once the 6-cap is reached. Writes straight through to the
 * `pins` table; `onClose` lets Legacy refetch so the strip reflects the curation.
 *
 * Candidates are grouped into collapsible categories (Chapters · Honors · Accomplishments · …) so the
 * list stays scannable as content grows — tap a category header to collapse/expand it.
 */

/** Display order + label for the pin categories. Reserved kinds (record/photo/memory) are listed so they
 *  slot in automatically once they produce candidates; empty categories never render. */
const CATEGORY_ORDER: { kind: PinKind; label: string }[] = [
  { kind: 'chapter', label: 'Chapters' },
  { kind: 'honor', label: 'Honors' },
  { kind: 'accomplishment', label: 'Accomplishments' },
  { kind: 'record', label: 'Records' },
  { kind: 'photo', label: 'Photos' },
  { kind: 'memory', label: 'Memories' },
];

export function PinManagerSheet({ open, onClose }: { open: boolean; onClose: (changed: boolean) => void }) {
  const { data, loading, refetch } = useQuery(fetchPinManager, [open]); // re-read each time it opens
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<PinKind>>(() => new Set());

  const candidates = data?.candidates ?? [];
  const pins: PinRef[] = data?.pins ?? [];
  const full = !canPinMore(pins);

  // Group candidates into the non-empty categories, in display order.
  const groups = CATEGORY_ORDER.map((c) => ({ ...c, items: candidates.filter((x) => x.kind === c.kind) })).filter((g) => g.items.length > 0);
  const toggleSection = (kind: PinKind) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  const toggle = (c: PinCandidate) => {
    if (busy) return;
    const existing = pinFor(c, pins);
    if (!existing && full) return; // capped — the row is disabled, but guard anyway
    setBusy(true);
    const action = existing ? unpin(existing.id) : pinCandidate(c);
    void action.then(() => {
      setChanged(true);
      refetch();
      setBusy(false);
    });
  };

  return (
    <BottomSheet open={open} onClose={() => onClose(changed)} title="Pin to your Legacy">
      <View style={styles.wrap}>
        <Text style={styles.intro}>
          Feature your proudest moments at the top of your Legacy. <Text style={styles.count}>{pinCountLabel(pins)}</Text>
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : candidates.length === 0 ? (
            <Text style={styles.empty}>Nothing to pin yet — earn an honor, seal a chapter, or add an accomplishment.</Text>
          ) : (
            groups.map((g) => {
              const isCollapsed = collapsed.has(g.kind);
              return (
                <View key={g.kind} style={styles.section}>
                  <Pressable
                    onPress={() => toggleSection(g.kind)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !isCollapsed }}
                    accessibilityLabel={`${g.label}, ${g.items.length}`}
                    style={styles.sectionHeader}
                  >
                    <Text style={styles.sectionLabel}>{g.label}</Text>
                    <Text style={styles.sectionCount}>{g.items.length}</Text>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ rotate: isCollapsed ? '-90deg' : '0deg' }] }}>
                      <Path d="M6 9l6 6 6-6" />
                    </Svg>
                  </Pressable>

                  {isCollapsed
                    ? null
                    : g.items.map((c) => {
                        const pinned = pinFor(c, pins) != null;
                        const disabled = (!pinned && full) || busy;
                        return (
                          <Pressable
                            key={`${c.kind}:${c.refId}`}
                            onPress={() => toggle(c)}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityState={{ selected: pinned, disabled }}
                            accessibilityLabel={`${pinned ? 'Unpin' : 'Pin'} ${c.title}`}
                            style={[styles.row, pinned && styles.rowOn, !pinned && full && styles.rowDim]}
                          >
                            <View style={styles.rowIcon}>
                              <ForgeSymbol name={c.icon} size={20} color={flColor.bronze300} />
                            </View>
                            <View style={styles.rowText}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {c.title}
                              </Text>
                              <Text style={styles.rowSub} numberOfLines={1}>
                                {c.subtitle}
                              </Text>
                            </View>
                            <View style={[styles.mark, pinned && styles.markOn]}>
                              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={pinned ? flColor.onBronze : flColor.bronze300} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                <Path d={pinned ? 'M5 12.5l4.5 4.5L19 6.5' : 'M12 5v14M5 12h14'} />
                              </Svg>
                            </View>
                          </Pressable>
                        );
                      })}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button variant="primary" fullWidth onPress={() => onClose(changed)} accessibilityLabel="Done">
            Done
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 2 },
  intro: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 14 },
  count: { color: flColor.bronze400, fontWeight: '700' },

  list: { maxHeight: 380 },
  listPad: { gap: 8, paddingBottom: 6 },
  empty: { fontSize: 13, lineHeight: 20, color: flColor.gray600, textAlign: 'center', paddingVertical: 24 },

  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 2, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionCount: { flex: 1, fontSize: 11, fontWeight: '600', color: flColor.gray600, fontVariant: ['tabular-nums'] },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900 },
  rowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  rowDim: { opacity: 0.42 },
  rowIcon: { width: 38, height: 38, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowSub: { fontSize: 11.5, color: flColor.gray600, marginTop: 2 },

  mark: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorder },
  markOn: { backgroundColor: flColor.bronzeSolid, borderColor: flColor.bronze400 },

  footer: { marginTop: 14 },
});
