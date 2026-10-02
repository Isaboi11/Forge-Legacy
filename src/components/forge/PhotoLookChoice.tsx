import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StoryCanvas } from '@/components/forge/StoryCanvas';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import type { StoryDrawing } from '@/domain/share/story-card';

export type PhotoLook = 'strip' | 'overlay';

/**
 * ══ HOW YOUR PHOTO GOES INTO THE POST ══ (PO 2026-10-02: *"if they add a picture in that slot it gives them
 * the option for the overlays or to have the strip underneath"*)
 *
 * Shown on Workout Complete once a photo has been added. Two choices, each drawn as what the feed will show:
 * the numbers ON the photo (the 4:5 post picture, `composePostPicture`, drawn here small from the same draw
 * list that gets uploaded), or the photo with the stats strip UNDER it — the card every post has had.
 *
 * `overlay` null means the picture can't be drawn (the photo couldn't be measured); only the strip is offered,
 * and nothing says why, because there is nothing for the athlete to do about it.
 */
export function PhotoLookChoice({
  value,
  onChange,
  overlay,
  photoUrl,
  stats,
  width,
}: {
  value: PhotoLook;
  onChange: (v: PhotoLook) => void;
  overlay: StoryDrawing | null;
  photoUrl: string;
  /** The strip the post would carry — the feed's own `workoutStats`. */
  stats: { value: string; label: string }[];
  /** The whole control's width. */
  width: number;
}) {
  if (!overlay) return null;
  const tileW = Math.floor((width - 10) / 2);
  const previewW = tileW - 12;
  const previewH = Math.round(previewW * 1.25);
  const options: { id: PhotoLook; label: string }[] = [
    { id: 'overlay', label: 'Stats on the photo' },
    { id: 'strip', label: 'Stats under the photo' },
  ];
  return (
    <View style={[styles.wrap, { width }]}>
      <Text style={styles.label}>YOUR PHOTO IN THE POST</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = value === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onChange(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              style={({ pressed }) => [styles.tile, { width: tileW }, on ? styles.tileOn : null, pressed ? styles.tilePressed : null]}
            >
              <View style={[styles.preview, { width: previewW, height: previewH }]}>
                {o.id === 'overlay' ? (
                  <StoryCanvas drawing={overlay} photoUri={photoUrl} width={previewW} />
                ) : (
                  <>
                    <Image source={{ uri: photoUrl }} style={{ width: previewW, height: previewH - 34 }} contentFit="cover" />
                    <View style={styles.strip}>
                      {stats.slice(0, 3).map((s) => (
                        <View key={s.label} style={styles.stat}>
                          <Text style={styles.statValue} numberOfLines={1}>
                            {s.value}
                          </Text>
                          <Text style={styles.statLabel} numberOfLines={1}>
                            {s.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
              <Text style={[styles.tileLabel, on ? styles.tileLabelOn : null]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 14 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 2.2, color: flColor.labelInk },
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    padding: 6,
    gap: 7,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
  },
  tileOn: { borderColor: flColor.accentBorder, borderWidth: 1.5 },
  tilePressed: { backgroundColor: flColor.charcoal900 },
  preview: { borderRadius: 8, overflow: 'hidden', backgroundColor: flColor.charcoal900 },
  strip: { height: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4 },
  stat: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 10.5, fontWeight: '700', color: flColor.cream100 },
  statLabel: { fontSize: 7.5, color: flColor.gray600 },
  tileLabel: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray400, paddingBottom: 2, textAlign: 'center' },
  tileLabelOn: { color: flColor.cream100, fontWeight: '600' },
});
