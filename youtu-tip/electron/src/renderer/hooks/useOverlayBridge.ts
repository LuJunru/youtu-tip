import { useEffect } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import type { HoldStatusPayload } from '@shared/types'

export function useOverlayBridge() {
  const setHoldState = useOverlayStore((state) => state.setHoldState)

  useEffect(() => {
    const api = window.tipOverlay
    if (!api) return

    const off = api.onHoldStatus((payload: HoldStatusPayload) => {
      setHoldState(payload)
    })

    return () => {
      off?.()
    }
  }, [setHoldState])
}
