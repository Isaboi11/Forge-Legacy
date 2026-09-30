# Rest Timer Amendment 001 — The rest timer rings with the phone locked

**Amends:** `Rest-Timer-Architecture-v1.0.md` — lifts §8.1 ("No rest-timer notifications fire in V1"), resolves RT-OQ-1 and RT-OQ-2, and changes one line of the §8.2 framework (the opt-in)
**Touches:** `src/lib/rest-notification.ts`, `src/lib/rest-notification-model.ts`, `src/lib/push.tsx`, the rest ticker in `src/app/workout.tsx`
**Status:** 🔒 LOCKED
**Date:** 2026-09-30
**Origin:** PO, on the phone.

> *"It seems like the timer sound isn't working when my phone is off or if I'm on a different app."*

Closes Decision Queue #31 (open since 2026-09-04). The PO's earlier pick, "sound only, no banner",
cannot be built: iOS has no such thing for an app that is not on screen. Told that the sound comes
with a banner, the PO said yes (2026-09-30).

---

## Why it was silent

The ding is played by a `setInterval` inside the app. iOS suspends the app a few seconds after it
leaves the screen; the interval stops; nothing is left running to ask for a sound. The countdown is
still right on return because it is measured against the clock, not counted.

## Decisions

| # | Decision |
|---|---|
| RT-A1-D1 | When a rest starts, the same deadline is handed to iOS as a **local notification with a sound**. The OS rings it whether the app is suspended or closed. No server, no push. |
| RT-A1-D2 | **It follows the existing Sound switch** in Preferences. Sound off = no notification. This replaces §8.2's "independent third toggle": the athlete asked for the timer's sound to work, not for a new setting. |
| RT-A1-D3 | **Every change to the deadline re-syncs it** — start, ±15s, pause, resume, skip, expiry, leaving the workout. One rule, one effect. |
| RT-A1-D4 | **On screen it shows nothing.** The countdown, the toast and the in-app ding already say it (§8.2 Suppression, kept). |
| RT-A1-D5 | **It never rings twice.** Coming back after the notification rang does not also play the in-app ding. If notifications are off for the app, the late ding stays — it is the only sound there is. |
| RT-A1-D6 | **Tapping it goes nowhere.** The tap brings the app back to the workout it was on. It writes no inbox row. |
| RT-A1-D7 | **No new permission prompt** (RT-OQ-2). It uses the grant `PushProvider` asks for at sign-in. An athlete who declined keeps the on-screen ding and is not asked again mid-set. |
| RT-A1-D8 | Copy: **"Rest complete"** / **"Next set."** — the same words as the in-app toast. |

## Known limits

- **The sound is iOS's default notification sound, not the Forge ding.** A custom sound has to be
  bundled in the native binary. Swap it in with the next build.
- **The silent switch and Focus modes win.** With the ringer off the phone vibrates instead. iOS
  decides that, not the app.
- **Rest timer only.** The hold timer and the interval runner still ding on screen only.
- **Live Activity (build 10):** the lock-screen card shows the countdown; it cannot make a sound by
  itself. This notification is what rings, and it appears alongside the card.
- Web preview: no notifications. The ding there is unchanged.
