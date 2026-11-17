/**
 * multipart/form-data, both ways, binary-safe — the Management API speaks it for function bodies
 * (GET /v1/projects/{ref}/functions/{slug}/body with `Accept: multipart/form-data`, the server-side unbundle the
 * Supabase CLI's `functions download --use-api` and the Supabase MCP's get_edge_function use) and for deploys
 * (POST /v1/projects/{ref}/functions/deploy: a `metadata` JSON part plus one `file` part per file).
 */

import { Buffer } from 'node:buffer';

/** The boundary out of a Content-Type header, or null. */
export function boundaryOf(contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType ?? '');
  return m ? m[1] ?? m[2] : null;
}

/**
 * Parse a multipart body.
 * @param {Buffer | Uint8Array} body
 * @param {string} boundary
 * @returns {{ name: string | null, filename: string | null, contentType: string | null, headers: Record<string, string>, data: Buffer }[]}
 */
export function parseMultipart(body, boundary) {
  const buf = Buffer.from(body);
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buf.indexOf(delim);
  if (start < 0) return parts;
  for (;;) {
    let p = start + delim.length;
    if (buf[p] === 0x2d && buf[p + 1] === 0x2d) break; // `--boundary--` = the end
    if (buf[p] === 0x0d && buf[p + 1] === 0x0a) p += 2;
    else if (buf[p] === 0x0a) p += 1;
    const next = buf.indexOf(delim, p);
    if (next < 0) break;
    // The part ends at the CRLF (or LF) before the next delimiter.
    let end = next;
    if (buf[end - 2] === 0x0d && buf[end - 1] === 0x0a) end -= 2;
    else if (buf[end - 1] === 0x0a) end -= 1;
    const part = buf.subarray(p, end);
    let sep = part.indexOf('\r\n\r\n');
    let sepLen = 4;
    if (sep < 0) {
      sep = part.indexOf('\n\n');
      sepLen = 2;
    }
    const headText = sep < 0 ? '' : part.subarray(0, sep).toString('utf8');
    const data = sep < 0 ? part : part.subarray(sep + sepLen);
    const headers = {};
    for (const line of headText.split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    }
    const cd = headers['content-disposition'] ?? '';
    const name = /\bname="([^"]*)"/i.exec(cd)?.[1] ?? null;
    const filenameStar = /\bfilename\*=(?:UTF-8'')?([^;]+)/i.exec(cd)?.[1];
    const filename = filenameStar ? decodeURIComponent(filenameStar.trim().replace(/^"|"$/g, '')) : /\bfilename="([^"]*)"/i.exec(cd)?.[1] ?? null;
    parts.push({ name, filename, contentType: headers['content-type'] ?? null, headers, data: Buffer.from(data) });
    start = next;
  }
  return parts;
}

/**
 * Build a multipart body.
 * @param {{ name: string, value: string | Buffer, filename?: string, contentType?: string }[]} fields
 * @param {string} [boundary]
 */
export function buildMultipart(fields, boundary = `----forge-deploy-ai-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`) {
  const chunks = [];
  for (const f of fields) {
    const value = Buffer.isBuffer(f.value) ? f.value : Buffer.from(String(f.value), 'utf8');
    if (value.includes(Buffer.from(`--${boundary}`))) throw new Error('multipart: a field contains the boundary');
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${f.name}"`;
    if (f.filename) head += `; filename="${f.filename}"`;
    head += '\r\n';
    if (f.contentType) head += `Content-Type: ${f.contentType}\r\n`;
    chunks.push(Buffer.from(`${head}\r\n`, 'utf8'), value, Buffer.from('\r\n', 'utf8'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** A deployed file's path as the repo names it: `/tmp/user_fn_<ref>_<id>_<v>/source/index.ts` → `index.ts`. */
export function sourceRelative(p) {
  return String(p ?? '')
    .replace(/\\/g, '/')
    .replace(/^file:\/\//, '')
    .replace(/^.*?\/source\//, '')
    .replace(/^source\//, '')
    .replace(/^\.?\//, '');
}
