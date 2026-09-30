# Social accounts setup (for the CRM's Social pages)

This connects the CRM to your own TikTok account and your own Instagram account. After it is done, your
follower counts and each post's numbers arrive on their own, once a day and whenever you press
**Sync now**. Allow about 45 minutes. You only do it once.

Your sign-ins are kept on the server and nowhere else (AA-D26). They are never shown in the CRM.

## Before you start

* **The address you will paste on both platforms.** Both TikTok and Instagram ask where to send you
  after you approve. It is called the redirect address (or "redirect URI"). For both, it is exactly this,
  with nothing after it:

  ```
  https://ucqbzoeouvwoyfnnmqoo.supabase.co/functions/v1/social-sync
  ```

* **No review is needed.** Both platforms let an app read the account of the person who owns the app
  without a public review. On TikTok this is called **Sandbox**. On Meta the app simply stays
  unpublished. Do not submit either app for review and do not publish either app.
* **What is confirmed and what is not.** The addresses, permissions and menu paths marked with ✅ were
  read from TikTok's and Meta's own documentation on 2026-09-30. Steps marked ⚠ could not be read from
  their documentation, so the button names may differ slightly on your screen. If a step does not match
  what you see, stop and tell me what the screen says.
* **The database part must already be in place.** Migration `0247` has to be applied before step 5.

## What you will collect

Four values. Keep them in a note until step 4, then delete the note.

| Name in Supabase | Where it comes from |
| --- | --- |
| `TIKTOK_CLIENT_KEY` | TikTok app, **Client key** (Part 1) |
| `TIKTOK_CLIENT_SECRET` | TikTok app, **Client secret** (Part 1) |
| `INSTAGRAM_APP_ID` | Meta app, **Instagram app ID** (Part 3) |
| `INSTAGRAM_APP_SECRET` | Meta app, **Instagram app secret** (Part 3) |

## Part 1. The TikTok app

1. **Open TikTok for Developers.** Go to `developers.tiktok.com` and log in with the TikTok account you
   post from. Accept the developer terms if asked.
2. ✅ **Create the app.** Select your profile icon, then **Manage apps**, then **Connect an app**. Choose
   your own developer account as the owner. Name the app `Forge CRM`.
3. ✅ **Switch to Sandbox.** At the top of the app's page there is a switch beside the app's name. Set it
   to **Sandbox**. Select **Create Sandbox**, name it `Forge CRM`, and select **Confirm**.

   Sandbox is a private copy of the app that works only for the TikTok accounts you add to it. It does
   not need TikTok's review.
4. ✅ **Fill in the app details.** TikTok asks for:
   * **App icon**: the Forge Legacy icon, 1024 by 1024 pixels.
   * **App name**: `Forge CRM`.
   * **Category**: choose the closest one, such as Health and fitness.
   * **Description**: `Private dashboard that shows my own account's numbers.`
   * **Terms of Service URL**: `https://forgelegacy.app/terms`
   * **Privacy Policy URL**: `https://forgelegacy.app/privacy`
   * **Platforms**: tick **Web**. For the website address, enter `https://forgelegacy.app`.
5. ✅ **Add the products.** Select **Add products**. Add **Login Kit** and **Display API**.
6. ⚠ **Paste the redirect address.** In the **Login Kit** section, under **Web**, find **Redirect URI**
   and paste the address from the top of this page. TikTok's documentation confirms the address goes in
   the Login Kit settings. It does not show the exact label.
7. ✅ **Add the permissions.** In the **Scopes** section, select **Add Scopes** and add all four. A scope
   is one permission.
   * `user.info.basic` (your name and picture)
   * `user.info.profile` (your @username)
   * `user.info.stats` (your follower count)
   * `video.list` (your public videos and their numbers)
8. ✅ **Add your TikTok account as a target user.** A target user is an account the sandbox is allowed to
   read. In **Sandbox settings**, find **Target users** and select **Add account**. Log in with the
   TikTok account you post from and agree to the terms. TikTok says the account can take up to an hour
   to appear. Refresh the page to check.
9. ✅ **Save.** Select **Apply changes**.
10. ✅ **Copy two values.** In the **Credentials** area, copy the **Client key** and the **Client secret**.
    Make sure the switch still says **Sandbox** when you copy them. ⚠ TikTok's documentation does not say
    whether Sandbox has its own key and secret, so copy the ones shown while Sandbox is selected.

## Part 2. Make the Instagram account a professional account

Instagram shares numbers only for professional accounts. A professional account is a Business or a
Creator account. It is free. If yours already is one, skip to Part 3.

1. ⚠ In the Instagram app, open your profile, then the menu, then **Settings**. Find **Account type and
   tools** and select **Switch to professional account**.
2. Choose **Creator** or **Business**. Either works here. Finish the short set of questions.

You do not need a Facebook Page for this. ✅

## Part 3. The Meta app (for Instagram)

1. **Open Meta for Developers.** Go to `developers.facebook.com` and log in with your Facebook account.
   If you have never used it, select **Get Started** and finish the short registration.
2. ⚠ **Create the app.** Select **My Apps**, then **Create App**. Name it `Forge CRM`. When it asks what
   the app is for (the "use case"), choose **Manage messaging & content on Instagram**. If it asks for a
   business portfolio, you may skip it. Select **Create app**.
3. ✅ **Open the Instagram setup page.** In the app's left menu, select **Instagram**, then **API setup
   with Instagram login**. The page has three numbered sections.
4. ⚠ **Add the permissions.** The function needs two:
   * `instagram_business_basic` (your username, follower count and posts)
   * `instagram_business_manage_insights` (views, reach, saves and watch time)

   If the page lists permissions with **Add** buttons, add these two. You can ignore the messaging,
   comments and publishing permissions.
5. ⚠ **Add your Instagram account to the app.** In section **1. Generate access tokens**, select **Add
   account** and log in with the Instagram account you post from. If it asks you to accept an invite,
   open Instagram, go to **Settings**, then **Apps and websites**, then **Tester invites**, and accept.

   This is what lets the app read your account without a review. ✅ Meta's documentation says an
   unpublished app can be used by people who have a role on it. ⚠ It does not show these buttons.

   You do not need to copy the token that section 1 shows. The CRM gets its own in Part 5.
6. ✅ **Paste the redirect address.** In section **3. Set up Instagram business login**, select **Set
   up**, then open **Business login settings**. Under **OAuth redirect URIs**, paste the address from the
   top of this page and select **Save**.
7. ✅ **Copy two values.** The same **Business login settings** panel shows the **Instagram app ID** and
   the **Instagram app secret**. Copy both.

   ⚠ These are not the same as the **App ID** and **App secret** under **App settings**, then **Basic**.
   Those belong to the Meta app and will not work. Use the two with "Instagram" in the name.
8. **Leave the app unpublished.** Do not select **Publish** and do not start **App Review**.

## Part 4. Save the four values in Supabase

1. Open the Supabase dashboard, then **Edge Functions**, then **Secrets**.
2. Add these four. Type each name exactly as shown.
   * `TIKTOK_CLIENT_KEY`: the TikTok Client key
   * `TIKTOK_CLIENT_SECRET`: the TikTok Client secret
   * `INSTAGRAM_APP_ID`: the Instagram app ID
   * `INSTAGRAM_APP_SECRET`: the Instagram app secret
3. Delete the note you kept them in.

`SOCIAL_RETURN_ORIGINS` is optional. Leave it out. It is only needed if the CRM ever moves to a
different web address.

## Part 5. Deploy the function and connect

1. **Deploy the function.** Supabase, then **Edge Functions**, then **Deploy a new function**, then
   **Via Editor**. Name it exactly `social-sync`. Replace the sample code with the whole of
   `supabase/functions/social-sync/index.ts`, then deploy.
2. **Switch Verify JWT off.** Under the function's **Details**, switch **Verify JWT** to **OFF** and save.

   This is different from the other functions, and it is on purpose. TikTok and Instagram send you back
   to this function from their own sites, and they cannot carry your CRM sign-in. The function checks
   every request itself instead.
3. **Connect TikTok.** Open the CRM (`/admin`), then **Social**, then **Numbers**. In the connected
   accounts area, select **Connect** beside TikTok. TikTok opens and asks you to approve. Leave every
   item switched on and approve. You land back on the CRM.
4. **Connect Instagram.** Do the same beside Instagram. Log in with the Instagram account you post from
   and select **Allow**.
5. **Check it.** Each account should show your @username and a follower count, with the time of the last
   sync. Your recent posts appear under **Content**, marked as needing tags.

From then on the numbers update once a day by themselves. Press **Sync now** any time you want them
sooner.

## What to expect

* **The follower chart starts today.** Neither platform gives past follower counts.
* **Your last 100 posts on each platform come in.** Posts you had planned in the CRM are matched by date.
  The rest come in as new videos that need tags.
* **TikTok does not share watch time or saves.** You can type the watched percentage on a TikTok post
  yourself.
* **Instagram does not share a video's length.** Average watch time arrives for reels, but the watched
  percentage needs the length, which you type on the video.
* **Instagram numbers can run up to two days behind.** That is Instagram's delay, not a fault.
* **Instagram stays connected as long as it syncs.** The sign-in lasts 60 days and is renewed
  automatically. TikTok's lasts a year and is renewed the same way.

## If it says X, do Y

* **The CRM shows a setup prompt that names a secret, such as `TIKTOK_CLIENT_SECRET`.** That value is
  missing in Supabase. Go back to Part 4.
* **The CRM says the TikTok (or Instagram) connection failed.** Press **Connect** again. If it fails
  twice, check that the two values for that platform in Part 4 were copied whole, with no spaces.
* **"This sign-in link is no longer valid."** You took longer than ten minutes on the platform's page, or
  the page was opened twice. Go back to the CRM and press **Connect** again.
* **TikTok shows an error about `redirect_uri`.** The address in Part 1 step 6 does not match. Paste it
  again exactly, with no space and no slash at the end, then select **Apply changes**.
* **TikTok says the account cannot log in, or the app is not available.** Your TikTok account is not a
  target user yet. Redo Part 1 step 8 and wait up to an hour.
* **TikTok asks you to verify that you own the redirect address.** Stop and tell me. That address
  belongs to Supabase, so it cannot be verified the usual way.
* **Instagram says "Invalid redirect_uri".** The address in Part 3 step 6 does not match. Paste it again
  exactly and select **Save**.
* **Instagram says "Insufficient developer role" or that the app is not available.** Your Instagram
  account has not been added to the app. Redo Part 3 step 5.
* **Instagram says the account must be a professional account.** Do Part 2, then connect again.
* **"The sign-in expired. Connect again."** The platform ended the sign-in. Press **Connect** beside
  that platform. Your old numbers stay.
* **"TikTok was not allowed to share that."** A permission was switched off when you approved. Press
  **Connect** again and leave every item on. If it still says so, check Part 1 step 7.
* **"Instagram shared likes and comments but not views or reach."** The insights permission is missing.
  Check Part 3 step 4, then press **Connect** again and select **Allow**.
* **"TikTok is busy" or "Instagram is busy".** Wait a few minutes and press **Sync now**.
* **Nothing updates overnight but Sync now works.** Tell me. The daily timer is in the database, not in
  this function.
