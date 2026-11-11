-- Run with: supabase test db   (from the backend/ folder)
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Two users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com');

insert into public.items (id, user_id, type, title)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'event', 'A''s standup');

-- Act as user B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.items)::int, 0, 'B cannot see A''s item');

-- A shares the item with B as viewer (done as superuser to set it up).
reset role;
insert into public.shares (item_id, user_id, role, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'viewer', 'accepted');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.items)::int, 1, 'B sees the item once shared');

update public.items set title = 'hijacked' where id = '10000000-0000-0000-0000-000000000001';
reset role;
select is((select title from public.items where id = '10000000-0000-0000-0000-000000000001'),
          'A''s standup', 'Viewer B cannot edit');

-- Upgrade B to editor, then try to take ownership.
update public.shares set role = 'editor' where user_id = '00000000-0000-0000-0000-00000000000b';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select throws_ok(
  $$update public.items set user_id = '00000000-0000-0000-0000-00000000000b'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  'user_id cannot be changed',
  'Editor B cannot take ownership'
);

select is((select count(*) from public.backup_jobs)::int, 0, 'Clients cannot read backup_jobs');

select * from finish();
rollback;
