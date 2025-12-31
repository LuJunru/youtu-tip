import { create } from 'zustand'
import type { SidecarStatus } from '@shared/types'
import { rendererLogger } from '../utils/logger'

interface SystemState {
  sidecarStatus: SidecarStatus | null
  fetchStatus: () => Promise<void>
}

export const useSystemStore = create<SystemState>((set) => ({
  sidecarStatus: null,
  async fetchStatus() {
    try {
      const status = await window.tipOverlay?.requestSidecarStatus?.()
      if (status) {
        set({ sidecarStatus: status })
      }
    } catch (error) {
      rendererLogger.error('sidecar status fetch failed', { error: (error as Error)?.message })
      set({ sidecarStatus: { status: 'disconnected', lastCheckedAt: Date.now() } })
    }
  },
}))
