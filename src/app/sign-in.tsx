import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { WelcomeAtmosphere } from '@/components/onboarding/WelcomeAtmosphere';
import { WelcomeLogo } from '@/components/onboarding/WelcomeLogo';
import { Field, Heading } from '@/components/onboarding/kit';
import { useAuth } from '@/lib/auth';
import { flColor, flFont } from '@/constants/foundation';

/**
 * The auth route (no session) — Welcome → Create Account → Sign In, the first 3 screens of the flow.
 * On a successful signUp/signIn the session flips and the boot router (`routeFor`) swaps this route out
 * for onboarding (fresh/not-onboarded) or the app (returning-onboarded) — so nothing navigates here.
 * The setup screens (Account…Transition) live in the onboarding route, reached automatically post-signup.
 */
type Step = 'welcome' | 'create' | 'signin';
const emailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function AuthFlow() {
  const { signIn, signUp } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = (next: Step) => {
    setErr(null);
    setStep(next);
  };

  const submit = async (kind: 'create' | 'signin') => {
    setBusy(true);
    setErr(null);
    const { error } = kind === 'create' ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
    // success → session flips → boot router takes over (no manual navigation)
  };

  return (
    <View style={styles.root}>
      {/* Mobile-width frame — on desktop web the auth route renders as a centered phone-width column
          (like the .dc frame), not stretched edge-to-edge. The atmosphere + content share the frame. */}
      <View style={styles.frame}>
      {/* Shared slate base — the .dc device-frame texture (forge-slate.png darkened on #050505),
          restored across the whole auth route. Welcome layers the forged-hall gradient on top. */}
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
      {step === 'welcome' ? <WelcomeAtmosphere /> : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'welcome' ? (
          <View style={styles.welcome}>
            <View style={styles.welcomeContent}>
              <WelcomeLogo />
              <View style={styles.brandText}>
                <Text style={styles.eyebrow}>Forge Legacy</Text>
                <Text style={styles.brand}>Build your story.{'\n'}Forge your legacy.</Text>
              </View>
            </View>
            <View style={styles.welcomeActions}>
              <Button variant="primary" fullWidth onPress={() => go('create')} accessibilityLabel="Begin Chapter I — create a new account">
                Begin Chapter I
              </Button>
              <Pressable onPress={() => go('signin')} accessibilityRole="button" accessibilityLabel="Sign in — I already have an account" style={styles.signinLink}>
                <Text style={styles.signinText}>
                  Returning athlete? <Text style={styles.signinAccent}>Sign in</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => go('welcome')} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={styles.backLink}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>

            {step === 'create' ? (
              <Heading eyebrow="Create your account" title="Secure your record" body="Email and a password to protect your record — everything else comes next." />
            ) : (
              <Heading eyebrow="Welcome back" title="Sign in to your record." />
            )}

            <View style={styles.fields}>
              <Field
                label="Email"
                placeholder="your@email.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                label="Password"
                placeholder={step === 'create' ? 'At least 8 characters' : 'Password'}
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => submit(step === 'create' ? 'create' : 'signin')}
              />
            </View>

            {err ? <Text style={styles.err}>{err}</Text> : null}

            {step === 'create' ? (
              <>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={busy || !emailValid(email) || password.length < 8}
                  onPress={() => submit('create')}
                  accessibilityLabel="Continue"
                >
                  {busy ? 'Creating…' : 'Continue'}
                </Button>
                <Text style={styles.legal}>By creating an account, you agree to our Terms of Service and Privacy Policy.</Text>
              </>
            ) : (
              <Button variant="primary" fullWidth disabled={busy} onPress={() => submit('signin')} accessibilityLabel="Sign in">
                {busy ? 'Signing in…' : 'Sign In'}
              </Button>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: '#050505' },
  frame: { flex: 1, width: '100%', maxWidth: 480, overflow: 'hidden' },
  flex: { flex: 1 },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 34, paddingHorizontal: 34, paddingTop: 44, paddingBottom: 74 },
  welcomeContent: { alignItems: 'center', gap: 48 },
  brandText: { alignItems: 'center', gap: 26 },
  eyebrow: { fontSize: 11.5, fontWeight: '600', letterSpacing: 5, textTransform: 'uppercase', color: flColor.gray400, textAlign: 'center' },
  brand: { fontFamily: flFont.display, fontSize: 40, fontWeight: '600', lineHeight: 43, letterSpacing: -0.5, color: flColor.cream100, textAlign: 'center' },
  welcomeActions: { alignSelf: 'stretch', gap: 16 },
  signinLink: { alignItems: 'center', paddingVertical: 6 },
  signinText: { fontFamily: flFont.sans, fontSize: 13.5, color: flColor.gray600 },
  signinAccent: { color: flColor.bronze300, fontWeight: '600' },

  form: { paddingHorizontal: 30, paddingTop: 64, paddingBottom: 40, gap: 22 },
  backLink: { alignSelf: 'flex-start' },
  backText: { fontFamily: flFont.sans, fontSize: 15, color: flColor.gray400 },
  fields: { gap: 16 },
  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted },
  legal: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.gray600, textAlign: 'center' },
});
