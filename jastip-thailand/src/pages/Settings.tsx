import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Check, X as XIcon } from 'lucide-react'
import { Button, Card, ConfirmDialog, Input, Modal, PageLoader, Select, TextArea } from '../components/ui'
import { getSettings, updateSettings } from '../services/settings'
import { createDeliveryZone, deleteDeliveryZone, listDeliveryZones, updateDeliveryZone } from '../services/deliveryZones'
import { calculateAppliedExchangeRate, ROUNDING_RULES } from '../utils/pricing'
import { formatIDR } from '../utils/currency'
import { WHATSAPP_TEMPLATE_VARIABLES, generateWhatsAppMessage } from '../utils/whatsapp'
import type { DeliveryZoneRow, FeeConfiguration, FeeTier, SettingsRow } from '../types/database'
import { useToast } from '../components/ToastProvider'

const TABS = ['Business', 'Currency', 'Jastip Fee', 'Delivery', 'WhatsApp Template'] as const
type Tab = (typeof TABS)[number]

export default function Settings() {
  const [tab, setTab] = useState<Tab>('Business')
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  async function load() {
    try {
      const [s, z] = await Promise.all([getSettings(), listDeliveryZones()])
      setSettings(s)
      setZones(z)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !settings) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Settings</h1>
        <p className="text-sm text-charcoal-soft mt-1">Configure business info, pricing rules, and templates</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-charcoal text-offwhite' : 'bg-white text-charcoal-soft border border-black/5 hover:text-charcoal'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Business' && <BusinessTab settings={settings} onSaved={setSettings} />}
      {tab === 'Currency' && <CurrencyTab settings={settings} onSaved={setSettings} />}
      {tab === 'Jastip Fee' && <JastipFeeTab settings={settings} onSaved={setSettings} />}
      {tab === 'Delivery' && <DeliveryTab zones={zones} onReload={load} />}
      {tab === 'WhatsApp Template' && <WhatsAppTab settings={settings} onSaved={setSettings} />}
    </div>
  )
}

/* ---------------- Business ---------------- */

function BusinessTab({ settings, onSaved }: { settings: SettingsRow; onSaved: (s: SettingsRow) => void }) {
  const [form, setForm] = useState({
    business_name: settings.business_name,
    logo: settings.logo ?? '',
    whatsapp: settings.whatsapp ?? '',
    instagram: settings.instagram ?? '',
    address: settings.address ?? '',
  })
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function save() {
    setSaving(true)
    try {
      const updated = await updateSettings(settings.id, form)
      onSaved(updated)
      showToast('Business settings saved')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 max-w-xl">
      <div className="flex flex-col gap-3">
        <Input label="Business Name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        <Input label="Logo URL" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
        <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        <Input label="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
        <TextArea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Button className="w-fit mt-2" onClick={save} loading={saving}>
          Save Business Settings
        </Button>
      </div>
    </Card>
  )
}

/* ---------------- Currency ---------------- */

function CurrencyTab({ settings, onSaved }: { settings: SettingsRow; onSaved: (s: SettingsRow) => void }) {
  const [baseRate, setBaseRate] = useState(settings.base_exchange_rate)
  const [margin, setMargin] = useState(settings.currency_margin)
  const [roundingRule, setRoundingRule] = useState(settings.rounding_rule)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const calculatedRate = baseRate * (1 + margin / 100)
  const finalRate = calculateAppliedExchangeRate(baseRate, margin, roundingRule)

  async function save() {
    setSaving(true)
    try {
      const updated = await updateSettings(settings.id, { base_exchange_rate: baseRate, currency_margin: margin, rounding_rule: roundingRule })
      onSaved(updated)
      showToast('Currency settings saved. New orders will use this rate.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3">
          <Input label="Base THB/IDR Rate" type="number" value={baseRate} onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)} />
          <Input label="Currency Margin (%)" type="number" step="0.1" value={margin} onChange={(e) => setMargin(parseFloat(e.target.value) || 0)} />
          <Select label="Rounding Rule" value={roundingRule} onChange={(e) => setRoundingRule(e.target.value)}>
            {ROUNDING_RULES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Button className="w-fit mt-2" onClick={save} loading={saving}>
            Save Currency Settings
          </Button>
        </div>
      </Card>

      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-charcoal mb-4">Live Preview</h3>
        <div className="flex flex-col gap-3 text-sm">
          <PreviewRow label="Base Rate" value={formatIDR(baseRate)} />
          <PreviewRow label="Margin" value={`${margin}%`} />
          <PreviewRow label="Calculated Rate" value={formatIDR(calculatedRate)} />
          <div className="border-t border-black/5 my-1" />
          <PreviewRow label="Final Jastip Rate" value={`${formatIDR(finalRate)} / ฿`} bold />
        </div>
        <p className="text-xs text-charcoal-soft mt-4 leading-relaxed">
          Formula: jastipRate = baseRate × (1 + margin / 100), rounded to the selected rounding rule. Existing orders keep the
          rate that was applied when they were created.
        </p>
      </Card>
    </div>
  )
}

function PreviewRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-charcoal-soft">{label}</span>
      <span className={bold ? 'text-charcoal font-semibold text-base' : 'text-charcoal font-medium'}>{value}</span>
    </div>
  )
}

/* ---------------- Jastip Fee ---------------- */

function JastipFeeTab({ settings, onSaved }: { settings: SettingsRow; onSaved: (s: SettingsRow) => void }) {
  const [tiers, setTiers] = useState<FeeTier[]>(settings.fee_configuration.tiers)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  function updateTier(idx: number, patch: Partial<FeeTier>) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  async function save() {
    setSaving(true)
    try {
      const feeConfig: FeeConfiguration = { tiers }
      const updated = await updateSettings(settings.id, { fee_configuration: feeConfig })
      onSaved(updated)
      showToast('Jastip fee settings saved')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 max-w-2xl">
      <p className="text-sm text-charcoal-soft mb-4">Fee is applied per item, based on the item's price in IDR after conversion.</p>
      <div className="flex flex-col gap-3">
        {tiers.map((tier, idx) => (
          <div key={idx} className="border border-charcoal/10 rounded-xl p-4">
            <p className="text-xs font-medium text-charcoal-soft mb-3">{tier.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Upper Bound (IDR)"
                type="number"
                value={tier.maxIdr ?? ''}
                disabled={tier.maxIdr === null}
                placeholder={tier.maxIdr === null ? 'No limit' : ''}
                onChange={(e) => updateTier(idx, { maxIdr: parseFloat(e.target.value) || 0 })}
              />
              {typeof tier.percent === 'number' ? (
                <Input label="Fee (%)" type="number" step="0.1" value={tier.percent} onChange={(e) => updateTier(idx, { percent: parseFloat(e.target.value) || 0 })} />
              ) : (
                <Input label="Fee (Rp / item)" type="number" value={tier.fee ?? 0} onChange={(e) => updateTier(idx, { fee: parseFloat(e.target.value) || 0 })} />
              )}
            </div>
          </div>
        ))}
        <Button className="w-fit mt-2" onClick={save} loading={saving}>
          Save Fee Settings
        </Button>
      </div>
    </Card>
  )
}

/* ---------------- Delivery ---------------- */

function DeliveryTab({ zones, onReload }: { zones: DeliveryZoneRow[]; onReload: () => void }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DeliveryZoneRow | null>(null)
  const [form, setForm] = useState({ name: '', fee: 0, active: true })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZoneRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useToast()

  function openCreate() {
    setEditing(null)
    setForm({ name: '', fee: 0, active: true })
    setModalOpen(true)
  }

  function openEdit(zone: DeliveryZoneRow) {
    setEditing(zone)
    setForm({ name: zone.name, fee: zone.fee, active: zone.active })
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) {
      showToast('Zone name is required', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateDeliveryZone(editing.id, form)
        showToast('Delivery zone updated')
      } else {
        await createDeliveryZone(form)
        showToast('Delivery zone added')
      }
      setModalOpen(false)
      onReload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save zone', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(zone: DeliveryZoneRow) {
    try {
      await updateDeliveryZone(zone.id, { active: !zone.active })
      onReload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update zone', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDeliveryZone(deleteTarget.id)
      showToast('Delivery zone deleted')
      setDeleteTarget(null)
      onReload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete zone', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="font-semibold text-charcoal">Delivery Zones</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Add Zone
        </Button>
      </div>
      <div className="divide-y divide-black/5">
        {zones.map((zone) => (
          <div key={zone.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className={`text-sm font-medium ${zone.active ? 'text-charcoal' : 'text-charcoal-soft line-through'}`}>{zone.name}</p>
              <p className="text-xs text-charcoal-soft">{formatIDR(zone.fee)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleActive(zone)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${zone.active ? 'bg-thai-jade/10 text-thai-jade' : 'bg-charcoal/5 text-charcoal-soft'}`}
              >
                {zone.active ? <Check size={12} className="inline mr-1" /> : <XIcon size={12} className="inline mr-1" />}
                {zone.active ? 'Active' : 'Disabled'}
              </button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(zone)}>
                <Edit2 size={13} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(zone)}>
                <Trash2 size={13} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Zone Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Fee (Rp)" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: parseFloat(e.target.value) || 0 })} />
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete delivery zone?"
        message={`"${deleteTarget?.name}" will be removed. Existing orders keep their saved delivery fee.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </Card>
  )
}

/* ---------------- WhatsApp Template ---------------- */

function WhatsAppTab({ settings, onSaved }: { settings: SettingsRow; onSaved: (s: SettingsRow) => void }) {
  const [template, setTemplate] = useState(settings.whatsapp_template)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const sampleOrder = {
    invoice_number: 'INV-2026-001',
    order_date: new Date().toISOString(),
    subtotal: 240000,
    total_fee: 45000,
    delivery_fee: 15000,
    grand_total: 300000,
    delivery_area: 'Surabaya area lainnya',
    applied_exchange_rate: settings.base_exchange_rate,
  } as any
  const sampleCustomer = { name: 'Kak Dewi', address: 'Jl. Contoh No. 1, Surabaya', phone: '08123456789' } as any
  const sampleItems = [{ id: '1', product_name: 'Thai skincare set', quantity: 2, total: 240000 }] as any

  const preview = generateWhatsAppMessage(template, sampleOrder, sampleCustomer, sampleItems)

  async function save() {
    setSaving(true)
    try {
      const updated = await updateSettings(settings.id, { whatsapp_template: template })
      onSaved(updated)
      showToast('WhatsApp template saved')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <TextArea label="Message Template" rows={14} value={template} onChange={(e) => setTemplate(e.target.value)} className="font-mono text-xs" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {WHATSAPP_TEMPLATE_VARIABLES.map((v) => (
            <span key={v} className="text-xs bg-charcoal/5 text-charcoal-soft px-2 py-1 rounded-md font-mono">
              {v}
            </span>
          ))}
        </div>
        <Button className="w-fit mt-4" onClick={save} loading={saving}>
          Save Template
        </Button>
      </Card>
      <Card className="p-5 h-fit">
        <h3 className="font-semibold text-charcoal mb-3">Preview (sample data)</h3>
        <div className="bg-offwhite border border-charcoal/10 rounded-xl p-4 whitespace-pre-wrap text-sm text-charcoal">{preview}</div>
      </Card>
    </div>
  )
}
