import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { rendererLogger } from './utils/logger'
import { useSidecarStatus } from './hooks/useSidecarStatus'

const guideImages = ['guide/slide1_update.png', 'guide/slide2_update.png']

export function GuideApp() {
  useSidecarStatus()
  const slides = useMemo(() => guideImages, [])
  const [index, setIndex] = useState(0)
  const isLast = index === slides.length - 1

  const handleNext = () => setIndex((prev) => Math.min(prev + 1, slides.length - 1))
  const handlePrev = () => setIndex((prev) => Math.max(prev - 1, 0))

  const closeWindow = () => {
    window.close()
  }

  const confirm = async (disableNext: boolean) => {
    if (disableNext) {
      try {
        const current = await window.tipSettings?.get?.()
        const prevFeatures = current?.features
        const nextFeatures = prevFeatures
          ? { ...prevFeatures, startupGuideEnabled: false }
          : { visionEnabled: true, guiAgentEnabled: true, startupGuideEnabled: false }
        await window.tipSettings?.update?.({ features: nextFeatures })
      } catch (error) {
        rendererLogger.error('disable startup guide failed', { error: (error as Error)?.message })
      }
      try {
        await window.tipApp?.suppressGuide?.()
      } catch (error) {
        rendererLogger.error('suppress guide flag failed', { error: (error as Error)?.message })
      }
    }
    closeWindow()
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-white">
      <div className="relative flex h-[660px] w-[880px] max-h-[90vh] max-w-[90vw] min-h-[540px] min-w-[760px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="relative flex-1 min-h-0 bg-slate-50">
          <img src={slides[index]} alt={`指引第 ${index + 1} 张`} className="h-full w-full object-contain" />
          <button
            className={clsx(
              'absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg shadow transition hover:-translate-x-0.5 hover:shadow-md',
              index === 0 && 'opacity-60 hover:translate-x-0',
            )}
            onClick={handlePrev}
            disabled={index === 0}
            aria-label="上一页"
          >
            ‹
          </button>
          <button
            className={clsx(
              'absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg shadow transition hover:translate-x-0.5 hover:shadow-md',
              isLast && 'opacity-60 hover:translate-x-0',
            )}
            onClick={handleNext}
            disabled={isLast}
            aria-label="下一页"
          >
            ›
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={clsx('h-2 w-8 rounded-full bg-slate-300', i === index && 'bg-slate-600')}
              />
            ))}
          </div>
          {isLast ? (
            <div className="flex items-center gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => confirm(false)}
              >
                确认
              </button>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => confirm(true)}
              >
                确认并不再弹出
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
