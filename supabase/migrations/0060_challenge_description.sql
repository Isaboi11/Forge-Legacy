-- Forge Legacy — 0060: the challenge message (C-2)
--
-- `Forge Create Challenge.dc.html` has a Challenge Message field — the creator's note to the roster,
-- shown on the invitation and the standings screen. 0059 had nowhere to put it: the design writes it
-- into a localStorage invite payload that nothing ever reads back, so the message was being collected
-- and dropped.
--
-- One column. RUN AFTER 0059.

alter table public.challenges add column if not exists description text;

alter table public.challenges drop constraint if exists challenge_description_len;
alter table public.challenges add constraint challenge_description_len
  check (description is null or char_length(description) <= 160);

comment on column public.challenges.description is
  'The creator''s message to the roster (C-2). Shown on the invitation and standings. Max 160.';
