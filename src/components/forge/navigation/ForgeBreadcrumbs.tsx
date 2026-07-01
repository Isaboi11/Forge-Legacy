/**
 * ForgeBreadcrumbs
 * Spec: Forge Navigation Library.dc.html §09
 *
 * Lightweight trail for deep hierarchies.
 * Ancestors are tappable gray; the current node is white and never a link.
 */

import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgeBreadcrumbsProps } from './types'

export function ForgeBreadcrumbs({ items }: ForgeBreadcrumbsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityRole="toolbar"
      accessibilityLabel="Breadcrumbs"
    >
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1
        const isCurrent = isLast

        return (
          <React.Fragment key={crumb.key}>
            {isCurrent || !crumb.onPress ? (
              <Text
                style={[styles.label, styles.labelCurrent]}
                accessibilityRole="text"
                accessibilityState={{ selected: true }}
                numberOfLines={1}
              >
                {crumb.label}
              </Text>
            ) : (
              <Pressable
                onPress={crumb.onPress}
                accessibilityLabel={crumb.label}
                accessibilityRole="link"
                style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
              >
                <Text style={styles.labelAncestor} numberOfLines={1}>
                  {crumb.label}
                </Text>
              </Pressable>
            )}

            {!isLast && (
              <Feather
                name="chevron-right"
                size={NAV.SEP_ICON}
                color={color.text.tertiary}
              />
            )}
          </React.Fragment>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 0,
  },
  link: {
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  linkPressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 13,
  },
  labelCurrent: {
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: 0.1,
  },
  labelAncestor: {
    fontSize: 13,
    color: color.text.secondary,
  },
})
