import React from 'react'
import type { PaymentStatus, PurchaseStatus } from '../types/database'
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_STYLES,
  getPaymentBadgeLabel,
} from '../config/payment'

const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap'

export function PaymentStatusBadge({ status, withType = false }: { status: PaymentStatus; withType?: boolean }) {
  const label = withType ? getPaymentBadgeLabel(status) : PAYMENT_STATUS_LABELS[status] ?? status
  return (
    <span className={`${base} ${PAYMENT_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return (
    <span className={`${base} ${PURCHASE_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {PURCHASE_STATUS_LABELS[status] ?? status}
    </span>
  )
}
