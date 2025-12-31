interface Props {
  content: string
  pending?: boolean
}

export function GuiAgentLogMessage({ content, pending }: Props) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    return null
  }

  return (
    <div className="space-y-1 text-[13px] leading-relaxed text-slate-900">
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className="flex items-center whitespace-pre-wrap">
          <span className="flex-1">{line}</span>
          {pending && index === lines.length - 1 ? <AnimatedEllipsis /> : null}
        </p>
      ))}
    </div>
  )
}

function AnimatedEllipsis() {
  return (
    <span className="ml-1 inline-flex min-w-[18px] translate-y-px animate-pulse text-[16px] leading-none text-slate-500">
      ...
    </span>
  )
}
