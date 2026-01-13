import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['chromadb']
  },
  build: {
    commonjsOptions: {
      include: [/chromadb/, /node_modules/]
    }
  },
  esbuild: {
    target: 'esnext',
    keepNames: true
  },
  plugins: [
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                '@chroma-core/default-embed',
                'onnxruntime-node',
                'sharp',
              ],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
})
