/**
 * HonorMedallion — the forged bronze medallion used across the Honors Hub (L-10 recent + category strips,
 * L-11 detail sheet). A static sibling of the animated First Honor Ceremony medallion: bronze-metallic ring
 * over a recessed face holding the honor's category glyph. The locked ceremony stays untouched; this shares
 * only its look (tokens), not its code.
 */

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flGradient, flShadow } from '@/constants/foundation';
import { HonorGlyph } from './HonorGlyph';
import type { HonorGlyphName } from '@/domain/honor/catalog';

export function HonorMedallion({ glyph, size = 72 }: { glyph: HonorGlyphName; size?: number }) {
  const pad = Math.max(5, Math.round(size * 0.085));
  const innerRadius = (size - pad * 2) / 2;
  const glyphSize = Math.round(size * 0.46);
  return (
    <LinearGradient
      colors={flGradient.bronzeMetallic.colors}
      locations={flGradient.bronzeMetallic.locations}
      start={flGradient.bronzeMetallic.start}
      end={flGradient.bronzeMetallic.end}
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, padding: pad }]}
    >
      <View style={[styles.inner, { borderRadius: innerRadius }]}>
        <HonorGlyph glyph={glyph} size={glyphSize} />
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
