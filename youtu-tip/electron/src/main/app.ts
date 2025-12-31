import { app, BrowserWindow, ipcMain, screen } from 'electron'
import type { Display } from 'electron'
import os from 'node:os'
import {
  createOverlayWindow,
  emitOverlayError,
  emitOverlayState,
  focusOverlayOnDisplay,
  setOverlayMode,
} from './windows/overlayWindow'
import { registerHoldShortcut } from './hotkeys/registerHoldShortcut'
import { registerScreenshotHandlers } from './ipc/screenshot'
import { registerSidecarBridge } from './ipc/sidecarBridge'
import { registerSettingsBridge } from './ipc/settingsBridge'
import { launchSessionWindow, registerSessionBridge } from './ipc/sessionBridge'
import { registerChatBridge } from './ipc/chatBridge'
import { registerReportBridge } from './ipc/reportBridge'
import { registerLoggerBridge } from './ipc/loggerBridge'
import { ensureSidecarRunning, stopSidecar } from './process/sidecarLauncher'
import { getSessionWindow } from './windows/sessionWindow'
import { IPC_CHANNELS } from '@shared/constants'
import type { HoldStatusPayload, OverlayMode, SessionLaunchPayload, TextSelectionPayload } from '@shared/types'
import { setPreferredCaptureDisplay } from './services/captureService'
import { mainLogger } from './services/logger'
import { isVisionFeatureEnabled, refreshSettingsCache } from './services/settingsCache'
import { createAppTray, destroyAppTray } from './menu/tray'
import { getPointerScale } from './services/pointerMetrics'
import { captureSelectedText } from './services/textSelectionService'
import { openGuideWindow } from './windows/guideWindow'
import { isGuideSuppressedLocally } from './services/startupGuideFlag'

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

const LONG_PRESS_SNAPSHOT_MS = 500

let disposeHotkey: (() => void) | null = null
let holdRequestSeq = 0
let activeHoldRequest: number | null = null
let longPressTimer: NodeJS.Timeout | null = null
let screenshotModeActive = false
const pendingOpenFiles: string[] = []
let guideWindowRequested = false

function clearLongPressTimer() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function buildTextSelectionPayload(text: string): TextSelectionPayload {
  const normalized = text.trim()
  const limit = 160
  const truncated = normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized
  return { text: normalized, truncated }
}

function buildBaseSessionPayload(
  display: Display,
  textSelection?: TextSelectionPayload | null,
  captureId?: string | null,
): SessionLaunchPayload {
  const viewport = {
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
  }
  return {
    preview: null,
    viewport,
    captureId: captureId ?? undefined,
    launchedAt: Date.now(),
    textSelection: textSelection ?? null,
  }
}

async function launchSessionForFile(filePath: string) {
  const trimmedPath = filePath.trim()
  if (!trimmedPath) return
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) ?? screen.getPrimaryDisplay()
  const payload = buildBaseSessionPayload(display, buildTextSelectionPayload(trimmedPath), null)
  try {
    await launchSessionWindow(payload, { autoReveal: false, showIndicator: false })
    mainLogger.info('session panel launched from file open', { filePath: trimmedPath })
  } catch (error) {
    mainLogger.error('session launch from file failed', {
      filePath: trimmedPath,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

app.whenReady().then(async () => {
  ipcMain.handle(IPC_CHANNELS.OVERLAY_MODE, (_event, mode: OverlayMode) => {
    setOverlayMode(mode)
    emitOverlayState({
      mode,
      holdActive: mode !== 'idle',
      triggeredAt: Date.now(),
      source: 'renderer',
    })
  })

  ipcMain.handle(IPC_CHANNELS.POINTER_SCALE, () => {
    return getPointerScale()
  })

  createOverlayWindow()
  registerScreenshotHandlers()
  registerSidecarBridge()
  registerSettingsBridge()
  registerSessionBridge()
  registerChatBridge()
  registerReportBridge()
  registerLoggerBridge()
  try {
    await ensureSidecarRunning()
  } catch (error) {
    mainLogger.error('failed to start sidecar', { error: error instanceof Error ? error.message : String(error) })
  }
  const settings = await refreshSettingsCache()
  if (!guideWindowRequested) {
    const enabled = settings?.features?.startupGuideEnabled !== false
    const locallySuppressed = isGuideSuppressedLocally()
    if (enabled && !locallySuppressed) {
      guideWindowRequested = true
      openGuideWindow()
    }
  }
  createAppTray()

  disposeHotkey = registerHoldShortcut(async (payload) => {
    if (payload.holdActive) {
      const requestId = ++holdRequestSeq
      activeHoldRequest = requestId
      clearLongPressTimer()
      screenshotModeActive = false
      mainLogger.debug('hold shortcut engaged', { requestId })
      const cursorPoint = screen.getCursorScreenPoint()
      const targetDisplay = screen.getDisplayNearestPoint(cursorPoint) ?? screen.getPrimaryDisplay()
      if (targetDisplay) {
        const textSelection = await captureSelectedText().catch(() => null)
        const payloadForSession = buildBaseSessionPayload(
          targetDisplay,
          textSelection ? buildTextSelectionPayload(textSelection) : null,
          null,
        )
        try {
          await launchSessionWindow(payloadForSession, { autoReveal: false, showIndicator: false })
          mainLogger.info('session panel launched from hotkey', {
            requestId,
            hasText: Boolean(textSelection),
          })
        } catch (error) {
          mainLogger.error('session panel launch failed', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      longPressTimer = setTimeout(async () => {
        longPressTimer = null
        if (activeHoldRequest !== requestId) return
        if (!isVisionFeatureEnabled()) {
          mainLogger.info('vision disabled, skipping long-press screenshot', { requestId })
          return
        }
        screenshotModeActive = true
        const sessionWindow = getSessionWindow()
        sessionWindow?.hide()
        focusOverlayOnDisplay(targetDisplay)
        setPreferredCaptureDisplay(targetDisplay?.id ?? null)
        const eventPayload: HoldStatusPayload = {
          mode: 'primed',
          holdActive: true,
          triggeredAt: Date.now(),
          source: payload.source,
        }
        setOverlayMode('primed')
        emitOverlayState(eventPayload)
      }, LONG_PRESS_SNAPSHOT_MS)
      return
    }

    clearLongPressTimer()
    const releasePayload: HoldStatusPayload = {
      mode: screenshotModeActive ? 'primed' : 'idle',
      holdActive: false,
      triggeredAt: Date.now(),
      source: payload.source,
    }
    emitOverlayState(releasePayload)
    if (!screenshotModeActive) {
      setOverlayMode('idle')
    }
    screenshotModeActive = false
    activeHoldRequest = null
  })

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
    app.quit()
  })

  if (pendingOpenFiles.length > 0) {
    const pending = [...pendingOpenFiles]
    pendingOpenFiles.length = 0
    for (const filePath of pending) {
      void launchSessionForFile(filePath)
    }
  }
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (!filePath) return
  if (!app.isReady()) {
    pendingOpenFiles.push(filePath)
    return
  }
  void launchSessionForFile(filePath)
})

app.on('second-instance', () => {
  const [window] = BrowserWindow.getAllWindows()
  if (window) {
    if (window.isMinimized()) window.restore()
    window.focus()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createOverlayWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  disposeHotkey?.()
  destroyAppTray()
  stopSidecar()
})
