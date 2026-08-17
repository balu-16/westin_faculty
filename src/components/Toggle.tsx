import { cx } from '../utils'

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (_value: boolean) => void
}

/**
 * Single reusable pill switch used across the portal.
 * Track: 44x24 fully-rounded pill. Knob: 20px white circle,
 * vertically centred, 2px from either edge, subtle shadow.
 */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out',
          checked ? 'bg-primary' : 'bg-[#E5E7EB]',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white',
            'shadow-[0_1px_3px_rgba(20,33,61,0.25)] transition-transform duration-200 ease-out',
            checked ? 'translate-x-[20px]' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}
