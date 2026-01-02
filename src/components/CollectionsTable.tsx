interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
}

interface CollectionsTableProps {
  collections: CollectionInfo[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function CollectionsTable({
  collections,
  loading,
  error,
  onRetry
}: CollectionsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading collections...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Connection Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (collections.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <h3 className="text-gray-700 font-semibold text-lg mb-2">No Collections Found</h3>
          <p className="text-gray-500">Your ChromaDB instance doesn't have any collections yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Collection Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document Count
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Metadata
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {collections.map((collection) => (
            <tr key={collection.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {collection.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                {collection.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {collection.count.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {collection.metadata ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-md">
                    {JSON.stringify(collection.metadata, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-400 italic">No metadata</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
