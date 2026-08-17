import { cx, initials } from '../utils'

interface AvatarProps {
  name: string
  className?: string
  tone?: 'primary' | 'success' | 'warning'
}

const tones = {
  primary: 'bg-primary-light text-primary-dark',
  success: 'bg-[#DCFCE7] text-[#15803D]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
}

/** Circular initials avatar used in tables and lists. */
export function Avatar({ name, className, tone = 'primary' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
