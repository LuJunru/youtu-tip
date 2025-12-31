import { desktopCapturer, screen } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import type { DesktopCapturerSource, Display } from 'electron'
import type {
  ScreenshotDisplay,
  ScreenshotResult,
  SelectionExportPayload,
  SelectionExportResult,
  SnapshotDebugPayload,
} from '@shared/types'
import { mainLogger } from './logger'
import { getOverlayWindow, hideOverlayWindow, showOverlayWindow } from '../windows/overlayWindow'

const CACHE_ROOT = path.join(os.homedir(), 'Library', 'Caches', 'Tip')
const MAX_CACHE_FOLDERS = 12
const SNAPSHOT_TTL_MS = 5 * 60 * 1000
const SNAPSHOT_CACHE_WINDOW_MS = 5_000

interface SnapshotRegistryEntry {
  cacheDir: string
  metadata: {
    id: string
    generatedAt: number
    viewport: ScreenshotResult['viewport']
    displays: Array<{
      id: number
      bounds: ScreenshotDisplay['bounds']
      scale: number
      width: number
      height: number
      filename: string
    }>
  }
}

let latestSnapshot: ScreenshotResult | null = null
const snapshotRegistry = new Map<string, SnapshotRegistryEntry>()
const snapshotCleanupTimers = new Map<string, NodeJS.Timeout>()
let preferredDisplayId: number | null = null

function getViewportBounds(displays: Display[]) {
  if (!displays.length) {
    const primary = screen.getPrimaryDisplay()
    return {
      x: primary.bounds.x,
      y: primary.bounds.y,
      width: primary.bounds.width,
      height: primary.bounds.height,
    }
  }

  const bounds = displays.reduce(
    (acc, display) => {
      acc.minX = Math.min(acc.minX, display.bounds.x)
      acc.minY = Math.min(acc.minY, display.bounds.y)
      acc.maxX = Math.max(acc.maxX, display.bounds.x + display.bounds.width)
      acc.maxY = Math.max(acc.maxY, display.bounds.y + display.bounds.height)
      return acc
    },
    {
      minX: displays[0].bounds.x,
      minY: displays[0].bounds.y,
      maxX: displays[0].bounds.x + displays[0].bounds.width,
      maxY: displays[0].bounds.y + displays[0].bounds.height,
    },
  )

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

async function cleanupOldCaptures() {
  try {
    const entries = await fs.readdir(CACHE_ROOT, { withFileTypes: true })
    const folders = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('capture-'))
      .map((entry) => ({ name: entry.name, path: path.join(CACHE_ROOT, entry.name) }))
      .sort((a, b) => (a.name > b.name ? -1 : 1))

    if (folders.length <= MAX_CACHE_FOLDERS) {
      return
    }

    const toRemove = folders.slice(MAX_CACHE_FOLDERS)
    await Promise.allSettled(toRemove.map((folder) => fs.rm(folder.path, { recursive: true, force: true })))
  } catch (error) {
    mainLogger.debug('cleanup cache skipped', { error: error instanceof Error ? error.message : String(error) })
  }
}

function registerSnapshot(snapshot: ScreenshotResult) {
  snapshotRegistry.set(snapshot.id, {
    cacheDir: snapshot.cacheDir,
    metadata: {
      id: snapshot.id,
      generatedAt: snapshot.generatedAt,
      viewport: snapshot.viewport,
      displays: snapshot.displays.map((display) => ({
        id: display.id,
        bounds: display.bounds,
        scale: display.scale,
        width: display.width,
        height: display.height,
        filename: display.filename,
      })),
    },
  })
  const existingTimer = snapshotCleanupTimers.get(snapshot.id)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }
  const timer = setTimeout(() => {
    void discardSnapshot(snapshot.id)
  }, SNAPSHOT_TTL_MS)
  snapshotCleanupTimers.set(snapshot.id, timer)
}

async function removeSnapshotResources(id: string) {
  const entry = snapshotRegistry.get(id)
  if (!entry) return
  snapshotRegistry.delete(id)
  const timer = snapshotCleanupTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    snapshotCleanupTimers.delete(id)
  }
  await fs.rm(entry.cacheDir, { recursive: true, force: true })
}

function normalizeSourceDisplayId(source: DesktopCapturerSource) {
  const displayId = (source as unknown as { display_id?: string }).display_id
  if (displayId && Number.isFinite(Number(displayId))) {
    return Number(displayId)
  }
  const match = source.id.match(/screen:(\d+)/)
  if (match) {
    return Number(match[1])
  }
  return null
}

const MAX_CAPTURE_EDGE = 4096

function clampThumbnailSize(width: number, height: number) {
  const downscale = Math.max(width / MAX_CAPTURE_EDGE, height / MAX_CAPTURE_EDGE, 1)
  return {
    width: Math.max(1, Math.round(width / downscale)),
    height: Math.max(1, Math.round(height / downscale)),
  }
}

interface SourceLookup {
  byId: Map<number, DesktopCapturerSource>
  byName: Map<string, DesktopCapturerSource>
  ordered: DesktopCapturerSource[]
}

function normalizeLabel(value?: string | null) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.toLowerCase() : null
}

function pickSourceForDisplay(display: Display, index: number, lookup: SourceLookup) {
  const byId = lookup.byId.get(display.id)
  if (byId) {
    return byId
  }
  const labelKey = normalizeLabel(display.label)
  if (labelKey) {
    const byName = lookup.byName.get(labelKey)
    if (byName) {
      return byName
    }
  }
  const fallback = lookup.ordered[index] ?? lookup.ordered[0]
  if (!fallback) {
    return null
  }
  mainLogger.warn('falling back to first screen source for display', {
    displayId: display.id,
    label: display.label,
    index,
  })
  return fallback
}

async function captureSingleDisplay(display: Display, index: number, targetDir: string, lookup: SourceLookup) {
  const source = pickSourceForDisplay(display, index, lookup)
  if (!source) {
    mainLogger.warn('desktopCapturer missing source for display', { displayId: display.id })
    return null
  }
  const image = source.thumbnail
  if (image.isEmpty()) {
    mainLogger.warn('desktopCapturer returned empty thumbnail', { displayId: display.id })
    return null
  }
  const png = image.toPNG()
  const size = image.getSize()
  const scale =
    display.bounds.width > 0 && size.width > 0 ? size.width / display.bounds.width : display.scaleFactor ?? 1
  const filename = `display-${index}-${display.id}.png`
  const filePath = path.join(targetDir, filename)
  await fs.writeFile(filePath, png)
  return {
    id: display.id,
    dataUrl: `data:image/png;base64,${png.toString('base64')}`,
    bounds: display.bounds,
    scale: scale || 1,
    filename: filePath,
    width: size.width,
    height: size.height,
  } satisfies ScreenshotDisplay
}

async function captureDisplaysToCache(targetDir: string, displays: Display[]): Promise<ScreenshotDisplay[]> {
  const captures: ScreenshotDisplay[] = []
  if (displays.length === 0) {
    mainLogger.error('desktopCapturer returned no displays')
    return captures
  }
  const maxPixels = displays.reduce(
    (acc, display) => {
      const pixelWidth = Math.max(1, Math.round(display.size.width * (display.scaleFactor ?? 1)))
      const pixelHeight = Math.max(1, Math.round(display.size.height * (display.scaleFactor ?? 1)))
      acc.width = Math.max(acc.width, pixelWidth)
      acc.height = Math.max(acc.height, pixelHeight)
      return acc
    },
    { width: 1, height: 1 },
  )
  const thumbnailSize = clampThumbnailSize(maxPixels.width, maxPixels.height)
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize,
  })
  const lookup: SourceLookup = {
    byId: new Map(),
    byName: new Map(),
    ordered: sources,
  }
  for (const source of sources) {
    const id = normalizeSourceDisplayId(source)
    if (id !== null) {
      lookup.byId.set(id, source)
    }
    const normalizedName = normalizeLabel(source.name)
    if (normalizedName) {
      lookup.byName.set(normalizedName, source)
    }
  }
  await Promise.all(
    displays.map(async (display, index) => {
      try {
        const entry = await captureSingleDisplay(display, index, targetDir, lookup)
        if (entry) {
          captures.push(entry)
        }
      } catch (error) {
        mainLogger.warn('capture single display failed', {
          displayId: display.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }),
  )
  return captures
}

function resolveTargetDisplays(displayId?: number | null): Display[] {
  const allDisplays = screen.getAllDisplays()
  if (displayId !== null && typeof displayId === 'number') {
    const match = allDisplays.find((display) => display.id === displayId)
    if (match) {
      return [match]
    }
  }
  const primary = screen.getPrimaryDisplay()
  return primary ? [primary] : allDisplays.slice(0, 1)
}

export function setPreferredCaptureDisplay(displayId: number | null) {
  if (typeof displayId === 'number' && Number.isFinite(displayId)) {
    preferredDisplayId = displayId
    return
  }
  preferredDisplayId = null
}

export async function discardSnapshot(id?: string) {
  const targetId = id ?? latestSnapshot?.id
  if (!targetId) return
  if (latestSnapshot?.id === targetId) {
    latestSnapshot = null
  }
  try {
    await removeSnapshotResources(targetId)
    mainLogger.debug('snapshot discarded', { id: targetId })
  } catch (error) {
    mainLogger.warn('failed to discard snapshot', {
      id: targetId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function captureScreenSnapshot(
  options?: { force?: boolean; displayId?: number; excludeOverlay?: boolean },
): Promise<ScreenshotResult> {
  const forceNew = options?.force ?? true
  await fs.mkdir(CACHE_ROOT, { recursive: true })

  if (!forceNew && latestSnapshot) {
    const age = Date.now() - latestSnapshot.generatedAt
    if (age < SNAPSHOT_CACHE_WINDOW_MS) {
      mainLogger.debug('reuse cached snapshot', { ageMs: age })
      return latestSnapshot
    }
  }

  const overlayWindow = getOverlayWindow()
  const overlayVisible = Boolean(options?.excludeOverlay && overlayWindow && overlayWindow.isVisible())
  if (overlayVisible) {
    hideOverlayWindow()
  }

  const targetDir = path.join(CACHE_ROOT, `capture-${Date.now()}`)
  await fs.mkdir(targetDir, { recursive: true })
  const targets = resolveTargetDisplays(options?.displayId ?? preferredDisplayId)
  let displays: ScreenshotDisplay[] = []
  try {
    displays = await captureDisplaysToCache(targetDir, targets)
  } finally {
    if (overlayVisible) {
      showOverlayWindow()
    }
  }
  if (displays.length === 0) {
    throw new Error('capture failed: no display thumbnails available')
  }
  const viewport = getViewportBounds(targets)

  const snapshot: ScreenshotResult = {
    id: randomUUID(),
    generatedAt: Date.now(),
    cacheDir: targetDir,
    displays,
    viewport,
  }

  latestSnapshot = snapshot
  registerSnapshot(snapshot)
  void cleanupOldCaptures()
  mainLogger.info('snapshot captured', { displays: displays.length, cacheDir: targetDir })
  return snapshot
}

export function getLatestSnapshot() {
  return latestSnapshot
}

function getSnapshotCacheDir(snapshotId?: string | null) {
  if (!snapshotId) return null
  const entry = snapshotRegistry.get(snapshotId)
  return entry?.cacheDir ?? null
}

function getSnapshotEntry(snapshotId?: string | null) {
  if (!snapshotId) return null
  return snapshotRegistry.get(snapshotId) ?? null
}

export async function saveSelectionPreview(payload: SelectionExportPayload): Promise<SelectionExportResult> {
  const cacheDir = getSnapshotCacheDir(payload.snapshotId) ?? path.join(CACHE_ROOT, 'selection-exports')
  await fs.mkdir(cacheDir, { recursive: true })
  const timestamp = Date.now()
  const parts = ['selection']
  if (typeof payload.displayId === 'number') {
    parts.push(`display-${payload.displayId}`)
  }
  parts.push(String(timestamp))
  const filenameBase = parts.join('-')
  const imagePath = path.join(cacheDir, `${filenameBase}.png`)
  const delimiter = payload.dataUrl.indexOf(',')
  const base64 = delimiter >= 0 ? payload.dataUrl.slice(delimiter + 1) : payload.dataUrl
  await fs.writeFile(imagePath, Buffer.from(base64, 'base64'))

  let metadataPath: string | undefined
  if (payload.rect) {
    const metadata = {
      ...payload.rect,
      displayId: payload.displayId,
      savedAt: new Date(timestamp).toISOString(),
      file: path.basename(imagePath),
    }
    metadataPath = path.join(cacheDir, `${filenameBase}.json`)
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { encoding: 'utf-8' })
  }

  const aliasName =
    typeof payload.displayId === 'number'
      ? `selection-latest-display-${payload.displayId}.png`
      : 'selection-latest.png'
  const aliasPath = path.join(cacheDir, aliasName)
  await fs.copyFile(imagePath, aliasPath)

  mainLogger.debug('selection preview saved', { imagePath, aliasPath, metadataPath })
  return { path: imagePath, latestAliasPath: aliasPath, metadataPath }
}

export async function buildSnapshotDebugPayload(snapshotId?: string | null): Promise<SnapshotDebugPayload | null> {
  if (!snapshotId) return null
  const entry = getSnapshotEntry(snapshotId)
  if (!entry) {
    return null
  }
  const displays = await Promise.all(
    entry.metadata.displays.map(async (display) => {
      try {
        const buffer = await fs.readFile(display.filename)
        return {
          id: display.id,
          bounds: display.bounds,
          scale: display.scale,
          width: display.width,
          height: display.height,
          dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
        }
      } catch (error) {
        mainLogger.warn('failed to read snapshot display', {
          id: display.id,
          file: display.filename,
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }
    }),
  )
  const filtered = displays.filter((item): item is NonNullable<typeof item> => Boolean(item))
  if (filtered.length === 0) {
    return null
  }
  return {
    id: entry.metadata.id,
    generatedAt: entry.metadata.generatedAt,
    viewport: entry.metadata.viewport,
    displays: filtered,
  }
}
