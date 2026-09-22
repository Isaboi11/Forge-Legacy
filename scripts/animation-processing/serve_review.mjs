/**
 * Serve the missing-animation review over http, and take the picks straight to disk.
 *
 *     node serve_review.mjs [port]        # default 4173
 *
 * PO: *"let's actually make that a local host link for me to click, not a file. And then everything I
 * click will transfer to you here."*
 *
 * ══ ⚠ WHY THE SERVER HAS TO STREAM THE CLIPS TOO ══
 *
 * The obvious version of this — serve the HTML, keep the `file:///F:/…` video sources — cannot work. A
 * document served over `http://localhost` is a different origin from the local filesystem, and every
 * browser refuses `file://` subresources from an http page. Moving to localhost therefore means the
 * clips have to come through the same server, which is what `/clip` is for.
 *
 * ══ ⚠ `/clip` IS CONFINED TO THE LIBRARY, DELIBERATELY ══
 *
 * It takes an absolute path, which is an open invitation to read any file on the machine. Every request
 * is resolved and then checked to be inside `LIBRARY_ROOT`, and refused otherwise — `..`, symlinks and
 * absolute escapes all fail the same test. It also only serves `.mp4`. This is a tool bound to
 * localhost, but "it is only on my machine" is exactly the reasoning that puts a directory traversal in
 * something that later gets exposed.
 *
 * ══ THE PICKS ══
 *
 * `POST /decisions` writes `out/decisions.json` on every click — the whole object, not a diff, so the
 * file always reflects what is on screen and a lost request costs nothing but the next click. That file
 * is the hand-off: it is plain JSON on disk, so it can be read from this repo without the browser being
 * involved. `localStorage` is kept as well, so closing the tab loses nothing if the server is down.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const PAGE = path.join(OUT, 'missing-animations-review.html');
const PICKS = path.join(OUT, 'decisions.json');

/**
 * Everything `/clip` is allowed to read, and nothing else.
 *
 * ⚠ FOUND, NOT HARD-CODED. This read `F:\Forge Legacy Animations` literally — the letter the drive
 * usually gets, and not one Windows promises: plug it in behind another removable volume and it comes
 * back as G:. The failure mode was the bad kind. The page still loads, all 904 rows are there, and
 * every one of the 866 with candidates shows a dead player — which reads as a broken tool rather than
 * as a drive on a different letter.
 *
 * `deliver_alabaster.py` already scans for the folder this way; this is the same rule on the other half
 * of the pipeline. F first, because it almost always is and a hit on the first try costs nothing.
 */
function animRoot() {
  for (const L of 'FGHIJKLMNOPQRSTUVWXYZABCDE') {
    const p = path.resolve(L + ':\\Forge Legacy Animations');
    if (fs.existsSync(p)) return p;
  }
  // Nothing mounted. Return the usual letter so the startup warning below can name a real path.
  return path.resolve('F:\\Forge Legacy Animations');
}

const LIBRARY_ROOT = animRoot();

const port = Number(process.argv[2] || 4173);

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
};

/**
 * ⚠ EVERY READ STREAM MUST BE DESTROYED WHEN THE RESPONSE CLOSES, AND THIS IS NOT A TIDINESS RULE —
 * IT IS WHY THE SERVER DIED MID-REVIEW.
 *
 * `.pipe(res)` was the whole of the old body. Pipe does not close the source when the DESTINATION
 * goes away, and on this page the destination goes away constantly: the queue mounts six <video>
 * elements, and moving to the next row tears all six off the document with their requests still in
 * flight. Each abandoned request left an open handle on the Seagate. Nothing ever closed them, so
 * they accumulated one card at a time until the process hit its descriptor ceiling and node threw
 * `EMFILE: too many open files` from an 'error' event with no listener — which does not fail the
 * request, it kills the server. It ran for 795 decisions and stopped in the middle of the pass.
 *
 * ⚠ AND THE 'error' LISTENER IS THE OTHER HALF. An unhandled 'error' on a ReadStream is a process
 * kill regardless of the cause — a yanked drive, a file being rewritten, a descriptor ceiling. This
 * is a tool someone is three hundred clicks into; a failed clip has to cost that clip and nothing
 * more.
 */
function pipeClip(stream, res) {
  const stop = () => stream.destroy();
  res.on('close', stop);
  res.on('error', stop);
  stream.on('error', (e) => {
    stream.destroy();
    console.error('  clip failed:', e.code || e.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end();
  });
  stream.pipe(res);
}

/** Range-aware so the browser can seek and loop without refetching the whole file. */
function streamClip(req, res, file) {
  const stat = fs.statSync(file);
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (start >= stat.size) return send(res, 416, '', { 'Content-Range': `bytes */${stat.size}` });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });
    return pipeClip(fs.createReadStream(file, { start, end }), res);
  }
  res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
  pipeClip(fs.createReadStream(file), res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    if (!fs.existsSync(PAGE)) return send(res, 404, 'Run build_missing_review.mjs first.');
    return send(res, 200, fs.readFileSync(PAGE), { 'Content-Type': 'text/html; charset=utf-8' });
  }

  if (req.method === 'GET' && url.pathname === '/clip') {
    const p = url.searchParams.get('p') || '';
    /*
     * ⚠ RE-ROOT BEFORE RESOLVING. `missing.json` bakes ABSOLUTE paths carrying whatever letter the
     * drive had when `find_missing.py` ran — every candidate in it today begins `F:\`. So finding the
     * drive is only half the job: a G: mount would still be asked for F: files, and the fix would look
     * like it had changed nothing. Rewriting the letter also means the list never has to be
     * regenerated just because a volume came back differently.
     */
    /*
     * ⚠ THE LOOKAHEAD IS LOAD-BEARING, AND IT WAS FOUND BY TESTING RATHER THAN BY READING. Written as
     * `…Animations[\\/]?` this matched the PREFIX of `F:\Forge Legacy AnimationsEvil\x.mp4`, left
     * `Evil\x.mp4`, and joined it back INTO the root — turning the one path the comment below says must
     * be refused into an allowed one. The rewrite has to match a whole path SEGMENT, so it either ends
     * there or a separator follows.
     */
    const REROOT = /^[A-Za-z]:[\\/]Forge Legacy Animations(?=[\\/]|$)[\\/]?/;
    const abs = path.resolve(REROOT.test(p) ? path.join(LIBRARY_ROOT, p.replace(REROOT, '')) : p);
    // ⚠ BOTH CHECKS MATTER, AND THEY RUN ON THE RE-ROOTED PATH — the rewrite above only ever moves a
    // path INTO `LIBRARY_ROOT`, so it cannot be used to escape one. The prefix test alone would pass
    // `…\Forge Legacy AnimationsEvil\x.mp4`, so the separator is required; the extension test stops
    // this being a general file reader.
    const inside = abs === LIBRARY_ROOT || abs.startsWith(LIBRARY_ROOT + path.sep);
    if (!inside || path.extname(abs).toLowerCase() !== '.mp4') return send(res, 403, 'refused');
    if (!fs.existsSync(abs)) return send(res, 404, 'no such clip');
    return streamClip(req, res, abs);
  }

  if (req.method === 'GET' && url.pathname === '/decisions') {
    const body = fs.existsSync(PICKS) ? fs.readFileSync(PICKS) : '{}';
    return send(res, 200, body, { 'Content-Type': 'application/json' });
  }

  if (req.method === 'POST' && url.pathname === '/decisions') {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 5e6) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(raw);
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(PICKS, JSON.stringify(parsed, null, 1));
        const n = Object.keys(parsed).length;
        process.stdout.write(`\r  ${n} decision${n === 1 ? '' : 's'} saved   `);
        send(res, 200, JSON.stringify({ ok: true, n }), { 'Content-Type': 'application/json' });
      } catch {
        send(res, 400, JSON.stringify({ ok: false }), { 'Content-Type': 'application/json' });
      }
    });
    return;
  }

  send(res, 404, 'not found');
});

/*
 * ⚠ THE LAST LINE OF DEFENCE, AND DELIBERATELY A BLUNT ONE.
 *
 * `pipeClip` fixes the leak that actually happened; this is here because of what it COST. The
 * decisions live in a file this process writes, the reviewer is hundreds of rows into a pass, and
 * the browser only finds out the server is gone when a save fails — so any uncaught throw, from any
 * source, ends a session's worth of momentum. On a localhost tool driven by one person, staying up
 * with a logged error beats exiting cleanly every time.
 *
 * It logs loudly rather than silently swallowing: a crash that stops being fatal must not also stop
 * being visible, or the next leak like the descriptor one goes unnoticed for a whole pass.
 */
process.on('uncaughtException', (e) => {
  console.error('\n  ⚠ SURVIVED AN UNCAUGHT ERROR — the server is still up and your picks are safe:');
  console.error('   ', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n    ') : e, '\n');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  Review page   http://localhost:${port}`);
  console.log(`  Clips from    ${LIBRARY_ROOT}`);
  console.log(`  Picks land in ${PICKS}\n`);
  if (!fs.existsSync(LIBRARY_ROOT)) {
    console.log('  ⚠ THE DRIVE IS NOT MOUNTED — every clip will 404 until it is plugged in.\n');
  }
});
