import { useEffect, useRef, useState } from 'react'
import { OverlayBackground } from './components/OverlayBackground'
import { CustomCursor } from './components/CustomCursor'
import { HoldPrompt } from './components/HoldPrompt'
import { ToastHost } from './components/ToastHost'
import { useOverlayStore } from './state/overlayStore'
import { useOverlayBridge } from './hooks/useOverlayBridge'
import { SelectionCanvas } from './components/SelectionCanvas'
import { useSnapshotBootstrap } from './hooks/useSnapshotBootstrap'
import { useSelectionCropper } from './hooks/useSelectionCropper'
import { useOverlayErrors } from './hooks/useOverlayErrors'
import { useOverlayLifecycle } from './hooks/useOverlayLifecycle'
import { useSnapshotDisposer } from './hooks/useSnapshotDisposer'

export function App() {
  const visible = useOverlayStore((state) => state.visible)
  const mode = useOverlayStore((state) => state.mode)
  const [activationPulseKey, setActivationPulseKey] = useState(0)
  const previousModeRef = useRef(mode)

  useOverlayBridge()
  useSnapshotBootstrap()
  useSelectionCropper()
  useOverlayErrors()
  useOverlayLifecycle()
  useSnapshotDisposer()
  useEffect(() => {
    const previousMode = previousModeRef.current
    if (previousMode === 'idle' && mode !== 'idle') {
      setActivationPulseKey((key) => key + 1)
    }
    previousModeRef.current = mode
  }, [mode])

  useEffect(() => {
    window.postMessage({ payload: visible ? 'overlay:active' : 'overlay:idle' })
  }, [visible])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-transparent">
      <OverlayBackground visible={visible} mode={mode} activationPulseKey={activationPulseKey} />
      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <HoldPrompt />
      </div>
      <SelectionCanvas />
      <ToastHost />
      <CustomCursor />
    </div>
  )
}
