export type OverlayMode = 'idle' | 'primed' | 'selecting' | 'intent' | 'chat'

export interface HoldStatusPayload {
  mode: OverlayMode
  holdActive: boolean
  triggeredAt: number
  source: 'hotkey' | 'renderer'
}

export interface ScreenshotDisplay {
  id: number
  width: number
  height: number
  scale: number
  bounds: { x: number; y: number; width: number; height: number }
  dataUrl: string
  filename: string
}

export interface VirtualViewport {
  x: number
  y: number
  width: number
  height: number
}

export interface ScreenshotResult {
  id: string
  generatedAt: number
  cacheDir: string
  displays: ScreenshotDisplay[]
  viewport: VirtualViewport
}

export interface SidecarStatus {
  status: 'disconnected' | 'connected'
  lastCheckedAt: number
  baseUrl?: string
  version?: string
  incompatible?: boolean
  requiredVersion?: string
}

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
  displayId?: number
}

export interface SelectionPreview {
  dataUrl: string
  rect: SelectionRect
  displayId: number
}

export interface TextSelectionPayload {
  text: string
  truncated?: string
}

export interface IntentCandidate {
  id: string
  title: string
}

export interface IntentResponse {
  sessionId: string
  candidates: IntentCandidate[]
}

export interface SelectionExportPayload {
  snapshotId?: string
  dataUrl: string
  rect?: SelectionRect
  displayId?: number
}

export interface SelectionExportResult {
  path: string
  latestAliasPath?: string
  metadataPath?: string
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  pending?: boolean
  reasoning?: string | null
}

export type LLMProvider = 'tip_cloud' | 'ollama' | 'static_openai'

export interface LLMProfile {
  id: string
  name: string
  provider: LLMProvider
  baseUrl: string
  model: string
  apiModel?: string | null
  apiKey?: string | null
  headers: Record<string, string>
  stream: boolean
  temperature: number
  maxTokens: number
  timeoutMs: number
  ollamaBaseUrl: string
  ollamaModel?: string | null
  openaiModel?: string | null
  openaiBaseUrl?: string | null
  isLocked?: boolean
}

export interface AppSettings {
  settingsVersion?: string
  language: string
  llmProfiles: LLMProfile[]
  llmActiveId: string
  vlmActiveId?: string | null
  shortcuts: {
    holdToSense: string[]
    cancelThresholdPx: number
  }
  paths: {
    cacheDir: string
    settingsFile: string
    logsDir: string
  }
  features?: {
    visionEnabled: boolean
    guiAgentEnabled: boolean
    youtuAgentEnabled?: boolean
    youtuAgentConfig?: string | null
    startupGuideEnabled?: boolean
  }
}

export interface SessionLaunchPayload {
  preview: SelectionPreview | null
  viewport: VirtualViewport | null
  captureId?: string
  launchedAt: number
  textSelection?: TextSelectionPayload | null
}

export type ChatSessionMode = 'chat' | 'gui-agent' | 'youtu-agent'

export interface GuiAgentLaunchMeta {
  runId: string
  instruction: string
}

export interface YoutuAgentLaunchMeta {
  prompt: string
}

export interface ChatLaunchPayload {
  sessionId: string
  intent: string
  initialMessage?: string
  captureId?: string
  preview?: SelectionPreview | null
  viewport?: VirtualViewport | null
  textSelection?: TextSelectionPayload | null
  mode?: ChatSessionMode
  guiAgent?: GuiAgentLaunchMeta | null
  youtuAgent?: YoutuAgentLaunchMeta | null
}

export interface ReportLaunchPayload {
  sessionId: string
  captureId?: string | null
  preview?: SelectionPreview | null
  viewport?: VirtualViewport | null
  selectedIntent?: string | null
  draftIntent?: string | null
  textSelection?: TextSelectionPayload | null
  label?: string | null
  guiAgent?: GuiAgentLaunchMeta | null
}

export interface ReportAutoSubmitPayload extends ReportLaunchPayload {
  issue: string
  label?: string | null
}

export interface SnapshotDebugDisplay {
  id: number
  width: number
  height: number
  scale: number
  bounds: { x: number; y: number; width: number; height: number }
  dataUrl: string
}

export interface SnapshotDebugPayload {
  id: string
  generatedAt: number
  viewport: VirtualViewport
  displays: SnapshotDebugDisplay[]
}

export interface DebugLogAttachment {
  name: string
  path: string
  truncated: boolean
  totalBytes: number
  retainedBytes: number
  content: string
  encoding?: 'utf-8' | 'base64'
  mimeType?: string
}

export interface DebugReportResult {
  path: string
  reportId: string
  createdAt: string
  remoteUrl?: string
}

export interface SkillSummary {
  id: string
  title: string
}

export interface SkillDetail extends SkillSummary {
  body: string
}

export interface LLMProbeResult {
  supportsImage: boolean
  provider: string
  model: string
  profileId?: string | null
  errorMessage?: string | null
  responsePreview?: string | null
}
