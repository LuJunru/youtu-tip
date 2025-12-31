import { useEffect, useMemo, useState } from 'react'
import type { ReportLaunchPayload } from '@shared/types'

interface SubmitState {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message?: string
}

export function ReportApp() {
  const [payload, setPayload] = useState<ReportLaunchPayload | null>(null)
  const [issue, setIssue] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' })

  useEffect(() => {
    let active = true
    const bootstrap = async () => {
      try {
        const data = await window.tipReport?.getBootstrap?.()
        if (active) {
          setPayload(data ?? null)
        }
      } catch (error) {
        setSubmitState({
          status: 'error',
          message: (error as Error)?.message || '无法加载报告上下文',
        })
      }
    }
    void bootstrap()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (submitState.status === 'success') {
      const timer = window.setTimeout(() => {
        window.close()
      }, 1500)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [submitState.status])

  const canSubmit = useMemo(() => {
    return Boolean(payload?.sessionId) && issue.trim().length > 0 && submitState.status !== 'submitting'
  }, [issue, payload, submitState.status])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!payload?.sessionId) {
      setSubmitState({ status: 'error', message: '会话未就绪，无法提交' })
      return
    }
    if (!issue.trim()) {
      return
    }
    try {
      setSubmitState({ status: 'submitting' })
      const result = await window.tipReport?.submit?.({ issue: issue.trim() })
      setSubmitState({
        status: 'success',
        message: result?.remoteUrl
          ? `已上传：${result.remoteUrl}`
          : result?.path
            ? `已保存：${result.path}`
            : '问题日志已保存',
      })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: (error as Error)?.message || '提交失败，请稍后再试',
      })
    }
  }

  const selectedIntent = payload?.selectedIntent || payload?.draftIntent || '（尚未选择）'

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-transparent p-4 text-slate-900">
      <form
        className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-tip-highlight-to/70 bg-white/95 p-6 text-[13px] text-slate-800 backdrop-blur"
        onSubmit={handleSubmit}
      >
        {/* <div>
          <p className="text-[15px] font-semibold text-slate-900">报告问题</p>
          <p className="text-[12px] text-slate-500">帮助我们调试本次会话</p>
        </div> */}

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-[12px] leading-relaxed text-slate-600">
          <p className="mb-1">
            <span className="font-medium text-slate-700">Session:</span> {payload?.sessionId ?? '…'}
          </p>
          <p>
            <span className="font-medium text-slate-700">意图:</span> {selectedIntent}
          </p>
          {payload?.textSelection?.truncated && (
            <p className="mt-1 text-slate-600">
              <span className="font-medium text-slate-700">选中文本:</span> {payload.textSelection.truncated}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-2 text-[12px] text-slate-600">
          问题描述
          <textarea
            className="h-28 resize-none rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-purple-300 focus:outline-none"
            placeholder="请尽量详细描述你遇到的问题..."
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            disabled={submitState.status === 'submitting'}
          />
        </label>

        {submitState.message && (
          <p
            className={
              submitState.status === 'error' ? 'text-[12px] text-red-500' : 'text-[12px] text-green-600'
            }
          >
            {submitState.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-4 text-[13px] text-slate-600 hover:border-slate-400"
            onClick={() => window.close()}
            disabled={submitState.status === 'submitting'}
          >
            取消
          </button>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-full bg-slate-900 px-5 text-[13px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSubmit}
          >
            {submitState.status === 'submitting' ? '提交中…' : '确认'}
          </button>
        </div>
      </form>
    </div>
  )
}
