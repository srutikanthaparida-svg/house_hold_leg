create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    type text not null check (type in ('checking','savings','credit_card','cash','other')),
    balance numeric(12,2) not null default 0,
    currency text default 'USD',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.accounts enable row level security;

create policy "Users manage own accounts"
on public.accounts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create index for better query performance
create index if not exists idx_accounts_user_id on public.accounts(user_id);
