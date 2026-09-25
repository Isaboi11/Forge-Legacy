/**
 * The official Forge icon — the PO's engraved set (2026-09-25), 130 glyphs.
 * Source: `design_reference/Forge Modal Library Design/forge-engraved-icons-svg/svg/`, compiled into
 * `engraved-glyphs.ts` by `scripts/icons/build-engraved.mjs`. Add or change an icon THERE, then re-run it.
 *
 * Two tones (PO, 2026-09-25):
 *   · no `color` → the engraved bronze gradient. For symbols that MEAN something — tabs, equipment,
 *     honors, squads, the thing a row is about.
 *   · `color` → one flat colour. For small controls (close, chevrons, check, arrows) and any icon whose
 *     colour carries state (a red trash, white on a bronze button, a grey inactive tab).
 *
 * ⚠ Every instance gets its OWN gradient id. On web these are DOM ids, and a `url(#x)` that resolves to a
 * gradient inside a hidden (`display:none`) tab screen paints nothing in Chrome — a shared id would make
 * icons blank depending on which screen happened to mount first.
 *
 * Strokes are thickened below 24px so a 16px chevron doesn't render as a 0.9px hairline; the main/detail
 * ratio (1.35 : .7) that makes it read as engraved is kept.
 */

import React, { useId, useMemo } from 'react'
import { SvgXml } from 'react-native-svg'
import { flColor, flIcon } from '@/constants/foundation'
import { ENGRAVED_GLYPHS, type EngravedName } from './engraved-glyphs'

export type { EngravedName }

export interface EngravedIconProps {
  name: EngravedName
  size?: number
  /** Flat colour. Omit for the engraved bronze gradient. */
  color?: string
}

/** Smallest on-screen width, in px, of the main stroke. 1.35 of 24 units is 1.35px at 24. */
const MIN_MAIN_PX = 1.2

export function EngravedIcon({ name, size = 24, color }: EngravedIconProps) {
  const gid = `eg${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const xml = useMemo(() => {
    const scale = Math.max(1, (MIN_MAIN_PX * 24) / size / 1.35)
    let body: string = ENGRAVED_GLYPHS[name]
    if (scale > 1) {
      body = body.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(parseFloat(w) * scale).toFixed(2)}"`)
    }
    const paint = color ?? `url(#${gid})`
    body = body.replace(/url\(#G\)/g, paint)
    const defs = color
      ? ''
      : `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">` +
        `<stop offset="0" stop-color="${flIcon.engravedTop}"/><stop offset=".5" stop-color="${flIcon.engravedMid}"/>` +
        `<stop offset="1" stop-color="${flIcon.engravedBottom}"/></linearGradient></defs>`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${defs}${body}</svg>`
  }, [name, size, color, gid])
  return <SvgXml xml={xml} width={size} height={size} />
}

/**
 * For wrappers that already take a `color`: a bronze means "the brand colour", so it becomes the engraved
 * gradient; anything else (grey inactive, white-on-bronze, red, green) is state and stays flat.
 */
export function engravedTint(color: string | undefined): string | undefined {
  if (!color) return undefined
  const c = color.toUpperCase()
  return BRONZES.has(c) ? undefined : color
}

const BRONZES = new Set(
  [flColor.bronze300, flColor.bronze400, flColor.bronze600, flIcon.bronze, '#C99767', '#BA8654', '#A47A3D', '#BD9257']
    .filter(Boolean)
    .map((c) => String(c).toUpperCase()),
)
