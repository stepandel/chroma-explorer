import { useState } from 'react'
import { useCollection } from '../../context/CollectionContext'
import { useDraftCollection } from '../../context/DraftCollectionContext'
import { usePanel } from '../../context/PanelContext'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { CollectionPanel } from '../collections/CollectionPanel'
import { CollectionConfigView } from '../collections/CollectionConfigView'
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
  const { draftCollection } = useDraftCollection()
  const { currentProfile } = useChromaDB()
  const {
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
  } = usePanel()
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null)
  const [isSelectedDraft, setIsSelectedDraft] = useState(false)
  const [draftUpdateHandler, setDraftUpdateHandler] = useState<((updates: { document?: string; metadata?: Record<string, unknown> }) => void) | null>(null)

  const handleSelectedDocumentChange = (document: DocumentRecord | null, isDraft: boolean) => {
    setSelectedDocument(document)
    setIsSelectedDraft(isDraft)
  }

  const handleExposeDraftHandler = (handler: ((updates: { document?: string; metadata?: Record<string, unknown> }) => void) | null) => {
    setDraftUpdateHandler(() => handler)
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <Group orientation="horizontal" className="h-full">
        {/* Left Panel: Sidebar - Collapsible */}
        <Panel
          key={`left-panel-${leftPanelOpen}`}
          defaultSize={leftPanelOpen ? "18" : "0"}
          minSize="15"
          maxSize="30"
          collapsible={true}
          collapsedSize={0}
          id="sidebar"
          onResize={(size) => {
            // Sync state with actual panel size
            const isCollapsed = size.asPercentage === 0
            if (isCollapsed && leftPanelOpen) {
              setLeftPanelOpen(false)
            } else if (!isCollapsed && !leftPanelOpen) {
              setLeftPanelOpen(true)
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

        {/* Middle Panel: DocumentsView, CollectionConfigView, or Empty State - Flexible */}
        <Panel minSize="40" id="main-content">
          {draftCollection ? (
            <CollectionConfigView />
          ) : activeCollection ? (
            <DocumentsView
              collectionName={activeCollection}
              selectedDocumentIds={selectedDocumentIds}
              primarySelectedDocumentId={primarySelectedDocumentId}
              selectionAnchor={selectionAnchor}
              onSingleSelect={selectDocument}
              onToggleSelect={toggleDocumentSelection}
              onRangeSelect={selectDocumentRange}
              onAddToSelection={addToSelection}
              onClearSelection={clearSelection}
              onSetSelectionAnchor={setSelectionAnchor}
              onSelectedDocumentChange={handleSelectedDocumentChange}
              onExposeDraftHandler={handleExposeDraftHandler}
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
          rightPanelOpen
            ? 'bg-border hover:bg-primary active:bg-primary cursor-col-resize'
            : 'bg-transparent pointer-events-none'
        }`} />

        <Panel
          key={`right-panel-${rightPanelOpen}`}
          defaultSize={rightPanelOpen ? "30" : "0"}
          minSize="20"
          maxSize="50"
          collapsible={true}
          collapsedSize={0}
          id="document-detail"
          onResize={(size) => {
            // Sync state with actual panel size
            const isCollapsed = size.asPercentage === 0
            if (isCollapsed && rightPanelOpen) {
              setRightPanelOpen(false)
            } else if (!isCollapsed && !rightPanelOpen) {
              setRightPanelOpen(true)
            }
          }}
        >
          {selectedDocument && activeCollection && currentProfile ? (
            <DocumentDetailPanel
              document={selectedDocument}
              collectionName={activeCollection}
              profileId={currentProfile.id}
              isDraft={isSelectedDraft}
              onDraftChange={isSelectedDraft ? draftUpdateHandler ?? undefined : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No document selected</p>
              </div>
            </div>
          )}
        </Panel>
      </Group>
    </main>
  )
}
