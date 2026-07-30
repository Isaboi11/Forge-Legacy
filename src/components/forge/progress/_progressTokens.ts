// Component-scoped tokens for progress primitives.
// Not re-exported from index — internal use only.

import { flColor } from '@/constants/foundation';

export const PROG = {
  // Linear bar heights
  HEIGHT_THIN:     4,
  HEIGHT_DEFAULT:  6,
  HEIGHT_THICK:    10,
  HEIGHT_XP:       8,
  HEIGHT_PROGRAM:  10,
  HEIGHT_RANK:     12,

  // Circular sizes (diameter in dp)
  CIRC_SM:         56,
  CIRC_MD:         88,
  CIRC_LG:         120,
  CIRC_COUNTDOWN:  92,

  // Circular stroke widths
  STROKE_SM:       5,
  STROKE_MD:       7,
  STROKE_LG:       8,
  STROKE_COUNTDOWN:6,

  // Pip gap for workout progress
  PIP_GAP: 3,

  // Milestone track
  NODE_SIZE:   28,
  LINE_HEIGHT: 2,

  // Track backgrounds (dark steel, distinct from card surface)
  TRACK_BG:      '#1B1B21',
  TRACK_BG_2:    '#141418',
  TRACK_RANK:    '#16161C',

  // Bronze fill gradient stops
  FILL_FROM:  '#5E4126',
  FILL_MID:   '#916037',
  FILL_TO:    '#B0824C',

  // Darker bronze (workout pips, milestone connectors)
  FILL_DARK_FROM: '#6E4A2A',
  FILL_DARK_TO:   '#A8794A',

  // Leading glow cap
  CAP_COLOR:  flColor.bronze300,

  // Shadow / glow values
  GLOW_FILL:  'rgba(150,100,55,0.26)',
  GLOW_CAP:   'rgba(185,125,65,0.42)',

  // Subtle top-edge highlight inside fill
  HIGHLIGHT_CAP: 'rgba(240,205,150,0.12)',

  // Milestone node gradient
  NODE_FROM:   '#C6975A',
  NODE_TO:     '#7A5433',
  NODE_BORDER: '#4A3521',
} as const
