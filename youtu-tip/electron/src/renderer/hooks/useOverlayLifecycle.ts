import { useEffect } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import { requestOverlayMode } from '../services/overlayControl'

export function useOverlayLifecycle() {
  const holdActive = useOverlayStore((state) => state.holdActive)
  const selectionRect = useOverlayStore((state) => state.selectionRect)
  const selectionPreview = useOverlayStore((state) => state.selectionPreview)
  const visible = useOverlayStore((state) => state.visible)
  const reset = useOverlayStore((state) => state.reset)

  useEffect(() => {
    if (visible && !holdActive && !selectionRect && !selectionPreview) {
      reset()
    }
  }, [holdActive, reset, selectionPreview, selectionRect, visible])

  useEffect(() => {
    if (!visible) {
      requestOverlayMode('idle')
    }
  }, [visible])
}
