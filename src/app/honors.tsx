import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { useTour } from '@/hooks/useTour';
import { fetchHonors, type EarnedHonor } from '@/data/honors-live';
import { HONOR_CATEGORIES, categoryGlyph, categoryMeta, honorMeta } from '@/domain/honor/catalog';
import { HonorMedallion } from '@/components/honor/HonorMedallion';
import { HonorGlyph } from '@/components/honor/HonorGlyph';

/**
 * L-10 Honors Hub + L-11 Honor Detail Sheet — built to `Forge Honors Hub.dc.html` (Design b029488a).
 * A pushed full-screen surface: app bar (back · "Honors" · count), a Recent strip of the newest honors,
 * then earned honors grouped by their canonical category (map order), each a forged medallion. Tapping one
 * opens the L-11 bottom sheet (medallion · category · name · earned date · trigger · Share).
 *
 * Data is LIVE — every row is read from `honor_instances` (the same source Legacy uses); category, glyph,
 * and trigger come from the code honor catalog (`domain/honor/catalog`). Reached from the ceremony's
 * "View Honor" and Legacy → Honors → "View all". Share is a "coming soon" toast, matching the design.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function HonorsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { resumeTour } = useTour();
  const { data: honors, error, refetch } = useQuery(fetchHonors, []);
  const [selected, setSelected] = useState<EarnedHonor | null>(null);

  // The "view honor → then tutorial" hand-off: if the tour was deferred by "View Honor", resume it as the
  // athlete leaves this hub (unmount covers back button, swipe, and hardware back). No-op otherwise.
  useEffect(() => {
    return () => {
      resumeTour();
    };
  }, [resumeTour]);

  const { recent, categories, total } = useMemo(() => {
    const list = honors ?? [];
    const byCat = new Map<string, EarnedHonor[]>();
    for (const h of list) {
      const cat = honorMeta(h.slug, h.name).category;
      const arr = byCat.get(cat) ?? [];
      arr.push(h);
      byCat.set(cat, arr);
    }
    const categories = HONOR_CATEGORIES.map((c) => ({ cat: c, items: byCat.get(c.id) ?? [] })).filter((g) => g.items.length > 0);
    return { recent: list.slice(0, 5), categories, total: list.length };
  }, [honors]);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} overlay={{ flat: 'rgba(5,5,5,0.42)' }} />

      <AppBar
        onBack={() => router.back()}
        title={
          <View>
            <Text style={styles.barTitle}>Honors</Text>
            <Text style={styles.barSub}>
              {total} {total === 1 ? 'Honor' : 'Honors'}
            </Text>
          </View>
        }
      />

      {!honors ? (
        <View style={styles.status}>
          {error ? (
            <>
              <Text style={styles.statusText}>Couldn&apos;t load your honors.</Text>
              <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={flColor.bronze400} />
          )}
        </View>
      ) : total === 0 ? (
        <EmptyHonors />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {recent.map((h) => (
              <HonorTile key={h.id} honor={h} size={72} onPress={() => setSelected(h)} />
            ))}
          </ScrollView>

          {categories.map(({ cat, items }) => (
            <View key={cat.id} style={styles.catBlock}>
              <View style={styles.divider} />
              <View style={styles.catHeader}>
                <View style={styles.catHeaderLeft}>
                  <HonorGlyph glyph={cat.glyph} size={15} color={flColor.bronze400} strokeWidth={1.9} />
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                <Text style={styles.catCount}>{items.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {items.map((h) => (
                  <HonorTile key={h.id} honor={h} size={56} onPress={() => setSelected(h)} />
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}

      {selected ? (
        <HonorDetailSheet
          honor={selected}
          onClose={() => setSelected(null)}
          onShare={() => {
            setSelected(null);
            showToast('Share · coming soon');
          }}
        />
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HonorTile({ honor, size, onPress }: { honor: EarnedHonor; size: number; onPress: () => void }) {
  const meta = honorMeta(honor.slug, honor.name);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${meta.name}, earned ${fmtDate(honor.date)}`} style={[styles.tile, { width: size + 16 }]}>
      <HonorMedallion glyph={categoryGlyph(meta.category)} size={size} />
      <Text style={styles.tileName} numberOfLines={2}>
        {meta.name}
      </Text>
      <Text style={styles.tileDate}>{fmtDate(honor.date)}</Text>
    </Pressable>
  );
}

/** L-11 Honor Detail Sheet — a bottom sheet over the hub. */
function HonorDetailSheet({ honor, onClose, onShare }: { honor: EarnedHonor; onClose: () => void; onShare: () => void }) {
  const meta = honorMeta(honor.slug, honor.name);
  const cat = categoryMeta(meta.category);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.sheetScrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHead}>
          <HonorMedallion glyph={categoryGlyph(meta.category)} size={96} />
          <Text style={styles.sheetEyebrow}>{cat?.name ?? ''}</Text>
          <Text style={styles.sheetName}>{meta.name}</Text>
          <Text style={styles.sheetDate}>Earned {fmtDate(honor.date)}</Text>
        </View>

        <View style={styles.sheetCard}>
          <Text style={styles.sheetDesc}>{meta.trigger || 'A permanent part of your legacy.'}</Text>
          <View style={styles.sheetRowDivider} />
          <View style={styles.sheetRow}>
            <View style={styles.sheetRowLeft}>
              <HonorGlyph glyph={categoryGlyph(meta.category)} size={13} color={flColor.bronze400} strokeWidth={1.9} />
              <Text style={styles.sheetRowLabel}>Category</Text>
            </View>
            <Text style={styles.sheetRowValue}>{cat?.name ?? ''}</Text>
          </View>
        </View>

        <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share honor" style={styles.shareBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <Path d="M16 6l-4-4-4 4" />
            <Path d="M12 2v13" />
          </Svg>
          <Text style={styles.shareText}>Share Honor</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyHonors() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8 4h8v3.5a4 4 0 0 1-8 0z" />
          <Path d="M8 5.5H5.3c0 2.4 1 3.6 2.9 3.9" />
          <Path d="M16 5.5h2.7c0 2.4-1 3.6-2.9 3.9" />
          <Path d="M12 12v4" />
          <Path d="M9 20h6l-.5-4h-5z" />
        </Svg>
      </View>
      <Text style={styles.emptyTitle}>No honors yet</Text>
      <Text style={styles.emptyBody}>
        Every honor is struck for something you do — a first workout, a chapter sealed, a plate added. Train, and your first mark is close.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', letterSpacing: 0.2, color: flColor.cream100 },
  barSub: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, marginTop: 1 },

  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  statusText: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400 },
  retryText: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600' },

  scroll: { paddingTop: 18, paddingBottom: 40 },
  sectionLabel: {
    paddingHorizontal: 24,
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  strip: { gap: 16, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  tile: { alignItems: 'center', gap: 8 },
  tileName: { fontFamily: flFont.sans, fontSize: 11.5, fontWeight: '600', lineHeight: 15, color: flColor.gray400, textAlign: 'center' },
  tileDate: { fontFamily: flFont.sans, fontSize: 10, color: flColor.gray600 },

  catBlock: { marginTop: 30 },
  divider: { height: 1, backgroundColor: flColor.charcoal700, marginHorizontal: 24, marginBottom: 16 },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  catName: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray400 },
  catCount: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', color: flColor.gray600, fontVariant: ['tabular-nums'] },

  // detail sheet (L-11)
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#17130D',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: flShadow.ambient,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 999, backgroundColor: flColor.charcoal600, alignSelf: 'center', marginBottom: 22 },
  sheetHead: { alignItems: 'center', gap: 8 },
  sheetEyebrow: {
    marginTop: 10,
    fontFamily: flFont.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  sheetName: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 30,
    textAlign: 'center',
    color: flColor.cream100,
  },
  sheetDate: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600 },
  sheetCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
  },
  sheetDesc: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  sheetRowDivider: { height: 1, backgroundColor: flColor.charcoal700, marginTop: 14, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, paddingVertical: 6 },
  sheetRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetRowLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  sheetRowValue: { flex: 1, minWidth: 0, fontFamily: flFont.sans, fontSize: 13, fontWeight: '500', color: flColor.gray400, textAlign: 'right' },
  shareBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(196,142,74,0.06)',
  },
  shareText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze300 },

  // empty
  empty: { flex: 1, alignItems: 'center', paddingTop: 96, paddingHorizontal: 40 },
  emptyMark: {
    width: 76,
    height: 76,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 22, fontFamily: flFont.display, fontSize: 23, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  emptyBody: { marginTop: 10, maxWidth: 260, fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400, textAlign: 'center' },
});
