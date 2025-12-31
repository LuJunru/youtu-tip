import type { SkillDetail, SkillSummary } from '@shared/types'
import { getSidecarBaseUrl } from './sidecarClient'

interface SkillPayload {
  title: string
  body: string
}

interface SkillRefreshResult {
  count: number
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = await getSidecarBaseUrl()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  }
  const hasBody = init && 'body' in init && init.body !== undefined
  if (hasBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message: string
    try {
      const data = await response.json()
      message =
        (typeof data?.detail === 'string' && data.detail) ||
        (typeof data?.message === 'string' && data.message) ||
        ''
    } catch {
      message = ''
    }
    throw new Error(message || `请求 ${path} 失败：${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export async function listSkills(): Promise<SkillSummary[]> {
  return requestJson<SkillSummary[]>('/skills')
}

export async function fetchSkill(skillId: string): Promise<SkillDetail> {
  return requestJson<SkillDetail>(`/skills/${encodeURIComponent(skillId)}`)
}

export async function createSkill(payload: SkillPayload): Promise<SkillDetail> {
  return requestJson<SkillDetail>('/skills', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSkill(skillId: string, payload: SkillPayload): Promise<SkillDetail> {
  return requestJson<SkillDetail>(`/skills/${encodeURIComponent(skillId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteSkill(skillId: string): Promise<void> {
  await requestJson(`/skills/${encodeURIComponent(skillId)}`, {
    method: 'DELETE',
  })
}

export async function refreshSkillCatalog(): Promise<SkillRefreshResult> {
  return requestJson<SkillRefreshResult>('/skills/refresh', {
    method: 'POST',
  })
}
