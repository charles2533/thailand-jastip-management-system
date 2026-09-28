import React, { useEffect, useMemo, useState } from 'react'
import { Calculator as CalcIcon } from 'lucide-react'
import { Card, Input, PageLoader, Select, TextArea } from '../components/ui'
import { getSettings } from '../services/settings'
import { listDeliveryZones } from '../services/deliveryZones'
import { calculateAppliedExchangeRate, calculateItemPricing } from '../utils/pricing'
import { formatIDR, formatTHB } from '../utils/currency'
import type { DeliveryZoneRow, SettingsRow } from '../types/database'
import { useToast } from '../components/ToastProvider'

export default function Calculator() {
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const [productName, setProductName] = useState('')
  const [productLink, setProductLink] = useState('')
  const [priceThb, setPriceThb] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [zoneId, setZoneId] = useState<string>('')

  useEffect(() => {
    async function load() {
      try {
        const [s, z] = await Promise.all([getSettings(), listDeliveryZones()])
        setSettings(s)
        setZones(z)
        const firstActive = z.find((zone) => zone.active)
        if (firstActive) setZoneId(firstActive.id)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const appliedRate = useMemo(() => {
    if (!settings) return 0
    return calculateAppliedExchangeRate(settings.base_exchange_rate, settings.currency_margin, settings.rounding_rule)
  }, [settings])

  const result = useMemo(() => {
    if (!settings) return null
    return calculateItemPricing({ priceThb, quantity, appliedRate, feeConfig: settings.fee_configuration })
  }, [settings, priceThb, quantity, appliedRate])

  const deliveryFee = useMemo(() => zones.find((z) => z.id === zoneId)?.fee ?? 0, [zones, zoneId])
  const grandTotal = (result?.itemTotal ?? 0) + deliveryFee

  if (loading || !settings) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal flex items-center gap-2">
          <CalcIcon size={22} /> Calculator
        </h1>
        <p className="text-sm text-charcoal-soft mt-1">Quick price estimate using current settings — not saved as an order.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col gap-4">
          <Input label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Thai skincare set" />
          <Input label="Product Link (optional)" value={productLink} onChange={(e) => setProductLink(e.target.value)} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (THB)"
              type="number"
              min={0}
              value={priceThb || ''}
              onChange={(e) => setPriceThb(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
          </div>
          <Select label="Delivery Zone (Kurir)" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">No delivery fee</option>
            {zones.filter((z) => z.active).map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} — {formatIDR(z.fee)}
              </option>
            ))}
          </Select>
          <TextArea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-charcoal mb-4">Estimate</h3>
          <div className="flex flex-col gap-2.5 text-sm">
            <Row label="Applied Exchange Rate" value={`${formatTHB(1)} = ${formatIDR(appliedRate)}`} />
            <Row label="Price / item (THB)" value={formatTHB(priceThb)} />
            <Row label="Price / item (IDR)" value={formatIDR(result?.priceIdr ?? 0)} />
            <Row label="Jastip Fee / item" value={formatIDR(result?.feePerItem ?? 0)} />
            <Row label="Quantity" value={String(quantity || 1)} />
            <div className="border-t border-black/5 my-1" />
            <Row label="Total Product Price" value={formatIDR(result?.itemSubtotal ?? 0)} />
            <Row label="Total Jastip Fee" value={formatIDR(result?.itemTotalFee ?? 0)} />
            <Row label="Delivery Fee" value={formatIDR(deliveryFee)} />
            <div className="border-t border-black/5 my-1" />
            <Row label="Grand Total" value={formatIDR(grandTotal)} bold />
          </div>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-charcoal-soft">{label}</span>
      <span className={bold ? 'text-charcoal font-semibold text-base' : 'text-charcoal font-medium'}>{value}</span>
    </div>
  )
}
