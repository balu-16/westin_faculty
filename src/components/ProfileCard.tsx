import { LogOut } from 'lucide-react'
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
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-2 shadow-[0_6px_18px_rgba(20,33,61,0.08)]">
        <Avatar name={name} src={avatarUrl ?? null} size="sm" />
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-lighter text-primary-dark transition-colors hover:bg-primary hover:text-white"
        >
          <LogOut size={14} aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-white p-3 shadow-[0_6px_18px_rgba(20,33,61,0.08)]">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} src={avatarUrl ?? null} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{name}</p>
          <p className="truncate text-[11px] text-ink-soft">{detail}</p>
        </div>
      </div>
      <div className="my-2 h-px bg-line" />
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-lighter px-3 py-1.5 text-xs font-semibold text-primary-dark transition-colors duration-200 hover:bg-primary hover:text-white"
      >
        <LogOut size={14} aria-hidden="true" />
        Log out
      </button>
    </div>
  )
}
