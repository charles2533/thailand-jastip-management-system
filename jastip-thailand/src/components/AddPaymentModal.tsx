import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Select, TextArea } from './ui'
import { PAYMENT_ENTRY_TYPES, PAYMENT_METHODS, PAYMENT_STATUS_LABELS } from '../config/payment'
import { addPayment } from '../services/payments'
import { derivePaymentState, summarizePayments, validatePaymentInput } from '../utils/payment'
import { formatIDR } from '../utils/currency'
import { useToast } from './ToastProvider'
import type { OrderRow, PaymentEntryType, PaymentRow } from '../types/database'

interface AddPaymentModalProps {
  open: boolean
  onClose: () => void
  order: OrderRow
  payments: PaymentRow[]
  onSaved: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AddPaymentModal({ open, onClose, order, payments, onSaved }: AddPaymentModalProps) {
  const { showToast } = useToast()
  const { net } = summarizePayments(payments)
  const remaining = Math.max(0, order.grand_total - net)

  const [entryType, setEntryType] = useState<PaymentEntryType>('fp')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [notes, setNotes] = useState('')
  const [paidDate, setPaidDate] = useState(todayISO())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset the form every time the dialog opens.
  useEffect(() => {
    if (!open) return
    const firstType: PaymentEntryType = payments.length === 0 ? order.payment_type : 'fp'
    setEntryType(firstType)
    setAmount(firstType === 'fp' ? String(remaining) : '')
    setMethod(PAYMENT_METHODS[0])
    setNotes('')
    setPaidDate(todayISO())
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const numericAmount = parseFloat(amount) || 0

  const preview = useMemo(() => {
    if (numericAmount <= 0) return null
    if (validatePaymentInput({ grandTotal: order.grand_total, payments, amount: numericAmount, entryType })) return null
    return derivePaymentState(order.grand_total, [...payments, { amount: numericAmount, payment_type: entryType }], order.payment_type)
  }, [numericAmount, entryType, order, payments])

  function handleTypeChange(next: PaymentEntryType) {
    setEntryType(next)
    setError(null)
    if (next === 'fp' && !amount) setAmount(String(remaining))
  }

  async function handleSubmit() {
    const validationError = validatePaymentInput({ grandTotal: order.grand_total, payments, amount: numericAmount, entryType })
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    try {
      await addPayment(order.id, {
        amount: numericAmount,
        payment_type: entryType,
        payment_method: method,
        notes: notes.trim() || null,
        paid_at: new Date(`${paidDate}T12:00:00`).toISOString(),
      })
      showToast('Payment recorded.')
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Payment"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Save Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-offwhite border border-charcoal/10 p-3 text-sm flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-charcoal-soft">Grand Total</span>
            <span className="font-medium text-charcoal">{formatIDR(order.grand_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-charcoal-soft">Sudah dibayar</span>
            <span className="font-medium text-charcoal">{formatIDR(net)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-charcoal-soft">Sisa</span>
            <span className="font-semibold text-charcoal">{formatIDR(remaining)}</span>
          </div>
        </div>

        <Select label="Payment Type" value={entryType} onChange={(e) => handleTypeChange(e.target.value as PaymentEntryType)}>
          {PAYMENT_ENTRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        <div>
          <Input
            label={entryType === 'refund' ? 'Jumlah Refund (Rp)' : 'Jumlah Pembayaran (Rp)'}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError(null)
            }}
            placeholder="0"
          />
          {entryType !== 'refund' && remaining > 0 && (
            <button type="button" className="text-xs text-gold-dark hover:underline mt-1.5" onClick={() => setAmount(String(remaining))}>
              Isi sisa pembayaran ({formatIDR(remaining)})
            </button>
          )}
          {entryType === 'refund' && net > 0 && (
            <button type="button" className="text-xs text-gold-dark hover:underline mt-1.5" onClick={() => setAmount(String(net))}>
              Refund semua ({formatIDR(net)})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Metode Bayar" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Input label="Tanggal" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
        </div>

        <TextArea label="Catatan" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="text-sm text-red-500">{error}</p>}

        {preview && (
          <div className="rounded-xl border border-charcoal/10 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-charcoal-soft mb-1">Setelah pembayaran ini</p>
            <p className="text-charcoal">
              Status: <span className="font-medium">{PAYMENT_STATUS_LABELS[preview.payment_status]}</span> · Dibayar {formatIDR(preview.paid_amount)} · Sisa{' '}
              {formatIDR(preview.remaining_amount)}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
