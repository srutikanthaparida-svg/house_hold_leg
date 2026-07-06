create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,

    type text not null check (type in ('income','expense')),

    category text not null,

    account text not null,

    amount numeric(12,2) not null,

    description text,

    transaction_date date not null default current_date,

    created_at timestamptz default now()
);

-- Add indexes for better query performance
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_date on public.transactions(transaction_date);

-- Enable RLS (Row Level Security)
alter table public.transactions enable row level security;

-- Create policy so users can only see their own transactions
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);
