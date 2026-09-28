import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { Button, Card, EmptyState, Input, PageLoader, Select, StatusBadge } from '../components/ui'
import { listOrders, type OrderListItem } from '../services/orders'
import { listDeliveryZones } from '../services/deliveryZones'
import { formatIDR } from '../utils/currency'
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER } from '../types'
import type { DeliveryZoneRow } from '../types/database'
import { useToast } from '../components/ToastProvider'
import { shortOrderId } from '../utils/invoice'
import { getSettings } from '../services/settings'
import CustomerFormModal from '../components/CustomerFormModal'
import { DEFAULT_CUSTOMER_FORM_TEMPLATE } from '../config/customerForm'
import { getDeliveryMethodLabel } from '../config/delivery'

export default function Orders() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [area, setArea] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [formTemplate, setFormTemplate] = useState(DEFAULT_CUSTOMER_FORM_TEMPLATE)
  const { showToast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const [o, z, s] = await Promise.all([listOrders(), listDeliveryZones(), getSettings()])
        setOrders(o)
        setZones(z)
        setFormTemplate(s.customer_form_template || DEFAULT_CUSTOMER_FORM_TEMPLATE)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load orders', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
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
    })
  }, [orders, search, status, area])

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

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft" />
            <Input
              placeholder="Search customer, phone, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Delivery</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-charcoal/[0.02] cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                      <td className="px-5 py-3.5">
                        <Link to={`/orders/${o.id}`} className="font-medium text-charcoal hover:underline">
                          {o.invoice_number}
                        </Link>
                        <p className="text-xs text-charcoal-soft">#{shortOrderId(o.id)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-charcoal">{o.customer?.name ?? '—'}</p>
                        <p className="text-xs text-charcoal-soft">{o.customer?.phone}</p>
                      </td>
                      <td className="px-5 py-3.5 text-charcoal-soft">{new Date(o.order_date).toLocaleDateString('id-ID')}</td>
                      <td className="px-5 py-3.5 text-charcoal-soft">
                        {getDeliveryMethodLabel(o.delivery_method)}
                        {o.delivery_area && <span className="block text-xs">{o.delivery_area}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-charcoal">{formatIDR(o.grand_total)}</td>
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
                      <p className="text-xs text-charcoal-soft">{o.invoice_number}</p>
                    </div>
                    <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-charcoal-soft">{new Date(o.order_date).toLocaleDateString('id-ID')} · {getDeliveryMethodLabel(o.delivery_method)}</span>
                    <span className="text-sm font-medium text-charcoal">{formatIDR(o.grand_total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} template={formTemplate} />
    </div>
  )
}
