import { useState } from 'react'
import { useCollection } from '../../context/CollectionContext'
import { Sidebar } from './Sidebar'
import DocumentsView from '../DocumentsView'
import DocumentDetailPanel from '../DocumentDetailPanel'
import { Panel, Group, Separator } from 'react-resizable-panels'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface MainContentProps {
  leftPanelOpen: boolean
  setLeftPanelOpen: (open: boolean) => void
  selectedDocumentId: string | null
  onDocumentSelect: (id: string) => void
  rightDrawerOpen: boolean
  onCloseRightDrawer: () => void
}

export function MainContent({
  leftPanelOpen,
  setLeftPanelOpen,
  selectedDocumentId,
  onDocumentSelect,
  rightDrawerOpen,
  onCloseRightDrawer,
}: MainContentProps) {
  const { activeCollection } = useCollection()
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null)

  return (
    <main className="flex-1 overflow-auto bg-background">
      <Group orientation="horizontal" className="h-full">
        {/* Left Panel: Sidebar - Collapsible */}
        <Panel
          defaultSize={leftPanelOpen ? "15" : "0"}
          minSize="12"
          maxSize="25"
          collapsible={true}
          collapsedSize={0}
          id="sidebar"
          onResize={(size) => {
            // When panel is collapsed (size is 0), update state
            if (size.asPercentage === 0 && leftPanelOpen) {
              setLeftPanelOpen(false)
            }
          }}
        >
          <Sidebar />
        </Panel>

        <Separator className={`w-px transition-colors duration-150 ${
          leftPanelOpen
            ? 'bg-sidebar-border hover:bg-primary active:bg-primary cursor-col-resize'
            : 'bg-transparent pointer-events-none'
        }`} />

        {/* Middle Panel: DocumentsView or Empty State - Flexible */}
        <Panel minSize="40" id="main-content">
          {activeCollection ? (
            <DocumentsView
              collectionName={activeCollection}
              selectedDocumentId={selectedDocumentId}
              onDocumentSelect={onDocumentSelect}
              onSelectedDocumentChange={setSelectedDocument}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">No collection selected</p>
                <p className="text-sm">Select a collection from the sidebar to get started</p>
              </div>
            </div>
          )}
        </Panel>

        {/* Right Panel: Document Detail Drawer - Always present, collapsed when not in use */}
        <Separator className={`w-px transition-colors duration-150 ${
          rightDrawerOpen && selectedDocument
            ? 'bg-border hover:bg-primary active:bg-primary cursor-col-resize'
            : 'bg-transparent pointer-events-none'
        }`} />

        <Panel
          defaultSize={rightDrawerOpen && selectedDocument ? "30" : "0"}
          minSize="20"
          maxSize="50"
          collapsible={true}
          collapsedSize={0}
          id="document-detail"
          onResize={(size) => {
            // When panel is collapsed (size is 0), close the drawer
            if (size.asPercentage === 0 && rightDrawerOpen) {
              onCloseRightDrawer()
            }
          }}
        >
          {selectedDocument && (
            <DocumentDetailPanel document={selectedDocument} />
          )}
        </Panel>
      </Group>
    </main>
  )
}
