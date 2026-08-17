import { cx } from '../utils'

interface CampusIllustrationProps {
  /** 'sky' for light backgrounds, 'white' for the blue sidebar */
  tone?: 'sky' | 'white'
  className?: string
  showHeading?: boolean
  heading?: string
  subheading?: string
}

const palettes = {
  sky: {
    cloud: '#FFFFFF',
    cloudShade: '#EAF6FF',
    building: '#EAF6FF',
    buildingShade: '#D8ECFD',
    accent: '#93CDF7',
    strong: '#3BA7F2',
    window: '#B9DFFB',
    glass: '#D8ECFD',
    clockFace: '#FFFFFF',
    clockHand: '#168BE5',
    tree: '#A9D8F8',
    treeShade: '#7EC3F3',
    trunk: '#8FB8D9',
    ground: '#D8ECFD',
    path: '#FFFFFF',
    flag: '#3BA7F2',
    heading: 'text-ink',
    subheading: 'text-ink-soft',
  },
  white: {
    cloud: 'rgba(255,255,255,0.9)',
    cloudShade: 'rgba(255,255,255,0.55)',
    building: 'rgba(255,255,255,0.92)',
    buildingShade: 'rgba(255,255,255,0.6)',
    accent: 'rgba(255,255,255,0.75)',
    strong: 'rgba(255,255,255,0.95)',
    window: 'rgba(255,255,255,0.45)',
    glass: 'rgba(255,255,255,0.5)',
    clockFace: 'rgba(255,255,255,0.95)',
    clockHand: '#168BE5',
    tree: 'rgba(255,255,255,0.65)',
    treeShade: 'rgba(255,255,255,0.45)',
    trunk: 'rgba(255,255,255,0.55)',
    ground: 'rgba(255,255,255,0.35)',
    path: 'rgba(255,255,255,0.5)',
    flag: '#FFFFFF',
    heading: 'text-white',
    subheading: 'text-white/80',
  },
} as const

/**
 * Soft minimal vector illustration of a university campus:
 * central clock tower, symmetrical wings, trees and small clouds.
 */
export function CampusIllustration({
  tone = 'sky',
  className,
  showHeading = false,
  heading = 'Welcome Back!',
  subheading = 'Sign in to access your academic dashboard.',
}: CampusIllustrationProps) {
  const p = palettes[tone]

  return (
    <div className={cx('flex flex-col items-center', className)}>
      {showHeading && (
        <div className="mb-6 text-center">
          <h2 className={cx('text-3xl font-bold tracking-tight sm:text-4xl', p.heading)}>
            {heading}
          </h2>
          <p className={cx('mt-3 text-base sm:text-lg', p.subheading)}>{subheading}</p>
        </div>
      )}

      <svg
        viewBox="0 0 480 300"
        role="img"
        aria-label="Minimal illustration of a university campus with a clock tower, trees and clouds"
        className="h-auto w-full max-w-[420px]"
        fill="none"
      >
        {/* Clouds */}
        <g>
          <ellipse cx="80" cy="52" rx="26" ry="10" fill={p.cloud} />
          <ellipse cx="100" cy="44" rx="18" ry="9" fill={p.cloud} />
          <ellipse cx="396" cy="72" rx="24" ry="9" fill={p.cloudShade} />
          <ellipse cx="414" cy="65" rx="15" ry="8" fill={p.cloudShade} />
          <ellipse cx="330" cy="26" rx="16" ry="7" fill={p.cloud} opacity="0.8" />
        </g>

        {/* Ground */}
        <rect x="16" y="252" width="448" height="34" rx="17" fill={p.ground} />
        <path
          d="M214 258c8-4 44-4 52 0l40 28H174l40-28Z"
          fill={p.path}
          opacity="0.9"
        />

        {/* Clock tower */}
        <g>
          <rect x="216" y="58" width="48" height="196" rx="4" fill={p.building} />
          <rect x="216" y="58" width="48" height="196" rx="4" fill={p.buildingShade} opacity="0.35" />
          {/* Roof */}
          <path d="M208 60 240 30l32 30H208Z" fill={p.strong} />
          <rect x="238" y="16" width="4" height="16" rx="2" fill={p.strong} />
          <path d="M242 18c8-4 14-2 14-2s-2 8-14 8v-6Z" fill={p.flag} />
          {/* Clock */}
          <circle cx="240" cy="100" r="22" fill={p.clockFace} />
          <circle cx="240" cy="100" r="22" stroke={p.strong} strokeWidth="3" />
          <path
            d="M240 88v13l9 5"
            stroke={p.clockHand}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Tower windows */}
          <rect x="230" y="136" width="8" height="16" rx="4" fill={p.window} />
          <rect x="242" y="136" width="8" height="16" rx="4" fill={p.window} />
          <rect x="230" y="160" width="8" height="16" rx="4" fill={p.window} />
          <rect x="242" y="160" width="8" height="16" rx="4" fill={p.window} />
          {/* Tower door */}
          <path d="M231 254v-28a9 9 0 0 1 18 0v28h-18Z" fill={p.glass} />
          <path d="M231 254v-28a9 9 0 0 1 18 0v28" stroke={p.strong} strokeWidth="2.5" />
        </g>

        {/* Left wing */}
        <g>
          <rect x="88" y="150" width="128" height="104" rx="6" fill={p.building} />
          <path d="M80 152 152 118l72 34H80Z" fill={p.strong} opacity="0.9" />
          <rect x="96" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="120" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="144" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="168" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="192" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="96" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="120" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="144" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="168" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="192" y="212" width="14" height="24" rx="7" fill={p.window} />
        </g>

        {/* Right wing */}
        <g>
          <rect x="264" y="150" width="128" height="104" rx="6" fill={p.building} />
          <path d="M256 152 328 118l72 34H256Z" fill={p.strong} opacity="0.9" />
          <rect x="274" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="298" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="322" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="346" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="370" y="176" width="14" height="24" rx="7" fill={p.window} />
          <rect x="274" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="298" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="322" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="346" y="212" width="14" height="24" rx="7" fill={p.window} />
          <rect x="370" y="212" width="14" height="24" rx="7" fill={p.window} />
        </g>

        {/* Trees */}
        <g>
          <rect x="56" y="228" width="6" height="26" rx="3" fill={p.trunk} />
          <circle cx="59" cy="216" r="16" fill={p.tree} />
          <circle cx="46" cy="226" r="11" fill={p.treeShade} />
          <circle cx="72" cy="226" r="11" fill={p.tree} />
          <rect x="418" y="228" width="6" height="26" rx="3" fill={p.trunk} />
          <circle cx="421" cy="216" r="16" fill={p.tree} />
          <circle cx="408" cy="226" r="11" fill={p.treeShade} />
          <circle cx="434" cy="226" r="11" fill={p.tree} />
          <rect x="246" y="236" width="5" height="18" rx="2.5" fill={p.trunk} />
          <circle cx="248.5" cy="228" r="10" fill={p.tree} />
        </g>

        {/* Bushes along the facade */}
        <g fill={p.treeShade}>
          <circle cx="120" cy="256" r="8" />
          <circle cx="182" cy="256" r="8" />
          <circle cx="298" cy="256" r="8" />
          <circle cx="360" cy="256" r="8" />
        </g>
      </svg>
    </div>
  )
}
