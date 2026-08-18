import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { WelcomeAtmosphere } from '@/components/onboarding/WelcomeAtmosphere';
import { WelcomeLogo } from '@/components/onboarding/WelcomeLogo';
import { Field, Heading } from '@/components/onboarding/kit';
import { LEGAL, type LegalKey } from '@/domain/settings/content';
import { useAuth } from '@/lib/auth';
import { flColor, flFont } from '@/constants/foundation';

/**
 * The auth route (no session) — Welcome → Create Account → Sign In → Reset Password, the screens
 * reachable before there is a session. On a successful signUp/signIn the session flips and the boot
 * router (`routeFor`) swaps this route out for onboarding (fresh/not-onboarded) or the app
 * (returning-onboarded) — so nothing navigates here. The setup screens (Account…Transition) live in the
 * onboarding route, reached automatically post-signup.
 *
 * ⚠ `forgot` / `sent` EXIST BECAUSE THERE WAS NO WAY BACK INTO AN ACCOUNT.
 *
 * `useAuth().resetPassword` has been wired to Supabase since Gate B and had ZERO callers — the screen it
 * was written for was never built. Forgetting a password meant creating a second account, which abandons
 * the record the whole product exists to keep permanent. This is that screen.
 */
type Step = 'welcome' | 'create' | 'signin' | 'forgot' | 'sent' | 'reset';
const emailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const PASSWORD_MIN = 8;

export default function AuthFlow() {
  const { signIn, signUp, resetPassword, updatePassword, recovering } = useAuth();
  const [chosenStep, setStep] = useState<Step>('welcome');
  /*
   * ⚠ DERIVED, NOT AN EFFECT THAT SYNCS ONE STATE INTO ANOTHER.
   *
   * Recovery can begin at any moment — cold from a tapped email link, or while this screen is already
   * open — so reading it once into `useState` would miss the second case entirely. Writing it in on
   * change would mean `setState` inside an effect, which this project's react-compiler lint rejects
   * outright (and which would flash the wrong step for a frame on the way).
   *
   * Forcing the step while `recovering` also gives the right behaviour for free: there is no way to
   * navigate off the set-password step until the password is actually set, because every other step is
   * unreachable while the flag is up. Once `updatePassword` clears it, the boot router takes them into
   * the app on the session they already hold — they never type the new password a second time.
   */
  const step: Step = recovering ? 'reset' : chosenStep;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** Terms / Privacy, read in-app at the moment consent is given rather than only after it. */
  const [legal, setLegal] = useState<LegalKey | null>(null);

  const go = (next: Step) => {
    setErr(null);
    // A revealed password must not survive the trip to another step — leaving it visible is a
    // shoulder-surfing hazard on a screen somebody else may be handed.
    setReveal(false);
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

  /*
   * ⚠ ALWAYS REPORTS SENT, EVEN ON FAILURE — and that is deliberate, not sloppy error handling.
   *
   * Supabase answers `resetPasswordForEmail` identically for a registered and an unregistered address,
   * precisely so the endpoint cannot be used to test whether somebody has an account here. Surfacing a
   * real error would re-open that: "no user found" is an answer. So the confirmation is written to be
   * true either way — *if there's an account for that address* — and the only thing a failure changes
   * is a console line for us.
   */
  const sendReset = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await resetPassword(email.trim());
    if (error) console.warn('[auth] password reset send failed', error);
    setBusy(false);
    setStep('sent');
  };

  /**
   * Set the new password on the recovery session. Success clears `recovering`, which is what releases
   * the boot router — there is no navigation here for the same reason the sign-in path has none.
   */
  const saveNewPassword = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    // Nothing sensitive should outlive the step that needed it.
    setPassword('');
    setReveal(false);
    setStep('signin');
  };

  /**
   * Why Continue is not pressable yet, in the athlete's own words — or null when it is.
   *
   * The button used to sit silently disabled until an email parsed and the password reached 8
   * characters, with the rule stated only in a placeholder that vanishes as soon as you type into it.
   * A dead control that never says why reads as a broken app, not as an unmet requirement.
   */
  const shortBy = (): string | null => {
    if (!password) return null; // nothing typed yet — do not scold an empty field
    if (password.length >= PASSWORD_MIN) return null;
    const short = PASSWORD_MIN - password.length;
    return `${short} more character${short === 1 ? '' : 's'} — passwords are at least ${PASSWORD_MIN}.`;
  };
  const createBlocker = (): string | null => {
    // `reset` has no email field; the recovery session already settled who this is.
    if (step === 'reset') return shortBy();
    if (!email.trim()) return null; // nothing typed yet — do not scold an empty form
    if (!emailValid(email)) return 'That email address doesn’t look right yet.';
    return shortBy();
  };
  const blocker = createBlocker();

  return (
    <View style={styles.root}>
      {/* Mobile-width frame — on desktop web the auth route renders as a centered phone-width column
          (like the .dc frame), not stretched edge-to-edge. The atmosphere + content share the frame. */}
      <View style={styles.frame}>
      {/* The SAME background as the Home screen — SCREEN_BG.slate + flat rgba(5,5,5,0.15) — shared across
          the whole auth route. Welcome layers the forged-hall gradient + carved logo on top of it. */}
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
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
            {/* No way back out of `reset`: they hold a recovery session and nothing else in the app
                will let them set a password, so an escape here strands them exactly where they started. */}
            {step === 'reset' ? null : (
              <Pressable
                onPress={() => go(step === 'forgot' || step === 'sent' ? 'signin' : 'welcome')}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={10}
                style={styles.backLink}
              >
                <Text style={styles.backText}>‹ Back</Text>
              </Pressable>
            )}

            {/* ── the confirmation, which is its own step because it has nothing to fill in ── */}
            {step === 'sent' ? (
              <>
                <Heading
                  eyebrow="Check your email"
                  title="On its way."
                  body={`If there's an account for ${email.trim()}, a link to set a new password is in your inbox. It expires in an hour.`}
                />
                <Text style={styles.quiet}>
                  Nothing arrived? Check spam, then try again — and make sure it&apos;s the address you signed up with.
                </Text>
                <Button variant="primary" fullWidth onPress={() => go('signin')} accessibilityLabel="Back to sign in">
                  Back to Sign In
                </Button>
                <Pressable onPress={() => go('forgot')} accessibilityRole="button" accessibilityLabel="Send the email again" style={styles.centerLink}>
                  <Text style={styles.centerLinkText}>Send it again</Text>
                </Pressable>
              </>
            ) : (
              <>
                {step === 'create' ? (
                  <Heading eyebrow="Create your account" title="Secure your record" body="Email and a password to protect your record — everything else comes next." />
                ) : step === 'reset' ? (
                  <Heading
                    eyebrow="Reset your password"
                    title="Choose a new password."
                    body="You're signed in from the link in your email. Set a password and you're back in — your record is exactly as you left it."
                  />
                ) : step === 'forgot' ? (
                  <Heading
                    eyebrow="Reset your password"
                    title="Get back to your record."
                    body="Your record is safe. Tell us the address you signed up with and we'll email you a link to set a new password."
                  />
                ) : (
                  <Heading eyebrow="Welcome back" title="Sign in to your record." />
                )}

                <View style={styles.fields}>
                  {/* `reset` already knows who they are — the recovery session says so — so asking for
                      the address again would be a question with an answer we already hold. */}
                  {step === 'reset' ? null : (
                    <Field
                      label="Email"
                      placeholder="your@email.com"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      value={email}
                      onChangeText={setEmail}
                      onSubmitEditing={step === 'forgot' ? () => void sendReset() : undefined}
                    />
                  )}
                  {/* The forgot step asks for an address and nothing else — a password field on a screen
                      for people who do not have the password would be its own small cruelty. */}
                  {step === 'forgot' ? null : (
                    <View>
                      <Field
                        label={step === 'reset' ? 'New password' : 'Password'}
                        placeholder={step === 'signin' ? 'Password' : `At least ${PASSWORD_MIN} characters`}
                        secureTextEntry={!reveal}
                        textContentType={step === 'signin' ? 'password' : 'newPassword'}
                        value={password}
                        onChangeText={setPassword}
                        onSubmitEditing={() =>
                          step === 'reset' ? void saveNewPassword() : submit(step === 'create' ? 'create' : 'signin')
                        }
                      />
                      {/* A typo in a field you cannot read costs the account on create, and a locked-out
                          evening on sign-in. Standard everywhere, and it was missing. */}
                      <Pressable
                        onPress={() => setReveal((v) => !v)}
                        accessibilityRole="button"
                        accessibilityState={{ checked: reveal }}
                        accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
                        hitSlop={8}
                        style={styles.reveal}
                      >
                        <Text style={styles.revealText}>{reveal ? 'Hide' : 'Show'}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Says why the button is not pressable BEFORE they press it and conclude it is broken. */}
                {(step === 'create' || step === 'reset') && blocker && !err ? <Text style={styles.blocker}>{blocker}</Text> : null}
                {err ? <Text style={styles.err}>{err}</Text> : null}

                {step === 'create' ? (
                  <>
                    <Button
                      variant="primary"
                      fullWidth
                      disabled={busy || !emailValid(email) || password.length < PASSWORD_MIN}
                      onPress={() => submit('create')}
                      accessibilityLabel="Continue"
                    >
                      {busy ? 'Creating…' : 'Continue'}
                    </Button>
                    {/* ⚠ THESE ARE TAPPABLE NOW. They were flat text on the one screen in the app where
                        consent is actually collected, so the documents an athlete was agreeing to were
                        readable only from Account Settings — which needs the account they had not made
                        yet. Same `LEGAL` copy and the same sheet Account Settings opens; nothing forked. */}
                    <Text style={styles.legal}>
                      By creating an account, you agree to our{' '}
                      <Text
                        style={styles.legalLink}
                        accessibilityRole="link"
                        accessibilityLabel="Read the Terms of Service"
                        onPress={() => setLegal('terms')}
                      >
                        Terms of Service
                      </Text>{' '}
                      and{' '}
                      <Text
                        style={styles.legalLink}
                        accessibilityRole="link"
                        accessibilityLabel="Read the Privacy Policy"
                        onPress={() => setLegal('privacy')}
                      >
                        Privacy Policy
                      </Text>
                      .
                    </Text>
                  </>
                ) : step === 'forgot' ? (
                  <Button
                    variant="primary"
                    fullWidth
                    disabled={busy || !emailValid(email)}
                    onPress={() => void sendReset()}
                    accessibilityLabel="Email me a reset link"
                  >
                    {busy ? 'Sending…' : 'Email Me a Link'}
                  </Button>
                ) : step === 'reset' ? (
                  <Button
                    variant="primary"
                    fullWidth
                    disabled={busy || password.length < PASSWORD_MIN}
                    onPress={() => void saveNewPassword()}
                    accessibilityLabel="Save my new password"
                  >
                    {busy ? 'Saving…' : 'Save New Password'}
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" fullWidth disabled={busy} onPress={() => submit('signin')} accessibilityLabel="Sign in">
                      {busy ? 'Signing in…' : 'Sign In'}
                    </Button>
                    <Pressable
                      onPress={() => go('forgot')}
                      accessibilityRole="button"
                      accessibilityLabel="Forgot your password?"
                      style={styles.centerLink}
                    >
                      <Text style={styles.centerLinkText}>Forgot your password?</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      </View>

      {/* The same in-app content sheet Account Settings uses. Nothing is fetched; no browser is opened. */}
      <BottomSheet open={legal !== null} onClose={() => setLegal(null)} title={legal ? LEGAL[legal].host : ''}>
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>{legal ? LEGAL[legal].title : ''}</Text>
          <Text style={styles.sheetUpdated}>{legal ? LEGAL[legal].updated : ''}</Text>
          {(legal ? LEGAL[legal].body : []).map((p) => (
            <Text key={p} style={styles.sheetPara}>
              {p}
            </Text>
          ))}
        </ScrollView>
      </BottomSheet>
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
  // Amber-neutral rather than red: an unfinished password is not an error, it is a field still being
  // filled in, and colouring it as a failure would scold somebody who is doing nothing wrong.
  blocker: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  legal: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.gray600, textAlign: 'center' },
  legalLink: { color: flColor.bronze300, fontWeight: '600', textDecorationLine: 'underline' },

  // Sits over the field's right edge, level with the input row beneath the label.
  reveal: { position: 'absolute', right: 12, top: 30, paddingVertical: 6, paddingHorizontal: 6 },
  revealText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },

  centerLink: { alignItems: 'center', paddingVertical: 8 },
  centerLinkText: { fontFamily: flFont.sans, fontSize: 13.5, color: flColor.bronze300, fontWeight: '600' },
  quiet: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 20, color: flColor.gray600 },

  sheetScroll: { maxHeight: 460 },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 30, gap: 13 },
  sheetTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  sheetUpdated: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600, marginTop: -6 },
  sheetPara: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 22, color: flColor.gray400 },
});
