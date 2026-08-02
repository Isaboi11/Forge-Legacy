export const canPickFile = true;

/**
 * Open the OS file chooser and read a .csv/.tsv/.txt as text.
 *
 * An input element created and clicked imperatively, rather than a hidden one rendered into the tree:
 * React Native Web has no `<input type="file">` primitive, and reaching into the DOM once at the moment
 * of the tap is smaller than smuggling a raw element through the view hierarchy.
 *
 * Cancelling resolves rather than rejecting — dismissing a file picker is not an error, and it must not
 * surface as one. There is no reliable cross-browser "cancelled" event, so `focus` is the signal: the
 * window regains it when the dialog closes, and a change event that follows still wins the race.
 */
export async function pickTextFile(): Promise<{ ok: true; text: string; name: string } | { ok: false; reason: string }> {
  if (typeof document === 'undefined') return { ok: false, reason: 'File upload isn’t available here.' };

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.tsv,.txt,text/csv,text/plain';
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';

    let settled = false;
    const done = (r: { ok: true; text: string; name: string } | { ok: false; reason: string }) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(r);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return done({ ok: false, reason: '' }); // dismissed
      file
        .text()
        .then((text) => done({ ok: true, text, name: file.name }))
        .catch(() => done({ ok: false, reason: 'Couldn’t read that file. Try pasting the rows instead.' }));
    };

    // Give the change event a moment to land before treating a regained focus as a cancel.
    window.addEventListener('focus', () => setTimeout(() => done({ ok: false, reason: '' }), 400), { once: true });

    document.body.appendChild(input);
    input.click();
  });
}
