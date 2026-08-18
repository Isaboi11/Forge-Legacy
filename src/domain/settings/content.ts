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
      /*
       * ⚠ "EXPORT OR DELETE" WAS HALF FALSE, AND HAD BEEN SINCE THIS WAS WRITTEN.
       *
       * Neither control existed. Delete does now (0148 + Account Settings, App Store 5.1.1(v)). Export
       * does not, and promising it in a legal document while it does not exist is the kind of claim that
       * is worse in Terms than anywhere else in the product.
       *
       * Amended to what is true rather than left aspirational. If a data export is built, this sentence
       * is where it gets its promise back.
       */
      'Your Legacy — your ranks, records, and honors — belongs to you. We store it so it follows you across devices, and you may delete it at any time from Account settings.',
      'Forge Legacy is a training companion, not medical advice. Consult a qualified professional before beginning any new program, and stop if something hurts.',
      'These terms may change as the app grows. We’ll surface material changes in-app before they take effect.',
    ],
  },
  privacy: {
    host: 'forgelegacy.app/privacy',
    title: 'Privacy Policy',
    updated: 'Last updated · Aug 2026',
    /*
     * ⚠ THIS LIST SAID "ONLY" AND WAS NOT EXHAUSTIVE, WHICH IS THE ONE THING A COLLECTION LIST MUST NOT
     *   DO. Flagged by the 2026-08-12 launch audit (§4-3): it named workouts, goals and squads, and
     *   omitted precise location, photos and video, and product-usage analytics — all three of which the
     *   app genuinely collects.
     *
     *   That matters beyond accuracy. **App Store Connect's App Privacy labels are a declaration Apple
     *   holds you to, and signing one that contradicts your own posted policy is worse than either error
     *   alone.** So this is corrected BEFORE those labels are filled in, not after.
     *
     * ⚠ AND IT MUST NOT DRIFT FROM `site/privacy.html`, which is the hosted document Apple links to and
     *   the one that governs. This is the in-app summary of it — shorter by design, never different in
     *   substance. Change one, change the other.
     */
    body: [
      'We collect what the app needs to work: your workouts and records, the goals you set, the chapters you keep, the photos and video you add, and the squads you join.',
      'Tracked runs, walks and rides read your precise location while the session is running. Route maps are trimmed by 200 metres at each end before they are saved, so your start and finish are never stored — not hidden on screen, removed.',
      'We record limited usage events — which features get opened — so we know what to build next. They are never sold, never given to advertisers, and never used to track you across other apps.',
      'You control what others see. Visibility is set per-section, and nothing you mark private is shared beyond you.',
      'We never sell your data. You can delete your account, and everything in it, from Account Settings — it is immediate and permanent.',
      'If you send us feedback or a bug report, we keep what you wrote along with the screen you were on, so we can reproduce it and reply. It is the one place we store words you wrote yourself, and it goes when your account goes.',
      'The full policy is at forgelegacy.app/privacy. Questions? support@forgelegacy.app',
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
  action: { type: 'route'; path: string } | { type: 'sheet'; key: LegalKey | 'about' } | { type: 'deleteAccount' };
  /** Renders in the destructive treatment. Only ever the one row — see `settingsSections`. */
  destructive?: boolean;
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
  /**
   * What the Subscription row reports. `undefined` means entitlement has not resolved — the row then
   * shows no value rather than naming a tier nobody has confirmed. Typed structurally rather than
   * importing `Tier`, so this module stays free of runtime imports outside its own folder.
   */
  tier?: 'FREE' | 'PREMIUM';
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

  /*
   * ⚠ THE ROW NOW OPENS P-8, NOT THE MEMBERSHIP SHEET (Launch Checklist 4.1).
   *
   * The sheet stays in `LEGAL` — it is the membership *document*, reachable from the footer's legal
   * links like Terms and Privacy — but the Subscription row's destination is the screen that can
   * actually change the plan. This is the first of P-8's two locked entry contexts (§2.1): a push, so
   * the header draws a back chevron and popping returns here. The other is M-7's Upgrade tap.
   *
   * ⚠ THE VALUE IS DERIVED, NOT ASSERTED. "Free while testing" was true when nothing could be bought
   * and is a claim about billing the moment something can. `undefined` — entitlement not yet read —
   * renders no value at all rather than guessing a tier onto the row.
   */
  sections.push({
    key: 'membership',
    label: 'Membership',
    rows: [
      {
        key: 'sub',
        label: 'Subscription',
        value: opts.tier === 'PREMIUM' ? 'Premium' : opts.tier === 'FREE' ? 'Free' : undefined,
        action: { type: 'route', path: '/subscription' },
      },
    ],
  });

  sections.push({
    key: 'about',
    label: 'Help & About',
    /*
     * ⚠ SEND FEEDBACK IS A STORE REQUIREMENT, NOT A NICETY. App Store Connect demands a Support URL, and
     *   Apple rejects a bare `mailto:` as one — so `site/support.html` exists, and this row is the
     *   in-app half of the same obligation. Before this, the ONLY support touchpoint in the entire app
     *   was a sentence of copy inside the privacy sheet (`LEGAL.privacy.body`), which is not reachable
     *   by anyone looking for help.
     *
     * ⚠ IT LIVES IN THE EXISTING `about` SECTION ON PURPOSE. `settingsSections` is asserted by exact
     *   section-key array in two tests (`content.test.mjs:97` and `:125`); a new "Help" section fails
     *   both for no user-visible gain. The section LABEL widened to "Help & About" instead — no test
     *   asserts it, and "About" alone is not where anyone looks for support.
     *
     * Feedback first: it is the actionable row, and the one somebody arrives at this screen needing.
     */
    rows: [
      { key: 'feedback', label: 'Send Feedback', action: { type: 'route', path: '/feedback' } },
      { key: 'about', label: 'About Forge Legacy', action: { type: 'sheet', key: 'about' } },
    ],
  });

  /*
   * ⚠ REQUIRED, NOT A FEATURE. App Store Review Guideline 5.1.1(v): an app that lets you create an
   * account must let you delete it from inside the app. There was no delete path anywhere in Forge
   * Legacy — and `LEGAL.terms` above has been promising one the whole time ("you may export or delete it
   * at any time from Account settings"). The Terms described a control that did not exist.
   *
   * Its own section, at the bottom, under its own heading. A destructive, irreversible action does not
   * belong in a list beside "Preferences" where a mis-tap can reach it — and the section label is the
   * first honest warning the athlete gets.
   */
  sections.push({
    key: 'danger',
    label: 'Account',
    rows: [{ key: 'delete', label: 'Delete Account', action: { type: 'deleteAccount' }, destructive: true }],
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
