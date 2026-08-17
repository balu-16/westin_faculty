import { LogOut, User } from 'lucide-react'

interface ProfileCardProps {
  name: string
  detail: string
  onLogout: () => void
}

/** Sidebar footer card — shows the signed-in user and a logout action. */
export function ProfileCard({ name, detail, onLogout }: ProfileCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_6px_18px_rgba(20,33,61,0.08)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark">
          <User size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-soft">{detail}</p>
        </div>
      </div>
      <div className="my-3 h-px bg-line" />
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-lighter px-3 py-2.5 text-sm font-semibold text-primary-dark transition-colors duration-200 hover:bg-primary hover:text-white"
      >
        <LogOut size={16} aria-hidden="true" />
        Log out
      </button>
    </div>
  )
}
