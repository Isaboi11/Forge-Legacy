import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { METRIC_CAP } from '@/lib/metric-selection';
import type { MetricSeries } from '@/data/progress-hub-live';

/**
 * P-2 Edit Metrics sheet (`Forge Progress Hub.dc.html` §11) — choose up to four lifts to feature on the
 * Progress Hub, and reorder them. Selected rows first (in order) with ▲/▼, then the rest.
 *
 * Deviations from the .dc (deliberate): the pool is the athlete's REAL tracked lifts (from personal
 * records), not the .dc's fixed mock catalog; the 4-cap surfaces a toast instead of silently refusing
 * (user §15); and the reorder arrows are disabled at the ends rather than firing a no-op.
 */
export function EditMetricsSheet({
  open,
  onClose,
  metrics,
  selectedIds,
  onPersist,
  onCap,
}: {
  open: boolean;
  onClose: () => void;
  metrics: MetricSeries[];
  selectedIds: string[];
  onPersist: (list: string[]) => void;
  onCap: () => void;
}) {
  const byId = new Map(metrics.map((m) => [m.id, m]));
  const selectedRows = selectedIds.map((id) => byId.get(id)).filter((m): m is MetricSeries => m != null);
  const unselectedRows = metrics.filter((m) => !selectedIds.includes(m.id));
  const atCap = selectedIds.length >= METRIC_CAP;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onPersist(selectedIds.filter((x) => x !== id));
    else if (atCap) onCap();
    else onPersist([...selectedIds, id]);
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = selectedIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= selectedIds.length) return;
    const copy = [...selectedIds];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onPersist(copy);
  };

  return (
    <BottomSheet open={open} onClose={onClose} footer={<Button variant="primary" fullWidth onPress={onClose}>Done</Button>}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Your Metrics</Text>
        <Text style={styles.help}>Choose the lifts that matter to you — up to four appear on your Progress. Reorder with the arrows.</Text>

        {metrics.length === 0 ? (
          <Text style={styles.empty}>Log a lift and it’ll show up here to choose.</Text>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
            {selectedRows.map((m, idx) => (
              <View key={m.id} style={styles.row}>
                <View style={styles.arrows}>
                  <Pressable onPress={() => move(m.id, -1)} disabled={idx === 0} accessibilityRole="button" accessibilityLabel={`Move ${m.name} up`} hitSlop={6}>
                    <Glyph d="M6 15l6-6 6 6" color={idx === 0 ? flColor.charcoal500 : flColor.bronze400} />
                  </Pressable>
                  <Pressable onPress={() => move(m.id, 1)} disabled={idx === selectedRows.length - 1} accessibilityRole="button" accessibilityLabel={`Move ${m.name} down`} hitSlop={6}>
                    <Glyph d="M6 9l6 6 6-6" color={idx === selectedRows.length - 1 ? flColor.charcoal500 : flColor.bronze400} />
                  </Pressable>
                </View>
                <Row metric={m} />
                <SettingsToggle value onChange={() => toggle(m.id)} accessibilityLabel={m.name} />
              </View>
            ))}
            {unselectedRows.map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={styles.arrowsSpacer} />
                <Row metric={m} />
                <View style={!atCap ? undefined : styles.dim}>
                  <SettingsToggle value={false} onChange={() => toggle(m.id)} accessibilityLabel={m.name} />
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}

function Row({ metric }: { metric: MetricSeries }) {
  return (
    <View style={styles.rowText}>
      <Text style={styles.rowName} numberOfLines={1}>
        {metric.name}
      </Text>
      <Text style={styles.rowCat}>{metric.category}</Text>
    </View>
  );
}

function Glyph({ d, color }: { d: string; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  title: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', color: flColor.cream100 },
  help: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 20, color: flColor.gray400, marginTop: 6, marginBottom: 10 },
  empty: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600, textAlign: 'center', paddingVertical: 24 },

  list: { maxHeight: 400 },
  listPad: { gap: 8, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  arrows: { width: 20, alignItems: 'center', justifyContent: 'center' },
  arrowsSpacer: { width: 20 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: flFont.sans, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rowCat: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '500', letterSpacing: 0.2, color: flColor.gray600, marginTop: 2 },
  dim: { opacity: 0.45 },
});
