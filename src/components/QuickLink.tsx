import { Link } from 'react-router-dom'
import { Bell, BookOpen, CalendarDays, CalendarClock, ClipboardList, ChevronRight, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { QuickLinkItem } from '../types'

const iconMap: Record<QuickLinkItem['icon'], LucideIcon> = {
  book: BookOpen,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  bell: Bell,
  file: FileText,
  clock: CalendarClock,
}

export function QuickLink({ item }: { item: QuickLinkItem }) {
  const Icon = iconMap[item.icon]
  return (
    <Link
      to={item.to}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm font-semibold text-ink">{item.label}</span>
      <ChevronRight
        size={16}
        className="text-ink-soft/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  )
}
