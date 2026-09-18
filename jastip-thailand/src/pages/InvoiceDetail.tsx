import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button, PageLoader } from '../components/ui'
import InvoiceView from '../components/InvoiceView'
import { getOrder, type OrderWithDetails } from '../services/orders'
import { getSettings } from '../services/settings'
import type { SettingsRow } from '../types/database'
import { useToast } from '../components/ToastProvider'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState<OrderWithDetails | null>(null)
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const [d, s] = await Promise.all([getOrder(id), getSettings()])
        setData(d)
        setSettings(s)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load invoice', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading || !data || !settings) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-charcoal w-fit">
          <ArrowLeft size={15} /> Back
        </button>
        <Button onClick={() => window.print()}>
          <Printer size={15} /> Print Invoice
        </Button>
      </div>

      <InvoiceView order={data.order} customer={data.customer} items={data.items} settings={settings} />
    </div>
  )
}
