/**
 * The email typed on the sign-in route, shared across its steps (QA 09-26 auth-13).
 *
 * On web each step is its own history entry now (so browser Back works), which means each step is its
 * own mounted screen — and the address typed on Sign In has to still be there on Forgot Password. A
 * module variable carries it between them; on web it is mirrored to `sessionStorage` so a refresh keeps
 * it too. sessionStorage is per-tab and cleared when the tab closes.
 *
 * ⚠ THE EMAIL ONLY. A password is never written anywhere by this file.
 */

const KEY = 'forge.auth.email.v1';

let draft: string | null = null;

function store(): Storage | null {
  try {
    const s = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function getEmailDraft(): string {
  if (draft != null) return draft;
  try {
    draft = store()?.getItem(KEY) ?? '';
  } catch {
    draft = '';
  }
  return draft;
}

export function setEmailDraft(email: string): void {
  draft = email;
  try {
    const s = store();
    if (!s) return;
    if (email) s.setItem(KEY, email);
    else s.removeItem(KEY);
  } catch {
    /* best-effort: a blocked storage only costs the refresh case */
  }
}
