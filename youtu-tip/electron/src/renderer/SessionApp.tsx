import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ToastHost } from './components/ToastHost'
import { useSessionBootstrap } from './hooks/useSessionBootstrap'
import { useSessionIntent } from './hooks/useSessionIntent'
import { useSessionStore } from './state/sessionStore'
import { useSettingsBootstrap } from './hooks/useSettingsBootstrap'
import { useToastStore } from './state/toastStore'
import { useSidecarStatus } from './hooks/useSidecarStatus'
import { rendererLogger } from './utils/logger'
import { startGuiAgentRun } from './services/guiAgentClient'
import { useSettingsStore } from './state/settingsStore'
import type { TextSelectionPayload } from '@shared/types'

function guessIsFilePath(text: string) {
  const value = text.trim()
  if (!value) return false
  if (value.includes('\n')) return false
  if (/^[a-zA-Z]+:\/\//.test(value)) return false // exclude URLs like https://
  const hasSlash = value.includes('/')
  if (!hasSlash) return false
  const hasRoot = value.startsWith('/') || value.startsWith('~')
  const lastSegment = value.split('/').pop() ?? ''
  const hasExtension = /\.[A-Za-z0-9]{2,6}$/.test(lastSegment)
  // macOS heuristic: absolute paths or slash-containing paths ending with an extension
  return hasRoot || hasExtension
}

const BUTTON_HEIGHT = 18
const WINDOW_RESIZE_PADDING = 32
const sessionAvatar = new URL('../../../docs/assets/model.png', import.meta.url).href

function isSettingsCommand(value: string) {
  return value.trim().toLowerCase() === '/settings'
}

export function SessionApp() {
  useSessionBootstrap()
  useSessionIntent()
  useSettingsBootstrap()
  useSidecarStatus()

  const preview = useSessionStore((state) => state.preview)
  const intentCandidates = useSessionStore((state) => state.intentCandidates)
  const intentLoading = useSessionStore((state) => state.intentLoading)
  const intentError = useSessionStore((state) => state.intentError)
  const sessionId = useSessionStore((state) => state.sessionId)
  const launchedAt = useSessionStore((state) => state.launchedAt)
  const captureId = useSessionStore((state) => state.captureId)
  const viewport = useSessionStore((state) => state.viewport)
  const selectedIntent = useSessionStore((state) => state.selectedIntent)
  const textSelection = useSessionStore((state) => state.textSelection)
  const setSelectedIntent = useSessionStore((state) => state.setSelectedIntent)
  const setIntentCancelled = useSessionStore((state) => state.setIntentCancelled)
  const setIntentState = useSessionStore((state) => state.setIntentState)
  const pushToast = useToastStore((state) => state.pushToast)
  const guiAgentEnabled = useSettingsStore((state) => state.data?.features?.guiAgentEnabled ?? true)
  const guiAgentDisabled = !guiAgentEnabled
  const youtuAgentEnabled = useSettingsStore((state) => state.data?.features?.youtuAgentEnabled ?? false)
  const youtuAgentDisabled = !youtuAgentEnabled

  const selectionText = textSelection?.text?.trim() ?? ''
  const looksLikeFilePath = guessIsFilePath(selectionText)
  const selectionCue = selectionText
    ? looksLikeFilePath
      ? '已经选择了一个文件'
      : '已经选中了一段文本'
    : preview
      ? '已经选中了区域图像'
      : ''
  const placeholder = selectionCue ? '有什么可以帮忙的吗？' : '有什么可以帮忙的吗？'

  const [inputValue, setInputValue] = useState('')
  const [launching, setLaunching] = useState(false)
  const [autoExecuting, setAutoExecuting] = useState(false)
  const [youtuExecuting, setYoutuExecuting] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ mode: 'chat' | 'gui-agent' | 'youtu-agent'; intent: string } | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const displayCandidates = useMemo(
    () => [...intentCandidates].sort((a, b) => a.title.length - b.title.length),
    [intentCandidates],
  )

  useLayoutEffect(() => {
    const node = panelRef.current
    if (!node) return
    const readyKey = launchedAt ? `${launchedAt}` : null
    let disposed = false
    const notifyWindow = () => {
      const rect = node.getBoundingClientRect()
      const width = Math.ceil(rect.width + WINDOW_RESIZE_PADDING)
      const height = Math.ceil(rect.height + WINDOW_RESIZE_PADDING)
      const resizePromise = window.tipSession?.resize?.({ width, height })
      if (readyKey && revealKeyRef.current !== readyKey) {
        Promise.resolve(resizePromise)
          .catch((error) => rendererLogger.warn('session resize failed before reveal', { error: (error as Error)?.message }))
          .finally(() => {
            if (disposed || revealKeyRef.current === readyKey) return
            revealKeyRef.current = readyKey
            window.tipSession
              ?.reveal?.()
              ?.catch((error) => rendererLogger.error('session reveal failed after resize', { error: (error as Error)?.message }))
          })
      }
    }
    notifyWindow()
    const observer = new ResizeObserver(notifyWindow)
    observer.observe(node)
    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [displayCandidates.length, launchedAt, preview])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 30)
    return () => window.clearTimeout(timer)
  }, [preview, sessionId, intentCandidates.length])

  const revealKeyRef = useRef<string | null>(null)

  useEffect(() => {
    revealKeyRef.current = null
  }, [launchedAt])

  useEffect(() => {
    if (intentLoading) return
    const readyKey = launchedAt ? `${launchedAt}` : null
    const hasResult = Boolean(intentError) || Boolean(sessionId)
    if (!hasResult || !readyKey) return
    if (revealKeyRef.current === readyKey) return
    revealKeyRef.current = readyKey
    window.tipSession
      ?.reveal?.()
      ?.catch((error) => rendererLogger.error('session reveal failed', { error: (error as Error)?.message }))
  }, [intentError, intentLoading, launchedAt, preview, sessionId])

  const cancelIntentFlow = () => {
    setIntentCancelled(true)
    setIntentState({ loading: false, candidates: [], error: null })
  }

  const startChat = async (intentText: string, sessionOverride?: string) => {
    const trimmed = intentText.trim()
    if (!trimmed) return
    const targetSession = sessionOverride ?? sessionId
    if (!targetSession) {
      cancelIntentFlow()
      setPendingAction({ mode: 'chat', intent: trimmed })
      return
    }
    if (!window.tipChat?.start) {
      pushToast({ message: '聊天窗口不可用，请重启应用后重试', type: 'error' })
      return
    }
    setLaunching(true)
    try {
      setSelectedIntent(trimmed)
      await window.tipChat.start({
        sessionId: targetSession,
        intent: trimmed,
        initialMessage: trimmed,
        captureId: captureId ?? undefined,
        preview,
        viewport,
        textSelection: textSelection ?? null,
      })
      window.close()
    } catch (error) {
      rendererLogger.error('chat window launch failed', { error: (error as Error)?.message })
      pushToast({ message: '无法打开聊天窗口，请重试', type: 'error' })
    } finally {
      setLaunching(false)
    }
  }

  const handleCandidateClick = (title: string) => {
    setSelectedIntent(title)
    setInputValue(title)
    void startChat(title)
  }

  const startGuiAgent = async (intentText: string, sessionOverride?: string) => {
    const trimmed = intentText.trim()
    if (!trimmed) return
    const targetSession = sessionOverride ?? sessionId
    if (!targetSession) {
      cancelIntentFlow()
      setPendingAction({ mode: 'gui-agent', intent: trimmed })
      return
    }
    if (!window.tipChat?.start) {
      pushToast({ message: '聊天窗口不可用，请重启应用后重试', type: 'error' })
      return
    }
    if (guiAgentDisabled) {
      pushToast({ message: 'GUI-agent 功能已禁用，请在设置中开启', type: 'error' })
      return
    }
    setAutoExecuting(true)
    try {
      const result = await startGuiAgentRun({ sessionId: targetSession, instruction: trimmed })
      setSelectedIntent(trimmed)
      await window.tipChat.start({
        sessionId: targetSession,
        intent: trimmed,
        mode: 'gui-agent',
        guiAgent: { runId: result.runId, instruction: trimmed },
        captureId: captureId ?? undefined,
        preview,
        viewport,
        textSelection: textSelection ?? null,
      })
      window.close()
    } catch (error) {
      rendererLogger.error('gui agent launch failed', { error: (error as Error)?.message })
      pushToast({ message: '无法启动自动执行，请重试', type: 'error' })
    } finally {
      setAutoExecuting(false)
    }
  }

  const handleGuiAgentConfirm = async () => {
    const trimmed = inputValue.trim()
    void startGuiAgent(trimmed)
  }

  const startYoutuAgent = async (intentText: string, sessionOverride?: string) => {
    const trimmed = intentText.trim()
    if (!trimmed) return
    const targetSession = sessionOverride ?? sessionId
    if (!targetSession) {
      cancelIntentFlow()
      setPendingAction({ mode: 'youtu-agent', intent: trimmed })
      return
    }
    if (!window.tipChat?.start) {
      pushToast({ message: '聊天窗口不可用，请重启应用后重试', type: 'error' })
      return
    }
    if (youtuAgentDisabled) {
      pushToast({ message: 'Youtu-Agent 功能已禁用，请在设置中开启', type: 'error' })
      return
    }
    setYoutuExecuting(true)
    try {
      const prompt = buildYoutuPrompt(trimmed, textSelection)
      setSelectedIntent(trimmed)
      await window.tipChat.start({
        sessionId: targetSession,
        intent: trimmed,
        initialMessage: prompt,
        captureId: captureId ?? undefined,
        preview,
        viewport,
        textSelection: textSelection ?? null,
        mode: 'youtu-agent',
        youtuAgent: { prompt },
      })
      window.close()
    } catch (error) {
      rendererLogger.error('youtu agent launch failed', { error: (error as Error)?.message })
      pushToast({ message: '无法启动 Youtu-Agent，请重试', type: 'error' })
    } finally {
      setYoutuExecuting(false)
    }
  }

  const handleYoutuAgentConfirm = async () => {
    const trimmed = inputValue.trim()
    void startYoutuAgent(trimmed)
  }

  const handleOpenSettings = async () => {
    if (!window.tipSettings?.open) {
      pushToast({ message: '设置窗口不可用，请重启应用后重试', type: 'error' })
      return
    }
    try {
      await window.tipSettings.open()
    } catch (error) {
      rendererLogger.error('open settings failed', { error: (error as Error)?.message })
      pushToast({ message: '无法打开设置，请稍后再试', type: 'error' })
    }
  }

  const handleTipChatConfirm = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (isSettingsCommand(trimmed)) {
      setInputValue('')
      void handleOpenSettings()
      return
    }
    void startChat(trimmed)
  }

  useEffect(() => {
    if (!sessionId || !pendingAction) return
    const action = pendingAction
    setPendingAction(null)
    if (action.mode === 'chat') {
      void startChat(action.intent, sessionId)
    } else if (action.mode === 'gui-agent') {
      void startGuiAgent(action.intent, sessionId)
    } else if (action.mode === 'youtu-agent') {
      void startYoutuAgent(action.intent, sessionId)
    }
  }, [pendingAction, sessionId, startChat, startGuiAgent, startYoutuAgent])

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        window.close()
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <div className="flex h-screen w-screen items-end justify-center bg-transparent pb-6">
      <div
        ref={panelRef}
        className="relative inline-flex w-[700px] max-w-[95vw] flex-col px-2 py-2 text-slate-800"
      >
        {intentError && (
          <div className="flex items-start gap-1">
            <p className="text-[11px] text-red-500">{intentError}</p>
          </div>
        )}
        <div className="mt-0 flex w-full flex-col gap-2">
          <div className="relative flex w-full items-start gap-3">
            <div className="relative z-0 flex flex-1 flex-wrap items-center gap-1">
              {displayCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={launching}
                  onClick={() => handleCandidateClick(candidate.title)}
                  className="inline-flex w-auto max-w-full items-center rounded-[10px] bg-slate-200 px-2 py-[3px] text-left text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 border-0 appearance-none shadow-none"
                  style={{ minHeight: BUTTON_HEIGHT }}
                >
                  <span className="whitespace-pre-wrap break-words">{candidate.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-tip-highlight-from to-tip-highlight-to opacity-80 blur-[0.4px]" />
              <div className="relative m-[1.4px] flex h-[36px] items-center rounded-full bg-white px-3 py-2 ring-1 ring-transparent">
                <img
                  src={sessionAvatar}
                  alt="Tip"
                  className="absolute left-3 h-7 w-7 rounded-full object-cover"
                  draggable={false}
                />
                <div className="flex flex-1 items-center gap-2 pl-10">
                  {selectionCue && (
                    <span className="pointer-events-none select-none whitespace-nowrap shrink-0 text-[12px] font-semibold leading-tight bg-gradient-to-r from-tip-highlight-from to-tip-highlight-to text-transparent bg-clip-text drop-shadow-[0_1px_4px_rgba(140,123,255,0.28)]">
                      {selectionCue}
                    </span>
                  )}
                  <input
                    ref={inputRef}
                    autoFocus
                    className="w-full border-none bg-transparent text-[13px] leading-tight text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleTipChatConfirm()
                      }
                    }}
                    disabled={launching}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleTipChatConfirm}
              disabled={!inputValue.trim() || launching}
              className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900/85 px-4 text-[12px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 appearance-none shadow-none border border-transparent ring-0 outline-none"
            >
              Tip对话
            </button>
            {!guiAgentDisabled && (
              <button
                type="button"
                onClick={() => void handleGuiAgentConfirm()}
                disabled={!inputValue.trim() || autoExecuting}
                className="inline-flex min-h-[32px] items-center justify-center rounded-[18px] bg-white px-4 text-[12px] font-semibold text-slate-700 border border-tip-highlight-to/60 ring-0 appearance-none shadow-none outline-none transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {autoExecuting ? '执行中…' : '控制电脑'}
              </button>
            )}
            {!youtuAgentDisabled && (
              <button
                type="button"
                onClick={() => void handleYoutuAgentConfirm()}
                disabled={!inputValue.trim() || youtuExecuting}
                className="inline-flex min-h-[32px] items-center justify-center rounded-[18px] bg-white px-4 text-[12px] font-semibold text-slate-700 border border-tip-highlight-to/60 ring-0 appearance-none shadow-none outline-none transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {youtuExecuting ? '执行中…' : 'Agent执行'}
              </button>
            )}
          </div>
        </div>
      </div>
      <ToastHost />
    </div>
  )
}

function buildYoutuPrompt(intentText: string, textSelection?: TextSelectionPayload | null) {
  const trimmedIntent = intentText.trim()
  const selection = textSelection?.text?.trim()
  if (!selection) return trimmedIntent
  return `已选中内容：\n${selection}\n\n用户指令：\n${trimmedIntent}`
}
