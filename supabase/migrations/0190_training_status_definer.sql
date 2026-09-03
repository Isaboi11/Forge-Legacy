-- Forge Legacy — 0190: the app has not been able to say anybody is training since 0187
--
-- PO: *"Rachelle Altamirano is currently working out but she's not showing up in the your circle card
-- as active."* — and `verify-0185-0189.sql` gave the thread to pull: her `training_since` was **322
-- hours old**. Not a settings problem; 0189 had already opened every gate.
--
-- ⚠ BUT 322 HOURS IS NOT "TIME SINCE SHE LAST ANNOUNCED", AND I READ IT THAT WAY AT FIRST.
-- `training_since` is set to NULL when a workout ENDS, so a finished session leaves no trace at all and
-- `max(training_since)` surfaces only the oldest session that was never ended. The 2026-08-21 stamp is
-- one of those ghosts, already invisible to the app because every reader ignores anything past four
-- hours. 0187 was authored 2026-09-01 — ELEVEN DAYS LATER — so it cannot have caused that date.
--
-- What 0187 DOES account for is the report itself: a workout on 2026-09-02 that wrote NOTHING, which
-- is why an eleven-day-old ghost was still the newest value in the table.
--
-- ══ ⛔ THIS IS 0161'S BUG, ON A SECOND FUNCTION ══
--
-- `set_training_status` is SECURITY INVOKER, so it runs with the CALLER's privileges — `authenticated`.
--
--   · `0086` wrote the column and never read it:
--         set training_since = case when p_active then now() else null end
--     An UPDATE that only assigns needs no SELECT on what it assigns to. Fine as invoker for 100
--     migrations.
--
--   · `0149` then revoked `authenticated`'s SELECT on `profiles.training_since` / `training_label`,
--     deliberately, and asserts it: `authed_sees_presence_expect_false`.
--
--   · `0187` made the function READ the column, to keep one stamp per session:
--         when profiles.training_since is not null
--          and profiles.training_since > now() - interval '4 hours'
--           then profiles.training_since
--
-- Reading a column inside an expression requires SELECT on it. The caller does not have it. So every
-- call has raised **42501** since 0187 was APPLIED — and `presence-live.ts` catches and discards it
-- ON PURPOSE, because presence must never block starting a workout:
--
--     try { await supabase.rpc('set_training_status', …) } catch { /* … */ }
--
-- The athlete starts a workout, everything looks normal, and the server is never told. **The silence
-- was designed; the failure it was hiding was not.**
--
-- ⚠ THE LEDGER PREDICTED THIS IN WRITING. `0161` fixed the identical shape — `squads_set_invite_code()`,
-- an invoker trigger that READ the `invite_code` column 0149 had just hidden, so the generator could not
-- read the column it exists to fill. The note left behind says it exactly: *"'Internal' describes where a
-- function is CALLED FROM. It says nothing about what it may READ."* 0187 reintroduced it on a different
-- function five migrations later.
--
-- ══ THE FIX, AND WHY DEFINER IS SAFE HERE ══
--
-- SECURITY DEFINER, the same remedy 0161 used. It does not widen anything an athlete can reach:
--
--   · The function takes NO athlete argument. It writes `where id = auth.uid()` and nothing else, so a
--     caller can only ever change their OWN row — the property `claim_founder_seat` famously lacked.
--   · It returns void. Nothing hidden can be read back out of it.
--   · `auth.uid()` still resolves to the CALLER inside a definer function, so scoping is unchanged.
--   · It early-returns on a null uid, so the SQL editor (role `postgres`, no JWT) cannot write through it.
--
-- ⚠ `create or replace` PRESERVES GRANTS ONLY ON A FUNCTION THAT ALREADY EXISTS — this one does, so the
-- existing grants carry. The revokes below are re-issued anyway, and BOTH `public` and `anon`, because
-- the ACL entry with an empty grantee is the PUBLIC one and revoking `anon` alone reports success and
-- changes nothing. Cheap insurance against the 0153 hole.
--
-- ⛔ IT SENDS NOTHING RETROACTIVELY. Every session missed while this was broken stays unannounced. The next
-- workout started after this lands is the first one anybody hears about.
--
-- Idempotent. Depends on 0086 (the column), 0149 (the revoke), 0187 (the body this restores verbatim).

begin;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1 · THE FUNCTION — 0187's BODY, UNCHANGED, AS DEFINER
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ THE BODY IS COPIED FROM 0187 RATHER THAN REWRITTEN. Rebuilding a function from memory is how
-- `notification_events_for` silently lost a shipped feature four times. The only edit is the security
-- clause on line 2.

create or replace function public.set_training_status(p_active boolean, p_label text default null)
returns void
language plpgsql
security definer                      -- ← 0187 had `security invoker`. That is the whole fix.
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
     set training_since = case
           when not p_active then null
           -- Already training, inside the four-hour ceiling every reader of this column applies: the same
           -- session saying so again. Keep the original stamp, so the outbox key does not change and the
           -- squad is not told twice.
           when profiles.training_since is not null
            and profiles.training_since > now() - interval '4 hours'
             then profiles.training_since
           else now()
         end,
         -- The label always follows the current call: the stamp says when, the label says what.
         training_label = case when p_active then nullif(btrim(coalesce(p_label, '')), '') else null end
   where id = auth.uid();
end;
$$;

revoke all on function public.set_training_status(boolean, text) from public;
revoke all on function public.set_training_status(boolean, text) from anon;
grant execute on function public.set_training_status(boolean, text) to authenticated;

comment on function public.set_training_status(boolean, text) is
  'Announce that the caller started or ended a workout. Writes profiles.training_since/training_label for auth.uid() only. ⚠ SECURITY DEFINER SINCE 0190 AND IT MUST STAY THAT WAY: 0187 made the body READ training_since (to keep one stamp per session) and 0149 revoked authenticated''s SELECT on that column, so as an invoker every call raised 42501 and the client swallowed it — nobody could announce once it was applied. Same shape as the 0161 fix. Definer is safe because the function takes no athlete argument, writes only where id = auth.uid(), and returns void.';

commit;
