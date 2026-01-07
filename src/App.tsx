import { useState } from 'react'
import ConnectionModal from './components/ConnectionModal'
import { ChromaDBProvider } from './providers/ChromaDBProvider'
import { TabsProvider } from './context/TabsContext'
import { AppLayout } from './components/layout/AppLayout'
import { ConnectionProfile } from '../electron/types'

export default function App() {
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null)

  const handleConnect = async (profile: ConnectionProfile) => {
    setCurrentProfile(profile)
    // Track last active profile for UI convenience
    await window.electronAPI.profiles.setLastActive(profile.id)
  }

  const handleDisconnect = () => {
    setCurrentProfile(null)
  }

  if (!currentProfile) {
    return <ConnectionModal isOpen={true} onConnect={handleConnect} />
  }

  return (
    <ChromaDBProvider profile={currentProfile} onDisconnect={handleDisconnect}>
      <TabsProvider>
        <AppLayout />
      </TabsProvider>
    </ChromaDBProvider>
  )
}
