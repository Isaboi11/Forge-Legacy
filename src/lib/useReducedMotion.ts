import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the athlete has asked the system to reduce motion.
 *
 * ══ WHY THIS FEATURE NEEDS IT MORE THAN MOST ══
 *
 * The coach chat is built almost entirely out of movement: text types itself out, turns rise into place,
 * a mark pulses and a ring sweeps. Every one of those is deliberate, and every one of them is exactly the
 * kind of thing that makes a motion-sensitive person put the phone down. `PROMPT.md` asks for the
 * reduced-motion variant twice — §4.8 for the mark, §6.8 for the typing — which is a fair signal that it
 * was not an afterthought in the design either.
 *
 * The substitutes are not "nothing happens": the sweep becomes a static bronze ring, the heat pulse a
 * steady glow, and a typed line simply appears complete with its fade. The meaning survives; only the
 * motion goes.
 *
 * Live, not read once: the setting can change while the app is open, and a listener costs nothing.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
