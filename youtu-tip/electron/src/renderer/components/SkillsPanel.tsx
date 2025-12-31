import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { SkillDetail, SkillSummary } from '@shared/types'
import {
  createSkill,
  deleteSkill,
  fetchSkill,
  listSkills,
  updateSkill,
} from '../services/skills'

interface SkillsPanelProps {
  interactiveRegionStyle?: CSSProperties
}

interface FeedbackState {
  type: 'success' | 'error'
  message: string
}

const inputClass =
  'rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-purple-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400'

const textareaClass =
  'rounded-[20px] border border-slate-200/80 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-purple-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400'

export function SkillsPanel({ interactiveRegionStyle }: SkillsPanelProps) {
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [current, setCurrent] = useState<SkillDetail | null>(null)
  const [form, setForm] = useState({ title: '', body: '' })
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  const trimmedTitle = form.title.trim()
  const dirty = useMemo(() => {
    if (!current) {
      return trimmedTitle.length > 0 || form.body.trim().length > 0
    }
    return trimmedTitle !== current.title || form.body !== current.body
  }, [current, form.body, trimmedTitle])

  const canSave = trimmedTitle.length > 0 && dirty && !saving

  const startNewSkill = useCallback(() => {
    setSelectedId(null)
    setCurrent(null)
    setForm({ title: '', body: '' })
  }, [])

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  const loadSkillDetail = useCallback(async (skillId: string) => {
    setDetailLoading(true)
    setFeedback(null)
    try {
      const detail = await fetchSkill(skillId)
      setSelectedId(skillId)
      setCurrent(detail)
      setForm({ title: detail.title, body: detail.body })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, '无法加载技能内容'),
      })
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadSkillList = useCallback(
    async (preferSkillId?: string | null) => {
      setListLoading(true)
      setFeedback(null)
      try {
        const data = await listSkills()
        setSkills(data)
        if (data.length === 0) {
          startNewSkill()
          return
        }
        let target = preferSkillId
        if (target && !data.some((item) => item.id === target)) {
          target = null
        }
        if (!target) {
          target = data[0]?.id ?? null
        }
        if (target) {
          await loadSkillDetail(target)
        }
      } catch (error) {
        setFeedback({
          type: 'error',
          message: getErrorMessage(error, '无法获取技能列表'),
        })
      } finally {
        setListLoading(false)
      }
    },
    [loadSkillDetail, startNewSkill],
  )

  useEffect(() => {
    loadSkillList()
  }, [loadSkillList])

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [selectedId])

  const handleFieldChange = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = useCallback(async () => {
    if (!trimmedTitle) {
      setFeedback({ type: 'error', message: '技能标题不能为空' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const payload = { title: trimmedTitle, body: form.body }
      const result = selectedId ? await updateSkill(selectedId, payload) : await createSkill(payload)
      setFeedback({ type: 'success', message: '技能已保存' })
      await loadSkillList(result.id)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, '保存技能失败'),
      })
    } finally {
      setSaving(false)
    }
  }, [form.body, loadSkillList, selectedId, trimmedTitle])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    const confirmed = window.confirm('确认删除该技能？此操作不可撤销。')
    if (!confirmed) return
    setSaving(true)
    setFeedback(null)
    try {
      await deleteSkill(selectedId)
      setFeedback({ type: 'success', message: '技能已删除' })
      await loadSkillList(null)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, '删除技能失败'),
      })
    } finally {
      setSaving(false)
    }
  }, [loadSkillList, selectedId])

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-600" style={interactiveRegionStyle}>
      <div className="flex w-full max-w-[520px] flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">技能列表</span>
        <select
          className="rounded-full border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-purple-300 disabled:opacity-60"
          style={interactiveRegionStyle}
          value={selectedId ?? ''}
          onChange={(event) => {
            const nextId = event.target.value
            if (!nextId) {
              startNewSkill()
              return
            }
            void loadSkillDetail(nextId)
          }}
          disabled={listLoading}
        >
          <option value="">{listLoading ? '加载中…' : '新建技能'}</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.title || '未命名技能'}
            </option>
          ))}
        </select>
      </div>
      <div className="flex w-full max-w-[520px] flex-1 flex-col gap-3 self-stretch rounded-[20px] border border-slate-200/70 bg-white/95 py-3">
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">技能标题</span>
          <input
            ref={titleInputRef}
            value={form.title}
            onChange={(event) => handleFieldChange({ title: event.target.value })}
            className={inputClass}
            style={interactiveRegionStyle}
            placeholder="例如：在 Chrome 中搜索"
            disabled={saving || detailLoading}
          />
        </div>
        <label className="flex flex-col gap-2 text-sm text-slate-600 self-stretch">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">技能正文（Markdown）</span>
          <textarea
            value={form.body}
            onChange={(event) => handleFieldChange({ body: event.target.value })}
            className={textareaClass}
            style={{ ...interactiveRegionStyle, minHeight: '165px' }}
            placeholder={'1. 第一步\n2. 第二步…'}
            disabled={saving || detailLoading}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white transition',
              canSave ? 'bg-purple-500 hover:bg-purple-600' : 'bg-slate-300 text-slate-500',
            )}
            style={interactiveRegionStyle}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? '保存中…' : '保存技能'}
          </button>
          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold transition',
              !selectedId || saving
                ? 'border-red-200 bg-red-50 text-red-300'
                : 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100',
            )}
            style={interactiveRegionStyle}
            onClick={handleDelete}
            disabled={!selectedId || saving}
          >
            删除技能
          </button>
          {detailLoading && <span className="text-xs text-slate-400">技能内容加载中…</span>}
        </div>
        {feedback && (
          <p
            className={clsx(
              'rounded-full px-4 py-1.5 text-center text-xs',
              feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
            )}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  )
}
