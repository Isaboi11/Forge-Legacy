// node --test src/domain/admin/__tests__/social-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  accountState,
  addDays,
  ago,
  calendarWeeks,
  followerSeries,
  followers,
  lessons,
  measureText,
  nextStage,
  postedIn,
  share,
  stageCounts,
  sumIn,
  syncLine,
  tagLine,
  topVideos,
  totals,
  videoInFilter,
  videoMap,
  videosInStage,
  watched,
  weekCount,
  weekStart,
  weekVerdict,
  working,
} from '../social-core.ts';

const TODAY = '2026-09-30'; // a Wednesday

const video = (id, over = {}) => ({
  id,
  title: `Video ${id}`,
  topic: 'Holt',
  hook: 'Result first',
  format: 'Screen recording',
  length_s: 30,
  stage: 'posted',
  first_line: null,
  notes: null,
  lesson_tried: null,
  lesson_result: null,
  verdict: null,
  planned: [],
  imported_from: null,
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-01T12:00:00Z',
  ...over,
});

const posting = (id, video_id, platform, over = {}) => ({
  id,
  video_id,
  platform,
  scheduled_for: null,
  posted_at: null,
  posted_day: null,
  linked: false,
  url: null,
  caption: null,
  duration_s: null,
  views: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
  reach: null,
  avg_watch_s: null,
  watch_pct_typed: null,
  synced_at: null,
  typed_at: null,
  ...over,
});

// What the two platforms actually give: TikTok no watch time and no saves; Instagram both.
const DATA = {
  sync_ready: true,
  accounts: [
    { platform: 'instagram', username: 'builtbyisa', connected: true, connected_at: '2026-09-10T10:00:00Z', last_sync_at: '2026-09-30T09:10:00Z', last_sync_ok: true, last_sync_message: null },
    { platform: 'tiktok', username: 'builtbyisa', connected: true, connected_at: '2026-09-01T10:00:00Z', last_sync_at: '2026-09-30T10:00:00Z', last_sync_ok: true, last_sync_message: null },
  ],
  daily: [
    { platform: 'tiktok', day: '2026-07-20', followers: 2000, reach: null, profile_views: null, link_taps: null, source: 'typed' },
    { platform: 'tiktok', day: '2026-08-31', followers: 2700, reach: null, profile_views: null, link_taps: null, source: 'typed' },
    { platform: 'tiktok', day: '2026-09-15', followers: 3100, reach: null, profile_views: null, link_taps: null, source: 'sync' },
    { platform: 'tiktok', day: '2026-09-30', followers: 3420, reach: null, profile_views: null, link_taps: null, source: 'sync' },
    { platform: 'instagram', day: '2026-09-10', followers: 1700, reach: 900, profile_views: 40, link_taps: 3, source: 'sync' },
    { platform: 'instagram', day: '2026-09-30', followers: 1890, reach: 1200, profile_views: 61, link_taps: 5, source: 'sync' },
  ],
  videos: [
    video('a'),
    video('b', { topic: 'Feature demo', hook: 'Question', length_s: 24, verdict: 'keep', lesson_tried: 'Opened with a question.', lesson_result: 'Shares tripled.' }),
    video('c', { topic: null, hook: null, format: null, length_s: 17, imported_from: 'tiktok' }),
    video('d', { stage: 'scheduled', topic: 'Holt', length_s: 30 }),
    video('e', { stage: 'idea', planned: [] }),
    video('f', { stage: 'idea', planned: ['instagram'] }),
    video('g', { stage: 'dropped' }),
  ],
  postings: [
    posting('a-tt', 'a', 'tiktok', { posted_day: '2026-09-22', posted_at: '2026-09-22T18:00:00Z', linked: true, views: 48200, likes: 3900, comments: 212, shares: 640, duration_s: 28.4, watch_pct_typed: 61, synced_at: '2026-09-30T10:00:00Z' }),
    posting('a-ig', 'a', 'instagram', { posted_day: '2026-09-23', posted_at: '2026-09-23T18:00:00Z', linked: true, views: 12400, likes: 980, comments: 61, shares: 170, saves: 410, avg_watch_s: 16.2, synced_at: '2026-09-30T09:10:00Z' }),
    posting('b-ig', 'b', 'instagram', { posted_day: '2026-09-18', posted_at: '2026-09-18T18:00:00Z', linked: true, views: 15600, likes: 1300, comments: 180, shares: 620, saves: 340, avg_watch_s: 13.68, synced_at: '2026-09-30T09:10:00Z' }),
    posting('c-tt', 'c', 'tiktok', { posted_day: '2026-09-29', posted_at: '2026-09-29T18:00:00Z', linked: true, views: 2600, likes: 190, comments: 9, shares: 14, duration_s: 17, synced_at: '2026-09-30T10:00:00Z' }),
    posting('d-tt', 'd', 'tiktok', { scheduled_for: '2026-10-01' }),
    posting('d-ig', 'd', 'instagram', { scheduled_for: '2026-10-03' }),
    posting('old', 'a', 'tiktok', { id: 'old', video_id: 'g', posted_day: '2026-07-01', posted_at: '2026-07-01T18:00:00Z', views: 900, shares: 2 }),
  ],
  tags: [],
  goals: [
    { platform: 'instagram', posts_per_week: 3, follower_target: 3000, target_date: '2026-12-31' },
    { platform: 'tiktok', posts_per_week: 4, follower_target: 5000, target_date: '2026-12-31' },
  ],
  income: [],
  questions: [],
  rivals: [],
  rules: [],
  clicks: [
    { platform: 'tiktok', day: '2026-09-29', clicks: 40 },
    { platform: 'tiktok', day: '2026-08-31', clicks: 7 },
    { platform: 'instagram', day: '2026-09-30', clicks: 12 },
    { platform: 'instagram', day: '2026-08-01', clicks: 99 },
  ],
  waitlist: [{ platform: 'tiktok', day: '2026-09-29', n: 3 }],
};

test('days: a week runs Monday to Sunday', () => {
  assert.equal(weekStart('2026-09-30'), '2026-09-28');
  assert.equal(weekStart('2026-09-28'), '2026-09-28');
  assert.equal(weekStart('2026-10-04'), '2026-09-28');
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09'); // across a US DST change
  assert.deepEqual(calendarWeeks(TODAY), ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
});

test('watched: a typed percentage wins; Instagram is watch time over length; no length means no figure', () => {
  const vm = videoMap(DATA.videos);
  const p = (id) => DATA.postings.find((x) => x.id === id);
  assert.deepEqual(watched(p('a-tt'), vm.get('a')), { pct: 61, typed: true });
  // 16.2 s of a 30 s video (no platform duration, so the video's own length)
  assert.equal(Math.round(watched(p('a-ig'), vm.get('a')).pct), 54);
  assert.equal(watched(p('a-ig'), vm.get('a')).typed, false);
  // TikTok, nothing typed: not 0, null
  assert.equal(watched(p('c-tt'), vm.get('c')), null);
  assert.equal(watched({ ...p('a-ig'), avg_watch_s: 9 }, { ...vm.get('a'), length_s: null }), null);
  // a watch time longer than the video (loops) is capped, not 140%
  assert.equal(watched({ ...p('a-ig'), avg_watch_s: 42 }, vm.get('a')).pct, 100);
});

test('totals: saves stay null when no posting reports them; watched is weighted by views', () => {
  const vm = videoMap(DATA.videos);
  const tt = totals(postedIn(DATA, 'tiktok', 30, TODAY), vm);
  assert.equal(tt.posts, 2);
  assert.equal(tt.views, 50800);
  assert.equal(tt.saves, null);
  assert.equal(tt.watched, 61); // only one of the two has a figure
  assert.equal(tt.watchedOf, 1);

  const all = totals(postedIn(DATA, 'all', 30, TODAY), vm);
  assert.equal(all.posts, 4);
  assert.equal(all.saves, 750);
  // (61×48200 + 54×12400 + 57×15600) / (48200+12400+15600)
  assert.equal(Math.round(all.watched), 59);
  assert.equal(all.sharesPerK.toFixed(1), ((1444 / 78800) * 1000).toFixed(1));

  const none = totals([], vm);
  assert.equal(none.watched, null);
  assert.equal(none.sharesPerK, null);
});

test('postedIn: the window is the last N days including today, and never a scheduled posting', () => {
  assert.deepEqual(postedIn(DATA, 'all', 7, TODAY).map((p) => p.id).sort(), ['c-tt']);
  assert.deepEqual(postedIn(DATA, 'all', 8, TODAY).map((p) => p.id).sort(), ['a-ig', 'c-tt']);
  assert.equal(postedIn(DATA, 'instagram', 30, TODAY).length, 2);
  assert.ok(postedIn(DATA, 'all', 365, TODAY).every((p) => p.posted_day));
});

test('followers: gained is a difference of two snapshots, and says so when history is shorter than the window', () => {
  // TikTok has history before the window; Instagram was connected 20 days ago.
  const tt = followers(DATA.daily, 'tiktok', 30, TODAY);
  assert.deepEqual(tt, { now: 3420, gained: 720, prev: 700, since: null });

  const ig = followers(DATA.daily, 'instagram', 30, TODAY);
  assert.equal(ig.now, 1890);
  assert.equal(ig.gained, 190);
  assert.equal(ig.since, '2026-09-10');
  assert.equal(ig.prev, null);

  const all = followers(DATA.daily, 'all', 30, TODAY);
  assert.equal(all.now, 5310);
  assert.equal(all.gained, 910);
  assert.equal(all.prev, null); // one platform cannot be compared, so neither can the sum
  assert.equal(all.since, '2026-09-10');

  assert.deepEqual(followers([], 'all', 30, TODAY), { now: null, gained: null, prev: null, since: null });
  // one snapshot, taken today: a count, and no claim about growth
  assert.deepEqual(followers([DATA.daily[3]], 'tiktok', 30, TODAY), { now: 3420, gained: null, prev: null, since: null });
});

test('followerSeries: carries the last snapshot forward and starts where every shown platform has one', () => {
  const tt = followerSeries(DATA.daily, 'tiktok', 30, TODAY);
  assert.equal(tt.days.length, 31);
  assert.equal(tt.days[0], '2026-08-31');
  assert.equal(tt.values[0], 2700);
  assert.equal(tt.values[14], 2700); // Sep 14, before the Sep 15 snapshot
  assert.equal(tt.values[15], 3100);
  assert.equal(tt.values.at(-1), 3420);

  const all = followerSeries(DATA.daily, 'all', 30, TODAY);
  assert.equal(all.days[0], '2026-09-10'); // no cliff on the day Instagram joined
  assert.equal(all.values[0], 2700 + 1700);
  assert.equal(all.values.at(-1), 5310);

  assert.equal(followerSeries(DATA.daily, 'tiktok', 365, TODAY).weekly, true);
  assert.equal(followerSeries(DATA.daily, 'tiktok', 365, TODAY).days.at(-1), TODAY);
  assert.deepEqual(followerSeries([], 'all', 30, TODAY), { days: [], values: [], weekly: false });
});

test('sumIn: link clicks and early-access signups inside the window, per platform', () => {
  assert.equal(sumIn(DATA.clicks, (r) => r.clicks, 'all', 30, TODAY), 52);
  assert.equal(sumIn(DATA.clicks, (r) => r.clicks, 'tiktok', 30, TODAY), 40); // Aug 31 is day 31
  assert.equal(sumIn(DATA.clicks, (r) => r.clicks, 'all', 90, TODAY), 158);
  assert.equal(sumIn(DATA.waitlist, (r) => r.n, 'instagram', 30, TODAY), 0);
});

test('topVideos: one row per video across platforms, one per posting on a single platform', () => {
  const all = topVideos(DATA, 'all', 30, TODAY, 'views');
  assert.deepEqual(all.map((r) => r.video.id), ['a', 'b', 'c']);
  assert.equal(all[0].totals.views, 60600);
  assert.deepEqual(all[0].platforms, ['tiktok', 'instagram']);
  assert.equal(all[0].day, '2026-09-22');

  assert.deepEqual(topVideos(DATA, 'all', 30, TODAY, 'shares').map((r) => r.video.id), ['b', 'a', 'c']);
  // a video with no watched figure sorts last, not first
  assert.equal(topVideos(DATA, 'all', 30, TODAY, 'watched').at(-1).video.id, 'c');
  assert.deepEqual(topVideos(DATA, 'tiktok', 30, TODAY, 'views').map((r) => r.video.id), ['a', 'c']);
});

test('pipeline: an idea with no platform shows under every chip; dropped is off the pipeline', () => {
  assert.deepEqual(stageCounts(DATA, 'all'), { idea: 2, scripted: 0, filmed: 0, scheduled: 1, posted: 3 });
  assert.deepEqual(stageCounts(DATA, 'tiktok'), { idea: 1, scripted: 0, filmed: 0, scheduled: 1, posted: 2 });
  assert.equal(videoInFilter(DATA.videos[4], DATA.postings, 'tiktok'), true); // 'e', no platform yet
  assert.equal(videoInFilter(DATA.videos[5], DATA.postings, 'tiktok'), false); // 'f', planned for Instagram
  assert.deepEqual(videosInStage(DATA, 'posted', 'all').map((v) => v.id), ['c', 'a', 'b']);
  assert.deepEqual(nextStage('filmed'), { to: 'scheduled', label: 'Mark scheduled' });
  assert.equal(nextStage('posted'), null);
});

test('weekCount: counts against the goal; a finished week is met or missed, never rolled forward', () => {
  const thisWeek = weekCount(DATA, '2026-09-28', 'all', TODAY);
  assert.deepEqual({ p: thisWeek.posted, s: thisWeek.scheduled, t: thisWeek.target, past: thisWeek.past }, { p: 1, s: 2, t: 7, past: false });
  assert.deepEqual(weekVerdict(thisWeek), { text: '4 to plan', missed: false });

  const last = weekCount(DATA, '2026-09-21', 'all', TODAY);
  assert.equal(last.posted, 2);
  assert.deepEqual(weekVerdict(last), { text: 'missed', missed: true });

  const tt = weekCount(DATA, '2026-09-28', 'tiktok', TODAY);
  assert.equal(tt.target, 4);
  assert.equal(weekVerdict({ ...tt, target: 0 }), null); // no goal, no verdict
  assert.deepEqual(weekVerdict({ ...last, posted: 7 }), { text: 'met', missed: false });
});

test('working: ranks tags by a measure, shows how many videos stand behind each, skips untagged', () => {
  const byTopic = working(DATA, 'topic', 'shares');
  assert.deepEqual(byTopic.map((r) => r.label), ['Feature demo', 'Holt']);
  assert.equal(byTopic[0].videos, 1);
  assert.equal(byTopic[0].width, 100);
  assert.equal(measureText('shares', byTopic[0].value), '39.7 per 1,000');
  // video 'c' has no topic: it is in no row. The July post on 'g' still counts — the Playbook is all-time.
  assert.equal(byTopic.reduce((n, r) => n + r.videos, 0), 3);

  const byLength = working(DATA, 'length', 'views');
  assert.deepEqual(byLength.map((r) => r.label), ['20 to 35 seconds', 'Under 20 seconds']);
  assert.equal(measureText('views', byLength[1].value), '2,600 views');

  // watched: a tag whose videos have no figure is "—", and sorts last
  const w = working({ ...DATA, postings: DATA.postings.filter((p) => p.platform === 'tiktok' && p.id !== 'a-tt') }, 'length', 'watched');
  assert.ok(w.every((r) => r.value === null));
  assert.equal(measureText('watched', null), '—');
});

test('lessons: only videos with a verdict and something written, newest post first', () => {
  const l = lessons(DATA);
  assert.deepEqual(l.map((x) => x.video.id), ['b']);
  assert.equal(l[0].day, '2026-09-18');
});

test('accounts: connected / expired / never, and the line under the title', () => {
  const now = Date.parse('2026-09-30T12:10:00Z');
  assert.equal(accountState(DATA.accounts[0]), 'connected');
  assert.equal(accountState({ ...DATA.accounts[0], connected: false }), 'expired');
  assert.equal(accountState({ ...DATA.accounts[0], connected: false, connected_at: null }), 'never');
  assert.equal(accountState(undefined), 'never');
  // the OLDER of the two syncs is the honest freshness
  assert.equal(syncLine(DATA.accounts, now), 'TikTok and Instagram synced 3 hours ago.');
  assert.equal(syncLine([], now), 'No account is connected yet.');
  assert.equal(syncLine([{ ...DATA.accounts[1], last_sync_at: null }], now), 'TikTok connected. No sync has run yet.');
  assert.equal(ago('2026-09-30T12:09:40Z', now), 'just now');
  assert.equal(ago('2026-09-28T12:00:00Z', now), '2 days ago');
  assert.equal(ago(null, now), null);
});

test('text: tag line, and a share of nothing is a dash', () => {
  assert.equal(tagLine(DATA.videos[0]), 'Holt · Result first · 30s');
  assert.equal(tagLine(DATA.videos[2]), 'Imported from TikTok · needs tags');
  assert.equal(tagLine({ ...DATA.videos[0], topic: null, hook: null, length_s: null }), 'No tags yet');
  assert.equal(share(7, 1000), '0.7%');
  assert.equal(share(230, 1000), '23%');
  assert.equal(share(1, 0), '—');
});
