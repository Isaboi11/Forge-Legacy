/**
 * The text out of a PDF — so a purchased program can be imported the way a spreadsheet is.
 *
 * PO: *"make sure it can import files/pdfs. If someone purchases a program it's usually a pdf."*
 *
 * ══ WHAT THIS IS, AND IS NOT ══
 *
 * It is a THIRD way to fill the paste box, exactly as the screenshot reader is (see
 * `ImportSpreadsheetSheet`): the PDF's text lands in the box, goes through `parseProgramTable`, and is
 * previewed and corrected like anything else. No model, no inference — a PDF's own text, read out with
 * `pdf.js`, which is the same engine Firefox opens PDFs with. That keeps it inside §4.3's locked
 * *"No AI interpretation. No inference."* A scanned PDF has no text and is refused with a reason; it is
 * not OCR'd.
 *
 * ══ ROWS FROM GLYPHS ══
 *
 * A PDF has no rows. It has runs of text at (x, y) positions, and a table is only a table because the
 * runs line up. `itemsToLines` rebuilds the rows: runs whose baselines agree within `LINE_TOL` are one
 * line, sorted left to right; a horizontal jump wider than `GAP_TAB` — or a blank run that wide — is a
 * column boundary and becomes a TAB, so the parser's delimiter detection sees a table rather than a
 * sentence. Narrower gaps become a space, and touching runs are joined. Measured on a generated fixture
 * in `pdf-text.test.mjs` and on nothing else yet: a real purchased PDF is the input this needs to be
 * tried against, and the preview is what makes a wrong read visible before it becomes anything.
 *
 * ══ WHY THE WORKER RUNS ON THE MAIN THREAD ══
 *
 * `pdf.js` wants a Web Worker and a URL to load it from; Metro gives it neither. Importing the worker
 * build directly sets `globalThis.pdfjsWorker`, which the library treats as "the worker is already
 * here" and messages through a loopback port instead. A program PDF is a few pages of text — the read
 * is well under a second, and a frozen frame that short is cheaper than a second bundle.
 *
 * ⚠ TWO BUNDLER HAZARDS LIVE IN `pdf.js`, AND BOTH ARE HANDLED OUTSIDE THIS FILE. Its Node-only
 *   branches use `import.meta` (a SYNTAX error in a Hermes bundle — the whole app would fail to load,
 *   not just this feature) and `require("@napi-rs/canvas")` (native bindings Metro cannot bundle).
 *   `babel.config.js` strips the former; `metro.config.js` maps the latter to an empty module. The
 *   export gates prove both: a bundle with `import.meta` in it is not a bundle.
 *
 * ⚠ NATIVE IS BEST-EFFORT UNTIL A DEVICE SAYS OTHERWISE. Hermes lacks `Promise.withResolvers` and
 *   `structuredClone`, which the library uses; both are polyfilled below before it loads. Anything else
 *   it turns out to need surfaces as a caught error and the sheet's message — never a crash, because
 *   the library is imported lazily, inside the tap, inside a try. Until `expo-document-picker` ships in
 *   a native build there is no PDF to hand this on a phone anyway; the browser is where it runs today.
 *
 * ⚠ NO `@/` IMPORTS. `pdf-text.test.mjs` loads this file under `node --test`, where the alias does not
 *   resolve — the same rule that governs `domain/`.
 */

/** A text run as `pdf.js` reports it. Only the fields this file reads. */
export type PdfTextRun = {
  str: string;
  /** [a, b, c, d, x, y] — x and y are the run's origin on the page, in points. */
  transform: readonly number[];
  /** Advance width of the run, in points. */
  width: number;
};

/** Baselines closer than this are the same line. Real tables jitter by a fraction of a point. */
const LINE_TOL = 2.5;
/** A horizontal jump wider than this is a column boundary, not a word space (≈ three spaces at 11pt). */
const GAP_TAB = 12;

/**
 * Rebuild lines from positioned runs. Exported for the test; `extractPdfText` is the door.
 *
 * Top of the page first (PDF y grows upward), then left to right within a line.
 */
export function itemsToLines(items: readonly PdfTextRun[]): string[] {
  const rows: { y: number; runs: PdfTextRun[] }[] = [];
  for (const it of items) {
    if (!it.str) continue; // pdf.js emits empty end-of-line markers; they carry no text
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= LINE_TOL);
    if (!row) {
      row = { y, runs: [] };
      rows.push(row);
    }
    row.runs.push(it);
  }
  rows.sort((a, b) => b.y - a.y);

  const lines: string[] = [];
  for (const row of rows) {
    const runs = [...row.runs].sort((a, b) => a.transform[4] - b.transform[4]);
    let out = '';
    let cursor: number | null = null;
    /** Whitespace owed before the next run: nothing, a space, or a column break. A tab always wins. */
    let owed: '' | ' ' | '\t' = '';
    for (const run of runs) {
      const x = run.transform[4];
      if (run.str.trim() === '') {
        // A blank run is the PDF's own spacing. Wide means a column gap; narrow means a word space.
        if (run.width > GAP_TAB) owed = '\t';
        else if (!owed) owed = ' ';
        cursor = x + run.width;
        continue;
      }
      if (cursor != null) {
        const gap = x - cursor;
        if (gap > GAP_TAB) owed = '\t';
        else if (gap > 1 && !owed) owed = ' ';
      }
      if (out) out += owed;
      out += run.str;
      owed = '';
      cursor = x + run.width;
    }
    const line = out.replace(/[ \t]+$/, '');
    if (line.trim()) lines.push(line);
  }
  return lines;
}

/**
 * What `pdf.js` needs and Hermes does not have. Installed only when missing, only when a PDF is read.
 * `structuredClone` is what the loopback worker port copies messages with; the objects crossing it are
 * plain data, arrays and typed arrays, which is all this clone handles.
 */
function installPolyfills(): void {
  const P = Promise as unknown as { withResolvers?: unknown };
  if (typeof P.withResolvers !== 'function') {
    P.withResolvers = function withResolvers<T>() {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (e?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
  const g = globalThis as { structuredClone?: unknown };
  if (typeof g.structuredClone !== 'function') g.structuredClone = (v: unknown) => clone(v, new Map());
}

function clone(v: unknown, seen: Map<object, unknown>): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (seen.has(v)) return seen.get(v);
  if (v instanceof Date) return new Date(v.getTime());
  if (v instanceof ArrayBuffer) return v.slice(0);
  if (ArrayBuffer.isView(v)) {
    const view = v as ArrayBufferView & { slice?: () => ArrayBufferView };
    return typeof view.slice === 'function' ? view.slice() : new Uint8Array(view.buffer.slice(0));
  }
  if (v instanceof Map) {
    const m = new Map();
    seen.set(v, m);
    for (const [k, val] of v) m.set(clone(k, seen), clone(val, seen));
    return m;
  }
  if (v instanceof Set) {
    const s = new Set();
    seen.set(v, s);
    for (const val of v) s.add(clone(val, seen));
    return s;
  }
  if (Array.isArray(v)) {
    const a: unknown[] = [];
    seen.set(v, a);
    for (const val of v) a.push(clone(val, seen));
    return a;
  }
  const o: Record<string, unknown> = {};
  seen.set(v, o);
  for (const k of Object.keys(v as object)) o[k] = clone((v as Record<string, unknown>)[k], seen);
  return o;
}

/**
 * Every page's text, top to bottom, one line per row, columns tab-separated, pages joined by a newline.
 * Rejects on an unreadable file; resolves to an empty string for a PDF with no text (a scan).
 */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  installPolyfills();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // The worker, on this thread — see the file comment. Idempotent: the module is evaluated once.
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

  /*
   * ⚠ A COPY, because `pdf.js` TRANSFERS the buffer it is given — the caller's bytes are detached
   * after the read, and a second read of the same file (a re-preview, a retry) fails with
   * "Cannot transfer object of unsupported type". Found by the test that reads one fixture twice.
   */
  const task = pdfjs.getDocument({
    data: data.slice(),
    useSystemFonts: false,
    disableFontFace: true,
    useWorkerFetch: false,
    // Warnings only: the library warns that no standard-font data URL was given. Text still comes
    // out — the fonts matter for drawing, and nothing here draws.
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p += 1) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // Marked-content markers ride along in `items`; only the runs carry text.
      const runs: PdfTextRun[] = [];
      for (const it of content.items) if ('str' in it) runs.push({ str: it.str, transform: it.transform, width: it.width });
      pages.push(itemsToLines(runs).join('\n'));
      page.cleanup();
    }
    return pages.filter((t) => t.trim()).join('\n');
  } finally {
    // The TASK is what tears the document and its loopback worker down in this version of the API.
    await task.destroy();
  }
}
