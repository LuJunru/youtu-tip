import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const FILE_NAME = 'startup-guide.json'

function getFlagPath() {
  const userDir = app.getPath('userData')
  return path.join(userDir, FILE_NAME)
}

export function isGuideSuppressedLocally() {
  try {
    const filePath = getFlagPath()
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    return Boolean(data?.suppressed)
  } catch {
    return false
  }
}

export function markGuideSuppressed() {
  try {
    const filePath = getFlagPath()
    const payload = { suppressed: true, updatedAt: Date.now() }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8')
    return true
  } catch {
    return false
  }
}
