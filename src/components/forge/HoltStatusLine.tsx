/**
 * The line Holt shows while a tool runs. AI Road to 10 Sprint 4a §1.5 — lane C; lane A mounts it.
 *
 * Drop-in for the `typingStatus` text inside the chat's typing bubble (`CoachChatSheet` → `TypingBubble`): the same
 * size, the same line height, the same secondary ink of either theme — never bronze, nothing has been earned yet —
 * and one line, clipped. The words come from `statusLine` (the app's templates, or the server's table line).
 *
 * The bubble owns the screen-reader announcement (`accessibilityLiveRegion`); pass it `holtStatusText(...)` as its
 * label so VoiceOver hears the same words that are drawn.
 */
import { StyleSheet, Text } from 'react-native';

import { flColor } from '@/constants/foundation';
import { statusLine, type StatusDetail } from '@/domain/coach/holt-status';

/** The words, for a screen-reader label beside the drawn line. */
export const holtStatusText = (status: string, detail?: StatusDetail | null): string => statusLine(status, detail);

export function HoltStatusLine({ status, detail }: { status: string; detail?: StatusDetail | null }) {
  return (
    <Text style={styles.line} numberOfLines={1}>
      {statusLine(status, detail)}
    </Text>
  );
}

const styles = StyleSheet.create({
  /* `typingStatus`'s values exactly (C-G5). Layout for both themes; the ink is the secondary token. */
  line: { marginLeft: 5, flexShrink: 1, fontSize: 13, lineHeight: 18, color: flColor.gray400 },
});
