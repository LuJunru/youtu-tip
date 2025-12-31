import { defineConfig } from 'vite'
import { createViteConfig } from './vite.config.shared.js'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return createViteConfig(command)
})
