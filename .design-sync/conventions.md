# Forge Legacy Design System — Conventions

## Design Language

Forge Legacy is a **dark-luxury, cinematic** fitness app. Every design decision
reinforces one core idea: the user is building a physical legacy, and the UI should
feel like a permanent record of something earned — not a gamified dashboard.

- **Dark-only V1.** There is no light mode. All surfaces use the dark palette below.
- **Bronze = earned.** The `--fl-color-accent-primary` (#C8A97E) bronze appears ONLY
  on surfaces that communicate something the athlete built or achieved. Never use it
  for generic interactive elements.
- **Performance Firewall.** Comparative data (leaderboards, others' stats) is never
  shown on personal surfaces. Squad surfaces are the only exception.

## Styling Idiom — CSS Custom Properties

Style all layouts using the `--fl-*` custom properties defined in `styles.css`.
Do not use raw hex values or arbitrary pixel values — reference the tokens.

```css
/* Background layers */
background: var(--fl-color-bg-primary);    /* Main canvas */
background: var(--fl-color-bg-surface);    /* Cards */
background: var(--fl-color-bg-elevated);   /* Modals, sheets */

/* Text */
color: var(--fl-color-text-primary);       /* Body text */
color: var(--fl-color-text-secondary);     /* Supporting text */
color: var(--fl-color-text-tertiary);      /* Labels, placeholders */
color: var(--fl-color-accent-primary);     /* Bronze — earned states only */

/* Spacing */
gap: var(--fl-space-sm);       /* 8px — within-card gaps */
gap: var(--fl-space-md);       /* 12px — card-to-card */
gap: var(--fl-space-xl);       /* 24px — section gaps */
padding: var(--fl-space-lg);   /* 16px — card inner padding, screen margin */

/* Radius */
border-radius: var(--fl-radius-card);  /* 8px — cards */
border-radius: var(--fl-radius-chip);  /* 99px — pills, badges */

/* Shadows */
box-shadow: var(--fl-shadow-card);
box-shadow: var(--fl-shadow-elevated);
box-shadow: var(--fl-shadow-modal);
```

## Typography

The font family is the platform system font (SF Pro on iOS, Roboto on Android).
For web designs, use `-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`
(already set in `--fl-font-family-system`).

Section headers are ALL-CAPS at 11px / 0.8px tracking — use `--fl-type-section-header-*`
tokens and `text-transform: uppercase`. This is the ONLY place all-caps is used.

```css
/* Screen title */
font-size: var(--fl-type-screen-title-size);     /* 20px */
font-weight: var(--fl-type-screen-title-weight); /* 600 */
line-height: var(--fl-type-screen-title-lh);     /* 26px */

/* Card title */
font-size: var(--fl-type-card-title-size);       /* 18px */
font-weight: var(--fl-type-card-title-weight);   /* 600 */

/* Body */
font-size: var(--fl-type-card-name-size);        /* 16px, weight 500 */
font-size: var(--fl-type-secondary-size);        /* 15px, weight 400 */
font-size: var(--fl-type-meta-size);             /* 14px, weight 400 */

/* Section header (ALL-CAPS only) */
font-size: var(--fl-type-section-header-size);   /* 11px */
letter-spacing: var(--fl-type-section-header-ls); /* 0.8px */
text-transform: var(--fl-type-section-header-transform); /* uppercase */
```

## Idiomatic Layout

```jsx
// A standard Forge Legacy card
<div style={{
  background: 'var(--fl-color-bg-surface)',
  borderRadius: 'var(--fl-radius-card)',
  padding: 'var(--fl-space-lg)',
  boxShadow: 'var(--fl-shadow-card)',
  border: '1px solid var(--fl-color-border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--fl-space-sm)',
}}>
  <span style={{ fontSize: 'var(--fl-type-card-title-size)', fontWeight: 'var(--fl-type-card-title-weight)', color: 'var(--fl-color-text-primary)' }}>
    Title
  </span>
  <span style={{ fontSize: 'var(--fl-type-meta-size)', color: 'var(--fl-color-text-secondary)' }}>
    Supporting text
  </span>
</div>
```

## Token Reference

All token definitions live in `tokens/forge-legacy-tokens.css`, imported by `styles.css`.
Read that file for the complete list before styling anything.
