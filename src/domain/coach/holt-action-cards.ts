/**
 * Action → card model (pure). AI Road to 10 Sprint 4a §1.2. STUB from the integrator — lane C owns and fills it;
 * lane B's meal cards are wired in at merge. Every number on a card is computed here by the app, never the model's.
 */
import type { ActionCardModel, HoltAction } from './holt-actions';

/** What a card needs to know about the athlete. Lane C may add fields (append only). */
export interface CardContext {
  units: 'imperial' | 'metric';
  /** The athlete's local day, YYYY-MM-DD. */
  today: string;
}

/** null = this app cannot draw that action (it is dropped, and the athlete is told nothing changed). */
export async function cardFor(action: HoltAction, ctx: CardContext): Promise<ActionCardModel | null> {
  void action;
  void ctx;
  return null;
}
