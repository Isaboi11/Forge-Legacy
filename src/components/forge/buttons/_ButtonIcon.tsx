/**
 * Renders a Feather icon by the design-reference name used in ButtonLibrary.dc.html.
 * The name→Feather mapping mirrors the glyph() function in the reference component.
 */

import React from 'react'
import { Feather } from '@expo/vector-icons'
import type { ButtonIconName } from './_types'

const FEATHER_MAP: Record<ButtonIconName, React.ComponentProps<typeof Feather>['name']> = {
  plus:       'plus',
  arrowRight: 'arrow-right',
  arrowLeft:  'arrow-left',
  check:      'check',
  x:          'x',
  trash:      'trash-2',
  settings:   'settings',
  play:       'play',
  share:      'share',
  download:   'download',
  heart:      'heart',
}

interface Props {
  name: ButtonIconName
  size: number
  color: string
}

export function ButtonIcon({ name, size, color }: Props) {
  return <Feather name={FEATHER_MAP[name]} size={size} color={color} />
}
