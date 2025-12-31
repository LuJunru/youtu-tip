import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { SessionLaunchPayload } from '@shared/types'
import {
  openSessionWindow,
  sendSessionPayload,
  positionSessionWindow,
  resizeSessionWindow,
  revealSessionWindow,
} from '../windows/sessionWindow'
import { mainLogger } from '../services/logger'
import { showIntentIndicator, hideIntentIndicator } from '../windows/intentIndicatorWindow'

let pendingPayload: SessionLaunchPayload | null = null

interface LaunchSessionOptions {
  autoReveal?: boolean
  showIndicator?: boolean
}

export function registerSessionBridge() {
  ipcMain.handle(IPC_CHANNELS.SESSION_START, async (_event, payload: SessionLaunchPayload) => {
    await launchSessionWindow(payload)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_BOOTSTRAP, async () => pendingPayload)

  ipcMain.handle(IPC_CHANNELS.SESSION_RESIZE, async (_event, bounds: { width?: number; height?: number }) => {
    resizeSessionWindow(bounds)
    if (pendingPayload) {
      positionSessionWindow(pendingPayload)
    }
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_REVEAL, async () => {
    hideIntentIndicator()
    revealSessionWindow()
    if (pendingPayload) {
      positionSessionWindow(pendingPayload)
    }
  })
}

export function dispatchSessionUpdate(payload: SessionLaunchPayload) {
  pendingPayload = payload
  positionSessionWindow(payload)
  sendSessionPayload(payload)
}

export function clearSessionPayload() {
  pendingPayload = null
  hideIntentIndicator()
}

export function getPendingSessionPayload() {
  return pendingPayload
}

export async function launchSessionWindow(payload: SessionLaunchPayload, options?: LaunchSessionOptions) {
  const autoReveal = options?.autoReveal ?? false
  const showIndicator = options?.showIndicator ?? true
  try {
    pendingPayload = payload
    if (showIndicator && payload.preview) {
      showIntentIndicator(payload)
    }
    const window = openSessionWindow()
    positionSessionWindow(payload)
    if (window) {
      mainLogger.info('session window requested', { launchedAt: payload.launchedAt })
      if (window.isVisible()) {
        sendSessionPayload(payload)
      } else {
        window.once('ready-to-show', () => {
          sendSessionPayload(payload)
        })
      }
      window.once('closed', () => {
        pendingPayload = null
        hideIntentIndicator()
      })
    }
    if (autoReveal) {
      hideIntentIndicator()
      revealSessionWindow()
    }
  } catch (error) {
    pendingPayload = null
    hideIntentIndicator()
    throw error
  }
}
