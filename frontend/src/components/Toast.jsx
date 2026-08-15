import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

const TONE = {
  success: { icon: CheckCircle, className: 'alert-success' },
  error: { icon: XCircle, className: 'alert-error' },
  warning: { icon: AlertTriangle, className: 'alert-warning' },
  info: { icon: Info, className: 'alert-info' }
}

let idCounter = 0
let activeDispatch = null

// Singleton entry point for non-component code (utils, print/export helpers)
// that can't call the useToast() hook. Requires ToastProvider to be mounted.
export const toast = {
  success: (message, options) => activeDispatch?.('success', message, options),
  error: (message, options) => activeDispatch?.('error', message, options),
  warning: (message, options) => activeDispatch?.('warning', message, options),
  info: (message, options) => activeDispatch?.('info', message, options)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const push = useCallback((tone, message, options = {}) => {
    const id = ++idCounter
    setToasts((current) => [...current, { id, tone, message }])
    const duration = options.duration ?? (tone === 'error' ? 7000 : 4500)
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  useEffect(() => {
    activeDispatch = push
    return () => {
      if (activeDispatch === push) activeDispatch = null
    }
  }, [push])

  const api = useMemo(() => ({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    warning: (message, options) => push('warning', message, options),
    info: (message, options) => push('info', message, options),
    dismiss
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-4">
        {toasts.map((toast) => {
          const config = TONE[toast.tone] || TONE.info
          const Icon = config.icon
          return (
            <div
              key={toast.id}
              role="alert"
              className={`${config.className} pointer-events-auto flex w-full max-w-sm items-start gap-2.5 shadow-card-hover`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
