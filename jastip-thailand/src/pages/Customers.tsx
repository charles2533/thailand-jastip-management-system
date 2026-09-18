import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { Button, Card, EmptyState, Input, Modal, PageLoader, TextArea } from '../components/ui'
import { createCustomer, listCustomers, type CustomerWithStats } from '../services/customers'
import { formatIDR } from '../utils/currency'
import { useToast } from '../components/ToastProvider'
import { listDeliveryZones } from '../services/deliveryZones'
import type { DeliveryZoneRow } from '../types/database'

interface NewCustomerForm {
  name: string
  phone: string
  address: string
  city: string
  delivery_area: string
  postal_code: string
  notes: string
}

const EMPTY_FORM: NewCustomerForm = { name: '', phone: '', address: '', city: '', delivery_area: '', postal_code: '', notes: '' }

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NewCustomerForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof NewCustomerForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function load() {
    try {
      const [c, z] = await Promise.all([listCustomers(), listDeliveryZones()])
      setCustomers(c)
      setZones(z)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load customers', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.trim().toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
  }, [customers, search])

  function validate(): boolean {
    const e: Partial<Record<keyof NewCustomerForm, string>> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone is required'
    if (!form.address.trim()) e.address = 'Address is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate() {
    if (!validate()) return
    setSaving(true)
    try {
      await createCustomer(form)
      showToast('Customer added')
      setModalOpen(false)
      setForm(EMPTY_FORM)
      setErrors({})
      load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save customer', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Customers</h1>
          <p className="text-sm text-charcoal-soft mt-1">{customers.length} customers</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Customer
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft" />
          <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No customers yet" description="Add your first customer to start creating orders." />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-charcoal-soft border-b border-black/5">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium text-right">Orders</th>
                    <th className="px-5 py-3 font-medium text-right">Total Spending</th>
                    <th className="px-5 py-3 font-medium">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-charcoal/[0.02]">
                      <td className="px-5 py-3.5">
                        <Link to={`/customers/${c.id}`} className="font-medium text-charcoal hover:underline">
                          {c.name}
                        </Link>
                        <p className="text-xs text-charcoal-soft">{c.delivery_area ?? c.city ?? ''}</p>
                      </td>
                      <td className="px-5 py-3.5 text-charcoal-soft">{c.phone}</td>
                      <td className="px-5 py-3.5 text-right text-charcoal">{c.order_count}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-charcoal">{formatIDR(c.total_spending)}</td>
                      <td className="px-5 py-3.5 text-charcoal-soft">
                        {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('id-ID') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-black/5">
              {filtered.map((c) => (
                <Link key={c.id} to={`/customers/${c.id}`} className="block px-4 py-3.5">
                  <p className="font-medium text-charcoal">{c.name}</p>
                  <p className="text-xs text-charcoal-soft">{c.phone}</p>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-charcoal-soft">{c.order_count} orders</span>
                    <span className="font-medium text-charcoal">{formatIDR(c.total_spending)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Save Customer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Input label="WhatsApp / Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
          <TextArea label="Full Address *" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={errors.address} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Postal Code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-charcoal mb-1.5">Delivery Area</span>
            <select
              className="w-full rounded-xl border border-charcoal/15 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              value={form.delivery_area}
              onChange={(e) => setForm({ ...form, delivery_area: e.target.value })}
            >
              <option value="">Select area...</option>
              {zones.map((z) => (
                <option key={z.id} value={z.name}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <TextArea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}
