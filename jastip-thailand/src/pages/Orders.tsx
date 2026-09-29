import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, Search, ShoppingCart } from 'lucide-react'
import { Button, Card, ConfirmDialog, EmptyState, Input, PageLoader, Select, StatusBadge } from '../components/ui'
import { PaymentStatusBadge, PurchaseStatusBadge } from '../components/badges'
import CustomerFormModal from '../components/CustomerFormModal'
import {
  listOrders,
  listReadyToPurchase,
  markAsPurchased,
  type OrderListItem,
  type ReadyToPurchaseOrder,
} from '../services/orders'
import { listDeliveryZones } from '../services/deliveryZones'
import { getSettings } from '../services/settings'
import { formatIDR } from '../utils/currency'
import { shortOrderId } from '../utils/invoice'
import { isReadyToPurchase } from '../utils/payment'
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER } from '../types'
import type { DeliveryZoneRow } from '../types/database'
import { useToast } from '../components/ToastProvider'
import { DEFAULT_CUSTOMER_FORM_TEMPLATE } from '../config/customerForm'
import { getDeliveryMethodLabel } from '../config/delivery'
import { categoryOrder, getCategoryLabel } from '../config/categories'

type TabKey = 'all' | 'pending' | 'partial' | 'paid' | 'ready' | 'purchased' | 'shipped' | 'completed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'DP / Partial' },
  { key: 'paid', label: 'Paid' },
  { key: 'ready', label: 'Ready to Purchase' },
  { key: 'purchased', label: 'Purchased' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
]

function matchesTab(o: OrderListItem, tab: TabKey): boolean {
  if (tab === 'all') return true
  if (tab === 'shipped') return o.status === 'shipped'
  if (tab === 'completed') return o.status === 'completed'
  if (o.status === 'cancelled') return false
  switch (tab) {
    case 'pending':
      return o.payment_status === 'pending'
    case 'partial':
      return o.payment_status === 'partial'
    case 'paid':
      return o.payment_status === 'paid'
    case 'ready':
      return isReadyToPurchase(o)
    case 'purchased':
      return o.purchase_status === 'purchased'
    default:
      return true
  }
}

function PaymentCell({ o }: { o: OrderListItem }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <PaymentStatusBadge status={o.payment_status} withType />
      <span className="text-xs text-charcoal-soft">
        {formatIDR(o.paid_amount ?? 0)} / {formatIDR(o.grand_total)}
      </span>
      {o.payment_status === 'partial' && <span className="text-xs text-charcoal-soft">Sisa {formatIDR(o.remaining_amount ?? 0)}</span>}
    </div>
  )
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [readyOrders, setReadyOrders] = useState<ReadyToPurchaseOrder[]>([])
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [area, setArea] = useState('all')
  const [tab, setTab] = useState<TabKey>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [formTemplate, setFormTemplate] = useState(DEFAULT_CUSTOMER_FORM_TEMPLATE)
  const [purchaseTarget, setPurchaseTarget] = useState<ReadyToPurchaseOrder | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const { showToast } = useToast()

  async function load() {
    try {
      const [o, ready, z, s] = await Promise.all([listOrders(), listReadyToPurchase(), listDeliveryZones(), getSettings()])
      setOrders(o)
      setReadyOrders(ready)
      setZones(z)
      setFormTemplate(s.customer_form_template || DEFAULT_CUSTOMER_FORM_TEMPLATE)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function matchesFilters(o: OrderListItem): boolean {
    if (status !== 'all' && o.status !== status) return false
    if (area !== 'all' && o.delivery_area !== area) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const matches =
        o.invoice_number.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.customer?.name ?? '').toLowerCase().includes(q) ||
        (o.customer?.phone ?? '').toLowerCase().includes(q)
      if (!matches) return false
    }
    return true
  }

  const tabCounts = useMemo(() => {
    const counts = {} as Record<TabKey, number>
    for (const t of TABS) counts[t.key] = orders.filter((o) => matchesTab(o, t.key)).length
    return counts
  }, [orders])

  const filtered = useMemo(
    () => orders.filter((o) => matchesTab(o, tab) && matchesFilters(o)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, tab, search, status, area]
  )

  const readyFiltered = useMemo(
    () => readyOrders.filter(matchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readyOrders, search, status, area]
  )

  async function handleConfirmPurchase() {
    if (!purchaseTarget) return
    setPurchasing(true)
    try {
      await markAsPurchased(purchaseTarget.id)
      showToast('Order marked as purchased.')
      setPurchaseTarget(null)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mark as purchased', 'error')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Orders</h1>
          <p className="text-sm text-charcoal-soft mt-1">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <ClipboardList size={16} /> Customer Form
          </Button>
          <Link to="/orders/new">
            <Button>
              <Plus size={16} /> New Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-charcoal text-offwhite' : 'bg-white text-charcoal-soft border border-black/5 hover:text-charcoal'
            }`}
          >
            {t.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.key ? 'bg-white/15' : 'bg-charcoal/5'}`}>{tabCounts[t.key]}</span>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft" />
            <Input placeholder="Search customer, phone, invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {ORDER_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">All delivery areas</option>
            {zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {tab === 'ready' ? (
        readyFiltered.length === 0 ? (
          <Card>
            <EmptyState title="Belum ada order yang siap dibeli" description="Order muncul di sini setelah pembayarannya Lunas dan belum ditandai Purchased." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {readyFiltered.map((o) => (
              <Card key={o.id} className="p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/orders/${o.id}`} className="font-semibold text-charcoal hover:underline">
                      {o.invoice_number}
                    </Link>
                    <p className="text-sm text-charcoal-soft truncate">Customer: {o.customer?.name ?? '—'}</p>
                  </div>
                  <span className="shrink-0 text-xs rounded-full bg-charcoal/5 text-charcoal-soft px-2.5 py-1">{getDeliveryMethodLabel(o.delivery_method)}</span>
                </div>

                <ul className="mt-3 flex flex-col gap-2 flex-1">
                  {[...o.items]
                    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category))
                    .map((it) => (
                      <li key={it.id} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <span className="text-charcoal">
                            {it.product_name} × {it.quantity}
                          </span>
                          {it.variant && <span className="block text-xs text-charcoal-soft">{it.variant}</span>}
                        </div>
                        <span className="shrink-0 text-xs rounded-md bg-charcoal/5 px-2 py-0.5 text-charcoal-soft">{getCategoryLabel(it.category)}</span>
                      </li>
                    ))}
                </ul>

                <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-black/5">
                  <span className="text-sm text-charcoal-soft">
                    Total <span className="font-semibold text-charcoal">{formatIDR(o.grand_total)}</span>
                  </span>
                  <Button size="sm" onClick={() => setPurchaseTarget(o)}>
                    <ShoppingCart size={14} /> Mark as Purchased
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState
              title="No orders found"
              description="Try adjusting your filters, or create a new order."
              action={
                <Link to="/orders/new">
                  <Button variant="outline">
                    <Plus size={16} /> New Order
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-charcoal-soft border-b border-black/5">
                      <th className="px-5 py-3 font-medium">Order</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium text-right">Total</th>
                      <th className="px-5 py-3 font-medium">Payment</th>
                      <th className="px-5 py-3 font-medium">Purchase</th>
                      <th className="px-5 py-3 font-medium">Delivery</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filtered.map((o) => (
                      <tr key={o.id} className="hover:bg-charcoal/[0.02] cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                        <td className="px-5 py-3.5">
                          <Link to={`/orders/${o.id}`} className="font-medium text-charcoal hover:underline">
                            {o.invoice_number}
                          </Link>
                          <p className="text-xs text-charcoal-soft">
                            #{shortOrderId(o.id)} · {new Date(o.order_date).toLocaleDateString('id-ID')}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-charcoal">{o.customer?.name ?? '—'}</p>
                          <p className="text-xs text-charcoal-soft">{o.customer?.phone}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-charcoal">{formatIDR(o.grand_total)}</td>
                        <td className="px-5 py-3.5">
                          <PaymentCell o={o} />
                        </td>
                        <td className="px-5 py-3.5">
                          <PurchaseStatusBadge status={o.purchase_status} />
                        </td>
                        <td className="px-5 py-3.5 text-charcoal-soft">
                          {getDeliveryMethodLabel(o.delivery_method)}
                          {o.delivery_area && <span className="block text-xs">{o.delivery_area}</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-black/5">
                {filtered.map((o) => (
                  <Link key={o.id} to={`/orders/${o.id}`} className="block px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal truncate">{o.customer?.name ?? '—'}</p>
                        <p className="text-xs text-charcoal-soft">
                          {o.invoice_number} · {new Date(o.order_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <PaymentStatusBadge status={o.payment_status} withType />
                      <PurchaseStatusBadge status={o.purchase_status} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-charcoal-soft">
                        {formatIDR(o.paid_amount ?? 0)} / {formatIDR(o.grand_total)} · {getDeliveryMethodLabel(o.delivery_method)}
                      </span>
                      <span className="text-sm font-medium text-charcoal">{formatIDR(o.grand_total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} template={formTemplate} />

      <ConfirmDialog
        open={Boolean(purchaseTarget)}
        onClose={() => setPurchaseTarget(null)}
        onConfirm={handleConfirmPurchase}
        title="Mark this order as purchased?"
        message={`${purchaseTarget?.invoice_number ?? ''} — ${purchaseTarget?.customer?.name ?? ''}. Waktu pembelian dicatat sekarang; data pembayaran tidak berubah.`}
        confirmLabel="Confirm Purchase"
        loading={purchasing}
      />
    </div>
  )
}
