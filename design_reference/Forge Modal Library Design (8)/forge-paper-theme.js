/* Forge Legacy — Paper Mode (prototype).
   Overrides the DS foundation tokens with a light parchment/bronze palette.
   Since foundation.css defines nearly every other token relationally via
   var(), re-pointing this base set re-themes cards, text, borders, shadows
   and icons throughout — no per-component overrides needed. */
(function () {
var VARS = {
    '--fl-base': '#F4F0E6', '--fl-charcoal-900': '#F6F2E8', '--fl-charcoal-800': '#F9F6EF',
    '--fl-charcoal-700': '#F1EBDD', '--fl-charcoal-600': '#CDBD9F', '--fl-charcoal-500': '#B9A98A',
    '--fl-cream-100': '#28231D', '--fl-gray-400': '#6E6860', '--fl-gray-600': '#8B8377',
    '--fl-bronze-400': '#A47A3D', '--fl-bronze-300': '#BD9257', '--fl-bronze-600': '#8C6B3C', '--fl-bronze-dark': '#5C4726',
    '--fl-inner-highlight': 'rgba(255,255,255,0.92)', '--fl-inner-highlight-md': 'rgba(255,255,255,1)',
    '--fl-border-inset': 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(122,104,78,0.07), 0 1px 2px rgba(70,58,42,0.05), 0 4px 12px -6px rgba(70,58,42,0.16)',
    '--fl-border-inset-md': 'inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(122,104,78,0.10), 0 2px 4px rgba(70,58,42,0.06), 0 10px 24px -10px rgba(70,58,42,0.22)',
    '--fl-border-inset-strong': 'inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(122,104,78,0.10), 0 2px 4px rgba(70,58,42,0.06), 0 10px 24px -10px rgba(70,58,42,0.22)',
    '--fl-overlay-dark': 'rgba(35,31,26,0.42)', '--fl-hover-wash': 'rgba(35,31,26,0.035)',
    '--fl-bg-atmospheric': 'radial-gradient(130% 85% at 50% -8%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 48%), linear-gradient(180deg,#F8F5EC 0%, #F6F2E8 44%, #F4F0E6 100%)',
    '--fl-bg-smoke': 'radial-gradient(55% 45% at 18% 6%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%), radial-gradient(70% 60% at 50% 110%, rgba(120,104,80,0.07) 0%, rgba(120,104,80,0) 60%)',
    '--fl-surface-card': 'linear-gradient(179deg,#FDFBF5 0%,#F8F5ED 40%,#F2EEE2 100%)',
    '--fl-surface-elevated': 'linear-gradient(179deg,#FFFFFF 0%,#FBF9F3 35%,#F6F2E8 100%)',
    '--fl-surface-hero': 'linear-gradient(180deg,#FEFCF7 0%,#F8F3EA 45%,#F3EDDD 100%)',
    '--fl-surface-recessed': 'linear-gradient(180deg,#E7E0D0 0%,#EFE9DC 62%,#F1ECE0 100%)',
    '--fl-surface-panel': '#F6F2E8',
    '--fl-surface-modal': 'linear-gradient(180deg,#FFFFFF 0%,#F9F6EF 100%)',
    '--fl-surface-nav': 'rgba(250,247,240,0.97)',
    '--fl-bronze-border': 'rgba(164,122,61,0.52)', '--fl-bronze-border-subtle': 'rgba(164,122,61,0.26)',
    '--fl-bronze-tint': 'rgba(164,122,61,0.085)', '--fl-bronze-glow-a': 'rgba(164,122,61,0.08)',
    '--fl-bronze-glow-ring': '0 0 24px 2px rgba(164,122,61,0.16)',
    '--fl-glow-subtle': '0 0 20px rgba(164,122,61,0.12)', '--fl-glow-badge': '0 0 16px rgba(164,122,61,0.20)',
    '--fl-glow-ember': 'radial-gradient(circle, rgba(164,122,61,0.16) 0%, rgba(164,122,61,0) 70%)',
    '--fl-glow-focus': 'drop-shadow(0 0 8px rgba(164,122,61,0.4))',
    '--fl-shadow-card': '0 1px 2px rgba(70,58,42,0.07), 0 5px 14px -8px rgba(70,58,42,0.20)',
    '--fl-shadow-elevated': '0 2px 4px rgba(70,58,42,0.07), 0 12px 28px -12px rgba(70,58,42,0.28)',
    '--fl-shadow-modal': '0 4px 8px rgba(70,58,42,0.08), 0 28px 64px -20px rgba(70,58,42,0.38)',
    '--fl-shadow-image': '0 2px 5px rgba(70,58,42,0.10), 0 14px 32px -14px rgba(70,58,42,0.30)',
    '--fl-shadow-ambient': '0 30px 80px -30px rgba(70,58,42,0.34), 0 4px 12px rgba(70,58,42,0.06)',
    '--fl-shadow-float': '0 4px 10px rgba(70,58,42,0.08), 0 20px 44px -18px rgba(70,58,42,0.30)',
    '--fl-card-hero-wash': 'linear-gradient(180deg, rgba(164,122,61,0.05) 0%, rgba(164,122,61,0) 42%)',
    '--fl-shadow-card-hero': 'inset 0 1px 0 rgba(255,255,255,0.9),0 10px 26px -20px rgba(70,58,42,0.35)',
    '--fl-shadow-card-soft': 'inset 0 1px 0 rgba(255,255,255,0.8),0 8px 20px -18px rgba(70,58,42,0.28)',
    '--fl-status-online': '#2F7D50', '--fl-status-online-glow': '0 0 6px rgba(47,125,80,0.35)',
    '--fl-green-muted': '#3E7A4C', '--fl-red-muted': '#A6402F', '--fl-blue-muted': '#3C6D92',
    '--fl-icon-container-bg': '#EFEBE0', '--fl-icon-inactive': '#8B8377',
    '--fl-bronze-fill': 'linear-gradient(180deg,#8C7245 0%,#836A3E 50%,#785F37 100%)',
    '--fl-bronze-fill-hover': 'linear-gradient(180deg,#9A7F52 0%,#907548 50%,#846A3E 100%)',
    '--fl-bronze-metal-border': 'rgba(107,86,52,0.48)', '--fl-bronze-metal-border-hover': 'rgba(107,86,52,0.58)',
    '--fl-bronze-metal-top-rim': 'inset 0 1px 0 rgba(255,250,240,0.28)', '--fl-bronze-metal-bottom-rim': 'inset 0 -1px 1px rgba(60,46,26,0.18)',
    '--fl-paper-grain': 'repeating-linear-gradient(94deg, rgba(122,104,78,0.022) 0 1px, rgba(255,255,255,0) 1px 3px), repeating-linear-gradient(4deg, rgba(122,104,78,0.016) 0 1px, rgba(255,255,255,0) 1px 4px)',
    '--fl-paper-vignette': 'radial-gradient(120% 78% at 50% -12%, rgba(255,252,246,0.95) 0%, rgba(255,252,246,0) 52%), radial-gradient(105% 82% at 50% 112%, rgba(122,100,66,0.10) 0%, rgba(122,100,66,0) 58%), radial-gradient(78% 100% at -8% 50%, rgba(122,100,66,0.07) 0%, rgba(122,100,66,0) 46%), radial-gradient(78% 100% at 108% 50%, rgba(122,100,66,0.07) 0%, rgba(122,100,66,0) 46%)'
  };
  function apply() {
    var el = document.documentElement;
    Object.keys(VARS).forEach(function (k) { el.style.setProperty(k, VARS[k]); });
  }
  window.ForgePaperTheme = { apply: apply, vars: VARS };
  apply();
  document.addEventListener('DOMContentLoaded', apply);
})();
