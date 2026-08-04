/**
 * Generates `assets/audio/rest-ding.wav` — the sound the rest timer makes when it runs out.
 *
 * GENERATED, NOT DOWNLOADED. The asset is committed, but it is committed alongside the thing that made
 * it: no licence question, no "where did this file come from", and anyone can change the pitch or the
 * decay by editing four constants and re-running `node scripts/make-ding.mjs`.
 *
 * WHAT IT IS: two short bronze-ish partials (a fundamental and a fifth above it) under a fast
 * exponential decay — a struck-metal ping rather than a beep. Roughly 380 ms, which is long enough to
 * hear across a gym and short enough that it never becomes an alarm. Quiet by design (peak ≈ 0.35 of
 * full scale): this fires while someone is mid-set, and the product's whole posture is that rest is
 * part of training, not a deadline.
 *
 * 16-bit mono PCM WAV at 44.1 kHz — the one audio format every platform decodes without a codec.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const SECONDS = 0.38;
const PEAK = 0.35;
/** Fundamental + a perfect fifth. Two partials read as struck metal; one reads as a smoke alarm. */
const PARTIALS = [
  { hz: 880, gain: 1.0, decay: 9 },
  { hz: 1320, gain: 0.42, decay: 13 },
];

const frames = Math.round(RATE * SECONDS);
const pcm = Buffer.alloc(frames * 2);

for (let i = 0; i < frames; i += 1) {
  const t = i / RATE;
  let v = 0;
  for (const p of PARTIALS) v += p.gain * Math.sin(2 * Math.PI * p.hz * t) * Math.exp(-p.decay * t);
  // A 4 ms fade-in kills the click that a waveform starting mid-air would otherwise produce.
  const attack = Math.min(1, t / 0.004);
  const sample = Math.max(-1, Math.min(1, v * attack * PEAK));
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // format = PCM
header.writeUInt16LE(1, 22); // channels = mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio', 'rest-ding.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`wrote ${out} — ${frames} frames, ${(pcm.length / 1024).toFixed(1)} KiB`);
