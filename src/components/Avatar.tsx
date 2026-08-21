import { useState } from 'react'
import { cx, initials } from '../utils'

interface AvatarProps {
  name: string
  src?: string | null
  className?: string
  tone?: 'primary' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}

const tones = {
  primary: 'bg-primary-light text-primary-dark',
  success: 'bg-[#DCFCE7] text-[#15803D]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-20 w-20 text-base',
}

/** Circular avatar — shows image if src is provided, else initials. */
export function Avatar({ name, src, className, tone = 'primary', size = 'sm' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} avatar`}
        onError={() => setFailed(true)}
        className={cx('shrink-0 rounded-full object-cover', sizeMap[size], className)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        tones[tone],
        sizeMap[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
