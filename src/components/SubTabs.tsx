import { cx } from '../utils'

export interface SubTab {
  id: string
  label: string
}

interface SubTabsProps {
  tabs: SubTab[]
  active: string
  onChange: (_id: string) => void
  'aria-label'?: string
}

/** In-page tab switcher — same pill style as the timetable day tabs. */
export function SubTabs({ tabs, active, onChange, ...rest }: SubTabsProps) {
  return (
    <div
      role="tablist"
      className="flex w-fit gap-2 rounded-2xl border border-line bg-white p-2 shadow-card"
      {...rest}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cx(
              'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary text-white shadow-[0_4px_12px_rgba(59,167,242,0.35)]'
                : 'text-ink-soft hover:bg-primary-light hover:text-primary-dark',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
