import { BrowserWindow, shell, screen } from 'electron'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'

let settingsWindow: BrowserWindow | null = null

const DEFAULT_WINDOW_WIDTH = 800
const DEFAULT_WINDOW_HEIGHT = 660
const MIN_WINDOW_WIDTH = 720
const MIN_WINDOW_HEIGHT = 560
const VERTICAL_MARGIN = 48
const HORIZONTAL_MARGIN = 48

function createSettingsWindow() {
  const existing = settingsWindow
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) {
      existing.show()
    }
    existing.focus()
    return existing
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workArea ?? {
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
  }
  const safeWidth = Math.max(
    MIN_WINDOW_WIDTH,
    Math.min(DEFAULT_WINDOW_WIDTH, workArea.width - HORIZONTAL_MARGIN * 2),
  )
  const safeHeight = Math.max(
    MIN_WINDOW_HEIGHT,
    Math.min(DEFAULT_WINDOW_HEIGHT, workArea.height - VERTICAL_MARGIN * 2),
  )
  const startX = Math.round(workArea.x + Math.max(0, (workArea.width - safeWidth) / 2))
  const startY = Math.round(workArea.y + Math.max(0, (workArea.height - safeHeight) / 2))

  settingsWindow = new BrowserWindow({
    title: 'Tip 设置',
    width: safeWidth,
    height: safeHeight,
    x: startX,
    y: startY,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    frame: true,
    titleBarStyle: 'hiddenInset',
    transparent: false,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_DIST,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (DEV_SERVER_URL) {
    settingsWindow.loadURL(`${DEV_SERVER_URL}?view=settings#settings`)
  } else {
    settingsWindow.loadFile(HTML_ENTRY, { query: { view: 'settings' }, hash: 'settings' })
  }

  settingsWindow.once('ready-to-show', () => {
    const currentUrl = settingsWindow?.webContents.getURL()
    console.info('[Tip] settings window ready', currentUrl)
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return settingsWindow
}

export function openSettingsWindow() {
  return createSettingsWindow()
}
