import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText, Printer } from 'lucide-react'
import { Button, Card, EmptyState, Input, PageLoader, StatusBadge } from '../components/ui'
import { listOrders, type OrderListItem } from '../services/orders'
import { formatIDR } from '../utils/currency'
import { ORDER_STATUS_LABELS } from '../types'
import { useToast } from '../components/ToastProvider'

export default function Invoices() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const o = await listOrders()
        setOrders(o)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load invoices', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.trim().toLowerCase()
    return orders.filter((o) => o.invoice_number.toLowerCase().includes(q) || (o.customer?.name ?? '').toLowerCase().includes(q))
  }, [orders, search])

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Invoices</h1>
        <p className="text-sm text-charcoal-soft mt-1">{orders.length} invoices generated</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft" />
          <Input placeholder="Search invoice number or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No invoices yet" description="Invoices are generated automatically when you create an order." />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-charcoal-soft border-b border-black/5">
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-charcoal/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-charcoal">{o.invoice_number}</td>
                      <td className="px-5 py-3.5 text-charcoal-soft">{o.customer?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-charcoal-soft">{new Date(o.order_date).toLocaleDateString('id-ID')}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-charcoal">{formatIDR(o.grand_total)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/invoices/${o.id}`}>
                          <Button size="sm" variant="outline">
                            <FileText size={13} /> View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-black/5">
              {filtered.map((o) => (
                <Link key={o.id} to={`/invoices/${o.id}`} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="font-medium text-charcoal text-sm">{o.invoice_number}</p>
                    <p className="text-xs text-charcoal-soft">{o.customer?.name ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-charcoal">{formatIDR(o.grand_total)}</p>
                    <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
