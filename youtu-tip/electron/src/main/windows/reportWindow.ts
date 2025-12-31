import { BrowserWindow, shell } from 'electron'
import { DEV_SERVER_URL, HTML_ENTRY, PRELOAD_DIST } from '../runtimePaths'

let reportWindow: BrowserWindow | null = null

const DEFAULT_WIDTH = 560
const DEFAULT_HEIGHT = 480

function createReportWindow() {
  const existing = reportWindow
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) {
      existing.show()
    }
    existing.focus()
    return existing
  }

  reportWindow = new BrowserWindow({
    title: 'Tip 问题报告',
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    autoHideMenuBar: true,
    hasShadow: false,
    titleBarStyle: 'hiddenInset',
    useContentSize: true,
    trafficLightPosition: { x: -100, y: -100 },
    webPreferences: {
      preload: PRELOAD_DIST,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (DEV_SERVER_URL) {
    reportWindow.loadURL(`${DEV_SERVER_URL}?view=report#report`)
  } else {
    reportWindow.loadFile(HTML_ENTRY, { query: { view: 'report' }, hash: 'report' })
  }

  reportWindow.once('ready-to-show', () => {
    if (process.platform === 'darwin' && typeof reportWindow?.setWindowButtonVisibility === 'function') {
      reportWindow.setWindowButtonVisibility(false)
    }
    reportWindow?.center()
    reportWindow?.show()
  })

  reportWindow.on('closed', () => {
    reportWindow = null
  })

  reportWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return reportWindow
}

export function openReportWindow() {
  return createReportWindow()
}

export function getReportWindow() {
  return reportWindow
}
