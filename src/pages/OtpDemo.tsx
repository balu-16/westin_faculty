import { useState } from "react"
import { OtpAnimation } from "../components/OtpAnimation"

export function OtpDemo() {
  const [digits, setDigits] = useState<string[]>(["4", "7", "1", "9"])
  const [phone, setPhone] = useState("+1 415 ••• 0142")
  const [key, setKey] = useState(0)
  const [loop, setLoop] = useState(false)
  const [variant, setVariant] = useState<'success' | 'error'>('success')

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-[20px] border border-line bg-white p-6 shadow-[0_8px_30px_rgba(20,33,61,0.06)] sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">OTP Animation — Demo</h1>
          <p className="mt-1 text-sm text-ink-soft">
            1:1 rebuild of <span className="font-mono text-xs">WhatsApp Video 2026-08-26 9.34.19 PM.mp4</span> — 5.33s, 60fps
            <br />
            Component: <span className="font-mono text-xs">src/components/OtpAnimation.tsx</span> (single file, inline CSS,
            <span className="font-mono text-xs"> ota-*</span>)
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              Digits
              <input
                value={digits.join("")}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6)
                  if (v.length >= 2) setDigits(v.split(""))
                  if (!v) setDigits(["4", "7", "1", "9"])
                }}
                maxLength={6}
                className="h-9 w-28 rounded-xl border border-line bg-primary-lighter/60 px-3 text-center font-mono text-sm font-semibold text-ink focus:border-primary focus:bg-white focus:outline-none"
                placeholder="4719"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 w-44 rounded-xl border border-line bg-primary-lighter/60 px-3 text-sm text-ink focus:border-primary focus:bg-white focus:outline-none"
                placeholder="+1 415 ••• 0142"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="accent-primary" /> Loop
            </label>
            <button
              onClick={() => setKey((k) => k + 1)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            >
              ↺ Replay
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-soft">Result:</span>
            <button
              onClick={() => { setVariant('success'); setKey(k=>k+1)}}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${variant==='success' ? 'bg-[#0B3D2E] text-[#00D9A3] ring-[#00D9A3]' : 'bg-white text-ink-soft ring-line hover:ring-primary'}`}
            >
              ✓ Success (green)
            </button>
            <button
              onClick={() => { setVariant('error'); setKey(k=>k+1)}}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${variant==='error' ? 'bg-[#2A0F13] text-[#FF3B42] ring-[#FF3B42]' : 'bg-white text-ink-soft ring-line hover:ring-primary'}`}
            >
              ✕ Error (red + shake)
            </button>
          </div>

          <div className="mt-6 flex justify-center rounded-2xl bg-[#070A0F] p-6">
            <OtpAnimation key={`${key}-${digits.join("")}-${loop}-${variant}`} digits={digits} phone={phone} autoPlay loop={loop} width={360} variant={variant} />
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-ink-soft">
            Timeline: idle → d1(4) → d2(7) → d3(1) → d4(9) → diamond → spin → reorder → {variant==='error' ? 'red shake → ✕ Verification failed' : 'teal → ✓ Verified successfully'} → merge
            <br />
            For 6-digit OTP: <span className="font-mono text-xs">digits={`["1","2","3","4","5","6"]`}</span> (hexagon). Toggle <strong style={{color: variant==='error' ? '#FF3B42' : '#00D9A3'}}>{variant==='error' ? 'Error (wrong OTP)' : 'Success (correct OTP)'}</strong> to preview.
            <br />
            Standalone also at <span className="font-mono text-xs">otp animation/index.html</span> — try both ✓/✕ buttons.
          </p>
        </div>

        <div className="rounded-[20px] border border-line bg-white p-6 shadow-[0_8px_30px_rgba(20,33,61,0.06)]">
          <p className="text-sm font-semibold text-ink">Faculty/Admin Integration (after OTP verify)</p>
          <pre className="mt-3 overflow-auto rounded-xl bg-ink p-3 text-xs leading-5 text-white">
{`import { OtpAnimation } from "../../components/OtpAnimation"

// LoginScreen.tsx — handleVerify:
const [otpStatus, setOtpStatus] = useState<'idle'|'success'|'error'>('idle')
try {
  await login(identifier, digits.join(""))
  setOtpStatus('success') // green + ✓, then redirect
  setTimeout(()=>navigate(from,{replace:true}),1400)
} catch(e){
  setOtpStatus('error') // red + ✕ + shake, auto-reset after 2.2s
  setTimeout(()=>{ setOtpStatus('idle'); setDigits(Array(6).fill('')) },2200)
}
{otpStatus!=='idle'
  ? <OtpAnimation digits={digits} phone={maskIdentifier(identifier)} variant={otpStatus} autoPlay width={340} />
  : <div className="grid grid-cols-6 ..."> {/* 6 inputs */} </div> }`}
          </pre>
          <p className="mt-3 text-xs text-ink-soft">
            Back to portal: <a href="/faculty/login" className="font-semibold text-primary-dark hover:text-primary">Faculty Login</a>{" "}
            · <a href="/admin/login" className="font-semibold text-primary-dark hover:text-primary">Admin Login</a>{" "}
            · <a href="/otp-demo" className="font-semibold text-primary-dark hover:text-primary">This demo</a>
          </p>
        </div>
      </div>
    </div>
  )
}
