import { useState } from 'react'
import ConnectionModal from './components/ConnectionModal'
import CollectionsTable from './components/CollectionsTable'
import DocumentsView from './components/DocumentsView'
import { useChromaDB } from './hooks/useChromaDB'
import { ConnectionProfile } from '../electron/types'

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)

  const { collections, loading, error, refetch } = useChromaDB(currentProfile)

  const handleConnect = async (profile: ConnectionProfile) => {
    setCurrentProfile(profile)
    // Track last active profile for UI convenience
    await window.electronAPI.profiles.setLastActive(profile.id)
    setIsModalOpen(false)
  }

  const handleSelectCollection = (collectionName: string) => {
    setSelectedCollection(collectionName)
  }

  const handleBackToCollections = () => {
    setSelectedCollection(null)
  }

  const getConnectionDisplay = () => {
    if (!currentProfile) return ''
    if (currentProfile.tenant || currentProfile.database) {
      return `Cloud: ${currentProfile.tenant}/${currentProfile.database}`
    }
    return currentProfile.url
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ConnectionModal isOpen={isModalOpen} onConnect={handleConnect} />

      {currentProfile && !selectedCollection && (
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ChromaDB Explorer
            </h1>
            <p className="text-gray-600">
              Connected to: <span className="font-mono text-sm">{currentProfile.name || getConnectionDisplay()}</span>
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
              onSelectCollection={handleSelectCollection}
            />
          </div>
        </div>
      )}

      {currentProfile && selectedCollection && (
        <DocumentsView
          collectionName={selectedCollection}
          onBack={handleBackToCollections}
        />
      )}
    </div>
  )
}
