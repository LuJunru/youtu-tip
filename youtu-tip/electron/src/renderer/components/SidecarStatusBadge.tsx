import clsx from 'clsx'
import { useSidecarStatus } from '../hooks/useSidecarStatus'

export function SidecarStatusBadge() {
  const status = useSidecarStatus()
  const connected = status?.status === 'connected'

  return (
    <div
      className={clsx(
        'absolute right-6 top-6 rounded-full px-4 py-2 text-xs font-medium shadow-lg backdrop-blur',
        connected ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white',
      )}
    >
      {connected ? 'Sidecar 已连接' : 'Sidecar 未连接'}
    </div>
  )
}
