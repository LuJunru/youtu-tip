import clsx from 'clsx'
import { useToastStore } from '../state/toastStore'

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto rounded-2xl px-4 py-2 text-sm text-white shadow-lg',
            toast.type === 'error' ? 'bg-red-500/90' : 'bg-slate-900/80',
          )}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
