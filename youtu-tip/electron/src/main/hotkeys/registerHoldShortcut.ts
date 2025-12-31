import { uIOhook, UiohookKey } from 'uiohook-napi'
import type { HoldStatusPayload } from '@shared/types'
import { mainLogger } from '../services/logger'

export type HoldStateChange = (payload: HoldStatusPayload) => void | Promise<void>

export function registerHoldShortcut(onChange?: HoldStateChange) {
  let controlHeld = false
  let shiftHeld = false
  let active = false
  let hookRunning = false

  const updateState = (source: HoldStatusPayload['source']) => {
    const next = controlHeld && shiftHeld
    if (next === active) return
    active = next

    const payload: HoldStatusPayload = {
      mode: next ? 'primed' : 'idle',
      holdActive: next,
      triggeredAt: Date.now(),
      source,
    }

    if (next) {
      mainLogger.debug('hold shortcut engaged')
    } else {
      mainLogger.debug('hold shortcut released')
    }
    void onChange?.(payload)
  }

  const handleKeyDown = (keycode: number) => {
    if (keycode === UiohookKey.Ctrl || keycode === UiohookKey.CtrlRight) {
      controlHeld = true
    }
    if (keycode === UiohookKey.Shift || keycode === UiohookKey.ShiftRight) {
      shiftHeld = true
    }
    updateState('hotkey')
  }

  const handleKeyUp = (keycode: number) => {
    if (keycode === UiohookKey.Ctrl || keycode === UiohookKey.CtrlRight) {
      controlHeld = false
    }
    if (keycode === UiohookKey.Shift || keycode === UiohookKey.ShiftRight) {
      shiftHeld = false
    }
    updateState('hotkey')
  }

  uIOhook.on('keydown', (event) => handleKeyDown(event.keycode))
  uIOhook.on('keyup', (event) => handleKeyUp(event.keycode))
  uIOhook.start()
  hookRunning = true

  return () => {
    uIOhook.removeAllListeners('keydown')
    uIOhook.removeAllListeners('keyup')
    if (hookRunning) {
      uIOhook.stop()
      hookRunning = false
    }
  }
}
