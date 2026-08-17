import type { Announcement } from '../types'

interface AnnouncementCardProps {
  announcement: Announcement
  isLast?: boolean
}

export function AnnouncementCard({ announcement, isLast = false }: AnnouncementCardProps) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute left-[5px] top-4 z-10 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15"
      />
      <div className="ml-7 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h4 className="font-semibold text-ink">{announcement.title}</h4>
          <time className="text-xs font-medium text-ink-soft">{announcement.date}</time>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{announcement.message}</p>
      </div>
      {isLast ? null : (
        <span aria-hidden="true" className="absolute -bottom-3 left-2 h-1.5 w-px bg-line" />
      )}
    </li>
  )
}
