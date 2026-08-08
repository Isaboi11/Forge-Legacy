import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import type { PendingJoinRequest } from '@/data/train-together-live';

/**
 * "Sam wants to join" — answered without leaving the set you are on (0121).
 *
 * ══ WHY THIS EXISTS WHEN THE INBOX ALREADY HAS THE ROW ══
 *
 * The host is mid-set with the phone face-up on a bench. `push.tsx` sets `shouldPlaySound: false` for
 * foreground notifications — a deliberate choice, and the right one for a session — so a push arriving
 * while they are in the logger is a silent banner they will very likely miss. Meanwhile the person who
 * asked is standing in the gym waiting for an answer that has a four-hour shelf life at most and a
 * practical one measured in minutes.
 *
 * So the ask has to appear where the host is already looking. The inbox row still exists and still
 * works; it is the answer for a host who left the logger, not the primary path.
 *
 * Only ONE is shown at a time, oldest first. Two people asking at once is rare enough that stacking
 * banners over a set table would be the wrong trade — the second appears the moment the first is
 * answered.
 */
export function JoinRequestBanner({
  request,
  busy,
  onAccept,
  onDecline,
}: {
  request: PendingJoinRequest;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.root} accessibilityRole="alert">
      <View style={styles.head}>
        <Avatar name={request.fromName} src={request.fromAvatarUrl ?? undefined} size={38} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {request.fromName} wants to join
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {request.note ? `“${request.note}”` : 'They’ll start on the exercise you’re on.'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.half}>
          <Button variant="secondary" fullWidth onPress={onDecline} disabled={busy} accessibilityLabel={`Decline ${request.fromName}`}>
            Not now
          </Button>
        </View>
        <View style={styles.half}>
          <Button variant="primary" fullWidth onPress={onAccept} disabled={busy} accessibilityLabel={`Let ${request.fromName} join your workout`}>
            {busy ? 'Adding…' : 'Let them in'}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.missionCard,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  sub: { marginTop: 2, fontSize: 12.5, lineHeight: 17, color: flColor.gray400 },
  actions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
