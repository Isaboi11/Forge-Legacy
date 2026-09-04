/**
 * Hand the athlete a file — in the browser.
 *
 * The native twin (`save-file.ts`) writes to the cache and opens the iOS share sheet. Both expose exactly
 * this one call, so the caller never asks which platform it is on.
 *
 * ⚠ THE WEB PATH IS NOT A COURTESY HERE — IT IS THE ONE THAT GETS TESTED FIRST. The PO tests
 * `forgelegacy.expo.app`, so an export that only worked on device would read as broken for days before
 * anyone found out otherwise.
 *
 * An anchor created and clicked imperatively rather than rendered into the tree: React Native Web has no
 * download primitive, and reaching into the DOM once at the moment of the tap is smaller than smuggling a
 * raw element through the view hierarchy — the reasoning `pick-text-file.web.ts` already settled.
 */
export async function saveTextFile(
  name: string,
  text: string,
  mime = 'text/csv',
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return { ok: false, reason: 'Downloading isn’t available here.' };
  }
  try {
    /* A BOM, and it is not decoration: Excel on Windows reads a UTF-8 CSV as the system codepage without
       one, so an exercise name with an accent or a curly apostrophe arrives mangled. Every other reader
       ignores it. */
    const blob = new Blob([`﻿${text}`], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Released on the next tick rather than immediately — revoking synchronously can beat the browser to
       starting the download in Safari. */
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Couldn’t start the download.' };
  }
}
