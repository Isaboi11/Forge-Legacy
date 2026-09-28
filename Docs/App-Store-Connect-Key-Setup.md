# App Store Connect key setup (for the Creator Dashboard's App Store panel)

This connects the Creator Dashboard to Apple's download numbers and reviews. Allow about 15 minutes.
You only do it once. The key is stored in Supabase's secrets and nowhere else (AA-D17).

## Which role to give the key

A team API key gets **one** role. The dashboard needs two kinds of data:

* **Sales reports** (downloads, proceeds). These work with the **Sales**, **Finance** or **Admin** role.
* **Customer reviews.** These certainly work with **Admin**. Apple's documentation suggests
  **App Manager** and **Customer Support** also work, but that has not been tested here.

**Recommendation: create the key with the Sales role.** It gives the least access that still covers
downloads. Reviews may then show as "403 key role lacks access" after a sync, and everything else keeps
working. If you want reviews too, the one role certain to cover both is **Admin**. That gives the key wide
power over the account, so it is your call.

⚠ Not confirmed: whether **App Manager** alone can read sales reports. If you try it, press Sync now
(step 6). The result names any part that was refused, so a wrong role does no harm. You can revoke that
key and make another.

## Steps

1. **Create the key.** App Store Connect → **Users and Access** → **Integrations** tab → **App Store
   Connect API** → **Team Keys** → **+**. Name it `Forge CRM sync`, choose the role (see above) and select
   **Generate**. (If you have never made a key, Apple first asks you to request API access. Accept it.)
2. **Download the key and copy two IDs.** Select **Download** next to the new key. Apple lets you
   download the `.p8` file **only once**, so keep it somewhere safe. Also copy the **Key ID** (in the key's
   row) and the **Issuer ID** (shown above the list of keys).
3. **Find your Vendor Number.** App Store Connect → **Payments and Financial Reports**. The Vendor Number
   is at the top left, under your name. It is a number that starts with 8.
4. **Add the secrets in Supabase.** Supabase dashboard → **Edge Functions** → **Secrets**. Add these four:
   * `ASC_KEY_ID`: the Key ID
   * `ASC_ISSUER_ID`: the Issuer ID
   * `ASC_PRIVATE_KEY`: open the `.p8` file in Notepad and paste **all** of it, including the
     `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   * `ASC_VENDOR_NUMBER`: the Vendor Number

   `ASC_APP_ID` is optional. It defaults to Forge Legacy's App ID, `6798436104`.
5. **Deploy the function.** Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
   Name it exactly `asc-sync`. Replace the sample code with the whole of
   `supabase/functions/asc-sync/index.ts`, then deploy. Under the function's **Details**, leave
   **Verify JWT** switched **ON**.
6. **Test it.** Open the Creator Dashboard (`/admin`) → **App Store** → **Sync now**.
   * A green result such as "days 14 · downloads 37 · reviews 3" means it is working.
   * "not configured: missing …" lists the secrets from step 4 that are still missing.
   * "401 key rejected" means the Key ID, Issuer ID or `.p8` file is wrong. Check step 4.
   * "403 key role lacks access" means the role is too narrow for that part (see the top of this page).

   The dashboard shows no downloads until the app is on sale. A day with no sales shows as zero once it
   is more than two days old, and Apple publishes each day's report the following day.
