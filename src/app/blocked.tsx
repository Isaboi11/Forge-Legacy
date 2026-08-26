import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { useToast } from '@/hooks/useCeremony';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchBlockedAthletes, unblockAthlete, type BlockedAthlete } from '@/data/moderation-live';
import {
  NO_BLOCKS_MESSAGE,
  UNBLOCK_CONFIRM_BODY,
  UNBLOCK_CONFIRM_TITLE,
} from '@/domain/moderation/moderation-core';

/**
 * Blocked People (`/blocked`) — Account Settings → Privacy & Alerts.
 *
 * ══ WHY THIS SCREEN HAS TO EXIST ══
 *
 * Blocking is reachable from an athlete's profile. **Unblocking is not.** The moment a block lands, that
 * person's posts, comments and check-ins are gone from every feed — 0171's four RESTRICTIVE policies and
 * the four predicates in `friends_feed` see to that — so there is no longer any path back to the profile
 * carrying the Unblock control. Without this list a block is one-way in practice, and a control an athlete
 * cannot reverse is one they will hesitate to use.
 *
 * It is also the only surface where blocking is VISIBLE without two accounts, which makes it the screen an
 * App Store reviewer checking Guideline 1.2 can actually find.
 *
 * ⚠ THE LIST NAMES PEOPLE THE ATHLETE BLOCKED — NOT PEOPLE WHO BLOCKED THEM. `my_blocked_athletes()` reads
 *   `blocker_id = auth.uid()` only, and `athlete_blocks` deliberately carries no policy exposing the other
 *   direction. Being able to see who blocked you turns a safety control into a notification, and the whole
 *   value of a block is that the blocked person is not told.
 */
export default function BlockedRoute() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, loading, refetch } = useQuery(fetchBlockedAthletes, []);
  const [confirm, setConfirm] = useState<BlockedAthlete | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = data ?? [];

  const doUnblock = async (athlete: BlockedAthlete) => {
    setConfirm(null);
    setBusy(true);
    try {
      await unblockAthlete(athlete.athleteId);
      showToast(`${athlete.name} unblocked`);
      await refetch();
    } catch {
      showToast('That didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.55)' }} />
      <AppBar title="Blocked People" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          You won’t see each other’s posts, comments or check-ins. They aren’t told they’ve been blocked.
        </Text>

        {loading && rows.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : rows.length === 0 ? (
          /*
           * ⚠ AN EMPTY STATE, NOT A BLANK SCREEN. "You haven't blocked anyone" answers the question a
           * reviewer — and an athlete — actually has here, which is whether this screen works at all. A
           * blank page is indistinguishable from a failed read.
           */
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{NO_BLOCKS_MESSAGE}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map((r) => (
              <View key={r.athleteId} style={styles.row}>
                <Avatar size="listRow" src={r.avatarUrl ?? undefined} name={r.name} />
                <View style={styles.who}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.name}
                  </Text>
                  {r.handle ? (
                    <Text style={styles.handle} numberOfLines={1}>
                      @{r.handle}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setConfirm(r)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${r.name}`}
                  style={({ pressed }) => [styles.unblock, pressed || busy ? styles.unblockPressed : null]}
                >
                  <Text style={styles.unblockLabel}>Unblock</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ConfirmSheet
        open={confirm != null}
        onClose={() => setConfirm(null)}
        headline={UNBLOCK_CONFIRM_TITLE}
        body={UNBLOCK_CONFIRM_BODY}
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (confirm) void doUnblock(confirm);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, gap: 20 },
  lead: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  center: { paddingVertical: 48, alignItems: 'center' },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal800,
  },
  emptyText: { fontSize: 14, color: flColor.gray400 },
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  who: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  handle: { fontSize: 12.5, color: flColor.gray600 },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  unblockPressed: { opacity: 0.6 },
  unblockLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300, fontFamily: flFont.sans },
});
