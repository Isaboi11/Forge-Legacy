/**
 * HonorMedallion — the forged bronze medallion used across the Honors Hub (L-10 recent + category strips,
 * L-11 detail sheet) and Legacy. A static sibling of the animated First Honor Ceremony medallion: bronze-
 * metallic ring over a recessed face. The locked ceremony stays untouched; this shares only its look
 * (tokens), not its code.
 *
 * The recess holds the honor's MEDAL (Honor Medals spec, 2026-09-25 — `domain/honor/medal-art.ts`), struck
 * at 0.8× the medallion as the spec rules. Pass the honor's `slug`; `face` picks one of the spec's two
 * faces: `clean` (one engraved mark — hub, lists, Legacy) or `struck` (the full coin — one medal shown
 * large). A caller without a slug, or an honor the design has no medal for, keeps the category glyph.
 */

import { useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

import { flColor, flFont, flGradient, flShadow } from '@/constants/foundation';
import { HonorGlyph } from './HonorGlyph';
import type { HonorGlyphName } from '@/domain/honor/catalog';
import { medalSvg, type MedalFace } from '@/domain/honor/medal-art';

export function HonorMedallion({
  glyph,
  slug,
  face = 'clean',
  size = 72,
}: {
  glyph: HonorGlyphName;
  /** The honor's `honor_type`. Omit and the medallion shows the category glyph. */
  slug?: string | null;
  face?: MedalFace;
  size?: number;
}) {
  const instance = useId();
  const xml = useMemo(
    () => (slug ? medalSvg(slug, { face, fontFamily: flFont.display, instance }) : null),
    [slug, face, instance],
  );
  const pad = Math.max(5, Math.round(size * 0.085));
  const innerRadius = (size - pad * 2) / 2;
  const glyphSize = Math.round(size * 0.46);
  // 0.8× the medallion (spec §VI); the recess is ~0.83×, so the medal sits inside the bezel, never on it.
  const artSize = Math.round(size * 0.8);
  return (
    <LinearGradient
      colors={flGradient.bronzeMetallic.colors}
      locations={flGradient.bronzeMetallic.locations}
      start={flGradient.bronzeMetallic.start}
      end={flGradient.bronzeMetallic.end}
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, padding: pad }]}
    >
      <View style={[styles.inner, { borderRadius: innerRadius }]}>
        {xml ? (
          <View pointerEvents="none" style={{ width: artSize, height: artSize }}>
            <SvgXml xml={xml} width={artSize} height={artSize} />
          </View>
        ) : (
          <HonorGlyph glyph={glyph} size={glyphSize} />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `${flShadow.borderInset}, ${flShadow.glowBadge}`,
  },
  inner: {
    width: '100%',
    height: '100%',
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 2px 7px rgba(0,0,0,0.6)',
  },
});
