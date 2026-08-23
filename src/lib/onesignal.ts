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
 * Permission model:
 * - OneSignal.init() in index.html does NOT auto-prompt (prompts: [], notifyButton: false, autoResubscribe: false).
 * - The native permission prompt is fired from the LOGIN CLICK ITSELF, in parallel with the
 *   OTP verify request (browsers only allow the prompt within a few seconds of a gesture, so
 *   waiting for a slow verify API could block it; supported: Chrome/Edge/Firefox on desktop and
 *   Android, iOS 16.4+ in the installed web app). The auth contexts then run
 *   identifyOneSignalUser() after verify succeeds, re-attaching the fresh subscription.
 * - First successful subscribe (usually that login prompt) sends ONE thank-you push per browser
 *   via sendSubscriptionThanksOnce() — see the first-subscription section at the bottom.
 * - Fallbacks when that prompt is blocked/dismissed: the post-login banner button and the
 *   Settings toggle both call subscribeOneSignal() from a direct click handler.
 * - We never prompt on page load or session restore (no gesture available there).
 * - Browsers grant the Notification permission ONCE per profile; it can never be re-prompted.
 *   On later logins we instead ensure the subscription: identifyOneSignalUser() silently
 *   re-subscribes if permission is 'granted' but the device is not opted in.
 * - Identity operations (logout/login/optIn) are serialized so a pending logout() from the
 *   previous session can never resolve after the next login() and unlink the new user.
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

// Identity ops must never interleave: a logout() still in flight when the next
// login(externalId) runs would unlink the freshly identified user (observed as
// "logged in as admin but never subscribed"). Chain every identity mutation.
let identityChain: Promise<unknown> = Promise.resolve();
function enqueueIdentity<T>(fn: () => Promise<T>): Promise<T> {
  const run = identityChain.then(fn, fn);
  identityChain = run.catch(() => undefined);
  return run;
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

/**
 * Subscribe this browser for push.
 * MUST be called from a user gesture (button click) — otherwise the browser
 * will block the native permission prompt ("Permission blocked").
 * Returns true if subscribed, false if blocked/denied/unsupported.
 */
export async function subscribeOneSignal(): Promise<boolean> {
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

/** Unsubscribe this browser (optOut). Always succeeds locally. */
export async function unsubscribeOneSignal(): Promise<void> {
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
 * Also silently re-subscribes when the browser permission is already 'granted'
 * but the device is not opted in (e.g. after an identity switch or an optOut).
 * It never requests permission — the native prompt only ever comes from a user
 * gesture via subscribeOneSignal() (banner Enable button / Settings toggle).
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

        // Permission already granted ⇒ optIn() needs no gesture and shows no prompt;
        // it just re-attaches this device's subscription to the newly identified user.
        try {
          const native =
            os.Notifications?.permissionNative ??
            (typeof Notification !== 'undefined' ? (Notification.permission as string | undefined) : undefined);
          if (native === 'granted' && os.User?.PushSubscription && !os.User.PushSubscription.optedIn) {
            await os.User.PushSubscription.optIn();
          }
        } catch {}

        // Thank the user once when this browser is (or just became) subscribed. This
        // catches the login-time permission grant — with the parallel subscribe the
        // subscription can land before the session is stored, and this retry fires
        // right after login()/setSession complete — and heals browsers that
        // subscribed before the thank-you feature existed.
        try {
          if (os.User?.PushSubscription?.optedIn) void sendSubscriptionThanksOnce();
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

/** Unlink this device from the current identity. Call before clearing session on logout.
 * Serialized against identifyOneSignalUser so the next login can never overtake it.
 * Keeps browser permission and the subscription itself — logout() only detaches the
 * external_id; the next login() re-attaches the subscription to the new user. */
export async function logoutOneSignalUser(): Promise<void> {
  try {
    await enqueueIdentity(() =>
      withOneSignal(async (os) => {
        try {
          await os.logout();
        } catch {}
        writeLastExternalId(null);
      }),
    );
  } catch {}
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

// Exactly ONE thank-you push per browser (localStorage flag). It is sent the
// moment this browser is confirmed subscribed — permission granted at login
// (the common path), the banner / first Settings enable, or the subscription
// change event — whichever lands first. Settings off→on toggles never re-send
// (the flag survives them). The backend sends the push (POST
// /api/notifications/thanks); it is not recorded in the admin History.
const THANKED_KEY = 'westin:onesignal:thanked';

export async function sendSubscriptionThanksOnce(): Promise<void> {
  try {
    if (localStorage.getItem(THANKED_KEY)) return;
  } catch {
    return;
  }
  // The login flow subscribes in parallel with the verify request, so the
  // subscription can exist before the session is stored. Skip without setting
  // the flag — identifyOneSignalUser() retries right after the session lands.
  const key: SessionKey = localStorage.getItem('admin-portal.session')
    ? 'admin-portal.session'
    : 'faculty-portal.session';
  if (!getSession(key)) return;
  try {
    localStorage.setItem(THANKED_KEY, String(Date.now()));
  } catch {
    return;
  }
  try {
    await apiFetch('/api/notifications/thanks', { method: 'POST', sessionKey: key });
  } catch {
    try {
      localStorage.removeItem(THANKED_KEY); // allow a later retry
    } catch {}
  }
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
      if (!wasNone || !hasNow) return;
      void sendSubscriptionThanksOnce();
    });
  }).catch(() => undefined);
}
