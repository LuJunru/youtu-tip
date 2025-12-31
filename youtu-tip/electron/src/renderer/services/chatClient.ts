import type { ChatMessage } from '@shared/types'
import { getSidecarBaseUrl } from './sidecarClient'

export class ChatSocket {
  private socket: WebSocket | null = null

  async connect(
    sessionId: string,
    intent: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onReady?: () => void,
  ) {
    const baseUrl = await getSidecarBaseUrl()
    const url = new URL(`${baseUrl.replace('http', 'ws')}/chat`)
    url.searchParams.set('session_id', sessionId)
    this.socket = new WebSocket(url.toString())
    this.socket.onopen = () => {
      this.socket?.send(JSON.stringify({ intent }))
      onReady?.()
    }
    this.socket.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      if (payload.event === 'chunk') {
        onChunk(payload.content)
      }
      if (payload.event === 'done') {
        onDone()
      }
    }
    this.socket.onclose = () => {
      onDone()
    }
  }

  send(message: string) {
    this.socket?.send(JSON.stringify({ message }))
  }

  close() {
    this.socket?.close()
    this.socket = null
  }
}
