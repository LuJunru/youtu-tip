import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { ToastHost } from './components/ToastHost'
import { useChatStore } from './state/chatStore'
import { useChatBootstrap } from './hooks/useChatBootstrap'
import { MarkdownMessage } from './components/MarkdownMessage'
import { ReasoningBubble } from './components/ReasoningBubble'
import { GuiAgentLogMessage } from './components/GuiAgentLogMessage'
import { useToastStore } from './state/toastStore'
import { rendererLogger } from './utils/logger'

const assistantAvatar = new URL('../../../docs/assets/model.png', import.meta.url).href

function isSettingsCommand(value: string) {
  return value.trim().toLowerCase() === '/settings'
}

export function ChatApp() {
  useChatBootstrap()

  const chatVisible = useChatStore((state) => state.visible)
  const chatMessages = useChatStore((state) => state.messages)
  const chatIntent = useChatStore((state) => state.intent)
  const chatSessionId = useChatStore((state) => state.sessionId)
  const captureId = useChatStore((state) => state.captureId)
  const preview = useChatStore((state) => state.preview)
  const viewport = useChatStore((state) => state.viewport)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const stopGuiAgent = useChatStore((state) => state.stopGuiAgent)
  const guiAgentRunId = useChatStore((state) => state.guiAgentRunId)
  const guiAgentInstruction = useChatStore((state) => state.guiAgentInstruction)
  const closeConversation = useChatStore((state) => state.closeConversation)
  const isSending = useChatStore((state) => state.isSending)
  const chatMode = useChatStore((state) => state.mode)
  const guiAgentStatus = useChatStore((state) => state.guiAgentStatus)
  const guiAgentStopping = useChatStore((state) => state.guiAgentStopping)
  const youtuAgentStatus = useChatStore((state) => state.youtuAgentStatus)
  const youtuAgentSessionId = useChatStore((state) => state.youtuAgentSessionId)
  const pushToast = useToastStore((state) => state.pushToast)

  const [pendingMessage, setPendingMessage] = useState('')
  const [reporting, setReporting] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const [windowMaxed, setWindowMaxed] = useState(false)
  const maxWindowHeightRef = useRef<number | null>(null)
  const maxContainerHeightRef = useRef<number | null>(null)
  const isGuiAgent = chatMode === 'gui-agent'
  const isYoutuAgent = chatMode === 'youtu-agent'
  const canSend =
    chatVisible &&
    !isGuiAgent &&
    Boolean(pendingMessage.trim()) &&
    (isYoutuAgent ? youtuAgentStatus !== 'running' && !isSending : !isSending)

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

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault()
    const content = pendingMessage.trim()
    if (!content) return
    if (isSettingsCommand(content)) {
      setPendingMessage('')
      void handleOpenSettings()
      return
    }
    if (!chatVisible || isGuiAgent) return
    void sendMessage(content)
    setPendingMessage('')
  }

  const renderEmptyState = () => (
    <p className="text-[12px] text-slate-400">
      {chatVisible
        ? `你已选择「${chatIntent ?? '等待意图'}」意图，请开始提问。`
        : '等待新的意图以开始本轮对话…'}
    </p>
  )

  const handleCloseWindow = () => {
    closeConversation()
    window.close()
  }

  const handleReportIssue = async () => {
    if (!chatSessionId) {
      pushToast({ message: '当前会话尚未就绪，无法报告', type: 'error' })
      return
    }
    if (!window.tipReport?.start) {
      pushToast({ message: '报告窗口不可用，请重启应用后重试', type: 'error' })
      return
    }
    setReporting(true)
    try {
      await window.tipReport.start({
        sessionId: chatSessionId,
        captureId: captureId ?? undefined,
        preview: preview ?? null,
        viewport: viewport ?? null,
        selectedIntent: chatIntent ?? null,
        draftIntent: pendingMessage.trim() || null,
        guiAgent: guiAgentRunId
          ? { runId: guiAgentRunId, instruction: guiAgentInstruction ?? chatIntent ?? '' }
          : null,
      })
    } catch (error) {
      rendererLogger.error('chat report launch failed', { error: (error as Error)?.message })
      pushToast({ message: '无法打开报告窗口，请稍后再试', type: 'error' })
    } finally {
      setReporting(false)
    }
  }

  const handleStopGuiAgent = async () => {
    try {
      await stopGuiAgent()
    } catch (error) {
      rendererLogger.error('gui agent stop failed', { error: (error as Error)?.message })
      pushToast({ message: '取消失败，请稍后再试', type: 'error' })
    }
  }

  useEffect(() => {
    const node = panelRef.current
    if (!node || !window.tipChat?.resize) return
    const syncBounds = () => {
      const rect = node.getBoundingClientRect()
      window.tipChat?.resize?.({
        width: Math.ceil(rect.width + 24),
        height: maxWindowHeightRef.current ?? Math.ceil(rect.height + 24),
      })
    }
    syncBounds()
    const observer = new ResizeObserver(syncBounds)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!chatVisible || chatMode === 'gui-agent') return
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 20)
    return () => window.clearTimeout(timer)
  }, [chatVisible, chatMessages.length, isSending, isGuiAgent, chatMode])

  const lockWindowMaxMode = () => {
    if (windowMaxed) return
    if (!maxWindowHeightRef.current) {
      maxWindowHeightRef.current = Math.max(Math.ceil(window.innerHeight), 200)
    }
    if (!maxContainerHeightRef.current) {
      if (messagesContainerRef.current) {
        maxContainerHeightRef.current = Math.max(
          120,
          Math.ceil(messagesContainerRef.current.getBoundingClientRect().height),
        )
      } else if (maxWindowHeightRef.current) {
        maxContainerHeightRef.current = Math.max(120, maxWindowHeightRef.current - 160)
      }
    }
    setWindowMaxed(true)
  }

  useEffect(() => {
    if (windowMaxed) return
    const THRESHOLD_PX = 48
    const syncWindowState = () => {
      if (windowMaxed) return
      const availableHeight = Math.max(window.screen?.availHeight ?? 0, window.innerHeight)
      const remaining = availableHeight - window.innerHeight
      if (remaining <= THRESHOLD_PX) {
        lockWindowMaxMode()
      }
    }
    syncWindowState()
    window.addEventListener('resize', syncWindowState)
    return () => window.removeEventListener('resize', syncWindowState)
  }, [windowMaxed])

  useEffect(() => {
    if (windowMaxed) return
    const availableHeight = Math.max(window.screen?.availHeight ?? 0, window.innerHeight)
    const remaining = availableHeight - window.innerHeight
    if (remaining <= 48) {
      lockWindowMaxMode()
    }
  }, [chatMessages.length, windowMaxed])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [chatMessages.length, chatVisible])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleCloseWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative flex w-full items-end justify-end bg-transparent py-1 text-slate-900">
      <div
        ref={panelRef}
        className="relative flex flex-col gap-3 rounded-[20px] border border-solid border-tip-highlight-to/65 bg-white/90 px-4 py-3 text-slate-900 backdrop-blur-lg"
        style={{ width: 'min(360px, 100%)' }}
      >
        <div
          ref={messagesContainerRef}
          className={clsx('flex flex-col gap-3', windowMaxed ? 'overflow-y-auto pr-3' : 'pr-0')}
          style={
            windowMaxed
              ? {
                  maxHeight: `${maxContainerHeightRef.current ?? Math.max(
                    140,
                    (maxWindowHeightRef.current ?? window.innerHeight) - 160,
                  )}px`,
                }
              : undefined
          }
        >
          {chatMessages.length === 0 && renderEmptyState()}
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={clsx('flex gap-3', message.role === 'user' ? 'items-center' : 'items-start')}
            >
              <div
                className={clsx(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold uppercase tracking-[0.08em]',
                  message.role === 'user'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-white/80 bg-white/95 text-transparent',
                )}
              >
                {message.role === 'user' ? (
                  <span>You</span>
                ) : (
                  <img
                    src={assistantAvatar}
                    alt="Tip assistant avatar"
                    className="h-7 w-7 rounded-full border border-white/80 object-cover"
                  />
                )}
              </div>
              {message.role === 'assistant' ? (
                <div className="flex-1">
                  {isYoutuAgent && message.reasoning ? (
                    <ReasoningBubble content={message.reasoning} pending={message.pending} />
                  ) : null}
                  {isGuiAgent ? (
                    <GuiAgentLogMessage content={message.content} pending={message.pending} />
                  ) : (
                    <MarkdownMessage content={message.content} pending={message.pending} />
                  )}
                </div>
              ) : (
                <div className="flex-1 whitespace-pre-wrap text-[12px] leading-snug text-slate-500 italic">
                  {message.content || (message.pending ? '…' : '')}
                </div>
              )}
            </div>
          ))}
        </div>

        {isGuiAgent ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={clsx(
                'inline-flex min-h-[34px] flex-1 items-center justify-center rounded-full px-5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                guiAgentStatus === 'running'
                  ? 'border border-red-200 bg-red-500 text-white hover:bg-red-600'
                  : 'border border-tip-highlight-to/70 bg-white text-slate-700 hover:border-tip-highlight-to',
              )}
              onClick={() => {
                if (guiAgentStatus === 'running') {
                  void handleStopGuiAgent()
                } else {
                  handleCloseWindow()
                }
              }}
              disabled={guiAgentStatus === 'running' ? guiAgentStopping : false}
            >
              {guiAgentStatus === 'running'
                ? guiAgentStopping
                  ? '正在中断…'
                  : '中断执行'
                : '关闭'}
            </button>
            {/* <button
              type="button"
              className="inline-flex min-h-[34px] flex-none items-center justify-center rounded-full border border-tip-highlight-to/70 bg-white px-4 text-[12px] font-medium text-slate-600 transition-colors hover:border-tip-highlight-to disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleReportIssue}
              disabled={!chatSessionId || reporting}
            >
              {reporting ? '处理中…' : '报告问题'}
            </button> */}
          </div>
        ) : (
          <form className="flex items-end gap-2" onSubmit={handleSend}>
            {/* {isYoutuAgent ? (
              <div className="flex flex-1 flex-col gap-1 text-[11px] text-slate-500">
                <p>
                  {youtuAgentStatus === 'running'
                    ? 'Youtu-Agent 正在生成回答…'
                    : youtuAgentStatus === 'error'
                      ? 'Youtu-Agent 运行失败，请重试或检查设置。'
                      : youtuAgentSessionId
                        ? `会话 ${youtuAgentSessionId.slice(0, 6)}… 可继续提问。`
                        : 'Youtu-Agent 已就绪，可继续提问。'}
                </p>
              </div>
            ) : null} */}
            <div className="group relative flex-1" style={{ minHeight: 32 }}>
              <input
                type="text"
                className="absolute inset-x-0 bottom-[3px] w-full border-none bg-transparent text-[13px] leading-tight text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none"
                placeholder={
                  chatVisible
                    ? isYoutuAgent
                      ? '输入要发送给 Youtu-Agent 的内容…'
                      : '输入你的问题...'
                    : '等待新的意图选择'
                }
                value={pendingMessage}
                onChange={(event) => setPendingMessage(event.target.value)}
                disabled={!chatVisible || (isYoutuAgent ? youtuAgentStatus === 'running' : isSending)}
                ref={inputRef}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-slate-300/90 transition-colors duration-150 group-focus-within:bg-purple-300" />
            </div>
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900/85 px-4 text-[12px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSend}
            >
              {isYoutuAgent
                ? youtuAgentStatus === 'running'
                  ? '等待…'
                  : '发送'
                : isSending
                  ? '等待…'
                  : '发送'}
            </button>
            {/* <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-full border border-tip-highlight-to/70 bg-white px-4 text-[12px] font-medium text-slate-600 transition-colors hover:border-tip-highlight-to disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleReportIssue}
              disabled={!chatSessionId || reporting}
            >
              {reporting ? '处理中…' : '报告问题'}
            </button> */}
            <button
              type="button"
              aria-label="close window"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-tip-highlight-to/70 bg-white text-slate-500 transition-colors hover:border-tip-highlight-to hover:text-slate-700"
              onClick={handleCloseWindow}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
                <path d="M2 2l8 8M10 2l-8 8" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        )}
      </div>

      <ToastHost />
    </div>
  )
}
