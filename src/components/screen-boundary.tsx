import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flRadius } from '@/constants/foundation';
import { reportError } from '@/lib/diagnostics';

/**
 * A screen that throws should SAY SO, not disappear and not take the app with it.
 *
 * ══ WHY THIS IS NOT `OverlayBoundary` ══
 *
 * That one renders `null` when it catches, which is right for a floating bubble — a decoration that
 * failed should be absent. Its own header says it is **not for screens**, and it is right: silently
 * blanking a screen hides a real defect from everybody, including the person it just happened to.
 *
 * ══ THE REPORT THIS EXISTS FOR ══
 *
 * "When clicking edit on a program it crashes the app." Every one of the 14 Forge programs and a
 * coach-built plan were run through the Edit path here and all of them hydrate cleanly, so the failure is
 * in rendering — which cannot be executed outside the device. A crash that takes the whole app down also
 * takes the error message with it, so there was nothing to go on.
 *
 * With this, the same crash becomes a screen that names the error and offers a way out. The athlete keeps
 * their app, and the next report arrives with the one piece of information that was missing.
 *
 * ⚠ IT DOES NOT SWALLOW. The message is shown, not hidden, and it is logged. A boundary that quietly
 * recovers is how a bug survives a release — this one is deliberately visible, deliberately ugly, and
 * deliberately says which screen it was.
 */
export class ScreenBoundary extends React.Component<
  { children: React.ReactNode; name: string; onBack?: () => void },
  { message: string | null }
> {
  state: { message: string | null } = { message: null };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { message: message || 'Unknown error' };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error(`[ScreenBoundary] ${this.props.name} failed:`, error);
    /*
     * ⭐ AND NOW IT LEAVES THE DEVICE (0176).
     *
     * The `console.error` above is three years of good intentions pointed at a console that, on a
     * tester's phone, nobody will ever read. Everything this comment block asks the athlete to do —
     * "send us the line below — it is the part we cannot see from here" — is now done automatically,
     * with the breadcrumb trail attached, before they have finished reading the sentence.
     *
     * `info.componentStack` is React's own "the component tree above the throw", which a raw stack does
     * not carry and which is usually the faster read of the two.
     *
     * `reportError` is synchronous, returns void and cannot throw — see its header. That property is
     * load-bearing here specifically: a `componentDidCatch` that throws takes down the tree this
     * boundary exists to protect.
     */
    reportError(error, {
      source: 'boundary',
      fatal: false,
      componentStack: info?.componentStack ?? null,
      // The boundary knows which screen it wraps; the router only knows the URL, and on a crash during
      // navigation those two disagree. The name in the props is the one a human can act on.
      screen: this.props.name,
    });
  }

  render() {
    if (this.state.message == null) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>SOMETHING BROKE</Text>
        <Text style={styles.title}>{this.props.name} couldn’t open.</Text>
        <Text style={styles.body}>
          Nothing you did caused this and nothing has been lost. If you can, send us the line below — it is
          the part we cannot see from here.
        </Text>
        <View style={styles.errBox}>
          <Text style={styles.errText} selectable>
            {this.state.message}
          </Text>
        </View>
        {this.props.onBack ? (
          <Pressable
            onPress={this.props.onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnText}>Go Back</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: flColor.base, paddingHorizontal: 24, paddingTop: 90, gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 24, lineHeight: 31, color: flColor.cream100 },
  body: { fontSize: 14.5, lineHeight: 22, color: flColor.gray400 },
  errBox: {
    marginTop: 6,
    padding: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  // Monospace-ish and selectable: this line exists to be copied out, not admired.
  errText: { fontSize: 12.5, lineHeight: 19, color: flColor.cream100 },
  btn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.85 },
  btnText: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
});
