// Masters for every composition, one bundle: 60 fps H.264 at near-lossless quality with the score, ungraded
// (capture/deliver.sh grades and encodes the deliverables from these).
//   node capture/render.mjs HeroDesktop HeroPhone Ad15Desktop Ad15Phone   → out/master-<id>.mp4
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const ids = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const chromiumOptions = { gl: 'angle' };
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, chromiumOptions });
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl, composition, chromiumOptions, codec: 'h264', crf: 12, audioBitrate: '320k',
    outputLocation: `out/master-${id}.mp4`,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`${id} ${p * 10}%`); } },
  });
  console.log(`${id} done in ${Math.round((Date.now() - t0) / 1000)} s`);
}
