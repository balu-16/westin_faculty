import { ChevronRight, LogOut } from 'lucide-react'
import { Avatar } from './Avatar'

interface ProfileCardProps {
  name: string
  detail: string
  avatarUrl?: string | null
  collapsed?: boolean
  onLogout: () => void
}

/** Sidebar footer card — shows the signed-in user and a logout action. */
export function ProfileCard({ name, detail, avatarUrl, collapsed, onLogout }: ProfileCardProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
        <Avatar name={name} src={avatarUrl ?? null} size="sm" />
        <span className="h-px w-full bg-line" aria-hidden="true" />
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#0F1F3A] transition-colors hover:bg-[#0F1F3A] hover:text-white"
        >
          <LogOut size={14} aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.24)] ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar name={name} src={avatarUrl ?? null} size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-ink">{name}</p>
          <p className="truncate text-[11px] font-medium leading-tight text-ink-soft">{detail}</p>
        </div>
        <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#0F1F3A] sm:flex">
          <ChevronRight size={14} aria-hidden="true" />
        </span>
      </div>
      <div className="my-3 h-px bg-line" />
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-[#EEF2FF] px-3 py-2.5 text-[13px] font-semibold text-[#0F1F3A] transition-all duration-200 hover:border-[#0F1F3A]/10 hover:bg-[#0F1F3A] hover:text-white hover:shadow-[0_4px_12px_rgba(15,31,58,0.25)]"
      >
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}
