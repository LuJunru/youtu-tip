import { useEffect, useRef } from 'react'
import { useSystemStore } from '../state/systemStore'
import { useToastStore } from '../state/toastStore'

export function useSidecarStatus() {
  const sidecarStatus = useSystemStore((state) => state.sidecarStatus)
  const fetchStatus = useSystemStore((state) => state.fetchStatus)
  const pushToast = useToastStore((state) => state.pushToast)
  const prevStatus = useRef<string | null>(null)

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 6000)
    return () => clearInterval(timer)
  }, [fetchStatus])

  useEffect(() => {
    const current = sidecarStatus?.status
    if (current && prevStatus.current && prevStatus.current !== current && current === 'disconnected') {
      pushToast({ message: 'Sidecar 已断开，请检查服务状态', type: 'error' })
    }
    prevStatus.current = current ?? null
  }, [pushToast, sidecarStatus?.status])

  return sidecarStatus
}
