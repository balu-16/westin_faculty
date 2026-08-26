import type { CSSProperties } from 'react'

/**
 * StudentWalkingLoader — the Westin "walking student" loading state.
 *
 * One inline SVG + pure-CSS walk cycle (no JS animation loop, no assets).
 * The student walks in place while the ground scrolls left, so the figure
 * stays centered at any size. Respects prefers-reduced-motion (freezes to a
 * standing pose). Brand palette: #3BA7F2 shirt, #F59E0B bag, #14213D hair.
 *
 * Usage:
 *   <StudentWalkingLoader size={120} label="Loading your dashboard" />
 *   <StudentWalkingLoader size={96} dark sublabel="This takes a moment" />
 */

export interface StudentWalkingLoaderProps {
  /** Rendered width in px (height follows the 220:200 viewBox ratio). Default 120. */
  size?: number
  /** Primary line under the figure. Default "Loading". Pass null to hide. */
  label?: string | null
  /** Optional smaller second line under the label. */
  sublabel?: string
  /** Dark-surface variant: recolors ground, shoes and label for ink backgrounds. */
  dark?: boolean
  className?: string
  style?: CSSProperties
}

/** Namespaced styles — safe to mount multiple times (identical duplicates are inert). */
const CSS = `
.swl{--swl-skin:#f5c39b;--swl-skin-d:#edb488;--swl-hair:#14213d;--swl-shirt:#3ba7f2;--swl-sleeve:#168be5;
  --swl-pants:#23365f;--swl-pants-b:#1b2b4d;--swl-pack:#f59e0b;--swl-pack-d:#d97706;
  --swl-ground:#e5edf5;--swl-dash:#c9ddf2;--swl-shoe-edge:#d6e4f2;--swl-text:#52627a;
  display:inline-flex;flex-direction:column;align-items:center;gap:2px}
.swl > svg{display:block;overflow:visible}
.swl-label{display:inline-flex;align-items:baseline;gap:3px;font-weight:600;color:var(--swl-text);font-size:14px;letter-spacing:.01em}
.swl-sub{font-size:12px;font-weight:500;color:var(--swl-text);opacity:.75}
.swl-dot{width:4px;height:4px;border-radius:50%;background:currentColor;opacity:.45;align-self:center;animation:swl-dot 1.2s ease-in-out infinite}
.swl-dot:nth-child(2){animation-delay:.15s}
.swl-dot:nth-child(3){animation-delay:.3s}
.swl-walker{animation:swl-bob .45s ease-in-out infinite alternate}
.swl-thigh-f{transform-origin:106px 117px;animation:swl-thigh .9s ease-in-out infinite}
.swl-thigh-b{transform-origin:106px 117px;animation:swl-thigh .9s ease-in-out infinite;animation-delay:-.45s}
.swl-shin-f{transform-origin:106px 142px;animation:swl-shin .9s ease-in-out infinite}
.swl-shin-b{transform-origin:106px 142px;animation:swl-shin .9s ease-in-out infinite;animation-delay:-.45s}
.swl-arm-f{transform-origin:111px 88px;animation:swl-arm .9s ease-in-out infinite;animation-delay:.05s}
.swl-fore-f{transform-origin:109px 106px;animation:swl-fore .9s ease-in-out infinite;animation-delay:.08s}
.swl-head{transform-origin:113px 82px;animation:swl-head .9s ease-in-out infinite}
.swl-dashes{animation:swl-scroll .65s linear infinite}
.swl-puff{transform-box:fill-box;transform-origin:center;animation:swl-puff .9s ease-out infinite}
.swl-puff2{animation-delay:-.45s}
@keyframes swl-bob{from{transform:translateY(0)}to{transform:translateY(-2px)}}
@keyframes swl-thigh{0%{transform:rotate(-28deg)}50%{transform:rotate(2deg)}62%{transform:rotate(26deg)}100%{transform:rotate(-28deg)}}
@keyframes swl-shin{0%{transform:rotate(2deg)}45%{transform:rotate(6deg)}62%{transform:rotate(14deg)}80%{transform:rotate(58deg)}100%{transform:rotate(2deg)}}
@keyframes swl-arm{0%,100%{transform:rotate(22deg)}52%{transform:rotate(-22deg)}}
@keyframes swl-fore{0%,100%{transform:rotate(-12deg)}52%{transform:rotate(-38deg)}}
@keyframes swl-head{0%,100%{transform:rotate(1.6deg)}50%{transform:rotate(-1.2deg)}}
@keyframes swl-scroll{to{transform:translateX(-56px)}}
@keyframes swl-dot{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-4px);opacity:1}}
@keyframes swl-puff{0%{opacity:.8;transform:translate(0,0) scale(.4)}60%,100%{opacity:0;transform:translate(-13px,-7px) scale(1.35)}}
.swl-dark{--swl-ground:#2c4270;--swl-dash:#3a5680;--swl-shoe-edge:#3a5680;--swl-text:#cdddf0}
.swl-dark .swl-puff{fill:#2c4270}
@media (prefers-reduced-motion:reduce){
  .swl-walker,.swl-thigh-f,.swl-thigh-b,.swl-shin-f,.swl-shin-b,.swl-arm-f,.swl-fore-f,
  .swl-head,.swl-dashes,.swl-puff,.swl-dot{animation:none!important}
  /* frozen mid-stride: front leg reaching, back leg trailing with heel lifted, arm counter-swung */
  .swl-thigh-f{transform:rotate(-16deg)}
  .swl-shin-f{transform:rotate(4deg)}
  .swl-thigh-b{transform:rotate(10deg)}
  .swl-shin-b{transform:rotate(24deg)}
  .swl-arm-f{transform:rotate(14deg)}
  .swl-fore-f{transform:rotate(-18deg)}
  .swl-puff{display:none!important}
}
`

/** The walking student — ground, dust, and the jointed figure. */
function StudentWalker({ size }: { size: number }) {
  return (
    <svg width={size} height={Math.round((size * 200) / 220)} viewBox="0 0 220 200" fill="none" aria-hidden="true">
      {/* ground */}
      <line x1="16" y1="178" x2="204" y2="178" stroke="var(--swl-ground)" strokeWidth="4" strokeLinecap="round" />
      {/* nested svg clips the scrolling dashes to the ground extent */}
      <svg x="16" y="173" width="188" height="10" overflow="hidden">
        <g className="swl-dashes" stroke="var(--swl-dash)" strokeWidth="4" strokeLinecap="round">
          <line x1="34" y1="178" x2="56" y2="178" />
          <line x1="90" y1="178" x2="112" y2="178" />
          <line x1="146" y1="178" x2="168" y2="178" />
          <line x1="202" y1="178" x2="224" y2="178" />
        </g>
      </svg>

      {/* dust kicked off the back foot */}
      <circle className="swl-puff" cx="84" cy="171" r="4" fill="var(--swl-ground)" />
      <circle className="swl-puff swl-puff2" cx="77" cy="167" r="2.6" fill="var(--swl-ground)" />

      <g className="swl-walker">
        {/* BACK LEG (far side, shaded) */}
        <g className="swl-thigh-b">
          <line x1="106" y1="117" x2="106" y2="142" stroke="var(--swl-pants-b)" strokeWidth="11" strokeLinecap="round" />
          <g className="swl-shin-b">
            <line x1="106" y1="142" x2="106" y2="167" stroke="var(--swl-pants-b)" strokeWidth="10" strokeLinecap="round" />
            <path
              d="M100 176 q-2.6 0 -2.6 -2.7 q0 -2.7 2.7 -2.7 h8.2 q7.5 0 9.6 5.4 z"
              fill="#fff"
              stroke="var(--swl-shoe-edge)"
              strokeWidth="1.4"
            />
          </g>
        </g>

        {/* BACKPACK (behind torso, riding high on the shoulders) */}
        <g>
          {/* pencils peeking out */}
          <line x1="94" y1="82" x2="94" y2="74" stroke="var(--swl-hair)" strokeWidth="3" strokeLinecap="round" />
          <path d="M92.2 74 L94 69.5 L95.8 74 Z" fill="var(--swl-pack)" />
          <line x1="90" y1="84" x2="90" y2="75" stroke="var(--swl-pack-d)" strokeWidth="3" strokeLinecap="round" />
          <path d="M88.2 75 L90 70.5 L91.8 75 Z" fill="var(--swl-skin-d)" />
          {/* body */}
          <rect x="82" y="82" width="28" height="33" rx="10" fill="var(--swl-pack)" />
          <path d="M82 93 h28 v13 a10 10 0 0 1 -10 10 h-8 a10 10 0 0 1 -10 -10 z" fill="var(--swl-pack-d)" opacity=".55" />
          <rect x="87" y="98" width="8" height="8" rx="2.5" fill="#fff" opacity=".9" />
        </g>

        {/* NECK — drawn behind the torso so it tucks under the collar */}
        <line x1="114" y1="78" x2="112" y2="90" stroke="var(--swl-skin)" strokeWidth="8" strokeLinecap="round" />

        {/* TORSO — one clean shirt shape: rounded shoulders, tapered waist, hem above the thighs */}
        <path
          d="M97 96 C95 85 101 79 110 79 C119 79 123 85 122 94 C121.5 102 119 108 116 113 C114.5 118 113 122 112 125 L103 125 C98 125 95.5 120 95 113 C96.5 107 97.5 101 97 96 Z"
          fill="var(--swl-shirt)"
        />

        {/* FRONT LEG */}
        <g className="swl-thigh-f">
          <line x1="106" y1="117" x2="106" y2="142" stroke="var(--swl-pants)" strokeWidth="11" strokeLinecap="round" />
          <g className="swl-shin-f">
            <line x1="106" y1="142" x2="106" y2="167" stroke="var(--swl-pants)" strokeWidth="10" strokeLinecap="round" />
            <path
              d="M100 176 q-2.6 0 -2.6 -2.7 q0 -2.7 2.7 -2.7 h8.2 q7.5 0 9.6 5.4 z"
              fill="#fff"
              stroke="var(--swl-shoe-edge)"
              strokeWidth="1.4"
            />
          </g>
        </g>

        {/* FRONT ARM — free swing */}
        <g className="swl-arm-f">
          <line x1="111" y1="88" x2="109" y2="106" stroke="var(--swl-sleeve)" strokeWidth="8" strokeLinecap="round" />
          <g className="swl-fore-f">
            <line x1="109" y1="106" x2="109" y2="122" stroke="var(--swl-sleeve)" strokeWidth="7" strokeLinecap="round" />
            <circle cx="109" cy="124" r="4.2" fill="var(--swl-skin)" />
          </g>
        </g>

        {/* HEAD */}
        <g className="swl-head">
          <ellipse cx="117" cy="64" rx="15.5" ry="17" fill="var(--swl-skin)" />
          <circle cx="132.2" cy="66.5" r="2.6" fill="var(--swl-skin)" />
          <circle cx="107" cy="66" r="3" fill="var(--swl-skin-d)" />
          {/* hair: short school-boy cut — plain cap, straight scalloped fringe, small sideburn */}
          <path d="M102.5 70 Q99.8 54 107.5 47.9 Q117 45.6 125.3 48.9 Q131.2 51.6 131.8 58.8 Q128.5 60.6 124.5 59.4 Q120 57.7 116 59.5 Q112 60.4 108.3 59.2 Q107.6 61.8 107.5 64.2 Q104.8 66 102.5 70 Z" fill="var(--swl-hair)" />
          {/* face */}
          <circle cx="124" cy="64" r="2.4" fill="var(--swl-hair)" />
          <circle cx="124.9" cy="63" r="0.8" fill="#fff" />
          <path d="M123 70.5 q3.5 3 6.5 .5" stroke="var(--swl-hair)" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      </g>
    </svg>
  )
}

export function StudentWalkingLoader({
  size = 120,
  label = 'Loading',
  sublabel,
  dark = false,
  className,
  style,
}: StudentWalkingLoaderProps) {
  return (
    <div
      className={`swl${dark ? ' swl-dark' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
    >
      <style>{CSS}</style>
      <StudentWalker size={size} />
      {(label !== null || sublabel) && (
        <div>
          {label !== null && (
            <span className="swl-label">
              {label}
              <span className="swl-dot" />
              <span className="swl-dot" />
              <span className="swl-dot" />
            </span>
          )}
          {sublabel && <div className="swl-sub">{sublabel}</div>}
        </div>
      )}
    </div>
  )
}

export default StudentWalkingLoader
