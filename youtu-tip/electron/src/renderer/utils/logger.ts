type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function send(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = { message, ...(meta ? { meta } : {}) }
  try {
    const api = window.tipOverlay
    api?.log?.(level, payload)
  } catch {
    // ignore logging transport failures
  }
  switch (level) {
    case 'debug':
      console.debug(message, meta ?? '')
      break
    case 'info':
      console.info(message, meta ?? '')
      break
    case 'warn':
      console.warn(message, meta ?? '')
      break
    case 'error':
      console.error(message, meta ?? '')
      break
    default:
      console.log(message, meta ?? '')
  }
}

export const rendererLogger = {
  debug(message: string, meta?: Record<string, unknown>) {
    send('debug', message, meta)
  },
  info(message: string, meta?: Record<string, unknown>) {
    send('info', message, meta)
  },
  warn(message: string, meta?: Record<string, unknown>) {
    send('warn', message, meta)
  },
  error(message: string, meta?: Record<string, unknown>) {
    send('error', message, meta)
  },
}
