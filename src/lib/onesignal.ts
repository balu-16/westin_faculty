import { apiFetch, getSession, type SessionKey } from './api';

/**
 * OneSignal Web Push — modular façade for faculty_admin_portal.
 *
 * Site: https://westin-faculty.vercel.app (shared faculty+admin deployment).
 * Student portal is out-of-scope; never call these helpers from student code.
 *
 * iOS: supported ONLY inside the Home Screen installed web app (iOS 16.4+,
 * installed via Share → Add to Home Screen from Safari/Chrome/Edge) — never
 * in a browser tab. lib/pwa.ts gates the push UI; InstallPwaBanner guides
 * iPhone users through the install. Desktop and Android work in the tab.
 *
 * External IDs: faculty_<users.id> / admin_<users.id> via getOneSignalExternalId().
 * This helper is the single source of truth — inline construction elsewhere is forbidden.
 * Backend imports an identical helper from westin-api/src/modules/notifications/notifications.service.ts
 * and a unit assertion must keep them in sync.
 *
 * Permission model (identity-first, prompt only AFTER login):
 * - OneSignal.init() in index.html does NOT auto-prompt (prompts: [], notifyButton: false, autoResubscribe: false).
 * - We never prompt before or during login. The auth contexts run identifyOneSignalUser()
 *   right after login succeeds, so login(external_id) ALWAYS precedes any optIn() — the
 *   subscription is created directly under the logged-in account, never anonymously.
 * - The ONLY permission prompt path is the post-login PushPermissionBanner Enable button
 *   (and the Settings toggle) — direct click handlers calling subscribeOneSignal().
 * - We never prompt on page load or session restore (no gesture available there).
 * - Browsers grant the Notification permission ONCE per profile; it can never be re-prompted.
 *   When permission is already granted, identifyOneSignalUser() silently (re)creates this
 *   browser's single subscription via optIn() — no prompt, no gesture needed — so whoever
 *   logged in LAST is always genuinely subscribed (shared-browser second account, iOS
 *   subscription churn), UNLESS that account deliberately turned notifications off in
 *   Settings (per-account opt-out marker survives logins and reloads). The banner only
 *   ever prompts when permission is 'default'.
 *   On a shared browser only the account that logged in LAST receives pushes — inherent
 *   web-push limit, not fixable.
 * - Logging OUT does not touch OneSignal: the device keeps receiving that account's pushes
 *   until a DIFFERENT account logs in (identifyOneSignalUser then moves the subscription).
 *   Severing the subscription on logout is what previously made subscribed users show up
 *   as "inactive / not subscribed" in OneSignal while their device sat fully capable.
 * - The thank-you push fires ONLY from an explicit Enable gesture (banner / Settings) —
 *   never from identify or silent heals — exactly once per USER via the locked
 *   sendSubscriptionThanksOnce() (see the first-subscription section at the bottom); the
 *   backend additionally enforces once-per-user in Postgres (notification_thanks).
 * - Identity operations (logout/login) are serialized so a pending account-switch logout()
 *   can never resolve after the next login() and unlink the new user.
 */

export type OneSignalRole = 'faculty' | 'admin';

/** Single shared helper — call this everywhere an external_id is needed. */
export function getOneSignalExternalId(user: { id: string; role: OneSignalRole }): string {
  return `${user.role}_${user.id}`;
}

type OneSignalApi = {
  init: (opts: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    addTags?: (tags: Record<string, string>) => Promise<void> | void;
    addTag?: (key: string, value: string) => Promise<void> | void;
    onesignalId?: string;
    externalId?: string;
    PushSubscription: {
      id?: string | null;
      token?: string | null;
      optedIn: boolean;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      addEventListener?: (event: string, cb: (e: unknown) => void) => void;
      removeEventListener?: (event: string, cb: (e: unknown) => void) => void;
    };
  };
  Notifications: {
    requestPermission: () => Promise<boolean | void>;
    permission: boolean;
    permissionNative?: string; // 'granted' | 'denied' | 'default'
    isPushSupported: () => boolean;
    addEventListener?: (event: string, cb: (...args: unknown[]) => void) => void;
    removeEventListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  };
  Slidedown: {
    promptPush: (opts?: unknown) => Promise<void>;
  };
  Debug?: { setLogLevel: (level: string) => void };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalApi) => void | Promise<void>>;
    OneSignal?: OneSignalApi;
  }
}

const LAST_EXTERNAL_ID_KEY = 'westin:onesignal:lastExternalId';

function readLastExternalId(): string | null {
  try {
    return window.localStorage.getItem(LAST_EXTERNAL_ID_KEY);
  } catch {
    return null;
  }
}

function writeLastExternalId(id: string | null): void {
  try {
    if (id === null) window.localStorage.removeItem(LAST_EXTERNAL_ID_KEY);
    else window.localStorage.setItem(LAST_EXTERNAL_ID_KEY, id);
  } catch {}
}

// The user most recently identified on this browser — set by identifyOneSignalUser().
// sendSubscriptionThanksOnce() uses it so the thank-you is addressed to the account that
// actually owns the subscription, never guessed from whichever session key exists.
let currentIdentity: { id: string; role: OneSignalRole } | null = null;

// Deliberate opt-out (Settings toggle off) must survive logins and reloads — the silent
// heal in identifyOneSignalUser() would otherwise re-subscribe the account on its next
// visit. Keyed per external id; an explicit Enable (subscribeOneSignal) clears it.
const OPTED_OUT_KEY_PREFIX = 'westin:onesignal:optedOut:';

function optedOutFlagKey(externalId: string): string {
  return OPTED_OUT_KEY_PREFIX + externalId;
}

function hasOptedOut(externalId: string): boolean {
  try {
    return !!window.localStorage.getItem(optedOutFlagKey(externalId));
  } catch {
    return false;
  }
}

// The faculty portal mounts BOTH FacultyAuthProvider and AdminAuthProvider; with two saved
// sessions both would identify on load and fight over this browser's single subscription.
// Each login records its role; session restore identifies only for that role.
const LAST_ROLE_KEY = 'westin:onesignal:lastRole';

export function writeLastActiveRole(role: OneSignalRole): void {
  try {
    window.localStorage.setItem(LAST_ROLE_KEY, role);
  } catch {}
}

export function readLastActiveRole(): OneSignalRole | null {
  try {
    const v = window.localStorage.getItem(LAST_ROLE_KEY);
    return v === 'faculty' || v === 'admin' ? v : null;
  } catch {
    return null;
  }
}

// Identity ops must never interleave: a logout() still in flight when the next
// login(externalId) runs would unlink the freshly identified user (observed as
// "logged in as admin but never subscribed"). Chain every identity mutation.
let identityChain: Promise<unknown> = Promise.resolve();
function enqueueIdentity<T>(fn: () => Promise<T>): Promise<T> {
  const run = identityChain.then(fn, fn);
  identityChain = run.catch(() => undefined);
  return run;
}

/** Resolves once the current identify/switch — including the silent subscription heal —
 * has settled. The post-login banner awaits this so it never reads a pre-heal snapshot
 * (which would briefly show "not subscribed" for an account that is being re-bound). */
export function whenIdentitySettled(): Promise<unknown> {
  return identityChain;
}

/** Resolve the live OneSignal instance, waiting for Deferred queue if needed. */
function getOneSignalSync(): OneSignalApi | null {
  try {
    const w = window as unknown as Window;
    if (w.OneSignal && typeof (w.OneSignal as OneSignalApi).login === 'function') return w.OneSignal as OneSignalApi;
  } catch {}
  return null;
}

function withOneSignal<T>(fn: (os: OneSignalApi) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const sync = getOneSignalSync();
    if (sync) {
      Promise.resolve(fn(sync)).then(resolve).catch(reject);
      return;
    }
    const w = window as unknown as Window;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (os: OneSignalApi) => {
      try {
        resolve(await fn(os));
      } catch (e) {
        reject(e);
      }
    });
    // Do not hang login on OneSignal if SDK never loads (offline / blocked).
    // Callers should have their own timeout or swallow errors.
    window.setTimeout(() => {
      // no-op: we do not reject here to avoid breaking auth; callers swallow
    }, 5000);
  });
}

// ---------- Public helpers (modular, easy to change/remove) ----------

export type PushState = {
  isSupported: boolean;
  permission: boolean; // Notifications.permission === true
  permissionNative: 'granted' | 'denied' | 'default';
  optedIn: boolean; // PushSubscription.optedIn
  subscriptionId: string | null;
};

/** Snapshot of current push state — safe to call before init. */
export async function getOneSignalState(): Promise<PushState> {
  const fallback: PushState = {
    isSupported: false,
    permission: false,
    permissionNative: (typeof Notification !== 'undefined' ? (Notification.permission as PushState['permissionNative']) : 'default') || 'default',
    optedIn: false,
    subscriptionId: null,
  };
  try {
    return await withOneSignal((os) => {
      const isSupported = (() => {
        try {
          return os.Notifications.isPushSupported();
        } catch {
          return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
        }
      })();
      let permission = false;
      let permissionNative: PushState['permissionNative'] = 'default';
      try {
        permission = !!os.Notifications.permission;
        const raw = (os.Notifications.permissionNative as string) || (typeof Notification !== 'undefined' ? Notification.permission : 'default');
        if (raw === 'granted' || raw === 'denied' || raw === 'default') permissionNative = raw as PushState['permissionNative'];
      } catch {
        permissionNative = (typeof Notification !== 'undefined' ? (Notification.permission as string) : 'default') as PushState['permissionNative'];
        permission = permissionNative === 'granted';
      }
      let optedIn = false;
      let subscriptionId: string | null = null;
      try {
        optedIn = !!os.User.PushSubscription.optedIn;
        subscriptionId = (os.User.PushSubscription.id as string | null) ?? null;
      } catch {}
      return { isSupported, permission, permissionNative, optedIn, subscriptionId };
    });
  } catch {
    return fallback;
  }
}

// Timestamp of the last explicit Enable gesture (banner / Settings click). The
// subscription-change watcher only sends the thank-you inside this window, so silent
// heals from identifyOneSignalUser() never trigger one.
let lastSubscribeGestureAt = 0;

/**
 * Subscribe this browser for push.
 * MUST be called from a user gesture (button click) — otherwise the browser
 * will block the native permission prompt ("Permission blocked").
 * Returns true if subscribed, false if blocked/denied/unsupported.
 */
export async function subscribeOneSignal(): Promise<boolean> {
  lastSubscribeGestureAt = Date.now();
  // An explicit Enable re-consents: clear any deliberate opt-out for this account.
  if (currentIdentity) {
    try {
      window.localStorage.removeItem(optedOutFlagKey(getOneSignalExternalId(currentIdentity)));
    } catch {}
  }
  try {
    const state = await getOneSignalState();
    if (!state.isSupported) return false;
    if (state.permissionNative === 'denied') return false; // cannot prompt again until user resets in browser
    if (state.optedIn && state.permission) {
      // Already subscribed (e.g. permission granted on an earlier visit) — still say
      // thanks once: browsers that subscribed before this feature existed never got it.
      void sendSubscriptionThanksOnce();
      return true; // nothing to ask
    }

    // OneSignal v16: optIn() will trigger the native permission prompt if needed.
    // It must be called with transient activation (from click). Our caller (Toggle/button)
    // is a click handler, so this preserves the gesture as long as we don't await
    // unrelated work between click and this call. Keep this path synchronous where possible.
    await withOneSignal(async (os) => {
      // Prefer optIn — it handles both permission request + subscription.
      if (os.User?.PushSubscription?.optIn) {
        await os.User.PushSubscription.optIn();
      } else if (os.Notifications?.requestPermission) {
        await os.Notifications.requestPermission();
      } else if (os.Slidedown?.promptPush) {
        await os.Slidedown.promptPush({ force: true } as unknown);
      }
    });

    const after = await getOneSignalState();
    if (after.optedIn && after.permission) void sendSubscriptionThanksOnce();
    return after.optedIn && after.permission;
  } catch (err) {
    // Permission blocked or dismissed — not fatal. Caller shows toast.
    console.debug('[OneSignal] subscribe blocked/failed', err);
    return false;
  }
}

/** Unsubscribe this browser (optOut). Always succeeds locally. Also records a deliberate
 * opt-out for the current account so the silent heal in identifyOneSignalUser() does not
 * re-subscribe them on the next login or page reload. */
export async function unsubscribeOneSignal(): Promise<void> {
  if (currentIdentity) {
    try {
      window.localStorage.setItem(optedOutFlagKey(getOneSignalExternalId(currentIdentity)), String(Date.now()));
    } catch {}
  }
  try {
    await withOneSignal(async (os) => {
      if (os.User?.PushSubscription?.optOut) {
        await os.User.PushSubscription.optOut();
      }
    });
  } catch (err) {
    console.debug('[OneSignal] unsubscribe failed', err);
  }
}

/**
 * Identify the current user on this browser — call on EVERY login and on session
 * restore (page reload with an existing session), per OneSignal best practice.
 * Implements the shared-browser requirement: every login where the externalId
 * changes calls logout() before login(newExternalId), not only on explicit sign-out.
 * login() transfers this device's single push subscription to the new user, so the
 * OneSignal Audience subscriber count stays at 1 per browser, not per account.
 *
 * It never requests permission. If permission is ALREADY granted but this browser has
 * no live subscription (second account on a shared browser — the native prompt can
 * never re-appear, iOS/server-side subscription churn), it silently opts back in
 * under the identified user — login() strictly before optIn(), no anonymous window.
 * When permission was never granted, the post-login banner asks; subscribeOneSignal()
 * (banner Enable / Settings toggle) then opts in from a direct click.
 */
export async function identifyOneSignalUser(user: { id: string; role: OneSignalRole }): Promise<void> {
  ensureFirstSubscriptionWatcher();
  const nextId = getOneSignalExternalId(user);
  const lastId = readLastExternalId();

  try {
    await enqueueIdentity(() =>
      withOneSignal(async (os) => {
        if (lastId && lastId !== nextId) {
          try {
            await os.logout();
          } catch {}
        }
        await os.login(nextId);
        const tagPayload: Record<string, string> = { role: user.role };
        if (user.role === 'faculty') tagPayload.faculty_id = user.id;
        else tagPayload.admin_id = user.id;
        try {
          if (os.User?.addTags) await os.User.addTags(tagPayload);
          else if (os.User?.addTag) {
            for (const [k, v] of Object.entries(tagPayload)) await os.User.addTag(k, v);
          }
        } catch {}
        writeLastExternalId(nextId);
        currentIdentity = user;

        // Heal: with permission already granted, (re)create this browser's subscription
        // under the just-identified account. optIn() is silent here — no prompt is shown
        // for an already-granted permission, so no user gesture is required. This never
        // sends the thank-you: that fires only from an explicit Enable gesture. A
        // deliberate Settings opt-out survives — never heal an account that turned
        // notifications off.
        try {
          const native =
            (os.Notifications?.permissionNative as string | undefined) ||
            (typeof Notification !== 'undefined' ? Notification.permission : 'default');
          if (native === 'granted' && !hasOptedOut(nextId) && !os.User.PushSubscription.optedIn) {
            await os.User.PushSubscription.optIn();
          }
        } catch {}
      }),
    );
  } catch (err) {
    console.debug('[OneSignal] identify failed', err);
  }
}

/** Legacy helper kept for backwards compat — now just identifies (no auto-prompt). */
export async function identifyAndPrompt(user: { id: string; role: OneSignalRole }): Promise<void> {
  await identifyOneSignalUser(user);
  // Intentionally NOT calling requestPermission here — that loses the user gesture
  // and causes "Permission blocked". The post-login banner / Settings toggle will
  // call subscribeOneSignal() from a direct click.
}

/** Request native permission — only call from a click handler. */
export async function requestOneSignalPermission(): Promise<boolean> {
  return subscribeOneSignal();
}

/** Called on app logout — intentionally does NOT call OneSignal logout(). Severing the
 * device subscription here is what made subscribed users show up as "inactive / not
 * subscribed" in OneSignal while their device was fully capable: the user record lost
 * its only subscription the moment they signed out, so every later send errored. The
 * device keeps receiving the last-login account's pushes until a DIFFERENT account
 * logs in — identifyOneSignalUser() then moves the subscription via logout()+login().
 * Kept as a hook so auth contexts (and any future policy change) have one seam. */
export async function logoutOneSignalUser(): Promise<void> {
  currentIdentity = null;
}

/** Best-effort: true if OneSignal page SDK script is present. */
export function isOneSignalSupported(): boolean {
  try {
    return typeof window !== 'undefined' && (typeof window.OneSignal !== 'undefined' || Array.isArray(window.OneSignalDeferred));
  } catch {
    return false;
  }
}

// ---------- first-subscription thank-you ----------

// Exactly ONE thank-you push per USER (localStorage flag keyed by external id), sent
// ONLY from an explicit Enable gesture — banner / Settings click via subscribeOneSignal()
// (both its already-subscribed early return and its post-optIn check), or the
// subscription-change watcher while that gesture is still "in flight" (<60s window) to
// catch subscriptions that finish creating asynchronously. identifyOneSignalUser()'s
// silent heals never thank: on a shared browser that thanked every account that merely
// logged in, so one device displayed two "Thanks for subscribing" pushes.
// All concurrent triggers share ONE in-flight POST, and the backend additionally refuses
// to send twice for the same user (notification_thanks table) — duplicates are
// impossible even across tabs. Settings off→on toggles never re-send (flag survives).
const THANKED_KEY_PREFIX = 'westin:onesignal:thanked:';
const LEGACY_THANKED_KEY = 'westin:onesignal:thanked'; // old per-browser flag — migrate, never re-thank

let thanksInFlight: Promise<void> | null = null;

export function sendSubscriptionThanksOnce(): Promise<void> {
  if (thanksInFlight) return thanksInFlight;
  const attempt = (async () => {
    // Never thank an anonymous subscription — wait for identifyOneSignalUser().
    const user = currentIdentity;
    if (!user) return;
    const key: SessionKey = user.role === 'admin' ? 'admin-portal.session' : 'faculty-portal.session';
    if (!getSession(key)) return; // session not stored yet — the identify retry covers this
    const flagKey = THANKED_KEY_PREFIX + getOneSignalExternalId(user);
    try {
      // Browsers already thanked under the old per-browser flag stay thanked.
      if (localStorage.getItem(LEGACY_THANKED_KEY)) {
        localStorage.setItem(flagKey, 'legacy');
        return;
      }
      if (localStorage.getItem(flagKey)) return;
    } catch {
      return;
    }
    try {
      localStorage.setItem(flagKey, String(Date.now()));
    } catch {
      return;
    }
    try {
      await apiFetch('/api/notifications/thanks', { method: 'POST', sessionKey: key });
    } catch {
      try {
        localStorage.removeItem(flagKey); // allow a later retry (backend guard still applies)
      } catch {}
    }
  })();
  thanksInFlight = attempt.finally(() => {
    thanksInFlight = null;
  });
  return thanksInFlight;
}

let firstSubscriptionWatched = false;
export function ensureFirstSubscriptionWatcher(): void {
  if (firstSubscriptionWatched) return;
  firstSubscriptionWatched = true;
  void withOneSignal((os) => {
    os.User.PushSubscription.addEventListener?.('change', (e: unknown) => {
      const ev = e as {
        previous?: { id?: string | null; token?: string | null };
        current?: { id?: string | null; token?: string | null };
      };
      const wasNone = !ev.previous?.id && !ev.previous?.token;
      const hasNow = !!ev.current?.id && !!ev.current?.token;
      // Thank only subscriptions born from an explicit Enable gesture — the silent
      // heal in identifyOneSignalUser() also fires this event and must not thank.
      const fromGesture = Date.now() - lastSubscribeGestureAt < 60_000;
      if (!wasNone || !hasNow || !fromGesture) return;
      void sendSubscriptionThanksOnce();
    });
  }).catch(() => undefined);
}
