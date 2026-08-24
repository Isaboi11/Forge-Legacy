-- What email do the Apple review demo accounts ACTUALLY sign in with?
--
-- Read-only. The reviewer notes claim review@forgelegacy.app and demo.sam@forgelegacy.app, but
-- site/README.md says only support@ and isaiah@ are configured in Cloudflare Email Routing.
-- Somebody wrote down the address they meant to create. The database holds the truth.

select
  p.handle,
  p.name,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  u.last_sign_in_at::date          as last_sign_in,
  u.created_at::date               as created
from public.profiles p
join auth.users u on u.id = p.id
where p.handle in ('alex.review','sam.torres')
order by p.created_at;
