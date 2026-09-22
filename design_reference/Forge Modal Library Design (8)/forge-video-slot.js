/*
 * <forge-video-slot> — drag-and-drop (or click) video placeholder that persists.
 *
 * Why not image-slot.js: that component only accepts still images and re-encodes to
 * WebP. Videos are large and binary, so this stores the dropped file as a Blob in
 * IndexedDB (keyed by the slot's id) and replays it on reload. Autoplays muted+looped
 * like a showcase reel. Author controls shape/fit via attributes.
 *
 * Usage:  <forge-video-slot id="ll-hero" placeholder="Drop a lifting clip"></forge-video-slot>
 * Fill it by dragging a .mp4/.webm/.mov onto it, or click to pick.
 */
(function () {
  if (customElements.get('forge-video-slot')) return;

  var DB = 'forge-video-slots', STORE = 'clips', VER = 1;
  var ACCEPT = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

  function openDB() {
    return new Promise(function (resolve, reject) {
      var rq = indexedDB.open(DB, VER);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
  }
  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        tx.onsuccess = function () { resolve(tx.result || null); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(key, val) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
        tx.onsuccess = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { return false; });
  }

  var proto = Object.create(HTMLElement.prototype);

  proto.connectedCallback = function () {
    if (this._built) return;
    this._built = true;
    var self = this;

    this.style.display = this.style.display || 'block';
    this.style.position = this.style.position || 'relative';
    this.style.width = this.style.width || '100%';
    this.style.height = this.style.height || '100%';
    this.style.overflow = 'hidden';
    this.style.cursor = 'pointer';
    this.style.background = '#050609';

    var radius = this.getAttribute('radius') || '0';
    var fit = this.getAttribute('fit') || 'cover';
    var placeholder = this.getAttribute('placeholder') || 'Drop a video clip';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;border-radius:' + radius + ';overflow:hidden;';

    var video = document.createElement('video');
    video.muted = true; video.loop = true; video.autoplay = true;
    video.playsInline = true; video.setAttribute('playsinline', '');
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:' + fit + ';display:none;background:#050609;';

    var ph = document.createElement('div');
    ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:20px;' +
      'color:#8A6B41;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    ph.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.85">' +
      '<rect x="2" y="4" width="14" height="16" rx="2"></rect><path d="M16 9l6-3v12l-6-3z"></path></svg>' +
      '<span style="font-size:12px;font-weight:600;letter-spacing:.4px;color:#9A8567">' + placeholder + '</span>' +
      '<span style="font-size:10px;color:#5F5648">MP4 · WebM · MOV — click or drag</span>';

    var err = document.createElement('div');
    err.style.cssText = 'position:absolute;left:0;right:0;bottom:0;padding:8px 10px;font:600 10px/1.3 -apple-system,sans-serif;color:#E0A090;background:rgba(40,12,8,.85);display:none;text-align:center;';

    var input = document.createElement('input');
    input.type = 'file'; input.accept = ACCEPT.join(','); input.hidden = true;

    wrap.appendChild(video); wrap.appendChild(ph); wrap.appendChild(err); wrap.appendChild(input);
    this.appendChild(wrap);
    this._video = video; this._ph = ph; this._err = err;

    var showErr = function (m) { err.textContent = m; err.style.display = m ? 'block' : 'none'; };

    var setBlob = function (blob) {
      if (self._url) { try { URL.revokeObjectURL(self._url); } catch (e) {} }
      self._url = URL.createObjectURL(blob);
      video.src = self._url;
      video.style.display = 'block';
      ph.style.display = 'none';
      video.play().catch(function () {});
    };

    var ingest = function (file) {
      showErr(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        showErr('Drop an MP4, WebM, or MOV video.');
        return;
      }
      if (file.size > 60 * 1024 * 1024) {
        showErr('Video is over 60MB — use a shorter/compressed clip.');
        return;
      }
      setBlob(file);
      if (self.id) idbSet(self.id, file);
    };

    // click to pick
    this.addEventListener('click', function (e) {
      if (e.target === video) return;
      input.click();
    });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (f) ingest(f);
      input.value = '';
    });

    // drag & drop
    ['dragenter', 'dragover'].forEach(function (t) {
      self.addEventListener(t, function (e) {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        self.style.outline = '2px solid rgba(191,143,79,.6)';
        self.style.outlineOffset = '-2px';
      });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      self.addEventListener(t, function (e) {
        e.preventDefault(); e.stopPropagation();
        self.style.outline = 'none';
        if (t === 'drop') {
          var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) ingest(f);
        }
      });
    });

    // restore persisted clip
    if (this.id) {
      idbGet(this.id).then(function (blob) {
        if (blob) setBlob(blob);
      });
    }
  };

  proto.disconnectedCallback = function () {
    if (this._url) { try { URL.revokeObjectURL(this._url); } catch (e) {} }
  };

  var VideoSlot = function () { return Reflect.construct(HTMLElement, [], VideoSlot); };
  VideoSlot.prototype = proto;
  Object.setPrototypeOf(VideoSlot, HTMLElement);
  customElements.define('forge-video-slot', VideoSlot);
})();
