-- Run this ONCE in the Supabase SQL Editor if your database was already set up
-- with the original schema.sql. Safe to re-run.

-- 1) Delivery method per order. Existing orders become 'kurir' (they used zone rates).
alter table orders
  add column if not exists delivery_method text not null default 'kurir'
  check (delivery_method in ('kurir', 'grab', 'gojek', 'shopee_instant'));

-- 2) Editable customer order-form template (app falls back to a built-in default when null).
alter table settings
  add column if not exists customer_form_template text;
