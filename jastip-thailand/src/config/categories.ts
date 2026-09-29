import type { ProductCategory } from '../types/database'

/** Admin-only grouping to help with purchasing. Customers never fill this in. */
export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'beauty_skincare', label: 'Beauty / Skincare' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'food_snack', label: 'Food / Snack' },
  { value: 'souvenir', label: 'Souvenir' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'toys_collectibles', label: 'Toys / Collectibles' },
  { value: 'other', label: 'Other' },
]

export function getCategoryLabel(category: string | null | undefined): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === category)?.label ?? 'Other'
}

export function categoryOrder(category: string | null | undefined): number {
  const idx = PRODUCT_CATEGORIES.findIndex((c) => c.value === category)
  return idx === -1 ? PRODUCT_CATEGORIES.length : idx
}
