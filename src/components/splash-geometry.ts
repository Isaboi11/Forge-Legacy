import { Dimensions } from 'react-native';

/**
 * The splash's ARTWORK and GEOMETRY — the half of `ForgeSplash` that carries no theme.
 *
 * Split out so `boot.tsx` can draw the same picture. The boot gate renders BEFORE the theme is known
 * and must not import a token, directly or through anything else (see the note there); `ForgeSplash`
 * imports `IS_PAPER` for its ground, so the gate could not use it — and drew a flat dark rectangle
 * instead, which made the pillars vanish for the length of one AsyncStorage read on every cold launch.
 * This module imports nothing but `Dimensions`.
 *
 * ⚠ THE ASSET IS SQUARE, AND THAT IS NOT A STYLISTIC CHOICE.
 *
 * `expo-splash-screen`'s config plugin rasterises `image` into an `imageWidth × imageWidth` SQUARE
 * (`withIosSplashAssets.js`: `width: size, height: size`, and no `fit`), and sharp's default fit is
 * `cover`. So the 308 × 452 carved mark came out as its middle 104 × 104 — top and bottom of the
 * pillars cut off — while JS drew the whole mark at 104 × 153. That was the "two sizes of logo" on
 * every launch: the OS showed a cropped square, then the hand-off replaced it with the full picture.
 *
 * `splash-logo.png` is the same PNG padded to a transparent 452 × 452 square (a centred paste, offset
 * 72 × 0, verified pixel-identical). A square resize of a square is a plain resize, so what the OS
 * rasterises and what JS draws are the same pixels. `WelcomeLogo` keeps the unpadded original: that
 * one is laid out by its own box, not by the plugin.
 */
export const SPLASH_LOGO = require('@/assets/splash-logo.png');

/**
 * `imageWidth` from the `expo-splash-screen` plugin entry in `app.json`. It is the SIDE OF THE SQUARE
 * the plugin draws — the storyboard constrains the image view to `imageWidth × imageWidth` and
 * `scaleAspectFit`s the asset inside it — so this is a box, not the width of the pillars. The pillars
 * come out `150 × 308 / 452 ≈ 102` wide on both sides of the hand-off, which is the point.
 *
 * 150 rather than the old 104 because the mark was always meant to be ~104 wide and the box is taller
 * than it; and 150 rather than 152 so the 3× rasterisation (450px) never upscales the 452px source.
 * `splash-continuity.test.mjs` holds this equal to `app.json`.
 */
export const SPLASH_LOGO_BOX = 150;

/**
 * Centred on the WINDOW, not on the component's own box — and that difference is the whole reason this
 * is computed rather than laid out with `justifyContent: 'center'`.
 *
 * The boot hold fills the screen, but Home's hold fills only the area above the tab bar. Centring each
 * one inside itself would put the pillars ~20pt higher on Home than on boot, so they would visibly JUMP
 * at the moment the tabs mounted — the exact class of stutter the splash exists to remove. An absolute
 * offset from the top of the screen is the same number in both, and it is the storyboard's own
 * `centerY` on the full-screen container.
 *
 * Read once at module scope: the app is portrait-locked (`orientation: "portrait"`), so there is no
 * rotation for this to go stale against.
 */
export const SPLASH_LOGO_TOP = Math.round(Dimensions.get('window').height / 2 - SPLASH_LOGO_BOX / 2);
