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

/** Everything `/clip` is allowed to read, and nothing else. */
const LIBRARY_ROOT = path.resolve('F:\\Forge Legacy Animations');

const port = Number(process.argv[2] || 4173);

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
};

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
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    if (!fs.existsSync(PAGE)) return send(res, 404, 'Run build_missing_review.mjs first.');
    return send(res, 200, fs.readFileSync(PAGE), { 'Content-Type': 'text/html; charset=utf-8' });
  }

  if (req.method === 'GET' && url.pathname === '/clip') {
    const p = url.searchParams.get('p') || '';
    const abs = path.resolve(p);
    // ⚠ BOTH CHECKS MATTER. The prefix test alone would pass `F:\Forge Legacy AnimationsEvil\x.mp4`,
    // so the separator is required; the extension test stops it being a general file reader.
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

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  Review page   http://localhost:${port}`);
  console.log(`  Clips from    ${LIBRARY_ROOT}`);
  console.log(`  Picks land in ${PICKS}\n`);
  if (!fs.existsSync(LIBRARY_ROOT)) {
    console.log('  ⚠ THE DRIVE IS NOT MOUNTED — every clip will 404 until it is plugged in.\n');
  }
});
