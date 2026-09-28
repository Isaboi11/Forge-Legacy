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

/* @/lib/storage-upload — the media path; nothing under test uploads. */
export const MAX_CHECKIN_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const extensionFor = () => 'jpg';
export const uploadToBucket = async () => {
  throw new Error('no uploads in tests');
};

/* react-native — only what a data module might touch at import time. */
export const Platform = { OS: 'ios', select: (o) => o.ios ?? o.default };
