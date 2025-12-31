import { useOverlayStore } from '../state/overlayStore'
import { useSelectionController } from '../hooks/useSelectionController'

export function SelectionCanvas() {
  const visible = useOverlayStore((state) => state.visible)
  const selectionRect = useOverlayStore((state) => state.selectionRect)
  const snapshotReady = useOverlayStore((state) => Boolean(state.snapshot))
  const selectionLocked = useOverlayStore((state) => state.selectionLocked)
  const { handlePointerDown } = useSelectionController()

  if (!visible) return null

  const waitingForSnapshot = selectionLocked && !snapshotReady

  return (
    <div
      className="absolute inset-0 z-20 cursor-crosshair"
      onPointerDown={handlePointerDown}
      role="presentation"
    >
      {waitingForSnapshot && (
        <div className="pointer-events-none absolute right-8 top-8 rounded-full bg-black/40 px-4 py-2 text-xs text-white backdrop-blur">
          正在获取干净截图…
        </div>
      )}
      {selectionRect && (
        <div
          className="absolute bg-gradient-to-br from-tip-highlight-from/45 to-tip-highlight-to/35 backdrop-blur-sm"
          style={{
            left: `${selectionRect.x}px`,
            top: `${selectionRect.y}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[6px] border border-transparent"
            style={{
              background: 'linear-gradient(135deg, rgba(96,209,255,0.85), rgba(140,123,255,0.85))',
              WebkitMask:
                'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-[1px] border border-white/20"
            aria-hidden
          />
          <div className="absolute left-3 top-2 text-xs font-medium text-white drop-shadow">
            {Math.max(1, Math.round(selectionRect.width))} × {Math.max(1, Math.round(selectionRect.height))}
          </div>
        </div>
      )}
    </div>
  )
}
