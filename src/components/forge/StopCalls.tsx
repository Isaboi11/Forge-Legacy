import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { stopCalls } from '@/domain/coach/chat-core';

/**
 * The Call / Text buttons under a crisis or emergency stop (QA holtai-11) — the chat's card and Form Check's.
 * Stacked, not a row: two full-width buttons side by side push one off a small screen. Nothing renders for
 * a stop with no number in it.
 */
export function StopCalls({ kicker }: { kicker: string | undefined }) {
  const calls = stopCalls(kicker);
  if (calls.length === 0) return null;
  return (
    <View style={styles.calls}>
      {calls.map((c, i) => (
        <Button
          key={c.url}
          variant={i === 0 ? 'primary' : 'secondary'}
          fullWidth
          accessibilityLabel={c.label}
          onPress={() => void Linking.openURL(c.url).catch(() => undefined)}
        >
          {c.label}
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calls: { gap: 8, marginTop: 6 },
});
