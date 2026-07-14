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
 * ⚠ Rank medallion: the dc shows a faint rank-badge artwork top-right
 * (`assets/rank-foundation-i.png`) — that asset does NOT exist yet. Per PO, we do
 * NOT fabricate a rank badge; a graceful faint bronze seal placeholder holds the
 * space until the real rank artwork is produced (pending-asset, like the neutral art).
 */

import React from 'react'
import Svg, { Circle, Rect } from 'react-native-svg'
import { StyleSheet, Text, View } from 'react-native'
import { flColor, flFont } from '@/constants/foundation'

export interface ChapterTitleBlockProps {
  chapterNumber: string
  chapterName: string
  weekDay: string
  principle: string
}

/** Faint bronze seal — a placeholder for the pending rank-medallion artwork (not a real badge). */
function RankMedallionPlaceholder() {
  return (
    <View pointerEvents="none" style={styles.medallion} accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={160} height={172} viewBox="0 0 100 108" fill="none" opacity={0.14}>
        <Circle cx={50} cy={48} r={34} stroke={flColor.bronze400} strokeWidth={1} />
        <Circle cx={50} cy={48} r={26} stroke={flColor.bronze600} strokeWidth={1} />
        <Rect x={34} y={32} width={32} height={32} transform="rotate(45 50 48)" stroke={flColor.bronze400} strokeWidth={1} />
      </Svg>
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

export function ChapterTitleBlock({ chapterNumber, chapterName, weekDay, principle }: ChapterTitleBlockProps) {
  return (
    <View style={styles.root}>
      <RankMedallionPlaceholder />
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
