import { supabase } from '../lib/supabaseClient'
import type { CustomerRow, FeeConfiguration, OrderItemRow, OrderRow, OrderStatus } from '../types/database'
import { generateUniqueInvoiceNumber } from '../utils/invoice'

export interface OrderListItem extends OrderRow {
  customer: Pick<CustomerRow, 'id' | 'name' | 'phone'> | null
}

export interface OrderFilters {
  search?: string
  status?: OrderStatus | 'all'
  deliveryArea?: string | 'all'
  dateFrom?: string
  dateTo?: string
}

export async function listOrders(filters: OrderFilters = {}): Promise<OrderListItem[]> {
  let query = supabase
    .from('orders')
    .select('*, customer:customers(id, name, phone)')
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.deliveryArea && filters.deliveryArea !== 'all') {
    query = query.eq('delivery_area', filters.deliveryArea)
  }
  if (filters.dateFrom) {
    query = query.gte('order_date', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('order_date', filters.dateTo)
  }

  const { data, error } = await query
  if (error) throw error
  let results = (data ?? []) as unknown as OrderListItem[]

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    results = results.filter(
      (o) =>
        o.invoice_number.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.customer?.name ?? '').toLowerCase().includes(q) ||
        (o.customer?.phone ?? '').toLowerCase().includes(q)
    )
  }

  return results
}

export interface OrderWithDetails {
  order: OrderRow
  customer: CustomerRow
  items: OrderItemRow[]
}

export async function getOrder(id: string): Promise<OrderWithDetails> {
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).single()
  if (error) throw error

  const { data: customer, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', order.customer_id)
    .single()
  if (custError) throw custError

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true })
  if (itemsError) throw itemsError

  return { order: order as OrderRow, customer: customer as CustomerRow, items: (items ?? []) as OrderItemRow[] }
}

export interface OrderItemInput {
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
}

export interface CreateOrderInput {
  customer_id: string
  status: OrderStatus
  order_date: string
  base_exchange_rate: number
  currency_margin: number
  applied_exchange_rate: number
  rounding_rule: string
  fee_configuration: FeeConfiguration
  delivery_area: string | null
  default_delivery_fee: number
  delivery_fee: number
  notes: string | null
  items: OrderItemInput[]
}

function sumOrderTotals(items: OrderItemInput[], deliveryFee: number) {
  const subtotal = items.reduce((s, i) => s + i.price_idr * i.quantity, 0)
  const total_fee = items.reduce((s, i) => s + i.total_fee, 0)
  const grand_total = subtotal + total_fee + (deliveryFee || 0)
  return { subtotal, total_fee, grand_total }
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRow> {
  const invoice_number = await generateUniqueInvoiceNumber()
  const { subtotal, total_fee, grand_total } = sumOrderTotals(input.items, input.delivery_fee)

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      invoice_number,
      customer_id: input.customer_id,
      status: input.status,
      order_date: input.order_date,
      base_exchange_rate: input.base_exchange_rate,
      currency_margin: input.currency_margin,
      applied_exchange_rate: input.applied_exchange_rate,
      rounding_rule: input.rounding_rule,
      fee_configuration: input.fee_configuration,
      subtotal,
      total_fee,
      delivery_area: input.delivery_area,
      default_delivery_fee: input.default_delivery_fee,
      delivery_fee: input.delivery_fee,
      grand_total,
      notes: input.notes,
    })
    .select('*')
    .single()

  if (error) throw error

  const itemsToInsert = input.items.map((i) => ({ ...i, order_id: order.id }))
  const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert)
  if (itemsError) {
    // Roll back the order if items fail to insert, to avoid an orphaned order.
    await supabase.from('orders').delete().eq('id', order.id)
    throw itemsError
  }

  return order as OrderRow
}

export interface UpdateOrderInput extends Omit<CreateOrderInput, 'items'> {
  items: (OrderItemInput & { id?: string })[]
}

/** Full edit: replaces order fields and diffs order_items (delete-all-then-insert for simplicity). */
export async function updateOrder(id: string, input: UpdateOrderInput): Promise<OrderRow> {
  const { subtotal, total_fee, grand_total } = sumOrderTotals(input.items, input.delivery_fee)

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      customer_id: input.customer_id,
      status: input.status,
      order_date: input.order_date,
      base_exchange_rate: input.base_exchange_rate,
      currency_margin: input.currency_margin,
      applied_exchange_rate: input.applied_exchange_rate,
      rounding_rule: input.rounding_rule,
      fee_configuration: input.fee_configuration,
      subtotal,
      total_fee,
      delivery_area: input.delivery_area,
      default_delivery_fee: input.default_delivery_fee,
      delivery_fee: input.delivery_fee,
      grand_total,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', id)
  if (deleteError) throw deleteError

  const itemsToInsert = input.items.map(({ id: _ignored, ...rest }) => ({ ...rest, order_id: id }))
  const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert)
  if (itemsError) throw itemsError

  return order as OrderRow
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as OrderRow
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

/**
 * Duplicate an order: copies customer + items + notes, but generates a new
 * order id / invoice number and MUST be re-priced by the caller using
 * current settings before calling createOrder (per spec: do not copy the
 * old pricing snapshot).
 */
export async function getOrderForDuplication(id: string): Promise<OrderWithDetails> {
  return getOrder(id)
}

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  completedOrders: number
  totalRevenue: number
  totalJastipFee: number
  totalDeliveryFee: number
  totalItems: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, grand_total, total_fee, delivery_fee')
    .neq('status', 'cancelled')
  if (error) throw error

  const rows = orders ?? []
  const totalOrders = rows.length
  const pendingOrders = rows.filter((o) => o.status === 'pending').length
  const paidOrders = rows.filter((o) => o.status === 'paid').length
  const completedOrders = rows.filter((o) => o.status === 'completed').length
  const totalRevenue = rows.reduce((s, o) => s + (o.grand_total ?? 0), 0)
  const totalJastipFee = rows.reduce((s, o) => s + (o.total_fee ?? 0), 0)
  const totalDeliveryFee = rows.reduce((s, o) => s + (o.delivery_fee ?? 0), 0)

  const { data: items, error: itemsError } = await supabase.from('order_items').select('quantity')
  if (itemsError) throw itemsError
  const totalItems = (items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0)

  return { totalOrders, pendingOrders, paidOrders, completedOrders, totalRevenue, totalJastipFee, totalDeliveryFee, totalItems }
}

export async function getRecentOrders(limit = 6): Promise<OrderListItem[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(id, name, phone)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as OrderListItem[]
}
