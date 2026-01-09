import { useState } from 'react'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'

export function AppLayout() {
  // Panel state management
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  // Handlers
  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setRightDrawerOpen(true)
  }

  const handleCloseRightDrawer = () => {
    setRightDrawerOpen(false)
    // Note: Don't clear selectedDocumentId - allows reopening with same document
  }

  const handleToggleLeftPanel = () => {
    setLeftPanelOpen(prev => !prev)
  }

  const handleToggleRightDrawer = () => {
    setRightDrawerOpen(prev => !prev)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <TopBar
        leftPanelOpen={leftPanelOpen}
        onToggleLeftPanel={handleToggleLeftPanel}
        rightDrawerOpen={rightDrawerOpen}
        onToggleRightDrawer={handleToggleRightDrawer}
        hasSelectedDocument={selectedDocumentId !== null}
      />

      {/* Main Content with all panels (Sidebar, Documents, Detail) */}
      <MainContent
        leftPanelOpen={leftPanelOpen}
        setLeftPanelOpen={setLeftPanelOpen}
        selectedDocumentId={selectedDocumentId}
        onDocumentSelect={handleDocumentSelect}
        rightDrawerOpen={rightDrawerOpen}
        onCloseRightDrawer={handleCloseRightDrawer}
      />
    </div>
  )
}
