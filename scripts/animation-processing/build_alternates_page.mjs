/**
 * Builds `alternates-review.html` — pick the replacement clip for each exercise the PO rejected.
 *
 * WHY STILLS AND NOT ANIMATIONS: a candidate is a raw 6MB mp4 that has not been matted, so showing
 * it moving would mean processing ~300 clips (hours) before the PO can even look. Every rejection
 * note is about something a STILL settles — standing vs seated, cable vs band, elevated vs flat,
 * one arm vs two. Two frames per candidate answer the question that was actually asked, in minutes.
 *
 * The clip currently in the app plays alongside, animated, so the PO is comparing against the thing
 * they rejected rather than remembering it.
 *
 *   node scripts/animation-processing/build_alternates_page.mjs [--serve]
 *
 * Choices are saved per exercise in localStorage and exported as JSON, which feeds the re-source
 * pass the same way `pending-clips.json` does.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'alternates-review.html');
const SHOTS = path.join(HERE, '_alt_shots');

function findLibrary() {
  const roots = ['F:', 'D:', 'E:', 'G:'].map((d) => path.join(d + '\\', 'Forge Legacy Animations'));
  const hit = roots.find((r) => fs.existsSync(path.join(r, 'MP4')));
  if (!hit) throw new Error(`Seagate not mounted — looked on ${roots.join(', ')}`);
  return hit;
}

function ffmpeg() {
  const hits = [
    process.env.FFMPEG,
    ...['ffmpeg'],
  ].filter(Boolean);
  for (const h of hits) {
    const r = spawnSync(h, ['-version'], { stdio: 'ignore' });
    if (r.status === 0) return h;
  }
  // Same winget location process_clip.py falls back to.
  const glob = path.join(process.env.USERPROFILE, 'AppData/Local/Microsoft/WinGet/Packages');
  const stack = [glob];
  while (stack.length) {
    const d = stack.pop();
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'ffmpeg.exe') return path.join(d, e.name);
      if (e.isDirectory()) stack.push(path.join(d, e.name));
    }
  }
  throw new Error('ffmpeg not found');
}

const LIB = findLibrary();
const FF = ffmpeg();
const alternates = JSON.parse(fs.readFileSync(path.join(HERE, 'alternates.json'), 'utf8'));
fs.mkdirSync(SHOTS, { recursive: true });

const env = (() => {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = raw.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
  return { url: m[1].trim() };
})();

/** Two frames per candidate: one early, one mid-rep. Enough to read position and equipment. */
function shots(rel) {
  const src = path.join(LIB, rel);
  const stem = rel.replace(/[^A-Za-z0-9]+/g, '_');
  const made = [];
  for (const [tag, pct] of [['a', '25%'], ['b', '60%']]) {
    const out = path.join(SHOTS, `${stem}_${tag}.jpg`);
    if (!fs.existsSync(out)) {
      // -ss before -i seeks by keyframe: fast, and precision does not matter for a pose check.
      const dur = spawnSync(FF, ['-i', src], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      const secs = dur ? (+dur[1] * 3600 + +dur[2] * 60 + +dur[3]) : 4;
      const at = (secs * parseFloat(pct) / 100).toFixed(2);
      spawnSync(FF, ['-y', '-ss', at, '-i', src, '-frames:v', '1', '-vf', 'scale=-1:260', '-q:v', '4', out],
                { stdio: 'ignore' });
    }
    if (fs.existsSync(out)) made.push(path.basename(out));
  }
  return made;
}

let n = 0;
for (const row of alternates) {
  for (const c of row.candidates) {
    c.shots = shots(c.rel);
    n++;
  }
  process.stdout.write(`\r  stills: ${n}`);
}
console.log(`\n${n} candidate stills in ${path.relative(ROOT, SHOTS)}`);

const html = `<!doctype html>
<meta charset="utf-8">
<title>Pick replacement clips</title>
<style>
  :root { --stage:#0E0E12; --bronze:#BA8654; }
  *{box-sizing:border-box}
  body{margin:0;background:#131317;color:#E8E4DC;font:15px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif;padding:24px 30px}
  h1{font-size:18px;margin:0 0 2px}
  .sub{color:#9A948A;font-size:13px;margin:0 0 18px}
  .bar{display:flex;gap:10px;align-items:center;margin-bottom:18px;flex-wrap:wrap}
  button{background:#24242C;color:#E8E4DC;border:1px solid #3A3A45;border-radius:7px;padding:7px 13px;font:inherit;font-size:13px;cursor:pointer}
  button:hover{border-color:var(--bronze)}
  .wrap{display:grid;grid-template-columns:320px minmax(0,1fr);gap:26px;align-items:start}
  .now{background:var(--stage);border:1px solid #2A2A33;border-radius:10px;padding:14px;text-align:center;position:sticky;top:20px;min-width:0}
  /* A lying movement (air bike, floor press) is ~3:1 WIDE. Constraining height alone lets the
     browser solve width to 800px+, which overflows the column and covers the page. Both axes get a
     ceiling and the aspect ratio is preserved by object-fit. */
  .now img{max-height:300px;max-width:100%;width:auto;height:auto;object-fit:contain}
  .now .tag{display:block;margin-top:8px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#C87B6B}
  .note{margin:12px 0 16px;padding:10px 12px;border-left:3px solid var(--bronze);background:#1B1B21;font-size:13px;color:#D8D2C6}
  .cands{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
  .cand{background:#1A1A20;border:2px solid #2A2A33;border-radius:10px;padding:10px;cursor:pointer;min-width:0;overflow:hidden}
  .cand:hover{border-color:#4A4A58}
  .cand.on{border-color:var(--bronze);background:#221C16}
  .cand .imgs{display:flex;gap:6px;justify-content:center;align-items:center;background:var(--stage);border-radius:6px;padding:6px;height:170px;overflow:hidden}
  .cand img{max-height:100%;max-width:calc(50% - 3px);width:auto;height:auto;object-fit:contain}
  .cand .fn{font-size:11px;color:#9A948A;margin-top:8px;word-break:break-all;line-height:1.35}
  .hit{color:var(--bronze)}
  .head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:4px}
  h2{font-size:16px;margin:0}
  .meta{color:#7E796F;font-size:12px}
  .count{color:#9A948A;font-size:13px}
  .none{color:#C87B6B;font-size:13px}
</style>

<h1>Pick replacement clips</h1>
<p class="sub">Left is the clip in the app that you rejected, playing. Right are the other takes of that
movement in the library — two frames each. Click the one that is right, or Skip.</p>

<div class="bar">
  <button id="prev">&larr; Back</button>
  <button id="skip">Skip</button>
  <button id="none">No good option</button>
  <button id="export">Export picks</button>
  <span class="count" id="count"></span>
</div>

<div class="wrap">
  <div>
    <div class="now"><img id="cur"><span class="tag">rejected — in the app now</span></div>
  </div>
  <div>
    <div class="head"><h2 id="name"></h2><span class="meta" id="meta"></span></div>
    <div class="note" id="note"></div>
    <div class="cands" id="cands"></div>
  </div>
</div>

<script>
const ROWS = ${JSON.stringify(alternates)};
const SUPABASE = ${JSON.stringify(env.url)};
const KEY = 'forge-alternates-v1';
const picks = JSON.parse(localStorage.getItem(KEY) || '{}');
let at = ROWS.findIndex(r => !picks[r.key]);
if (at < 0) at = 0;

function save(){ localStorage.setItem(KEY, JSON.stringify(picks)); }

function render(){
  const r = ROWS[at];
  document.getElementById('count').textContent =
    (at+1) + ' / ' + ROWS.length + '   ·   ' + Object.keys(picks).length + ' decided';
  document.getElementById('name').textContent = r.name + '  (' + r.variant + ')';
  document.getElementById('meta').textContent = r.id;
  document.getElementById('note').textContent = r.note || 'No note — judge on the movement itself.';
  document.getElementById('cur').src =
    SUPABASE + '/storage/v1/object/public/exercise-media/' + r.variant + '/' + r.id + '.webp?t=' + Date.now();

  const box = document.getElementById('cands');
  box.innerHTML = '';
  if (!r.candidates.length) {
    box.innerHTML = '<p class="none">No alternate take exists in the library for this movement.</p>';
    return;
  }
  for (const c of r.candidates) {
    const el = document.createElement('div');
    el.className = 'cand' + (picks[r.key]?.file === c.file ? ' on' : '');
    const imgs = c.shots.map(s => '<img src="_alt_shots/' + s + '">').join('');
    el.innerHTML = '<div class="imgs">' + imgs + '</div><div class="fn' + (c.noteHit ? ' hit' : '') + '">' + c.file + '</div>';
    el.onclick = () => { picks[r.key] = { file: c.file, rel: c.rel, id: r.id, variant: r.variant }; save(); next(); };
    box.appendChild(el);
  }
}

function next(){ at = Math.min(ROWS.length - 1, at + 1); render(); }
document.getElementById('prev').onclick = () => { at = Math.max(0, at - 1); render(); };
document.getElementById('skip').onclick = next;
document.getElementById('none').onclick = () => {
  picks[ROWS[at].key] = { file: null, rel: null, id: ROWS[at].id, variant: ROWS[at].variant, none: true };
  save(); next();
};
document.getElementById('export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(picks, null, 2)], {type:'application/json'}));
  a.download = 'alternate-picks.json';
  a.click();
};
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') { at = Math.max(0, at-1); render(); }
});
render();
</script>
`;

fs.writeFileSync(OUT, html);
console.log(`-> ${path.relative(ROOT, OUT)}`);

if (process.argv.includes('--serve')) {
  const http = await import('node:http');
  const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'alternates-review.html';
    const f = path.join(HERE, rel);
    if (!f.startsWith(HERE) || !fs.existsSync(f)) return res.writeHead(404).end('not found');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(f));
  }).listen(4175, () => console.log(`\npicking at  http://localhost:4175`));
}
