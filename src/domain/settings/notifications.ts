/**
 * Notifications (P-5) — the push preference set.
 *
 * These are REAL, persisted preferences (`profiles.notif_prefs`, 0022) and, since 0120, a real sender
 * reads them. A toggle turned off here stops a push leaving the server; it never hides the in-app
 * surface — the squad feed, the pending invite and the notification row all still appear (P-5 §4).
 *
 * ══ CEREMONIES NEVER PUSH ══
 *
 * Four toggles used to sit above these — Goal Completed, Honor Earned, Chapter Sealed, Rank Up — ported
 * from the design file and defaulting ON. They were removed in 0120's pass. `P-5-Notifications-
 * Architecture.md` §1 (LOCKED) is unambiguous: M-1, M-2 and M-4 each list "fire as a push notification"
 * under their own Non-Behaviors, so all four categories were audited out of P-5 before it locked. They
 * had no event source, no sender branch, and no route — an athlete could switch "Honor Earned" on and
 * nothing would ever arrive. An inert control is a worse answer than an absent one.
 *
 * ══ WHAT ACTUALLY SENDS TODAY ══
 *
 * Six of the nine map to a branch of `notification_events_for` and are live:
 *   squad_activity · friend_requests · workout_tags · program_shares · challenge_updates · squad_feed
 *
 * `squad_feed` joined them in 0122, which added the first FAN-OUT branches (`squad_post`,
 * `squad_checkin` — one row becomes one event per squad member, windowed at 14 days). It had been inert
 * since 0022: the control claimed to govern squad posts and governed nothing.
 *
 * THREE are locked by P-5 §3.1/§3.2 and still have no event branch emitting them. They persist intent,
 * exactly as all nine did before 0120, and they are listed here so the screen matches the locked
 * architecture rather than matching the sender:
 *   squad_reactions · squad_goals · squad_invites
 *
 * ⚠ `squad_invites` cannot become live by writing a branch: THERE IS NO SQUAD-INVITE TABLE. Invites are
 * code-only — `squad-invite.tsx` shares a link and a code, and nothing records a directed invitation. It
 * would need that table first, which is a feature and not a wiring job.
 */

import type { SymbolName } from '@/components/forge/ForgeSymbol';

export type NotifKey =
  | 'squad_feed'
  | 'squad_reactions'
  | 'squad_goals'
  | 'squad_activity'
  | 'friend_requests'
  | 'workout_tags'
  | 'program_shares'
  | 'squad_invites'
  | 'challenge_updates';

export interface NotifToggle {
  key: NotifKey;
  label: string;
  desc: string;
  def: boolean;
  icon: SymbolName;
}

export interface NotifSection {
  key: string;
  label: string;
  blurb: string;
  toggles: NotifToggle[];
}

/** Squad activity is ambient and stays off; a request is aimed at you, so it stays on (P-5 §3.2). */
export const NOTIF_SECTIONS: NotifSection[] = [
  {
    key: 'squad',
    label: 'Squad Activity',
    blurb: 'The pulse of your squads. Off by default — turn on what you want to hear about.',
    toggles: [
      { key: 'squad_feed', label: 'Squad Posts & Activity', desc: 'New posts and workouts in your squads', def: false, icon: 'squad' },
      { key: 'squad_reactions', label: 'Reactions & Mentions', desc: 'When someone reacts to or mentions you', def: false, icon: 'heart' },
      { key: 'squad_goals', label: 'Goal & Mission Updates', desc: 'Squad goal progress and mission milestones', def: false, icon: 'target' },
      { key: 'squad_activity', label: 'Squad Membership', desc: 'Join requests, approvals, and new members', def: false, icon: 'motion' },
    ],
  },
  {
    key: 'requests',
    label: 'Requests',
    blurb: 'Direct asks from other athletes. On by default so you don’t miss them.',
    toggles: [
      { key: 'friend_requests', label: 'Friend Requests', desc: 'When someone asks to be friends, or accepts', def: true, icon: 'invite' },
      { key: 'workout_tags', label: 'Workout Invitations', desc: 'When someone shares a workout with you', def: true, icon: 'dumbbell' },
      { key: 'program_shares', label: 'Shared Programs', desc: 'When someone sends you a program', def: true, icon: 'book' },
      { key: 'squad_invites', label: 'Squad Invitations', desc: 'When you’re invited to join a squad', def: true, icon: 'banner' },
    ],
  },
  {
    key: 'challenges',
    label: 'Challenges',
    blurb: 'Competitions you’ve joined. Off by default — ambient, not urgent.',
    toggles: [
      { key: 'challenge_updates', label: 'Challenge Updates', desc: 'Invitations and standing changes in your competitions', def: false, icon: 'trophy' },
    ],
  },
];

export const ALWAYS_DELIVERED = {
  title: 'Always delivered',
  body: 'Squad ownership transfers and squad deletion notices reach you no matter what — these can’t be turned off.',
} as const;

export const NOTIF_FOOTER =
  'These control push notifications only. Squad feed entries, workout tags, and pending invites still appear in the app regardless of what’s on here.';

export type NotifMap = Record<NotifKey, boolean>;

const ALL_TOGGLES = NOTIF_SECTIONS.flatMap((s) => s.toggles);

export const NOTIF_DEFAULTS: NotifMap = ALL_TOGGLES.reduce((m, t) => ((m[t.key] = t.def), m), {} as NotifMap);

const NOTIF_KEYS = new Set(ALL_TOGGLES.map((t) => t.key));

/**
 * Which preference governs which event kind — the client-side mirror of `push_pref_key()` in 0120.
 *
 * `request_declined` is absent on purpose and is never pushed: 0073's rule is that a notification whose
 * entire content is a small rejection is worse than none. It still appears in `/inbox`, where the athlete
 * went looking for it.
 *
 * A test asserts this map and these defaults agree with the SQL, because a disagreement means the screen
 * promises one thing and the server does another, with nothing to report the difference.
 */
export const PUSH_KIND_PREF: Record<string, NotifKey> = {
  join_request: 'squad_activity',
  member_joined: 'squad_activity',
  request_approved: 'squad_activity',
  friend_request: 'friend_requests',
  friend_accepted: 'friend_requests',
  challenge_invite: 'challenge_updates',
  workout_invite: 'workout_tags',
  // Reverse arrow, same idea to an athlete: someone wants to train with me. A tenth toggle for it
  // would be a distinction only the schema cares about (0121).
  workout_join_request: 'workout_tags',
  program_shared: 'program_shares',
  // Live since 0122. `squad_feed` had been inert since 0022 — no branch, no trigger, no route.
  squad_post: 'squad_feed',
  squad_checkin: 'squad_feed',
  /* The weekly review (0126) rides `squad_feed` rather than earning a fifth toggle: it IS squad
     activity, and an athlete who switched squad posts off has already said what they want. */
  squad_recap: 'squad_feed',
};

/** Merge a stored map over the defaults, keeping only known keys with boolean values. */
export function sanitizeNotif(raw: unknown): NotifMap {
  const out: NotifMap = { ...NOTIF_DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (NOTIF_KEYS.has(k as NotifKey) && typeof v === 'boolean') out[k as NotifKey] = v;
    }
  }
  return out;
}
