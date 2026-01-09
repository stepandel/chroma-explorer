import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  ColumnResizeMode,
} from '@tanstack/react-table'
import EmbeddingCell from './EmbeddingCell'

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface DocumentsTableProps {
  documents: DocumentRecord[]
  loading: boolean
  error: string | null
  hasActiveFilters?: boolean
  selectedDocumentId: string | null
  onDocumentSelect: (id: string | null) => void
}

export default function DocumentsTable({
  documents,
  loading,
  error,
  hasActiveFilters = false,
  selectedDocumentId,
  onDocumentSelect,
}: DocumentsTableProps) {
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
    <div className="overflow-auto h-full">
      <table style={{ minWidth: '100%', width: table.getCenterTotalSize() }}>
        <thead className="bg-blue-50 sticky top-0 z-10 border-b border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-3 py-1 text-center text-xs font-medium text-muted-foreground border-r border-border relative bg-blue-50"
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
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row, index) => {
            const isSelected = selectedDocumentId === row.original.id
            return (
              <tr
                key={row.id}
                className={`transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-100'
                    : index % 2 === 0 ? 'bg-background' : 'bg-muted/100'
                }`}
                onClick={() => onDocumentSelect(isSelected ? null : row.original.id)}
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
