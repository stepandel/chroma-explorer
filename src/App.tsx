import { useState } from 'react'
import ConnectionModal from './components/ConnectionModal'
import { ChromaDBProvider } from './providers/ChromaDBProvider'
import { TabsProvider } from './context/TabsContext'
import { AppLayout } from './components/layout/AppLayout'
import { ConnectionProfile } from '../electron/types'

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null)

  const handleConnect = async (profile: ConnectionProfile) => {
    setCurrentProfile(profile)
    // Track last active profile for UI convenience
    await window.electronAPI.profiles.setLastActive(profile.id)
    setIsModalOpen(false)
  }

  if (isModalOpen) {
    return <ConnectionModal isOpen={true} onConnect={handleConnect} />
  }

  return (
    <ChromaDBProvider profile={currentProfile}>
      <TabsProvider>
        <AppLayout />
      </TabsProvider>
    </ChromaDBProvider>
  )
}
