# Sentry setup (for the CRM's Bugs page)

This connects the CRM's Bugs page to Sentry's crash groups. Allow about 10 minutes. You only do it once.
The token is stored in Supabase's secrets and nowhere else (AA-D21).

## Steps

1. **Create a token in Sentry.** Sentry → **Settings** → **Auth Tokens** → **Create New Token** (a
   personal token), or **Settings** → **Custom Integrations** → **Create New Integration** → **Internal
   Integration** (a token that belongs to the organization rather than to you; either works). Give it
   exactly two permissions: **Project: Read** (`project:read`) and **Issue & Event: Read**
   (`event:read`). Nothing else. Copy the token. Sentry shows it only once.
2. **Add the secret in Supabase.** Supabase dashboard → **Edge Functions** → **Secrets**. Add
   `SENTRY_API_TOKEN` with the token from step 1.

   Only if yours differ from the defaults, also add `SENTRY_ORG` (default `forge-legacy-llc`) and
   `SENTRY_PROJECT` (default `forge-legacy`). Both are in the address bar of a Sentry issue page.
3. **Deploy the function.** Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
   Name it exactly `sentry-sync`. Replace the sample code with the whole of
   `supabase/functions/sentry-sync/index.ts`, then deploy. Under the function's **Details**, leave
   **Verify JWT** switched **ON**.
4. **Test it.** Open the CRM (`/admin`) → **Bugs** → the **Sentry** card → **Sync now**.
   * A green result such as "issues 12 · details 12" means it is working.
   * "not configured: missing SENTRY_API_TOKEN" means step 2 is not done yet.
   * "token rejected / lacks event:read" means the token is wrong or is missing a permission from step 1.
   * "organization or project not found" means `SENTRY_ORG` or `SENTRY_PROJECT` needs setting (step 2).

What it copies: unresolved crash groups from the last 14 days, and for the 25 most recent, the screens the
person passed through before the crash (route names only) and the top of the error's stack. Nothing a
person typed is copied.
