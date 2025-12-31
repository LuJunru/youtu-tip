import { useEffect } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import { useToastStore } from '../state/toastStore'
import type { ScreenshotDisplay, SelectionRect } from '@shared/types'
import { rendererLogger } from '../utils/logger'

function findDisplay(displays: ScreenshotDisplay[], rect: SelectionRect, viewport?: { x: number; y: number }) {
  const offsetX = viewport?.x ?? 0
  const offsetY = viewport?.y ?? 0
  const centerX = rect.x + rect.width / 2 + offsetX
  const centerY = rect.y + rect.height / 2 + offsetY
  return (
    displays.find((display) => {
      const withinX = centerX >= display.bounds.x && centerX <= display.bounds.x + display.bounds.width
      const withinY = centerY >= display.bounds.y && centerY <= display.bounds.y + display.bounds.height
      return withinX && withinY
    }) ?? displays[0]
  )
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

async function cropDisplay(
  display: ScreenshotDisplay,
  rect: SelectionRect,
  viewport: { x: number; y: number },
) {
  const image = await loadImage(display.dataUrl)
  const scale = display.scale || window.devicePixelRatio || 1
  const globalX = rect.x + viewport.x
  const globalY = rect.y + viewport.y
  const offsetX = (globalX - display.bounds.x) * scale
  const offsetY = (globalY - display.bounds.y) * scale
  const width = Math.max(1, rect.width * scale)
  const height = Math.max(1, rect.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create canvas context')
  context.drawImage(image, offsetX, offsetY, width, height, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

export function useSelectionCropper() {
  const selectionRect = useOverlayStore((state) => state.selectionRect)
  const setSelectionPreview = useOverlayStore((state) => state.setSelectionPreview)
  const setMode = useOverlayStore((state) => state.setMode)
  const holdActive = useOverlayStore((state) => state.holdActive)
  const selectionLocked = useOverlayStore((state) => state.selectionLocked)
  const setSelectionLocked = useOverlayStore((state) => state.setSelectionLocked)
  const resetOverlay = useOverlayStore((state) => state.reset)
  const setSnapshot = useOverlayStore((state) => state.setSnapshot)
  const pushToast = useToastStore((state) => state.pushToast)

  useEffect(() => {
    if (!selectionRect) {
      setSelectionPreview(null)
      return
    }
    if (!selectionLocked) {
      return
    }

    let aborted = false
    ;(async () => {
      const capture = window.tipServices?.captureSnapshot
      if (!capture) {
        rendererLogger.error('captureSnapshot bridge unavailable when selection locked')
        setMode(holdActive ? 'primed' : 'idle')
        setSelectionLocked(false)
        return
      }
      try {
        rendererLogger.debug('requesting clean snapshot for selection', {
          width: Math.round(selectionRect.width),
          height: Math.round(selectionRect.height),
        })
        const freshSnapshot = await capture({ force: true, excludeOverlay: true })
        if (aborted || !freshSnapshot) return
        setSnapshot(freshSnapshot)
        const viewport =
          freshSnapshot.viewport ??
          ({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight } as const)
        const display = findDisplay(freshSnapshot.displays, selectionRect, viewport)
        if (!display) {
          throw new Error('未找到匹配的显示器数据')
        }
        const dataUrl = await cropDisplay(display, selectionRect, viewport)
        if (!aborted) {
          rendererLogger.debug('selection cropped', {
            width: Math.round(selectionRect.width),
            height: Math.round(selectionRect.height),
            display: display.id,
          })
          setSelectionPreview({ dataUrl, rect: selectionRect, displayId: display.id })
          setSelectionLocked(false)
          const sessionPayload = {
            preview: {
              dataUrl,
              rect: selectionRect,
              displayId: display.id,
            },
            viewport,
            captureId: freshSnapshot.id,
            launchedAt: Date.now(),
            textSelection: null,
          }
          try {
            await window.tipSession?.start?.(sessionPayload)
          } catch (sessionError) {
            rendererLogger.error('session launch failed', { error: (sessionError as Error)?.message })
            pushToast({ message: '无法打开会话窗口，请重试', type: 'error' })
          } finally {
            resetOverlay()
          }
        }
      } catch (error) {
        rendererLogger.error('selection crop failed', { error: (error as Error)?.message })
        setSelectionPreview(null)
        setMode(holdActive ? 'primed' : 'idle')
        setSelectionLocked(false)
      }
    })()

    return () => {
      aborted = true
    }
  }, [
    holdActive,
    pushToast,
    resetOverlay,
    selectionLocked,
    selectionRect,
    setMode,
    setSelectionLocked,
    setSelectionPreview,
    setSnapshot,
  ])
}
