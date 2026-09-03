/* forge-anim.js — plays an exercise animation MP4 and keys out the baked-in
   checkerboard "transparency preview" (two flat grays: #D2D2D2 and #A1A1A1)
   in real time on a canvas, so the white figure + amber muscle glow can be
   previewed on a dark surface. Preview/inspection tool — NOT production.
   Usage: <forge-anim src="assets/anim-curl-preview.mp4" fit="contain"></forge-anim> */
(function () {
  if (customElements.get('forge-anim')) return;

  class ForgeAnim extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      this.style.display = this.style.display || 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';

      const fit = this.getAttribute('fit') || 'contain';
      const doKey = this.getAttribute('key') !== 'off';

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:' + fit + ';';
      this._canvas = canvas;
      this._octx = canvas.getContext('2d');
      this.appendChild(canvas);

      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = this.getAttribute('src');
      this._v = v;
      this._doKey = doKey;

      const work = document.createElement('canvas');
      this._work = work;
      this._wctx = work.getContext('2d', { willReadFrequently: true });

      v.addEventListener('loadedmetadata', () => {
        canvas.width = work.width = v.videoWidth || 640;
        canvas.height = work.height = v.videoHeight || 360;
      });
      v.play().catch(() => {});
      const loop = () => {
        this._raf = requestAnimationFrame(loop);
        this._draw();
      };
      this._raf = requestAnimationFrame(loop);
    }

    disconnectedCallback() { if (this._raf) cancelAnimationFrame(this._raf); }

    _draw() {
      const v = this._v;
      if (!v || v.readyState < 2 || !this._work.width) return;
      const wctx = this._wctx, octx = this._octx;
      wctx.drawImage(v, 0, 0, this._work.width, this._work.height);
      if (this._doKey) {
        const img = wctx.getImageData(0, 0, this._work.width, this._work.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn < 8) {                       // strictly neutral gray
            const n210 = Math.abs(r - 210) < 10;   // light checker square
            const n161 = Math.abs(r - 161) < 10;   // dark  checker square
            if (n210 || n161) d[i + 3] = 0;
          }
        }
        octx.putImageData(img, 0, 0);
      } else {
        octx.clearRect(0, 0, this._work.width, this._work.height);
        octx.drawImage(v, 0, 0, this._work.width, this._work.height);
      }
    }
  }
  customElements.define('forge-anim', ForgeAnim);
})();
