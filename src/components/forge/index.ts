/**
 * Forge Legacy Component Library — single import point
 *
 * STATUS: LEGACY / REFERENCE. The visual design system is being rebuilt in
 * Claude Design first; this code is the pre-redesign implementation and is
 * not the current visual source of truth. Do not delete — see README.md for
 * the replacement plan (logic/types/a11y/exports/interaction patterns carry
 * forward; only visuals are being redone, one library at a time).
 *
 * All screens and compositions import from here ONLY.
 * Never import directly from a component's own file path.
 *
 * Usage:
 *   import { Button, Card, SectionHeader } from '@/components/forge'
 *
 * Governance: Component-Library-Architecture-v1.0.md (LOCKED)
 * Token source: src/constants/tokens.ts (CLA-D11)
 */

export * from './primitives'
export * from './composites'
export * from './compositions'
export * from './modals'
