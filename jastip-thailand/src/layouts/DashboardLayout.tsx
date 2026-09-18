import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Users, Calculator, FileText, Settings as SettingsIcon, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/calculator', label: 'Calculator', icon: Calculator },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-charcoal text-offwhite' : 'text-charcoal-soft hover:bg-charcoal/5 hover:text-charcoal'
            }`
          }
        >
          <item.icon size={18} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-offwhite flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-black/5 bg-white px-4 py-6">
        <div className="px-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-charcoal text-gold flex items-center justify-center font-bold">฿</div>
            <div>
              <p className="font-semibold text-charcoal leading-tight text-sm">Jastip Thailand</p>
              <p className="text-xs text-charcoal-soft leading-tight">Admin Dashboard</p>
            </div>
          </div>
        </div>
        <NavItems />
        <div className="mt-auto pt-6 border-t border-black/5">
          <p className="text-xs text-charcoal-soft px-3 mb-2 truncate">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-soft hover:bg-red-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white px-4 py-6 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-charcoal text-gold flex items-center justify-center font-bold">฿</div>
                <p className="font-semibold text-charcoal text-sm">Jastip Thailand</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-charcoal-soft">
                <X size={20} />
              </button>
            </div>
            <NavItems onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto pt-6 border-t border-black/5">
              <p className="text-xs text-charcoal-soft px-3 mb-2 truncate">{user?.email}</p>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-charcoal-soft hover:bg-red-50 hover:text-red-600 w-full"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-black/5 sticky top-0 z-30 no-print">
          <button onClick={() => setDrawerOpen(true)} className="text-charcoal">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-charcoal text-gold flex items-center justify-center font-bold text-sm">฿</div>
            <p className="font-semibold text-charcoal text-sm">Jastip Thailand</p>
          </div>
          <div className="w-[22px]" />
        </header>

        <main className="flex-1 min-w-0 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
