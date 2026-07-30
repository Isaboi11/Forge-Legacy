import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  CHALLENGE_TYPES,
  fetchChallengeHub,
  formatScore,
  metricLabel,
  ordinal,
  type ChallengeType,
  type PastChallenge,
} from '@/data/challenges-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Competition History — every competition this athlete has finished, filterable.
 * Built to `Forge Competition History.dc.html`.
 *
 * NO MIGRATION. `challenge_hub()` already returns the athlete's complete, unbounded result history with
 * place, score, roster, type, metric key, context and end date, and the design's whole filter pipeline is
 * client-side over a loaded list. C-1 shows the first five of exactly this data; this screen is the rest
 * of it with the design's controls on top.
 *
 * FIVE GAPS IN THE DESIGN, FIXED:
 *
 * 1. YEAR COUNTS WERE WRONG. The design groups by year AFTER slicing to the page limit, so the count under
 *    a header ("4 competitions") is what happens to be loaded, not what the year holds — with the default
 *    limit of 12, 2024 under-reports until you press Load More. Grouping counts come from the filtered
 *    set; the slice only decides what is drawn.
 *
 * 2. THE RESULT FILTER PARSED A STRING. `resultOf` tests the standing text with `/^1st/` to decide who is
 *    a champion. Co-winners (CS-D15) share place 1, so the flag to trust is `isWinner`, which the data
 *    already carries. String-matching the ordinal would have been fine until the first tie.
 *
 * 3. `days: 28` WAS WRITTEN FOR EVERY ROW. The design hands the results screen a hardcoded 28-day season
 *    regardless of the real length, so a 7-day sprint reported as four weeks. Nothing is handed over here
 *    — the row routes by id and C-4 reads the real season.
 *
 * 4. TYPE CHIPS WERE A FIXED LIST OF FIVE. We ship fourteen metrics (CA5-D1), and the design's table has no
 *    entry for types it doesn't know — such a row would render a bare fallback stroke and be unreachable by
 *    filter. The chip row is built from the types actually present in the athlete's history, so it can
 *    never fall out of step with the data.
 *
 * 5. ONE EMPTY STATE FOR TWO SITUATIONS. The design shows "No competitions match these filters" with a
 *    Clear filters link even to an athlete who has never competed — advice that cannot help. Those are
 *    separated: nothing yet reads as an invitation, no matches offers the reset.
 *
 * A free win over the web original: it notes that filter state resets on every navigation because it hard-
 * navigates. Pushing a route here keeps this screen mounted, so coming back from a result lands on the
 * same filters and scroll position.
 *
 * Faithful: the non-scrolling header (search and filters never leave), sticky year headers pinning under
 * it, border-top row separators so the first row of each year carries the hairline, the champion's
 * bronze-metallic disc against everyone else's recessed place disc, chips resetting pagination on every
 * change, and Load More in pages of twelve.
 */

const PAGE = 12;

type Group = 'All' | 'Squads' | 'Friends' | 'Communities';
type Result = 'All' | 'Champion' | 'Podium' | 'Completed';

const ALL_GROUPS: Group[] = ['All', 'Squads', 'Friends', 'Communities'];
const RESULTS: Result[] = ['All', 'Champion', 'Podium', 'Completed'];

const CONTEXT_OF: Record<Group, string | null> = {
  All: null,
  Squads: 'SQUAD',
  Friends: 'FRIENDS',
  Communities: 'COMMUNITY',
};

/** Champion · Podium · Completed. Reads `isWinner` rather than parsing the ordinal — ties share 1st. */
function resultOf(p: PastChallenge): { key: Result; label: string; champion: boolean } {
  if (p.isWinner) return { key: 'Champion', label: 'Champion', champion: true };
  if (p.place === 2) return { key: 'Podium', label: 'Runner-up', champion: false };
  if (p.place === 3) return { key: 'Podium', label: 'Podium', champion: false };
  return { key: 'Completed', label: 'Completed', champion: false };
}

export default function CompetitionHistoryScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(fetchChallengeHub, []);

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<Group>('All');
  const [type, setType] = useState<ChallengeType | 'All'>('All');
  const [result, setResult] = useState<Result>('All');
  const [limit, setLimit] = useState(PAGE);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/competitions'));

  // Memoized: `?? []` would mint a fresh array every render and defeat both memos below.
  const all = useMemo(() => data?.history ?? [], [data]);

  /**
   * Group chips are built from the contexts actually present, for the same reason the type chips are: a
   * chip that can only ever return "No matches" is worse than no chip. Friends and Communities have no
   * backend, so a squads-only athlete sees All - Squads, matching the C-1 hub's rail. Both appear on
   * their own the moment such a challenge exists, with nothing to change here.
   */
  const groupChips = useMemo(() => {
    const present = new Set(all.map((p) => p.context));
    return ALL_GROUPS.filter((g) => {
      const ctx = CONTEXT_OF[g];
      return ctx === null || present.has(ctx as PastChallenge['context']);
    });
  }, [all]);

  // Chips reflect what the athlete actually has, so a new metric can never be unreachable by filter.
  const typesPresent = useMemo(() => {
    const seen = new Set<ChallengeType>();
    for (const p of all) seen.add(p.type);
    return [...seen].sort((a, b) => CHALLENGE_TYPES[a].label.localeCompare(CHALLENGE_TYPES[b].label));
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      const ctx = CONTEXT_OF[group];
      if (ctx && p.context !== ctx) return false;
      if (type !== 'All' && p.type !== type) return false;
      if (result !== 'All' && resultOf(p).key !== result) return false;
      if (q && !`${p.name} ${p.squadName ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, group, type, result, search]);

  const shown = filtered.slice(0, limit);

  // Counts come from `filtered`, not `shown` — the design counts the page and under-reports the year.
  const groups = useMemo(() => {
    const totals = new Map<number, number>();
    for (const p of filtered) {
      const y = new Date(p.endAt).getFullYear();
      totals.set(y, (totals.get(y) ?? 0) + 1);
    }
    const out: { year: number; total: number; rows: PastChallenge[] }[] = [];
    for (const p of shown) {
      const y = new Date(p.endAt).getFullYear();
      const last = out[out.length - 1];
      if (last && last.year === y) last.rows.push(p);
      else out.push({ year: y, total: totals.get(y) ?? 0, rows: [p] });
    }
    return out;
  }, [filtered, shown]);

  const filtersActive = search.trim() !== '' || group !== 'All' || type !== 'All' || result !== 'All';
  const clearFilters = () => {
    setSearch('');
    setGroup('All');
    setType('All');
    setResult('All');
    setLimit(PAGE);
  };
  const reset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setLimit(PAGE);
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />

      {/* Fixed header — search and filters never scroll away. */}
      <View style={styles.header}>
        <AppBar title={<Text style={styles.barTitle}>Competition History</Text>} onBack={goBack} />

        <View style={styles.searchWrap}>
          <SearchGlyph />
          <TextInput
            value={search}
            onChangeText={reset(setSearch)}
            placeholder="Search competitions"
            placeholderTextColor={flColor.gray600}
            style={styles.searchInput}
            accessibilityLabel="Search competitions"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => reset(setSearch)('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
              <ClearGlyph />
            </Pressable>
          ) : null}
        </View>

        {groupChips.length > 1 ? <ChipRow label="Group" items={groupChips} current={group} onPick={reset(setGroup)} /> : null}
        {typesPresent.length > 1 ? (
          <ChipRow
            label="Type"
            items={['All', ...typesPresent] as (ChallengeType | 'All')[]}
            current={type}
            onPick={reset(setType)}
            render={(t) => (t === 'All' ? 'All' : CHALLENGE_TYPES[t as ChallengeType].label)}
          />
        ) : null}
        <ChipRow label="Result" items={RESULTS} current={result} onPick={reset(setResult)} />
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load your history.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : all.length === 0 ? (
        /* Never competed — an invitation, not filter advice that cannot help. */
        <View style={styles.center}>
          <View style={styles.emptyCrest}>
            <SwordsGlyph size={28} />
          </View>
          <Text style={styles.emptyTitle}>No competitions yet</Text>
          <Text style={styles.emptyBody}>Every season you finish is recorded here for good.</Text>
        </View>
      ) : filtered.length === 0 ? (
        /* Has history, nothing matches — here the reset is the useful action. */
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyBody}>No competitions match these filters.</Text>
          <Pressable onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Clear Filters</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={groups.map((_, i) => i * 2)}
        >
          {groups.flatMap((g) => [
            <View key={`y${g.year}`} style={styles.yearHead}>
              <Text style={styles.yearLabel}>{g.year}</Text>
              <Text style={styles.yearCount}>
                {g.total} {g.total === 1 ? 'competition' : 'competitions'}
              </Text>
            </View>,
            <View key={`r${g.year}`}>
              {g.rows.map((p) => (
                <HistoryRow key={p.id} past={p} onPress={() => router.push({ pathname: '/challenge-results/[id]', params: { id: p.id } })} />
              ))}
            </View>,
          ])}

          {filtered.length > shown.length ? (
            <Pressable
              onPress={() => setLimit((n) => n + PAGE)}
              accessibilityRole="button"
              accessibilityLabel={`Load ${Math.min(PAGE, filtered.length - shown.length)} more`}
              style={({ pressed }) => [styles.loadMore, pressed ? styles.pressed : null]}
            >
              <Text style={styles.loadMoreLabel}>Load {Math.min(PAGE, filtered.length - shown.length)} More</Text>
            </Pressable>
          ) : null}

          {filtersActive ? (
            <Pressable onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.clearRow}>
              <Text style={styles.clearText}>Clear filters</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function ChipRow<T extends string>({
  label,
  items,
  current,
  onPick,
  render,
}: {
  label: string;
  items: T[];
  current: T;
  onPick: (v: T) => void;
  render?: (v: T) => string;
}) {
  return (
    <View style={styles.chipBlock}>
      <Text style={styles.chipLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipStrip}>
        {items.map((it) => {
          const on = it === current;
          return (
            <Pressable
              key={it}
              onPress={() => onPick(it)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}: ${render ? render(it) : it}`}
              style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{render ? render(it) : it}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HistoryRow({ past: p, onPress }: { past: PastChallenge; onPress: () => void }) {
  const r = resultOf(p);
  const meta = [metricLabel(p.type, p.metricKey), p.squadName, p.context === 'SQUAD' ? 'Squad' : p.context === 'FRIENDS' ? 'Friends' : 'Community']
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${r.label}, ${ordinal(p.place)} of ${p.roster}`}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {/* Champion takes the bronze-metallic disc; everyone else a recessed disc with their place. */}
      {r.champion ? (
        <View style={styles.markChamp}>
          <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
          <CrownGlyph size={16} color="#1A1206" />
        </View>
      ) : (
        <View style={styles.markPlace}>
          <Text style={styles.markPlaceText}>{p.place > 0 ? p.place : '–'}</Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowResult, r.champion ? styles.rowResultChamp : null]}>{r.label}</Text>
        <Text style={styles.rowStanding}>
          {ordinal(p.place)}
          {p.roster > 0 ? ` of ${p.roster}` : ''}
        </Text>
        <Text style={styles.rowDate}>{new Date(p.endAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
      </View>

      <View style={styles.rowScore}>
        <Text style={styles.rowScoreValue}>{formatScore(p.type, p.score)}</Text>
        <Text style={styles.rowScoreUnit} numberOfLines={1}>
          {CHALLENGE_TYPES[p.type].unit}
        </Text>
      </View>
    </Pressable>
  );
}

// ── glyphs ──
function CrownGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function SearchGlyph({ size = 15, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="M16 16l4 4" />
    </Svg>
  );
}
function ClearGlyph({ size = 14, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function SwordsGlyph({ size = 28, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 14.5L21 21M19 3l-9 9M5 3l9 9M9.5 14.5L3 21" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.88 },

  header: { flexShrink: 0, backgroundColor: '#070808', borderBottomWidth: 1, borderBottomColor: flColor.charcoal700, paddingBottom: 10, zIndex: 6 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 12, height: 40, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.cream100, paddingVertical: 0 },

  chipBlock: { marginTop: 8 },
  chipLabel: { marginHorizontal: 20, marginBottom: 6, fontSize: 8.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },
  chipStrip: { gap: 7, paddingHorizontal: 20 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  chipTextOn: { color: flColor.bronze300 },

  scroll: { paddingBottom: 30 },
  yearHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, backgroundColor: '#060708' },
  yearLabel: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  yearCount: { fontSize: 10.5, letterSpacing: 0.3, color: flColor.gray600 },

  /* border-TOP, so the first row of each year carries the hairline under its header. */
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.02)' },
  markChamp: { width: 34, height: 34, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: flRadius.round, boxShadow: `${flShadow.glowSubtle}` },
  markPlace: { width: 34, height: 34, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  markPlaceText: { fontFamily: flFont.display, fontSize: 14, fontWeight: '700', color: flColor.gray400 },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowMeta: { fontSize: 10.5, color: flColor.gray600 },
  rowRight: { flexShrink: 0, alignItems: 'flex-end', gap: 2 },
  rowResult: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  rowResultChamp: { color: flColor.bronze300 },
  rowStanding: { fontSize: 10.5, color: flColor.gray400 },
  rowDate: { fontSize: 9.5, color: flColor.gray600 },
  rowScore: { flexShrink: 0, alignItems: 'flex-end', maxWidth: 62 },
  rowScoreValue: { fontFamily: flFont.display, fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  rowScoreUnit: { fontSize: 8, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  loadMore: { marginTop: 16, marginHorizontal: 20, alignItems: 'center', paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800 },
  loadMoreLabel: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  clearRow: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  clearText: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  emptyCrest: { width: 72, height: 72, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 4, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
