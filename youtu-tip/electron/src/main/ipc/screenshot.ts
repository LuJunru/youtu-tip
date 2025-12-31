import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { ScreenshotResult, SelectionExportPayload, SelectionExportResult } from '@shared/types'
import {
  captureScreenSnapshot,
  getLatestSnapshot,
  discardSnapshot,
  saveSelectionPreview,
} from '../services/captureService'
import { mainLogger } from '../services/logger'

export function registerScreenshotHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_CAPTURE,
    async (_event, options?: { force?: boolean; displayId?: number; excludeOverlay?: boolean }): Promise<ScreenshotResult> => {
      if (!options?.force) {
        const cached = getLatestSnapshot()
        if (cached) {
          mainLogger.debug('returning cached snapshot', {
            generatedAt: cached.generatedAt,
            displays: cached.displays.length,
          })
          return cached
        }
      }
      mainLogger.debug('capturing new snapshot', { force: options?.force ?? false })
      return captureScreenSnapshot({
        force: options?.force ?? false,
        displayId: options?.displayId,
        excludeOverlay: options?.excludeOverlay,
      })
    },
  )

  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_DISCARD, async (_event, snapshotId?: string) => {
    await discardSnapshot(snapshotId)
  })

  ipcMain.handle(
    IPC_CHANNELS.SELECTION_EXPORT,
    async (_event, payload: SelectionExportPayload): Promise<SelectionExportResult> => {
      if (!payload?.dataUrl) {
        throw new Error('selection export requires dataUrl')
      }
      const result = await saveSelectionPreview(payload)
      mainLogger.debug('selection exported', { result })
      return result
    },
  )
}
