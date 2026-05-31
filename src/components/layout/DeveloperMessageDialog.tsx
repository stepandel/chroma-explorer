import { type FormEvent, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, MessageCircle, Send } from 'lucide-react'
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

const defaultForminitFormId = '742yqqcnm5o'
const forminitFormId = import.meta.env.VITE_FORMINIT_FORM_ID?.trim() || defaultForminitFormId
const feedbackEndpoint = forminitFormId ? `https://forminit.com/f/${forminitFormId}` : ''
const fieldClassName = 'w-full rounded-md border border-input bg-background px-2.5 py-2 text-[12px] leading-5 shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary'
type SubmissionState = 'idle' | 'submitting' | 'sent' | 'error'
type ForminitBlock =
  | { type: 'sender'; properties: { email: string } }
  | { type: 'text'; name: string; value: string }

export function DeveloperMessageDialog({
  open,
  onOpenChange,
}: DeveloperMessageDialogProps) {
  const [useCase, setUseCase] = useState('')
  const [missing, setMissing] = useState('')
  const [email, setEmail] = useState('')
  const [openToCall, setOpenToCall] = useState(false)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [errorMessage, setErrorMessage] = useState('Could not send feedback. Please try again in a moment.')

  const canSubmit = useMemo(
    () =>
      submissionState !== 'submitting' &&
      ([useCase, missing, email].some((value) => value.trim().length > 0) || openToCall),
    [email, missing, openToCall, submissionState, useCase]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmissionState('submitting')
    setErrorMessage('Could not send feedback. Please try again in a moment.')

    try {
      if (!feedbackEndpoint) {
        throw new Error('Feedback form is not configured')
      }

      const blocks: ForminitBlock[] = [
        {
          type: 'text',
          name: 'use_case',
          value: useCase.trim(),
        },
        {
          type: 'text',
          name: 'missing',
          value: missing.trim(),
        },
        {
          type: 'text',
          name: 'open_to_call',
          value: openToCall ? 'yes' : 'no',
        },
        {
          type: 'text',
          name: 'source',
          value: 'chroma-explorer-app',
        },
        {
          type: 'text',
          name: 'submitted_at',
          value: new Date().toISOString(),
        },
      ]

      if (email.trim().length > 0) {
        blocks.unshift({
          type: 'sender',
          properties: {
            email: email.trim(),
          },
        })
      }

      const response = await fetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          result && typeof result === 'object' && 'message' in result && typeof result.message === 'string'
            ? result.message
            : `Feedback request failed with ${response.status}`
        throw new Error(message)
      }

      setSubmissionState('sent')
      setUseCase('')
      setMissing('')
      setEmail('')
      setOpenToCall(false)
    } catch (error) {
      console.error('Failed to submit feedback', error)
      setErrorMessage(error instanceof Error ? error.message : 'Could not send feedback. Please try again in a moment.')
      setSubmissionState('error')
    }
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
              Hi, I&apos;m Stepan, the developer of Chroma Explorer. I&apos;m trying to
              understand how people are using the app so I can make it better. If
              you&apos;re using it regularly, I&apos;d love to hear what workflow it
              helps with, what feels missing, and what would make it more useful.
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
                onChange={(event) => {
                  setUseCase(event.target.value)
                  setSubmissionState('idle')
                }}
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
                onChange={(event) => {
                  setMissing(event.target.value)
                  setSubmissionState('idle')
                }}
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
                onChange={(event) => {
                  setEmail(event.target.value)
                  setSubmissionState('idle')
                }}
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
                onChange={(event) => {
                  setOpenToCall(event.target.checked)
                  setSubmissionState('idle')
                }}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              I am open to a short follow-up call
            </label>

            {submissionState === 'sent' && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Feedback sent. Thank you.
              </div>
            )}

            {submissionState === 'error' && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorMessage}
              </div>
            )}
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
              <Send className="h-3.5 w-3.5" />
              {submissionState === 'submitting' ? 'Sending...' : 'Send feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
