import { contextBridge, ipcRenderer } from 'electron'
import { ConnectionProfile } from './types.js'

console.log('Preload script is running!')

interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
}

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

contextBridge.exposeInMainWorld('electronAPI', {
  chromadb: {
    connect: async (profile: ConnectionProfile): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:connect', profile)
      if (!result.success) {
        throw new Error(result.error)
      }
    },
    listCollections: async (): Promise<CollectionInfo[]> => {
      const result = await ipcRenderer.invoke('chromadb:listCollections')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    getDocuments: async (collectionName: string): Promise<DocumentRecord[]> => {
      const result = await ipcRenderer.invoke('chromadb:getDocuments', collectionName)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
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
  },
})

console.log('Preload script finished, electronAPI exposed:', typeof window !== 'undefined' ? !!(window as any).electronAPI : 'window not defined')
