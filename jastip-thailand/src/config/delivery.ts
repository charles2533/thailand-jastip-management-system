import type { DeliveryMethod } from '../types/database'

/**
 * Available delivery methods.
 * - zoneBased = true  -> fee comes from Settings -> Delivery zones (Kurir)
 * - zoneBased = false -> fee is typed in manually per order (rate depends on
 *   the Grab / Gojek / Shopee Instant quote at the time)
 */
export const DELIVERY_METHODS: { value: DeliveryMethod; label: string; zoneBased: boolean }[] = [
  { value: 'kurir', label: 'Kurir', zoneBased: true },
  { value: 'grab', label: 'Grab', zoneBased: false },
  { value: 'gojek', label: 'Gojek', zoneBased: false },
  { value: 'shopee_instant', label: 'Shopee Instant', zoneBased: false },
]

export function getDeliveryMethodLabel(method: string | null | undefined): string {
  return DELIVERY_METHODS.find((m) => m.value === method)?.label ?? 'Kurir'
}

export function isZoneBased(method: DeliveryMethod): boolean {
  return DELIVERY_METHODS.find((m) => m.value === method)?.zoneBased ?? true
}
