// Byte ranges for the hero film — and ONLY the hero film (wrangler.jsonc `run_worker_first: ["/assets/film/*"]`;
// every other path is still served by the assets layer directly, with no code in front of it).
//
// Why it exists: Workers Static Assets answers a Range request with the whole file (200, checked 2026-10-02), and
// Safari on iPhone will not play a video from a server that ignores byte ranges — Apple: "HTTP servers hosting media
// files for iOS must support byte-range requests". The film files are each under 5 MB, so buffering one is cheap.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const range = request.headers.get('Range');
    if (res.status !== 200 || !res.body) return res; // 304s, 404s, HEAD
    if (!range) {
      const h = new Headers(res.headers);
      h.set('Accept-Ranges', 'bytes');
      return new Response(res.body, { status: 200, headers: h });
    }
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let start = -1, end = -1;
    if (m && m[1] !== '') { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
    else if (m && m[2] !== '') { start = Math.max(0, size - Number(m[2])); end = size - 1; } // suffix: the last N bytes
    if (start < 0 || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
    }
    const h = new Headers(res.headers);
    h.set('Accept-Ranges', 'bytes');
    h.set('Content-Range', `bytes ${start}-${end}/${size}`);
    h.set('Content-Length', String(end - start + 1));
    return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
  },
};
