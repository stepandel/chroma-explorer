import { useEffect } from 'react'
import { DeveloperMessageForm, DeveloperMessageIntro } from '../components/feedback/DeveloperMessageForm'

export function DeveloperMessageWindow() {
  useEffect(() => {
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    return () => {
      document.body.style.background = ''
      document.documentElement.style.background = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-popover text-popover-foreground">
      <div
        className="shrink-0 border-b border-border/70 px-5 pb-4 pt-9"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="space-y-1.5">
          <h1 className="text-[15px] font-semibold tracking-normal">Hi 👋</h1>
          <DeveloperMessageIntro />
        </div>
      </div>

      <DeveloperMessageForm />
    </div>
  )
}
