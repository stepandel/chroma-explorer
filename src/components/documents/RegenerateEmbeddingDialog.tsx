import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Lighter overlay like macOS */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[260px] rounded-xl bg-popover/95 backdrop-blur-xl shadow-2xl",
            "border border-border/50",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Content */}
          <div className="px-4 pt-5 pb-4 text-center">
            <DialogPrimitive.Title className="text-[13px] font-semibold text-foreground">
              Update Embedding?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              You have modified the document text. Would you like to regenerate the embedding vector?
            </DialogPrimitive.Description>
          </div>

          {/* Buttons - stacked like macOS */}
          <div className="border-t border-border/50">
            <button
              onClick={() => onConfirm(true)}
              disabled={isLoading}
              className={cn(
                "w-full py-2 text-[13px] font-medium text-blue-500",
                "border-b border-border/50",
                "hover:bg-accent/50 active:bg-accent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:bg-accent/50"
              )}
            >
              {isLoading ? 'Updating...' : 'Regenerate'}
            </button>
            <button
              onClick={() => onConfirm(false)}
              disabled={isLoading}
              className={cn(
                "w-full py-2 text-[13px] text-foreground",
                "hover:bg-accent/50 active:bg-accent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:bg-accent/50",
                "rounded-b-xl"
              )}
            >
              Keep Current
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
