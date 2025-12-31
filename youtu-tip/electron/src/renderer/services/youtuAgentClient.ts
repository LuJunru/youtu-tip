import { rendererLogger } from '../utils/logger'
import { getSidecarBaseUrl } from './sidecarClient'

export type YoutuAgentChunk =
  | { kind: 'reasoning'; text: string }
  | { kind: 'output'; text: string }
  | { kind: 'notice'; text: string }

type ChunkHandler = (chunk: YoutuAgentChunk) => void
type DoneHandler = (output: string, meta?: { sessionId?: string }) => void
type ErrorHandler = (message: string) => void
type SessionHandler = (sessionId: string) => void

export class YoutuAgentSocket {
  private socket: WebSocket | null = null
  private closedByClient = false
  private sessionId: string | null = null

  async connect(
    prompt: string,
    onChunk: ChunkHandler,
    onDone: DoneHandler,
    onError: ErrorHandler,
    onSession?: SessionHandler,
    sessionId?: string | null,
  ) {
    const baseUrl = await getSidecarBaseUrl()
    const url = new URL(`${baseUrl.replace('http', 'ws')}/youtu-agent/stream`)
    this.socket = new WebSocket(url.toString())
    this.sessionId = sessionId ?? null
    let finished = false

    this.socket.onopen = () => {
      this.socket?.send(
        JSON.stringify({ prompt, save_history: true, session_id: this.sessionId ?? undefined }),
      )
      rendererLogger.info('youtu-agent/ws.open', { sessionId: this.sessionId ?? 'new', promptLen: prompt.length })
    }

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.event === 'session') {
          finished = false
          if (typeof payload.session_id === 'string' && payload.session_id) {
            this.sessionId = payload.session_id
            onSession?.(payload.session_id)
          }
          rendererLogger.info('youtu-agent/ws.session', { sessionId: this.sessionId })
        } else if (payload.event === 'chunk') {
          const chunk = parseYoutuStreamChunk(payload.payload)
          if (chunk) {
            onChunk(chunk)
            rendererLogger.debug?.('youtu-agent/ws.chunk', { sessionId: this.sessionId, kind: chunk.kind, len: chunk.text.length })
          }
        } else if (payload.event === 'done') {
          finished = true
          if (typeof payload.session_id === 'string' && payload.session_id) {
            this.sessionId = payload.session_id
            onSession?.(payload.session_id)
          }
          onDone(payload.output ?? '', { sessionId: this.sessionId ?? undefined })
          rendererLogger.info('youtu-agent/ws.done', { sessionId: this.sessionId, outputLen: (payload.output ?? '').length })
        } else if (payload.event === 'error') {
          finished = true
          onError(payload.message ?? 'Youtu-Agent 执行失败')
          rendererLogger.error('youtu-agent/ws.error', { sessionId: this.sessionId, message: payload.message })
        } else if (payload.event === 'reset') {
          if (typeof payload.session_id === 'string') {
            this.sessionId = payload.session_id
          }
          rendererLogger.info('youtu-agent/ws.reset', { sessionId: this.sessionId })
        }
      } catch (error) {
        onError((error as Error)?.message || 'Youtu-Agent 事件解析失败')
        rendererLogger.error('youtu-agent/ws.parse-error', { sessionId: this.sessionId, message: (error as Error)?.message })
      }
    }

    this.socket.onerror = () => {
      if (!finished) {
        onError('Youtu-Agent 通道异常，请稍后重试')
        rendererLogger.error('youtu-agent/ws.socket-error', { sessionId: this.sessionId })
      }
    }

    this.socket.onclose = () => {
      if (!finished && !this.closedByClient) {
        onError('Youtu-Agent 连接已中断')
        rendererLogger.warn('youtu-agent/ws.closed', { sessionId: this.sessionId })
      }
    }
  }

  close() {
    this.closedByClient = true
    this.socket?.close()
    this.socket = null
  }

  sendUserMessage(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Youtu-Agent 连接未就绪')
    }
    const prompt = text.trim()
    if (!prompt) return
    this.socket.send(
      JSON.stringify({
        type: 'user_message',
        prompt,
        session_id: this.sessionId ?? undefined,
        save_history: true,
      }),
    )
    rendererLogger.info('youtu-agent/ws.send', { sessionId: this.sessionId, promptLen: prompt.length })
  }

  reset() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    if (!this.sessionId) return
    this.socket.send(JSON.stringify({ type: 'reset', session_id: this.sessionId }))
    rendererLogger.info('youtu-agent/ws.reset.send', { sessionId: this.sessionId })
  }
}

function parseYoutuStreamChunk(payload: unknown): YoutuAgentChunk | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : undefined
  const data = isPlainObject(record.data) ? (record.data as Record<string, unknown>) : record.data

  if (type === 'RawResponsesStreamEvent' && isPlainObject(data)) {
    return formatRawResponseEvent(data)
  }
  if (type === 'RunItemStreamEvent' && isPlainObject(data)) {
    return formatRunItemEvent(data)
  }
  if (type === 'AgentUpdatedStreamEvent' && isPlainObject(data) && isPlainObject(data.new_agent)) {
    const agent = data.new_agent as Record<string, unknown>
    const name = typeof agent.name === 'string' ? agent.name : 'agent'
    return { kind: 'notice', text: `\n[切换到 ${name}]\n` }
  }
  if (typeof data === 'string') {
    return { kind: 'notice', text: data }
  }
  return null
}

function formatRawResponseEvent(data: Record<string, unknown>): YoutuAgentChunk | null {
  const eventType = typeof data.type === 'string' ? data.type : undefined
  switch (eventType) {
    case 'response.output_text.delta':
      return normalizeDelta(data.delta, 'output')
    case 'response.reasoning_text.delta':
    case 'response.reasoning_summary_text.delta':
      return normalizeDelta(data.delta, 'reasoning')
    case 'response.function_call_arguments.delta':
      return normalizeDelta(data.delta, 'reasoning')
    case 'response.output_item.added':
      return describeToolCallPhase('start', data.item)
    case 'response.output_item.done':
      return describeToolCallPhase('done', data.item)
    default:
      return null
  }
}

function formatRunItemEvent(data: Record<string, unknown>): YoutuAgentChunk | null {
  const item = isPlainObject(data.item) ? (data.item as Record<string, unknown>) : undefined
  if (!item) return null
  const itemType = typeof item.type === 'string' ? item.type : undefined
  if (itemType === 'tool_call_output_item') {
    const output = typeof item.output === 'string' ? item.output : null
    return output ? { kind: 'notice', text: `\n${output}\n` } : null
  }
  return null
}

function describeToolCallPhase(phase: 'start' | 'done', rawItem: unknown): YoutuAgentChunk | null {
  if (!isPlainObject(rawItem)) return null
  const item = rawItem as Record<string, unknown>
  if (item.type !== 'function_call') return null
  const name = typeof item.name === 'string' ? item.name : 'tool'
  if (phase === 'start') {
    return { kind: 'notice', text: `\n[调用 ${name}] ` }
  }
  const args =
    typeof item.arguments === 'string'
      ? item.arguments
      : item.arguments
        ? JSON.stringify(item.arguments)
        : ''
  return { kind: 'notice', text: (`\n[${name} 完成] ${args}`.trimEnd() + '\n') }
}

function normalizeDelta(delta: unknown, kind: YoutuAgentChunk['kind']): YoutuAgentChunk | null {
  if (typeof delta === 'string' && delta) return { kind, text: delta }
  if (Array.isArray(delta)) {
    const text = delta
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk
        if (chunk && typeof chunk === 'object' && typeof (chunk as Record<string, unknown>).text === 'string') {
          return (chunk as Record<string, unknown>).text as string
        }
        return ''
      })
      .join('')
    return text ? { kind, text } : null
  }
  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
