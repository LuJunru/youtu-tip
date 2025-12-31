import { useEffect, useRef } from 'react'
import { fetchIntentCandidates } from '../services/api'
import { useToastStore } from '../state/toastStore'
import { useSettingsStore } from '../state/settingsStore'
import { useSessionStore } from '../state/sessionStore'
import { useSystemStore } from '../state/systemStore'
import { rendererLogger } from '../utils/logger'
import type { SelectionRect } from '@shared/types'

const intentAutoReportRegistry = new Set<string>()
const intentFetchRegistry = new Map<string, 'pending' | 'completed'>()

export function useSessionIntent() {
  const preview = useSessionStore((state) => state.preview)
  const launchedAt = useSessionStore((state) => state.launchedAt)
  const intentLoading = useSessionStore((state) => state.intentLoading)
  const setIntentState = useSessionStore((state) => state.setIntentState)
  const textSelection = useSessionStore((state) => state.textSelection)
  const sessionId = useSessionStore((state) => state.sessionId)
  const captureId = useSessionStore((state) => state.captureId)
  const viewport = useSessionStore((state) => state.viewport)
  const intentCancelled = useSessionStore((state) => state.intentCancelled)
  const pushToast = useToastStore((state) => state.pushToast)
  const language = useSettingsStore((state) => state.data?.language)
  const effectiveLanguage = language && language !== 'system' ? language : undefined
  const sidecarReady = useSystemStore((state) => state.sidecarStatus?.status === 'connected')
  const intentCancelledRef = useRef(intentCancelled)

  useEffect(() => {
    intentCancelledRef.current = intentCancelled
  }, [intentCancelled])

  useEffect(() => {
    if (sessionId) {
      return
    }
    const launchKey =
      launchedAt != null
        ? `launch:${launchedAt}`
        : preview
          ? `preview:${preview.dataUrl.slice(0, 32)}`
          : textSelection?.text
            ? `text:${textSelection.text.slice(0, 64)}`
            : 'empty'
    if (launchKey && intentFetchRegistry.has(launchKey)) {
      rendererLogger.debug('session intent fetch skipped (duplicate)', {
        launchKey,
        status: intentFetchRegistry.get(launchKey),
      })
      return
    }

    if (!sidecarReady) {
      setIntentState({ loading: true, error: null, sessionId: null })
      return
    }

    if (launchKey) {
      intentFetchRegistry.set(launchKey, 'pending')
    }

    setIntentState({ loading: !intentCancelled, error: null, sessionId: null })
    const requestPayload: { image?: string; text?: string; language?: string; selection?: SelectionRect } = {
      language: effectiveLanguage,
    }
    if (textSelection?.text) {
      requestPayload.text = textSelection.text
    } else if (preview) {
      rendererLogger.debug('session intent fetch', {
        width: Math.round(preview.rect.width),
        height: Math.round(preview.rect.height),
      })
      requestPayload.image = preview.dataUrl
      requestPayload.selection = {
        ...preview.rect,
        displayId: preview.displayId,
      }
    }
    fetchIntentCandidates(requestPayload)
      .then((response) => {
        const cancelled = intentCancelledRef.current
        setIntentState({
          loading: false,
          candidates: cancelled ? [] : response.candidates,
          sessionId: response.sessionId,
          error: null,
        })
        if (launchKey) {
          intentFetchRegistry.set(launchKey, 'completed')
        }
      })
      .catch((error) => {
        rendererLogger.error('session intent fetch failed', { error: (error as Error)?.message })
        setIntentState({ loading: false, error: '无法生成意图候选，请重试' })
        pushToast({ message: '意图生成失败，请检查 Sidecar 状态', type: 'error' })
        if (launchKey) {
          intentFetchRegistry.delete(launchKey)
        }
      })
  }, [effectiveLanguage, launchedAt, preview, pushToast, sessionId, setIntentState, sidecarReady, textSelection?.text])

  useEffect(() => {
    if (!intentLoading && !preview && !textSelection?.text && !sessionId) {
      setIntentState({ candidates: [], loading: false, error: null, sessionId: null })
    }
  }, [intentLoading, preview, sessionId, setIntentState, textSelection?.text])

  useEffect(() => {
    if (!sessionId) return
    if (!window.tipReport?.autoSubmit) return
    const key = `intent:${sessionId}`
    if (intentAutoReportRegistry.has(key)) {
      rendererLogger.debug('intent auto report skipped (already sent)', { sessionId })
      return
    }
    intentAutoReportRegistry.add(key)
    rendererLogger.info('intent auto report pending', {
      sessionId,
      captureId,
      hasPreview: Boolean(preview),
      hasTextSelection: Boolean(textSelection?.text),
    })
    void window.tipReport
      .autoSubmit({
        sessionId,
        captureId: captureId ?? undefined,
        preview: preview ?? null,
        viewport: viewport ?? null,
        selectedIntent: null,
        draftIntent: null,
        textSelection: textSelection ?? null,
        issue: '自动打包：意图阶段',
        label: 'intent-auto',
      })
      .then((result) => {
        rendererLogger.info('intent auto report dispatched', { sessionId, reportId: result?.reportId })
      })
      .catch((error) => {
        rendererLogger.warn('auto intent report failed', { error: (error as Error)?.message })
        intentAutoReportRegistry.delete(key)
      })
  }, [captureId, preview, sessionId, textSelection, viewport])
}
