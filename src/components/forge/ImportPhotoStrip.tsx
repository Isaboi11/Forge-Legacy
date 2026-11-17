import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flRadius, flText } from '@/constants/foundation';

/**
 * ══ THE PHOTO BESIDE WHAT WAS READ (AI Road to 10 Sprint 3, IM-4) ══
 *
 * The preview lists what the reader took off the photos; checking it meant leaving the screen to find the photo.
 * Now the photos sit above the rows: a strip of thumbnails, and a tap opens one full width (tap again, or "Hide", to
 * fold it) — so a rep or a name can be checked against the card without losing the place. Phone width first: a strip,
 * not a side-by-side that would squeeze the rows. Layout here is both themes'; colour comes from the tokens.
 */
export function ImportPhotoStrip({ photos }: { photos: readonly string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  const shown = open != null && open < photos.length ? open : null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{photos.length > 1 ? 'Your photos — tap one to check it against the rows' : 'Your photo — tap to check it against the rows'}</Text>
      <View style={styles.strip}>
        {photos.map((uri, i) => (
          <Pressable
            key={uri}
            onPress={() => setOpen(shown === i ? null : i)}
            accessibilityRole="button"
            accessibilityLabel={shown === i ? `Hide photo ${i + 1}` : `Show photo ${i + 1} full width`}
            accessibilityState={{ expanded: shown === i }}
            style={[styles.thumb, shown === i ? styles.thumbOpen : null]}
          >
            <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
          </Pressable>
        ))}
      </View>
      {shown != null ? (
        <Pressable onPress={() => setOpen(null)} accessibilityRole="button" accessibilityLabel={`Hide photo ${shown + 1}`}>
          <Image source={{ uri: photos[shown] }} style={styles.big} resizeMode="contain" accessibilityLabel={`Photo ${shown + 1}`} />
          <Text style={styles.hide}>Hide</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 12 },
  label: { fontSize: 12, color: flText.secondary },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: flRadius.sm, overflow: 'hidden', borderWidth: 1, borderColor: flColor.divider },
  thumbOpen: { borderColor: flText.secondary, borderWidth: 2 },
  thumbImg: { width: '100%', height: '100%' },
  big: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.md, backgroundColor: flColor.divider },
  hide: { fontSize: 12, color: flText.secondary, textAlign: 'center', marginTop: 4 },
});
