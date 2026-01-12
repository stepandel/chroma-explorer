import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

const inputStyle = { boxShadow: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)' }

interface DeleteCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionName: string
  documentCount: number
  onConfirm: () => void
  isDeleting: boolean
}

export function DeleteCollectionDialog({
  open,
  onOpenChange,
  collectionName,
  documentCount,
  onConfirm,
  isDeleting,
}: DeleteCollectionDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmInput('')
    }
  }, [open])

  const isConfirmValid = confirmInput === collectionName

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Collection</DialogTitle>
          <DialogDescription className="text-sm">
            This action cannot be undone. This will permanently delete the collection
            <strong className="text-foreground"> {collectionName}</strong> and all{' '}
            <strong className="text-foreground">{documentCount} document{documentCount !== 1 ? 's' : ''}</strong> within it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-[11px] font-medium text-muted-foreground">
            Type <span className="font-mono text-foreground">{collectionName}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={collectionName}
            className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            style={inputStyle}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isConfirmValid) {
                handleConfirm()
              }
            }}
          />
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-8 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            style={inputStyle}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="h-8 px-3 text-sm rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Collection'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
