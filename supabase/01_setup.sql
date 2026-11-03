-- R&A Media Productions: database setup (applied as migration ra_hub_records_accounts).
-- Project: fbskjgluladhqocklyre (formerly "Off the Map Production Bible"), R&A Media Productions LLC org.
--
-- public.records   every app's data: (app, col, id) -> data jsonb. app is 'otm' or 'sbm' (more later).
-- public.accounts  who can sign in: email, name, role (admin | client | guest), apps text[].
--   admin   every app, read and write, manages accounts
--   client  only the apps listed, read and write
--   guest   only the apps listed, read only
-- Functions: ra_me(), ra_is_admin(), ra_can_read(app), ra_can_write(app), ra_merge(app,col,id,patch), ra_jsonb_merge(a,b).
-- RLS: records readable where ra_can_read(app), writable where ra_can_write(app).
--      accounts: everyone reads their own row; admins read and change all. A trigger keeps at least one admin.
-- Realtime: public.records is in the supabase_realtime publication (each app subscribes with filter app=eq.<id>).
-- push_subs has an app column (default 'otm'); its policies use ra_can_read(app) and the signed-in email.

create table if not exists public.accounts (
  email    text primary key check (email = lower(email)),
  name     text,
  role     text not null default 'guest' check (role in ('admin','client','guest')),
  apps     text[] not null default '{}',
  added_at timestamptz not null default now(),
  added_by text
);

create table if not exists public.records (
  app        text        not null,
  col        text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid                 default auth.uid(),
  primary key (app, col, id)
);
