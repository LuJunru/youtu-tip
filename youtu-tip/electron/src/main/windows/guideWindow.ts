import { BrowserWindow, screen, shell } from 'electron'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'

let guideWindow: BrowserWindow | null = null

const DEFAULT_WIDTH = 860
const DEFAULT_HEIGHT = 660
const MIN_WIDTH = 760
const MIN_HEIGHT = 560
const WINDOW_MARGIN = 32

function createGuideWindow() {
  const existing = guideWindow
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) existing.showInactive()
    return existing
  }

  const display = screen.getPrimaryDisplay()
  const workArea = display.workArea ?? display.bounds
  const width = Math.max(MIN_WIDTH, Math.min(DEFAULT_WIDTH, workArea.width - WINDOW_MARGIN * 2))
  const height = Math.max(MIN_HEIGHT, Math.min(DEFAULT_HEIGHT, workArea.height - WINDOW_MARGIN * 2))
  const startX = Math.round(workArea.x + Math.max(0, (workArea.width - width) / 2))
  const startY = Math.round(workArea.y + Math.max(0, (workArea.height - height) / 2))

  guideWindow = new BrowserWindow({
    title: 'Tip 使用指引',
    width,
    height,
    x: startX,
    y: startY,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    resizable: true,
    frame: true,
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
    guideWindow.loadURL(`${DEV_SERVER_URL}?view=guide#guide`)
  } else {
    guideWindow.loadFile(HTML_ENTRY, { query: { view: 'guide' }, hash: 'guide' })
  }

  guideWindow.once('ready-to-show', () => {
    guideWindow?.showInactive()
  })

  guideWindow.on('closed', () => {
    guideWindow = null
  })

  guideWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return guideWindow
}

export function openGuideWindow() {
  return createGuideWindow()
}
