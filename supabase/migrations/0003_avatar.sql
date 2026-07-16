-- Forge Legacy — 0003: profile avatar (Phase 3 follow-up, media)
-- Adds the avatar image URL to profiles. The image itself lives in the PUBLIC `avatars` storage bucket
-- created in Phase 1 (public-read, owner-write); this column holds its public URL. Nulls render initials.
-- RLS unchanged — `profiles_self` already owner-scopes the write; the URL is public identity (read-all).

alter table profiles add column if not exists avatar_url text;
