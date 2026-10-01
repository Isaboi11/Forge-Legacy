/**
 * FitText — a `<Text>` that never breaks through the middle of a word.
 *
 * ══ WHY ══
 *
 * "Confide / nce", "Competitio / ns" on Home (home-06, firstuser-08, QA 09-26): a heading in a fixed size,
 * in a column narrower than its longest word. Every text engine cuts the word at that point rather than
 * draw outside the box — react-native-web's `overflow-wrap: break-word`, iOS's own line breaker — so there
 * is no style to delete; the type has to be the thing that gives.
 *
 * ══ ONE RULE ══
 *
 * The size comes from `fitWordSize` (`domain/text/fit-word.ts`), the same rule that sizes Holt's stat grid
 * (holtai-17) and the workout hero (social2-20). Those two know their box and guess the font's width per
 * character; this component can't know its box and must not guess its font — Home's titles are Playfair
 * at 30–34pt, some tracked, some uppercase — so it MEASURES both and hands the rule a measured `em`:
 *   · the width this text was actually laid out in (its own `onLayout`), and
 *   · the width of its longest word at the DESIGNED size, from an invisible one-word ruler.
 * If the word fits — nearly always — nothing changes at all.
 *
 * ══ USING IT ══
 *
 * A drop-in for `<Text>` whose child is a plain string: same `style`, same `numberOfLines`.
 *
 *     <FitText style={styles.title} numberOfLines={2}>{title}</FitText>
 *
 * ⚠ THE FIRST FRAME IS THE DESIGNED SIZE. The shrink lands one layout pass later, so use it for headings
 * and big values, not for a list of two hundred rows.
 *
 * ⚠ ONCE SHRUNK, ITS OWN WIDTH ONLY COUNTS IF IT GREW. In a row, a text's width is its content's width;
 * after a shrink that is narrower than the room it has, and reading it as "the room" would shrink it again,
 * and again, down to the floor. At the designed size its width IS the room (an over-long word fills it).
 *
 * ⚠ THE RULER IS A SIBLING, absolutely positioned inside a zero-size clip, so it takes no space, adds no
 * `gap`, and cannot widen a scroll view. It copies only the FONT properties of `style` — never `flex`,
 * margins or width, which would measure the layout instead of the word.
 */

import React, { useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent, type TextProps, type TextStyle } from 'react-native'

import { fitWordSize, longestWord, measuredEm } from '@/domain/text/fit-word'

export interface FitTextProps extends Omit<TextProps, 'children'> {
  children: string
  /** The smallest the type may get, as a fraction of its designed size. */
  minScale?: number
}

/** React Native's own default, for a style that sets no size. */
const DEFAULT_FONT_SIZE = 14

/** Layout widths are rounded and glyph advances are not: sub-pixel jitter is not a new width. */
const moved = (prev: number, next: number) => Math.abs(prev - next) > 1

export function FitText({ children, style, minScale = 0.7, onLayout, ...rest }: FitTextProps) {
  const [available, setAvailable] = useState(0)
  const [ruled, setRuled] = useState<{ word: string; width: number } | null>(null)

  const word = longestWord(children)
  const flat: TextStyle = StyleSheet.flatten(style) ?? {}
  const base = typeof flat.fontSize === 'number' ? flat.fontSize : DEFAULT_FONT_SIZE
  // A measurement of some OTHER word is not a measurement of this one.
  const wordWidth = ruled != null && ruled.word === word ? ruled.width : 0
  const em = measuredEm(word, wordWidth, base)
  // A pixel of slack: a word sized to exactly the column can still measure a fraction over it and break.
  const size =
    em > 0 && available > 0 && wordWidth > available ? fitWordSize(children, available - 1, base, base * minScale, em) : base
  const scale = size / base

  const fitted: TextStyle | null =
    scale < 1
      ? {
          fontSize: size,
          ...(typeof flat.lineHeight === 'number' ? { lineHeight: flat.lineHeight * scale } : null),
          ...(typeof flat.letterSpacing === 'number' ? { letterSpacing: flat.letterSpacing * scale } : null),
        }
      : null

  const onTextLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    // 0 is a hidden tab, not a column: keeping the last real width stops the title re-growing behind it.
    if (w > 0 && moved(available, w) && (fitted == null || w > available)) setAvailable(w)
    onLayout?.(e)
  }
  const onRulerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w > 0 && (ruled == null || ruled.word !== word || moved(ruled.width, w))) setRuled({ word, width: w })
  }

  return (
    <>
      <Text {...rest} style={fitted ? [style, fitted] : style} onLayout={onTextLayout}>
        {children}
      </Text>
      {word ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={styles.clip}
        >
          <View style={styles.ruler}>
            <Text
              key={word}
              numberOfLines={1}
              onLayout={onRulerLayout}
              style={{
                fontFamily: flat.fontFamily,
                fontSize: flat.fontSize,
                fontWeight: flat.fontWeight,
                fontStyle: flat.fontStyle,
                fontVariant: flat.fontVariant,
                letterSpacing: flat.letterSpacing,
                textTransform: flat.textTransform,
              }}
            >
              {word}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 },
  // Wide enough that no word is ever constrained by it; a row, so the word keeps its own width.
  ruler: { width: 4000, flexDirection: 'row', alignItems: 'flex-start' },
})
