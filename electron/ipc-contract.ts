import type { Metadata, Where } from 'chromadb'

export type JsonRecord = Record<string, unknown>
export type WhereClause = Where

export type EmbeddingFunctionType =
  | 'default'
  | 'openai'
  | 'ollama'
  | 'cohere'
  | 'google-gemini'
  | 'jina'
  | 'mistral'
  | 'voyageai'
  | 'together-ai'
  | 'huggingface-server'
  | 'cloudflare-worker-ai'
  | 'morph'
  | 'chroma-cloud-qwen'
  | 'sentence-transformer'

const EMBEDDING_FUNCTION_TYPES = new Set<EmbeddingFunctionType>([
  'default',
  'openai',
  'ollama',
  'cohere',
  'google-gemini',
  'jina',
  'mistral',
  'voyageai',
  'together-ai',
  'huggingface-server',
  'cloudflare-worker-ai',
  'morph',
  'chroma-cloud-qwen',
  'sentence-transformer',
])

export interface EmbeddingFunctionOverride {
  type: EmbeddingFunctionType
  modelName?: string
  url?: string
  accountId?: string
}

export interface ConnectionProfile {
  id: string
  name: string
  connectionType?: 'cloud' | 'self-hosted'
  url: string
  tenant?: string
  database?: string
  apiKey?: string
  authType?: 'none' | 'token' | 'basic'
  authToken?: string
  authTokenHeader?: 'authorization' | 'x-chroma-token'
  authCredentials?: string
  createdAt: number
  lastUsed?: number
  embeddingOverrides?: Record<string, EmbeddingFunctionOverride>
}

export interface CollectionInfo {
  name: string
  id: string
  metadata: JsonRecord | null
  count: number
  dimension?: number | null
  embeddingFunction?: {
    name: string
    type: 'known' | 'legacy' | 'unknown'
    config?: JsonRecord
  } | null
}

export interface DocumentRecord {
  id: string
  document: string | null
  metadata: JsonRecord | null
  embedding: number[] | null
  distance?: number | null
}

export interface SearchDocumentsParams {
  collectionName: string
  queryText?: string
  nResults?: number
  metadataFilter?: WhereClause
  ids?: string[]
  limit?: number
  offset?: number
}

export interface UpdateDocumentParams {
  collectionName: string
  documentId: string
  document?: string
  metadata?: Metadata
  embedding?: number[]
  regenerateEmbedding?: boolean
}

export interface CreateDocumentParams {
  collectionName: string
  id: string
  document?: string
  metadata?: Metadata
  embedding?: number[]
  generateEmbedding?: boolean
}

export interface DeleteDocumentsParams {
  collectionName: string
  ids: string[]
}

export interface CreateDocumentsBatchParams {
  collectionName: string
  documents: Array<{
    id: string
    document?: string
    metadata?: JsonRecord
  }>
  generateEmbeddings?: boolean
}

export interface HNSWConfig {
  space?: 'l2' | 'cosine' | 'ip'
  efConstruction?: number
  efSearch?: number
  maxNeighbors?: number
  numThreads?: number
  batchSize?: number
  syncThreshold?: number
  resizeFactor?: number
}

export interface CreateCollectionParams {
  name: string
  embeddingFunction?: EmbeddingFunctionOverride
  metadata?: JsonRecord
  hnsw?: HNSWConfig
  firstDocument?: {
    id: string
    document?: string
    metadata?: JsonRecord
  }
}

export interface CopyCollectionParams {
  sourceCollectionName: string
  targetName: string
  embeddingFunction?: EmbeddingFunctionOverride
  hnsw?: HNSWConfig
  metadata?: JsonRecord
  regenerateEmbeddings: boolean
}

export interface CopyCollectionResult {
  success: boolean
  collectionInfo?: CollectionInfo
  totalDocuments: number
  copiedDocuments: number
  error?: string
}

export interface CopyProgress {
  phase: 'creating' | 'copying' | 'complete' | 'error' | 'cancelled'
  totalDocuments: number
  processedDocuments: number
  message: string
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string | null
}

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  info?: UpdateInfo
  progress?: {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  }
  error?: string
}

export interface ElectronAPI {
  chromadb: {
    connect: (profileId: string, profile: ConnectionProfile) => Promise<void>
    listCollections: (profileId: string) => Promise<CollectionInfo[]>
    getDocuments: (profileId: string, collectionName: string) => Promise<DocumentRecord[]>
    searchDocuments: (profileId: string, params: SearchDocumentsParams) => Promise<DocumentRecord[]>
    updateDocument: (profileId: string, params: UpdateDocumentParams) => Promise<void>
    createDocument: (profileId: string, params: CreateDocumentParams) => Promise<void>
    deleteDocuments: (profileId: string, params: DeleteDocumentsParams) => Promise<void>
    createDocumentsBatch: (profileId: string, params: CreateDocumentsBatchParams) => Promise<{ createdIds: string[]; errors: string[] }>
    createCollection: (profileId: string, params: CreateCollectionParams) => Promise<CollectionInfo>
    deleteCollection: (profileId: string, collectionName: string) => Promise<void>
    copyCollection: (profileId: string, params: CopyCollectionParams) => Promise<CopyCollectionResult>
    onCopyProgress: (callback: (progress: CopyProgress) => void) => () => void
    cancelCopy: (profileId: string) => Promise<void>
  }
  contextMenu: {
    showCollectionMenu: (collectionName: string, options?: { hasCopiedCollection?: boolean }) => void
    showCollectionPanelMenu: (options?: { hasCopiedCollection?: boolean }) => void
    onAction: (callback: (action: { action: string; collectionName: string }) => void) => () => void
    showDocumentMenu: (documentId: string, options?: { hasCopiedDocuments?: boolean }) => void
    showDocumentsPanelMenu: (options?: { hasCopiedDocuments?: boolean }) => void
    onDocumentAction: (callback: (action: { action: string; documentId?: string }) => void) => () => void
    showProfileMenu: (profileId: string) => void
    onProfileAction: (callback: (action: { action: string; profileId: string }) => void) => () => void
  }
  profiles: {
    getAll: () => Promise<ConnectionProfile[]>
    save: (profile: ConnectionProfile) => Promise<void>
    delete: (id: string) => Promise<void>
    getLastActive: () => Promise<string | null>
    setLastActive: (id: string | null) => Promise<void>
    getEmbeddingOverride: (profileId: string, collectionName: string) => Promise<EmbeddingFunctionOverride | null>
    setEmbeddingOverride: (profileId: string, collectionName: string, override: EmbeddingFunctionOverride) => Promise<void>
    clearEmbeddingOverride: (profileId: string, collectionName: string) => Promise<void>
  }
  window: {
    createConnection: (profile: ConnectionProfile) => Promise<{ windowId: string }>
    getInfo: () => Promise<{ type: string; windowId?: string; profileId?: string }>
    closeCurrent: () => Promise<void>
    getProfile: (profileId: string) => Promise<ConnectionProfile>
  }
  settings: {
    getApiKeys: () => Promise<Record<string, string>>
    setApiKeys: (apiKeys: Record<string, string>) => Promise<void>
    getTheme: () => Promise<'light' | 'dark' | 'system'>
    setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>
    getErrorReportingEnabled: () => Promise<boolean>
    setErrorReportingEnabled: (enabled: boolean) => Promise<void>
    onErrorReportingChange: (callback: (enabled: boolean) => void) => () => void
    onThemeChange: (callback: (theme: string) => void) => () => void
    openWindow: () => Promise<void>
    onSwitchTab: (callback: (tab: string) => void) => () => void
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  updater: {
    checkForUpdates: () => Promise<unknown>
    checkForUpdatesMenu: () => Promise<void>
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
    onStatus: (callback: (status: UpdateStatus) => void) => () => void
  }
  menu: Record<string, (callback: () => void) => () => void>
  onRefresh: (callback: () => void) => () => void
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRecord(value: unknown, field: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`${field} must be an object`)
  return value
}

function parseString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} must be a non-empty string`)
  return value
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${field} must be a string`)
  return value
}

function parseOptionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a finite number`)
  return value
}

function parseOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`${field} must be a boolean`)
  return value
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${field} must be an array of strings`)
  }
  return value
}

function parseNumberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    throw new Error(`${field} must be an array of finite numbers`)
  }
  return value
}

function parseEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(', ')}`)
  }
  return value as T
}

function parseOptionalEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T | undefined {
  if (value === undefined) return undefined
  return parseEnum(value, field, allowed)
}

export function parseProfileId(value: unknown): string {
  return parseString(value, 'profileId')
}

export function parseCollectionName(value: unknown): string {
  return parseString(value, 'collectionName')
}

export function parseEmbeddingOverride(value: unknown, field = 'embeddingOverride'): EmbeddingFunctionOverride {
  const record = parseRecord(value, field)
  const type = parseString(record.type, `${field}.type`)
  if (!EMBEDDING_FUNCTION_TYPES.has(type as EmbeddingFunctionType)) {
    throw new Error(`${field}.type is not a supported embedding function type`)
  }
  return {
    type: type as EmbeddingFunctionType,
    modelName: parseOptionalString(record.modelName, `${field}.modelName`),
    url: parseOptionalString(record.url, `${field}.url`),
    accountId: parseOptionalString(record.accountId, `${field}.accountId`),
  }
}

function parseOptionalEmbeddingOverride(value: unknown, field: string): EmbeddingFunctionOverride | undefined {
  return value === undefined ? undefined : parseEmbeddingOverride(value, field)
}

function parseOptionalHnsw(value: unknown): HNSWConfig | undefined {
  if (value === undefined) return undefined
  const record = parseRecord(value, 'hnsw')
  return {
    space: parseOptionalEnum(record.space, 'hnsw.space', ['l2', 'cosine', 'ip']),
    efConstruction: parseOptionalNumber(record.efConstruction, 'hnsw.efConstruction'),
    efSearch: parseOptionalNumber(record.efSearch, 'hnsw.efSearch'),
    maxNeighbors: parseOptionalNumber(record.maxNeighbors, 'hnsw.maxNeighbors'),
    numThreads: parseOptionalNumber(record.numThreads, 'hnsw.numThreads'),
    batchSize: parseOptionalNumber(record.batchSize, 'hnsw.batchSize'),
    syncThreshold: parseOptionalNumber(record.syncThreshold, 'hnsw.syncThreshold'),
    resizeFactor: parseOptionalNumber(record.resizeFactor, 'hnsw.resizeFactor'),
  }
}

export function parseConnectionProfile(value: unknown): ConnectionProfile {
  const record = parseRecord(value, 'profile')
  return {
    id: parseString(record.id, 'profile.id'),
    name: parseString(record.name, 'profile.name'),
    connectionType: parseOptionalEnum(record.connectionType, 'profile.connectionType', ['cloud', 'self-hosted']),
    url: parseString(record.url, 'profile.url'),
    tenant: parseOptionalString(record.tenant, 'profile.tenant'),
    database: parseOptionalString(record.database, 'profile.database'),
    apiKey: parseOptionalString(record.apiKey, 'profile.apiKey'),
    authType: parseOptionalEnum(record.authType, 'profile.authType', ['none', 'token', 'basic']),
    authToken: parseOptionalString(record.authToken, 'profile.authToken'),
    authTokenHeader: parseOptionalEnum(record.authTokenHeader, 'profile.authTokenHeader', ['authorization', 'x-chroma-token']),
    authCredentials: parseOptionalString(record.authCredentials, 'profile.authCredentials'),
    createdAt: parseOptionalNumber(record.createdAt, 'profile.createdAt') ?? Date.now(),
    lastUsed: parseOptionalNumber(record.lastUsed, 'profile.lastUsed'),
    embeddingOverrides: isRecord(record.embeddingOverrides)
      ? Object.fromEntries(Object.entries(record.embeddingOverrides).map(([key, override]) => [key, parseEmbeddingOverride(override, `profile.embeddingOverrides.${key}`)]))
      : undefined,
  }
}

export function parseSearchDocumentsParams(value: unknown): SearchDocumentsParams {
  const record = parseRecord(value, 'params')
  return {
    collectionName: parseString(record.collectionName, 'params.collectionName'),
    queryText: parseOptionalString(record.queryText, 'params.queryText'),
    nResults: parseOptionalNumber(record.nResults, 'params.nResults'),
    metadataFilter: record.metadataFilter === undefined ? undefined : parseRecord(record.metadataFilter, 'params.metadataFilter') as WhereClause,
    ids: record.ids === undefined ? undefined : parseStringArray(record.ids, 'params.ids'),
    limit: parseOptionalNumber(record.limit, 'params.limit'),
    offset: parseOptionalNumber(record.offset, 'params.offset'),
  }
}

export function parseUpdateDocumentParams(value: unknown): UpdateDocumentParams {
  const record = parseRecord(value, 'params')
  return {
    collectionName: parseString(record.collectionName, 'params.collectionName'),
    documentId: parseString(record.documentId, 'params.documentId'),
    document: parseOptionalString(record.document, 'params.document'),
    metadata: record.metadata === undefined ? undefined : parseRecord(record.metadata, 'params.metadata') as Metadata,
    embedding: record.embedding === undefined ? undefined : parseNumberArray(record.embedding, 'params.embedding'),
    regenerateEmbedding: parseOptionalBoolean(record.regenerateEmbedding, 'params.regenerateEmbedding'),
  }
}

export function parseCreateDocumentParams(value: unknown): CreateDocumentParams {
  const record = parseRecord(value, 'params')
  return {
    collectionName: parseString(record.collectionName, 'params.collectionName'),
    id: parseString(record.id, 'params.id'),
    document: parseOptionalString(record.document, 'params.document'),
    metadata: record.metadata === undefined ? undefined : parseRecord(record.metadata, 'params.metadata') as Metadata,
    embedding: record.embedding === undefined ? undefined : parseNumberArray(record.embedding, 'params.embedding'),
    generateEmbedding: parseOptionalBoolean(record.generateEmbedding, 'params.generateEmbedding'),
  }
}

export function parseDeleteDocumentsParams(value: unknown): DeleteDocumentsParams {
  const record = parseRecord(value, 'params')
  return {
    collectionName: parseString(record.collectionName, 'params.collectionName'),
    ids: parseStringArray(record.ids, 'params.ids'),
  }
}

export function parseCreateDocumentsBatchParams(value: unknown): CreateDocumentsBatchParams {
  const record = parseRecord(value, 'params')
  const documents = record.documents
  if (!Array.isArray(documents)) throw new Error('params.documents must be an array')

  return {
    collectionName: parseString(record.collectionName, 'params.collectionName'),
    documents: documents.map((document, index) => {
      const doc = parseRecord(document, `params.documents.${index}`)
      return {
        id: parseString(doc.id, `params.documents.${index}.id`),
        document: parseOptionalString(doc.document, `params.documents.${index}.document`),
        metadata: doc.metadata === undefined ? undefined : parseRecord(doc.metadata, `params.documents.${index}.metadata`),
      }
    }),
    generateEmbeddings: parseOptionalBoolean(record.generateEmbeddings, 'params.generateEmbeddings'),
  }
}

export function parseCreateCollectionParams(value: unknown): CreateCollectionParams {
  const record = parseRecord(value, 'params')
  const firstDocument = record.firstDocument === undefined ? undefined : parseRecord(record.firstDocument, 'params.firstDocument')
  return {
    name: parseString(record.name, 'params.name'),
    embeddingFunction: parseOptionalEmbeddingOverride(record.embeddingFunction, 'params.embeddingFunction'),
    metadata: record.metadata === undefined ? undefined : parseRecord(record.metadata, 'params.metadata'),
    hnsw: parseOptionalHnsw(record.hnsw),
    firstDocument: firstDocument
      ? {
          id: parseString(firstDocument.id, 'params.firstDocument.id'),
          document: parseOptionalString(firstDocument.document, 'params.firstDocument.document'),
          metadata: firstDocument.metadata === undefined ? undefined : parseRecord(firstDocument.metadata, 'params.firstDocument.metadata'),
        }
      : undefined,
  }
}

export function parseCopyCollectionParams(value: unknown): CopyCollectionParams {
  const record = parseRecord(value, 'params')
  const regenerateEmbeddings = parseOptionalBoolean(record.regenerateEmbeddings, 'params.regenerateEmbeddings')
  return {
    sourceCollectionName: parseString(record.sourceCollectionName, 'params.sourceCollectionName'),
    targetName: parseString(record.targetName, 'params.targetName'),
    embeddingFunction: parseOptionalEmbeddingOverride(record.embeddingFunction, 'params.embeddingFunction'),
    hnsw: parseOptionalHnsw(record.hnsw),
    metadata: record.metadata === undefined ? undefined : parseRecord(record.metadata, 'params.metadata'),
    regenerateEmbeddings: regenerateEmbeddings ?? false,
  }
}

export function parseApiKeys(value: unknown): Record<string, string> {
  const record = parseRecord(value, 'apiKeys')
  for (const [key, val] of Object.entries(record)) {
    if (typeof val !== 'string') throw new Error(`apiKeys.${key} must be a string`)
  }
  return record as Record<string, string>
}

export function parseTheme(value: unknown): 'light' | 'dark' | 'system' {
  return parseEnum(value, 'theme', ['light', 'dark', 'system'])
}

export function parseErrorReportingEnabled(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('errorReportingEnabled must be a boolean')
  return value
}

export function validateExternalUrl(value: unknown): string {
  const url = parseString(value, 'url')
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('url must use http: or https:')
  }
  return parsed.toString()
}
