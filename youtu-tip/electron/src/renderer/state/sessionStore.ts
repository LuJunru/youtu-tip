import { create } from 'zustand'
import type {
  IntentCandidate,
  SelectionPreview,
  SessionLaunchPayload,
  TextSelectionPayload,
  VirtualViewport,
} from '@shared/types'

interface SessionState {
  preview: SelectionPreview | null
  viewport: VirtualViewport | null
  captureId: string | null
  launchedAt: number | null
  intentCandidates: IntentCandidate[]
  intentLoading: boolean
  intentError: string | null
  sessionId: string | null
  selectedIntent: string | null
  intentCancelled: boolean
  textSelection: TextSelectionPayload | null
  setBootstrap: (payload: SessionLaunchPayload | null) => void
  setIntentState: (payload: {
    candidates?: IntentCandidate[]
    loading?: boolean
    error?: string | null
    sessionId?: string | null
  }) => void
  setSelectedIntent: (intent: string | null) => void
  setIntentCancelled: (cancelled: boolean) => void
  reset: () => void
}

const initialState = {
  preview: null,
  viewport: null,
  captureId: null,
  launchedAt: null,
  intentCandidates: [],
  intentLoading: false,
  intentError: null,
  sessionId: null,
  selectedIntent: null,
  intentCancelled: false,
  textSelection: null,
}

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setBootstrap(payload) {
    if (!payload) {
      set(initialState)
      return
    }
    set({
      preview: payload.preview,
      viewport: payload.viewport,
      captureId: payload.captureId ?? null,
      launchedAt: payload.launchedAt ?? Date.now(),
      intentCandidates: [],
      intentLoading: false,
      intentError: null,
      sessionId: null,
      selectedIntent: null,
      intentCancelled: false,
      textSelection: payload.textSelection ?? null,
    })
  },
  setIntentState: (payload) =>
    set((state) => ({
      intentCandidates: payload.candidates ?? state.intentCandidates,
      intentLoading: payload.loading ?? state.intentLoading,
      intentError: payload.error ?? state.intentError,
      sessionId: payload.sessionId ?? state.sessionId,
    })),
  setSelectedIntent: (intent) => set({ selectedIntent: intent }),
  setIntentCancelled: (cancelled) => set({ intentCancelled: cancelled }),
  reset: () => set(initialState),
}))
