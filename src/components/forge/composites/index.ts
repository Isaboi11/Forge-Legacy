/**
 * Forge Legacy — Tier 2 Composites (CLA-C06–C24)
 *
 * Multi-primitive assemblies. Context-agnostic and reusable across any screen.
 * Extended through props only — never forked or re-implemented at the screen level.
 *
 * Add exports here as each composite is approved and implemented.
 */

// CLA-C06/C07  Surface / Card (v2 — Claude Design visual system).
// Named (not `export *`) to avoid a `CardVariant` type collision with the
// LEGACY `../cards` barrel below — import `CardVariant` from './Surface'
// directly if needed.
export { Surface, Card } from './Surface'
export type { CardProps, CardRadius, SurfaceProps, SurfaceRadius, SurfaceVariant } from './Surface'
// CLA-C08  Buttons — LEGACY library, implemented; export from dedicated subfolder:
export * from '../buttons'
// CLA-C08  Button (v2 — Claude Design visual system, 5-variant):
export * from './Button'
// CLA-C09  Pill (v2 — Claude Design visual system):
export * from './Pill'
// CLA-C10  export { Badge }        from './Badge'
// CLA-C11  Avatar / AvatarGlyph (v2 — Claude Design visual system):
export * from './Avatar'
// CLA-C12  ProgressBar (v2 — Claude Design visual system):
export * from './ProgressBar'
// CLA-C13/C14/C15  Inputs — LEGACY library, implemented; export from dedicated subfolder:
export * from '../inputs'
// CLA-C14  InputField (v2 — Claude Design visual system):
export * from './InputField'
// CLA-C06/C07  Cards — LEGACY library, implemented; export from dedicated subfolder:
export * from '../cards'
// Navigation Library v1.0 — implemented; export from dedicated subfolder:
export * from '../navigation'
// Progress Components Library v1.0 — LEGACY library, implemented; export from dedicated subfolder:
export * from '../progress'
// CLA-C16  export { ListItem }     from './ListItem'
// CLA-C17  SectionHeader (v2 — Claude Design visual system):
export * from './SectionHeader'
// CLA-C18  AppBar (v2 — Claude Design visual system):
export * from './AppBar'
// CLA-C19  TabBar (v2 — Claude Design visual system; app-wide navigation standard):
export * from './TabBar'
// CLA-C20  export { Modal }        from './Modal'
// CLA-C21  BottomSheet (v2 — Claude Design visual system):
export * from './BottomSheet'
// CLA-C22  export { Toast }        from './Toast'
// CLA-C23  export { Skeleton }     from './Skeleton'
// CLA-C24  export { EmptyState }   from './EmptyState'
