import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface PanelContextType {
  // Left panel (CollectionPanel) state
  leftPanelOpen: boolean
  setLeftPanelOpen: (open: boolean) => void

  // Right panel (DocumentDetailPanel) state
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void

  // Multi-select document state
  selectedDocumentIds: Set<string>
  primarySelectedDocumentId: string | null // Last selected, shown in detail panel
  selectionAnchor: string | null // For shift+click range selection

  // Selection actions
  selectDocument: (id: string) => void // Single select (clears others)
  toggleDocumentSelection: (id: string) => void // ⌘+click toggle
  selectDocumentRange: (ids: string[], newAnchor?: string) => void // Range select
  addToSelection: (ids: string[]) => void // Add range to existing
  clearSelection: () => void
  setSelectionAnchor: (id: string | null) => void
}

const PanelContext = createContext<PanelContextType | undefined>(undefined)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [primarySelectedDocumentId, setPrimarySelectedDocumentId] = useState<string | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null)

  // Single select - clears all others, sets this as primary and anchor
  const selectDocument = useCallback((id: string) => {
    setSelectedDocumentIds(new Set([id]))
    setPrimarySelectedDocumentId(id)
    setSelectionAnchor(id)
    setRightPanelOpen(true)
  }, [])

  // Toggle selection (⌘+click)
  const toggleDocumentSelection = useCallback((id: string) => {
    setSelectedDocumentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Update primary if we removed it
        if (id === primarySelectedDocumentId) {
          const remaining = Array.from(next)
          setPrimarySelectedDocumentId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
        }
      } else {
        next.add(id)
        setPrimarySelectedDocumentId(id)
      }
      // Open/close panel based on selection
      setRightPanelOpen(next.size > 0)
      return next
    })
    setSelectionAnchor(id)
  }, [primarySelectedDocumentId])

  // Range select (shift+click) - replaces selection with range
  const selectDocumentRange = useCallback((ids: string[], newAnchor?: string) => {
    setSelectedDocumentIds(new Set(ids))
    setPrimarySelectedDocumentId(ids.length > 0 ? ids[ids.length - 1] : null)
    if (newAnchor !== undefined) {
      setSelectionAnchor(newAnchor)
    }
    setRightPanelOpen(ids.length > 0)
  }, [])

  // Add to selection (⌘+shift+click) - adds range to existing
  const addToSelection = useCallback((ids: string[]) => {
    setSelectedDocumentIds(prev => {
      const next = new Set([...prev, ...ids])
      return next
    })
    if (ids.length > 0) {
      setPrimarySelectedDocumentId(ids[ids.length - 1])
      setRightPanelOpen(true)
    }
  }, [])

  // Clear all selection
  const clearSelection = useCallback(() => {
    setSelectedDocumentIds(new Set())
    setPrimarySelectedDocumentId(null)
    setSelectionAnchor(null)
    setRightPanelOpen(false)
  }, [])

  return (
    <PanelContext.Provider
      value={{
        leftPanelOpen,
        setLeftPanelOpen,
        rightPanelOpen,
        setRightPanelOpen,
        selectedDocumentIds,
        primarySelectedDocumentId,
        selectionAnchor,
        selectDocument,
        toggleDocumentSelection,
        selectDocumentRange,
        addToSelection,
        clearSelection,
        setSelectionAnchor,
      }}
    >
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  const context = useContext(PanelContext)
  if (context === undefined) {
    throw new Error('usePanel must be used within a PanelProvider')
  }
  return context
}
