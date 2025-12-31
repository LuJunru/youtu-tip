import { BrowserWindow, screen } from 'electron'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'
import type { SessionLaunchPayload } from '@shared/types'

let indicatorWindow: BrowserWindow | null = null
const INDICATOR_SIZE = 56
const INDICATOR_MARGIN = 6

function ensureIndicatorWindow() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    return indicatorWindow
  }

  indicatorWindow = new BrowserWindow({
    title: 'Tip Indicator',
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    roundedCorners: true,
    hasShadow: false,
    webPreferences: {
      preload: PRELOAD_DIST,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (DEV_SERVER_URL) {
    indicatorWindow.loadURL(`${DEV_SERVER_URL}?view=indicator`)
  } else {
    indicatorWindow.loadFile(HTML_ENTRY, { query: { view: 'indicator' } })
  }

  indicatorWindow.setIgnoreMouseEvents(true, { forward: true })

  indicatorWindow.on('closed', () => {
    indicatorWindow = null
  })

  return indicatorWindow
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function showIntentIndicator(payload: SessionLaunchPayload) {
  if (!payload.preview || !payload.viewport) return
  const window = ensureIndicatorWindow()
  const rect = payload.preview.rect
  const viewport = payload.viewport
  const globalCenterX = viewport.x + rect.x + rect.width / 2
  const globalCenterY = viewport.y + rect.y + rect.height / 2
  const displayBounds = screen.getDisplayNearestPoint({ x: globalCenterX, y: globalCenterY }).bounds

  const clampedX = clamp(
    globalCenterX - INDICATOR_SIZE / 2,
    displayBounds.x + INDICATOR_MARGIN,
    displayBounds.x + displayBounds.width - INDICATOR_SIZE - INDICATOR_MARGIN,
  )
  const clampedY = clamp(
    globalCenterY - INDICATOR_SIZE / 2,
    displayBounds.y + INDICATOR_MARGIN,
    displayBounds.y + displayBounds.height - INDICATOR_SIZE - INDICATOR_MARGIN,
  )

  window.setBounds({
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
  })
  window.setAlwaysOnTop(true, 'screen-saver')
  window.showInactive()
}

export function hideIntentIndicator() {
  if (!indicatorWindow || indicatorWindow.isDestroyed()) return
  indicatorWindow.hide()
}
