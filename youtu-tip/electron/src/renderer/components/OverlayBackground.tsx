import type { OverlayMode } from '@shared/types'
import clsx from 'clsx'

interface Props {
  visible: boolean
  mode: OverlayMode
  activationPulseKey: number
}

export function OverlayBackground({ visible, mode, activationPulseKey }: Props) {
  const frameVisible = visible && mode !== 'idle'

  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {visible && activationPulseKey > 0 && (
        <div key={activationPulseKey} className="overlay-activation-pulse" />
      )}
      {frameVisible && (
        <>
          <div className="overlay-flare overlay-flare-top" />
          <div className="overlay-flare overlay-flare-bottom" />
          <div className="overlay-flare overlay-flare-left" />
          <div className="overlay-flare overlay-flare-right" />
        </>
      )}
    </div>
  )
}
