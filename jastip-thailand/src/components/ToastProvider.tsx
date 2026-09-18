import React, { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const icon = (type: ToastType) => {
    if (type === 'success') return <CheckCircle2 size={18} className="text-thai-jade shrink-0" />
    if (type === 'error') return <XCircle size={18} className="text-red-500 shrink-0" />
    return <Info size={18} className="text-charcoal-soft shrink-0" />
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 bg-white border border-black/5 shadow-card rounded-xl px-4 py-3 min-w-[220px] max-w-[320px] animate-in fade-in slide-in-from-bottom-2"
          >
            {icon(t.type)}
            <span className="text-sm text-charcoal flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-charcoal-soft hover:text-charcoal">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
