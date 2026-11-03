-- Accounts. Admins can also manage these in the app: Settings → Accounts & access.
insert into public.accounts (email, name, role, apps, added_by) values
  ('contact@ramediapro.co', 'Rian', 'admin', '{otm,sbm}', 'setup'),
  ('anna.pongratz55@gmail.com', 'Anna', 'admin', '{otm,sbm}', 'setup')
on conflict (email) do nothing;
-- Example client with access to one app:
-- insert into public.accounts (email, name, role, apps) values ('client@example.com', 'Client name', 'client', '{otm}');
