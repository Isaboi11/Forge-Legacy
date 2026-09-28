/**
 * ══ THE MILE MARKER'S VOICE — WEB ══
 *
 * SILENT, deliberately. The web preview is a place to see the app, not to run with it: a browser tab is
 * suspended when the phone locks, so a marker could never be heard where it matters, and a chime that
 * works only with the screen on would test nothing about the real feature. The run card still shows the
 * marker on screen ("Mile 3 · 8:42"), which is what the preview can honestly check.
 *
 * Every signature matches `mile-voice.ts`, so the card never asks which platform it is on.
 */
import type { MileCue } from './mile-voice';

export type { MileCue };

export function prepareMileVoice(): void {}

export function announceMileMarker(_cue: MileCue): void {}

export function releaseMileVoice(): void {}
