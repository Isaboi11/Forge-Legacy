// social-sync pure core. The function is deployed by pasting ONE file, so the core cannot live in its own
// module: this test cuts the block between the PURE CORE markers out of index.ts and evaluates it.
// Run: node --test supabase/functions/social-sync/__tests__/core.test.mjs
//
// The fixtures marked DOC are the example responses printed in the platforms' own documentation
// (read 2026-09-30), kept as they are printed — wrappers, string ids, odd date formats and all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'index.ts'), 'utf8');
const START = '// ── PURE CORE START ──';
const END = '// ── PURE CORE END ──';
const a = src.indexOf(START);
const b = src.indexOf(END);
assert.ok(a > 0 && b > a, 'PURE CORE markers missing from index.ts');
const block = src.slice(a + START.length, b);
const core = new Function(
  `${block}\nreturn { PLATFORMS, STATE_TTL_MS, EXPIRED_MESSAGE, SECRET_NAMES, TIKTOK_SCOPES, TIKTOK_VIDEO_FIELDS,
    INSTAGRAM_SCOPES, str, count, clip, titleFromCaption, utcDay, dayDiff, toIso, timingSafeEqual, validateReturnTo,
    returnUrl, missingSecrets, stateIsFresh, authorizeUrl, cleanCode, parseTikTokToken, parseInstagramShortToken,
    parseInstagramLongToken, instagramAuthError, tiktokErrorCode, tokenAction, parseTikTokUser, mapTikTokVideo,
    parseTikTokVideos, parseInstagramUser, mapInstagramMedia, parseInstagramMedia, instagramMetricsFor, parseInsights,
    applyInstagramInsights, parseInstagramAccountInsights, lengthSeconds, postingPatch, planPostings };`,
)();

const NOW = Date.parse('2026-09-30T12:00:00Z');
const ORIGINS = 'https://forgelegacy.expo.app,http://localhost:8081';
const REDIRECT = 'https://ucqbzoeouvwoyfnnmqoo.supabase.co/functions/v1/social-sync';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// DOC fixtures — TikTok
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

// developers.tiktok.com/doc/oauth-user-access-token-management — success (code exchange and refresh)
const TT_TOKEN = {
  access_token: 'act.example12345Example12345Example',
  expires_in: 86400,
  open_id: 'afd97af1-b87b-48b9-ac98-410aghda5344',
  refresh_expires_in: 31536000,
  refresh_token: 'rft.example12345Example12345Example',
  scope: 'user.info.basic,video.list',
  token_type: 'Bearer',
};
// same page — failure
const TT_TOKEN_ERROR = {
  error: 'invalid_request',
  error_description: 'Redirect_uri is not matched with the uri when requesting code.',
  log_id: '202206221854370101130062072500FFA2',
};
// developers.tiktok.com/doc/display-api-get-started — the older, wrapped shape still printed there
const TT_TOKEN_WRAPPED = {
  data: {
    access_token: 'act.example12345Example12345Example',
    expires_in: 86400,
    open_id: 'abcdefgh-1a2b-123c4-ab12-abc123abc1234',
    refresh_token: 'rft.example12345Example12345Example',
    scope: 'user.info.basic',
  },
  message: 'success',
};
// developers.tiktok.com/doc/tiktok-api-v2-get-user-info — printed example (fields=open_id,union_id,avatar_url)
const TT_USER_DOC = {
  data: {
    user: {
      avatar_url: 'https://p19-sign.tiktokcdn-us.com/tos-avt-0068-tx/b17f0e4b3a4f4a50993cf72cda8b88b8~c5_168x168.jpeg',
      open_id: '723f24d7-e717-40f8-a2b6-cb8464cd23b4',
      union_id: 'c9c60f44-a68e-4f5d-84dd-ce22faeb0ba1',
    },
  },
  error: { code: 'ok', message: '', log_id: '20220829194722CBE87ED59D524E727021' },
};
// The same envelope with the fields WE ask for (names and scopes from that page's field table).
const TT_USER = {
  data: {
    user: {
      open_id: '723f24d7-e717-40f8-a2b6-cb8464cd23b4',
      display_name: 'Forge Legacy',
      username: 'forgelegacy',
      follower_count: 1284,
      likes_count: 20311,
      video_count: 47,
    },
  },
  error: { code: 'ok', message: '', log_id: '20220829194722CBE87ED59D524E727021' },
};
// developers.tiktok.com/doc/tiktok-api-v2-video-list — printed example (fields=cover_image_url,id,title)
const TT_VIDEOS_DOC = {
  data: {
    videos: [
      {
        cover_image_url: 'https://p16-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/979e93dbc5df40198f7ac935fb3e3342~tplv-noop.image?x-expires=1659000367&x-signature=EZIo1pVYVGYh%2FaNNaHHlbWEvw%2BM%3D',
        id: '12345123451234512345',
        title: 'Video Title',
      },
    ],
    cursor: 1643332803000,
    has_more: false,
  },
  error: { code: 'ok', message: '', log_id: '20220829194722CBE87ED59D524E727021' },
};
// The same envelope with the video-object fields we ask for (types from /doc/tiktok-api-v2-video-object:
// id string, create_time int64 epoch SECONDS, duration int32 seconds, counts as numbers).
const TT_VIDEOS = {
  data: {
    videos: [
      {
        id: '7412345123451234512',
        create_time: 1790596800, // 2026-09-28T12:00:00Z
        title: 'I asked Holt to rebuild my week 🔥 #gym #fitness',
        video_description: 'I asked Holt to rebuild my week 🔥 #gym #fitness',
        duration: 34,
        share_url: 'https://www.tiktok.com/@forgelegacy/video/7412345123451234512?utm_campaign=tt4d_open_api&utm_source=aw1234',
        view_count: 18422,
        like_count: 1510,
        comment_count: 44,
        share_count: 212,
      },
      {
        id: '7409999999999999999',
        create_time: 1790337600, // 2026-09-25T12:00:00Z
        title: '',
        video_description: '',
        duration: 0,
        share_url: 'https://www.tiktok.com/@forgelegacy/video/7409999999999999999',
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
      },
    ],
    cursor: 1790337600000,
    has_more: true,
  },
  error: { code: 'ok', message: '', log_id: '20220829194722CBE87ED59D524E727021' },
};
// developers.tiktok.com/doc/tiktok-api-v2-error-handling — printed example (flat)
const TT_ERROR_FLAT = {
  code: 'access_token_invalid',
  message: 'Access token is invalid, please refresh token and retry',
  log_id: '20220829194722CBE87ED59D524E727021',
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// DOC fixtures — Instagram (API with Instagram Login)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

// …/instagram-api-with-instagram-login/business-login — short-lived token (note the `data` array)
const IG_SHORT = {
  data: [
    {
      access_token: 'EAACEdEose0...',
      user_id: '1020...',
      permissions: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish',
    },
  ],
};
// same page — rejected
const IG_SHORT_REJECTED = {
  error_type: 'OAuthException',
  code: 400,
  error_message: 'Matching code was not found or was already used',
};
// same page — long-lived exchange and refresh
const IG_LONG = { access_token: 'EAACEdEose0...', token_type: 'bearer', expires_in: 5183944 };
// …/instagram-api-with-instagram-login/get-started — /me (note the `data` array again)
const IG_ME_DOC = { data: [{ user_id: '17841405822304914', username: 'forgelegacy' }] };
// same page — /<IG_ID>/media
const IG_MEDIA_DOC = {
  data: [{ id: '17918195224117851' }, { id: '17895695668004550' }],
  paging: { cursors: { before: 'QVFIUkdGRXA2eHNNTUs4T1ZA...', after: 'QVFIUmlwbnFsM3N2cV9lZA...' } },
};
// The fields we ask for, in the forms the IG Media reference gives them: `timestamp` as
// "2019-09-26T22:36:43+0000", ids as strings, `like_count` missing when likes are hidden.
const IG_MEDIA = {
  data: [
    {
      id: '17918920912340654',
      caption: 'Week 6 of the rebuild.\nNothing fancy, just showing up. #forgelegacy',
      media_type: 'VIDEO',
      media_product_type: 'REELS',
      permalink: 'https://www.instagram.com/reel/DAbCdEfGhIj/',
      timestamp: '2026-09-28T17:05:11+0000',
      like_count: 301,
      comments_count: 12,
    },
    {
      id: '17895695668004550',
      media_type: 'CAROUSEL_ALBUM',
      media_product_type: 'FEED',
      permalink: 'https://www.instagram.com/p/C9zYxWvUtSr/',
      timestamp: '2026-09-20T09:00:00+0000',
      comments_count: 3,
    },
    {
      id: '17900000000000001',
      media_type: 'IMAGE',
      media_product_type: 'AD',
      permalink: 'https://www.instagram.com/p/AdAdAdAdAdA/',
      timestamp: '2026-09-19T09:00:00+0000',
    },
  ],
  paging: {
    cursors: { before: 'QVFIUkdGRXA2eHNNTUs4T1ZA...', after: 'QVFIUmlwbnFsM3N2cV9lZA...' },
    next: 'https://graph.instagram.com/v25.0/17841405822304914/media?access_token=REDACTED&limit=50&after=QVFIUmlwbnFsM3N2cV9lZA...',
  },
};
// …/reference/instagram-media/insights — printed example (values AND total_value on one metric)
const IG_MEDIA_INSIGHTS_DOC = {
  data: [
    {
      name: 'profile_activity',
      period: 'lifetime',
      values: [{ value: 4 }],
      title: 'Profile activity',
      total_value: {
        value: 4,
        breakdowns: [
          {
            dimension_keys: ['action_type'],
            results: [
              { dimension_values: ['email'], value: 1 },
              { dimension_values: ['text'], value: 1 },
            ],
          },
        ],
      },
      id: '17932174733377207/insights/profile_activity/lifetime',
    },
  ],
};
// The same item shape for the reel metrics we ask for. ig_reels_avg_watch_time is MILLISECONDS.
const insight = (name, value) => ({
  name, period: 'lifetime', values: [{ value }], title: name, description: '', id: `17918920912340654/insights/${name}/lifetime`,
});
const IG_REEL_INSIGHTS = {
  data: [
    insight('views', 9120), insight('reach', 7044), insight('likes', 305), insight('comments', 12),
    insight('shares', 88), insight('saved', 61), insight('ig_reels_avg_watch_time', 11437),
  ],
};
// …/api-reference/instagram-user/insights — printed example (reach, metric_type=total_value)
const IG_ACCOUNT_INSIGHTS_DOC = {
  data: [
    {
      name: 'reach',
      period: 'day',
      title: 'Accounts reached',
      total_value: {
        value: 224,
        breakdowns: [
          {
            dimension_keys: ['media_product_type'],
            results: [
              { dimension_values: ['CAROUSEL_CONTAINER'], value: 100 },
              { dimension_values: ['POST'], value: 124 },
            ],
          },
        ],
      },
      id: '17841405309211844/insights/reach/day',
    },
  ],
  paging: { previous: '...', next: '...' },
};
// developers.facebook.com/docs/graph-api/guides/error-handling — printed example
const IG_ERROR_190 = {
  error: { message: 'Message describing the error', type: 'OAuthException', code: 190, error_subcode: 460, fbtrace_id: 'EJplcsCHuLu' },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Sign-in
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('validateReturnTo: only an allowlisted ORIGIN, only /admin, normalised', () => {
  const ok = (v) => core.validateReturnTo(v, ORIGINS);
  assert.equal(ok('https://forgelegacy.expo.app/admin'), 'https://forgelegacy.expo.app/admin');
  assert.equal(ok('https://forgelegacy.expo.app/admin/'), 'https://forgelegacy.expo.app/admin');
  // The query and fragment the CRM happened to be on are dropped; the callback writes its own.
  assert.equal(ok('https://forgelegacy.expo.app/admin?p=social&x=1#frag'), 'https://forgelegacy.expo.app/admin');
  assert.equal(ok('http://localhost:8081/admin'), 'http://localhost:8081/admin');

  for (const bad of [
    'https://evil.example/admin',
    'https://forgelegacy.expo.app.evil.example/admin',
    'https://forgelegacy.expo.app@evil.example/admin',
    'https://evil.example\\@forgelegacy.expo.app/admin',
    'https://evil.example/admin?x=https://forgelegacy.expo.app/admin',
    'http://forgelegacy.expo.app/admin', // wrong scheme = different origin
    'https://forgelegacy.expo.app:8443/admin', // wrong port = different origin
    'http://localhost:9999/admin',
    'https://forgelegacy.expo.app/',
    'https://forgelegacy.expo.app/admin/users',
    'https://forgelegacy.expo.app/administrator',
    'https://forgelegacy.expo.app//evil.example/admin',
    '//forgelegacy.expo.app/admin',
    '/admin',
    'javascript:alert(1)//forgelegacy.expo.app/admin',
    'https://user:pw@forgelegacy.expo.app/admin',
    '', null, undefined, 42, {}, 'https://forgelegacy.expo.app/admin?' + 'x'.repeat(600),
  ]) {
    assert.equal(ok(bad), null, String(bad));
  }
  // An empty allowlist allows nothing; trailing slashes and spaces in the env value are forgiven.
  assert.equal(core.validateReturnTo('https://forgelegacy.expo.app/admin', ''), null);
  assert.equal(core.validateReturnTo('https://a.example/admin', ' https://a.example/ , https://b.example'), 'https://a.example/admin');
});

test('returnUrl carries only a fixed word and the platform', () => {
  assert.equal(core.returnUrl('https://forgelegacy.expo.app/admin', 'tiktok', true),
    'https://forgelegacy.expo.app/admin?p=social&a=connected-tiktok');
  assert.equal(core.returnUrl('https://forgelegacy.expo.app/admin', 'instagram', false),
    'https://forgelegacy.expo.app/admin?p=social&a=failed-instagram');
});

test('authorizeUrl: TikTok and Instagram, exactly as documented', () => {
  const state = 'ab'.repeat(32);
  const t = new URL(core.authorizeUrl('tiktok', { clientId: 'awx123', redirectUri: REDIRECT, state }));
  assert.equal(t.origin + t.pathname, 'https://www.tiktok.com/v2/auth/authorize/');
  assert.equal(t.searchParams.get('client_key'), 'awx123');
  assert.equal(t.searchParams.get('response_type'), 'code');
  assert.equal(t.searchParams.get('scope'), 'user.info.basic,user.info.profile,user.info.stats,video.list');
  assert.equal(t.searchParams.get('redirect_uri'), REDIRECT);
  assert.equal(t.searchParams.get('state'), state);

  const i = new URL(core.authorizeUrl('instagram', { clientId: '990602627938098', redirectUri: REDIRECT, state }));
  assert.equal(i.origin + i.pathname, 'https://www.instagram.com/oauth/authorize');
  assert.equal(i.searchParams.get('client_id'), '990602627938098');
  assert.equal(i.searchParams.get('response_type'), 'code');
  assert.equal(i.searchParams.get('scope'), 'instagram_business_basic,instagram_business_manage_insights');
  assert.equal(i.searchParams.get('redirect_uri'), REDIRECT);
  assert.equal(i.searchParams.get('state'), state);
  // No secret can be in either address: the builder is never given one.
  assert.ok(!/secret/i.test(t.href + i.href));
});

test('missingSecrets names what is absent, never a value', () => {
  assert.deepEqual(core.missingSecrets('tiktok', {}), ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
  assert.deepEqual(core.missingSecrets('tiktok', { TIKTOK_CLIENT_KEY: 'k', TIKTOK_CLIENT_SECRET: '  ' }), ['TIKTOK_CLIENT_SECRET']);
  assert.deepEqual(core.missingSecrets('instagram', { INSTAGRAM_APP_ID: '1', INSTAGRAM_APP_SECRET: 's' }), []);
  assert.deepEqual(core.missingSecrets('instagram', { TIKTOK_CLIENT_KEY: 'k' }), ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET']);
});

test('stateIsFresh: ten minutes, and not from the future', () => {
  const at = (msAgo) => new Date(NOW - msAgo).toISOString();
  assert.equal(core.stateIsFresh(at(0), NOW), true);
  assert.equal(core.stateIsFresh(at(9 * 60 * 1000 + 59000), NOW), true);
  assert.equal(core.stateIsFresh(at(10 * 60 * 1000 + 1000), NOW), false);
  assert.equal(core.stateIsFresh(at(-5 * 60 * 1000), NOW), false);
  assert.equal(core.stateIsFresh(null, NOW), false);
  assert.equal(core.stateIsFresh('not a date', NOW), false);
  // Postgres timestamptz as PostgREST prints it.
  assert.equal(core.stateIsFresh('2026-09-30T11:55:00.123456+00:00', NOW), true);
});

test('cleanCode strips Instagram\'s "#_"', () => {
  assert.equal(core.cleanCode('abcdefghijklmnopqrstuvwxyz#_'), 'abcdefghijklmnopqrstuvwxyz');
  assert.equal(core.cleanCode('wFPH5DePZMb07BPJvpWi-WotFlq1ISzFYQBDb9S9CBUQ*0!6410'), 'wFPH5DePZMb07BPJvpWi-WotFlq1ISzFYQBDb9S9CBUQ*0!6410');
  assert.equal(core.cleanCode(null), '');
});

test('timingSafeEqual', () => {
  const secret = 'a3f1c0de'.repeat(8);
  assert.equal(core.timingSafeEqual(secret, secret), true);
  assert.equal(core.timingSafeEqual(secret.slice(0, -1) + '0', secret), false);
  assert.equal(core.timingSafeEqual(secret.slice(0, -1), secret), false);
  assert.equal(core.timingSafeEqual(secret + 'x', secret), false);
  assert.equal(core.timingSafeEqual('', secret), false);
  // A database that has no secret must never be matched by an empty header.
  assert.equal(core.timingSafeEqual('', ''), false);
  assert.equal(core.timingSafeEqual('', undefined), false);
  assert.equal(core.timingSafeEqual(null, null), false);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('parseTikTokToken: DOC success → our columns, with both expiries', () => {
  const t = core.parseTikTokToken(TT_TOKEN, NOW);
  assert.deepEqual(t, {
    ok: true,
    access_token: 'act.example12345Example12345Example',
    refresh_token: 'rft.example12345Example12345Example',
    token_expires_at: '2026-10-01T12:00:00.000Z', // 24 hours
    refresh_expires_at: '2027-09-30T12:00:00.000Z', // 365 days
    scopes: 'user.info.basic,video.list',
    external_id: 'afd97af1-b87b-48b9-ac98-410aghda5344',
  });
});

test('parseTikTokToken: the older wrapped shape, and failures', () => {
  const w = core.parseTikTokToken(TT_TOKEN_WRAPPED, NOW);
  assert.equal(w.ok, true);
  assert.equal(w.access_token, 'act.example12345Example12345Example');
  assert.equal(w.external_id, 'abcdefgh-1a2b-123c4-ab12-abc123abc1234');
  assert.equal(w.refresh_expires_at, null); // not in that shape: null, never NaN

  assert.deepEqual(core.parseTikTokToken(TT_TOKEN_ERROR, NOW), { ok: false, auth: false });
  assert.deepEqual(core.parseTikTokToken({ error: 'invalid_grant', error_description: 'Refresh token is expired.', log_id: 'x' }, NOW),
    { ok: false, auth: true });
  assert.deepEqual(core.parseTikTokToken(null, NOW), { ok: false, auth: false });
  assert.deepEqual(core.parseTikTokToken('<html>502</html>', NOW), { ok: false, auth: false });
});

test('parseInstagramShortToken / LongToken: DOC shapes', () => {
  assert.deepEqual(core.parseInstagramShortToken(IG_SHORT), {
    ok: true,
    access_token: 'EAACEdEose0...',
    external_id: '1020...',
    scopes: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish',
  });
  // Flat, with a numeric id and an array of permissions: read the same way.
  assert.deepEqual(
    core.parseInstagramShortToken({ access_token: 'IGQ', user_id: 17841405822304914n.toString(), permissions: ['instagram_business_basic', 'instagram_business_manage_insights'] }),
    { ok: true, access_token: 'IGQ', external_id: '17841405822304914', scopes: 'instagram_business_basic,instagram_business_manage_insights' },
  );
  assert.deepEqual(core.parseInstagramShortToken(IG_SHORT_REJECTED), { ok: false });
  assert.deepEqual(core.parseInstagramShortToken({ data: [] }), { ok: false });

  const long = core.parseInstagramLongToken(IG_LONG, NOW);
  assert.equal(long.ok, true);
  assert.equal(long.access_token, 'EAACEdEose0...');
  assert.equal(long.token_expires_at, new Date(NOW + 5183944 * 1000).toISOString()); // just under 60 days
  assert.deepEqual(core.parseInstagramLongToken(IG_ERROR_190, NOW), { ok: false, auth: true });
  assert.deepEqual(core.parseInstagramLongToken({ error: { message: 'x', type: 'OAuthException', code: 100 } }, NOW), { ok: false, auth: false });
  assert.deepEqual(core.parseInstagramLongToken(null, NOW), { ok: false, auth: false });
});

test('tokenAction: TikTok refreshes a short-lived token, Instagram renews inside the last 30 days', () => {
  const iso = (ms) => new Date(NOW + ms).toISOString();
  const H = 3600 * 1000;
  const D = 24 * H;
  const tt = (o) => ({ access_token: 'act.x', refresh_token: 'rft.x', token_expires_at: iso(12 * H), refresh_expires_at: iso(300 * D), ...o });
  assert.equal(core.tokenAction('tiktok', null, NOW), 'none');
  assert.equal(core.tokenAction('tiktok', { access_token: null, refresh_token: 'rft.x' }, NOW), 'none'); // disconnected
  assert.equal(core.tokenAction('tiktok', tt({}), NOW), 'use');
  assert.equal(core.tokenAction('tiktok', tt({ token_expires_at: iso(5 * 60 * 1000) }), NOW), 'refresh');
  assert.equal(core.tokenAction('tiktok', tt({ token_expires_at: iso(-H) }), NOW), 'refresh'); // the daily cron's usual case
  assert.equal(core.tokenAction('tiktok', tt({ token_expires_at: null }), NOW), 'refresh');
  assert.equal(core.tokenAction('tiktok', tt({ token_expires_at: iso(-H), refresh_expires_at: iso(-H) }), NOW), 'expired');
  assert.equal(core.tokenAction('tiktok', tt({ token_expires_at: iso(-H), refresh_token: null }), NOW), 'expired');

  const ig = (o) => ({ access_token: 'IGQ', refresh_token: null, token_expires_at: iso(59 * D), refresh_expires_at: null, ...o });
  assert.equal(core.tokenAction('instagram', ig({}), NOW), 'use'); // a day old: too young to refresh, and no need
  assert.equal(core.tokenAction('instagram', ig({ token_expires_at: iso(31 * D) }), NOW), 'use');
  assert.equal(core.tokenAction('instagram', ig({ token_expires_at: iso(29 * D) }), NOW), 'refresh');
  assert.equal(core.tokenAction('instagram', ig({ token_expires_at: iso(H) }), NOW), 'refresh');
  assert.equal(core.tokenAction('instagram', ig({ token_expires_at: iso(-H) }), NOW), 'expired');
  assert.equal(core.tokenAction('instagram', ig({ access_token: '' }), NOW), 'none');
});

test('error detection: TikTok codes (nested and flat), Instagram code 190', () => {
  assert.equal(core.tiktokErrorCode(TT_USER_DOC), null);
  assert.equal(core.tiktokErrorCode(TT_VIDEOS_DOC), null);
  assert.equal(core.tiktokErrorCode(TT_ERROR_FLAT), 'access_token_invalid');
  assert.equal(core.tiktokErrorCode({ data: {}, error: { code: 'scope_not_authorized', message: 'x', log_id: 'y' } }), 'scope_not_authorized');
  assert.equal(core.tiktokErrorCode(null), 'no_answer');
  assert.equal(core.tiktokErrorCode({}), 'no_answer');
  // A code is only ever letters, digits and underscores, and short: it is shown to the owner.
  assert.equal(core.tiktokErrorCode({ error: { code: 'weird code <script>' + 'x'.repeat(80) } }).length, 40);
  assert.ok(/^[a-z0-9_]+$/i.test(core.tiktokErrorCode({ error: { code: 'weird code <script>' } })));

  assert.equal(core.instagramAuthError(IG_ERROR_190), true);
  assert.equal(core.instagramAuthError({ error: { code: 10, message: 'Permission denied' } }), false);
  assert.equal(core.instagramAuthError(IG_SHORT_REJECTED), false);
  assert.equal(core.instagramAuthError(null), false);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TikTok data
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('parseTikTokUser: handle is the @username, followers from user.info.stats', () => {
  assert.deepEqual(core.parseTikTokUser(TT_USER), {
    handle: 'forgelegacy', external_id: '723f24d7-e717-40f8-a2b6-cb8464cd23b4', followers: 1284,
  });
  // DOC example: the stats scope was not asked for, so there is no count. null, never 0.
  assert.deepEqual(core.parseTikTokUser(TT_USER_DOC), {
    handle: null, external_id: '723f24d7-e717-40f8-a2b6-cb8464cd23b4', followers: null,
  });
  // No username (user.info.profile declined): the display name stands in.
  assert.equal(core.parseTikTokUser({ data: { user: { display_name: ' Forge Legacy ' } } }).handle, 'Forge Legacy');
  assert.deepEqual(core.parseTikTokUser({}), { handle: null, external_id: null, followers: null });
  assert.equal(core.parseTikTokUser({ data: { user: { follower_count: 0 } } }).followers, 0);
});

test('parseTikTokVideos: DOC example — only id and title came back', () => {
  const p = core.parseTikTokVideos(TT_VIDEOS_DOC);
  assert.equal(p.has_more, false);
  assert.equal(p.cursor, 1643332803000);
  assert.deepEqual(p.posts, [{
    external_id: '12345123451234512345', posted_at: null, caption: 'Video Title', title: 'Video Title', url: null,
    duration_s: null, views: null, likes: null, comments: null, shares: null, saves: null, reach: null, avg_watch_s: null,
  }]);
});

test('parseTikTokVideos: the fields we ask for; seconds → ISO; zeros stay zeros; no watch time or saves', () => {
  const p = core.parseTikTokVideos(TT_VIDEOS);
  assert.equal(p.has_more, true);
  assert.equal(p.cursor, 1790337600000); // passed back untouched (milliseconds)
  assert.equal(p.posts.length, 2);
  assert.deepEqual(p.posts[0], {
    external_id: '7412345123451234512',
    posted_at: '2026-09-28T12:00:00.000Z',
    caption: 'I asked Holt to rebuild my week 🔥 #gym #fitness',
    title: 'I asked Holt to rebuild my week 🔥 #gym #fitness',
    url: 'https://www.tiktok.com/@forgelegacy/video/7412345123451234512?utm_campaign=tt4d_open_api&utm_source=aw1234',
    duration_s: 34,
    views: 18422, likes: 1510, comments: 44, shares: 212,
    saves: null, reach: null, avg_watch_s: null,
  });
  // A post with no caption and a zero duration: a real title, real zeros, a null duration.
  assert.equal(p.posts[1].title, 'Untitled post');
  assert.equal(p.posts[1].caption, null);
  assert.equal(p.posts[1].views, 0);
  assert.equal(p.posts[1].duration_s, null);
  // A broken body is an empty page, not a crash.
  assert.deepEqual(core.parseTikTokVideos(null), { posts: [], cursor: null, has_more: false });
  assert.deepEqual(core.parseTikTokVideos({ data: { videos: [{ title: 'no id' }] } }).posts, []);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Instagram data
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('parseInstagramUser: DOC wrapped shape and the flat one', () => {
  assert.deepEqual(core.parseInstagramUser(IG_ME_DOC), { handle: 'forgelegacy', external_id: '17841405822304914', followers: null });
  assert.deepEqual(
    core.parseInstagramUser({ user_id: '17841405822304914', username: 'forgelegacy', followers_count: 842, media_count: 60, account_type: 'MEDIA_CREATOR', id: '9988776655' }),
    { handle: 'forgelegacy', external_id: '17841405822304914', followers: 842 },
  );
  // Only the app-scoped id came back.
  assert.equal(core.parseInstagramUser({ id: '9988776655', username: 'x' }).external_id, '9988776655');
  assert.deepEqual(core.parseInstagramUser({ data: [] }), { handle: null, external_id: null, followers: null });
});

test('parseInstagramMedia: DOC list (ids only, no `next`) is the last page', () => {
  const p = core.parseInstagramMedia(IG_MEDIA_DOC);
  assert.equal(p.after, null); // a cursor is present, but without paging.next there is no next page
  assert.deepEqual(p.posts.map((x) => x.external_id), ['17918195224117851', '17895695668004550']);
  assert.equal(p.posts[0].title, 'Untitled post');
  assert.equal(p.posts[0].posted_at, null);
});

test('parseInstagramMedia: our fields; "+0000" dates; hidden likes; ads dropped; next page cursor', () => {
  const p = core.parseInstagramMedia(IG_MEDIA);
  assert.equal(p.after, 'QVFIUmlwbnFsM3N2cV9lZA...');
  assert.equal(p.posts.length, 2); // the AD is not the owner's content
  assert.deepEqual(p.posts[0], {
    external_id: '17918920912340654',
    posted_at: '2026-09-28T17:05:11.000Z',
    caption: 'Week 6 of the rebuild.\nNothing fancy, just showing up. #forgelegacy',
    title: 'Week 6 of the rebuild.',
    url: 'https://www.instagram.com/reel/DAbCdEfGhIj/',
    duration_s: null, // Instagram has no length field
    views: null, likes: 301, comments: 12, shares: null, saves: null, reach: null, avg_watch_s: null,
    product: 'REELS',
  });
  assert.equal(p.posts[1].likes, null); // like_count omitted = hidden, not zero
  assert.equal(p.posts[1].product, 'FEED');
  assert.equal(p.posts[1].title, 'Untitled post');
  // The `next` address carries the token, so it must never be kept.
  assert.ok(!JSON.stringify(p).includes('access_token'));
});

test('instagramMetricsFor: a reel-only metric is never asked of a feed post', () => {
  assert.ok(core.instagramMetricsFor('REELS').includes('ig_reels_avg_watch_time'));
  assert.ok(!core.instagramMetricsFor('FEED').includes('ig_reels_avg_watch_time'));
  assert.deepEqual(core.instagramMetricsFor('FEED'), ['views', 'reach', 'likes', 'comments', 'shares', 'saved']);
  assert.deepEqual(core.instagramMetricsFor('REELS', true), ['reach', 'likes', 'comments', 'shares', 'saved']);
  assert.equal(core.instagramMetricsFor('STORY'), null);
  assert.equal(core.instagramMetricsFor('AD'), null);
  assert.equal(core.instagramMetricsFor(undefined), null);
  // Feed-only metrics are never requested anywhere: one of them on a reel fails the whole call.
  for (const m of ['profile_visits', 'follows', 'profile_activity', 'impressions', 'plays']) {
    for (const p of ['REELS', 'FEED']) {
      assert.ok(!core.instagramMetricsFor(p).includes(m) && !core.instagramMetricsFor(p, true).includes(m), `${p} ${m}`);
    }
  }
});

test('parseInsights + applyInstagramInsights: DOC item shape; milliseconds → seconds', () => {
  assert.deepEqual(core.parseInsights(IG_MEDIA_INSIGHTS_DOC), { profile_activity: 4 });
  assert.deepEqual(core.parseInsights(null), {});
  assert.deepEqual(core.parseInsights({ data: [{ name: 'reach', values: [] }, { name: 'views', values: [{ value: '12' }] }] }), {});

  const reel = core.parseInstagramMedia(IG_MEDIA).posts[0];
  const full = core.applyInstagramInsights(reel, core.parseInsights(IG_REEL_INSIGHTS));
  assert.equal(full.views, 9120);
  assert.equal(full.reach, 7044);
  assert.equal(full.likes, 305); // insights win over the basic field
  assert.equal(full.shares, 88);
  assert.equal(full.saves, 61); // Instagram calls it `saved`
  assert.equal(full.avg_watch_s, 11.44); // 11437 ms
  // A failed insights call (nothing returned) keeps the basic counts exactly.
  assert.deepEqual(core.applyInstagramInsights(reel, {}), reel);
  // The fallback list has no watch time: what is there is applied, watch time stays null.
  const part = core.applyInstagramInsights(reel, { reach: 7044, saved: 61 });
  assert.equal(part.reach, 7044);
  assert.equal(part.likes, 301);
  assert.equal(part.avg_watch_s, null);
});

test('parseInstagramAccountInsights: DOC reach example; link taps when present', () => {
  assert.deepEqual(core.parseInstagramAccountInsights(IG_ACCOUNT_INSIGHTS_DOC), { reach: 224, link_taps: null });
  const both = { data: [...IG_ACCOUNT_INSIGHTS_DOC.data, { name: 'profile_links_taps', period: 'day', title: 'Profile links taps', total_value: { value: 7 }, id: 'x' }] };
  assert.deepEqual(core.parseInstagramAccountInsights(both), { reach: 224, link_taps: 7 });
  // Meta returns an EMPTY data set, not zeros, when it has nothing.
  assert.deepEqual(core.parseInstagramAccountInsights({ data: [] }), { reach: null, link_taps: null });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Rows
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('titleFromCaption: first line with anything on it, 200 characters, never half an emoji', () => {
  assert.equal(core.titleFromCaption('Week 6 of the rebuild.\nNothing fancy.'), 'Week 6 of the rebuild.');
  assert.equal(core.titleFromCaption('\r\n  \n  Second line is the first real one  \r\nthird'), 'Second line is the first real one');
  assert.equal(core.titleFromCaption(''), 'Untitled post');
  assert.equal(core.titleFromCaption('   \n \n'), 'Untitled post');
  assert.equal(core.titleFromCaption(null), 'Untitled post');
  assert.equal(core.titleFromCaption(undefined), 'Untitled post');
  const long = 'x'.repeat(199) + '🔥🔥🔥';
  const t = core.titleFromCaption(long);
  assert.equal(Array.from(t).length, 200);
  assert.ok(t.endsWith('🔥'));
  assert.ok(!/[\uD800-\uDBFF]$/.test(t), 'ends on a whole character');
  // Postgres counts characters, so 200 emoji must survive whole (that is 400 UTF-16 units).
  assert.equal(Array.from(core.titleFromCaption('🔥'.repeat(300))).length, 200);
});

test('clip / lengthSeconds / toIso / utcDay / dayDiff', () => {
  assert.equal(core.clip('abc', 2), 'ab');
  assert.equal(core.clip('abc', 3), 'abc');
  assert.equal(core.clip(null, 3), null);
  assert.equal(Array.from(core.clip('🔥'.repeat(5), 3)).length, 3);

  assert.equal(core.lengthSeconds(34), 34);
  assert.equal(core.lengthSeconds(34.6), 35);
  assert.equal(core.lengthSeconds(0.2), null); // rounds to 0: below the column's check
  assert.equal(core.lengthSeconds(0), null);
  assert.equal(core.lengthSeconds(null), null);
  assert.equal(core.lengthSeconds(7200), 7200);
  assert.equal(core.lengthSeconds(7201), null);

  assert.equal(core.toIso('2019-09-26T22:36:43+0000'), '2019-09-26T22:36:43.000Z'); // DOC format
  assert.equal(core.toIso('2026-09-28T10:05:11-0700'), '2026-09-28T17:05:11.000Z');
  assert.equal(core.toIso('2026-09-28T17:05:11Z'), '2026-09-28T17:05:11.000Z');
  assert.equal(core.toIso('nope'), null);
  assert.equal(core.toIso(undefined), null);

  assert.equal(core.utcDay(Date.parse('2026-09-30T23:59:59Z')), '2026-09-30');
  assert.equal(core.utcDay(Date.parse('2026-10-01T00:00:00Z')), '2026-10-01');
  assert.equal(core.dayDiff('2026-09-30', '2026-10-01'), 1);
  assert.equal(core.dayDiff('2026-03-01', '2026-02-28'), -1);
});

test('postingPatch: NEVER watch_pct_typed; a value the platform did not give is left out', () => {
  const now = '2026-09-30T12:00:00.000Z';
  const tt = core.postingPatch(core.parseTikTokVideos(TT_VIDEOS).posts[0], now);
  assert.deepEqual(Object.keys(tt).sort(), ['caption', 'comments', 'duration_s', 'likes', 'posted_at', 'shares', 'synced_at', 'updated_at', 'url', 'views']);
  assert.equal(tt.synced_at, now);
  // TikTok shares no saves, reach or watch time: those keys are absent, so an update cannot blank them.
  for (const k of ['saves', 'reach', 'avg_watch_s']) assert.ok(!(k in tt), k);

  const allPatches = [
    tt,
    core.postingPatch(core.parseTikTokVideos(TT_VIDEOS).posts[1], now),
    core.postingPatch(core.applyInstagramInsights(core.parseInstagramMedia(IG_MEDIA).posts[0], core.parseInsights(IG_REEL_INSIGHTS)), now),
    core.postingPatch({ ...core.parseInstagramMedia(IG_MEDIA).posts[1], watch_pct_typed: 55, typed_at: now, video_id: 'v', id: 'p' }, now),
  ];
  const allowed = new Set(['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'avg_watch_s', 'duration_s', 'url', 'caption', 'posted_at', 'synced_at', 'updated_at']);
  for (const p of allPatches) {
    for (const k of Object.keys(p)) assert.ok(allowed.has(k), `unexpected column ${k}`);
    assert.ok(!('watch_pct_typed' in p));
    assert.ok(!('typed_at' in p));
    assert.ok(!('title' in p) && !('product' in p) && !('external_id' in p));
  }
  // Zeros ARE written (a post with no views yet has 0 views, not "unknown").
  assert.equal(allPatches[1].views, 0);
  assert.equal(allPatches[2].avg_watch_s, 11.44);
});

test('planPostings: update by platform id, else the closest planned date, else a new video', () => {
  const post = (id, iso) => ({ external_id: id, posted_at: iso, title: id });
  const existing = [
    { id: 'p-linked', video_id: 'v1', external_id: 'A', scheduled_for: '2026-09-01', created_at: '2026-08-20T00:00:00Z' },
    { id: 'p-plan-27', video_id: 'v2', external_id: null, scheduled_for: '2026-09-27', created_at: '2026-09-10T00:00:00Z' },
    { id: 'p-plan-28-new', video_id: 'v3', external_id: null, scheduled_for: '2026-09-28', created_at: '2026-09-12T00:00:00Z' },
    { id: 'p-plan-28-old', video_id: 'v4', external_id: null, scheduled_for: '2026-09-28', created_at: '2026-09-11T00:00:00Z' },
    { id: 'p-idea', video_id: 'v5', external_id: null, scheduled_for: null, created_at: '2026-09-01T00:00:00Z' },
    { id: 'p-far', video_id: 'v6', external_id: null, scheduled_for: '2026-09-20', created_at: '2026-09-01T00:00:00Z' },
  ];
  const plan = core.planPostings([
    post('D', '2026-09-28T23:30:00.000Z'),
    post('A', '2026-09-28T12:00:00.000Z'),
    post('B', '2026-09-28T09:00:00.000Z'),
    post('C', '2026-09-28T10:00:00.000Z'),
    post('E', '2026-09-28T23:45:00.000Z'),
    post('F', '2026-09-23T00:00:00.000Z'),
  ], existing);
  const by = Object.fromEntries(plan.map((x) => [x.post.external_id, x]));

  // A is already linked. Its own date plays no part, and it never takes a plan.
  assert.deepEqual([by.A.kind, by.A.posting_id, by.A.video_id], ['update', 'p-linked', 'v1']);
  // B (09:00, first) takes the exact-date plan, and of two on that date the OLDEST plan.
  assert.deepEqual([by.B.kind, by.B.posting_id, by.B.video_id], ['match', 'p-plan-28-old', 'v4']);
  // C takes the other plan for the 28th.
  assert.deepEqual([by.C.kind, by.C.posting_id], ['match', 'p-plan-28-new']);
  // D: both plans for the 28th are claimed, the 27th is one day away.
  assert.deepEqual([by.D.kind, by.D.posting_id], ['match', 'p-plan-27']);
  // E: nothing left within a day → a new video. A plan is claimed once only.
  assert.equal(by.E.kind, 'create');
  // F is three days from the nearest plan (the 20th): not a match.
  assert.equal(by.F.kind, 'create');
  assert.equal(new Set(plan.filter((x) => x.kind === 'match').map((x) => x.posting_id)).size, 3);
  // A posting with no date planned is never matched.
  assert.ok(!plan.some((x) => x.posting_id === 'p-idea'));
});

test('planPostings: one day either side, across a month end; duplicates and undated posts', () => {
  const plan1 = (scheduled) => [{ id: 'p', video_id: 'v', external_id: null, scheduled_for: scheduled, created_at: '2026-09-01T00:00:00Z' }];
  const one = (iso, scheduled) => core.planPostings([{ external_id: 'X', posted_at: iso }], plan1(scheduled))[0].kind;
  assert.equal(one('2026-10-01T03:00:00.000Z', '2026-09-30'), 'match'); // posted late evening, local time
  assert.equal(one('2026-09-29T20:00:00.000Z', '2026-09-30'), 'match');
  assert.equal(one('2026-10-02T00:00:00.000Z', '2026-09-30'), 'create');
  assert.equal(one('2026-09-28T23:59:59.000Z', '2026-09-30'), 'create');
  // No date from the platform: it cannot be matched to a plan.
  assert.equal(one(null, '2026-09-30'), 'create');

  // The same post listed twice (a page boundary moved) is planned once.
  const dup = core.planPostings([{ external_id: 'X', posted_at: '2026-09-30T00:00:00.000Z' }, { external_id: 'X', posted_at: '2026-09-30T00:00:00.000Z' }], []);
  assert.equal(dup.length, 1);
  // The order the platform lists posts in does not change who gets the plan: the OLDER post does.
  const posts = [{ external_id: 'new', posted_at: '2026-09-30T18:00:00.000Z' }, { external_id: 'old', posted_at: '2026-09-30T08:00:00.000Z' }];
  for (const order of [posts, [...posts].reverse()]) {
    const r = core.planPostings(order, plan1('2026-09-30'));
    assert.equal(r.find((x) => x.kind === 'match').post.external_id, 'old');
  }
  // A second sync finds both already linked: nothing is created twice.
  const again = core.planPostings(posts, [
    { id: 'p1', video_id: 'v1', external_id: 'old', scheduled_for: '2026-09-30', created_at: '2026-09-01T00:00:00Z' },
    { id: 'p2', video_id: 'v2', external_id: 'new', scheduled_for: null, created_at: '2026-09-30T00:00:00Z' },
  ]);
  assert.deepEqual(again.map((x) => x.kind), ['update', 'update']);
  assert.deepEqual(core.planPostings([], plan1('2026-09-30')), []);
});

test('no secret or token name is written into a row shape', () => {
  const dump = JSON.stringify([
    core.parseTikTokUser(TT_USER), core.parseTikTokVideos(TT_VIDEOS), core.parseInstagramUser(IG_ME_DOC),
    core.parseInstagramMedia(IG_MEDIA), core.returnUrl('https://forgelegacy.expo.app/admin', 'tiktok', false),
  ]);
  for (const word of ['access_token', 'refresh_token', 'client_secret', 'act.', 'rft.', 'REDACTED']) {
    assert.ok(!dump.includes(word), word);
  }
});
