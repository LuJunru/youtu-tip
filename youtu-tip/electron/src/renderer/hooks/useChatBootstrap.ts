import { useEffect, useRef } from 'react'
import type { ChatLaunchPayload } from '@shared/types'
import { useChatStore } from '../state/chatStore'
import { rendererLogger } from '../utils/logger'

export function useChatBootstrap() {
  const openConversation = useChatStore((state) => state.openConversation)
  const closeConversation = useChatStore((state) => state.closeConversation)
  const lastSessionRef = useRef<string | null>(null)

  useEffect(() => {
    const api = window.tipChat
    if (!api) {
      rendererLogger.error('chat bridge unavailable')
      return
    }

    const launchConversation = (payload: ChatLaunchPayload | null) => {
      if (!payload) {
        lastSessionRef.current = null
        closeConversation()
        return
      }
      if (lastSessionRef.current === payload.sessionId) {
        // 已经在当前会话中，无需重复打开
        return
      }
      lastSessionRef.current = payload.sessionId
      openConversation(payload)
    }

    let active = true
    const bootstrap = async () => {
      try {
        const payload = await api.getBootstrap?.()
        if (active) {
          launchConversation(payload ?? null)
        }
      } catch (error) {
        rendererLogger.error('chat bootstrap failed', { error: (error as Error)?.message })
      }
    }
    void bootstrap()

    const unsubscribe = api.onUpdate?.((payload) => {
      launchConversation(payload)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [closeConversation, openConversation])
}
