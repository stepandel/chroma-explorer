import { defineConfig, loadEnv } from 'vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env file for build-time environment variables
const env = loadEnv('', process.cwd(), '')


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
          define: {
            'process.env.APTABASE_APP_KEY': JSON.stringify(env.APTABASE_APP_KEY || ''),
            'process.env.SENTRY_DSN': JSON.stringify(env.SENTRY_DSN || ''),
            'process.env.VITE_SENTRY_DSN': JSON.stringify(env.VITE_SENTRY_DSN || env.SENTRY_DSN || ''),
            'process.env.CHROMA_EXPLORER_RELEASE': JSON.stringify(env.CHROMA_EXPLORER_RELEASE || ''),
          },
          build: {
            rollupOptions: {
              external: [
                '@chroma-core/sentence-transformer',
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
