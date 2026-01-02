import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script is running!')

interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
}

contextBridge.exposeInMainWorld('electronAPI', {
  chromadb: {
    connect: async (host: string, port: number): Promise<void> => {
      const result = await ipcRenderer.invoke('chromadb:connect', host, port)
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
  },
})

console.log('Preload script finished, electronAPI exposed:', typeof window !== 'undefined' ? !!(window as any).electronAPI : 'window not defined')
