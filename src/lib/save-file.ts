import { Share } from 'react-native';

/**
 * Hand the athlete a file — on the phone.
 *
 * The web twin (`save-file.web.ts`) triggers a browser download instead. Both expose exactly this one
 * call, so the caller never asks which platform it is on — the same arrangement as `ding.ts` /
 * `ding.web.ts` and `pick-text-file.ts` / `pick-text-file.web.ts`.
 *
 * ⚠ `expo-file-system` IS LOADED INSIDE THE TAP, NEVER AT THE TOP OF THE FILE.
 *
 * The rule `pick-text-file.ts` states at length, applied for the same reason. A top-level import of a
 * native module evaluates it on launch, and an OTA can carry this JavaScript to a binary that does not
 * contain it — which is the launch-crash shape this repo has shipped once already. `expo-file-system`
 * ships as a dependency of `expo` itself so it is present in every build we have made, and that is an
 * argument for it being safe, not an argument for being careless about it.
 */
export async function saveTextFile(
  name: string,
  text: string,
  /**
   * ⚠ ACCEPTED AND UNUSED ON NATIVE, DELIBERATELY. The web twin needs it for the Blob's type; iOS takes
   * the type from the file's own extension and `ShareOptions` has no field for it (`dialogTitle`,
   * `excludedActivityTypes`, `tintColor`, `subject`, `anchor` — that is the whole type). Dropping the
   * parameter here would give the two halves different signatures, which is exactly what the split-file
   * pattern exists to prevent.
   */
  mime = 'text/csv',
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let fs: typeof import('expo-file-system');
  try {
    fs = await import('expo-file-system');
  } catch {
    return { ok: false, reason: 'Saving files isn’t available in this build.' };
  }

  let uri: string;
  try {
    /* The cache directory, not documents: this file exists to be handed to the share sheet and then
       forgotten. The OS may reclaim it, which is correct — the athlete's copy is wherever they chose to
       put it, and ours is a scratch artefact. */
    const file = new fs.File(fs.Paths.cache, name);
    /* Overwrite rather than fail: exporting twice in one day is a completely reasonable thing to do, and
       `exportBaseName` deliberately reuses a name within the same date. */
    file.create({ overwrite: true });
    file.write(text);
    uri = file.uri;
  } catch {
    return { ok: false, reason: 'Couldn’t write the file. Check your storage and try again.' };
  }

  try {
    /*
     * ⚠ DISMISSING THE SHARE SHEET IS NOT AN ERROR AND MUST NOT READ AS ONE — the same rule
     * `pick-text-file` follows for a cancelled picker. `Share.share` resolves with
     * `action: 'dismissedAction'`; treating that as a failure would tell an athlete who simply changed
     * their mind that their export broke.
     */
    await Share.share({ url: uri, title: name }, { subject: name });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Couldn’t open the share sheet.' };
  }
}
