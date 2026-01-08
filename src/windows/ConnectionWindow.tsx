import { useState, useEffect } from 'react'
import { ChromaDBProvider } from '../providers/ChromaDBProvider'
import { TabsProvider } from '../context/TabsContext'
import { AppLayout } from '../components/layout/AppLayout'
import { ConnectionProfile } from '../../electron/types'

interface ConnectionWindowProps {
  windowId: string
  profileId: string
}

export function ConnectionWindow({ windowId, profileId }: ConnectionWindowProps) {
  const [profile, setProfile] = useState<ConnectionProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        // Get the profile for this window (from cache or storage)
        const loadedProfile = await window.electronAPI.window.getProfile(profileId)
        setProfile(loadedProfile)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
        setLoading(false)
      }
    }

    loadProfile()
  }, [profileId])

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
        <div className="text-red-600">Error: {error || 'Profile not found'}</div>
      </div>
    )
  }

  return (
    <ChromaDBProvider profile={profile} windowId={windowId}>
      <TabsProvider windowId={windowId}>
        <AppLayout />
      </TabsProvider>
    </ChromaDBProvider>
  )
}
