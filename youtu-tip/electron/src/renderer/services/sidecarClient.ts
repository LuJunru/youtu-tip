let cachedBaseUrl: string | null = null

export async function getSidecarBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl
  const status = await window.tipOverlay?.requestSidecarStatus?.()
  if (status?.baseUrl && status.status === 'connected') {
    cachedBaseUrl = status.baseUrl
    return cachedBaseUrl
  }
  const fallback = 'http://127.0.0.1:8787'
  cachedBaseUrl = fallback
  return fallback
}
