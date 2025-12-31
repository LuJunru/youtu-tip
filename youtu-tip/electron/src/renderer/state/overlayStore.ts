import { create } from 'zustand'
import type {
  HoldStatusPayload,
  OverlayMode,
  ScreenshotResult,
  SelectionRect,
  IntentCandidate,
} from '@shared/types'

interface OverlayState {
  mode: OverlayMode
  holdActive: boolean
  visible: boolean
  lastUpdatedAt: number
  snapshot: ScreenshotResult | null
  selectionRect: SelectionRect | null
  selectionPreview: { dataUrl: string; rect: SelectionRect; displayId: number } | null
  selectionLocked: boolean
  intentCandidates: IntentCandidate[]
  intentLoading: boolean
  intentError: string | null
  sessionId: string | null
  selectedIntent: string | null
  setHoldState: (payload: HoldStatusPayload) => void
  setMode: (mode: OverlayMode) => void
  setSnapshot: (snapshot: ScreenshotResult | null) => void
  setSelectionRect: (rect: SelectionRect | null) => void
  setSelectionPreview: (payload: { dataUrl: string; rect: SelectionRect; displayId: number } | null) => void
  setSelectionLocked: (locked: boolean) => void
  setIntentState: (payload: {
    candidates?: IntentCandidate[]
    loading?: boolean
    error?: string | null
    sessionId?: string | null
  }) => void
  setSelectedIntent: (intent: string | null) => void
  resetIntents: () => void
  reset: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  mode: 'idle',
  holdActive: false,
  visible: false,
  lastUpdatedAt: 0,
  snapshot: null,
  selectionRect: null,
  selectionPreview: null,
  selectionLocked: false,
  intentCandidates: [],
  intentLoading: false,
  intentError: null,
  sessionId: null,
  selectedIntent: null,
  setHoldState: (payload) =>
    set((state) => {
      if (payload.source === 'renderer') {
        return {
          ...state,
          holdActive: payload.holdActive,
          mode: payload.mode,
          visible: payload.mode !== 'idle',
          lastUpdatedAt: payload.triggeredAt,
        }
      }

      if (payload.holdActive) {
        return {
          ...state,
          holdActive: true,
          mode: 'primed',
          visible: true,
          lastUpdatedAt: payload.triggeredAt,
        }
      }

      const shouldAutoReset =
        state.mode === 'primed' &&
        !state.selectionRect &&
        !state.selectionPreview &&
        state.intentCandidates.length === 0 &&
        !state.intentLoading &&
        !state.sessionId

      if (shouldAutoReset) {
        return {
          ...state,
          holdActive: false,
          mode: 'idle',
          visible: false,
          lastUpdatedAt: payload.triggeredAt,
          snapshot: null,
          selectionRect: null,
          selectionPreview: null,
          selectionLocked: false,
          intentCandidates: [],
          intentLoading: false,
          intentError: null,
          sessionId: null,
          selectedIntent: null,
        }
      }

      return {
        ...state,
        holdActive: false,
        lastUpdatedAt: payload.triggeredAt,
      }
    }),
  setMode: (mode) =>
    set({
      mode,
      visible: mode !== 'idle',
      lastUpdatedAt: Date.now(),
    }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setSelectionRect: (selectionRect) => set({ selectionRect }),
  setSelectionPreview: (selectionPreview) => set({ selectionPreview }),
  setSelectionLocked: (selectionLocked) => set({ selectionLocked }),
  setIntentState: (payload) =>
    set((state) => ({
      intentCandidates: payload.candidates ?? state.intentCandidates,
      intentLoading: payload.loading ?? state.intentLoading,
      intentError: payload.error ?? state.intentError,
      sessionId: payload.sessionId ?? state.sessionId,
    })),
  setSelectedIntent: (intent) => set({ selectedIntent: intent }),
  resetIntents: () =>
    set({
      intentCandidates: [],
      intentLoading: false,
      intentError: null,
      sessionId: null,
      selectedIntent: null,
    }),
  reset: () =>
    set({
      mode: 'idle',
      holdActive: false,
      visible: false,
      lastUpdatedAt: Date.now(),
      snapshot: null,
      selectionRect: null,
      selectionPreview: null,
      selectionLocked: false,
      intentCandidates: [],
      intentLoading: false,
      intentError: null,
      sessionId: null,
      selectedIntent: null,
    }),
}))
