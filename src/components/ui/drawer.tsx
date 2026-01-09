"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

// Context to pass side prop to nested components
const DrawerContext = React.createContext<{ side: 'left' | 'right' }>({ side: 'right' })

interface DrawerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  side?: 'left' | 'right'
}

const Drawer = ({ side = 'right', ...props }: DrawerProps) => (
  <DrawerContext.Provider value={{ side }}>
    <DialogPrimitive.Root {...props} />
  </DrawerContext.Provider>
)

const DrawerTrigger = DialogPrimitive.Trigger

const DrawerPortal = DialogPrimitive.Portal

const DrawerClose = DialogPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { side } = React.useContext(DrawerContext)

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 h-full flex flex-col bg-background shadow-xl duration-300",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          side === 'right' && [
            "right-0 top-0",
            "w-[600px] max-w-[90vw]",
            "border-l border-border",
            "data-[state=open]:slide-in-from-right",
            "data-[state=closed]:slide-out-to-right"
          ],
          side === 'left' && [
            "left-0 top-0",
            "w-[280px] max-w-[90vw]",
            "border-r border-border",
            "data-[state=open]:slide-in-from-left",
            "data-[state=closed]:slide-out-to-left"
          ],
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = DialogPrimitive.Content.displayName

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10",
      className
    )}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto px-6 py-4",
      className
    )}
    {...props}
  />
)
DrawerBody.displayName = "DrawerBody"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-4 border-t border-border",
      className
    )}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DialogPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DialogPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
