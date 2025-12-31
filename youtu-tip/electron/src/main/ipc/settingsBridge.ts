import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { AppSettings, LLMProbeResult } from '@shared/types'
import { fetchJson } from '../services/sidecarRequest'
import { setCachedSettings } from '../services/settingsCache'
import { markGuideSuppressed } from '../services/startupGuideFlag'
import { openSettingsWindow } from '../windows/settingsWindow'

export function registerSettingsBridge() {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<AppSettings> => {
    const settings = await fetchJson<AppSettings>('/settings')
    setCachedSettings(settings)
    return settings
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, payload: Partial<AppSettings>) => {
    const settings = await fetchJson<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    setCachedSettings(settings)
    return settings
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_CHECK_OLLAMA, async () => {
    return fetchJson<{ status: string }>('/llm/ollama/status')
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_PROBE_VISION, async (_event, profileId?: string | null) => {
    const payload = await fetchJson<{
      supports_image: boolean
      provider: string
      model: string
      profile_id?: string | null
      error_message?: string | null
      response_preview?: string | null
    }>('/llm/vision-probe', {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId ?? null }),
    })
    const result: LLMProbeResult = {
      supportsImage: Boolean(payload.supports_image),
      provider: payload.provider,
      model: payload.model,
      profileId: payload.profile_id,
      errorMessage: payload.error_message,
      responsePreview: payload.response_preview,
    }
    return result
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RELOAD_YOUTU_AGENT, async () => {
    return fetchJson('/youtu-agent/reload', { method: 'POST' })
  })

  ipcMain.handle(IPC_CHANNELS.GUIDE_SUPPRESS, () => {
    return markGuideSuppressed()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_OPEN, () => {
    const window = openSettingsWindow()
    return window?.id ?? null
  })
}
