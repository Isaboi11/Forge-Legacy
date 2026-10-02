// Stills at real-time seconds from any composition, one bundle for all of them (a `remotion still` call per frame
// re-bundles and re-copies public/ every time).
//   node capture/stills.mjs HeroPhone out/p 2.0 9.3 25.5 …   → out/p-2.0.jpg …
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const [id, prefix, ...secs] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: 'angle' } });
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * composition.fps));
  await renderStill({ serveUrl, composition, frame, output: `${prefix}-${s}.jpg`, imageFormat: 'jpeg', jpegQuality: 90, chromiumOptions: { gl: 'angle' } });
  console.log(`${prefix}-${s}.jpg`);
}
