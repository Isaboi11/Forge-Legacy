import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchTemplates } from '@/data/templates-live';
import {
  STARTER_FOCUSES,
  STARTER_LEVELS,
  defaultAudiences,
  filterStarters,
  starterMeta,
  starterSummary,
  type StarterAudience,
  type StarterFocus,
  type StarterLevel,
  type StarterVenue,
} from '@/domain/workout/starter-templates';
import { useProfile } from '@/lib/profile';
import { useQuery } from '@/lib/useQuery';

/**
 * Browse everything Forge ships (81 sessions).
 *
 * ── WHY THIS SCREEN EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * The "From Forge" shelf on W-26 was a flat list, which was right at six definitions and unusable at
 * eighty-one: it sits ABOVE the athlete's own templates, so rendering the whole library there would
 * bury the thing they came to the screen for under eighty cards of the thing they didn't. W-26 now
 * samples one per focus and links here, and the filtering that makes a library of this size navigable
 * lives on its own route.
 *
 * ── THE AUDIENCE FILTER IS A DEFAULT, NOT A GATE ─────────────────────────────────────────────────
 *
 * It opens on the athlete's own profile sex — a woman does not want to scroll past thirty-six men's
 * sessions to reach hers — and `'unspecified'` opens on EVERYTHING, because the profile model's
 * standing rule is that an unset sex is never quietly read as male. `defaultAudiences` owns that
 * decision; this screen only renders it, and "All" is one tap away in either direction.
 *
 * ── ADOPTED ONES ARE STILL SHOWN, GREYED ─────────────────────────────────────────────────────────
 *
 * W-26's shelf HIDES what you have taken, because a shelf is an offer and re-offering something you
 * own is noise. A browse screen is an index, and an index with holes in it is worse than one that says
 * "you have this". Tapping through still works — the preview's Add is idempotent (`adoptStarterTemplate`
 * returns the existing copy), so the worst case is landing on the template you already own.
 */

type AudienceChoice = StarterAudience | 'default';

export default function ForgeTemplatesScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ focus?: string; venue?: string }>();

  /* Deep-linked from a focus row on W-26 so "see the other five glute days" lands pre-filtered rather
     than on the whole library with the athlete's place in it lost. */
  const [focus, setFocus] = useState<StarterFocus | null>(
    STARTER_FOCUSES.some((f) => f.key === params.focus) ? (params.focus as StarterFocus) : null,
  );
  const [venue, setVenue] = useState<StarterVenue | null>(
    params.venue === 'gym' || params.venue === 'home' ? params.venue : null,
  );
  const [level, setLevel] = useState<StarterLevel | null>(null);
  const [audience, setAudience] = useState<AudienceChoice>('default');

  /* Only to grey the ones already taken — the list itself is local, so this screen renders in full
     before it resolves and never blocks on the network. */
  const { data: mine, loading, refetch } = useQuery(fetchTemplates, []);
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const adopted = useMemo(
    () => new Set((mine ?? []).map((t) => t.sourceDefinitionId).filter((v): v is string => !!v)),
    [mine],
  );

  const audiences = useMemo(
    () => (audience === 'default' ? defaultAudiences(profile?.sex) : [audience]),
    [audience, profile?.sex],
  );
  const results = useMemo(
    () => filterStarters({ audiences, venue, level, focus }),
    [audiences, venue, level, focus],
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/templates'));
  const clearAll = () => {
    setFocus(null);
    setVenue(null);
    setLevel(null);
    setAudience('default');
  };
  const filtered = focus !== null || venue !== null || level !== null || audience !== 'default';

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title="Built by Forge" onBack={goBack} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={styles.filterWrap}>
          <FilterRow label="Focus">
            <Chip label="All" on={focus === null} onPress={() => setFocus(null)} />
            {STARTER_FOCUSES.map((f) => (
              <Chip key={f.key} label={f.label} on={focus === f.key} onPress={() => setFocus(f.key)} />
            ))}
          </FilterRow>

          <FilterRow label="Where">
            <Chip label="Anywhere" on={venue === null} onPress={() => setVenue(null)} />
            <Chip label="Gym" on={venue === 'gym'} onPress={() => setVenue('gym')} />
            <Chip label="Home" on={venue === 'home'} onPress={() => setVenue('home')} />
          </FilterRow>

          <FilterRow label="Level">
            <Chip label="Any" on={level === null} onPress={() => setLevel(null)} />
            {STARTER_LEVELS.map((l) => (
              <Chip key={l} label={l} on={level === l} onPress={() => setLevel(l)} />
            ))}
          </FilterRow>

          <FilterRow label="Track">
            {/* "For me" rather than naming the athlete's sex back at them — and it is simply "All" for
                anyone who hasn't set one, since there is no "me" to filter to. */}
            <Chip
              label={profile?.sex !== 'male' && profile?.sex !== 'female' ? 'All' : 'For me'}
              on={audience === 'default'}
              onPress={() => setAudience('default')}
            />
            <Chip label="Men’s" on={audience === 'men'} onPress={() => setAudience('men')} />
            <Chip label="Women’s" on={audience === 'women'} onPress={() => setAudience('women')} />
          </FilterRow>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.count}>
            {results.length} {results.length === 1 ? 'session' : 'sessions'}
            {loading && !mine ? '' : adopted.size > 0 ? ` · ${results.filter((t) => adopted.has(t.id)).length} already yours` : ''}
          </Text>
          {filtered ? (
            <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel="Clear filters" hitSlop={8}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {results.length === 0 ? (
          /* Unreachable while the grid is complete — `definitions.test.mjs` asserts no empty cell — but
             a filter screen that can render nothing must say so rather than showing blank space. */
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing matches</Text>
            <Text style={styles.emptyBody}>No Forge session fits all four filters. Widen one.</Text>
            <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.outlineBtn}>
              <Text style={styles.outlineBtnLabel}>Clear Filters</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stack}>
            {results.map((t) => {
              const owned = adopted.has(t.id);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: '/starter-template/[id]', params: { id: t.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${owned ? 'Already yours: ' : 'Preview '}${t.name} — ${t.blurb}`}
                  style={({ pressed }) => [styles.card, owned ? styles.cardOwned : null, pressed ? styles.pressed : null]}
                >
                  <View style={styles.cardText}>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {t.name}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {starterSummary(t)} · {starterMeta(t)}
                    </Text>
                    <Text style={styles.cardBlurb} numberOfLines={2}>
                      {t.blurb}
                    </Text>
                  </View>
                  <View style={owned ? styles.ownedPill : styles.cta}>
                    <Text style={owned ? styles.ownedPillText : styles.ctaLabel}>{owned ? 'Yours' : 'Preview'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {loading && !mine ? <ActivityIndicator style={styles.spinner} color={flColor.bronze400} /> : null}
      </ScrollView>
    </View>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {children}
      </ScrollView>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  pressed: { opacity: 0.86 },
  scroll: { paddingBottom: 30 },

  // Sticky, so the filters stay reachable through eighty cards rather than scrolling away at the top.
  filterWrap: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, gap: 9, backgroundColor: flColor.base, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterLabel: { width: 44, flexShrink: 0, fontSize: 9.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  chips: { gap: 6, paddingRight: 12 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },

  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  count: { fontSize: 12, color: flColor.gray600 },
  clear: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },

  stack: { paddingHorizontal: 18, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  cardOwned: { opacity: 0.62 },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontFamily: flFont.display, fontSize: 16.5, fontWeight: '600', color: flColor.cream100 },
  cardMeta: { marginTop: 3, fontSize: 11.5, color: flColor.bronze400 },
  cardBlurb: { marginTop: 5, fontSize: 12, lineHeight: 17, color: flColor.gray600 },
  cta: { flexShrink: 0, paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ctaLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze300 },
  ownedPill: { flexShrink: 0, paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  ownedPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  empty: { alignItems: 'center', paddingHorizontal: 34, paddingVertical: 50 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  spinner: { marginTop: 18 },
});
