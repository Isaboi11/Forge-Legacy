import { supabase } from '@/lib/supabase';
import { playlistFromRow, type WorkoutPlaylistLink } from '@/domain/workout/playlist';

/**
 * The playlists this athlete has attached before, most recently first.
 *
 * ══ WHY THIS EXISTS: IT IS THE BUILDABLE HALF OF "DETECT WHAT WAS PLAYING" ══
 *
 * Reading what is playing on the phone is **not reachable from this stack**, and not for want of
 * trying: iOS exposes another app's now-playing only through `MPMusicPlayerController` (Apple Music,
 * entitlement-gated) or `MPNowPlayingInfoCenter` (your OWN audio, which Forge does not play); Android
 * needs `MediaSessionManager` behind the notification-listener permission. Both need native modules
 * that do not exist here, and the web preview has nothing at all. Asking Spotify instead — the
 * `recently-played` endpoint — is real, but it is full OAuth: a registered application, a redirect
 * URI, a token store and a refresh cycle, which is exactly what
 * `Workout-Playlist-Amendment-001` §2 ruled out and a project of its own.
 *
 * So this does the thing that removes almost all of the same friction with data the app already has.
 * Nearly everybody trains to the same handful of playlists; after the first attach, picking last
 * session's is one tap and nothing had to guess. It is a memory, not a detection — and it can never be
 * wrong about what somebody was listening to, because it only ever says what they told it before.
 *
 * ⚠ DEDUPED BY URL, NOT BY NAME. The same playlist attached twice under two different typed names is
 * one playlist; two different playlists an athlete happened to call "Legs" are two. The URL is the
 * identity, which is the same rule `savePlaylist` and migration 0105's constraint already use.
 */
export async function fetchRecentPlaylists(limit = 6): Promise<WorkoutPlaylistLink[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  /*
   * Over-fetch and then dedupe, because the rows most likely to repeat are the most recent ones — an
   * athlete on the same playlist all week would otherwise return one entry from six rows. 60 covers
   * roughly two months of training without becoming a page.
   *
   * ⚠ TOLERANT, LIKE EVERY OTHER PLAYLIST READ. These three columns arrive in 0105; on a database that
   * has not applied it the select fails with `42703` and takes nothing else with it, because this is
   * its own query and its failure means "no history", which is also the honest answer there.
   */
  const { data, error } = await supabase
    .from('workouts')
    .select('playlist_url, playlist_service, playlist_name, saved_at')
    .eq('athlete_id', user.id)
    .not('playlist_url', 'is', null)
    .order('saved_at', { ascending: false })
    .limit(60);
  if (error) return [];

  const seen = new Set<string>();
  const out: WorkoutPlaylistLink[] = [];
  for (const row of (data ?? []) as Parameters<typeof playlistFromRow>[0][]) {
    /* `playlistFromRow` re-checks the URL's host against the stored service tag, so a row written
       before 0105's constraint reads as "no playlist" rather than becoming a row that cannot open. */
    const link = playlistFromRow(row);
    if (!link || seen.has(link.url)) continue;
    seen.add(link.url);
    out.push(link);
    if (out.length >= limit) break;
  }
  return out;
}
