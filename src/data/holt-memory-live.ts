/**
 * The "Holt remembers" switch and Forget everything (Sprint 4b §1.4, migration 0278).
 *
 * ⛔ STUB committed by the integrator so lane B compiles alone — lane A replaces the bodies, never the signatures.
 */

/** Is memory on for this athlete? No row, no table yet, or any failure → true (PO: on by default). */
export async function getRemembers(): Promise<boolean> {
  return true;
}

/** Turn memory on or off. True when saved. */
export async function setRemembers(_on: boolean): Promise<boolean> {
  return false;
}

/** Delete every kept fact, chat summary and past chat. True when all of it went. */
export async function forgetEverything(): Promise<boolean> {
  return false;
}
