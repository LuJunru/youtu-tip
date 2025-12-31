import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../state/settingsStore'
import { useSystemStore } from '../state/systemStore'

export function useSettingsBootstrap() {
  const fetchSettings = useSettingsStore((state) => state.fetchSettings)
  const sidecarStatus = useSystemStore((state) => state.sidecarStatus?.status)
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (sidecarStatus !== 'connected' || fetchedRef.current) {
      return
    }
    fetchedRef.current = true
    fetchSettings()
  }, [fetchSettings, sidecarStatus])
}
