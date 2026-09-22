/*
 * Forge Legacy — Pinned Legacy catalog (single source of truth).
 *
 * The athlete curates a "museum" of proudest moments on the Legacy hub; the same
 * curation must surface on their own Public Profile (self view). Both screens read
 * the selection from localStorage key `forge.legacy.pins` (an ordered array of ids)
 * and resolve display data against this shared CATALOG so the two never drift.
 *
 * Data only — no React elements here. Each screen attaches its own glyphs from the
 * `icon` name (via its local ForgeSymbols factory) so this module stays framework-free.
 */
(function () {
  var CATALOG = [
    { id: 'xf-12wo',       kind: 'Transformation', title: '12 Weeks Out', sub: 'Transformation \u00B7 Mar 2026', isPhoto: true,  isEmblem: false, isVideo: false, mediaId: 'legacy-pin-1', icon: null },
    { id: 'ac-dl405',      kind: 'Accomplishment', title: 'Deadlift 405', sub: 'Accomplishment \u00B7 Oct 2025', isPhoto: true,  isEmblem: false, isVideo: true,  mediaId: 'legacy-pin-2', icon: null },
    { id: 'hon-unbroken',  kind: 'Honor',          title: 'The Unbroken', sub: 'Honor \u00B7 Apr 2026',          isPhoto: false, isEmblem: true,  isVideo: false, icon: 'laurel' },
    { id: 'hon-century',   kind: 'Honor',          title: 'Century',      sub: 'Honor \u00B7 Oct 2025',          isPhoto: false, isEmblem: true,  isVideo: false, icon: 'medal' },
    { id: 'ch-ironborn',   kind: 'Chapter',        title: 'Ironborn',     sub: 'Chapter II \u00B7 Sealed',       isPhoto: false, isEmblem: true,  isVideo: false, icon: 'chapter-seal' },
    { id: 'ac-first5k',    kind: 'Accomplishment', title: 'First 5K',     sub: 'Accomplishment \u00B7 Aug 2025', isPhoto: false, isEmblem: true,  isVideo: false, icon: 'spark' },
    { id: 'hon-firstiron', kind: 'Honor',          title: 'First Iron',   sub: 'Honor \u00B7 Aug 2025',          isPhoto: false, isEmblem: true,  isVideo: false, icon: 'shield' }
  ];
  var DEFAULT_PINS = ['xf-12wo', 'ac-dl405', 'hon-unbroken'];
  var CAP = 6;
  var KEY = 'forge.legacy.pins';

  function map() { var m = {}; for (var i = 0; i < CATALOG.length; i++) m[CATALOG[i].id] = CATALOG[i]; return m; }
  function read() {
    try { var p = JSON.parse(window.localStorage.getItem(KEY) || 'null'); return Array.isArray(p) ? p : DEFAULT_PINS.slice(); }
    catch (e) { return DEFAULT_PINS.slice(); }
  }
  function write(ids) { try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} }
  function resolve(ids) { var m = map(); return (ids || read()).map(function (id) { return m[id]; }).filter(Boolean); }

  window.ForgeLegacyPins = { CATALOG: CATALOG, DEFAULT_PINS: DEFAULT_PINS, CAP: CAP, KEY: KEY, byId: map, read: read, write: write, resolve: resolve };
})();
