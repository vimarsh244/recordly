import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cross origin isolation unlocks SharedArrayBuffer, which the multi threaded
// FFmpeg build needs. In production a small service worker adds these headers,
// because static hosts do not send them. The dev and preview servers send them
// directly so both behave the same way.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  build: {
    target: 'es2022',
    // The FFmpeg thread worker is small enough that Vite would turn it into a
    // data URL. A worker started from a data URL has an opaque origin, which
    // costs the page its cross origin isolation, which is the whole reason the
    // multi threaded build is here. Keep it as a real file.
    assetsInlineLimit: (filePath: string) => (filePath.endsWith('.worker.js') ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@ffmpeg')) return 'ffmpeg'
          if (id.includes('mediabunny')) return 'mediabunny'
          return undefined
        },
      },
    },
  },
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core', '@ffmpeg/core-mt', '@ffmpeg/util'] },
})
