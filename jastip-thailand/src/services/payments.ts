import { supabase } from '../lib/supabaseClient'
import type { OrderRow, PaymentEntryType, PaymentRow } from '../types/database'
import { derivePaymentState, summarizePayments, syncOrderStatus, validatePaymentInput } from '../utils/payment'
import { formatIDR } from '../utils/currency'

export async function listPayments(orderId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('paid_at', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PaymentRow[]
}

/**
 * Recomputes paid_amount / remaining_amount / payment_status / payment_type from the
 * payment history and stores them on the order (grand_total is never touched).
 * The order status is kept in sync unless `onlyIfPaymentChanged` is set and the
 * payment status did not change (used after editing an order).
 */
export async function recalculateOrderPayment(
  orderId: string,
  options: { onlyIfPaymentChanged?: boolean } = {}
): Promise<OrderRow> {
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
  if (error) throw error

  const payments = await listPayments(orderId)
  const state = derivePaymentState(order.grand_total, payments, order.payment_type)
  const changed = state.payment_status !== order.payment_status

  const patch: Record<string, unknown> = { ...state, updated_at: new Date().toISOString() }
  if (!options.onlyIfPaymentChanged || changed) {
    patch.status = syncOrderStatus(order.status, state.payment_status, order.purchase_status)
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .select('*')
    .single()
  if (updateError) throw updateError
  return updated as OrderRow
}

export interface AddPaymentInput {
  amount: number
  payment_type: PaymentEntryType
  payment_method: string | null
  notes: string | null
  paid_at: string
}

export async function addPayment(orderId: string, input: AddPaymentInput): Promise<OrderRow> {
  const { data: order, error } = await supabase.from('orders').select('grand_total').eq('id', orderId).single()
  if (error) throw error

  const payments = await listPayments(orderId)
  const validationError = validatePaymentInput({
    grandTotal: order.grand_total,
    payments,
    amount: input.amount,
    entryType: input.payment_type,
  })
  if (validationError) throw new Error(validationError)

  const { error: insertError } = await supabase.from('payments').insert({ ...input, order_id: orderId })
  if (insertError) throw insertError

  return recalculateOrderPayment(orderId)
}

export async function deletePayment(orderId: string, paymentId: string): Promise<OrderRow> {
  const payments = await listPayments(orderId)
  const remaining = payments.filter((p) => p.id !== paymentId)
  const { gross, refunded } = summarizePayments(remaining)
  if (refunded > gross) {
    throw new Error(`Hapus refund terlebih dahulu — total refund (${formatIDR(refunded)}) akan melebihi total pembayaran.`)
  }

  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) throw error

  return recalculateOrderPayment(orderId)
}
