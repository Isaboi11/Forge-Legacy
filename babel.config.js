// Babel — Expo's preset plus one plugin.
//
// ⚠ `pdfjs-dist` (the PDF import, `src/lib/pdf-text.ts`) uses `import.meta.url` inside its Node-only
// branches. Metro leaves `import.meta` in place, and in a Hermes bundle that is a SYNTAX error — not a
// broken feature but an app that fails to load, every screen, on every phone the OTA reaches. The
// branches are dead outside Node, so the expression is replaced with an empty object before Metro
// ever sees it. `pdf-text.test.mjs`'s export gate greps the produced bundles for `import.meta`.
//
// `api.cache(true)` because nothing here depends on the environment.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [stripImportMeta],
  };
};

/** `import.meta` → `({})`. Only the MetaProperty node; a member access on it becomes `undefined`. */
function stripImportMeta({ types: t }) {
  return {
    name: 'forge-strip-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([]));
        }
      },
    },
  };
}
