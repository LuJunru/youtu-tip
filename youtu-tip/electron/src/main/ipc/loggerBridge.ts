import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { rendererLogger } from '../services/logger'
import type { LogLevel } from '../services/logger'

interface LoggerPayload {
  level: LogLevel
  message: string
  meta?: Record<string, unknown>
}

export function registerLoggerBridge() {
  ipcMain.on(IPC_CHANNELS.LOGGER_MESSAGE, (_event, payload: LoggerPayload) => {
    if (!payload?.message) return
    const { level, message, meta } = payload
    const loggerMethod = rendererLogger[level] ?? rendererLogger.info
    if (meta) {
      loggerMethod(message, meta)
    } else {
      loggerMethod(message)
    }
  })
}
