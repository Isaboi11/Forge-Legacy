import test from 'node:test';
import assert from 'node:assert/strict';

import { artLabel, playlistArtEndpoint, readPlaylistArt } from '../playlist-art.ts';
import { SERVICE_LABEL } from '../playlist.ts';

/*
 * ══ THIS PARSES A STRANGER'S JSON INTO AN <Image src>, AND THAT IS THE WHOLE REASON IT HAS TESTS ══
 *
 * `readPlaylistArt` is the only thing between a third-party HTTP response and a URL loader. Everything
 * below is about what it must REFUSE, not about what it accepts on a good day.
 */

const SPOTIFY = { service: 'SPOTIFY', url: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', displayName: null };
const APPLE = { service: 'APPLE_MUSIC', url: 'https://music.apple.com/us/playlist/heavy-rotation/pl.abc123', displayName: null };

// A real response shape, trimmed to the fields that are read.
const OK = {
  provider_name: 'Spotify',
  type: 'rich',
  title: 'Beast Mode',
  thumbnail_url: 'https://i.scdn.co/image/ab67706f00000002',
  thumbnail_width: 300,
};

test('the endpoint escapes the whole link, tracking parameters included', () => {
  const withTracking = { ...SPOTIFY, url: 'https://open.spotify.com/playlist/abc?si=xyz&pt=1' };
  const endpoint = playlistArtEndpoint(withTracking);
  /*
   * ⚠ THE `&` IS THE POINT. Concatenated rather than escaped, everything from `&pt=1` onward would be
   * read as a parameter of the OEMBED call instead of part of the playlist URL — so the endpoint would
   * be asked about a different, truncated link and would answer about nothing.
   */
  assert.ok(endpoint.includes('%3Fsi%3Dxyz%26pt%3D1'), 'the query must be escaped into the parameter');
  assert.equal(endpoint.split('?').length, 2, 'exactly one query separator may survive');
});

test('Apple Music has no unauthenticated endpoint, and says so by returning null', () => {
  // Not a gap to fill in later without a ruling: the catalog API needs a signed developer token, and
  // `itunes.apple.com/lookup` does not serve `pl.…` playlists at all.
  assert.equal(playlistArtEndpoint(APPLE), null);
});

test('a blank link is never asked about', () => {
  assert.equal(playlistArtEndpoint({ ...SPOTIFY, url: '   ' }), null);
});

test('a well-formed response yields the image and the title', () => {
  assert.deepEqual(readPlaylistArt(OK), { imageUrl: 'https://i.scdn.co/image/ab67706f00000002', title: 'Beast Mode' });
});

test('⚠ only https images are accepted — every other scheme is refused', () => {
  for (const bad of [
    'javascript:alert(1)',
    'http://i.scdn.co/image/x',
    'data:image/png;base64,AAAA',
    'file:///etc/passwd',
    '//i.scdn.co/image/x',
    '/image/x',
    'HTTPS ://i.scdn.co/x',
  ]) {
    assert.equal(readPlaylistArt({ ...OK, thumbnail_url: bad }), null, `${bad} must be refused`);
  }
});

test('a malformed or hostile payload never throws and never half-succeeds', () => {
  for (const junk of [null, undefined, 'a string', 42, [], {}, { thumbnail_url: 12 }, { thumbnail_url: null }]) {
    assert.equal(readPlaylistArt(junk), null);
  }
});

test('a missing or non-string title degrades to null rather than to "undefined"', () => {
  assert.equal(readPlaylistArt({ thumbnail_url: OK.thumbnail_url }).title, null);
  assert.equal(readPlaylistArt({ ...OK, title: 7 }).title, null);
  assert.equal(readPlaylistArt({ ...OK, title: '   ' }).title, null);
});

/*
 * ══ THE ATHLETE'S WORDS ARE NOT OVERWRITTEN BY A STRANGER'S ══
 *
 * The art arrives asynchronously, so the naive version replaces the label the moment it lands. Somebody
 * who typed "Leg Day Bangers" would watch it turn into whatever Spotify calls that playlist.
 */
test('a typed display name always wins, even once the provider answers', () => {
  const named = { ...SPOTIFY, displayName: 'Leg Day Bangers' };
  assert.equal(artLabel(named, null, SERVICE_LABEL.SPOTIFY), 'Leg Day Bangers');
  assert.equal(artLabel(named, { imageUrl: 'https://x/y', title: 'Beast Mode' }, SERVICE_LABEL.SPOTIFY), 'Leg Day Bangers');
});

test('an unnamed link takes the provider title, and the generic label only when there is none', () => {
  assert.equal(artLabel(SPOTIFY, { imageUrl: 'https://x/y', title: 'Beast Mode' }, SERVICE_LABEL.SPOTIFY), 'Beast Mode');
  assert.equal(artLabel(SPOTIFY, null, SERVICE_LABEL.SPOTIFY), 'Spotify Playlist');
  assert.equal(artLabel(SPOTIFY, { imageUrl: 'https://x/y', title: null }, SERVICE_LABEL.SPOTIFY), 'Spotify Playlist');
});

test('a whitespace-only typed name is not a name', () => {
  const blank = { ...SPOTIFY, displayName: '   ' };
  assert.equal(artLabel(blank, null, SERVICE_LABEL.SPOTIFY), 'Spotify Playlist');
});
