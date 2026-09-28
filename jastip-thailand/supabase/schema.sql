-- ============================================================
-- Thailand Jastip Management System — Supabase schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  address text not null,
  city text,
  delivery_area text,
  postal_code text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- delivery_zones
-- ---------------------------------------------------------------
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- settings (singleton table — one row)
-- ---------------------------------------------------------------
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Thailand Jastip by Charles',
  logo text,
  whatsapp text,
  instagram text,
  address text,
  base_exchange_rate numeric not null default 480,
  currency_margin numeric not null default 4,
  rounding_rule text not null default 'nearest_10',
  fee_configuration jsonb not null default '{
    "tiers": [
      { "label": "< Rp50.000", "maxIdr": 50000, "fee": 10000 },
      { "label": "Rp50.000 – < Rp100.000", "maxIdr": 100000, "fee": 15000 },
      { "label": "Rp100.000 – < Rp300.000", "maxIdr": 300000, "fee": 25000 },
      { "label": "Rp300.000 – < Rp500.000", "maxIdr": 500000, "fee": 35000 },
      { "label": ">= Rp500.000", "maxIdr": null, "percent": 8 }
    ]
  }'::jsonb,
  whatsapp_template text not null default 'Halo Kak {{customer_name}} 👋

Berikut detail pesanan Jastip Thailand Kakak:

🧾 Invoice: {{invoice_number}}

📦 Pesanan:
{{items}}

Subtotal: {{subtotal}}
Jastip Fee: {{jastip_fee}}
Delivery: {{delivery_fee}}

💰 Total: {{grand_total}}

📍 Alamat:
{{address}}

Terima kasih sudah menggunakan Jastip Thailand kami! 🇹🇭❤️',
  customer_form_template text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','paid','purchased','ready_to_ship','shipped','completed','cancelled')),
  order_date timestamptz not null default now(),

  -- pricing snapshot: values used to price this order, frozen at creation time
  base_exchange_rate numeric not null,
  currency_margin numeric not null,
  applied_exchange_rate numeric not null,
  rounding_rule text not null,
  fee_configuration jsonb not null,

  -- financials
  subtotal numeric not null default 0,
  total_fee numeric not null default 0,
  delivery_method text not null default 'kurir'
    check (delivery_method in ('kurir','grab','gojek','shopee_instant')),
  delivery_area text,
  default_delivery_fee numeric not null default 0,
  delivery_fee numeric not null default 0,
  grand_total numeric not null default 0,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_name text not null,
  product_link text,
  quantity integer not null default 1 check (quantity > 0),
  price_thb numeric not null,
  applied_exchange_rate numeric not null,
  price_idr numeric not null,
  fee_per_item numeric not null,
  total_fee numeric not null,
  total numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------
create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_invoice_number on orders(invoice_number);
create index if not exists idx_orders_order_date on orders(order_date);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_customers_name on customers(name);
create index if not exists idx_customers_phone on customers(phone);

-- ---------------------------------------------------------------
-- Row Level Security
-- Only authenticated (admin) users may read/write. There is no public
-- customer-facing access, so "authenticated" is equivalent to "admin"
-- for this single-tenant tool.
-- ---------------------------------------------------------------
alter table customers enable row level security;
alter table delivery_zones enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "authenticated_all_customers" on customers;
create policy "authenticated_all_customers" on customers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_delivery_zones" on delivery_zones;
create policy "authenticated_all_delivery_zones" on delivery_zones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_settings" on settings;
create policy "authenticated_all_settings" on settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_orders" on orders;
create policy "authenticated_all_orders" on orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_order_items" on order_items;
create policy "authenticated_all_order_items" on order_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Seed default delivery zones (safe to run once; skipped if any exist)
-- ---------------------------------------------------------------
insert into delivery_zones (name, fee, active)
select * from (values
  ('Surabaya Barat', 10000, true),
  ('Surabaya area lainnya', 15000, true),
  ('Outside Surabaya', 20000, true)
) as seed(name, fee, active)
where not exists (select 1 from delivery_zones);

-- ---------------------------------------------------------------
-- Create your admin login (recommended: do this via Supabase Dashboard
-- -> Authentication -> Users -> Add User, using email + password, since
-- that also sets up auth metadata correctly). Alternatively, sign up
-- once from the app's Login page after temporarily allowing sign-ups.
-- ---------------------------------------------------------------
