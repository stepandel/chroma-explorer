import { useState } from 'react'
import { useCollection } from '../../context/CollectionContext'
import { usePanel } from '../../context/PanelContext'
import { CollectionPanel } from '../collections/CollectionPanel'
import DocumentsView from '../documents/DocumentsView'
import DocumentDetailPanel from '../documents/DocumentDetailPanel'
import { Panel, Group, Separator } from 'react-resizable-panels'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

export function MainContent() {
  const { activeCollection } = useCollection()
  const {
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
    selectedDocumentId,
    selectDocument
  } = usePanel()
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null)

  return (
    <main className="flex-1 overflow-auto bg-background">
      <Group orientation="horizontal" className="h-full">
        {/* Left Panel: Sidebar - Collapsible */}
        <Panel
          key={`left-panel-${leftPanelOpen}`}
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
          <CollectionPanel />
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
              onDocumentSelect={selectDocument}
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
          rightPanelOpen && selectedDocument
            ? 'bg-border hover:bg-primary active:bg-primary cursor-col-resize'
            : 'bg-transparent pointer-events-none'
        }`} />

        <Panel
          key={`right-panel-${rightPanelOpen}`}
          defaultSize={rightPanelOpen && selectedDocument ? "30" : "0"}
          minSize="20"
          maxSize="50"
          collapsible={true}
          collapsedSize={0}
          id="document-detail"
          onResize={(size) => {
            // When panel is collapsed (size is 0), close the drawer
            if (size.asPercentage === 0 && rightPanelOpen) {
              setRightPanelOpen(false)
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
