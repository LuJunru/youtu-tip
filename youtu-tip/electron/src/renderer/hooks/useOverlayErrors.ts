import { useEffect } from 'react'
import { useToastStore } from '../state/toastStore'

export function useOverlayErrors() {
  const pushToast = useToastStore((state) => state.pushToast)
  useEffect(() => {
    const api = window.tipOverlay
    if (!api?.onError) return
    const unsubscribe = api.onError((message: string) => {
      pushToast({ message, type: 'error' })
    })
    return () => {
      unsubscribe?.()
    }
  }, [pushToast])
}
