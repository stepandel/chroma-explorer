import { contextBridge, ipcRenderer } from 'electron'
import {
  ConnectionProfile,
  CollectionInfo,
  DocumentRecord,
  SearchDocumentsParams,
  UpdateDocumentParams,
  CreateDocumentParams,
  DeleteDocumentsParams,
  CreateDocumentsBatchParams,
  CreateCollectionParams,
  CopyCollectionParams,
  CopyCollectionResult,
  CopyProgress,
  EmbeddingFunctionOverride,
} from './types'

console.log('Preload script is running!')

contextBridge.exposeInMainWorld('electronAPI', {
  chromadb: {
    connect: async (profileId: string, profile: ConnectionProfile): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:connect', profileId, profile)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    listCollections: async (profileId: string): Promise<CollectionInfo[]> => {
      const result = await ipcRenderer.invoke('chromadb:listCollections', profileId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    getDocuments: async (profileId: string, collectionName: string): Promise<DocumentRecord[]> => {
      const result = await ipcRenderer.invoke('chromadb:getDocuments', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    searchDocuments: async (profileId: string, params: SearchDocumentsParams): Promise<DocumentRecord[]> => {
      const result = await ipcRenderer.invoke('chromadb:searchDocuments', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    updateDocument: async (profileId: string, params: UpdateDocumentParams): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:updateDocument', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    createDocument: async (profileId: string, params: CreateDocumentParams): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:createDocument', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    deleteDocuments: async (profileId: string, params: DeleteDocumentsParams): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:deleteDocuments', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    createDocumentsBatch: async (profileId: string, params: CreateDocumentsBatchParams): Promise<{ createdIds: string[]; errors: string[] }> => {
      const result = await ipcRenderer.invoke('chromadb:createDocumentsBatch', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    createCollection: async (profileId: string, params: CreateCollectionParams): Promise<CollectionInfo> => {
      const result = await ipcRenderer.invoke('chromadb:createCollection', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    deleteCollection: async (profileId: string, collectionName: string): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:deleteCollection', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    copyCollection: async (profileId: string, params: CopyCollectionParams): Promise<CopyCollectionResult> => {
      const result = await ipcRenderer.invoke('chromadb:copyCollection', profileId, params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onCopyProgress: (callback: (progress: CopyProgress) => void): (() => void) => {
      const handler = (_event: any, progress: CopyProgress) => callback(progress)
      ipcRenderer.on('chromadb:copyProgress', handler)
      return () => ipcRenderer.removeListener('chromadb:copyProgress', handler)
    },
    cancelCopy: async (profileId: string): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:cancelCopy', profileId)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
  },
  contextMenu: {
    showCollectionMenu: (collectionName: string, options?: { hasCopiedCollection?: boolean }): void => {
      ipcRenderer.send('context-menu:show-collection', collectionName, options)
    },
    showCollectionPanelMenu: (options?: { hasCopiedCollection?: boolean }): void => {
      ipcRenderer.send('context-menu:show-collection-panel', options)
    },
    onAction: (callback: (action: { action: string; collectionName: string }) => void): (() => void) => {
      const handler = (_event: any, data: { action: string; collectionName: string }) => callback(data)
      ipcRenderer.on('context-menu:action', handler)
      return () => ipcRenderer.removeListener('context-menu:action', handler)
    },
    showDocumentMenu: (documentId: string, options?: { hasCopiedDocuments?: boolean }): void => {
      ipcRenderer.send('context-menu:show-document', documentId, options)
    },
    showDocumentsPanelMenu: (options?: { hasCopiedDocuments?: boolean }): void => {
      ipcRenderer.send('context-menu:show-documents-panel', options)
    },
    onDocumentAction: (callback: (action: { action: string; documentId?: string }) => void): (() => void) => {
      const handler = (_event: any, data: { action: string; documentId?: string }) => callback(data)
      ipcRenderer.on('context-menu:document-action', handler)
      return () => ipcRenderer.removeListener('context-menu:document-action', handler)
    },
    showProfileMenu: (profileId: string): void => {
      ipcRenderer.send('context-menu:show-profile', profileId)
    },
    onProfileAction: (callback: (action: { action: string; profileId: string }) => void): (() => void) => {
      const handler = (_event: any, data: { action: string; profileId: string }) => callback(data)
      ipcRenderer.on('context-menu:profile-action', handler)
      return () => ipcRenderer.removeListener('context-menu:profile-action', handler)
    },
  },
  profiles: {
    getAll: async (): Promise<ConnectionProfile[]> => {
      const result = await ipcRenderer.invoke('profiles:getAll')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    save: async (profile: ConnectionProfile): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:save', profile)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    delete: async (id: string): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:delete', id)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    getLastActive: async (): Promise<string | null> => {
      const result = await ipcRenderer.invoke('profiles:getLastActive')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    setLastActive: async (id: string | null): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:setLastActive', id)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    getEmbeddingOverride: async (profileId: string, collectionName: string): Promise<EmbeddingFunctionOverride | null> => {
      const result = await ipcRenderer.invoke('profiles:getEmbeddingOverride', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    setEmbeddingOverride: async (profileId: string, collectionName: string, override: EmbeddingFunctionOverride): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:setEmbeddingOverride', profileId, collectionName, override)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    clearEmbeddingOverride: async (profileId: string, collectionName: string): Promise<void> => {
      const result = await ipcRenderer.invoke('profiles:clearEmbeddingOverride', profileId, collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
  },
  window: {
    createConnection: async (profile: ConnectionProfile): Promise<{ windowId: string }> => {
      const result = await ipcRenderer.invoke('window:create-connection', profile)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    getInfo: async (): Promise<{ type: string; windowId?: string; profileId?: string }> => {
      const result = await ipcRenderer.invoke('window:get-info')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    closeCurrent: async (): Promise<void> => {
      const result = await ipcRenderer.invoke('window:close-current')
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    getProfile: async (profileId: string): Promise<ConnectionProfile> => {
      const result = await ipcRenderer.invoke('window:get-profile', profileId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  },
  settings: {
    getApiKeys: async (): Promise<Record<string, string>> => {
      const result = await ipcRenderer.invoke('settings:getApiKeys')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    setApiKeys: async (apiKeys: Record<string, string>): Promise<void> => {
      const result = await ipcRenderer.invoke('settings:setApiKeys', apiKeys)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    openWindow: async (): Promise<void> => {
      const result = await ipcRenderer.invoke('settings:openWindow')
      if (!result.success) {
        throw new Error(result.error)
      }
    },
  },
  shell: {
    openExternal: async (url: string): Promise<void> => {
      const result = await ipcRenderer.invoke('shell:openExternal', url)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
  },
  updater: {
    checkForUpdates: async (): Promise<any> => {
      const result = await ipcRenderer.invoke('updater:check')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    downloadUpdate: async (): Promise<void> => {
      const result = await ipcRenderer.invoke('updater:download')
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    installUpdate: async (): Promise<void> => {
      const result = await ipcRenderer.invoke('updater:install')
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    onStatus: (callback: (status: any) => void): (() => void) => {
      const handler = (_event: any, status: any) => callback(status)
      ipcRenderer.on('updater:status', handler)
      return () => ipcRenderer.removeListener('updater:status', handler)
    },
  },
  onRefresh: (callback: () => void): (() => void) => {
    const handler = () => {
      console.log('Preload received app:refresh event')
      callback()
    }
    ipcRenderer.on('app:refresh', handler)
    return () => ipcRenderer.removeListener('app:refresh', handler)
  },
})

// Auto-dispatch window event when app:refresh IPC is received
ipcRenderer.on('app:refresh', () => {
  console.log('Preload: app:refresh received, dispatching chroma:refresh window event')
  window.dispatchEvent(new CustomEvent('chroma:refresh'))
})

console.log('Preload script finished, electronAPI exposed:', typeof window !== 'undefined' ? !!(window as any).electronAPI : 'window not defined')
