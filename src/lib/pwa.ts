/**
 * PWA / platform detection — gates the push UI on iPhone/iPad.
 *
 * Apple only allows web push on iOS/iPadOS 16.4+ inside the Home Screen
 * installed web app (Share → Add to Home Screen). It NEVER works in a
 * Safari/Chrome/Edge browser tab on iPhone — so on iOS the enable-push UI must
 * only render in standalone mode, and browser-tab users get the install
 * walkthrough (InstallPwaBanner) instead. Desktop and Android need no install;
 * there we defer to OneSignal's own capability check.
 */

/** iOS home-screen web apps and Android/desktop installs run in standalone display mode. */
export function isStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return true
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    )
  } catch {
    return false
  }
}

/** iPhone/iPad detection. iPadOS 13+ masquerades as desktop Safari — unmask via touch points. */
export function isIOS(): boolean {
  try {
    const ua = navigator.userAgent
    if (/iphone|ipad|ipod/i.test(ua)) return true
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  } catch {
    return false
  }
}

/** Parse iOS version from UA ("OS 16_4_1") → [16, 4]; null when not parseable. */
export function iosVersion(): [number, number] | null {
  try {
    const m = navigator.userAgent.match(/OS (\d+)_(\d+)(?:_\d+)?/i)
    if (!m) return null
    return [Number(m[1]), Number(m[2])]
  } catch {
    return null
  }
}

export function iosVersionAtLeast(major: number, minor: number): boolean {
  const v = iosVersion()
  if (!v) return false
  return v[0] > major || (v[0] === major && v[1] >= minor)
}

/**
 * Platform gate for push UI. On iOS: only inside the installed web app on
 * 16.4+. Everywhere else (desktop/Android) we defer to OneSignal's own
 * isPushSupported(), which is reliable there.
 */
export function canUsePushNow(): boolean {
  if (isIOS()) return isStandalone() && iosVersionAtLeast(16, 4)
  return true
}
