import type { PaymentEntryType, PaymentStatus, PaymentType, PurchaseStatus } from '../types/database'

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  dp: 'DP',
  fp: 'FP',
}

export const PAYMENT_TYPE_DESCRIPTIONS: Record<PaymentType, string> = {
  dp: 'Down Payment — bayar sebagian dulu',
  fp: 'Full Payment — bayar lunas',
}

/** "Partial" stays an internal value; the UI always says "DP / Belum Lunas". */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Belum Bayar',
  partial: 'DP / Belum Lunas',
  paid: 'Lunas',
  refunded: 'Refunded',
}

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-gray-200 text-gray-700',
}

/** Label used in lists: a fully paid order reads "FP / Lunas". */
export function getPaymentBadgeLabel(status: PaymentStatus): string {
  return status === 'paid' ? 'FP / Lunas' : PAYMENT_STATUS_LABELS[status] ?? status
}

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  not_purchased: 'Not Purchased',
  purchased: 'Purchased',
}

/** Indonesian wording used by the {{purchase_status}} WhatsApp variable. */
export const PURCHASE_STATUS_WA_LABELS: Record<PurchaseStatus, string> = {
  not_purchased: 'Belum Dibeli',
  purchased: 'Sudah Dibeli',
}

export const PURCHASE_STATUS_STYLES: Record<PurchaseStatus, string> = {
  not_purchased: 'bg-red-100 text-red-700',
  purchased: 'bg-orange-100 text-orange-700',
}

export const PAYMENT_ENTRY_TYPES: { value: PaymentEntryType; label: string }[] = [
  { value: 'dp', label: 'DP' },
  { value: 'fp', label: 'FP' },
  { value: 'additional', label: 'Additional Payment' },
  { value: 'refund', label: 'Refund' },
]

export const PAYMENT_ENTRY_LABELS: Record<PaymentEntryType, string> = {
  dp: 'DP',
  fp: 'FP',
  additional: 'Additional Payment',
  refund: 'Refund',
}

export const PAYMENT_METHODS = ['Transfer Bank', 'QRIS', 'E-Wallet', 'Cash', 'Lainnya']
