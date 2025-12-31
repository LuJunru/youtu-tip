import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const APP_ROOT = process.env.APP_ROOT
export const MAIN_DIST = path.join(APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(APP_ROOT, 'dist')
export const PRELOAD_DIST = path.join(MAIN_DIST, 'preload/index.cjs')
export const HTML_ENTRY = path.join(RENDERER_DIST, 'index.html')
export const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || ''
