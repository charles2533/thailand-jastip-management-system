import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, Copy, Trash2, FileText, MessageCircle, Printer } from 'lucide-react'
import { Button, Card, ConfirmDialog, PageLoader, Select, StatusBadge } from '../components/ui'
import { deleteOrder, getOrder, updateOrderStatus, type OrderWithDetails } from '../services/orders'
import { getSettings } from '../services/settings'
import { formatIDR, formatTHB } from '../utils/currency'
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER } from '../types'
import type { OrderStatus, SettingsRow } from '../types/database'
import { useToast } from '../components/ToastProvider'
import WhatsAppModal from '../components/WhatsAppModal'
import { shortOrderId } from '../utils/invoice'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState<OrderWithDetails | null>(null)
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  async function load() {
    if (!id) return
    try {
      const [d, s] = await Promise.all([getOrder(id), getSettings()])
      setData(d)
      setSettings(s)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load order', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!id) return
    setStatusSaving(true)
    try {
      await updateOrderStatus(id, newStatus)
      showToast('Status updated')
      load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error')
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteOrder(id)
      showToast('Order deleted')
      navigate('/orders')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete order', 'error')
      setDeleting(false)
    }
  }

  function handleDuplicate() {
    if (!data) return
    navigate('/orders/new', {
      state: {
        duplicateFrom: {
          customer: data.customer,
          notes: data.order.notes ?? '',
          items: data.items.map((it) => ({
            tempId: Math.random().toString(36).slice(2),
            product_name: it.product_name,
            product_link: it.product_link ?? '',
            quantity: it.quantity,
            price_thb: it.price_thb,
            notes: it.notes ?? '',
          })),
        },
      },
    })
  }

  if (loading || !data || !settings) return <PageLoader />

  const { order, customer, items } = data

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-charcoal w-fit no-print">
        <ArrowLeft size={15} /> Back to Orders
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-charcoal">{order.invoice_number}</h1>
            <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
          </div>
          <p className="text-sm text-charcoal-soft mt-1">
            Order #{shortOrderId(order.id)} · {new Date(order.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setWaOpen(true)}>
            <MessageCircle size={14} /> WhatsApp Message
          </Button>
          <Link to={`/invoices/${order.id}`}>
            <Button variant="outline" size="sm">
              <FileText size={14} /> View Invoice
            </Button>
          </Link>
          <Link to={`/orders/${order.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit2 size={14} /> Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy size={14} /> Duplicate
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <div className="px-5 pt-5 pb-3">
              <h3 className="font-semibold text-charcoal">Products</h3>
            </div>
            <div className="divide-y divide-black/5">
              {items.map((item) => (
                <div key={item.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal">{item.product_name}</p>
                    {item.product_link && (
                      <a href={item.product_link} target="_blank" rel="noreferrer" className="text-xs text-gold-dark hover:underline break-all">
                        {item.product_link}
                      </a>
                    )}
                    <p className="text-xs text-charcoal-soft mt-1">
                      {formatTHB(item.price_thb)} × {item.quantity} · {formatIDR(item.price_idr)}/item + {formatIDR(item.fee_per_item)} fee
                    </p>
                    {item.notes && <p className="text-xs text-charcoal-soft mt-1 italic">{item.notes}</p>}
                  </div>
                  <span className="text-sm font-medium text-charcoal shrink-0">{formatIDR(item.total)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Customer</h3>
            <Link to={`/customers/${customer.id}`} className="text-sm font-medium text-charcoal hover:underline">
              {customer.name}
            </Link>
            <p className="text-sm text-charcoal-soft mt-0.5">{customer.phone}</p>
            <p className="text-sm text-charcoal-soft mt-1">{customer.address}</p>
            {order.notes && (
              <div className="mt-4 pt-4 border-t border-black/5">
                <p className="text-xs uppercase tracking-wide text-charcoal-soft mb-1">Order Notes</p>
                <p className="text-sm text-charcoal-soft">{order.notes}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Status</h3>
            <Select value={order.status} onChange={(e) => handleStatusChange(e.target.value as OrderStatus)} disabled={statusSaving}>
              {ORDER_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Pricing Snapshot</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Base Rate" value={formatIDR(order.base_exchange_rate)} />
              <Row label="Margin" value={`${order.currency_margin}%`} />
              <Row label="Applied Rate" value={`${formatIDR(order.applied_exchange_rate)}/฿`} />
              <Row label="Delivery Area" value={order.delivery_area ?? '—'} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Order Total</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Subtotal" value={formatIDR(order.subtotal)} />
              <Row label="Jastip Fee" value={formatIDR(order.total_fee)} />
              <Row label="Delivery Fee" value={formatIDR(order.delivery_fee)} />
              <div className="border-t border-black/5 my-1" />
              <Row label="Grand Total" value={formatIDR(order.grand_total)} bold />
            </div>
            <Link to={`/invoices/${order.id}`}>
              <Button variant="outline" className="w-full mt-4">
                <Printer size={15} /> Print Invoice
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <WhatsAppModal open={waOpen} onClose={() => setWaOpen(false)} order={order} customer={customer} items={items} template={settings.whatsapp_template} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this order?"
        message={`This will permanently delete order ${order.invoice_number}. This cannot be undone.`}
        confirmLabel="Delete Order"
        danger
        loading={deleting}
      />
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
