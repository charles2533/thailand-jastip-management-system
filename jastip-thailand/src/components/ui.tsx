import React from 'react'
import { Loader2 } from 'lucide-react'

/** Shared low-level UI primitives, kept in one file to avoid excess boilerplate. */

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-black/5 shadow-card ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h3 className="font-semibold text-charcoal text-base">{title}</h3>
        {subtitle && <p className="text-sm text-charcoal-soft mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-charcoal text-offwhite hover:bg-charcoal-light',
    secondary: 'bg-gold text-charcoal hover:bg-gold-dark',
    outline: 'border border-charcoal/15 text-charcoal hover:bg-charcoal/5',
    ghost: 'text-charcoal hover:bg-charcoal/5',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-base px-5 py-3' }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={props.disabled || loading} {...props}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-charcoal mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-xl border ${error ? 'border-red-400' : 'border-charcoal/15'} bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-soft/60 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  )
}

export function TextArea({ label, error, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-charcoal mb-1.5">{label}</span>}
      <textarea
        className={`w-full rounded-xl border ${error ? 'border-red-400' : 'border-charcoal/15'} bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-soft/60 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  )
}

export function Select({
  label,
  error,
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-charcoal mb-1.5">{label}</span>}
      <select
        className={`w-full rounded-xl border ${error ? 'border-red-400' : 'border-charcoal/15'} bg-white px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  )
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  purchased: 'bg-violet-100 text-violet-700',
  ready_to_ship: 'bg-cyan-100 text-cyan-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <h3 className="font-semibold text-charcoal">{title}</h3>
      {description && <p className="text-sm text-charcoal-soft mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin text-charcoal-soft" size={28} />
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClass = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  widthClass?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${widthClass} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <h3 className="font-semibold text-charcoal">{title}</h3>
          <button onClick={onClose} className="text-charcoal-soft hover:text-charcoal text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-black/5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-charcoal-soft">{message}</p>
    </Modal>
  )
}
