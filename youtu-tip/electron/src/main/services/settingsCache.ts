import type { AppSettings } from '@shared/types'
import { fetchJson } from './sidecarRequest'
import { mainLogger } from './logger'

let cachedSettings: AppSettings | null = null

type FeatureFlag = 'visionEnabled' | 'guiAgentEnabled' | 'startupGuideEnabled'

export function getCachedSettings() {
  return cachedSettings
}

export function setCachedSettings(settings: AppSettings) {
  cachedSettings = settings
}

function getFeatureState(flag: FeatureFlag) {
  if (!cachedSettings?.features) return true
  return cachedSettings.features[flag] !== false
}

export function isVisionFeatureEnabled() {
  return getFeatureState('visionEnabled')
}

export function isGuiAgentFeatureEnabled() {
  return getFeatureState('guiAgentEnabled')
}

export function isStartupGuideEnabled() {
  return getFeatureState('startupGuideEnabled')
}

export async function refreshSettingsCache() {
  try {
    const settings = await fetchJson<AppSettings>('/settings')
    setCachedSettings(settings)
    return settings
  } catch (error) {
    mainLogger.warn('settings cache refresh failed', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
