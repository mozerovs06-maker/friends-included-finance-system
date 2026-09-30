create extension if not exists pgcrypto;

create table if not exists public.employees (
  id text primary key,
  name text not null,
  role text not null check (role in ('manager','salesperson','expense_reporter')),
  active boolean not null default true
);

create table if not exists public.telegram_links (
  telegram_user_id text primary key,
  employee_id text not null references public.employees(id),
  current_chat_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_telegram_links (
  telegram_user_id text primary key,
  test_role text not null check (test_role in ('salesperson','expense_reporter')),
  current_chat_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^[A-Za-z0-9-]+$'),
  type text not null check (type in ('sale','expense')),
  source text not null check (source in ('website','telegram')),
  submitted_by_employee_id text not null references public.employees(id),
  original_telegram_chat_id text,
  submitted_at timestamptz not null default now(),
  description text not null check (length(trim(description)) > 0),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null check (status in ('pending_approval','awaiting_allocation','approved','allocated_automatically')),
  test_record boolean not null default false,
  customer text,
  project text check (project in ('A','B')),
  category text check (category in ('Materials','Travel','Other')),
  proposed_allocation text check (proposed_allocation in ('A','B','OVERHEAD')),
  final_allocation text check (final_allocation in ('A','B','OVERHEAD')),
  allocation_changed boolean,
  proposed_split jsonb,
  approved_split jsonb,
  commission_pool_cents bigint not null default 0,
  commission_richard_cents bigint not null default 0,
  commission_anastasia_cents bigint not null default 0,
  commission_jean_claude_cents bigint not null default 0,
  split_changed boolean,
  approved_by text references public.employees(id),
  approved_at timestamptz,
  sheet_status text not null default 'pending' check (sheet_status in ('pending','sent','failed','not_linked')),
  sheet_row_id text,
  telegram_submission_status text not null default 'pending' check (telegram_submission_status in ('pending','sent','failed','not_linked')),
  telegram_decision_status text not null default 'pending' check (telegram_decision_status in ('pending','sent','failed','not_linked')),
  delivery_error text,
  delivery_attempts integer not null default 0,
  last_delivery_attempt_at timestamptz,
  check ((type='sale' and customer is not null and project is not null and proposed_split is not null and category is null) or (type='expense' and category is not null and proposed_allocation is not null and customer is null))
);

create index if not exists transactions_actor_idx on public.transactions(submitted_by_employee_id, submitted_at desc);
create index if not exists transactions_pending_idx on public.transactions(status) where status in ('pending_approval','awaiting_allocation');

alter table public.employees enable row level security;
alter table public.telegram_links enable row level security;
alter table public.test_telegram_links enable row level security;
alter table public.transactions enable row level security;
-- No anon policies: all access goes through validated server routes using the service-role key.

create or replace function public.decide_transaction(p_reference text, p_actor_id text, p_split jsonb default null, p_allocation text default null)
returns public.transactions language plpgsql security definer set search_path=public as $$
declare t public.transactions; pool bigint; r bigint; a bigint; j bigint; delta bigint; winner text;
begin
  if p_actor_id <> 'svetlana' then raise exception 'Manager access required'; end if;
  select * into t from transactions where reference=p_reference for update;
  if not found then raise exception 'Transaction not found'; end if;
  if t.type='sale' then
    if t.status='approved' then return t; end if;
    if p_split is null or ((p_split->>'richard')::numeric + (p_split->>'anastasia')::numeric + (p_split->>'jeanClaude')::numeric) <> 100 then raise exception 'Commission shares must total exactly 100%%'; end if;
    pool := round(t.amount_cents * 0.10); r := round(pool * (p_split->>'richard')::numeric / 100); a := round(pool * (p_split->>'anastasia')::numeric / 100); j := round(pool * (p_split->>'jeanClaude')::numeric / 100); delta := pool-r-a-j;
    winner := case when (p_split->>'richard')::numeric >= (p_split->>'anastasia')::numeric and (p_split->>'richard')::numeric >= (p_split->>'jeanClaude')::numeric then 'r' when (p_split->>'anastasia')::numeric >= (p_split->>'jeanClaude')::numeric then 'a' else 'j' end;
    if winner='r' then r:=r+delta; elsif winner='a' then a:=a+delta; else j:=j+delta; end if;
    update transactions set status='approved', approved_split=p_split, commission_pool_cents=pool, commission_richard_cents=r, commission_anastasia_cents=a, commission_jean_claude_cents=j, split_changed=(p_split<>proposed_split), approved_by=p_actor_id, approved_at=now(), sheet_status='pending' where id=t.id returning * into t;
  else
    if t.status<>'awaiting_allocation' then return t; end if;
    if p_allocation not in ('A','B','OVERHEAD') then raise exception 'Invalid allocation'; end if;
    update transactions set status='approved', final_allocation=p_allocation, allocation_changed=(p_allocation<>proposed_allocation), approved_by=p_actor_id, approved_at=now(), sheet_status='pending' where id=t.id returning * into t;
  end if;
  return t;
end $$;

revoke all on function public.decide_transaction(text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.decide_transaction(text,text,jsonb,text) to service_role;
