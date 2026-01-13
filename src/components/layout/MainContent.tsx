import { useState } from 'react'
import { useCollection } from '../../context/CollectionContext'
import { useDraftCollection } from '../../context/DraftCollectionContext'
import { usePanel } from '../../context/PanelContext'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { CollectionPanel } from '../collections/CollectionPanel'
import { CollectionConfigView } from '../collections/CollectionConfigView'
import DocumentsView from '../documents/DocumentsView'
import DocumentDetailPanel from '../documents/DocumentDetailPanel'

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
    rightPanelOpen,
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
  const [isFirstDocument, setIsFirstDocument] = useState(false)
  const [draftUpdateHandler, setDraftUpdateHandler] = useState<((updates: { id?: string; document?: string; metadata?: Record<string, unknown> }) => void) | null>(null)

  const handleSelectedDocumentChange = (document: DocumentRecord | null, isDraft: boolean) => {
    setSelectedDocument(document)
    setIsSelectedDraft(isDraft)
  }

  const handleExposeDraftHandler = (handler: ((updates: { id?: string; document?: string; metadata?: Record<string, unknown> }) => void) | null) => {
    setDraftUpdateHandler(() => handler)
  }

  const handleIsFirstDocumentChange = (isFirst: boolean) => {
    setIsFirstDocument(isFirst)
  }

  // Calculate main content padding based on open panels (content extends behind panels)
  const leftPadding = leftPanelOpen ? 'pl-[220px]' : 'pl-0'
  const rightPadding = rightPanelOpen ? 'pr-[320px]' : 'pr-0'

  return (
    <main className="flex-1 relative overflow-hidden bg-content">
      {/* Main content area - extends behind panels for blur effect */}
      <div className={`h-full transition-all duration-200 ${leftPadding} ${rightPadding}`}>
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
            onIsFirstDocumentChange={handleIsFirstDocumentChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">No collection selected</p>
              <p className="text-sm">Select a collection from the sidebar to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Left Panel: Collection Sidebar - Floating glass overlay */}
      <aside
        className={`absolute top-0 left-0 h-full w-[220px] transition-transform duration-200 ${
          leftPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ boxShadow: leftPanelOpen ? 'var(--shadow-panel)' : 'none' }}
      >
        <CollectionPanel />
      </aside>

      {/* Right Panel: Document Detail - Floating glass overlay */}
      <aside
        className={`absolute top-0 right-0 h-full w-[320px] transition-transform duration-200 ${
          rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedDocument && activeCollection && currentProfile ? (
          <DocumentDetailPanel
            document={selectedDocument}
            collectionName={activeCollection}
            profileId={currentProfile.id}
            isDraft={isSelectedDraft}
            isFirstDocument={isFirstDocument}
            onDraftChange={isSelectedDraft ? draftUpdateHandler ?? undefined : undefined}
          />
        ) : (
          <div
            className="flex items-center justify-center h-full border-l border-glass-border"
            style={{
              background: 'var(--panel-detail)',
              backdropFilter: 'blur(24px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
              boxShadow: 'var(--shadow-panel)',
            }}
          >
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No document selected</p>
            </div>
          </div>
        )}
      </aside>
    </main>
  )
}
