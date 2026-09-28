// Minimal typed schema mirror of the Supabase database.
// Kept hand-written (not generated) so the app has no build-time dependency
// on the Supabase CLI. Update this alongside supabase/schema.sql.

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'purchased'
  | 'ready_to_ship'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export type DeliveryMethod = 'kurir' | 'grab' | 'gojek' | 'shopee_instant'

export interface FeeTier {
  label: string
  maxIdr: number | null // null = no upper bound (last tier)
  fee?: number // flat fee in IDR
  percent?: number // percentage fee, used when fee is undefined
}

export interface FeeConfiguration {
  tiers: FeeTier[]
}

export interface CustomerRow {
  id: string
  name: string
  phone: string
  address: string
  city: string | null
  delivery_area: string | null
  postal_code: string | null
  notes: string | null
  created_at: string
}

export interface DeliveryZoneRow {
  id: string
  name: string
  fee: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface SettingsRow {
  id: string
  business_name: string
  logo: string | null
  whatsapp: string | null
  instagram: string | null
  address: string | null
  base_exchange_rate: number
  currency_margin: number
  rounding_rule: string
  fee_configuration: FeeConfiguration
  whatsapp_template: string
  customer_form_template: string | null
  updated_at: string
}

export interface OrderRow {
  id: string
  invoice_number: string
  customer_id: string
  status: OrderStatus
  order_date: string
  base_exchange_rate: number
  currency_margin: number
  applied_exchange_rate: number
  rounding_rule: string
  fee_configuration: FeeConfiguration
  subtotal: number
  total_fee: number
  delivery_method: DeliveryMethod
  delivery_area: string | null
  default_delivery_fee: number
  delivery_fee: number
  grand_total: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_name: string
  product_link: string | null
  quantity: number
  price_thb: number
  applied_exchange_rate: number
  price_idr: number
  fee_per_item: number
  total_fee: number
  total: number
  notes: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      customers: { Row: CustomerRow; Insert: Partial<CustomerRow>; Update: Partial<CustomerRow> }
      delivery_zones: { Row: DeliveryZoneRow; Insert: Partial<DeliveryZoneRow>; Update: Partial<DeliveryZoneRow> }
      settings: { Row: SettingsRow; Insert: Partial<SettingsRow>; Update: Partial<SettingsRow> }
      orders: { Row: OrderRow; Insert: Partial<OrderRow>; Update: Partial<OrderRow> }
      order_items: { Row: OrderItemRow; Insert: Partial<OrderItemRow>; Update: Partial<OrderItemRow> }
    }
  }
}
