import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2 } from 'lucide-react'
import { Button, Card, Input, Modal, PageLoader, StatusBadge, TextArea } from '../components/ui'
import { getCustomer, updateCustomer, type CustomerInput } from '../services/customers'
import { listOrders, type OrderListItem } from '../services/orders'
import { formatIDR } from '../utils/currency'
import { ORDER_STATUS_LABELS } from '../types'
import type { CustomerRow } from '../types/database'
import { useToast } from '../components/ToastProvider'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [customer, setCustomer] = useState<CustomerRow | null>(null)
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<CustomerInput | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!id) return
    try {
      const [c, allOrders] = await Promise.all([getCustomer(id), listOrders()])
      setCustomer(c)
      setOrders(allOrders.filter((o) => o.customer?.id === id))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load customer', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openEdit() {
    if (!customer) return
    const { id: _id, created_at: _created, ...rest } = customer
    setForm(rest)
    setEditOpen(true)
  }

  async function handleSave() {
    if (!customer || !form) return
    setSaving(true)
    try {
      await updateCustomer(customer.id, form)
      showToast('Customer updated')
      setEditOpen(false)
      load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update customer', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !customer) return <PageLoader />

  const totalSpending = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.grand_total, 0)
  const activeOrders = orders.filter((o) => o.status !== 'cancelled')

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-charcoal w-fit">
        <ArrowLeft size={15} /> Back to Customers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 h-fit">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-charcoal">{customer.name}</h1>
              <p className="text-sm text-charcoal-soft mt-0.5">{customer.phone}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Edit2 size={14} />
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-3 text-sm">
            <div>
              <p className="text-charcoal-soft text-xs uppercase tracking-wide mb-1">Address</p>
              <p className="text-charcoal">{customer.address}</p>
            </div>
            {customer.city && (
              <div>
                <p className="text-charcoal-soft text-xs uppercase tracking-wide mb-1">City</p>
                <p className="text-charcoal">{customer.city}</p>
              </div>
            )}
            {customer.delivery_area && (
              <div>
                <p className="text-charcoal-soft text-xs uppercase tracking-wide mb-1">Delivery Area</p>
                <p className="text-charcoal">{customer.delivery_area}</p>
              </div>
            )}
            {customer.postal_code && (
              <div>
                <p className="text-charcoal-soft text-xs uppercase tracking-wide mb-1">Postal Code</p>
                <p className="text-charcoal">{customer.postal_code}</p>
              </div>
            )}
            {customer.notes && (
              <div>
                <p className="text-charcoal-soft text-xs uppercase tracking-wide mb-1">Notes</p>
                <p className="text-charcoal">{customer.notes}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-black/5">
            <div>
              <p className="text-charcoal-soft text-xs">Total Orders</p>
              <p className="text-lg font-semibold text-charcoal">{activeOrders.length}</p>
            </div>
            <div>
              <p className="text-charcoal-soft text-xs">Total Spending</p>
              <p className="text-lg font-semibold text-charcoal">{formatIDR(totalSpending)}</p>
            </div>
          </div>

          <Link to={`/orders/new?customer=${customer.id}`}>
            <Button className="w-full mt-5">
              <Plus size={16} /> New Order for {customer.name.split(' ')[0]}
            </Button>
          </Link>
        </Card>

        <Card className="lg:col-span-2">
          <div className="px-5 pt-5 pb-3">
            <h3 className="font-semibold text-charcoal">Order History</h3>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-charcoal-soft px-5 pb-6">No orders yet for this customer.</p>
          ) : (
            <div className="divide-y divide-black/5">
              {orders.map((o) => (
                <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-charcoal/[0.02]">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{o.invoice_number}</p>
                    <p className="text-xs text-charcoal-soft">{new Date(o.order_date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-charcoal">{formatIDR(o.grand_total)}</span>
                    <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {form && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Customer"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextArea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <Input label="Postal Code" value={form.postal_code ?? ''} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            </div>
            <Input label="Delivery Area" value={form.delivery_area ?? ''} onChange={(e) => setForm({ ...form, delivery_area: e.target.value })} />
            <TextArea label="Notes" rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  )
}
