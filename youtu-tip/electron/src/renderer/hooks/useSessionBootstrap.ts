import { useEffect } from 'react'
import { useSessionStore } from '../state/sessionStore'
import { rendererLogger } from '../utils/logger'

export function useSessionBootstrap() {
  const setBootstrap = useSessionStore((state) => state.setBootstrap)

  useEffect(() => {
    const api = window.tipSession
    if (!api) {
      rendererLogger.error('session bridge unavailable')
      return
    }
    let active = true
    const sync = async () => {
      try {
        const payload = await api.getBootstrap?.()
        if (active) {
          setBootstrap(payload ?? null)
        }
      } catch (error) {
        rendererLogger.error('session bootstrap failed', { error: (error as Error)?.message })
      }
    }
    void sync()
    const unsubscribe = api.onUpdate?.((payload) => {
      setBootstrap(payload)
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [setBootstrap])
}
