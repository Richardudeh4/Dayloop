create table public.lists (
    id   uuid primary key default gen_random_uuid(),
    user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name    text not null check (char_length(name) between 1 and 60),
    color   text,
     position    integer not null default 0,
     deleted_at  timestamptz,
     created_at  timestamptz not null default now(),
     updated_at  timestamptz not null default now(),
    unique ( user_id, name)
);

alter table public.items
  add constraint items_list_id_fkey
  foreign key (list_id) references public.routines (id) on delete set null;


alter table public.nfc_tags  enable row level security;

