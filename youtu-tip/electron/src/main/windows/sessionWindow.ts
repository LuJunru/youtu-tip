import { BrowserWindow, shell, screen } from 'electron'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'
import { IPC_CHANNELS } from '@shared/constants'
import type { SessionLaunchPayload } from '@shared/types'
import { revealWindowOnCurrentSpace } from './windowSpace'

let sessionWindow: BrowserWindow | null = null
let sessionWindowReady = false
let pendingReveal = false

const DEFAULT_WINDOW_WIDTH = 360
const DEFAULT_WINDOW_HEIGHT = 280
const MIN_WINDOW_WIDTH = 280
const MIN_WINDOW_HEIGHT = 220
const MAX_WINDOW_WIDTH = 2000
const MAX_WINDOW_HEIGHT = 520
const WINDOW_MARGIN = 12
const WINDOW_BOTTOM_OFFSET = 180
let sessionWindowSize = {
  width: DEFAULT_WINDOW_WIDTH,
  height: DEFAULT_WINDOW_HEIGHT,
}

function createSessionWindow() {
  const existing = sessionWindow
  if (existing && !existing.isDestroyed()) {
    revealWindowOnCurrentSpace(existing, { focus: true })
    return existing
  }

  sessionWindow = new BrowserWindow({
    title: 'Tip 意图',
    width: sessionWindowSize.width,
    height: sessionWindowSize.height,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_DIST,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (DEV_SERVER_URL) {
    sessionWindow.loadURL(`${DEV_SERVER_URL}?view=session#session`)
  } else {
    sessionWindow.loadFile(HTML_ENTRY, { query: { view: 'session' }, hash: 'session' })
  }

  sessionWindowReady = false
  pendingReveal = false
  sessionWindow.once('ready-to-show', () => {
    sessionWindowReady = true
    if (pendingReveal) {
      pendingReveal = false
      revealSessionWindow()
    }
  })

  sessionWindow.on('closed', () => {
    sessionWindow = null
    sessionWindowReady = false
    pendingReveal = false
  })

  sessionWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return sessionWindow
}

export function openSessionWindow() {
  return createSessionWindow()
}

export function getSessionWindow() {
  return sessionWindow
}

export function sendSessionPayload(payload: SessionLaunchPayload) {
  if (!sessionWindow || sessionWindow.isDestroyed()) return
  sessionWindow.webContents.send(IPC_CHANNELS.SESSION_UPDATE, payload)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function positionSessionWindow(payload: SessionLaunchPayload) {
  if (!sessionWindow || sessionWindow.isDestroyed()) return
  const width = sessionWindowSize.width
  const height = sessionWindowSize.height
  const viewport = payload.viewport ?? screen.getPrimaryDisplay().bounds
  const selectionRect = payload.preview?.rect
  const selectionCenter = selectionRect
    ? {
        x: viewport.x + selectionRect.x + selectionRect.width / 2,
        y: viewport.y + selectionRect.y + selectionRect.height / 2,
      }
    : null
  const targetDisplay = selectionCenter
    ? screen.getDisplayNearestPoint(selectionCenter)
    : screen.getDisplayMatching(viewport)
  const displayBounds = targetDisplay.bounds

  const centerX = displayBounds.x + displayBounds.width / 2
  const bottomY = displayBounds.y + displayBounds.height
  const x = clamp(
    centerX - width / 2,
    displayBounds.x + WINDOW_MARGIN,
    displayBounds.x + displayBounds.width - width - WINDOW_MARGIN,
  )
  const y = clamp(
    bottomY - height - WINDOW_BOTTOM_OFFSET,
    displayBounds.y + WINDOW_MARGIN,
    displayBounds.y + displayBounds.height - height - WINDOW_MARGIN,
  )
  sessionWindow.setBounds(
    {
      x: Math.round(x),
      y: Math.round(y),
      width,
      height,
    },
    false,
  )
}

function clampSize(width: number, height: number) {
  const clampedWidth = clamp(width, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH)
  const clampedHeight = clamp(height, MIN_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT)
  return { width: clampedWidth, height: clampedHeight }
}

export function resizeSessionWindow(bounds: { width?: number; height?: number }) {
  if (!bounds.width && !bounds.height) return
  const nextSize = clampSize(bounds.width ?? sessionWindowSize.width, bounds.height ?? sessionWindowSize.height)
  if (nextSize.width === sessionWindowSize.width && nextSize.height === sessionWindowSize.height) {
    return
  }
  sessionWindowSize = nextSize
  if (sessionWindow && !sessionWindow.isDestroyed()) {
    const current = sessionWindow.getBounds()
    sessionWindow.setBounds(
      { x: current.x, y: current.y, width: sessionWindowSize.width, height: sessionWindowSize.height },
      false,
    )
  }
}

export function revealSessionWindow() {
  if (!sessionWindow || sessionWindow.isDestroyed()) {
    pendingReveal = false
    return
  }
  if (sessionWindowReady) {
    revealWindowOnCurrentSpace(sessionWindow, { focus: true })
  } else {
    pendingReveal = true
  }
}
