/**
 * ForgePagination
 * Spec: Forge Navigation Library.dc.html §08
 *
 * Position indicators for carousels, galleries and paged content.
 * Active marker takes bronze; the rest recede.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgePaginationProps } from './types'

export function ForgePagination({
  variant = 'dots',
  total,
  current,
  onPress,
}: ForgePaginationProps) {
  if (variant === 'bars') {
    return <BarsPagination total={total} current={current} onPress={onPress} />
  }
  if (variant === 'numbers') {
    return <NumbersPagination total={total} current={current} onPress={onPress} />
  }
  if (variant === 'fraction') {
    return <FractionPagination total={total} current={current} onPress={onPress} />
  }
  // dots (default)
  return <DotsPagination total={total} current={current} onPress={onPress} />
}

// ── Dots ───────────────────────────────────────────────────────────────────

function DotsPagination({ total, current, onPress }: ForgePaginationProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => onPress?.(i)}
          accessibilityLabel={`Page ${i + 1} of ${total}`}
          accessibilityRole="button"
          accessibilityState={{ selected: i === current }}
          hitSlop={8}
        >
          <View style={[
            styles.dot,
            i === current ? styles.dotActive : styles.dotInactive,
          ]} />
        </Pressable>
      ))}
    </View>
  )
}

// ── Bars ───────────────────────────────────────────────────────────────────

function BarsPagination({ total, current, onPress }: ForgePaginationProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => onPress?.(i)}
          accessibilityLabel={`Page ${i + 1} of ${total}`}
          accessibilityRole="button"
          accessibilityState={{ selected: i === current }}
          hitSlop={8}
        >
          <View style={[
            styles.bar,
            i === current ? styles.barActive : styles.barInactive,
          ]} />
        </Pressable>
      ))}
    </View>
  )
}

// ── Numbers ────────────────────────────────────────────────────────────────

function NumbersPagination({ total, current, onPress }: ForgePaginationProps) {
  const visiblePages = _getVisiblePages(current, total)

  return (
    <View style={styles.row}>
      {/* Prev */}
      <Pressable
        onPress={() => current > 0 && onPress?.(current - 1)}
        disabled={current === 0}
        accessibilityLabel="Previous page"
        accessibilityRole="button"
        accessibilityState={{ disabled: current === 0 }}
        style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed, current === 0 && styles.numBtnDisabled]}
      >
        <Feather name="chevron-left" size={18} color={color.text.secondary} />
      </Pressable>

      {visiblePages.map((page, i) =>
        page === -1 ? (
          <View key={`ellipsis-${i}`} style={styles.ellipsis}>
            <Text style={styles.ellipsisText}>…</Text>
          </View>
        ) : (
          <Pressable
            key={page}
            onPress={() => onPress?.(page)}
            accessibilityLabel={`Page ${page + 1}`}
            accessibilityRole="button"
            accessibilityState={{ selected: page === current }}
            style={({ pressed }) => [
              styles.numBtn,
              page === current && styles.numBtnActive,
              page !== current && pressed && styles.numBtnPressed,
            ]}
          >
            <Text style={[
              styles.numText,
              page === current ? styles.numTextActive : styles.numTextInactive,
            ]}>
              {page + 1}
            </Text>
          </Pressable>
        )
      )}

      {/* Next */}
      <Pressable
        onPress={() => current < total - 1 && onPress?.(current + 1)}
        disabled={current === total - 1}
        accessibilityLabel="Next page"
        accessibilityRole="button"
        accessibilityState={{ disabled: current === total - 1 }}
        style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed, current === total - 1 && styles.numBtnDisabled]}
      >
        <Feather name="chevron-right" size={18} color={color.text.secondary} />
      </Pressable>
    </View>
  )
}

/** Returns page indices to show, with -1 for ellipsis. */
function _getVisiblePages(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = [0]
  if (current > 2) pages.push(-1) // leading ellipsis
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i)
  if (current < total - 3) pages.push(-1) // trailing ellipsis
  pages.push(total - 1)
  return pages
}

// ── Fraction ───────────────────────────────────────────────────────────────

function FractionPagination({ total, current, onPress }: ForgePaginationProps) {
  return (
    <View style={[styles.row, { gap: 12 }]}>
      {/* Prev */}
      <Pressable
        onPress={() => current > 0 && onPress?.(current - 1)}
        disabled={current === 0}
        accessibilityLabel="Previous page"
        accessibilityRole="button"
        accessibilityState={{ disabled: current === 0 }}
        style={[styles.fractionBtn, current === 0 && styles.numBtnDisabled]}
      >
        <Feather name="chevron-left" size={18} color={color.text.secondary} />
      </Pressable>

      <View style={styles.fractionText}>
        <Text style={styles.fractionCurrent}>{current + 1}</Text>
        <Text style={styles.fractionSep}>/</Text>
        <Text style={styles.fractionTotal}>{total}</Text>
      </View>

      {/* Next */}
      <Pressable
        onPress={() => current < total - 1 && onPress?.(current + 1)}
        disabled={current === total - 1}
        accessibilityLabel="Next page"
        accessibilityRole="button"
        accessibilityState={{ disabled: current === total - 1 }}
        style={[
          styles.fractionBtn,
          styles.fractionBtnActive,
          current === total - 1 && styles.numBtnDisabled,
        ]}
      >
        <Feather name="chevron-right" size={18} color={color.accent.primary} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm + 1,
  },
  // Dots
  dot: {
    width: NAV.PAG_DOT,
    height: NAV.PAG_DOT,
    borderRadius: NAV.RADIUS_PILL,
  },
  dotActive: { backgroundColor: color.accent.primary },
  dotInactive: { backgroundColor: '#2C2C36' },
  // Bars
  bar: {
    width: NAV.PAG_BAR_W,
    height: NAV.PAG_BAR_H,
    borderRadius: NAV.RADIUS_PILL,
  },
  barActive: { backgroundColor: color.accent.primary },
  barInactive: { backgroundColor: '#2C2C36' },
  // Numbers
  numBtn: {
    width: NAV.PAG_NUM_SIZE,
    height: NAV.PAG_NUM_SIZE,
    borderRadius: NAV.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtnActive: {
    backgroundColor: color.accent.glow,
  },
  numBtnPressed: {
    backgroundColor: color.innerHighlight,
  },
  numBtnDisabled: {
    opacity: 0.35,
  },
  numText: {
    fontSize: 14,
  },
  numTextActive: { fontWeight: '600', color: color.accent.primary },
  numTextInactive: { color: color.text.secondary },
  ellipsis: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsisText: {
    fontSize: 14,
    color: color.text.tertiary,
  },
  // Fraction
  fractionBtn: {
    width: NAV.PAG_NUM_SIZE,
    height: NAV.PAG_NUM_SIZE,
    borderRadius: NAV.RADIUS,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fractionBtnActive: {
    borderColor: color.accent.muted,
    backgroundColor: color.accent.glow,
  },
  fractionText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fractionCurrent: {
    fontSize: 18,
    fontWeight: '600',
    color: color.accent.primary,
    fontVariant: ['tabular-nums'],
  },
  fractionSep: {
    fontSize: 18,
    color: color.text.tertiary,
    paddingHorizontal: 2,
  },
  fractionTotal: {
    fontSize: 18,
    color: color.text.secondary,
    fontVariant: ['tabular-nums'],
  },
})
