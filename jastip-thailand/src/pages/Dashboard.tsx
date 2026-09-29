import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, CheckCircle2, Wallet, Percent, Truck, Boxes, BadgeCheck, Hourglass, CreditCard, ShoppingCart, PackageCheck } from 'lucide-react'
import { Card, PageLoader, StatusBadge } from '../components/ui'
import { getDashboardStats, getRecentOrders, type DashboardStats, type OrderListItem } from '../services/orders'
import { formatIDR } from '../utils/currency'
import { ORDER_STATUS_LABELS } from '../types'
import { useToast } from '../components/ToastProvider'

function StatCard({ icon: Icon, label, value, tone = 'charcoal' }: { icon: React.ElementType; label: string; value: string; tone?: 'charcoal' | 'gold' | 'jade' }) {
  const toneClasses = {
    charcoal: 'bg-charcoal/5 text-charcoal',
    gold: 'bg-gold/15 text-gold-dark',
    jade: 'bg-thai-jade/10 text-thai-jade',
  }[tone]
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal-soft">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneClasses}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-charcoal mt-3">{value}</p>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [s, r] = await Promise.all([getDashboardStats(), getRecentOrders(6)])
        if (!active) return
        setStats(s)
        setRecent(r)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load dashboard', 'error')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !stats) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Dashboard</h1>
        <p className="text-sm text-charcoal-soft mt-1">Overview of your jastip business</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Orders" value={String(stats.totalOrders)} />
        <StatCard icon={Clock} label="Pending Orders" value={String(stats.pendingOrders)} tone="gold" />
        <StatCard icon={BadgeCheck} label="Paid Orders" value={String(stats.paidOrders)} tone="jade" />
        <StatCard icon={CheckCircle2} label="Completed Orders" value={String(stats.completedOrders)} tone="jade" />
        <StatCard icon={Wallet} label="Total Revenue" value={formatIDR(stats.totalRevenue)} />
        <StatCard icon={Percent} label="Total Jastip Fee" value={formatIDR(stats.totalJastipFee)} tone="gold" />
        <StatCard icon={Truck} label="Total Delivery Fee" value={formatIDR(stats.totalDeliveryFee)} />
        <StatCard icon={Boxes} label="Total Items" value={String(stats.totalItems)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-charcoal mb-3">Payment &amp; Purchasing</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard icon={Hourglass} label="Belum Bayar" value={String(stats.pendingPayment)} />
          <StatCard icon={CreditCard} label="DP / Belum Lunas" value={String(stats.partialPayment)} tone="gold" />
          <StatCard icon={BadgeCheck} label="Lunas / FP" value={String(stats.paidPayment)} tone="jade" />
          <StatCard icon={ShoppingCart} label="Ready to Purchase" value={String(stats.readyToPurchase)} tone="gold" />
          <StatCard icon={PackageCheck} label="Purchased" value={String(stats.purchased)} tone="jade" />
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-semibold text-charcoal">Recent Orders</h3>
          <Link to="/orders" className="text-sm text-gold-dark hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-charcoal-soft px-5 pb-6">No orders yet. Create your first order to get started.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {recent.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-charcoal/[0.02]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{o.customer?.name ?? 'Unknown customer'}</p>
                  <p className="text-xs text-charcoal-soft">{o.invoice_number}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-charcoal">{formatIDR(o.grand_total)}</span>
                  <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
