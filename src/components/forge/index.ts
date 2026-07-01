/**
 * Forge Legacy Component Library — single import point
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
