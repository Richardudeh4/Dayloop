alter table public.items drop constraint items_list_id_fkey;

alter table public.items
  add constraint items_list_id_fkey
  foreign key (list_id) references public.lists (id) on delete set null;

alter table public.lists enable row level security;

