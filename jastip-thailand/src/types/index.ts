export * from './database'

export interface OrderItemDraft {
  tempId: string
  product_name: string
  product_link: string
  quantity: number
  price_thb: number
  notes: string
}

export interface OrderItemCalculated extends OrderItemDraft {
  applied_exchange_rate: number
  price_idr: number
  fee_per_item: number
  total_fee: number
  total: number
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  purchased: 'Purchased',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_ORDER = [
  'pending',
  'paid',
  'purchased',
  'ready_to_ship',
  'shipped',
  'completed',
  'cancelled',
] as const
