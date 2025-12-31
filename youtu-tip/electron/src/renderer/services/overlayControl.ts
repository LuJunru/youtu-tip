import type { OverlayMode } from '@shared/types'

export function requestOverlayMode(mode: OverlayMode) {
  return window.tipOverlay?.requestMode?.(mode)
}
