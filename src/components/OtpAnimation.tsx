import { useEffect, useRef, useState, type CSSProperties } from "react"

export interface OtpAnimationProps {
  /** Digits to display - default matches video: ["4","7","1","9"] */
  digits?: string[]
  /** Masked phone number shown in subtitle */
  phone?: string
  /** Auto play on mount */
  autoPlay?: boolean
  /** Loop the animation */
  loop?: boolean
  /** Success (green + tick) vs error (red + X) final state */
  variant?: "success" | "error"
  /** Width of the card in px */
  width?: number
  /** Callback when Verified/Error phase completes */
  onComplete?: () => void
  className?: string
  style?: CSSProperties
}

const DEFAULT_DIGITS = ["4", "7", "1", "9"]

const CSS = `
.ota-root{
  --ota-bg-outer:#070A0F;
  --ota-bg-card:#0F141C;
  --ota-bg-box:#1C232E;
  --ota-border:#2A3441;
  --ota-border-active:#E6EDF5;
  --ota-teal:#00D9A3;
  --ota-teal-bg:#0B3D2E;
  --ota-teal-border:#00D9A3;
  --ota-error:#FF3B42;
  --ota-error-bg:#2A0F13;
  --ota-error-bg2:#5A141C;
  --ota-text:#FFFFFF;
  --ota-text-sub:#8A94A6;
  --ota-text-dim:#5A6577;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  width:100%;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  -webkit-font-smoothing: antialiased;
}
.ota-card{
  width:100%;
  max-width:360px;
  background: var(--ota-bg-card);
  border-radius: 20px;
  padding: 28px 20px 32px;
  position:relative;
  overflow:hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04) inset;
}
.ota-header{
  text-align:center;
  position:relative;
  height: 56px;
  margin-bottom: 6px;
}
.ota-title{
  position:absolute; left:0; right:0; top:0;
  font-size:18px; font-weight:700; letter-spacing:-.02em; line-height:22px;
  color: var(--ota-text);
  margin:0;
  transition: opacity 300ms ease, transform 300ms ease, color 300ms ease;
  white-space:nowrap;
}
.ota-subtitle{
  position:absolute; left:0; right:0; top:26px;
  font-size:11px; font-weight:400; letter-spacing:.01em; line-height:14px;
  color: var(--ota-text-sub);
  margin:0;
  transition: opacity 300ms ease, transform 300ms ease;
  white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis;
  padding: 0 4px;
}
.ota-title.ota-verified-title{ color: var(--ota-teal); font-size:17px; }
.ota-title.ota-error-title{ color: var(--ota-error); font-size:17px; }
.ota-stage{
  position:relative;
  width:100%;
  height:178px;
  margin-top: 14px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.ota-rotor{
  position:absolute;
  left:50%; top:50%;
  width:158px; height:158px;
  transform: translate(-50%,-50%) rotate(0deg);
  transition: transform 1000ms cubic-bezier(.4,0,.2,1);
  pointer-events:none;
}
.ota-rotor.spin{
  transform: translate(-50%,-50%) rotate(360deg);
}
.ota-circle{
  position:absolute;
  left:50%; top:50%;
  width:148px; height:148px;
  transform: translate(-50%,-50%);
  opacity:0;
  transition: opacity 400ms ease;
}
.ota-circle.show{ opacity:1; }
.ota-circle-ring{
  fill:none;
  stroke: #2A3441;
  stroke-width:1.2;
  stroke-linecap:round;
  stroke-dasharray: 465;
  stroke-dashoffset: 465;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke 300ms ease;
}
.ota-circle.show .ota-circle-ring{
  animation: ota-draw-circle 700ms cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes ota-draw-circle{
  to{ stroke-dashoffset: 0; }
}
.ota-box{
  position:absolute;
  left:50%; top:50%;
  width:56px; height:56px;
  border-radius:14px;
  background: var(--ota-bg-box);
  border: 1.5px solid var(--ota-border);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:18px; font-weight:600;
  color:#fff;
  transform: translate(-50%,-50%) translate(var(--x,0px), var(--y,0px)) scale(var(--s,1)) rotate(var(--r,0deg));
  transition: transform 700ms cubic-bezier(.4,0,.2,1), background 300ms ease, border-color 300ms ease, box-shadow 300ms ease, opacity 400ms ease;
  will-change: transform, opacity;
  box-sizing:border-box;
}
.ota-box.active{
  border-color: var(--ota-border-active);
  box-shadow: 0 0 0 1px var(--ota-border-active), 0 0 16px rgba(255,255,255,.10);
  background: #232C3A;
}
.ota-box.filled{
  color:#fff;
}
.ota-box.success{
  background: var(--ota-teal-bg);
  border-color: var(--ota-teal);
  box-shadow: 0 0 0 1px var(--ota-teal), 0 0 18px rgba(0,217,163,.32);
}
.ota-box.error{
  background: var(--ota-error-bg);
  border-color: var(--ota-error);
  box-shadow: 0 0 0 1px var(--ota-error), 0 0 18px rgba(255,59,66,.32);
}
.ota-box.error.shake{
  animation: ota-shake 420ms ease;
}
@keyframes ota-shake{
  0%,100%{ transform: translate(-50%,-50%) translate(var(--x,0px), var(--y,0px)) scale(var(--s,1)) rotate(var(--r,0deg)); }
  20%{ transform: translate(-50%,-50%) translate(calc(var(--x) - 6px), var(--y)) scale(var(--s,1)) rotate(var(--r,0deg)); }
  40%{ transform: translate(-50%,-50%) translate(calc(var(--x) + 6px), var(--y)) scale(var(--s,1)) rotate(var(--r,0deg)); }
  60%{ transform: translate(-50%,-50%) translate(calc(var(--x) - 4px), var(--y)) scale(var(--s,1)) rotate(var(--r,0deg)); }
  80%{ transform: translate(-50%,-50%) translate(calc(var(--x) + 4px), var(--y)) scale(var(--s,1)) rotate(var(--r,0deg)); }
}
.ota-caret{
  width:2px; height:18px; background:#fff; border-radius:1px;
  animation: ota-caret 1s step-end infinite;
}
@keyframes ota-caret{ 0%,50%{opacity:1} 50.01%,100%{opacity:0}}
.ota-digit{
  line-height:1;
  transform: translateZ(0);
}
.ota-verified{
  position:absolute;
  left:50%; top:50%;
  transform: translate(-50%,-50%) scale(.9);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  opacity:0;
  transition: opacity 400ms ease, transform 400ms cubic-bezier(.34,1.56,.64,1);
  pointer-events:none;
  width:100%;
}
.ota-verified.show{
  opacity:1;
  transform: translate(-50%,-50%) scale(1);
}
.ota-check-wrap{
  position:relative;
  width:78px; height:78px;
  display:flex; align-items:center; justify-content:center;
}
.ota-check-bg{
  position:absolute; inset:0;
  border-radius:18px;
  background: linear-gradient(180deg, #0B3D2E 0%, #0A5A40 100%);
  border: 1.5px solid var(--ota-teal);
  box-shadow: 0 0 0 1px rgba(0,217,163,.5), 0 8px 24px rgba(0,217,163,.25), 0 0 40px rgba(0,217,163,.15);
  opacity:0.95;
}
.ota-check-bg.error{
  background: linear-gradient(180deg, #2A0F13 0%, #5A141C 100%);
  border-color: var(--ota-error);
  box-shadow: 0 0 0 1px rgba(255,59,66,.5), 0 8px 24px rgba(255,59,66,.25), 0 0 40px rgba(255,59,66,.15);
}
.ota-check-bg::before{
  content:"";
  position:absolute; inset:-10px;
  border-radius:22px;
  border:1px solid rgba(0,217,163,.18);
  pointer-events:none;
}
.ota-check-bg.error::before{
  border-color: rgba(255,59,66,.18);
}
.ota-check-bg::after{
  content:"";
  position:absolute; inset:-22px;
  border-radius:26px;
  border:1px solid rgba(0,217,163,.10);
  pointer-events:none;
}
.ota-check-bg.error::after{
  border-color: rgba(255,59,66,.10);
}
.ota-check-icon{
  position:relative;
  width:42px; height:42px;
  border-radius:12px;
  background: #0E5A3F;
  border:1.5px solid var(--ota-teal);
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 0 12px rgba(0,217,163,.4) inset;
}
.ota-check-icon.error{
  background: #5A141C;
  border-color: var(--ota-error);
  box-shadow: 0 0 12px rgba(255,59,66,.4) inset;
}
.ota-check-icon svg{
  width:18px; height:18px;
}
.ota-check-icon path{
  stroke-dasharray:22;
  stroke-dashoffset:22;
}
.ota-verified.show .ota-check-icon path{
  animation: ota-check-draw 380ms ease-out forwards 200ms;
}
.ota-verified.show .ota-check-icon.error path{
  animation: ota-check-draw 300ms ease-out forwards 150ms;
}
@keyframes ota-check-draw{ to{ stroke-dashoffset:0; } }

.ota-particles{
  position:absolute; inset:-18px;
  pointer-events:none;
}
.ota-particle{
  position:absolute;
  width:6px; height:6px;
  border-radius:50%;
  background: var(--ota-teal);
  box-shadow: 0 0 6px var(--ota-teal);
  opacity:0;
}
.ota-particle.error{
  background: var(--ota-error);
  box-shadow: 0 0 6px var(--ota-error);
}
.ota-verified.show .ota-particle{
  animation: ota-particle 700ms ease-out forwards;
}
@keyframes ota-particle{
  0%{ opacity:0; transform: translate(0,0) scale(.5); }
  20%{ opacity:1; }
  100%{ opacity:0; transform: translate(var(--px), var(--py)) scale(1); }
}
.ota-center-dot{
  position:absolute;
  left:50%; top:50%;
  width:4px; height:4px;
  background:#fff;
  border-radius:50%;
  transform: translate(-50%,-50%);
  opacity:0;
  transition: opacity 200ms ease;
}
.ota-center-dot.show{ opacity:1; }

.ota-blank{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  opacity:0;
  transition: opacity 200ms ease;
}

@media (prefers-reduced-motion:reduce){
  .ota-box, .ota-rotor, .ota-circle-ring, .ota-verified, .ota-check-icon path, .ota-particle, .ota-caret{
    animation: none !important;
    transition: none !important;
  }
  .ota-circle-ring{ stroke-dashoffset:0 !important; }
}

/* header swap */
.ota-header .ota-title, .ota-header .ota-subtitle{
  will-change: opacity, transform;
}
.ota-header.verified .ota-title-default,
.ota-header.verified .ota-subtitle-default,
.ota-header.error .ota-title-default,
.ota-header.error .ota-subtitle-default{
  opacity:0; transform: translateY(-6px);
  pointer-events:none;
}
.ota-header.verified .ota-title-verified,
.ota-header.verified .ota-subtitle-verified{
  opacity:1; transform: translateY(0);
}
.ota-header.error .ota-title-error,
.ota-header.error .ota-subtitle-error{
  opacity:1; transform: translateY(0);
}
.ota-header:not(.verified):not(.error) .ota-title-verified,
.ota-header:not(.verified):not(.error) .ota-subtitle-verified,
.ota-header:not(.verified):not(.error) .ota-title-error,
.ota-header:not(.verified):not(.error) .ota-subtitle-error{
  opacity:0; transform: translateY(6px);
  pointer-events:none;
}
.ota-header.verified .ota-title-error,
.ota-header.verified .ota-subtitle-error{
  opacity:0; transform: translateY(6px); pointer-events:none;
}
.ota-header.error .ota-title-verified,
.ota-header.error .ota-subtitle-verified{
  opacity:0; transform: translateY(6px); pointer-events:none;
}
`

type Phase =
  | "idle"
  | "d1"
  | "d2"
  | "d3"
  | "d4"
  | "toCircle"
  | "spin"
  | "reorder"
  | "success"
  | "merge"
  | "blank"
  | "verified"

function getLinearPositions(n: number, gap = 68) {
  const positions: { x: number; y: number }[] = []
  const start = -((n - 1) * gap) / 2
  for (let i = 0; i < n; i++) {
    positions.push({ x: start + i * gap, y: 0 })
  }
  return positions
}

function getCirclePositions(n: number, radius = 62, phase: Phase) {
  if (n === 4) {
    if (phase === "toCircle" || phase === "spin") {
      return [
        { x: -62, y: 0 },
        { x: 0, y: -62 },
        { x: 62, y: 0 },
        { x: 0, y: 62 },
      ]
    }
    if (phase === "reorder" || phase === "success" || phase === "merge") {
      return [
        { x: 0, y: -62 },
        { x: 62, y: 0 },
        { x: 0, y: 62 },
        { x: -62, y: 0 },
      ]
    }
  }
  const positions: { x: number; y: number }[] = []
  const offset = -90
  for (let i = 0; i < n; i++) {
    const angle = ((360 / n) * i + offset) * (Math.PI / 180)
    positions.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return positions
}

export function OtpAnimation({
  digits = DEFAULT_DIGITS,
  phone = "+1 415 ••• 0142",
  autoPlay = true,
  loop = false,
  variant = "success",
  width = 360,
  onComplete,
  className,
  style,
}: OtpAnimationProps) {
  const n = digits.length
  const [phase, setPhase] = useState<Phase>("idle")
  const [tick, setTick] = useState(0)
  const timerRef = useRef<number | null>(null)

  const isError = variant === "error"

  const timeline: { phase: Phase; duration: number }[] = [
    { phase: "idle", duration: 420 },
    { phase: "d1", duration: 420 },
    { phase: "d2", duration: 560 },
    { phase: "d3", duration: 560 },
    { phase: "d4", duration: 520 },
    { phase: "toCircle", duration: 980 },
    { phase: "spin", duration: 1000 },
    { phase: "reorder", duration: 380 },
    { phase: "success", duration: 420 },
    { phase: "merge", duration: 420 },
    { phase: "blank", duration: 220 },
    { phase: "verified", duration: 2200 },
  ]

  useEffect(() => {
    if (!autoPlay) return
    let idx = timeline.findIndex((t) => t.phase === phase)
    if (idx === -1) idx = 0
    const current = timeline[idx]
    if (!current) return
    if (current.phase === "verified") {
      if (onComplete) {
        window.setTimeout(() => onComplete(), 300)
      }
      if (loop) {
        timerRef.current = window.setTimeout(() => {
          setPhase("idle")
          setTick((v) => v + 1)
        }, current.duration)
      }
      return
    }
    timerRef.current = window.setTimeout(() => {
      const next = timeline[idx + 1]
      if (next) setPhase(next.phase)
    }, current.duration)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [phase, autoPlay, loop, tick, onComplete])

  useEffect(() => {
    setPhase("idle")
    setTick((v) => v + 1)
  }, [digits.join(""), variant])

  const filledCount =
    phase === "idle"
      ? 0
      : phase === "d1"
        ? 1
        : phase === "d2"
          ? 2
          : phase === "d3"
            ? 3
            : 4

  const isLinear = phase === "idle" || phase === "d1" || phase === "d2" || phase === "d3" || phase === "d4"
  const showCircle = phase === "toCircle" || phase === "spin" || phase === "reorder" || phase === "success" || phase === "merge"
  const showCenterDot = phase === "toCircle" || phase === "spin" || phase === "reorder" || phase === "success"
  const isVerified = phase === "verified"
  const isBlank = phase === "blank"
  const isSuccessPhase = phase === "success" || phase === "merge"
  const isMerge = phase === "merge"
  const isSpin = phase === "spin"

  let positions: { x: number; y: number }[]
  if (isLinear) positions = getLinearPositions(n)
  else if (phase === "blank" || phase === "verified") positions = getCirclePositions(n, 62, "success")
  else positions = getCirclePositions(n, 62, phase)

  if (isMerge) {
    positions = positions.map(() => ({ x: 0, y: 0 }))
  }

  const activeIndex = filledCount < n ? filledCount : -1
  const headerState = isVerified ? (isError ? "error" : "verified") : ""

  return (
    <div className={`ota-root ${className ?? ""}`} style={{ ...style }} data-phase={phase} data-variant={variant} data-tick={tick}>
      <style>{CSS}</style>
      <div className="ota-card" style={{ width, maxWidth: "100%" }}>
        <div className={`ota-header ${headerState}`}>
          <h2 className="ota-title ota-title-default">Verify your number</h2>
          <p className="ota-subtitle ota-subtitle-default">Enter the {n}-digit code we sent to {phone}</p>
          <h2 className="ota-title ota-verified-title ota-title-verified">Verified successfully</h2>
          <p className="ota-subtitle ota-subtitle-verified">Your number has been verified</p>
          <h2 className="ota-title ota-error-title ota-title-error">Verification failed</h2>
          <p className="ota-subtitle ota-subtitle-error">Incorrect code. Please try again.</p>
        </div>

        <div className="ota-stage" aria-live="polite" aria-label={isVerified ? (isError ? "Verification failed" : "Verified successfully") : "Enter OTP code"}>
          <div className={`ota-center-dot ${showCenterDot ? "show" : ""}`} aria-hidden="true" />

          <div className={`ota-circle ${showCircle ? "show" : ""}`} aria-hidden="true">
            <svg width="148" height="148" viewBox="0 0 148 148" fill="none">
              <circle className="ota-circle-ring" cx="74" cy="74" r="64" />
            </svg>
          </div>

          <div className={`ota-rotor ${isSpin ? "spin" : ""}`} style={{ opacity: isBlank || isVerified ? 0 : 1 }}>
            {digits.map((d, i) => {
              const filled = i < filledCount
              const active = i === activeIndex && isLinear
              const boxVariant = isSuccessPhase && !isMerge ? (isError ? "error" : "success") : ""
              const shake = isError && phase === "success" ? "shake" : ""
              const { x, y } = positions[i]
              let scale = 1
              let rotate = 0
              let opacity: number | undefined = undefined
              if (isMerge) {
                scale = 0.35
                opacity = 0
                rotate = i * 18
              } else if (isSpin) {
                rotate = 22
              }

              const showCaret = active && !filled
              const showDigit = filled

              return (
                <div
                  key={`${i}-${tick}`}
                  className={`ota-box ${filled ? "filled" : ""} ${active ? "active" : ""} ${boxVariant} ${shake}`}
                  style={
                    {
                      "--x": `${x}px`,
                      "--y": `${y}px`,
                      "--s": String(scale),
                      "--r": `${rotate}deg`,
                      opacity,
                    } as CSSProperties
                  }
                  aria-label={`Digit ${i + 1} ${filled ? d : "empty"}`}
                >
                  {showCaret ? <span className="ota-caret" aria-hidden="true" /> : null}
                  {showDigit ? <span className="ota-digit">{d}</span> : null}
                  {!showDigit && !showCaret ? <span aria-hidden="true" style={{ width: 2, height: 16 }} /> : null}
                </div>
              )
            })}
          </div>

          <div className={`ota-verified ${isVerified ? "show" : ""}`} aria-hidden={!isVerified}>
            <div className="ota-check-wrap">
              <div className={`ota-check-bg ${isError ? "error" : ""}`} />
              <div className={`ota-check-icon ${isError ? "error" : ""}`}>
                {isError ? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 8 L16 16" stroke="#FF3B42" strokeWidth="2.3" strokeLinecap="round" />
                    <path d="M16 8 L8 16" stroke="#FF3B42" strokeWidth="2.3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 12.5 L10.2 15.7 L17 8.5"
                      stroke="#00D9A3"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                )}
              </div>
              <div className="ota-particles" aria-hidden="true">
                {[
                  { px: -42, py: -38, d: 0, s: 6 },
                  { px: 44, py: -36, d: 60, s: 5 },
                  { px: 48, py: 22, d: 120, s: 4 },
                  { px: -46, py: 28, d: 180, s: 6 },
                  { px: -30, py: -52, d: 240, s: 3 },
                  { px: 32, py: 48, d: 300, s: 4 },
                  { px: 0, py: -56, d: 90, s: 5 },
                  { px: 0, py: 54, d: 210, s: 3 },
                  { px: -52, py: -8, d: 40, s: 4 },
                  { px: 52, py: -6, d: 160, s: 5 },
                ].map((p, idx) => (
                  <span
                    key={idx}
                    className={`ota-particle ${isError ? "error" : ""}`}
                    style={
                      {
                        left: "50%",
                        top: "50%",
                        // @ts-ignore
                        "--px": `${p.px}px`,
                        "--py": `${p.py}px`,
                        width: p.s,
                        height: p.s,
                        animationDelay: `${p.d}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {isBlank ? <div className="ota-blank" aria-hidden="true" /> : null}
        </div>
      </div>
    </div>
  )
}

export default OtpAnimation
