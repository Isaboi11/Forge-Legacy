import { StyleSheet, Text, View, Pressable } from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { useAuth } from '@/lib/auth';
import { flColor, flFont } from '@/constants/foundation';

/**
 * GATE A STUB — the boot router lands a signed-in, not-yet-onboarded athlete here. The real first-time
 * journey (Welcome → … → Transition, 9 screens) is Gate B; this placeholder only proves the routing
 * (fresh signup + returning-not-onboarded → here; onboarded → the app). Sign-out is wired so the
 * auth ⇄ onboarding loop is testable end-to-end.
 */
export default function OnboardingStub() {
  const { signOut } = useAuth();
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.4)' }} />
      <View style={styles.center}>
        <Text style={styles.kicker}>First-time journey</Text>
        <Text style={styles.title}>Your forge is being prepared.</Text>
        <Text style={styles.sub}>The onboarding screens land in Gate B.</Text>
        <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.btn}>
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 24, color: flColor.cream100, textAlign: 'center' },
  sub: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400, textAlign: 'center', marginBottom: 20 },
  btn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1, borderColor: flColor.bronze400 },
  btnText: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600' },
});
