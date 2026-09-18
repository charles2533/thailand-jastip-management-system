import { supabase } from '../lib/supabaseClient'
import type { CustomerRow } from '../types/database'

export interface CustomerWithStats extends CustomerRow {
  order_count: number
  total_spending: number
  last_order_date: string | null
}

export async function listCustomers(): Promise<CustomerWithStats[]> {
  const { data: customers, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
  if (error) throw error

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('customer_id, grand_total, order_date, status')
    .neq('status', 'cancelled')
  if (ordersError) throw ordersError

  const statsByCustomer = new Map<string, { count: number; total: number; last: string | null }>()
  for (const o of orders ?? []) {
    const existing = statsByCustomer.get(o.customer_id) ?? { count: 0, total: 0, last: null }
    existing.count += 1
    existing.total += o.grand_total ?? 0
    if (!existing.last || new Date(o.order_date) > new Date(existing.last)) {
      existing.last = o.order_date
    }
    statsByCustomer.set(o.customer_id, existing)
  }

  return (customers ?? []).map((c) => {
    const stats = statsByCustomer.get(c.id) ?? { count: 0, total: 0, last: null }
    return {
      ...(c as CustomerRow),
      order_count: stats.count,
      total_spending: stats.total,
      last_order_date: stats.last,
    }
  })
}

export async function getCustomer(id: string): Promise<CustomerRow> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw error
  return data as CustomerRow
}

export type CustomerInput = Omit<CustomerRow, 'id' | 'created_at'>

export async function createCustomer(input: CustomerInput): Promise<CustomerRow> {
  const { data, error } = await supabase.from('customers').insert(input).select('*').single()
  if (error) throw error
  return data as CustomerRow
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput>): Promise<CustomerRow> {
  const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as CustomerRow
}

export async function searchCustomers(query: string): Promise<CustomerRow[]> {
  if (!query.trim()) {
    const { data, error } = await supabase.from('customers').select('*').order('name').limit(20)
    if (error) throw error
    return (data ?? []) as CustomerRow[]
  }
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('name')
    .limit(20)
  if (error) throw error
  return (data ?? []) as CustomerRow[]
}
