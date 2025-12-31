import { ChildProcess, spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { app } from 'electron'
import { APP_ROOT } from '../runtimePaths'
import {
  checkSidecarHealth,
  getSidecarPort,
  getRequiredSidecarVersion,
  isSidecarCompatible,
  setSidecarPort,
  getSidecarBaseUrl,
} from '../services/sidecarHealth'
import { mainLogger } from '../services/logger'

let sidecarProcess: ChildProcess | null = null

function resolvePythonBinary() {
  if (process.env.TIP_SIDECAR_BIN) {
    return process.env.TIP_SIDECAR_BIN
  }

  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath
    return path.join(resourcesPath, 'sidecar', 'tip-sidecar')
  }

  const poetryEnv = process.env.PYTHON_POETRY_VENV
  if (poetryEnv) {
    return path.join(poetryEnv, 'bin', 'poetry')
  }

  return 'poetry'
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => {
      server.close(() => resolve(false))
    })
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '127.0.0.1')
  })
}

async function findAvailablePort(startPort: number, attempts = 15): Promise<number> {
  for (let i = 0; i < attempts; i += 1) {
    const candidate = startPort + i
    if (await isPortAvailable(candidate)) {
      return candidate
    }
  }
  throw new Error(`No available port found near ${startPort}`)
}

function buildSidecarEnv(port: number): NodeJS.ProcessEnv {
  const baseEnv = { ...process.env }
  try {
    const userDataDir = app.getPath('userData')
    const settingsFile = path.join(userDataDir, 'settings.json')
    const cacheDir = path.join(path.dirname(userDataDir), 'Caches', app.getName())
    const logsDir = app.getPath('logs')
    baseEnv.TIP_SETTINGS_FILE = settingsFile
    baseEnv.TIP_CACHE_DIR = cacheDir
    baseEnv.TIP_LOG_DIR = logsDir
    baseEnv.TIP_DEBUG_DIR = path.join(cacheDir, 'debug-reports')
    baseEnv.TIP_SIDECAR_PORT = String(port)
    if (!baseEnv.TIP_SIDECAR_BUILD_VERSION) {
      baseEnv.TIP_SIDECAR_BUILD_VERSION = app.getVersion()
    }
  } catch (error) {
    mainLogger.warn('failed to resolve sidecar paths', { error: error instanceof Error ? error.message : String(error) })
  }
  return baseEnv
}

function terminateSidecar(reason: 'restart' | 'shutdown') {
  if (!sidecarProcess) {
    return
  }
  mainLogger.info('stopping sidecar process', { reason })
  sidecarProcess.removeAllListeners()
  try {
    sidecarProcess.kill()
  } catch (error) {
    mainLogger.warn('failed to terminate sidecar process', {
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    sidecarProcess = null
  }
}

export async function ensureSidecarRunning() {
  let health: Awaited<ReturnType<typeof checkSidecarHealth>> | null = null
  try {
    health = await checkSidecarHealth()
    if (isSidecarCompatible(health)) {
      return
    }
    if (health.ok) {
      mainLogger.warn('detected incompatible sidecar instance', {
        version: health.version ?? 'unknown',
        capabilities: health.capabilities ?? [],
        requiredVersion: getRequiredSidecarVersion(),
      })
    } else if (health?.error) {
      mainLogger.debug('sidecar health check failed', { error: health.error, baseUrl: getSidecarBaseUrl() })
    }
  } catch (error) {
    mainLogger.warn('sidecar health check crashed', { error: error instanceof Error ? error.message : String(error) })
  }

  if (sidecarProcess) {
    terminateSidecar('restart')
  }

  const preferredPort = getSidecarPort()
  let port = preferredPort
  try {
    port = await findAvailablePort(preferredPort)
    if (port !== preferredPort) {
      mainLogger.warn('preferred sidecar port unavailable, using fallback', { preferredPort, port })
    }
  } catch (error) {
    mainLogger.error('unable to resolve sidecar port', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
  setSidecarPort(port)
  const bin = resolvePythonBinary()
  const args = app.isPackaged
    ? []
    : ['run', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)]
  const cwd = app.isPackaged ? undefined : path.join(APP_ROOT ?? process.cwd(), '..', 'python')
  const env = buildSidecarEnv(port)

  sidecarProcess = spawn(bin, args, { cwd, stdio: 'inherit', env })
  sidecarProcess.on('error', (error) => {
    mainLogger.error('sidecar process error', { error: error instanceof Error ? error.message : String(error) })
  })
  sidecarProcess.on('exit', (code) => {
    mainLogger.error('sidecar exited', { code })
    sidecarProcess = null
  })
}

export function stopSidecar() {
  terminateSidecar('shutdown')
}
