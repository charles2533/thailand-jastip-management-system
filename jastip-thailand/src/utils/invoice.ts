import { supabase } from '../lib/supabaseClient'

/**
 * Generates the next sequential invoice number for the current year,
 * e.g. INV-2026-001, INV-2026-002 ...
 * Falls back to retrying with the next number if a unique-constraint
 * collision occurs (rare, since this is a single-admin tool).
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('order_date', `${year}-01-01T00:00:00.000Z`)
    .lt('order_date', `${year + 1}-01-01T00:00:00.000Z`)

  if (error) {
    // Fall back to a timestamp-based number if the count query fails.
    return `INV-${year}-${Date.now().toString().slice(-4)}`
  }

  const next = (count ?? 0) + 1
  return `INV-${year}-${String(next).padStart(3, '0')}`
}

export async function generateUniqueInvoiceNumber(): Promise<string> {
  let candidate = await generateInvoiceNumber()
  let attempts = 0
  // Guard against a race where two orders are created in the same instant.
  while (attempts < 5) {
    const { data } = await supabase.from('orders').select('id').eq('invoice_number', candidate).maybeSingle()
    if (!data) return candidate
    const year = new Date().getFullYear()
    const match = candidate.match(/-(\d+)$/)
    const nextNum = (match ? parseInt(match[1], 10) : 0) + 1
    candidate = `INV-${year}-${String(nextNum).padStart(3, '0')}`
    attempts++
  }
  return candidate
}

export function shortOrderId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}
