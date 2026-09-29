import type {
  OrderRow,
  OrderStatus,
  PaymentEntryType,
  PaymentStatus,
  PaymentType,
  PurchaseStatus,
} from '../types/database'
import { formatIDR } from './currency'

/**
 * Centralized payment / purchase rules. Everything that touches paid amounts,
 * payment status or "ready to purchase" flows through here.
 */

export interface PaymentLike {
  amount: number
  payment_type: PaymentEntryType
}

export interface PaymentSummary {
  gross: number // DP + FP + additional payments
  refunded: number
  net: number // what the customer effectively has paid
}

export function summarizePayments(payments: PaymentLike[]): PaymentSummary {
  let gross = 0
  let refunded = 0
  for (const p of payments) {
    if (p.payment_type === 'refund') refunded += p.amount
    else gross += p.amount
  }
  return { gross, refunded, net: Math.max(0, gross - refunded) }
}

export interface PaymentState {
  paid_amount: number
  remaining_amount: number
  payment_status: PaymentStatus
  payment_type: PaymentType
}

/**
 * Derives the order's payment fields from its payment history.
 *  - nothing paid                    -> pending (paid 0, remaining = grand total)
 *  - 0 < paid < grand total          -> partial, type DP
 *  - paid = grand total              -> paid, type FP
 *  - everything paid was refunded    -> refunded
 * While nothing is paid the order keeps the payment type agreed with the customer.
 */
export function derivePaymentState(
  grandTotal: number,
  payments: PaymentLike[],
  agreedType: PaymentType = 'fp'
): PaymentState {
  const { refunded, net } = summarizePayments(payments)

  let payment_status: PaymentStatus
  if (refunded > 0 && net <= 0) payment_status = 'refunded'
  else if (net <= 0) payment_status = 'pending'
  else if (net >= grandTotal) payment_status = 'paid'
  else payment_status = 'partial'

  const payment_type: PaymentType =
    payment_status === 'paid' ? 'fp' : payment_status === 'partial' ? 'dp' : agreedType

  return {
    paid_amount: net,
    remaining_amount: Math.max(0, grandTotal - net),
    payment_status,
    payment_type,
  }
}

/** Returns an error message (Indonesian) or null when the payment is acceptable. */
export function validatePaymentInput(args: {
  grandTotal: number
  payments: PaymentLike[]
  amount: number
  entryType: PaymentEntryType
}): string | null {
  const { grandTotal, payments, amount, entryType } = args
  if (!Number.isFinite(amount) || amount <= 0) return 'Jumlah pembayaran harus lebih dari 0.'
  const { net } = summarizePayments(payments)

  if (entryType === 'refund') {
    if (amount > net) return `Refund tidak boleh melebihi jumlah yang sudah dibayar (${formatIDR(net)}).`
    return null
  }
  if (net + amount > grandTotal) {
    return `Pembayaran melebihi sisa tagihan (${formatIDR(Math.max(0, grandTotal - net))}).`
  }
  return null
}

const LOCKED_ORDER_STATUSES: OrderStatus[] = ['ready_to_ship', 'shipped', 'completed', 'cancelled']

/**
 * Keeps the (manual) order status in step with payment / purchase status without
 * ever touching Ready to Ship, Shipped, Completed or Cancelled.
 */
export function syncOrderStatus(
  current: OrderStatus,
  paymentStatus: PaymentStatus,
  purchaseStatus: PurchaseStatus
): OrderStatus {
  if (LOCKED_ORDER_STATUSES.includes(current)) return current
  if (purchaseStatus === 'purchased') return 'purchased'
  if (paymentStatus === 'paid') return 'paid'
  return 'pending'
}

/** Ready to Purchase = paid AND not purchased yet (cancelled orders are never bought). */
export function isReadyToPurchase(
  order: Pick<OrderRow, 'payment_status' | 'purchase_status' | 'status'>
): boolean {
  return (
    order.payment_status === 'paid' &&
    order.purchase_status === 'not_purchased' &&
    order.status !== 'cancelled'
  )
}
