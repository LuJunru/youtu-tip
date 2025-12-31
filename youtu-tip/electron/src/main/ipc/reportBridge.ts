import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { ReportLaunchPayload, ReportAutoSubmitPayload } from '@shared/types'
import { openReportWindow, getReportWindow } from '../windows/reportWindow'
import { submitDebugReport } from '../services/debugReporter'
import { mainLogger } from '../services/logger'

let pendingReportPayload: ReportLaunchPayload | null = null

export function registerReportBridge() {
  ipcMain.handle(IPC_CHANNELS.REPORT_START, async (_event, payload: ReportLaunchPayload) => {
    if (!payload?.sessionId) {
      throw new Error('report start requires sessionId')
    }
    pendingReportPayload = payload
    const window = openReportWindow()
    if (window) {
      mainLogger.info('report window opened', { sessionId: payload.sessionId })
      window.once('closed', () => {
        pendingReportPayload = null
      })
    }
    return true
  })

  ipcMain.handle(IPC_CHANNELS.REPORT_BOOTSTRAP, async () => pendingReportPayload)

  ipcMain.handle(IPC_CHANNELS.REPORT_SUBMIT, async (_event, payload: { issue: string }) => {
    if (!pendingReportPayload?.sessionId) {
      throw new Error('report context unavailable')
    }
    const issue = payload?.issue?.trim()
    if (!issue) {
      throw new Error('问题描述不能为空')
    }
    const result = await submitDebugReport({ ...pendingReportPayload, issue, label: 'manual' })
    pendingReportPayload = null
    const window = getReportWindow()
    window?.close()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.REPORT_AUTO_SUBMIT, async (_event, payload: ReportAutoSubmitPayload) => {
    if (!payload?.sessionId) {
      throw new Error('auto report requires sessionId')
    }
    const issue = payload.issue?.trim()
    if (!issue) {
      throw new Error('auto report requires issue')
    }
    mainLogger.info('auto report requested', {
      sessionId: payload.sessionId,
      captureId: payload.captureId,
      label: payload.label ?? 'auto',
    })
    const result = await submitDebugReport(payload)
    mainLogger.info('auto report completed', { sessionId: payload.sessionId, reportId: result.reportId })
    return result
  })
}
