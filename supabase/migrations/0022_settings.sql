-- Forge Legacy — 0022: the settings ecosystem (P-6 Visibility · P-5 Notifications · P-4b Preferences)
--
-- Three preference blobs on the profile. All nullable with NO default: null means "never touched,
-- use the code defaults" — the same null-vs-empty discipline as the home-gym column (0021). Defaulting
-- would make every existing athlete look like they'd set preferences they never opened.
--
--   visibility  — {sectionKey: audienceId}     per-section audience (src/domain/settings/visibility.ts)
--   notif_prefs — {toggleKey: boolean}         push preferences     (src/domain/settings/notifications.ts)
--   app_prefs   — {units, haptics, sound, reduceMotion}  experience  (src/domain/settings/preferences.ts)
--
-- WHY visibility is server-side, not local: it governs what OTHER athletes see on your profile, so it
-- has to live where their requests can read it. Notifications and app-prefs live here too for durability
-- (they survive a reinstall), read back through the same owner-scoped RLS `profiles` already has.
--
-- Everything read from these is sanitized against the current code shape, so a key retired from a
-- domain module simply stops applying instead of lingering as an unreadable ghost.
--
-- Additive and idempotent; profiles' existing owner-scoped policies cover reads and updates.

alter table profiles add column if not exists visibility  jsonb;
alter table profiles add column if not exists notif_prefs jsonb;
alter table profiles add column if not exists app_prefs   jsonb;

comment on column profiles.visibility  is 'Per-section profile audience (see src/domain/settings/visibility.ts). null = code defaults.';
comment on column profiles.notif_prefs is 'Push notification toggles (see src/domain/settings/notifications.ts). null = code defaults.';
comment on column profiles.app_prefs   is 'Units + experience prefs (see src/domain/settings/preferences.ts). null = code defaults.';
