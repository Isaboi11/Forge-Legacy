/**
 * FORM CHECK EVAL — run real clips through Holt's form read, exactly as the app + Edge Function do, and
 * write everything a human needs to grade it: the frames, the read, and each fix's frame with Holt's mark.
 *
 *   node scripts/form-check-eval.mjs --clips "<folder>" --out "<folder>" [--only 03,06,12]
 *
 * ⚠ EVERY RUN SPENDS REAL MONEY (`feedback_live_ai_tests_spend_real_money`). Each clip is one Sonnet 5 call
 * (~2¢). The script prints the measured cost of every call and the total — quote it before a bigger run.
 *
 * Same as production, on purpose:
 *   · the SYSTEM prompt is read out of `supabase/functions/coach-form-check/index.ts` (not copied);
 *   · frame timing, count and size come from `form-check-view.ts` / `form-check.ts` (the app's own rules);
 *   · the answer goes through `parseFormRead` — the same guard and mark conversion the function runs.
 * Different from production: frames come from ffmpeg instead of the phone (same timestamps, same 768 px long
 * edge, JPEG), and it calls the API directly with `ANTHROPIC_API_KEY` from `.env.local` — no credits, no DB.
 *
 * Needs `ffmpeg` and `ffprobe` on PATH.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FORM_FRAME_MAX_EDGE, FORM_OUTPUT_CAP, capFrames, frameLabel, parseFormRead } from '../src/domain/coach/form-check.ts';
import { formFrameCount, frameTimestamps, knownFromCoaching, trimWindow } from '../src/domain/coach/form-check-view.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'claude-sonnet-5';
// Sonnet 5, $/token (claude-api skill, cached 2026-06-24): input 2, output 10, cache read 0.2, cache write 2.5 per 1M.
const PRICE = { input: 2e-6, output: 10e-6, cacheRead: 0.2e-6, cacheWrite: 2.5e-6 };

/** The labelled set (PO clips, 2026-09-25). `expect: 'unreadable'` = a clip Holt should decline. */
const CLIPS = [
  { id: '00', file: 'IMG_0776.mov', lift: 'Bench Press', key: 'barbell-bench-press', angle: 'diagonal' },
  { id: '01', file: 'IMG_0873.MOV', lift: 'Bench Press', key: 'barbell-bench-press', angle: 'diagonal' },
  { id: '02', file: 'IMG_0980.mov', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'diagonal' },
  { id: '03', file: 'IMG_1040.MOV', lift: 'Overhead Press', key: 'barbell-overhead-press', angle: 'front' },
  { id: '04', file: 'IMG_3600.mov', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'side' },
  { id: '05', file: 'IMG_3861.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'side' },
  { id: '06', file: 'IMG_4895.MOV', lift: 'Back Squat', key: 'barbell-back-squat', angle: 'behind' },
  { id: '07', file: 'IMG_4897.MOV', lift: 'Back Squat', key: 'barbell-back-squat', angle: 'behind' },
  { id: '08', file: 'IMG_4934.mov', lift: 'Back Squat', key: 'barbell-back-squat', angle: 'diagonal' },
  { id: '09', file: 'IMG_7782.MOV', lift: 'Bench Press', key: 'barbell-bench-press', angle: 'side' },
  { id: '10', file: 'IMG_7793.MOV', lift: 'Dumbbell Curl', key: null, angle: 'front' },
  { id: '11', file: 'IMG_7973.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'diagonal' },
  { id: '12', file: 'IMG_8612.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'side' },
  { id: '13', file: 'IMG_8613.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'side' },
  { id: '14', file: 'IMG_8877.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'diagonal' },
  { id: '15', file: 'IMG_8928.MOV', lift: 'Back Squat', key: 'barbell-back-squat', angle: 'side' },
  { id: '16', file: 'IMG_8929.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'diagonal' },
  { id: '17', file: 'IMG_9340.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'front' },
  { id: '18', file: 'IMG_9727.MOV', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'diagonal' },
  { id: '19', file: 'RPReplay_Final1673713594.mp4', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'screen recording', expect: 'unreadable' },
  { id: '20', file: 'ScreenRecording_11-05-2024 11-11-23_1.mp4', lift: 'Deadlift', key: 'barbell-deadlift', angle: 'screen recording', expect: 'unreadable' },
];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function apiKey() {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const line = env.split(/\r?\n/).find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  if (!line) throw new Error('ANTHROPIC_API_KEY missing from .env.local');
  return line.slice('ANTHROPIC_API_KEY='.length).trim();
}

function systemPrompt() {
  const src = fs.readFileSync(path.join(ROOT, 'supabase/functions/coach-form-check/index.ts'), 'utf8').replace(/\r\n/g, '\n');
  const a = src.indexOf('const SYSTEM = `') + 'const SYSTEM = `'.length;
  const b = src.indexOf('`;', a);
  const s = src.slice(a, b);
  if (s.includes('${')) throw new Error('SYSTEM interpolates — the extraction would be wrong');
  return s;
}

const coaching = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/domain/exercise-coaching/content/coaching_content.json'), 'utf8'));
const coachingFor = (key) => coaching.find((r) => r.exerciseId === key && r.contentStatus === 'Published') ?? null;

const probe = (file, entries) =>
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', entries, '-of', 'csv=p=0:s=x', file], { encoding: 'utf8' }).trim();

function extract(file, ms, out) {
  const scale = `scale='if(gt(iw,ih),${FORM_FRAME_MAX_EDGE},-2)':'if(gt(iw,ih),-2,${FORM_FRAME_MAX_EDGE})'`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', (ms / 1000).toFixed(3), '-i', file, '-frames:v', '1', '-vf', scale, '-q:v', '5', out]);
  const [w, h] = probe(out, 'stream=width,height').split('x').map(Number);
  return [w, h];
}

function mark(src, out, m, size) {
  const [w, h] = size;
  const px = Math.round(m.x * w);
  const py = Math.round(m.y * h);
  const vf =
    m.kind === 'line'
      ? `drawbox=x=0:y=${py - 1}:w=iw:h=3:color=orange@1:t=fill`
      : `drawbox=x=${px - 16}:y=${py - 16}:w=32:h=32:color=orange@1:t=3,drawbox=x=${px - 4}:y=${py - 4}:w=8:h=8:color=orange@1:t=fill`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', vf, out]);
}

function sheet(frames, times, markedIdx, out) {
  // All frames in one strip, each labelled "Fn t s", Holt's chosen frames boxed in orange — for judging frame choice.
  const cols = frames.length;
  const inputs = frames.flatMap((f) => ['-i', f]);
  const parts = frames.map((_, i) => {
    const box = markedIdx.includes(i) ? ',drawbox=x=0:y=0:w=iw:h=ih:color=orange:t=10' : '';
    return `[${i}:v]scale=-2:360${box},drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='F${i + 1} ${(times[i] / 1000).toFixed(1)}s':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`;
  });
  const chain = `${parts.join(';')};${frames.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${cols}`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', chain, out]);
}

async function run() {
  const clipsDir = arg('clips');
  const outDir = arg('out');
  if (!clipsDir || !outDir) throw new Error('usage: --clips <folder> --out <folder> [--only 03,06]');
  const only = arg('only')?.split(',');
  const key = apiKey();
  const SYSTEM = systemPrompt();
  const results = [];
  let total = 0;

  for (const clip of CLIPS.filter((c) => !only || only.includes(c.id))) {
    const file = path.join(clipsDir, clip.file);
    const dir = path.join(outDir, clip.id);
    fs.mkdirSync(dir, { recursive: true });
    const dur = Math.round(Number(probe(file, 'format=duration')) * 1000);

    // The app's default: the whole clip, up to the window, sampled by the app's own rules.
    const { start, end } = trimWindow(dur, 0, Math.min(dur, 30_000));
    const times = frameTimestamps(dur, formFrameCount(end - start), start, end);
    const framePaths = [];
    const sizes = [];
    const b64 = [];
    for (let i = 0; i < times.length; i += 1) {
      const p = path.join(dir, `f${String(i + 1).padStart(2, '0')}.jpg`);
      sizes.push(extract(file, times[i], p));
      framePaths.push(p);
      b64.push(fs.readFileSync(p).toString('base64'));
    }
    const frames = capFrames(b64);
    if (!frames) throw new Error(`${clip.id}: frames refused by capFrames`);

    const known = clip.key ? knownFromCoaching(coachingFor(clip.key)) : '';
    const content = [];
    frames.forEach((data, i) => {
      content.push({ type: 'text', text: frameLabel(i, frames.length, times[i], sizes[i]) });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
    });
    content.push({
      type: 'text',
      text: `Those frames are one set of: ${clip.lift}. They are in time order.${
        known ? `\n\nCoaching notes for this lift from the app's library (reference only):\n${known}` : ''
      }\n\nAnswer with the JSON object only.`,
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: FORM_OUTPUT_CAP,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
      }),
    });
    const payload = await res.json();
    if (!res.ok) {
      console.log(`${clip.id} API ${res.status}: ${JSON.stringify(payload).slice(0, 300)}`);
      results.push({ ...clip, error: res.status });
      continue;
    }
    const u = payload.usage ?? {};
    const cost =
      (u.input_tokens ?? 0) * PRICE.input +
      (u.output_tokens ?? 0) * PRICE.output +
      (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
      (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;
    total += cost;

    const text = (payload.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const read = payload.stop_reason === 'refusal' ? null : parseFormRead(text, clip.lift, frames.length, sizes);
    fs.writeFileSync(path.join(dir, 'raw.txt'), text);
    fs.writeFileSync(path.join(dir, 'read.json'), JSON.stringify(read, null, 2));

    for (const m of read?.marks ?? []) mark(framePaths[m.frame], path.join(dir, `mark-fix${m.fix + 1}.jpg`), m, sizes[m.frame]);
    sheet(framePaths, times, (read?.marks ?? []).map((m) => m.frame), path.join(dir, 'sheet.jpg'));

    results.push({ ...clip, durMs: dur, frames: frames.length, usage: u, cost, read });
    console.log(
      `${clip.id} ${clip.lift} (${clip.angle}) · ${frames.length} frames · $${cost.toFixed(4)} · ` +
        (read ? `${read.view} · fixes ${read.fix.length} · marks ${read.marks.length}` : 'UNREADABLE'),
    );
  }
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`TOTAL $${total.toFixed(4)} for ${results.length} clip(s)`);
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
