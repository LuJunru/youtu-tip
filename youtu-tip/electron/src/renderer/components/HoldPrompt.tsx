import { useMemo } from 'react'
import { useOverlayStore } from '../state/overlayStore'
import { HOLD_SHORTCUT_LABEL } from '@shared/constants'
import clsx from 'clsx'

export function HoldPrompt() {
  const mode = useOverlayStore((state) => state.mode)
  const message = useMemo(() => {
    if (mode === 'intent' || mode === 'chat') return ''
    if (mode === 'selecting') return '拖动鼠标框选区域'
    if (mode === 'primed') return '框选任意区域'
    return `按住 ${HOLD_SHORTCUT_LABEL} 激活视觉模式`
  }, [mode])

  if (!message) return null

  return (
    <div className="pointer-events-none relative z-20 flex w-full justify-center">
      <div
        className={clsx(
          'rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-200',
          mode === 'primed' ? 'bg-black/55' : 'bg-black/35',
        )}
      >
        {message}
      </div>
    </div>
  )
}
