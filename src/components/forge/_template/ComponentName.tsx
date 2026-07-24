/**
 * CLA-CXX — ComponentName
 * Tier: 1 (Primitive) | 2 (Composite) | 3 (Composition)
 * Status: APPROVED
 * Spec: Component-Library-Architecture-v1.0.md §4 — CLA-CXX
 *
 * RULES (CLA-P6): Screen code passes props only. No behavior overrides.
 * All styling flows through tokens from @/constants/tokens (CLA-D11).
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { color, space, radius, typography } from '@/constants/tokens'
import type { ComponentNameProps } from './ComponentName.types'

export function ComponentName({ ...props }: ComponentNameProps) {
  // implementation
  return null
}

const styles = StyleSheet.create({
  // token-only values — no raw hex or magic numbers
})
