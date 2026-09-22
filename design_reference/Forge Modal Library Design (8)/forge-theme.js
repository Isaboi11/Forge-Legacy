/* Forge Legacy — global accent theme (prototype).
   Persists the chosen accent to localStorage and applies it to the whole
   document by overriding the design-system --fl-bronze-* tokens.
   Bronze = remove overrides (fall back to DS defaults). */
(function () {
  function mk(pri, bri, drk, r, g, b) {
    return {
      '--fl-bronze-primary': pri, '--fl-bronze-bright': bri, '--fl-bronze-dark': drk, '--fl-bronze-muted': pri,
      '--fl-bronze-border': 'rgba(' + r + ',' + g + ',' + b + ',0.5)',
      '--fl-bronze-border-subtle': 'rgba(' + r + ',' + g + ',' + b + ',0.28)',
      '--fl-bronze-tint': 'rgba(' + r + ',' + g + ',' + b + ',0.12)',
      '--fl-bronze-metallic': 'linear-gradient(180deg, ' + bri + ', ' + pri + ' 52%, ' + drk + ')',
      '--fl-glow-badge': '0 0 12px rgba(' + r + ',' + g + ',' + b + ',0.42)',
      '--fl-glow-subtle': '0 0 8px rgba(' + r + ',' + g + ',' + b + ',0.18)',
      '--fl-icon-bronze': bri, '--fl-text-bronze-label': bri,
      '--fl-bronze-fill': 'linear-gradient(180deg, ' + drk + ', #15151b)',
      '--fl-bronze-metal-border': 'rgba(' + r + ',' + g + ',' + b + ',0.55)',
      '--fl-bronze-metal-top-rim': 'inset 0 1px 0 rgba(' + r + ',' + g + ',' + b + ',0.35)',
      '--fl-icon-container-bg': 'rgba(' + r + ',' + g + ',' + b + ',0.08)',
      '--fl-icon-container-border': 'rgba(' + r + ',' + g + ',' + b + ',0.22)',
      '--fl-status-online-glow': '0 0 8px rgba(' + r + ',' + g + ',' + b + ',0.4)'
    };
  }
  var THEMES = {
    'Bronze': null,
    'Royal Purple': mk('#836C9E', '#A98FC2', '#453455', 131, 108, 158),
    'Royal Blue': mk('#5872A0', '#8299C0', '#2D4062', 88, 114, 160),
    'Forest Green': mk('#587C67', '#7EA087', '#2B4335', 88, 124, 103),
    'Sapphire': mk('#3D7D96', '#69A4BB', '#234A5A', 61, 125, 150),
    'Gunmetal': mk('#5A626C', '#888F99', '#2A2F36', 90, 98, 108),
    'Antique Gold': mk('#A99247', '#C6B06A', '#6B5A28', 169, 146, 71),
    'Emerald': mk('#2F7D5F', '#5AA383', '#1E4A3A', 47, 125, 95),
    'Burnt Rose': mk('#A96A78', '#C6929B', '#5B3038', 169, 106, 120),
    'Oxblood': mk('#8A4048', '#B06A6E', '#4A2028', 138, 64, 72)
  };
  var KEYS = Object.keys(mk('#000', '#000', '#000', 0, 0, 0));

  function apply(name) {
    var el = document.documentElement;
    var t = THEMES[name];
    KEYS.forEach(function (k) { if (t && t[k]) el.style.setProperty(k, t[k]); else el.style.removeProperty(k); });
  }
  function current() { try { return localStorage.getItem('forge.accent') || 'Bronze'; } catch (e) { return 'Bronze'; } }
  function set(name) { try { localStorage.setItem('forge.accent', name); } catch (e) {} apply(name); }

  window.ForgeTheme = { apply: apply, set: set, current: current, names: Object.keys(THEMES) };
  apply(current());
  document.addEventListener('DOMContentLoaded', function () { apply(current()); });
  window.addEventListener('storage', function (e) { if (e.key === 'forge.accent') apply(current()); });
})();
