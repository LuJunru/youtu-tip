import { useMemo, useState } from 'react'

interface Props {
  content: string
  pending?: boolean
}

export function ReasoningBubble({ content, pending }: Props) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => setExpanded((value) => !value)

  return (
    <div className="mb-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-left text-[10px] font-normal text-slate-700"
      >
        <span>{pending ? '思考中…' : '思考过程'}</span>
        <span className="text-[10px] text-slate-500">{expanded ? '收起' : '展开'}</span>
      </button>
      {expanded ? (
        <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white/70 px-2 py-1 text-[11px] leading-snug text-slate-700">
          {content}
        </pre>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">
          {"点击展开思考过程"}
        </p>
      )}
    </div>
  )
}
