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

  return (
    <main className="flex-1 overflow-auto bg-background">
      <Group orientation="horizontal" className="h-full">
        {/* Left Panel: Sidebar */}
        <Panel defaultSize="15" minSize="12" maxSize="25">
          <Sidebar />
        </Panel>

        <Separator className="w-px bg-sidebar-border" />

        {/* Middle Panel: DocumentsView or Empty State */}
        <Panel defaultSize={rightDrawerOpen && selectedDocument ? "55" : "85"} minSize="40">
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

        {/* Right Panel: Document Detail Drawer (conditional) */}
        {rightDrawerOpen && selectedDocument && (
          <>
            <Separator className="w-px bg-border hover:bg-primary active:bg-primary transition-colors duration-150 cursor-col-resize" />

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
