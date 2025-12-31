import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { ChatLaunchPayload } from '@shared/types'
import { openChatWindow, sendChatPayload, updateChatWindowBounds, primeChatWindowDisplay } from '../windows/chatWindow'
import { mainLogger } from '../services/logger'
import { submitDebugReport } from '../services/debugReporter'

let pendingChatPayload: ChatLaunchPayload | null = null

export function registerChatBridge() {
  ipcMain.handle(IPC_CHANNELS.CHAT_START, async (_event, payload: ChatLaunchPayload) => {
    if (!payload?.sessionId || !payload.intent) {
      throw new Error('chat start requires sessionId and intent')
    }
    primeChatWindowDisplay(payload)
    pendingChatPayload = payload
    const window = openChatWindow()
    if (window) {
      mainLogger.info('chat window requested', { sessionId: payload.sessionId })
      if (window.isVisible()) {
        sendChatPayload(payload)
      } else {
        window.once('ready-to-show', () => {
          sendChatPayload(payload)
        })
      }
      window.once('closed', () => {
        const reportPayload = pendingChatPayload
        pendingChatPayload = null
        if (reportPayload?.sessionId) {
          const chatReportPayload = {
            sessionId: reportPayload.sessionId,
            captureId: reportPayload.captureId ?? undefined,
            preview: reportPayload.preview ?? null,
            viewport: reportPayload.viewport ?? null,
            selectedIntent: reportPayload.intent ?? null,
            draftIntent: null,
            textSelection: reportPayload.textSelection ?? null,
            guiAgent: reportPayload.guiAgent ?? null,
            issue: '自动打包：对话阶段',
            label: 'chat-auto',
          }
          mainLogger.info('chat auto report requested', {
            sessionId: chatReportPayload.sessionId,
            captureId: chatReportPayload.captureId,
            label: chatReportPayload.label,
          })
          void submitDebugReport(chatReportPayload)
            .then((result) => {
              mainLogger.info('chat auto report completed', {
                sessionId: chatReportPayload.sessionId,
                reportId: result.reportId,
              })
            })
            .catch((error) => {
              mainLogger.warn('chat auto report failed', {
                sessionId: chatReportPayload.sessionId,
                error: error instanceof Error ? error.message : String(error),
              })
            })
        }
      })
    }
    return true
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_BOOTSTRAP, async () => pendingChatPayload)

  ipcMain.handle(IPC_CHANNELS.CHAT_RESIZE, (_event, bounds: { width?: number; height?: number }) => {
    updateChatWindowBounds(bounds)
  })
}

export function dispatchChatUpdate(payload: ChatLaunchPayload) {
  pendingChatPayload = payload
  primeChatWindowDisplay(payload)
  sendChatPayload(payload)
}

export function clearChatPayload() {
  pendingChatPayload = null
}
