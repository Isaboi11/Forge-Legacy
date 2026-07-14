/**
 * Forge Legacy — Tier 1 Primitives (CLA-C01–C05)
 *
 * Atomic, token-consuming, no business logic.
 * Never instantiated directly in screen code — accessed through Tier 2 composites.
 *
 * Add exports here as each primitive is approved and implemented.
 */

// CLA-C01  export { Text }         from './Text'
// CLA-C02  Icon — Home v2 subset implemented; export from dedicated subfolder:
export * from './icons/HomeIcons'
// CLA-C02  Icon — app-shell nav subset (Home/Workout/Squads/Legacy tab glyphs, plus retained Explore):
export * from './icons/NavIcons'
// CLA-C03  export { Divider }      from './Divider'
// CLA-C04  export { ProgressFill } from './ProgressFill'
// CLA-C05  AvatarGlyph — implemented; see composites/Avatar (CLA-C11 pairs with it)
