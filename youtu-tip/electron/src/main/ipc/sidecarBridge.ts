import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { SidecarStatus } from '@shared/types'
import { checkSidecarHealth, getRequiredSidecarVersion, getSidecarBaseUrl, isSidecarCompatible } from '../services/sidecarHealth'

export function registerSidecarBridge() {
  ipcMain.handle(IPC_CHANNELS.SIDECAR_STATUS, async (): Promise<SidecarStatus> => {
    const health = await checkSidecarHealth()
    const compatible = isSidecarCompatible(health)
    return {
      status: compatible ? 'connected' : 'disconnected',
      lastCheckedAt: Date.now(),
      baseUrl: getSidecarBaseUrl(),
      version: health.version,
      incompatible: Boolean(health.ok && !compatible),
      requiredVersion: getRequiredSidecarVersion(),
    }
  })
}
