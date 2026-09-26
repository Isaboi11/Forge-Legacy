import {
  CONSENT_KINDS,
  CONSENT_POLICY_VERSION,
  consentStatus,
  grantedAt,
  type ConsentAction,
  type ConsentKind,
  type ConsentRecord,
  type ConsentStatus,
} from './consent.ts';

/**
 * THE CONSENT GATE — the decisions, with the network and the sheet injected.
 *
 * `lib/consent.ts` builds the one real instance (Supabase + the global sheet); `__tests__/gate.test.mjs`
 * builds fakes. Everything that can go wrong in a consent flow is decided here, where it can be tested:
 *
 *   · ⚠ A TABLE THAT IS NOT THERE YET IS "NOT YET CONSENTED", NEVER A CRASH. `load` answers null when it
 *     could not read (0224 not applied, offline). The gate then knows nothing, so it asks — and asks
 *     again next launch, because an answer it could not store is held for this session only.
 *   · An answer is honoured AT ONCE on this phone, whether or not the server took it. A withdrawal that
 *     only worked after a round trip would keep sending for the rest of the session.
 *   · Two features asking in the same moment (Holt filling four meal slots in parallel) share ONE sheet.
 */

export interface ConsentGateDeps {
  /** The athlete's stored answers, or null when they could not be read. */
  load(): Promise<ConsentRecord[] | null>;
  /** Show the sheet; true = Agree. Resolves false when there is nowhere to show it. */
  prompt(kind: ConsentKind): Promise<boolean>;
  /** Store one answer. true = stored. Must not throw (a throw is treated as false). */
  record(kind: ConsentKind, action: ConsentAction, policyVersion: string): Promise<boolean>;
  now(): string;
}

export interface ConsentSnapshot {
  /** A read has finished (successfully or not). Before this, nothing should be decided on screen. */
  loaded: boolean;
  /** The last read failed — answers shown are this session's only. */
  unreadable: boolean;
  status: Readonly<Record<ConsentKind, ConsentStatus>>;
  grantedAt: Readonly<Record<ConsentKind, string | null>>;
}

export interface ConsentGate {
  snapshot(): ConsentSnapshot;
  subscribe(fn: () => void): () => void;
  /** Read the stored answers once (again only if the last read failed, or after `reset`). */
  ready(): Promise<void>;
  /** Re-read from the server regardless. */
  refresh(): Promise<void>;
  /** true if consent is in place now; otherwise asks, records the answer, and returns it. */
  ensure(kind: ConsentKind): Promise<boolean>;
  /** Synchronous: consent is known and given. Never asks. For work nobody tapped (a chat summary). */
  allowsNow(kind: ConsentKind): boolean;
  /** Record an answer given outside `ensure` (Settings: withdraw). Resolves whether it was stored. */
  answer(kind: ConsentKind, action: ConsentAction): Promise<boolean>;
  /** A different athlete (or nobody) is signed in: forget everything. */
  reset(): void;
}

export function createConsentGate(deps: ConsentGateDeps): ConsentGate {
  let stored: ConsentRecord[] = [];
  /** Answers given this session that the server has not confirmed. Kept on top of every re-read. */
  let local: ConsentRecord[] = [];
  let loaded = false;
  let unreadable = false;
  let loading: Promise<void> | null = null;
  /** Bumped by `reset`, so a read that began for the last athlete cannot land on the next one. */
  let epoch = 0;
  const pending = new Map<ConsentKind, Promise<boolean>>();
  const listeners = new Set<() => void>();

  const build = (): ConsentSnapshot => {
    const rows = [...stored, ...local];
    const status = {} as Record<ConsentKind, ConsentStatus>;
    const at = {} as Record<ConsentKind, string | null>;
    for (const k of CONSENT_KINDS) {
      status[k] = consentStatus(rows, k);
      at[k] = grantedAt(rows, k);
    }
    return { loaded, unreadable, status, grantedAt: at };
  };
  let snap = build();
  const changed = () => {
    snap = build();
    for (const fn of [...listeners]) fn();
  };

  const read = (): Promise<void> => {
    const mine = epoch;
    const p = deps
      .load()
      .catch(() => null)
      .then((rows) => {
        if (mine !== epoch) return;
        if (rows) {
          stored = rows;
          unreadable = false;
        } else {
          unreadable = true;
        }
        loaded = true;
        loading = null;
        changed();
      });
    loading = p;
    return p;
  };

  const ready = (): Promise<void> => {
    if (loading) return loading;
    if (loaded && !unreadable) return Promise.resolve();
    return read();
  };

  const answer = async (kind: ConsentKind, action: ConsentAction): Promise<boolean> => {
    const mine = epoch;
    const row: ConsentRecord = { kind, action, policyVersion: CONSENT_POLICY_VERSION[kind], createdAt: deps.now() };
    local = [...local, row];
    changed();
    const ok = await deps.record(kind, action, row.policyVersion).catch(() => false);
    if (ok && mine === epoch) {
      // Stored: it now belongs with the server's rows, and survives a re-read that includes it.
      local = local.filter((r) => r !== row);
      stored = [...stored, row];
      changed();
    }
    return ok;
  };

  const ensure = (kind: ConsentKind): Promise<boolean> => {
    const inFlight = pending.get(kind);
    if (inFlight) return inFlight;
    const p = (async () => {
      await ready();
      if (snap.status[kind] === 'granted') return true;
      const agreed = await deps.prompt(kind).catch(() => false);
      // A "Not now" is stored too: Nutrition then shows its door instead of asking on every visit.
      void answer(kind, agreed ? 'granted' : 'declined');
      return agreed;
    })().finally(() => pending.delete(kind));
    pending.set(kind, p);
    return p;
  };

  return {
    snapshot: () => snap,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    ready,
    refresh: () => read(),
    ensure,
    allowsNow: (kind) => snap.status[kind] === 'granted',
    answer,
    reset: () => {
      epoch += 1;
      stored = [];
      local = [];
      loaded = false;
      unreadable = false;
      loading = null;
      pending.clear();
      changed();
    },
  };
}
