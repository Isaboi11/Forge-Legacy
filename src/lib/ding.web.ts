/**
 * The rest-timer ding — web.
 *
 * SYNTHESISED, NOT DECODED. It is the same struck-metal ping `scripts/make-ding.mjs` bakes into the
 * native asset — a fundamental and a fifth above it under a fast exponential decay — built here from
 * two oscillators instead, so the web bundle carries no audio file at all.
 *
 * ══ WHY `primeDing` EXISTS, AND WHY IT IS THE WHOLE FEATURE ══
 *
 * iOS Safari starts every AudioContext SUSPENDED and will only resume one inside a user gesture. The
 * rest timer fires from a `setInterval`, which is not a gesture — so a ding created at expiry is
 * silently dropped, on the exact browser this app is mainly used from. `primeDing()` is therefore
 * called from the athlete's tap on "Log Set": the same action that STARTS the rest is what buys the
 * permission to end it out loud.
 *
 * The context is created and resumed once and then kept, because a second `new AudioContext()` outside
 * a gesture would be suspended again.
 */
type Ctor = new () => AudioContext;

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (ctx) return ctx;
    const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const C = g.AudioContext ?? g.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    return ctx;
  } catch {
    return null;
  }
}

/** Create and unlock the audio context. MUST be called from inside a user gesture — see the header. */
export function primeDing(): void {
  const c = audioCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function playRestDing(): void {
  const c = audioCtx();
  if (!c) return;
  try {
    // A context that was never primed is suspended; asking again costs nothing and sometimes works.
    if (c.state === 'suspended') void c.resume();
    const t0 = c.currentTime;
    // Fundamental + perfect fifth, each with its own decay — two partials read as struck metal.
    const partials: { hz: number; gain: number; decay: number }[] = [
      { hz: 880, gain: 0.35, decay: 0.11 },
      { hz: 1320, gain: 0.15, decay: 0.075 },
    ];
    for (const p of partials) {
      const osc = c.createOscillator();
      const amp = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = p.hz;
      // 4 ms attack kills the click a waveform starting mid-air would make; then an exponential tail.
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(p.gain, t0 + 0.004);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay + 0.26);
      osc.connect(amp).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.42);
    }
  } catch {
    // Audio is a courtesy. A browser that refuses still runs a workout.
  }
}
