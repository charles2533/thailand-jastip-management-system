import type { FeeConfiguration } from '../types/database'

/**
 * Centralized pricing engine.
 * Every currency/fee calculation in the app must flow through these
 * functions so behavior stays identical across Calculator, Create Order,
 * and Order Detail (recompute-on-view for drafts).
 */

export const DEFAULT_BASE_RATE = 480
export const DEFAULT_MARGIN = 4
export const DEFAULT_ROUNDING_RULE = 'nearest_10'

export const DEFAULT_FEE_CONFIGURATION: FeeConfiguration = {
  tiers: [
    { label: '< Rp50.000', maxIdr: 50000, fee: 10000 },
    { label: 'Rp50.000 – < Rp100.000', maxIdr: 100000, fee: 15000 },
    { label: 'Rp100.000 – < Rp300.000', maxIdr: 300000, fee: 25000 },
    { label: 'Rp300.000 – < Rp500.000', maxIdr: 500000, fee: 35000 },
    { label: '>= Rp500.000', maxIdr: null, percent: 8 },
  ],
}

export const ROUNDING_RULES: { value: string; label: string; step: number }[] = [
  { value: 'nearest_1', label: 'No rounding (nearest Rp1)', step: 1 },
  { value: 'nearest_10', label: 'Nearest Rp10', step: 10 },
  { value: 'nearest_50', label: 'Nearest Rp50', step: 50 },
  { value: 'nearest_100', label: 'Nearest Rp100', step: 100 },
  { value: 'nearest_1000', label: 'Nearest Rp1.000', step: 1000 },
]

export function applyRounding(value: number, roundingRule: string): number {
  const rule = ROUNDING_RULES.find((r) => r.value === roundingRule)
  const step = rule?.step ?? 10
  return Math.round(value / step) * step
}

/** jastipRate = baseRate * (1 + margin / 100), then rounded per roundingRule */
export function calculateAppliedExchangeRate(
  baseRate: number,
  marginPercent: number,
  roundingRule: string
): number {
  const raw = baseRate * (1 + marginPercent / 100)
  return applyRounding(raw, roundingRule)
}

/** Determine the per-item jastip fee (IDR) for a given item price in IDR. */
export function calculateJastipFeePerItem(priceIdr: number, feeConfig: FeeConfiguration): number {
  const tiers = feeConfig?.tiers?.length ? feeConfig.tiers : DEFAULT_FEE_CONFIGURATION.tiers
  for (const tier of tiers) {
    if (tier.maxIdr === null || priceIdr < tier.maxIdr) {
      if (typeof tier.percent === 'number') {
        return Math.round(priceIdr * (tier.percent / 100))
      }
      return tier.fee ?? 0
    }
  }
  return 0
}

export interface ItemPricingInput {
  priceThb: number
  quantity: number
  appliedRate: number
  feeConfig: FeeConfiguration
}

export interface ItemPricingResult {
  appliedRate: number
  priceIdr: number
  feePerItem: number
  itemSubtotal: number // priceIdr * quantity
  itemTotalFee: number // feePerItem * quantity
  itemTotal: number // itemSubtotal + itemTotalFee
}

/** Price an individual order line item. priceIdr = priceThb * appliedRate. */
export function calculateItemPricing({
  priceThb,
  quantity,
  appliedRate,
  feeConfig,
}: ItemPricingInput): ItemPricingResult {
  const qty = Math.max(1, Math.floor(quantity || 0) || 1)
  const priceIdr = Math.round((priceThb || 0) * appliedRate)
  const feePerItem = calculateJastipFeePerItem(priceIdr, feeConfig)
  const itemSubtotal = priceIdr * qty
  const itemTotalFee = feePerItem * qty
  const itemTotal = itemSubtotal + itemTotalFee

  return { appliedRate, priceIdr, feePerItem, itemSubtotal, itemTotalFee, itemTotal }
}

export interface OrderTotals {
  subtotal: number // sum of item subtotals (product price only)
  totalFee: number // sum of item jastip fees
  deliveryFee: number
  grandTotal: number
}

export function calculateOrderTotals(
  items: Pick<ItemPricingResult, 'itemSubtotal' | 'itemTotalFee'>[],
  deliveryFee: number
): OrderTotals {
  const subtotal = items.reduce((sum, i) => sum + i.itemSubtotal, 0)
  const totalFee = items.reduce((sum, i) => sum + i.itemTotalFee, 0)
  const grandTotal = subtotal + totalFee + (deliveryFee || 0)
  return { subtotal, totalFee, deliveryFee: deliveryFee || 0, grandTotal }
}
