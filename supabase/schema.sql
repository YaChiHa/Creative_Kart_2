-- Creative Kart shared cloud database
-- Run this in Supabase SQL Editor after creating a project.
-- Create an Auth user for the owner, then insert that user's UUID into admin_users.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  sku text not null unique,
  description text not null default '',
  image_url text not null default '',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id text primary key default 'main' check (id = 'main'),
  whatsapp_number text not null default '',
  instagram_url text not null default '',
  store_name text not null default 'Creative Kart',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values ('main') on conflict (id) do nothing;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  phone text not null,
  items jsonb not null,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'Enquiry received',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.enquiries enable row level security;

create or replace function public.is_ck_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
for select using (active = true or public.is_ck_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
for all using (public.is_ck_admin()) with check (public.is_ck_admin());

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings" on public.store_settings
for select using (true);

drop policy if exists "Admins manage store settings" on public.store_settings;
create policy "Admins manage store settings" on public.store_settings
for all using (public.is_ck_admin()) with check (public.is_ck_admin());

drop policy if exists "Public can create enquiries" on public.enquiries;
create policy "Public can create enquiries" on public.enquiries
for insert with check (
  length(trim(customer_name)) between 1 and 120
  and length(trim(phone)) between 5 and 40
  and jsonb_typeof(items) = 'array'
);

drop policy if exists "Admins view and manage enquiries" on public.enquiries;
create policy "Admins view and manage enquiries" on public.enquiries
for all using (public.is_ck_admin()) with check (public.is_ck_admin());

drop policy if exists "Users cannot read admin roster" on public.admin_users;
create policy "Admins can read own admin roster row" on public.admin_users
for select using (user_id = auth.uid());

-- Enable realtime so every open storefront receives product/contact updates.
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.store_settings;
alter publication supabase_realtime add table public.enquiries;
