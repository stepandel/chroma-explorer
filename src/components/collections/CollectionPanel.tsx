import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useChromaDB } from '../../providers/ChromaDBProvider'
import { useCollection } from '../../context/CollectionContext'
import { useDraftCollection } from '../../context/DraftCollectionContext'
import { useClipboard } from '../../context/ClipboardContext'
import { useDeleteCollectionMutation } from '../../hooks/useChromaQueries'
import { SHORTCUTS, matchesShortcut } from '../../constants/keyboard-shortcuts'
import { Button } from '../ui/button'
import { DeleteCollectionDialog } from './DeleteCollectionDialog'

const inputClassName = "w-full h-6 text-[11px] py-0 px-1.5 pr-5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] placeholder:text-sidebar-foreground/50 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring/50 transition-colors"
const inputStyle = { boxShadow: 'inset 0 0.5px 1px 0 rgb(0 0 0 / 0.04)' }

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
    if (!clipboard || clipboard.type !== 'collection' || draftCollection) return
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

  // Menu event listeners (from native app menu)
  useEffect(() => {
    // Duplicate collection = copy + paste in one action
    const handleMenuDuplicate = () => {
      if (activeCollection && currentProfile) {
        const collection = collections.find(c => c.name === activeCollection)
        if (collection) {
          copyCollection(collection, currentProfile.id)
          // Small delay to ensure clipboard is set
          setTimeout(() => {
            startCopyFromCollection(collection)
          }, 0)
        }
      }
    }

    // Copy collection to clipboard
    const handleMenuCopy = () => {
      if (activeCollection) {
        handleCopyCollection(activeCollection)
      }
    }

    // Paste collection from clipboard
    const handleMenuPaste = () => {
      handlePasteCollection()
    }

    // Delete collection
    const handleMenuDelete = () => {
      if (activeCollection) {
        handleToggleDeletion()
      }
    }

    // Listen for menu events dispatched from useMenuHandlers
    window.addEventListener('menu:duplicate-collection', handleMenuDuplicate)
    window.addEventListener('menu:copy-collection', handleMenuCopy)
    window.addEventListener('menu:paste-collection', handleMenuPaste)
    window.addEventListener('menu:delete-collection', handleMenuDelete)

    return () => {
      window.removeEventListener('menu:duplicate-collection', handleMenuDuplicate)
      window.removeEventListener('menu:copy-collection', handleMenuCopy)
      window.removeEventListener('menu:paste-collection', handleMenuPaste)
      window.removeEventListener('menu:delete-collection', handleMenuDelete)
    }
  }, [activeCollection, collections, currentProfile, copyCollection, startCopyFromCollection, handleCopyCollection, handlePasteCollection, handleToggleDeletion])

  // Keyboard shortcuts - using centralized SHORTCUTS definitions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputting = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Command+S or Command+Enter to confirm deletion
      if ((matchesShortcut(e, SHORTCUTS.SAVE) || matchesShortcut(e, SHORTCUTS.SAVE_ENTER)) && markedForDeletion && !draftCollection) {
        e.preventDefault()
        handleCommitDeletion()
      }

      // Escape or Command+Z to cancel deletion mark
      if ((matchesShortcut(e, SHORTCUTS.CANCEL) || matchesShortcut(e, SHORTCUTS.UNDO)) && markedForDeletion) {
        e.preventDefault()
        setMarkedForDeletion(null)
        return
      }

      // Command+Z to cancel copy mode (draft collection)
      if (matchesShortcut(e, SHORTCUTS.UNDO) && draftCollection) {
        e.preventDefault()
        cancelCreation()
        return
      }

      // Escape to cancel draft collection
      if (matchesShortcut(e, SHORTCUTS.CANCEL) && draftCollection) {
        e.preventDefault()
        cancelCreation()
      }

      // Command+V to paste (start copy mode)
      if (matchesShortcut(e, SHORTCUTS.PASTE_COLLECTION) && hasCopiedCollection && !draftCollection && !isInputting) {
        e.preventDefault()
        handlePasteCollection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCommitDeletion, handlePasteCollection, cancelCreation, markedForDeletion, draftCollection, hasCopiedCollection])

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <aside
      className="w-full h-full flex flex-col"
      style={{
        background: 'var(--sidebar)',
        backdropFilter: 'blur(20px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.1)',
        boxShadow: 'var(--sidebar-shadow)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-2">
        {/* Search input and add button */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
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
          <button
            onClick={handleCreateClick}
            disabled={!!draftCollection}
            className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-md bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors translate-y-px"
            style={inputStyle}
            title="Create new collection"
          >
            <Plus className="h-2 w-2" />
          </button>
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
          <div className="py-1 px-2">
            <div className="w-full px-3 py-1.5 bg-black/[0.08] dark:bg-white/[0.10] rounded-md">
              <input
                type="text"
                value={draftCollection.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="Collection name..."
                className="w-full text-[12px] font-medium bg-transparent border-none outline-none text-sidebar-foreground placeholder:text-sidebar-foreground/40"
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

              // Determine row styling - macOS source list style
              let bgClass = 'rounded-md mx-2'
              let textClass = 'text-sidebar-foreground'
              let hoverClass = 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'

              if (isMarkedForDeletion) {
                bgClass = 'bg-destructive/12 rounded-md mx-2'
                textClass = 'text-destructive'
                hoverClass = ''
              } else if (isActive) {
                bgClass = 'bg-black/[0.08] dark:bg-white/[0.10] rounded-md mx-2'
                textClass = 'text-sidebar-foreground font-medium'
                hoverClass = ''
              }

              // Check if this is a Pinecone collection (has pinecone info or namespace separator)
              const isPinecone = !!collection.pinecone || collection.name.includes('::')
              const displayName = collection.name

              return (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionClick(collection.name)}
                  onContextMenu={(e) => handleContextMenu(e, collection.name)}
                  className={`w-full px-3 py-1.5 text-left transition-colors duration-100 ${bgClass} ${hoverClass}`}
                >
                  <div className="flex items-center gap-1.5">
                    {isPinecone && (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400/60" title="Pinecone index" />
                    )}
                    <span className={`text-[12px] truncate ${textClass}`}>
                      {displayName}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer - only shown when in deletion mode */}
      {markedForDeletion && !draftCollection && (
        <div className="px-4 py-2 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMarkedForDeletion(null)}
              disabled={deleteMutation.isPending}
              className="h-6 px-2.5 text-[11px] rounded-md bg-black/[0.06] dark:bg-white/[0.10] hover:bg-black/[0.10] dark:hover:bg-white/[0.15] text-sidebar-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitDeletion}
              disabled={deleteMutation.isPending}
              className="h-6 px-2.5 text-[11px] rounded-md bg-destructive/75 hover:bg-destructive/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {deleteMutation.isPending ? '...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

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
