/**
 * Shared helper functions for input state → visual property mapping.
 * All values locked to Forge Legacy Input Library.dc.html.
 */

import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'
import type { InputShadowStyle } from './_types'

/** Border color driven by field state */
export function getBorderColor(
  focused: boolean,
  error: boolean,
  success: boolean,
  disabled: boolean,
): string {
  if (disabled) return color.border.subtle
  if (error)    return color.danger
  if (success)  return color.accent.primary
  if (focused)  return INP.FOCUS_BORDER
  return color.border.subtle
}

/** Background color: surface when disabled, elevated otherwise */
export function getBgColor(disabled: boolean): string {
  return disabled ? color.background.surface : color.background.elevated
}

/** Shadow glow approximating the CSS box-shadow spread ring */
export function getGlow(focused: boolean, error: boolean): InputShadowStyle {
  if (error) {
    return {
      shadowColor:   INP.ERROR_GLOW_COLOR,
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.40,
      shadowRadius:  6,
      elevation:     0,
    }
  }
  if (focused) {
    return {
      shadowColor:   INP.FOCUS_GLOW_COLOR,
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius:  6,
      elevation:     0,
    }
  }
  return {
    shadowColor:   'transparent',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius:  0,
    elevation:     0,
  }
}

/** Helper / error / success text color */
export function getHelperColor(error: boolean, success: boolean): string {
  if (error)   return color.danger
  if (success) return color.accent.primary
  return color.text.tertiary
}

/** Which text to show below the field */
export function resolveHelper(
  helperText?: string,
  errorText?: string,
  successText?: string,
  error?: boolean,
  success?: boolean,
): string | undefined {
  if (error && errorText)     return errorText
  if (success && successText) return successText
  return helperText
}

/** Input text color (tertiary when empty/disabled, primary otherwise) */
export function getInputTextColor(hasValue: boolean, disabled: boolean): string {
  if (disabled) return color.text.tertiary
  if (!hasValue) return color.text.tertiary
  return color.text.primary
}
