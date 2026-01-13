import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CollectionClipboard {
  type: 'collection'
  collection: CollectionInfo
  sourceProfileId: string
}

interface DocumentsClipboard {
  type: 'documents'
  documents: Array<{
    id: string
    document: string | null
    metadata: Record<string, unknown> | null
  }>
  sourceCollectionName: string
  sourceProfileId: string
}

type ClipboardItem = CollectionClipboard | DocumentsClipboard

interface ClipboardContextValue {
  clipboard: ClipboardItem | null

  // Collection methods
  copyCollection: (collection: CollectionInfo, profileId: string) => void
  hasCopiedCollection: boolean

  // Document methods
  copyDocuments: (documents: DocumentRecord[], collectionName: string, profileId: string) => void
  hasCopiedDocuments: boolean

  // Shared
  clearClipboard: () => void
}

const ClipboardContext = createContext<ClipboardContextValue | null>(null)

interface ClipboardProviderProps {
  children: ReactNode
}

export function ClipboardProvider({ children }: ClipboardProviderProps) {
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null)

  const copyCollection = useCallback((collection: CollectionInfo, profileId: string) => {
    setClipboard({ type: 'collection', collection, sourceProfileId: profileId })
  }, [])

  const copyDocuments = useCallback((documents: DocumentRecord[], collectionName: string, profileId: string) => {
    // Copy documents without embeddings (they'll be regenerated on paste)
    const docsToClipboard = documents.map(doc => ({
      id: doc.id,
      document: doc.document,
      metadata: doc.metadata,
    }))
    setClipboard({
      type: 'documents',
      documents: docsToClipboard,
      sourceCollectionName: collectionName,
      sourceProfileId: profileId,
    })
  }, [])

  const clearClipboard = useCallback(() => {
    setClipboard(null)
  }, [])

  const value: ClipboardContextValue = {
    clipboard,
    copyCollection,
    hasCopiedCollection: clipboard?.type === 'collection',
    copyDocuments,
    hasCopiedDocuments: clipboard?.type === 'documents',
    clearClipboard,
  }

  return <ClipboardContext.Provider value={value}>{children}</ClipboardContext.Provider>
}

export function useClipboard() {
  const context = useContext(ClipboardContext)
  if (!context) {
    throw new Error('useClipboard must be used within a ClipboardProvider')
  }
  return context
}
