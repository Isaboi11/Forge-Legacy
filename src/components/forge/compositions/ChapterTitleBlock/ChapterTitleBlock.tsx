/**
 * ChapterTitleBlock — the Home "chapter as a title" block.
 * Source of truth: Forge Home.dc.html (§ Title Block, lines 71–97).
 *
 * Renders the chapter number, the big serif chapter name, a diamond divider, the
 * week/day line, and the rotating Forge Principle (italic, left bronze rule).
 * Replaces the Phase-2 compact chapter heading AND the standalone HomepagePrinciple
 * on Home (the dc integrates the principle here).
 *
 * Data: chapter number/name + week/day = HOME_DATA placeholder (no Chapter/Legacy
 * backend yet); the principle is REAL (`todaysPrinciple`).
 *
 * Rank medallion (top-right watermark): the vector `RankSeal` at low opacity, gated by
 * `showRankMedallion` (default true). Home currently passes `false` — the medallion is a placeholder
 * pending user-supplied cycling artwork (see FORGE_DELTAS); when false the whole medallion, including
 * the fallback ring, is omitted so no empty box is left behind. (Legacy's hero seal is a separate
 * component — `legacy.tsx` ProgressBadge — and is unaffected.)
 */

import React from 'react'
import Svg, { Circle, Rect } from 'react-native-svg'
import { StyleSheet, Text, View } from 'react-native'
import { flColor, flFont } from '@/constants/foundation'
import { RankSeal } from '@/components/forge/RankSeal'

export interface ChapterTitleBlockProps {
  chapterNumber: string
  chapterName: string
  weekDay: string
  principle: string
  /** Rank tier for the medallion (the vector RankSeal); omit → placeholder seal. */
  rankFamily?: string
  rankLevel?: 1 | 2 | 3 | 4
  /**
   * Show the top-right rank medallion (default true). When false the whole medallion — including the
   * fallback ring — is omitted, leaving no empty box. Home passes false: the medallion is a placeholder
   * pending user-supplied cycling artwork (FORGE_DELTAS).
   */
  showRankMedallion?: boolean
}

/** Top-right rank medallion — the vector RankSeal (transparent by construction), or a faint placeholder. */
function RankMedallion({ family, level }: { family?: string; level?: 1 | 2 | 3 | 4 }) {
  return (
    <View pointerEvents="none" style={styles.medallion} accessibilityElementsHidden importantForAccessibility="no">
      {family ? (
        <View style={styles.medallionArt}>
          <RankSeal family={family} level={level ?? 1} size={150} />
        </View>
      ) : (
        <Svg width={160} height={172} viewBox="0 0 100 108" fill="none" opacity={0.14}>
          <Circle cx={50} cy={48} r={34} stroke={flColor.bronze400} strokeWidth={1} />
          <Circle cx={50} cy={48} r={26} stroke={flColor.bronze600} strokeWidth={1} />
          <Rect x={34} y={32} width={32} height={32} transform="rotate(45 50 48)" stroke={flColor.bronze400} strokeWidth={1} />
        </Svg>
      )}
    </View>
  )
}

function DiamondDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <View style={styles.dividerDiamond} />
      <View style={[styles.dividerLine, styles.dividerLineRight]} />
    </View>
  )
}

export function ChapterTitleBlock({ chapterNumber, chapterName, weekDay, principle, rankFamily, rankLevel, showRankMedallion = true }: ChapterTitleBlockProps) {
  return (
    <View style={styles.root}>
      {showRankMedallion ? <RankMedallion family={rankFamily} level={rankLevel} /> : null}
      <View style={styles.content}>
        <Text style={styles.chapterNumber}>{chapterNumber}</Text>
        <Text style={styles.chapterName}>{chapterName}</Text>
        <DiamondDivider />
        <Text style={styles.weekDay}>{weekDay}</Text>
        <View style={styles.principleRow}>
          <View style={styles.principleRule} />
          <Text style={styles.principleText}>{principle}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 8,
  },
  medallion: {
    position: 'absolute',
    top: 6,
    right: 4,
  },
  // Vector seal as a faint top-right watermark (dc intent) — sits behind the title, not competing.
  medallionArt: {
    width: 150,
    height: 150,
    opacity: 0.42,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    gap: 10,
  },
  chapterNumber: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  chapterName: {
    fontFamily: flFont.display,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 34,
    textTransform: 'uppercase',
    color: flColor.cream100,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    maxWidth: 300,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: flColor.bronzeBorder,
  },
  dividerLineRight: {
    opacity: 0.4,
  },
  dividerDiamond: {
    width: 7,
    height: 7,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: flColor.bronze400,
  },
  weekDay: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  principleRow: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 2,
  },
  principleRule: {
    width: 2,
    borderRadius: 1,
    backgroundColor: flColor.bronze400,
  },
  principleText: {
    flex: 1,
    fontFamily: flFont.displayMedium,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    color: flColor.bronze300,
    maxWidth: 240,
  },
})
