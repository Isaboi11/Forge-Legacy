import { supabase } from '@/lib/supabase';

/**
 * READING A PHOTOGRAPHED PROGRAM — the client half.
 *
 * Calls the `program-photo-read` Edge Function, which holds the API key and does the metering, and
 * hands back **text**. That is the whole contract, and it is deliberately the narrowest one available:
 * this module never sees a program, a week, or an exercise. It gets tab-separated rows, and the caller
 * feeds them to `parseProgramTable()` — the same function a paste goes through, producing the same
 * preview, subject to the same rules about never guessing a name or a set count.
 *
 * ⚠ **SO THE PHOTO PATH ADDS NO INTERPRETATION ANYWHERE.** That is what keeps it inside the locked
 * import principle in `Architecture-Amendment-001-Import.md` §4.3 — *"Import First, Automate Later …
 * No AI interpretation. No inference."* The model transcribes; the existing parser decides. If a future
 * change has this module returning `ParsedWeek[]` instead of a string, that principle has been broken
 * and the amendment needs reopening first.
 *
 * ⚠ **AND NOTHING HERE HOLDS A KEY.** Same rule as `coach-interpret-live.ts`: the Edge Function is the
 * only place Anthropic is called from, because Expo inlines `EXPO_PUBLIC_*` into the bundle.
 *
 * ══ ⚠ AN OUTAGE MUST NOT LOOK LIKE A VERDICT ON THE PHOTO ══
 *
 * `Coach-Chat-Design-Brief-v1.0` §6, and it applies exactly here: *"Offline and error must be visibly
 * different from a refusal."* Three failures look identical to somebody holding a phone and feel very
 * different once they are told which one happened:
 *
 *   · `offline` — the app failed. Try again; the photo was probably fine.
 *   · `unreadable` — we read the image and could not get a table out of it. Try a clearer shot.
 *   · `not_a_program` — we read it fine; it is not a training program.
 *
 * Collapsing those into "couldn't read that" tells someone their program is unreadable when the request
 * never left the building.
 */

export type PhotoReadResult =
  /** Tab-separated rows, ready for `parseProgramTable()`. Never prose — the function's guard drops it. */
  | { kind: 'ok'; tsv: string; rows: number; remaining: number | null }
  /** Read fine; it is not a training table. */
  | { kind: 'not_a_program' }
  /** We looked and could not get rows out of it. A clearer photo may work. */
  | { kind: 'unreadable' }
  /** Bigger than the function accepts — only reachable if the downscale was skipped. */
  | { kind: 'too_large' }
  /** The month's credits are gone. A commercial state, not a verdict on the photo. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** The app failed. Never conflate with the two above. */
  | { kind: 'offline' };

/**
 * `useMediaPicker` has already downscaled and re-encoded to JPEG by the time we see a uri, so this is a
 * read rather than a conversion. The `fetch` + `FileReader` pair is the one `share-image.ts` uses and
 * is the pattern that works on web and native alike — `expo-file-system` does not exist on web.
 */
async function readAsBase64(uri: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await fetch(uri);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });

    const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUri);
    if (!match) return null;
    return { data: match[2], mediaType: match[1] };
  } catch {
    return null;
  }
}

/**
 * Read a photographed training table into pasteable rows.
 *
 * ⚠ NEVER THROWS. This runs behind a button in a sheet the athlete may have half a spreadsheet open in;
 * an exception here would take the sheet and their corrections with it.
 */
export async function readProgramPhoto(uri: string): Promise<PhotoReadResult> {
  const file = await readAsBase64(uri);
  // A uri we could not read is the app failing, not the photograph being bad. The athlete would
  // otherwise be told to retake a picture that was never looked at.
  if (!file) return { kind: 'offline' };

  try {
    const { data, error } = await supabase.functions.invoke('program-photo-read', {
      body: { image: file.data, mediaType: file.mediaType },
    });

    if (error || !data) return { kind: 'offline' };

    const d = data as {
      ok?: boolean;
      tsv?: string;
      rows?: number;
      reason?: string;
      remaining?: number;
      allowance?: number;
    };

    if (d.ok && typeof d.tsv === 'string' && d.tsv.length > 0) {
      return {
        kind: 'ok',
        tsv: d.tsv,
        rows: typeof d.rows === 'number' ? d.rows : 0,
        remaining: typeof d.remaining === 'number' ? d.remaining : null,
      };
    }

    switch (d.reason) {
      case 'not_a_program':
        return { kind: 'not_a_program' };
      case 'unreadable':
        return { kind: 'unreadable' };
      case 'too_large':
        return { kind: 'too_large' };
      case 'out_of_credits':
        return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance ?? 0 };
      default:
        // `unconfigured`, `meter_unavailable`, `upstream_error`, `bad_request`, or a reason this build
        // does not know. Every one of them is the app failing, and none is a statement about the photo.
        return { kind: 'offline' };
    }
  } catch {
    return { kind: 'offline' };
  }
}
