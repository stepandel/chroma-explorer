import { type FormEvent, useMemo, useState } from 'react'
import { ExternalLink, MessageCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'

interface DeveloperMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const feedbackUrl = 'https://www.chroma-explorer.com/feedback'
const fieldClassName = 'w-full rounded-md border border-input bg-background px-2.5 py-2 text-[12px] leading-5 shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary'

export function DeveloperMessageDialog({
  open,
  onOpenChange,
}: DeveloperMessageDialogProps) {
  const [useCase, setUseCase] = useState('')
  const [missing, setMissing] = useState('')
  const [email, setEmail] = useState('')
  const [openToCall, setOpenToCall] = useState(false)

  const canSubmit = useMemo(
    () => [useCase, missing, email].some((value) => value.trim().length > 0) || openToCall,
    [email, missing, openToCall, useCase]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const params = new URLSearchParams()
    const appendIfPresent = (key: string, value: string) => {
      const trimmed = value.trim()
      if (trimmed.length > 0) params.set(key, trimmed)
    }

    appendIfPresent('useCase', useCase)
    appendIfPresent('missing', missing)
    appendIfPresent('email', email)
    if (openToCall) params.set('openToCall', 'yes')

    const url = params.size > 0 ? `${feedbackUrl}?${params.toString()}` : feedbackUrl
    await window.electronAPI.shell.openExternal(url)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] gap-0 border-border/80 bg-popover p-0 text-popover-foreground shadow-2xl sm:rounded-xl">
        <DialogHeader className="gap-3 border-b border-border/70 px-5 pb-4 pt-5 text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-[15px] font-semibold tracking-normal">
              A note from the developer
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-5 text-muted-foreground">
              Help shape what Chroma Explorer becomes next.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-1.5">
              <label htmlFor="developer-message-use-case" className="text-[11px] font-medium text-muted-foreground">
                What are you using Chroma Explorer for?
              </label>
              <textarea
                id="developer-message-use-case"
                value={useCase}
                onChange={(event) => setUseCase(event.target.value)}
                rows={3}
                className={`${fieldClassName} resize-none`}
                placeholder="Browsing local collections, debugging embeddings, managing documents..."
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="developer-message-missing" className="text-[11px] font-medium text-muted-foreground">
                What feels missing or could work better?
              </label>
              <textarea
                id="developer-message-missing"
                value={missing}
                onChange={(event) => setMissing(event.target.value)}
                rows={3}
                className={`${fieldClassName} resize-none`}
                placeholder="Anything confusing, slow, repetitive, or not quite there yet."
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="developer-message-email" className="text-[11px] font-medium text-muted-foreground">
                Email for follow-up, optional
              </label>
              <input
                id="developer-message-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
                placeholder="you@example.com"
              />
              <p className="text-[11px] leading-4 text-muted-foreground">
                I will only use this to ask about your Chroma Explorer workflow.
              </p>
            </div>

            <label className="flex items-center gap-2 text-[12px] text-foreground/85">
              <input
                type="checkbox"
                checked={openToCall}
                onChange={(event) => setOpenToCall(event.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              I am open to a short follow-up call
            </label>
          </div>

          <DialogFooter className="border-t border-border/70 px-5 py-4 sm:justify-between sm:space-x-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Maybe later
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              <ExternalLink className="h-3.5 w-3.5" />
              Send feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
