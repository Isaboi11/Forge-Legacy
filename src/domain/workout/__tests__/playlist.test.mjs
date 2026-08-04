import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectService,
  linkAuthority,
  parsePlaylistLink,
  playlistFromRow,
  playlistLabel,
  playlistToRow,
  SERVICE_LABEL,
} from '../playlist.ts';

/*
 * ══ ONE ANSWER TO "IS THIS A PLAYLIST LINK" ══
 *
 * This rule exists twice: here, and as `workouts_playlist_pair` in migration 0105. The GOLDEN VECTORS
 * below are duplicated VERBATIM from that migration's self-check, in the same order, and both lists fail
 * loudly — so the TypeScript and the SQL can only drift through a deliberate edit to both.
 *
 * The rule is security-relevant, which is unusual for this codebase. WSR-001 §6.3 renders the playlist
 * chip on SQUAD CHECK-IN CARDS, so the value of this column becomes a tap target for somebody who is not
 * the athlete who typed it. A chip labelled "Spotify Playlist" that opens an arbitrary URL would be a lie
 * the product tells on the attacker's behalf. Hence the host-confusion vectors below, and hence the
 * database enforcing the same thing rather than trusting the client that wrote it.
 */

// (label, url, service, should_be_accepted) — the same 15 rows as 0105 §3.
const GOLDEN = [
  ['nothing attached', null, null, true],
  ['real Spotify share link', 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', 'SPOTIFY', true],
  ['Spotify link carrying its ?si= param', 'https://open.spotify.com/playlist/abc?si=xyz', 'SPOTIFY', true],
  ['real Apple Music share link', 'https://music.apple.com/us/playlist/gym/pl.u-abc', 'APPLE_MUSIC', true],
  ['bare host, no path', 'https://open.spotify.com', 'SPOTIFY', true],
  // the attacks
  ['suffixed host is a DIFFERENT host', 'https://open.spotify.com.evil.com/x', 'SPOTIFY', false],
  ['userinfo trick — real host is evil', 'https://open.spotify.com@evil.com/x', 'SPOTIFY', false],
  ['service tag lying about the host', 'https://music.apple.com/us/playlist/x', 'SPOTIFY', false],
  ['arbitrary URL wearing a service tag', 'https://evil.com/pretty-playlist', 'SPOTIFY', false],
  ['http is not https', 'http://open.spotify.com/playlist/x', 'SPOTIFY', false],
  ['scheme-relative', '//open.spotify.com/playlist/x', 'SPOTIFY', false],
  ['not even a URL', 'open.spotify.com/playlist/x', 'SPOTIFY', false],
  // half-written links
  ['url with no service', 'https://open.spotify.com/playlist/x', null, false],
  ['service with no url', null, 'SPOTIFY', false],
  ['unknown service value', 'https://open.spotify.com/playlist/x', 'TIDAL', false],
];

test('GOLDEN VECTORS — the row that survives is exactly the row 0105 accepts', () => {
  for (const [label, url, service, accepted] of GOLDEN) {
    const got = playlistFromRow({ playlist_url: url, playlist_service: service, playlist_name: null });

    /*
     * The two sides answer slightly different questions and this is where they meet. 0105 asks "is this
     * row LEGAL"; this asks "is there a LINK here". They agree everywhere except the empty row, which is
     * perfectly legal and carries no link — that is the state of almost every workout ever saved.
     */
    const expectLink = accepted && url != null;
    assert.equal(got != null, expectLink, `[${label}] expected a link: ${expectLink}`);

    if (expectLink) {
      assert.equal(got.url, url, `[${label}] the URL is stored verbatim`);
      assert.equal(got.service, service, `[${label}] the service tag survives`);
    }
  }
});

test('the two hosts, and only these two', () => {
  assert.equal(detectService('https://open.spotify.com/playlist/abc'), 'SPOTIFY');
  assert.equal(detectService('https://music.apple.com/us/playlist/gym/pl.u-abc'), 'APPLE_MUSIC');
  // Real services, deliberately not accepted — §3 lists two and rejects the rest rather than guessing.
  assert.equal(detectService('https://tidal.com/browse/playlist/abc'), null);
  assert.equal(detectService('https://music.youtube.com/playlist?list=abc'), null);
  assert.equal(detectService('https://soundcloud.com/sets/abc'), null);
  // Spotify's desktop "Copy Spotify URI" — a real thing a real person pastes, and still a refusal,
  // because a chip that does nothing when tapped is worse than a message that says what to paste.
  assert.equal(detectService('spotify:playlist:37i9dQZF1DX76Wlfdnj7AP'), null);
});

test('HOST CONFUSION — a prefix is not a host', () => {
  // Each of these contains 'open.spotify.com' as a substring and belongs to somebody else.
  for (const evil of [
    'https://open.spotify.com.evil.com/playlist/x',
    'https://open.spotify.com@evil.com/playlist/x',
    'https://evil.com/open.spotify.com/playlist/x',
    'https://evil.com/?u=https://open.spotify.com/playlist/x',
    'https://notopen.spotify.com/playlist/x',
    'https://open.spotify.company/playlist/x',
  ]) {
    assert.equal(detectService(evil), null, evil);
  }
});

test('the authority is taken verbatim, so anything unusual simply fails to match', () => {
  assert.equal(linkAuthority('https://OPEN.Spotify.COM/playlist/x'), 'open.spotify.com', 'case-folded');
  assert.equal(linkAuthority('https://open.spotify.com@evil.com/x'), 'open.spotify.com@evil.com');
  assert.equal(linkAuthority('https://open.spotify.com:443/x'), 'open.spotify.com:443');
  assert.equal(linkAuthority('http://open.spotify.com/x'), null, 'http has no authority as far as we care');
  assert.equal(linkAuthority('nonsense'), null);
  // Case-folding the host means a shouted paste still works end to end.
  assert.equal(detectService('https://OPEN.SPOTIFY.COM/playlist/x'), 'SPOTIFY');
});

test('a port is refused on BOTH sides rather than accepted on one', () => {
  // No share sheet emits one. What matters is that the client does not offer to save something 0105
  // would then reject with a constraint violation the athlete cannot act on.
  assert.equal(detectService('https://open.spotify.com:443/playlist/x'), null);
  assert.equal(parsePlaylistLink('https://open.spotify.com:443/playlist/x').ok, false);
});

test('parse refuses with a sentence the athlete can act on', () => {
  const empty = parsePlaylistLink('   ');
  assert.equal(empty.ok, false);
  assert.match(empty.message, /paste a link/i);

  const wrong = parsePlaylistLink('https://tidal.com/browse/playlist/abc');
  assert.equal(wrong.ok, false);
  assert.match(wrong.message, /Spotify or Apple Music/);

  // The link IS theirs — all it needs is the s. Saying "that isn't a playlist link" would read as though
  // they had copied the wrong thing entirely.
  const insecure = parsePlaylistLink('http://open.spotify.com/playlist/abc');
  assert.equal(insecure.ok, false);
  assert.match(insecure.message, /https/);
  assert.doesNotMatch(insecure.message, /Spotify or Apple Music/);
});

test('parse trims, and an empty name is NO name rather than an empty string', () => {
  const r = parsePlaylistLink('  https://open.spotify.com/playlist/abc  ', '   ');
  assert.equal(r.ok, true);
  assert.equal(r.link.url, 'https://open.spotify.com/playlist/abc', 'whitespace from the paste is gone');
  assert.equal(r.link.displayName, null, 'blank name is null, so the chip falls back to the service label');

  const named = parsePlaylistLink('https://open.spotify.com/playlist/abc', '  Leg Day Bangers  ');
  assert.equal(named.link.displayName, 'Leg Day Bangers');
});

test('a name is capped rather than rejected — the link is the point, not the label', () => {
  const r = parsePlaylistLink('https://open.spotify.com/playlist/abc', 'x'.repeat(500));
  assert.equal(r.ok, true);
  assert.equal(r.link.displayName.length, 60);
});

test('an absurd paste is refused before it reaches the database', () => {
  const r = parsePlaylistLink('https://open.spotify.com/playlist/' + 'a'.repeat(5000));
  assert.equal(r.ok, false);
  assert.match(r.message, /too long/i);
});

test('LABEL — never the raw URL (§5)', () => {
  assert.equal(playlistLabel({ service: 'SPOTIFY', url: 'https://open.spotify.com/x', displayName: 'Leg Day Bangers' }), 'Leg Day Bangers');
  assert.equal(playlistLabel({ service: 'SPOTIFY', url: 'https://open.spotify.com/x', displayName: null }), 'Spotify Playlist');
  assert.equal(playlistLabel({ service: 'APPLE_MUSIC', url: 'https://music.apple.com/x', displayName: null }), 'Apple Music Playlist');
  // A name that is only whitespace is not a name.
  assert.equal(playlistLabel({ service: 'SPOTIFY', url: 'https://open.spotify.com/x', displayName: '   ' }), SERVICE_LABEL.SPOTIFY);
  // Whatever happens, the URL never becomes the label.
  for (const dn of [null, '', '  ', 'Named']) {
    const label = playlistLabel({ service: 'SPOTIFY', url: 'https://open.spotify.com/secret?si=leaky', displayName: dn });
    assert.doesNotMatch(label, /spotify\.com|si=/, 'the raw URL must never surface as body text');
  }
});

test('ROUND TRIP — a link survives being written and read back', () => {
  const link = { service: 'APPLE_MUSIC', url: 'https://music.apple.com/us/playlist/gym/pl.u-abc', displayName: 'Squat Day' };
  const row = playlistToRow(link);
  assert.deepEqual(row, {
    playlist_url: 'https://music.apple.com/us/playlist/gym/pl.u-abc',
    playlist_service: 'APPLE_MUSIC',
    playlist_name: 'Squat Day',
  });
  assert.deepEqual(playlistFromRow(row), link);
});

test('REMOVAL clears all three columns — a leftover name is an orphan 0105 rejects', () => {
  const row = playlistToRow(null);
  assert.deepEqual(row, { playlist_url: null, playlist_service: null, playlist_name: null });
  assert.equal(playlistFromRow(row), null);
});

test('a malformed or missing row is "no playlist", never a throw and never a half-chip', () => {
  assert.equal(playlistFromRow(null), null);
  assert.equal(playlistFromRow(undefined), null);
  assert.equal(playlistFromRow({}), null);
  assert.equal(playlistFromRow({ playlist_url: '   ', playlist_service: 'SPOTIFY' }), null);
  // Hand-edited in the SQL editor, or written before 0105's constraint existed: reads as absent rather
  // than rendering a Spotify-labelled chip that opens somebody else's site.
  assert.equal(playlistFromRow({ playlist_url: 'https://evil.com/x', playlist_service: 'SPOTIFY' }), null);
});
