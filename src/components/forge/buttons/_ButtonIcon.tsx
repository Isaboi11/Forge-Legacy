/**
 * Renders a button's icon by the design-reference name used in ButtonLibrary.dc.html.
 * Drawn from the PO's engraved set (2026-09-25); a bronze colour becomes the engraved gradient,
 * anything else (white on a bronze fill, the outline text colour) stays flat.
 */

import React from 'react'
import { EngravedIcon, engravedTint, type EngravedName } from '../primitives/icons/EngravedIcon'
import type { ButtonIconName } from './_types'

const ENGRAVED: Record<ButtonIconName, EngravedName> = {
  plus:       'plus',
  arrowRight: 'arrow-right',
  arrowLeft:  'arrow-left',
  check:      'check',
  x:          'close',
  trash:      'trash',
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
  return <EngravedIcon name={ENGRAVED[name]} size={size} color={engravedTint(color)} />
}
