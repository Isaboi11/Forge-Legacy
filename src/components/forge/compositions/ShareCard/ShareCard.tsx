/**
 * ShareCard — the Share Card Renderer's live preview (Share-Card-Renderer-Architecture).
 * Draws the "forged keepsake" card natively from a `ShareContent` + the athlete's toggle
 * state. Renderer is REAL; content is PLACEHOLDER (no share backend). Photo / transformation-
 * compare templates are deferred (no real media) — the glyph template stands in.
 *
 * Source of truth: "Forge Share Configuration.dc.html" (§ LIVE PREVIEW).
 */

import React from 'react'
import { StyleSheet, Text, View, type TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'
import { ForgeMarkIcon } from '../../primitives/icons/HomeIcons'
import { EngravedIcon, type EngravedName } from '../../primitives/icons/EngravedIcon'
import type { FieldEmphasis, ShareContent, ShareKind } from '@/domain/share/content'

export interface ShareCardProps {
  content: ShareContent
  /** Field keys toggled OFF (hidden from the card). */
  hiddenKeys: ReadonlySet<string>
  includeName: boolean
}

const KIND_ICON: Record<ShareKind, EngravedName> = {
  accomplishment: 'star',
  honor: 'shield-check',
  goal: 'target',
  pr: 'pr',
  chapter: 'bookmark',
  rank: 'rank-up',
  program: 'document',
  transformation: 'transformation',
  workout: 'dumbbell',
}

function KindGlyph({ kind }: { kind: ShareKind }) {
  return (
    <View style={styles.glyph}>
      <EngravedIcon name={KIND_ICON[kind]} size={30} />
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
        colors={['rgba(186, 134, 84,0.10)', 'rgba(186, 134, 84,0)'] as const}
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

      {/* An unknown name drops the whole footer rather than signing the card "Athlete", and an unknown
          rank drops just the rank half — a keepsake should carry no line that isn't true of its owner. */}
      {includeName && content.athlete ? (
        <View style={styles.footer}>
          <Text style={styles.athlete}>{content.athlete}</Text>
          {content.rankInFooter && content.rank ? (
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
