import { BrowserWindow, shell, screen } from 'electron'
import type { Display } from 'electron'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'
import { IPC_CHANNELS } from '@shared/constants'
import type { HoldStatusPayload, OverlayMode } from '@shared/types'

let overlayWindow: BrowserWindow | null = null

function getDisplayBounds(display?: Display | null) {
  const target = display ?? screen.getPrimaryDisplay()
  return target?.bounds ?? { x: 0, y: 0, width: 800, height: 600 }
}

export function createOverlayWindow() {
  if (overlayWindow) return overlayWindow

  const workspace = getDisplayBounds()

  overlayWindow = new BrowserWindow({
    title: 'Tip Overlay',
    width: workspace.width,
    height: workspace.height,
    x: workspace.x,
    y: workspace.y,
    show: false,
    frame: false,
    transparent: true,
    fullscreen: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    enableLargerThanScreen: true,
    hasShadow: false,
    roundedCorners: false,
    fullscreenable: false,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: PRELOAD_DIST,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (DEV_SERVER_URL) {
    overlayWindow.loadURL(DEV_SERVER_URL)
    overlayWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    overlayWindow.loadFile(HTML_ENTRY)
  }

  overlayWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })
  focusOverlayOnDisplay()

  return overlayWindow
}

export function getOverlayWindow() {
  return overlayWindow
}

export function showOverlayWindow() {
  overlayWindow?.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow?.showInactive()
  overlayWindow?.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })
}

export function hideOverlayWindow() {
  overlayWindow?.hide()
}

export function emitOverlayState(payload: HoldStatusPayload) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.webContents.send(IPC_CHANNELS.OVERLAY_STATE, payload)
}

export function emitOverlayError(message: string) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.webContents.send(IPC_CHANNELS.OVERLAY_ERROR, message)
}

export function focusOverlayOnDisplay(display?: Display | null) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const bounds = getDisplayBounds(display)
  overlayWindow.setBounds(bounds)
}

export function setOverlayMode(mode: OverlayMode) {
  if (mode === 'idle') {
    hideOverlayWindow()
  } else {
    showOverlayWindow()
  }
}
