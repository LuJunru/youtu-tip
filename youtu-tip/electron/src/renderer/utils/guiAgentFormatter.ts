import type { GuiAgentLogEvent } from '../services/guiAgentClient'

export function formatGuiAgentLog(event: GuiAgentLogEvent): string | null {
  const type = event.type ?? 'log'
  if (type === 'step') {
    const detail = describeStepAction((event.message ?? '').toString())
    return `- ${detail}`
  }
  if (type === 'error') {
    const detail = (event.message ?? '').toString().trim() || '执行时发生错误'
    return `- 执行失败：${detail}`
  }
  return null
}

function describeStepAction(rawMessage: string): string {
  const message = rawMessage.trim()
  const normalized = message.toLowerCase()
  if (!message) {
    return '执行自动化步骤'
  }

  if (normalized === 'done') {
    return '已经完成任务'
  }

  const pasteText = extractPasteText(message)
  if (pasteText.found) {
    const text = pasteText.text ? truncateText(pasteText.text) : ''
    return text ? `正在输入：${text}` : '正在输入'
  }

  const clickMatch = message.match(/pyautogui\.(doubleclick|click)\(([^)]*)\)/i)
  if (clickMatch) {
    const action = clickMatch[1].toLowerCase() === 'doubleclick' ? '双击' : '点击'
    const coords = formatCoords(clickMatch[2])
    return coords ? `正在尝试${action}屏幕 (${coords})` : `正在尝试${action}屏幕`
  }

  const moveMatch = message.match(/pyautogui\.move(To|Rel)\(([^)]*)\)/i)
  if (moveMatch) {
    const coords = formatCoords(moveMatch[2])
    return coords ? `正在移动鼠标到 (${coords})` : '正在移动鼠标位置'
  }

  const dragMatch = message.match(/pyautogui\.drag(To|Rel)\(([^)]*)\)/i)
  if (dragMatch) {
    const coords = formatCoords(dragMatch[2])
    return coords ? `正在拖拽鼠标至 (${coords})` : '正在拖拽鼠标'
  }

  if (normalized.includes('pyautogui.scroll')) {
    const amount = extractArgs(message)
    return amount ? `正在滚动屏幕（${amount}）` : '正在滚动屏幕'
  }

  if (normalized.includes('pyautogui.hotkey')) {
    const keys = extractQuotedList(message)
    return keys.length ? `正在按组合键 ${keys.join(' + ')}` : '正在按组合键'
  }

  const pressMatch = message.match(/pyautogui\.(press|keyDown|keyUp)\(([^)]*)\)/i)
  if (pressMatch) {
    const keys = extractQuotedList(pressMatch[2])
    const keyLabel = keys[0] ? translateKey(keys[0]) : '按键'
    const action = pressMatch[1].toLowerCase()
    if (action === 'keydown') {
      return `正在按下 ${keyLabel}`
    }
    if (action === 'keyup') {
      return `正在释放 ${keyLabel}`
    }
    return `正在按下 ${keyLabel}`
  }

  const textMatch = message.match(/pyautogui\.(write|typewrite)\(([^)]*)\)/i)
  if (textMatch) {
    const text = truncateText(extractFirstQuoted(textMatch[2]))
    return text ? `正在输入内容：${text}` : '正在输入内容'
  }

  return `正在执行：${message}`
}

function extractPasteText(rawMessage: string): { found: boolean; text?: string } {
  const assignmentMatch = rawMessage.match(/text_to_type\s*=\s*(['"])([\s\S]*?)\1/)
  if (assignmentMatch) {
    const decoded = decodeEscapedUnicode(assignmentMatch[2].trim())
    return { found: true, text: decoded }
  }

  const clipMatch = rawMessage.match(/pyperclip\.copy\(([^)]*)\)/i)
  if (clipMatch) {
    const text = extractFirstQuoted(clipMatch[1])
    const decoded = decodeEscapedUnicode(text)
    return { found: true, text: decoded }
  }

  const hasPasteHotkey =
    rawMessage.toLowerCase().includes('pyautogui.hotkey') &&
    rawMessage.toLowerCase().includes('command') &&
    rawMessage.toLowerCase().includes('v')
  if (rawMessage.includes('pyperclip.copy') && hasPasteHotkey) {
    return { found: true }
  }
  return { found: false }
}

function formatCoords(raw: string | undefined): string | null {
  if (!raw) return null
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length) {
    return null
  }
  return parts.join(', ')
}

function extractArgs(raw: string): string {
  const match = raw.match(/\(([^)]*)\)/)
  return match?.[1]?.trim() ?? ''
}

function extractQuotedList(raw: string): string[] {
  const matches = [...raw.matchAll(/['"]([^'"]+)['"]/g)]
  return matches.map((match) => match[1])
}

function extractFirstQuoted(raw: string): string {
  const match = raw.match(/['"]([^'"]+)['"]/)
  return match ? match[1] : ''
}

function truncateText(text: string): string {
  if (!text) return ''
  return text.length > 24 ? `${text.slice(0, 24)}…` : text
}

function decodeEscapedUnicode(text: string): string {
  if (!text) return ''
  const needsDecode = /\\(u[0-9a-fA-F]{4}|n|r|t|b|f)/.test(text)
  if (!needsDecode) return text

  // Normalize control characters so JSON.parse can handle them
  const normalized = text
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
  try {
    return JSON.parse(`"${normalized.replace(/"/g, '\\"')}"`)
  } catch {
    // Fallback manual replacement
    return normalized
      .replace(/\\u[0-9a-fA-F]{4}/g, (match) => {
        try {
          return String.fromCharCode(parseInt(match.slice(2), 16))
        } catch {
          return match
        }
      })
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
  }
}

function translateKey(key: string): string {
  const normalized = key.toLowerCase()
  switch (normalized) {
    case 'return':
    case 'enter':
      return '回车键'
    case 'space':
      return '空格键'
    case 'esc':
      return 'Esc 键'
    case 'tab':
      return 'Tab 键'
    default:
      return key
  }
}
