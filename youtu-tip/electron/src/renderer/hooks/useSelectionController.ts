import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import type { SelectionRect } from '@shared/types'
import { rendererLogger } from '../utils/logger'

const MIN_SIZE = 12

function normalizeRect(start: { x: number; y: number }, current: { x: number; y: number }): SelectionRect {
  const x = Math.min(start.x, current.x)
  const y = Math.min(start.y, current.y)
  return {
    x,
    y,
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  }
}

export function useSelectionController() {
  const setSelectionRect = useOverlayStore((state) => state.setSelectionRect)
  const setSelectionPreview = useOverlayStore((state) => state.setSelectionPreview)
  const setMode = useOverlayStore((state) => state.setMode)
  const holdActive = useOverlayStore((state) => state.holdActive)
  const selectionRect = useOverlayStore((state) => state.selectionRect)
  const setSelectionLocked = useOverlayStore((state) => state.setSelectionLocked)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const previousHoldRef = useRef(holdActive)

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!pointerStartRef.current) return
      const rect = normalizeRect(pointerStartRef.current, { x: event.clientX, y: event.clientY })
      setSelectionRect(rect)
    },
    [setSelectionRect],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!pointerStartRef.current) return
      const rect = normalizeRect(pointerStartRef.current, { x: event.clientX, y: event.clientY })
      pointerStartRef.current = null
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
        rendererLogger.info('selection aborted due to small rect', {
          width: rect.width,
          height: rect.height,
        })
        setSelectionRect(null)
        setSelectionPreview(null)
        setSelectionLocked(false)
        setMode(holdActive ? 'primed' : 'idle')
        return
      }
      rendererLogger.info('selection completed', {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
      setSelectionRect(rect)
      setSelectionLocked(false)
      setMode('primed')
    },
    [handlePointerMove, holdActive, setMode, setSelectionLocked, setSelectionPreview, setSelectionRect],
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (!holdActive) {
      rendererLogger.debug('pointer down ignored (inactive state)', {
        holdActive,
      })
      return
    }
    if (event.button !== 0) {
      rendererLogger.debug('pointer down ignored (non-left button)', { button: event.button })
      return
    }
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    rendererLogger.debug('selection started', { x: event.clientX, y: event.clientY })
    setMode('selecting')
    setSelectionLocked(false)
    setSelectionPreview(null)
    setSelectionRect({ x: event.clientX, y: event.clientY, width: 0, height: 0 })
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    if (holdActive) {
      previousHoldRef.current = holdActive
      return
    }
    if (pointerStartRef.current) {
      rendererLogger.info('selection cancelled due to hotkey release during drag')
      pointerStartRef.current = null
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      setSelectionRect(null)
      setSelectionPreview(null)
      setSelectionLocked(false)
      setMode('idle')
      previousHoldRef.current = holdActive
      return
    }

    if (previousHoldRef.current && !holdActive) {
      const hasValidSelection =
        selectionRect && selectionRect.width >= MIN_SIZE && selectionRect.height >= MIN_SIZE
      if (hasValidSelection) {
        rendererLogger.info('hotkey released, locking current selection', {
          width: Math.round(selectionRect!.width),
          height: Math.round(selectionRect!.height),
        })
        setSelectionLocked(true)
      } else {
        rendererLogger.info('hotkey released without valid selection, exiting overlay')
        setSelectionRect(null)
        setSelectionPreview(null)
        setSelectionLocked(false)
        setMode('idle')
      }
    }
    previousHoldRef.current = holdActive
  }, [
    handlePointerMove,
    handlePointerUp,
    holdActive,
    selectionRect,
    setMode,
    setSelectionLocked,
    setSelectionPreview,
    setSelectionRect,
  ])

  return { handlePointerDown }
}
