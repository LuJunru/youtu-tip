import { rmSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

export function createViteConfig(command) {
  // Always start from a clean output so switching between build/serve is predictable.
  rmSync('dist-electron', { recursive: true, force: true })

  // Normalize command flags for readability in config fragments.
  const isServe = command === 'serve'
  const isBuild = command === 'build'
  // Keep sourcemaps on for serve and VSCode debug to improve stack traces.
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  // Shared resolver aliases used by main/preload/renderer to keep imports short.
  const aliases = {
    '@renderer': path.join(__dirname, 'src/renderer'),
    '@main': path.join(__dirname, 'src/main'),
    '@preload': path.join(__dirname, 'src/preload'),
    '@shared': path.join(__dirname, 'src/shared'),
  }
  // Exclude electron dependencies from bundling; they are provided at runtime.
  const externalDeps = Object.keys('dependencies' in pkg ? pkg.dependencies : {})
  const sharedResolve = { alias: aliases }
  const sharedBuild = {
    sourcemap,
    minify: isBuild,
    rollupOptions: {
      external: externalDeps,
    },
  }

  return {
    resolve: sharedResolve,
    plugins: [
      react(),
      electron({
        main: {
          entry: 'src/main/app.ts',
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              // VSCode debug helper waits for Electron startup rather than launching immediately.
              console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App')
            } else {
              args.startup()
            }
          },
          vite: {
            build: {
              ...sharedBuild,
              outDir: 'dist-electron/main',
              rollupOptions: { ...sharedBuild.rollupOptions },
            },
            resolve: sharedResolve,
          },
        },
        preload: {
          input: 'src/preload/index.ts',
          vite: {
            build: {
              ...sharedBuild,
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              outDir: 'dist-electron/preload',
              rollupOptions: {
                ...sharedBuild.rollupOptions,
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].cjs',
                },
              },
            },
            resolve: sharedResolve,
          },
        },
        renderer: {},
      }),
    ],
    server: process.env.VSCODE_DEBUG && (() => {
      const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
      return {
        host: url.hostname,
        port: +url.port,
      }
    })(),
    clearScreen: false,
  }
}
