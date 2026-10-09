create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'EXPIRED',
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  payment_id text,
  created_at timestamptz not null default now(),
  constraint subscriptions_status_check check (status in ('ACTIVE', 'EXPIRED', 'CANCELLED'))
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_user_id_fkey'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_user_id_fkey
      foreign key (user_id) references public.users (id) on delete cascade;
  end if;
end $$;

create unique index if not exists subscriptions_user_id_key
  on public.subscriptions (user_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create index if not exists subscriptions_end_date_idx
  on public.subscriptions (end_date);

alter table public.subscriptions disable row level security;
