/**
 * Shared TypeScript interfaces for the Forge Legacy input library.
 */

export type InputIconName =
  | 'search' | 'lock' | 'eye' | 'eye-off' | 'calendar' | 'clock'
  | 'user' | 'mail' | 'phone' | 'at-sign' | 'tag' | 'link'
  | 'check' | 'x' | 'alert-circle' | 'plus' | 'minus' | 'edit'
  | 'chevron-down' | 'chevron-up'

export interface InputBaseProps {
  /** Field label rendered above the input */
  label?: string
  /** Controlled value */
  value?: string
  /** Placeholder text */
  placeholder?: string
  /** Helper text shown below in default/focused states */
  helperText?: string
  /** Message shown when error=true (overrides helperText) */
  errorText?: string
  /** Message shown when success=true (overrides helperText) */
  successText?: string
  /** Activates error border + errorText */
  error?: boolean
  /** Activates success border + successText */
  success?: boolean
  /** Non-interactive; field recedes at opacity 0.45 */
  disabled?: boolean
  /** Replaces state icon with spinner; field non-interactive */
  loading?: boolean
  /** Marks label with required indicator */
  required?: boolean
  /** Text change handler */
  onChangeText?: (text: string) => void
  /** Focus callback */
  onFocus?: () => void
  /** Blur callback */
  onBlur?: () => void
  /** Screen-reader label (falls back to label prop) */
  accessibilityLabel?: string
  /** Expands to full parent width */
  fullWidth?: boolean
  /** Comfortable (52px, default) or compact (44px) field height */
  size?: 'comfortable' | 'compact'
  /** Named icon for left slot */
  iconLeft?: InputIconName
  /** Named icon for right slot */
  iconRight?: InputIconName
}

/** Loose shadow object for dynamic per-state assignment */
export interface InputShadowStyle {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}
