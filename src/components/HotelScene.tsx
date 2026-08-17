import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../utils'

/**
 * Westin College of Hotel & Business Management themed scene for the
 * login page. Hotel facade (clock tower kept, entrance gains an awning)
 * in the same white tone-on-tone style as the campus illustration, with
 * hospitality/business line-art icons floating around it.
 */

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/* ---------- Hospitality / business line-art icons ---------- */

export function ConciergeBellIcon(props: { size?: number; className?: string }) {
  const { size = 30, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M4.5 16.5a7.5 7.5 0 0 1 15 0" />
      <path d="M3 16.5h18" />
      <path d="M12 9v-2" />
      <circle cx="12" cy="6" r="1.1" />
    </svg>
  )
}

export function LuggageCartIcon(props: { size?: number; className?: string }) {
  const { size = 34, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M4 4.5V17h14" />
      <circle cx="7.5" cy="19.5" r="1.7" />
      <circle cx="15" cy="19.5" r="1.7" />
      <rect x="6.5" y="7.5" width="8" height="6" rx="1.2" />
      <path d="M9.5 7.5V6a1.5 1.5 0 0 1 3 0v1.5" />
    </svg>
  )
}

export function SuitcaseIcon(props: { size?: number; className?: string }) {
  const { size = 26, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <rect x="5" y="7.5" width="14" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 6 0v1.5" />
      <path d="M12 11v2.5" />
    </svg>
  )
}

export function ChefHatIcon(props: { size?: number; className?: string }) {
  const { size = 30, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M6.2 11.4a3.1 3.1 0 0 1 .6-6A4.4 4.4 0 0 1 12 3.2a4.4 4.4 0 0 1 5.2 2.2 3.1 3.1 0 0 1 .6 6V16H6.2v-4.6Z" />
      <path d="M6.2 18.5h11.6" />
    </svg>
  )
}

export function RoomServiceIcon(props: { size?: number; className?: string }) {
  const { size = 28, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M3.5 17.5h17" />
      <path d="M5 17.5a7 7 0 0 1 14 0" />
      <path d="M12 10.5V9" />
      <circle cx="12" cy="7.9" r=".9" />
    </svg>
  )
}

export function BriefcaseIcon(props: { size?: number; className?: string }) {
  const { size = 30, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
      <path d="M4 12.7h16" />
      <rect x="10.6" y="11.2" width="2.8" height="2.8" rx=".5" />
    </svg>
  )
}

export function GrowthChartIcon(props: { size?: number; className?: string }) {
  const { size = 28, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M4 4.5v15h16" />
      <path d="M6.5 15.5l4-4.2 3 2.6 5.3-6.4" />
      <path d="M15 7.5h3.8v3.8" />
    </svg>
  )
}

export function CoffeeCupIcon(props: { size?: number; className?: string }) {
  const { size = 26, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
      <path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 5c0-1 .8-1 .8-2M11.5 5c0-1 .8-1 .8-2" />
    </svg>
  )
}

export function KeyCardIcon(props: { size?: number; className?: string }) {
  const { size = 24, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="8.5" cy="12" r="1.6" />
      <path d="M11.5 10.5h6M11.5 13.5h4" />
    </svg>
  )
}

export function HandshakeIcon(props: { size?: number; className?: string }) {
  const { size = 30, className } = props
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps} className={className} aria-hidden="true">
      <path d="M2.5 11.5l4.5-4 3.2 2.5" />
      <path d="M21.5 11.5l-4.5-4-3.2 2.5" />
      <path d="M7 11.5l3 3 2-1.6 2 1.6 3-3" />
    </svg>
  )
}

/* ---------- Falling icon layer (fall → settle → clear cycle) ---------- */

/** One full accumulate-and-clear cycle; icons fade out in the final stretch. */
const CYCLE_MS = 18000
const FADE_MS = 1200

interface FallSpec {
  Icon: (props: { size?: number; className?: string }) => ReactNode
  /** horizontal position across the panel, in % */
  left: number
  /** px — bigger reads closer */
  size: number
  /** seconds from the top to the landing spot; bigger/slower = closer */
  duration: number
  /** negative delay so icons are mid-fall on first paint */
  delay: number
  swayDuration: number
  swayDelay: number
  /** stroke tone — fainter reads further back */
  tone: string
  /** landing height for the icon's top edge, in vh — scattered through the bottom ~20% of the panel */
  settleY: number
  /** horizontal landing jitter in px, so the pile reads organic */
  settleX: number
}

const fallSpecs: FallSpec[] = [
  { Icon: LuggageCartIcon, left: 6, size: 36, duration: 10.5, delay: -2, swayDuration: 4.2, swayDelay: 0, tone: 'rgba(255,255,255,0.8)', settleY: 78, settleX: 22 },
  { Icon: ConciergeBellIcon, left: 14, size: 22, duration: 7.5, delay: -4, swayDuration: 3.2, swayDelay: -1, tone: 'rgba(255,255,255,0.45)', settleY: 88, settleX: -14 },
  { Icon: ChefHatIcon, left: 22, size: 32, duration: 9.5, delay: -6, swayDuration: 4.6, swayDelay: -2, tone: 'rgba(255,255,255,0.7)', settleY: 82, settleX: 10 },
  { Icon: BriefcaseIcon, left: 31, size: 38, duration: 11.5, delay: -3, swayDuration: 5, swayDelay: -0.5, tone: 'rgba(255,255,255,0.8)', settleY: 74, settleX: -20 },
  { Icon: GrowthChartIcon, left: 39, size: 20, duration: 7, delay: -2, swayDuration: 3, swayDelay: -1.4, tone: 'rgba(255,255,255,0.4)', settleY: 91, settleX: 16 },
  { Icon: CoffeeCupIcon, left: 47, size: 26, duration: 8.5, delay: -5, swayDuration: 3.8, swayDelay: -0.8, tone: 'rgba(255,255,255,0.55)', settleY: 85, settleX: -8 },
  { Icon: KeyCardIcon, left: 55, size: 19, duration: 6.5, delay: -3, swayDuration: 2.9, swayDelay: -1.9, tone: 'rgba(255,255,255,0.4)', settleY: 76, settleX: 24 },
  { Icon: SuitcaseIcon, left: 63, size: 30, duration: 10, delay: -1.5, swayDuration: 4.4, swayDelay: -2.4, tone: 'rgba(255,255,255,0.7)', settleY: 80, settleX: -18 },
  { Icon: RoomServiceIcon, left: 70, size: 22, duration: 7.5, delay: -4, swayDuration: 3.4, swayDelay: -0.3, tone: 'rgba(255,255,255,0.5)', settleY: 89, settleX: 12 },
  { Icon: HandshakeIcon, left: 78, size: 34, duration: 11, delay: -5, swayDuration: 4.8, swayDelay: -1.6, tone: 'rgba(255,255,255,0.75)', settleY: 77, settleX: -22 },
  { Icon: ConciergeBellIcon, left: 85, size: 28, duration: 9, delay: -6, swayDuration: 4, swayDelay: -2.8, tone: 'rgba(255,255,255,0.6)', settleY: 84, settleX: 8 },
  { Icon: GrowthChartIcon, left: 91, size: 24, duration: 8, delay: -2, swayDuration: 3.6, swayDelay: -1.1, tone: 'rgba(255,255,255,0.55)', settleY: 90, settleX: -10 },
  { Icon: CoffeeCupIcon, left: 10, size: 18, duration: 7, delay: -4.5, swayDuration: 3.1, swayDelay: -0.6, tone: 'rgba(255,255,255,0.38)', settleY: 93, settleX: 18 },
  { Icon: KeyCardIcon, left: 59, size: 26, duration: 9.5, delay: -6, swayDuration: 4.1, swayDelay: -2.2, tone: 'rgba(255,255,255,0.62)', settleY: 79, settleX: -16 },
]

/**
 * Ambient "fall and settle" loop, like snow accumulating on the ground.
 * Each icon is two nested animations: outer = vertical fall that ends at
 * a per-icon landing spot in the bottom fifth of the panel (linear, then
 * held via fill-mode forwards), inner = horizontal sway with a slight
 * rotation (ease-in-out alternate) that stops once the icon has landed,
 * freezing it at a natural tilt. Every CYCLE_MS the settled icons fade
 * out together and the layer remounts, restarting the fall from the top.
 */
export function FallingIcons() {
  const [cycle, setCycle] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeAt = window.setTimeout(() => setFading(true), CYCLE_MS - FADE_MS)
    const resetAt = window.setTimeout(() => {
      setCycle((c) => c + 1)
      setFading(false)
    }, CYCLE_MS)
    return () => {
      window.clearTimeout(fadeAt)
      window.clearTimeout(resetAt)
    }
  }, [cycle])

  return (
    <div
      className={cx(
        'pointer-events-none absolute inset-0 overflow-hidden transition-opacity ease-linear',
        fading ? 'opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      {fallSpecs.map(
        ({ Icon, left, size, duration, delay, swayDuration, swayDelay, tone, settleY, settleX }, i) => (
          <div
            key={`${cycle}-${i}`}
            className="absolute top-0 animate-fall-settle"
            style={
              {
                left: `${left}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                '--settle-y': `${settleY}vh`,
                '--settle-x': `${settleX}px`,
              } as CSSProperties
            }
          >
            <div
              className="animate-sway"
              style={{
                animationDuration: `${swayDuration}s`,
                animationDelay: `${swayDelay}s`,
                // Stop swaying around when the icon lands; forwards keeps the final tilt
                animationIterationCount: Math.max(1, Math.floor(duration / swayDuration)),
                animationFillMode: 'forwards',
                color: tone,
              }}
            >
              <Icon size={size} className="shrink-0" />
            </div>
          </div>
        ),
      )}
    </div>
  )
}

/* ---------- Scene ---------- */

export function HotelScene({ className }: { className?: string }) {
  return (
    <div className={cx('relative mx-auto w-full max-w-[460px]', className)}>
      {/* Hotel facade — white tone-on-tone, awning entrance, clock tower */}
      <svg
        viewBox="0 0 480 320"
        role="img"
        aria-label="Illustration of the Westin College hotel facade with clock tower, entrance awning and trees"
        className="h-auto w-full"
        fill="none"
      >
        {/* Drifting clouds */}
        <g className="animate-drift">
          <ellipse cx="86" cy="52" rx="26" ry="10" fill="rgba(255,255,255,0.55)" />
          <ellipse cx="104" cy="45" rx="17" ry="8" fill="rgba(255,255,255,0.55)" />
        </g>
        <g className="animate-drift" style={{ animationDuration: '28s', animationDelay: '-9s' }}>
          <ellipse cx="392" cy="70" rx="23" ry="9" fill="rgba(255,255,255,0.4)" />
          <ellipse cx="408" cy="64" rx="14" ry="7" fill="rgba(255,255,255,0.4)" />
        </g>
        <g className="animate-drift" style={{ animationDuration: '34s', animationDelay: '-20s' }}>
          <ellipse cx="318" cy="24" rx="15" ry="6.5" fill="rgba(255,255,255,0.5)" />
        </g>

        {/* Ground */}
        <rect x="16" y="272" width="448" height="34" rx="17" fill="rgba(255,255,255,0.35)" />
        <path d="M212 278c8-4 48-4 56 0l46 28H166l46-28Z" fill="rgba(255,255,255,0.5)" />

        {/* Clock tower */}
        <rect x="206" y="62" width="68" height="210" rx="4" fill="rgba(255,255,255,0.92)" />
        <rect x="206" y="62" width="68" height="210" rx="4" fill="rgba(255,255,255,0.35)" opacity="0.5" />
        <path d="M198 64 240 30l42 34H198Z" fill="rgba(255,255,255,0.95)" />
        <rect x="238" y="16" width="4" height="15" rx="2" fill="rgba(255,255,255,0.95)" />
        <path d="M242 18c9-4 15-2 15-2s-2 9-15 9v-7Z" fill="#fff" />
        <circle cx="240" cy="104" r="21" fill="#fff" />
        <circle cx="240" cy="104" r="21" stroke="rgba(255,255,255,0.95)" strokeWidth="3" />
        <path
          d="M240 93v12l8 4.5"
          stroke="#168BE5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tower windows */}
        <rect x="220" y="138" width="9" height="16" rx="4.5" fill="rgba(255,255,255,0.45)" />
        <rect x="236" y="138" width="9" height="16" rx="4.5" fill="rgba(255,255,255,0.45)" />
        <rect x="252" y="138" width="9" height="16" rx="4.5" fill="rgba(255,255,255,0.45)" />
        <rect x="220" y="162" width="9" height="16" rx="4.5" fill="rgba(255,255,255,0.45)" />
        <rect x="236" y="162" width="9" height="16" rx="4.5" fill="rgba(255,255,255,0.45)" />
        <rect x="252" y="162" width="9" height="16" rx="4.5" fill="rgba(255,255,255,0.45)" />

        {/* Entrance: doors + scalloped awning */}
        <path d="M222 272v-30a18 18 0 0 1 36 0v30h-36Z" fill="rgba(255,255,255,0.5)" />
        <path d="M222 272v-30a18 18 0 0 1 36 0v30" stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" />
        <path d="M204 216h72l8 13H196l8-13Z" fill="rgba(255,255,255,0.95)" />
        <g fill="rgba(255,255,255,0.95)">
          <circle cx="204" cy="231" r="4" />
          <circle cx="216" cy="231" r="4" />
          <circle cx="228" cy="231" r="4" />
          <circle cx="240" cy="231" r="4" />
          <circle cx="252" cy="231" r="4" />
          <circle cx="264" cy="231" r="4" />
          <circle cx="276" cy="231" r="4" />
        </g>

        {/* Facade wings */}
        <rect x="82" y="160" width="124" height="112" rx="6" fill="rgba(255,255,255,0.92)" />
        <path d="M74 162 144 128l70 34H74Z" fill="rgba(255,255,255,0.95)" />
        <rect x="274" y="160" width="124" height="112" rx="6" fill="rgba(255,255,255,0.92)" />
        <path d="M266 162 336 128l70 34H266Z" fill="rgba(255,255,255,0.95)" />
        <g fill="rgba(255,255,255,0.45)">
          <rect x="96" y="184" width="13" height="22" rx="6.5" />
          <rect x="120" y="184" width="13" height="22" rx="6.5" />
          <rect x="144" y="184" width="13" height="22" rx="6.5" />
          <rect x="168" y="184" width="13" height="22" rx="6.5" />
          <rect x="96" y="220" width="13" height="22" rx="6.5" />
          <rect x="120" y="220" width="13" height="22" rx="6.5" />
          <rect x="144" y="220" width="13" height="22" rx="6.5" />
          <rect x="168" y="220" width="13" height="22" rx="6.5" />
          <rect x="288" y="184" width="13" height="22" rx="6.5" />
          <rect x="312" y="184" width="13" height="22" rx="6.5" />
          <rect x="336" y="184" width="13" height="22" rx="6.5" />
          <rect x="360" y="184" width="13" height="22" rx="6.5" />
          <rect x="288" y="220" width="13" height="22" rx="6.5" />
          <rect x="312" y="220" width="13" height="22" rx="6.5" />
          <rect x="336" y="220" width="13" height="22" rx="6.5" />
          <rect x="360" y="220" width="13" height="22" rx="6.5" />
        </g>

        {/* Trees */}
        <g>
          <rect x="52" y="248" width="6" height="24" rx="3" fill="rgba(255,255,255,0.55)" />
          <circle cx="55" cy="236" r="15" fill="rgba(255,255,255,0.65)" />
          <circle cx="42" cy="246" r="10" fill="rgba(255,255,255,0.45)" />
          <circle cx="68" cy="246" r="10" fill="rgba(255,255,255,0.65)" />
          <rect x="422" y="248" width="6" height="24" rx="3" fill="rgba(255,255,255,0.55)" />
          <circle cx="425" cy="236" r="15" fill="rgba(255,255,255,0.65)" />
          <circle cx="412" cy="246" r="10" fill="rgba(255,255,255,0.45)" />
          <circle cx="438" cy="246" r="10" fill="rgba(255,255,255,0.65)" />
        </g>

        {/* Bushes */}
        <g fill="rgba(255,255,255,0.45)">
          <circle cx="116" cy="276" r="8" />
          <circle cx="180" cy="276" r="8" />
          <circle cx="300" cy="276" r="8" />
          <circle cx="364" cy="276" r="8" />
        </g>
      </svg>
    </div>
  )
}
