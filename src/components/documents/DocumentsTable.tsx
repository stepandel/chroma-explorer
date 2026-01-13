import { useState, useMemo, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  ColumnResizeMode,
} from '@tanstack/react-table'
import EmbeddingCell from './EmbeddingCell'
import { TypedMetadataRecord } from '../../types/metadata'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DraftDocument {
  id: string
  document: string
  metadata: TypedMetadataRecord
}

interface DocumentsTableProps {
  documents: DocumentRecord[]
  loading: boolean
  error: string | null
  hasActiveFilters?: boolean
  // Multi-select props
  selectedDocumentIds: Set<string>
  selectionAnchor: string | null
  onSingleSelect: (id: string) => void
  onToggleSelect: (id: string) => void
  onRangeSelect: (ids: string[], newAnchor?: string) => void
  onAddToSelection: (ids: string[]) => void
  // Draft props - supports multiple drafts for paste operations
  draftDocuments?: DraftDocument[]
  onDraftChange?: (draft: DraftDocument, index: number) => void
  onDraftCancel?: () => void
  markedForDeletion?: Set<string>
  // Context menu props
  onDocumentContextMenu?: (e: React.MouseEvent, documentId: string) => void
  onTableContextMenu?: (e: React.MouseEvent) => void
}

export default function DocumentsTable({
  documents,
  loading,
  error,
  hasActiveFilters = false,
  selectedDocumentIds,
  selectionAnchor,
  onSingleSelect,
  onToggleSelect,
  onRangeSelect,
  onAddToSelection,
  draftDocuments = [],
  onDraftChange,
  onDraftCancel,
  markedForDeletion = new Set(),
  onDocumentContextMenu,
  onTableContextMenu,
}: DocumentsTableProps) {
  // Ref for auto-focusing the id input when draft starts
  const draftIdInputRef = useRef<HTMLInputElement>(null)
  const prevDraftCountRef = useRef<number>(0)

  // Auto-focus only when drafts are first created (not on every change)
  useEffect(() => {
    const currentDraftCount = draftDocuments.length
    const prevDraftCount = prevDraftCountRef.current

    // Only focus if we just created drafts (went from 0 to having drafts)
    if (currentDraftCount > 0 && prevDraftCount === 0 && draftIdInputRef.current) {
      draftIdInputRef.current.focus()
    }

    prevDraftCountRef.current = currentDraftCount
  }, [draftDocuments.length])

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)

  // Get all document IDs including drafts at the top
  const allDocIds = useMemo(() => {
    const ids: string[] = []
    // Add all draft document IDs first
    ids.push(...draftDocuments.map(d => d.id))
    ids.push(...documents.map(d => d.id))
    return ids
  }, [documents, draftDocuments])

  // Handle row click with modifier keys (macOS-style)
  const handleRowClick = (e: React.MouseEvent, docId: string, rowIndex: number) => {
    // Prevent text selection during click
    e.preventDefault()

    if (e.metaKey && e.shiftKey) {
      // ⌘+Shift+Click: Add range to existing selection
      if (selectionAnchor) {
        const anchorIndex = allDocIds.indexOf(selectionAnchor)
        if (anchorIndex !== -1) {
          const start = Math.min(anchorIndex, rowIndex)
          const end = Math.max(anchorIndex, rowIndex)
          const rangeIds = allDocIds.slice(start, end + 1)
          onAddToSelection(rangeIds)
          return
        }
      }
      // No anchor, just add this one
      onToggleSelect(docId)
    } else if (e.shiftKey) {
      // Shift+Click: Range select (replace selection)
      if (selectionAnchor) {
        const anchorIndex = allDocIds.indexOf(selectionAnchor)
        if (anchorIndex !== -1) {
          const start = Math.min(anchorIndex, rowIndex)
          const end = Math.max(anchorIndex, rowIndex)
          const rangeIds = allDocIds.slice(start, end + 1)
          onRangeSelect(rangeIds)
          return
        }
      }
      // No anchor, just select this one
      onSingleSelect(docId)
    } else if (e.metaKey) {
      // ⌘+Click: Toggle this row in selection
      onToggleSelect(docId)
    } else {
      // Plain click: Select only this row
      onSingleSelect(docId)
    }
  }

  // Drag selection handlers
  const handleMouseDown = (e: React.MouseEvent, rowIndex: number) => {
    // Only start drag on plain click (no modifiers)
    if (!e.metaKey && !e.shiftKey && e.button === 0) {
      setIsDragging(true)
      setDragStartIndex(rowIndex)
    }
  }

  const handleMouseEnter = (rowIndex: number) => {
    if (isDragging && dragStartIndex !== null) {
      const start = Math.min(dragStartIndex, rowIndex)
      const end = Math.max(dragStartIndex, rowIndex)
      const rangeIds = allDocIds.slice(start, end + 1)
      onRangeSelect(rangeIds, allDocIds[dragStartIndex])
    }
  }

  // Global mouse up to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
      setDragStartIndex(null)
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Extract all unique metadata keys from documents
  const metadataKeys = useMemo(() =>
    Array.from(
      new Set(
        documents.flatMap(doc =>
          doc.metadata ? Object.keys(doc.metadata) : []
        )
      )
    ).sort(),
    [documents]
  )

  // Define columns
  const columns = useMemo<ColumnDef<DocumentRecord>[]>(() => {
    const baseColumns: ColumnDef<DocumentRecord>[] = [
      {
        accessorKey: 'id',
        header: 'id',
        size: 200,
        cell: info => (
          <div className="text-xs font-mono text-foreground">
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'document',
        header: 'document',
        size: 300,
        cell: info => {
          const value = info.getValue() as string | null
          return (
            <div className="text-xs text-foreground">
              <div className="line-clamp-2">
                {value || <span className="text-muted-foreground italic">No document</span>}
              </div>
            </div>
          )
        },
      },
    ]

    // Add dynamic metadata columns
    const metadataColumns: ColumnDef<DocumentRecord>[] = metadataKeys.map(key => ({
      id: `metadata.${key}`,
      header: key,
      size: 150,
      accessorFn: (row) => row.metadata?.[key],
      cell: info => {
        const value = info.getValue()
        return (
          <div className="text-xs text-foreground">
            {value !== undefined && value !== null ? (
              typeof value === 'object' ? (
                <pre className="text-xs bg-secondary/50 p-1 rounded overflow-x-auto line-clamp-2">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <div className="line-clamp-2">
                  {String(value)}
                </div>
              )
            ) : (
              <span className="text-muted-foreground italic">-</span>
            )}
          </div>
        )
      },
    }))

    return [...baseColumns, ...metadataColumns]
  }, [metadataKeys])

  const [columnResizeMode] = useState<ColumnResizeMode>('onChange')

  const table = useReactTable({
    data: documents,
    columns,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">
          {hasActiveFilters ? 'Searching documents...' : 'Loading documents...'}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <h3 className="text-destructive font-semibold mb-2">Error</h3>
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <h3 className="text-foreground font-semibold text-lg mb-2">No Documents Found</h3>
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? 'No documents match your filters. Try adjusting your search criteria.'
              : "This collection doesn't have any documents yet."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-full" onContextMenu={onTableContextMenu}>
      <table style={{ minWidth: '100%', width: table.getCenterTotalSize() }}>
        <thead className="bg-muted sticky top-0 z-10 border-b border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-3 py-1 text-center text-xs font-medium text-muted-foreground border-r border-border relative bg-muted"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-blue-500 ${
                      header.column.getIsResizing() ? 'bg-blue-500' : ''
                    }`}
                  />
                </th>
              ))}
              {/* Filler column to extend table structure */}
              <th className="bg-blue-50"></th>
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border select-none">
          {/* Draft rows for creating/pasting documents */}
          {draftDocuments.length > 0 && onDraftChange && draftDocuments.map((draft, draftIndex) => (
            <tr
              key={`draft-${draftIndex}`}
              className={`cursor-pointer ${selectedDocumentIds.has(draft.id) ? 'bg-blue-50' : 'bg-blue-50/50'}`}
              onClick={(e) => handleRowClick(e, draft.id, draftIndex)}
              onMouseDown={(e) => handleMouseDown(e, draftIndex)}
              onMouseEnter={() => handleMouseEnter(draftIndex)}
            >
              {/* ID cell - editable */}
              <td
                className="pl-3 py-0.5 align-top border-r border-border"
                style={{ width: table.getHeaderGroups()[0]?.headers[0]?.getSize() }}
              >
                <input
                  ref={draftIndex === 0 ? draftIdInputRef : undefined}
                  type="text"
                  value={draft.id}
                  onChange={(e) => onDraftChange({ ...draft, id: e.target.value }, draftIndex)}
                  placeholder="Enter document ID"
                  className="w-full text-xs font-mono bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50"
                />
              </td>
              {/* Document cell - editable */}
              <td
                className="pl-3 py-0.5 align-top border-r border-border"
                style={{ width: table.getHeaderGroups()[0]?.headers[1]?.getSize() }}
              >
                <input
                  type="text"
                  value={draft.document}
                  onChange={(e) => onDraftChange({ ...draft, document: e.target.value }, draftIndex)}
                  placeholder="Enter document text"
                  className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50"
                />
              </td>
              {/* Editable metadata cells */}
              {metadataKeys.map(key => {
                const field = draft.metadata[key]
                return (
                  <td
                    key={`draft-${draftIndex}-${key}`}
                    className="pl-3 py-0.5 align-top border-r border-border"
                  >
                    <input
                      type="text"
                      value={field?.value || ''}
                      onChange={(e) => onDraftChange({
                        ...draft,
                        metadata: {
                          ...draft.metadata,
                          [key]: { ...field, value: e.target.value }
                        }
                      }, draftIndex)}
                      placeholder="-"
                      className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50 placeholder:italic"
                    />
                  </td>
                )
              })}
              {/* Filler cell */}
              <td className="border-r border-border"></td>
            </tr>
          ))}
          {table.getRowModel().rows.map((row, index) => {
            const isSelected = selectedDocumentIds.has(row.original.id)
            const isMarkedForDeletion = markedForDeletion.has(row.original.id)
            // Adjust index for alternating colors when drafts exist
            const draftCount = draftDocuments.length
            const adjustedIndex = draftCount > 0 ? index + draftCount : index
            // Row index in allDocIds (drafts take indices 0 to draftCount-1)
            const rowIndex = draftCount > 0 ? index + draftCount : index

            // Determine row background
            let rowBgClass: string
            if (isMarkedForDeletion) {
              rowBgClass = isSelected ? 'bg-red-200' : 'bg-red-100'
            } else if (isSelected) {
              rowBgClass = 'bg-blue-100'
            } else {
              rowBgClass = adjustedIndex % 2 === 0 ? 'bg-background' : 'bg-muted/100'
            }

            return (
              <tr
                key={row.id}
                className={`transition-colors cursor-pointer ${rowBgClass}`}
                onClick={(e) => handleRowClick(e, row.original.id, rowIndex)}
                onMouseDown={(e) => handleMouseDown(e, rowIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex)}
                onContextMenu={(e) => onDocumentContextMenu?.(e, row.original.id)}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="pl-3 py-0.5 align-top border-r border-border"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {/* Filler cell to extend table structure */}
                <td className="border-r border-border"></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
