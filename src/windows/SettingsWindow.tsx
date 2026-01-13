import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { API_KEY_PROVIDERS } from '../constants/api-key-providers'
import { ExternalLink, Check, Eye, EyeOff } from 'lucide-react'

export function SettingsWindow() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const keys = await window.electronAPI.settings.getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI.settings.setApiKeys(apiKeys)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save API keys:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyChange = (envVar: string, value: string) => {
    setApiKeys(prev => {
      const updated = { ...prev }
      if (value) {
        updated[envVar] = value
      } else {
        delete updated[envVar]
      }
      return updated
    })
  }

  const toggleVisibility = (envVar: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev)
      if (next.has(envVar)) {
        next.delete(envVar)
      } else {
        next.add(envVar)
      }
      return next
    })
  }

  const hasChanges = true // Could track actual changes if needed

  return (
    <div className="fixed inset-0 flex flex-col bg-card select-none">
      {/* Header - matches macOS title bar spacing */}
      <div className="h-12 flex items-center justify-center border-b border-border draggable-region shrink-0">
        <div className="pl-20">
          <h1 className="text-sm font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Section header */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-1">API Keys</h2>
            <p className="text-xs text-muted-foreground">
              Configure API keys for embedding providers. Keys are stored securely and encrypted.
            </p>
          </div>

          {/* Provider list */}
          <div className="space-y-5">
            {API_KEY_PROVIDERS.map(provider => (
              <div key={provider.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">{provider.name}</Label>
                  {provider.docsUrl && (
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Get API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground -mt-1">{provider.description}</p>

                {provider.envVars.map(envVar => (
                  <div key={envVar} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={visibleKeys.has(envVar) ? 'text' : 'password'}
                        value={apiKeys[envVar] || ''}
                        onChange={(e) => handleKeyChange(envVar, e.target.value)}
                        placeholder={envVar}
                        className="h-8 text-sm font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility(envVar)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {visibleKeys.has(envVar) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-8 text-sm px-4"
        >
          {saving ? (
            'Saving...'
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
