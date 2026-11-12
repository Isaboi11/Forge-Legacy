/**
 * Native twin of the web "Open in Forge Legacy" invite screen — deliberately nothing.
 *
 * The web version (`OpenInAppInvite.web.tsx`) exists to get a squad invite OUT of Safari and INTO the
 * app. Inside the app there is nowhere to hand off to: the invite link already opened `join-squad`.
 */
export function OpenInAppInvite() {
  return null;
}
