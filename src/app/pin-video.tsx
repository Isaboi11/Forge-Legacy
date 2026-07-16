import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

import { flColor, flFont } from '@/constants/foundation';

/**
 * Fullscreen player for a video Pinned moment (the 485 deadlift). Opened from the Legacy pinned strip
 * with the clip's public URL; autoplays + loops with native controls. A full-screen modal over the app.
 */
export default function PinVideoScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const router = useRouter();
  const player = useVideoPlayer(url ?? '', (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.root}>
      {url ? (
        <VideoView style={styles.video} player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />
      ) : (
        <Text style={styles.err}>Video unavailable.</Text>
      )}
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close video" style={styles.close}>
        <Text style={styles.closeText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  err: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15 },
  close: {
    position: 'absolute',
    top: 52,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: flColor.bronze400,
    backgroundColor: 'rgba(8,11,14,0.6)',
  },
  closeText: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600' },
});
