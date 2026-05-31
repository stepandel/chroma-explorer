/** Shared form control styles */
export const formStyles = {
  /** Standard input - 24px height, 11px text */
  input: "h-6 text-[11px] py-0 px-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/50",

  /** Input with border (for metadata editors) */
  inputBordered: "w-full h-6 text-[11px] px-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",

  /** Select dropdown */
  select: "h-6 text-[11px] px-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-ring/50",

  /** Standard button */
  button: "h-6 px-2 text-[11px] rounded-md bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]",

  /** Icon button (24x24) */
  iconButton: "h-6 w-6 p-0 text-[11px] rounded-md bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]",

  /** Sidebar input variant */
  inputSidebar: "w-full h-6 text-[11px] py-0 px-1.5 pr-5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] placeholder:text-sidebar-foreground/50 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring/50 transition-colors",

  /** Inset shadow for inputs */
  inputShadow: { boxShadow: 'inset 0 0.5px 1px 0 rgb(0 0 0 / 0.03)' } as const,
} as const
