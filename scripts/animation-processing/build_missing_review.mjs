/**
 * Build the review page for exercises that have NO animation yet.
 *
 *     node build_missing_review.mjs <missing.json> <out.html>
 *
 * PO: *"Build a place for me to go and check and choose which animation if there are multiple, or just
 * verifying that you got it right."*
 *
 * ══ ⚠ WHY THIS IS A LOCAL FILE AND NOT A HOSTED PAGE ══
 *
 * The candidates are raw MP4s on the Seagate (`F:\Forge Legacy Animations\MP4\...`). A page served from
 * anywhere else — an artifact, a preview URL, localhost — cannot read them: browsers do not let a remote
 * document open `file:///F:/...`, and no amount of markup gets around it. The page therefore has to BE a
 * local file, opened from disk, so it and the clips share an origin. Open it with File → Open, not by
 * pasting a URL.
 *
 * ⚠ THE DATA IS INLINED, NOT FETCHED. `fetch('missing.json')` from a `file://` page is blocked by CORS
 * in every current browser, so the JSON is written into the document. It is ~1.8 MB, which is fine for a
 * page opened once.
 *
 * ══ WHAT THIS PAGE IS NOT ══
 *
 * It records DECISIONS. It processes nothing, uploads nothing and edits nothing — matching only, per the
 * PO. The output is a JSON file of `{id, sex, chosen path}` that `batch.py` can consume later.
 */
import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node build_missing_review.mjs <missing.json> <out.html>');
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(inPath, 'utf8'));

/** `F:\a b\c.mp4` → `file:///F:/a%20b/c.mp4`. Spaces, parentheses and `#` all appear in these names. */
const fileUrl = (p) => {
  const norm = p.replace(/\\/g, '/');
  const enc = (rest) => rest.split('/').map(encodeURIComponent).join('/');
  const m = /^([A-Za-z]:)\/(.*)$/.exec(norm);
  // ⚠ THE DRIVE LETTER'S COLON MUST NOT BE ENCODED. Running every segment through
  // `encodeURIComponent` turns `F:` into `F%3A`, and Chrome and Edge both refuse `file:///F%3A/…` —
  // every clip would have failed to load while the page looked perfectly built.
  return m ? `file:///${m[1]}/${enc(m[2])}` : `file:///${enc(norm.replace(/^\//, ''))}`;
};

/*
 * ⚠ SERVED THROUGH `/clip`, NOT `file://` — AND THAT IS NOT A PREFERENCE.
 *
 * The page is now opened from `http://localhost` (`serve_review.mjs`), and a document on http may not
 * load `file://` subresources: every browser refuses it. The moment this stopped being a file on disk,
 * the clips had to come through the same origin. `fileUrl` is kept below because it is still the right
 * answer if anyone opens the built HTML directly, and because getting the drive-letter encoding right
 * cost a rebuild to discover.
 */
for (const r of rows) for (const c of r.candidates) {
  c.url = '/clip?p=' + encodeURIComponent(c.path);
  c.fileUrl = fileUrl(c.path);
}

const counts = ['likely', 'review', 'weak', 'none'].reduce((a, t) => {
  a[t] = rows.filter((r) => r.confidence === t).length;
  return a;
}, {});

const html = `<!doctype html>
<meta charset="utf-8">
<title>Missing animations — review</title>
<style>
:root{
  --ink:#F2EDE4;--soft:#A99E8E;--faint:#6E6353;--ground:#0A0908;--panel:#131110;--panel2:#1B1817;
  --rule:#2A2522;--bronze:#BA8654;--lift:#D6A472;--good:#7FA872;--bad:#C0685C;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:15px/1.55 ui-sans-serif,system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:rgba(10,9,8,.96);border-bottom:1px solid var(--rule);
  padding:.8rem 1.1rem;display:flex;gap:.9rem;align-items:center;flex-wrap:wrap;backdrop-filter:blur(6px)}
h1{font-size:1rem;margin:0;font-weight:600;letter-spacing:.01em}
.pill{font-size:.74rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;
  border:1px solid var(--rule);border-radius:999px;padding:.24rem .6rem;color:var(--soft);cursor:pointer;background:none;font-family:inherit}
.pill[aria-pressed="true"]{color:var(--lift);border-color:var(--bronze);background:rgba(186,134,84,.10)}
.count{margin-left:auto;color:var(--faint);font-size:.82rem;font-variant-numeric:tabular-nums}
button.act{font:inherit;font-weight:600;cursor:pointer;border-radius:8px;padding:.5rem .9rem;
  border:1px solid var(--rule);background:var(--panel2);color:var(--ink)}
button.act.primary{background:var(--bronze);border-color:var(--lift);color:#181008}
button.act:disabled{opacity:.4;cursor:default}
main{max-width:1180px;margin:0 auto;padding:1.2rem}
.ex{background:var(--panel);border:1px solid var(--rule);border-radius:12px;margin:0 0 1.1rem;overflow:hidden}
.ex.done{opacity:.5}
.exhead{display:flex;gap:.8rem;align-items:baseline;padding:.9rem 1.1rem;flex-wrap:wrap}
.exname{font-size:1.05rem;font-weight:600}
.meta{color:var(--faint);font-size:.8rem}
.tier{font-size:.66rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-radius:999px;
  padding:.18rem .5rem;border:1px solid var(--rule);color:var(--soft)}
.tier.likely{color:var(--good);border-color:rgba(127,168,114,.4)}
.tier.review{color:var(--lift);border-color:rgba(186,134,84,.4)}
.tier.none{color:var(--bad);border-color:rgba(192,104,92,.4)}
.cands{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:.8rem;padding:0 1.1rem 1.1rem}
.cand{border:1px solid var(--rule);border-radius:10px;overflow:hidden;background:var(--panel2);cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit}
.cand[aria-pressed="true"]{border-color:var(--bronze);box-shadow:0 0 0 1px var(--bronze)}
.cand video{width:100%;aspect-ratio:1;object-fit:cover;background:#fff;display:block}
.cand .cn{padding:.5rem .6rem;font-size:.74rem;line-height:1.35;color:var(--soft);word-break:break-word}
.tok{display:inline-block;font-size:.66rem;border-radius:4px;padding:.05rem .3rem;margin:.12rem .18rem 0 0}
.tok.x{background:rgba(192,104,92,.16);color:#E0958B}
.tok.m{background:rgba(186,134,84,.16);color:var(--lift)}
.foot{display:flex;gap:.6rem;padding:0 1.1rem 1rem;align-items:center;flex-wrap:wrap}
.none{padding:0 1.1rem 1.1rem;color:var(--bad);font-size:.9rem}
.status{font-size:.8rem;color:var(--faint)}
kbd{font:inherit;font-size:.74rem;border:1px solid var(--rule);border-radius:4px;padding:0 .3rem;color:var(--soft)}
</style>

<header>
  <h1>Missing animations</h1>
  <button class="pill" data-sex="all" aria-pressed="true">All</button>
  <button class="pill" data-sex="male" aria-pressed="false">Male</button>
  <button class="pill" data-sex="female" aria-pressed="false">Female</button>
  <span style="width:1px;height:20px;background:var(--rule)"></span>
  <button class="pill" data-tier="all" aria-pressed="true">Every tier</button>
  <button class="pill" data-tier="likely" aria-pressed="false">Likely ${counts.likely}</button>
  <button class="pill" data-tier="review" aria-pressed="false">Needs a look ${counts.review}</button>
  <button class="pill" data-tier="weak" aria-pressed="false">Weak ${counts.weak}</button>
  <button class="pill" data-tier="none" aria-pressed="false">Nothing found ${counts.none}</button>
  <button class="pill" id="hidedone" aria-pressed="false">Hide decided</button>
  <span class="count" id="count"></span>
  <span class="count" id="sync" style="margin-left:0"></span>
  <button class="act primary" id="export">Download decisions</button>
</header>

<main id="list"></main>

<script id="data" type="application/json">${JSON.stringify(rows).replace(/</g, '\\u003c')}</script>
<script>
const ROWS = JSON.parse(document.getElementById('data').textContent);
const KEY = 'fl-missing-anim-decisions-v1';
let decisions = {};
try { decisions = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { decisions = {}; }

/*
 * Every click goes to the server AND to localStorage.
 *
 * ⚠ NO BACKTICKS ANYWHERE BELOW THIS LINE — everything from here to the closing tag lives inside a
 * template literal in the builder, so one backtick ends the string and Node starts parsing the page's
 * JavaScript as its own. That is exactly how this file failed to build the first time.
 *
 * ⚠ THE SERVER IS THE HAND-OFF AND localStorage IS THE SAFETY NET, not the other way round. The
 * picks are only useful once they are a file on disk that can be read from the repo; but if the server
 * is stopped mid-session, the browser copy means nothing is lost and the next successful POST sends the
 * whole object rather than a diff, so it catches up on its own.
 *
 * The whole object goes every time on purpose — a decisions file that is always complete cannot drift
 * from what is on screen, and at ~900 rows it is a few tens of KB.
 */
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(decisions)); } catch (e) {}
  fetch('/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decisions),
  })
    .then((r) => r.json())
    .then((j) => setSync('saved ' + j.n + ' to disk'))
    .catch(() => setSync('offline — kept in this browser only'));
};
function setSync(msg) {
  const el = document.getElementById('sync');
  if (el) el.textContent = msg;
}
const keyOf = (r) => r.sex + '::' + r.id;

let sex = 'all', tier = 'all', hideDone = false;

function visible() {
  return ROWS.filter((r) =>
    (sex === 'all' || r.sex === sex) &&
    (tier === 'all' || r.confidence === tier) &&
    (!hideDone || !decisions[keyOf(r)]));
}

function render() {
  const list = document.getElementById('list');
  const rows = visible();
  const decided = ROWS.filter((r) => decisions[keyOf(r)]).length;
  document.getElementById('count').textContent =
    rows.length + ' shown · ' + decided + ' of ' + ROWS.length + ' decided';

  list.innerHTML = '';
  /* ⚠ CAPPED AT 120 ROWS. Each card mounts up to six <video> elements off an external drive; rendering
     900 at once is thousands of file handles and the page stops responding. Filter to narrow it. */
  for (const r of rows.slice(0, 120)) {
    const k = keyOf(r), d = decisions[k];
    const el = document.createElement('section');
    el.className = 'ex' + (d ? ' done' : '');
    el.innerHTML =
      '<div class="exhead"><span class="exname">' + esc(r.name) + '</span>' +
      '<span class="tier ' + r.confidence + '">' + r.sex + ' · ' + r.confidence + '</span>' +
      '<span class="meta">' + esc(r.id) + (r.equipmentId ? ' · ' + esc(r.equipmentId) : '') + '</span></div>' +
      (r.candidates.length
        ? '<div class="cands">' + r.candidates.map((c, i) =>
            '<button class="cand" data-i="' + i + '" aria-pressed="' + (d && d.path === c.path ? 'true' : 'false') + '">' +
            '<video src="' + c.url + '" muted loop preload="none" playsinline></video>' +
            '<div class="cn">' + esc(c.name) + '<br>' +
            c.missing.map((t) => '<span class="tok m">missing ' + esc(t) + '</span>').join('') +
            c.extra.map((t) => '<span class="tok x">+' + esc(t) + '</span>').join('') +
            '</div></button>').join('') + '</div>'
        : '<div class="none">No clip in the library covers this name. Likely genuinely absent — most of these are field or cardio movements the 3D library never rendered.</div>') +
      '<div class="foot">' +
        '<button class="act" data-act="none">No good match</button>' +
        '<button class="act" data-act="clear">Clear</button>' +
        '<span class="status">' + (d ? (d.path ? '✓ chosen: ' + esc(d.path.split(/[\\\\/]/).pop()) : '✗ marked none') : '') + '</span>' +
      '</div>';

    el.querySelectorAll('.cand').forEach((b) => {
      const c = r.candidates[+b.dataset.i];
      const v = b.querySelector('video');
      /* Load on hover, not on mount — see the 120 cap above. */
      b.addEventListener('mouseenter', () => { if (!v.src || v.preload === 'none') { v.preload = 'auto'; v.load(); } v.play().catch(() => {}); });
      b.addEventListener('mouseleave', () => v.pause());
      b.addEventListener('click', () => { decisions[k] = { id: r.id, sex: r.sex, path: c.path, name: c.name }; save(); render(); });
    });
    el.querySelector('[data-act="none"]').addEventListener('click', () => { decisions[k] = { id: r.id, sex: r.sex, path: null }; save(); render(); });
    el.querySelector('[data-act="clear"]').addEventListener('click', () => { delete decisions[k]; save(); render(); });
    list.appendChild(el);
  }
  if (rows.length > 120) {
    const more = document.createElement('p');
    more.className = 'status';
    more.style.padding = '0 1.1rem';
    more.textContent = rows.length - 120 + ' more not shown — narrow the filters above.';
    list.appendChild(more);
  }
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

document.querySelectorAll('[data-sex]').forEach((b) => b.addEventListener('click', () => {
  sex = b.dataset.sex;
  document.querySelectorAll('[data-sex]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  render();
}));
document.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => {
  tier = b.dataset.tier;
  document.querySelectorAll('[data-tier]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  render();
}));
document.getElementById('hidedone').addEventListener('click', (e) => {
  hideDone = !hideDone;
  e.target.setAttribute('aria-pressed', String(hideDone));
  render();
});
document.getElementById('export').addEventListener('click', () => {
  const out = Object.values(decisions);
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'animation-picks.json';
  a.click();
});

/*
 * ⚠ THE SERVER'S COPY WINS ON LOAD. Two browsers, or a browser reopened after the file was read from
 * the repo, would otherwise disagree with the file everything downstream reads. localStorage is only
 * the fallback for when the server is not running.
 */
fetch('/decisions')
  .then((r) => r.json())
  .then((server) => {
    if (server && Object.keys(server).length) {
      decisions = server;
      try { localStorage.setItem(KEY, JSON.stringify(decisions)); } catch (e) {}
      setSync('loaded ' + Object.keys(server).length + ' from disk');
    } else {
      setSync('ready');
    }
    render();
  })
  .catch(() => { setSync('offline — browser copy only'); render(); });

render();
</script>
`;

fs.writeFileSync(outPath, html);
console.log(`wrote ${outPath}  (${rows.length} rows, ${(html.length / 1e6).toFixed(2)} MB)`);
console.log(`  likely ${counts.likely}  review ${counts.review}  weak ${counts.weak}  none ${counts.none}`);
