import React from 'react'
import { Copy } from 'lucide-react'
import { Button, Modal } from './ui'
import { copyToClipboard } from '../utils/whatsapp'
import { useToast } from './ToastProvider'

interface CustomerFormModalProps {
  open: boolean
  onClose: () => void
  template: string
}

/** Shows the customer order-form template so the admin can copy it and send it to a customer. */
export default function CustomerFormModal({ open, onClose, template }: CustomerFormModalProps) {
  const { showToast } = useToast()

  async function handleCopy() {
    const ok = await copyToClipboard(template)
    if (ok) showToast('Template copied!')
    else showToast('Could not copy automatically — please select and copy manually', 'error')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customer Order Form"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            <Copy size={15} /> Copy Template
          </Button>
        </>
      }
    >
      <div className="bg-offwhite border border-charcoal/10 rounded-xl p-4 whitespace-pre-wrap text-sm text-charcoal max-h-96 overflow-y-auto">
        {template}
      </div>
      <p className="text-xs text-charcoal-soft mt-3">
        Kirim template ini ke customer lewat WhatsApp. Setelah mereka isi dan kirim balik, input ordernya lewat Create Order. Template bisa diubah di Settings → Customer Form.
      </p>
    </Modal>
  )
}
