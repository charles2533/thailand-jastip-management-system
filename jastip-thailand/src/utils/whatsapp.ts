import type { CustomerRow, OrderItemRow, OrderRow } from '../types/database'
import { formatIDR } from './currency'

export const WHATSAPP_TEMPLATE_VARIABLES = [
  '{{customer_name}}',
  '{{invoice_number}}',
  '{{order_date}}',
  '{{items}}',
  '{{subtotal}}',
  '{{jastip_fee}}',
  '{{delivery_fee}}',
  '{{grand_total}}',
  '{{delivery_area}}',
  '{{address}}',
  '{{phone}}',
  '{{exchange_rate}}',
]

export const DEFAULT_WHATSAPP_TEMPLATE = `Halo Kak {{customer_name}} 👋

Berikut detail pesanan Jastip Thailand Kakak:

🧾 Invoice: {{invoice_number}}

📦 Pesanan:
{{items}}

Subtotal: {{subtotal}}
Jastip Fee: {{jastip_fee}}
Delivery: {{delivery_fee}}

💰 Total: {{grand_total}}

📍 Alamat:
{{address}}

Terima kasih sudah menggunakan Jastip Thailand kami! 🇹🇭❤️`

/** Simple {{variable}} substitution. Missing keys are replaced with ''. */
export function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => data[key] ?? '')
}

function formatItemsList(items: OrderItemRow[]): string {
  return items
    .map((item, idx) => `${idx + 1}. ${item.product_name} x${item.quantity} - ${formatIDR(item.total)}`)
    .join('\n')
}

export function generateWhatsAppMessage(
  template: string,
  order: OrderRow,
  customer: CustomerRow,
  items: OrderItemRow[]
): string {
  const data: Record<string, string> = {
    customer_name: customer.name,
    invoice_number: order.invoice_number,
    order_date: new Date(order.order_date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    items: formatItemsList(items),
    subtotal: formatIDR(order.subtotal),
    jastip_fee: formatIDR(order.total_fee),
    delivery_fee: formatIDR(order.delivery_fee),
    grand_total: formatIDR(order.grand_total),
    delivery_area: order.delivery_area ?? '-',
    address: customer.address,
    phone: customer.phone,
    exchange_rate: `1 THB = ${formatIDR(order.applied_exchange_rate)}`,
  }
  return fillTemplate(template ?? DEFAULT_WHATSAPP_TEMPLATE, data)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for insecure contexts / older browsers.
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
}
