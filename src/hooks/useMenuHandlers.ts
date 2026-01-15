import { useEffect, useCallback } from 'react'
import { usePanel } from '../context/PanelContext'
import { useCollection } from '../context/CollectionContext'
import { useDraftCollection } from '../context/DraftCollectionContext'

/**
 * Hook to handle native menu events in the connection window.
 * Dispatches custom window events that components can listen to.
 */
export function useMenuHandlers() {
  const { leftPanelOpen, setLeftPanelOpen, rightPanelOpen, setRightPanelOpen } = usePanel()
  const { activeCollection } = useCollection()
  const { startCreation } = useDraftCollection()

  // View menu handlers
  const handleToggleLeftPanel = useCallback(() => {
    setLeftPanelOpen(!leftPanelOpen)
  }, [leftPanelOpen, setLeftPanelOpen])

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelOpen(!rightPanelOpen)
  }, [rightPanelOpen, setRightPanelOpen])

  const handleFocusSearch = useCallback(() => {
    // Dispatch event for DocumentsView to focus the search input
    window.dispatchEvent(new CustomEvent('menu:focus-search'))
  }, [])

  const handleClearFilters = useCallback(() => {
    // Dispatch event for DocumentsView to clear filters
    window.dispatchEvent(new CustomEvent('menu:clear-filters'))
  }, [])

  // Collection menu handlers
  const handleNewCollection = useCallback(() => {
    startCreation()
  }, [startCreation])

  const handleDuplicateCollection = useCallback(() => {
    // Dispatch event for CollectionPanel to duplicate the active collection
    if (activeCollection) {
      window.dispatchEvent(new CustomEvent('menu:duplicate-collection'))
    }
  }, [activeCollection])

  const handleRenameCollection = useCallback(() => {
    // Dispatch event for CollectionPanel to start renaming
    if (activeCollection) {
      window.dispatchEvent(new CustomEvent('menu:rename-collection'))
    }
  }, [activeCollection])

  const handleDeleteCollection = useCallback(() => {
    // Dispatch event for CollectionPanel to delete the active collection
    if (activeCollection) {
      window.dispatchEvent(new CustomEvent('menu:delete-collection'))
    }
  }, [activeCollection])

  const handleCopyCollection = useCallback(() => {
    // Dispatch event for CollectionPanel to copy the active collection
    if (activeCollection) {
      window.dispatchEvent(new CustomEvent('menu:copy-collection'))
    }
  }, [activeCollection])

  const handlePasteCollection = useCallback(() => {
    // Dispatch event for CollectionPanel to paste collection
    window.dispatchEvent(new CustomEvent('menu:paste-collection'))
  }, [])

  // Document menu handlers
  const handleNewDocument = useCallback(() => {
    // Dispatch event for DocumentsView to create a new document
    if (activeCollection) {
      window.dispatchEvent(new CustomEvent('menu:new-document'))
    }
  }, [activeCollection])

  const handleEditDocument = useCallback(() => {
    // Dispatch event for DocumentsView to edit the selected document
    window.dispatchEvent(new CustomEvent('menu:edit-document'))
  }, [])

  const handleDeleteSelected = useCallback(() => {
    // Dispatch event for DocumentsView to delete selected documents
    window.dispatchEvent(new CustomEvent('menu:delete-selected'))
  }, [])

  const handleCopyDocuments = useCallback(() => {
    // Dispatch event for DocumentsView to copy selected documents
    window.dispatchEvent(new CustomEvent('menu:copy-documents'))
  }, [])

  const handlePasteDocuments = useCallback(() => {
    // Dispatch event for DocumentsView to paste documents
    window.dispatchEvent(new CustomEvent('menu:paste-documents'))
  }, [])

  const handleSelectAllDocuments = useCallback(() => {
    // Dispatch event for DocumentsView to select all documents
    window.dispatchEvent(new CustomEvent('menu:select-all-documents'))
  }, [])

  const handleConfigureEmbedding = useCallback(() => {
    // Dispatch event to open embedding configuration
    window.dispatchEvent(new CustomEvent('menu:configure-embedding'))
  }, [])

  // Window menu handlers
  const handleDisconnect = useCallback(() => {
    window.electronAPI.window.closeCurrent()
  }, [])

  // Help menu handlers
  const handleShowShortcuts = useCallback(() => {
    // Dispatch event to show keyboard shortcuts dialog
    window.dispatchEvent(new CustomEvent('menu:show-shortcuts'))
  }, [])

  // Subscribe to menu events from main process
  useEffect(() => {
    // View menu
    const unsubToggleLeft = window.electronAPI.menu.onToggleLeftPanel(handleToggleLeftPanel)
    const unsubToggleRight = window.electronAPI.menu.onToggleRightPanel(handleToggleRightPanel)
    const unsubFocusSearch = window.electronAPI.menu.onFocusSearch(handleFocusSearch)
    const unsubClearFilters = window.electronAPI.menu.onClearFilters(handleClearFilters)

    // Collection menu
    const unsubNewCollection = window.electronAPI.menu.onNewCollection(handleNewCollection)
    const unsubDuplicateCollection = window.electronAPI.menu.onDuplicateCollection(handleDuplicateCollection)
    const unsubRenameCollection = window.electronAPI.menu.onRenameCollection(handleRenameCollection)
    const unsubDeleteCollection = window.electronAPI.menu.onDeleteCollection(handleDeleteCollection)
    const unsubCopyCollection = window.electronAPI.menu.onCopyCollection(handleCopyCollection)
    const unsubPasteCollection = window.electronAPI.menu.onPasteCollection(handlePasteCollection)

    // Document menu
    const unsubNewDocument = window.electronAPI.menu.onNewDocument(handleNewDocument)
    const unsubEditDocument = window.electronAPI.menu.onEditDocument(handleEditDocument)
    const unsubDeleteSelected = window.electronAPI.menu.onDeleteSelected(handleDeleteSelected)
    const unsubCopyDocuments = window.electronAPI.menu.onCopyDocuments(handleCopyDocuments)
    const unsubPasteDocuments = window.electronAPI.menu.onPasteDocuments(handlePasteDocuments)
    const unsubSelectAllDocuments = window.electronAPI.menu.onSelectAllDocuments(handleSelectAllDocuments)
    const unsubConfigureEmbedding = window.electronAPI.menu.onConfigureEmbedding(handleConfigureEmbedding)

    // Window menu
    const unsubDisconnect = window.electronAPI.menu.onDisconnect(handleDisconnect)

    // Help menu
    const unsubShowShortcuts = window.electronAPI.menu.onShowShortcuts(handleShowShortcuts)

    return () => {
      unsubToggleLeft()
      unsubToggleRight()
      unsubFocusSearch()
      unsubClearFilters()
      unsubNewCollection()
      unsubDuplicateCollection()
      unsubRenameCollection()
      unsubDeleteCollection()
      unsubCopyCollection()
      unsubPasteCollection()
      unsubNewDocument()
      unsubEditDocument()
      unsubDeleteSelected()
      unsubCopyDocuments()
      unsubPasteDocuments()
      unsubSelectAllDocuments()
      unsubConfigureEmbedding()
      unsubDisconnect()
      unsubShowShortcuts()
    }
  }, [
    handleToggleLeftPanel,
    handleToggleRightPanel,
    handleFocusSearch,
    handleClearFilters,
    handleNewCollection,
    handleDuplicateCollection,
    handleRenameCollection,
    handleDeleteCollection,
    handleCopyCollection,
    handlePasteCollection,
    handleNewDocument,
    handleEditDocument,
    handleDeleteSelected,
    handleCopyDocuments,
    handlePasteDocuments,
    handleSelectAllDocuments,
    handleConfigureEmbedding,
    handleDisconnect,
    handleShowShortcuts,
  ])
}
