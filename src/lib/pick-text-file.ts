/**
 * "Or upload a .csv file" — the design's secondary import path.
 *
 * NATIVE STUB. The web build resolves `pick-text-file.web.ts`. A native file picker needs
 * `expo-document-picker`, which this project has not installed and cannot verify without a build — and
 * the paste path covers the same ground on every platform, so nothing is lost by saying so.
 */
export const canPickFile = false;

export async function pickTextFile(): Promise<{ ok: true; text: string; name: string } | { ok: false; reason: string }> {
  return { ok: false, reason: 'File upload works in the browser — paste the rows here instead.' };
}
