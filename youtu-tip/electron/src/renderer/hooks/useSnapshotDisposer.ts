import { useEffect, useRef } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import { rendererLogger } from '../utils/logger'

export function useSnapshotDisposer() {
  const snapshot = useOverlayStore((state) => state.snapshot)
  const previousRef = useRef<typeof snapshot>(null)

  useEffect(() => {
    const previous = previousRef.current
    if (previous && snapshot && snapshot.id !== previous.id) {
      window.tipServices
        ?.discardSnapshot?.(previous.id)
        .catch((error) => rendererLogger.warn('discard snapshot failed', { error: (error as Error)?.message }))
    }
    previousRef.current = snapshot
  }, [snapshot])
}
