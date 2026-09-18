/**
 * Currency formatting utilities.
 * IDR uses Indonesian grouping (dots): Rp50.000
 * THB uses standard grouping (commas): ฿500
 */

export function formatIDR(amount: number): string {
  const rounded = Math.round(amount || 0)
  return 'Rp' + rounded.toLocaleString('id-ID')
}

export function formatTHB(amount: number): string {
  const rounded = Math.round((amount || 0) * 100) / 100
  const hasDecimals = rounded % 1 !== 0
  return (
    '฿' +
    rounded.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })
  )
}

export function parseNumberInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}
