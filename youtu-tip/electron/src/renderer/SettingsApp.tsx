import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import clsx from 'clsx'
import type { AppSettings, LLMProbeResult, LLMProfile, LLMProvider } from '@shared/types'
import { useSettingsStore } from './state/settingsStore'
import { useSidecarStatus } from './hooks/useSidecarStatus'
import { SkillsPanel } from './components/SkillsPanel'
import { rendererLogger } from './utils/logger'

const DEFAULT_PROFILE: LLMProfile = {
  id: 'tip_cloud',
  name: 'Tip Cloud',
  provider: 'tip_cloud',
  baseUrl: 'https://tipapi.wandeer.world/v1',
  model: 'LLM',
  apiModel: 'LLM',
  apiKey: '',
  headers: {},
  stream: true,
  temperature: 0.2,
  maxTokens: 2048,
  timeoutMs: 60000,
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen2.5vl:3b',
  openaiModel: '',
  openaiBaseUrl: '',
  isLocked: true,
}

const TIP_CLOUD_MODEL = 'LLM'
const DEFAULT_API_MODEL = DEFAULT_PROFILE.apiModel || DEFAULT_PROFILE.model || ''
const DEFAULT_OLLAMA_MODEL = DEFAULT_PROFILE.ollamaModel || 'qwen2.5vl:3b'
const DEFAULT_OPENAI_MODEL = DEFAULT_PROFILE.openaiModel || ''
const DEFAULT_OPENAI_BASE_URL = DEFAULT_PROFILE.openaiBaseUrl || ''
const DEFAULT_OPENAI_API_KEY = DEFAULT_PROFILE.apiKey || ''
const DEFAULT_YOUTU_AGENT_CONFIG = 'agents/simple/base'
const YOUTU_AGENT_CONFIG_OPTIONS = [
  {
    value: DEFAULT_YOUTU_AGENT_CONFIG,
    label: '基础助手（纯文本，无工具）',
  },
  {
    value: 'agents/examples/file_manager',
    label: 'File Manager（支持bash命令）',
  },
  {
    value: 'agents/examples/bash_fileparsing',
    label: 'File Manager plus（支持bash命令及文档解析）',
  },
]

const sanitizeValue = (value: string | null | undefined, fallback: string) => {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}

const VISION_KEYWORDS = ['vision', 'vl', 'gpt-4o', 'omni', 'gemini', 'flash', 'image', 'visual', 'sonnet', 'haiku', 'pixtral', 'qwen2.5']
const TEXT_ONLY_KEYWORDS = ['text', 'gpt-3', 'gpt-4', 'llama', 'mistral', 'deepseek', 'qwen2', 'yi', 'baichuan', 'glm', 'moonshot']

function isTextOnlyModelName(modelName?: string) {
  if (!modelName) return false
  const normalized = modelName.toLowerCase()
  if (VISION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false
  }
  if (TEXT_ONLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true
  }
  return false
}

function resolveProfileModel(profile: LLMProfile): string {
  if (profile.provider === 'ollama') {
    return sanitizeValue(profile.ollamaModel ?? profile.model, DEFAULT_OLLAMA_MODEL)
  }
  if (profile.provider === 'static_openai') {
    return sanitizeValue(profile.openaiModel ?? profile.apiModel ?? profile.model, DEFAULT_OPENAI_MODEL)
  }
  return sanitizeValue(profile.apiModel ?? profile.model, TIP_CLOUD_MODEL)
}

function buildInitialForm(settings: AppSettings | null | undefined): SettingsForm {
  const storedVisionEnabled = settings?.features?.visionEnabled
  const storedGuiAgentEnabled = settings?.features?.guiAgentEnabled
  const storedYoutuConfig = sanitizeValue(settings?.features?.youtuAgentConfig, DEFAULT_YOUTU_AGENT_CONFIG)
  return {
    language: settings?.language ?? 'system',
    visionEnabled: storedVisionEnabled ?? true,
    guiAgentEnabled: storedGuiAgentEnabled ?? true,
    youtuAgentConfig: storedYoutuConfig,
  }
}

function getFeatureHint(hasVlm: boolean, supportsImage: boolean | undefined, heuristicsTextOnly: boolean) {
  if (!hasVlm) return '未设置 VLM 或当前模型不支持图像输入，视觉与 GUI Agent 功能关闭。'
  if (supportsImage === false) return '当前 VLM 不支持图像输入，请更换模型。'
  if (heuristicsTextOnly && supportsImage === undefined) return '提示：模型名看起来像纯文本，建议确认是否支持图像输入。'
  return null
}

type SettingsForm = {
  language: string
  visionEnabled: boolean
  guiAgentEnabled: boolean
  youtuAgentConfig: string
}

type TabKey = 'general' | 'llm' | 'visual' | 'gui' | 'youtu'

const NAV_TABS: ReadonlyArray<{ id: TabKey; label: string; description: string }> = [
  { id: 'general', label: '通用', description: '语言与系统控制' },
  { id: 'llm', label: '模型', description: '模型与接入' },
  { id: 'gui', label: 'GUI Agent', description: 'GUI Agent 控制' },
  { id: 'youtu', label: 'Youtu Agent', description: '文本 Agent 控制' },
] as const

const TAB_META: Record<TabKey, { title: string; subtitle: string }> = {
  general: { title: '通用', subtitle: '系统语言与基础控制' },
  llm: { title: '模型', subtitle: '配置模型接入参数' },
  gui: { title: 'GUI Agent', subtitle: '管理 GUI Agent 可复用的技能脚本' },
  youtu: { title: 'Youtu Agent', subtitle: '管理 Youtu Agent 的可用性与配置。后续将支持按配置校验兼容性。' },
  visual: {
    title: 'Youtu Agent',
    subtitle: '管理 Youtu Agent 的可用性与配置。后续将支持按配置校验兼容性。',
  },
}

type DragRegionStyle = CSSProperties & { WebkitAppRegion?: 'drag' | 'no-drag' }

type GeneralTabProps = {
  form: SettingsForm
  inputClass: string
  interactiveRegionStyle: DragRegionStyle
  sortedProfiles: LLMProfile[]
  activeProfileId: string
  activeVlmId: string
  vlmActionError: string | null
  vlmActionMessage: string | null
  featureHint: string | null
  vlmActionState: 'idle' | 'saving' | 'probing'
  generalSaveLabel: string
  tipCloudNotice: boolean
  hasData: boolean
  onLanguageChange: (language: string) => void
  onSelectLlm: (id: string) => void
  onSelectVlm: (id: string) => void
  onGeneralSave: () => void
}

type LlmTabProps = {
  inputClass: string
  interactiveRegionStyle: DragRegionStyle
  sortedProfiles: LLMProfile[]
  activeProfile: LLMProfile
  llmActionState: 'idle' | 'saving'
  hasData: boolean
  confirmButtonLabel: string
  llmDirty: boolean
  llmActionError: string | null
  onSelectProfile: (id: string) => void
  onAddProfile: (provider: LLMProvider) => void
  onDeleteProfile: (profile: LLMProfile) => void
  onProviderChange: (profile: LLMProfile, provider: LLMProvider) => void
  onProfileChange: (profileId: string, patch: Partial<LLMProfile>) => void
  onSave: () => void
}

type YoutuTabProps = {
  form: SettingsForm
  inputClass: string
  interactiveRegionStyle: DragRegionStyle
  hasData: boolean
  youtuDirty: boolean
  youtuActionState: 'idle' | 'saving' | 'success' | 'error'
  youtuActionMessage: string | null
  onConfigChange: (value: string) => void
  onSave: () => void
}

function GeneralTab({
  form,
  inputClass,
  interactiveRegionStyle,
  sortedProfiles,
  activeProfileId,
  activeVlmId,
  vlmActionError,
  vlmActionMessage,
  featureHint,
  vlmActionState,
  generalSaveLabel,
  tipCloudNotice,
  hasData,
  onLanguageChange,
  onSelectLlm,
  onSelectVlm,
  onGeneralSave,
}: GeneralTabProps) {
  return (
    <div className="flex flex-col gap-4 text-sm text-slate-600">
      <div className="flex flex-col gap-2 rounded-[22px] border border-slate-200/80 bg-white/75 py-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">偏好语言</span>
          <select
            value={form.language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className={clsx(inputClass, 'appearance-none')}
            style={interactiveRegionStyle}
          >
            <option value="system">跟随系统</option>
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
      </div>
      <div className="h-px w-full bg-slate-200/80" style={interactiveRegionStyle} />
      <div className="flex flex-col gap-2 rounded-[22px] border border-slate-200/80 bg-white/75 py-1" style={interactiveRegionStyle}>
        <div className="grid grid-cols-1 gap-1.5">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">默认 LLM</span>
            <select
              value={activeProfileId}
              onChange={(event) => onSelectLlm(event.target.value)}
              className={clsx(inputClass, 'appearance-none pr-8')}
              style={interactiveRegionStyle}
            >
              {sortedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.provider === 'tip_cloud' ? 'Tip Cloud' : profile.provider === 'ollama' ? 'Ollama' : 'OpenAI'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">视觉模型（VLM）</span>
            <select
              value={activeVlmId}
              onChange={(event) => onSelectVlm(event.target.value)}
              className={clsx(inputClass, 'appearance-none pr-8')}
              style={interactiveRegionStyle}
            >
              <option value="">不设置（禁用截图/GUI Agent）</option>
              {sortedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.provider === 'tip_cloud' ? 'Tip Cloud' : profile.provider === 'ollama' ? 'Ollama' : 'OpenAI'}
                </option>
              ))}
            </select>
          </label>
          {vlmActionError && <p className="text-xs text-red-600">{vlmActionError}</p>}
          {vlmActionMessage && <p className="text-xs text-emerald-600">{vlmActionMessage}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-white/75 py-3" style={interactiveRegionStyle}>
        {featureHint && <p className="text-xs text-amber-600">{featureHint}</p>}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400/70"
            style={interactiveRegionStyle}
            disabled={!hasData || vlmActionState === 'saving' || vlmActionState === 'probing'}
            onClick={onGeneralSave}
          >
            {generalSaveLabel}
          </button>
          {vlmActionError && <span className="text-xs text-red-600">{vlmActionError}</span>}
        </div>
        {tipCloudNotice && !vlmActionError && <p className="text-xs text-purple-600">您正在使用Tip Cloud免费体验</p>}
      </div>
    </div>
  )
}

function LlmTab({
  inputClass,
  interactiveRegionStyle,
  sortedProfiles,
  activeProfile,
  llmActionState,
  hasData,
  confirmButtonLabel,
  llmDirty,
  llmActionError,
  onSelectProfile,
  onAddProfile,
  onDeleteProfile,
  onProviderChange,
  onProfileChange,
  onSave,
}: LlmTabProps) {
  return (
    <div className="flex flex-col gap-5 text-sm text-slate-600">
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/80 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">模型列表</span>
              <div className="relative w-64">
                <select
                  value={activeProfile.id}
                  onChange={(event) => onSelectProfile(event.target.value)}
                  className="w-full appearance-none rounded-full border border-slate-300/90 bg-white px-4 py-2 pr-10 text-sm font-medium text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:border-slate-400 focus:border-purple-300 focus:outline-none"
                  style={interactiveRegionStyle}
                >
                  {sortedProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.provider === 'tip_cloud' ? 'Tip Cloud' : profile.provider === 'ollama' ? 'Ollama' : 'OpenAI'}
                    </option>
                  ))}
                </select>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <path d="M3 4.5l3 3 3-3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pr-0">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
              style={interactiveRegionStyle}
              onClick={() => void onAddProfile('static_openai')}
            >
              新建
            </button>
            {!activeProfile.isLocked && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white/80 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300"
                style={interactiveRegionStyle}
                onClick={() => onDeleteProfile(activeProfile)}
              >
                删除
              </button>
            )}
          </div>
        </div>
        <div className="h-px w-full bg-slate-200/80" style={interactiveRegionStyle} />

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 px-0">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">名称</span>
            <input
              value={activeProfile.name}
              onChange={(event) => onProfileChange(activeProfile.id, { name: event.target.value })}
              className={inputClass}
              disabled={activeProfile.isLocked}
              placeholder="自定义名称"
            />
          </label>
          {!activeProfile.isLocked && (
            <label className="flex w-full flex-col gap-1 sm:max-w-[220px]">
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">通道</span>
              <select
                value={activeProfile.provider}
                onChange={(event) => void onProviderChange(activeProfile, event.target.value as LLMProvider)}
                className={clsx(inputClass, 'appearance-none pr-8')}
              >
                <option value="static_openai">OpenAI</option>
                <option value="ollama">Ollama</option>
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {activeProfile.provider === 'tip_cloud' ? (
            <p className="text-xs text-slate-500">内置云端模型，无需配置。</p>
          ) : (
            <>
              {activeProfile.provider === 'static_openai' && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Base URL</span>
                    <input
                      value={activeProfile.openaiBaseUrl || ''}
                      onChange={(event) => {
                        const value = event.target.value
                        onProfileChange(activeProfile.id, { openaiBaseUrl: value, baseUrl: value })
                      }}
                      className={inputClass}
                      placeholder="https://api.your-llm.com/v1"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">API Key</span>
                    <input
                      value={activeProfile.apiKey || activeProfile.headers?.Authorization || ''}
                      onChange={(event) => {
                        const value = event.target.value
                        const nextHeaders = { ...(activeProfile.headers || {}) }
                        if (value) {
                          nextHeaders.Authorization = value.startsWith('Bearer ') ? value : `Bearer ${value}`
                        } else {
                          delete nextHeaders.Authorization
                        }
                        onProfileChange(activeProfile.id, {
                          apiKey: value,
                          headers: nextHeaders,
                        })
                      }}
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      placeholder="sk-..."
                    />
                  </label>
                </>
              )}
              {activeProfile.provider === 'ollama' && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Ollama Base URL</span>
                  <input
                    value={activeProfile.ollamaBaseUrl || ''}
                    onChange={(event) => onProfileChange(activeProfile.id, { ollamaBaseUrl: event.target.value })}
                    className={inputClass}
                    placeholder="http://127.0.0.1:11434"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">模型</span>
                <input
                  value={
                    activeProfile.provider === 'ollama'
                      ? activeProfile.ollamaModel || DEFAULT_OLLAMA_MODEL
                      : activeProfile.openaiModel || activeProfile.apiModel || DEFAULT_API_MODEL
                  }
                  onChange={(event) => {
                    const value = event.target.value
                    if (activeProfile.provider === 'ollama') {
                      onProfileChange(activeProfile.id, { ollamaModel: value, model: value, apiModel: value })
                    } else {
                      onProfileChange(activeProfile.id, { openaiModel: value, apiModel: value, model: value })
                    }
                  }}
                  className={inputClass}
                  placeholder={activeProfile.provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : 'gpt-4o-mini'}
                />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            type="button"
            className="inline-flex items-center justify-center self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400/70"
            style={interactiveRegionStyle}
            disabled={llmActionState !== 'idle' || !hasData}
            onClick={onSave}
          >
            {confirmButtonLabel}
          </button>
          {llmDirty && llmActionState === 'idle' && <p className="text-xs text-slate-500">有未保存的更改，点击上方按钮保存。</p>}
          {llmActionError && <p className="text-xs text-red-600">{llmActionError}</p>}
        </div>
      </div>
    </div>
  )
}

function YoutuTab({
  form,
  inputClass,
  interactiveRegionStyle,
  hasData,
  youtuDirty,
  youtuActionState,
  youtuActionMessage,
  onConfigChange,
  onSave,
}: YoutuTabProps) {
  return (
    <div className="flex flex-col gap-5 text-sm text-slate-600">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Agent Config</span>
        <select
          value={form.youtuAgentConfig || DEFAULT_YOUTU_AGENT_CONFIG}
          onChange={(event) => onConfigChange(event.target.value)}
          className={clsx(inputClass, 'appearance-none pr-8')}
          style={interactiveRegionStyle}
        >
          {YOUTU_AGENT_CONFIG_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-2 rounded-[22px] border border-slate-200/80 bg-white/75 py-4" style={interactiveRegionStyle}>
        <div className="flex items-center justify-start gap-3 pl-1 pr-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400/70"
            style={interactiveRegionStyle}
            disabled={!hasData || youtuActionState === 'saving' || (!youtuDirty && youtuActionState !== 'success')}
            onClick={onSave}
          >
            {youtuActionState === 'saving' ? '保存中…' : youtuActionState === 'success' && !youtuDirty ? '已保存' : '保存'}
          </button>
          {youtuActionMessage && (
            <p className={clsx('text-xs', youtuActionState === 'error' ? 'text-red-600' : 'text-emerald-600')}>{youtuActionMessage}</p>
          )}
        </div>
        {youtuDirty && <p className="text-xs text-amber-600">配置已修改，保存后才会生效。</p>}
      </div>
    </div>
  )
}

export function SettingsApp() {
  const data = useSettingsStore((state) => state.data)
  const loading = useSettingsStore((state) => state.loading)
  const error = useSettingsStore((state) => state.error)
  const fetchSettings = useSettingsStore((state) => state.fetchSettings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const sidecarStatus = useSidecarStatus()
  const sidecarReady = sidecarStatus?.status === 'connected'

  const [form, setForm] = useState<SettingsForm>(() => buildInitialForm(data))
  const [profiles, setProfiles] = useState<LLMProfile[]>(() => data?.llmProfiles?.length ? data.llmProfiles : [DEFAULT_PROFILE])
  const [activeProfileId, setActiveProfileId] = useState<string>(() => data?.llmActiveId || DEFAULT_PROFILE.id)
  const [activeVlmId, setActiveVlmId] = useState<string>(() => data?.vlmActiveId ?? '')
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const saveTimeoutRef = useRef<number | null>(null)
  const [providerCheckPending, setProviderCheckPending] = useState(false)
  const [llmDirty, setLlmDirty] = useState(false)
  const [llmActionState, setLlmActionState] = useState<'idle' | 'saving'>('idle')
  const [llmActionError, setLlmActionError] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<LLMProbeResult | null>(null)
  const [vlmActionState, setVlmActionState] = useState<'idle' | 'saving' | 'probing'>('idle')
  const [vlmActionError, setVlmActionError] = useState<string | null>(null)
  const [vlmActionMessage, setVlmActionMessage] = useState<string | null>(null)
  const [youtuDirty, setYoutuDirty] = useState(false)
  const [youtuActionState, setYoutuActionState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [youtuActionMessage, setYoutuActionMessage] = useState<string | null>(null)
  const [tipCloudNotice, setTipCloudNotice] = useState(false)

  useEffect(() => {
    if (!sidecarReady) return
    fetchSettings()
  }, [fetchSettings, sidecarReady])

  useEffect(() => {
    if (data) {
      setForm(buildInitialForm(data))
      setProfiles(data.llmProfiles?.length ? data.llmProfiles : [DEFAULT_PROFILE])
      setActiveProfileId(data.llmActiveId || DEFAULT_PROFILE.id)
      setActiveVlmId(data.vlmActiveId ?? '')
      setLlmDirty(false)
      setYoutuDirty(false)
      setYoutuActionState('idle')
      setYoutuActionMessage(null)
      setProbeResult(null)
      setVlmActionState('idle')
      setVlmActionError(null)
      setVlmActionMessage(null)
    }
  }, [data])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const sortedProfiles = useMemo(() => {
    const list = profiles.length ? profiles : [DEFAULT_PROFILE]
    return [...list].sort((a, b) => {
      if (a.provider === 'tip_cloud') return -1
      if (b.provider === 'tip_cloud') return 1
      return a.name.localeCompare(b.name)
    })
  }, [profiles])

  const activeProfile = useMemo(() => {
    const found = sortedProfiles.find((p) => p.id === activeProfileId)
    return found ?? sortedProfiles[0] ?? DEFAULT_PROFILE
  }, [activeProfileId, sortedProfiles])

  const activeVlmProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeVlmId) ?? null,
    [activeVlmId, profiles],
  )
  const activeVlmModelName = useMemo(() => resolveProfileModel(activeVlmProfile || activeProfile), [activeVlmProfile, activeProfile])
  const hasData = useMemo(() => Boolean(data) && sidecarReady, [data, sidecarReady])
  const heuristicsTextOnly = useMemo(() => isTextOnlyModelName(activeVlmModelName), [activeVlmModelName])
  const activeProbeResult = useMemo(() => {
    if (!probeResult) return null
    const currentId = (activeVlmId || '').trim()
    if (!currentId) return null
    return probeResult.profileId === currentId ? probeResult : null
  }, [probeResult, activeVlmId])
  const supportsImage = activeProbeResult?.supportsImage
  const hasVlm = Boolean((activeVlmId || '').trim() && activeVlmProfile)
  const tipCloudSelected = useMemo(
    () => activeProfile.provider === 'tip_cloud' || activeVlmProfile?.provider === 'tip_cloud',
    [activeProfile.provider, activeVlmProfile?.provider],
  )
  const featureHint = useMemo(
    () => getFeatureHint(hasVlm, supportsImage, heuristicsTextOnly),
    [hasVlm, supportsImage, heuristicsTextOnly],
  )
  const applyUpdate = useCallback(
    async (
      nextForm: SettingsForm,
      nextProfiles?: LLMProfile[],
      nextActiveLlmId?: string,
      nextActiveVlmId?: string | null,
    ) => {
      const normalizeProfile = (profile: LLMProfile): LLMProfile => {
        const headers = { ...(profile.headers || {}) }
        // 确保 Authorization 走 Bearer 头
        if (profile.apiKey && profile.apiKey.trim()) {
          const raw = profile.apiKey.trim()
          headers.Authorization = raw.toLowerCase().startsWith('bearer ') ? raw : `Bearer ${raw}`
        }
        // 针对 openrouter 需要附带 Referer/X-Title
        const base = (profile.openaiBaseUrl || profile.baseUrl || '').toLowerCase()
        if (profile.provider === 'static_openai' && base.includes('openrouter.ai')) {
          if (!headers['HTTP-Referer']) {
            headers['HTTP-Referer'] = 'https://tip.local'
          }
          if (!headers['X-Title']) {
            headers['X-Title'] = 'Tip'
          }
        }
        const normalizedApiModel =
          profile.provider === 'ollama'
            ? profile.ollamaModel || profile.model || DEFAULT_OLLAMA_MODEL
            : profile.apiModel || profile.model || DEFAULT_API_MODEL
        return {
          ...profile,
          headers,
          apiModel: normalizedApiModel,
          model: normalizedApiModel,
        }
      }

      const profilesToSave = (nextProfiles ?? profiles).map(normalizeProfile)
      const activeLlmIdToUse = nextActiveLlmId ?? activeProfileId
      const vlmIdRaw = nextActiveVlmId ?? activeVlmId ?? ''
      const activeVlmIdToUse = vlmIdRaw.trim()
      const hasVlmSelected = Boolean(activeVlmIdToUse)
      const featurePayload = {
        visionEnabled: hasVlmSelected ? nextForm.visionEnabled : false,
        guiAgentEnabled: hasVlmSelected ? nextForm.guiAgentEnabled : false,
        youtuAgentEnabled: true,
        youtuAgentConfig: nextForm.youtuAgentConfig || DEFAULT_YOUTU_AGENT_CONFIG,
      }
      const success = await updateSettings({
        language: nextForm.language,
        llmProfiles: profilesToSave,
        llmActiveId: activeLlmIdToUse,
        vlmActiveId: activeVlmIdToUse,
        features: featurePayload,
      })
      return success
    },
    [updateSettings, profiles, activeProfileId, activeVlmId],
  )

  const queueSave = useCallback(
    (nextForm: SettingsForm, nextProfiles?: LLMProfile[], nextActiveLlmId?: string, nextActiveVlmId?: string | null) => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = window.setTimeout(async () => {
        await applyUpdate(nextForm, nextProfiles, nextActiveLlmId, nextActiveVlmId)
      }, 300)
    },
    [applyUpdate],
  )

  const handleFieldChange = (
    patch: Partial<SettingsForm>,
    options?: { autoSave?: boolean; llmEdit?: boolean; markYoutuDirty?: boolean },
  ) => {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      if (options?.autoSave) {
        queueSave(next, profiles, activeProfileId, activeVlmId)
      }
      if (options?.llmEdit) {
        setLlmDirty(true)
        setProbeResult(null)
        setLlmActionError(null)
      }
      if (options?.markYoutuDirty) {
        setYoutuDirty(true)
        setYoutuActionState('idle')
        setYoutuActionMessage(null)
      }
      return next
    })
  }

  const handleLanguageChange = (language: string) => {
    handleFieldChange({ language }, { autoSave: true })
  }

  const verifyOllamaAvailability = useCallback(async () => {
    if (!window.tipSettings?.checkOllama) {
      rendererLogger.warn('tipSettings.checkOllama unavailable')
      return false
    }
    try {
      await window.tipSettings.checkOllama()
      return true
    } catch (error) {
      rendererLogger.error('ollama availability check failed', { error: (error as Error)?.message })
      return false
    }
  }, [])

  const upsertProfile = useCallback(
    (profileId: string, patch: Partial<LLMProfile>) => {
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, ...patch } : p)))
      setLlmDirty(true)
      setProbeResult(null)
      setLlmActionError(null)
    },
    [],
  )

  const handleProfileProviderChange = useCallback(
    async (profile: LLMProfile, provider: LLMProvider) => {
      if (profile.provider === provider || provider === 'tip_cloud') return
      if (provider === 'ollama') {
        setProviderCheckPending(true)
        const ok = await verifyOllamaAvailability()
        setProviderCheckPending(false)
        if (!ok) {
          window.alert('未检测到本地 Ollama 服务，请先启动后再切换到端侧模型。')
          return
        }
      }
      if (provider === 'ollama') {
        upsertProfile(profile.id, {
          provider,
          ollamaBaseUrl: profile.ollamaBaseUrl || 'http://127.0.0.1:11434',
          ollamaModel: profile.ollamaModel || DEFAULT_OLLAMA_MODEL,
          model: profile.ollamaModel || profile.model || DEFAULT_OLLAMA_MODEL,
          apiModel: profile.ollamaModel || profile.model || DEFAULT_OLLAMA_MODEL,
        })
      } else {
        upsertProfile(profile.id, {
          provider,
          openaiBaseUrl: profile.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL,
          baseUrl: profile.openaiBaseUrl || profile.baseUrl || '',
          openaiModel: profile.openaiModel || profile.apiModel || DEFAULT_API_MODEL,
          apiModel: profile.apiModel || profile.model || DEFAULT_API_MODEL,
          model: profile.apiModel || profile.model || DEFAULT_API_MODEL,
        })
      }
    },
    [upsertProfile, verifyOllamaAvailability],
  )

  const handleAddProfile = useCallback(
    async (provider: LLMProvider) => {
      if (provider === 'tip_cloud') return
      if (provider === 'ollama') {
        setProviderCheckPending(true)
        const ok = await verifyOllamaAvailability()
        setProviderCheckPending(false)
        if (!ok) {
          window.alert('未检测到本地 Ollama 服务，请先启动后再添加端侧模型。')
          return
        }
      }
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `profile-${Date.now()}`
      const name = provider === 'ollama' ? 'Ollama 模型' : 'OpenAI SDK'
      const baseProfile: LLMProfile = {
        id,
        name,
        provider,
        baseUrl: '',
        model: provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_API_MODEL,
        apiModel: provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_API_MODEL,
        apiKey: '',
        headers: {},
        stream: true,
        temperature: 0.2,
        maxTokens: 2048,
        timeoutMs: 60000,
        ollamaBaseUrl: 'http://127.0.0.1:11434',
        ollamaModel: DEFAULT_OLLAMA_MODEL,
        openaiModel: provider === 'static_openai' ? DEFAULT_API_MODEL : DEFAULT_OPENAI_MODEL,
        openaiBaseUrl: provider === 'static_openai' ? DEFAULT_OPENAI_BASE_URL : '',
        isLocked: false,
      }
      setProfiles((prev) => [...prev, baseProfile])
      setActiveProfileId(id)
      setLlmDirty(true)
      setProbeResult(null)
      setLlmActionError(null)
    },
    [verifyOllamaAvailability],
  )

  const handleDeleteProfile = useCallback(
    (profile: LLMProfile) => {
      if (profile.isLocked || profile.provider === 'tip_cloud') return
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
      if (activeProfileId === profile.id) {
        setActiveProfileId('tip_cloud')
      }
      if (activeVlmId === profile.id) {
        setActiveVlmId('')
        setForm((prev) => ({ ...prev, visionEnabled: false, guiAgentEnabled: false }))
      }
      setLlmDirty(true)
      setProbeResult(null)
      setLlmActionError(null)
    },
    [activeProfileId, activeVlmId],
  )

  const handleSelectLlm = useCallback(
    (nextId: string) => {
      setActiveProfileId(nextId)
      setLlmActionError(null)
      setLlmDirty(true)
      queueSave(form, profiles, nextId, activeVlmId)
    },
    [activeVlmId, form, profiles, queueSave],
  )

  const handleSelectProfile = (nextId: string) => {
    setActiveProfileId(nextId)
    setProbeResult(null)
    setLlmDirty(true)
    setLlmActionError(null)
  }

  const handleSelectVlm = useCallback(
    (nextId: string) => {
      const trimmed = (nextId || '').trim()
      setActiveVlmId(trimmed)
      setProbeResult(null)
      setVlmActionError(null)
      const updated = { ...form }
      if (!trimmed) {
        updated.visionEnabled = false
        updated.guiAgentEnabled = false
      }
      setForm(updated)
    },
    [form],
  )

  const handleSaveLlm = useCallback(async () => {
    setLlmActionError(null)
    setLlmActionState('saving')
    const success = await applyUpdate(form, profiles, activeProfile.id, activeVlmId)
    if (!success) {
      setLlmActionState('idle')
      setLlmActionError('设置保存失败，请稍后重试。')
      return
    }
    setLlmDirty(false)
    setLlmActionState('idle')
  }, [applyUpdate, form, profiles, activeProfile.id, activeVlmId])

  const handleGeneralSave = useCallback(async () => {
    setVlmActionError(null)
    setVlmActionMessage(null)
    setProbeResult(null)
    const hasVlmSelected = Boolean((activeVlmId || '').trim())
    const nextForm = {
      ...form,
      visionEnabled: hasVlmSelected,
      guiAgentEnabled: hasVlmSelected,
    }
    setForm(nextForm)
    setVlmActionState('saving')
    const saved = await applyUpdate(nextForm, profiles, activeProfileId, hasVlmSelected ? activeVlmId : '')
    if (!saved) {
      setVlmActionState('idle')
      setVlmActionError('设置保存失败，请稍后重试。')
      return
    }
    setTipCloudNotice(tipCloudSelected)
    if (!hasVlmSelected) {
      setVlmActionState('idle')
      return
    }
    setVlmActionState('probing')
    try {
      const result = await window.tipSettings?.probeVision?.(activeVlmId)
      if (!result) {
        throw new Error('未能获取探针结果')
      }
      setProbeResult(result)
      if (!result.supportsImage) {
        setVlmActionError('模型不支持图像输入，请选择其他 VLM。')
        setVlmActionMessage(null)
        const fallbackForm = { ...nextForm, visionEnabled: false, guiAgentEnabled: false }
        setActiveVlmId('')
        setForm(fallbackForm)
        await applyUpdate(fallbackForm, profiles, activeProfileId, '')
      } else {
        const enabledForm = { ...nextForm, visionEnabled: true, guiAgentEnabled: true }
        setForm(enabledForm)
        setVlmActionMessage('已保存并开启视觉与 GUI Agent。')
      }
    } catch (error) {
      const message = (error as Error)?.message || '检测失败，请稍后重试。'
      setVlmActionError(message)
      const fallbackForm = { ...form, visionEnabled: false, guiAgentEnabled: false }
      setForm(fallbackForm)
      await applyUpdate(fallbackForm, profiles, activeProfileId, activeVlmId)
    } finally {
      setVlmActionState('idle')
    }
  }, [activeProfileId, activeVlmId, applyUpdate, form, profiles])

  const handleYoutuConfigChange = (value: string) => {
    handleFieldChange({ youtuAgentConfig: value }, { markYoutuDirty: true })
  }

  const handleYoutuSave = useCallback(async () => {
    if (youtuActionState === 'saving' || !hasData) return
    setYoutuActionState('saving')
    setYoutuActionMessage(null)
    const success = await applyUpdate(form, profiles, activeProfile.id, activeVlmId)
    if (!success) {
      setYoutuActionState('error')
      setYoutuActionMessage('设置保存失败，请稍后重试。')
      return
    }
    setYoutuDirty(false)
    try {
      await window.tipSettings?.reloadYoutuAgent?.()
      setYoutuActionState('success')
      setYoutuActionMessage('已保存并重新加载 Youtu Agent。')
    } catch (error) {
      rendererLogger.error('reload youtu agent failed', { error: (error as Error)?.message })
      setYoutuActionState('error')
      setYoutuActionMessage('已保存，但重建失败，请稍后重试。')
    }
  }, [applyUpdate, form, hasData, youtuActionState, profiles, activeProfile.id])

  const inputClass =
    'rounded-full border border-slate-200/80 bg-white/95 px-4 py-2 text-[13px] text-slate-900 outline-none transition focus:border-purple-300 focus:ring-0 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400'

  const tabMeta = TAB_META[activeTab]

  const confirmButtonLabel = llmActionState === 'saving' ? '保存中…' : '保存'
  const generalSaveLabel =
    vlmActionState === 'saving'
      ? '保存中…'
      : vlmActionState === 'probing'
        ? '检测中…'
        : '保存'

  const dragRegionStyle: DragRegionStyle = { WebkitAppRegion: 'drag' }
  const interactiveRegionStyle: DragRegionStyle = { WebkitAppRegion: 'no-drag' }

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-transparent px-4 py-2 text-slate-900" style={dragRegionStyle}>
      <div
        className="relative flex w-full max-w-[900px] min-h-[560px] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 text-slate-900"
        style={{ ...dragRegionStyle, marginTop: '12px', height: 'calc(100vh - 40px)' }}
      >
        <aside className="flex w-44 shrink-0 flex-col bg-white/95 px-4 py-6" style={interactiveRegionStyle}>
          <div className="flex flex-1 flex-col">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Tip</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">设置</p>
            </div>
            <nav className="flex flex-col gap-3">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'inline-flex items-center justify-between rounded-full border border-tip-highlight-to/60 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-tip-highlight-to',
                    activeTab === tab.id ? 'bg-slate-900/90 text-white' : 'bg-white/60 hover:bg-white/90',
                  )}
                  style={interactiveRegionStyle}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-auto pt-10">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500/90 focus-visible:outline-none border-0 appearance-none"
                style={interactiveRegionStyle}
                onClick={() => window.tipApp?.quit?.()}
              >
                退出 Tip
              </button>
            </div>
          </div>
        </aside>
        <div className="mx-3 my-6 w-px bg-slate-200/80" aria-hidden="true" />
        <div className="relative flex flex-1 flex-col bg-white/95 px-8 py-8 min-h-0" style={interactiveRegionStyle}>
          <div className="mb-6 flex items-center justify-between pr-10">
            <div>
              <p className="text-lg font-semibold text-slate-900">{tabMeta.title}</p>
              <p className="text-sm text-slate-500">{tabMeta.subtitle}</p>
            </div>
          </div>

          {!hasData && (
            <div className="flex flex-1 items-center justify-center rounded-[22px] border border-dashed border-slate-200/80 bg-white/60 text-sm text-slate-500">
              {!sidecarReady
                ? 'Sidecar 正在启动，请稍等片刻，再次打开设置页面'
                : loading
                  ? '设置加载中…'
                  : error ?? '无法加载设置，请稍后重试'}
            </div>
          )}

          {hasData && (
            <div className="flex-1 overflow-y-auto pr-3 min-h-0" style={interactiveRegionStyle}>
              {activeTab === 'general' && (
                <GeneralTab
                  form={form}
                  inputClass={inputClass}
                  interactiveRegionStyle={interactiveRegionStyle}
                  sortedProfiles={sortedProfiles}
                  activeProfileId={activeProfileId}
                  activeVlmId={activeVlmId}
                  vlmActionError={vlmActionError}
                  vlmActionMessage={vlmActionMessage}
                  featureHint={featureHint}
                  vlmActionState={vlmActionState}
                  generalSaveLabel={generalSaveLabel}
                  tipCloudNotice={tipCloudNotice}
                  hasData={hasData}
                  onLanguageChange={handleLanguageChange}
                  onSelectLlm={handleSelectLlm}
                  onSelectVlm={handleSelectVlm}
                  onGeneralSave={() => {
                    void handleGeneralSave()
                  }}
                />
              )}

              {activeTab === 'llm' && (
                <LlmTab
                  inputClass={inputClass}
                  interactiveRegionStyle={interactiveRegionStyle}
                  sortedProfiles={sortedProfiles}
                  activeProfile={activeProfile}
                  llmActionState={llmActionState}
                  hasData={hasData}
                  confirmButtonLabel={confirmButtonLabel}
                  llmDirty={llmDirty}
                  llmActionError={llmActionError}
                  onSelectProfile={handleSelectProfile}
                  onAddProfile={handleAddProfile}
                  onDeleteProfile={handleDeleteProfile}
                  onProviderChange={handleProfileProviderChange}
                  onProfileChange={upsertProfile}
                  onSave={() => {
                    void handleSaveLlm()
                  }}
                />
              )}
              {activeTab === 'youtu' && (
                <YoutuTab
                  form={form}
                  inputClass={inputClass}
                  interactiveRegionStyle={interactiveRegionStyle}
                  hasData={hasData}
                  youtuDirty={youtuDirty}
                  youtuActionState={youtuActionState}
                  youtuActionMessage={youtuActionMessage}
                  onConfigChange={handleYoutuConfigChange}
                  onSave={() => {
                    void handleYoutuSave()
                  }}
                />
              )}
              {activeTab === 'gui' && <SkillsPanel interactiveRegionStyle={interactiveRegionStyle} />}
            </div>
          )}

          {error && hasData && !loading && (
            <p className="mt-4 rounded-full bg-red-50 px-4 py-1.5 text-center text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
