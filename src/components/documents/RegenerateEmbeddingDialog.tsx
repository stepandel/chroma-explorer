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
        {/* Subtle overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[280px] rounded-2xl",
            "bg-background/70 backdrop-blur-2xl backdrop-saturate-150",
            "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset]",
            "ring-1 ring-white/10",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Content */}
          <div className="px-5 pt-6 pb-5 text-center">
            <DialogPrimitive.Title className="text-[13px] font-semibold text-foreground tracking-tight">
              Update Embedding?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2.5 text-[12px] text-muted-foreground/90 leading-[1.5]">
              You have modified the document text. Would you like to regenerate the embedding vector?
            </DialogPrimitive.Description>
          </div>

          {/* Buttons - stacked with glass dividers */}
          <div className="border-t border-white/10">
            <button
              onClick={() => onConfirm(true)}
              disabled={isLoading}
              className={cn(
                "w-full py-2.5 text-[13px] font-medium",
                "text-[#007AFF]",
                "border-b border-white/10",
                "transition-colors duration-100",
                "hover:bg-white/5 active:bg-white/10",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "focus:outline-none focus-visible:bg-white/5"
              )}
            >
              {isLoading ? 'Updating...' : 'Regenerate'}
            </button>
            <button
              onClick={() => onConfirm(false)}
              disabled={isLoading}
              className={cn(
                "w-full py-2.5 text-[13px] text-foreground/90",
                "transition-colors duration-100",
                "hover:bg-white/5 active:bg-white/10",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "focus:outline-none focus-visible:bg-white/5",
                "rounded-b-2xl"
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
