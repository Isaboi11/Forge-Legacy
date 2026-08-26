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
import { rankIdentity } from '@/domain/rank/identity';
import { buildRankSignals, fetchStoredRank } from '@/data/rank-live';
import { allMet, familyStandards, subTierStandards, type StandardRow } from '@/domain/rank/standards';
import type { PromotableFamily } from '@/domain/rank/thresholds';
import type { RankSignals } from '@/domain/rank/rank';
import { useProfile } from '@/lib/profile';
import { useQuery } from '@/lib/useQuery';

/**
 * Rank Progression — the rank-journey reference (`Rank Progression.dc.html`). All seven families, four
 * tiers each, rendered with the real forged badge art (`resolveRankBadge`), earned in sequence. The
 * athlete's current tier is marked "You are here".
 *
 * ══ IT NOW STATES THE STANDARDS ══
 *
 * This screen showed twenty-eight badges and not one requirement. An athlete could study the whole ladder
 * and learn nothing about how to climb it, which makes a rank feel handed out rather than earned — the
 * exact opposite of what the system is for. Every family now carries what it asks for and where the
 * athlete stands against each line.
 *
 * The numbers come from `familyStandards`, which computes them with the same expressions the promotion
 * gate uses and is TESTED against that gate directly. A screen that states a bar the engine does not
 * enforce is worse than a screen that states nothing: it explains a promotion that never comes.
 *
 * Reached from the Progress Hub's Rank Journey. It was orphaned — built, guarded, and linked from
 * nowhere — which is why the standards had never been missed.
 */

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;
const TIERS: RankLevel[] = [1, 2, 3, 4];

/**
 * ⚠ THE `essence` LINES WERE REMOVED HERE, NOT LOST — and they were never a locked set.
 *
 * This screen carried its own seven sentences ("The beginning of every legacy", "The habit takes hold"),
 * `progress-hub` carried a second set, and `Rank-System-Architecture.md` §2.2 locks a THIRD — the one
 * that is actually authoritative. Three answers to "what does this rank mean", and the ceremony showed
 * none of them. The locked identity statement is now the single description, from
 * `domain/rank/identity.ts`, shown here, on the Progress Hub and on the rank-up card alike.
 */
const FAMILIES: { key: RankFamily; index: string; name: string }[] = [
  { key: 'foundation', index: '01', name: 'Foundation' },
  { key: 'builder', index: '02', name: 'Builder' },
  { key: 'craftsman', index: '03', name: 'Craftsman' },
  { key: 'architect', index: '04', name: 'Architect' },
  { key: 'established', index: '05', name: 'Established' },
  { key: 'legend', index: '06', name: 'Legend' },
  { key: 'legacy', index: '07', name: 'Legacy' },
];

const ORDER: RankFamily[] = FAMILIES.map((f) => f.key);

export default function RankProgressionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { data: current } = useQuery(fetchStoredRank, []);
  /* The athlete's real signals. Null while loading or when the read fails — the standards still render,
     because what a rank asks for is true whether or not we know anything about you yet. */
  const { data: signals } = useQuery(buildRankSignals, []);

  const currentIdx = current ? ORDER.indexOf(current.family) : -1;

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacyMountains} imageOpacity={0.28} overlay={{ flat: 'rgba(8,6,5,0.62)' }} />
      <AppBar title="Rank Progression" onBack={() => router.back()} />

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
                  {/* The rank's own words — RSA §2.2, and the same sentence the rank-up card now shows.
                      Quoted because they are first-person self-descriptions, not captions about you. */}
                  <Text style={styles.rankEssence}>“{rankIdentity(f.key)}”</Text>
                  {state === 'current' ? <Text style={styles.rankHere}>You are here</Text> : null}
                </View>
                <View style={styles.tierRow}>
                  {TIERS.map((t) => (
                    <BadgeTile
                      key={t}
                      family={f.key}
                      tier={t}
                      sex={profile?.sex}
                      isCurrent={state === 'current' && current.subTier === t}
                      /*
                       * ⚠ EVERY SUB-RANK YOU HAVE EARNED, NOT JUST THE ONE YOU ARE ON. PO: *"The rank
                       * progress should show all ranks including sub ranks that I've earned."* Every
                       * tile rendered identically except the current one, so the three Foundation badges
                       * an athlete had actually earned looked exactly like the twenty-one they had not —
                       * the screen showed the ladder and never the climb.
                       *
                       * Derived, never stored: rank is monotonic (`refreshRank` never decreases it), so
                       * a past family is earned entire and the current family is earned up to its
                       * sub-tier. Nothing to persist, and nothing that can fall out of step with it.
                       */
                      isEarned={state === 'past' || (state === 'current' && t <= current.subTier)}
                    />
                  ))}
                </View>

                {/* What this rank asks for. Foundation is where everyone starts, so it asks for nothing —
                    printing an empty requirements block under it would imply otherwise. */}
                {f.key === 'foundation' ? null : (
                  <Standards family={f.key as PromotableFamily} signals={signals ?? null} earned={state === 'past'} />
                )}
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

/**
 * One family's requirements, and how far along the athlete is.
 *
 * EVERY LINE MUST BE MET AT ONCE (RSA §5.1 — the convergence rule). Exceeding one never offsets a
 * shortfall in another, and that is stated rather than left to be inferred from a wall of bars: an
 * athlete two years in with everything but a sealed chapter should know precisely what is holding them.
 */
function Standards({ family, signals, earned }: { family: PromotableFamily; signals: RankSignals | null; earned: boolean }) {
  const rows = familyStandards(family, signals);
  const subs = subTierStandards(family, signals);
  const all = signals != null && allMet(rows);

  return (
    <View style={styles.std}>
      <View style={styles.stdHead}>
        <Text style={styles.stdTitle}>{earned ? 'What it asked for' : 'What it asks for'}</Text>
        {earned ? (
          <Text style={styles.stdEarned}>Earned</Text>
        ) : all ? (
          <Text style={styles.stdEarned}>All met</Text>
        ) : null}
      </View>

      {rows.map((r) => (
        <Requirement key={r.key} row={r} />
      ))}

      {/* Sub-tiers. Weeks reset when you enter the family, so these are counted from entry, not from the
          beginning — the same derivation the engine performs. */}
      {subs.length ? (
        <View style={styles.subRow}>
          <Text style={styles.subLabel}>Then within {family === 'legacy' ? 'it' : 'the rank'}</Text>
          <Text style={styles.subText}>
            {subs.map((sb) => `${ROMAN[sb.tier]} at ${sb.weeks} wk${sb.evidence ? ` ${sb.evidence}` : ''}`).join(' · ')}
          </Text>
        </View>
      ) : null}

      <Text style={styles.stdRule}>Every line at once. Going further on one never covers a shortfall on another.</Text>
    </View>
  );
}

function Requirement({ row }: { row: StandardRow }) {
  const pct = row.have == null ? 0 : Math.max(0, Math.min(1, row.have / row.need));
  const haveStr = row.have == null ? '—' : row.have % 1 === 0 ? String(row.have) : row.have.toFixed(1);
  return (
    <View style={styles.req}>
      <View style={styles.reqTop}>
        <Text style={[styles.reqLabel, row.met && styles.reqLabelMet]} numberOfLines={1}>
          {row.met ? '✓ ' : ''}
          {row.label}
        </Text>
        <Text style={[styles.reqCount, row.met && styles.reqCountMet]}>
          {haveStr} / {row.need}
          {row.unit ? ` ${row.unit}` : ''}
        </Text>
      </View>
      <View style={styles.reqTrack}>
        <View style={[styles.reqFill, { width: `${Math.round(pct * 100)}%` }, row.met && styles.reqFillMet]} />
      </View>
      {row.detail ? <Text style={styles.reqDetail}>{row.detail}</Text> : null}
    </View>
  );
}

function BadgeTile({
  family,
  tier,
  sex,
  isCurrent,
  isEarned,
}: {
  family: RankFamily;
  tier: RankLevel;
  sex?: 'male' | 'female' | 'unspecified';
  isCurrent: boolean;
  isEarned: boolean;
}) {
  const art = resolveRankBadge({ family, level: tier, sex });
  return (
    <View style={styles.tile}>
      {/*
        THREE STATES, AND THE MIDDLE ONE IS THE NEW ONE: not yet earned (dimmed), earned (full strength),
        and the one you are standing on (earned, plus the bronze ring).

        ⚠ DIMMED, NOT HIDDEN OR SILHOUETTED. The unearned badges are the point of the screen — they are
        what you are climbing toward — so they stay legible; they simply stop competing with what you
        have actually done. Opacity rather than a greyscale filter because the art is bronze on
        transparent and a desaturated version reads as a broken image rather than a locked one.
      */}
      <View style={[styles.tileArt, isCurrent && styles.tileArtCurrent, !isEarned && styles.tileArtLocked]}>
        {art != null ? <Image source={art} style={styles.badgeImg} resizeMode="contain" /> : <RankSeal family={family} level={tier} size={52} />}
      </View>
      <Text style={[styles.tierLabel, isEarned && styles.tierLabelEarned, isCurrent && styles.tierLabelCurrent]}>{ROMAN[tier]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  std: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#1B1510', paddingTop: 16, gap: 13 },
  stdHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stdTitle: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#7A5E38' },
  stdEarned: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.greenMuted },

  req: { gap: 5 },
  reqTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  reqLabel: { flex: 1, fontFamily: flFont.sans, fontSize: 13, color: '#B4AA9C' },
  reqLabelMet: { color: flColor.cream100 },
  reqCount: { fontFamily: flFont.sans, fontSize: 12, color: '#8A7F70', fontVariant: ['tabular-nums'] },
  reqCountMet: { color: flColor.bronze300 },
  reqTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  reqFill: { height: 3, backgroundColor: flColor.bronze400 },
  reqFillMet: { backgroundColor: flColor.greenMuted },
  reqDetail: { fontFamily: flFont.sans, fontSize: 11, lineHeight: 16, color: '#6A6154' },

  subRow: { gap: 3, marginTop: 2 },
  subLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#7A5E38' },
  subText: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 18, color: '#9A9084' },

  stdRule: { fontFamily: flFont.sans, fontSize: 11, lineHeight: 16, color: '#5F5648', fontStyle: 'italic' },

  root: { flex: 1, backgroundColor: '#0A0807' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  eyebrow: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', letterSpacing: 4, textTransform: 'uppercase', color: '#8A6B41', textAlign: 'center', marginTop: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 },
  ruleLine: { width: 70, height: 1, backgroundColor: 'rgba(186, 134, 84,0.5)' },
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
  tileArtCurrent: { borderWidth: 1.5, borderColor: flColor.bronze400, backgroundColor: 'rgba(186, 134, 84,0.08)', boxShadow: '0 0 18px rgba(186, 134, 84,0.35)' },
  badgeImg: { width: '92%', height: '92%' },
  /* An unearned badge is still the thing you are climbing toward, so it stays readable — it just stops
     competing with the ones you have. See `BadgeTile`. */
  tileArtLocked: { opacity: 0.3 },
  tierLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#6C5A41' },
  /* Earned reads in cream — plain "you have this". Bronze stays reserved for the one you are on, so the
     current tier is still findable at a glance inside a row of four you have already cleared. */
  tierLabelEarned: { color: flColor.cream100 },
  tierLabelCurrent: { color: flColor.bronze300 },

  note: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 19, color: '#5F5648', textAlign: 'center', marginTop: 40 },
});
