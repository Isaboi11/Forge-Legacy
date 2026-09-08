// Die-cut post-process for badge families whose source alpha is not a usable outline.
// Cuts a clean sticker silhouette — a pointy-top hexagon unioned with an octagonal
// numeral plate — from a raw-graded image, filling any transparent pixel inside the
// cut from the nearest opaque neighbour, and anti-aliasing the cut edge.
//
// geom: { cx, hw, yTop, yApex, plate: { pw, yTop, yBot, chamfer } }
//   hexagon: apex at (cx,yTop), shoulders at hw wide, walls, bottom apex at yApex.
//   taper length = 0.56 * hw (measured on foundation/builder/craftsman: 91-93 rows for hw 159-167)
window.FLDieCut = function (helpers) {
  const { readImage, createCanvas, saveFile } = helpers;
  return async function dieCut(name, geom, opts) {
    const o = opts || {};
    const img = await readImage('assets/' + name + '-paper.png');
    const W = img.width, H0 = img.height;
    const H = Math.max(H0, Math.ceil(geom.plate ? geom.plate.yBot + 2 : geom.yApex + 2));
    const c = createCanvas(W, H), ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H), p = d.data;

    const taper = geom.taper != null ? geom.taper : Math.round(geom.hw * 0.56);
    const wall0 = geom.yTop + taper, wall1 = geom.yApex - taper;
    // hexagon half-width at row y (sub-pixel), or -1 outside
    const hexHW = y => {
      if (y < geom.yTop || y > geom.yApex) return -1;
      if (y < wall0) return geom.hw * (y - geom.yTop) / taper;
      if (y > wall1) return geom.hw * (geom.yApex - y) / taper;
      return geom.hw;
    };
    const P = geom.plate;
    const plateHW = y => {
      if (!P || y < P.yTop || y > P.yBot) return -1;
      const cTop = P.chamferTop != null ? P.chamferTop : 0;
      const cBot = P.chamfer;
      if (y < P.yTop + cTop) return P.pw - (cTop - (y - P.yTop));
      if (y > P.yBot - cBot) return P.pw - (cBot - (P.yBot - y));
      return P.pw;
    };
    // coverage via 3x3 supersampling of the union
    const inside = (x, y) => {
      const hh = hexHW(y), ph = plateHW(y);
      const dx = Math.abs(x - geom.cx);
      return (hh >= 0 && dx <= hh) || (ph >= 0 && dx <= ph);
    };
    const cov = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0;
      for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) if (inside(x + sx / 3, y + sy / 3)) n++;
      cov[y * W + x] = n / 9;
    }
    // fill: any pixel with coverage>0 that is transparent takes the nearest opaque pixel
    // in its row (plate slots), else the nearest in its column (severed plate rows).
    const opaque = i => p[i * 4 + 3] > 24;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (cov[i] === 0 || opaque(i)) continue;
      let src = -1;
      for (let k = 1; k < W && src < 0; k++) {
        if (x - k >= 0 && cov[i - k] > 0 && opaque(i - k)) src = i - k;
        else if (x + k < W && cov[i + k] > 0 && opaque(i + k)) src = i + k;
      }
      if (src < 0) for (let k = 1; k < H && src < 0; k++) {
        if (y - k >= 0 && opaque(i - k * W)) src = i - k * W;
        else if (y + k < H && opaque(i + k * W)) src = i + k * W;
      }
      if (src < 0) continue;
      p[i * 4] = p[src * 4]; p[i * 4 + 1] = p[src * 4 + 1]; p[i * 4 + 2] = p[src * 4 + 2]; p[i * 4 + 3] = 255;
    }
    // (second pass so pixels filled from row neighbours can seed column fills of severed rows)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (cov[i] === 0 || opaque(i)) continue;
      let src = -1;
      for (let k = 1; k < H && src < 0; k++) {
        if (y - k >= 0 && cov[i - k * W] > 0 && opaque(i - k * W)) src = i - k * W;
        else if (y + k < H && cov[i + k * W] > 0 && opaque(i + k * W)) src = i + k * W;
      }
      if (src < 0) continue;
      p[i * 4] = p[src * 4]; p[i * 4 + 1] = p[src * 4 + 1]; p[i * 4 + 2] = p[src * 4 + 2]; p[i * 4 + 3] = 255;
    }
    // apply the cut
    for (let i = 0; i < W * H; i++) p[i * 4 + 3] = Math.round(255 * cov[i] * (p[i * 4 + 3] > 0 ? 1 : 0));
    ctx.putImageData(d, 0, 0);
    await saveFile('assets/' + name + '-paper.png', c);
    return { name, W, H, wall0, wall1 };
  };
};
