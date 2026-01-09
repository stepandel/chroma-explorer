import { createContext, useContext, useState, ReactNode } from 'react'

interface PanelContextType {
  // Left panel (CollectionPanel) state
  leftPanelOpen: boolean
  toggleLeftPanel: () => void
  setLeftPanelOpen: (open: boolean) => void

  // Right panel (DocumentDetailPanel) state
  rightPanelOpen: boolean
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void

  // Selected document state
  selectedDocumentId: string | null
  setSelectedDocumentId: (id: string | null) => void
  selectDocument: (id: string) => void
  clearSelectedDocument: () => void
}

const PanelContext = createContext<PanelContextType | undefined>(undefined)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  const toggleLeftPanel = () => {
    setLeftPanelOpen(prev => !prev)
  }

  const toggleRightPanel = () => {
    setRightPanelOpen(prev => !prev)
  }

  const selectDocument = (id: string) => {
    setSelectedDocumentId(id)
    setRightPanelOpen(true)
  }

  const clearSelectedDocument = () => {
    setSelectedDocumentId(null)
    setRightPanelOpen(false)
  }

  return (
    <PanelContext.Provider
      value={{
        leftPanelOpen,
        toggleLeftPanel,
        setLeftPanelOpen,
        rightPanelOpen,
        toggleRightPanel,
        setRightPanelOpen,
        selectedDocumentId,
        setSelectedDocumentId,
        selectDocument,
        clearSelectedDocument,
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
