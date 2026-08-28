// Babel — Expo's preset plus one plugin.
//
// ⚠ `pdfjs-dist` (the PDF import, `src/lib/pdf-text.ts`) carries TWO pieces of syntax that Hermes
// cannot parse, both inside branches that never run here:
//
//   1. `import.meta.url` in its Node-only branches. Metro leaves `import.meta` in place, and in a
//      Hermes bundle that is a SYNTAX error — not a broken feature but an app that fails to load,
//      every screen, on every phone the OTA reaches. Replaced with an empty object.
//   2. `await import(this.workerSrc)` — a dynamic import whose specifier is a VARIABLE. Metro can only
//      rewrite `import('literal')`; a non-literal one passes through untouched and `hermesc` refuses
//      the whole bundle with "Invalid expression encountered". Build 8 (2026-08-28) died on exactly
//      this, twice: `PDFWorker._setupFakeWorkerGlobal` in pdf.mjs, and the worker's own loader. Neither
//      is reached — `pdf-text.ts` evaluates `pdf.worker.mjs` on the main thread first, so pdfjs takes
//      the `#mainThreadWorkerMessageHandler` branch above the import. It only has to PARSE. Replaced
//      with a rejected promise so that, if the branch is ever reached, the failure is a message and
//      not a silent hang.
//
// The web bundle never goes through `hermesc`, which is why both shipped green on the web preview:
// `npx expo export --platform ios` is the check that actually runs the compiler — run it before any
// native build. `pdf-text.test.mjs`'s export gate greps the produced bundles for `import.meta`.
//
// `api.cache(true)` because nothing here depends on the environment.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [hermesSafePdfjs],
  };
};

const DYNAMIC_IMPORT_MESSAGE =
  'Dynamic import() with a non-literal specifier is not supported in this bundle (forge babel.config.js)';

/**
 * `import.meta` → `({})`; `import(<non-literal>)` → `Promise.reject(new Error(...))`.
 *
 * Literal dynamic imports (`import('pdfjs-dist/legacy/build/pdf.mjs')`) are left alone — Metro turns
 * those into async requires and they are how the PDF library is loaded at all. Babel represents the
 * call either as a CallExpression whose callee is `Import` (Babel 7 default) or as an ImportExpression
 * (`createImportExpressions`); both are handled so a preset upgrade cannot silently reopen the hole.
 */
function hermesSafePdfjs({ types: t }) {
  const isLiteralSpecifier = (node) =>
    t.isStringLiteral(node) || (t.isTemplateLiteral(node) && node.expressions.length === 0);
  const rejected = () =>
    t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('reject')), [
      t.newExpression(t.identifier('Error'), [t.stringLiteral(DYNAMIC_IMPORT_MESSAGE)]),
    ]);
  return {
    name: 'forge-hermes-safe-pdfjs',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([]));
        }
      },
      CallExpression(path) {
        if (t.isImport(path.node.callee) && !isLiteralSpecifier(path.node.arguments[0])) {
          path.replaceWith(rejected());
        }
      },
      ImportExpression(path) {
        if (!isLiteralSpecifier(path.node.source)) {
          path.replaceWith(rejected());
        }
      },
    },
  };
}
