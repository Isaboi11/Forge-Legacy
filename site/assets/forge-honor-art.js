/*
 * Forge Legacy — HONOR MEDAL ART  (the engraved artwork that fills Insignia's slot)
 *
 * The Insignia component ships the bronze bezel + recessed disc and leaves the
 * artwork deferred. This file IS that artwork: one struck medal face per honor,
 * composed from four layers on a single 64x64 grid so 179 medals read as one set.
 *
 *   1 FRAME   — the category silhouette, engraved inside the disc (14 frames).
 *               Category is legible before you read a word.
 *   2 MARK    — the engraved figure at the centre. One per honor family,
 *               authored on the same 24-grid as ForgeSymbols (square caps,
 *               mitered joins, one stroke weight). Never a scene, never a mascot.
 *   3 EXERGUE — the threshold, struck in the bottom band under a hairline rule,
 *               the way a coin carries its denomination. Roman for counts,
 *               plain figures for load / distance / time.
 *
 *   ENGRAVED  — nothing sits ON the disc; every stroke is CUT INTO it. Light falls
 *               from above, so each groove carries shadow on its upper wall and a
 *               warm catch on its lower lip (three offset passes per layer). This
 *               is the foundation's icon law -- engraved into the interface, never
 *               floating on it -- applied to the medal face.
 *
 *   MATERIAL  — tier 1 weathered bronze -> 2 primary -> 3 bright -> 4 apex
 *               (metallic sweep + a twelve-ray corona). Tier is the ONLY thing
 *               that changes colour; detail never increases with rank.
 *
 * Usage
 *   ForgeHonorArt.create(React, 'str-bench-405', { size: 40 })  -> React <svg>
 *   ForgeHonorArt.svg('str-bench-405', { size: 40 })            -> string
 *   ForgeHonorArt.forHonor(honorRecord)                         -> resolved layer spec
 *
 * Drop into Insignia:
 *   <Insignia variant="honor" size="lg" artwork={ForgeHonorArt.create(React, id, {size:44})} />
 *
 * Exposed as `window.ForgeHonorArt` and as a CommonJS module export.
 */
(function (root) {
  var C = 32; // grid centre

  // ── material ─────────────────────────────────────────────────────────────
  // Tier is legible as STRUCTURE first and colour second, so magnitude reads at
  // 44px without anyone squinting at the exergue: bare rim -> struck rim ->
  // studded rim -> corona + metallic sweep.
  var BRONZE = { ink: '#BF8F4F', top: '#9A7340', bot: '#D0A263' };
  var TIERS = {
    1: { name: 'Earned', ink: BRONZE.ink, top: BRONZE.top, bot: BRONZE.bot, frame: 0.6, corona: false },
    2: { name: 'Earned', ink: BRONZE.ink, top: BRONZE.top, bot: BRONZE.bot, frame: 0.6, corona: false },
    3: { name: 'Earned', ink: BRONZE.ink, top: BRONZE.top, bot: BRONZE.bot, frame: 0.6, corona: false },
    4: { name: 'Apex',   ink: '#C79A5C', top: '#A07B44', bot: '#DCB478', frame: 0.66, corona: true },
  };


  // ── geometry helpers ─────────────────────────────────────────────────────
  function pt(a, r, cx, cy) {
    var t = (a - 90) * Math.PI / 180;
    return [ (cx == null ? C : cx) + r * Math.cos(t), (cy == null ? C : cy) + r * Math.sin(t) ];
  }
  function n(v) { return Math.round(v * 100) / 100; }
  function poly(sides, r, rot) {
    var d = '', i, p;
    for (i = 0; i < sides; i++) {
      p = pt(rot + i * 360 / sides, r);
      d += (i ? 'L' : 'M') + n(p[0]) + ' ' + n(p[1]);
    }
    return d + 'Z';
  }
  function dots(count, r, rad, rot, c) {
    var s = '', i, p;
    for (i = 0; i < count; i++) {
      p = pt((rot || 0) + i * 360 / count, r, c, c);
      s += '<circle cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="' + rad + '" fill="currentColor" stroke="none"/>';
    }
    return s;
  }
  function ticks(count, r1, r2, rot, c) {
    var s = '', i, a, b;
    for (i = 0; i < count; i++) {
      a = pt((rot || 0) + i * 360 / count, r1, c, c);
      b = pt((rot || 0) + i * 360 / count, r2, c, c);
      s += '<path d="M' + n(a[0]) + ' ' + n(a[1]) + 'L' + n(b[0]) + ' ' + n(b[1]) + '"/>';
    }
    return s;
  }

  // ── 1. FRAMES — one silhouette per category, all inscribed in r<=28.5 ─────
  var FRAMES = {
    rope: {
      name: 'Beaded ring', of: 'Origin',
      note: 'A rope-beaded rim — the oldest coin edge there is. Beginnings.',
      d: '<circle cx="32" cy="32" r="28.5"/>' + dots(20, 25.4, 0.95, 9),
    },
    flute: {
      name: 'Fluted disc', of: 'Training',
      note: 'Twelve machined flutes cut into the rim — repetition made material.',
      d: '<circle cx="32" cy="32" r="28.5"/>' + ticks(12, 24.6, 28.5, 15),
    },
    hex: {
      name: 'Flat-top hexagon', of: 'Programs',
      note: 'A bolt head. A plan is an engineered thing, torqued down and finished.',
      d: '<path d="' + poly(6, 28.5, 90) + '"/>',
    },
    tablet: {
      name: 'Spined tablet', of: 'Chapters',
      note: 'A bound page-block with a spine rule — the chapter as an object.',
      d: '<path d="M20 5.5h24a7 7 0 0 1 7 7v39a7 7 0 0 1-7 7H20a7 7 0 0 1-7-7v-39a7 7 0 0 1 7-7z"/><path d="M19 6v52" opacity="0.5"/>',
    },
    lozenge: {
      name: 'Cut lozenge', of: 'Goals',
      note: 'A gem cut on the vertical — the aim, faceted, set upright.',
      d: '<path d="M32 3.5 50.5 18v28L32 60.5 13.5 46V18z"/>',
    },
    shield: {
      name: 'Heater shield', of: 'Strength',
      note: 'The oldest mark of borne load. Absolute weight, absolute form.',
      d: '<path d="M32 3.5 58 12v18c0 16.5-11.5 26.5-26 31C17.5 56.5 6 46.5 6 30V12z"/>',
    },
    chevron: {
      name: 'Chevroned disc', of: 'Relative Strength',
      note: 'Two chevrons bite the rim — a multiplier, not an absolute.',
      d: '<circle cx="32" cy="32" r="28.5"/><path d="M15 13 32 2l17 11"/><path d="M20.5 19.5 32 12.4l11.5 7.1"/>',
    },
    octagon: {
      name: 'Octagon', of: 'Endurance',
      note: 'Eight sides, eight bearings — the shape of going somewhere.',
      d: '<path d="' + poly(8, 28.5, 22.5) + '"/>',
    },
    star8: {
      name: 'Eight-point star cut', of: 'Competition',
      note: 'Two squares crossed — the star struck on every victor\u2019s coin.',
      d: '<path d="' + poly(4, 28.5, 0) + '"/><path d="' + poly(4, 28.5, 45) + '"/>',
    },
    vesica: {
      name: 'Twin rings', of: 'Partnership',
      note: 'Two rings and the lens they make together. The shape only exists because there are two.',
      d: '<circle cx="26" cy="32" r="22.5"/><circle cx="38" cy="32" r="22.5"/><circle cx="32" cy="32" r="28.5" opacity="0.24"/>',
    },
    quatrefoil: {
      name: 'Quatrefoil', of: 'Squad',
      note: 'Four lobes off one square. No lobe stands without the others.',
      d: '<path d="M17.75 17.75A14.25 14.25 0 0 1 46.25 17.75A14.25 14.25 0 0 1 46.25 46.25A14.25 14.25 0 0 1 17.75 46.25A14.25 14.25 0 0 1 17.75 17.75Z"/>',
    },
    laurel: {
      name: 'Laurel flanks', of: 'Longevity',
      note: 'Two laurel arcs, open at the crown. Time, not triumph.',
      d: '<path d="M21 56.5A26.5 26.5 0 0 1 21 7.5"/><path d="M43 56.5a26.5 26.5 0 0 0 0-49"/>'
        + '<path d="M15.4 49.6q-3.9-1.1-6.5 1.2 2.8 1.8 6.5-1.2z" fill="currentColor" stroke="none"/>'
        + '<path d="M11.7 42.5q-3-2.6-6.3-1.4 1.9 2.8 6.3 1.4z" fill="currentColor" stroke="none"/>'
        + '<path d="M10.3 34.5q-1.2-3.7-4.7-4.6.5 3.4 4.7 4.6z" fill="currentColor" stroke="none"/>'
        + '<path d="M11.2 26.5q.7-3.9-2.1-6.2-.7 3.4 2.1 6.2z" fill="currentColor" stroke="none"/>'
        + '<path d="M14.5 19.3q2.3-3.2.9-6.5-2.5 2.3-.9 6.5z" fill="currentColor" stroke="none"/>'
        + '<path d="M48.6 49.6q3.9-1.1 6.5 1.2-2.8 1.8-6.5-1.2z" fill="currentColor" stroke="none"/>'
        + '<path d="M52.3 42.5q3-2.6 6.3-1.4-1.9 2.8-6.3 1.4z" fill="currentColor" stroke="none"/>'
        + '<path d="M53.7 34.5q1.2-3.7 4.7-4.6-.5 3.4-4.7 4.6z" fill="currentColor" stroke="none"/>'
        + '<path d="M52.8 26.5q-.7-3.9 2.1-6.2.7 3.4-2.1 6.2z" fill="currentColor" stroke="none"/>'
        + '<path d="M49.5 19.3q-2.3-3.2-.9-6.5 2.5 2.3.9 6.5z" fill="currentColor" stroke="none"/>',
    },
    crown: {
      name: 'Crenellated crown', of: 'Prestige',
      note: 'A five-point crown fused to the rim. Only built from other honors.',
      d: '<circle cx="32" cy="32" r="28.5"/><path d="M13.6 16.4 18.6 8.6l6.2 6.4L32 5.4l7.2 9.6 6.2-6.4 5 7.8"/>',
    },
    eclipse: {
      name: 'Eclipse ring', of: 'Hidden',
      note: 'A ring with its light on one side only. Nothing is shown until it is earned.',
      d: '<circle cx="32" cy="32" r="28.5"/><path d="M32 8.6A23.4 23.4 0 0 1 32 55.4" opacity="0.75"/><path d="M32 8.6A23.4 23.4 0 0 0 32 55.4" stroke-dasharray="2 4" opacity="0.55"/>',
    },
  };

  // ── 3. MARKS — authored on a 24-grid, square caps, one weight ────────────
  var MARKS = {
    // ORIGIN
    'org-again':            { name: 'Second tally',   d: '<path d="M8 3v18"/><path d="M16 3v18"/>' },
    'org-first-pr':         { name: 'Breaking line',  d: '<path d="M3 16h18"/><path d="M12 16V4"/><path d="m8 8 4-4 4 4"/>' },
    'org-standard':         { name: 'Standard',       d: '<path d="M7 21V3"/><path d="M7 4h11l-3 3.6L18 11.2H7"/>' },
    'org-first-goal':       { name: 'Set mark',       d: '<circle cx="12" cy="12" r="7.6"/><path d="M12 1.6v5"/><path d="M12 17.4v5"/><path d="M1.6 12h5"/><path d="M17.4 12h5"/>' },
    'org-first-connection': { name: 'Linked rings',   d: '<circle cx="8.6" cy="12" r="5.6"/><circle cx="15.4" cy="12" r="5.6"/>' },
    'org-initiative':       { name: 'Laid plan',      d: '<path d="M2.5 5h19v14h-19z"/><path d="M2.5 10h19"/><path d="M9 10v9"/>' },
    'org-first-capture':    { name: 'Frame marks',    d: '<path d="M2.5 8V2.5H8"/><path d="M21.5 8V2.5H16"/><path d="M2.5 16v5.5H8"/><path d="M21.5 16v5.5H16"/><circle cx="12" cy="12" r="4.4"/>' },
    'org-first-reflection': { name: 'Facing pair',    d: '<path d="M2 12h20"/><path d="M6.5 8.4 10.5 4.4"/><path d="M6.5 4.4h4"/><path d="M6.5 4.4v4"/><path d="M17.5 15.6 13.5 19.6"/><path d="M17.5 19.6h-4"/><path d="M17.5 19.6v-4"/>' },
    'org-first-week':       { name: 'Three of seven', d: '<path d="M2 19h20"/><path d="M3.4 17v-2.6"/><path d="M6.6 17V9"/><path d="M9.8 17v-2.6"/><path d="M13 17V9"/><path d="M16.2 17v-2.6"/><path d="M19.4 17V9"/>' },
    // TRAINING
    'trn-count':   { name: 'Barbell',   d: '<path d="M6.5 9v6"/><path d="M17.5 9v6"/><path d="M4 10.5v3"/><path d="M20 10.5v3"/><path d="M6.5 12h11"/>' },
    'trn-hours':   { name: 'Hourglass', d: '<path d="M7 4h10v2.6L12 12l5 5.4V20H7v-2.6L12 12 7 6.6z"/>' },
    'trn-weeks':   { name: 'Struck week', d: '<path d="M3.5 5h17v16h-17z"/><path d="M3.5 10h17"/><path d="M8 5V2"/><path d="M16 5V2"/><path d="M3.5 15.5h17"/>' },
    'trn-tonnage': { name: 'Plate stack', d: '<path d="M3 19h18"/><path d="M4.5 15.4h15"/><path d="M6.5 11.8h11"/><path d="M8.5 8.2h7"/><path d="M10.5 4.6h3"/>' },
    // PROGRAMS
    'prog-grad': { name: 'Sealed plan', d: '<path d="M6 4h12v16l-6-4-6 4z"/><path d="m9 9.4 2.2 2.2L15.4 7.4"/>' },
    // CHAPTERS
    'chp-seal':  { name: 'Wax seal',    d: '<circle cx="12" cy="10" r="5.6"/><path d="M9.4 10h5.2"/><path d="M12 7.4v5.2"/><path d="m8.4 14.6-1.4 6 5-2.6 5 2.6-1.4-6"/>' },
    'chp-depth': { name: 'Strata',      d: '<path d="M3 5h18"/><path d="M3 10h18"/><path d="M3 15h18"/><path d="M3 20h11"/>' },
    'chp-held':  { name: 'Held time',   d: '<circle cx="12" cy="12" r="8.4"/><path d="M12 6.2V12l4.4 2.8"/>' },
    // GOALS
    'goal-struck': { name: 'Struck aim', d: '<circle cx="12" cy="12.6" r="7.4"/><circle cx="12" cy="12.6" r="2"/><path d="m20.4 4.2-6.6 6.6"/><path d="M20.4 4.2h-3.8"/><path d="M20.4 4.2v3.8"/>' },
    // STRENGTH
    'str-bench': { name: 'Bench + bar',  d: '<path d="M3 9h18"/><path d="M5.5 6.4v5.2"/><path d="M18.5 6.4v5.2"/><path d="M6 16h12"/><path d="M7.5 16v4"/><path d="M16.5 16v4"/>' },
    'str-squat': { name: 'Bar on back',  d: '<path d="M3 6h18"/><path d="M5.5 3.4v5.2"/><path d="M18.5 3.4v5.2"/><path d="M12 6v6"/><path d="m12 12-4 8"/><path d="m12 12 4 8"/>' },
    'str-dead':  { name: 'Floor pull',   d: '<path d="M3 20h18"/><path d="M4 16h16"/><path d="M6.5 13.6v4.8"/><path d="M17.5 13.6v4.8"/><path d="M12 12V4"/><path d="m9 7 3-3 3 3"/>' },
    'str-ohp':   { name: 'Overhead bar', d: '<path d="M3 5h18"/><path d="M5.5 2.4v5.2"/><path d="M18.5 2.4v5.2"/><path d="M8 8v5"/><path d="M16 8v5"/><path d="M8 13h8"/><path d="M12 13v7"/>' },
    'str-club':  { name: 'Three totals', d: '<path d="M2.5 6h19"/><path d="M2.5 12h19"/><path d="M2.5 18h19"/><path d="M2.5 4v4"/><path d="M21.5 4v4"/><path d="M2.5 16v4"/><path d="M21.5 16v4"/>' },
    // RELATIVE STRENGTH — the lift mark, over the multiplier cross
    'rel-bench': { name: 'Bench \u00D7 bodyweight', d: '<path d="M3 7h18"/><path d="M5.5 4.4v5.2"/><path d="M18.5 4.4v5.2"/><path d="M6 13h12"/><path d="M7.5 13v3"/><path d="M16.5 13v3"/><path d="m10 18.6 4 4"/><path d="m14 18.6-4 4"/>' },
    'rel-squat': { name: 'Squat \u00D7 bodyweight', d: '<path d="M3 5h18"/><path d="M5.5 2.4v5.2"/><path d="M18.5 2.4v5.2"/><path d="M12 5v5"/><path d="m12 10-3.4 6"/><path d="m12 10 3.4 6"/><path d="m10 18.6 4 4"/><path d="m14 18.6-4 4"/>' },
    'rel-dead':  { name: 'Deadlift \u00D7 bodyweight', d: '<path d="M4 13h16"/><path d="M6.5 10.6v4.8"/><path d="M17.5 10.6v4.8"/><path d="M12 9V2"/><path d="m9 5 3-3 3 3"/><path d="m10 18.6 4 4"/><path d="m14 18.6-4 4"/>' },
    'rel-ohp':   { name: 'Press \u00D7 bodyweight',   d: '<path d="M3 4h18"/><path d="M5.5 1.6v4.8"/><path d="M18.5 1.6v4.8"/><path d="M8 7v4"/><path d="M16 7v4"/><path d="M8 11h8"/><path d="M12 11v5"/><path d="m10 18.6 4 4"/><path d="m14 18.6-4 4"/>' },
    // ENDURANCE
    'end-run-session': { name: 'Stride',      d: '<circle cx="14.4" cy="4.6" r="2"/><path d="M14.8 7.6 11 12.4l2.8 3 1 5.6"/><path d="M11 12.4 6.6 10.6"/><path d="m13.8 15.4-4.6 3.6"/>' },
    'end-run-total':   { name: 'Road',        d: '<path d="M2 21 9 6"/><path d="M22 21 15 6"/><path d="M6.5 6h11"/><path d="M12 19v-2.6"/><path d="M12 13.4v-2.6"/><path d="M12 7.8V6.6"/>' },
    'end-walk-session':{ name: 'Footfall',    d: '<path d="M11.8 2.4c2.7 0 4.3 3.1 4.3 6.6 0 2.9-1.5 5.4-4.3 5.4S7.5 11.9 7.5 9c0-3.5 1.6-6.6 4.3-6.6z"/><path d="M10.4 16.6c2.3 0 3.6 1.8 3.6 3.6s-1.3 2.4-3.6 2.4-3.6-.8-3.6-2.4 1.3-3.6 3.6-3.6z"/>' },
    'end-walk-total':  { name: 'Waypoint stone', d: '<path d="M3 21h18"/><path d="M8.4 21V10.4a3.6 3.6 0 0 1 7.2 0V21"/><path d="M8.4 15.4h7.2"/>' },
    'end-ride-session':{ name: 'Wheel',       d: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="1.8"/><path d="M12 3.6v16.8"/><path d="M3.6 12h16.8"/>' },
    'end-ride-total':  { name: 'Chainring',   d: '<circle cx="12" cy="12" r="6.4"/><circle cx="12" cy="12" r="2.4"/>' + ticks(8, 6.4, 9, 22.5, 12) },
    'end-swim-session':{ name: 'Three waves', d: '<path d="M2.5 6.5c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0 4.4-2.2 6.6 0"/><path d="M2.5 12c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0 4.4-2.2 6.6 0"/><path d="M2.5 17.5c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0 4.4-2.2 6.6 0"/>' },
    'end-swim-total':  { name: 'Lane',        d: '<path d="M3 5h18"/><path d="M3 19h18"/><path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>' },
    // COMPETITION
    'cmp-victory': { name: 'Podium',        d: '<path d="M9 21V9h6v12"/><path d="M3.5 21v-7H9"/><path d="M20.5 21v-5H15"/><path d="M12 5.4 13 7.4l2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 7.7 11 7.4z"/>' },
    'cmp-entered': { name: 'Crossed blades', d: '<path d="M5 4.5 18 17.5"/><path d="M19 4.5 6 17.5"/><path d="m12.7 15.8 3.6-3.6"/><path d="m7.7 12.2 3.6 3.6"/>' },
    // PARTNERSHIP
    'prt-together': { name: 'Two abreast', d: '<path d="M2 17.5 7 8l5 9.5"/><path d="M12 17.5 17 8l5 9.5"/>' },
    'prt-regular':  { name: 'Same two again', d: '<path d="M2 13.5 7 4l5 9.5"/><path d="M12 13.5 17 4l5 9.5"/><path d="M4.6 17.8a7.4 3.8 0 0 0 14.8 0"/><path d="m19.4 17.8-2.8-.8"/><path d="m19.4 17.8-1 2.6"/>' },
    'prt-wide':     { name: 'Wide circle', d: '<circle cx="12" cy="12" r="2.2"/>' + dots(10, 8, 1.3, 0, 12) },
    // SQUAD
    'sqd-founder':    { name: 'Planted standard', d: '<path d="M7 21h10"/><path d="M12 21V3"/><path d="M12 3h8l-2.4 3.4L20 9.8h-8"/>' },
    'sqd-perfect':    { name: 'Whole week',       d: '<circle cx="12" cy="12" r="7.4"/>' + dots(7, 7.4, 2.4, 0, 12) },
    'sqd-streak':     { name: 'Kept flame',       d: '<path d="M12 2.2c2.6 3.5 4.7 5.4 4.7 9.4a4.7 4.7 0 0 1-9.4 0c0-1.9.6-3.2 1.4-4 .2 1.3 1.2 2 1.9 2-.7-1.5.2-4.8 1.4-7.4z"/><path d="M3 21h18"/>' },
    'sqd-volume':     { name: 'Three into one',   d: '<path d="M2 5h9"/><path d="M2 12h9"/><path d="M2 19h9"/><path d="m11 5 5 7-5 7"/><path d="M16 12h6"/>' },
    'sqd-goal':       { name: 'Ring struck thrice', d: '<circle cx="12" cy="12" r="5"/><path d="M2 12h4.6"/><path d="M12 2v4.6"/><path d="M22 12h-4.6"/>' },
    'sqd-teamplayer': { name: 'Marked ring',      d: '<circle cx="12" cy="12" r="8"/><path d="m8.2 12.2 2.8 2.8 5.2-5.6"/>' },
    'sqd-everyone':   { name: 'Finish flag',      d: '<path d="M6 21.5V2.5"/><path d="M6 4h13v9H6"/><path d="M6 8.5h13"/><path d="M12.5 4v9"/>' },
    // LONGEVITY
    'lng-return': { name: 'Return arc', d: '<path d="M20.4 12A8.4 8.4 0 1 1 12 3.6"/><path d="M11.8 0.4 15.8 3.6 11.8 6.8"/>' },
    'lng-rings':  { name: 'Tree rings', d: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="3"/>' },
    // PRESTIGE
    'prs-4paths': { name: 'Four rays',  d: '<path d="M12 8.4 15.6 12 12 15.6 8.4 12z"/>' + ticks(4, 4.6, 10.6, 45, 12) },
    'prs-5paths': { name: 'Five rays',  d: '<path d="M12 8.4 15.6 12 12 15.6 8.4 12z"/>' + ticks(5, 4.6, 10.6, 0, 12) },
    'prs-6paths': { name: 'Six rays',   d: '<path d="M12 8.4 15.6 12 12 15.6 8.4 12z"/>' + ticks(6, 4.6, 10.6, 0, 12) },
    'prs-7paths': { name: 'Every ray',  d: '<path d="M12 7.4 16.6 12 12 16.6 7.4 12z"/>' + ticks(8, 5.4, 10.4, 22.5, 12) },
    'prs-lifter':      { name: 'Three totals', d: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/><path d="M3 4.6v2.8"/><path d="M21 4.6v2.8"/><path d="M3 16.6v2.8"/><path d="M21 16.6v2.8"/>' },
    'prs-disciplines': { name: 'Triquetra',     d: '<circle cx="12" cy="7.6" r="5.2"/><circle cx="7.4" cy="15.6" r="5.2"/><circle cx="16.6" cy="15.6" r="5.2"/>' },
    'prs-chapters':    { name: 'Sealed life',   d: '<path d="M3 7v13h12"/><path d="M7 3h14v16H7z"/><circle cx="14" cy="11" r="3.2"/><path d="M12.4 11h3.2"/><path d="M14 9.4v3.2"/>' },
    // HIDDEN
    'hid-early':      { name: 'First light',   d: '<path d="M2 18h20"/><circle cx="12" cy="13.4" r="4.2"/><path d="M12 5.2v2.4"/><path d="m5.6 7 1.7 1.7"/><path d="M18.4 7l-1.7 1.7"/><path d="M2.6 13.4H5"/><path d="M19 13.4h2.4"/>' },
    'hid-midnight':   { name: 'Small hours',   d: '<path d="M16.4 15.6A8 8 0 0 1 8.4 4.4a8 8 0 1 0 8 11.2z"/><path d="m19 3.6.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z"/>' },
    'hid-newyear':    { name: 'Year turn',     d: '<path d="M13.8 4.3A8 8 0 1 1 10.2 4.3"/><path d="M12 1.6v5.2"/><path d="m9.6 4.2 2.4-2.6 2.4 2.6"/>' },
    'hid-leapday':    { name: 'Leap',          d: '<path d="M2 19h6"/><path d="M16 19h6"/><path d="M8 19C8 9 16 9 16 19"/><path d="m12 9.8 1.6 1.6-1.6 1.6-1.6-1.6z"/>' },
    'hid-fullcircle': { name: 'Closed circle', d: '<circle cx="12" cy="12" r="8"/><path d="M12 4v4.4"/><circle cx="12" cy="4" r="1.4"/>' },
    'hid-triple':     { name: 'Three at once', d: '<circle cx="12" cy="5.6" r="2.6"/><circle cx="6.4" cy="16.4" r="2.6"/><circle cx="17.6" cy="16.4" r="2.6"/><path d="m10.6 8 -2.4 5"/><path d="m13.4 8 2.4 5"/><path d="M9 16.4h6"/>' },
  };

  // Measured bounds of each mark on its 24-grid, [x, y, w, h]. Marks are drawn
  // at whatever size suits their shape, then normalised into one optical box at
  // render time — a wide barbell and a tall hourglass end up the same weight and
  // presence. Re-measure if a mark's geometry changes.
  var FIT = {
    'org-again': [8,3,8,18],
    'org-first-pr': [3,4,18,12],
    'org-standard': [7,3,11,18],
    'org-first-goal': [1.6,1.6,20.8,20.8],
    'org-first-connection': [3,6.4,18,11.2],
    'org-initiative': [2.5,5,19,14],
    'org-first-capture': [2.5,2.5,19,19],
    'org-first-reflection': [2,4.4,20,15.2],
    'org-first-week': [2,9,20,10],
    'trn-count': [4,9,16,6],
    'trn-hours': [7,4,10,16],
    'trn-weeks': [3.5,2,17,19],
    'trn-tonnage': [3,4.6,18,14.4],
    'prog-grad': [6,4,12,16],
    'chp-seal': [6.4,4.4,11.2,16.2],
    'chp-depth': [3,5,18,15],
    'chp-held': [3.6,3.6,16.8,16.8],
    'goal-struck': [4.6,4.2,15.8,15.8],
    'str-bench': [3,6.4,18,13.6],
    'str-squat': [3,3.4,18,16.6],
    'str-dead': [3,4,18,16],
    'str-ohp': [3,2.4,18,17.6],
    'str-club': [2.5,4,19,16],
    'rel-bench': [3,4.4,18,18.2],
    'rel-squat': [3,2.4,18,20.2],
    'rel-dead': [4,2,16,20.6],
    'rel-ohp': [3,1.6,18,21],
    'end-run-session': [6.6,2.6,9.8,18.4],
    'end-run-total': [2,6,20,15],
    'end-walk-session': [6.8,2.4,9.3,20.2],
    'end-walk-total': [3,6.8,18,14.2],
    'end-ride-session': [3.6,3.6,16.8,16.8],
    'end-ride-total': [3.69,3.69,16.62,16.62],
    'end-swim-session': [2.5,4.85,19.8,14.3],
    'end-swim-total': [3,5,18,14],
    'cmp-victory': [3.5,5.4,17,15.6],
    'cmp-entered': [5,4.5,14,13],
    'prt-together': [2,8,20,9.5],
    'prt-regular': [2,4,20,17.4],
    'prt-wide': [3.09,2.7,17.82,18.6],
    'sqd-founder': [7,3,13,18],
    'sqd-perfect': [2.39,2.2,19.22,18.87],
    'sqd-streak': [3,2.2,18,18.8],
    'sqd-volume': [2,5,20,14],
    'sqd-goal': [2,2,20,15],
    'sqd-teamplayer': [4,4,16,16],
    'sqd-everyone': [6,2.5,13,19],
    'lng-return': [3.63,0.4,16.77,19.97],
    'lng-rings': [3,3,18,18],
    'prs-4paths': [4.5,4.5,15,15],
    'prs-5paths': [1.92,1.4,20.16,19.18],
    'prs-6paths': [2.82,1.4,18.36,21.2],
    'prs-7paths': [2.39,2.39,19.22,19.22],
    'prs-lifter': [3,4.6,18,14.8],
    'prs-disciplines': [2.2,2.4,19.6,18.4],
    'prs-chapters': [3,3,18,17],
    'hid-early': [2,5.2,20,12.8],
    'hid-midnight': [1.08,3.6,20.52,16.73],
    'hid-newyear': [4.05,1.6,15.9,18.49],
    'hid-leapday': [2,9.8,20,9.2],
    'hid-fullcircle': [4,2.6,16,17.4],
    'hid-triple': [3.8,3,16.4,16]
  };

  // ── geometry: the ONE place these numbers live. The spec document reads
  //    them from here so documentation can never drift from the engine. ────
  var GEOM = {
    grid: 64, centre: 32, frameMaxR: 28.5, frameStroke: 1.5,
    // The mark's usable box depends on the frame around it — a tablet is narrow,
    // a hexagon is wide, a crown eats the top. [w, h, cy] with an exergue below,
    // and without. Stroke stays constant everywhere; only the scale varies.
    markBox: {
      rope: { ex: [34, 26, 22], noEx: [38, 38, 32] },
      flute: { ex: [34, 26, 22], noEx: [38, 38, 32] },
      hex: { ex: [38, 26, 22], noEx: [42, 38, 32] },
      tablet: { ex: [27, 26, 22], noEx: [29, 40, 32] },
      lozenge: { ex: [30, 24, 22], noEx: [32, 34, 32] },
      shield: { ex: [32, 24, 22], noEx: [34, 34, 31] },
      chevron: { ex: [34, 24, 22], noEx: [36, 33, 34] },
      octagon: { ex: [36, 26, 22], noEx: [40, 38, 32] },
      star8: { ex: [29, 24, 22], noEx: [32, 32, 32] },
      vesica: { ex: [29, 24, 22], noEx: [31, 34, 32] },
      quatrefoil: { ex: [34, 26, 22], noEx: [38, 38, 32] },
      laurel: { ex: [34, 26, 22], noEx: [38, 38, 32] },
      crown: { ex: [32, 24, 22], noEx: [35, 31, 34] },
      eclipse: { ex: [34, 26, 22], noEx: [38, 38, 32] },
    },
    mark: { stroke: 3.2, maxScale: 2.6 },
    exergue: { ruleY: 43.4, ruleX: [24, 40], ruleStroke: 0.8, ruleOpacity: 0.45,
               baseline: 52.4, size: 11.2, weight: 700, tracking: 0.2 },
    rimR: 30.2, studCount: 8, studR: 1.05, coronaCount: 12, coronaR: [31.4, 33.4],
    // clean face: one glyph, generously sized, optically centred in the disc
    cleanBox: [34, 34, 32], cleanStroke: 3.1,
    // Nothing is laid ON the disc — every stroke is CUT INTO it. Light falls from
    // above (foundation: Lighting), so a groove gathers shadow along its upper
    // wall while its lower lip catches the light. Three offset passes per layer.
    engrave: {
      depth: 0.58, frameDepth: 0.34, textDepth: 0.34,
      shadow: 'rgba(0,0,0,0.66)', shadowOpacity: 0.85,
      light: 'rgb(214,176,124)',  lightOpacity: 0.62,
      frameLightOpacity: 0.3, textLightOpacity: 0.42,
    },
  };

  // ── assembly ─────────────────────────────────────────────────────────────
  var FRAME_OF = {
    origin: 'rope', training: 'flute', programs: 'hex', chapters: 'tablet', goals: 'lozenge',
    strength: 'shield', relative: 'chevron', endurance: 'octagon', competition: 'star8',
    partnership: 'vesica', squad: 'quatrefoil', longevity: 'laurel', prestige: 'crown', hidden: 'eclipse',
  };

  function record(id) {
    try { return (window.ForgeHonors && window.ForgeHonors.byId(id)) || null; } catch (e) { return null; }
  }
  var FACE = 'clean';
  function setFace(f) { FACE = f === 'struck' ? 'struck' : 'clean'; }
  function forHonor(h, face) {
    if (typeof h === 'string') h = record(h);
    if (!h) return null;
    return {
      face: face || FACE,
      id: h.id, name: h.name,
      frame: FRAME_OF[h.cat] || 'rope',
      mark: MARKS[h.mark] ? h.mark : null,
      ex: h.ex || '',
      tier: TIERS[h.tier] ? h.tier : 2,
    };
  }

  // ── one builder per layer; both inner() and the spec document use these ──
  function frameLayer(spec) {
    if (spec.face === 'clean') return '';
    return '<g stroke-width="' + GEOM.frameStroke + '" opacity="' + TIERS[spec.tier].frame + '">'
      + FRAMES[spec.frame].d + '</g>';
  }
  function markLayer(spec) {
    if (!spec.mark || !MARKS[spec.mark]) return '';
    var box, stroke = GEOM.mark.stroke;
    if (spec.face === 'clean') { box = GEOM.cleanBox; stroke = GEOM.cleanStroke; }
    else {
      var mb = GEOM.markBox[spec.frame] || GEOM.markBox.rope;
      box = mb[spec.ex ? 'ex' : 'noEx'];
    }
    var b = FIT[spec.mark] || [0, 0, 24, 24];
    var s = Math.min(box[0] / b[2], box[1] / b[3], GEOM.mark.maxScale);
    var tx = n(32 - s * (b[0] + b[2] / 2));
    var ty = n(box[2] - s * (b[1] + b[3] / 2));
    return '<g transform="translate(' + tx + ',' + ty + ') scale(' + n(s) + ')"'
      + ' stroke-width="' + n(stroke / s) + '">' + MARKS[spec.mark].d + '</g>';
  }
  function exergueLayer(spec) {
    if (!spec.ex || spec.face === 'clean') return '';
    var E = GEOM.exergue;
    return '<path d="M' + E.ruleX[0] + ' ' + E.ruleY + 'H' + E.ruleX[1] + '" stroke-width="' + E.ruleStroke
      + '" opacity="' + E.ruleOpacity + '"/>'
      + '<text x="32" y="' + E.baseline + '" text-anchor="middle" fill="currentColor" stroke="none" opacity="1"'
      + ' font-family="var(--fl-font-display, Georgia, serif)" font-size="' + E.size + '"'
      + ' font-weight="' + E.weight + '" letter-spacing="' + E.tracking + '">' + esc(spec.ex) + '</text>';
  }
  function tierLayer(spec) {
    if (spec.face === 'clean') return '';
    var t = TIERS[spec.tier], s = '';
    if (t.rim)    s += '<circle cx="32" cy="32" r="' + GEOM.rimR + '" stroke-width="0.7" opacity="' + t.rim + '"/>';
    if (t.studs)  s += '<g opacity="' + t.rim + '">' + dots(GEOM.studCount, GEOM.rimR, GEOM.studR, 22.5) + '</g>';
    if (t.corona) s += '<g stroke-width="1" opacity="0.42">' + ticks(GEOM.coronaCount, GEOM.coronaR[0], GEOM.coronaR[1], 15) + '</g>';
    return s;
  }
  // every layer of one honor, in strike order — what the anatomy panel documents
  function layers(honor, face) {
    var spec = forHonor(honor, face);
    if (!spec) return null;
    return { spec: spec, tier: tierLayer(spec), frame: frameLayer(spec),
             mark: markLayer(spec), exergue: exergueLayer(spec) };
  }

  // one engraved pass-set for any markup: shadow above, warm catch below, body between
  function engrave(body, opts) {
    if (!body) return '';
    var E = GEOM.engrave, d = opts.depth || E.depth;
    return '<g transform="translate(0,' + -d + ')" color="' + E.shadow + '" opacity="' + E.shadowOpacity + '">' + body + '</g>'
         + '<g transform="translate(0,' + d + ')" color="' + E.light + '" opacity="' + (opts.lightOpacity || E.lightOpacity) + '">' + body + '</g>'
         + '<g color="' + opts.ink + '" stroke="' + opts.paint + '">' + body + '</g>';
  }
  // Only five paint ramps exist in the whole system: one vertical bronze per tier
  // plus the apex sweep. They live in ONE shared <defs> sprite with stable ids and
  // every medal references them — userSpaceOnUse resolves in the referencing
  // element's own 64-grid, so a single sprite serves any number of medals.
  var GRAD_ID = { 1: 'fl-medal-t1', 2: 'fl-medal-t2', 3: 'fl-medal-t3', 4: 'fl-medal-t4', apex: 'fl-medal-apex' };
  function vgrad(id, from, mid, to) {
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="32" y1="6" x2="32" y2="58">'
      + '<stop offset="0%" stop-color="' + from + '"/><stop offset="50%" stop-color="' + mid + '"/>'
      + '<stop offset="100%" stop-color="' + to + '"/></linearGradient>';
  }
  function defsMarkup() {
    var s = '';
    [1, 2, 3, 4].forEach(function (k) {
      var t = TIERS[k];
      s += vgrad(GRAD_ID[k], t.top, t.ink, t.bot);
    });
    s += '<linearGradient id="' + GRAD_ID.apex + '" gradientUnits="userSpaceOnUse" x1="9" y1="7" x2="55" y2="57">'
      + '<stop offset="0%" stop-color="#6B5335"/><stop offset="34%" stop-color="#A9803F"/>'
      + '<stop offset="50%" stop-color="#CFA76D"/><stop offset="66%" stop-color="#A9803F"/>'
      + '<stop offset="100%" stop-color="#5E4A30"/></linearGradient>';
    return s;
  }
  var DEFS_SVG = '<svg width="0" height="0" aria-hidden="true" focusable="false"'
    + ' style="position:absolute;width:0;height:0;overflow:hidden"><defs>' + defsMarkup() + '</defs></svg>';
  // inject once; safe to call repeatedly
  function ensureDefs() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('fl-medal-defs')) return;
    var host = document.createElement('div');
    host.id = 'fl-medal-defs';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    host.innerHTML = DEFS_SVG;
    (document.body || document.documentElement).appendChild(host);
  }
  function paintOf(tier) { return 'url(#' + (tier === 4 ? GRAD_ID.apex : GRAD_ID[tier] || GRAD_ID[2]) + ')'; }

  // inner SVG for a resolved spec (no <svg> wrapper). Paints come from the
  // shared defs sprite, so a medal emits geometry only.
  function inner(spec) {
    var t = TIERS[spec.tier], paint = paintOf(spec.tier), E = GEOM.engrave;
    var s = '<g fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="8">';
    if (spec.face === 'clean') {
      s += engrave(markLayer(spec), { ink: t.ink, paint: paint });
    } else {
      // the rim is the medal's own edge, not an engraving — it sits proud
      s += '<g color="' + t.ink + '">' + tierLayer(spec) + '</g>';
      s += engrave(frameLayer(spec), { ink: t.ink, paint: paint,
             depth: E.frameDepth, lightOpacity: E.frameLightOpacity });
      s += engrave(markLayer(spec), { ink: t.ink, paint: paint });
      s += engrave(exergueLayer(spec), { ink: t.ink, paint: paint,
             depth: E.textDepth, lightOpacity: E.textLightOpacity });
    }
    s += '</g>';
    return s;
  }

  function esc(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function svg(honor, opts) {
    opts = opts || {};
    var spec = forHonor(honor, opts.face);
    if (!spec) return '';
    var size = opts.size || 44;
    ensureDefs();
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" role="img" aria-label="'
      + esc(spec.name) + '">' + inner(spec) + '</svg>';
  }

  function create(React, honor, opts) {
    opts = opts || {};
    var spec = forHonor(honor, opts.face);
    if (!spec || !React) return null;
    var size = opts.size || 44;
    ensureDefs();
    return React.createElement('svg', {
      viewBox: '0 0 64 64', width: size, height: size, role: 'img',
      'aria-label': spec.name, style: opts.style, overflow: 'visible',
      dangerouslySetInnerHTML: { __html: inner(spec) },
    });
  }

  // Render arbitrary layer markup with the real engraved finish (or one isolated
  // pass of it) — the spec document draws its anatomy and cross-section with this,
  // so what it shows is always what the engine strikes.
  //   pass: 'all' (default) | 'shadow' | 'light' | 'body' | 'flat' (proud, no cut)
  function preview(markup, tier, pass) {
    if (!markup) return '';
    var t = TIERS[tier] || TIERS[2], E = GEOM.engrave;
    ensureDefs();
    var s = '<g fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="8">';
    if (pass === 'flat') {
      s += '<g color="' + t.ink + '">' + markup + '</g>';
    } else if (pass === 'shadow') {
      s += '<g transform="translate(0,' + -E.depth + ')" color="' + E.shadow + '">' + markup + '</g>';
    } else if (pass === 'light') {
      s += '<g transform="translate(0,' + E.depth + ')" color="' + E.light + '">' + markup + '</g>';
    } else if (pass === 'body') {
      s += '<g color="' + t.ink + '" stroke="' + paintOf(tier) + '">' + markup + '</g>';
    } else {
      s += engrave(markup, { ink: t.ink, paint: paintOf(tier) });
    }
    return s + '</g>';
  }

  var API = {
    FRAMES: FRAMES, MARKS: MARKS, TIERS: TIERS, FRAME_OF: FRAME_OF, GEOM: GEOM, FIT: FIT,
    forHonor: forHonor, layers: layers, setFace: setFace, engrave: engrave, preview: preview, svg: svg, create: create,
    DEFS_SVG: DEFS_SVG, ensureDefs: ensureDefs, GRAD_ID: GRAD_ID,
    markIds: Object.keys(MARKS), frameIds: Object.keys(FRAMES),
  };
  root.ForgeHonorArt = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
