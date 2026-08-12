/**
 * Account Settings — the settings home, and the content P-4 Settings Root left behind.
 *
 * `P-1-Dissolution-Amendment.md` (LOCKED 2026-07-20) dissolved both P-1 Profile and P-4 Settings Root.
 * Account Settings absorbed P-1's identity header and P-4's category map, Sign Out, legal content and
 * version string. This module holds the pure, testable half of that: the legal/about copy, the version
 * line, and the section map.
 *
 * The legal "webview" is deliberately faked, exactly as the design has it — a host label over local
 * paragraphs, not a real browser. Real hosted legal pages would be a product decision, and shipping an
 * in-app sheet that *looks* like it loaded forgelegacy.app while showing bundled text is the honest
 * version of the same thing: the athlete can read the terms offline and nothing pretends to be live.
 */

export interface LegalDocument {
  /** The browser-ish host label in the sheet header. Presentational — nothing is fetched. */
  host: string;
  title: string;
  updated: string;
  body: string[];
}

export type LegalKey = 'terms' | 'privacy' | 'membership';

/** Verbatim from `Forge Settings Root.dc.html` / `Forge Account Settings.dc.html`. */
export const LEGAL: Record<LegalKey, LegalDocument> = {
  membership: {
    host: 'forgelegacy.app/membership',
    title: 'Membership',
    updated: 'Forge Legacy · Free while testing',
    body: [
      'Forge is free while we’re testing. There is no subscription, no billing, and nothing to cancel.',
      'Forge is not pay-to-win. Ranks, records, and honors are earned in the work and can never be purchased. Membership keeps the forge lit; it never buys a place on the podium.',
      'Everything you log is yours and stays free — your history, your ranks, your records, your honors. That does not change when paid plans arrive.',
      'When they do, we’ll say so in the app first, with the price and the terms, before anything changes.',
    ],
  },
  terms: {
    host: 'forgelegacy.app/terms',
    title: 'Terms of Service',
    updated: 'Last updated · Feb 2026',
    body: [
      'Welcome to Forge Legacy. By creating an account and using the app you agree to train responsibly and to the terms set out below.',
      'Your Legacy — your ranks, records, and honors — belongs to you. We store it so it follows you across devices, and you may export or delete it at any time from Account settings.',
      'Forge Legacy is a training companion, not medical advice. Consult a qualified professional before beginning any new program, and stop if something hurts.',
      'These terms may change as the app grows. We’ll surface material changes in-app before they take effect.',
    ],
  },
  privacy: {
    host: 'forgelegacy.app/privacy',
    title: 'Privacy Policy',
    updated: 'Last updated · Feb 2026',
    body: [
      'We collect only what the app needs to work: your workouts, the goals you set, and the squads you join.',
      'You control what others see. Profile visibility is set per-section, and nothing you mark private is shared beyond you.',
      'We never sell your data. Aggregate, de-identified trends may inform product decisions, but your individual records stay yours.',
      'Questions about your data? Reach us any time from Settings › Privacy.',
    ],
  },
};

export const ABOUT_BODY: string[] = [
  'Forge Legacy is a training record built to outlast the session it was written in. Every workout you finish becomes part of a chapter; every chapter becomes part of a legacy.',
  'Ranks, records and honors are earned in the work. Nothing here can be bought, and nothing is awarded for showing up to the app instead of the gym.',
  'Built for people who intend to still be training in ten years.',
];

/**
 * The version line. Reads the REAL app version rather than the design's `2.4.1 (build 318)`, which is
 * placeholder copy — a settings screen that reports a version the binary isn't is worse than useless
 * when someone files a bug against it.
 */
export const versionLine = (version: string | null | undefined, build?: string | number | null): string => {
  const v = version?.trim() || 'dev';
  return build == null || build === '' ? `Forge Legacy ${v}` : `Forge Legacy ${v} (build ${build})`;
};

/** The footer form, in the design's "Version X · Build Y" shape. Real values, not the `.dc`'s 2.4.1. */
export const versionFooter = (version: string | null | undefined, build?: string | number | null): string => {
  const v = version?.trim() || 'dev';
  return build == null || build === '' ? `Version ${v}` : `Version ${v} · Build ${build}`;
};

/** The confirm shown before signing out — verbatim from the design. */
export const SIGN_OUT_CONFIRM = {
  title: 'Sign Out?',
  message: 'You’ll need to sign back in to reach your Legacy on this device.',
} as const;

export interface SettingsRow {
  key: string;
  label: string;
  /** Trailing value text, e.g. the membership state or the home-gym item count. Empty renders just a chevron. */
  value?: string;
  /** What tapping does: push a route, or open one of the in-app sheets. */
  action: { type: 'route'; path: string } | { type: 'sheet'; key: LegalKey | 'about' };
}

export interface SettingsSection {
  key: string;
  label: string;
  rows: SettingsRow[];
}

/**
 * The section map, from `Forge Account Settings.dc.html` lines 259–274.
 *
 * Every row here has a real screen behind it — Profile Visibility (P-6), Notifications (P-5) and
 * Preferences (P-4b) are all built and server-persisted. A row is only ever added once its screen
 * exists; the `opts` flags are the switch, so the map never offers a tap that opens nothing.
 */
export function settingsSections(opts: {
  homeGymSummary?: string;
  hasVisibility?: boolean;
  hasNotifications?: boolean;
  hasPreferences?: boolean;
  /**
   * The operator dashboard row (0129/0130). Absent for everybody who is not in `app_admins`, and
   * absent by DEFAULT — an undefined flag must produce exactly the section list every athlete has
   * today, which is what `content.test.mjs` asserts.
   *
   * Hiding the row is a convenience, not a security boundary: `/admin` is compiled into the web
   * bundle either way, and what actually refuses a non-admin is `admin_guard()` in Postgres.
   */
  isAdmin?: boolean;
}): SettingsSection[] {
  const sections: SettingsSection[] = [];

  const privacy: SettingsRow[] = [];
  if (opts.hasVisibility) privacy.push({ key: 'vis', label: 'Profile Visibility', action: { type: 'route', path: '/profile-visibility' } });
  if (opts.hasNotifications) privacy.push({ key: 'notif', label: 'Notifications', action: { type: 'route', path: '/notifications' } });
  if (privacy.length) sections.push({ key: 'privacy', label: 'Privacy & Alerts', rows: privacy });

  const training: SettingsRow[] = [
    {
      key: 'gym',
      label: 'My Home Gym',
      value: opts.homeGymSummary,
      action: { type: 'route', path: '/home-gym?return=%2Faccount-settings' },
    },
  ];
  if (opts.hasPreferences) {
    training.push({ key: 'prefs', label: 'Preferences', action: { type: 'route', path: '/preferences' } });
  }
  sections.push({ key: 'training', label: 'Training', rows: training });

  sections.push({
    key: 'membership',
    label: 'Membership',
    rows: [{ key: 'sub', label: 'Subscription', value: 'Free while testing', action: { type: 'sheet', key: 'membership' } }],
  });

  sections.push({
    key: 'about',
    label: 'About',
    rows: [{ key: 'about', label: 'About Forge Legacy', action: { type: 'sheet', key: 'about' } }],
  });

  // Last, and in its own section, so it reads as what it is — an operator tool sitting beside the
  // athlete's settings rather than one of them.
  if (opts.isAdmin) {
    sections.push({
      key: 'operator',
      label: 'Operator',
      rows: [{ key: 'admin', label: 'Creator Dashboard', action: { type: 'route', path: '/admin' } }],
    });
  }

  return sections;
}

/** "Forging since March 2025" — P-1 Tier 1, rehomed here by the dissolution amendment. */
export function forgingSince(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return `Forging since ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
}

/** "Architect · IV" — rank family and level, omitting whatever isn't set rather than inventing it. */
export function rankLine(family: string | null | undefined, level: number | null | undefined): string | null {
  if (!family) return null;
  const cap = family.charAt(0).toUpperCase() + family.slice(1).toLowerCase();
  const roman = ['I', 'II', 'III', 'IV'][(level ?? 0) - 1];
  return roman ? `${cap} · ${roman}` : cap;
}
