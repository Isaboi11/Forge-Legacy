/**
 * ShareCard — the Share Card Renderer's live preview (Share-Card-Renderer-Architecture).
 * Draws the "forged keepsake" card natively from a `ShareContent` + the athlete's toggle
 * state. Renderer is REAL; content is PLACEHOLDER (no share backend). Photo / transformation-
 * compare templates are deferred (no real media) — the glyph template stands in.
 *
 * Source of truth: "Forge Share Configuration.dc.html" (§ LIVE PREVIEW).
 */

import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { StyleSheet, Text, View, type TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'
import { ForgeMarkIcon } from '../../primitives/icons/HomeIcons'
import type { FieldEmphasis, ShareContent, ShareKind } from '@/domain/share/content'

export interface ShareCardProps {
  content: ShareContent
  /** Field keys toggled OFF (hidden from the card). */
  hiddenKeys: ReadonlySet<string>
  includeName: boolean
}

function KindGlyph({ kind }: { kind: ShareKind }) {
  const p = { stroke: flColor.bronze300, strokeWidth: 2, fill: 'none', strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const, strokeMiterlimit: 8 }
  const paths: Record<ShareKind, React.ReactNode> = {
    accomplishment: <Path d="M12 3l2.6 5.6 6 .5-4.6 4 1.4 6-5.4-3.2-5.4 3.2 1.4-6-4.6-4 6-.5z" {...p} />,
    honor: <><Path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" {...p} /><Path d="M9 11l2 2 4-4" {...p} /></>,
    goal: <><Circle cx={12} cy={12} r={8} {...p} /><Circle cx={12} cy={12} r={3} {...p} /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...p} /></>,
    pr: <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" {...p} strokeLinecap="square" strokeLinejoin="miter" />,
    chapter: <Path d="M4 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3-7 3z" {...p} />,
    rank: <><Path d="M12 3.5l6.5 2.8v4.7c0 4.3-2.8 7.1-6.5 8.5-3.7-1.4-6.5-4.2-6.5-8.5V6.3z" {...p} /><Path d="M9.5 12l1.8 1.8L15 10" {...p} /></>,
    program: <><Path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" {...p} /><Path d="M8 12h8M8 16h5" {...p} /></>,
    transformation: <><Path d="M4 7h3l1.5-2h7L17 7h3v12H4z" {...p} /><Circle cx={12} cy={13} r={3.4} {...p} /></>,
    workout: <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" {...p} strokeLinecap="square" strokeLinejoin="miter" />,
  }
  return (
    <View style={styles.glyph}>
      <Svg width={30} height={30} viewBox="0 0 24 24">
        {paths[kind]}
      </Svg>
    </View>
  )
}

const LINE_STYLE: Record<FieldEmphasis, TextStyle> = {
  value: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5, color: flColor.bronze300 },
  bronze: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },
  body: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  muted: { fontSize: 11, color: flColor.gray600 },
}

export function ShareCard({ content, hiddenKeys, includeName }: ShareCardProps) {
  const lines = content.fields.filter((f) => !hiddenKeys.has(f.key))
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(191,143,79,0.10)', 'rgba(191,143,79,0)'] as const}
        locations={[0, 0.42] as const}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.brand}>
        <ForgeMarkIcon />
        <Text style={styles.brandText}>Forge Legacy</Text>
      </View>

      <KindGlyph kind={content.kind} />

      <Text style={styles.eyebrow}>{content.eyebrow}</Text>
      <Text style={styles.title}>{content.title}</Text>

      {lines.map((f) => (
        <Text key={f.key} style={[styles.line, LINE_STYLE[f.emphasis]]}>
          {f.text}
        </Text>
      ))}

      {includeName ? (
        <View style={styles.footer}>
          <Text style={styles.athlete}>{content.athlete}</Text>
          {content.rankInFooter ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.footerRank}>{content.rank}</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.base,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    boxShadow: flShadow.missionCard,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  glyph: {
    width: 70,
    height: 70,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    boxShadow: flShadow.glowSubtle,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
    textAlign: 'center',
    color: flColor.cream100,
    marginTop: 6,
  },
  line: {
    textAlign: 'center',
    marginTop: 9,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  athlete: {
    fontSize: 12.5,
    fontWeight: '600',
    color: flColor.cream100,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: flColor.gray600,
  },
  footerRank: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
})
