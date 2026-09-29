import { createContext, useContext, useMemo, useState } from 'react';

import { IS_PAPER } from '@/constants/foundation';

/**
 * The CRM's two palettes, from the design (`Forge CRM.dc.html`, THEMES): Forge (dark) and Alabaster (light).
 *
 * ══ WHY THE CRM CARRIES ITS OWN PALETTE ══
 *
 * The app's theme is chosen ONCE at module load (`foundation.ts` reads `theme-choice`), so switching it means a
 * reload. The design gives the CRM its own Dark / Light switch in the top bar that flips instantly, and its own
 * operator-tuned values (a quieter ground, lower-contrast hairlines for dense tables). So the palette lives here,
 * in context, and the switch starts on whichever theme the app is using.
 */

export type CrmMode = 'forge' | 'alabaster';

export interface CrmPalette {
  bg: string;
  side: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  hover: string;
  tip: string;
  track: string;
  panel: string;
  panelBd: string;
  field: string;
  fieldBd: string;
  /** Primary button fill: a gradient in Forge, flat bronze in Alabaster. */
  btn: readonly [string, string];
  btnBd: string;
  btnInk: string;
  brz: string;
  brzTint: string;
  brzBd: string;
  good: string;
  crit: string;
  critTint: string;
  warn: string;
  warnTint: string;
  scheme: 'dark' | 'light';
}

export const PALETTES: Record<CrmMode, CrmPalette> = {
  forge: {
    bg: '#0C0E10', side: '#090B0C', ink: '#EFE9DF', ink2: '#BDB6AB', ink3: '#8C867D',
    line: 'rgba(239,233,223,0.08)', hover: 'rgba(239,233,223,0.035)', tip: '#1A1C1F', track: 'rgba(239,233,223,0.07)',
    panel: '#131517', panelBd: 'rgba(239,233,223,0.07)', field: '#0F1113', fieldBd: 'rgba(239,233,223,0.14)',
    btn: ['#A47744', '#7F5B33'], btnBd: 'rgba(205,160,99,0.55)', btnInk: '#FBF1E2',
    brz: '#C9975A', brzTint: 'rgba(191,143,79,0.13)', brzBd: 'rgba(201,151,90,0.5)',
    good: '#8DBB97', crit: '#DE8878', critTint: 'rgba(210,122,108,0.14)', warn: '#D6A866', warnTint: 'rgba(214,168,102,0.12)',
    scheme: 'dark',
  },
  alabaster: {
    bg: '#FAF8F4', side: '#F3EFE8', ink: '#1E1B17', ink2: '#4E4943', ink3: '#6A645B',
    line: '#E4DDD2', hover: 'rgba(60,45,25,0.035)', tip: '#FFFDFA', track: '#ECE6DC',
    panel: '#FFFDFA', panelBd: '#E1DAD0', field: '#FFFFFF', fieldBd: '#D6CEC2',
    btn: ['#BA8654', '#BA8654'], btnBd: '#A67644', btnInk: '#17110A',
    brz: '#9A6934', brzTint: 'rgba(166,118,68,0.13)', brzBd: 'rgba(154,105,52,0.5)',
    good: '#3C7549', crit: '#A6473A', critTint: 'rgba(166,71,58,0.10)', warn: '#8A5C2C', warnTint: 'rgba(166,118,68,0.12)',
    scheme: 'light',
  },
};

const STORE_KEY = 'fl_crm_mode_v1';

function initialMode(): CrmMode {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (v === 'forge' || v === 'alabaster') return v;
  } catch {
    /* private window / native — fall through to the app's own theme */
  }
  return IS_PAPER ? 'alabaster' : 'forge';
}

interface Ctx {
  c: CrmPalette;
  mode: CrmMode;
  setMode: (m: CrmMode) => void;
}

const CrmThemeContext = createContext<Ctx>({ c: PALETTES.forge, mode: 'forge', setMode: () => {} });

export function CrmThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<CrmMode>(initialMode);
  const value = useMemo<Ctx>(
    () => ({
      c: PALETTES[mode],
      mode,
      setMode: (m) => {
        setModeState(m);
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, m);
        } catch {
          /* a remembered preference is a convenience, never a requirement */
        }
      },
    }),
    [mode],
  );
  return <CrmThemeContext.Provider value={value}>{children}</CrmThemeContext.Provider>;
}

export function useCrm(): Ctx {
  return useContext(CrmThemeContext);
}
