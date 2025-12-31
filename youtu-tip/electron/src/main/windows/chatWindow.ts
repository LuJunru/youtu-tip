import { BrowserWindow, shell, screen } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { ChatLaunchPayload } from '@shared/types'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'
import { revealWindowOnCurrentSpace } from './windowSpace'

let chatWindow: BrowserWindow | null = null
const CHAT_WINDOW_MARGIN_X = 16
const CHAT_WINDOW_MARGIN_Y = 0
let preferredDisplayId: number | null = null

function createChatWindow() {
  const existing = chatWindow
  if (existing && !existing.isDestroyed()) {
    revealWindowOnCurrentSpace(existing, { focus: true })
    return existing
  }

  chatWindow = new BrowserWindow({
    title: 'Tip 会话',
    width: 380,
    height: 400,
    minWidth: 320,
    minHeight: 200,
    show: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    hasShadow: false,
    vibrancy: 'appearance-based',
    useContentSize: true,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: PRELOAD_DIST,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  updateChatWindowBounds()
  chatWindow.setAlwaysOnTop(true, 'screen-saver')
  chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (DEV_SERVER_URL) {
    chatWindow.loadURL(`${DEV_SERVER_URL}?view=chat#chat`)
  } else {
    chatWindow.loadFile(HTML_ENTRY, { query: { view: 'chat' }, hash: 'chat' })
  }

  chatWindow.once('ready-to-show', () => {
    if (chatWindow) {
      revealWindowOnCurrentSpace(chatWindow, { focus: true })
    }
  })

  chatWindow.on('closed', () => {
    chatWindow = null
    preferredDisplayId = null
  })

  chatWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return chatWindow
}

export function openChatWindow() {
  return createChatWindow()
}

export function getChatWindow() {
  return chatWindow
}

export function sendChatPayload(payload: ChatLaunchPayload) {
  if (!chatWindow || chatWindow.isDestroyed()) return
  chatWindow.webContents.send(IPC_CHANNELS.CHAT_UPDATE, payload)
}

function resolveDisplayFromPayload(payload?: ChatLaunchPayload) {
  if (payload?.preview?.rect && payload.viewport) {
    const rect = payload.preview.rect
    const viewport = payload.viewport
    const globalCenterX = viewport.x + rect.x + rect.width / 2
    const globalCenterY = viewport.y + rect.y + rect.height / 2
    return screen.getDisplayNearestPoint({ x: globalCenterX, y: globalCenterY })
  }

  if (typeof payload?.preview?.displayId === 'number') {
    const byDisplayId = screen.getAllDisplays().find((display) => display.id === payload.preview?.displayId)
    if (byDisplayId) return byDisplayId
  }

  if (payload?.viewport) {
    return screen.getDisplayMatching(payload.viewport)
  }

  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
}

function getPreferredDisplay() {
  if (typeof preferredDisplayId === 'number') {
    const displays = screen.getAllDisplays()
    const match = displays.find((display) => display.id === preferredDisplayId)
    if (match) {
      return match
    }
  }
  if (chatWindow && !chatWindow.isDestroyed()) {
    return screen.getDisplayMatching(chatWindow.getBounds())
  }
  return screen.getPrimaryDisplay()
}

export function updateChatWindowBounds(bounds: { width?: number; height?: number } = {}) {
  if (!chatWindow || chatWindow.isDestroyed()) return
  const targetDisplay = getPreferredDisplay()
  const workArea = targetDisplay?.workArea ?? targetDisplay.bounds
  const current = chatWindow.getBounds()
  const minWidth = 320
  const width = Math.round(
    Math.min(Math.max(bounds.width ?? current.width, minWidth), workArea.width - CHAT_WINDOW_MARGIN_X),
  )
  const minHeight = 140
  const maxHeight = Math.max(minHeight, workArea.height)
  const requestedHeight = bounds.height ?? current.height
  const height = Math.round(Math.min(Math.max(requestedHeight, minHeight), maxHeight))
  const x = Math.round(workArea.x + workArea.width - width - CHAT_WINDOW_MARGIN_X)
  const y = Math.round(workArea.y + workArea.height - height - CHAT_WINDOW_MARGIN_Y)
  chatWindow.setBounds({ x, y, width, height })
}

export function primeChatWindowDisplay(payload?: ChatLaunchPayload) {
  const display = resolveDisplayFromPayload(payload)
  preferredDisplayId = display?.id ?? null
  updateChatWindowBounds()
}
