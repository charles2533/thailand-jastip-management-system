import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, UserPlus } from 'lucide-react'
import { Button, Card, Input, PageLoader, Select, TextArea } from '../components/ui'
import { getSettings } from '../services/settings'
import { listDeliveryZones } from '../services/deliveryZones'
import { createCustomer, searchCustomers } from '../services/customers'
import { createOrder, getOrder, updateOrder } from '../services/orders'
import { calculateAppliedExchangeRate, calculateItemPricing, calculateOrderTotals } from '../utils/pricing'
import { formatIDR } from '../utils/currency'
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER } from '../types'
import type { CustomerRow, DeliveryMethod, DeliveryZoneRow, FeeConfiguration, OrderStatus, SettingsRow } from '../types/database'
import { DELIVERY_METHODS, isZoneBased } from '../config/delivery'
import { useToast } from '../components/ToastProvider'

interface DraftItem {
  tempId: string
  product_name: string
  product_link: string
  quantity: number
  price_thb: number
  notes: string
}

function newDraftItem(): DraftItem {
  return { tempId: Math.random().toString(36).slice(2), product_name: '', product_link: '', quantity: 1, price_thb: 0, notes: '' }
}

interface PricingSnapshot {
  baseRate: number
  margin: number
  appliedRate: number
  roundingRule: string
  feeConfig: FeeConfiguration
}

export default function CreateOrder() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation() as { state?: { duplicateFrom?: { customer: CustomerRow; items: DraftItem[]; notes: string } } }
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [pricing, setPricing] = useState<PricingSnapshot | null>(null)

  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerRow[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', city: '', delivery_area: '', postal_code: '' })

  const [items, setItems] = useState<DraftItem[]>([newDraftItem()])
  const [deliveryZoneId, setDeliveryZoneId] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('kurir')
  const [deliveryFeeOverride, setDeliveryFeeOverride] = useState<number | null>(null)
  const [status, setStatus] = useState<OrderStatus>('pending')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initial load: settings/zones, then edit/duplicate/preselect-customer data.
  useEffect(() => {
    async function load() {
      try {
        const [settings, zoneList] = await Promise.all([getSettings(), listDeliveryZones()])
        setZones(zoneList)

        if (isEdit && id) {
          const { order, customer, items: existingItems } = await getOrder(id)
          setSelectedCustomer(customer)
          setPricing({
            baseRate: order.base_exchange_rate,
            margin: order.currency_margin,
            appliedRate: order.applied_exchange_rate,
            roundingRule: order.rounding_rule,
            feeConfig: order.fee_configuration,
          })
          setItems(
            existingItems.map((it) => ({
              tempId: it.id,
              product_name: it.product_name,
              product_link: it.product_link ?? '',
              quantity: it.quantity,
              price_thb: it.price_thb,
              notes: it.notes ?? '',
            }))
          )
          const matchedZone = zoneList.find((z) => z.name === order.delivery_area)
          setDeliveryMethod(order.delivery_method ?? 'kurir')
          setDeliveryZoneId(matchedZone?.id ?? '')
          if (order.delivery_fee !== order.default_delivery_fee) setDeliveryFeeOverride(order.delivery_fee)
          setStatus(order.status)
          setOrderDate(order.order_date.slice(0, 10))
          setNotes(order.notes ?? '')
        } else {
          const appliedRate = calculateAppliedExchangeRate(settings.base_exchange_rate, settings.currency_margin, settings.rounding_rule)
          setPricing({
            baseRate: settings.base_exchange_rate,
            margin: settings.currency_margin,
            appliedRate,
            roundingRule: settings.rounding_rule,
            feeConfig: settings.fee_configuration,
          })

          if (location.state?.duplicateFrom) {
            setSelectedCustomer(location.state.duplicateFrom.customer)
            setItems(location.state.duplicateFrom.items.length ? location.state.duplicateFrom.items : [newDraftItem()])
            setNotes(location.state.duplicateFrom.notes)
          }

          const presetCustomerId = searchParams.get('customer')
          if (presetCustomerId) {
            const results = await searchCustomers('')
            const found = results.find((c) => c.id === presetCustomerId)
            if (found) setSelectedCustomer(found)
          }

          const firstActive = zoneList.find((z) => z.active)
          if (firstActive) setDeliveryZoneId(firstActive.id)
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load order form', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (customerMode !== 'existing') return
    const handle = setTimeout(async () => {
      try {
        const results = await searchCustomers(customerQuery)
        setCustomerResults(results)
      } catch {
        /* ignore search errors */
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [customerQuery, customerMode])

  const isKurir = isZoneBased(deliveryMethod)
  const activeZone = isKurir ? zones.find((z) => z.id === deliveryZoneId) : undefined
  const defaultDeliveryFee = activeZone?.fee ?? 0
  const appliedDeliveryFee = deliveryFeeOverride ?? defaultDeliveryFee

  const computedItems = useMemo(() => {
    if (!pricing) return []
    return items.map((it) => ({
      ...it,
      ...calculateItemPricing({ priceThb: it.price_thb, quantity: it.quantity, appliedRate: pricing.appliedRate, feeConfig: pricing.feeConfig }),
    }))
  }, [items, pricing])

  const totals = useMemo(() => calculateOrderTotals(computedItems, appliedDeliveryFee), [computedItems, appliedDeliveryFee])

  function updateItem(tempId: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, newDraftItem()])
  }

  function removeItem(tempId: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.tempId !== tempId) : prev))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (customerMode === 'existing' && !selectedCustomer) e.customer = 'Select a customer'
    if (customerMode === 'new') {
      if (!newCustomer.name.trim()) e.newName = 'Name is required'
      if (!newCustomer.phone.trim()) e.newPhone = 'Phone is required'
      if (!newCustomer.address.trim()) e.newAddress = 'Address is required'
    }
    if (isKurir && !deliveryZoneId) e.delivery = 'Select a delivery area'
    items.forEach((it, idx) => {
      if (!it.product_name.trim()) e[`item-${idx}-name`] = 'Product name required'
      if (!it.price_thb || it.price_thb <= 0) e[`item-${idx}-price`] = 'Price required'
      if (!it.quantity || it.quantity <= 0) e[`item-${idx}-qty`] = 'Quantity required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate() || !pricing) return
    setSaving(true)
    try {
      let customerId = selectedCustomer?.id ?? ''
      if (customerMode === 'new') {
        const created = await createCustomer({ ...newCustomer, notes: null, postal_code: newCustomer.postal_code || null, city: newCustomer.city || null, delivery_area: newCustomer.delivery_area || null })
        customerId = created.id
      }

      const orderItems = computedItems.map((it) => ({
        product_name: it.product_name,
        product_link: it.product_link || null,
        quantity: it.quantity,
        price_thb: it.price_thb,
        applied_exchange_rate: it.appliedRate,
        price_idr: it.priceIdr,
        fee_per_item: it.feePerItem,
        total_fee: it.itemTotalFee,
        total: it.itemTotal,
        notes: it.notes || null,
      }))

      const payload = {
        customer_id: customerId,
        status,
        order_date: new Date(orderDate).toISOString(),
        base_exchange_rate: pricing.baseRate,
        currency_margin: pricing.margin,
        applied_exchange_rate: pricing.appliedRate,
        rounding_rule: pricing.roundingRule,
        fee_configuration: pricing.feeConfig,
        delivery_method: deliveryMethod,
        delivery_area: activeZone?.name ?? null,
        default_delivery_fee: defaultDeliveryFee,
        delivery_fee: appliedDeliveryFee,
        notes: notes || null,
        items: orderItems,
      }

      if (isEdit && id) {
        await updateOrder(id, payload)
        showToast('Order updated')
        navigate(`/orders/${id}`)
      } else {
        const order = await createOrder(payload)
        showToast('Order created')
        navigate(`/orders/${order.id}`)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save order', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !pricing) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-charcoal w-fit">
        <ArrowLeft size={15} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-charcoal">{isEdit ? 'Edit Order' : 'Create Order'}</h1>
        <p className="text-sm text-charcoal-soft mt-1">
          Using exchange rate {formatIDR(pricing.appliedRate)} / ฿{isEdit ? ' (original order pricing — edit items freely, snapshot unchanged)' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Customer */}
          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Customer</h3>
            {!isEdit && (
              <div className="flex gap-2 mb-4">
                <Button size="sm" variant={customerMode === 'existing' ? 'primary' : 'outline'} onClick={() => setCustomerMode('existing')}>
                  Existing Customer
                </Button>
                <Button size="sm" variant={customerMode === 'new' ? 'primary' : 'outline'} onClick={() => setCustomerMode('new')}>
                  <UserPlus size={14} /> New Customer
                </Button>
              </div>
            )}

            {customerMode === 'existing' ? (
              <div className="flex flex-col gap-2">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between border border-charcoal/10 rounded-xl px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{selectedCustomer.name}</p>
                      <p className="text-xs text-charcoal-soft">{selectedCustomer.phone}</p>
                    </div>
                    {!isEdit && (
                      <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                        Change
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <Input placeholder="Search customer by name or phone..." value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} error={errors.customer} />
                    {customerResults.length > 0 && (
                      <div className="border border-charcoal/10 rounded-xl divide-y divide-black/5 max-h-56 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-charcoal/5 text-sm"
                            onClick={() => {
                              setSelectedCustomer(c)
                              if (c.delivery_area) {
                                const z = zones.find((zone) => zone.name === c.delivery_area)
                                if (z) setDeliveryZoneId(z.id)
                              }
                            }}
                          >
                            <p className="font-medium text-charcoal">{c.name}</p>
                            <p className="text-xs text-charcoal-soft">{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Input label="Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} error={errors.newName} />
                <Input label="WhatsApp / Phone *" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} error={errors.newPhone} />
                <TextArea label="Address *" rows={2} value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} error={errors.newAddress} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
                  <Input label="Postal Code" value={newCustomer.postal_code} onChange={(e) => setNewCustomer({ ...newCustomer, postal_code: e.target.value })} />
                </div>
              </div>
            )}
          </Card>

          {/* Items */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-charcoal">Products</h3>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus size={14} /> Add Item
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {computedItems.map((item, idx) => (
                <div key={item.tempId} className="border border-charcoal/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-charcoal-soft uppercase tracking-wide">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.tempId)} className="text-charcoal-soft hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Product Name *"
                      value={item.product_name}
                      onChange={(e) => updateItem(item.tempId, { product_name: e.target.value })}
                      error={errors[`item-${idx}-name`]}
                      className="sm:col-span-2"
                    />
                    <Input label="Product Link" value={item.product_link} onChange={(e) => updateItem(item.tempId, { product_link: e.target.value })} className="sm:col-span-2" />
                    <Input
                      label="Price (THB) *"
                      type="number"
                      min={0}
                      value={item.price_thb || ''}
                      onChange={(e) => updateItem(item.tempId, { price_thb: parseFloat(e.target.value) || 0 })}
                      error={errors[`item-${idx}-price`]}
                    />
                    <Input
                      label="Quantity *"
                      type="number"
                      min={1}
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(item.tempId, { quantity: parseInt(e.target.value) || 1 })}
                      error={errors[`item-${idx}-qty`]}
                    />
                    <TextArea label="Notes" rows={1} value={item.notes} onChange={(e) => updateItem(item.tempId, { notes: e.target.value })} className="sm:col-span-2" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 text-sm">
                    <span className="text-charcoal-soft">
                      {formatIDR(item.priceIdr)}/item + {formatIDR(item.feePerItem)} fee × {item.quantity || 1}
                    </span>
                    <span className="font-medium text-charcoal">{formatIDR(item.itemTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Delivery & meta */}
          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Delivery &amp; Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Delivery Method *" value={deliveryMethod} onChange={(e) => { setDeliveryMethod(e.target.value as DeliveryMethod); setDeliveryFeeOverride(null) }}>
                {DELIVERY_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
              {isKurir && (
                <Select label="Delivery Area *" value={deliveryZoneId} onChange={(e) => { setDeliveryZoneId(e.target.value); setDeliveryFeeOverride(null) }} error={errors.delivery}>
                  <option value="">Select area...</option>
                  {zones.filter((z) => z.active || z.id === deliveryZoneId).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {formatIDR(z.fee)}
                    </option>
                  ))}
                </Select>
              )}
              <Input
                label={isKurir ? 'Delivery Fee (override)' : 'Delivery Fee (sesuai tarif aplikasi)'}
                type="number"
                min={0}
                value={deliveryFeeOverride ?? defaultDeliveryFee}
                onChange={(e) => setDeliveryFeeOverride(parseFloat(e.target.value) || 0)}
              />
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {ORDER_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Input label="Order Date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <TextArea label="Order Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-3" />
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="p-5 sticky top-4">
            <h3 className="font-semibold text-charcoal mb-4">Order Summary</h3>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-charcoal-soft">Applied Rate</span>
                <span className="text-charcoal font-medium">{formatIDR(pricing.appliedRate)}/฿</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-charcoal-soft">Items</span>
                <span className="text-charcoal font-medium">{items.length}</span>
              </div>
              <div className="border-t border-black/5 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-charcoal-soft">Product Subtotal</span>
                <span className="text-charcoal font-medium">{formatIDR(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-charcoal-soft">Total Jastip Fee</span>
                <span className="text-charcoal font-medium">{formatIDR(totals.totalFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-charcoal-soft">Delivery Fee</span>
                <span className="text-charcoal font-medium">{formatIDR(totals.deliveryFee)}</span>
              </div>
              <div className="border-t border-black/5 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-charcoal font-semibold">Grand Total</span>
                <span className="text-charcoal font-semibold text-lg">{formatIDR(totals.grandTotal)}</span>
              </div>
            </div>
            <Button className="w-full mt-5" onClick={handleSubmit} loading={saving}>
              {isEdit ? 'Save Changes' : 'Save Order'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
