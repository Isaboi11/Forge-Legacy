import { requireOptionalNativeModule } from 'expo';

import { handleWatchPayload, type WatchCommandResult } from '@/domain/workout/watch-commands';
import type { WatchState } from '@/domain/workout/watch-projection';

/**
 * ══ THE WIRE BETWEEN THE PHONE AND THE WRIST — NATIVE HALF ══
 *
 * `Docs/Apple-Watch-Companion-Build-Plan.md` §4. Same platform-split shape as `ding.ts` / `ding.web.ts`:
 * the web build resolves `watch-bridge.web.ts`, both expose exactly these calls, and `workout.tsx` never
 * asks which platform it is on.
 *
 * ⚠ THE NATIVE MODULE DOES NOT EXIST YET, AND THAT IS DELIBERATE — NOT A STUB.
 *
 * `requireOptionalNativeModule` returns `null` when a module is absent, so every call below degrades to
 * a no-op on the builds that have no `ForgeWatchBridge` in them. That is what lets the whole TypeScript
 * half of Phase 2 be written, wired into the screen and type-checked on a Windows machine that cannot
 * compile a line of Swift — and lets `modules/watch-bridge/` land later without the screen changing at
 * all. Build 8 on the PO's wrist gets exactly the behaviour it has today: nothing.
 *
 * The one thing that would make this dishonest is if it pretended to be reachable. It does not:
 * `isReachable()` is false without the module, so the wrist's Set done button correctly reads
 * "Phone not reachable" rather than queuing a log nothing will ever confirm.
 *
 * ══ TRANSPORT, WHEN THE SWIFT ARRIVES ══
 *
 * State goes out on `updateApplicationContext` — latest-wins, survives unreachability, and is the
 * correct primitive for "here is the current state" rather than "here is an event". Commands come back
 * on `sendMessage` with a reply. Neither is this file's business beyond the two calls below.
 */

/** What `modules/watch-bridge/` will expose. Kept here so the screen can be typed against it now. */
interface WatchBridgeModule {
  /** One JSON string, the serialized `WatchState`. Latest-wins on the other side. */
  pushState(json: string): void;
  /** Whether a paired, reachable watch is running the companion right now. */
  isReachable(): boolean;
  addListener(event: 'onWatchCommand', listener: (e: { payload: string }) => void): { remove(): void };
}

const native = requireOptionalNativeModule<WatchBridgeModule>('ForgeWatchBridge');

/**
 * The last payload we sent.
 *
 * ⚠ DEDUPED BECAUSE THE SCREEN RE-RENDERS CONSTANTLY. `workout.tsx` re-renders on every tick of the
 * rest clock — roughly once a second, all session. Application context is cheap but Apple rate-limits
 * it, and pushing a byte-identical payload sixty times a minute would spend that budget on nothing.
 * The projection is a pure function of the session, so equal JSON means genuinely nothing changed.
 */
let lastPushed: string | null = null;

export function pushWatchState(state: WatchState): void {
  if (!native) return;
  try {
    const json = JSON.stringify(state);
    if (json === lastPushed) return;
    lastPushed = json;
    native.pushState(json);
  } catch {
    // The wrist is a convenience. A phone that cannot reach it still runs the workout.
  }
}

/** Forget what we last sent — so a fresh subscriber gets the current state rather than nothing. */
export function resetWatchStateCache(): void {
  lastPushed = null;
}

export function isWatchReachable(): boolean {
  try {
    return native ? native.isReachable() : false;
  } catch {
    return false;
  }
}

/**
 * Subscribe to commands from the wrist. Returns its own unsubscribe.
 *
 * The payload is JSON that crossed WatchConnectivity, so it is parsed inside a try and handed to
 * `handleWatchPayload`, which refuses anything that is not one of the four commands. A watch on an
 * older build cannot crash this phone by asking for something it has never heard of.
 */
export function subscribeWatchCommands(onResult?: (result: WatchCommandResult) => void): () => void {
  if (!native) return () => {};
  try {
    const sub = native.addListener('onWatchCommand', (e) => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(e.payload);
      } catch {
        payload = null;
      }
      const result = handleWatchPayload(payload);
      onResult?.(result);
    });
    return () => {
      try {
        sub.remove();
      } catch {
        /* best-effort */
      }
    };
  } catch {
    return () => {};
  }
}
