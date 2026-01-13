import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useCollection } from '../../context/CollectionContext'
import { useDraftCollection } from '../../context/DraftCollectionContext'
import { useClipboard } from '../../context/ClipboardContext'
import { useDeleteCollectionMutation } from '../../hooks/useChromaQueries'
import { Button } from '../ui/button'
import { DeleteCollectionDialog } from './DeleteCollectionDialog'

const inputClassName = "w-full h-6 text-[11px] py-0 px-1.5 pr-5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

export function CollectionPanel() {
  const { collections, collectionsLoading, collectionsError, refreshCollections, currentProfile } = useChromaDB()
  const { activeCollection, setActiveCollection } = useCollection()
  const { draftCollection, startCreation, startCopyFromCollection, updateDraft, cancelCreation } = useDraftCollection()
  const { clipboard, copyCollection, hasCopiedCollection } = useClipboard()
  const [searchTerm, setSearchTerm] = useState('')

  // Deletion state
  const [markedForDeletion, setMarkedForDeletion] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteMutation = useDeleteCollectionMutation(currentProfile?.id || '')

  // Get the collection info for the one marked for deletion
  const markedCollection = markedForDeletion
    ? collections.find(c => c.name === markedForDeletion)
    : null

  const handleCollectionClick = (collectionName: string) => {
    // Cancel creation mode if selecting existing collection
    if (draftCollection) {
      cancelCreation()
    }
    // Clear deletion mark if clicking on a different collection
    if (markedForDeletion && markedForDeletion !== collectionName) {
      setMarkedForDeletion(null)
    }
    setActiveCollection(collectionName)
  }

  const handleCreateClick = () => {
    setMarkedForDeletion(null) // Clear any deletion mark
    startCreation()
  }

  // Toggle deletion mark for active collection
  const handleToggleDeletion = useCallback(() => {
    if (!activeCollection || draftCollection) return

    if (markedForDeletion === activeCollection) {
      // Unmark
      setMarkedForDeletion(null)
    } else {
      // Mark for deletion
      setMarkedForDeletion(activeCollection)
    }
  }, [activeCollection, markedForDeletion, draftCollection])

  // Commit deletion
  const handleCommitDeletion = useCallback(async () => {
    if (!markedForDeletion || !markedCollection) return

    // If collection has documents, show confirmation dialog
    if (markedCollection.count > 0) {
      setShowDeleteDialog(true)
      return
    }

    // Empty collection - delete directly
    try {
      await deleteMutation.mutateAsync(markedForDeletion)
      // Clear selection if we deleted the active collection
      if (activeCollection === markedForDeletion) {
        setActiveCollection(null)
      }
      setMarkedForDeletion(null)
    } catch (error) {
      console.error('Failed to delete collection:', error)
    }
  }, [markedForDeletion, markedCollection, deleteMutation, activeCollection, setActiveCollection])

  // Handle confirmed deletion (from dialog)
  const handleConfirmedDeletion = useCallback(async () => {
    if (!markedForDeletion) return

    try {
      await deleteMutation.mutateAsync(markedForDeletion)
      // Clear selection if we deleted the active collection
      if (activeCollection === markedForDeletion) {
        setActiveCollection(null)
      }
      setMarkedForDeletion(null)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete collection:', error)
    }
  }, [markedForDeletion, deleteMutation, activeCollection, setActiveCollection])

  // Copy collection to clipboard
  const handleCopyCollection = useCallback((collectionName: string) => {
    if (!currentProfile) return
    const collection = collections.find(c => c.name === collectionName)
    if (collection) {
      copyCollection(collection, currentProfile.id)
    }
  }, [collections, currentProfile, copyCollection])

  // Paste collection (start copy mode)
  const handlePasteCollection = useCallback(() => {
    if (!clipboard || draftCollection) return
    startCopyFromCollection(clipboard.collection)
  }, [clipboard, draftCollection, startCopyFromCollection])

  // Context menu handler for collection item
  const handleContextMenu = useCallback((e: React.MouseEvent, collectionName: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.electronAPI.contextMenu.showCollectionMenu(collectionName, { hasCopiedCollection })
  }, [hasCopiedCollection])

  // Context menu handler for empty space in panel
  const handlePanelContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    window.electronAPI.contextMenu.showCollectionPanelMenu({ hasCopiedCollection })
  }, [hasCopiedCollection])

  // Context menu action listener
  useEffect(() => {
    const unsubscribe = window.electronAPI.contextMenu.onAction((data) => {
      if (data.action === 'copy') {
        handleCopyCollection(data.collectionName)
      } else if (data.action === 'paste') {
        handlePasteCollection()
      } else if (data.action === 'delete') {
        // Select and mark for deletion
        setActiveCollection(data.collectionName)
        setMarkedForDeletion(data.collectionName)
      }
    })
    return unsubscribe
  }, [handleCopyCollection, handlePasteCollection, setActiveCollection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement
      const isInputting = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Delete/Backspace (with or without Command) to toggle deletion mark
      if ((e.key === 'Delete' || e.key === 'Backspace') && !draftCollection && !isInputting) {
        e.preventDefault()
        handleToggleDeletion()
      }

      // Command+S or Command+Enter to confirm deletion
      if (e.metaKey && (e.key === 's' || e.key === 'Enter') && markedForDeletion && !draftCollection) {
        e.preventDefault()
        handleCommitDeletion()
      }

      // Escape or Command+Z to cancel deletion mark
      if ((e.key === 'Escape' || (e.metaKey && e.key === 'z')) && markedForDeletion) {
        e.preventDefault()
        setMarkedForDeletion(null)
      }

      // Command+C to copy active collection
      if (e.metaKey && e.key === 'c' && activeCollection && !draftCollection && !isInputting) {
        e.preventDefault()
        handleCopyCollection(activeCollection)
      }

      // Command+V to paste (start copy mode)
      if (e.metaKey && e.key === 'v' && hasCopiedCollection && !draftCollection && !isInputting) {
        e.preventDefault()
        handlePasteCollection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleDeletion, handleCommitDeletion, handleCopyCollection, handlePasteCollection, markedForDeletion, draftCollection, activeCollection, hasCopiedCollection])

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <aside className="w-full h-full bg-sidebar/70 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="px-4 py-2">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClassName}
            style={inputStyle}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs w-4 h-4 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto" onContextMenu={handlePanelContextMenu}>
        {collectionsLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading collections...</div>
        )}

        {collectionsError && (
          <div className="p-4">
            <div className="text-sm text-destructive mb-2">{collectionsError}</div>
            <Button onClick={refreshCollections} size="sm" variant="outline" className="w-full">
              Retry
            </Button>
          </div>
        )}

        {!collectionsLoading && !collectionsError && collections.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No collections found
          </div>
        )}

        {!collectionsLoading && !collectionsError && collections.length > 0 && filteredCollections.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No collections match "{searchTerm}"
          </div>
        )}

        {/* Draft collection row */}
        {draftCollection && (
          <div className="py-2">
            <div className="w-full px-4 py-1 bg-primary/10 border-l-2 border-primary">
              <input
                type="text"
                value={draftCollection.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="Collection name..."
                className="w-full text-xs font-medium bg-transparent border-none outline-none text-primary placeholder:text-primary/50"
                autoFocus
              />
            </div>
          </div>
        )}

        {!collectionsLoading && !collectionsError && filteredCollections.length > 0 && (
          <div className="py-2">
            {filteredCollections.map(collection => {
              const isActive = collection.name === activeCollection && !draftCollection
              const isMarkedForDeletion = collection.name === markedForDeletion

              // Determine row styling
              let bgClass = ''
              let borderClass = 'border-l-2 border-transparent'
              let textClass = 'text-sidebar-foreground'

              if (isMarkedForDeletion) {
                bgClass = 'bg-destructive/20'
                borderClass = 'border-l-2 border-destructive'
                textClass = 'text-destructive'
              } else if (isActive) {
                bgClass = 'bg-sidebar-accent'
                borderClass = 'border-l-2 border-sidebar-primary'
                textClass = 'text-sidebar-primary'
              }

              return (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionClick(collection.name)}
                  onContextMenu={(e) => handleContextMenu(e, collection.name)}
                  className={`w-full px-4 py-1 text-left transition-all duration-150 ${bgClass} ${borderClass} ${!isActive && !isMarkedForDeletion ? 'hover:bg-sidebar-accent/50' : ''}`}
                >
                  <div className={`text-xs font-medium truncate ${textClass}`}>
                    {collection.name}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-sidebar-border">
        {markedForDeletion && !draftCollection ? (
          // Deletion mode footer
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setMarkedForDeletion(null)}
                disabled={deleteMutation.isPending}
                className="h-6 px-2 text-[11px] rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                style={inputStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleCommitDeletion}
                disabled={deleteMutation.isPending}
                className="h-6 px-2 text-[11px] rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          // Normal footer with add button
          <button
            onClick={handleCreateClick}
            disabled={!!draftCollection}
            className="h-6 w-6 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
            title="Create new collection"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Delete confirmation dialog for non-empty collections */}
      {markedCollection && (
        <DeleteCollectionDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          collectionName={markedCollection.name}
          documentCount={markedCollection.count}
          onConfirm={handleConfirmedDeletion}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </aside>
  )
}
