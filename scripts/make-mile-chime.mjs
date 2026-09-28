/**
 * Generates `assets/audio/mile-chime.wav` — the sound a run makes at each mile (or km) marker.
 *
 * GENERATED, NOT DOWNLOADED, for the reasons `make-ding.mjs` gives: no licence question, and anyone can
 * change it by editing the constants below and re-running `node scripts/make-mile-chime.mjs`.
 *
 * WHAT IT IS: the rest ding's struck-metal voice, twice, RISING — a fundamental, then the fifth above it
 * 150 ms later. Two notes so it cannot be mistaken for the rest timer (one note), rising because a
 * marker is progress, not an alarm. It plays over the athlete's music (mixed, never stopping it), so it
 * is a touch louder than the ding (peak ≈ 0.5) and still well short of full scale.
 *
 * 16-bit mono PCM WAV at 44.1 kHz — the one audio format every platform decodes without a codec.
 */
import { Buffer } from 'node:buffer';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const SECONDS = 0.62;
const PEAK = 0.5;
/** Each strike: a fundamental and a fifth over it, like the ding. */
const STRIKES = [
  { at: 0, hz: 784, decay: 8 }, // G5
  { at: 0.15, hz: 1175, decay: 7 }, // D6 — a fifth up
];

const frames = Math.round(RATE * SECONDS);
const pcm = Buffer.alloc(frames * 2);

for (let i = 0; i < frames; i += 1) {
  const t = i / RATE;
  let v = 0;
  for (const s of STRIKES) {
    const u = t - s.at;
    if (u < 0) continue;
    // A 4 ms attack per strike kills the click of a waveform starting mid-air.
    const attack = Math.min(1, u / 0.004);
    const env = attack * Math.exp(-s.decay * u);
    v += env * (Math.sin(2 * Math.PI * s.hz * u) + 0.4 * Math.sin(2 * Math.PI * s.hz * 1.5 * u));
  }
  const sample = Math.max(-1, Math.min(1, (v / 1.4) * PEAK));
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

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio', 'mile-chime.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`wrote ${out} — ${frames} frames, ${(pcm.length / 1024).toFixed(1)} KiB`);
