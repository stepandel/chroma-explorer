import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'

export function AppLayout() {
  // Drawer state management
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true) // Collections sidebar (for future)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false) // Document details
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

  const handleToggleRightDrawer = () => {
    setRightDrawerOpen(prev => !prev)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          rightDrawerOpen={rightDrawerOpen}
          onToggleRightDrawer={handleToggleRightDrawer}
          hasSelectedDocument={selectedDocumentId !== null}
        />

        {/* Content Area */}
        <MainContent
          selectedDocumentId={selectedDocumentId}
          onDocumentSelect={handleDocumentSelect}
          rightDrawerOpen={rightDrawerOpen}
          onCloseRightDrawer={handleCloseRightDrawer}
        />
      </div>
    </div>
  )
}
