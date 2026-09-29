-- ============================================================
-- 003: Payment (DP/FP), purchase status, payment history, item category/variant
-- Run this ONCE in the Supabase SQL Editor on your existing database.
-- Existing orders are kept and backfilled from their current order status:
--   paid / purchased / ready_to_ship / shipped / completed -> payment "Lunas" (FP)
--   purchased / ready_to_ship / shipped / completed        -> also "Purchased"
--   everything else (pending, cancelled)                   -> "Belum Bayar"
-- Requires 002_delivery_method_and_customer_form.sql to have been run before.
-- ============================================================

-- Marker: the backfill below only runs the first time (payments table not there yet).
drop table if exists _first_run;
create temp table _first_run as select (to_regclass('public.payments') is null) as v;

-- 1) orders: payment + purchase fields
alter table orders add column if not exists payment_type text not null default 'fp'
  check (payment_type in ('dp','fp'));
alter table orders add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending','partial','paid','refunded'));
alter table orders add column if not exists paid_amount numeric not null default 0
  check (paid_amount >= 0);
alter table orders add column if not exists remaining_amount numeric not null default 0
  check (remaining_amount >= 0);
alter table orders add column if not exists purchase_status text not null default 'not_purchased'
  check (purchase_status in ('not_purchased','purchased'));
alter table orders add column if not exists purchased_at timestamptz;

-- 2) order_items: admin-only category + variant
alter table order_items add column if not exists category text not null default 'other'
  check (category in ('beauty_skincare','fashion','shoes','food_snack','souvenir','accessories','electronics','toys_collectibles','other'));
alter table order_items add column if not exists variant text;

-- 3) payments (history)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_type text not null check (payment_type in ('dp','fp','additional','refund')),
  payment_method text,
  notes text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_purchase_status on orders(purchase_status);

alter table payments enable row level security;
drop policy if exists "authenticated_all_payments" on payments;
create policy "authenticated_all_payments" on payments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4) Backfill existing orders (first run only)
update orders set remaining_amount = grand_total where (select v from _first_run);

update orders
  set payment_status = 'paid', payment_type = 'fp', paid_amount = grand_total, remaining_amount = 0
  where status in ('paid','purchased','ready_to_ship','shipped','completed') and (select v from _first_run);

update orders
  set purchase_status = 'purchased', purchased_at = coalesce(updated_at, created_at)
  where status in ('purchased','ready_to_ship','shipped','completed') and (select v from _first_run);

insert into payments (order_id, amount, payment_type, payment_method, notes, paid_at)
  select id, grand_total, 'fp', null, 'Migrasi otomatis dari status order lama', order_date
  from orders
  where payment_status = 'paid' and grand_total > 0 and (select v from _first_run);

-- 5) Paid amount can never exceed the grand total
alter table orders drop constraint if exists orders_paid_lte_total;
alter table orders add constraint orders_paid_lte_total check (paid_amount <= grand_total);

-- 6) New default WhatsApp template - only replaces the template if you never edited the old default.
update settings
  set whatsapp_template = $new$Halo Kak {{customer_name}} 👋

Berikut detail pesanan Jastip Thailand Kakak 🇹🇭

🧾 Invoice: {{invoice_number}}

📦 PESANAN
{{items}}

💵 RINCIAN PEMBAYARAN
Subtotal: {{subtotal}}
Jastip Fee: {{jastip_fee}}
Biaya Pengiriman: {{delivery_fee}}

🚚 PENGIRIMAN
Metode: {{delivery_method}}
Alamat: {{address}}

💰 TOTAL PEMBAYARAN
{{grand_total}}

💳 STATUS PEMBAYARAN
Metode: {{payment_type}}
Status: {{payment_status}}
Sudah Dibayar: {{paid_amount}}
Sisa Pembayaran: {{remaining_amount}}

Mohon dicek kembali detail pesanan dan alamat pengirimannya ya Kak 🙏

Terima kasih sudah menggunakan Jastip Thailand kami! 🇹🇭❤️$new$
  where whatsapp_template = $old$Halo Kak {{customer_name}} 👋

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

Terima kasih sudah menggunakan Jastip Thailand kami! 🇹🇭❤️$old$;

drop table if exists _first_run;
