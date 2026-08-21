import type { ClassSession } from '../types'
import { cx, statusLabels } from '../utils'

interface TimetableCardProps {
  session: ClassSession
}

const statusStyles = {
  completed: 'text-success',
  'in-progress': 'text-primary-dark',
  upcoming: 'text-ink-soft',
}

const dotStyles = {
  completed: 'bg-success border-success/30',
  'in-progress': 'bg-primary border-primary/30 ring-4 ring-primary/15',
  upcoming: 'bg-line border-line',
}

/**
 * One row of the vertical timetable timeline. A connecting line is drawn
 * by the parent; the dot sits on it.
 */
export function TimetableCard({ session }: TimetableCardProps) {
  const active = session.status === 'in-progress'

  return (
    <li className="relative flex gap-2 pb-6 last:pb-0 sm:gap-4">
      <div className="flex w-[84px] shrink-0 flex-col pt-1 sm:w-[118px] lg:w-[128px]">
        <span className="text-xs font-semibold text-ink sm:text-sm">{session.startTime}</span>
        <span className="text-[11px] text-ink-soft sm:text-xs">– {session.endTime}</span>
      </div>

      <span
        aria-hidden="true"
        className={cx(
          'absolute left-[100px] top-2 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 sm:left-[138px] sm:h-3.5 sm:w-3.5 lg:left-[148px]',
          dotStyles[session.status],
        )}
      />

      <div
        className={cx(
          'ml-4 min-w-0 flex-1 rounded-2xl border p-3 transition-colors duration-200 sm:ml-6 sm:p-4 lg:ml-7',
          active
            ? 'border-primary/30 bg-primary-lighter'
            : 'border-line bg-white hover:border-primary/30',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h4 className="truncate font-semibold text-ink">{session.subject}</h4>
            <p className="mt-0.5 text-xs text-ink-soft">
              {session.section} • Room {session.room}
            </p>
          </div>
          <span className={cx('text-xs font-semibold', statusStyles[session.status])}>
            {statusLabels[session.status]}
          </span>
        </div>
      </div>
    </li>
  )
}
