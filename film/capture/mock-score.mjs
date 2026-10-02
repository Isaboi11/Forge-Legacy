// Renders the approved mock-up's own synthesized score + foley to a WAV, offline, so the rough cut has the
// exact timing the PO approved until the licensed track arrives. Placeholder only: never ships.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

let html = readFileSync(new URL('../reference/mockup-v1.html', import.meta.url), 'utf8');
const patch = (from, to) => { if (!html.includes(from)) throw new Error('patch target missing: ' + from); html = html.replace(from, to); };
// Schedule every cue at once instead of 1.6 s ahead of a live clock.
patch('const horizon = AC.currentTime - s.base + 1.6;', 'const horizon = 1e9;');
// Hand the context to the harness.
patch('initAudio(); playing = true;', 'initAudio(); window.__AC = AC; playing = true;');

const SR = 48000, SECONDS = 33;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(([sr, secs]) => {
  window.AudioContext = function () { return new OfflineAudioContext(2, sr * secs, sr); };
  window.webkitAudioContext = window.AudioContext;
}, [SR, SECONDS]);
await page.route('https://mock.local/', (route) => route.fulfill({ contentType: 'text/html', body: html }));
await page.goto('https://mock.local/', { waitUntil: 'load' });
await page.click('#overlay');
const b64 = await page.evaluate(async () => {
  const buf = await window.__AC.startRendering();
  const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 4, true);
  out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) {
    const v = Math.max(-1, Math.min(1, ch[c][i])); out.setInt16(44 + i * 4 + c * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  let s = ''; const u = new Uint8Array(out.buffer);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
});
await browser.close();
mkdirSync(new URL('../public/music/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/music/mock-score.wav', import.meta.url), Buffer.from(b64, 'base64'));
console.log('wrote public/music/mock-score.wav');
