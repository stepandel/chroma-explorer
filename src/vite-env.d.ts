/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FORMINIT_FORM_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_RELEASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
