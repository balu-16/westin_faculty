import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CalendarDays, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { TimetableCard } from '../../components/TimetableCard'
import { SectionCard } from '../../components/Card'
import { Skeleton, SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useApi } from '../../lib/api'
import { mapWeek, type ApiWeekDay } from '../../lib/mappers'
import { cx } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

export function FacultyTimetable() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const { data, error, loading, reload } = useApi<ApiWeekDay[]>(
    'faculty-portal.session',
    '/api/timetable/faculty/mine',
  )
  const week = data ? mapWeek(data) : []
  const initialLoading = loading && !data
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<number | undefined>(undefined)

  const schedule = week[activeIndex] ?? { day: 'Monday', classes: [] }

  const goToDay = (index: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }

  /** Sync the active tab with the swipe/scroll position once it settles. */
  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    window.clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      const index = Math.round(track.scrollLeft / track.clientWidth)
      setActiveIndex((prev) => (prev === index ? prev : index))
    }, 120)
  }

  return (
    <div className="space-y-6">
      <Header title="Timetable" subtitle="Your weekly teaching schedule." onMenuClick={openMenu} />

      {/* Day tabs */}
      <div
        role="tablist"
        aria-label="Select weekday"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-card scrollbar-thin"
      >
        {initialLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`day-${i}`} className="h-10 flex-1" />
            ))
          : week.map(({ day }, i) => {
          const active = i === activeIndex
          return (
            <button
              key={day}
              role="tab"
              aria-selected={active}
              onClick={() => goToDay(i)}
              className={cx(
                'flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                active
                  ? 'bg-primary text-white shadow-[0_4px_12px_rgba(59,167,242,0.35)]'
                  : 'text-ink-soft hover:bg-primary-light hover:text-primary-dark',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
      <SectionCard
        title={`${schedule.day}'s Classes`}
        icon={<CalendarDays size={18} className="text-primary" aria-hidden="true" />}
      >
        {initialLoading ? (
          <div role="status" aria-label="Loading timetable" className="min-h-[240px] space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[104px] shrink-0" />
                <Skeleton className="h-16 flex-1" />
              </div>
            ))}
          </div>
        ) : (
        <div
          ref={trackRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Weekly timetable, swipe to change day"
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl outline-none [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-scrollbar]:hidden"
        >
          {week.map(({ day, classes }) => (
            <div
              key={day}
              role="tabpanel"
              aria-label={`${day} classes`}
              className="w-full shrink-0 snap-start"
            >
              <ol className="relative">
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-[100px] top-2 w-px bg-line sm:left-[138px] lg:left-[148px]"
                />
                {classes.length > 0 ? (
                  classes.map((session) => <TimetableCard key={session.id} session={session} />)
                ) : (
                  <p className="py-8 text-center text-sm text-ink-soft">No classes on {day}.</p>
                )}
              </ol>
            </div>
          ))}
        </div>
        )}
      </SectionCard>

      {/* Sections for the selected day — derived from the same day's classes */}
      <SectionCard
        title={`${schedule.day}'s Sections`}
        icon={<Users size={18} className="text-primary" aria-hidden="true" />}
      >
        {initialLoading ? (
          <SkeletonRows rows={4} />
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="py-3 pr-4 font-semibold">Subject</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Section</th>
                <th scope="col" className="py-3 font-semibold">Room</th>
              </tr>
            </thead>
            <tbody>
              {schedule.classes.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
                >
                  <td className="py-3 pr-4 font-semibold text-ink">{session.subject}</td>
                  <td className="py-3 pr-4 text-ink-soft">{session.section}</td>
                  <td className="py-3 text-ink-soft">Room {session.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </SectionCard>
        </>
      )}
    </div>
  )
}
