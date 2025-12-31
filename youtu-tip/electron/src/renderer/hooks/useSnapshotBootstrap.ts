import { useEffect, useRef } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import { rendererLogger } from '../utils/logger'

export function useSnapshotBootstrap() {
  const mode = useOverlayStore((state) => state.mode)
  const snapshot = useOverlayStore((state) => state.snapshot)
  const setSnapshot = useOverlayStore((state) => state.setSnapshot)
  const resetSelection = useOverlayStore((state) => state.setSelectionRect)
  const previousModeRef = useRef(mode)

  useEffect(() => {
    const previousMode = previousModeRef.current
    if (mode === 'primed' && previousMode === 'idle') {
      if (snapshot) {
        rendererLogger.debug('clearing previous snapshot before new capture', {
          generatedAt: snapshot.generatedAt,
        })
      }
      setSnapshot(null)
    }
    previousModeRef.current = mode
  }, [mode, setSnapshot, snapshot])

  useEffect(() => {
    if (mode === 'idle') {
      rendererLogger.debug('overlay idle, clearing snapshot cache')
      resetSelection(null)
      setSnapshot(null)
    }
  }, [mode, resetSelection, setSnapshot])
}
