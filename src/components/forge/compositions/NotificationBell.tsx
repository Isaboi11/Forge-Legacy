import { Pressable, StyleSheet, Text, View } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'

import { fetchUnreadNotificationCount } from '@/data/notifications-live'
import { useQuery } from '@/lib/useQuery'
import { flColor, flRadius, flShadow } from '@/constants/foundation'

/**
 * The notification bell — an AppBar action carrying the unread count, sized and spaced to sit beside
 * the existing header controls (44×44 tap target, same as the Squads header's search/create pair).
 *
 * Keyed on the pathname rather than polled: any navigation re-reads the count, so opening the feed and
 * coming back clears it without a timer. The count resolves 0 on any failure — an indicator is never
 * worth breaking the screen that hosts it.
 */
export function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: unread } = useQuery(fetchUnreadNotificationCount, [pathname])
  const count = unread ?? 0

  return (
    <Pressable
      onPress={() => router.push('/inbox')}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} new` : 'Notifications'}
      style={styles.btn}
      hitSlop={6}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-2 6h16c-.5-.5-2-2-2-6a6 6 0 0 0-6-6z" />
        <Path d="M10 19a2 2 0 0 0 4 0" />
      </Svg>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 5,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeSolid,
    borderWidth: 1.5,
    borderColor: flColor.surfaceNav, // the bar's own fill, so the badge reads as lifted off the glyph
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    color: flColor.onBronze,
  },
})
