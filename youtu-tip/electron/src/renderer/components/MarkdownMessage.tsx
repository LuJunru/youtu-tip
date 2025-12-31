import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import clsx from 'clsx'

interface Props {
  content: string
  pending?: boolean
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 whitespace-pre-wrap text-[12px] leading-snug text-slate-900 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="text-slate-600">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} className="text-purple-600 underline-offset-2 hover:underline">
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc pl-5 text-[12px] leading-snug text-slate-900 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal pl-5 text-[12px] leading-snug text-slate-900 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  code: ({ children, className, ...rest }) => (
    <code {...rest} className={clsx('rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-900', className)}>
      {children}
    </code>
  ),
  pre: ({ children, className, ...rest }) => (
    <pre
      {...rest}
      className={clsx(
        'mb-2 max-w-full overflow-x-auto rounded-2xl bg-slate-900/95 p-3 text-[11px] text-slate-100 last:mb-0',
        className,
      )}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-purple-200 pl-3 text-[12px] italic text-slate-700 last:mb-0">
      {children}
    </blockquote>
  ),
}

export function MarkdownMessage({ content, pending }: Props) {
  const hasContent = typeof content === 'string' && content.trim().length > 0
  const textToRender = hasContent ? content : pending ? '…' : ''

  if (!textToRender) {
    return null
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {textToRender}
    </ReactMarkdown>
  )
}
