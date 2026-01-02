import { useState } from 'react'
import SetupModal from './components/SetupModal'
import CollectionsTable from './components/CollectionsTable'
import { useChromaDB } from './hooks/useChromaDB'

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [connectionString, setConnectionString] = useState<string | null>(null)

  const { collections, loading, error, refetch } = useChromaDB(connectionString)

  const handleConnect = (connString: string) => {
    console.log('Connecting to ChromaDB:', connString)
    setConnectionString(connString)
    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SetupModal isOpen={isModalOpen} onConnect={handleConnect} />

      {connectionString && (
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ChromaDB Explorer
            </h1>
            <p className="text-gray-600">
              Connected to: <span className="font-mono text-sm">{connectionString}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Collections</h2>
            </div>
            <CollectionsTable
              collections={collections}
              loading={loading}
              error={error}
              onRetry={refetch}
            />
          </div>
        </div>
      )}
    </div>
  )
}
