import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useOverlayStore } from '../state/overlayStore'

const HIDDEN_POSITION = { x: -200, y: -200 }
const DEFAULT_POINTER_SCALE = 1
const HALO_BASE_SIZE = 12
const HALO_MIN_SIZE = 10
const BLUR_MULTIPLIER = 1.8

export function CustomCursor() {
  const visible = useOverlayStore((state) => state.visible)
  const holdActive = useOverlayStore((state) => state.holdActive)
  const mode = useOverlayStore((state) => state.mode)
  const [position, setPosition] = useState(HIDDEN_POSITION)
  const [pointerScale, setPointerScale] = useState(DEFAULT_POINTER_SCALE)

  const haloVisible = visible && (holdActive || mode === 'primed' || mode === 'selecting')

  const haloSize = useMemo(
    () => Math.max(HALO_MIN_SIZE, Math.round(pointerScale * HALO_BASE_SIZE)),
    [pointerScale],
  )
  const blurSize = Math.round(haloSize * BLUR_MULTIPLIER)
  const blurAmount = Math.round(Math.max(6, haloSize * 0.4))

  const requestPointerScale = useCallback(async () => {
    try {
      const api = window.tipOverlay
      if (!api?.getPointerScale) return null
      const value = await api.getPointerScale()
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value
      }
    } catch {
      // ignore runtime errors, fall back to default scale
    }
    return null
  }, [])

  useEffect(() => {
    if (!haloVisible) {
      setPosition(HIDDEN_POSITION)
      return
    }

    const handleMove = (event: PointerEvent) => {
      setPosition({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [haloVisible])

  useEffect(() => {
    if (!haloVisible && pointerScale !== DEFAULT_POINTER_SCALE) {
      return undefined
    }
    let active = true
    const syncScale = async () => {
      const next = await requestPointerScale()
      if (active && next) {
        setPointerScale(next)
      }
    }
    void syncScale()
    return () => {
      active = false
    }
  }, [haloVisible, pointerScale, requestPointerScale])

  return (
    <div
      className={clsx(
        'pointer-events-none fixed left-0 top-0 z-30 transition-opacity duration-150',
        haloVisible ? 'opacity-100' : 'opacity-0',
      )}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none rounded-full"
        style={{
          width: blurSize,
          height: blurSize,
          backgroundColor: 'rgba(138, 98, 220, 0.42)',
          filter: `blur(${blurAmount}px)`,
        }}
      />
      <img
        src="/cursor-sharp.png"
        alt=""
        draggable={false}
        className="pointer-events-none select-none"
        style={{
          width: haloSize,
          height: haloSize,
          transform: 'translate(-50%, -50%)',
          filter: 'drop-shadow(0 0 6px rgba(170, 130, 255, 0.65))',
        }}
      />
    </div>
  )
}
