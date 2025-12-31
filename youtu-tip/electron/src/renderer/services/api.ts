import type { IntentResponse, SelectionRect } from '@shared/types'
import { getSidecarBaseUrl } from './sidecarClient'

interface IntentPayload {
  image?: string
  text?: string
  language?: string
  selection?: SelectionRect
}

interface IntentCandidateRaw {
  id?: string
  title?: string
}

interface IntentResponseRaw {
  sessionId?: string
  session_id?: string
  candidates?: IntentCandidateRaw[]
}

export async function fetchIntentCandidates(payload: IntentPayload): Promise<IntentResponse> {
  const baseUrl = await getSidecarBaseUrl()
  const response = await fetch(`${baseUrl}/intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch intent candidates')
  }
  const data: IntentResponseRaw = await response.json()
  const sessionId = data.sessionId ?? data.session_id
  if (!sessionId) {
    throw new Error('Intent response missing sessionId')
  }
  const candidates = Array.isArray(data.candidates)
    ? data.candidates.map((candidate, index) => ({
        id: candidate.id ?? `intent-${index + 1}`,
        title: (candidate.title ?? '').trim(),
      }))
    : []
  return {
    sessionId,
    candidates,
  }
}
