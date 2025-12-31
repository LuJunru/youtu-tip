import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const LOG_DIR = path.join(os.homedir(), 'Library', 'Logs', 'Tip')
fs.mkdirSync(LOG_DIR, { recursive: true })

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function formatLine(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const metaPart = meta ? ` ${JSON.stringify(meta)}` : ''
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaPart}\n`
}

function appendToFile(logId: string, line: string) {
  const filePath = path.join(LOG_DIR, `${logId}.log`)
  fs.appendFile(filePath, line, (error) => {
    if (error) {
      // fallback to stderr if writing fails
      console.error('[Tip] failed to write log', error)
    }
  })
}

function createLogger(logId: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      appendToFile(logId, formatLine('debug', message, meta))
      console.debug(message, meta ?? '')
    },
    info(message: string, meta?: Record<string, unknown>) {
      appendToFile(logId, formatLine('info', message, meta))
      console.info(message, meta ?? '')
    },
    warn(message: string, meta?: Record<string, unknown>) {
      appendToFile(logId, formatLine('warn', message, meta))
      console.warn(message, meta ?? '')
    },
    error(message: string, meta?: Record<string, unknown>) {
      appendToFile(logId, formatLine('error', message, meta))
      console.error(message, meta ?? '')
    },
  }
}

export const mainLogger = createLogger('main')
export const rendererLogger = createLogger('renderer')
