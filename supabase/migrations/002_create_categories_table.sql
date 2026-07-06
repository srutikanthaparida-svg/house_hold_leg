create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    type text not null check (type in ('income','expense')),
    created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "Users manage own categories"
on public.categories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create index for better query performance
create index if not exists idx_categories_user_id on public.categories(user_id);
