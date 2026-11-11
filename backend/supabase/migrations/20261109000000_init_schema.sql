-- Kairo initial schema (spec section 6).
--
-- Only tables that sync or live on the server are here. Device-only tables
-- (occurrences, scheduled_alarms, outbox, routine_runs, calendar_links) stay in
-- the app's SQLite database.
--
-- Times: start_local/end_local are the user's intended wall-clock time, stored
-- without a zone, plus an IANA zone in `tz`. A null `tz` means a "floating"
-- item that follows the device's zone.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Synced tables
-- Ids are generated on the device so items can be created offline.
-- ---------------------------------------------------------------------------

create table public.routines (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 120),
  trigger          jsonb not null,
  conditions       jsonb not null default '[]'::jsonb,
  actions          jsonb not null default '[]'::jsonb,
  enabled          boolean not null default true,
  cooldown_minutes integer not null default 1 check (cooldown_minutes >= 1),
  version          integer not null default 1,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type             text not null check (type in ('event', 'task', 'reminder')),
  title            text not null check (char_length(title) between 1 and 500),
  notes            text,
  start_local      timestamp,
  end_local        timestamp,
  tz               text,
  all_day          boolean not null default false,
  rrule            text,
  location         text,
  meeting_url      text,
  meeting_provider text,
  -- Encrypted on the device. Open question: a device-keystore key cannot be
  -- read by the user's other devices, so cross-device passcodes need a
  -- per-account key before this column is useful.
  passcode_enc     text,
  dial_in          text,
  color            text,
  list_id          uuid,
  routine_id       uuid references public.routines (id) on delete set null,
  source           text not null default 'manual' check (source in ('manual', 'calendar', 'ai', 'share')),
  external_id      text,
  version          integer not null default 1,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint items_end_after_start check (end_local is null or start_local is null or end_local >= start_local),
  constraint items_meeting_url_scheme check (meeting_url is null or meeting_url ~* '^https?://')
);

create index items_user_updated_idx on public.items (user_id, updated_at);

create table public.item_exceptions (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.items (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  original_start timestamp not null,
  new_start      timestamp,
  cancelled      boolean not null default false,
  deleted_at     timestamptz,
  updated_at     timestamptz not null default now(),
  unique (item_id, original_start)
);

create table public.alerts (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.items (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  offset_minutes integer not null check (offset_minutes between 0 and 40320),
  kind           text not null default 'notification' check (kind in ('notification', 'alarm')),
  enabled        boolean not null default true,
  deleted_at     timestamptz,
  updated_at     timestamptz not null default now()
);

create index alerts_item_idx on public.alerts (item_id);

create table public.nfc_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code       text not null unique,
  routine_id uuid references public.routines (id) on delete set null,
  label      text,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sharing
-- ---------------------------------------------------------------------------

create table public.shares (
  item_id    uuid not null references public.items (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  status     text not null default 'invited' check (status in ('invited', 'accepted')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

-- True when the current user owns the item or has an accepted share with at
-- least `min_role`. SECURITY DEFINER avoids RLS recursion between items and
-- shares.
create or replace function public.has_item_access(p_item_id uuid, min_role text default 'viewer')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id and i.user_id = auth.uid()
  ) or exists (
    select 1 from public.shares s
    where s.item_id = p_item_id
      and s.user_id = auth.uid()
      and s.status = 'accepted'
      and case min_role
            when 'viewer' then s.role in ('viewer', 'editor', 'owner')
            when 'editor' then s.role in ('editor', 'owner')
            else s.role = 'owner'
          end
  );
$$;

-- ---------------------------------------------------------------------------
-- Devices, delivery and backup pushes (server side)
-- ---------------------------------------------------------------------------

create table public.devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform     text not null check (platform in ('ios', 'android', 'web')),
  push_token   text,
  tz           text,
  app_version  text,
  last_seen_at timestamptz not null default now()
);

create index devices_user_idx on public.devices (user_id);

-- alert_key = item + occurrence + alert; the same key the device uses for
-- de-duplication.
create table public.delivery_acks (
  alert_key    text not null,
  device_id    uuid not null references public.devices (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (alert_key, device_id)
);

create index delivery_acks_user_key_idx on public.delivery_acks (user_id, alert_key);

-- Work queue for the Go scheduler. Written by the sync-push function, never
-- directly by clients.
create table public.backup_jobs (
  id         bigint generated always as identity primary key,
  alert_key  text not null unique,
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_id    uuid references public.items (id) on delete cascade,
  fire_at    timestamptz not null,
  payload    jsonb not null default '{}'::jsonb,
  status     text not null default 'pending'
             check (status in ('pending', 'sent', 'acked', 'cancelled', 'expired', 'failed')),
  attempts   integer not null default 0,
  locked_at  timestamptz,
  sent_at    timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index backup_jobs_due_idx on public.backup_jobs (fire_at) where status = 'pending';



-- ---------------------------------------------------------------------------
-- Sync change log
-- `id` is the sync token: clients pull changes with id > last token.
-- `change_id` makes uploads idempotent (spec 7.9).
-- ---------------------------------------------------------------------------

create table public.change_log (
  id             bigint generated always as identity primary key,
  change_id      uuid not null unique,
  user_id        uuid not null references auth.users (id) on delete cascade,
  device_id      uuid references public.devices (id) on delete set null,
  device_counter bigint not null,
  table_name     text not null,
  row_id         uuid not null,
  op             text not null check (op in ('upsert', 'delete')),
  received_at    timestamptz not null default now()
);

create index change_log_user_id_idx on public.change_log (user_id, id);

-- ---------------------------------------------------------------------------
-- AI usage (raw prompt text is not stored)
-- ---------------------------------------------------------------------------

create table public.ai_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  input_hash text not null,
  model      text not null,
  tokens     integer,
  status     text not null check (status in ('ok', 'invalid_output', 'error', 'quota')),
  created_at timestamptz not null default now()
);

create index ai_requests_user_created_idx on public.ai_requests (user_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger routines_touch        before update on public.routines        for each row execute function public.touch_updated_at();
create trigger items_touch           before update on public.items           for each row execute function public.touch_updated_at();
create trigger item_exceptions_touch before update on public.item_exceptions for each row execute function public.touch_updated_at();
create trigger alerts_touch          before update on public.alerts          for each row execute function public.touch_updated_at();
create trigger nfc_tags_touch        before update on public.nfc_tags        for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (spec 8.1)
-- Tables with RLS on and no policy (backup_jobs, change_log, ai_requests) are
-- reachable only with the service role, i.e. from Edge Functions and the Go
-- scheduler.
-- ---------------------------------------------------------------------------

alter table public.routines        enable row level security;
alter table public.items           enable row level security;
alter table public.item_exceptions enable row level security;
alter table public.alerts          enable row level security;
alter table public.nfc_tags        enable row level security;
alter table public.shares          enable row level security;
alter table public.devices         enable row level security;
alter table public.delivery_acks   enable row level security;
alter table public.backup_jobs     enable row level security;
alter table public.change_log      enable row level security;
alter table public.ai_requests     enable row level security;

-- Own-rows-only tables.
create policy routines_own on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy nfc_tags_own on public.nfc_tags
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy devices_own on public.devices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy delivery_acks_own on public.delivery_acks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.devices d where d.id = device_id and d.user_id = (select auth.uid()))
  );

-- Items: owner has full access; shared users per role. Viewers cannot edit
-- (spec 7.9).
create policy items_select on public.items
  for select to authenticated
  using (public.has_item_access(id, 'viewer'));

create policy items_insert on public.items
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy items_update on public.items
  for update to authenticated
  using (public.has_item_access(id, 'editor'))
  with check (public.has_item_access(id, 'editor'));

create policy items_delete on public.items
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Exceptions and alerts follow their item.
create policy item_exceptions_select on public.item_exceptions
  for select to authenticated
  using (public.has_item_access(item_id, 'viewer'));

create policy item_exceptions_write on public.item_exceptions
  for all to authenticated
  using (public.has_item_access(item_id, 'editor'))
  with check (public.has_item_access(item_id, 'editor'));

-- Alerts are personal: each person gets their own reminders on a shared item.
create policy alerts_own on public.alerts
  for all to authenticated
  using (user_id = (select auth.uid()) and public.has_item_access(item_id, 'viewer'))
  with check (user_id = (select auth.uid()) and public.has_item_access(item_id, 'viewer'));

-- Shares: the invitee and the item owner can see them; only the owner writes,
-- except the invitee accepting their own invite.
create policy shares_select on public.shares
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid()))
  );

create policy shares_owner_write on public.shares
  for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid())));

create policy shares_accept on public.shares
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'accepted');

-- Invitees may only flip `status`; role changes go through the shares function
-- (service role).
revoke update on public.shares from authenticated;
grant update (status) on public.shares to authenticated;

-- Ownership never changes through the API (stops an editor taking over an item).
create or replace function public.prevent_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger items_owner_fixed           before update on public.items           for each row execute function public.prevent_owner_change();
create trigger routines_owner_fixed        before update on public.routines        for each row execute function public.prevent_owner_change();
create trigger item_exceptions_owner_fixed before update on public.item_exceptions for each row execute function public.prevent_owner_change();
create trigger alerts_owner_fixed          before update on public.alerts          for each row execute function public.prevent_owner_change();
create trigger nfc_tags_owner_fixed        before update on public.nfc_tags        for each row execute function public.prevent_owner_change();
