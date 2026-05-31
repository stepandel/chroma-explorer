import { defineConfig, loadEnv } from 'vite'
import electron from 'vite-plugin-electron/simple'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env file for build-time environment variables
const env = loadEnv('', process.cwd(), '')
const sentryDsn = env.SENTRY_DSN || env.VITE_SENTRY_DSN || ''
const sentryRelease = env.SENTRY_RELEASE || `chroma-explorer@${process.env.npm_package_version || '0.0.0'}`
const shouldBuildSourceMaps = Boolean(env.SENTRY_DSN || env.VITE_SENTRY_DSN)
const shouldUploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT)


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
    sourcemap: shouldBuildSourceMaps ? 'hidden' : false,
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
            'process.env.SENTRY_DSN': JSON.stringify(sentryDsn),
            'process.env.VITE_SENTRY_DSN': JSON.stringify(sentryDsn),
            'process.env.SENTRY_RELEASE': JSON.stringify(sentryRelease),
            'process.env.CHROMA_EXPLORER_RELEASE': JSON.stringify(env.CHROMA_EXPLORER_RELEASE || ''),
          },
          build: {
            sourcemap: shouldBuildSourceMaps ? 'hidden' : false,
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
      renderer: {
        vite: {
          define: {
            'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(sentryDsn),
            'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(sentryRelease),
          },
        },
      },
    }),
    shouldUploadSourceMaps && sentryVitePlugin({
      authToken: env.SENTRY_AUTH_TOKEN,
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      release: {
        name: sentryRelease,
      },
      sourcemaps: {
        assets: ['./dist/**/*', './dist-electron/**/*'],
        ignore: ['**/node_modules/**'],
        filesToDeleteAfterUpload: ['./dist/**/*.map', './dist-electron/**/*.map'],
      },
    }),
  ],
})
