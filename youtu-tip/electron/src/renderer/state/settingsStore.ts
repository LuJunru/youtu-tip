import { create } from 'zustand'
import type { AppSettings } from '@shared/types'
import { rendererLogger } from '../utils/logger'

interface SettingsState {
  data: AppSettings | null
  loading: boolean
  error: string | null
  fetchSettings: () => Promise<void>
  updateSettings: (payload: Partial<AppSettings>) => Promise<boolean>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  async fetchSettings() {
    try {
      set({ loading: true, error: null })
      const result = await window.tipSettings?.get?.()
      if (result) {
        set({ data: result, loading: false, error: null })
      } else {
        set({ loading: false, error: '无法获取设置' })
      }
    } catch (error) {
      rendererLogger.error('fetch settings failed', { error: (error as Error)?.message })
      set({ loading: false, error: '设置加载失败' })
    }
  },
  async updateSettings(payload) {
    try {
      set({ loading: true, error: null })
      const result = await window.tipSettings?.update?.(payload)
      if (result) {
        set({ data: result, loading: false, error: null })
        return true
      }
    } catch (error) {
      rendererLogger.error('update settings failed', { error: (error as Error)?.message })
      set({ loading: false, error: '设置保存失败' })
      return false
    }
    set({ loading: false, error: '设置保存失败' })
    return false
  },
}))
