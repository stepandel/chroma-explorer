import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface RegenerateEmbeddingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (regenerate: boolean) => void
  isLoading: boolean
}

export function RegenerateEmbeddingDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RegenerateEmbeddingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Embedding?</DialogTitle>
          <DialogDescription>
            You have modified the document text. Would you like to regenerate the
            embedding vector to match the new content?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            disabled={isLoading}
          >
            Keep Current Embedding
          </Button>
          <Button onClick={() => onConfirm(true)} disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Regenerate Embedding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
