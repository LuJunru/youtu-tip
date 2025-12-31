import { getSidecarBaseUrl } from './sidecarHealth'

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getSidecarBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!res.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload ? (payload as Record<string, unknown>).detail : null
    const message =
      typeof detail === 'string'
        ? detail
        : typeof payload === 'string'
          ? payload
          : `Sidecar request failed: ${res.status}`
    throw new Error(message)
  }
  return payload as T
}
