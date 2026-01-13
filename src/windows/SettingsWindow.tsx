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

  return (
    <div className="fixed inset-0 flex flex-col bg-card/95 backdrop-blur-xl select-none">
      {/* macOS-style header with traffic light spacing */}
      <div className="h-12 flex items-center justify-center border-b border-border shrink-0 draggable-region relative">
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-6">
          {/* Section header */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">API Keys</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configure API keys for embedding providers. Keys are encrypted at rest.
            </p>
          </div>

          {/* Provider list */}
          <div className="space-y-4">
            {API_KEY_PROVIDERS.map(provider => (
              <div
                key={provider.id}
                className="p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">{provider.name}</span>
                  {provider.docsUrl && (
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      Get key
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>

                {provider.envVars.map(envVar => (
                  <div key={envVar} className="flex items-center gap-2 mt-1.5">
                    <Label className="text-[10px] text-muted-foreground w-36 font-mono truncate">
                      {envVar}
                    </Label>
                    <div className="relative flex-1">
                      <Input
                        type={visibleKeys.has(envVar) ? 'text' : 'password'}
                        value={apiKeys[envVar] || ''}
                        onChange={(e) => handleKeyChange(envVar, e.target.value)}
                        placeholder="Enter key..."
                        className="h-7 text-xs font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility(envVar)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {visibleKeys.has(envVar) ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
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
      <div className="p-4 border-t border-border flex justify-end shrink-0">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-7 text-xs px-4"
        >
          {saving ? (
            'Saving...'
          ) : saved ? (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Saved
            </span>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  )
}
