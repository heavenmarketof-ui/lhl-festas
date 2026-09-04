
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Admins view roles" on public.user_roles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Order status enum
create type public.order_status as enum ('pendente', 'em_andamento', 'concluido', 'cancelado');

-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null,
  rg text not null,
  telefone text not null,
  email text not null,
  endereco text not null,
  cidade_uf text not null,
  tema text not null,
  modalidade text not null,
  plano text not null,
  status public.order_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;

alter table public.orders enable row level security;

-- Anyone can submit a new order (public form)
create policy "Public can insert orders" on public.orders
  for insert to anon, authenticated
  with check (true);

-- Only admins can read / update / delete
create policy "Admins view orders" on public.orders
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update orders" on public.orders
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete orders" on public.orders
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Auto-promote the first user that signs up to admin
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_bootstrap_admin
  after insert on auth.users
  for each row execute function public.bootstrap_first_admin();

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_nome_idx on public.orders (lower(nome));
create index orders_cpf_idx on public.orders (cpf);
