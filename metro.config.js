// Metro — Expo's defaults plus one resolver rule.
//
// ⚠ `pdfjs-dist` (the PDF import, `src/lib/pdf-text.ts`) carries Node-only branches that
// `require("@napi-rs/canvas")` — a native Node binding, installed as an optional dependency, that
// Metro cannot bundle (it loads `.node` binaries). The branches never run outside Node, but Metro
// resolves what it can see. Mapping the package to an empty module keeps it out of every bundle.
//
// Nothing else is changed here; a project that had no `metro.config.js` for three months should not
// grow opinions in it now.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@napi-rs/canvas' || moduleName.startsWith('@napi-rs/canvas-')) {
    return { type: 'empty' };
  }
  return upstreamResolve
    ? upstreamResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
