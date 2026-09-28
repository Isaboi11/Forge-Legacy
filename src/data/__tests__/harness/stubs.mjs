/**
 * The device-side modules `nutrition-live.ts` reaches, as plain in-memory stand-ins. Resolved in place of the
 * real ones by `hooks.mjs`; everything else the data layer imports is the real file.
 */

/* @react-native-async-storage/async-storage — the outbox and the offline cache live here. */
export const store = new Map();
const AsyncStorage = {
  getItem: async (k) => (store.has(k) ? store.get(k) : null),
  setItem: async (k, v) => void store.set(k, String(v)),
  removeItem: async (k) => void store.delete(k),
};
export default AsyncStorage;

/* @/lib/app-session */
export const uuid = () => globalThis.crypto.randomUUID();
export const currentAppSession = () => null;

/* @/lib/diagnostics */
export const reported = [];
export const reportError = (e) => void reported.push(e);
