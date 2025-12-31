import { mainLogger } from './logger'
import { getSidecarBaseUrl } from './sidecarHealth'

interface SelectionTextResponse {
  text?: string | null
}

export async function captureSelectedText(): Promise<string | null> {
  const baseUrl = getSidecarBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/selection/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      mainLogger.debug('text selection request failed', { status: response.status })
      return null
    }
    const data = (await response.json().catch(() => ({}))) as SelectionTextResponse
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    if (text.length === 0) {
      return null
    }
    return text
  } catch (error) {
    mainLogger.debug('text selection request error', { error: (error as Error)?.message })
    return null
  }
}
