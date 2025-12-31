import type { BrowserWindow } from 'electron'

export function revealWindowOnCurrentSpace(target: BrowserWindow | null, options?: { focus?: boolean }) {
  if (!target || target.isDestroyed()) return
  target.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })
  if (options?.focus) {
    target.show()
    target.focus()
  } else {
    target.showInactive()
  }
  setTimeout(() => {
    if (!target.isDestroyed()) {
      target.setVisibleOnAllWorkspaces(false)
    }
  }, 200)
}
