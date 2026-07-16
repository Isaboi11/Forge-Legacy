import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Sign-in — the boot gate when there's no session. On success the root navigator swaps to the app
 * automatically (the auth session flips), so there's no manual navigation here.
 */
export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>Forge Legacy</Text>
      <Text style={styles.sub}>Sign in to your record.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={flColor.gray600}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={flColor.gray600}
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={onSubmit}
      />

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable
        style={[styles.btn, busy && styles.btnBusy]}
        onPress={onSubmit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        {busy ? <ActivityIndicator color="#0E0E12" /> : <Text style={styles.btnText}>Sign In</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base, paddingHorizontal: 28, justifyContent: 'center', gap: 14 },
  brand: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  sub: { fontSize: 14, color: flColor.gray400, textAlign: 'center', marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    borderRadius: flRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: flColor.cream100,
  },
  err: { fontSize: 13, color: '#D98F8F', textAlign: 'center' },
  btn: {
    marginTop: 6,
    backgroundColor: flColor.bronze300,
    borderRadius: flRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBusy: { opacity: 0.7 },
  btnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, color: '#0E0E12' },
});
