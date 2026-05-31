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

export function DeveloperMessageDialog({
  open,
  onOpenChange,
}: DeveloperMessageDialogProps) {
  const handleOpenFeedback = async () => {
    await window.electronAPI.shell.openExternal(feedbackUrl)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] gap-5 border-border/80 bg-popover p-0 text-popover-foreground shadow-2xl sm:rounded-xl">
        <DialogHeader className="gap-3 border-b border-border/70 px-5 pb-4 pt-5 text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-[15px] font-semibold tracking-normal">
              A note from the developer
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-5 text-muted-foreground">
              I am trying to learn how Chroma Explorer fits into real workflows so I can
              make better product decisions.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 text-[13px] leading-5 text-foreground/85">
          <p>
            If the app is useful to you, I would love to hear what you use it for,
            what feels missing, and what would make it meaningfully better.
          </p>
          <p className="text-muted-foreground">
            You can also leave an email if you are open to a few follow-up questions
            or a short call. It is optional, and I will only use it to ask about your
            Chroma Explorer workflow.
          </p>
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
          <Button type="button" size="sm" onClick={handleOpenFeedback}>
            <ExternalLink className="h-3.5 w-3.5" />
            Open feedback form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
