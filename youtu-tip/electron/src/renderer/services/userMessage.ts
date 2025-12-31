import type { ChatMessage } from '@shared/types'

export function buildUserMessage(content: string): ChatMessage {
  return {
    id: `user-${Date.now()}`,
    role: 'user',
    content,
  }
}
