import React from 'react'
import type { CustomerRow, OrderItemRow, OrderRow, SettingsRow } from '../types/database'
import { formatIDR, formatTHB } from '../utils/currency'
import { ORDER_STATUS_LABELS } from '../types'
import { getDeliveryMethodLabel } from '../config/delivery'

interface InvoiceViewProps {
  order: OrderRow
  customer: CustomerRow
  items: OrderItemRow[]
  settings: SettingsRow
}

/**
 * Printable invoice layout. Rendered inside #printable-invoice so the
 * global print stylesheet (src/index.css) hides everything else when the
 * admin uses the browser's Print -> Save as PDF.
 */
export default function InvoiceView({ order, customer, items, settings }: InvoiceViewProps) {
  return (
    <div id="printable-invoice" className="bg-white rounded-2xl border border-black/5 shadow-card p-6 sm:p-10 max-w-3xl mx-auto print:shadow-none print:border-none print:rounded-none">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-black/10">
        <div>
          <h1 className="text-xl font-bold text-charcoal">{settings.business_name}</h1>
          {settings.address && <p className="text-sm text-charcoal-soft mt-1">{settings.address}</p>}
          <div className="text-sm text-charcoal-soft mt-1 flex flex-col gap-0.5">
            {settings.whatsapp && <span>WhatsApp: {settings.whatsapp}</span>}
            {settings.instagram && <span>Instagram: {settings.instagram}</span>}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-bold text-gold-dark">INVOICE</p>
          <p className="text-sm text-charcoal mt-1">{order.invoice_number}</p>
          <p className="text-xs text-charcoal-soft mt-1">{new Date(order.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-charcoal/5 text-charcoal">
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-black/10">
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal-soft mb-1">Bill To</p>
          <p className="font-medium text-charcoal">{customer.name}</p>
          <p className="text-sm text-charcoal-soft">{customer.phone}</p>
          <p className="text-sm text-charcoal-soft mt-1 max-w-xs">{customer.address}</p>
          {customer.city && <p className="text-sm text-charcoal-soft">{customer.city}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft mb-1">Exchange Rate</p>
          <p className="text-sm text-charcoal">{formatTHB(1)} = {formatIDR(order.applied_exchange_rate)}</p>
          <p className="text-xs uppercase tracking-wide text-charcoal-soft mt-3 mb-1">Delivery</p>
          <p className="text-sm text-charcoal">
            {getDeliveryMethodLabel(order.delivery_method)}
            {order.delivery_area ? ` — ${order.delivery_area}` : ''}
          </p>
        </div>
      </div>

      <div className="py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-charcoal-soft border-b border-black/10">
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Price</th>
              <th className="py-2 font-medium text-right">Jastip Fee</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 text-charcoal">{item.product_name}</td>
                <td className="py-2.5 text-right text-charcoal-soft">{item.quantity}</td>
                <td className="py-2.5 text-right text-charcoal-soft">{formatIDR(item.price_idr)}</td>
                <td className="py-2.5 text-right text-charcoal-soft">{formatIDR(item.fee_per_item)}</td>
                <td className="py-2.5 text-right text-charcoal font-medium">{formatIDR(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full sm:w-64 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-charcoal-soft">Subtotal</span>
            <span className="text-charcoal">{formatIDR(order.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-charcoal-soft">Total Jastip Fee</span>
            <span className="text-charcoal">{formatIDR(order.total_fee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-charcoal-soft">Delivery Fee</span>
            <span className="text-charcoal">{formatIDR(order.delivery_fee)}</span>
          </div>
          <div className="border-t border-black/10 my-1" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-charcoal">Grand Total</span>
            <span className="font-bold text-charcoal text-base">{formatIDR(order.grand_total)}</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="mt-6 pt-4 border-t border-black/10">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft mb-1">Notes</p>
          <p className="text-sm text-charcoal-soft">{order.notes}</p>
        </div>
      )}

      <p className="text-center text-sm text-gold-dark font-medium mt-10">Thank you for using our Thailand Jastip service!</p>
    </div>
  )
}
