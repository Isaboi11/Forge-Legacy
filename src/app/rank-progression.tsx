import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { RankSeal } from '@/components/forge/RankSeal';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { resolveRankBadge } from '@/domain/rank-artwork/badge-art';
import type { RankFamily, RankLevel } from '@/domain/rank-artwork/resolver';
import { fetchStoredRank } from '@/data/rank-live';
import { useProfile } from '@/lib/profile';
import { useQuery } from '@/lib/useQuery';

/**
 * Rank Progression — the rank-journey reference (`Rank Progression.dc.html`). All seven families, four
 * tiers each, rendered with the real forged badge art (`resolveRankBadge`), earned in sequence. The
 * athlete's current tier is marked "You are here". Reached from the Legacy hero badge.
 */

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;
const TIERS: RankLevel[] = [1, 2, 3, 4];

const FAMILIES: { key: RankFamily; index: string; name: string; essence: string }[] = [
  { key: 'foundation', index: '01', name: 'Foundation', essence: 'The beginning of every legacy.' },
  { key: 'builder', index: '02', name: 'Builder', essence: 'The habit takes hold.' },
  { key: 'craftsman', index: '03', name: 'Craftsman', essence: 'Skill sharpened by repetition.' },
  { key: 'architect', index: '04', name: 'Architect', essence: 'You design the work now.' },
  { key: 'established', index: '05', name: 'Established', essence: 'What you built outlives you.' },
  { key: 'legend', index: '06', name: 'Legend', essence: 'Among the few who endured.' },
  { key: 'legacy', index: '07', name: 'Legacy', essence: 'Timeless, complete, beyond the self.' },
];

const ORDER: RankFamily[] = FAMILIES.map((f) => f.key);

export default function RankProgressionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { data: current } = useQuery(fetchStoredRank, []);

  const currentIdx = current ? ORDER.indexOf(current.family) : -1;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.28} overlay={{ flat: 'rgba(8,6,5,0.62)' }} />
      <AppBar title="Rank Progression" serif onBack={() => router.back()} />

      {!current ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 48 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* masthead */}
          <Text style={styles.eyebrow}>The Forge Path</Text>
          <View style={styles.rule}>
            <View style={styles.ruleLine} />
            <View style={styles.ruleDiamond} />
            <View style={styles.ruleLine} />
          </View>
          <Text style={styles.mastSub}>Seven ranks · four tiers each · earned in sequence</Text>

          {FAMILIES.map((f, i) => {
            const state = i < currentIdx ? 'past' : i === currentIdx ? 'current' : 'future';
            return (
              <View key={f.key} style={[styles.rankRow, i > 0 && styles.rankRowBorder]}>
                <View style={styles.rankHead}>
                  <Text style={styles.rankIndex}>{f.index}</Text>
                  <Text style={styles.rankName}>{f.name}</Text>
                  <View style={styles.rankUnderline} />
                  <Text style={styles.rankEssence}>{f.essence}</Text>
                  {state === 'current' ? <Text style={styles.rankHere}>You are here</Text> : null}
                </View>
                <View style={styles.tierRow}>
                  {TIERS.map((t) => (
                    <BadgeTile key={t} family={f.key} tier={t} sex={profile?.sex} isCurrent={state === 'current' && current.subTier === t} />
                  ))}
                </View>
              </View>
            );
          })}

          <Text style={styles.note}>
            Qualify for a tier and its badge is awarded — then it follows you across the app: profile, home, squads, and the rank ceremony.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function BadgeTile({ family, tier, sex, isCurrent }: { family: RankFamily; tier: RankLevel; sex?: 'male' | 'female' | 'unspecified'; isCurrent: boolean }) {
  const art = resolveRankBadge({ family, level: tier, sex });
  return (
    <View style={styles.tile}>
      <View style={[styles.tileArt, isCurrent && styles.tileArtCurrent]}>
        {art != null ? <Image source={art} style={styles.badgeImg} resizeMode="contain" /> : <RankSeal family={family} level={tier} size={52} />}
      </View>
      <Text style={[styles.tierLabel, isCurrent && styles.tierLabelCurrent]}>{ROMAN[tier]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0807' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  eyebrow: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', letterSpacing: 4, textTransform: 'uppercase', color: '#8A6B41', textAlign: 'center', marginTop: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 },
  ruleLine: { width: 70, height: 1, backgroundColor: 'rgba(191,143,79,0.5)' },
  ruleDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  mastSub: { fontFamily: flFont.sans, fontSize: 11.5, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: '#B08A55', textAlign: 'center', marginTop: 14 },

  rankRow: { marginTop: 26, paddingTop: 24 },
  rankRowBorder: { borderTopWidth: 1, borderTopColor: '#201811' },
  rankHead: { marginBottom: 16 },
  rankIndex: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 2.6, color: '#7A5E38' },
  rankName: { fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: 0.5, color: flColor.bronze300, marginTop: 8 },
  rankUnderline: { width: 44, height: 2, backgroundColor: flColor.bronze400, marginTop: 10, marginBottom: 10, opacity: 0.7 },
  rankEssence: { fontFamily: flFont.sans, fontSize: 12.5, color: '#9A9084', lineHeight: 18 },
  rankHere: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300, marginTop: 10 },

  tierRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, alignItems: 'center', gap: 7 },
  tileArt: { width: '100%', aspectRatio: 0.82, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center' },
  tileArtCurrent: { borderWidth: 1.5, borderColor: flColor.bronze400, backgroundColor: 'rgba(191,143,79,0.08)', boxShadow: '0 0 18px rgba(191,143,79,0.35)' },
  badgeImg: { width: '92%', height: '92%' },
  tierLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#6C5A41' },
  tierLabelCurrent: { color: flColor.bronze300 },

  note: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 19, color: '#5F5648', textAlign: 'center', marginTop: 40 },
});
