// Paper Mode badge grade — shared by the run_script batches.
// Silhouette: largest connected component of content pixels (quarter-scale mask),
// then a per-row span from that component only, so opaque sources don't keep noise specks.
// Grade: bronze paper ramp, lighting direction preserved, restrained terracotta ember.
window.FLPaperGrade = function (helpers) {
  const { readImage, createCanvas, saveFile } = helpers;
  const hx = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
  const mk = stops => t => {
    t = Math.max(stops[0][0], Math.min(stops[stops.length-1][0], t));
    for (let i=1;i<stops.length;i++) {
      if (t<=stops[i][0]) { const a=stops[i-1], b=stops[i], f=(t-a[0])/(b[0]-a[0]);
        return [a[1][0]+(b[1][0]-a[1][0])*f, a[1][1]+(b[1][1]-a[1][1])*f, a[1][2]+(b[1][2]-a[1][2])*f]; }
    }
    return stops[stops.length-1][1].slice();
  };
  const smooth = (e0,e1,x) => { const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0))); return t*t*(3-2*t); };
  const RAMP = mk([[0,hx('#33281E')],[0.10,hx('#463424')],[0.28,hx('#6B5231')],[0.48,hx('#8E6E40')],[0.68,hx('#B2914F')],[0.85,hx('#D5BE8A')],[1,hx('#F0E7D2')]]);
  const EMBER = hx('#B4491C');

  return async function grade(name, opts) {
    const o = opts || {};
    const maskMax = o.maskMax != null ? o.maskMax : 18;
    const img = await readImage('assets/' + (o.src || name) + '.png');
    const W = img.width, H = img.height;
    const c = createCanvas(W, H), ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H), p = d.data;

    // rawGrade: colour-grade every pixel and keep the source alpha untouched. Used by
    // the die-cut post-process, which supplies its own geometric silhouette.
    if (o.rawGrade) {
      gradePixels(p);
      ctx.putImageData(d, 0, 0);
      await saveFile('assets/' + name + '-paper.png', c);
      return { name, w: W, h: H, raw: true };
    }

    // Which silhouette path? The alpha boundary is a usable outline on most families,
    // but craftsman is fully opaque and builder ships a near-full-width rectangle with
    // torn edges. Measure the source rather than hard-coding families: an alpha span
    // that fills the frame, or an edge that jumps around, means the alpha is not an
    // outline and the badge must be clipped to a fitted hexagon instead.
    let useHex = o.hexClip;
    if (useHex == null) {
      let ne=0, full=0, jumps=0, prev=-1;
      for (let y=0;y<H;y++) {
        let l=-1, r=-1;
        for (let x=0;x<W;x++) if (p[(y*W+x)*4+3]>24) { l=x; break; }
        for (let x=W-1;x>=0;x--) if (p[(y*W+x)*4+3]>24) { r=x; break; }
        if (l<0) continue;
        ne++;
        if (r-l+1 > 0.95*W) full++;
        if (prev>=0 && Math.abs(l-prev)>=4) jumps++;
        prev=l;
      }
      useHex = ne>0 && (full > ne*0.5 || jumps >= 28);
    }

    // Silhouette (default path): the source's own alpha boundary IS the badge outline.
    // Some families pad it with an opaque near-black rectangle, so each row is then
    // shrunk inward past near-black pixels. Purely local — it cannot invent debris,
    // cannot amputate the badge, and never touches interior darkness (unlike a
    // brightness mask, which discards the badges' own dark bronze frames).
    if (!useHex) {
      const dark = o.darkCut != null ? o.darkCut : 10;
      const SL = new Int32Array(H).fill(-1), SR = new Int32Array(H).fill(-1);
      const AL = new Int32Array(H).fill(-1), AR = new Int32Array(H).fill(-1);
      const dists = [];
      for (let y=0;y<H;y++) {
        let l=-1, r=-1;
        for (let x=0;x<W;x++) if (p[(y*W+x)*4+3]>24) { l=x; break; }
        for (let x=W-1;x>=0;x--) if (p[(y*W+x)*4+3]>24) { r=x; break; }
        if (l<0) continue;
        AL[y]=l; AR[y]=r;
        let l2=l, r2=r;
        while (l2<=r2) { const i=(y*W+l2)*4; if (Math.max(p[i],p[i+1],p[i+2])<=dark) l2++; else break; }
        while (r2>=l2) { const i=(y*W+r2)*4; if (Math.max(p[i],p[i+1],p[i+2])<=dark) r2--; else break; }
        if (l2<=r2) { SL[y]=l2; SR[y]=r2; dists.push((l2-l)+(r-r2)); }
      }
      // Only some families pad their cutout with an opaque near-black rectangle. Where
      // the alpha is already a tight outline, shrinking past dark pixels instead eats
      // the badge's own dark outer frame edge — so gate it on the typical shrink depth.
      dists.sort((a,b)=>a-b);
      // A faint speck just above the apex halts the inward walk and preserves the whole
      // span between the two outermost specks. The badge outline is monotonic from its
      // widest row outward, so reject any row whose span escapes its neighbour's.
      let yMax=-1, wMax=-1;
      for (let y=0;y<H;y++) if (SL[y]>=0 && SR[y]-SL[y] > wMax) { wMax=SR[y]-SL[y]; yMax=y; }
      // Walking outward from the widest row, a hexagon only ever narrows — so forbid
      // widening outright. Anything wider is surround, not badge (an above-apex sliver).
      const tol = 0;
      const walk = (from, to, step) => {
        let refL=SL[yMax], refR=SR[yMax];
        for (let y=from; step>0 ? y<=to : y>=to; y+=step) {
          if (SL[y]<0) continue;
          // Clamp only — never delete. Deleting a row is never right for body rows, and
          // a clamped speck above the apex is sub-pixel at any render size.
          const l = Math.max(SL[y], refL-tol), r = Math.min(SR[y], refR+tol);
          if (l>r) { refL=SL[y]; refR=SR[y]; continue; }  // no overlap: keep the row as-is
          SL[y]=l; SR[y]=r; refL=l; refR=r;
        }
      };
      if (yMax>=0) {
        // Clamp ONLY inside the apex tapers. In the middle the badge has straight walls
        // whose frame detail legitimately protrudes, and a no-widening rule there erodes
        // the sides row by row (it locked to the narrowest jitter value and shaved every
        // row). The tapers are the only place widening-away-from-centre is impossible.
        let yTop=-1, yBot=-1;
        for (let y=0;y<H;y++) if (SL[y]>=0) { if (yTop<0) yTop=y; yBot=y; }
        // The wall region is measured from the PROFILE, not a fixed fraction of height.
        // A hexagon doesn't reach full width until ~19-20% down, so a fixed 15% band
        // treats taper rows as wall and snaps them out to full width — which paints
        // square 90-degree corners at the top and bottom.
        let wMaxW = 0;
        for (let y=yTop;y<=yBot;y++) if (SL[y]>=0) wMaxW = Math.max(wMaxW, SR[y]-SL[y]+1);
        let wallY0=-1, wallY1=-1;
        for (let y=yTop;y<=yBot;y++) {
          if (SL[y]<0) continue;
          if (SR[y]-SL[y]+1 >= wMaxW*0.985) { if (wallY0<0) wallY0=y; wallY1=y; }
        }
        if (wallY0<0) { wallY0=yTop; wallY1=yBot; }
        walk(Math.min(wallY0, yMax-1), yTop, -1);
        walk(Math.max(wallY1, yMax+1), yBot, 1);
        // Median-filter the wall edges. The walls are straight over long runs, so a
        // short-lived protrusion (a 3px nub in the source alpha) is noise; a median is
        // immune to it while sustained frame detail survives. Tapers are excluded so
        // the apex corners aren't rounded off.
        const med = (arr, sign, half, from, to) => {
          const out = arr.slice();
          for (let y=from; y<=to; y++) {
            if (arr[y]<0) continue;
            const win=[];
            for (let k=-half;k<=half;k++) { const j=y+k; if (j>=0 && j<H && arr[j]>=0) win.push(arr[j]); }
            if (win.length < half+2) continue;
            win.sort((a,b)=>a-b);
            out[y] = win[win.length>>1];
          }
          return out;
        };
        // Wide window on the straight walls; narrow window everywhere else to smooth the
        // stair-stepped tapers (a median over a monotone ramp returns the exact value, so
        // the apex corners are not rounded).
        let l1 = med(SL, 1, 7, wallY0, wallY1), r1 = med(SR, -1, 7, wallY0, wallY1);
        const sh = o.smoothHalf != null ? o.smoothHalf : 3;
        l1 = med(l1, 1, sh, yTop+1, yBot-1); r1 = med(r1, -1, sh, yTop+1, yBot-1);
        for (let y=0;y<H;y++) { SL[y]=l1[y]; SR[y]=r1[y]; }
        // Some sources (legacy) have a stepped wall: the alpha edge alternates in long
        // blocks between the real frame line and extraneous blocks a few px off it.
        // A median can't remove a sustained block, and clamping inward can't pull an
        // inset row back out — so snap wall rows to the DOMINANT (modal) edge level in
        // both directions. Newly-extended pixels are painted by the horizontal hole-fill
        // below. Families whose wall already sits on one level are unaffected.
        const mode = arr => {
          const count = new Map();
          for (let y=wallY0; y<=wallY1; y++) {
            if (arr[y]<0) continue;
            count.set(arr[y], (count.get(arr[y])||0)+1);
          }
          let bv=null, bn=0, tot=0;
          for (const [v,n] of count) { tot+=n; if (n>bn) { bn=n; bv=v; } }
          return (tot>=20 && bn >= tot*0.35) ? bv : null;
        };
        const mL = mode(SL), mR = mode(SR);
        if (mL!=null && mR!=null) for (let y=wallY0; y<=wallY1; y++) {
          if (SL[y]<0) continue;
          SL[y]=mL; SR[y]=mR;
        }
      }
      // Drop detached fringes: a run of rows separated from the body by empty rows and
      // small relative to the badge (e.g. a glow wisp above the apex) is not the badge.
      const runs=[]; let s=-1;
      for (let y=0;y<=H;y++) {
        const on = y<H && SL[y]>=0;
        if (on && s<0) s=y;
        if (!on && s>=0) { runs.push([s,y-1]); s=-1; }
      }
      if (runs.length>1) {
        let big=0; for (let k=1;k<runs.length;k++) if (runs[k][1]-runs[k][0] > runs[big][1]-runs[big][0]) big=k;
        const span = runs[big][1]-runs[big][0]+1;
        for (let k=0;k<runs.length;k++) {
          if (k===big) continue;
          if (runs[k][1]-runs[k][0]+1 < span*0.06) for (let y=runs[k][0];y<=runs[k][1];y++) { SL[y]=-1; SR[y]=-1; }
        }
      }
      for (let y=0;y<H;y++) {
        const l=SL[y], r=SR[y];
        for (let x=0;x<W;x++) if (l<0 || x<l || x>r) p[(y*W+x)*4+3]=0;
      }
      // Fill interior holes: a badge is a solid object, so a transparent pixel inside
      // the silhouette is a source defect (legacy's numeral plate is riddled with them,
      // invisible black-on-black in dark mode but cream slots on paper). Fill from the
      // nearest opaque pixel in the SAME ROW first — a vertical search up a 35-row slot
      // reaches past the plate into the artwork and smears one bright pixel downward.
      for (let y=0;y<H;y++) {
        if (SL[y]<0) continue;
        const src = new Int32Array(SR[y]-SL[y]+1).fill(-1);
        for (let x=SL[y];x<=SR[y];x++) {
          if (p[(y*W+x)*4+3]>24) continue;
          for (let k=1;k<=W;k++) {
            const lx=x-k, rx=x+k;
            if (lx>=SL[y] && p[(y*W+lx)*4+3]>24) { src[x-SL[y]]=lx; break; }
            if (rx<=SR[y] && p[(y*W+rx)*4+3]>24) { src[x-SL[y]]=rx; break; }
          }
        }
        for (let x=SL[y];x<=SR[y];x++) {
          const bx=src[x-SL[y]];
          if (bx<0) continue;
          const a=(y*W+x)*4, b=(y*W+bx)*4;
          p[a]=p[b]; p[a+1]=p[b+1]; p[a+2]=p[b+2]; p[a+3]=255;
        }
      }
      for (let y=0;y<H;y++) {
        if (SL[y]<0) continue;
        for (let x=SL[y];x<=SR[y];x++) {
          const a=(y*W+x)*4;
          if (p[a+3]>24) continue;
          let src=-1;
          for (let k=1;k<H;k++) {
            const up=y-k, dn=y+k;
            if (up>=0 && SL[up]>=0 && x>=SL[up] && x<=SR[up] && p[(up*W+x)*4+3]>24) { src=up; break; }
            if (dn<H && SL[dn]>=0 && x>=SL[dn] && x<=SR[dn] && p[(dn*W+x)*4+3]>24) { src=dn; break; }
          }
          if (src<0) continue;
          const b=(src*W+x)*4;
          p[a]=p[b]; p[a+1]=p[b+1]; p[a+2]=p[b+2]; p[a+3]=255;
        }
      }
    } else {
      // Opaque sources (craftsman) carry a lit near-black surround whose brightness
      // varies per file, so no threshold separates it. These badges are all the same
      // pointy-top hexagon, so clip to one fitted geometrically: a percentile-robust
      // bbox (rejecting surround specks) with the shoulders at 19% / 81% of height.
      let x0=W,x1=-1,y0=H,y1=-1;
      const rowN=new Int32Array(H), colN=new Int32Array(W);
      for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
        const i=(y*W+x)*4;
        if (p[i+3]>24 && Math.max(p[i],p[i+1],p[i+2])>maskMax) { rowN[y]++; colN[x]++; }
      }
      for (let y=0;y<H;y++) if (rowN[y] > W*0.06) { if (y<y0) y0=y; y1=y; }
      for (let x=0;x<W;x++) if (colN[x] > H*0.06) { if (x<x0) x0=x; x1=x; }
      const bw=x1-x0, bh=y1-y0, cxm=(x0+x1)/2;
      // o.hex overrides the fit for bad source crops: {cx, hw, y0, y1} in source px.
      const HX = o.hex || null;
      const cx2 = HX ? HX.cx : cxm, hw2 = HX ? HX.hw : bw/2;
      const ty0 = HX ? HX.y0 : y0, tbh = HX ? (HX.y1 - HX.y0) : bh;
      const shoulder = y => {
        const t=(y-ty0)/tbh;
        if (t<0||t>1) return -1;
        if (t<0.19) return (t/0.19)*hw2;
        if (t>0.81) return ((1-t)/0.19)*hw2;
        return hw2;
      };
      for (let y=0;y<H;y++) {
        const hw=shoulder(y);
        for (let x=0;x<W;x++) if (hw<0 || x<cx2-hw || x>cx2+hw) p[(y*W+x)*4+3]=0;
      }
      // Repair transparent seams inside the fitted hexagon (builder severs its numeral
      // plate from the body with rows that were invisible black-on-black in dark mode).
      for (let y=0;y<H;y++) {
        if (shoulder(y)<0) continue;
        let any=false;
        for (let x=0;x<W && !any;x++) if (p[(y*W+x)*4+3]>24) any=true;
        if (any) continue;
        let src=-1;
        for (let k=1;k<H;k++) {
          const up=y-k, dn=y+k;
          const has = yy => { if (yy<0||yy>=H||shoulder(yy)<0) return false;
            for (let x=0;x<W;x++) if (p[(yy*W+x)*4+3]>24) return true; return false; };
          if (has(up)) { src=up; break; }
          if (has(dn)) { src=dn; break; }
        }
        if (src<0) continue;
        for (let x=0;x<W;x++) {
          const a=(y*W+x)*4, b=(src*W+x)*4;
          p[a]=p[b]; p[a+1]=p[b+1]; p[a+2]=p[b+2]; p[a+3]=p[b+3];
        }
      }
    }

    // Force full opacity inside the silhouette. The sources carry partial-alpha columns
    // (28/85/170) through the plate: invisible over black, but on cream a dark pixel at
    // alpha 28 composites to near-cream and reads as a pale streak. Only the outermost
    // pixel of each row stays anti-aliased, so the outline keeps its soft edge.
    for (let y=0;y<H;y++) {
      let l=-1, r=-1;
      for (let x=0;x<W;x++) if (p[(y*W+x)*4+3]>0) { l=x; break; }
      for (let x=W-1;x>=0;x--) if (p[(y*W+x)*4+3]>0) { r=x; break; }
      if (l<0) continue;
      for (let x=l+1;x<r;x++) { const a=(y*W+x)*4; if (p[a+3]>0) p[a+3]=255; }
    }

    // --- grade
    gradePixels(p);
    ctx.putImageData(d, 0, 0);
    await saveFile('assets/' + name + '-paper.png', c);
    return { name, w: W, h: H };
  };

  function gradePixels(p) {
    for (let i=0;i<p.length;i+=4) {
      if (p[i+3]===0) continue;
      const r=p[i]/255, g=p[i+1]/255, b=p[i+2]/255;
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      const sat = mx===0 ? 0 : (mx-mn)/mx;
      const lum = 0.2126*r + 0.7152*g + 0.0722*b;
      let hue=0;
      if (mx!==mn) {
        if (mx===r) hue=60*(((g-b)/(mx-mn))%6);
        else if (mx===g) hue=60*((b-r)/(mx-mn)+2);
        else hue=60*((r-g)/(mx-mn)+4);
        if (hue<0) hue+=360;
      }
      let [oR,oG,oB] = RAMP(Math.pow(lum, 0.92));
      oR += (r-lum)*14; oG += (g-lum)*14; oB += (b-lum)*14;
      const em = smooth(0.82,0.94,sat) * smooth(30,19,hue) * smooth(0.14,0.34,lum) * 0.42;
      if (em>0) {
        const boost = 0.80+0.5*lum;
        oR = oR*(1-em)+EMBER[0]*boost*em;
        oG = oG*(1-em)+EMBER[1]*boost*em;
        oB = oB*(1-em)+EMBER[2]*boost*em;
      }
      p[i]=Math.max(0,Math.min(255,oR)); p[i+1]=Math.max(0,Math.min(255,oG)); p[i+2]=Math.max(0,Math.min(255,oB));
    }
  }
};
