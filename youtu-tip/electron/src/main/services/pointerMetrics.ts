import { systemPreferences } from 'electron'
import { mainLogger } from './logger'

const DEFAULT_POINTER_SCALE = 1

export function getPointerScale(): number {
  if (process.platform !== 'darwin') {
    return DEFAULT_POINTER_SCALE
  }

  if (typeof systemPreferences.getUserDefault !== 'function') {
    return DEFAULT_POINTER_SCALE
  }

  try {
    const value = systemPreferences.getUserDefault('mouseDriverCursorSize', 'float') as number | undefined
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value
    }
  } catch (error) {
    mainLogger.debug('pointer scale unavailable', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return DEFAULT_POINTER_SCALE
}
