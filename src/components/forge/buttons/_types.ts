/**
 * Shared TypeScript interfaces for the Forge Legacy button library.
 * All button components accept ButtonBaseProps; variants add their own constraints.
 */

export type ButtonIconName =
  | 'plus'
  | 'arrowRight'
  | 'arrowLeft'
  | 'check'
  | 'x'
  | 'trash'
  | 'settings'
  | 'play'
  | 'share'
  | 'download'
  | 'heart'

/** Loose shadow object for dynamic per-state shadow assignment */
export interface ShadowStyle {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

export interface ButtonBaseProps {
  /** Button label text. Required for text buttons; omitted for icon-only. */
  title?: string
  /** Primary action handler */
  onPress?: () => void
  /** Whether the button is non-interactive */
  disabled?: boolean
  /** Shows a loading spinner; hides label/icons; preserves button width */
  loading?: boolean
  /** Persistent selected / toggled state */
  selected?: boolean
  /** Transient success confirmation state (green fill + check icon) */
  success?: boolean
  /** Transient error state (red glow + shake animation) */
  error?: boolean
  /** Named icon rendered to the left of the label */
  iconLeft?: ButtonIconName
  /** Named icon rendered to the right of the label */
  iconRight?: ButtonIconName
  /** Accessibility label (required when no visible title) */
  accessibilityLabel?: string
  /** Expands button to fill parent width */
  fullWidth?: boolean
}
