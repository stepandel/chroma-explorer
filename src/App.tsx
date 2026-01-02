import { useState } from 'react'
import SetupModal from './components/SetupModal'

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [connectionString, setConnectionString] = useState<string | null>(null)

  const handleConnect = (connString: string) => {
    console.log('Connecting to ChromaDB:', connString)
    setConnectionString(connString)
    setIsModalOpen(false)
  }

  return (
    <div className="h-screen bg-gray-100">
      <SetupModal isOpen={isModalOpen} onConnect={handleConnect} />

      {connectionString && (
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ChromaDB Explorer
          </h1>
          <p className="text-gray-600">
            Connected to: {connectionString}
          </p>
        </div>
      )}
    </div>
  )
}
