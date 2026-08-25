import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { fetchSquad } from '@/data/squad-live';
import { RECORD_META, fetchSquadRecords, formatRecordValue, isNewRecord, recordUnit, type SquadRecord, type SquadRecordKind } from '@/data/squad-records-live';
import { useUnits } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Records (C-6) — built to `Forge Squad Records.dc.html`.
 *
 * Faithful to the design: the letterspaced-uppercase record-book AppBar (not the DS title treatment),
 * the "these marks only ever rise" intro + tracked-count line, the two-tier record row (bronze border
 * and wash when newly broken, plain charcoal otherwise), the 40px icon tile, the NEW plaque pill, the
 * holder attribution line, the right-aligned Playfair value, the founded footer, and the history sheet
 * with its newly-broken banner, crowned current holder, and previous-holders column.
 *
 * FIVE RECORDS, NOT SIX. The design's Longest Streak is absent because nothing in this product tracks
 * streaks — no table, no definition of what breaks one. Half-inventing it for one card would put a
 * number on screen that no other surface could corroborate. It returns when streaks exist.
 *
 * LINEAGE STARTS NOW. Who held a mark before today was never recorded and can't be recovered from raw
 * workouts, so a squad opening its book sees a current holder and an empty history that fills over
 * months. The sheet says so rather than showing a convincing blank.
 *
 * Design defects not carried over: the holder rows are inert in the `.dc` — here they open the
 * athlete's profile, which is the obvious next action in a record book and matches Squad Detail's
 * member rows. The `.dc` also drops the unit on a newly-broken record (showing "from 440" in its
 * place, leaving the number unitless); both are shown here. Avatars are the design-system Avatar with
 * real photos, not initials-on-gradient. The sheet is the app's drag-dismissable BottomSheet rather
 * than a decorative grab handle that doesn't drag.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan 2026" — records are dated to the month, never the day. */
function monthYear(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SquadRecordsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squadId = String(id ?? '');
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  const { data: squadData } = useQuery(() => fetchSquad(squadId), [squadId]);
  const { data, loading, error, refetch } = useQuery(() => fetchSquadRecords(squadId), [squadId]);
  const [openKind, setOpenKind] = useState<SquadRecordKind | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/squad/[id]', params: { id: squadId } }));

  const records = data ?? [];
  const open = records.find((r) => r.kind === openKind) ?? null;
  const squad = squadData?.squad ?? null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />

      {/* The design hand-rolls this bar: letterspaced uppercase, closer to an engraved plate than a title. */}
      <AppBar title={<Text style={styles.barTitle}>Squad Records</Text>} onBack={goBack} />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load the record book.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={tourScroller}
          onScroll={onTourScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <TourAnchor id="records-scope">
            <Text style={styles.intro}>Every mark this squad has set. These marks only ever rise.</Text>
          </TourAnchor>
          <View style={styles.countRow}>
            <View style={styles.countDot} />
            <Text style={styles.countText}>
              {records.length} tracked {records.length === 1 ? 'record' : 'records'}
            </Text>
          </View>

          {records.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyDisc}>
                <BookGlyph size={30} />
              </View>
              <Text style={styles.emptyTitle}>The Book Is Open</Text>
              <Text style={styles.emptyText}>Nothing has been set yet. The first heavy lift, longest run or biggest session logged by anyone in this squad becomes its first record.</Text>
            </View>
          ) : (
            <TourAnchor id="records-board" style={styles.stack}>
              {records.map((r) => (
                <RecordRow key={r.kind} record={r} onOpen={() => setOpenKind(r.kind)} />
              ))}
            </TourAnchor>
          )}

          {squad ? (
            <View style={styles.footer}>
              <BookGlyph size={18} color={flColor.gray600} />
              <Text style={styles.footerText}>Records since {squad.name} was forged</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <ScreenTour screenKey="squad-records" ready={records.length > 0} />

      {/* ── History ── */}
      <BottomSheet open={open != null} onClose={() => setOpenKind(null)} title={open ? RECORD_META[open.kind].label : ''}>
        {open ? <RecordHistory record={open} onHolder={(holderId) => { setOpenKind(null); router.push({ pathname: '/athlete/[id]', params: { id: holderId } }); }} /> : null}
      </BottomSheet>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RecordRow({ record, onOpen }: { record: SquadRecord; onOpen: () => void }) {
  const { units } = useUnits();
  const meta = RECORD_META[record.kind];
  const top = record.reigns[0];
  const previous = record.reigns[1];
  const fresh = isNewRecord(record);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label} — ${top.holderName}, ${formatRecordValue(record.kind, top.value, units)} ${recordUnit(record.kind, units)}`}
      style={({ pressed }) => [styles.row, fresh ? styles.rowNew : styles.rowPlain, pressed ? styles.rowPressed : null]}
    >
      {fresh ? (
        <LinearGradient colors={['rgba(186, 134, 84,0.09)', 'transparent'] as const} locations={[0, 0.6] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}

      <View style={styles.iconTile}>
        <RecordGlyph kind={record.kind} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>
            {meta.label}
          </Text>
          {fresh ? (
            <View style={styles.newPill}>
              <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.attrRow}>
          <Avatar src={top.holderAvatar ?? undefined} name={top.holderName} size={16} />
          <Text style={styles.attrText} numberOfLines={1}>
            {top.holderName}
            {top.detail ? ` · ${top.detail}` : ''}
            {monthYear(top.achievedOn) ? ` · ${monthYear(top.achievedOn)}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.valueBlock}>
        <Text style={styles.value}>{formatRecordValue(record.kind, top.value, units)}</Text>
        {/* The design swaps the unit out for the delta here, leaving the number unitless. Both shown. */}
        <Text style={styles.unit}>{recordUnit(record.kind, units)}</Text>
        {fresh && previous ? (
          <View style={styles.deltaRow}>
            <ArrowUpGlyph />
            <Text style={styles.deltaText}>from {formatRecordValue(record.kind, previous.value, units)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function RecordHistory({ record, onHolder }: { record: SquadRecord; onHolder: (holderId: string) => void }) {
  // `meta` is gone: its only use here was `meta.unit`, a fixed string. The unit is now `recordUnit(kind,
  // units)`, so it moves with the value instead of contradicting it.
  const { units } = useUnits();
  const [current, ...previous] = record.reigns;
  const fresh = isNewRecord(record);

  return (
    <View style={styles.sheetBody}>
      {fresh && previous[0] ? (
        <View style={styles.newBanner}>
          <FlameGlyph size={26} />
          <Text style={styles.newBannerLabel}>NEW RECORD</Text>
          <View style={styles.newBannerRow}>
            <Text style={styles.oldValue}>{formatRecordValue(record.kind, previous[0].value, units)}</Text>
            <ArrowRightGlyph />
            <Text style={styles.newValue}>{formatRecordValue(record.kind, current.value, units)}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.sheetLabel}>Current</Text>
      <Pressable onPress={() => onHolder(current.holderId)} accessibilityRole="button" accessibilityLabel={`View ${current.holderName}'s profile`} style={styles.currentCard}>
        <View style={styles.crownWrap}>
          <FlameGlyph size={16} />
        </View>
        <Avatar src={current.holderAvatar ?? undefined} name={current.holderName} size={44} />
        <View style={styles.currentBody}>
          <Text style={styles.currentName} numberOfLines={1}>
            {current.holderName}
          </Text>
          <Text style={styles.currentDate}>
            {current.detail ? `${current.detail} · ` : ''}
            {monthYear(current.achievedOn)}
          </Text>
        </View>
        <View style={styles.currentValueBlock}>
          <Text style={styles.currentValue}>{formatRecordValue(record.kind, current.value, units)}</Text>
          <Text style={styles.unit}>{recordUnit(record.kind, units)}</Text>
        </View>
      </Pressable>

      <Text style={styles.sheetLabel}>Previous Holders</Text>
      {previous.length === 0 ? (
        // Honest rather than blank: the ledger genuinely starts here.
        <View style={styles.lineageEmpty}>
          <Text style={styles.lineageEmptyText}>
            No one has held this before. Forge Legacy started keeping this squad&apos;s record book when this mark was set — every athlete who takes it from here will be listed.
          </Text>
        </View>
      ) : (
        <View style={styles.lineageCard}>
          {previous.map((p, i) => (
            <Pressable
              key={`${p.holderId}-${p.value}-${i}`}
              onPress={() => onHolder(p.holderId)}
              accessibilityRole="button"
              accessibilityLabel={`View ${p.holderName}'s profile`}
              style={[styles.lineageRow, i > 0 ? styles.lineageRowDivided : null]}
            >
              <Avatar src={p.holderAvatar ?? undefined} name={p.holderName} size={30} />
              <View style={styles.lineageBody}>
                <Text style={styles.lineageName} numberOfLines={1}>
                  {p.holderName}
                </Text>
                <Text style={styles.lineageDate}>{monthYear(p.achievedOn)}</Text>
              </View>
              <Text style={styles.lineageValue}>{formatRecordValue(record.kind, p.value, units)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── glyphs (the design's own hand-rolled paths, not ForgeSymbols) ──
function RecordGlyph({ kind }: { kind: SquadRecordKind }) {
  const paths: Record<SquadRecordKind, string[]> = {
    heaviest_lift: ['M12 20V6', 'M6 12l6-6 6 6'],
    biggest_session: ['M4 20V10', 'M9 20V4', 'M14 20v-8', 'M19 20v-5'],
    most_workouts_month: ['M6.5 9v6', 'M17.5 9v6', 'M4 10.5v3', 'M20 10.5v3', 'M6.5 12h11'],
    longest_run: ['M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z'],
    most_prs_month: ['M12 3.4l2.1 4.7 5.1.5-3.8 3.4 1.1 5L12 14l-4.6 2.4 1.1-5-3.8-3.4 5.1-.5z'],
  };
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {paths[kind].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
function ArrowUpGlyph({ size = 10, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}
function ArrowRightGlyph({ size = 15, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h13M13 6l6 6-6 6" />
    </Svg>
  );
}
function FlameGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function BookGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2z" />
      <Path d="M12 6.5v13" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  scroll: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  intro: { fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, marginBottom: 16 },
  countDot: { width: 5, height: 5, borderRadius: flRadius.round, backgroundColor: flColor.bronze400 },
  countText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },

  stack: { gap: 10 },
  row: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  rowNew: { borderColor: flColor.bronzeBorder },
  rowPlain: { borderColor: flColor.charcoal600 },
  rowPressed: { transform: [{ scale: 0.99 }] },

  iconTile: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flexShrink: 1, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  newPill: {
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: flRadius.pill,
    boxShadow: flShadow.glowSubtle,
  },
  newPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8, color: flColor.onBronze },
  attrRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  attrText: { flex: 1, fontSize: 11.5, color: flColor.gray600 },

  valueBlock: { flexShrink: 0, alignItems: 'flex-end' },
  value: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: flColor.bronze300 },
  unit: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  deltaText: { fontSize: 9.5, fontWeight: '600', color: flColor.bronze400 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 26, opacity: 0.7 },
  footerText: { fontSize: 11, color: flColor.gray600 },

  // empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyDisc: {
    width: 76,
    height: 76,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(186, 134, 84,0.07)',
    boxShadow: flShadow.glowSubtle,
  },
  emptyTitle: { marginTop: 20, fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: -0.2, textAlign: 'center', color: flColor.cream100 },
  emptyText: { marginTop: 9, fontSize: 13.5, lineHeight: 21, textAlign: 'center', color: flColor.gray400, maxWidth: 280 },

  // sheet
  sheetBody: { gap: 0 },
  newBanner: {
    alignItems: 'center',
    gap: 7,
    padding: 16,
    marginBottom: 20,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  newBannerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: flColor.bronze400 },
  newBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  oldValue: { fontFamily: flFont.display, fontSize: 17, color: flColor.gray600, textDecorationLine: 'line-through' },
  newValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', color: flColor.bronze300 },

  sheetLabel: { marginBottom: 11, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 22,
    padding: 15,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
  },
  crownWrap: { position: 'absolute', top: -9, left: 15 + 22 - 8, zIndex: 2 },
  currentBody: { flex: 1, minWidth: 0, gap: 3 },
  currentName: { fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  currentDate: { fontSize: 11, color: flColor.gray600 },
  currentValueBlock: { flexShrink: 0, alignItems: 'flex-end' },
  currentValue: { fontFamily: flFont.display, fontSize: 24, fontWeight: '700', color: flColor.bronze300 },

  lineageCard: { overflow: 'hidden', borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  lineageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  lineageRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  lineageBody: { flex: 1, minWidth: 0 },
  lineageName: { fontSize: 14, color: flColor.gray400 },
  lineageDate: { fontSize: 11, color: flColor.gray600 },
  lineageValue: { minWidth: 56, textAlign: 'right', fontFamily: flFont.display, fontSize: 15, color: flColor.gray400 },

  lineageEmpty: { padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  lineageEmptyText: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600 },

  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
