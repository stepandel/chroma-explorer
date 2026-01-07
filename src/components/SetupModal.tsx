import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SetupModalProps {
  isOpen: boolean
  onConnect: (connectionString: string) => void
}

export default function SetupModal({ isOpen, onConnect }: SetupModalProps) {
  const [connectionString, setConnectionString] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!connectionString.trim()) {
      setError('Connection string is required')
      return
    }

    try {
      new URL(connectionString)
      onConnect(connectionString)
    } catch {
      setError('Please enter a valid URL')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ChromaDB Setup
        </h2>
        <p className="text-gray-600 mb-6">
          Connect to your ChromaDB instance to get started
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label
              htmlFor="connectionString"
              className="block mb-2"
            >
              Connection String
            </Label>
            <Input
              type="text"
              id="connectionString"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder="http://localhost:8000"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
          >
            Connect
          </Button>
        </form>
      </div>
    </div>
  )
}
