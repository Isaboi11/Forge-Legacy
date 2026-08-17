/**
 * Builds `reprocess-review.html` — side-by-side check of every re-processed clip against the one
 * still live in the app, before anything is uploaded.
 *
 * WHY THE COMPARISON IS THE POINT: a lone clip cannot be judged. "Is this glitchy?" has no answer
 * without the thing it is replacing next to it, because the eye adapts within a few loops. Old on
 * the left, new on the right, same size, same backdrop, restarting together.
 *
 * The old side streams from the PUBLIC bucket, so this is genuinely what ships today, not a local
 * copy that might have drifted. The new side is served off the Seagate.
 *
 *   node scripts/animation-processing/build_reprocess_review.mjs [--serve]
 *
 * Verdicts land in localStorage and export as CSV. Nothing here uploads.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'reprocess-review.html');

function findLibrary() {
  const roots = ['F:', 'D:', 'E:', 'G:'].map((d) => path.join(d + '\\', 'Forge Legacy Animations'));
  const hit = roots.find((r) => fs.existsSync(path.join(r, 'Reprocessed')));
  if (!hit) throw new Error(`no Reprocessed/ found — looked on ${roots.join(', ')}`);
  return hit;
}

const LIB = findLibrary();
const DIR = path.join(LIB, 'Reprocessed');
const url = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();

function parseCsv(text) {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const c = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { c.push(cur); cur = ''; }
      else cur += ch;
    }
    c.push(cur);
    return { id: c[0], name: c[1], variant: c[2], verdict: c[3], note: c[4] };
  });
}

const names = new Map();
const csv = path.join(HERE, 'animation-review.csv');
if (fs.existsSync(csv)) for (const r of parseCsv(fs.readFileSync(csv, 'utf8'))) names.set(`${r.variant}/${r.id}`, r.name);

const rows = [];
for (const variant of ['male', 'female']) {
  const d = path.join(DIR, variant);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.webp') && !x.endsWith('.full.webp'))) {
    const id = f.replace(/\.webp$/, '');
    rows.push({ id, variant, name: names.get(`${variant}/${id}`) || id, kb: Math.round(fs.statSync(path.join(d, f)).size / 1024) });
  }
}
rows.sort((a, b) => a.name.localeCompare(b.name) || a.variant.localeCompare(b.variant));
console.log(`${rows.length} re-processed clips`);

const html = `<!doctype html>
<meta charset="utf-8">
<title>Re-processed clips — check before upload</title>
<style>
  :root{--stage:#0E0E12;--bronze:#BA8654}
  *{box-sizing:border-box}
  body{margin:0;background:#131317;color:#E8E4DC;font:15px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif;padding:22px 28px}
  h1{font-size:18px;margin:0 0 2px}
  .sub{color:#9A948A;font-size:13px;margin:0 0 16px}
  .bar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
  button{background:#24242C;color:#E8E4DC;border:1px solid #3A3A45;border-radius:7px;padding:8px 14px;font:inherit;font-size:13px;cursor:pointer}
  button:hover{border-color:var(--bronze)}
  button.v{min-width:120px}
  .count{color:#9A948A;font-size:13px;margin-left:6px}
  .head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
  h2{font-size:17px;margin:0}
  .meta{color:#7E796F;font-size:12px}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;max-width:900px}
  .cell{background:var(--stage);border:1px solid #2A2A33;border-radius:10px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:9px;min-width:0}
  /* Both axes capped: a lying movement is ~3:1 and would otherwise solve to a width that
     overflows the column. */
  .cell img{max-height:320px;max-width:100%;width:auto;height:auto;object-fit:contain}
  .tag{font-size:11px;letter-spacing:.6px;text-transform:uppercase}
  .old .tag{color:#C87B6B}
  .new .tag{color:var(--bronze)}
  .prog{height:3px;background:#24242C;border-radius:2px;margin:14px 0 0;max-width:900px}
  .fill{height:100%;background:var(--bronze);border-radius:2px;width:0}
  .hint{color:#7E796F;font-size:12px}
</style>

<h1>Re-processed clips — check before upload</h1>
<p class="sub">Left is live in the app. Right is the same source through the fixed pipeline. Watch the
machine gaps. <b>1</b> fixed &nbsp;·&nbsp; <b>2</b> still glitchy &nbsp;·&nbsp; <b>3</b> worse &nbsp;·&nbsp; <b>space</b> replay &nbsp;·&nbsp; <b>b</b> backdrop</p>

<div class="bar">
  <button class="v" id="ok">1 · Fixed</button>
  <button class="v" id="still">2 · Still glitchy</button>
  <button class="v" id="worse">3 · Worse</button>
  <button id="back">&larr;</button>
  <button id="bg">Backdrop</button>
  <button id="replay">Replay</button>
  <button id="export">Export CSV</button>
  <span class="count" id="count"></span>
</div>

<div class="head"><h2 id="name"></h2><span class="meta" id="meta"></span></div>
<div class="pair">
  <div class="cell old"><img id="oldimg"><span class="tag">live in the app</span></div>
  <div class="cell new"><img id="newimg"><span class="tag">re-processed</span></div>
</div>
<div class="prog"><div class="fill" id="fill"></div></div>

<script>
const ROWS = ${JSON.stringify(rows)};
const SUPABASE = ${JSON.stringify(url)};
const KEY = 'forge-reprocess-review-v1';
const res = JSON.parse(localStorage.getItem(KEY) || '{}');
let at = ROWS.findIndex(r => !res[r.variant + '/' + r.id]);
if (at < 0) at = 0;

const BACKDROPS = ['#0E0E12','#FF00FF','#F0EDE8','#6B6B78'];
let bg = 0;

function paint(){
  const r = ROWS[at];
  const t = Date.now();
  document.getElementById('oldimg').src = SUPABASE + '/storage/v1/object/public/exercise-media/' + r.variant + '/' + r.id + '.webp?t=' + t;
  document.getElementById('newimg').src = 'clip/' + r.variant + '/' + r.id + '.webp?t=' + t;
}

function render(){
  const r = ROWS[at];
  document.getElementById('name').textContent = r.name + '  (' + r.variant + ')';
  document.getElementById('meta').textContent = r.id + '  ·  ' + r.kb + 'KB';
  const done = Object.keys(res).length;
  document.getElementById('count').textContent = (at+1) + ' / ' + ROWS.length + '   ·   ' + done + ' judged';
  document.getElementById('fill').style.width = (done / ROWS.length * 100) + '%';
  paint();
}

function record(v){
  const r = ROWS[at];
  res[r.variant + '/' + r.id] = v;
  localStorage.setItem(KEY, JSON.stringify(res));
  at = Math.min(ROWS.length - 1, at + 1);
  render();
}

document.getElementById('ok').onclick = () => record('fixed');
document.getElementById('still').onclick = () => record('still');
document.getElementById('worse').onclick = () => record('worse');
document.getElementById('back').onclick = () => { at = Math.max(0, at-1); render(); };
document.getElementById('replay').onclick = paint;
document.getElementById('bg').onclick = () => {
  bg = (bg + 1) % BACKDROPS.length;
  document.documentElement.style.setProperty('--stage', BACKDROPS[bg]);
};
document.getElementById('export').onclick = () => {
  const lines = ['exercise_id,variant,verdict'];
  for (const r of ROWS) if (res[r.variant + '/' + r.id]) lines.push([r.id, r.variant, res[r.variant + '/' + r.id]].join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\\n')], {type:'text/csv'}));
  a.download = 'reprocess-review.csv';
  a.click();
};
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === '1') record('fixed');
  else if (k === '2') record('still');
  else if (k === '3') record('worse');
  else if (k === 'arrowleft') { at = Math.max(0, at-1); render(); }
  else if (k === 'arrowright') { at = Math.min(ROWS.length-1, at+1); render(); }
  else if (k === ' ') paint();
  else if (k === 'b') document.getElementById('bg').click();
  else return;
  e.preventDefault();
});
render();
</script>
`;

fs.writeFileSync(OUT, html);
console.log(`-> ${path.relative(ROOT, OUT)}`);

if (process.argv.includes('--serve')) {
  const http = await import('node:http');
  http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'reprocess-review.html';
    // `clip/<variant>/<id>.webp` is served from the Seagate; everything else from this folder.
    const file = rel.startsWith('clip/') ? path.join(DIR, rel.slice(5)) : path.join(HERE, rel);
    const base = rel.startsWith('clip/') ? DIR : HERE;
    if (!file.startsWith(base) || !fs.existsSync(file)) return res.writeHead(404).end('not found');
    res.writeHead(200, {
      'Content-Type': file.endsWith('.webp') ? 'image/webp' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(fs.readFileSync(file));
  }).listen(4176, () => console.log(`\nchecking at  http://localhost:4176`));
}
