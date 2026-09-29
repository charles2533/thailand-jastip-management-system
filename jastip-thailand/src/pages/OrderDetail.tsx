import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, Copy, Trash2, FileText, MessageCircle, Printer, Plus, ShoppingCart } from 'lucide-react'
import { Button, Card, ConfirmDialog, PageLoader, Select, StatusBadge } from '../components/ui'
import { PaymentStatusBadge, PurchaseStatusBadge } from '../components/badges'
import AddPaymentModal from '../components/AddPaymentModal'
import WhatsAppModal from '../components/WhatsAppModal'
import {
  deleteOrder,
  getOrder,
  markAsPurchased,
  updateOrderItemCategory,
  updateOrderStatus,
  type OrderWithDetails,
} from '../services/orders'
import { deletePayment, listPayments } from '../services/payments'
import { getSettings } from '../services/settings'
import { formatIDR, formatTHB } from '../utils/currency'
import { shortOrderId } from '../utils/invoice'
import { isReadyToPurchase } from '../utils/payment'
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER } from '../types'
import type { OrderStatus, PaymentRow, ProductCategory, SettingsRow } from '../types/database'
import { useToast } from '../components/ToastProvider'
import { getDeliveryMethodLabel } from '../config/delivery'
import { PRODUCT_CATEGORIES, getCategoryLabel } from '../config/categories'
import { PAYMENT_ENTRY_LABELS, PAYMENT_TYPE_LABELS } from '../config/payment'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState<OrderWithDetails | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRow | null>(null)
  const [deletingPayment, setDeletingPayment] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  async function load() {
    if (!id) return
    try {
      const [d, s, p] = await Promise.all([getOrder(id), getSettings(), listPayments(id)])
      setData(d)
      setSettings(s)
      setPayments(p)
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

  async function handleConfirmPurchase() {
    if (!id) return
    setPurchasing(true)
    try {
      await markAsPurchased(id)
      showToast('Order marked as purchased.')
      setPurchaseOpen(false)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mark as purchased', 'error')
    } finally {
      setPurchasing(false)
    }
  }

  async function handleDeletePayment() {
    if (!id || !paymentToDelete) return
    setDeletingPayment(true)
    try {
      await deletePayment(id, paymentToDelete.id)
      showToast('Payment removed')
      setPaymentToDelete(null)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove payment', 'error')
    } finally {
      setDeletingPayment(false)
    }
  }

  async function handleCategoryChange(itemId: string, category: ProductCategory) {
    setData((prev) => (prev ? { ...prev, items: prev.items.map((it) => (it.id === itemId ? { ...it, category } : it)) } : prev))
    try {
      await updateOrderItemCategory(itemId, category)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update category', 'error')
      load()
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
            category: it.category ?? 'other',
            variant: it.variant ?? '',
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
  const readyToPurchase = isReadyToPurchase(order)
  const paidPercent = order.grand_total > 0 ? Math.min(100, Math.round(((order.paid_amount ?? 0) / order.grand_total) * 100)) : 0

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-charcoal w-fit no-print">
        <ArrowLeft size={15} /> Back to Orders
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-charcoal">{order.invoice_number}</h1>
            <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
            <PaymentStatusBadge status={order.payment_status} withType />
            <PurchaseStatusBadge status={order.purchase_status} />
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
                    {item.variant && <p className="text-xs text-charcoal-soft mt-0.5">Varian: {item.variant}</p>}
                    {item.product_link && (
                      <a href={item.product_link} target="_blank" rel="noreferrer" className="text-xs text-gold-dark hover:underline break-all">
                        {item.product_link}
                      </a>
                    )}
                    <p className="text-xs text-charcoal-soft mt-1">
                      {formatTHB(item.price_thb)} × {item.quantity} · {formatIDR(item.price_idr)}/item + {formatIDR(item.fee_per_item)} fee
                    </p>
                    {item.notes && <p className="text-xs text-charcoal-soft mt-1 italic">{item.notes}</p>}
                    <label className="mt-2 flex items-center gap-2 text-xs text-charcoal-soft no-print">
                      Category
                      <select
                        value={item.category ?? 'other'}
                        onChange={(e) => handleCategoryChange(item.id, e.target.value as ProductCategory)}
                        className="rounded-lg border border-charcoal/15 bg-white px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50"
                        aria-label={`Category for ${item.product_name} (${getCategoryLabel(item.category)})`}
                      >
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
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
            <h3 className="font-semibold text-charcoal mb-3">Order Status</h3>
            <Select value={order.status} onChange={(e) => handleStatusChange(e.target.value as OrderStatus)} disabled={statusSaving}>
              {ORDER_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-charcoal">Payment Information</h3>
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Plus size={14} /> Add Payment
              </Button>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Payment Type" value={PAYMENT_TYPE_LABELS[order.payment_type] ?? '-'} />
              <div className="flex items-center justify-between">
                <span className="text-charcoal-soft">Payment Status</span>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
              <Row label="Grand Total" value={formatIDR(order.grand_total)} />
              <Row label="Paid Amount" value={formatIDR(order.paid_amount ?? 0)} />
              <Row label="Remaining" value={formatIDR(order.remaining_amount ?? 0)} bold />
            </div>
            <div className="mt-3 h-2 rounded-full bg-charcoal/5 overflow-hidden" aria-hidden="true">
              <div className="h-full bg-thai-jade transition-all" style={{ width: `${paidPercent}%` }} />
            </div>

            <div className="mt-4 pt-4 border-t border-black/5">
              <p className="text-xs uppercase tracking-wide text-charcoal-soft mb-2">Payment History</p>
              {payments.length === 0 ? (
                <p className="text-sm text-charcoal-soft">Belum ada pembayaran tercatat.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {payments.map((p, idx) => (
                    <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-charcoal">
                          Payment #{idx + 1} · {PAYMENT_ENTRY_LABELS[p.payment_type]}
                        </p>
                        <p className="text-xs text-charcoal-soft">
                          {new Date(p.paid_at).toLocaleDateString('id-ID')}
                          {p.payment_method ? ` · ${p.payment_method}` : ''}
                        </p>
                        {p.notes && <p className="text-xs text-charcoal-soft italic">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-medium ${p.payment_type === 'refund' ? 'text-red-600' : 'text-charcoal'}`}>
                          {p.payment_type === 'refund' ? '−' : ''}
                          {formatIDR(p.amount)}
                        </span>
                        <button onClick={() => setPaymentToDelete(p)} className="text-charcoal-soft hover:text-red-500" aria-label="Remove payment">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Purchase</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-charcoal-soft">Purchase Status</span>
              <PurchaseStatusBadge status={order.purchase_status} />
            </div>
            {order.purchased_at && (
              <p className="text-xs text-charcoal-soft mt-2">
                Dibeli pada{' '}
                {new Date(order.purchased_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {readyToPurchase && (
              <Button className="w-full mt-4" onClick={() => setPurchaseOpen(true)}>
                <ShoppingCart size={15} /> Mark as Purchased
              </Button>
            )}
            {order.purchase_status === 'not_purchased' && order.payment_status !== 'paid' && (
              <p className="text-xs text-charcoal-soft mt-3">Order masuk Ready to Purchase setelah pembayaran Lunas.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-charcoal mb-3">Pricing Snapshot</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Base Rate" value={formatIDR(order.base_exchange_rate)} />
              <Row label="Margin" value={`${order.currency_margin}%`} />
              <Row label="Applied Rate" value={`${formatIDR(order.applied_exchange_rate)}/฿`} />
              <Row label="Delivery Method" value={getDeliveryMethodLabel(order.delivery_method)} />
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

      <AddPaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} order={order} payments={payments} onSaved={load} />

      <ConfirmDialog
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onConfirm={handleConfirmPurchase}
        title="Mark this order as purchased?"
        message={`${order.invoice_number} — ${customer.name}. Waktu pembelian dicatat sekarang; data pembayaran tidak berubah.`}
        confirmLabel="Confirm Purchase"
        loading={purchasing}
      />

      <ConfirmDialog
        open={Boolean(paymentToDelete)}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeletePayment}
        title="Remove this payment?"
        message={`${paymentToDelete ? PAYMENT_ENTRY_LABELS[paymentToDelete.payment_type] : ''} ${paymentToDelete ? formatIDR(paymentToDelete.amount) : ''} akan dihapus dan status pembayaran dihitung ulang.`}
        confirmLabel="Remove"
        danger
        loading={deletingPayment}
      />

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
