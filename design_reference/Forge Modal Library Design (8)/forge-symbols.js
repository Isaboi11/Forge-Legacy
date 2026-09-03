/*
 * Forge Legacy — Symbol Library
 * The single source of truth for every symbol in the app.
 *
 * Forged DNA (do not fork per-icon): 24x24 grid, fill:none, stroke=currentColor,
 * stroke-width 2, square linecaps, mitered joins. Color via `currentColor`
 * (set the parent element's `color`); size via width/height.
 *
 * Usage
 *   Plain / string:   el.innerHTML = ForgeSymbols.svg('home', { size: 24 });
 *   React (any DC):    ForgeSymbols.create(React, 'home', { size: 24, strokeWidth: 2 })
 *   Data:             ForgeSymbols.SYMBOLS['home']  ->  { name, category, path }
 *   Grouped:          ForgeSymbols.grouped()        ->  { Activities: [{id,name,inner}], ... }
 *
 * Exposed as `window.ForgeSymbols` and as a CommonJS module export.
 */
(function (root) {
  // id -> { name, category, path }.  `path` is the inner SVG (paths/circles only).
  var SYMBOLS = {
    // ---- Activities ----
    dumbbell:   { name: 'Dumbbell',      category: 'Activities', path: '<path d="M6.5 9v6"/><path d="M17.5 9v6"/><path d="M4 10.5v3"/><path d="M20 10.5v3"/><path d="M6.5 12h11"/>' },
    barbell:    { name: 'Barbell',       category: 'Activities', path: '<path d="M6.5 9v6"/><path d="M17.5 9v6"/><path d="M4 10.5v3"/><path d="M20 10.5v3"/><path d="M6.5 12h11"/>' },
    shoe:       { name: 'Running Shoe',  category: 'Activities', path: '<path d="M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z"/><path d="M9 12.5l1.4 1.3M11.3 10.9l1.4 1.3"/>' },
    footprints: { name: 'Footprints',    category: 'Activities', path: '<path d="M8 4.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C5.6 6 6.6 4.5 8 4.5z"/><path d="M7 12.8c1.1 0 1.6.9 1.6 1.9s-.5 1.6-1.6 1.6-1.6-.7-1.6-1.6.5-1.9 1.6-1.9z"/><path d="M16 8.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C13.8 10 14.6 8.5 16 8.5z"/><path d="M15 16.8c1.1 0 1.6.9 1.6 1.9s-.5 1.6-1.6 1.6-1.6-.7-1.6-1.6.5-1.9 1.6-1.9z"/>' },
    bicycle:    { name: 'Bicycle',       category: 'Activities', path: '<circle cx="5.5" cy="15.5" r="3.2"/><circle cx="18.5" cy="15.5" r="3.2"/><path d="M5.5 15.5l4-7h6"/><path d="M9.5 8.5l3 7"/><path d="M18.5 15.5l-3-7"/><path d="M8.3 8.5h2.4"/><path d="M14.3 8.5h2.4"/>' },
    swim:       { name: 'Swimming',      category: 'Activities', path: '<path d="M3 7.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 16.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>' },
    mountain:   { name: 'Mountain',      category: 'Activities', path: '<path d="M3 18.5L9 8l4.5 6.5L15.5 11 21 18.5z"/><path d="M7.2 10.8L9 8l1.8 2.8"/>' },
    glove:      { name: 'Boxing Glove',  category: 'Activities', path: '<path d="M6 8.5C6 6.6 7.4 5.5 9 5.5h3.5C15 5.5 17 7.3 17 9.8v1.7c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4z"/><path d="M6 11.5H4.6c-.9 0-1.6-.7-1.6-1.6S3.7 8.3 4.6 8.3H6"/><path d="M7 15.5h9V17c0 .9-.7 1.6-1.6 1.6H8.6C7.7 18.6 7 17.9 7 17z"/>' },
    lotus:      { name: 'Lotus',         category: 'Activities', path: '<path d="M12 19c-2.2 0-4-2.2-4-5 0-2.6 2-4.8 4-6.8 2 2 4 4.2 4 6.8 0 2.8-1.8 5-4 5z"/><path d="M12 19c-3.6 0-6.2-2-6.8-5 2.2-.9 4.2 0 5.3 1.6"/><path d="M12 19c3.6 0 6.2-2 6.8-5-2.2-.9-4.2 0-5.3 1.6"/>' },

    // ---- Progress ----
    shield:  { name: 'Shield',     category: 'Progress', path: '<path d="M12 3.4l6.8 2.6v5.3c0 4.2-2.8 7-6.8 8.6-4-1.6-6.8-4.4-6.8-8.6V6L12 3.4z"/><path d="M8.8 11l3.2 2.2 3.2-2.2"/>' },
    medal:   { name: 'Medal',      category: 'Progress', path: '<circle cx="12" cy="14.5" r="4.8"/><circle cx="12" cy="14.5" r="1.8"/><path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4"/>' },
    trophy:  { name: 'Trophy',     category: 'Progress', path: '<path d="M8 4h8v3.5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.3c0 2.4 1 3.6 2.9 3.9"/><path d="M16 5.5h2.7c0 2.4-1 3.6-2.9 3.9"/><path d="M12 11.5V15"/><path d="M9 19h6l-.6-4h-4.8z"/>' },
    flame:   { name: 'Flame',      category: 'Progress', path: '<path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z"/>' },
    laurel:  { name: 'Laurel',     category: 'Progress', path: '<path d="M10.61 19.17L9.91 19.00L9.24 18.76L8.59 18.45L7.97 18.09L7.40 17.67L6.87 17.19L6.38 16.66L5.95 16.09L5.58 15.48L5.27 14.83L5.03 14.16L4.85 13.47L4.74 12.76L4.70 12.05L4.73 11.33L4.83 10.63L5.00 9.93L5.24 9.26L5.54 8.61L5.90 7.99L6.32 7.41L6.80 6.88L7.32 6.40L7.89 5.96L8.50 5.59L9.15 5.28"/><path d="M9.50 18.86Q7.63 18.13 6.21 19.09Q7.75 19.84 9.50 18.86Z" fill="currentColor" stroke="none"/><path d="M7.21 17.51Q5.50 15.95 3.58 16.40Q4.92 17.84 7.21 17.51Z" fill="currentColor" stroke="none"/><path d="M5.55 15.43Q4.49 13.31 2.48 13.03Q3.24 14.91 5.55 15.43Z" fill="currentColor" stroke="none"/><path d="M4.75 12.89Q4.52 10.59 2.80 9.63Q2.83 11.61 4.75 12.89Z" fill="currentColor" stroke="none"/><path d="M4.92 10.23Q5.46 8.24 4.33 6.89Q3.72 8.55 4.92 10.23Z" fill="currentColor" stroke="none"/><path d="M6.02 7.81Q7.06 6.39 6.57 4.97Q5.58 6.10 6.02 7.81Z" fill="currentColor" stroke="none"/><path d="M7.92 5.95Q9.10 5.19 9.14 4.00Q8.08 4.56 7.92 5.95Z" fill="currentColor" stroke="none"/><path d="M13.39 19.17L14.09 19.00L14.76 18.76L15.41 18.45L16.03 18.09L16.60 17.67L17.13 17.19L17.62 16.66L18.05 16.09L18.42 15.48L18.73 14.83L18.97 14.16L19.15 13.47L19.26 12.76L19.30 12.05L19.27 11.33L19.17 10.63L19.00 9.93L18.76 9.26L18.46 8.61L18.10 7.99L17.68 7.41L17.20 6.88L16.68 6.40L16.11 5.96L15.50 5.59L14.85 5.28"/><path d="M14.50 18.86Q16.37 18.13 17.79 19.09Q16.25 19.84 14.50 18.86Z" fill="currentColor" stroke="none"/><path d="M16.79 17.51Q18.50 15.95 20.42 16.40Q19.08 17.84 16.79 17.51Z" fill="currentColor" stroke="none"/><path d="M18.45 15.43Q19.51 13.31 21.52 13.03Q20.76 14.91 18.45 15.43Z" fill="currentColor" stroke="none"/><path d="M19.25 12.89Q19.48 10.59 21.20 9.63Q21.17 11.61 19.25 12.89Z" fill="currentColor" stroke="none"/><path d="M19.08 10.23Q18.54 8.24 19.67 6.89Q20.28 8.55 19.08 10.23Z" fill="currentColor" stroke="none"/><path d="M17.98 7.81Q16.94 6.39 17.43 4.97Q18.42 6.10 17.98 7.81Z" fill="currentColor" stroke="none"/><path d="M16.08 5.95Q14.90 5.19 14.86 4.00Q15.92 4.56 16.08 5.95Z" fill="currentColor" stroke="none"/><path d="M10.61 19.17L14.99 21.27"/><path d="M13.39 19.17L9.01 21.27"/>' },
    banner:  { name: 'Banner',     category: 'Progress', path: '<path d="M6 4h12v14l-6-3.5L6 18z"/><path d="M6 8.5h12"/>' },
    spark:   { name: 'Spark',      category: 'Progress', path: '<path d="M11 3c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5z"/><path d="M18 13c.2 1.7.8 2.3 2.5 2.5-1.7.2-2.3.8-2.5 2.5-.2-1.7-.8-2.3-2.5-2.5 1.7-.2 2.3-.8 2.5-2.5z"/>' },
    book:    { name: 'Open Book',  category: 'Progress', path: '<path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5"/><path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z"/>' },

    // ---- Social ----
    friend: { name: 'Friend',          category: 'Social', path: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>' },
    squad:  { name: 'Squad',           category: 'Social', path: '<circle cx="7.5" cy="8" r="2.7"/><circle cx="16.5" cy="8" r="2.7"/><path d="M3 19.5a4.5 4.5 0 0 1 9 0"/><path d="M12 19.5a4.5 4.5 0 0 1 9 0"/>' },
    swords: { name: 'Challenge',       category: 'Social', path: '<path d="M5 4.5L18 17.5"/><path d="M19 4.5L6 17.5"/><path d="M12.7 15.8L16.3 12.2"/><path d="M7.7 12.2L11.3 15.8"/>' },
    train:  { name: 'Train Together',  category: 'Social', path: '<circle cx="7" cy="8.5" r="2.6"/><path d="M3 18a4 4 0 0 1 8 0"/><circle cx="17" cy="8.5" r="2.6"/><path d="M13 18a4 4 0 0 1 8 0"/>' },
    podium: { name: 'Leaderboard',     category: 'Social', path: '<path d="M9 20V10h6v10"/><path d="M4 20V13h5"/><path d="M20 20V15h-5"/><path d="M12 6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 8.2l2-.3z"/>' },
    invite: { name: 'Invite Person',   category: 'Social', path: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M18.5 7v6M15.5 10h6"/>' },

    // ---- Navigation ----
    home:     { name: 'Home',     category: 'Navigation', path: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>' },
    workouts: { name: 'Workouts', category: 'Navigation', path: '<path d="M6.5 9v6"/><path d="M17.5 9v6"/><path d="M4 10.5v3"/><path d="M20 10.5v3"/><path d="M6.5 12h11"/>' },
    legacy:   { name: 'Legacy',   category: 'Navigation', path: '<path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5"/><path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z"/>' },
    squads:   { name: 'Squads',   category: 'Navigation', path: '<circle cx="7.5" cy="8" r="2.7"/><circle cx="16.5" cy="8" r="2.7"/><path d="M3 19.5a4.5 4.5 0 0 1 9 0"/><path d="M12 19.5a4.5 4.5 0 0 1 9 0"/>' },
    explore:  { name: 'Explore',  category: 'Navigation', path: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>' },
    profile:  { name: 'Profile',  category: 'Navigation', path: '<circle cx="12" cy="8.5" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>' },

    // ---- Utility ----
    calendar: { name: 'Calendar',      category: 'Utility', path: '<path d="M4.5 6.5h15v13h-15z"/><path d="M4.5 10h15"/><path d="M8.5 4v4M15.5 4v4"/>' },
    clock:    { name: 'Clock',         category: 'Utility', path: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>' },
    stopwatch:{ name: 'Stopwatch',     category: 'Utility', path: '<circle cx="12" cy="13.5" r="7"/><path d="M12 6.5V4"/><path d="M9.8 3.5h4.4"/><path d="M12 13.5l3-2.4"/>' },
    target:   { name: 'Target',        category: 'Utility', path: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>' },
    search:   { name: 'Search',        category: 'Utility', path: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>' },
    bell:     { name: 'Notifications', category: 'Utility', path: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2.5H5z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>' },
    settings: { name: 'Settings',      category: 'Utility', path: '<path d="M4 8.5h16"/><path d="M4 15.5h16"/><circle cx="9" cy="8.5" r="2.2"/><circle cx="15" cy="15.5" r="2.2"/>' },
    share:    { name: 'Share',         category: 'Utility', path: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6"/>' },
    camera:   { name: 'Camera',        category: 'Utility', path: '<path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z"/><circle cx="12" cy="13" r="3.5"/>' },
    notes:    { name: 'Notes',         category: 'Utility', path: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12.5h6M9 16h4"/>' },

    // ---- Health ----
    apple: { name: 'Apple', category: 'Health', path: '<path d="M12 7.8c-1.2-1.8-3.8-2.3-5.2-.8-1.7 1.8-1 5.4.7 7.7C9 16 10 17 12 17s3-1 4.5-2.3c1.7-2.3 2.4-5.9.7-7.7-1.4-1.5-4-1-5.2.8z"/><path d="M12 7.8V5.2c0-1.4 1-2.4 2.6-2.4"/>' },
    water: { name: 'Water', category: 'Health', path: '<path d="M12 3.5c3 4 6 6.8 6 10.3a6 6 0 0 1-12 0c0-3.5 3-6.3 6-10.3z"/>' },
    moon:  { name: 'Moon',  category: 'Health', path: '<path d="M17 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 17 15.5z"/>' },
    leaf:  { name: 'Leaf',  category: 'Health', path: '<path d="M5 19C4 12 8 5 19 4c1 8-3 15-14 15z"/><path d="M5 19c3-4 7-8 11-10.5"/>' },
    heart: { name: 'Heart', category: 'Health', path: '<path d="M12 20C6.6 15.5 4 12.4 4 9.2A4 4 0 0 1 11.2 6.8L12 7.8 12.8 6.8A4 4 0 0 1 20 9.2C20 12.4 17.4 15.5 12 20z"/>' },
    scale: { name: 'Scale', category: 'Health', path: '<path d="M12 4.5v14"/><path d="M8.5 18.5h7"/><path d="M5 8h14"/><path d="M5 8l-2.2 4.4a2.8 2.8 0 0 0 5.6 0z"/><path d="M19 8l-2.2 4.4a2.8 2.8 0 0 0 5.6 0z"/>' },

    // ---- Brand ----
    // The Forge Legacy mark: three ascending pillars on a stepped plinth (the emblem, no wordmark).
    // Filled, not stroked — an emblem, carried on currentColor. Used for the completion seal.
    'forge-mark': { name: 'Forge Mark', category: 'Brand', path: '<path d="M10.9 3.2H13.1V15H10.9Z" fill="currentColor" stroke="none"/><path d="M7.6 7.1L9.6 5.8V15H7.6Z" fill="currentColor" stroke="none"/><path d="M16.4 7.1L14.4 5.8V15H16.4Z" fill="currentColor" stroke="none"/><path d="M6.8 15.4H17.2V16.2H6.8Z" fill="currentColor" stroke="none"/><path d="M5.6 16.6H18.4V17.4H5.6Z" fill="currentColor" stroke="none"/><path d="M4.4 17.8H19.6V18.6H4.4Z" fill="currentColor" stroke="none"/>' }
  };

  var CATEGORIES = ['Activities', 'Progress', 'Social', 'Navigation', 'Utility', 'Health', 'Brand'];

  // Canonical render attributes — the forged DNA. Never override per icon.
  var ICON_ATTRS = {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'square', strokeLinejoin: 'miter', strokeMiterlimit: 8
  };

  // Complete standalone SVG string (innerHTML / copy / <img> / server-render).
  function svg(id, opts) {
    opts = opts || {};
    var s = SYMBOLS[id];
    if (!s) return '';
    var size = opts.size || 24, sw = opts.strokeWidth || 2, color = opts.color || 'currentColor';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="' + sw +
      '" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="8">' + s.path + '</svg>';
  }

  // React element (pass your React). color inherits via CSS `color` on a parent.
  function create(React, id, opts) {
    opts = opts || {};
    var s = SYMBOLS[id];
    if (!s || !React) return null;
    return React.createElement('svg', {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: opts.strokeWidth || 2, strokeLinecap: 'square',
      strokeLinejoin: 'miter', strokeMiterlimit: 8,
      width: opts.size || 24, height: opts.size || 24, style: opts.style,
      dangerouslySetInnerHTML: { __html: s.path }
    });
  }

  // { Activities: [{ id, name, inner }], ... } in canonical category + insertion order.
  function grouped() {
    var g = {};
    CATEGORIES.forEach(function (c) { g[c] = []; });
    Object.keys(SYMBOLS).forEach(function (id) {
      var s = SYMBOLS[id];
      (g[s.category] = g[s.category] || []).push({ id: id, name: s.name, inner: s.path });
    });
    return g;
  }

  var API = {
    SYMBOLS: SYMBOLS,
    CATEGORIES: CATEGORIES,
    ICON_ATTRS: ICON_ATTRS,
    ids: Object.keys(SYMBOLS),
    svg: svg,
    create: create,
    grouped: grouped
  };

  root.ForgeSymbols = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
