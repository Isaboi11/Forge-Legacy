import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { minutesTraining, type TrainingAthlete } from '@/data/presence-live';

/**
 * Who's training right now — Home's "Train Together" sheet.
 *
 * Replaces `FriendActionSheet`, which offered two rows (Train Together, Challenge) and did nothing for
 * either: S-10 is unbuilt and FRIENDS-context competitions are deferred, so it was a two-step path to a
 * dead end that also duplicated the Competitions button beside it.
 *
 * This is the honest version of working out with your people while a shared session doesn't exist: it
 * says who is lifting right now and lets you go see them. Squad-mates lead — `training_now()` returns
 * them first (0086) — and each row carries the squad, so "who is this" is answered on the row rather
 * than after a tap.
 *
 * An empty sheet is the ordinary case, not a failure, and it says so without implying anyone let you
 * down. The way out is the same either way: your circle.
 */

export interface TrainingNowSheetProps {
  open: boolean;
  onClose: () => void;
  athletes: TrainingAthlete[];
  onAthlete: (userId: string) => void;
  onFindPeople: () => void;
}

export function TrainingNowSheet({ open, onClose, athletes, onAthlete, onFindPeople }: TrainingNowSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Training Now">
      {athletes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nobody from your circle is training right now.</Text>
          <Pressable onPress={onFindPeople} accessibilityRole="button" accessibilityLabel="See your circle" style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}>
            <Text style={styles.ctaText}>See Your Circle</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false}>
          {athletes.map((a) => (
            <Pressable
              key={a.userId}
              onPress={() => onAthlete(a.userId)}
              accessibilityRole="button"
              accessibilityLabel={`${a.name}, training ${minutesTraining(a.startedAt)} minutes`}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Avatar name={a.name} src={a.avatarUrl ?? undefined} size="listRow" presence />
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[a.label, `${minutesTraining(a.startedAt)} min`, a.squadName].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={styles.dot} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88 },

  list: { maxHeight: 340 },
  listPad: { gap: 8, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  meta: { marginTop: 2, fontSize: 11.5, color: flColor.gray600 },
  dot: { width: 7, height: 7, borderRadius: flRadius.round, backgroundColor: flColor.greenMuted, boxShadow: '0 0 6px rgba(90, 158, 104, 0.6)' },

  empty: { alignItems: 'center', paddingVertical: 10, gap: 16 },
  emptyText: { fontFamily: flFont.display, fontSize: 15, lineHeight: 21, textAlign: 'center', color: flColor.gray400 },
  cta: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ctaText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
