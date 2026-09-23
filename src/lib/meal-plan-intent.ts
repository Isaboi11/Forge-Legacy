/**
 * A one-shot hand-off from Recipe back to Meal Plan: "open the swap sheet for this meal".
 *
 * Recipe's Swap goes BACK to the plan rather than pushing a second copy of it, and a back navigation
 * carries no params — so the request waits here and the plan takes it on focus. Taking it clears it,
 * so a later visit never reopens a stale sheet.
 */

let pendingSwap: { d: number; i: number } | null = null;

export function requestSwap(d: number, i: number): void {
  pendingSwap = { d, i };
}

export function takeSwapRequest(): { d: number; i: number } | null {
  const p = pendingSwap;
  pendingSwap = null;
  return p;
}
