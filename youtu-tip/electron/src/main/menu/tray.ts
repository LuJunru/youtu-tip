import path from 'node:path'
import { app, Tray, nativeImage } from 'electron'
import { mainLogger } from '../services/logger'
import { APP_ROOT } from '../runtimePaths'
import { openSettingsWindow } from '../windows/settingsWindow'

let tray: Tray | null = null

function resolveTrayIconPath() {
  const baseDir = app.isPackaged ? app.getAppPath() : APP_ROOT ?? process.cwd()
  return path.join(baseDir, 'assets', 'trayTemplate.png')
}

export function createAppTray() {
  if (tray) {
    return tray
  }
  try {
    const iconPath = resolveTrayIconPath()
    const baseIcon = nativeImage.createFromPath(iconPath)
    if (baseIcon.isEmpty()) {
      throw new Error(`tray icon image missing or invalid: ${iconPath}`)
    }
    const icon = baseIcon.resize({ width: 18, height: 18 })
    icon.setTemplateImage(true)
    tray = new Tray(icon)
    tray.setToolTip('Tip')
    tray.on('click', () => {
      openSettingsWindow()
    })
    mainLogger.info('menu bar icon initialized')
    return tray
  } catch (error) {
    mainLogger.error('failed to create tray icon', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export function destroyAppTray() {
  if (!tray) return
  tray.destroy()
  tray = null
  mainLogger.info('menu bar icon destroyed')
}
