/* @ds-bundle: {"format":4,"namespace":"ForgeLegacyVisualFoundation_5368b2","components":[{"name":"AppBar","sourcePath":"components/AppBar/AppBar.jsx"},{"name":"Avatar","sourcePath":"components/Avatar/Avatar.jsx"},{"name":"AvatarGlyph","sourcePath":"components/Avatar/AvatarGlyph.jsx"},{"name":"Button","sourcePath":"components/Button/Button.jsx"},{"name":"CountBadge","sourcePath":"components/CountBadge/CountBadge.jsx"},{"name":"InputField","sourcePath":"components/Inputs/InputField.jsx"},{"name":"TextArea","sourcePath":"components/Inputs/TextArea.jsx"},{"name":"Insignia","sourcePath":"components/Insignia/Insignia.jsx"},{"name":"ListRow","sourcePath":"components/ListRow/ListRow.jsx"},{"name":"BottomSheet","sourcePath":"components/Overlays/BottomSheet.jsx"},{"name":"Modal","sourcePath":"components/Overlays/Modal.jsx"},{"name":"Pill","sourcePath":"components/Pill/Pill.jsx"},{"name":"ProgressBar","sourcePath":"components/Progress/ProgressBar.jsx"},{"name":"ProgressRing","sourcePath":"components/Progress/ProgressRing.jsx"},{"name":"RankMarker","sourcePath":"components/RankMarker/RankMarker.jsx"},{"name":"SectionHeader","sourcePath":"components/SectionHeader/SectionHeader.jsx"},{"name":"StatBlock","sourcePath":"components/StatBlock/StatBlock.jsx"},{"name":"EmptyState","sourcePath":"components/States/EmptyState.jsx"},{"name":"Skeleton","sourcePath":"components/States/Skeleton.jsx"},{"name":"Card","sourcePath":"components/Surface/Card.jsx"},{"name":"Surface","sourcePath":"components/Surface/Surface.jsx"},{"name":"TabBar","sourcePath":"components/TabBar/TabBar.jsx"},{"name":"TimelineRow","sourcePath":"components/TimelineRow/TimelineRow.jsx"},{"name":"Toast","sourcePath":"components/Toast/Toast.jsx"}],"sourceHashes":{"components/AppBar/AppBar.jsx":"501520007b8a","components/Avatar/Avatar.jsx":"5751b50bf81b","components/Avatar/AvatarGlyph.jsx":"0b174463cd9e","components/Button/Button.jsx":"b1e07c78e899","components/CountBadge/CountBadge.jsx":"9e98ac373610","components/Inputs/InputField.jsx":"cf80054bbcf1","components/Inputs/TextArea.jsx":"80ea686f2ab2","components/Insignia/Insignia.jsx":"b086ae14d431","components/ListRow/ListRow.jsx":"0353779bfb36","components/Overlays/BottomSheet.jsx":"f5b3e5ac7294","components/Overlays/Modal.jsx":"6463ac556bfb","components/Pill/Pill.jsx":"18bad22fbaaf","components/Progress/ProgressBar.jsx":"2e62b2a46a12","components/Progress/ProgressRing.jsx":"674aa5ed2377","components/RankMarker/RankMarker.jsx":"634a44efecf1","components/SectionHeader/SectionHeader.jsx":"0d48a636b066","components/StatBlock/StatBlock.jsx":"cd18c569f971","components/States/EmptyState.jsx":"4e5386dd42d3","components/States/Skeleton.jsx":"347c2c745535","components/Surface/Card.jsx":"dd7dd239cabb","components/Surface/Surface.jsx":"20abd65c32a1","components/TabBar/TabBar.jsx":"84266f32d7a4","components/TimelineRow/TimelineRow.jsx":"deda1d41a813","components/Toast/Toast.jsx":"d363fed56e91","image-slot.js":"9309434cb09c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ForgeLegacyVisualFoundation_5368b2 = window.ForgeLegacyVisualFoundation_5368b2 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/AppBar/AppBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const BackChevron = () => /*#__PURE__*/React.createElement("svg", {
  width: "22",
  height: "22",
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("path", {
  d: "M15 5l-7 7 7 7",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.9",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const CloseX = () => /*#__PURE__*/React.createElement("svg", {
  width: "20",
  height: "20",
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 6l12 12M18 6L6 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.9",
  strokeLinecap: "round"
}));

/**
 * Forge Legacy — AppBar (CLA-C18)
 * The fixed top bar. Three leading conventions:
 *   tab root      — no leading control; title left, avatar entry right
 *   pushed screen — back chevron + "‹ Screen Name"  (pass `onBack`)
 *   modal-native  — [×] dismiss  (pass `onClose`)
 * Hidden entirely only during Active Workout (the screen omits it).
 * `avatar` is the single entry point to Profile (there is no Profile tab).
 */
function AppBar({
  title,
  onBack,
  onClose,
  avatar,
  onAvatar,
  actions,
  serif = false,
  transparent = false,
  style: styleOverride,
  ...rest
}) {
  const leading = onBack ? {
    control: /*#__PURE__*/React.createElement(BackChevron, null),
    handler: onBack,
    label: 'Back'
  } : onClose ? {
    control: /*#__PURE__*/React.createElement(CloseX, null),
    handler: onClose,
    label: 'Close'
  } : null;
  const ctrlBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    flex: 'none',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: 'var(--fl-icon-bronze)',
    borderRadius: 'var(--fl-radius-round)'
  };
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      fontFamily: 'var(--fl-font-sans)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minHeight: '56px',
      padding: '8px 12px',
      paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
      background: transparent ? 'transparent' : 'var(--fl-surface-nav)',
      borderBottom: transparent ? 'none' : 'var(--fl-border-subtle)',
      backdropFilter: transparent ? 'none' : 'blur(14px)',
      WebkitBackdropFilter: transparent ? 'none' : 'blur(14px)',
      ...styleOverride
    }
  }, rest), leading ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": leading.label,
    onClick: leading.handler,
    style: ctrlBtn
  }, leading.control) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontFamily: serif ? 'var(--fl-font-display)' : 'var(--fl-font-sans)',
      fontSize: serif ? '21px' : '17px',
      fontWeight: 600,
      letterSpacing: serif ? '-0.2px' : '0.1px',
      color: 'var(--fl-text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      paddingLeft: leading ? '2px' : '6px'
    }
  }, title), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flex: 'none'
    }
  }, actions) : null, avatar != null ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Profile",
    onClick: onAvatar,
    style: {
      ...ctrlBtn,
      width: '38px',
      height: '38px',
      borderRadius: 'var(--fl-radius-round)',
      overflow: 'hidden',
      border: '1px solid var(--fl-bronze-border-subtle)'
    }
  }, avatar) : null);
}
Object.assign(__ds_scope, { AppBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/AppBar/AppBar.jsx", error: String((e && e.message) || e) }); }

// components/Avatar/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const SIZES = {
  squadStack: 28,
  appBar: 36,
  listRow: 40,
  profile: 88,
  modalProfile: 96
};
const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Forge Legacy — Avatar (CLA-C11)
 * Circular athlete photo at a fixed per-context size (squadStack 28 · appBar 36 ·
 * listRow 40 · profile 88 · modalProfile 96, or an explicit px). Falls back to
 * the initials glyph when no `src` is set. `ring` adds a bronze machined edge
 * (used on the profile hero). `presence` shows the squad-online dot.
 */
function Avatar({
  src,
  name,
  size = 'listRow',
  ring = false,
  presence = false,
  style: styleOverride,
  ...rest
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.listRow;
  const frame = {
    position: 'relative',
    width: px,
    height: px,
    flex: 'none',
    borderRadius: 'var(--fl-radius-round)',
    ...styleOverride
  };
  const disc = {
    width: px,
    height: px,
    borderRadius: 'var(--fl-radius-round)',
    overflow: 'hidden',
    border: ring ? 'var(--fl-border-active)' : '1px solid var(--fl-bronze-border-subtle)',
    boxShadow: ring ? 'var(--fl-glow-badge), var(--fl-border-inset)' : 'var(--fl-border-inset)',
    background: 'var(--fl-surface-elevated)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--fl-bronze-primary)',
    fontFamily: 'var(--fl-font-sans)',
    fontWeight: 700,
    fontSize: Math.max(10, Math.round(px * 0.38)),
    letterSpacing: '0.5px',
    userSelect: 'none'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: frame
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: disc
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name || 'Athlete',
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    "aria-label": name ? `${name} (no photo)` : 'Athlete'
  }, initials(name))), presence ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: Math.max(8, Math.round(px * 0.22)),
      height: Math.max(8, Math.round(px * 0.22)),
      borderRadius: 'var(--fl-radius-round)',
      background: 'var(--fl-green-muted)',
      border: '2px solid var(--fl-charcoal-900)'
    }
  }) : null);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Avatar/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/Avatar/AvatarGlyph.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/** Context size tokens (dp) from the component library. */
const SIZES = {
  squadStack: 28,
  appBar: 36,
  listRow: 40,
  profile: 88,
  modalProfile: 96
};
const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Forge Legacy — AvatarGlyph (CLA-C05)
 * The initials fallback shown when an athlete has no profile photo — a forged
 * charcoal disc with bronze letters. Never a generic silhouette icon.
 */
function AvatarGlyph({
  name,
  size = 'listRow',
  style: styleOverride,
  ...rest
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.listRow;
  const text = initials(name);
  return /*#__PURE__*/React.createElement("div", _extends({
    "aria-label": name ? `${name} (no photo)` : 'Athlete',
    style: {
      width: px,
      height: px,
      flex: 'none',
      borderRadius: 'var(--fl-radius-round)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--fl-surface-elevated)',
      border: '1px solid var(--fl-bronze-border-subtle)',
      boxShadow: 'var(--fl-border-inset)',
      color: 'var(--fl-bronze-primary)',
      fontFamily: 'var(--fl-font-sans)',
      fontWeight: 700,
      fontSize: Math.max(10, Math.round(px * 0.38)),
      letterSpacing: '0.5px',
      userSelect: 'none',
      ...styleOverride
    }
  }, rest), text);
}
Object.assign(__ds_scope, { AvatarGlyph });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Avatar/AvatarGlyph.jsx", error: String((e && e.message) || e) }); }

// components/Button/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — Button
 * Five roles:
 *  - `primary`     the one sanctioned bronze full-fill (one per screen)
 *  - `secondary`   machined charcoal surface + hairline edge (lower-emphasis action)
 *  - `destructive` machined red outline (End Workout, delete confirm)
 *  - `text`        bronze affordance ("View all →", "Manage", "Edit")
 *  - `icon`        square icon-only control (44dp hit target) — pass `icon` + `aria-label`
 */
function Button({
  variant = 'primary',
  icon = null,
  trailingIcon = null,
  fullWidth = false,
  disabled = false,
  onClick,
  children,
  style: styleOverride,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const base = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : 'auto',
    opacity: 1,
    pointerEvents: disabled ? 'none' : 'auto',
    transition: 'filter var(--fl-duration-standard) var(--fl-ease-out), transform var(--fl-duration-toggle) var(--fl-ease-out), background var(--fl-duration-standard) var(--fl-ease-out), border-color var(--fl-duration-standard) var(--fl-ease-out)',
    transform: hover && !pressed && variant !== 'text' ? 'translateY(-1px)' : 'translateY(0)'
  };
  const variants = {
    primary: disabled ? {
      background: 'var(--fl-bronze-fill-disabled)',
      color: 'rgba(240, 237, 232, 0.42)',
      textShadow: 'none',
      border: '1px solid var(--fl-bronze-border-disabled)',
      boxShadow: 'var(--fl-border-inset), var(--fl-shadow-card)',
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      fontSize: '14px',
      padding: '15px 26px',
      borderRadius: 'var(--fl-radius-md)'
    } : {
      background: hover ? 'var(--fl-bronze-fill-hover)' : 'var(--fl-bronze-fill)',
      color: '#F7F5F1',
      fontWeight: 700,
      textShadow: '0 1px 1px rgba(8, 5, 2, 0.5)',
      border: hover ? '1px solid var(--fl-bronze-metal-border-hover)' : '1px solid var(--fl-bronze-metal-border)',
      boxShadow: hover ? 'var(--fl-bronze-metal-top-rim), var(--fl-bronze-metal-bottom-rim), var(--fl-bronze-metal-sides), var(--fl-shadow-elevated), var(--fl-glow-forge-hover)' : 'var(--fl-bronze-metal-top-rim), var(--fl-bronze-metal-bottom-rim), var(--fl-bronze-metal-sides), var(--fl-shadow-card), var(--fl-glow-forge)',
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      fontSize: '14px',
      padding: '15px 26px',
      borderRadius: 'var(--fl-radius-md)'
    },
    secondary: disabled ? {
      background: 'var(--fl-charcoal-800)',
      color: 'rgba(240, 237, 232, 0.34)',
      border: '1px solid var(--fl-charcoal-600)',
      boxShadow: 'var(--fl-border-inset)',
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      fontSize: '14px',
      fontWeight: 600,
      padding: '14px 26px',
      borderRadius: 'var(--fl-radius-md)'
    } : {
      background: hover ? 'var(--fl-surface-modal)' : 'var(--fl-surface-elevated)',
      color: 'var(--fl-text-primary)',
      border: hover ? '1px solid var(--fl-bronze-border-subtle)' : '1px solid var(--fl-charcoal-500)',
      boxShadow: hover ? 'var(--fl-border-inset), var(--fl-shadow-elevated)' : 'var(--fl-border-inset), var(--fl-shadow-card)',
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      fontSize: '14px',
      fontWeight: 600,
      padding: '14px 26px',
      borderRadius: 'var(--fl-radius-md)'
    },
    destructive: disabled ? {
      background: 'var(--fl-red-fill)',
      color: 'rgba(190, 90, 76, 0.34)',
      border: '1.5px solid rgba(120, 74, 70, 0.30)',
      boxShadow: 'var(--fl-bronze-metal-sides), var(--fl-shadow-card)',
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      fontSize: '14px',
      padding: '13.5px 26px',
      borderRadius: 'var(--fl-radius-md)'
    } : {
      background: hover ? 'var(--fl-red-fill-hover)' : 'var(--fl-red-fill)',
      color: 'var(--fl-red-muted)',
      fontWeight: 700,
      textShadow: '0 1px 1px rgba(8, 3, 2, 0.5)',
      filter: hover ? 'brightness(1.1)' : 'none',
      border: hover ? '1.5px solid var(--fl-red-metal-border-hover)' : '1.5px solid var(--fl-red-metal-border)',
      boxShadow: hover ? 'var(--fl-red-metal-top-rim), var(--fl-bronze-metal-sides), var(--fl-shadow-elevated), var(--fl-glow-red-hover)' : 'var(--fl-red-metal-top-rim), var(--fl-bronze-metal-sides), var(--fl-shadow-card), var(--fl-glow-red)',
      textTransform: 'uppercase',
      letterSpacing: '0.9px',
      fontSize: '14px',
      padding: '13.5px 26px',
      borderRadius: 'var(--fl-radius-md)'
    },
    text: {
      background: 'transparent',
      color: disabled ? 'rgba(219, 170, 104, 0.4)' : 'var(--fl-bronze-primary)',
      border: 'none',
      filter: !disabled && hover ? 'brightness(1.15)' : 'none',
      fontSize: '13px',
      fontWeight: 500,
      letterSpacing: '0.2px',
      padding: '4px 2px',
      borderRadius: 'var(--fl-radius-xs)'
    },
    icon: {
      background: hover && !disabled ? 'var(--fl-surface-modal)' : 'var(--fl-surface-elevated)',
      color: disabled ? 'var(--fl-icon-inactive)' : 'var(--fl-icon-bronze)',
      border: hover && !disabled ? '1px solid var(--fl-bronze-border-subtle)' : '1px solid var(--fl-charcoal-500)',
      boxShadow: 'var(--fl-border-inset), var(--fl-shadow-card)',
      width: '44px',
      height: '44px',
      minWidth: '44px',
      padding: 0,
      gap: 0,
      borderRadius: 'var(--fl-radius-md)'
    }
  };
  const style = {
    ...base,
    ...variants[variant],
    ...styleOverride
  };
  const iconWrap = {
    display: 'inline-flex',
    alignItems: 'center',
    flex: 'none'
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: style,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPressed(false);
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false)
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: iconWrap
  }, icon) : null, variant !== 'icon' && children != null ? /*#__PURE__*/React.createElement("span", null, children) : null, trailingIcon ? /*#__PURE__*/React.createElement("span", {
    style: iconWrap
  }, trailingIcon) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button/Button.jsx", error: String((e && e.message) || e) }); }

// components/CountBadge/CountBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — CountBadge (CLA-C10)
 * The numeric count indicator only — unread notifications, request counts.
 * This is NOT rank/honor artwork (see Insignia) and NOT the rank text marker
 * (see RankMarker). Bronze is used here as a quiet count tint, never as an
 * urgency/alert signal. Wrap a child to anchor it top-right; render alone for
 * an inline count. `dot` shows a bare presence dot with no number.
 */
function CountBadge({
  count = 0,
  max = 99,
  dot = false,
  children,
  style: styleOverride,
  ...rest
}) {
  const show = dot || count > 0;
  const text = count > max ? `${max}+` : String(count);
  const pill = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minWidth: dot ? '10px' : '19px',
    height: dot ? '10px' : '19px',
    padding: dot ? 0 : '0 6px',
    borderRadius: 'var(--fl-radius-pill)',
    background: 'var(--fl-bronze-fill)',
    border: '1px solid var(--fl-bronze-metal-border)',
    boxShadow: 'var(--fl-bronze-metal-top-rim)',
    color: '#F7F5F1',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.2px',
    lineHeight: 1
  };
  if (!children) {
    if (!show) return null;
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        ...pill,
        ...styleOverride
      }
    }, rest), dot ? null : text);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...styleOverride
    }
  }, rest), children, show ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...pill,
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      border: '2px solid var(--fl-charcoal-900)'
    }
  }, dot ? null : text) : null);
}
Object.assign(__ds_scope, { CountBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/CountBadge/CountBadge.jsx", error: String((e && e.message) || e) }); }

// components/Inputs/InputField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — InputField (CLA-C14)
 * Single-line text entry for names and short fields (chapter, goal, program) —
 * all with explicit character caps. Recessed forged well, bronze focus edge,
 * optional label / helper / counter. Anti-shame: an over-limit or error state
 * is a quiet muted-red edge, never an alarming fill.
 */
function InputField({
  label,
  value,
  defaultValue,
  placeholder,
  helper,
  error,
  maxLength,
  showCount = false,
  type = 'text',
  leadingIcon,
  disabled = false,
  onChange,
  id,
  style: styleOverride,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue || '');
  const controlled = value !== undefined;
  const val = controlled ? value : internal;
  const len = (val || '').length;
  const rid = id || React.useMemo(() => 'in_' + Math.random().toString(36).slice(2, 8), []);
  const edge = error ? 'var(--fl-red-muted)' : focus ? 'var(--fl-bronze-primary)' : 'var(--fl-charcoal-500)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--fl-font-sans)',
      ...styleOverride
    }
  }, label != null ? /*#__PURE__*/React.createElement("label", {
    htmlFor: rid,
    style: {
      display: 'block',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '1.1px',
      textTransform: 'uppercase',
      color: 'var(--fl-text-bronze-label)',
      marginBottom: '9px'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'var(--fl-surface-recessed)',
      border: `1.5px solid ${edge}`,
      borderRadius: 'var(--fl-radius-md)',
      padding: '0 14px',
      boxShadow: focus ? 'inset 0 2px 6px rgba(0,0,0,0.45), var(--fl-glow-subtle)' : 'inset 0 2px 6px rgba(0,0,0,0.45)',
      opacity: disabled ? 0.5 : 1,
      transition: 'border-color var(--fl-duration-standard) var(--fl-ease-out), box-shadow var(--fl-duration-standard) var(--fl-ease-out)'
    }
  }, leadingIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--fl-icon-bronze)',
      flex: 'none'
    }
  }, leadingIcon) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: rid,
    type: type,
    value: val,
    placeholder: placeholder,
    maxLength: maxLength,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onChange: e => {
      if (!controlled) setInternal(e.target.value);
      onChange && onChange(e);
    },
    style: {
      flex: 1,
      minWidth: 0,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'var(--fl-text-primary)',
      fontFamily: 'var(--fl-font-sans)',
      fontSize: '15px',
      padding: '15px 0'
    }
  }, rest))), helper != null || error != null || showCount && maxLength ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: error ? 'var(--fl-red-muted)' : 'var(--fl-text-tertiary)',
      lineHeight: 1.4
    }
  }, error != null ? error : helper), showCount && maxLength ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: len >= maxLength ? 'var(--fl-red-muted)' : 'var(--fl-text-tertiary)',
      fontFamily: 'var(--fl-font-mono)',
      flex: 'none'
    }
  }, len, "/", maxLength) : null) : null);
}
Object.assign(__ds_scope, { InputField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Inputs/InputField.jsx", error: String((e && e.message) || e) }); }

// components/Inputs/TextArea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — TextArea (CLA-C15)
 * Multi-line free text for reflections, chapter/exercise notes (≤300 chars).
 * Same recessed forged well and quiet focus/limit language as InputField.
 */
function TextArea({
  label,
  value,
  defaultValue,
  placeholder,
  helper,
  error,
  maxLength = 300,
  showCount = true,
  rows = 4,
  disabled = false,
  onChange,
  id,
  style: styleOverride,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue || '');
  const controlled = value !== undefined;
  const val = controlled ? value : internal;
  const len = (val || '').length;
  const rid = id || React.useMemo(() => 'ta_' + Math.random().toString(36).slice(2, 8), []);
  const edge = error ? 'var(--fl-red-muted)' : focus ? 'var(--fl-bronze-primary)' : 'var(--fl-charcoal-500)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--fl-font-sans)',
      ...styleOverride
    }
  }, label != null ? /*#__PURE__*/React.createElement("label", {
    htmlFor: rid,
    style: {
      display: 'block',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '1.1px',
      textTransform: 'uppercase',
      color: 'var(--fl-text-bronze-label)',
      marginBottom: '9px'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--fl-surface-recessed)',
      border: `1.5px solid ${edge}`,
      borderRadius: 'var(--fl-radius-md)',
      padding: '4px 14px',
      boxShadow: focus ? 'inset 0 2px 6px rgba(0,0,0,0.45), var(--fl-glow-subtle)' : 'inset 0 2px 6px rgba(0,0,0,0.45)',
      opacity: disabled ? 0.5 : 1,
      transition: 'border-color var(--fl-duration-standard) var(--fl-ease-out), box-shadow var(--fl-duration-standard) var(--fl-ease-out)'
    }
  }, /*#__PURE__*/React.createElement("textarea", _extends({
    id: rid,
    value: val,
    placeholder: placeholder,
    maxLength: maxLength,
    rows: rows,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onChange: e => {
      if (!controlled) setInternal(e.target.value);
      onChange && onChange(e);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'vertical',
      color: 'var(--fl-text-primary)',
      fontFamily: 'var(--fl-font-sans)',
      fontSize: '15px',
      lineHeight: 1.55,
      padding: '11px 0'
    }
  }, rest))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: error ? 'var(--fl-red-muted)' : 'var(--fl-text-tertiary)',
      lineHeight: 1.4
    }
  }, error != null ? error : helper), showCount && maxLength ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: len >= maxLength ? 'var(--fl-red-muted)' : 'var(--fl-text-tertiary)',
      fontFamily: 'var(--fl-font-mono)',
      flex: 'none'
    }
  }, len, "/", maxLength) : null));
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Inputs/TextArea.jsx", error: String((e && e.message) || e) }); }

// components/Insignia/Insignia.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/** Badge scale (dp) — 72 is the L-11 plaque size, 96 the ceremony size. */
const SIZES = {
  sm: 40,
  md: 56,
  lg: 72,
  xl: 96
};

/* Neutral placeholder marks used ONLY until final artwork is delivered.
   Simple geometric outlines — deliberately not finished insignia art. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};
const RankMark = ({
  w
}) => /*#__PURE__*/React.createElement("svg", {
  width: w,
  height: w,
  viewBox: "0 0 24 24",
  style: {
    opacity: 0.5
  }
}, /*#__PURE__*/React.createElement("path", _extends({
  d: "M12 3.5l6.5 2.8v4.7c0 4.3-2.8 7.1-6.5 8.5-3.7-1.4-6.5-4.2-6.5-8.5V6.3z",
  strokeWidth: "1.3"
}, stroke)));
const HonorMark = ({
  w
}) => /*#__PURE__*/React.createElement("svg", {
  width: w,
  height: w,
  viewBox: "0 0 24 24",
  style: {
    opacity: 0.5
  }
}, /*#__PURE__*/React.createElement("circle", _extends({
  cx: "12",
  cy: "10",
  r: "5.4",
  strokeWidth: "1.3"
}, stroke)), /*#__PURE__*/React.createElement("path", _extends({
  d: "M9 15l-1.4 5.2L12 18l4.4 2.2L15 15",
  strokeWidth: "1.3"
}, stroke)));

/**
 * Forge Legacy — Insignia  (badge / rank-insignia system SHELL)
 *
 * The reusable container for the two bespoke brand-artwork families —
 * RankInsignia (7 rank families) and HonorBadge (7 category variants). The
 * FINAL ARTWORK IS DEFERRED, so this component ships the *structure, material,
 * sizing, spacing, label placement and artwork slot* — and stands in a neutral
 * forged placeholder until real art is dropped into the `artwork` slot.
 *
 * LOCKED USAGE RULES
 *  1. This is a bespoke brand asset — NOT a Phosphor icon; icon rules don't apply.
 *  2. Pass finished art into `artwork` when it exists; never hand-author final
 *     insignia/badge art inline — the placeholder is the sanctioned interim.
 *  3. Only EARNED honors are ever shown. `muted` is for the rank-ladder's
 *     future/locked positions only (P-2.2), never for honors.
 *  4. Never place a denominator, "X of Y", rarity label or percentage beside it.
 *  5. Sizes are fixed to the badge scale: sm 40 · md 56 · lg 72 · xl 96.
 */
function Insignia({
  variant = 'rank',
  size = 'lg',
  artwork,
  placeholderLabel,
  label,
  sublabel,
  muted = false,
  glow,
  style: styleOverride,
  ...rest
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.lg;
  const bezel = Math.max(3, Math.round(px * 0.075));
  const showGlow = glow == null ? !muted : glow;
  const Mark = variant === 'honor' ? HonorMark : RankMark;
  const medallion = {
    position: 'relative',
    width: px,
    height: px,
    flex: 'none',
    borderRadius: 'var(--fl-radius-round)',
    padding: bezel,
    boxSizing: 'border-box',
    // forged bronze bezel ring — the metallic sweep, dimmed when muted
    background: muted ? 'var(--fl-charcoal-600)' : 'var(--fl-bronze-metallic)',
    boxShadow: ['var(--fl-border-inset)', muted ? 'var(--fl-shadow-card)' : 'var(--fl-shadow-image)', showGlow ? 'var(--fl-glow-badge)' : ''].filter(Boolean).join(', '),
    filter: muted ? 'saturate(0.15) brightness(0.7)' : 'none',
    opacity: muted ? 0.7 : 1
  };
  const recess = {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 'var(--fl-radius-round)',
    overflow: 'hidden',
    background: 'var(--fl-surface-recessed)',
    border: '1px solid rgba(0,0,0,0.5)',
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--fl-bronze-primary)'
  };

  // diagonal machined-hatch that marks the disc as an artwork placeholder
  const hatch = {
    position: 'absolute',
    inset: 0,
    background: 'repeating-linear-gradient(45deg, rgba(186,146,92,0.10) 0, rgba(186,146,92,0.10) 1px, transparent 1px, transparent 7px)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--fl-font-sans)',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: Math.round(px * 0.16) + 'px',
      ...styleOverride
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: medallion,
    role: "img",
    "aria-label": label ? String(label) : `${variant} insignia`
  }, /*#__PURE__*/React.createElement("div", {
    style: recess
  }, artwork != null ? artwork : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: hatch
  }), placeholderLabel != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      zIndex: 1,
      fontFamily: 'var(--fl-font-display)',
      fontSize: Math.max(12, Math.round(px * 0.34)) + 'px',
      fontWeight: 600,
      color: 'var(--fl-bronze-primary)',
      letterSpacing: '0.5px',
      lineHeight: 1
    }
  }, placeholderLabel) : /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    w: Math.round(px * 0.5)
  }))))), label != null || sublabel != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      maxWidth: Math.max(96, px * 1.6) + 'px'
    }
  }, label != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: px >= 72 ? '13px' : '11.5px',
      fontWeight: 600,
      color: muted ? 'var(--fl-text-tertiary)' : 'var(--fl-text-primary)',
      lineHeight: 1.25
    }
  }, label) : null, sublabel != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10.5px',
      color: 'var(--fl-text-tertiary)',
      marginTop: '2px',
      lineHeight: 1.3
    }
  }, sublabel) : null) : null);
}
Object.assign(__ds_scope, { Insignia });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Insignia/Insignia.jsx", error: String((e && e.message) || e) }); }

// components/ListRow/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const ChevR = () => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  style: {
    flex: 'none',
    color: 'var(--fl-bronze-primary)'
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M9 5l7 7-7 7",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.9",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const Menu = () => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  style: {
    flex: 'none',
    color: 'var(--fl-bronze-primary)'
  }
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "5",
  r: "1.6",
  fill: "currentColor"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "1.6",
  fill: "currentColor"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "19",
  r: "1.6",
  fill: "currentColor"
}));

/**
 * Forge Legacy — ListRow  (canonical CLA-C16 ListItem)
 * The workhorse 3-zone row (leading / center / trailing) behind history,
 * library, settings and rosters: a bronze-ringed icon, a title (+ optional
 * subtitle), an optional bronze value, an optional media thumbnail, and a
 * trailing affordance.
 *
 * Density tokens fix the row's minimum height per content weight:
 *   compact  48dp — dense settings / picker rows
 *   default  56dp — standard list rows
 *   exercise 72dp — the tallest row, used for exercise / rich media rows
 */
const DENSITY = {
  compact: {
    minHeight: '48px',
    pad: '7px 10px',
    ring: 34,
    gap: '13px',
    title: '14px'
  },
  default: {
    minHeight: '56px',
    pad: '9px 10px',
    ring: 40,
    gap: '14px',
    title: '15px'
  },
  exercise: {
    minHeight: '72px',
    pad: '13px 12px',
    ring: 46,
    gap: '15px',
    title: '15px'
  }
};
function ListRow({
  icon,
  title,
  subtitle,
  value,
  valueUnit,
  thumbnail,
  playable = false,
  density = 'default',
  trailing = 'chevron',
  onClick,
  style: styleOverride,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = typeof onClick === 'function';
  const d = DENSITY[density] || DENSITY.default;
  const row = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'flex',
    alignItems: 'center',
    gap: d.gap,
    minHeight: d.minHeight,
    padding: d.pad,
    borderRadius: 'var(--fl-radius-lg)',
    cursor: clickable ? 'pointer' : 'default',
    background: hover && clickable ? 'var(--fl-hover-wash)' : 'transparent',
    transition: 'background var(--fl-duration-standard) var(--fl-ease-out)',
    ...styleOverride
  };
  const ring = {
    width: d.ring + 'px',
    height: d.ring + 'px',
    borderRadius: 'var(--fl-radius-round)',
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--fl-icon-bronze)',
    border: '1px solid var(--fl-bronze-border-subtle)',
    background: 'var(--fl-icon-container-bg)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: row,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: ring
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: d.title,
      fontWeight: 600,
      color: 'var(--fl-text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, title), subtitle != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--fl-text-tertiary)',
      marginTop: '3px'
    }
  }, subtitle) : null), value != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '17px',
      fontWeight: 700,
      color: 'var(--fl-bronze-primary)',
      letterSpacing: '-0.2px',
      flex: 'none'
    }
  }, value, valueUnit ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 600,
      marginLeft: '4px',
      letterSpacing: '0.5px'
    }
  }, valueUnit) : null) : null, thumbnail ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: '78px',
      height: '48px',
      borderRadius: 'var(--fl-radius-sm)',
      flex: 'none',
      position: 'relative',
      backgroundImage: `url(${thumbnail})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      border: 'var(--fl-border-subtle)',
      boxShadow: 'var(--fl-shadow-card)'
    }
  }, playable ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--fl-overlay-dark)',
      opacity: 0.35,
      borderRadius: 'var(--fl-radius-sm)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 7.5l8 4.5-8 4.5z",
    fill: "var(--fl-cream-100)"
  }))) : null) : null, trailing === 'chevron' ? /*#__PURE__*/React.createElement(ChevR, null) : trailing === 'menu' ? /*#__PURE__*/React.createElement(Menu, null) : trailing);
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ListRow/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/Overlays/BottomSheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

/**
 * Forge Legacy — BottomSheet (CLA-C21)
 * The utility surface for everything that is NOT a ceremony: Profile, Honor
 * Detail, filters, confirmations, Set Input, action menus, Share Configuration.
 * Slides up from the bottom; tap-outside dismiss is allowed by default. Under
 * Reduce Motion (CLA-P5) it appears instantly with no slide.
 */
function BottomSheet({
  open,
  onClose,
  dismissible = true,
  title,
  showHandle = true,
  maxHeight = '80vh',
  children,
  footer,
  style: styleOverride,
  ...rest
}) {
  const [shown, setShown] = React.useState(false);
  const rm = reduceMotion();
  React.useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    if (rm) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open, rm]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: dismissible ? onClose : undefined,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      background: 'var(--fl-overlay-dark)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      opacity: shown ? 1 : 0,
      transition: rm ? 'none' : 'opacity var(--fl-duration-standard) var(--fl-ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      fontFamily: 'var(--fl-font-sans)',
      width: '100%',
      maxWidth: '520px',
      maxHeight,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--fl-surface-modal)',
      border: '1px solid var(--fl-charcoal-500)',
      borderBottom: 'none',
      borderRadius: 'var(--fl-radius-xl) var(--fl-radius-xl) 0 0',
      boxShadow: 'var(--fl-border-inset-md), var(--fl-shadow-ambient)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      transform: shown ? 'translateY(0)' : 'translateY(100%)',
      transition: rm ? 'none' : 'transform var(--fl-duration-ceremony) var(--fl-ease-out)',
      ...styleOverride
    }
  }, rest), showHandle ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '10px',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '38px',
      height: '4px',
      borderRadius: 'var(--fl-radius-pill)',
      background: 'var(--fl-charcoal-500)'
    }
  })) : null, title != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 22px 4px',
      fontSize: '17px',
      fontWeight: 600,
      color: 'var(--fl-text-primary)',
      flex: 'none'
    }
  }, title) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px 22px',
      overflowY: 'auto',
      flex: 1,
      minHeight: 0
    }
  }, children), footer != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px',
      borderTop: 'var(--fl-border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      flex: 'none'
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Overlays/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/Overlays/Modal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

/**
 * Forge Legacy — Modal (CLA-C20)
 * Reserved for ceremony moments (M-1…M-9). Centered overlay, NO tap-outside
 * dismiss by default — the athlete must act on it (Continue). Entrance is a
 * quiet scale/opacity lift; under Reduce Motion (CLA-P5) it appears instantly.
 * Ceremony non-behavior is the caller's contract (no confetti / sound / %) —
 * this shell only owns the overlay, the forged panel, and the action row.
 */
function Modal({
  open,
  onClose,
  dismissible = false,
  title,
  eyebrow,
  children,
  footer,
  artwork,
  style: styleOverride,
  ...rest
}) {
  const [shown, setShown] = React.useState(false);
  const rm = reduceMotion();
  React.useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    if (rm) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open, rm]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: dismissible ? onClose : undefined,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--fl-overlay-dark)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      opacity: shown ? 1 : 0,
      transition: rm ? 'none' : 'opacity var(--fl-duration-standard) var(--fl-ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      fontFamily: 'var(--fl-font-sans)',
      width: '100%',
      maxWidth: '380px',
      background: 'var(--fl-surface-modal)',
      border: '1px solid var(--fl-charcoal-500)',
      borderRadius: 'var(--fl-radius-xl)',
      boxShadow: 'var(--fl-border-inset-md), var(--fl-shadow-ambient)',
      padding: '32px 28px 26px',
      textAlign: 'center',
      transform: shown ? 'scale(1)' : 'scale(0.96)',
      opacity: shown ? 1 : 0,
      transition: rm ? 'none' : 'transform var(--fl-duration-ceremony) var(--fl-ease-out), opacity var(--fl-duration-ceremony) var(--fl-ease-out)',
      ...styleOverride
    }
  }, rest), artwork ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px'
    }
  }, artwork) : null, eyebrow != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '1.8px',
      textTransform: 'uppercase',
      color: 'var(--fl-text-bronze-label)',
      marginBottom: '12px'
    }
  }, eyebrow) : null, title != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--fl-font-display)',
      fontSize: '26px',
      fontWeight: 600,
      letterSpacing: '-0.3px',
      color: 'var(--fl-text-primary)',
      lineHeight: 1.15,
      marginBottom: '12px'
    }
  }, title) : null, children != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14.5px',
      lineHeight: 1.6,
      color: 'var(--fl-text-secondary)'
    }
  }, children) : null, footer != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '26px'
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Overlays/Modal.jsx", error: String((e && e.message) || e) }); }

// components/Pill/Pill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — Pill
 * A small uppercase attribute tag (COMPOUND, PUSH). Hairline bronze border,
 * near-transparent fill. Never a solid bronze slab.
 */
function Pill({
  children,
  tone = 'bronze',
  size = 'md',
  style: styleOverride,
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: '10px',
      padding: '5px 10px',
      letterSpacing: '0.9px'
    },
    md: {
      fontSize: '12px',
      padding: '9px 16px',
      letterSpacing: '1px'
    }
  };
  const tones = {
    bronze: {
      color: 'var(--fl-bronze-primary)',
      border: '1px solid var(--fl-bronze-border-subtle)',
      background: 'var(--fl-bronze-tint)'
    },
    muted: {
      color: 'var(--fl-text-secondary)',
      border: 'var(--fl-border-subtle)',
      background: 'transparent'
    }
  };
  const style = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 600,
    textTransform: 'uppercase',
    borderRadius: 'var(--fl-radius-sm)',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    ...sizes[size],
    ...tones[tone],
    ...styleOverride
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Pill/Pill.jsx", error: String((e && e.message) || e) }); }

// components/Progress/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

/**
 * Forge Legacy — ProgressBar (CLA-C12)
 * The single general-purpose progress indicator: goal progress, program
 * progress, rank sub-tier / family bars. 6dp track, fills left-to-right ONLY —
 * it never drains, never turns red, never shows "% remaining". Reduce Motion
 * (CLA-P5): the fill snaps to width with no transition.
 */
function ProgressBar({
  value = 0,
  max = 100,
  height = 6,
  label,
  trailing,
  showTrack = true,
  style: styleOverride,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0)) * 100;
  const rm = reduceMotion();
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--fl-font-sans)',
      ...styleOverride
    }
  }, rest), label != null || trailing != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '9px'
    }
  }, label != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      color: 'var(--fl-text-secondary)'
    }
  }, label) : /*#__PURE__*/React.createElement("span", null), trailing != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--fl-bronze-primary)',
      flex: 'none'
    }
  }, trailing) : null) : null, /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": Math.round(pct),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    style: {
      position: 'relative',
      height: `${height}px`,
      borderRadius: 'var(--fl-radius-pill)',
      background: showTrack ? 'var(--fl-charcoal-600)' : 'transparent',
      boxShadow: showTrack ? 'inset 0 1px 2px rgba(0,0,0,0.5)' : 'none',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: `${pct}%`,
      background: 'var(--fl-bronze-metallic)',
      borderRadius: 'var(--fl-radius-pill)',
      boxShadow: pct > 0 ? '0 0 8px rgba(186,146,92,0.35)' : 'none',
      transition: rm ? 'none' : 'width var(--fl-duration-ceremony) var(--fl-ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Progress/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/Progress/ProgressRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

/**
 * Forge Legacy — ProgressRing
 * SCOPED COMPONENT — owned exclusively by the Rest Timer surface (W-9–W-16).
 * It is deliberately NOT part of the general catalog and must not be reused
 * elsewhere without a formal amendment. A 12-o'clock-origin, clockwise arc that
 * fills toward the reference duration and simply HOLDS full at 100% — it never
 * resets, pulses, or changes color. If no reference duration exists it should be
 * unmounted entirely, not rendered empty.
 */
function ProgressRing({
  value = 0,
  max = 100,
  size = 76,
  stroke = 5,
  children,
  style: styleOverride,
  ...rest
}) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const rm = reduceMotion();
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "img",
    "aria-label": `Rest ${Math.round(pct * 100)}% of reference`,
    style: {
      position: 'relative',
      width: size,
      height: size,
      flex: 'none',
      fontFamily: 'var(--fl-font-sans)',
      ...styleOverride
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--fl-charcoal-600)",
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--fl-bronze-primary)",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: offset,
    style: {
      transition: rm ? 'none' : 'stroke-dashoffset var(--fl-duration-standard) linear',
      filter: 'drop-shadow(0 0 4px rgba(186,146,92,0.3))'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }
  }, children));
}
Object.assign(__ds_scope, { ProgressRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Progress/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/RankMarker/RankMarker.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const Star = () => /*#__PURE__*/React.createElement("svg", {
  width: "14",
  height: "14",
  viewBox: "0 0 24 24",
  style: {
    flex: 'none'
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 2.6l2.65 6.02 6.55.55-4.98 4.3 1.5 6.4L12 16.9l-5.72 3.47 1.5-6.4-4.98-4.3 6.55-.55z",
  fill: "currentColor"
}));

/**
 * Forge Legacy — RankMarker
 * The inline rank / honor *text* marker: a bronze star (or custom glyph) beside
 * a letterspaced uppercase label — "ARCHITECT · IV". `honor` adds a faint bronze
 * tile behind it. This is NOT badge artwork (see Insignia) and NOT a numeric
 * count (see CountBadge) — it is the typographic rank line only.
 */
function RankMarker({
  label,
  icon,
  variant = 'rank',
  size = 'md',
  style: styleOverride,
  ...rest
}) {
  const glyph = icon !== undefined ? icon : /*#__PURE__*/React.createElement(Star, null);
  const sizes = {
    sm: {
      fontSize: '11px',
      letterSpacing: '1.2px',
      gap: '6px',
      pad: '5px 9px'
    },
    md: {
      fontSize: '14px',
      letterSpacing: '1.6px',
      gap: '8px',
      pad: '6px 12px'
    }
  };
  const s = sizes[size] || sizes.md;
  const wrap = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: s.gap,
    color: 'var(--fl-bronze-primary)',
    fontSize: s.fontSize,
    fontWeight: 700,
    letterSpacing: s.letterSpacing,
    textTransform: 'uppercase',
    lineHeight: 1,
    ...(variant === 'honor' ? {
      padding: s.pad,
      borderRadius: 'var(--fl-radius-sm)',
      background: 'var(--fl-bronze-tint)',
      border: '1px solid var(--fl-bronze-border-subtle)'
    } : {}),
    ...styleOverride
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: wrap
  }, rest), glyph ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--fl-bronze-primary)'
    }
  }, glyph) : null, /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { RankMarker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/RankMarker/RankMarker.jsx", error: String((e && e.message) || e) }); }

// components/SectionHeader/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — SectionHeader (CLA-C17)
 * The 11sp ALL-CAPS label that precedes every distinct content group
 * ("MY SQUAD", "WHO'S IN", honor categories). This is the ONLY sanctioned
 * all-caps scale in the product. Optional trailing action ("View all →").
 */
function SectionHeader({
  label,
  action,
  onAction,
  icon,
  style: styleOverride,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--fl-font-sans)',
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '14px',
      ...styleOverride
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: 0
    }
  }, icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--fl-icon-bronze)',
      flex: 'none',
      position: 'relative',
      top: '1px'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '1.6px',
      textTransform: 'uppercase',
      color: 'var(--fl-text-bronze-label)',
      lineHeight: 1.2,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, label)), action != null ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAction,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '2px',
      fontFamily: 'var(--fl-font-sans)',
      fontSize: '12px',
      fontWeight: 500,
      letterSpacing: '0.2px',
      color: 'var(--fl-bronze-primary)',
      filter: hover ? 'brightness(1.15)' : 'none',
      transition: 'filter var(--fl-duration-standard) var(--fl-ease-out)'
    }
  }, action, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    style: {
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 5l7 7-7 7",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.1",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))) : null);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/SectionHeader/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/StatBlock/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — StatBlock
 * The engraved stat unit from the profile header: a bronze icon, a large cream
 * value, and a bronze uppercase label. Optional chevron when the block links out.
 */
function StatBlock({
  icon,
  value,
  label,
  onClick,
  style: styleOverride,
  ...rest
}) {
  const clickable = typeof onClick === 'function';
  const [hover, setHover] = React.useState(false);
  const wrap = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '9px',
    textAlign: 'center',
    cursor: clickable ? 'pointer' : 'default',
    ...styleOverride
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: wrap,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fl-icon-bronze)',
      display: 'inline-flex',
      filter: hover && clickable ? 'brightness(1.15)' : 'none',
      transition: 'filter var(--fl-duration-standard) var(--fl-ease-out)'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '30px',
      fontWeight: 700,
      color: 'var(--fl-text-stat)',
      letterSpacing: '-0.5px',
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '10.5px',
      fontWeight: 600,
      letterSpacing: '1.1px',
      textTransform: 'uppercase',
      color: 'var(--fl-text-bronze-label)'
    }
  }, label, clickable ? /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    style: {
      opacity: 0.85
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 5l7 7-7 7",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })) : null));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/StatBlock/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/States/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — EmptyState (CLA-C24)
 * IMPORTANT: the product default for an empty section is "Smart Omission" —
 * omit the section silently, do NOT render a placeholder. This component is the
 * rare EXPLICIT exception, used only on screens that would otherwise be blank
 * (e.g. W-2 "No active program"). It is invitational, never a shame/urgency
 * signal: a quiet 48dp engraved glyph, a calm line, and an optional action.
 */
function EmptyState({
  icon,
  title,
  message,
  action,
  style: styleOverride,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--fl-font-sans)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '14px',
      padding: '40px 28px',
      ...styleOverride
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '72px',
      height: '72px',
      borderRadius: 'var(--fl-radius-round)',
      background: 'var(--fl-icon-container-bg)',
      border: '1px solid var(--fl-bronze-border-subtle)',
      boxShadow: 'var(--fl-border-inset)',
      color: 'var(--fl-icon-bronze)'
    }
  }, icon) : null, title != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '17px',
      fontWeight: 600,
      color: 'var(--fl-text-primary)',
      letterSpacing: '-0.1px'
    }
  }, title) : null, message != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13.5px',
      lineHeight: 1.6,
      color: 'var(--fl-text-secondary)',
      maxWidth: '300px'
    }
  }, message) : null, action != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '6px',
      display: 'flex',
      gap: '12px'
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/States/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/States/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/* Inject the shimmer keyframe once (the only thing inline styles can't express). */
const KEYFRAME_ID = 'fl-skeleton-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(KEYFRAME_ID)) return;
  const el = document.createElement('style');
  el.id = KEYFRAME_ID;
  el.textContent = '@keyframes fl-shimmer{0%{background-position:-160% 0}100%{background-position:160% 0}}';
  document.head.appendChild(el);
}
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

/**
 * Forge Legacy — Skeleton (CLA-C23)
 * Loading placeholder in `row` / `card` / `section` variants. Suppress entirely
 * for waits under 200ms (the caller's job). Under Reduce Motion (CLA-P5) the
 * shimmer becomes a flat static block — no animation.
 */
function Block({
  w = '100%',
  h = 14,
  radius = 'var(--fl-radius-sm)',
  rm
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: w,
      height: h,
      borderRadius: radius,
      background: rm ? 'var(--fl-charcoal-700)' : 'linear-gradient(90deg, var(--fl-charcoal-700) 25%, var(--fl-charcoal-600) 50%, var(--fl-charcoal-700) 75%)',
      backgroundSize: '200% 100%',
      animation: rm ? 'none' : 'fl-shimmer 1.4s var(--fl-ease-out) infinite'
    }
  });
}
function Skeleton({
  variant = 'row',
  count = 1,
  style: styleOverride,
  ...rest
}) {
  ensureKeyframes();
  const rm = reduceMotion();
  const one = key => {
    if (variant === 'card') {
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          background: 'var(--fl-surface-card)',
          border: 'var(--fl-border-subtle)',
          borderRadius: 'var(--fl-radius-xl)',
          boxShadow: 'var(--fl-border-inset)',
          padding: '20px'
        }
      }, /*#__PURE__*/React.createElement(Block, {
        w: "55%",
        h: 16,
        rm: rm
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          height: '12px'
        }
      }), /*#__PURE__*/React.createElement(Block, {
        w: "100%",
        h: 12,
        rm: rm
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          height: '8px'
        }
      }), /*#__PURE__*/React.createElement(Block, {
        w: "80%",
        h: 12,
        rm: rm
      }));
    }
    if (variant === 'section') {
      return /*#__PURE__*/React.createElement("div", {
        key: key
      }, /*#__PURE__*/React.createElement(Block, {
        w: "34%",
        h: 11,
        rm: rm
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          height: '16px'
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }
      }, /*#__PURE__*/React.createElement(Block, {
        h: 44,
        radius: "var(--fl-radius-lg)",
        rm: rm
      }), /*#__PURE__*/React.createElement(Block, {
        h: 44,
        radius: "var(--fl-radius-lg)",
        rm: rm
      })));
    }
    // row
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        minHeight: '56px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Block, {
      w: 40,
      h: 40,
      radius: "var(--fl-radius-round)",
      rm: rm
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Block, {
      w: "52%",
      h: 13,
      rm: rm
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '8px'
      }
    }), /*#__PURE__*/React.createElement(Block, {
      w: "34%",
      h: 11,
      rm: rm
    })));
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    "aria-hidden": "true",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: variant === 'row' ? '4px' : '14px',
      ...styleOverride
    }
  }, rest), Array.from({
    length: count
  }, (_, i) => one(i)));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/States/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/Surface/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — Card (CLA-C07)
 * Surface + the standard padding contract. Every Tier-3 screen card
 * (ChapterCard, ProgramCard, GoalCard, HonorCard, SquadCard, WorkoutSessionCard)
 * is built on Card, never a bespoke container.
 *   default  — standard content card
 *   hero     — the one dominant top-of-scroll element (bronze machined edge)
 *   elevated — lifts above the page, for sheets / floating cards
 * Self-contained (token-based) so it carries no runtime dependency on Surface.
 */
const CARD = {
  default: {
    background: 'var(--fl-surface-card)',
    border: 'var(--fl-border-subtle)',
    shadow: 'var(--fl-border-inset), var(--fl-shadow-card)',
    pad: '20px'
  },
  hero: {
    background: 'var(--fl-surface-card)',
    border: 'var(--fl-border-bronze)',
    shadow: 'var(--fl-border-inset-md), var(--fl-shadow-elevated), var(--fl-glow-subtle)',
    pad: '24px'
  },
  elevated: {
    background: 'var(--fl-surface-elevated)',
    border: '1px solid var(--fl-charcoal-500)',
    shadow: 'var(--fl-border-inset-md), var(--fl-shadow-elevated)',
    pad: '22px'
  }
};
function Card({
  variant = 'default',
  radius = 'xl',
  padding,
  onClick,
  children,
  style: styleOverride,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const c = CARD[variant] || CARD.default;
  const clickable = typeof onClick === 'function';
  const style = {
    fontFamily: 'var(--fl-font-sans)',
    position: 'relative',
    background: c.background,
    border: c.border,
    borderRadius: `var(--fl-radius-${radius})`,
    padding: padding != null ? padding : c.pad,
    boxShadow: clickable && hover ? c.shadow.replace('var(--fl-shadow-card)', 'var(--fl-shadow-elevated)') : c.shadow,
    cursor: clickable ? 'pointer' : 'default',
    transition: 'transform var(--fl-duration-standard) var(--fl-ease-out), box-shadow var(--fl-duration-standard) var(--fl-ease-out), border-color var(--fl-duration-standard) var(--fl-ease-out)',
    transform: clickable && hover ? 'translateY(-2px)' : 'translateY(0)',
    borderColor: clickable && hover && variant !== 'hero' ? 'var(--fl-bronze-border-subtle)' : undefined,
    ...styleOverride
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style,
    onClick: onClick,
    onMouseEnter: clickable ? () => setHover(true) : undefined,
    onMouseLeave: clickable ? () => setHover(false) : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Surface/Card.jsx", error: String((e && e.message) || e) }); }

// components/Surface/Surface.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — Surface
 * The forged-steel container primitive (CLA-C06). Every card, sheet and panel
 * is a Surface underneath. It never renders a flat gray rectangle — each variant
 * carries the material gradient, inset top highlight and machined edge from the
 * foundation. Composition only; it adds no padding of its own (that is Card's job).
 */
const SURFACE = {
  card: {
    background: 'var(--fl-surface-card)',
    border: 'var(--fl-border-subtle)',
    shadow: 'var(--fl-border-inset), var(--fl-shadow-card)'
  },
  elevated: {
    background: 'var(--fl-surface-elevated)',
    border: 'var(--fl-border-subtle)',
    shadow: 'var(--fl-border-inset-md), var(--fl-shadow-elevated)'
  },
  recessed: {
    background: 'var(--fl-surface-recessed)',
    border: '1px solid var(--fl-charcoal-700)',
    shadow: 'inset 0 2px 6px rgba(0,0,0,0.45)'
  },
  panel: {
    background: 'var(--fl-surface-panel)',
    border: 'var(--fl-border-subtle)',
    shadow: 'none'
  },
  modal: {
    background: 'var(--fl-surface-modal)',
    border: '1px solid var(--fl-charcoal-500)',
    shadow: 'var(--fl-border-inset-md), var(--fl-shadow-modal)'
  }
};
function Surface({
  variant = 'card',
  radius = 'lg',
  bronzeEdge = false,
  glow = false,
  interactive = false,
  onClick,
  children,
  style: styleOverride,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const s = SURFACE[variant] || SURFACE.card;
  const clickable = interactive || typeof onClick === 'function';
  const style = {
    fontFamily: 'var(--fl-font-sans)',
    position: 'relative',
    background: s.background,
    border: bronzeEdge ? 'var(--fl-border-bronze)' : s.border,
    borderRadius: `var(--fl-radius-${radius})`,
    boxShadow: [s.shadow, glow ? 'var(--fl-glow-subtle)' : ''].filter(Boolean).join(', '),
    cursor: clickable ? 'pointer' : 'default',
    transition: 'transform var(--fl-duration-standard) var(--fl-ease-out), box-shadow var(--fl-duration-standard) var(--fl-ease-out), border-color var(--fl-duration-standard) var(--fl-ease-out)',
    transform: clickable && hover ? 'translateY(-2px)' : 'translateY(0)',
    ...styleOverride
  };
  if (clickable && hover) {
    style.boxShadow = [s.shadow.replace('var(--fl-shadow-card)', 'var(--fl-shadow-elevated)'), glow ? 'var(--fl-glow-subtle)' : ''].filter(Boolean).join(', ');
    if (!bronzeEdge) style.borderColor = 'var(--fl-bronze-border-subtle)';
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style,
    onClick: onClick,
    onMouseEnter: clickable ? () => setHover(true) : undefined,
    onMouseLeave: clickable ? () => setHover(false) : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Surface });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Surface/Surface.jsx", error: String((e && e.message) || e) }); }

// components/TabBar/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/**
 * Forge Legacy — TabBar
 * Bottom navigation. The active item glows bronze; an `emphasized` item (the
 * signature Legacy tab) sits in a lit bronze tile when active.
 */
function TabBar({
  items = [],
  activeId,
  onChange,
  style: styleOverride,
  ...rest
}) {
  const bar = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'flex',
    alignItems: 'stretch',
    background: 'var(--fl-surface-nav)',
    borderTop: 'var(--fl-border-subtle)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    padding: '10px 8px 12px',
    ...styleOverride
  };
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: bar
  }, rest), items.map(it => {
    const active = it.id === activeId;
    const emph = it.emphasized && active;
    const color = active ? 'var(--fl-icon-active)' : 'var(--fl-icon-inactive)';
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      onClick: () => onChange && onChange(it.id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 0',
        color,
        transition: 'color var(--fl-duration-standard) var(--fl-ease-out)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: emph ? '46px' : 'auto',
        height: emph ? '32px' : 'auto',
        borderRadius: emph ? 'var(--fl-radius-md)' : 0,
        background: emph ? 'var(--fl-bronze-fill)' : 'transparent',
        border: emph ? '1px solid var(--fl-bronze-border)' : 'none',
        boxShadow: emph ? 'var(--fl-glow-badge)' : 'none',
        filter: active && !emph ? 'var(--fl-glow-focus)' : 'none',
        color: emph ? 'var(--fl-bronze-bright)' : color
      }
    }, it.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '10.5px',
        fontWeight: active ? 600 : 500,
        letterSpacing: '0.3px'
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/TabBar/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/TimelineRow/TimelineRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;

/* Stroke preset shared by every event glyph. */
const ev = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};
const svg = children => /*#__PURE__*/React.createElement("svg", {
  width: "20",
  height: "20",
  viewBox: "0 0 24 24"
}, children);

/**
 * The 10 canonical Legacy-Timeline event types (L-2). Passing `eventType`
 * selects the engraved node glyph; an explicit `icon` still overrides it.
 */
const EVENT_GLYPH = {
  workout: svg(/*#__PURE__*/React.createElement("path", _extends({
    d: "M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11"
  }, ev))),
  honor: svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", _extends({
    cx: "12",
    cy: "9",
    r: "4.5"
  }, ev)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M9.3 12.8L8 21l4-2.3L16 21l-1.3-8.2"
  }, ev)))),
  goal: svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", _extends({
    cx: "12",
    cy: "12",
    r: "8"
  }, ev)), /*#__PURE__*/React.createElement("circle", _extends({
    cx: "12",
    cy: "12",
    r: "3.4"
  }, ev)), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "0.6",
    fill: "currentColor",
    stroke: "none"
  }))),
  'chapter-open': svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", _extends({
    d: "M5 5.5h6a2 2 0 012 2V19a2 2 0 00-2-2H5z"
  }, ev)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M19 5.5h-6a2 2 0 00-2 2V19a2 2 0 012-2h6z"
  }, ev)))),
  'chapter-seal': svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", _extends({
    cx: "12",
    cy: "11",
    r: "5"
  }, ev)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M9.5 16.5L8.5 21 12 19l3.5 2-1-4.5"
  }, ev)))),
  program: svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", _extends({
    d: "M4 6.5A2.5 2.5 0 016.5 4H18v13H6.5A2.5 2.5 0 004 19.5z"
  }, ev)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M8 9h6M8 12h4"
  }, ev)))),
  accomplishment: svg(/*#__PURE__*/React.createElement("path", _extends({
    d: "M12 3l2.5 5.2 5.7.8-4.1 4 1 5.7L12 21l-5.1 2.5 1-5.7-4.1-4 5.7-.8z"
  }, ev))),
  photo: svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", _extends({
    x: "3.5",
    y: "6",
    width: "17",
    height: "13",
    rx: "2"
  }, ev)), /*#__PURE__*/React.createElement("circle", _extends({
    cx: "12",
    cy: "12.5",
    r: "3"
  }, ev)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M8 6l1.3-2h5.4L16 6"
  }, ev)))),
  rank: svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", _extends({
    d: "M12 3l6 3v5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V6z"
  }, ev)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M9.5 11.5l1.8 1.8 3.2-3.6"
  }, ev)))),
  memory: svg(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", _extends({
    d: "M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v7A2.5 2.5 0 0117.5 17H9l-4 3v-3H6.5"
  }, ev))))
};

/**
 * Forge Legacy — TimelineRow  (CLA-C33 TimelineEventRow)
 * A single entry on the Legacy Timeline: a bronze-ringed node threaded on a
 * vertical connector, a date, a title + subtitle, and an optional media chip.
 * Pass `eventType` for one of the 10 canonical node glyphs, or `icon` to
 * override. Pass `first` / `last` to trim the connector at the ends.
 */
function TimelineRow({
  icon,
  eventType,
  date,
  title,
  subtitle,
  thumbnail,
  playable = false,
  first = false,
  last = false,
  onClick,
  style: styleOverride,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = typeof onClick === 'function';
  const glyph = icon != null ? icon : eventType ? EVENT_GLYPH[eventType] : null;
  const row = {
    fontFamily: 'var(--fl-font-sans)',
    display: 'flex',
    alignItems: 'stretch',
    gap: '14px',
    cursor: clickable ? 'pointer' : 'default',
    background: hover && clickable ? 'var(--fl-hover-wash)' : 'transparent',
    transition: 'background var(--fl-duration-standard) var(--fl-ease-out)',
    borderRadius: 'var(--fl-radius-lg)',
    ...styleOverride
  };
  const line = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '1.5px',
    background: 'var(--fl-bronze-border)'
  };
  const node = {
    position: 'relative',
    zIndex: 1,
    width: '42px',
    height: '42px',
    borderRadius: 'var(--fl-radius-round)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    color: 'var(--fl-icon-bronze)',
    border: '1px solid var(--fl-bronze-border-subtle)',
    background: 'var(--fl-icon-container-bg)',
    boxShadow: 'var(--fl-border-inset)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: row,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '44px',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch'
    }
  }, !first ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...line,
      top: 0,
      height: '50%'
    }
  }) : null, !last ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...line,
      bottom: 0,
      height: '50%'
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: node
  }, glyph)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '92px',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      fontSize: '12.5px',
      color: 'var(--fl-text-secondary)',
      padding: '18px 0'
    }
  }, date), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '18px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--fl-text-primary)',
      lineHeight: 1.25
    }
  }, title), subtitle != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12.5px',
      color: 'var(--fl-text-tertiary)',
      marginTop: '3px'
    }
  }, subtitle) : null), thumbnail ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '68px',
      height: '52px',
      borderRadius: 'var(--fl-radius-sm)',
      position: 'relative',
      backgroundImage: `url(${thumbnail})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      border: 'var(--fl-border-subtle)',
      boxShadow: 'var(--fl-shadow-card)'
    }
  }, playable ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--fl-overlay-dark)',
      opacity: 0.35,
      borderRadius: 'var(--fl-radius-sm)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 7.5l8 4.5-8 4.5z",
    fill: "var(--fl-cream-100)"
  }))) : null)) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      flex: 'none',
      paddingRight: '6px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    style: {
      color: 'var(--fl-bronze-primary)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 5l7 7-7 7",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))));
}
Object.assign(__ds_scope, { TimelineRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/TimelineRow/TimelineRow.jsx", error: String((e && e.message) || e) }); }

// components/Toast/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const React = window.React;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

/**
 * Forge Legacy — Toast (CLA-C22)
 * Transient, non-modal confirmation for events that don't warrant a ceremony
 * ("[Chapter] has started.", "Data export requested."). Auto-dismisses after
 * `duration` ms (default 3000). Positive/neutral only — never an error or
 * urgency signal (those are native alerts). Reduce Motion: no slide.
 */
function Toast({
  open,
  message,
  icon,
  duration = 3000,
  onDismiss,
  style: styleOverride,
  ...rest
}) {
  const [shown, setShown] = React.useState(false);
  const rm = reduceMotion();
  React.useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const raf = rm ? null : requestAnimationFrame(() => setShown(true));
    if (rm) setShown(true);
    const t = duration > 0 ? setTimeout(() => onDismiss && onDismiss(), duration) : null;
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (t) clearTimeout(t);
    };
  }, [open, duration, rm]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    "aria-live": "polite",
    style: {
      position: 'fixed',
      left: '50%',
      bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      transform: `translateX(-50%) translateY(${shown ? '0' : '12px'})`,
      zIndex: 1100,
      maxWidth: 'calc(100vw - 40px)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '11px',
      fontFamily: 'var(--fl-font-sans)',
      background: 'var(--fl-surface-modal)',
      border: '1px solid var(--fl-charcoal-500)',
      borderRadius: 'var(--fl-radius-pill)',
      boxShadow: 'var(--fl-border-inset-md), var(--fl-shadow-float)',
      padding: '13px 20px',
      color: 'var(--fl-text-primary)',
      fontSize: '14px',
      fontWeight: 500,
      opacity: shown ? 1 : 0,
      transition: rm ? 'none' : 'opacity var(--fl-duration-standard) var(--fl-ease-out), transform var(--fl-duration-standard) var(--fl-ease-out)',
      ...styleOverride
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--fl-icon-bronze)',
      flex: 'none'
    }
  }, icon) : null, /*#__PURE__*/React.createElement("span", null, message));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Toast/Toast.jsx", error: String((e && e.message) || e) }); }

// image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "image-slot.js", error: String((e && e.message) || e) }); }

__ds_ns.AppBar = __ds_scope.AppBar;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.AvatarGlyph = __ds_scope.AvatarGlyph;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CountBadge = __ds_scope.CountBadge;

__ds_ns.InputField = __ds_scope.InputField;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.Insignia = __ds_scope.Insignia;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.RankMarker = __ds_scope.RankMarker;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Surface = __ds_scope.Surface;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.TimelineRow = __ds_scope.TimelineRow;

__ds_ns.Toast = __ds_scope.Toast;

})();
