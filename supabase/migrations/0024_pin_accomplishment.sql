-- Forge Legacy — 0024: accomplishments become pinnable into Pinned Legacy
--
-- The "My Museum · Pinned Legacy" strip is a cross-type curation (pins table, 0005) whose `pin_kind`
-- covered record / chapter / honor / photo / memory. Accomplishments (0023) were the obvious missing
-- kind — the athlete's own proudest, freeform milestones are exactly what a museum is for.
--
-- Adds the enum value only; the pin row still carries its own denormalized title/subtitle + a soft
-- `ref_id` back to the accomplishment (kept fresh, and removed, by the accomplishments data layer).

alter type pin_kind add value if not exists 'accomplishment';
