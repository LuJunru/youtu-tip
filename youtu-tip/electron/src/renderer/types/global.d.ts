import type {
  HoldStatusPayload,
  OverlayMode,
  ScreenshotResult,
  SidecarStatus,
  AppSettings,
  SelectionExportPayload,
  SelectionExportResult,
  SessionLaunchPayload,
  ChatLaunchPayload,
  ReportLaunchPayload,
  ReportAutoSubmitPayload,
  DebugReportResult,
  LLMProbeResult,
} from '@shared/types'

declare global {
  interface Window {
    tipOverlay?: {
      onHoldStatus: (callback: (payload: HoldStatusPayload) => void) => (() => void) | void
      requestMode: (mode: OverlayMode) => Promise<void>
      requestSidecarStatus: () => Promise<SidecarStatus>
      getPointerScale: () => Promise<number>
      onError: (callback: (message: string) => void) => (() => void) | void
      log: (
        level: 'debug' | 'info' | 'warn' | 'error',
        payload: { message: string; meta?: Record<string, unknown> },
      ) => void
    }
    tipServices?: {
      captureSnapshot: (options?: { force?: boolean; displayId?: number; excludeOverlay?: boolean }) => Promise<ScreenshotResult>
      discardSnapshot: (snapshotId?: string) => Promise<void>
      exportSelection: (payload: SelectionExportPayload) => Promise<SelectionExportResult>
    }
    tipSettings?: {
      get: () => Promise<AppSettings>
      update: (payload: Partial<AppSettings>) => Promise<AppSettings>
      checkOllama: () => Promise<{ status: string }>
      probeVision: (profileId?: string | null) => Promise<LLMProbeResult>
      reloadYoutuAgent: () => Promise<{ status: string; config?: string; provider?: string }>
      open: () => Promise<number | null>
    }
    tipSession?: {
      start: (payload: SessionLaunchPayload) => Promise<void>
      getBootstrap: () => Promise<SessionLaunchPayload | null>
      onUpdate: (callback: (payload: SessionLaunchPayload) => void) => (() => void) | void
      resize: (bounds: { width?: number; height?: number }) => Promise<void>
      reveal: () => Promise<void>
    }
    tipChat?: {
      start: (payload: ChatLaunchPayload) => Promise<void>
      getBootstrap: () => Promise<ChatLaunchPayload | null>
      onUpdate: (callback: (payload: ChatLaunchPayload) => void) => (() => void) | void
      resize: (bounds: { width?: number; height?: number }) => Promise<void>
    }
    tipReport?: {
      start: (payload: ReportLaunchPayload) => Promise<void>
      getBootstrap: () => Promise<ReportLaunchPayload | null>
      submit: (payload: { issue: string }) => Promise<DebugReportResult>
      autoSubmit: (payload: ReportAutoSubmitPayload) => Promise<DebugReportResult>
    }
    tipApp?: {
      quit: () => Promise<void>
      suppressGuide?: () => Promise<boolean>
    }
  }
}

export {}
