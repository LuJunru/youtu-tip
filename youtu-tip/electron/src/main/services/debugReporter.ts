import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ReportLaunchPayload, DebugReportResult } from '@shared/types'
import { getSidecarBaseUrl } from './sidecarHealth'
import { buildSnapshotDebugPayload } from './captureService'
import { mainLogger } from './logger'

interface ReportSubmitPayload extends ReportLaunchPayload {
  issue: string
  label?: string | null
}

const MAIN_LOG_PATH = path.join(os.homedir(), 'Library', 'Logs', 'Tip', 'main.log')
const MAX_LOG_BYTES = 512 * 1024
const autoReportTasks = new Map<string, Promise<DebugReportResult>>()

function normalizeLabel(value?: string | null) {
  if (!value) return null
  const filtered = value
    .toLowerCase()
    .split('')
    .filter((char) => /[a-z0-9-_]/.test(char))
    .join('')
  return filtered || null
}

function getAutoReportKey(sessionId: string, label: string | null) {
  if (!label) return null
  if (label === 'manual') return null
  return `${sessionId}:${label}`
}

async function buildMainLogAttachment() {
  try {
    const buffer = await fs.readFile(MAIN_LOG_PATH)
    if (buffer.byteLength === 0) {
      return null
    }
    let slice = buffer
    let truncated = false
    if (buffer.byteLength > MAX_LOG_BYTES) {
      truncated = true
      slice = buffer.subarray(buffer.byteLength - MAX_LOG_BYTES)
    }
    return {
      name: 'main.log',
      path: MAIN_LOG_PATH,
      totalBytes: buffer.byteLength,
      retainedBytes: slice.byteLength,
      truncated,
      content: slice.toString('utf-8'),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      mainLogger.warn('debug report main log read failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return null
  }
}

export async function submitDebugReport(payload: ReportSubmitPayload): Promise<DebugReportResult> {
  if (!payload.sessionId) {
    throw new Error('缺少 sessionId，无法生成报告')
  }
  const normalizedLabel = normalizeLabel(payload.label)
  const autoKey = getAutoReportKey(payload.sessionId, normalizedLabel)
  if (autoKey) {
    const existing = autoReportTasks.get(autoKey)
    if (existing) {
      mainLogger.info('debug report auto submit skipped (duplicate)', {
        sessionId: payload.sessionId,
        label: normalizedLabel,
      })
      return existing
    }
  }

  const task = (async () => {
    const capture = payload.captureId ? await buildSnapshotDebugPayload(payload.captureId) : null
    const logAttachment = await buildMainLogAttachment()
    const captureBody = capture
      ? {
          id: capture.id,
          generated_at: capture.generatedAt,
          viewport: capture.viewport,
          displays: capture.displays.map((display) => ({
            id: display.id,
            bounds: display.bounds,
            scale: display.scale,
            width: display.width,
            height: display.height,
            data_url: display.dataUrl,
          })),
        }
      : null
  const body = {
    session_id: payload.sessionId,
    issue: payload.issue,
    capture_id: payload.captureId ?? null,
    selected_intent: payload.selectedIntent ?? null,
    draft_intent: payload.draftIntent ?? null,
    gui_agent: payload.guiAgent
      ? {
          run_id: payload.guiAgent.runId,
          instruction: payload.guiAgent.instruction,
        }
      : null,
    label: normalizedLabel,
    capture: captureBody,
    selection_preview: payload.preview
      ? {
          data_url: payload.preview.dataUrl,
            display_id: payload.preview.displayId,
            rect: payload.preview.rect,
          }
        : null,
      viewport: payload.viewport ?? null,
      text_selection: payload.textSelection ?? null,
      logs: logAttachment
        ? [
            {
              name: logAttachment.name,
              path: logAttachment.path,
              truncated: logAttachment.truncated,
              total_bytes: logAttachment.totalBytes,
              retained_bytes: logAttachment.retainedBytes,
              content: logAttachment.content,
            },
          ]
        : null,
    }

    const response = await fetch(`${getSidecarBaseUrl()}/debug/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const message = await response.text()
      mainLogger.warn('debug report submit failed', {
        status: response.status,
        message,
      })
      throw new Error(message || '无法生成问题报告，请稍后再试')
    }
    const data = await response.json()
    return {
      path: data.path,
      reportId: data.report_id ?? data.reportId,
      createdAt: data.created_at ?? data.createdAt,
      remoteUrl: data.remote_url ?? data.remoteUrl,
    }
  })()

  if (autoKey) {
    autoReportTasks.set(autoKey, task)
  }

  try {
    return await task
  } finally {
    if (autoKey) {
      const cached = autoReportTasks.get(autoKey)
      if (cached === task) {
        autoReportTasks.delete(autoKey)
      }
    }
  }
}
