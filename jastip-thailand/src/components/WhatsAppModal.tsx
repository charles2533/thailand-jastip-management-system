import React, { useMemo } from 'react'
import { Copy } from 'lucide-react'
import { Button, Modal } from './ui'
import { generateWhatsAppMessage, copyToClipboard } from '../utils/whatsapp'
import { useToast } from './ToastProvider'
import type { CustomerRow, OrderItemRow, OrderRow } from '../types/database'

interface WhatsAppModalProps {
  open: boolean
  onClose: () => void
  order: OrderRow
  customer: CustomerRow
  items: OrderItemRow[]
  template: string
}

export default function WhatsAppModal({ open, onClose, order, customer, items, template }: WhatsAppModalProps) {
  const { showToast } = useToast()
  const message = useMemo(() => generateWhatsAppMessage(template, order, customer, items), [template, order, customer, items])

  async function handleCopy() {
    const ok = await copyToClipboard(message)
    if (ok) {
      showToast('Message copied!')
    } else {
      showToast('Could not copy automatically — please select and copy manually', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="WhatsApp Message"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            <Copy size={15} /> Copy Message
          </Button>
        </>
      }
    >
      <div className="bg-offwhite border border-charcoal/10 rounded-xl p-4 whitespace-pre-wrap text-sm text-charcoal max-h-96 overflow-y-auto">
        {message}
      </div>
      <p className="text-xs text-charcoal-soft mt-3">
        This only copies the message — open WhatsApp yourself and paste it to send.
      </p>
    </Modal>
  )
}
