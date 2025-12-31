import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  HoldStatusPayload,
  OverlayMode,
  SidecarStatus,
  AppSettings,
  SelectionExportPayload,
  SelectionExportResult,
  SessionLaunchPayload,
  ChatLaunchPayload,
  ReportLaunchPayload,
  ReportAutoSubmitPayload,
  DebugReportResult,
} from '@shared/types'

const overlayAPI = {
  onHoldStatus(callback: (payload: HoldStatusPayload) => void) {
    const listener = (_event: Electron.IpcRendererEvent, payload: HoldStatusPayload) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_STATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_STATE, listener)
  },
  onError(callback: (message: string) => void) {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_ERROR, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_ERROR, listener)
  },
  requestMode(mode: OverlayMode) {
    return ipcRenderer.invoke(IPC_CHANNELS.OVERLAY_MODE, mode)
  },
  requestSidecarStatus() {
    return ipcRenderer.invoke(IPC_CHANNELS.SIDECAR_STATUS) as Promise<SidecarStatus>
  },
  getPointerScale() {
    return ipcRenderer.invoke(IPC_CHANNELS.POINTER_SCALE) as Promise<number>
  },
  log(level: 'debug' | 'info' | 'warn' | 'error', payload: { message: string; meta?: Record<string, unknown> }) {
    ipcRenderer.send(IPC_CHANNELS.LOGGER_MESSAGE, { level, ...payload })
  },
}

const servicesAPI = {
  captureSnapshot(options?: { force?: boolean; displayId?: number; excludeOverlay?: boolean }) {
    return ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_CAPTURE, options)
  },
  discardSnapshot(snapshotId?: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_DISCARD, snapshotId)
  },
  exportSelection(payload: SelectionExportPayload) {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECTION_EXPORT, payload) as Promise<SelectionExportResult>
  },
}

const settingsAPI = {
  get(): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET)
  },
  update(payload: Partial<AppSettings>) {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, payload)
  },
  checkOllama() {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_CHECK_OLLAMA)
  },
  probeVision(profileId?: string | null) {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_PROBE_VISION, profileId ?? null)
  },
  reloadYoutuAgent() {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RELOAD_YOUTU_AGENT)
  },
  open() {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_OPEN) as Promise<number | null>
  },
}

const appAPI = {
  quit() {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT)
  },
  suppressGuide() {
    return ipcRenderer.invoke(IPC_CHANNELS.GUIDE_SUPPRESS)
  },
}

const sessionAPI = {
  start(payload: SessionLaunchPayload) {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_START, payload)
  },
  getBootstrap(): Promise<SessionLaunchPayload | null> {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_BOOTSTRAP)
  },
  onUpdate(callback: (payload: SessionLaunchPayload) => void) {
    const listener = (_event: Electron.IpcRendererEvent, payload: SessionLaunchPayload) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.SESSION_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSION_UPDATE, listener)
  },
  resize(bounds: { width?: number; height?: number }) {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_RESIZE, bounds)
  },
  reveal() {
    return ipcRenderer.invoke(IPC_CHANNELS.SESSION_REVEAL)
  },
}

const chatAPI = {
  start(payload: ChatLaunchPayload) {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAT_START, payload)
  },
  getBootstrap(): Promise<ChatLaunchPayload | null> {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAT_BOOTSTRAP)
  },
  onUpdate(callback: (payload: ChatLaunchPayload) => void) {
    const listener = (_event: Electron.IpcRendererEvent, payload: ChatLaunchPayload) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.CHAT_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_UPDATE, listener)
  },
  resize(bounds: { width?: number; height?: number }) {
    return ipcRenderer.invoke(IPC_CHANNELS.CHAT_RESIZE, bounds)
  },
}

const reportAPI = {
  start(payload: ReportLaunchPayload) {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORT_START, payload)
  },
  getBootstrap(): Promise<ReportLaunchPayload | null> {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORT_BOOTSTRAP)
  },
  submit(payload: { issue: string }): Promise<DebugReportResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORT_SUBMIT, payload)
  },
  autoSubmit(payload: ReportAutoSubmitPayload): Promise<DebugReportResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORT_AUTO_SUBMIT, payload)
  },
}

contextBridge.exposeInMainWorld('tipOverlay', overlayAPI)
contextBridge.exposeInMainWorld('tipServices', servicesAPI)
contextBridge.exposeInMainWorld('tipSettings', settingsAPI)
contextBridge.exposeInMainWorld('tipApp', appAPI)
contextBridge.exposeInMainWorld('tipSession', sessionAPI)
contextBridge.exposeInMainWorld('tipChat', chatAPI)
contextBridge.exposeInMainWorld('tipReport', reportAPI)
