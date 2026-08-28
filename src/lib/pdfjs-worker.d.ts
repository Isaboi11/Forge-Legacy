/**
 * `pdfjs-dist` ships types for `legacy/build/pdf.mjs` but not for its worker build, which `pdf-text.ts`
 * imports for its side effect (it registers itself on `globalThis.pdfjsWorker`). Declared here so the
 * import type-checks; nothing is read from it.
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
