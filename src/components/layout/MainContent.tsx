import { useState } from 'react'
import { useCollection } from '../../context/CollectionContext'
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
  selectedDocumentId: string | null
  onDocumentSelect: (id: string) => void
  rightDrawerOpen: boolean
  onCloseRightDrawer: () => void
}

export function MainContent({
  selectedDocumentId,
  onDocumentSelect,
  rightDrawerOpen,
  onCloseRightDrawer,
}: MainContentProps) {
  const { activeCollection } = useCollection()
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null)

  if (!activeCollection) {
    return (
      <main className="flex-1 overflow-auto flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No collection selected</p>
          <p className="text-sm">Select a collection from the sidebar to get started</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <Group orientation="horizontal" className="h-full">
        {/* Left Panel: DocumentsView */}
        <Panel defaultSize={rightDrawerOpen && selectedDocument ? "70" : "100"} minSize="40">
          <DocumentsView
            collectionName={activeCollection}
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={onDocumentSelect}
            onSelectedDocumentChange={setSelectedDocument}
          />
        </Panel>

        {/* Resize Handle and Right Panel - only when drawer is open */}
        {rightDrawerOpen && selectedDocument && (
          <>
            <Separator className="w-px bg-border hover:bg-primary active:bg-primary transition-colors duration-150 cursor-col-resize" />

            {/* Right Panel: Document Detail Drawer */}
            <Panel
              defaultSize="30"
              minSize="20"
              maxSize="50"
              collapsible={true}
              onResize={(size) => {
                // When panel is collapsed (size is 0), close the drawer
                if (size.asPercentage === 0) {
                  onCloseRightDrawer()
                }
              }}
            >
              <DocumentDetailPanel document={selectedDocument} />
            </Panel>
          </>
        )}
      </Group>
    </main>
  )
}
