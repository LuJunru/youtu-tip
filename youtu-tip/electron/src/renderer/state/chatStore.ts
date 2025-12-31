import { create } from 'zustand'
import type {
  ChatLaunchPayload,
  ChatMessage,
  ChatSessionMode,
  SelectionPreview,
  TextSelectionPayload,
  VirtualViewport,
} from '@shared/types'
import { buildUserMessage } from '../services/userMessage'
import { ChatSocket } from '../services/chatClient'
import { GuiAgentSocket, GuiAgentLogEvent, cancelGuiAgentRun } from '../services/guiAgentClient'
import { formatGuiAgentLog } from '../utils/guiAgentFormatter'
import { YoutuAgentSocket } from '../services/youtuAgentClient'
import { rendererLogger } from '../utils/logger'
interface ChatState {
  visible: boolean
  minimized: boolean
  sessionId: string | null
  intent: string | null
  messages: ChatMessage[]
  isSending: boolean
  socket: ChatSocket | null
  pendingAssistantId: string | null
  captureId: string | null
  preview: SelectionPreview | null
  viewport: VirtualViewport | null
  textSelection: TextSelectionPayload | null
  mode: ChatSessionMode
  guiAgentRunId: string | null
  guiAgentInstruction: string | null
  guiAgentSocket: GuiAgentSocket | null
  guiAgentMessageId: string | null
  guiAgentStatus: 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
  guiAgentStopping: boolean
  youtuAgentSocket: YoutuAgentSocket | null
  youtuAgentMessageId: string | null
  youtuAgentStatus: 'idle' | 'running' | 'completed' | 'error'
  youtuAgentSessionId: string | null
  openConversation: (payload: ChatLaunchPayload) => void
  closeConversation: () => void
  toggleMinimized: () => void
  sendMessage: (content: string) => Promise<void>
  stopGuiAgent: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  visible: false,
  minimized: false,
  sessionId: null,
  intent: null,
  messages: [],
  isSending: false,
  socket: null,
  pendingAssistantId: null,
  captureId: null,
  preview: null,
  viewport: null,
  textSelection: null,
  mode: 'chat',
  guiAgentRunId: null,
  guiAgentInstruction: null,
  guiAgentSocket: null,
  guiAgentMessageId: null,
  guiAgentStatus: 'idle',
  guiAgentStopping: false,
  youtuAgentSocket: null,
  youtuAgentMessageId: null,
  youtuAgentStatus: 'idle',
  youtuAgentSessionId: null,
  openConversation: (payload) => {
    const {
      sessionId,
      intent,
      initialMessage,
      captureId,
      preview,
      viewport,
      textSelection,
      mode,
      guiAgent,
      youtuAgent,
    } = payload
    get().socket?.close()
    get().guiAgentSocket?.close()
    get().youtuAgentSocket?.close()
    const normalizedMode: ChatSessionMode = mode ?? 'chat'
    if (normalizedMode === 'gui-agent' && guiAgent) {
      const messageId = `gui-agent-${Date.now()}`
      const guiSocket = new GuiAgentSocket()
      rendererLogger.info('chat/open', { mode: 'gui-agent', sessionId, intent })
      set({
        visible: true,
        minimized: false,
        sessionId: sessionId ?? null,
        intent: intent ?? null,
        messages: [
          {
            id: messageId,
            role: 'assistant',
            content: `自动执行：「${guiAgent.instruction}」\n`,
            pending: true,
          },
        ],
        socket: null,
        pendingAssistantId: null,
        isSending: false,
        captureId: captureId ?? null,
        preview: preview ?? null,
        viewport: viewport ?? null,
        textSelection: textSelection ?? null,
        mode: 'gui-agent',
        guiAgentRunId: guiAgent.runId,
        guiAgentInstruction: guiAgent.instruction,
        guiAgentSocket: guiSocket,
        guiAgentMessageId: messageId,
        guiAgentStatus: 'running',
        guiAgentStopping: false,
        youtuAgentSessionId: null,
      })
      void guiSocket.connect(
        guiAgent.runId,
        sessionId,
        (event: GuiAgentLogEvent) => {
          const formatted = formatGuiAgentLog(event)
          set((state) => {
            if (!state.guiAgentMessageId) {
              return {}
            }
            const nextMessages = formatted
              ? state.messages.map((message) =>
                  message.id === state.guiAgentMessageId
                    ? {
                        ...message,
                        content: message.content ? `${message.content}\n${formatted}` : formatted,
                      }
                    : message,
                )
              : state.messages
            let nextStatus = state.guiAgentStatus
            if (event.type === 'complete') {
              nextStatus = event.status === 'cancelled' ? 'cancelled' : 'completed'
            } else if (event.type === 'error') {
              nextStatus = 'error'
            }
            const shouldUnsetPending = nextStatus !== 'running'
            return {
              messages: shouldUnsetPending
                ? nextMessages.map((message) =>
                    message.id === state.guiAgentMessageId ? { ...message, pending: false } : message,
                  )
                : nextMessages,
              guiAgentStatus: nextStatus,
              guiAgentStopping: shouldUnsetPending ? false : state.guiAgentStopping,
            }
          })
        },
        () => {
          set((state) => {
            if (!state.guiAgentMessageId) {
              return {
                guiAgentSocket: null,
                guiAgentStopping: false,
                guiAgentStatus: state.guiAgentStatus === 'running' ? 'error' : state.guiAgentStatus,
              }
            }
            const didComplete = state.guiAgentStatus !== 'running'
            const nextMessages = didComplete
              ? state.messages.map((message) =>
                  message.id === state.guiAgentMessageId ? { ...message, pending: false } : message,
                )
              : state.messages
            return {
              guiAgentSocket: null,
              messages: nextMessages,
              guiAgentStopping: false,
              guiAgentStatus: didComplete ? state.guiAgentStatus : 'error',
            }
          })
        },
      )
      return
    }
    if (normalizedMode === 'youtu-agent' && youtuAgent) {
      const userMessages = youtuAgent.prompt ? [buildUserMessage(youtuAgent.prompt)] : []
      const assistantId = `youtu-agent-${Date.now()}`
      const youtuSocket = new YoutuAgentSocket()
      rendererLogger.info('chat/open', { mode: 'youtu-agent', sessionId, intent, promptLen: youtuAgent.prompt.length })
      set({
        visible: true,
        minimized: false,
        sessionId: sessionId ?? null,
        intent: intent ?? null,
        messages: [
          ...userMessages,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            reasoning: 'Youtu-Agent 正在分析…\n',
            pending: true,
          },
        ],
        socket: null,
        pendingAssistantId: null,
        isSending: true,
        captureId: captureId ?? null,
        preview: preview ?? null,
        viewport: viewport ?? null,
        textSelection: textSelection ?? null,
        mode: 'youtu-agent',
        guiAgentRunId: null,
        guiAgentInstruction: null,
        guiAgentSocket: null,
        guiAgentMessageId: null,
        guiAgentStatus: 'idle',
        guiAgentStopping: false,
        youtuAgentSocket: youtuSocket,
        youtuAgentMessageId: assistantId,
        youtuAgentStatus: 'running',
        youtuAgentSessionId: null,
      })
      void youtuSocket.connect(
        youtuAgent.prompt,
        (chunk) => {
          rendererLogger.debug?.('chat/youtu-agent:chunk', { sessionId: get().youtuAgentSessionId, kind: chunk.kind, len: chunk.text.length })
          set((state) => {
            if (!state.youtuAgentMessageId) return {}
            const nextMessages = state.messages.map((message) => {
              if (message.id !== state.youtuAgentMessageId) return message
              if (chunk.kind === 'output') {
                const nextContent = message.content ? `${message.content}${chunk.text}` : chunk.text
                return { ...message, content: nextContent }
              }
              const nextReasoning = message.reasoning ? `${message.reasoning}${chunk.text}` : chunk.text
              return { ...message, reasoning: nextReasoning }
            })
            return { messages: nextMessages, isSending: true, youtuAgentStatus: 'running' }
          })
        },
        (finalOutput, meta) => {
          rendererLogger.info('chat/youtu-agent:done', { sessionId: meta?.sessionId ?? get().youtuAgentSessionId, outputLen: finalOutput?.length ?? 0 })
          set((state) => {
            if (!state.youtuAgentMessageId) return {}
            const nextMessages = state.messages.map((message) =>
              message.id === state.youtuAgentMessageId
                ? { ...message, content: finalOutput || message.content, pending: false }
                : message,
            )
            return {
              messages: nextMessages,
              youtuAgentStatus: 'completed',
              isSending: false,
              youtuAgentSessionId: meta?.sessionId ?? state.youtuAgentSessionId,
            }
          })
        },
        (errorMessage) => {
          rendererLogger.error('chat/youtu-agent:error', { sessionId: get().youtuAgentSessionId, message: errorMessage })
          set((state) => {
            if (!state.youtuAgentMessageId) {
              return { youtuAgentStatus: 'error', youtuAgentSocket: null }
            }
            const fallback = errorMessage || 'Youtu-Agent 执行失败。'
            const nextMessages = state.messages.map((message) =>
              message.id === state.youtuAgentMessageId
                ? { ...message, content: `${message.content}\n${fallback}`, pending: false }
                : message,
            )
            return {
              messages: nextMessages,
              youtuAgentStatus: 'error',
              isSending: false,
              youtuAgentSessionId: null,
            }
          })
        },
        (sessionId) => {
          rendererLogger.info('chat/youtu-agent:session', { sessionId })
          set(() => ({ youtuAgentSessionId: sessionId }))
        },
      )
      return
    }

    const seedMessage = initialMessage
    const initialMessages: ChatMessage[] = seedMessage ? [buildUserMessage(seedMessage)] : []
    const socket = new ChatSocket()
    set({
      visible: true,
      minimized: false,
      sessionId: sessionId ?? null,
      intent: intent ?? null,
      messages: initialMessages,
      socket,
      pendingAssistantId: null,
      isSending: Boolean(seedMessage),
      captureId: captureId ?? null,
      preview: preview ?? null,
      viewport: viewport ?? null,
      textSelection: textSelection ?? null,
      mode: 'chat',
      guiAgentRunId: null,
      guiAgentInstruction: null,
      guiAgentSocket: null,
      guiAgentMessageId: null,
      guiAgentStatus: 'idle',
      guiAgentStopping: false,
      youtuAgentSocket: null,
      youtuAgentMessageId: null,
      youtuAgentStatus: 'idle',
      youtuAgentSessionId: null,
    })
    void socket.connect(
      sessionId,
      intent,
      (chunk) => {
        set((state) => {
          let targetId = state.pendingAssistantId
          let nextMessages = state.messages
          if (!targetId) {
            targetId = `assistant-${Date.now()}`
            nextMessages = [
              ...nextMessages,
              { id: targetId, role: 'assistant', content: '', pending: true },
            ]
          }
          nextMessages = nextMessages.map((message) =>
            message.id === targetId ? { ...message, content: `${message.content}${chunk}` } : message,
          )
          return { messages: nextMessages, pendingAssistantId: targetId, isSending: true }
        })
      },
      () => {
        set((state) => {
          if (!state.pendingAssistantId) {
            return { isSending: false }
          }
          const nextMessages = state.messages.map((message) =>
            message.id === state.pendingAssistantId ? { ...message, pending: false } : message,
          )
          return { messages: nextMessages, pendingAssistantId: null, isSending: false }
        })
      },
      seedMessage
        ? () => {
            const pendingId = `assistant-${Date.now()}`
            set((state) => ({
              messages: [
                ...state.messages,
                { id: pendingId, role: 'assistant', content: '', pending: true },
              ],
              pendingAssistantId: pendingId,
              isSending: true,
            }))
            socket.send(seedMessage)
          }
        : undefined,
    )
  },
  closeConversation: () => {
    get().socket?.close()
    get().guiAgentSocket?.close()
    get().youtuAgentSocket?.close()
    set({
      visible: false,
      minimized: false,
      sessionId: null,
      intent: null,
      messages: [],
      socket: null,
      pendingAssistantId: null,
      isSending: false,
      captureId: null,
      preview: null,
      viewport: null,
      textSelection: null,
      mode: 'chat',
      guiAgentRunId: null,
      guiAgentInstruction: null,
      guiAgentSocket: null,
      guiAgentMessageId: null,
      guiAgentStatus: 'idle',
      guiAgentStopping: false,
      youtuAgentSocket: null,
      youtuAgentMessageId: null,
      youtuAgentStatus: 'idle',
      youtuAgentSessionId: null,
    })
  },
  toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),
  sendMessage: async (content: string) => {
    if (!content.trim()) return
    const trimmed = content.trim()
    const { socket, mode, youtuAgentSocket, youtuAgentStatus, youtuAgentSessionId } = get()
    if (mode === 'chat') {
      if (!socket) return
      const userMessage = buildUserMessage(trimmed)
      const pendingId = `assistant-${Date.now()}`
      rendererLogger.info('chat/send', { mode: 'chat', len: trimmed.length })
      set((state) => ({
        messages: [
          ...state.messages,
          userMessage,
          { id: pendingId, role: 'assistant', content: '', pending: true },
        ],
        pendingAssistantId: pendingId,
        isSending: true,
      }))
      socket.send(trimmed)
      return
    }

    if (mode === 'youtu-agent') {
      if (!youtuAgentSocket) return
      // Avoid overlapping runs
      if (youtuAgentStatus === 'running') return
      const assistantId = `youtu-agent-${Date.now()}`
      const userMessage = buildUserMessage(trimmed)
      rendererLogger.info('chat/send', { mode: 'youtu-agent', len: trimmed.length, sessionId: get().youtuAgentSessionId })
      set((state) => ({
        messages: [
          ...state.messages,
          userMessage,
          { id: assistantId, role: 'assistant', content: '', reasoning: '', pending: true },
        ],
        youtuAgentMessageId: assistantId,
        youtuAgentStatus: 'running',
        isSending: true,
      }))
      try {
        youtuAgentSocket.sendUserMessage(trimmed)
      } catch (error) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, pending: false, content: `${msg.content}\n发送失败` } : msg,
          ),
          youtuAgentStatus: 'error',
          isSending: false,
          youtuAgentSessionId: youtuAgentSessionId,
        }))
      }
    }
  },
  stopGuiAgent: async () => {
    const { guiAgentRunId, guiAgentStatus, guiAgentStopping } = get()
    if (!guiAgentRunId || guiAgentStatus !== 'running' || guiAgentStopping) {
      return
    }
    set({ guiAgentStopping: true })
    await cancelGuiAgentRun(guiAgentRunId).catch(() => {
      set({ guiAgentStopping: false })
      throw new Error('取消失败')
    })
  },
}))
