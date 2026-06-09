import { type FormEvent, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { Button } from '../ui/button'

const defaultForminitFormId = '742yqqcnm5o'
const forminitFormId = import.meta.env.VITE_FORMINIT_FORM_ID?.trim() || defaultForminitFormId
const feedbackEndpoint = forminitFormId ? `https://forminit.com/f/${forminitFormId}` : ''
const developerProfileUrl = 'https://github.com/stepandel'
const bugReportUrl = 'https://github.com/stepandel/chroma-explorer/issues/new'
const fieldClassName = 'w-full rounded-md border border-input bg-background px-2.5 py-2 text-[12px] leading-5 shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary'

type SubmissionState = 'idle' | 'submitting' | 'sent' | 'error'
type ForminitBlock =
  | { type: 'sender'; properties: { email: string } }
  | { type: 'text'; name: string; value: string }

export function DeveloperMessageForm() {
  const [useCase, setUseCase] = useState('')
  const [building, setBuilding] = useState('')
  const [missing, setMissing] = useState('')
  const [email, setEmail] = useState('')
  const [openToCall, setOpenToCall] = useState(false)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [errorMessage, setErrorMessage] = useState('Could not send feedback. Please try again in a moment.')

  const canSubmit = useMemo(
    () =>
      submissionState !== 'submitting' &&
      email.trim().length > 0 &&
      ([useCase, building, missing].some((value) => value.trim().length > 0) || openToCall),
    [building, email, missing, openToCall, submissionState, useCase]
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
          name: 'building',
          value: building.trim(),
        },
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

      blocks.unshift({
        type: 'sender',
        properties: {
          email: email.trim(),
        },
      })

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
      setBuilding('')
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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="space-y-1.5">
          <label htmlFor="developer-message-building" className="text-[11px] font-medium text-muted-foreground">
            What are you building? (optional)
          </label>
          <textarea
            id="developer-message-building"
            value={building}
            onChange={(event) => {
              setBuilding(event.target.value)
              setSubmissionState('idle')
            }}
            rows={2}
            className={`${fieldClassName} resize-none`}
            placeholder="RAG system, agent memory, search engine, chatbot..."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="developer-message-use-case" className="text-[11px] font-medium text-muted-foreground">
            What are you using Chroma Explorer for? (optional)
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
            What feels missing or could work better? (optional)
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
            placeholder="Anything missing , could be better, confusing, slow, repetitive.."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="developer-message-email" className="text-[11px] font-medium text-muted-foreground">
            Email for follow-up
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
            required
          />
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

      <div className="flex items-center justify-between border-t border-border/70 px-5 py-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground underline-offset-2 hover:bg-transparent hover:text-foreground hover:underline"
          onClick={() => window.electronAPI.shell.openExternal(bugReportUrl)}
        >
          Need to report a bug?
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          <Send className="h-3.5 w-3.5" />
          {submissionState === 'submitting' ? 'Sending...' : 'Send feedback'}
        </Button>
      </div>
    </form>
  )
}

export function DeveloperMessageIntro() {
  return (
    <p className="text-[12px] leading-5 text-muted-foreground">
      I&apos;m{' '}
      <button
        type="button"
        className="font-medium text-foreground/80 underline decoration-foreground/25 decoration-dotted underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/45"
        onClick={() => window.electronAPI.shell.openExternal(developerProfileUrl)}
      >
        Stepan
      </button>
      , the developer of Chroma Explorer. I&apos;m trying
      to understand how people are using the app so I can make it better.
      If you&apos;re using it regularly, I&apos;d love to hear what workflow it
      helps with, what feels missing, and what would make it more useful.
    </p>
  )
}
