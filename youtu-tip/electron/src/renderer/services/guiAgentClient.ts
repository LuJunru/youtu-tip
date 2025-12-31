import { getSidecarBaseUrl } from './sidecarClient'

export interface GuiAgentRunResponse {
  runId: string
  sessionId: string
  instruction: string
  taskId?: string | null
}

export interface GuiAgentLogEvent {
  type?: string
  message?: string
  step?: number
  status?: string
  result_dir?: string
  resultDir?: string
  assets?: Array<{ type?: string; path?: string; relative_path?: string; relativePath?: string }>
  [key: string]: unknown
}

type GuiAgentEventCallback = (event: GuiAgentLogEvent) => void

export async function startGuiAgentRun(payload: { sessionId: string; instruction: string }): Promise<GuiAgentRunResponse> {
  const baseUrl = await getSidecarBaseUrl()
  const response = await fetch(`${baseUrl}/gui-agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: payload.sessionId,
      instruction: payload.instruction,
    }),
  })
  if (!response.ok) {
    throw new Error('无法启动自动执行')
  }
  const data = await response.json()
  return {
    runId: data.run_id ?? data.runId,
    sessionId: data.session_id ?? data.sessionId ?? payload.sessionId,
    instruction: data.instruction ?? payload.instruction,
    taskId: data.task_id ?? data.taskId ?? null,
  }
}

export async function cancelGuiAgentRun(runId: string): Promise<void> {
  const baseUrl = await getSidecarBaseUrl()
  const response = await fetch(`${baseUrl}/gui-agent/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId }),
  })
  if (!response.ok) {
    throw new Error('无法中断当前执行')
  }
}

export class GuiAgentSocket {
  private socket: WebSocket | null = null

  async connect(
    runId: string,
    sessionId: string,
    onEvent: GuiAgentEventCallback,
    onClosed: () => void,
  ): Promise<void> {
    const baseUrl = await getSidecarBaseUrl()
    const url = new URL(`${baseUrl.replace('http', 'ws')}/gui-agent/stream`)
    url.searchParams.set('run_id', runId)
    if (sessionId) {
      url.searchParams.set('session_id', sessionId)
    }
    this.socket = new WebSocket(url.toString())
    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.event === 'gui_agent_log' && payload.payload) {
          onEvent(payload.payload as GuiAgentLogEvent)
        }
      } catch (error) {
        console.warn('gui agent socket parse error', error)
      }
    }
    this.socket.onerror = () => {
      this.close()
      onClosed()
    }
    this.socket.onclose = () => {
      this.close()
      onClosed()
    }
  }

  close() {
    if (this.socket) {
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket.onclose = null
      this.socket.close()
      this.socket = null
    }
  }
}
