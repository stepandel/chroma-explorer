import { ChromaDBProvider } from '../providers/ChromaDBProvider'
import { CollectionProvider } from '../context/CollectionContext'
import { DraftCollectionProvider } from '../context/DraftCollectionContext'
import { ClipboardProvider } from '../context/ClipboardContext'
import { AppLayout } from '../components/layout/AppLayout'
import { useProfileQuery } from '../hooks/useChromaQueries'

interface ConnectionWindowProps {
  windowId: string
  profileId: string
}

export function ConnectionWindow({ windowId, profileId }: ConnectionWindowProps) {
  const { data: profile, isLoading: loading, error } = useProfileQuery(profileId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">
          Error: {error ? (error as Error).message : 'Profile not found'}
        </div>
      </div>
    )
  }

  return (
    <ChromaDBProvider profile={profile} windowId={windowId}>
      <ClipboardProvider>
        <CollectionProvider>
          <DraftCollectionProvider>
            <AppLayout />
          </DraftCollectionProvider>
        </CollectionProvider>
      </ClipboardProvider>
    </ChromaDBProvider>
  )
}
