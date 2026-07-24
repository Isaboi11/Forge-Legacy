import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { fetchActivityDetail } from '@/data/activity-live';
import {
  ordinalLine,
  programTag,
  sectionsOf,
  setLine,
  statTiles,
  summaryLine,
  whenLine,
  type ActivityDetail,
} from '@/domain/activity/detail-core';
import { useQuery } from '@/lib/useQuery';
import { useUnits } from '@/lib/settings';

/**
 * W-19 Activity Detail (`Forge Activity Detail.dc.html`) — one logged session, read-only. Reached from
 * an Activity History row; both screens read the same `workouts` table, so a tapped row always resolves.
 *
 * Polymorphic body: strength shows its Warm-up / Main / Cool-down breakdown with the real sets logged;
 * everything else shows stat tiles.
 *
 * DEFERRED vs the `.dc`, each because the data or destination doesn't exist (omitted, not faked):
 *  · Per-mile splits — nothing records split times; the design's are decorative offsets off the average.
 *  · Playlist — no such data.
 *  · Share / Export — the overflow menu's two items only raise toasts in the design; there is no share
 *    or export path here, and a button that only says "Exporting…" exports nothing.
 *  · The ordinal doesn't open the Legacy Timeline — that screen doesn't exist. Exercise rows and Program
 *    ARE tappable, because Exercise Detail (W-22) and Program Detail do.
 *  · Exercise media thumbs — the catalog has no media for any exercise, so the equipment glyph stands in.
 */

function Glyph({ d, size = 16, color, width = 1.8 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const TROPHY = 'M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 15h6M12 12v3M8 21h8';

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useQuery(() => fetchActivityDetail(id), [id]);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
      <AppBar title="" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t load this session</Text>
          <Text style={styles.errorDetail}>{error ?? 'It may have been deleted.'}</Text>
        </View>
      ) : (
        <Body
          detail={data}
          onOpenProgram={(pid) => router.push({ pathname: '/program/[id]', params: { id: pid } })}
          onOpenExercise={(key) => router.push({ pathname: '/exercise/[id]', params: { id: key } })}
        />
      )}
    </View>
  );
}

function Body({
  detail,
  onOpenProgram,
  onOpenExercise,
}: {
  detail: ActivityDetail;
  onOpenProgram: (programId: string) => void;
  onOpenExercise: (keyOrName: string) => void;
}) {
  const sections = sectionsOf(detail);
  const tiles = statTiles(detail);
  const isStrength = detail.type === 'strength';
  const { fmt } = useUnits(); // re-express logged "225 lbs × 5" in the athlete's chosen system

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <EquipIcon equip={detail.exercises[0]?.equip ?? undefined} size={24} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.programTag}>{programTag(detail)}</Text>
        </View>
      </View>

      {detail.milestones.map((m) => (
        <View key={m} style={styles.milestone}>
          <Glyph d={TROPHY} size={13} color={flColor.bronze300} width={2} />
          <Text style={styles.milestoneText}>{m}</Text>
        </View>
      ))}

      <Text style={styles.summary}>{summaryLine(detail)}</Text>
      <Text style={styles.when}>{whenLine(detail.startedAt)}</Text>
      <Text style={styles.ordinal}>{ordinalLine(detail)}</Text>

      <View style={styles.divider} />

      {/* body — strength breakdown, or stat tiles */}
      {isStrength ? (
        sections.length ? (
          <>
            <Text style={styles.sectionLabel}>Exercises</Text>
            {sections.map((sec) => (
              <View key={sec.key} style={styles.section}>
                <Text style={styles.sectionSub}>{sec.label}</Text>
                {sec.exercises.map((ex, i) => (
                  <View key={`${ex.name}-${i}`} style={styles.exCard}>
                    <Pressable
                      onPress={() => onOpenExercise(ex.catalogKey ?? ex.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`${ex.name} — exercise detail`}
                      style={styles.exHead}
                    >
                      <View style={styles.exIcon}>
                        <EquipIcon equip={ex.equip ?? undefined} size={19} />
                      </View>
                      <Text style={styles.exName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Glyph d="M9 6l6 6-6 6" size={16} color={flColor.gray600} width={2} />
                    </Pressable>
                    {ex.sets.length ? (
                      <View style={styles.setList}>
                        {ex.sets.map((s) => {
                          const line = fmt(setLine(s));
                          return (
                            <View key={s.setIndex} style={styles.setRow}>
                              <Text style={styles.setIndex}>{s.setIndex + 1}</Text>
                              <Text style={styles.setValue}>{line || '—'}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.noSets}>No sets logged</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.noSets}>No exercises were logged in this session.</Text>
        )
      ) : (
        <>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.tiles}>
            {tiles.map((t) => (
              <View key={t.label} style={styles.tile}>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileValue} numberOfLines={1}>
                  {t.value}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* attribution */}
      {detail.partners.length || detail.chapterName || detail.programId ? (
        <>
          <View style={styles.divider} />
          {detail.partners.length ? (
            <AttrRow label="Trained With" value={detail.partners.join(', ')} />
          ) : null}
          {detail.chapterName ? <AttrRow label="Chapter" value={detail.chapterName} /> : null}
          {detail.programId ? (
            <AttrRow
              label="Program"
              value={detail.programName ? `${detail.programName} — ${detail.title}` : detail.title}
              onPress={() => onOpenProgram(detail.programId as string)}
            />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function AttrRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.attrLabel}>{label}</Text>
      <Text style={styles.attrValue} numberOfLines={2}>
        {value}
      </Text>
      {onPress ? <Glyph d="M9 6l6 6-6 6" size={16} color={flColor.gray600} width={2} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.attrRow}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={styles.attrRow}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 34 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 4 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  programTag: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },

  milestone: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  milestoneText: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze300 },

  summary: { marginTop: 14, fontSize: 15, fontWeight: '500', color: flColor.gray400 },
  when: { marginTop: 4, fontSize: 13.5, color: flColor.gray600 },
  ordinal: { marginTop: 2, fontSize: 13.5, color: flColor.gray600 },

  divider: { height: 1, backgroundColor: flColor.charcoal700, marginVertical: 22 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 14,
  },
  section: { marginBottom: 18 },
  sectionSub: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 10,
  },
  exCard: {
    marginBottom: 8,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
    padding: 13,
    gap: 10,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  exIcon: {
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exName: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  setList: { gap: 5 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setIndex: { width: 16, fontSize: 11, fontWeight: '700', color: flColor.gray600, fontVariant: ['tabular-nums'] },
  setValue: { fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  noSets: { fontSize: 12.5, fontStyle: 'italic', color: flColor.gray600 },

  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    gap: 5,
    alignItems: 'center',
  },
  tileLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  tileValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },

  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  attrLabel: { width: 100, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  attrValue: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.cream100 },

  errorTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  errorDetail: { fontSize: 12, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
});
