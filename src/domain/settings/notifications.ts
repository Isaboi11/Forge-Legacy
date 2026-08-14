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
 * Nine of the eleven map to a branch of `notification_events_for` and are live:
 *   squad_activity · friend_requests · workout_tags · program_shares · challenge_updates · squad_feed
 *   · post_comments · squad_reactions · squad_training
 *
 * `squad_feed` joined them in 0122, which added the first FAN-OUT branches (`squad_post`,
 * `squad_checkin` — one row becomes one event per squad member, windowed at 14 days). It had been inert
 * since 0022: the control claimed to govern squad posts and governed nothing. `squad_reactions` was
 * inert for thirteen migrations for the same reason and went live in 0135.
 *
 * TWO are locked by P-5 §3.1/§3.2 and still have no event branch emitting them. They persist intent,
 * exactly as all nine did before 0120, and they are listed here so the screen matches the locked
 * architecture rather than matching the sender:
 *   squad_goals · squad_invites
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
  | 'challenge_updates'
  | 'post_comments'
  | 'squad_training'
  | 'training_briefing';

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
  /*
   * 0153. Its own section, and the ONE default-ON ambient row in this file — both for the same reason.
   *
   * Every other Squad Activity toggle governs something that arrives whether or not you asked for it,
   * which is why that section's blurb promises "Off by default". This one cannot arrive uninvited: the
   * squad's LEADER has to switch training alerts on for the squad, and then the athlete has to say which
   * half they want, in which squads, in that squad's own settings. Two deliberate acts on two screens
   * before a single notification exists.
   *
   * ⚠ SO A DEFAULT OF OFF WOULD BE THE TRAP, not the safe choice. It would sit on a screen the athlete
   * has no reason to visit, silently discarding notifications they had just finished turning on
   * somewhere else — a control whose only observable behaviour is making another control not work. The
   * per-squad switches are the real answer to "do I want this"; this row is the global off switch for
   * an athlete who wants them all to stop at once, which is what it says.
   */
  {
    key: 'training',
    label: 'Training Alerts',
    blurb: 'When your squad-mates train. Turned on per squad — this is the switch that silences them all.',
    toggles: [
      {
        key: 'squad_training',
        label: 'Squad Training Alerts',
        desc: 'When a squad-mate starts or finishes a session, in squads where you’ve asked for it',
        def: true,
        icon: 'dumbbell',
      },
    ],
  },
  /*
   * 0135. `SOC-D11` locks "Comments generate notifications (to the post author; **new P-5 row, §13**)"
   * — so this row is an unapplied locked decision, not a tenth toggle invented here.
   *
   * It is its own section rather than a fourth row under Squad Activity because a comment on a FRIENDS
   * post is not squad activity, and that section's blurb ("The pulse of your squads") would be a lie on
   * half the events it governs.
   *
   * ⚠ REACTIONS ARE NOT HERE, and that is deliberate. They ride `squad_reactions` above, which P-5 §3.1
   * locked and 0022 shipped — inert for thirteen migrations because nothing emitted an event for it.
   * Its default (OFF) is locked by SOC-D11 and is left exactly as locked; moving the row would not
   * change the key, but it would put a locked §3.1 control in a section §3.1 does not describe.
   */
  {
    key: 'posts',
    label: 'Your Posts',
    blurb: 'When someone answers something you shared. A comment is written to you, so it starts on.',
    toggles: [
      { key: 'post_comments', label: 'Comments on Your Posts', desc: 'When someone comments on something you posted', def: true, icon: 'chat' },
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
  /*
   * 0159, and the ONLY row in this file whose notification nobody else causes.
   *
   * Every other toggle here governs an arrival — somebody invited, joined, commented, reacted, trained.
   * `P-5-Notifications-Architecture.md` §1 records that as an audit finding and notes that re-engagement
   * notifications are absent from every locked document; `P-5-Amendment-003-Training-Briefing.md` is the
   * review that adds this one, and the whole of it turns on a single distinction: a BRIEFING states what
   * is next, a NUDGE comments on what you did not do. This is the first kind only.
   *
   * ⚠ OFF BY DEFAULT, unlike Training Alerts above. That row breaks the ambient-is-off habit because two
   * people on two screens must opt in before it can fire at all. This one needs nobody's permission but
   * the athlete's, so the ambient default (P-5 §3.1) is the right one — and DNA §8's "always feel
   * invited, never pushed" is hard to square with a daily push somebody did not ask for.
   */
  {
    key: 'briefing',
    label: 'Morning Briefing',
    blurb: 'What’s next in your training, before you open the app. You choose the days and the time.',
    toggles: [
      {
        key: 'training_briefing',
        label: 'Morning Briefing',
        desc: 'Your next session, named — never a nudge about a session you haven’t done',
        def: false,
        icon: 'dumbbell',
      },
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
  /* 0135. Two kinds, two locked defaults: a comment is aimed at you and defaults ON (SOC-D11, P-5
     §3.2); a reaction rides the `squad_reactions` toggle P-5 §3.1 locked OFF and 0022 shipped inert.
     Both still appear in `/inbox` regardless — these govern push only (P-5 §4). */
  post_comment: 'post_comments',
  post_reaction: 'squad_reactions',
  /* 0153. Both training kinds ride ONE key. The per-squad columns (`squad_members.notify_start` /
     `notify_finish`) already answer "starts, finishes, or both" — a second, global pair would be a
     rival answer to the same question, able to disagree with the first with only the SQL knowing which
     of them won. */
  squad_training_started: 'squad_training',
  squad_training_finished: 'squad_training',
  /* 0159. The kind and the key are the same word because there is only one of each — and it is here at
     all so `briefing_send()` can gate itself through `push_prefs_allows`, the identical check every other
     notification passes, rather than reading `notif_prefs` a second way that could disagree with this. */
  training_briefing: 'training_briefing',
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
