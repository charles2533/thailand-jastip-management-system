import React, { useMemo } from 'react'
import { Copy, Send } from 'lucide-react'
import { Button, Modal } from './ui'
import { generateWhatsAppMessage, copyToClipboard, buildWhatsAppLink } from '../utils/whatsapp'
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

  function handleOpenInWhatsApp() {
    const link = buildWhatsAppLink(customer.phone, message)
    window.open(link, '_blank', 'noopener,noreferrer')
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
          <Button variant="outline" onClick={handleCopy}>
            <Copy size={15} /> Copy Message
          </Button>
          <Button onClick={handleOpenInWhatsApp}>
            <Send size={15} /> Open in WhatsApp
          </Button>
        </>
      }
    >
      <div className="bg-offwhite border border-charcoal/10 rounded-xl p-4 whitespace-pre-wrap text-sm text-charcoal max-h-96 overflow-y-auto">
        {message}
      </div>
      <p className="text-xs text-charcoal-soft mt-3">
        "Open in WhatsApp" opens the chat with {customer.name} and the message already typed in — you still tap Send yourself. Nothing is sent automatically.
      </p>
    </Modal>
  )
}