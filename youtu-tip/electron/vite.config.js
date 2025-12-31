import { defineConfig } from 'vite';
import { createViteConfig } from './vite.config.shared.js';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
  var command = _a.command;
  return createViteConfig(command);
});
