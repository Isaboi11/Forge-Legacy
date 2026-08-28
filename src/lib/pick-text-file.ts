import { extractPdfText } from './pdf-text';

/**
 * "Or upload a file — .csv or PDF", on the phone.
 *
 * PO (2026-08-27): *"make sure it can import files/pdfs. If someone purchases a program it's usually a
 * pdf."* This used to be a stub that said "File upload works in the browser"; the web twin
 * (`pick-text-file.web.ts`) reads both. Now native does too, through `expo-document-picker`.
 *
 * ⚠ LOADED INSIDE THE TAP, NEVER AT THE TOP OF THE FILE, AND THAT IS THE WHOLE SAFETY OF IT.
 *
 * `expo-document-picker` is a NATIVE module. It ships with build 8; build 7 — every tester's phone
 * today — does not have it, and an OTA can carry this JavaScript to build 7 all the same. A top-level
 * import would evaluate the module on launch and throw "Cannot find native module" before a single
 * screen rendered: the launch-crash shape this repo has shipped once already. Imported lazily, in a
 * try, the worst case on build 7 is the sentence below, on the one tap that asked for it.
 *
 * `base64: true` hands the bytes back with the pick, so no file-system read is needed: a PDF goes
 * straight to `pdf-text.ts`, a spreadsheet is decoded as text. A scanned PDF has no text and is refused
 * with a reason, exactly as on the web.
 */
export const canPickFile = true;

type PickResult = { ok: true; text: string; name: string } | { ok: false; reason: string };

const NOT_YET = 'File upload arrives with the next app update — paste the rows here instead.';

export async function pickTextFile(): Promise<PickResult> {
  let picker: typeof import('expo-document-picker');
  try {
    picker = await import('expo-document-picker');
  } catch {
    return { ok: false, reason: NOT_YET }; // build 7: the native half is not in this binary
  }

  let res: Awaited<ReturnType<typeof picker.getDocumentAsync>>;
  try {
    res = await picker.getDocumentAsync({
      type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'text/tab-separated-values', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
      base64: true,
    });
  } catch {
    return { ok: false, reason: NOT_YET }; // the module loaded but its native side did not answer
  }
  if (res.canceled) return { ok: false, reason: '' }; // dismissed — not an error, must not show as one
  const asset = res.assets[0];
  if (!asset?.base64) return { ok: false, reason: 'Couldn’t read that file. Try pasting the rows instead.' };

  const bytes = base64ToBytes(asset.base64);
  const isPdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name);
  if (isPdf) {
    try {
      const text = await extractPdfText(bytes);
      if (!text.trim()) return { ok: false, reason: 'That PDF has no text to read — it’s probably a scan. Paste the rows instead.' };
      return { ok: true, text, name: asset.name };
    } catch {
      return { ok: false, reason: 'Couldn’t read that PDF on this phone. Paste its rows instead, or import it on the web.' };
    }
  }
  return { ok: true, text: new TextDecoder().decode(bytes), name: asset.name };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/^data:[^,]*,/, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
