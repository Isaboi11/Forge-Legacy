import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The stashed invite, and NOTHING THAT IMPORTS REACT OR THE ROUTER.
 *
 * ══ ⚠ WHY THIS IS A SEPARATE FILE — IT SHIPPED A WHITE SCREEN ══
 *
 * These helpers used to live beside `usePendingInvite` in `pending-invite.tsx`, which imports
 * `useRouter` from `expo-router`. `first-run.ts` needs `clearPendingInvite` for the account-switch wipe,
 * and `auth.tsx` imports `first-run.ts`, and `_layout.tsx` imports `auth.tsx` — and `_layout.tsx` IS the
 * expo-router root.
 *
 *     _layout.tsx → auth.tsx → first-run.ts → pending-invite.tsx → expo-router → (_layout.tsx)
 *
 * So expo-router was being pulled in partway through initialising the very module tree it bootstraps.
 * `useRouter` resolved to undefined at call time, the root threw during render, and the whole app was a
 * white screen — on the web build, where nothing had crashed a moment earlier.
 *
 * Nothing caught it: `tsc` type-checks a cycle happily, `node --test` never loads a screen, and the
 * export succeeded. It is only visible when the app actually boots.
 *
 * ⚠ KEEP THIS FILE FREE OF REACT AND EXPO-ROUTER IMPORTS. Anything reached from `first-run.ts` is
 *   reached during auth initialisation, which is upstream of the router. A hook belongs in
 *   `pending-invite.tsx`; only plain async storage functions belong here.
 */

const KEY = 'forge.pending.invite.v1';

/** Long enough to survive a sign-up with an email round trip; short enough that a stale code is not honoured weeks later. */
const TTL_MS = 24 * 60 * 60 * 1000;

interface Stashed {
  code: string;
  at: number;
}

export async function stashPendingInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() } satisfies Stashed));
  } catch {
    /* Best-effort: a device that cannot write this still reaches sign-in, just without the code. */
  }
}

/**
 * Read AND clear, in one step. An invite is honoured ONCE — leaving it would re-route the athlete to
 * join-squad on every launch, including after they declined it.
 */
export async function takePendingInvite(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<Stashed>;
    if (typeof parsed?.code !== 'string' || typeof parsed?.at !== 'number') return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.code;
  } catch {
    return null;
  }
}

export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
