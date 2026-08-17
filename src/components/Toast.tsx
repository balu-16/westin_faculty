import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { cx } from '../utils'

interface ToastMessage {
  id: number
  message: string
  tone: 'success' | 'danger'
}

interface ToastContextValue {
  success: (_message: string) => void
  danger: (_message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

/** Bottom-right toast stack — every portal form reports success through it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: ToastMessage['tone']) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, 'success'),
      danger: (message) => push(message, 'danger'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-full max-w-xs flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto flex animate-fade-in-up items-start gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-[0_8px_30px_rgba(20,33,61,0.12)]',
              toast.tone === 'success' ? 'border-success/30' : 'border-danger/30',
            )}
          >
            {toast.tone === 'success' ? (
              <CircleCheck size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            )}
            <p className="text-sm font-medium text-ink">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
