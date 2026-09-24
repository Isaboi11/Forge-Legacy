/**
 * Nutrition First Run (`Nutrition First Run.dc.html`) — does the tab open on the welcome, or on Home?
 *
 * ⚠ **IT FAILS TOWARD HOME.** The welcome is for someone who has never touched the tab. Showing it to a
 * returning athlete — on a bad signal, or before a read comes back — tells them their diary is gone,
 * which is far worse than a new athlete seeing a zeroed ring for one visit. So every UNKNOWN answers
 * "not a first run": only a clean read of "no food ever, no target ever" earns the welcome.
 *
 * ⚠ **ONCE STARTED, ALWAYS STARTED.** An athlete who logs one food and then deletes it has still started;
 * the welcome would read as a reset. `startedBefore` is the device's memory of that, and it wins.
 */
export interface FirstRunSignals {
  /** This device has already seen this athlete with food or a target. */
  startedBefore: boolean;
  /** Writes held offline in the outbox — food the server has not heard about yet. */
  heldWrites: number;
  /** Any diary entry on the server, ever. `null` = the read failed. */
  anyEntry: boolean | null;
  /** Any target row on the server, ever. `null` = the read failed. */
  anyTarget: boolean | null;
}

export function isFirstRun(s: FirstRunSignals): boolean {
  if (s.startedBefore || s.heldWrites > 0) return false;
  if (s.anyEntry === null || s.anyTarget === null) return false;
  return !s.anyEntry && !s.anyTarget;
}
