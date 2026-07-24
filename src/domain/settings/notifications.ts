/**
 * Notifications (P-5) — the push preference set, ported from `Forge Notifications.dc.html`.
 *
 * These are REAL, persisted preferences: the athlete's stated intent, stored durably. They control push
 * delivery — and push isn't sending yet (no `expo-notifications`, no server sender), so today they record
 * intent for when that lands. The footer says as much; nothing here claims a notification was sent.
 *
 * Ceremonies and in-app surfaces are never gated by these — a squad post still appears in the feed with
 * "Squad Posts" off; the toggle only silences the push.
 */

import type { SymbolName } from '@/components/forge/ForgeSymbol';

export type NotifKey =
  | 'goal_completed'
  | 'honor_earned'
  | 'chapter_sealed'
  | 'rank_up'
  | 'squad_feed'
  | 'squad_reactions'
  | 'squad_goals'
  | 'workout_tags'
  | 'squad_invites';

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

/** Three sections, defaults and copy verbatim from the design. Personal on, squad off, requests on. */
export const NOTIF_SECTIONS: NotifSection[] = [
  {
    key: 'personal',
    label: 'Personal Milestones',
    blurb: 'Your own moments. On by default — the ones you’ll want to remember.',
    toggles: [
      { key: 'goal_completed', label: 'Goal Completed', desc: 'When you reach a goal you set', def: true, icon: 'target' },
      { key: 'honor_earned', label: 'Honor Earned', desc: 'When you earn a new Honor', def: true, icon: 'medal' },
      { key: 'chapter_sealed', label: 'Chapter Sealed', desc: 'When a Legacy chapter is sealed', def: true, icon: 'book' },
      { key: 'rank_up', label: 'Rank Up', desc: 'When you advance to a new rank', def: true, icon: 'rankUp' },
    ],
  },
  {
    key: 'squad',
    label: 'Squad Activity',
    blurb: 'The pulse of your squads. Off by default — turn on what you want to hear about.',
    toggles: [
      { key: 'squad_feed', label: 'Squad Posts & Activity', desc: 'New posts and workouts in your squads', def: false, icon: 'squad' },
      { key: 'squad_reactions', label: 'Reactions & Mentions', desc: 'When someone reacts to or mentions you', def: false, icon: 'heart' },
      { key: 'squad_goals', label: 'Goal & Mission Updates', desc: 'Squad goal progress and mission milestones', def: false, icon: 'banner' },
    ],
  },
  {
    key: 'requests',
    label: 'Requests',
    blurb: 'Direct asks from other athletes. On by default so you don’t miss them.',
    toggles: [
      { key: 'workout_tags', label: 'Workout Invitations', desc: 'When someone shares a workout with you', def: true, icon: 'dumbbell' },
      { key: 'squad_invites', label: 'Squad Invitations', desc: 'When you’re invited to join a squad', def: true, icon: 'invite' },
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
