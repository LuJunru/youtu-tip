import http from 'node:http'
import { app } from 'electron'

const REQUIRED_CAPABILITIES = ['selection:text'] as const

let currentPort = process.env.TIP_SIDECAR_PORT ? Number(process.env.TIP_SIDECAR_PORT) : 8787
let baseUrl = `http://127.0.0.1:${currentPort}`
let cachedRequiredVersion: string | null = null

export interface SidecarHealthInfo {
  ok: boolean
  statusCode?: number
  version?: string
  capabilities?: string[]
  error?: string
}

export function getSidecarPort(): number {
  return currentPort
}

export function getSidecarBaseUrl(): string {
  return baseUrl
}

export function setSidecarPort(port: number): void {
  currentPort = port
  baseUrl = `http://127.0.0.1:${port}`
  process.env.TIP_SIDECAR_PORT = String(port)
}

export function getRequiredSidecarVersion(): string {
  if (process.env.TIP_SIDECAR_REQUIRED_VERSION) {
    return process.env.TIP_SIDECAR_REQUIRED_VERSION
  }
  if (!cachedRequiredVersion) {
    cachedRequiredVersion = app.getVersion()
  }
  return cachedRequiredVersion
}

function parseCapabilities(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  const normalized = value.filter((item): item is string => typeof item === 'string')
  return normalized.length > 0 ? normalized : undefined
}

function parseHealthPayload(body: string | null): Partial<SidecarHealthInfo> {
  if (!body) {
    return {}
  }
  try {
    const data = JSON.parse(body)
    const version = typeof data.version === 'string' ? data.version : undefined
    const capabilities = parseCapabilities(data.capabilities)
    return { version, capabilities }
  } catch {
    return {}
  }
}

export async function checkSidecarHealth(): Promise<SidecarHealthInfo> {
  return new Promise((resolve) => {
    const req = http.request(
      `${baseUrl}/health`,
      {
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        res.on('end', () => {
          const body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : null
          const payload = parseHealthPayload(body)
          resolve({
            ok: res.statusCode === 200,
            statusCode: res.statusCode,
            ...payload,
          })
        })
      },
    )
    req.on('error', (error) => {
      resolve({ ok: false, error: error instanceof Error ? error.message : String(error) })
    })
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, error: 'timeout' })
    })
    req.end()
  })
}

export function isSidecarCompatible(health: SidecarHealthInfo | null): boolean {
  if (!health || !health.ok) {
    return false
  }
  const requiredVersion = getRequiredSidecarVersion()
  if (!health.version || health.version !== requiredVersion) {
    return false
  }
  if (!health.capabilities) {
    return false
  }
  return REQUIRED_CAPABILITIES.every((capability) => health.capabilities?.includes(capability))
}
